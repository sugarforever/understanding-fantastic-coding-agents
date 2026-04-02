# Dual Agent Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Astro + React static site in `web/` that renders our 12 comparison chapters with a dark terminal aesthetic and three interactive components.

**Architecture:** Astro static site with React islands for interactivity. Content sourced from existing `docs/` markdown at build time — no duplication. Three React islands: HeroBanner (animated stats), AgentLoopDiagram (side-by-side flows), ToolMatrix (clickable comparison grid).

**Tech Stack:** Astro 5.x, React 19, TypeScript, Shiki (syntax highlighting), plain CSS

---

### Task 1: Scaffold Astro Project

**Files:**
- Create: `web/package.json`
- Create: `web/astro.config.mjs`
- Create: `web/tsconfig.json`
- Create: `web/src/pages/index.astro` (placeholder)
- Create: `web/src/layouts/BaseLayout.astro` (minimal)
- Create: `web/src/styles/global.css`
- Create: `web/public/favicon.svg`

- [ ] **Step 1: Create Astro project**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents
mkdir -p web
cd web
npm create astro@latest -- . --template minimal --no-install --no-git --typescript strict
```

- [ ] **Step 2: Add React integration**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents/web
npx astro add react --yes
```

- [ ] **Step 3: Configure Astro for GitHub Pages**

Write `web/astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  site: 'https://sugarforever.github.io',
  base: '/understanding-fantastic-coding-agents',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
```

- [ ] **Step 4: Write global CSS with dark theme**

Write `web/src/styles/global.css` with the full color system:

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');

:root {
  --bg: #0a0a0a;
  --surface: #141414;
  --border: #262626;
  --text: #e5e5e5;
  --text-secondary: #a3a3a3;
  --codex: #4ade80;
  --claude: #60a5fa;
  --accent: #d4a574;
  --code-bg: #1a1a1a;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.7;
}

h1, h2, h3, h4 {
  font-family: 'JetBrains Mono', monospace;
  line-height: 1.3;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

code, pre {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.5;
}

code:not(pre code) {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.9em;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
  font-size: 0.95rem;
}

th, td {
  border: 1px solid var(--border);
  padding: 10px 14px;
  text-align: left;
}

th { background: var(--surface); color: var(--accent); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; }
tr:nth-child(even) td { background: var(--surface); }

blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 16px;
  color: var(--text-secondary);
  margin: 1.5rem 0;
}

hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }

img { max-width: 100%; }

.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
```

- [ ] **Step 5: Write BaseLayout**

Write `web/src/layouts/BaseLayout.astro`:

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
}

const { title } = Astro.props;
const base = import.meta.env.BASE_URL;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | Understanding Fantastic Coding Agents</title>
  <link rel="icon" type="image/svg+xml" href={`${base}favicon.svg`} />
</head>
<body>
  <nav class="site-nav">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;height:56px;">
      <a href={base} style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--accent);font-size:0.95rem;">
        Coding Agents
      </a>
      <a href="https://github.com/sugarforever/understanding-fantastic-coding-agents" target="_blank" style="color:var(--text-secondary);font-size:0.85rem;">
        GitHub
      </a>
    </div>
  </nav>
  <slot />
  <footer style="border-top:1px solid var(--border);padding:32px 0;margin-top:64px;text-align:center;color:var(--text-secondary);font-size:0.85rem;">
    <div class="container">
      <p>Understanding Fantastic Coding Agents — Analysis pinned to 2026-03-31 commits</p>
    </div>
  </footer>
</body>
</html>

<style>
  .site-nav {
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--bg);
    z-index: 100;
  }
</style>
```

- [ ] **Step 6: Write placeholder index page**

Write `web/src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Home">
  <main class="container" style="padding-top:64px;">
    <h1 style="color:var(--accent);">Understanding Fantastic Coding Agents</h1>
    <p style="color:var(--text-secondary);margin-top:8px;">Site under construction</p>
  </main>
</BaseLayout>
```

