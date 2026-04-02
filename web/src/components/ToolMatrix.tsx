import React, { useState } from 'react';

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
    codex: { name: 'shell', summary: 'Execute in kernel sandbox', detail: "Primary workhorse tool. Commands run inside OS-level sandbox (Seatbelt/Landlock/seccomp). Sandbox mode determines what's allowed (read-only, workspace-write, full-access)." },
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
            {data.map((row) => {
              const codexKey = `${row.category}-codex`;
              const claudeKey = `${row.category}-claude`;
              const isCodexExpanded = expanded === codexKey;
              const isClaudeExpanded = expanded === claudeKey;
              return (
                <React.Fragment key={row.category}>
                  <tr>
                    <td style={catStyle}>{row.category}</td>
                    <Cell cell={row.codex} color="#4ade80" cellKey={codexKey} expanded={expanded} toggle={toggle} />
                    <Cell cell={row.claude} color="#60a5fa" cellKey={claudeKey} expanded={expanded} toggle={toggle} />
                  </tr>
                  {(isCodexExpanded || isClaudeExpanded) && (
                    <tr>
                      <td colSpan={3} style={{ background: '#0f0f0f', padding: '16px 20px', fontSize: '0.85rem', color: '#a3a3a3', lineHeight: 1.6, borderBottom: '1px solid #262626' }}>
                        {isCodexExpanded ? row.codex?.detail : row.claude?.detail}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
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
