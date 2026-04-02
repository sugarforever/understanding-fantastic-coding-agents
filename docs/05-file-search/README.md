# Chapter 5: File Search

Searching for files and code is one of the most frequent operations a coding agent performs. How agents implement search reveals fundamental design choices about tool philosophy, dependency management, and trust models.

## The Core Question

Should the agent provide a **built-in search tool** with controlled input/output, or let the model **run shell commands** directly?

| Approach | Agent | Pros | Cons |
|----------|-------|------|------|
| Shell-delegated | Codex | Flexible, model controls everything | Depends on system tools, raw output |
| Built-in tool | Claude Code | Portable, token-optimized, permissioned | Fixed interface, less flexible |

## Codex: Shell-Delegated Search

Codex has **no built-in grep or glob tool** exposed to the model. Search is done through shell commands.

### How It Works

The system prompt (`default.md`, line 264) instructs:

> "When searching for text or files, prefer using `rg` or `rg --files` respectively because `rg` is much faster than alternatives like `grep`. (If the `rg` command is not found, then use alternatives.)"

The model then generates shell commands like:

```bash
rg "pattern" --type py           # content search
rg --files | grep "pattern"      # file search
find . -name "*.ts"              # fallback if rg not found
grep -r "pattern" src/           # another fallback
```

These run through the `shell` tool → kernel sandbox → system-installed `rg`.

### What Codex Does Have

1. **`list_dir` tool** — Directory listing with pagination (offset, limit, depth). Returns formatted file tree. Not pattern-based — just browsing.

2. **`codex-file-search` crate** — A fuzzy file finder for the TUI file picker:
   - Uses `nucleo` (fzf-like fuzzy matcher from the Helix editor)
   - Multi-threaded directory walking via the `ignore` crate
   - Streaming: walk → inject into matcher → report results
   - **Not exposed as a model tool** — only used by the TUI

3. **Abandoned `grep_files` tool** — Test file exists (`grep_files_tests.rs`) with `run_rg_search()` function and `rg_available()` checks. No implementation file. This was a planned built-in grep tool that was never shipped or was removed.

### Ripgrep Dependency

Codex **does not bundle ripgrep**. It depends entirely on the system having `rg` installed. The `ignore` crate (v0.4.23) — the same Rust library that ripgrep is built on — is used for the TUI file picker's directory walking, but that's a library dependency, not the `rg` binary.

If `rg` is not installed:
1. The model runs `rg` → gets "command not found" error
2. The prompt says "use alternatives" → model falls back to `grep` or `find`
3. No pre-flight check — Codex doesn't verify `rg` exists before the model tries it

### Code Location

- File search crate: `codex-rs/file-search/src/lib.rs`
- List dir handler: `codex-rs/core/src/tools/handlers/list_dir.rs`
- Shell handler: `codex-rs/core/src/tools/handlers/shell.rs`
- Abandoned grep tests: `codex-rs/core/src/tools/handlers/grep_files_tests.rs`

## Claude Code: Built-In Search Tools

Claude Code wraps ripgrep into two purpose-built tools with rich parameters and token-optimized output.

### GlobTool — File Name Search

Finds files by pattern using `rg --files --glob`.

**Parameters:**
- `pattern` (required): Glob pattern (e.g., `**/*.tsx`, `src/**/*.ts`)
- `path` (optional): Directory to search in (defaults to CWD)

**Output:**
```json
{
  "filenames": ["src/App.tsx", "src/index.tsx", ...],
  "numFiles": 42,
  "truncated": false
}
```

- Results sorted by modification time (newest first)
- Default limit: 100 files
- Paths converted to relative (saves tokens)

### GrepTool — Content Search

Full ripgrep wrapper with three output modes.

**Parameters:**
- `pattern` (required): Regex pattern
- `path` (optional): File or directory to search
- `glob` (optional): File filter (e.g., `*.js`, `**/*.tsx`)
- `type` (optional): File type filter (e.g., `js`, `py`, `rust`)
- `output_mode`: `content` | `files_with_matches` (default) | `count`
- `-A`, `-B`, `-C`: Context lines after/before/around matches
- `-i`: Case-insensitive
- `-n`: Line numbers (default true for content mode)
- `multiline`: Enable cross-line matching (`rg -U --multiline-dotall`)
- `head_limit`: Max results (default 250, pass 0 for unlimited)
- `offset`: Skip first N results (pagination)