- [ ] **Step 7: Write favicon**

Write `web/public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#0a0a0a"/>
  <text x="4" y="23" font-family="monospace" font-size="20" fill="#d4a574">⚡</text>
</svg>
```

- [ ] **Step 8: Install dependencies and verify dev server**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents/web
npm install
npm run dev
```

Expected: Dev server runs at http://localhost:4321, shows placeholder page with dark background and gold heading.

- [ ] **Step 9: Commit**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents
echo "node_modules/\ndist/\n.astro/" > web/.gitignore
git add web/
git commit -m "feat: scaffold Astro project with dark theme and base layout"
```

---

### Task 2: Chapter Metadata and Content Loading

**Files:**
- Create: `web/src/content/chapters.ts`

- [ ] **Step 1: Write chapter metadata**

Write `web/src/content/chapters.ts`:

```typescript
export interface Chapter {
  number: string;
  slug: string;
  title: string;
  description: string;
  docPath: string;
}

export const chapters: Chapter[] = [
  { number: '01', slug: 'overview', title: 'Overview', description: 'What coding agents are, the two agents compared, high-level design philosophies', docPath: '01-overview/README.md' },
  { number: '02', slug: 'architecture', title: 'Architecture', description: 'Language choices, project structure, entry points, build & distribution', docPath: '02-architecture/README.md' },
  { number: '03', slug: 'agent-loop', title: 'Agent Loop', description: 'The core execution cycle — how agents think, act, and iterate', docPath: '03-agent-loop/README.md' },
  { number: '04', slug: 'tool-system', title: 'Tool System', description: 'How tools are defined, registered, and executed', docPath: '04-tool-system/README.md' },
  { number: '05', slug: 'file-search', title: 'File Search', description: 'Finding files and searching code — ripgrep, indexing, and search strategies', docPath: '05-file-search/README.md' },
  { number: '06', slug: 'file-editing', title: 'File Editing', description: 'How agents modify code — patch-based vs string-replacement approaches', docPath: '06-file-editing/README.md' },
  { number: '07', slug: 'sandbox-security', title: 'Sandbox & Security', description: 'Kernel sandboxing vs application-level controls', docPath: '07-sandbox-security/README.md' },
  { number: '08', slug: 'permissions', title: 'Permissions', description: 'Approval systems, classifiers, and trust models', docPath: '08-permissions/README.md' },
  { number: '09', slug: 'context-management', title: 'Context Management', description: 'Conversation history, compaction, and token budgeting', docPath: '09-context-management/README.md' },
  { number: '10', slug: 'prompt-engineering', title: 'Prompt Engineering', description: 'System prompt construction, templates, and dynamic injection', docPath: '10-prompt-engineering/README.md' },
  { number: '11', slug: 'model-integration', title: 'Model Integration', description: 'API clients, streaming, caching, and provider abstraction', docPath: '11-model-integration/README.md' },
  { number: '12', slug: 'multi-agent', title: 'Multi-Agent', description: 'Sub-agent spawning, communication, and coordination', docPath: '12-multi-agent/README.md' },
];

export interface DeepDive {
  slug: string;
  title: string;
  parentSlug: string;
  docPath: string;
}

export const deepDives: DeepDive[] = [
  { slug: 'agentic-execution', title: 'Agentic Execution Deep Dive', parentSlug: 'agent-loop', docPath: '03-agent-loop/agentic-execution.md' },
];
```

- [ ] **Step 2: Commit**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents
git add web/src/content/
git commit -m "feat: add chapter metadata for content loading"
```

---

### Task 3: Chapter Pages

**Files:**
- Create: `web/src/pages/chapters/[slug].astro`
- Create: `web/src/pages/chapters/agentic-execution.astro`
- Create: `web/src/components/Sidebar.astro`

- [ ] **Step 1: Write Sidebar component**

Write `web/src/components/Sidebar.astro`:

```astro
---
import { chapters, deepDives } from '../content/chapters';

