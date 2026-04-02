# Chapter 2: Architecture

## Project Structure

### Codex CLI — Rust Monorepo

Codex is built as a Rust workspace with 81 crates, each with a clear responsibility:

```
codex/
├── codex-cli/              # NPM wrapper (JS) — spawns the native Rust binary
│   └── bin/codex.js        # Platform detection, signal forwarding
│
├── codex-rs/               # Rust monorepo (primary implementation)
│   ├── cli/                # CLI multitool entry (clap-based)
│   ├── tui/                # Terminal UI (Ratatui, fullscreen interactive)
│   ├── exec/               # Non-interactive execution engine
│   ├── core/               # Business logic (session, agent loop, tools, approvals)
│   ├── app-server/         # WebSocket/stdio server for IDE extensions
│   ├── protocol/           # Wire protocol types, prompt templates
│   ├── codex-api/          # OpenAI API client
│   ├── sandboxing/         # Platform sandbox abstraction
│   ├── linux-sandbox/      # Linux-specific sandbox (Landlock, seccomp, bwrap)
│   ├── execpolicy/         # Declarative execution policies
│   ├── file-search/        # Fuzzy file finder (nucleo + ignore crate)
│   ├── shell-command/      # Shell command parsing and safety analysis
│   ├── hooks/              # Lifecycle hooks
│   ├── skills/             # Skill system
│   ├── mcp-server/         # MCP server implementation
│   └── utils/              # Shared utilities
```

**Key design decision**: Each major concern is a separate crate with its own types and tests. The `core` crate depends on `protocol`, `sandboxing`, `execpolicy`, etc. — clean dependency boundaries enforced by the Rust compiler.

### Claude Code — TypeScript Monolith

Claude Code is a single TypeScript package, organized by feature:

```
claude-code-source-code/
├── src/
│   ├── entrypoints/        # CLI and SDK entry points
│   ├── main.tsx            # Primary entry (~785KB — massive)
│   ├── query.ts            # Core agent loop (~67KB)
│   ├── QueryEngine.ts      # SDK/headless query orchestrator
│   ├── Tool.ts             # Tool interface & factory
│   ├── tools.ts            # Tool registry (40+ tools)
│   ├── tools/              # Tool implementations (~40 subdirectories)
│   ├── services/           # Business logic (API, MCP, analytics)
│   ├── components/         # Terminal UI components (custom Ink-like renderer)
│   ├── hooks/              # React hooks (~104 files)
│   ├── state/              # AppState store
│   ├── utils/              # ~298 utility modules
│   ├── constants/          # Configuration & prompts
│   └── types/              # TypeScript type definitions
```

**Key design decision**: Everything is in one bundle with compile-time feature gates (`feature()` from `bun:bundle`) for dead code elimination. Internal-only features are stripped from external builds without separate packages.

> **Note on UI**: Claude Code does not use the npm `ink` package. It has a custom Ink-like terminal renderer built on React and `react-reconciler`, providing a similar declarative terminal UI without the external dependency.

## Entry Points

### Codex — Multitool Binary

Codex uses a **multitool pattern** — one binary, many subcommands:

```
codex              → Interactive TUI (default)
codex exec         → Non-interactive headless execution
codex review       → Code review mode
codex mcp-server   → MCP server for other tools
codex app-server   → WebSocket server for IDE extensions
codex sandbox      → Run commands in sandbox
codex resume       → Resume a previous session
codex fork         → Fork a session
codex login/logout → Authentication
codex apply        → Apply diffs as git patches
```

The CLI entry (`codex-rs/cli/src/main.rs`) uses `clap` for argument parsing and dispatches to the appropriate crate. The NPM wrapper (`codex-cli/bin/codex.js`) detects the platform/architecture, finds the pre-compiled binary, and spawns it as a child process with signal forwarding.

### Claude Code — Fast-Path Flags

Claude Code has a single entry point (`src/entrypoints/cli.tsx`) with a layered fast-path system that avoids loading the full application for simple operations:

```
--version/-v           → Return version, exit (zero imports)
--dump-system-prompt   → Output rendered system prompt
--daemon-worker        → Spawn daemon worker
--remote-control       → Bridge mode
--daemon               → Long-running supervisor
ps/logs/attach/kill    → Session management
```

If none of the fast paths match, the full application loads through `main.tsx` — which initializes analytics, auth, settings, MCP connections, and launches the REPL.

## Build & Distribution

| Aspect | Codex CLI | Claude Code |
|--------|----------|-------------|
| **Build tool** | Cargo (Rust) | Bun bundler |
| **Output** | Statically linked native binary per platform | JavaScript bundle |
| **NPM packages** | `@openai/codex` (wrapper) + `@openai/codex-{platform}-{arch}` (binaries) | `@anthropic-ai/claude-code` (single package) |
| **Platform coverage** | macOS (x64, arm64), Linux (x64, arm64, musl), Windows (x64, arm64) | Anywhere Bun runs |
| **Startup time** | Near-instant (native binary) | ~135ms (JS imports + parallel OS operations) |
| **Binary dependencies** | None — statically linked | Vendored ripgrep binary per platform |

Codex compiles to zero-dependency native binaries. Claude Code ships as JavaScript but vendors platform-specific binaries (ripgrep) for search functionality.
