# Agentic Task Execution: Deep Dive

This document goes beyond the high-level loop described in the [Agent Loop overview](README.md) and traces the **actual execution mechanics** — how streaming works, how tools execute mid-stream, how errors recover, and what techniques drive the agent forward.

---

## The Core Technique: ReAct Loop with Streaming

Both agents implement a variant of the **ReAct (Reasoning + Acting) pattern**:

```
Observe → Think → Act → Observe → Think → Act → ... → Done
```

In practice, "Think" is the LLM generating a response, and "Act" is tool execution. But the real engineering is in:
- How streaming interleaves with tool execution
- How errors trigger recovery rather than failure
- How context overflow is handled without losing work
- How the agent decides to stop

---

## Codex: Turn-Based Execution with In-Flight Tool Futures

### The Main Loop

The turn executes in `run_turn()` (`core/src/codex.rs:5655-6145`):

```
while needs_follow_up {
    ┌─────────────────────────────────────┐
    │ 1. Check for pending user input     │
    │ 2. Clone history for prompt         │
    │ 3. Call run_sampling_request()      │
    │    └─ try_run_sampling_request()    │
    │       └─ Stream SSE/WebSocket       │
    │          └─ Process events in loop  │
    │             └─ Spawn tool futures   │
    │ 4. Drain all tool futures           │
    │ 5. Decide: continue or stop?        │
    │    ├─ Tools executed → continue     │
    │    ├─ Token limit → auto-compact    │
    │    ├─ Stop hooks → maybe continue   │
    │    └─ No tools → stop               │
    └─────────────────────────────────────┘
```

**No max turns limit** — the loop continues indefinitely as long as tools keep executing.

### Streaming Event Processing

Codex processes SSE/WebSocket events in a synchronous loop (`codex.rs:7289-7551`):

```rust
loop {
    match stream.next().await {
        OutputItemAdded(item) => {
            // New content block starting (text, reasoning, tool call)
            emit_turn_item_started()
        }

        OutputItemDone(item) => {
            // Complete item received — THIS is where tool calls are extracted
            // Tool calls arrive as complete ResponseItems, not accumulated from deltas
            let tool_future = tool_router.build_tool_call(item);
            in_flight.push_back(tool_future);  // Queue for parallel execution
            needs_follow_up = true;
        }

        OutputTextDelta(delta) => {
            // Streaming text — parse for code blocks, plan syntax
            emit_streamed_text_delta()
        }

        ReasoningContentDelta { delta } => {
            // Thinking tokens — streamed separately, non-blocking
            emit_reasoning_delta()
        }

        Completed { token_usage } => {
            update_token_usage();
            drain_in_flight().await;  // WAIT for all tool futures
            break;
        }
    }
}
```

**Key technique**: Tool calls are extracted from **complete `OutputItemDone` events**, not accumulated from streaming deltas. The model emits the full tool call specification atomically. Tool futures are spawned immediately but only awaited at stream completion.

### Parallel Tool Execution via RwLock

Codex uses a **reader-writer lock** pattern (`tools/parallel.rs:26-132`):

```rust
struct ToolCallRuntime {
    parallel_execution: Arc<RwLock<()>>,  // Global lock
}

async fn execute_tool(tool_call) {
    if tool.supports_parallel() {
        let _guard = lock.read().await;   // Multiple readers = parallel
        run_tool().await
    } else {
        let _guard = lock.write().await;  // Exclusive = sequential
        run_tool().await
    }
}
```

- **Parallel-safe tools** (reads) acquire a shared read lock — many can run concurrently
- **Mutating tools** (writes) acquire an exclusive write lock — serialized
- Tools are spawned into `FuturesOrdered` — preserves completion order
- All futures are drained at stream completion via `drain_in_flight()`

### Error Recovery and Retry

Retry logic in `run_sampling_request()` (`codex.rs:6434-6567`):

```
loop {
    result = try_run_sampling_request()

    match result {
        Ok(response) → return response

        Err(ContextWindowExceeded) → return error immediately (no retry)
        Err(UsageLimitReached) → update rate limits, return immediately

        Err(retryable_error) →
            if retries < max_retries:
                retries += 1
                sleep(backoff(retries))
                continue
            else:
                try switch transport (WebSocket → HTTPS)
                if switched: retries = 0, continue
                else: return error
    }
}
```

**Transport fallback**: If WebSocket streaming fails repeatedly, Codex falls back to HTTPS SSE — a different transport for the same API.

### Cancellation

Uses Tokio's `CancellationToken` with hierarchical child tokens:

```
run_turn(token)
  └─ child_token() → run_sampling_request()
       └─ child_token() → try_run_sampling_request()
            ├─ stream.next().or_cancel(token)  // Cancel stream read
            └─ tool_execution with tokio::select! {
                 token.cancelled() => record_aborted()
                 result = tool.execute() => return result
               }
```

