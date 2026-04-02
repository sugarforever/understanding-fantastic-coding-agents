# Chapter 6: File Editing

How an agent modifies code is a core design decision. The editing approach affects reliability, token efficiency, multi-file changes, and the user's ability to review what happened.

## Codex: Unified Patch Format (`apply_patch`)

Codex uses a **fully custom patch engine** implemented in Rust (`codex-rs/apply-patch/` crate). It does not use OS-level tools like `patch`, `git apply`, or `diff` — everything is implemented from scratch.

### Patch Syntax

```
*** Begin Patch
*** Update File: path/to/file.py
@@ def example():
-    pass
+    return 123
*** End Patch
```

A single patch can:
- **Update** existing files (with context-based line matching)
- **Create** new files
- **Delete** files
- **Move/rename** files

### Execution Flow

1. Parse patch syntax and validate structure
2. Compute file changes (create, update, delete, move)
3. Check permissions for all affected paths
4. Request approval if necessary
5. Apply changes atomically via `codex-apply-patch` library
6. Return structured result (files modified, change count, success/error)

### Key Properties

- **Transaction semantics**: All changes apply atomically, or all roll back
- **Line-based context matching**: Uses surrounding lines to find the right edit location
- **Multi-file**: One tool call can modify multiple files
- **Undo support**: Captures original file state for rollback

### Code Location

- Handler: `codex-rs/core/src/tools/handlers/apply_patch.rs`
- Patch library: `codex-rs/apply-patch/` crate

## Claude Code: String Replacement (`FileEdit`)

Claude Code uses a **fully custom string replacement tool** implemented in TypeScript (`src/tools/FileEditTool/`). It does not shell out to `sed`, `patch`, or any external command — the core is JavaScript's native `String.replace()` / `String.replaceAll()` with custom matching and encoding logic on top.

### Input Format

```json
{
  "file_path": "/absolute/path/to/file.py",
  "old_string": "    pass",
  "new_string": "    return 123",
  "replace_all": false
}
```

### Execution Flow

1. Expand path (resolve `~`, validate absolute)
2. Check write permissions via `checkWritePermissionForTool()`
3. Read file with encoding detection (UTF-8, UTF-16LE, BOM handling)
4. Find exact match via `findActualString()` (with fuzzy whitespace matching)
5. Validate `old_string` is unique in the file (fails if ambiguous)
6. Generate unified diff for display
7. Write atomically
8. Track in file history
9. Notify LSP server of change
10. Return diff and line change count

### Key Properties

- **Exact string match**: Must match precisely (or fuzzy on whitespace)
- **Uniqueness required**: `old_string` must appear exactly once (unless `replace_all: true`)
- **Single file per call**: One tool call edits one file at one location
- **No transaction across files**: Each edit is independent

### Safety Checks

- File size limit: 1 GiB (V8 string limit)
- Detects unexpected modifications (another process wrote between read and edit)
- Preserves line endings (LF vs CRLF)
- Blocks edits to team memory files with secrets
- Blocks UNC paths (prevents NTLM credential leaks on Windows)

### Code Location

- FileEditTool: `src/tools/FileEditTool/FileEditTool.ts`
- FileWriteTool: `src/tools/FileWriteTool/` (new file creation)
- FileReadTool: `src/tools/FileReadTool/` (text, PDF, images, notebooks)

## Comparison

| Aspect | Codex (`apply_patch`) | Claude Code (`FileEdit`) |
|--------|----------------------|--------------------------|
| **Format** | Unified diff with `@@` hunks | `old_string` → `new_string` replacement |
| **Multi-file** | Yes — one patch, many files | No — one call per file per location |
| **Atomicity** | Full transaction (all or nothing) | Per-edit (no cross-file transactions) |
| **New files** | Part of patch format | Separate `FileWrite` tool |
| **Delete files** | Part of patch format | Via `Bash` (`rm`) |
| **Implementation** | Custom Rust engine (no OS tools) | Custom TypeScript (native JS `String.replace()`) |
| **Matching** | 4-pass fuzzy: exact → trailing whitespace → all whitespace → Unicode normalization | Exact string with curly/straight quote normalization |
| **Uniqueness** | N/A (context-positioned) | `old_string` must be unique in file |
| **Token cost** | Efficient for multi-file changes | One tool call per edit location |
| **Error mode** | Patch fails if context doesn't match | Edit fails if string not found or ambiguous |

### Tradeoffs

**Codex's patch approach**:
- More powerful — one tool call can restructure an entire module
- Familiar to developers (looks like `git diff`)
- But: patch format is harder for the model to generate correctly
- But: context matching can fail if the file changed since the model read it

**Claude Code's string-replace approach**:
- Simpler — exact string match is unambiguous
- Easier for the model to generate correctly
- But: requires multiple tool calls for multi-location edits
- But: `old_string` must be unique — can fail on repeated patterns
