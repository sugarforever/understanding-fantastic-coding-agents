import { useState, useEffect, useRef } from 'react';

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target]);

  return <span ref={ref}>{value}{suffix}</span>;
}

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

const codexStats: StatItem[] = [
  { value: 81, suffix: '', label: 'Rust Crates' },
  { value: 15, suffix: '+', label: 'Tools' },
];

const claudeStats: StatItem[] = [
  { value: 40, suffix: '+', label: 'Tools' },
  { value: 298, suffix: '+', label: 'Modules' },
];

export default function HeroBanner() {
  return (
    <section style={{ padding: '80px 0 64px', textAlign: 'center' }}>
      <h1 style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
        color: '#d4a574',
        marginBottom: '12px',
      }}>
        Understanding Fantastic<br />Coding Agents
      </h1>
      <p style={{ color: '#a3a3a3', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto 48px' }}>
        A deep technical exploration of how modern AI coding agents work — from architecture to implementation details.
      </p>

      <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', maxWidth: '800px', margin: '0 auto', flexWrap: 'wrap' }}>
        {/* Codex Panel */}
        <div style={{
          flex: 1,
          minWidth: '300px',
          background: '#141414',
          border: '1px solid #262626',
          borderRadius: '12px 4px 4px 12px',
          padding: '32px 24px',
        }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
            Codex CLI
          </div>
          <div style={{ color: '#a3a3a3', fontSize: '0.85rem', marginBottom: '20px' }}>
            OpenAI · Rust · Kernel Sandbox
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px' }}>
            {codexStats.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.8rem', color: '#4ade80', fontWeight: 700 }}>
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Claude Panel */}
        <div style={{
          flex: 1,
          minWidth: '300px',
          background: '#141414',
          border: '1px solid #262626',
          borderRadius: '4px 12px 12px 4px',
          padding: '32px 24px',
        }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
            Claude Code
          </div>
          <div style={{ color: '#a3a3a3', fontSize: '0.85rem', marginBottom: '20px' }}>
            Anthropic · TypeScript · LLM Classifier
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px' }}>
            {claudeStats.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.8rem', color: '#60a5fa', fontWeight: 700 }}>
                  <AnimatedNumber target={s.value} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ width: '80%', maxWidth: '600px', height: '3px', background: 'linear-gradient(90deg, #4ade80 50%, #60a5fa 50%)', borderRadius: '2px', margin: '32px auto 0' }} />

      <a href="#chapters" style={{
        display: 'inline-block',
        marginTop: '32px',
        color: '#a3a3a3',
        fontSize: '0.9rem',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        START EXPLORING ↓
      </a>
    </section>
  );
}
