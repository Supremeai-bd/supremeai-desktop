import type {
  DesktopProject,
  KnowledgeDoc,
  ModelOption,
  RolePersona,
  WorkspaceFile,
} from '../types/studio';

export const STUDIO_MODELS: ModelOption[] = [
  {
    id: 'supreme-core',
    gatewayModel: 'auto',
    name: 'SupremeAI Core',
    shortLabel: 'Core',
    description: 'Flagship multimodal model for general engineering, architecture, and writing',
    speed: 'Balanced',
    accentHex: '#06b6d4',
  },
  {
    id: 'supreme-spark',
    gatewayModel: 'supremeai/groq',
    name: 'SupremeAI Spark',
    shortLabel: 'Spark',
    description: 'Ultra-low latency streaming for rapid code & everyday queries',
    speed: 'Fast',
    accentHex: '#f59e0b',
  },
  {
    id: 'supreme-reason',
    gatewayModel: 'supremeai/openrouter',
    name: 'SupremeAI Reason',
    shortLabel: 'Reason',
    description: 'Deep architectural planning, math, and multi-step debugging',
    speed: 'Deep',
    accentHex: '#8b5cf6',
  },
  {
    id: 'supreme-deep',
    gatewayModel: 'supremeai/openrouter',
    name: 'SupremeAI Deep',
    shortLabel: 'Deep',
    description: 'Long-horizon synthesis, formal verification, and exhaustive technical audits',
    speed: 'Deep',
    accentHex: '#6366f1',
  },
  {
    id: 'supreme-web',
    gatewayModel: 'auto',
    name: 'SupremeAI Web',
    shortLabel: 'Web',
    description: 'Interactive HTML/CSS/React prototyping tuned for live Workspace Dock previews',
    speed: 'Balanced',
    accentHex: '#10b981',
  },
  {
    id: 'supreme-api',
    gatewayModel: 'auto',
    name: 'SupremeAI API',
    shortLabel: 'API',
    description: 'Strict JSON, OpenAPI schemas, Tauri Rust IPC, and backend integrations',
    speed: 'Fast',
    accentHex: '#0ea5e9',
  },
];