Child tokens prevent cancellation from leaking across turn boundaries. Cancelled tools record an abort response with elapsed time.

### Reasoning/Thinking

Codex supports reasoning as a separate stream channel:

- **Configuration**: `reasoning_effort` (low/medium/high) and `reasoning_summary` (concise/full)
- **Streaming**: `ReasoningContentDelta` and `ReasoningSummaryDelta` events
- **Separation**: Reasoning tokens stream independently from text and tool calls
- **Billing**: Server can flag `ServerReasoningIncluded(true)` to avoid double-counting tokens

---

## Claude Code: Generator-Based Execution with Streaming Tool Dispatch

### The Main Loop

The query loop is an `async function*` generator (`query.ts:219-1729`):

```typescript
async function* queryLoop(params): AsyncGenerator<StreamEvent> {
  let state = { messages, turnCount: 0, maxOutputTokensRecoveryCount: 0, ... }

  while (true) {
    // ─── PRE-API SETUP ───
    autocompact(messages)           // Proactive context compaction
    snipCompaction(messages)        // Selective message removal
    microcompact(messages)          // Individual result compression
    contextCollapse(messages)       // Context-collapse drain

    // ─── API STREAMING ───
    for await (const event of streamAPI(messages, tools)) {
      if (event.type === 'tool_use') {
        streamingToolExecutor.addTool(event)  // Start executing IMMEDIATELY
        needsFollowUp = true
      }
      yield event  // Stream to UI
    }

    // ─── POST-STREAMING ───
    if (!needsFollowUp) {
      // No tools — check recovery paths
      if (promptTooLong)     → try collapse/compact, continue or exit
      if (maxOutputTokens)   → escalate/retry (up to 3x), continue or exit
      if (stopHooks block)   → inject error, continue
      if (tokenBudget done)  → exit
      return  // Normal exit
    }

    // ─── TOOL EXECUTION ───
    for await (const result of streamingToolExecutor.getRemainingResults()) {
      yield result  // Stream tool results to UI
      messages.push(result)
    }

    // ─── CONTINUATION ───
    if (maxTurns && turnCount >= maxTurns) return
    state.turnCount++
    continue  // Back to PRE-API SETUP
  }
}
```

### Streaming Tool Execution (The Key Innovation)

Claude Code's `StreamingToolExecutor` (`services/tools/StreamingToolExecutor.ts`) starts executing tools **before the API response is complete**:

```
API streaming:     [text...|tool_use_1|text...|tool_use_2|tool_use_3|...]
Tool execution:              ↓ start                ↓ start   ↓ start
                        [executing...]         [executing...] [exec...]
API completes:     ──────────────────────────────────────────────────────►
                        [done]                      [done]    [done]
```

**State machine per tool**:
```
queued → executing → completed → yielded
```

**Concurrency control**:
```typescript
canExecuteTool(isConcurrencySafe: boolean): boolean {
  const executing = this.tools.filter(t => t.status === 'executing')
  return (
    executing.length === 0 ||                                    // Nothing running
    (isConcurrencySafe && executing.every(t => t.isConcurrencySafe))  // All safe
  )
}
```

