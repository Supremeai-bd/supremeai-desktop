import { ModelDetail } from '../types';

export const SUPREMEAI_MODELS: ModelDetail[] = [
  {
    id: 'supreme-spark',
    name: 'SupremeAI Spark',
    alias: 'Ultra-Low Latency',
    badge: 'Recommended',
    tagline: 'Instant snippets, rapid turnaround & sub-second completions',
    description:
      'Featherweight, rapid turnaround model designed for high-frequency interactions, instant responses, and sub-second completions.',
    idealFor: 'Rapid chat, coding, syntax conversions, regex, and instantaneous lookups',
    latencyRating: 'Ultra-Fast',
    contextTokens: '1,000,000+',
    reasoningCapability: 'High',
    tier: 'standard',
  },
  {
    id: 'supreme-core',
    name: 'SupremeAI Core',
    alias: 'Flagship Intelligence',
    badge: 'Standard',
    tagline: 'High-throughput multimodal foundation intelligence',
    description:
      'Versatile reasoning, full-stack conversational coding, structured analysis, and instant problem solving.',
    idealFor: 'Everyday engineering tasks, full-stack development, and architecture Q&A',
    latencyRating: 'Balanced',
    contextTokens: '1,000,000+',
    reasoningCapability: 'High',
    tier: 'standard',
  },
  {
    id: 'supreme-reason',
    name: 'SupremeAI Reason',
    alias: 'Deep Analytical Engine',
    badge: 'Deep Compute',
    tagline: 'Deep reasoning, mathematical proofs & root-cause debugging',
    description:
      'Engineered for hard algorithm synthesis, distributed system invariants, formal logic, and architectural failure mode auditing.',
    idealFor: 'Complex algorithmic logic, security audits, and mission-critical reasoning',
    latencyRating: 'Deep-Compute',
    contextTokens: '2,000,000+',
    reasoningCapability: 'Extreme',
    tier: 'advanced',
  },
  {
    id: 'supreme-deep',
    name: 'SupremeAI Deep',
    alias: 'Agentic Orchestration',
    badge: 'Autonomous',
    tagline: 'Complex interactive coding & multi-agent swarms',
    description:
      'Specialized for large multi-file refactoring, autonomous agent workflows, terminal loop execution, and deep repository inspection.',
    idealFor: 'Multi-step autonomous tasks, large refactors, and complex agentic jobs',
    latencyRating: 'Deep-Compute',
    contextTokens: '2,000,000+',
    reasoningCapability: 'Extreme',
    tier: 'advanced',
  },
  {
    id: 'supremeai-web',
    name: 'SupremeAI Web',
    alias: 'Stealth Webpool',
    badge: 'Zero-Cost Web',
    tagline: 'Stealth web session relay via cookie pool',
    description:
      'Direct $0 cookie-authenticated web session relay for uninterrupted high-volume web queries and search synthesis.',
    idealFor: 'Web scraping, live search synthesis, zero-token cost streaming',
    latencyRating: 'Balanced',
    contextTokens: '1,000,000+',
    reasoningCapability: 'High',
    tier: 'standard',
  },
  {
    id: 'supremeai-api',
    name: 'SupremeAI API',
    alias: 'Multi-Cloud API Squad',
    badge: 'Enterprise API',
    tagline: 'High-availability multi-key provider pool',
    description:
      'Direct load-balanced multi-provider API squad across Gemini, Groq, OpenRouter, Mistral, and Hugging Face.',
    idealFor: 'Mission-critical enterprise completions, production APIs, guaranteed failover',
    latencyRating: 'Ultra-Fast',
    contextTokens: '2,000,000+',
    reasoningCapability: 'Extreme',
    tier: 'standard',
  },
];

export interface ModelColorTheme {
  id: string;
  label: string;
  hex: string;
  dotClass: string;
  triggerClass: string;
  menuActiveClass: string;
  activeTextClass: string;
}

export const MODEL_COLOR_THEMES: Record<string, ModelColorTheme> = {
  'supreme-core': {
    id: 'cyan',
    label: 'Cyan',
    hex: '#06b6d4',
    dotClass: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.7)]',
    triggerClass:
      'bg-cyan-500/12 hover:bg-cyan-500/20 border-cyan-500/35 text-cyan-700 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 dark:border-cyan-400/40 dark:text-cyan-300',
    menuActiveClass:
      'bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/35 text-slate-900 dark:text-white',
    activeTextClass: 'text-cyan-600 dark:text-cyan-400',
  },
  'supreme-reason': {
    id: 'violet',
    label: 'Violet',
    hex: '#8b5cf6',
    dotClass: 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.7)]',
    triggerClass:
      'bg-violet-500/12 hover:bg-violet-500/20 border-violet-500/35 text-violet-700 dark:bg-violet-500/15 dark:hover:bg-violet-500/25 dark:border-violet-400/40 dark:text-violet-300',
    menuActiveClass:
      'bg-violet-500/10 dark:bg-violet-500/15 border border-violet-500/35 text-slate-900 dark:text-white',
    activeTextClass: 'text-violet-600 dark:text-violet-400',
  },
  'supreme-spark': {
    id: 'amber',
    label: 'Amber',
    hex: '#f59e0b',
    dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]',
    triggerClass:
      'bg-amber-500/12 hover:bg-amber-500/20 border-amber-500/35 text-amber-700 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:border-amber-400/40 dark:text-amber-300',
    menuActiveClass:
      'bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/35 text-slate-900 dark:text-white',
    activeTextClass: 'text-amber-600 dark:text-amber-400',
  },
  'supreme-deep': {
    id: 'emerald',
    label: 'Emerald',
    hex: '#10b981',
    dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
    triggerClass:
      'bg-emerald-500/12 hover:bg-emerald-500/20 border-emerald-500/35 text-emerald-700 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:border-emerald-400/40 dark:text-emerald-300',
    menuActiveClass:
      'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/35 text-slate-900 dark:text-white',
    activeTextClass: 'text-emerald-600 dark:text-emerald-400',
  },
  'supremeai-web': {
    id: 'blue',
    label: 'Blue',
    hex: '#3b82f6',
    dotClass: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]',
    triggerClass:
      'bg-blue-500/12 hover:bg-blue-500/20 border-blue-500/35 text-blue-700 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 dark:border-blue-400/40 dark:text-blue-300',
    menuActiveClass:
      'bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/35 text-slate-900 dark:text-white',
    activeTextClass: 'text-blue-600 dark:text-blue-400',
  },
  'supremeai-api': {
    id: 'rose',
    label: 'Rose',
    hex: '#f43f5e',
    dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]',
    triggerClass:
      'bg-rose-500/12 hover:bg-rose-500/20 border-rose-500/35 text-rose-700 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 dark:border-rose-400/40 dark:text-rose-300',
    menuActiveClass:
      'bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/35 text-slate-900 dark:text-white',
    activeTextClass: 'text-rose-600 dark:text-rose-400',
  },
};

export function getModelColorTheme(modelId: string): ModelColorTheme {
  return MODEL_COLOR_THEMES[modelId] || MODEL_COLOR_THEMES['supreme-core'];
}
