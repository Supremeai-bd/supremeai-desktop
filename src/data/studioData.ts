import type {
  DesktopProject,
  KnowledgeDoc,
  LiveThemePalette,
  ModelOption,
  RolePersona,
  WorkspaceFile,
} from '../types/studio';

export const STUDIO_MODELS: ModelOption[] = [
  {
    id: 'auto',
    gatewayModel: 'auto',
    name: 'SupremeAI Auto',
    shortLabel: 'Auto',
    description: 'Adaptive routing across reasoning, synthesis, and fast relays',
    speed: 'Balanced',
    accentHex: '#0ea5e9',
  },
  {
    id: 'supreme-core',
    gatewayModel: 'auto',
    name: 'SupremeAI Core',
    shortLabel: 'Core',
    description: 'Flagship multimodal model for general engineering and writing',
    speed: 'Balanced',
    accentHex: '#06b6d4',
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
    id: 'supreme-spark',
    gatewayModel: 'supremeai/groq',
    name: 'SupremeAI Spark',
    shortLabel: 'Spark',
    description: 'Ultra-low latency streaming for rapid code & everyday queries',
    speed: 'Fast',
    accentHex: '#f59e0b',
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
    suggestedModel: 'auto',
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

export const LIVE_THEMES: LiveThemePalette[] = [
  {
    id: 'alpine-dunes',
    name: 'Alpine Dunes',
    tagline: 'Crisp sky-blue studio glass',
    swatches: ['#0284c7', '#38bdf8', '#818cf8'],
    light: {
      accent: '#0284c7',
      accentHover: '#0369a1',
      accentSoft: 'rgba(2, 132, 199, 0.12)',
      accentRing: 'rgba(2, 132, 199, 0.36)',
      accentContrast: '#ffffff',
      accentGradient: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
      surfaceGlass: 'rgba(248, 251, 255, 0.86)',
      surfaceStrong: 'rgba(255, 255, 255, 0.95)',
      surfaceSidebar: 'rgba(240, 246, 252, 0.90)',
      surfaceInput: 'rgba(255, 255, 255, 0.94)',
      surfaceBorder: 'rgba(148, 179, 210, 0.36)',
      backdropBase: 'linear-gradient(155deg, #e5eff8 0%, #f4f7fb 52%, #eef2f6 100%)',
      backdropGlow: 'radial-gradient(ellipse 68% 48% at 54% 8%, rgba(2, 132, 199, 0.12), transparent 72%)',
      textPrimary: '#0f172a',
      textSecondary: '#334155',
      textMuted: '#64748b',
      userBg: 'rgba(2, 132, 199, 0.08)',
      userBorder: 'rgba(2, 132, 199, 0.22)',
    },
    dark: {
      accent: '#38bdf8',
      accentHover: '#0ea5e9',
      accentSoft: 'rgba(56, 189, 248, 0.15)',
      accentRing: 'rgba(56, 189, 248, 0.40)',
      accentContrast: '#062033',
      accentGradient: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
      surfaceGlass: 'rgba(11, 22, 42, 0.80)',
      surfaceStrong: 'rgba(14, 27, 50, 0.94)',
      surfaceSidebar: 'rgba(8, 17, 34, 0.88)',
      surfaceInput: 'rgba(15, 28, 52, 0.90)',
      surfaceBorder: 'rgba(56, 189, 248, 0.18)',
      backdropBase: 'linear-gradient(160deg, #071020 0%, #0e1c36 54%, #0b1629 100%)',
      backdropGlow: 'radial-gradient(ellipse 64% 46% at 54% 8%, rgba(56, 189, 248, 0.14), transparent 72%)',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      userBg: 'rgba(56, 189, 248, 0.09)',
      userBorder: 'rgba(56, 189, 248, 0.24)',
    },
  },
  {
    id: 'misty-fjords',
    name: 'Misty Fjords',
    tagline: 'Nordic teal and calm slate',
    swatches: ['#0d9488', '#2dd4bf', '#38bdf8'],
    light: {
      accent: '#0d9488',
      accentHover: '#0f766e',
      accentSoft: 'rgba(13, 148, 136, 0.12)',
      accentRing: 'rgba(13, 148, 136, 0.34)',
      accentContrast: '#ffffff',
      accentGradient: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
      surfaceGlass: 'rgba(246, 252, 252, 0.86)',
      surfaceStrong: 'rgba(255, 255, 255, 0.95)',
      surfaceSidebar: 'rgba(238, 248, 248, 0.90)',
      surfaceInput: 'rgba(255, 255, 255, 0.94)',
      surfaceBorder: 'rgba(134, 185, 186, 0.36)',
      backdropBase: 'linear-gradient(155deg, #e4f2f2 0%, #f3f8f8 52%, #edf3f5 100%)',
      backdropGlow: 'radial-gradient(ellipse 68% 48% at 54% 8%, rgba(13, 148, 136, 0.11), transparent 72%)',
      textPrimary: '#0f1f24',
      textSecondary: '#334e54',
      textMuted: '#607a80',
      userBg: 'rgba(13, 148, 136, 0.08)',
      userBorder: 'rgba(13, 148, 136, 0.22)',
    },
    dark: {
      accent: '#2dd4bf',
      accentHover: '#14b8a6',
      accentSoft: 'rgba(45, 212, 191, 0.14)',
      accentRing: 'rgba(45, 212, 191, 0.38)',
      accentContrast: '#042322',
      accentGradient: 'linear-gradient(135deg, #2dd4bf 0%, #38bdf8 100%)',
      surfaceGlass: 'rgba(9, 25, 31, 0.82)',
      surfaceStrong: 'rgba(12, 31, 38, 0.94)',
      surfaceSidebar: 'rgba(7, 20, 25, 0.88)',
      surfaceInput: 'rgba(12, 32, 40, 0.90)',
      surfaceBorder: 'rgba(45, 212, 191, 0.18)',
      backdropBase: 'linear-gradient(160deg, #061419 0%, #0b222a 54%, #081920 100%)',
      backdropGlow: 'radial-gradient(ellipse 64% 46% at 54% 8%, rgba(45, 212, 191, 0.13), transparent 72%)',
      textPrimary: '#eefaf9',
      textSecondary: '#c3e2e0',
      textMuted: '#88acab',
      userBg: 'rgba(45, 212, 191, 0.08)',
      userBorder: 'rgba(45, 212, 191, 0.22)',
    },
  },
  {
    id: 'emerald-highlands',
    name: 'Emerald Highlands',
    tagline: 'Deep forest emerald & crisp mint',
    swatches: ['#059669', '#34d399', '#10b981'],
    light: {
      accent: '#059669',
      accentHover: '#047857',
      accentSoft: 'rgba(5, 150, 105, 0.12)',
      accentRing: 'rgba(5, 150, 105, 0.34)',
      accentContrast: '#ffffff',
      accentGradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
      surfaceGlass: 'rgba(247, 252, 249, 0.86)',
      surfaceStrong: 'rgba(255, 255, 255, 0.95)',
      surfaceSidebar: 'rgba(238, 248, 242, 0.90)',
      surfaceInput: 'rgba(255, 255, 255, 0.94)',
      surfaceBorder: 'rgba(134, 188, 162, 0.36)',
      backdropBase: 'linear-gradient(155deg, #e5f3eb 0%, #f4f9f6 52%, #eef4f0 100%)',
      backdropGlow: 'radial-gradient(ellipse 68% 48% at 54% 8%, rgba(5, 150, 105, 0.11), transparent 72%)',
      textPrimary: '#0e2018',
      textSecondary: '#314f41',
      textMuted: '#5f7c6e',
      userBg: 'rgba(5, 150, 105, 0.08)',
      userBorder: 'rgba(5, 150, 105, 0.22)',
    },
    dark: {
      accent: '#34d399',
      accentHover: '#10b981',
      accentSoft: 'rgba(52, 211, 153, 0.14)',
      accentRing: 'rgba(52, 211, 153, 0.38)',
      accentContrast: '#042217',
      accentGradient: 'linear-gradient(135deg, #34d399 0%, #14b8a6 100%)',
      surfaceGlass: 'rgba(10, 26, 20, 0.82)',
      surfaceStrong: 'rgba(13, 33, 25, 0.94)',
      surfaceSidebar: 'rgba(8, 20, 16, 0.88)',
      surfaceInput: 'rgba(13, 34, 26, 0.90)',
      surfaceBorder: 'rgba(52, 211, 153, 0.18)',
      backdropBase: 'linear-gradient(160deg, #06140f 0%, #0c231a 54%, #081812 100%)',
      backdropGlow: 'radial-gradient(ellipse 64% 46% at 54% 8%, rgba(52, 211, 153, 0.13), transparent 72%)',
      textPrimary: '#eefaf4',
      textSecondary: '#c4e4d4',
      textMuted: '#88ad9b',
      userBg: 'rgba(52, 211, 153, 0.08)',
      userBorder: 'rgba(52, 211, 153, 0.22)',
    },
  },
  {
    id: 'amber-canyon',
    name: 'Amber Canyon',
    tagline: 'Warm sandstone & golden amber',
    swatches: ['#d97706', '#f59e0b', '#f97316'],
    light: {
      accent: '#d97706',
      accentHover: '#b45309',
      accentSoft: 'rgba(217, 119, 6, 0.12)',
      accentRing: 'rgba(217, 119, 6, 0.34)',
      accentContrast: '#ffffff',
      accentGradient: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
      surfaceGlass: 'rgba(253, 250, 246, 0.86)',
      surfaceStrong: 'rgba(255, 255, 255, 0.95)',
      surfaceSidebar: 'rgba(249, 243, 236, 0.90)',
      surfaceInput: 'rgba(255, 255, 255, 0.94)',
      surfaceBorder: 'rgba(202, 175, 146, 0.36)',
      backdropBase: 'linear-gradient(155deg, #f5ebe0 0%, #faf6f1 52%, #f3eee7 100%)',
      backdropGlow: 'radial-gradient(ellipse 68% 48% at 54% 8%, rgba(217, 119, 6, 0.11), transparent 72%)',
      textPrimary: '#23170d',
      textSecondary: '#543f2d',
      textMuted: '#826b57',
      userBg: 'rgba(217, 119, 6, 0.08)',
      userBorder: 'rgba(217, 119, 6, 0.22)',
    },
    dark: {
      accent: '#fbbf24',
      accentHover: '#f59e0b',
      accentSoft: 'rgba(251, 191, 36, 0.14)',
      accentRing: 'rgba(251, 191, 36, 0.38)',
      accentContrast: '#261704',
      accentGradient: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
      surfaceGlass: 'rgba(28, 20, 14, 0.82)',
      surfaceStrong: 'rgba(35, 25, 18, 0.94)',
      surfaceSidebar: 'rgba(22, 16, 11, 0.88)',
      surfaceInput: 'rgba(36, 26, 18, 0.90)',
      surfaceBorder: 'rgba(251, 191, 36, 0.18)',
      backdropBase: 'linear-gradient(160deg, #160f0a 0%, #241910 54%, #18110b 100%)',
      backdropGlow: 'radial-gradient(ellipse 64% 46% at 54% 8%, rgba(251, 191, 36, 0.12), transparent 72%)',
      textPrimary: '#fcf7f0',
      textSecondary: '#e5d3be',
      textMuted: '#b09a82',
      userBg: 'rgba(251, 191, 36, 0.08)',
      userBorder: 'rgba(251, 191, 36, 0.22)',
    },
  },
  {
    id: 'midnight-peaks',
    name: 'Midnight Peaks',
    tagline: 'Obsidian graphite & crisp indigo',
    swatches: ['#4f46e5', '#818cf8', '#6366f1'],
    light: {
      accent: '#4f46e5',
      accentHover: '#4338ca',
      accentSoft: 'rgba(79, 70, 229, 0.11)',
      accentRing: 'rgba(79, 70, 229, 0.34)',
      accentContrast: '#ffffff',
      accentGradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
      surfaceGlass: 'rgba(248, 249, 254, 0.86)',
      surfaceStrong: 'rgba(255, 255, 255, 0.95)',
      surfaceSidebar: 'rgba(241, 243, 251, 0.90)',
      surfaceInput: 'rgba(255, 255, 255, 0.94)',
      surfaceBorder: 'rgba(164, 171, 208, 0.36)',
      backdropBase: 'linear-gradient(155deg, #e8ebf8 0%, #f4f5fb 52%, #eef0f7 100%)',
      backdropGlow: 'radial-gradient(ellipse 68% 48% at 54% 8%, rgba(79, 70, 229, 0.10), transparent 72%)',
      textPrimary: '#111428',
      textSecondary: '#3b4163',
      textMuted: '#686e8f',
      userBg: 'rgba(79, 70, 229, 0.07)',
      userBorder: 'rgba(79, 70, 229, 0.22)',
    },
    dark: {
      accent: '#818cf8',
      accentHover: '#6366f1',
      accentSoft: 'rgba(129, 140, 248, 0.15)',
      accentRing: 'rgba(129, 140, 248, 0.40)',
      accentContrast: '#0f122b',
      accentGradient: 'linear-gradient(135deg, #818cf8 0%, #38bdf8 100%)',
      surfaceGlass: 'rgba(15, 17, 30, 0.82)',
      surfaceStrong: 'rgba(20, 23, 39, 0.94)',
      surfaceSidebar: 'rgba(11, 13, 23, 0.88)',
      surfaceInput: 'rgba(21, 24, 41, 0.90)',
      surfaceBorder: 'rgba(129, 140, 248, 0.18)',
      backdropBase: 'linear-gradient(160deg, #090b14 0%, #111526 54%, #0c0e1a 100%)',
      backdropGlow: 'radial-gradient(ellipse 64% 46% at 54% 8%, rgba(129, 140, 248, 0.14), transparent 72%)',
      textPrimary: '#f1f3fb',
      textSecondary: '#cbd0e6',
      textMuted: '#8f96b5',
      userBg: 'rgba(129, 140, 248, 0.09)',
      userBorder: 'rgba(129, 140, 248, 0.24)',
    },
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    tagline: 'Polar emerald & arctic cyan',
    swatches: ['#06b6d4', '#10b981', '#38bdf8'],
    light: {
      accent: '#0891b2',
      accentHover: '#0e7490',
      accentSoft: 'rgba(8, 145, 178, 0.12)',
      accentRing: 'rgba(8, 145, 178, 0.35)',
      accentContrast: '#ffffff',
      accentGradient: 'linear-gradient(135deg, #0891b2 0%, #059669 100%)',
      surfaceGlass: 'rgba(246, 252, 253, 0.86)',
      surfaceStrong: 'rgba(255, 255, 255, 0.95)',
      surfaceSidebar: 'rgba(238, 248, 250, 0.90)',
      surfaceInput: 'rgba(255, 255, 255, 0.94)',
      surfaceBorder: 'rgba(134, 185, 198, 0.36)',
      backdropBase: 'linear-gradient(155deg, #e2f2f5 0%, #f2f9fa 52%, #eaf5f2 100%)',
      backdropGlow: 'radial-gradient(ellipse 68% 48% at 54% 8%, rgba(8, 145, 178, 0.12), transparent 72%)',
      textPrimary: '#0c1f24',
      textSecondary: '#2d4e56',
      textMuted: '#5b7b84',
      userBg: 'rgba(8, 145, 178, 0.08)',
      userBorder: 'rgba(8, 145, 178, 0.22)',
    },
    dark: {
      accent: '#22d3ee',
      accentHover: '#06b6d4',
      accentSoft: 'rgba(34, 211, 238, 0.14)',
      accentRing: 'rgba(34, 211, 238, 0.38)',
      accentContrast: '#042026',
      accentGradient: 'linear-gradient(135deg, #22d3ee 0%, #34d399 100%)',
      surfaceGlass: 'rgba(8, 22, 31, 0.82)',
      surfaceStrong: 'rgba(11, 28, 39, 0.94)',
      surfaceSidebar: 'rgba(6, 17, 25, 0.88)',
      surfaceInput: 'rgba(11, 29, 41, 0.90)',
      surfaceBorder: 'rgba(34, 211, 238, 0.18)',
      backdropBase: 'linear-gradient(160deg, #05121a 0%, #0a202b 54%, #07191c 100%)',
      backdropGlow: 'radial-gradient(ellipse 64% 46% at 54% 8%, rgba(34, 211, 238, 0.14), transparent 72%)',
      textPrimary: '#eefafb',
      textSecondary: '#c3e2e6',
      textMuted: '#86aab0',
      userBg: 'rgba(34, 211, 238, 0.08)',
      userBorder: 'rgba(34, 211, 238, 0.22)',
    },
  },
  {
    id: 'cyber-studio',
    name: 'Cyber Studio',
    tagline: 'Precision charcoal & neural blue',
    swatches: ['#2563eb', '#38bdf8', '#64748b'],
    light: {
      accent: '#2563eb',
      accentHover: '#1d4ed8',
      accentSoft: 'rgba(37, 99, 235, 0.11)',
      accentRing: 'rgba(37, 99, 235, 0.35)',
      accentContrast: '#ffffff',
      accentGradient: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
      surfaceGlass: 'rgba(249, 250, 252, 0.88)',
      surfaceStrong: 'rgba(255, 255, 255, 0.96)',
      surfaceSidebar: 'rgba(243, 245, 248, 0.92)',
      surfaceInput: 'rgba(255, 255, 255, 0.96)',
      surfaceBorder: 'rgba(148, 163, 184, 0.34)',
      backdropBase: 'linear-gradient(155deg, #edf0f5 0%, #f7f8fa 52%, #f1f4f8 100%)',
      backdropGlow: 'radial-gradient(ellipse 68% 48% at 54% 8%, rgba(37, 99, 235, 0.08), transparent 72%)',
      textPrimary: '#0f172a',
      textSecondary: '#334155',
      textMuted: '#64748b',
      userBg: 'rgba(37, 99, 235, 0.07)',
      userBorder: 'rgba(37, 99, 235, 0.2)',
    },
    dark: {
      accent: '#60a5fa',
      accentHover: '#3b82f6',
      accentSoft: 'rgba(96, 165, 250, 0.14)',
      accentRing: 'rgba(96, 165, 250, 0.38)',
      accentContrast: '#07162e',
      accentGradient: 'linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%)',
      surfaceGlass: 'rgba(15, 19, 27, 0.84)',
      surfaceStrong: 'rgba(20, 25, 35, 0.95)',
      surfaceSidebar: 'rgba(12, 15, 22, 0.90)',
      surfaceInput: 'rgba(21, 27, 38, 0.92)',
      surfaceBorder: 'rgba(148, 163, 184, 0.16)',
      backdropBase: 'linear-gradient(160deg, #090c12 0%, #10151f 54%, #0c1018 100%)',
      backdropGlow: 'radial-gradient(ellipse 64% 46% at 54% 8%, rgba(96, 165, 250, 0.11), transparent 72%)',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      userBg: 'rgba(96, 165, 250, 0.08)',
      userBorder: 'rgba(96, 165, 250, 0.22)',
    },
  },
];

export function getLiveTheme(id: string): LiveThemePalette {
  return LIVE_THEMES.find((t) => t.id === id) ?? LIVE_THEMES[0];
}
