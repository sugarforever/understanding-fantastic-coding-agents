# Version Pinning

This book analyzes specific snapshots of each agent's source code. All file paths, function names, code excerpts, and architectural observations are based on these versions.

## Codex CLI (OpenAI)

- **Repository**: [openai/codex](https://github.com/openai/codex) (open source, Apache 2.0)
- **Commit**: [`868ac15`](https://github.com/openai/codex/commit/868ac158d7e7c3e4618e531d85595da53222d742) (2026-03-31)
- **Language**: Rust (workspace of 81 crates)

```bash
git clone https://github.com/openai/codex.git
cd codex && git checkout 868ac158d7e7c3e4618e531d85595da53222d742
```

## Claude Code (Anthropic)

- **Source**: Decompiled / leaked (not official) — [sanbuphy/claude-code-source-code](https://github.com/sanbuphy/claude-code-source-code)
- **Commit**: `3da94d5` (2026-03-31)
- **Version**: v2.1.88, TypeScript

### Important Note on Source

Claude Code is a **closed-source commercial product**. Anthropic does not publish its source code in a public repository. The analysis in this book is based on decompiled TypeScript source that has been publicly circulated on GitHub by third parties.

This means:
- File paths and function names are reconstructed from the bundled output and may not match Anthropic's internal structure exactly
- Some code may be minified, obfuscated, or have lost original comments
- Internal-only features (feature-gated code) may be present but not ship to users
- The analysis reflects what was observable in the decompiled source, which may differ from the actual development codebase

Despite these caveats, the architectural patterns, design decisions, and implementation approaches are clearly visible and provide genuine insight into how the agent works.

## Why Pin Versions?

Coding agents evolve rapidly. Between the time this analysis was written and when you read it:

- Files may have been renamed or moved
- Functions may have been refactored
- New features may have been added
- Architectural decisions may have changed

The **concepts and design patterns** described in each chapter should remain relevant even as implementations evolve. But if you want to verify a specific code reference, check out the pinned commit.

## Updating This Book

When updating the analysis for newer versions:

1. Update the commit hashes and dates in this file
2. Review each chapter for accuracy against the new code
3. Note any significant architectural changes in the relevant chapter
4. Keep the old version info in a "Previously analyzed" section below for reference

## Previously Analyzed

(None yet — this is the first version of the book.)
