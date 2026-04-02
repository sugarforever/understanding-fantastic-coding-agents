# Chapter 11: Model & API Integration

Both agents are fundamentally API clients for their respective LLM providers. But the transport, caching, error handling, and multi-provider support differ significantly.

## Codex: OpenAI Responses API

### API Client Architecture

Codex uses a **two-tier client model**:

- **`ModelClient`** — Session-scoped. Holds stable config: auth, provider, conversation_id.
- **`ModelClientSession`** — Turn-scoped. Manages per-turn streaming with connection pooling.

### Transport

Codex supports two transport mechanisms:

| Transport | Description |
|-----------|-------------|
| **HTTP SSE** | Server-Sent Events — standard streaming |
| **WebSocket** | Responses API v2 — persistent connection with prewarm |

WebSocket transport features:
- **Connection pooling**: Reuses connections within a turn
- **Prewarm**: Opens connection before the request is ready
- **Sticky routing**: `x-codex-turn-state` header for server affinity
- **Compression**: Reduces bandwidth
- **Incremental updates**: After first request, only sends deltas

### Request Structure

```rust
ResponsesApiRequest {
    model: "gpt-4o",
    instructions: system_prompt_text,    // System prompt
    input: conversation_history,          // ResponseItems
    tools: tool_schemas,                  // JSON tool definitions
    tool_choice: "auto",
    parallel_tool_calls: true,
    reasoning: Some(reasoning_config),
    stream: true,
    service_tier: Some("default"),
    prompt_cache_key: Some(key),
}
```

### Multi-Provider Support

| Provider | How |
|----------|-----|
| OpenAI | Default (Responses API) |
| Custom providers | Via configuration |
| LM Studio | Local model support |
| Ollama | Local model support |

### Auth

- OAuth device code flow (browser-based login)
- API key authentication
- ChatGPT login via browser
- Token refresh handling
- Keyring-based credential storage

### Error Handling

- Quadratic backoff with up to 10 retries (`withRetry()`)
- Error categorization: quota, rate limit, timeout, transient, fatal
- Stream event processing: `content_block_start`, `content_block_delta`, `message_start`, `message_stop`

### Code Location

- API client: `codex-rs/core/src/client.rs`
- API types: `codex-rs/codex-api/`
- Auth: `codex-rs/core/src/auth/`

## Claude Code: Anthropic Messages API

### API Client Architecture

Claude Code uses a single streaming client per API call, managed by the query loop.

### Transport

HTTP SSE only — no WebSocket support. Streaming events:
- `message_start` — Usage info
- `content_block_start/delta/stop` — Tool use and text streaming
- `message_delta` — Final usage and stop_reason
- `message_stop` — End marker

### Request Structure

```typescript
client.beta.messages.create({
    model: selectedModel,
    max_tokens: maxOutputTokens,
    system: [systemPromptBlocks...],     // Cache-partitioned
    tools: [toolSchemas...],              // Zod → JSON Schema
    messages: normalizedMessages,
    betas: [...],                          // Feature headers
    temperature: 1,                        // Default when thinking enabled; overridable
}, {
    timeout: 5 * 60 * 1000,              // 5-minute timeout
})
```

### Prompt Caching

Claude Code uses Anthropic's **prompt caching** for cost optimization:

```typescript
type CacheScope = 'global' | 'org'

type SystemPromptBlock = {
    text: string,
    cacheScope: CacheScope | null
}
```

- Static prompt content is cached with `global` or `org` scope (reused across conversations)
- Dynamic content has `null` cache scope (not cached, reprocessed each turn)
- At the API level, cache_control uses `type: 'ephemeral'` for cache entries
- Cache invalidation detection: `promptCacheBreakDetection.ts`
- Significant cost savings — cached tokens cost ~90% less

### Multi-Provider Support

| Provider | How |
|----------|-----|
| Anthropic | Default (Messages API beta) |
| AWS Bedrock | Via provider detection |
| Google Vertex | Via provider detection |

### Fallback Model Logic

On overload or rate limiting:
1. Retry with exponential backoff (max 10 retries)
2. Fall back to smaller model (Haiku) if primary model overloaded
3. Cost tracking accounts for model switches
4. `FallbackTriggeredError` signals the switch

### Model Selection

```
Priority:
1. --model CLI flag
2. Settings configuration
3. Default (Sonnet)

Available: Haiku, Sonnet, Opus (aliased by internal codenames)
```

### Error Handling

- `categorizeRetryableAPIError()` — Network vs permanent errors
- `prompt_too_long` recovery via context compaction
- `max_output_tokens` recovery loop (up to 3 attempts)
- `FallbackTriggeredError` — Triggers model downgrade

### Code Location

- API client: `src/services/api/claude.ts`
- Prompt caching: `src/utils/promptCacheBreakDetection.ts`
- API utilities: `src/utils/api.ts`
- Retry logic: `src/services/api/withRetry.ts`
- Model selection: `src/utils/model/model.js`

## Comparison

| Aspect | Codex | Claude Code |
|--------|-------|-------------|
| **API** | OpenAI Responses API (v2) | Anthropic Messages API (beta) |
| **Transport** | HTTP SSE + WebSocket | HTTP SSE only |
| **Connection reuse** | WebSocket pooling + prewarm | Per-request |
| **Prompt caching** | Server-side (`prompt_cache_key`) | Client-directed cache scopes (`global`/`org`) |
| **Auth methods** | OAuth, API key, ChatGPT login, keyring | API key, OAuth |
| **Multi-provider** | OpenAI, LM Studio, Ollama, custom | Anthropic, Bedrock, Vertex |
| **Fallback** | Model-specific instructions | Downgrade to smaller model (Haiku) |
| **Retry strategy** | Quadratic backoff, 10 retries | Exponential backoff, 10 retries |
| **Streaming events** | SSE or WebSocket events | SSE content_block deltas |
| **Temperature** | Configurable | Default 1 when thinking is enabled (overridable) |

### Key Differences

**Transport**: Codex's WebSocket with connection pooling and prewarm gives it lower latency for multi-turn conversations. Claude Code uses standard HTTP SSE, simpler but higher overhead per request.

**Caching**: Claude Code's client-directed prompt caching is more sophisticated — it explicitly marks which parts of the system prompt are cacheable and at what scope. Codex relies on server-side caching with a cache key.

**Provider breadth**: Codex supports local models (LM Studio, Ollama) out of the box. Claude Code supports cloud providers (Bedrock, Vertex) for enterprise deployment.
