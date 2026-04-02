# Chapter 7: Sandbox & Security

This is the **biggest architectural divergence** between the two agents. Both face the same problem — the model can generate arbitrary commands — but they solve it at completely different layers of the stack.

## Codex: Kernel-Level Sandboxing

Codex wraps every command execution in an **OS-level sandbox**. Even if the model generates a malicious command, the kernel blocks it.

### Platform-Specific Mechanisms

| Platform | Mechanism | How It Works |
|----------|-----------|-------------|
| **macOS** | Apple Seatbelt | Kernel sandbox profiles define allowed operations (file reads, writes, network, process spawning). Applied via `sandbox-exec`. |
| **Linux** | Landlock + seccomp + bubblewrap | **Landlock**: Kernel LSM for path-based filesystem restrictions. **seccomp**: Syscall filtering (block dangerous syscalls). **bubblewrap**: Filesystem isolation via kernel namespaces. |
| **Windows** | Restricted Tokens | Creates processes with restricted access tokens, dropping privileges. |

### Sandbox Modes

Users configure the sandbox level:

| Mode | What the model can do |
|------|----------------------|
| `read-only` (default) | Read any file in workspace, but cannot write or access network |
| `workspace-write` | Read and write within the current workspace directory |
| `danger-full-access` | No sandboxing — full system access |

### Execution Policies

Beyond the sandbox, Codex uses **declarative execution policies** (JSON/TOML) that define which commands are allowed:

- Pattern matching on command prefixes
- Path-based restrictions
- Environment variable controls
- Can be **updated at runtime** via user approval

### Code Location

- Sandbox abstraction: `codex-rs/sandboxing/`
- Linux sandbox: `codex-rs/linux-sandbox/`
- Execution policies: `codex-rs/execpolicy/`
- Sandbox policy in prompts: `codex-rs/protocol/src/prompts/permissions/sandbox_mode/`

### Key Property

The sandbox is **defense in depth**. Even if the approval system has a bug, even if the model crafts a clever command that passes policy checks, the kernel-level sandbox is the final barrier. The model physically cannot write to `/etc/passwd` in `read-only` mode — the syscall will fail.

## Claude Code: Application-Level Controls

Claude Code has **no kernel-level sandbox**. Instead, it checks every operation before execution through a multi-layered permission system.

### Permission Layers

1. **Path restrictions**: Allowlists and denylists for file operations
   - `allowRead[]`, `denyRead[]`, `allowWrite[]`, `denyWrite[]`
   - Domain restrictions for network access

2. **YOLO Classifier** (52KB): An ML model that analyzes commands and scores risk
   - Runs async alongside the UI (speculative check)
   - Can auto-approve safe operations in `auto` mode
   - Falls back to user prompt if uncertain
   - Separate classifiers for Bash, PowerShell, sed

3. **Dangerous pattern detection**: Hardcoded rules for known-dangerous patterns
   - `rm -rf /`, `dd if=/dev/zero`, `format C:`
   - System file edits: `/etc/passwd`, Windows registry
   - Credential leaking in URLs
   - Symlink traversal attacks

4. **Permission rules**: Configurable allow/deny/ask rules from 5 sources
   - Policy settings (org-enforced, highest priority)
   - Flag settings (CLI arguments)
   - Project settings (per-project config)
   - Local settings (workspace-local)
   - User settings (global)

### Code Location

- Permissions: `src/utils/permissions/permissions.ts`
- YOLO classifier: `src/utils/permissions/yoloClassifier.ts`
- Dangerous patterns: `src/utils/permissions/dangerousPatterns.ts`
- Filesystem rules: `src/utils/permissions/filesystem.ts`
- Shell rule matching: `src/utils/permissions/shellRuleMatching.ts`

### Key Property

The permission system is **flexible and adaptive**. The LLM classifier (a side query to Claude itself) can assess novel commands the rule system hasn't seen. Rules can be configured at multiple levels. But it's only as good as its analysis — if a command passes all checks, it runs with full system privileges.

## Comparison

| Aspect | Codex (Kernel Sandbox) | Claude Code (App-Level) |
|--------|----------------------|------------------------|
| **Enforcement** | OS kernel blocks operations | Application checks before execution |
| **Bypass resistance** | Very high — kernel-level | Lower — relies on analysis correctness |
| **Novel attacks** | Blocked by capability restrictions | May pass if classifier doesn't recognize |
| **Setup complexity** | Requires platform-specific sandbox support | No special OS support needed |
| **Performance** | Minimal overhead (kernel-native) | Classifier adds latency per command |
| **Flexibility** | Fixed sandbox modes | Fine-grained per-tool rules |
| **Portability** | Different mechanism per OS | Same code everywhere |
| **User experience** | Silent enforcement (denied ops just fail) | Interactive dialogs explain what's happening |

### Defense in Depth

| Layer | Codex | Claude Code |
|-------|-------|-------------|
| **Prompt instructions** | Yes (tells model what's allowed) | Yes (tells model what's allowed) |
| **Approval system** | Guardian approval requests | Permission dialogs / classifier |
| **Execution policy** | Declarative command rules | Pattern-based deny rules |
| **Kernel sandbox** | Yes (Seatbelt / Landlock / seccomp) | No |
| **Network isolation** | Yes (sandbox can block network) | Domain allowlists only |

Codex has one more layer. Both rely on prompt-level guidance and approval systems, but Codex adds a hardware-enforced barrier that Claude Code lacks.

### The Tradeoff

Codex's kernel sandboxing is **stronger but less portable**. It requires platform-specific code (Seatbelt profiles, Landlock rules, seccomp filters) and may not work in all environments (older kernels, containers without capabilities).

Claude Code's application-level controls are **more portable but weaker**. They work anywhere JavaScript runs, can be configured remotely for enterprise deployment, and provide a richer user experience (explaining why something was blocked). But they're fundamentally pre-execution checks — once a command passes, there's no safety net.