export const SYSTEM_ROLES: RolePersona[] = [
  {
    id: 'supreme-general',
    name: 'Supreme Generalist',
    category: 'General',
    tagline: 'Versatile AI engineering partner for everyday tasks',
    description:
      'Balanced intelligence with sharp technical insight, clean code generation, and rapid conceptual synthesis.',
    suggestedModel: 'supreme-core',
    systemInstruction:
      'You are SupremeAI, an expert technical partner from Supremeai-bd. Provide concise, clear, and production-ready responses. Structure code cleanly and be honest about limitations.',
    quickPrompts: [
      'Build an interactive dashboard card in HTML, CSS, and JavaScript I can preview right now.',
      'Explain how to structure a Tauri v2 + React 19 desktop app with offline resilience.',
      'Draft a crisp technical design doc for an AI gateway with SSE streaming.',
      'Compare clean state management patterns for React 19 desktop workspaces.',
    ],
  },
  {
    id: 'supreme-architect',
    name: 'Systems Architect',
    category: 'Deep Reasoning',
    tagline: 'Architectural decomposition, invariants & failure mode analysis',
    description:
      'Rigorous decomposition of distributed systems, local-first storage, concurrency models, and desktop IPC boundaries.',
    suggestedModel: 'supreme-reason',
    systemInstruction:
      'You are SupremeAI Lead Architect. Focus on invariants, failure boundaries, latency trade-offs, and scalability. Organize responses clearly into Principles, Data Flow, Failure Modes, and Implementation.',
    quickPrompts: [
      'Design an offline-first local cache and sync engine for SupremeAI Desktop.',
      'Analyze failure modes of SSE streaming across Tauri Rust IPC vs browser fetch.',
      'Propose a zero-trust RBAC and TOTP verification architecture for admin consoles.',
      'How should we architect multi-provider LLM failover with circuit breakers?',
    ],
  },
  {
    id: 'supreme-fullstack',
    name: 'Full-Stack Specialist',
    category: 'Interactive UI',
    tagline: 'Modern React 19, TypeScript strictness, Tailwind v4 & APIs',
    description:
      'Expert in modular React components, accessible interactive workspaces, Rust Tauri commands, and clean CSS design systems.',
    suggestedModel: 'supreme-core',
    systemInstruction:
      'You are SupremeAI Full-Stack Specialist. Write idiomatic TypeScript, accessible React 19 components, and clean Tailwind CSS v4 layouts with zero dead controls.',
    quickPrompts: [
      'Create a sleek interactive Pomodoro & Focus timer web app in a single HTML file.',
      'Write a reusable TypeScript SSE stream parser with AbortController support.',
      'Build an accessible keyboard-navigable command palette hook in React.',
      'Create a responsive pricing comparison component in clean HTML and Tailwind.',
    ],
  },
  {
    id: 'supreme-fast-dev',
    name: 'Fast Code Synthesizer',
    category: 'Fast',
    tagline: 'Instant snippets, shell commands, regex & quick refactoring',
    description:
      'Featherweight, rapid turnaround for high-frequency queries, script generation, and syntax transformations.',
    suggestedModel: 'supreme-spark',
    systemInstruction:
      'You are SupremeAI Rapid Synthesizer. Prioritize speed, precision, and zero preamble. Return direct code snippets, commands, or transformations.',
    quickPrompts: [
      'Write a GitHub Actions workflow to build Tauri v2 desktop installers.',
      'Provide a strict TypeScript interface for an OpenAI-compatible SSE chunk.',
      'Write a shell one-liner to inspect port 3000 listeners and kill stale processes.',
      'Give me a clean debounce utility with cancel() support in TypeScript.',
    ],
  },
  {
    id: 'supreme-security',
    name: 'Security & Code Auditor',
    category: 'Auditing',
    tagline: 'Vulnerability assessment, CSP hardening & defense in depth',
    description:
      'Zero-trust verification, XSS/SSRF defense, Tauri capability auditing, secret hygiene, and OWASP compliance.',
    suggestedModel: 'supreme-reason',
    systemInstruction:
      'You are SupremeAI Security Auditor. Audit provided code and architecture for injection vectors, CSP gaps, credential leakage, and privilege escalation. Provide concrete fixes.',
    quickPrompts: [
      'Audit a Tauri v2 tauri.conf.json CSP policy for a React desktop app.',
      'Review how session tokens should be isolated in Rust keystore vs WebView.',
      'What are the top risks when rendering AI-generated HTML inside a preview iframe?',
      'Write a checklist for hardening a bilingual AI studio API proxy.',
    ],
  },
];

export const DEFAULT_PROJECTS: DesktopProject[] = [
  {
    id: 'proj-frontend',
    name: 'supremeai-frontend',
    repoUrl: 'https://github.com/Supremeai-bd/supremeai-frontend',
    branch: 'main',
    language: 'TypeScript · React 19',
    description: 'Bilingual SupremeAI Studio web console with live themes, Workspace Dock, and Control Center.',
    status: 'Synced',
    updatedAt: 'Synced with Studio',
  },
  {
    id: 'proj-desktop',
    name: 'supremeai-desktop',
    repoUrl: 'https://github.com/Supremeai-bd/supremeai-desktop',
    branch: 'main',
    language: 'Rust · Tauri v2 · React 19',
    description: 'Native Windows, macOS, and Linux workstation with 3D holographic companion and neural voice.',
    status: 'Active',
    updatedAt: 'Local workstation',
  },
  {
    id: 'proj-gateway',
    name: 'supremeai-core',
    repoUrl: 'https://github.com/Supremeai-bd/supremeai-core',
    branch: 'main',
    language: 'TypeScript · Edge API',
    description: 'Unified SupremeAI Gateway routing OpenRouter, Groq, and neural Edge TTS endpoints.',
    status: 'Synced',
    updatedAt: 'Gateway connected',
  },
];

