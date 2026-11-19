import type { PluginItem, PromptTemplateItem } from '../types/studio';

export const INITIAL_PLUGINS: PluginItem[] = [
  {
    id: 'github-sync',
    name: 'GitHub Project Bridge',
    tagline: 'Sync branches, pull requests, and commit diffs with SupremeAI',
    description:
      'Seamlessly links connected GitHub repositories to the chat context, allowing you to ask questions about your codebase, track recent commits, and inspect file trees.',
    category: 'developer',
    isEnabled: true,
    version: '1.4.2',
    author: 'Supremeai-bd',
  },
  {
    id: 'ai-code-auditor',
    name: 'AI Code Reviewer',
    tagline: 'Automatic pull request reviews and vulnerability scanning',
    description:
      'Analyzes submitted code blocks and GitHub pull requests for security vulnerabilities, logic edge cases, memory leaks, and architectural antipatterns.',
    category: 'security',
    isEnabled: true,
    version: '2.1.0',
    author: 'Supremeai-bd',
  },
  {
    id: 'web-grounding',
    name: 'Search & Docs Grounding',
    tagline: 'Ground answers in latest web docs and live library releases',
    description:
      'Augments SupremeAI responses with real-time documentation for React 19, Tailwind v4, Vite, and external developer packages.',
    category: 'ai-grounding',
    isEnabled: true,
    version: '1.8.0',
    author: 'SupremeAI Studio',
  },
  {
    id: 'terminal-assistant',
    name: 'Terminal & CLI Companion',
    tagline: 'Generate and validate shell commands, Docker scripts & CI/CD',
    description:
      'Translates natural language intents into secure, POSIX-compliant bash, Dockerfile, and GitHub Actions workflows with syntax safeguards.',
    category: 'developer',
    isEnabled: false,
    version: '1.2.5',
    author: 'Supremeai-bd',
  },
  {
    id: 'markdown-export-pro',
    name: 'Notion & Doc Exporter',
    tagline: 'Export chat conversations and technical specs into clean docs',
    description:
      'Formatted export of chat threads, architectural diagrams, and code snippets into Notion, Google Docs, or formatted Markdown.',
    category: 'productivity',
    isEnabled: true,
    version: '1.0.8',
    author: 'SupremeAI Community',
  },
  {
    id: 'figma-code-bridge',
    name: 'Figma to Tailwind Bridge',
    tagline: 'Generate clean React + Tailwind CSS code from design specs',
    description:
      'Converts design component specs and tokens into semantic React 19 components with responsive styling.',
    category: 'developer',
    isEnabled: false,
    version: '0.9.4',
    author: 'Supremeai-bd',
  },
];

export const INITIAL_PROMPT_TEMPLATES: PromptTemplateItem[] = [
  {
    id: 'tmpl_gen_01',
    title: 'Executive Summary & Key Action Items',
    category: 'research',
    description:
      'Turn long meeting notes, reports, or articles into clear takeaways and next steps.',
    template:
      'Summarize the key points, decisions made, and clear next action items (with owners if mentioned) from the following notes:\n\n[PASTE NOTES OR DOCUMENT HERE]',
    tags: ['summary', 'notes', 'productivity'],
  },
  {
    id: 'tmpl_gen_02',
    title: 'Clear & Professional Email Polish',
    category: 'writing',
    description:
      'Refine rough drafts into polite, concise, and persuasive emails or announcements.',
    template:
      'Rewrite the following draft to be clear, warm, and concise for a professional audience. Keep the core message intact:\n\n[PASTE DRAFT HERE]',
    tags: ['writing', 'email', 'clarity'],
  },
  {
    id: 'tmpl_gen_03',
    title: 'Structured Brainstorm & Pros/Cons Matrix',
    category: 'general',
    description:
      'Explore options for a business decision with clear trade-offs and recommendations.',
    template:
      'Help me evaluate options for the following decision. Provide 3 practical approaches, their pros and cons, and a recommended next step:\n\n[DESCRIBE YOUR GOAL OR DECISION HERE]',
    tags: ['brainstorm', 'planning', 'strategy'],
  },
  {
    id: 'tmpl_01',
    title: 'Strict Security Audit & OWASP Fuzz',
    category: 'security',
    description:
      'Inspect endpoints, authentication middleware, and input sanitization against Top 10 vulnerabilities.',
    template:
      'Perform a comprehensive security audit on the following code. Check for SQL/NoSQL injection, prototype pollution, unhandled async exceptions, and OWASP top 10 risks:\n\n```\n[PASTE CODE HERE]\n```',
    tags: ['security', 'audit', 'owasp'],
  },
  {
    id: 'tmpl_02',
    title: 'TypeScript Interface & Type Guard Invariants',
    category: 'code',
    description:
      'Generate strict non-nullable TypeScript models, schema parsers, and type predicates.',
    template:
      'Design clean, strict TypeScript interfaces for this data model. Include runtime assertion type guards (`isX(val: unknown): val is X`), schema validation, and proper generics:\n\n```json\n[PASTE JSON PAYLOAD HERE]\n```',
    tags: ['typescript', 'interfaces', 'types'],
  },
  {
    id: 'tmpl_03',
    title: 'Distributed System Architectural Invariant Review',
    category: 'architecture',
    description:
      'Analyze distributed microservices for split-brain risks, idempotency, and backpressure.',
    template:
      'Review the following microservice orchestration design. Evaluate idempotency guarantees, dead-letter fallback, retry storms, and event-driven backpressure:\n\n```\n[DESCRIBE ARCHITECTURE HERE]\n```',
    tags: ['architecture', 'microservices', 'reliability'],
  },
  {
    id: 'tmpl_04',
    title: 'Refactor to React 19 Functional Hooks',
    category: 'review',
    description:
      'Modernize legacy components into modern React 19 functional code with zero re-render bloat.',
    template:
      'Refactor the following React component to modern React 19 best practices. Use clean custom hooks, proper cleanup effects, memoization where needed, and eliminate redundant state:\n\n```tsx\n[PASTE COMPONENT HERE]\n```',
    tags: ['react19', 'refactor', 'hooks'],
  },
];