**Output (content mode):**
```
src/App.tsx:14: const [x, setX] = useState(0)
src/App.tsx:28: const [y, setY] = useState("")
```

**Output (files_with_matches mode):**
```json
{
  "filenames": ["src/App.tsx", "src/utils.ts"],
  "numFiles": 2
}
```

### Ripgrep Binary Management

Claude Code ships its own ripgrep in three tiers (tried in order):

1. **Embedded** — In official Bun builds, ripgrep is compiled into the Bun binary. Claude Code spawns itself with `argv0='rg'` to dispatch to the embedded binary.

2. **Vendored** — Pre-compiled binaries at `vendor/ripgrep/{arch}-{platform}/rg` (e.g., `aarch64-darwin/rg`). Includes macOS codesigning handling.

3. **System** — User's installed `rg`. Only used if `USE_BUILTIN_RIPGREP=false`.

### Error Handling

- **Timeout**: 20 seconds default (60s on WSL). SIGTERM → wait 5s → SIGKILL escalation.
- **EAGAIN retry**: If resource-constrained (Docker, CI), ripgrep fails with "Resource temporarily unavailable." Auto-retries with `-j 1` (single-threaded mode).
- **Max buffer**: 20MB for stdout/stderr (handles large monorepos with 200k+ files).
- **Line length cap**: 500 characters per line (prevents base64/minified content bloat).

### System Prompt Enforcement

```
ALWAYS use Grep for search tasks. NEVER invoke `grep` or `rg` as a Bash command.
The Grep tool has been optimized for correct permissions and access.
```

### Code Location

- GlobTool: `src/tools/GlobTool/`
- GrepTool: `src/tools/GrepTool/`
- Ripgrep configuration: `src/utils/ripgrep.ts`
- Glob utility: `src/utils/glob.ts`

## Indexing

**Neither agent builds a project index.** Both search on-the-fly every time via fresh filesystem traversal.

| | Codex | Claude Code |
|---|-------|-------------|
| File index at startup? | No | No |
| AST / symbol index? | No | No (delegates to LSP servers lazily) |
| Search database? | No | No |
| In-memory index? | TUI file picker only (nucleo, ephemeral) | File-read cache (max 1000 entries, mtime-invalidated) |
| Project scanning at startup? | Nothing | File count only (for telemetry, rounded to power of 10) |

### Why No Indexing?

Both agents make the same implicit bet: **fast-enough linear search beats maintaining an index** for the interactive coding agent use case.

- **ripgrep is fast** — searches at ~2GB/s on modern SSDs. Most repos take <1 second.
- **Indexing is expensive** — building a symbol index delays startup by seconds to minutes.
- **Indexes get stale** — files change during the session; index must be maintained.
- **Context window is the bottleneck** — even with an index, the model can only process ~200K tokens per turn.

### LSP as Lazy Indexing (Claude Code)

Claude Code's `LSPTool` provides on-demand code intelligence via Language Server Protocol:
- `goToDefinition`, `findReferences`, `hover`, `documentSymbol`, `workspaceSymbol`
- LSP servers are started lazily (only when first needed for a file type)
- Each server manages its own internal index — Claude Code doesn't build or manage it
- Not a replacement for grep — used for semantic queries, not text search

## Comparison Table

| Aspect | Codex | Claude Code |
|--------|-------|-------------|
| **Search approach** | Shell commands (`rg`, `grep`, `find`) | Built-in `GlobTool` + `GrepTool` |
| **Bundles ripgrep?** | No | Yes (embedded or vendored) |
| **Depends on system `rg`?** | Yes | No |
| **Output optimization** | None — raw shell output | Relative paths, line cap, pagination |
| **Timeout handling** | Shell timeout (if configured) | 20s with escalation, EAGAIN retry |
| **Permission checks** | Via kernel sandbox | Per-tool `checkReadPermission()` |
| **Flexibility** | Full shell — pipe, chain, combine | Fixed parameters — can't pipe |
| **Indexing** | None | None (LSP for semantic queries) |
