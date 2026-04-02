# Dual Agent Explorer — Design Spec

## Overview

An interactive static site comparing two production coding agents (OpenAI Codex CLI and Anthropic Claude Code) across 12 architectural dimensions. Built with Astro + React, dark terminal aesthetic, deployed to GitHub Pages.

**Location**: `/web` directory within the existing `understanding-fantastic-coding-agents` repo.

## Tech Stack

- **Framework**: Astro 5.x with React integration
- **Styling**: Plain CSS (dark theme, no Tailwind)
- **Interactive components**: React islands (HeroBanner, AgentLoopDiagram, ToolMatrix)
- **Syntax highlighting**: Shiki (built into Astro)
- **Markdown rendering**: Astro's built-in markdown/MDX support
- **Deployment**: GitHub Pages via `astro build` static output

## Directory Structure

```
web/
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro       # Shared layout: nav, footer, dark theme
│   ├── pages/
│   │   ├── index.astro            # Landing page
│   │   └── chapters/
│   │       ├── [slug].astro       # Dynamic chapter page (reads from docs/)
│   │       └── agentic-execution.astro  # Deep dive subpage
│   ├── components/
│   │   ├── HeroBanner.tsx         # Dual-stats hero (React island)
│   │   ├── AgentLoopDiagram.tsx   # Side-by-side flow comparison (React island)
│   │   ├── ToolMatrix.tsx         # Interactive tool comparison grid (React island)
│   │   ├── ChapterCard.astro      # Chapter card for landing page
│   │   ├── Sidebar.astro          # Chapter navigation sidebar
│   │   └── Footer.astro           # Site footer
│   ├── styles/
│   │   └── global.css             # Dark theme, typography, code blocks
│   └── content/
│       └── chapters.ts            # Chapter metadata (title, description, slug mapping to docs/)
├── public/
│   └── favicon.svg
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Content Source

Markdown lives in `../docs/` (the existing chapters). The Astro site reads these files at build time — no content duplication. Chapter metadata (titles, descriptions, ordering) is defined in `src/content/chapters.ts` which maps to the doc file paths.

## Pages

### Landing Page (`/`)

Four sections, top to bottom:

**1. Hero Banner** (React island: `HeroBanner.tsx`)
- Title: "Understanding Fantastic Coding Agents"
- Subtitle: "A deep technical exploration of how modern AI coding agents work"
- Two side-by-side stat panels:
  - Left (green `#4ade80` accent): Codex CLI — "81 crates · Rust · Kernel Sandbox · ~15 tools"
  - Right (blue `#60a5fa` accent): Claude Code — "v2.1.88 · TypeScript · ML Classifier · 40+ tools"
- Gradient divider line between panels
- "Start Exploring ↓" scroll anchor

**2. Agent Loop Comparison** (React island: `AgentLoopDiagram.tsx`)
- Section header: "The Agent Loop"
- Two simplified flow diagrams rendered as styled HTML/CSS (not SVG)
- Left: Codex turn-based flow (User → TurnContext → Stream → Tool Futures → RwLock → Drain → Next Turn)
- Right: Claude Code generator flow (User → System Prompt → Stream → StreamingToolExecutor → Batch → Yield → Continue)
- Hover on a step to see a 1-2 sentence description
- Static, not animated

**3. Tool Matrix** (React island: `ToolMatrix.tsx`)
- Section header: "Tool Comparison"
- Grid layout:
  - Rows: capability categories (File Search, File Edit, Shell Execution, Web Access, Multi-Agent, Code Intelligence, Permissions)
  - Columns: Codex CLI | Claude Code
  - Each cell: tool name + one-line summary
  - Click a cell to expand with implementation detail (2-3 sentences)
- Color-coded: green cells for Codex, blue for Claude Code, gray for "N/A"

**4. Chapter Cards**
- Section header: "Chapters"
- 12 cards in a responsive grid (3 columns desktop, 2 tablet, 1 mobile)
- Each card: chapter number, title, one-line description, link to chapter page
- Subtle hover effect

### Chapter Pages (`/chapters/[slug]`)

- Renders markdown from `docs/{chapter}/README.md`
- Left sidebar: chapter list with current chapter highlighted
- Main content: rendered markdown with styled comparison tables, code blocks, headings
- Breadcrumb: Home → Chapter Title
- Prev/Next navigation at bottom

### Deep Dive Subpage (`/chapters/agentic-execution`)

- Renders `docs/03-agent-loop/agentic-execution.md`
- Same layout as chapter pages
- Linked from Chapter 3

## Visual Design

### Colors

```
Background:       #0a0a0a
Surface:          #141414
Border:           #262626
Text primary:     #e5e5e5
Text secondary:   #a3a3a3
Codex accent:     #4ade80 (green)
Claude accent:    #60a5fa (blue)
Heading accent:   #d4a574 (warm gold)
Code background:  #1a1a1a
```

### Typography

- Headings: `'JetBrains Mono', monospace`
- Body: `system-ui, -apple-system, sans-serif`
- Code: `'JetBrains Mono', 'Fira Code', monospace`
- Base size: 16px, line-height 1.7 for body

### Code Blocks

- Shiki with `github-dark` theme
- Language label in top-right corner
- Rounded corners, subtle border

### Tables

- Styled with alternating row backgrounds on dark theme
- Green/blue color coding when comparing the two agents
- Responsive: horizontal scroll on mobile

## Interactive Components

### HeroBanner.tsx

- Client-side React island (`client:load`)
- Animated counter for stats (count up on mount)
- No external dependencies

### AgentLoopDiagram.tsx

- Client-side React island (`client:visible`)
- Rendered as styled divs with CSS arrows/connectors
- Hover state shows tooltip with description
- No animation library — CSS transitions only

### ToolMatrix.tsx

- Client-side React island (`client:visible`)
- Click to expand/collapse cell details
- Only one cell expanded at a time
- Filter by category (optional, can be added later)

## Deployment

### Local Development

```bash
cd web
npm install
npm run dev     # → http://localhost:4321
```

### GitHub Pages

Astro config sets `site` and `base` for GitHub Pages. Static output via `astro build` to `web/dist/`. GitHub Actions workflow auto-deploys on push to main.

## Scope Boundaries

### In scope (v1)

- Landing page with 3 interactive components
- 12 chapter pages + 1 deep dive subpage from existing markdown
- Dark theme, responsive layout
- Local dev server
- GitHub Pages deployment config

### Out of scope (future)

- Search
- Animation/simulation of agent loop
- Interactive architecture treemap
- Dark/light theme toggle
- Comments or discussion
- Analytics