interface Props {
  currentSlug: string;
}

const { currentSlug } = Astro.props;
const base = import.meta.env.BASE_URL;
---
<aside class="sidebar">
  <a href={base} class="sidebar-home">← Home</a>
  <nav>
    {chapters.map((ch) => (
      <a
        href={`${base}chapters/${ch.slug}/`}
        class:list={['sidebar-link', { active: currentSlug === ch.slug }]}
      >
        <span class="sidebar-num">{ch.number}</span>
        {ch.title}
      </a>
    ))}
  </nav>
</aside>

<style>
  .sidebar {
    position: sticky;
    top: 72px;
    width: 240px;
    flex-shrink: 0;
    padding-right: 24px;
    border-right: 1px solid var(--border);
    max-height: calc(100vh - 72px);
    overflow-y: auto;
  }
  .sidebar-home {
    display: block;
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .sidebar-link {
    display: block;
    padding: 6px 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    transition: color 0.15s;
  }
  .sidebar-link:hover { color: var(--text); text-decoration: none; }
  .sidebar-link.active { color: var(--accent); font-weight: 600; }
  .sidebar-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-right: 8px;
    opacity: 0.6;
  }
  .sidebar-link.active .sidebar-num { color: var(--accent); opacity: 1; }

  @media (max-width: 768px) {
    .sidebar { display: none; }
  }
</style>
```

- [ ] **Step 2: Write dynamic chapter page**

Write `web/src/pages/chapters/[slug].astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Sidebar from '../../components/Sidebar.astro';
import { chapters } from '../../content/chapters';
import fs from 'node:fs';
import path from 'node:path';

export function getStaticPaths() {
  return chapters.map((ch) => ({ params: { slug: ch.slug } }));
}

const { slug } = Astro.params;
const chapter = chapters.find((ch) => ch.slug === slug)!;
const chapterIndex = chapters.indexOf(chapter);
const prev = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
const next = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;

const docsDir = path.resolve(process.cwd(), '..', 'docs');
const mdPath = path.join(docsDir, chapter.docPath);
const rawContent = fs.readFileSync(mdPath, 'utf-8');

const base = import.meta.env.BASE_URL;
---
<BaseLayout title={chapter.title}>
  <div class="container chapter-layout">
    <Sidebar currentSlug={slug!} />
    <article class="chapter-content">
      <nav class="breadcrumb">
        <a href={base}>Home</a> → <span>{chapter.title}</span>
      </nav>
      <Fragment set:html={await renderMarkdown(rawContent)} />
      <nav class="chapter-nav">
        {prev && <a href={`${base}chapters/${prev.slug}/`} class="nav-prev">← {prev.number} {prev.title}</a>}
        {next && <a href={`${base}chapters/${next.slug}/`} class="nav-next">{next.number} {next.title} →</a>}
      </nav>
    </article>
  </div>
</BaseLayout>

<style>
  .chapter-layout {
    display: flex;
    gap: 48px;
    padding-top: 40px;
    padding-bottom: 40px;
  }
  .chapter-content {
    flex: 1;
    min-width: 0;
    max-width: 800px;
  }
  .chapter-content :global(h1) { color: var(--accent); margin-bottom: 24px; font-size: 1.8rem; }
  .chapter-content :global(h2) { color: var(--text); margin-top: 48px; margin-bottom: 16px; font-size: 1.4rem; }
  .chapter-content :global(h3) { color: var(--text); margin-top: 32px; margin-bottom: 12px; font-size: 1.1rem; }
  .chapter-content :global(p) { margin-bottom: 16px; }
  .chapter-content :global(ul), .chapter-content :global(ol) { margin-bottom: 16px; padding-left: 24px; }
  .chapter-content :global(li) { margin-bottom: 6px; }
  .breadcrumb { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px; }
  .breadcrumb a { color: var(--accent); }
  .chapter-nav {
    display: flex;
    justify-content: space-between;
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    font-size: 0.9rem;
  }
  .nav-prev, .nav-next { color: var(--accent); }
  .nav-next { margin-left: auto; }
