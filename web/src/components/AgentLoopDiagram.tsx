import { useState } from 'react';

interface Step {
  label: string;
  description: string;
}

const codexSteps: Step[] = [
  { label: 'User Input', description: 'User submits prompt via TUI or exec mode' },
  { label: 'TurnContext', description: 'Immutable per-turn config: model, sandbox policy, permissions' },
  { label: 'Build Prompt', description: 'Base instructions + personality + approval/sandbox policy' },
  { label: 'Stream API', description: 'SSE or WebSocket to OpenAI Responses API' },
  { label: 'Tool Futures', description: 'Tool calls extracted from OutputItemDone, spawned as futures' },
  { label: 'RwLock Exec', description: 'Parallel-safe tools get read lock, mutating tools get write lock' },
  { label: 'Drain', description: 'All tool futures awaited at stream completion via FuturesOrdered' },
  { label: 'Continue?', description: 'If tools executed → next turn. If not → stop. No max turns limit.' },
];

const claudeSteps: Step[] = [
  { label: 'User Input', description: 'User submits message via React/Ink terminal UI' },
  { label: 'Auto-Compact', description: '5-layer compaction cascade before each API call' },
  { label: 'System Prompt', description: 'Modular sections with cache-aware global/org splitting' },
  { label: 'Stream API', description: 'SSE to Anthropic Messages API with content_block deltas' },
  { label: 'Streaming Exec', description: 'Tools start executing during streaming via StreamingToolExecutor' },
  { label: 'Batch Tools', description: 'Safe tools concurrent (max 10), writes serial' },
  { label: 'Yield Results', description: 'Generator yields events, results fed back as tool_result blocks' },
  { label: 'Continue?', description: '7 continue sites. Max turns, stop hooks, budget, diminishing returns.' },
];

function FlowColumn({ title, steps, color }: { title: string; steps: Step[]; color: string }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div style={{ flex: 1, minWidth: '280px' }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.8rem',
        color,
        textTransform: 'uppercase',
        letterSpacing: '2px',
        marginBottom: '16px',
        textAlign: 'center',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        {steps.map((step, i) => (
          <div key={i}>
            <div
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === i ? '#1f1f1f' : '#141414',
                border: `1px solid ${hovered === i ? color : '#262626'}`,
                borderRadius: '8px',
                padding: '10px 16px',
                width: '260px',
                cursor: 'default',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color, marginBottom: hovered === i ? '6px' : '0' }}>
                {step.label}
              </div>
              {hovered === i && (
                <div style={{ fontSize: '0.8rem', color: '#a3a3a3', lineHeight: 1.4 }}>
                  {step.description}
                </div>
              )}
            </div>
            {i < steps.length - 1 && (
              <div style={{ textAlign: 'center', color: '#333', fontSize: '0.8rem', lineHeight: 1 }}>↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AgentLoopDiagram() {
  return (
    <section style={{ padding: '64px 0' }}>
      <h2 style={{
        fontFamily: "'JetBrains Mono', monospace",
        color: '#d4a574',
        fontSize: '1.4rem',
        textAlign: 'center',
        marginBottom: '8px',
      }}>
        The Agent Loop
      </h2>
      <p style={{ color: '#a3a3a3', textAlign: 'center', marginBottom: '40px', fontSize: '0.95rem' }}>
        Hover on a step to see what happens underneath
      </p>
      <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <FlowColumn title="Codex CLI" steps={codexSteps} color="#4ade80" />
        <FlowColumn title="Claude Code" steps={claudeSteps} color="#60a5fa" />
      </div>
    </section>
  );
}
