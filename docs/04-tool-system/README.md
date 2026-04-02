# Chapter 4: The Tool System

Tools are how coding agents interact with the world — reading files, running commands, searching code, editing files. The tool system design reveals a lot about each agent's philosophy.

## Codex: Few Powerful Tools

Codex relies heavily on two primary tools — `shell` and `apply_patch` — supplemented by a set of specialized handlers.

### Tool Definition

Tools are defined via a Rust `ToolHandler` trait (in `core/src/tools/registry.rs`):

```rust
#[async_trait]
pub trait ToolHandler: Send + Sync {
    type Output: ToolOutput + 'static;
    fn kind(&self) -> ToolKind;
    fn matches_kind(&self, payload: &ToolPayload) -> bool;
    async fn is_mutating(&self, invocation: &ToolInvocation) -> bool;
    fn pre_tool_use_payload(&self, invocation: &ToolInvocation) -> Option<PreToolUsePayload>;
    fn post_tool_use_payload(...) -> Option<PostToolUsePayload>;
    async fn handle(&self, invocation: ToolInvocation) -> Result<Self::Output, FunctionCallError>;
}
```

### Built-in Tools

| Handler File | Purpose |
|------|---------|
| `shell.rs` | Execute shell commands (the primary workhorse) |
| `apply_patch.rs` | Modify files using unified diff/patch format |
| `unified_exec.rs` | Cross-platform command execution |
| `view_image.rs` | Display images |
| `agent_jobs.rs` | Spawn sub-agents (includes `spawn_agents_on_csv`) |
| `multi_agents.rs` / `multi_agents_v2.rs` | Multi-agent coordination |
| `js_repl.rs` | JavaScript REPL |
| `list_dir.rs` | Directory listing with pagination (offset, limit, depth) |
| `mcp.rs` / `mcp_resource.rs` | MCP tool calls and resource reading |
| `request_permissions.rs` | Request runtime permission amendments |
| `request_user_input.rs` | Query user interactively |
| `tool_search.rs` | Search available tools by name/description (BM25) |
| `tool_suggest.rs` | Suggest relevant tools |
| `plan.rs` | Planning / step tracking |
| `dynamic.rs` | Dynamically registered tools |

### Tool Execution Pipeline

```
Model generates tool call (structured JSON)
    ↓
Parse arguments
    ↓
Pre-tool-use hooks
    ↓
Permission/approval check (Guardian system)
    ↓
Sandbox policy application
    ↓
Handler execution (async, in sandbox)
    ↓
Post-tool-use hooks
    ↓
Return structured output to model
```

### Tool Orchestrator

The orchestrator (`codex-rs/core/src/tools/orchestrator.rs`) handles **sequential** tool execution with approval routing, sandbox selection, and retry-with-escalation logic. Despite the name, it does not manage parallel execution — concurrency is handled at a higher level by the agent loop when multiple tool calls arrive in a single model response.

### Code Location

- Tool handlers: `codex-rs/core/src/tools/handlers/`
- Tool registry/router: `codex-rs/core/src/tools/registry.rs`
- Tool orchestration: `codex-rs/core/src/tools/orchestrator.rs`
- Tool specs: `codex-rs/core/src/tools/spec.rs`
- Tool definitions: `codex-rs/tools/src/` (tool spec construction)

### Philosophy

The model is trusted to know how to use the shell effectively. Rather than building a `GrepTool`, Codex lets the model run `rg` directly. Rather than a `GlobTool`, the model runs `find` or `rg --files`. This keeps the tool surface small and lets the model leverage its training on shell usage.

## Claude Code: Many Specialized Tools

Claude Code has 40+ built-in tools, each purpose-built for a specific task.

### Tool Definition

Tools are TypeScript objects with Zod schema validation:

```typescript
// Simplified from src/Tool.ts
type Tool = {
  name: string
  description: () => string
  prompt: () => string                    // Dynamic system message
  inputSchema: z.ZodType                  // Input validation (Zod)
  execute: (input, context) => Promise<Result>
  checkPermissions?: (input) => PermissionDecision
  isConcurrencySafe?: boolean
  getPath?: (input) => string             // For permission matching
}
```

