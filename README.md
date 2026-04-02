# Understanding Fantastic Coding Agents

A deep technical exploration of how modern AI coding agents work — from architecture to implementation details.

This project dissects production coding agents (starting with **OpenAI Codex CLI** and **Anthropic Claude Code**) to understand the engineering behind them. Each chapter examines a core component, explains the design space, and compares how different agents solve the same problems.

## Who This Is For

- Engineers building AI-powered developer tools
- Developers curious about how coding agents work under the hood
- Researchers studying agentic AI systems
- Anyone who wants to go beyond "it uses an LLM" and understand the real engineering

## Table of Contents

| # | Chapter | Description |
|---|---------|-------------|
| 01 | [Overview](docs/01-overview/README.md) | What coding agents are, the two agents compared, high-level design philosophies |
| 02 | [Architecture](docs/02-architecture/README.md) | Language choices, project structure, entry points, build & distribution |
| 03 | [Agent Loop](docs/03-agent-loop/README.md) | The core execution cycle — how agents think, act, and iterate ([deep dive](docs/03-agent-loop/agentic-execution.md)) |
| 04 | [Tool System](docs/04-tool-system/README.md) | How tools are defined, registered, and executed |
| 05 | [File Search](docs/05-file-search/README.md) | Finding files and searching code — ripgrep, indexing, and search strategies |
| 06 | [File Editing](docs/06-file-editing/README.md) | How agents modify code — patch-based vs string-replacement approaches |
| 07 | [Sandbox & Security](docs/07-sandbox-security/README.md) | Kernel sandboxing vs application-level controls |
| 08 | [Permissions](docs/08-permissions/README.md) | Approval systems, classifiers, and trust models |
| 09 | [Context Management](docs/09-context-management/README.md) | Conversation history, compaction, and token budgeting |
| 10 | [Prompt Engineering](docs/10-prompt-engineering/README.md) | System prompt construction, templates, and dynamic injection |
| 11 | [Model Integration](docs/11-model-integration/README.md) | API clients, streaming, caching, and provider abstraction |
| 12 | [Multi-Agent](docs/12-multi-agent/README.md) | Sub-agent spawning, communication, and coordination |

## Agents Covered

| Agent | Vendor | Language | Repository | Version Analyzed |
|-------|--------|----------|------------|-----------------|
| **Codex CLI** | OpenAI | Rust | [openai/codex](https://github.com/openai/codex) (open source) | [`868ac15`](https://github.com/openai/codex/commit/868ac158d7e7c3e4618e531d85595da53222d742) (2026-03-31) |
| **Claude Code** | Anthropic | TypeScript | Decompiled source (v2.1.88) | See note below |

> **Source availability**: Codex CLI is fully open source under Apache 2.0. Claude Code is a **closed-source commercial product** — Anthropic does not publish its source code. Our analysis is based on decompiled/leaked TypeScript source (v2.1.88) that has circulated publicly. This means Claude Code internals may differ from what ships, and file paths or function names are reconstructed from the bundle. See [VERSIONS.md](VERSIONS.md) for details.
>
> **Version pinning**: Code changes fast. All analysis is based on the specific versions listed above. Concepts should remain relevant even as implementations evolve, but specific code references may shift.

## How to Read

Each chapter is self-contained. You can read them in order for a full picture, or jump to any chapter that interests you. Every chapter follows the same structure:

1. **What this component does** — the problem being solved
2. **How each agent implements it** — with references to actual source code
3. **Comparison** — tradeoffs, design philosophy, and key differences

## Contributing

Found an error? Want to add analysis of another coding agent? PRs welcome.

## License

MIT
