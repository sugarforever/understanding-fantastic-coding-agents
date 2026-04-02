# Chapter 9: Context Management

Coding agents run long conversations with many tool calls. The context window fills up fast. Context management — tracking history, estimating tokens, and compacting when necessary — is critical infrastructure.

## The Problem

A typical coding session might involve:
- 50+ tool calls (file reads, searches, edits, shell commands)
- Each tool result can be thousands of tokens
- The model's context window is finite (128K–1M tokens depending on model)
- Old context must be compressed without losing important information

## Codex: ContextManager

### History Tracking

Codex maintains an ordered transcript of `ResponseItem` variants:

| Type | Description |
|------|-------------|
| `Message` | User messages |
| `Reasoning` | Model reasoning/thinking |
| `LocalShellCall` | Local shell invocations |
| `FunctionCall` | Tool invocations |
| `FunctionCallOutput` | Tool results |
| `ToolSearchCall` / `ToolSearchOutput` | Tool discovery |
| `CustomToolCall` / `CustomToolCallOutput` | Custom tool invocations |
| `WebSearchCall` | Web search invocations |
| `ImageGenerationCall` | Image generation requests |
| `GhostSnapshot` | Compacted history marker |
| `Compaction` | Encrypted compaction content |
| `Other` | Catch-all for unrecognized types |

### Token Accounting

- Tracks cumulative usage per turn via `TokenUsageInfo`
- Estimates remaining context using byte-based heuristics
- Triggers compaction when approaching limits
- Reports final usage to user

### Compaction

When context exceeds the threshold:
1. Creates a `GhostSnapshot` marker at the compaction boundary
2. Summarizes old history (can use remote API call for summarization)
3. Replaces old messages with the summary
4. Continues with fresh context after the boundary

### History Normalization

Before sending to the API:
- Strips unsupported content types (images if model doesn't support them)
- Validates function call / function output pairs
- Deduplicates or merges related items
- Estimates token counts

### Session Persistence

- `codex resume` — Reload full conversation history
- `codex fork` — Create a new session branching from an existing one
- History stored with session state

### Code Location

- Context manager: `codex-rs/core/src/context_manager/history.rs`
- Token tracking: Usage info within context manager
- Compaction: Ghost snapshot creation in core

## Claude Code: Multi-Strategy Compaction

### Message Types

Claude Code tracks 7 message types:

| Type | Description |
|------|-------------|
| `UserMessage` | User input and tool_results |
| `AssistantMessage` | Model output with tool_use blocks |
| `SystemMessage` | Internal control (UI-only, not sent to API) |
| `AttachmentMessage` | Memory files, code context |
| `ProgressMessage` | Tool execution progress |
| `TombstoneMessage` | Placeholder for deleted content |
| `CompactBoundaryMessage` | Context compaction marker |
| `ToolUseSummaryMessage` | Compressed tool results |

### Token Tracking

- Primary: Token counts from API response (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`)
- Secondary: `estimateTokensForMessages()` for pre-flight checks
- Budget enforcement: `checkTokenBudget()` enforces `max_budget_usd` limit
- Final context size: `finalContextTokensFromLastResponse()`

### Compaction Strategies

Claude Code has multiple compaction strategies:

1. **Auto-compact**: Triggered when tokens exceed threshold. Forks a summarization agent to compress old messages.

2. **Micro-compact**: Cached message compression — individual large tool results are compressed into summaries.

3. **Snip-based**: (Feature-gated `HISTORY_SNIP`) Selective removal of less-important history.

4. **Reactive**: (Feature-gated `CACHED_MICROCOMPACT`) Reactive updates to cached compact data.

### Compaction Flow

```
Token count exceeds threshold
    ↓
Insert CompactBoundaryMessage
    ↓
Fork summarization agent (separate API call)
    ↓
Agent summarizes messages before boundary
    ↓
Replace old messages with ToolUseSummaryMessage
    ↓
Continue conversation with reduced context
```

### Message Normalization

Before sending to API (`normalizeMessagesForAPI()`):
- Strips UI-only fields (progress, system messages)
- Validates tool_result pairing (every tool_use must have a corresponding tool_result)
- Strips signature blocks from git operations
- Applies content budget (truncates oversized tool results)

### Session Persistence

- Sessions stored in `~/.claude/sessions/{sessionId}.json`
- `--resume` loads full message history
- `--fork-session` creates a branch
- `--resume-session-at` rewinds to a specific message
- Auto-resume detection: repeated `claude` in same directory

### Code Location

- Compaction service: `src/services/compact/compact.ts`
- Message types: `src/types/message.ts`
- Message normalization: `src/utils/messages.ts`
- Session storage: `src/utils/sessionStorage.ts`
- Conversation recovery: `src/utils/conversationRecovery.ts`

## Comparison

| Aspect | Codex | Claude Code |
|--------|-------|-------------|
| **Message types** | 14 (ResponseItem variants) | 7+ (typed message classes) |
| **Token estimation** | Byte-based heuristics | API response counts + estimation |
| **Compaction trigger** | Token threshold | Token threshold |
| **Compaction method** | GhostSnapshot + remote summarization | Multi-strategy (auto, micro, snip, reactive) |
| **Budget enforcement** | Token tracking | `max_budget_usd` cost limit |
| **Session resume** | `codex resume` / `codex fork` | `--resume` / `--fork-session` / `--resume-session-at` |
| **History normalization** | Strip unsupported types, validate pairs | Strip UI fields, validate pairs, truncate content |

### Key Difference

Codex uses a single compaction strategy (ghost snapshots). Claude Code has multiple strategies that can be combined — auto-compact for the overall conversation, micro-compact for individual large results, and feature-gated experimental strategies. This reflects Claude Code's more mature context management, likely driven by handling more diverse real-world conversations.
