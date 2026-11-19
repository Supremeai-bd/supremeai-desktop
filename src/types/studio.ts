export type Role = 'user' | 'assistant';

export type ActiveTab =
  | 'chat'
  | 'chat-history'
  | 'roles'
  | 'projects'
  | 'knowledge'
  | 'settings';

export type WorkspaceDockTab = 'preview' | 'code' | 'terminal';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedColorScheme = 'light' | 'dark';

export type LiveThemeId =
  | 'alpine-dunes'
  | 'misty-fjords'
  | 'emerald-highlands'
  | 'amber-canyon'
  | 'midnight-peaks'
  | 'nebula'
  | 'aurora-borealis'
  | 'oceanic-horizon'
  | 'cyber-studio';

export type GatewayStatus = 'idle' | 'connected' | 'offline';

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  previewText?: string;
  dataUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  modelId?: string;
  state?: 'loading' | 'error';
  retryPrompt?: string;
  attachments?: ChatAttachment[];
}

export interface SavedChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  createdAt: number;
  isPinned?: boolean;
  roleId?: string;
  modelId?: string;
}

export interface ModelOption {
  id: string;
  gatewayModel: 'auto' | 'supremeai/openrouter' | 'supremeai/groq';
  name: string;
  shortLabel: string;
  description: string;
  speed: 'Fast' | 'Balanced' | 'Deep';
  accentHex: string;
}

export interface RolePersona {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  suggestedModel: string;
  systemInstruction: string;
  quickPrompts: string[];
  isCustom?: boolean;
}

export interface DesktopProject {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  language: string;
  description: string;
  status: 'Active' | 'Building' | 'Synced';
  updatedAt: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content: string;
  enabled: boolean;
  updatedAt: number;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

export interface LiveThemePalette {
  id: LiveThemeId;
  name: string;
  tagline: string;
  swatches: [string, string, string];
  light: {
    accent: string;
    accentHover: string;
    accentSoft: string;
    accentRing: string;
    accentContrast: string;
    accentGradient: string;
    surfaceGlass: string;
    surfaceStrong: string;
    surfaceSidebar: string;
    surfaceInput: string;
    surfaceBorder: string;
    backdropBase: string;
    backdropGlow: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    userBg: string;
    userBorder: string;
  };
  dark: {
    accent: string;
    accentHover: string;
    accentSoft: string;
    accentRing: string;
    accentContrast: string;
    accentGradient: string;
    surfaceGlass: string;
    surfaceStrong: string;
    surfaceSidebar: string;
    surfaceInput: string;
    surfaceBorder: string;
    backdropBase: string;
    backdropGlow: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    userBg: string;
    userBorder: string;
  };
}

export interface ThemeConfig {
  mode: ThemeMode;
  liveTheme: LiveThemeId;
  liveMotion: boolean;
}
