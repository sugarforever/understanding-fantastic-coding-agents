# Chapter 8: Permissions & Approval System

Both agents need a way to decide: should this tool call run, or should we ask the user first? The permission system determines the user experience — too restrictive and the agent is annoying, too permissive and it's dangerous.

## Codex: Guardian Approval System

### Approval Modes

| Mode | Behavior |
|------|----------|
| `never` | Auto-approve everything (maximum autonomy) |
| `on-failure` | Auto-approve, but ask if a command fails (deprecated) |
| `on-request` | Ask for sensitive operations (default) |
| `unless-trusted` | Ask unless command matches trusted patterns |
| `granular` | Fine-grained per-command policies |

### Request Types

The Guardian system uses typed approval requests:

- `ShellCommand` — Execute shell commands
- `ExecCommand` — Cross-platform execution
- `ApplyPatch` — File modifications
- `NetworkAccess` — Outbound network connections
- `McpToolCall` — MCP tool invocations
- `Execve` — Unix process replacement

### Approval Flow

```
Tool determines if approval needed
    ↓
Create GuardianApprovalRequest with context
    ↓
Serialize to JSON for human review
    ↓
Wait for user decision (approve/deny)
    ↓
Record decision for audit
    ↓
Optionally update exec policy for future similar operations
```

### Execution Policies

Codex supports **declarative execution policies** that persist across sessions:

- Define allowed command prefixes
- Specify allowed file paths and network hosts
- Can be amended at runtime via `request_permissions` tool
- Model can request new permissions: "I need write access to `/tmp/build`"

### Prompt Integration

Different approval modes inject different instructions into the system prompt:

```
approval_policy/never.md        → "You may run commands freely"
approval_policy/on_request.md   → "Request approval for sensitive operations"
approval_policy/on_failure.md   → "Retry with approval on failure"
```

### Code Location

- Guardian: `codex-rs/core/src/guardian/`
- Approval events: `codex-rs/protocol/` (ElicitationRequestEvent)
- Exec policies: `codex-rs/execpolicy/`
- Permission prompt templates: `codex-rs/protocol/src/prompts/permissions/`

## Claude Code: Multi-Layer Permission System

### Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | Show permission dialog for each risky operation |
| `auto` | Use YOLO classifier to auto-approve/deny (no dialogs) |
| `acceptEdits` | Auto-approve code edits, ask for other operations |
| `bypassPermissions` | No permission checks (can be remotely kill-switched) |
| `plan` | Temporary strict mode during planning phase |
| `dontAsk` | Deny all risky operations (read-only) |

### Permission Rules

Rules have three behaviors: `allow`, `deny`, `ask`. They come from five base sources (in priority order), plus additional per-session sources:

1. **Policy settings** — Org-enforced (highest priority, remote-managed)
2. **Flag settings** — CLI arguments
3. **Project settings** — Per-project `.claude/settings.json`
4. **Local settings** — Workspace-local config
5. **User settings** — Global `~/.claude/settings.json`

Additional runtime sources: `cliArg`, `command`, `session` (for one-off approvals during a session).

Rule examples:
```
"Bash(npm:*)"           → Allow npm commands
"Edit(~/.claude/**)"    → Allow editing claude config
"Bash(!rm:*)"           → Deny rm commands
```

### YOLO Classifier

A ~52KB ML-based command analyzer used in `auto` mode:

- Analyzes bash commands, file operations, and tool inputs
- Scores risk based on dangerous patterns, file locations, command structure
- Runs speculatively in parallel with UI (doesn't block)
- Three outcomes: auto-approve, auto-deny, or fall back to asking
- Separate classifiers for PowerShell and sed commands
- If classifier fails or times out, defaults to asking the user

### Permission Dialog

In `default` mode, the user sees an interactive dialog:

```
┌─ Permission Request ────────────────────────┐
│ Bash: npm install express                    │
│                                              │
│ [Allow]  [Allow Always]  [Deny]  [Deny Always] │
└──────────────────────────────────────────────┘
```

- "Allow Always" persists the rule to settings
- "Deny Always" adds a permanent deny rule
- Shows tool name, input parameters (truncated), risk summary

### Enterprise Controls

- **Remote-managed settings**: Org admins push permission rules via polling (1-hour interval)
- **Accept-or-exit**: Dangerous policy changes require user acceptance — rejection exits the app
- **Kill switches**: GrowthBook feature flags can remotely disable bypass mode or auto mode
- **Denial tracking**: Records which tools were denied for analytics

### Code Location

- Permission hook: `src/hooks/useCanUseTool.tsx`
- Permission rules: `src/utils/permissions/permissions.ts`
- YOLO classifier: `src/utils/permissions/yoloClassifier.ts`
- Permission dialog: `src/components/permissions/PermissionDialog.tsx`
- Auto-mode denials: `src/utils/permissions/autoModeDenials.ts`
- Kill switches: `src/utils/permissions/bypassPermissionsKillswitch.ts`

## Comparison

| Aspect | Codex (Guardian) | Claude Code (Multi-Layer) |
|--------|-----------------|--------------------------|
| **Approval modes** | 5 modes (never, on-failure, on-request, unless-trusted, granular) | 6 modes |
| **Auto-approval** | Execution policy matching (declarative) | ML classifier (adaptive) |
| **Typed requests** | Yes (ShellCommand, ApplyPatch, etc.) | Per-tool check (generic) |
| **Runtime amendment** | Model can request new permissions | User adds rules via dialog |
| **Enterprise** | Config-driven | Remote-managed with kill switches |
| **Persistence** | Exec policies (TOML/JSON) | Settings files (JSON) |
| **Fallback** | Deny if no policy matches | Ask user if classifier uncertain |

### Key Design Difference

Codex uses **declarative policies** — rules are written down and matched against commands. The model can even request new permissions at runtime via the `request_permissions` tool.

Claude Code uses **adaptive classification** — an ML model analyzes each command in real-time. This handles novel commands better but is less predictable than pattern matching.