</style>
```

Note: The `renderMarkdown` function needs to be implemented. We'll use a simple unified/remark pipeline. Actually, Astro can render markdown fragments — we should use `<Content />` pattern or a markdown component. Let me adjust:

**Revised approach**: Instead of raw fs reads, use a utility that compiles markdown to HTML with Shiki highlighting.

- [ ] **Step 3: Create markdown rendering utility**

Write `web/src/utils/markdown.ts`:

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeShiki from '@shikijs/rehype';

let processor: ReturnType<typeof unified> | null = null;

async function getProcessor() {
  if (processor) return processor;
  processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeShiki, { theme: 'github-dark' })
    .use(rehypeStringify);
  return processor;
}

export async function renderMarkdown(content: string): Promise<string> {
  const proc = await getProcessor();
  const result = await proc.process(content);
  return String(result);
}
```

- [ ] **Step 4: Install markdown dependencies**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents/web
npm install unified remark-parse remark-gfm remark-rehype rehype-stringify @shikijs/rehype
```

- [ ] **Step 5: Update chapter page to use renderMarkdown**

Update `web/src/pages/chapters/[slug].astro` — add import at top:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Sidebar from '../../components/Sidebar.astro';
import { chapters } from '../../content/chapters';
import { renderMarkdown } from '../../utils/markdown';
import fs from 'node:fs';
import path from 'node:path';

export function getStaticPaths() {
  return chapters.map((ch) => ({ params: { slug: ch.slug } }));
}

const { slug } = Astro.params;
const chapter = chapters.find((ch) => ch.slug === slug)!;
const chapterIndex = chapters.indexOf(chapter);
const prev = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
const next = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;

const docsDir = path.resolve(process.cwd(), '..', 'docs');
const mdPath = path.join(docsDir, chapter.docPath);
const rawContent = fs.readFileSync(mdPath, 'utf-8');
const htmlContent = await renderMarkdown(rawContent);

const base = import.meta.env.BASE_URL;
---
<BaseLayout title={chapter.title}>
  <div class="container chapter-layout">
    <Sidebar currentSlug={slug!} />
    <article class="chapter-content">
      <nav class="breadcrumb">
        <a href={base}>Home</a> → <span>{chapter.title}</span>
      </nav>
      <Fragment set:html={htmlContent} />
      <nav class="chapter-nav">
        {prev && <a href={`${base}chapters/${prev.slug}/`} class="nav-prev">← {prev.number} {prev.title}</a>}
        {next && <a href={`${base}chapters/${next.slug}/`} class="nav-next">{next.number} {next.title} →</a>}
      </nav>
    </article>
  </div>
</BaseLayout>
```

(Same styles as Step 2)

- [ ] **Step 6: Write deep dive page**

Write `web/src/pages/chapters/agentic-execution.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Sidebar from '../../components/Sidebar.astro';
import { renderMarkdown } from '../../utils/markdown';
import fs from 'node:fs';
import path from 'node:path';

const docsDir = path.resolve(process.cwd(), '..', 'docs');
const mdPath = path.join(docsDir, '03-agent-loop/agentic-execution.md');
const rawContent = fs.readFileSync(mdPath, 'utf-8');
const htmlContent = await renderMarkdown(rawContent);

const base = import.meta.env.BASE_URL;
---
<BaseLayout title="Agentic Execution Deep Dive">
  <div class="container chapter-layout">
    <Sidebar currentSlug="agent-loop" />
    <article class="chapter-content">
      <nav class="breadcrumb">
        <a href={base}>Home</a> → <a href={`${base}chapters/agent-loop/`}>Agent Loop</a> → <span>Deep Dive</span>
      </nav>
      <Fragment set:html={htmlContent} />
      <nav class="chapter-nav">
        <a href={`${base}chapters/agent-loop/`} class="nav-prev">← Back to Agent Loop</a>
      </nav>
    </article>
  </div>
</BaseLayout>
```

