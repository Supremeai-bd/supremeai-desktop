import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Code2,
  Eye,
  Copy,
  Check,
  RotateCcw,
  FilePlus2,
  Trash2,
  Download,
  FileCode2,
  X,
  GitBranch,
  GitCompare,
  PanelLeft,
  Search,
  FileText,
  BookmarkPlus,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { browserService } from '../../services/browserService';
import { toast } from '../../stores/useToastStore';
import { useI18n } from '../../utils/i18n';
import { computeLineDiff, summarizeDiff } from '../../utils/lineDiff';
import { classifyCodeLanguage } from '../../utils/artifactStreamParser';
import { downloadProjectZip } from '../../utils/projectZipExport';
import { GitExportModal } from './GitExportModal';

export interface LocalScratchpadFile {
  id: string;
  name: string;
  lang: string;
  content: string;
  updatedAt: string;
}

export const CODE_SCRATCHPAD_STORAGE_KEY = 'supremeai_code_scratchpad_v1';
export const CODE_SCRATCHPAD_ACTIVE_KEY = 'supremeai_code_scratchpad_active_v1';

const LANG_EXTENSION_MAP: Record<string, string> = {
  php: 'php',
  html: 'html',
  tsx: 'tsx',
  jsx: 'jsx',
  javascript: 'js',
  typescript: 'ts',
  mermaid: 'mmd',
  css: 'css',
  json: 'json',
  markdown: 'md',
  python: 'py',
  java: 'java',
  bash: 'sh',
  go: 'go',
  rust: 'rs',
  sql: 'sql',
  yaml: 'yml',
};

const EXTENSION_LANG_MAP: Record<string, string> = {
  php: 'php',
  phtml: 'php',
  html: 'html',
  htm: 'html',
  tsx: 'tsx',
  jsx: 'jsx',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  mmd: 'mermaid',
  mermaid: 'mermaid',
  css: 'css',
  scss: 'css',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  java: 'java',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  go: 'go',
  rs: 'rust',
  sql: 'sql',
  yml: 'yaml',
  yaml: 'yaml',
};

const CODE_LANGUAGE_OPTIONS = [
  'html',
  'tsx',
  'jsx',
  'javascript',
  'typescript',
  'css',
  'mermaid',
  'json',
  'markdown',
  'php',
  'python',
  'bash',
] as const;

export function inferLanguageFromFilename(fileName: string, fallback: string = 'html'): string {
  const parts = fileName.trim().toLowerCase().split('.');
  if (parts.length < 2) return fallback;
  const ext = parts[parts.length - 1];
  return EXTENSION_LANG_MAP[ext] || fallback;
}