export const DEFAULT_KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    id: 'kb-arch',
    title: 'SupremeAI Desktop IPC & Security Notes',
    category: 'Architecture',
    content:
      'Tauri v2 exposes Rust commands (send_chat, user_login, admin_dashboard, submit_feedback, synthesize_speech) over IPC. Auth tokens stay in the native keystore when running in desktop mode, and fall back gracefully to session storage in web preview.',
    enabled: true,
    updatedAt: Date.now() - 86_400_000,
  },
  {
    id: 'kb-voice',
    title: 'Bilingual Neural Voice Stack (EN / বাংলা)',
    category: 'Voice',
    content:
      'Speech synthesis strips markdown and code fences, preserves one voice per message, chunks at 220 characters, and calls /api/tts/edge with Bangladesh (bn-BD) and West Bengal (bn-IN) dialects plus five personas (Zephyr, Kore, Puck, Charon, Fenrir).',
    enabled: true,
    updatedAt: Date.now() - 43_200_000,
  },
];

export const DEFAULT_WORKSPACE_FILES: WorkspaceFile[] = [
  {
    id: 'file-preview',
    name: 'preview.html',
    language: 'html',
    content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
      background: linear-gradient(145deg, #0b162c 0%, #102442 60%, #16253b 100%);
      color: #f1f5f9;
    }
    .card {
      width: min(460px, 100%); padding: 28px; border-radius: 20px;
      background: rgba(15, 29, 54, 0.82); border: 1px solid rgba(56, 189, 248, 0.25);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
    }
    h1 { margin: 0 0 8px; font-size: 22px; letter-spacing: -0.02em; }
    p { margin: 0 0 20px; color: #94a3b8; font-size: 14px; line-height: 1.6; }
    .row { display: flex; gap: 10px; }
    button {
      flex: 1; padding: 11px 16px; border: 0; border-radius: 12px; cursor: pointer;
      font-weight: 600; font-size: 13px; color: #062033;
      background: linear-gradient(135deg, #38bdf8, #818cf8);
    }
    .counter {
      margin-top: 16px; padding: 12px 14px; border-radius: 12px;
      background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2);
      font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #7dd3fc;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>SupremeAI Workspace Preview</h1>
    <p>Ask SupremeAI to generate any HTML/CSS/JS component and click "Open in Dock" to inspect and edit it live here.</p>
    <div class="row">
      <button onclick="bump()">Test Interactive State</button>
    </div>
    <div class="counter" id="out">Interactions recorded: 0</div>
  </div>
  <script>
    let count = 0;
    function bump() {
      count += 1;
      document.getElementById('out').textContent = 'Interactions recorded: ' + count;
    }
  </script>
</body>
</html>`,
  },
  {
    id: 'file-bridge',
    name: 'desktopBridge.ts',
    language: 'typescript',
    content: `// SupremeAI Desktop hybrid Tauri v2 + Web Gateway bridge
export interface ChatRequest {
  prompt: string;
  model: 'auto' | 'supremeai/openrouter' | 'supremeai/groq';
  conversationId: string;
}

export function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean((window as { isTauri?: boolean }).isTauri);
}
`,
  },
];

export const PROMPT_LIBRARY: Array<{ id: string; category: string; title: string; prompt: string }> = [
  {
    id: 'pl-ui',
    category: 'Build',
    title: 'Interactive HTML Widget',
    prompt:
      'Build a clean, self-contained HTML + CSS + JavaScript interactive Kanban board with dark styling so I can preview it in the Workspace Dock.',
  },
  {
    id: 'pl-review',
    category: 'Engineering',
    title: 'Architecture & Security Audit',
    prompt:
      'Review our Tauri v2 desktop bridge architecture for security boundaries, token isolation, and SSE streaming resilience.',
  },
  {
    id: 'pl-bn',
    category: 'Bilingual',
    title: 'বাংলায় সারসংক্ষেপ (Bangla Summary)',
    prompt:
      'আধুনিক ডেস্কটপ AI ওয়ার্কস্পেসের ৫টি মূল সুবিধা সহজ বাংলায় বুলেট পয়েন্ট আকারে সাজিয়ে দিন।',
  },
  {
    id: 'pl-plan',
    category: 'Planning',
    title: 'Release Checklist',
    prompt:
      'Draft a practical release readiness checklist for shipping a Windows, macOS, and Linux Tauri v2 desktop build.',
  },
];