### Built-in Tools (Selection)

| Category | Tools |
|----------|-------|
| **File ops** | `FileRead`, `FileWrite`, `FileEdit`, `Glob`, `Grep` |
| **Execution** | `Bash`, `PowerShell` |
| **Search** | `GlobTool`, `GrepTool`, `WebSearch`, `WebFetch` |
| **AI agents** | `AgentTool` (spawn sub-agents) |
| **Tasks** | `TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList`, `TaskStop` |
| **Code intel** | `LSPTool` (go-to-definition, find-references, etc.) |
| **Notebooks** | `NotebookEdit` |
| **Planning** | `EnterPlanMode`, `ExitPlanMode` |
| **User** | `AskUserQuestion` |
| **Skills** | `SkillTool` |
| **Feature-gated** | `REPLTool`, `SleepTool`, `WebBrowserTool` (17 gated tools) |

### Tool Execution Pipeline

```
Model generates tool_use blocks in response
    ↓
Extract tool calls from assistant message
    ↓
For each tool call:
    ├── Validate input against Zod schema
    ├── Check permissions (canUseTool hook)
    │   ├── Auto mode → YOLO classifier
    │   ├── Default mode → PermissionDialog
    │   └── Bypass mode → allow all
    ├── Execute tool
    └── Format result (token-optimized)
    ↓
Append tool_result blocks to conversation
    ↓
Continue loop
```

### Code Location

- Tool definitions: `src/tools/` (45+ subdirectories)
- Tool registry: `src/tools.ts`
- Tool interface: `src/Tool.ts`
- Streaming executor: `src/services/tools/StreamingToolExecutor.ts`
- Tool orchestration: `src/services/tools/toolOrchestration.ts`

### Philosophy

Each task gets a purpose-built tool with proper input validation, permission checks, and output formatting. The system prompt explicitly forbids using shell commands for tasks that have dedicated tools: "ALWAYS use Grep for search tasks. NEVER invoke `grep` or `rg` as a Bash command."

## Comparison

| Aspect | Codex | Claude Code |
|--------|-------|-------------|
| **Tool count** | ~15 handler files | ~40 tools (~25 core, ~15 feature-gated) |
| **Primary tools** | `shell` + `apply_patch` | Specialized tool per task |
| **Search** | Model runs `rg` via shell | `GlobTool` and `GrepTool` wrappers |
| **File editing** | `apply_patch` (unified diff) | `FileEdit` (string replacement) |
| **Schema validation** | JSON Schema (from tool specs) | Zod schemas |
| **Concurrency** | Orchestrator-managed parallel execution | Read-only parallel, write serial |
| **Dynamic tools** | MCP tools, app connectors | MCP tools, skills |
| **Permission per tool** | Via Guardian approval system | Per-tool `checkPermissions()` method |

### Tool Schema Delivery

A subtle but important difference in how tool definitions reach the model:

- **Codex**: Tool schemas are sent as a separate `tools` JSON array in the API request. The system prompt only says generically "emit function calls to run terminal commands." Tool descriptions live in the schema, not the prompt.
- **Claude Code**: Tool schemas are also sent via the API's `tools` parameter, but tool-specific prompts (via the `prompt()` method) add detailed usage instructions to the system prompt itself.

### Tradeoffs

**Codex's minimal tool approach**:
- Simpler system, fewer moving parts
- Model has full shell flexibility (pipe, chain, redirect)
- But: depends on system-installed tools (`rg`, `git`, etc.)
- But: raw shell output wastes tokens on formatting

**Claude Code's specialized tool approach**:
- Token-optimized output (relative paths, truncation, pagination)
- Guaranteed availability (ships its own ripgrep)
- Per-tool permission logic
- But: more complex system, more code to maintain
- But: model can't do creative shell piping through tools
