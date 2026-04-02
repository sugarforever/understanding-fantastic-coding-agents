# Chapter 3: The Agent Loop

The agent loop is the heartbeat of a coding agent. It's the cycle of: receive input → call the LLM → execute tools → feed results back → repeat until done. Both agents implement this loop, but with very different execution models.

## Codex: Turn-Based State Machine

Codex structures execution as discrete **turns**, each encapsulated in a `TurnContext`:

```
User Input
    ↓
TurnContext Creation (model, config, sandbox policy, permissions)
    ↓
Build Prompt (base instructions + history + tool schemas)
    ↓
Stream Model Response (SSE or WebSocket)
    ↓
Parse Tool Calls from Response
    ↓
For Each Tool Call:
    ├── Check Approval (Guardian system)
    ├── Apply Sandbox Policy
    ├── Execute in Sandbox
    └── Collect Result
    ↓
Append Results to History
    ↓
Emit Events to UI
    ↓
Next Turn (if model wants to continue)
```

### Key Types

- **`TurnContext`** — Immutable per-turn configuration: model info, sandbox policy, permission mode, personality settings
- **`ResponseItem`** — Typed history items (14 variants): `Message`, `Reasoning`, `LocalShellCall`, `FunctionCall`, `ToolSearchCall`, `FunctionCallOutput`, `CustomToolCall`, `CustomToolCallOutput`, `ToolSearchOutput`, `WebSearchCall`, `ImageGenerationCall`, `GhostSnapshot`, `Compaction`, `Other`
- **`ContextManager`** — Manages conversation history with token tracking, normalization, and truncation

### Code Location

- Session management: `codex-rs/core/src/codex.rs`
- Turn execution: `codex-rs/core/src/codex.rs` (the `run_turn` flow)
- Context management: `codex-rs/core/src/context_manager/history.rs`

### Concurrency

Codex uses Tokio for async I/O. All tool executions are non-blocking. The `ToolOrchestrator` manages parallel tool execution with approval request queuing.

## Claude Code: Generator-Based Streaming Loop

Claude Code uses an **async generator** pattern — the `query()` function yields events as they happen, with no hard turn boundaries:

```
User Input
    ↓
Assemble System Prompt (cached sections + dynamic context)
    ↓
Normalize Messages for API
    ↓
Stream from Claude API
    ↓
Process stop_reason:
    ├── "tool_use" → Extract tool blocks
    │   ├── Check permissions (canUseTool)
    │   ├── Execute tools (parallel for reads, serial for writes)
    │   ├── Append tool results
    │   └── Loop back to API call
    │
    ├── "end_turn" → Return text response, done
    │
    ├── "max_tokens" → Auto-compact context, continue
    │
    └── "stop_sequence" → Process stop hooks
```

### Key Types

- **`QueryEngine`** — Stateful per-conversation orchestrator with `submitMessage()` async generator
- **`StreamEvent`** — Union type for all events yielded by the generator (tool use, text, progress)
- **`AppState`** — Mutable store tracking messages, model, mode, effort level, permissions (~88 fields)

### Code Location

- Query loop: `src/query.ts` (~67KB)
- Query engine: `src/QueryEngine.ts`
- Tool execution: `src/services/tools/StreamingToolExecutor.ts`

### Concurrency

Tools are partitioned into concurrent and serial batches:
- **Read-only tools** (Glob, Grep, FileRead) run concurrently (up to 10 at a time)
- **Write tools** (Bash, FileEdit, FileWrite) run serially to preserve mutation ordering
- Results are buffered and emitted in order

## Key Differences

| Aspect | Codex (Turn-Based) | Claude Code (Generator) |
|--------|-------------------|------------------------|
| **Boundary** | Explicit `TurnContext` per iteration | Fluid — no hard boundary between tool batches |
| **State** | Immutable per-turn config | Mutable `AppState` updated continuously |
| **Streaming** | Events emitted at turn boundaries | Events yielded continuously via generator |
| **Recovery** | Turn can be retried or rolled back | Auto-compaction on context overflow, fallback model on overload |
| **Cancellation** | Cancellation tokens per turn | Generator can be aborted at any yield point |

### Why It Matters

The turn-based model is easier to reason about — each turn is a clean unit with defined inputs and outputs. But it means the agent can't stream partial results or interleave tool execution with response generation.

The generator model is more flexible — it can yield events as they happen, handle mid-stream context compaction, and naturally pause at permission prompts. But the control flow is harder to follow (main.tsx alone is ~785KB).

## Deep Dive

For a detailed trace of the actual execution mechanics — streaming event processing, tool dispatch timing, error recovery cascades, and continuation logic — see [Agentic Execution: Deep Dive](agentic-execution.md).

## Auto-Continuation

Both agents handle the case where the model wants to keep going:

- **Codex**: If the model's response includes tool calls, the results are appended to history and a new turn starts automatically. The user only sees the final result.
- **Claude Code**: The generator loop continues as long as `stop_reason === "tool_use"`. On `"max_tokens"`, it auto-compacts the context and continues. On `"end_turn"`, it breaks the loop.

## Context Overflow

When the conversation grows too large for the model's context window:

- **Codex**: Creates `GhostSnapshot` markers and summarizes old history. Can use remote compaction via API call.
- **Claude Code**: Inserts `CompactBoundaryMessage`, forks a summarization agent, and replaces old messages with `ToolUseSummaryMessage`. Supports multiple strategies: micro-compact, snip-based, and reactive cached compaction.

See [Chapter 9: Context Management](../09-context-management/README.md) for details.