function persistLocalScratchpadFiles(files: LocalScratchpadFile[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CODE_SCRATCHPAD_STORAGE_KEY, JSON.stringify(files));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadActiveScratchpadId(): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    return localStorage.getItem(CODE_SCRATCHPAD_ACTIVE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveActiveScratchpadId(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (id) {
      localStorage.setItem(CODE_SCRATCHPAD_ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(CODE_SCRATCHPAD_ACTIVE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLocalScratchpadFiles(): LocalScratchpadFile[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CODE_SCRATCHPAD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is LocalScratchpadFile =>
        Boolean(f) &&
        typeof f.id === 'string' &&
        typeof f.name === 'string' &&
        typeof f.content === 'string'
    );
  } catch {
    return [];
  }
}

export function createLocalScratchpadFile(
  list: LocalScratchpadFile[],
  name: string,
  lang?: string,
  content: string = ''
): { files: LocalScratchpadFile[]; created: LocalScratchpadFile } {
  const fallbackLang = lang || 'html';
  const baseRaw =
    name.trim().slice(0, 60) || `untitled.${LANG_EXTENSION_MAP[fallbackLang] || 'txt'}`;
  let uniqueName = baseRaw;
  let counter = 2;
  const dotIdx = baseRaw.lastIndexOf('.');
  const stem = dotIdx > 0 ? baseRaw.slice(0, dotIdx) : baseRaw;
  const ext = dotIdx > 0 ? baseRaw.slice(dotIdx) : '';
  while (list.some((f) => f.name.toLowerCase() === uniqueName.toLowerCase())) {
    uniqueName = `${stem}-${counter++}${ext}`;
  }

  const resolvedLang = inferLanguageFromFilename(uniqueName, fallbackLang).toLowerCase();
  const created: LocalScratchpadFile = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: uniqueName,
    lang: resolvedLang,
    content,
    updatedAt: new Date().toISOString(),
  };
  const files = [created, ...list.slice(0, 29)];
  persistLocalScratchpadFiles(files);
  return { files, created };
}

export function saveLocalScratchpadFile(
  list: LocalScratchpadFile[],
  name: string,
  lang: string,
  content: string
): { files: LocalScratchpadFile[]; saved: LocalScratchpadFile } {
  const cleanName =
    name.trim().slice(0, 60) || `scratch-${list.length + 1}.${LANG_EXTENSION_MAP[lang] || 'txt'}`;
  const existingIdx = list.findIndex((f) => f.name.toLowerCase() === cleanName.toLowerCase());
  const resolvedLang = inferLanguageFromFilename(cleanName, (lang || 'html').toLowerCase());
  const saved: LocalScratchpadFile = {
    id:
      existingIdx >= 0
        ? list[existingIdx].id
        : `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    lang: resolvedLang,
    content,
    updatedAt: new Date().toISOString(),
  };
  const files =
    existingIdx >= 0
      ? list.map((item, i) => (i === existingIdx ? saved : item))
      : [saved, ...list.slice(0, 29)];
  persistLocalScratchpadFiles(files);
  return { files, saved };
}

export function renameLocalScratchpadFile(
  list: LocalScratchpadFile[],
  id: string,
  newName: string
): { files: LocalScratchpadFile[]; renamed: LocalScratchpadFile | null } {
  const trimmed = newName.trim().slice(0, 60);
  if (!trimmed) return { files: list, renamed: null };
  const target = list.find((f) => f.id === id);
  if (!target) return { files: list, renamed: null };

  // Prevent colliding with another file's name
  let finalName = trimmed;
  let counter = 2;
  const dotIdx = trimmed.lastIndexOf('.');
  const stem = dotIdx > 0 ? trimmed.slice(0, dotIdx) : trimmed;
  const ext = dotIdx > 0 ? trimmed.slice(dotIdx) : '';
  while (list.some((f) => f.id !== id && f.name.toLowerCase() === finalName.toLowerCase())) {
    finalName = `${stem}-${counter++}${ext}`;
  }

  const nextLang = inferLanguageFromFilename(finalName, target.lang);
  const renamed: LocalScratchpadFile = {
    ...target,
    name: finalName,
    lang: nextLang,
    updatedAt: new Date().toISOString(),
  };
  const files = list.map((item) => (item.id === id ? renamed : item));
  persistLocalScratchpadFiles(files);
  return { files, renamed };
}

export function updateLocalScratchpadContent(
  list: LocalScratchpadFile[],
  id: string,
  content: string,
  lang?: string
): LocalScratchpadFile[] {
  let changed = false;
  const files = list.map((item) => {
    if (item.id !== id) return item;
    const nextLang = lang || item.lang;
    if (item.content === content && item.lang === nextLang) return item;
    changed = true;
    return {
      ...item,
      content,
      lang: nextLang,
      updatedAt: new Date().toISOString(),
    };
  });
  if (changed) {
    persistLocalScratchpadFiles(files);
  }
  return files;
}

export function deleteLocalScratchpadFile(
  list: LocalScratchpadFile[],
  id: string
): LocalScratchpadFile[] {
  const next = list.filter((f) => f.id !== id);
  persistLocalScratchpadFiles(next);
  return next;
}

export const WorkspaceCodeTab: React.FC = () => {
  const {
    previewCode,
    previousPreviewCode,
    previewLang,
    projectTitle,
    projectFiles,
    previousProjectFiles,
    activeProjectFilePath,
    selectProjectFile,
    updateProjectFileContent,
    createProjectFile,
    deleteProjectFile,
    updatePreviewCode,
    acceptPreviewDiff,
    revertPreviewDiff,
    setActiveDockTab,
  } = useWorkspaceStore();

  const { t } = useI18n();
  const [localFiles, setLocalFiles] = useState<LocalScratchpadFile[]>(() =>
    loadLocalScratchpadFiles()
  );
  const [selectedSourceValue, setSelectedSourceValue] = useState<string>(() => {
    if (projectFiles.length > 0 && activeProjectFilePath) {
      return `vproj::${activeProjectFilePath}`;
    }
    const savedId = loadActiveScratchpadId();
    const initialFiles = loadLocalScratchpadFiles();
    if (savedId && initialFiles.some((f) => f.id === savedId)) {
      return `local::${savedId}`;
    }
    return '';
  });

  const initialVprojFile =
    projectFiles.length > 0
      ? projectFiles.find((f) => f.path === activeProjectFilePath) || projectFiles[0]
      : null;

  const initialActiveLocal = selectedSourceValue.startsWith('local::')
    ? localFiles.find((f) => `local::${f.id}` === selectedSourceValue) || null
    : null;

  const [draft, setDraft] = useState<string>(() =>
    initialVprojFile
      ? initialVprojFile.content
      : initialActiveLocal
        ? initialActiveLocal.content
        : previewCode
  );
  const [activeLang, setActiveLang] = useState<string>(() =>
    initialVprojFile
      ? initialVprojFile.lang
      : initialActiveLocal
        ? initialActiveLocal.lang
        : previewLang || 'html'
  );
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [showExplorer, setShowExplorer] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 640
  );
  const [explorerQuery, setExplorerQuery] = useState('');

  const [promptMode, setPromptMode] = useState<'none' | 'create' | 'rename' | 'saveAs'>('none');
  const [fileNameInput, setFileNameInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'diff'>('code');
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);

  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevPreviewRef = useRef({ code: previewCode, lang: previewLang });
  const prevVprojRef = useRef({
    path: activeProjectFilePath,
    content: initialVprojFile?.content || '',
  });
  const autoPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeVprojFile = selectedSourceValue.startsWith('vproj::')
    ? projectFiles.find((f) => `vproj::${f.path}` === selectedSourceValue) || null
    : null;

  const activeLocalFile = selectedSourceValue.startsWith('local::')
    ? localFiles.find((f) => `local::${f.id}` === selectedSourceValue) || null
    : null;

  const diffBaselineContent = activeVprojFile
    ? previousProjectFiles.find((f) => f.path === activeVprojFile.path)?.content || ''
    : !selectedSourceValue
      ? previousPreviewCode
      : '';
  const hasDiffBaseline = Boolean(diffBaselineContent) && diffBaselineContent !== draft;
  const diffLines = useMemo(
    () => (hasDiffBaseline ? computeLineDiff(diffBaselineContent, draft) : []),
    [hasDiffBaseline, diffBaselineContent, draft]
  );
  const diffSummary = useMemo(() => summarizeDiff(diffLines), [diffLines]);

  const filteredGeneratedFiles = useMemo(() => {
    const q = explorerQuery.trim().toLowerCase();
    if (!q) return projectFiles;
    return projectFiles.filter((f) => f.path.toLowerCase().includes(q));
  }, [projectFiles, explorerQuery]);

  const filteredLocalFiles = useMemo(() => {
    const q = explorerQuery.trim().toLowerCase();
    if (!q) return localFiles;
    return localFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [localFiles, explorerQuery]);

  const filteredProjectFiles = useMemo(() => {
    const q = explorerQuery.trim().toLowerCase();
    if (!q) return workspaceFiles;
    return workspaceFiles.filter((fp) => fp.toLowerCase().includes(q));
  }, [workspaceFiles, explorerQuery]);

  useEffect(() => {
    return () => {
      if (autoPreviewTimerRef.current) clearTimeout(autoPreviewTimerRef.current);
    };
  }, []);

  // Sync generated multi-file project updates / selections
  useEffect(() => {
    if (projectFiles.length === 0) {
      if (selectedSourceValue.startsWith('vproj::')) {
        setSelectedSourceValue('');
        setDraft(previewCode);
        setActiveLang(previewLang || 'html');
      }
      prevVprojRef.current = { path: '', content: '' };
      return;
    }

    const targetFile =
      projectFiles.find((f) => f.path === activeProjectFilePath) || projectFiles[0];
    if (!targetFile) return;

    const pathChanged = prevVprojRef.current.path !== targetFile.path;
    const externalContentChanged = prevVprojRef.current.content !== targetFile.content;

    if (pathChanged || externalContentChanged) {
      prevVprojRef.current = { path: targetFile.path, content: targetFile.content };
      if (!selectedSourceValue.startsWith('local::') || externalContentChanged || pathChanged) {
        setSelectedSourceValue(`vproj::${targetFile.path}`);
        saveActiveScratchpadId('');
        setDraft(targetFile.content);
        setActiveLang(targetFile.lang || 'text');
      }
    }
  }, [projectFiles, activeProjectFilePath, previewCode, previewLang, selectedSourceValue]);

  // Sync single-file previewCode/previewLang changes when no multi-file project is active
  useEffect(() => {
    if (projectFiles.length > 0) return;
    if (
      prevPreviewRef.current.code !== previewCode ||
      prevPreviewRef.current.lang !== previewLang
    ) {
      prevPreviewRef.current = { code: previewCode, lang: previewLang };
      if (!selectedSourceValue.startsWith('local::') || previewCode.trim()) {
        setSelectedSourceValue('');
        saveActiveScratchpadId('');
        setDraft(previewCode);
        setActiveLang(previewLang || 'html');
      }
    }
  }, [previewCode, previewLang, selectedSourceValue, projectFiles.length]);

  useEffect(() => {
    browserService
      .listWorkspaceFiles()
      .then((files) => setWorkspaceFiles(files))
      .catch(() => setWorkspaceFiles([]));
  }, []);

  const selectGeneratedFile = (filePath: string) => {
    const target = projectFiles.find((f) => f.path === filePath);
    if (!target) return;
    prevVprojRef.current = { path: target.path, content: target.content };
    selectProjectFile(target.path);
    setSelectedSourceValue(`vproj::${target.path}`);
    saveActiveScratchpadId('');
    setDraft(target.content);
    setActiveLang(target.lang || 'text');
    setPromptMode('none');
  };

  const selectLocalFile = (file: LocalScratchpadFile) => {
    setSelectedSourceValue(`local::${file.id}`);
    saveActiveScratchpadId(file.id);
    setDraft(file.content);
    setActiveLang(file.lang);
    setPromptMode('none');
  };

  const selectPreviewBuffer = () => {
    setSelectedSourceValue('');
    saveActiveScratchpadId('');
    setDraft(previewCode);
    setActiveLang(previewLang || 'html');
    setPromptMode('none');
  };

  const displayTitle = activeVprojFile
    ? activeVprojFile.path
    : activeLocalFile
      ? activeLocalFile.name
      : selectedSourceValue.startsWith('project::')
        ? selectedSourceValue.slice('project::'.length)
        : `${activeLang} BUFFER`;

  const handleSourceChange = async (value: string) => {
    if (!value) {
      selectPreviewBuffer();
      return;
    }

    if (value.startsWith('vproj::')) {
      selectGeneratedFile(value.slice('vproj::'.length));
      return;
    }

    if (value.startsWith('local::')) {
      const targetId = value.slice('local::'.length);
      const localItem = localFiles.find((f) => f.id === targetId);
      if (localItem) {
        selectLocalFile(localItem);
      }
      return;
    }

    if (value.startsWith('project::')) {
      const selectedPath = value.slice('project::'.length);
      setSelectedSourceValue(value);
      saveActiveScratchpadId('');
      try {
        const fileData = await browserService.readWorkspaceFile(selectedPath);
        setDraft(fileData.content);
        setActiveLang(fileData.lang);
        updatePreviewCode(fileData.content, fileData.lang);
      } catch (err: unknown) {
        toast.error('File Load Error', err instanceof Error ? err.message : 'Unable to read file');
      }
    }
  };

  const scheduleAutoPreviewSync = (nextContent: string, nextLang: string, vprojPath?: string) => {
    if (autoPreviewTimerRef.current) clearTimeout(autoPreviewTimerRef.current);
    autoPreviewTimerRef.current = setTimeout(() => {
      if (vprojPath) {
        prevVprojRef.current = { path: vprojPath, content: nextContent };
        updateProjectFileContent(vprojPath, nextContent);
      } else {
        prevPreviewRef.current = { code: nextContent, lang: nextLang };
        updatePreviewCode(nextContent, nextLang);
      }
    }, 300);
  };

  const handleDraftChange = (nextContent: string) => {
    setDraft(nextContent);
    if (activeVprojFile) {
      scheduleAutoPreviewSync(nextContent, activeLang, activeVprojFile.path);
    } else if (activeLocalFile) {
      setLocalFiles((prev) =>
        updateLocalScratchpadContent(prev, activeLocalFile.id, nextContent, activeLang)
      );
    } else if (!selectedSourceValue) {
      scheduleAutoPreviewSync(nextContent, activeLang);
    }
  };

  const handleLanguageChange = (nextLangRaw: string) => {
    const nextLang = nextLangRaw.toLowerCase().trim() || 'html';
    setActiveLang(nextLang);
    if (activeLocalFile) {
      setLocalFiles((prev) =>
        updateLocalScratchpadContent(prev, activeLocalFile.id, draft, nextLang)
      );
    } else if (!selectedSourceValue && projectFiles.length === 0) {
      prevPreviewRef.current = { code: draft, lang: nextLang };
      updatePreviewCode(draft, nextLang);
    }
  };

  const handleSubmitFilePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = fileNameInput.trim();

    if (promptMode === 'create') {
      if (projectFiles.length > 0 && cleaned) {
        createProjectFile(cleaned, '');
        setFileNameInput('');
        setPromptMode('none');
        requestAnimationFrame(() => textareaRef.current?.focus());
        return;
      }
      const defaultName = `untitled-${localFiles.length + 1}.${LANG_EXTENSION_MAP[activeLang] || 'tsx'}`;
      const { files, created } = createLocalScratchpadFile(
        localFiles,
        cleaned || defaultName,
        activeLang,
        ''
      );
      setLocalFiles(files);
      selectLocalFile(created);
      setFileNameInput('');
      setPromptMode('none');
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }

    if (promptMode === 'rename' && activeLocalFile) {
      if (!cleaned) return;
      const { files, renamed } = renameLocalScratchpadFile(localFiles, activeLocalFile.id, cleaned);
      if (renamed) {
        setLocalFiles(files);
        setActiveLang(renamed.lang);
        toast.success('File Renamed', renamed.name);
      }
      setFileNameInput('');
      setPromptMode('none');
      return;
    }

    if (promptMode === 'saveAs') {
      const defaultName =
        activeLocalFile?.name ||
        `scratch-${localFiles.length + 1}.${LANG_EXTENSION_MAP[activeLang] || 'txt'}`;
      const { files, saved } = saveLocalScratchpadFile(
        localFiles,
        cleaned || defaultName,
        activeLang,
        draft
      );
      setLocalFiles(files);
      selectLocalFile(saved);
      setFileNameInput('');
      setPromptMode('none');
      toast.success('Scratchpad Saved', saved.name);
    }
  };

  const handleDeleteLocalFile = (targetId?: string) => {
    const idToDelete = targetId || activeLocalFile?.id;
    if (!idToDelete) return;
    const next = deleteLocalScratchpadFile(localFiles, idToDelete);
    setLocalFiles(next);
    if (activeLocalFile?.id === idToDelete) {
      if (next.length > 0) {
        selectLocalFile(next[0]);
      } else {
        selectPreviewBuffer();
      }
    }
  };

  const handleDownloadFile = () => {
    if (projectFiles.length > 1) {
      downloadProjectZip(projectTitle || 'supremeai-project', projectFiles);
      return;
    }
    const ext = LANG_EXTENSION_MAP[activeLang] || 'txt';
    const fileName =
      activeVprojFile?.path.split('/').pop() ||
      activeLocalFile?.name ||
      `supremeai-code-${Date.now()}.${ext}`;
    const blob = new Blob([draft], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyAndPreview = () => {
    if (autoPreviewTimerRef.current) clearTimeout(autoPreviewTimerRef.current);
    if (activeVprojFile) {
      prevVprojRef.current = { path: activeVprojFile.path, content: draft };
      updateProjectFileContent(activeVprojFile.path, draft);
    } else {
      prevPreviewRef.current = { code: draft, lang: activeLang };
      updatePreviewCode(draft, activeLang);
    }
    setActiveDockTab('preview');
  };

  const handleRevert = () => {
    if (activeVprojFile) {
      setDraft(activeVprojFile.content);
      setActiveLang(activeVprojFile.lang || 'text');
    } else {
      setDraft(previewCode);
      setActiveLang(previewLang || 'html');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleEditorScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleApplyAndPreview();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = draft.slice(0, start) + '  ' + draft.slice(end);
      handleDraftChange(next);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  const lineCount = draft.split('\n').length;
  const isDirty = activeVprojFile
    ? draft !== activeVprojFile.content
    : !activeLocalFile && (draft !== previewCode || activeLang !== previewLang);
  const canPreviewLang =
    projectFiles.length > 0 ||
    activeLang === 'php' ||
    activeLang === 'python' ||
    classifyCodeLanguage(activeLang) !== 'non-browser';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#060910] text-slate-200 font-mono">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2 bg-[#0b101b]">
        <div className="flex items-center gap-2 text-[11px] min-w-0">
          <button
            type="button"
            onClick={() => setShowExplorer((v) => !v)}
            aria-pressed={showExplorer}
            title={t.wsCodeToggleExplorer}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
              showExplorer
                ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                : 'border-slate-800 text-slate-400 hover:text-cyan-300'
            }`}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
          <Code2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-semibold text-slate-200 truncate max-w-[150px]">
            {displayTitle}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 shrink-0">
            {lineCount} {t.wsLinesLabel}
          </span>
          {activeLocalFile && (
            <span className="text-[10px] text-emerald-400/90 shrink-0 hidden sm:inline">
              · {t.wsAutoSaved}
            </span>
          )}
          {!selectedSourceValue && !isDirty && draft.trim() && (
            <span className="text-[10px] text-emerald-400/80 shrink-0 hidden md:inline">
              · {t.wsLiveAutoPreviewHint}
            </span>
          )}
          {isDirty && (
            <span className="text-[10px] text-amber-400 font-semibold shrink-0">
              ● {t.wsUnsavedEdits}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Code | Diff Segmented Switch */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'code'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.wsCodeMode}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('diff')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'diff'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitCompare className="w-3 h-3" />
              <span>{t.wsDiffMode}</span>
              {hasDiffBaseline && diffSummary.hasChanges && (
                <span className="text-[10px] font-mono tabular-nums text-emerald-400">
                  +{diffSummary.additions}/-{diffSummary.deletions}
                </span>
              )}
            </button>
          </div>

          {/* Language Selector */}
          <select
            value={activeLang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            aria-label={t.wsCodeLanguageLabel}
            title={t.wsCodeLanguageLabel}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-cyan-300 font-semibold uppercase outline-none focus:border-cyan-500 cursor-pointer"
          >
            {!CODE_LANGUAGE_OPTIONS.includes(
              activeLang as (typeof CODE_LANGUAGE_OPTIONS)[number]
            ) && <option value={activeLang}>{activeLang.toUpperCase()}</option>}
            {CODE_LANGUAGE_OPTIONS.map((langOpt) => (
              <option key={langOpt} value={langOpt}>
                {langOpt.toUpperCase()}
              </option>
            ))}
          </select>

          {/* New Virtual File */}
          <button
            type="button"
            onClick={() => {
              setFileNameInput('');
              setPromptMode((m) => (m === 'create' ? 'none' : 'create'));
            }}
            title={t.wsNewFile}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            <FilePlus2 className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">{t.wsNewFile}</span>
          </button>

          {/* Save Current Code as Local Scratchpad */}
          <button
            type="button"
            onClick={() => {
              const fallbackName =
                activeVprojFile?.path.split('/').pop() ||
                activeLocalFile?.name ||
                `scratch-${localFiles.length + 1}.${LANG_EXTENSION_MAP[activeLang] || 'txt'}`;
              setFileNameInput(fallbackName);
              setPromptMode((m) => (m === 'saveAs' ? 'none' : 'saveAs'));
            }}
            disabled={!draft.trim()}
            title={t.wsSaveLocalFile}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-300 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <BookmarkPlus className="w-3 h-3 text-cyan-400" />
            <span className="hidden lg:inline">{t.wsSaveLocalFile}</span>
          </button>

          {/* Delete Active File */}
          {(activeVprojFile || activeLocalFile) && (
            <button
              type="button"
              onClick={() =>
                activeVprojFile
                  ? deleteProjectFile(activeVprojFile.path)
                  : handleDeleteLocalFile(activeLocalFile?.id)
              }
              title={t.wsDeleteFile}
              className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {isDirty && (
            <button
              type="button"
              onClick={handleRevert}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/30 text-[11px] text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.wsRevertBtn}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            title={t.copyBtn}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-800 hover:border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={() => setIsGitModalOpen(true)}
            disabled={!draft.trim() && projectFiles.length === 0}
            title={t.wsExportGit}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-300 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <GitBranch className="w-3 h-3 text-cyan-400" />
            <span className="hidden lg:inline">{t.wsExportGit}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadFile}
            title={projectFiles.length > 1 ? t.wsDownloadProjectZip : t.wsDownloadFile}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-800 hover:border-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            {projectFiles.length > 1 && <span className="hidden xl:inline">.zip</span>}
          </button>

          {canPreviewLang && (
            <button
              type="button"
              onClick={handleApplyAndPreview}
              title={t.wsApplyPreview}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-semibold text-[11px] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-3 h-3" />
              <span>{t.wsJumpToPreview}</span>
            </button>
          )}
        </div>
      </div>

      {/* File Tabs Strip (Generated Project files + Preview Buffer + Scratchpad files) */}
      <div className="px-2.5 py-1.5 border-b border-slate-800/70 bg-[#080c15] flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px]">
        {projectFiles.map((pf) => {
          const isActive = selectedSourceValue === `vproj::${pf.path}`;
          return (
            <div
              key={pf.path}
              className={`group inline-flex items-center gap-1.5 px-2 py-1 rounded-md border shrink-0 transition-colors ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 font-semibold'
                  : 'bg-slate-900/70 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => selectGeneratedFile(pf.path)}
                title={`${pf.path} (${pf.lang.toUpperCase()})`}
                className="inline-flex items-center gap-1 cursor-pointer"
              >
                <FileCode2 className="w-3 h-3 text-cyan-400" />
                <span className="max-w-[150px] truncate">{pf.path}</span>
              </button>
              {projectFiles.length > 1 && (
                <button
                  type="button"
                  onClick={() => deleteProjectFile(pf.path)}
                  title={t.wsDeleteFile}
                  className="opacity-60 hover:opacity-100 text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {projectFiles.length === 0 && (
          <button
            type="button"
            onClick={selectPreviewBuffer}
            className={`px-2 py-1 rounded-md transition-colors shrink-0 cursor-pointer ${
              selectedSourceValue === ''
                ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {t.wsPreviewBuffer}
          </button>
        )}

        {localFiles.map((lf) => {
          const isActive = selectedSourceValue === `local::${lf.id}`;
          return (
            <div
              key={lf.id}
              className={`group inline-flex items-center gap-1.5 px-2 py-1 rounded-md border shrink-0 transition-colors ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 font-semibold'
                  : 'bg-slate-900/70 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => selectLocalFile(lf)}
                onDoubleClick={() => {
                  selectLocalFile(lf);
                  setFileNameInput(lf.name);
                  setPromptMode('rename');
                }}
                title={`${lf.name} (${lf.lang.toUpperCase()})`}
                className="inline-flex items-center gap-1 cursor-pointer"
              >
                <FileCode2 className="w-3 h-3 text-cyan-400/80" />
                <span className="max-w-[130px] truncate">{lf.name}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteLocalFile(lf.id)}
                title={t.wsDeleteFile}
                aria-label={`${t.wsDeleteFile}: ${lf.name}`}
                className="opacity-60 hover:opacity-100 text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setFileNameInput('');
            setPromptMode('create');
          }}
          title={t.wsNewFile}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors shrink-0 cursor-pointer"
        >
          <FilePlus2 className="w-3 h-3" />
          <span>+</span>
        </button>
      </div>

      {/* Inline Create / Rename / Save As Bar */}
      {promptMode !== 'none' && (
        <form
          onSubmit={handleSubmitFilePrompt}
          className="px-3 py-1.5 border-b border-slate-800/80 bg-[#0d1422] flex items-center gap-2 text-[11px]"
        >
          <input
            type="text"
            value={fileNameInput}
            onChange={(e) => setFileNameInput(e.target.value)}
            placeholder={
              promptMode === 'rename' ? t.wsRenameFilePlaceholder : t.wsCreateFilePlaceholder
            }
            autoFocus
            className="flex-1 max-w-xs bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold cursor-pointer"
          >
            {promptMode === 'create'
              ? t.wsCreateBtn
              : promptMode === 'rename'
                ? t.wsRenameFile
                : t.wsBrowserSaveBookmark}
          </button>
          <button
            type="button"
            onClick={() => setPromptMode('none')}
            className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
            aria-label={t.cancelBtn}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Main Workspace Area: Collapsible AI Studio File Explorer + Editor/Diff */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {showExplorer && (
          <aside className="w-52 sm:w-56 shrink-0 border-r border-slate-800/80 bg-[#080c15] flex flex-col overflow-hidden">
            <div className="px-2.5 py-2 border-b border-slate-800/70 flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-sans font-semibold text-slate-300 truncate">
                {t.wsCodeExplorer}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFileNameInput('');
                  setPromptMode('create');
                }}
                title={t.wsNewFile}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 cursor-pointer"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-2 border-b border-slate-800/60">
              <label className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px]">
                <Search className="w-3 h-3 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={explorerQuery}
                  onChange={(e) => setExplorerQuery(e.target.value)}
                  placeholder={t.wsCodeFilterFiles}
                  className="w-full bg-transparent text-[11px] text-slate-200 placeholder-slate-500 outline-none"
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-3 text-[11px]">
              {/* Generated Multi-File Project Group */}
              {filteredGeneratedFiles.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-400 flex items-center justify-between gap-1">
                    <span className="truncate">{t.wsGeneratedProjectGroup}</span>
                    <span className="tabular-nums text-slate-400">
                      {filteredGeneratedFiles.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {filteredGeneratedFiles.map((pf) => {
                      const active = selectedSourceValue === `vproj::${pf.path}`;
                      return (
                        <button
                          key={pf.path}
                          type="button"
                          onClick={() => selectGeneratedFile(pf.path)}
                          title={pf.path}
                          className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                              : 'text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <FileCode2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{pf.path}</span>
                          </span>
                          <span className="text-[9px] uppercase text-slate-500 shrink-0">
                            {pf.lang}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Session Buffer (only when no multi-file generated project is active) */}
              {projectFiles.length === 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t.wsCodeActiveBuffer}
                  </div>
                  <button
                    type="button"
                    onClick={selectPreviewBuffer}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      selectedSourceValue === ''
                        ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <FileCode2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{t.wsPreviewBuffer}</span>
                  </button>
                </div>
              )}

              {/* Local Scratchpad Files */}
              {filteredLocalFiles.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t.wsLocalFilesGroup}
                  </div>
                  <div className="space-y-0.5">
                    {filteredLocalFiles.map((lf) => {
                      const active = selectedSourceValue === `local::${lf.id}`;
                      return (
                        <button
                          key={lf.id}
                          type="button"
                          onClick={() => selectLocalFile(lf)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                              : 'text-slate-300 hover:bg-slate-900'
                          }`}
                        >
                          <FileCode2 className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
                          <span className="truncate">{lf.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Project Source Files */}
              {filteredProjectFiles.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t.wsProjectFilesGroup}
                  </div>
                  <div className="space-y-0.5">
                    {filteredProjectFiles.map((fp) => {
                      const val = `project::${fp}`;
                      const active = selectedSourceValue === val;
                      return (
                        <button
                          key={fp}
                          type="button"
                          onClick={() => handleSourceChange(val)}
                          title={fp}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{fp}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {viewMode === 'diff' ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#060910]">
              {/* Diff Action Header */}
              <div className="px-3 py-2 border-b border-slate-800/80 bg-[#0b101b] flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span className="text-emerald-400 font-semibold">
                    +{hasDiffBaseline ? diffSummary.additions : 0}
                  </span>
                  <span className="text-rose-400 font-semibold">
                    -{hasDiffBaseline ? diffSummary.deletions : 0}
                  </span>
                </div>
                {hasDiffBaseline && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        revertPreviewDiff();
                        setViewMode('code');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-sans font-semibold text-[11px] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t.wsDiffRevertPrev}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        acceptPreviewDiff();
                        setViewMode('code');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-semibold text-[11px] cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>{t.wsDiffAccept}</span>
                    </button>
                  </div>
                )}
              </div>

              {!hasDiffBaseline ? (
                <div className="flex-1 flex items-center justify-center p-6 text-xs text-slate-500 font-sans">
                  {t.wsDiffEmpty}
                </div>
              ) : (
                <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed">
                  {diffLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex items-stretch px-3 ${
                        line.kind === 'add'
                          ? 'bg-emerald-500/12 text-emerald-200'
                          : line.kind === 'remove'
                            ? 'bg-rose-500/12 text-rose-200'
                            : 'text-slate-400'
                      }`}
                    >
                      <span className="w-10 shrink-0 text-right pr-2 select-none text-slate-600 tabular-nums">
                        {line.oldLine ?? ''}
                      </span>
                      <span className="w-10 shrink-0 text-right pr-2 select-none text-slate-600 tabular-nums">
                        {line.newLine ?? ''}
                      </span>
                      <span className="w-5 shrink-0 select-none text-center font-bold">
                        {line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '}
                      </span>
                      <span className="whitespace-pre">{line.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Synchronized Line Gutter + Code Editor Textarea */
            <div className="flex-1 flex overflow-hidden relative">
              <div
                ref={gutterRef}
                aria-hidden="true"
                className="w-12 py-3 bg-[#080c15] border-r border-slate-800/60 text-right pr-2.5 text-xs text-slate-600 select-none overflow-hidden leading-relaxed shrink-0"
              >
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                onScroll={handleEditorScroll}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                wrap="off"
                className="flex-1 p-3 bg-transparent text-xs leading-relaxed text-cyan-100 focus:outline-none resize-none overflow-auto whitespace-pre"
                placeholder={t.wsCodePlaceholder}
              />
            </div>
          )}
        </div>
      </div>

      <GitExportModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        code={draft}
        lang={activeLang}
        fileName={activeVprojFile?.path || activeLocalFile?.name}
        projectFiles={projectFiles.length > 0 ? projectFiles : undefined}
        projectTitle={projectTitle || undefined}
      />
    </div>
  );
};
