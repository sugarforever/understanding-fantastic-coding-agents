# Chapter 1: Overview

## What Is a Coding Agent?

A coding agent is an AI system that can autonomously write, modify, and debug code by combining a large language model (LLM) with a set of tools — shell access, file editing, search, and more. Unlike a chatbot that only suggests code, a coding agent **acts**: it reads your codebase, runs commands, edits files, and iterates until the task is done.

The core loop is deceptively simple:

```
User prompt → LLM reasoning → Tool calls → Results fed back → LLM continues → ... → Done
```

The engineering challenge is everything around that loop: security, permissions, context management, prompt construction, error recovery, and user experience.

## The Two Agents

This project compares two production coding agents that represent different engineering philosophies:

### Codex CLI (OpenAI)

- **Repository**: [openai/codex](https://github.com/openai/codex)
- **Language**: Rust (81 crates in a monorepo)
- **UI**: Ratatui (native terminal TUI)
- **Distribution**: Pre-compiled platform-specific binaries, distributed via NPM wrapper
- **Models**: GPT-4o, o3, GPT-5.x (OpenAI Responses API)

### Claude Code (Anthropic)

- **Source**: Closed-source; analysis based on decompiled source (v2.1.88) — see [VERSIONS.md](https://github.com/sugarforever/understanding-fantastic-coding-agents/blob/main/VERSIONS.md)
- **Language**: TypeScript (single package, Bun runtime)
- **UI**: Custom Ink-like renderer (React + react-reconciler)
- **Distribution**: NPM package, runs in Bun
- **Models**: Claude Sonnet, Opus, Haiku (Anthropic Messages API)

## Design Philosophies

The two agents make fundamentally different bets about how to build a safe, effective coding agent:

### Codex: "Sandbox everything, let the model run free inside"

Codex uses **kernel-level sandboxing** (Apple Seatbelt on macOS, Landlock + seccomp on Linux) to contain the model's actions. The model gets a powerful shell and can run whatever it wants — but the operating system enforces boundaries. This is a **containment-first** approach: assume the model will do unexpected things and make them physically impossible.

The tool set is minimal — mostly `shell` and `apply_patch` — because the model can do anything through the shell. Fewer tools means a simpler system and less surface area.

### Claude Code: "Analyze everything, ask before doing anything risky"

Claude Code uses **application-level permission checks** with an ML classifier to assess risk before execution. There's no kernel sandbox — instead, every tool call goes through a permission system that can auto-approve safe operations, prompt the user for risky ones, or deny dangerous ones outright.

The tool set is large (40+) with purpose-built tools for search, file editing, web access, and more. Each tool has its own permission logic, input validation, and output formatting. This is a **control-at-every-layer** approach.

### The Tradeoff

| Dimension | Codex (Containment) | Claude Code (Control) |
|-----------|--------------------|-----------------------|
| What if the model does something unexpected? | Kernel blocks it | Permission system may not anticipate it |
| Tool flexibility | Model can pipe, chain, combine freely | Fixed tool interfaces |
| Portability | Requires OS-specific sandbox support | Runs anywhere Node/Bun runs |
| Token efficiency | Raw shell output, model formats it | Tool wrappers optimize output for tokens |
| Setup complexity | Needs platform-specific binaries | Pure JavaScript, simpler deployment |

Neither approach is strictly better — they optimize for different threat models and use cases.

## What's Ahead

The following chapters break down each component of the agent architecture, showing how both agents implement it and what tradeoffs they make. Each chapter is self-contained — read them in order or jump to what interests you.
