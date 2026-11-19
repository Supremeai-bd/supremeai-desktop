import React, { useState } from 'react';
import {
  Cpu,
  FolderGit2,
  Sliders,
  ShieldCheck,
  Users,
  Activity,
  Radio,
  Key,
  Database,
  FileCheck2,
  Bot,
  LayoutDashboard,
  Rocket,
  GitBranch,
  Brain,
  Globe,
  Wallet,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Pin,
} from 'lucide-react';
import { useI18n } from '../../utils/i18n';
import { logger } from '../../utils/logger';

interface AdminConsoleNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  customersCount?: number;
  mcpAlertCount?: number;
  healthAlertCount?: number;
}

interface AdminNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeClassName?: string;
}

const PINNED_ADMIN_STORAGE_KEY = 'supremeai_pinned_admin_tools';
const DEFAULT_PINNED_ADMIN_TOOLS = ['mcp-tower', 'system-audit'];

export const AdminConsoleNav: React.FC<AdminConsoleNavProps> = ({
  activeTab,
  onSelectTab,
  customersCount = 0,
  mcpAlertCount = 0,
  healthAlertCount = 0,
}) => {
  const { t } = useI18n();
  const [showAdvancedAdmin, setShowAdvancedAdmin] = useState(false);
  const [pinnedAdminToolIds, setPinnedAdminToolIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PINNED_ADMIN_STORAGE_KEY);
      if (saved === null) return DEFAULT_PINNED_ADMIN_TOOLS;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === 'string');
      }
    } catch (error) {
      logger.debug('AdminConsoleNav: suppressed non-fatal error', error);
    }
    return DEFAULT_PINNED_ADMIN_TOOLS;
  });

  const togglePinAdminTool = (toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedAdminToolIds((prev) => {
      const next = prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId];
      try {
        localStorage.setItem(PINNED_ADMIN_STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        logger.debug('AdminConsoleNav: suppressed non-fatal error', error);
      }
      return next;
    });
  };

  const adminHubs: Array<{ title: string; items: AdminNavItem[] }> = [
    {
      title: '1. Live Health & Ops',
      items: [
        {
          id: 'admin-overview',
          label: 'Command Center',
          icon: <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />,
        },
        {
          id: 'health-monitor',
          label: 'CPU, Mem & Latency',
          icon: (
            <Cpu
              className={`w-4 h-4 shrink-0 ${
                healthAlertCount > 0 ? 'text-amber-500' : 'text-emerald-500'
              }`}
            />
          ),
          badge: healthAlertCount > 0 ? `${healthAlertCount}` : undefined,
          badgeClassName:
            'text-[10px] font-mono tabular-nums text-amber-600 dark:text-amber-400 font-semibold',
        },
        {
          id: 'task-queue',
          label: 'Task Queue',
          icon: <Activity className="w-4 h-4 text-amber-500 shrink-0" />,
        },
        {
          id: 'mcp-tower',
          label: 'MCP Tower',
          icon: (
            <Radio
              className={`w-4 h-4 shrink-0 ${
                mcpAlertCount > 0 ? 'text-rose-500' : 'text-slate-500'
              }`}
            />
          ),
          badge: mcpAlertCount > 0 ? `${mcpAlertCount}` : undefined,
          badgeClassName: 'text-[10px] font-mono tabular-nums text-rose-500 font-semibold',
        },
      ],
    },
    {
      title: '2. AI & Compute',
      items: [
        {
          id: 'llm-gateway',
          label: 'LLM Gateway',
          icon: <Cpu className="w-4 h-4 text-blue-500 shrink-0" />,
        },
        {
          id: 'compute-fleet',
          label: 'GPU Fleet',
          icon: <Globe className="w-4 h-4 text-cyan-500 shrink-0" />,
        },
        {
          id: 'agent-swarm',
          label: 'Agent Swarm',
          icon: <Bot className="w-4 h-4 text-purple-500 shrink-0" />,
        },
      ],
    },
    {
      title: '3. Users & Safety',
      items: [
        {
          id: 'customers',
          label: 'Customers',
          icon: <Users className="w-4 h-4 text-slate-500 shrink-0" />,
          badge: String(customersCount),
          badgeClassName: 'text-[10px] font-mono tabular-nums text-slate-500',
        },
        {
          id: 'security',
          label: 'Security & Abuse',
          icon: <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />,
        },
        {
          id: 'hitl-policies',
          label: 'HITL & Policies',
          icon: <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />,
        },
      ],
    },
    {
      title: '4. Releases & Data',
      items: [
        {
          id: 'github-pipeline',
          label: 'GitHub Pipeline',
          icon: <GitBranch className="w-4 h-4 text-emerald-500 shrink-0" />,
        },
        {
          id: 'release-gate',
          label: 'Release Gate',
          icon: <Rocket className="w-4 h-4 text-emerald-500 shrink-0" />,
        },
        {
          id: 'schema-parity',
          label: 'Schema Parity',
          icon: <Database className="w-4 h-4 text-emerald-500 shrink-0" />,
        },
      ],
    },
  ];

  const advancedAdminItems: AdminNavItem[] = [
    {
      id: 'visual-cockpit',
      label: 'Visual Cockpit',
      icon: <LayoutDashboard className="w-3.5 h-3.5 text-cyan-500 shrink-0" />,
    },
    {
      id: 'architecture-map',
      label: 'Architecture Map',
      icon: <Activity className="w-3.5 h-3.5 text-cyan-500 shrink-0" />,
    },
    {
      id: 'memory-graph',
      label: 'Memory & Qdrant',
      icon: <Brain className="w-3.5 h-3.5 text-purple-500 shrink-0" />,
    },
    {
      id: 'system-audit',
      label: 'System Audit Log',
      icon: <FileCheck2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />,
    },
    {
      id: 'provider-keys',
      label: 'Provider API Keys',
      icon: <Key className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
    },
    {
      id: 'finops-omnichannel',
      label: 'FinOps & Telegram',
      icon: <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
    },
    {
      id: 'feature-flags',
      label: 'Feature Flags',
      icon: <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
    },
    {
      id: 'repos',
      label: 'Ecosystem Repos',
      icon: <FolderGit2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
    },
    {
      id: 'external-agents',
      label: 'External Agents',
      icon: <GitBranch className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
    },
    {
      id: 'models',
      label: 'Model Matrix',
      icon: <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
    },
    {
      id: 'roles',
      label: 'Roles & Gems Lab',
      icon: <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
    },
    {
      id: 'usage',
      label: 'Usage Analytics',
      icon: <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
    },
  ];

  const allAdminItems = [...adminHubs.flatMap((h) => h.items), ...advancedAdminItems];
  const adminItemById = new Map(allAdminItems.map((item) => [item.id, item]));
  const pinnedAdminItems = pinnedAdminToolIds
    .map((id) => adminItemById.get(id))
    .filter((item): item is AdminNavItem => Boolean(item));

  const renderAdminNavRow = (
    item: AdminNavItem,
    opts: { compact?: boolean; inPinnedSection?: boolean } = {}
  ) => {
    const isActive = activeTab === item.id;
    const isPinned = pinnedAdminToolIds.includes(item.id);
    const { compact = false, inPinnedSection = false } = opts;

    return (
      <div
        key={`${inPinnedSection ? 'pinned-' : ''}${item.id}`}
        className={`group flex items-center gap-1 rounded-lg transition-colors ${
          isActive
            ? 'bg-slate-200/75 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectTab(item.id)}
          className={`flex-1 min-w-0 flex items-center justify-between gap-2 ${
            compact ? 'pl-2.5 pr-1 py-1.5' : 'pl-3 pr-1 py-2'
          } text-left cursor-pointer`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {item.icon}
            <span className="truncate text-xs">{item.label}</span>
          </div>
          {item.badge && (
            <span
              className={`shrink-0 ${item.badgeClassName || 'text-[10px] font-mono text-slate-400'}`}
            >
              {item.badge}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={(e) => togglePinAdminTool(item.id, e)}
          aria-label={isPinned ? `${t.unpinTool} ${item.label}` : `${t.pinTool} ${item.label}`}
          title={isPinned ? t.unpinTool : t.pinTool}
          className={`p-1 mr-1 rounded transition-opacity cursor-pointer shrink-0 ${
            isPinned
              ? 'text-amber-500 hover:text-amber-600 opacity-100'
              : 'text-slate-400 hover:text-amber-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        >
          <Pin className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <nav
      aria-label="Admin Ops Console Navigation"
      className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md overflow-y-auto p-2 space-y-1 text-xs"
    >
      <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
        <span>{t.opsConsoleTitle}</span>
      </div>

      {pinnedAdminItems.length > 0 && (
        <div className="pb-2 mb-1 border-b border-slate-200/70 dark:border-slate-800/70 space-y-0.5">
          <div className="px-2.5 py-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <span className="inline-flex items-center gap-1">
              <Pin className="w-3 h-3" />
              <span>{t.pinnedAdminTools}</span>
            </span>
            <span className="font-mono tabular-nums">{pinnedAdminItems.length}</span>
          </div>
          {pinnedAdminItems.map((item) =>
            renderAdminNavRow(item, { compact: true, inPinnedSection: true })
          )}
        </div>
      )}

      {adminHubs.map((hub, idx) => (
        <React.Fragment key={hub.title}>
          <div
            className={`px-2.5 ${
              idx === 0 ? 'pt-0.5' : 'pt-2'
            } pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500`}
          >
            {hub.title}
          </div>
          {hub.items.map((item) => renderAdminNavRow(item, { compact: true }))}
        </React.Fragment>
      ))}

      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowAdvancedAdmin((v) => !v)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <span>More Admin Tools</span>
          {showAdvancedAdmin ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {showAdvancedAdmin && (
          <div className="space-y-0.5 pt-1 pl-1 border-l border-slate-200 dark:border-slate-800 ml-2.5">
            {advancedAdminItems.map((item) => renderAdminNavRow(item, { compact: true }))}
          </div>
        )}
      </div>
    </nav>
  );
};
