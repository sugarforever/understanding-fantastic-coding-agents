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