This means:
- Read-only tools start executing **as they stream in** — no waiting for the full response
- A write tool waits for all preceding tools to complete
- Results are yielded in order (preserving the model's intended sequence)

**Error cascading**: If a Bash tool fails, sibling tools are aborted via `siblingAbortController`. Other tool types fail independently.

### Tool Batching: Partition and Execute

When not using the streaming executor, `runTools()` (`toolOrchestration.ts:19-82`) partitions tool calls:

```typescript
// Input: [Read1, Read2, Write1, Read3, Write2]
// Partitioned:
//   Batch 1: [Read1, Read2]  → concurrent (max 10)
//   Batch 2: [Write1]        → serial
//   Batch 3: [Read3]         → concurrent
//   Batch 4: [Write2]        → serial
```

Consecutive read-only tools are grouped into concurrent batches. Each write tool gets its own serial batch. Max concurrency: 10 (configurable via `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`).

### Multi-Layer Context Recovery

Claude Code has a **cascade of recovery strategies** for context overflow:

```
Context too large?
    │
    ├─ 1. Context Collapse (cheap, preserves granular context)
    │     └─ Removes intermediate tool results, keeps final state
    │
    ├─ 2. Reactive Compact (full summarization)
    │     └─ Forks a summarization agent to compress old conversation
    │
    ├─ 3. Proactive Auto-Compact (before each API call)
    │     └─ Checks token count, compacts if approaching limit
    │
    ├─ 4. Snip Compaction (selective removal)
    │     └─ Removes least-important messages
    │
    └─ 5. Micro-Compact (per-result compression)
          └─ Compresses individual large tool results
```

**Proactive compaction** runs before every API call. **Reactive recovery** triggers when a 413 error arrives.

### Max Output Tokens Recovery

When the model hits its output token limit mid-response:

```
Attempt 1: Escalate from 8K → 64K tokens (silent, no message to model)
Attempt 2: Inject meta message "Output token limit hit. Resume directly..."
Attempt 3: Same injection
Attempt 4: Give up, surface the truncated response
```

Recovery count resets on successful tool execution.

### Stop Hooks

User-defined shell scripts that run after each model response:

```typescript
const hookResult = yield* handleStopHooks(messages, assistantMessages, ...)

if (hookResult.preventContinuation) {
  return  // EXIT — hook says stop
}
if (hookResult.blockingErrors.length > 0) {
  // Hook failed — inject error as user message, let model address it
  state.stopHookActive = true
  continue  // Loop back
}
```

Stop hooks can:
- **Prevent continuation** — force the agent to stop
- **Inject errors** — tell the model something went wrong, let it fix it
- **Pass through** — allow normal continuation

**Death spiral protection**: If the last message was an API error, stop hooks are skipped to prevent error → hook → retry → error loops.

### Token Budget Enforcement

When the `TOKEN_BUDGET` feature is enabled:

```typescript
const decision = checkTokenBudget(tracker, agentId, budget, turnTokens)

if (decision.action === 'continue') {
  // Inject nudge message, continue loop
}
if (decision.diminishingReturns) {
  // Agent is spinning — <500 tokens/turn for 3+ consecutive turns
  return  // EXIT early
}
```

**Diminishing returns detection**: If the agent produces less than 500 tokens per turn for 3+ consecutive turns, the system exits early to save cost.

### Thinking/Extended Thinking

Claude's thinking blocks are accumulated from streaming deltas:

```typescript
// content_block_start
case 'thinking':
  contentBlocks[index] = { thinking: '', signature: '' }

// content_block_delta
case 'thinking_delta':
  contentBlock.thinking += delta.thinking
case 'signature_delta':
  contentBlock.signature = delta.signature
```

**Trajectory preservation rule**: Thinking blocks are preserved for the full trajectory (single turn, or turn + tool use + tool result + next assistant message). On model fallback, thinking signatures are stripped to prevent 400 errors when replaying to a different model.

---

## Comparison: Execution Techniques

| Technique | Codex | Claude Code |
|-----------|-------|-------------|
| **Loop structure** | `while` loop with `needs_follow_up` flag | `async function*` generator with `continue`/`return` |
| **Tool call extraction** | From complete `OutputItemDone` events | From complete `content_block_stop` events |
| **When tools start executing** | Immediately (spawned as futures during streaming) | Immediately (added to StreamingToolExecutor during streaming) |
| **Parallel execution model** | `RwLock` — readers (parallel) vs writers (exclusive) | Partition into concurrent batches (max 10) vs serial batches |
| **Tool result ordering** | `FuturesOrdered` preserves order | Results yielded in receipt order |
| **Error recovery: context overflow** | Auto-compact with GhostSnapshot | 5-layer cascade (collapse → reactive → proactive → snip → micro) |
| **Error recovery: output limit** | Not documented | 3-attempt escalation (8K → 64K → retry → give up) |
| **Error recovery: API failure** | Retry with backoff + transport fallback (WS → HTTPS) | Retry with backoff + model fallback (Sonnet → Haiku) |
| **Max turns limit** | No hard limit | Configurable `maxTurns` parameter |
| **Cancellation** | `CancellationToken` hierarchy (Tokio) | `AbortController.signal` (JS native) |
| **Stop extensibility** | User hooks (can block, continue, or stop) | Stop hooks (can prevent continuation or inject errors) |
| **Thinking/reasoning** | Separate stream channel, configurable effort | Accumulated from deltas, signature-protected |
| **Budget enforcement** | Token tracking per turn | Token budget with diminishing returns detection |
| **Transport** | SSE + WebSocket (with fallback between them) | SSE only |

### Key Technique Differences

**1. Streaming tool dispatch**: Both agents start tool execution during streaming, but the mechanisms differ:
- Codex spawns `tokio::spawn` futures into a `FuturesOrdered` container with an `RwLock` for concurrency control
- Claude Code uses a `StreamingToolExecutor` state machine with explicit `canExecuteTool()` checks

**2. Recovery depth**: Claude Code has significantly more recovery mechanisms (5 compaction strategies, output token escalation, model fallback). Codex has simpler recovery (auto-compact + transport fallback).

**3. Continuation decision**: Codex uses a single `needs_follow_up` boolean. Claude Code has 7 distinct "continue sites" — each representing a different recovery or continuation path through the generator.

**4. Fallback strategies**:
- Codex falls back at the **transport level** (WebSocket → HTTPS) — same model, different pipe
- Claude Code falls back at the **model level** (Sonnet → Haiku) — different model, same pipe

**5. Diminishing returns**: Claude Code detects when the agent is "spinning" (<500 tokens/turn for 3+ turns) and exits early. Codex has no equivalent detection.