(Uses same chapter-layout/chapter-content styles from BaseLayout or a shared stylesheet.)

- [ ] **Step 7: Verify chapter pages render**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents/web
npm run dev
```

Visit http://localhost:4321/understanding-fantastic-coding-agents/chapters/overview/ — should show Chapter 1 content with sidebar navigation.

- [ ] **Step 8: Commit**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents
git add web/
git commit -m "feat: add chapter pages with sidebar and markdown rendering"
```

---

### Task 4: HeroBanner React Component

**Files:**
- Create: `web/src/components/HeroBanner.tsx`

- [ ] **Step 1: Write HeroBanner**

Write `web/src/components/HeroBanner.tsx`:

```tsx
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
            Anthropic · TypeScript · ML Classifier
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents
git add web/src/components/HeroBanner.tsx
git commit -m "feat: add HeroBanner React component with animated stats"
```

---

### Task 5: AgentLoopDiagram React Component

**Files:**
- Create: `web/src/components/AgentLoopDiagram.tsx`

- [ ] **Step 1: Write AgentLoopDiagram**

Write `web/src/components/AgentLoopDiagram.tsx`:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents
git add web/src/components/AgentLoopDiagram.tsx
git commit -m "feat: add AgentLoopDiagram side-by-side flow comparison"
```

---

### Task 6: ToolMatrix React Component

**Files:**
- Create: `web/src/components/ToolMatrix.tsx`

- [ ] **Step 1: Write ToolMatrix**

Write `web/src/components/ToolMatrix.tsx`:

```tsx
import { useState } from 'react';

interface ToolCell {
  name: string;
  summary: string;
  detail: string;
}

interface Row {
  category: string;
  codex: ToolCell | null;
  claude: ToolCell | null;
}

const data: Row[] = [
  {
    category: 'File Search',
    codex: { name: 'Shell (rg)', summary: 'Model runs rg via shell command', detail: 'No built-in search tool. System prompt says "prefer rg". Depends on system-installed ripgrep. Falls back to grep/find if rg not found.' },
    claude: { name: 'GlobTool + GrepTool', summary: 'Built-in ripgrep wrappers with rich params', detail: 'Ships its own ripgrep binary. GlobTool finds files by pattern. GrepTool searches content with 3 output modes, pagination, multiline. 20s timeout.' },
  },
  {
    category: 'File Editing',
    codex: { name: 'apply_patch', summary: 'Unified diff/patch format', detail: 'Custom patch syntax with @@ hunks. Supports create/update/delete/move. Transaction semantics — all changes atomic. One tool call can modify multiple files.' },
    claude: { name: 'FileEdit', summary: 'String replacement (old→new)', detail: 'Exact string match with optional replace_all. One file per call. Fuzzy whitespace matching. Uniqueness required — old_string must appear exactly once.' },
  },
  {
    category: 'Shell Execution',
    codex: { name: 'shell', summary: 'Execute in kernel sandbox', detail: 'Primary workhorse tool. Commands run inside OS-level sandbox (Seatbelt/Landlock/seccomp). Sandbox mode determines what\'s allowed (read-only, workspace-write, full-access).' },
    claude: { name: 'Bash', summary: 'Execute with permission checks', detail: 'Commands checked by YOLO classifier (ML-based risk scoring) before execution. No kernel sandbox — relies on application-level permission rules and user approval dialogs.' },
  },
  {
    category: 'Web Access',
    codex: { name: 'Shell (curl)', summary: 'Via shell commands', detail: 'No dedicated web tools. Model uses curl/wget via shell. Network access controlled by sandbox policy — can be fully blocked in read-only mode.' },
    claude: { name: 'WebFetch + WebSearch', summary: 'Dedicated tools with AI processing', detail: 'WebFetch retrieves URLs and processes with AI model. WebSearch performs web searches. Both have dedicated permission checks and output formatting.' },
  },
  {
    category: 'Multi-Agent',
    codex: { name: 'spawn_agents_on_csv', summary: 'In-process agents with forked history', detail: 'AgentControl + AgentRegistry thread tree. Mailbox for inter-agent communication via async channels. Fork modes: FullHistory or LastNTurns.' },
    claude: { name: 'AgentTool', summary: 'Separate child processes', detail: 'Each sub-agent is an independent OS process with fresh context. Optional git worktree isolation. No sibling communication. Results via stdout.' },
  },
  {
    category: 'Code Intelligence',
    codex: null,
    claude: { name: 'LSPTool', summary: 'Language Server Protocol integration', detail: 'On-demand code intelligence via LSP servers. Supports goToDefinition, findReferences, hover, documentSymbol, workspaceSymbol. Lazily initialized.' },
  },
  {
    category: 'Permissions',
    codex: { name: 'request_permissions', summary: 'Model can request new permissions', detail: 'Model can ask for elevated permissions at runtime via the request_permissions tool. Declarative execution policies (JSON/TOML) can be amended during session.' },
    claude: { name: 'Permission Dialog', summary: 'Interactive approval + ML classifier', detail: 'YOLO classifier auto-approves safe operations. PermissionDialog shows interactive UI for risky ops. Rules from 5+ sources (policy→user→project→CLI→session).' },
  },
];

