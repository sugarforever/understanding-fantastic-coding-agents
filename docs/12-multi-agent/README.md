# Chapter 12: Multi-Agent Architecture

Both agents can spawn sub-agents to handle parallel or delegated work. The implementation reveals different approaches to agent isolation, communication, and coordination.

## Codex: In-Process Agent Tree

### Architecture

Codex uses an in-process agent system with shared state:

- **`AgentControl`** — Control-plane handle for spawning sub-agents
- **`AgentRegistry`** — Tracks all spawned agents in a hierarchical thread tree
- **`Mailbox`** — Inter-agent communication using async channels (Tokio)

### Spawning

The `spawn_agents_on_csv` tool (in `agent_jobs.rs`) and `AgentControl.spawn_agent()` spawn child agents:

```
Parent Agent
    ├── spawn_agent(FullHistory) → Child Agent 1 (full history fork)
    ├── spawn_agent(LastNTurns(5)) → Child Agent 2 (recent history fork)
    └── spawn_agent(FullHistory) → Child Agent 3 (full history fork)
```

Each child agent:
- Runs in its own async task (same process)
- Gets a **fork of the parent's conversation history** (configurable: full or last-N-turns via `SpawnAgentForkMode`)
- Has its own session and turn management
- Reports results back via the agent registry

### Communication

- **Mailbox**: Async channels between agents
- Agents can send/receive messages
- Results propagated through the registry
- Parent waits for child completion

### Depth Control

- Configurable depth limits prevent infinite agent spawning
- Each agent tracks its position in the hierarchy
- Children inherit parent's configuration

### Code Location

- Agent control: `codex-rs/core/src/agent/`
- Agent jobs handler: `codex-rs/core/src/tools/handlers/agent_jobs.rs`
- Multi-agent coordination: `codex-rs/core/src/tools/handlers/multi_agents/`

## Claude Code: Process-Based Isolation

### Architecture

Claude Code spawns sub-agents as **separate child processes**:

- **`AgentTool`** — Tool that spawns child agent processes
- Each child is a fully independent Claude Code instance
- Communication via stdout/stdin between parent and child

### Spawning

```
Parent Process
    ├── spawn() → Child Process 1 (fresh context, task prompt)
    ├── spawn() → Child Process 2 (fresh context, task prompt)
    └── spawn() → Child Process 3 (fresh context, task prompt)
```

Each child:
- Is a **separate OS process** (full isolation)
- Gets a **fresh context** (no history carryover)
- Receives a task description in its prompt
- Returns results to parent via stdout
- Can optionally run in a **git worktree** for filesystem isolation

### Communication

- Parent reads child's stdout for results
- No inter-agent messaging between siblings
- Task description is the only input
- Results returned as a single message

### Isolation Options

- **Default**: Child process shares the same working directory
- **Worktree**: `isolation: "worktree"` creates a temporary git worktree, giving the child an isolated copy of the repository. Automatically cleaned up if no changes made.

### No Depth Limit

Claude Code does not enforce an explicit depth limit on agent spawning. In practice, context window limits and cost act as natural constraints.

### Code Location

- Agent tool: `src/tools/AgentTool/`
- Agent spawning: Part of the tool execution pipeline

## Comparison

| Aspect | Codex (In-Process) | Claude Code (Process-Based) |
|--------|-------------------|---------------------------|
| **Isolation** | Shared process, separate async tasks | Separate OS processes |
| **Memory** | Shared memory space | Fully isolated |
| **History** | Forked from parent | Fresh context per child |
| **Communication** | Mailbox (async channels) | stdout/stdin |
| **Sibling communication** | Yes (via mailbox) | No |
| **Depth control** | Configurable limits | No explicit limit |
| **Filesystem isolation** | Shared workspace | Optional git worktree |
| **Overhead** | Low (async task) | Higher (process spawn) |
| **Crash isolation** | Child crash may affect parent | Child crash is contained |

### Tradeoffs

**Codex's in-process approach**:
- Lower overhead — spawning an async task is cheap
- History sharing — children have full context from parent
- Inter-agent communication — siblings can coordinate
- But: less isolation — a bug in a child could affect the parent
- But: shared memory means potential contention

**Claude Code's process-based approach**:
- Full isolation — child crash doesn't affect parent
- Git worktree support — children can modify files without conflicts
- Simpler model — each child is independent
- But: higher overhead — spawning a full process
- But: no history — children start with only a task description
- But: no sibling communication — parallel agents can't coordinate

### When Sub-Agents Are Used

Both agents use sub-agents for:
- **Parallel independent tasks** — e.g., fixing multiple files simultaneously
- **Exploration** — searching the codebase without polluting the main context
- **Delegation** — handing off a well-defined subtask
- **Context protection** — keeping large search results out of the main conversation

The key difference is that Codex's children are **aware of the conversation context** (forked history), while Claude Code's children are **context-free** (task prompt only). This means Codex children can make more informed decisions, but at the cost of larger context per child.
