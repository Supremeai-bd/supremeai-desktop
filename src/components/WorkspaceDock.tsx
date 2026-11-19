import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Code2,
  Download,
  Eye,
  GripVertical,
  Maximize2,
  Minimize2,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  Tablet,
  Terminal,
  X,
} from 'lucide-react';
import { CodeViewer } from './CodeViewer';
import { TerminalPanel } from './TerminalPanel';
import { useI18n } from '../i18n';
import type { ResolvedColorScheme, WorkspaceDockTab, WorkspaceFile } from '../types/studio';

interface WorkspaceDockProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: WorkspaceDockTab;
  onTabChange: (tab: WorkspaceDockTab) => void;
  files: WorkspaceFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onUpdateFile: (id: string, content: string) => void;
  onCreateFile: () => void;
  resolvedScheme: ResolvedColorScheme;
  activeModelName: string;
  gatewayStatus: string;
  runtimeLabel: string;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

function buildPreviewDocument(files: WorkspaceFile[], activeFile: WorkspaceFile | undefined): string {
  const htmlFile =
    (activeFile?.language === 'html' ? activeFile : undefined) ??
    files.find((f) => f.language === 'html' || f.name.endsWith('.html'));

  if (htmlFile) return htmlFile.content;

  const fallbackCode = activeFile?.content || '';
  const escaped = fallbackCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><style>body{margin:0;padding:24px;font-family:monospace;background:#0b162c;color:#e2e8f0;line-height:1.6;}pre{white-space:pre-wrap;word-break:break-word;}</style></head>
<body><pre>${escaped}</pre></body>
</html>`;
}

export function WorkspaceDock({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  files,
  activeFileId,
  onSelectFile,
  onUpdateFile,
  onCreateFile,
  resolvedScheme,
  activeModelName,
  gatewayStatus,
  runtimeLabel,
}: WorkspaceDockProps) {
  const { t } = useI18n();
  const [widthPct, setWidthPct] = useState(44);
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [reloadNonce, setReloadNonce] = useState(0);
  const dockRef = useRef<HTMLElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const parentRect = dockRef.current?.parentElement?.getBoundingClientRect();
      const totalWidth = parentRect?.width || window.innerWidth;
      const rightEdge = parentRect?.right || window.innerWidth;
      const nextPct = ((rightEdge - e.clientX) / totalWidth) * 100;
      setWidthPct(Math.max(28, Math.min(66, nextPct)));
    },
    [isDragging]
  );

  useEffect(() => {
    if (!isDragging) return;
    const stop = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stop);
    };
  }, [isDragging, handleMouseMove]);

  if (!isOpen) return null;

  const activeFile = files.find((f) => f.id === activeFileId) ?? files[0];
  const previewSrcDoc = buildPreviewDocument(files, activeFile);

  const downloadActiveFile = () => {
    if (!activeFile) return;
    const url = URL.createObjectURL(new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: WorkspaceDockTab; label: string; icon: typeof Eye }> = [
    { id: 'preview', label: t.dockPreview, icon: Eye },
    { id: 'code', label: t.dockCode, icon: Code2 },
    { id: 'terminal', label: t.dockTerminal, icon: Terminal },
  ];

  const previewFrameWidth =
    viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%';

  return (
    <aside
      ref={dockRef}
      style={isMaximized ? { width: '100%' } : { width: `${widthPct}%` }}
      className={`${
        isMaximized
          ? 'absolute inset-0 z-30'
          : 'relative hidden md:flex min-w-[320px] max-w-[68%]'
      } flex flex-col h-full border-l theme-surface-strong shrink-0`}
    >
      {/* Drag resize handle */}
      {!isMaximized && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          title="Drag to resize Workspace Dock"
          className={`absolute -left-1.5 inset-y-0 w-3 z-20 cursor-col-resize flex items-center justify-center group ${
            isDragging ? 'bg-sky-500/20' : 'hover:bg-sky-500/10'
          }`}
        >
          <GripVertical className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Dock Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/75 border border-slate-200/70 dark:border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeTab === 'preview' && (
            <>
              <div className="hidden lg:flex items-center gap-0.5 mr-1">
                {(
                  [
                    ['desktop', Monitor],
                    ['tablet', Tablet],
                    ['mobile', Smartphone],
                  ] as const
                ).map(([size, Icon]) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setViewport(size)}
                    aria-label={`${size} viewport`}
                    className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                      viewport === size
                        ? 'theme-accent-active border'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setReloadNonce((n) => n + 1)}
                title={t.dockReload}
                aria-label={t.dockReload}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {activeTab === 'code' && (
            <>
              <button
                type="button"
                onClick={onCreateFile}
                title={t.dockNewFile}
                aria-label={t.dockNewFile}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={downloadActiveFile}
                title="Download file"
                aria-label="Download file"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsMaximized((v) => !v)}
            title={isMaximized ? t.dockRestore : t.dockMaximize}
            aria-label={isMaximized ? t.dockRestore : t.dockMaximize}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            title={t.closeDock}
            aria-label={t.closeDock}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* File tabs strip for Code view */}
      {activeTab === 'code' && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-200/80 dark:border-slate-800/80 overflow-x-auto shrink-0 bg-slate-50/60 dark:bg-slate-950/40">
          {files.map((file) => {
            const selected = file.id === activeFile?.id;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => onSelectFile(file.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                  selected
                    ? 'theme-accent-active border font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                }`}
              >
                {file.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Dock Body */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab === 'preview' && (
          <div className="h-full w-full flex items-center justify-center bg-slate-100/80 dark:bg-slate-950/70 p-3 overflow-auto">
            <iframe
              key={reloadNonce}
              title="SupremeAI Live Preview"
              sandbox="allow-scripts"
              srcDoc={previewSrcDoc}
              style={{ width: previewFrameWidth }}
              className="h-full max-w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white shadow-sm transition-all"
            />
          </div>
        )}

        {activeTab === 'code' && activeFile && (
          <CodeViewer
            value={activeFile.content}
            language={activeFile.language}
            theme={resolvedScheme}
            onChange={(val) => onUpdateFile(activeFile.id, val)}
          />
        )}

        {activeTab === 'terminal' && (
          <TerminalPanel
            files={files}
            activeModelName={activeModelName}
            gatewayStatus={gatewayStatus}
            runtimeLabel={runtimeLabel}
            theme={resolvedScheme}
          />
        )}
      </div>
    </aside>
  );
}