export default function ToolMatrix() {
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(key: string) {
    setExpanded(expanded === key ? null : key);
  }

  return (
    <section style={{ padding: '64px 0' }}>
      <h2 style={{
        fontFamily: "'JetBrains Mono', monospace",
        color: '#d4a574',
        fontSize: '1.4rem',
        textAlign: 'center',
        marginBottom: '8px',
      }}>
        Tool Comparison
      </h2>
      <p style={{ color: '#a3a3a3', textAlign: 'center', marginBottom: '32px', fontSize: '0.95rem' }}>
        Click a cell to see implementation details
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr>
              <th style={thStyle}>Capability</th>
              <th style={{ ...thStyle, color: '#4ade80' }}>Codex CLI</th>
              <th style={{ ...thStyle, color: '#60a5fa' }}>Claude Code</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <>
                <tr key={row.category}>
                  <td style={catStyle}>{row.category}</td>
                  <Cell cell={row.codex} color="#4ade80" cellKey={`${row.category}-codex`} expanded={expanded} toggle={toggle} />
                  <Cell cell={row.claude} color="#60a5fa" cellKey={`${row.category}-claude`} expanded={expanded} toggle={toggle} />
                </tr>
                {(expanded === `${row.category}-codex` || expanded === `${row.category}-claude`) && (
                  <tr key={`${row.category}-detail`}>
                    <td colSpan={3} style={{ background: '#0f0f0f', padding: '16px 20px', fontSize: '0.85rem', color: '#a3a3a3', lineHeight: 1.6, borderBottom: '1px solid #262626' }}>
                      {expanded === `${row.category}-codex` ? row.codex?.detail : row.claude?.detail}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Cell({ cell, color, cellKey, expanded, toggle }: {
  cell: ToolCell | null;
  color: string;
  cellKey: string;
  expanded: string | null;
  toggle: (key: string) => void;
}) {
  if (!cell) return <td style={{ ...tdStyle, color: '#333' }}>—</td>;
  const isExpanded = expanded === cellKey;
  return (
    <td
      onClick={() => toggle(cellKey)}
      style={{
        ...tdStyle,
        cursor: 'pointer',
        background: isExpanded ? '#1a1a1a' : undefined,
        borderColor: isExpanded ? color : '#262626',
      }}
    >
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color, marginBottom: '2px' }}>
        {cell.name}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#a3a3a3' }}>{cell.summary}</div>
    </td>
  );
}

const thStyle: React.CSSProperties = {
  background: '#141414',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  padding: '12px 16px',
  borderBottom: '1px solid #262626',
  textAlign: 'left',
};

const catStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.85rem',
  color: '#d4a574',
  borderBottom: '1px solid #262626',
  verticalAlign: 'top',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #262626',
  verticalAlign: 'top',
  transition: 'all 0.15s',
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents
git add web/src/components/ToolMatrix.tsx
git commit -m "feat: add ToolMatrix interactive comparison grid"
```

---

### Task 7: Landing Page Assembly

**Files:**
- Create: `web/src/components/ChapterCard.astro`
- Modify: `web/src/pages/index.astro`

- [ ] **Step 1: Write ChapterCard component**

Write `web/src/components/ChapterCard.astro`:

```astro
---
interface Props {
  number: string;
  title: string;
  description: string;
  href: string;
}

const { number, title, description, href } = Astro.props;
---
<a href={href} class="chapter-card">
  <span class="card-number">{number}</span>
  <h3 class="card-title">{title}</h3>
  <p class="card-desc">{description}</p>
</a>

<style>
  .chapter-card {
    display: block;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 24px;
    transition: border-color 0.2s, transform 0.2s;
    text-decoration: none;
  }
  .chapter-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    text-decoration: none;
  }
  .card-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--accent);
    opacity: 0.7;
  }
  .card-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.05rem;
    color: var(--text);
    margin: 6px 0 8px;
  }
  .card-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
