# Chapter 10: Prompt Engineering

The system prompt is the agent's "personality and instruction manual." How it gets constructed, what goes into it, and how it's delivered to the API are surprisingly different between the two agents.

## Codex: Compile-Time Embedded Templates

### Base Prompt

The base system prompt lives in `codex-rs/protocol/src/prompts/base_instructions/default.md` (~276 lines). It's embedded into the Rust binary at compile time:

```rust
// codex-rs/protocol/src/models.rs:343
pub const BASE_INSTRUCTIONS_DEFAULT: &str = include_str!("prompts/base_instructions/default.md");
```

This means the prompt is baked into the binary — no file I/O at runtime, no chance of tampering. The tradeoff is that changing the prompt requires recompiling.

### Prompt Content

The base prompt covers:
- Agent identity and capabilities
- AGENTS.md spec (how to read repo-level instructions)
- Preamble messages (brief explanations before tool calls)
- Planning guidance (when and how to use `update_plan`)
- Task execution philosophy (keep going until done, don't guess)
- Coding guidelines (fix root cause, minimal changes, no copyright headers)
- Validation approach (test your work, start specific then broaden)
- Shell guidelines ("prefer `rg` for search")
- Final answer formatting (headers, bullets, monospace, file references)

### Dynamic Assembly Pipeline

```
default.md (compile-time include_str!)
    ↓
get_model_instructions(personality)
    — Applies personality template ({{ personality }})
    — Personality options: Friendly, Pragmatic, None
    — Model-specific templates from models.json
    ↓
SessionConfiguration.base_instructions
    ↓
DeveloperInstructions::from()
    — Injects approval policy markdown (never/on_request/on_failure/untrusted)
    — Injects sandbox mode markdown (read_only/workspace_write/danger_full_access)
    — Adds guardian subagent suffix if applicable
    — Adds request_permissions tool description if enabled
    — Adds approved command prefixes from exec policy
    ↓
build_prompt()
    — Combines with conversation history (input)
    — Combines with tool schemas (tools)
    ↓
ResponsesApiRequest {
    instructions: String,       // ← system prompt
    input: Vec<ResponseItem>,   // ← conversation
    tools: Vec<ToolSpec>,       // ← tool schemas (separate!)
}
```

### Key Design Decisions

1. **Tool schemas are separate from the prompt**: The system prompt says "emit function calls to run terminal commands" generically. Actual tool names, parameters, and descriptions go in the `tools` JSON array — a separate API field.

2. **Personality is template-based**: Model-specific instruction files use `{{ personality }}` placeholders that get replaced with personality-specific text blocks.

3. **Permission context is prompt-injected**: Different approval modes and sandbox modes each have their own markdown file that gets concatenated into the system prompt.

4. **Same prompt for all users**: No internal/external differentiation.

### Prompt Template Files

```
protocol/src/prompts/
├── base_instructions/
│   └── default.md                    # Base prompt (~276 lines)
├── permissions/
│   ├── approval_policy/
│   │   ├── never.md                  # "You may run commands freely"
│   │   ├── on_request.md             # "Request approval for sensitive ops"
│   │   ├── on_failure.md             # "Retry with approval on failure"
│   │   ├── unless_trusted.md         # "Ask unless command is trusted"
│   │   └── on_request_rule_request_permission.md
│   └── sandbox_mode/
│       ├── read_only.md              # "You cannot write files"
│       ├── workspace_write.md        # "You can write in workspace"
│       └── danger_full_access.md     # "Full access, be careful"
└── realtime/
    ├── realtime_start.md
    └── realtime_end.md

core/templates/
├── model_instructions/
│   └── gpt-5.2-codex_instructions_template.md
├── personalities/
│   ├── gpt-5.2-codex_pragmatic.md
│   └── gpt-5.2-codex_friendly.md
├── collaboration_mode/
│   ├── default.md
│   ├── plan.md
│   └── execute.md
└── agents/
    └── orchestrator.md
```

### Code Location

- Base instructions: `codex-rs/protocol/src/prompts/base_instructions/default.md`
- Prompt assembly: `codex-rs/protocol/src/models.rs`
- Model-specific instructions: `codex-rs/protocol/src/openai_models.rs`
- Session config: `codex-rs/core/src/codex.rs`
- Models config: `codex-rs/core/models.json`

## Claude Code: Dynamic Modular Sections

### Prompt Architecture

Claude Code builds its system prompt from modular sections that are assembled at runtime:

```
[BASE_SYSTEM_PROMPT]              ~2K chars: core identity and instructions
[TOOL_INSTRUCTIONS]               Tool list and schemas
[MODEL_SPECIFIC_NOTES]            Sonnet vs Opus guidance
[WORKSPACE_INFO]                  Git status, file count, CWD
[MEMORY_CONTEXT]                  Memory.md if exists
[CUSTOM_AGENTS_PROMPT]            Custom agent descriptions
[MCP_INSTRUCTIONS]                MCP resource catalog
[SKILL_INSTRUCTIONS]              Installed skills
[EFFORT_ANCHORS]                  Effort level guidance (internal only)
[BRIEF_PROACTIVE_SECTION]         Brief/proactive mode (feature-gated)
[APPEND_SYSTEM_PROMPT]            User-provided append
```

### Cache-Aware Splitting

A critical optimization: the system prompt is split at a **dynamic boundary marker**:

```
SYSTEM_PROMPT_DYNAMIC_BOUNDARY = '__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__'

┌─────────────────────────────────┐
│ Static content (before marker)  │ → Cache scope: 'global' or 'org'
│ - Base instructions             │   (reused across conversations)
│ - Tool descriptions             │
│ - Model-specific notes          │
├─────────────────────────────────┤
│ Dynamic content (after marker)  │ → No cache scope (not cached)
│ - Workspace info                │   (changes per session/turn)
│ - Memory context                │
│ - MCP instructions              │
│ - User context                  │
└─────────────────────────────────┘
```

The `CacheScope` type is defined as `'global' | 'org'` — static content is cached at one of these scopes. Dynamic content after the boundary has no cache scope and is reprocessed each turn. At the API level, cache_control uses `type: 'ephemeral'` in the request, but this is an API-level mechanism, not a distinct CacheScope value.

This allows the Anthropic API to cache the static portion and only reprocess the dynamic portion each turn — significant cost savings.

### Internal vs External Prompts

Claude Code serves **different prompts** based on user type:

| Aspect | External Users | Internal (Anthropic) Users |
|--------|---------------|---------------------------|
| Verbosity | "Be extra concise" | "Err on the side of more explanation" |
| Length anchors | None | Numeric word limits per effort level |
| Model patches | Standard | Capybara v8 false-claim mitigation |
| Verification | None | Required verification agent for risky edits |
| Features | Standard tools | REPL, background PR suggestions, performance monitoring |

### Section Caching

Some sections are **cached per-session** (won't change mid-conversation), while others are **uncached** (re-fetched every turn):

```typescript
systemPromptSection()                    // Cached per-session
DANGEROUS_uncachedSystemPromptSection()  // Re-fetched every turn (e.g., MCP instructions)
```

### Code Location

- Prompt sections: `src/constants/prompts.ts`
- System prompt sections: `src/utils/systemPromptSections.ts`
- Cache splitting: `src/utils/api.ts` (`splitSysPromptPrefix()`)
- API delivery: `src/services/api/claude.ts`

## Comparison

| Aspect | Codex | Claude Code |
|--------|-------|-------------|
| **Base prompt storage** | Compiled into binary (`include_str!`) | Runtime TypeScript module |
| **Base prompt size** | ~276 lines | Modular sections, total varies |
| **Dynamic content** | AGENTS.md, approval/sandbox policy, personality | Memory, MCP, skills, hooks, effort, workspace |
| **Tool descriptions** | Separate `tools` JSON array (not in prompt) | Both in `tools` parameter and in prompt (via `prompt()` method) |
| **Caching** | No explicit prompt caching | Cache-aware split (`global`/`org` scopes for static content) |
| **Personality** | Template-based (`{{ personality }}`) | Model-specific notes (Sonnet vs Opus) |
| **Internal/External** | Same for all users | Different prompts by user type |
| **Per-turn updates** | Approval policy, sandbox mode | MCP instructions, workspace info |
| **Model-specific** | Instruction templates per model in models.json | Hardcoded Capybara patches, model-specific notes |

### Key Insight

Codex's prompt is simpler and more focused — the model gets clear instructions and is trusted to figure out the details. Claude Code's prompt is more elaborate with per-user differentiation, cache optimization, and extensive model-specific patches. This reflects their different maturity levels and deployment contexts.