</style>
```

- [ ] **Step 2: Assemble landing page**

Write `web/src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import HeroBanner from '../components/HeroBanner';
import AgentLoopDiagram from '../components/AgentLoopDiagram';
import ToolMatrix from '../components/ToolMatrix';
import ChapterCard from '../components/ChapterCard.astro';
import { chapters } from '../content/chapters';

const base = import.meta.env.BASE_URL;
---
<BaseLayout title="Home">
  <main class="container">
    <HeroBanner client:load />
    <AgentLoopDiagram client:visible />
    <ToolMatrix client:visible />

    <section id="chapters" style="padding:64px 0;">
      <h2 style="font-family:'JetBrains Mono',monospace;color:var(--accent);font-size:1.4rem;text-align:center;margin-bottom:32px;">
        Chapters
      </h2>
      <div class="chapter-grid">
        {chapters.map((ch) => (
          <ChapterCard
            number={ch.number}
            title={ch.title}
            description={ch.description}
            href={`${base}chapters/${ch.slug}/`}
          />
        ))}
      </div>
    </section>
  </main>
</BaseLayout>

<style>
  .chapter-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media (max-width: 900px) {
    .chapter-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 560px) {
    .chapter-grid { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 3: Verify full landing page**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents/web
npm run dev
```

Visit http://localhost:4321/understanding-fantastic-coding-agents/ — should show:
1. Hero banner with animated counters and dual panels
2. Agent loop comparison with hover descriptions
3. Tool matrix with clickable cells
4. 12 chapter cards in a grid

- [ ] **Step 4: Commit**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents
git add web/
git commit -m "feat: assemble landing page with hero, agent loop, tool matrix, chapter cards"
```

---

### Task 8: Final Polish and Build Verification

**Files:**
- Modify: `web/.gitignore`
- Create: `.github/workflows/deploy.yml` (optional, for GitHub Pages)

- [ ] **Step 1: Update .gitignore**

Write `web/.gitignore`:

```
node_modules/
dist/
.astro/
```

- [ ] **Step 2: Verify production build**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents/web
npm run build
```

Expected: Build succeeds, static output in `web/dist/`.

- [ ] **Step 3: Preview production build**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents/web
npm run preview
```

Visit http://localhost:4321/understanding-fantastic-coding-agents/ — verify all pages render correctly.

- [ ] **Step 4: Final commit**

```bash
cd /Users/wyang14/github/understanding-fantastic-coding-agents
git add .
git commit -m "feat: finalize site build and verify production output"
```
