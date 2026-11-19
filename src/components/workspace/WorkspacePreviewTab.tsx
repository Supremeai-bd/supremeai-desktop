import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Monitor,
  Smartphone,
  RotateCw,
  Sun,
  Moon,
  Copy,
  Check,
  Download,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Code2,
  MessageSquarePlus,
  Sparkles,
  ArrowRight,
  X,
  Crosshair,
  ShieldCheck,
  Share2,
  GitBranch,
  Wand2,
  Terminal,
  MoreHorizontal,
  Play,
  Loader2,
  Globe,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useChatStore } from '../../stores/useChatStore';
import { toast } from '../../stores/useToastStore';
import { useI18n } from '../../utils/i18n';
import { classifyCodeLanguage, isShellCommandLanguage } from '../../utils/artifactStreamParser';
import { transformCodeForBrowserPreview } from '../../utils/previewCodeTransform';
import { publishPreviewArtifact } from '../../utils/previewShare';
import { EXTERNAL_URLS } from '../../config/externalUrls';
import { resolveProjectRenderPlan } from '../../utils/projectBundler';
import { downloadProjectZip } from '../../utils/projectZipExport';
import { GitExportModal } from './GitExportModal';
import { MobileDeviceFrame } from './MobileDeviceFrame';

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeScriptClose(code: string): string {
  return code.replace(/<\/script>/gi, '<\\/script>');
}

const PREVIEW_ERROR_BRIDGE_SCRIPT = `<script>
(function(){
  var __hasError = false;
  var __inspectorEnabled = false;
  var __highlightBox = null;

  function reportPreviewError(msg) {
    __hasError = true;
    try {
      window.parent.postMessage({ channel: 'supremeai-preview', type: 'error', message: String(msg || 'Runtime error') }, '*');
    } catch (_) { /* cross-origin frame may be torn down; nothing actionable */ }
  }

  window.__supremeAiReportVerified = function() {
    if (__hasError) return;
    try {
      window.parent.postMessage({ channel: 'supremeai-preview', type: 'verified' }, '*');
    } catch (_) { /* cross-origin frame may be torn down; nothing actionable */ }
  };

  window.addEventListener('error', function(ev) {
    reportPreviewError(ev && (ev.message || (ev.error && ev.error.message)) || 'Uncaught script error');
  });
  window.addEventListener('unhandledrejection', function(ev) {
    var reason = ev && ev.reason;
    reportPreviewError(reason && reason.message ? reason.message : String(reason || 'Unhandled promise rejection'));
  });

  function ensureHighlightBox() {
    if (__highlightBox && __highlightBox.parentNode) return __highlightBox;
    var box = document.createElement('div');
    box.id = '__supremeai_inspector_box__';
    box.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #06b6d4;background:rgba(6,182,212,0.14);border-radius:4px;display:none;transition:all 60ms ease-out;box-shadow:0 0 0 1px rgba(8,145,178,0.45);';
    if (document.body) {
      document.body.appendChild(box);
      __highlightBox = box;
    }
    return __highlightBox;
  }

  function hideHighlight() {
    if (__highlightBox) __highlightBox.style.display = 'none';
  }

  window.addEventListener('message', function(ev) {
    var data = ev && ev.data;
    if (!data || data.channel !== 'supremeai-preview-host') return;
    if (data.type === 'set-inspector') {
      __inspectorEnabled = Boolean(data.enabled);
      if (document.documentElement) {
        document.documentElement.style.cursor = __inspectorEnabled ? 'crosshair' : '';
      }
      if (!__inspectorEnabled) hideHighlight();
    }
  });

  document.addEventListener('mousemove', function(ev) {
    if (!__inspectorEnabled) return;
    var target = ev.target;
    if (!target || target === document.documentElement || target === document.body || target === __highlightBox) {
      hideHighlight();
      return;
    }
    var box = ensureHighlightBox();
    if (!box) return;
    var rect = target.getBoundingClientRect();
    box.style.display = 'block';
    box.style.left = rect.left + 'px';
    box.style.top = rect.top + 'px';
    box.style.width = rect.width + 'px';
    box.style.height = rect.height + 'px';
  }, true);

  document.addEventListener('click', function(ev) {
    if (!__inspectorEnabled) return;
    var target = ev.target;
    if (!target || target === __highlightBox) return;
    ev.preventDefault();
    ev.stopPropagation();
    var tag = (target.tagName || 'div').toLowerCase();
    var id = target.id ? '#' + target.id : '';
    var rawCls = typeof target.className === 'string' ? target.className.trim().split(/\\s+/).slice(0, 4).join('.') : '';
    var cls = rawCls ? '.' + rawCls : '';
    var txt = (target.innerText || target.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 80);
    hideHighlight();
    try {
      window.parent.postMessage({
        channel: 'supremeai-preview',
        type: 'element-selected',
        tag: tag,
        id: id,
        className: cls,
        text: txt
      }, '*');
    } catch (_) { /* cross-origin frame may be torn down; nothing actionable */ }
  }, true);
})();
</script>`;

export function buildSandboxSrcDoc(code: string, lang: string, darkMode: boolean): string {
  const trimmed = code.trim();
  const normalizedLang = (lang || 'html').toLowerCase();
  const themeClass = darkMode ? 'dark bg-[#080b11] text-slate-100' : 'bg-slate-50 text-slate-900';

  const autoVerifyLoadScript = `<script>
window.addEventListener('load', function() {
  setTimeout(function() {
    if (window.__supremeAiReportVerified) window.__supremeAiReportVerified();
  }, 150);
});
</script>`;

  // Full HTML document — inject lightweight error/inspector/verified bridge cleanly
  if (/^<!doctype\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    const bridge = `${PREVIEW_ERROR_BRIDGE_SCRIPT}${autoVerifyLoadScript}`;
    if (/<head[\s>]/i.test(trimmed)) {
      return trimmed.replace(/<head([\s>])/i, `<head$1${bridge}`);
    }
    if (/<\/body>/i.test(trimmed)) {
      return trimmed.replace(/<\/body>/i, `${bridge}</body>`);
    }
    return `${bridge}${trimmed}`;
  }

  // Mermaid Diagram
  if (normalizedLang === 'mermaid') {
    const escaped = trimmed.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  ${PREVIEW_ERROR_BRIDGE_SCRIPT}
  <script src="${EXTERNAL_URLS.mermaidUmdCdn}"></script>
  <style>
    body { margin: 0; padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: system-ui, sans-serif; background: ${
      darkMode ? '#080b11' : '#f8fafc'
    }; color: ${darkMode ? '#f1f5f9' : '#0f172a'}; }
  </style>
</head>
<body>
  <div class="mermaid">${escaped}</div>
  <script>
    if (typeof mermaid !== 'undefined') {
      try {
        mermaid.initialize({ startOnLoad: true, theme: '${darkMode ? 'dark' : 'default'}' });
        setTimeout(function() { if (window.__supremeAiReportVerified) window.__supremeAiReportVerified(); }, 180);
      } catch (e) {
        window.parent.postMessage({ channel: 'supremeai-preview', type: 'error', message: e && e.message ? e.message : String(e) }, '*');
      }
    }
  </script>
</body>
</html>`;
  }

  // React / JSX / TSX live runner (with esm.sh NPM bridge for external packages)
  const looksLikeJsx =
    normalizedLang === 'tsx' ||
    normalizedLang === 'jsx' ||
    normalizedLang === 'react' ||
    (/export\s+default\s+function|function\s+[A-Z]|const\s+[A-Z]\w*\s*=/.test(trimmed) &&
      /return\s*\(?\s*</.test(trimmed));

  if (looksLikeJsx) {
    const { transformedCode, usesEsmImports, importMapJson, reactBindings } =
      transformCodeForBrowserPreview(trimmed);
    const safeTransformed = escapeScriptClose(transformedCode);
    const hookDestructure = reactBindings.join(', ');

    if (usesEsmImports) {
      // Unified esm.sh ESM bootstrap sharing exact React 18 instance via importmap
      return `<!DOCTYPE html>
<html class="${darkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${PREVIEW_ERROR_BRIDGE_SCRIPT}
  <script type="importmap">${importMapJson}</script>
  <script src="${EXTERNAL_URLS.tailwindCdn}"></script>
  <script src="${EXTERNAL_URLS.babelStandaloneCdn}"></script>
  <script>if (typeof tailwind !== 'undefined') { tailwind.config = { darkMode: 'class' }; }</script>
</head>
<body class="${themeClass} min-h-screen p-6 antialiased">
  <div id="root"><div class="text-xs font-mono text-cyan-400/80 animate-pulse">Loading ESM modules...</div></div>
  <div id="error-box" style="display:none;color:#fb7185;background:#1e1b2e;border:1px solid #f43f5e55;padding:14px;border-radius:12px;font-family:monospace;font-size:12px;white-space:pre-wrap;"></div>
  <script type="text/plain" id="__supreme_user_tsx__">
window.__mountSupremeApp__ = async function(React, createRoot) {
  const { ${hookDestructure} } = React;
  ${safeTransformed}

  const RootComponent = typeof __DefaultExport__ !== 'undefined'
    ? __DefaultExport__
    : (typeof App !== 'undefined' ? App : null);

  if (RootComponent) {
    createRoot(document.getElementById('root')).render(<RootComponent />);
    if (window.__supremeAiReportVerified) window.__supremeAiReportVerified();
  } else {
    document.getElementById('root').innerHTML = '<div class="text-xs font-mono text-cyan-400 p-4 border border-cyan-500/30 rounded-xl">Component compiled cleanly. Export a default React component to mount it visually.</div>';
    if (window.__supremeAiReportVerified) window.__supremeAiReportVerified();
  }
};
  </script>
  <script type="module">
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    window.React = React;
    try {
      const raw = document.getElementById('__supreme_user_tsx__').textContent || '';
      const compiled = Babel.transform(raw, { presets: ['react', 'typescript'] }).code;
      (0, eval)(compiled);
      await window.__mountSupremeApp__(React, createRoot);
    } catch (err) {
      const box = document.getElementById('error-box');
      if (box) {
        box.style.display = 'block';
        box.textContent = 'Preview Runtime Error:\\n' + (err && err.message ? err.message : String(err));
      }
      try { window.parent.postMessage({ channel: 'supremeai-preview', type: 'error', message: err && err.message ? err.message : String(err) }, '*'); } catch (_) { /* cross-origin frame may be torn down; nothing actionable */ }
    }
  </script>
</body>
</html>`;
    }

    // Zero-import fast synchronous UMD path
    return `<!DOCTYPE html>
<html class="${darkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${PREVIEW_ERROR_BRIDGE_SCRIPT}
  <script src="${EXTERNAL_URLS.tailwindCdn}"></script>
  <script crossorigin src="${EXTERNAL_URLS.umdReact18}"></script>
  <script crossorigin src="${EXTERNAL_URLS.umdReactDom18}"></script>
  <script src="${EXTERNAL_URLS.babelStandaloneCdn}"></script>
  <script>if (typeof tailwind !== 'undefined') { tailwind.config = { darkMode: 'class' }; }</script>
</head>
<body class="${themeClass} min-h-screen p-6 antialiased">
  <div id="root"></div>
  <div id="error-box" style="display:none;color:#fb7185;background:#1e1b2e;border:1px solid #f43f5e55;padding:14px;border-radius:12px;font-family:monospace;font-size:12px;white-space:pre-wrap;"></div>
  <script type="text/babel" data-presets="react,typescript">
    const { ${hookDestructure} } = React;
    try {
      ${safeTransformed}

      const RootComponent = typeof __DefaultExport__ !== 'undefined'
        ? __DefaultExport__
        : (typeof App !== 'undefined' ? App : null);

      if (RootComponent) {
        ReactDOM.createRoot(document.getElementById('root')).render(<RootComponent />);
        if (window.__supremeAiReportVerified) window.__supremeAiReportVerified();
      } else {
        document.getElementById('root').innerHTML = '<div class="text-xs font-mono text-cyan-400 p-4 border border-cyan-500/30 rounded-xl">Component compiled cleanly. Export a default React component to mount it visually.</div>';
        if (window.__supremeAiReportVerified) window.__supremeAiReportVerified();
      }
    } catch (err) {
      const box = document.getElementById('error-box');
      box.style.display = 'block';
      const msg = err && err.message ? err.message : String(err);
      box.textContent = 'Preview Runtime Error:\\n' + msg;
      try { window.parent.postMessage({ channel: 'supremeai-preview', type: 'error', message: msg }, '*'); } catch (_) { /* cross-origin frame may be torn down; nothing actionable */ }
    }
  </script>
</body>
</html>`;
  }

  const codeCategory = classifyCodeLanguage(normalizedLang);

  // Plain HTML / SVG snippet wrapped with Tailwind CDN
  if (
    normalizedLang === 'html' ||
    normalizedLang === 'htm' ||
    normalizedLang === 'svg' ||
    (trimmed.startsWith('<') && codeCategory !== 'non-browser')
  ) {
    return `<!DOCTYPE html>
<html class="${darkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${PREVIEW_ERROR_BRIDGE_SCRIPT}
  ${autoVerifyLoadScript}
  <script src="${EXTERNAL_URLS.tailwindCdn}"></script>
  <script>if (typeof tailwind !== 'undefined') { tailwind.config = { darkMode: 'class' }; }</script>
</head>
<body class="${themeClass} min-h-screen p-6 antialiased">
  ${trimmed}
</body>
</html>`;
  }

  // JSON safe inspector view (never executed as raw JavaScript statement)
  if (normalizedLang === 'json') {
    let formattedJson = trimmed;
    let jsonMeta = '';
    let jsonInvalidMsg = '';
    try {
      const parsed = JSON.parse(trimmed);
      formattedJson = JSON.stringify(parsed, null, 2);
      if (Array.isArray(parsed)) {
        jsonMeta = `Valid JSON · ${parsed.length} items`;
      } else if (parsed && typeof parsed === 'object') {
        jsonMeta = `Valid JSON · ${Object.keys(parsed).length} keys`;
      } else {
        jsonMeta = `Valid JSON (${typeof parsed})`;
      }
    } catch (err) {
      jsonInvalidMsg = err instanceof Error ? err.message : 'Invalid JSON format';
    }

    return `<!DOCTYPE html>
<html class="${darkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  ${PREVIEW_ERROR_BRIDGE_SCRIPT}
  ${!jsonInvalidMsg ? autoVerifyLoadScript : ''}
  <style>
    body { margin: 0; padding: 20px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: ${
      darkMode ? '#080b11' : '#f8fafc'
    }; color: ${darkMode ? '#e2e8f0' : '#0f172a'}; }
    .card { border: 1px solid ${darkMode ? '#1e293b' : '#cbd5e1'}; border-radius: 12px; overflow: hidden; background: ${
      darkMode ? '#0b101b' : '#ffffff'
    }; }
    .hdr { padding: 10px 14px; border-bottom: 1px solid ${darkMode ? '#1e293b' : '#e2e8f0'}; display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
    .ok { color: #10b981; font-weight: 600; }
    .warn { color: #f59e0b; font-weight: 600; }
    pre { margin: 0; padding: 14px; overflow: auto; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hdr">
      <span>JSON INSPECTOR</span>
      <span class="${jsonInvalidMsg ? 'warn' : 'ok'}">${escapeHtmlText(jsonInvalidMsg || jsonMeta)}</span>
    </div>
    <pre>${escapeHtmlText(formattedJson)}</pre>
  </div>
</body>
</html>`;
  }

  // CSS live sample preview (safe stylesheet preview without script eval)
  if (normalizedLang === 'css' || normalizedLang === 'scss') {
    const safeCss = trimmed.replace(/<\/style>/gi, '<\\/style>');
    return `<!DOCTYPE html>
<html class="${darkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  ${PREVIEW_ERROR_BRIDGE_SCRIPT}
  ${autoVerifyLoadScript}
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; background: ${
      darkMode ? '#080b11' : '#f8fafc'
    }; color: ${darkMode ? '#e2e8f0' : '#0f172a'}; }
    .meta { font-family: ui-monospace, monospace; font-size: 11px; color: #06b6d4; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    .code { font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.55; padding: 14px; border-radius: 12px; border: 1px solid ${
      darkMode ? '#1e293b' : '#cbd5e1'
    }; background: ${darkMode ? '#0b101b' : '#ffffff'}; white-space: pre-wrap; overflow: auto; }
  </style>
  <style>${safeCss}</style>
</head>
<body>
  <div class="meta">CSS Stylesheet Preview</div>
  <pre class="code">${escapeHtmlText(trimmed)}</pre>
</body>
</html>`;
  }

  // Markdown clean document preview (never executed as JS)
  if (normalizedLang === 'markdown' || normalizedLang === 'md') {
    return `<!DOCTYPE html>
<html class="${darkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  ${PREVIEW_ERROR_BRIDGE_SCRIPT}
  ${autoVerifyLoadScript}
  <style>
    body { margin: 0; padding: 24px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.65; background: ${
      darkMode ? '#080b11' : '#f8fafc'
    }; color: ${darkMode ? '#e2e8f0' : '#0f172a'}; }
    .doc { max-width: 760px; margin: 0 auto; padding: 20px; border-radius: 12px; border: 1px solid ${
      darkMode ? '#1e293b' : '#cbd5e1'
    }; background: ${darkMode ? '#0b101b' : '#ffffff'}; white-space: pre-wrap; font-size: 13px; }
  </style>
</head>
<body>
  <div class="doc">${escapeHtmlText(trimmed)}</div>
</body>
</html>`;
  }

  // Non-browser languages (bash, java, python, go, cpp, rust, sql, yaml, etc.):
  // NEVER execute inside a JS <script> tag — render clean safe source card instead.
  if (codeCategory === 'non-browser') {
    const langDisplay = escapeHtmlText((normalizedLang || 'code').toUpperCase());
    return `<!DOCTYPE html>
<html class="${darkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  ${PREVIEW_ERROR_BRIDGE_SCRIPT}
  ${autoVerifyLoadScript}
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; background: ${
      darkMode ? '#080b11' : '#f8fafc'
    }; color: ${darkMode ? '#e2e8f0' : '#0f172a'}; }
    .card { border-radius: 12px; border: 1px solid ${darkMode ? '#1e293b' : '#cbd5e1'}; background: ${
      darkMode ? '#0b101b' : '#ffffff'
    }; overflow: hidden; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid ${
      darkMode ? '#1e293b' : '#e2e8f0'
    }; background: ${darkMode ? '#0f172a' : '#f1f5f9'}; font-family: ui-monospace, monospace; font-size: 11px; }
    .lang { color: #06b6d4; font-weight: 700; letter-spacing: 0.05em; }
    .badge { color: ${darkMode ? '#94a3b8' : '#475569'}; font-size: 11px; }
    pre { margin: 0; padding: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.6; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <div class="card">
    <div class="bar">
      <span class="lang">${langDisplay}</span>
      <span class="badge">CLI / Server Runtime · Safe Source View</span>
    </div>
    <pre><code>${escapeHtmlText(trimmed)}</code></pre>
  </div>
</body>
</html>`;
  }

  // Executable JavaScript / TypeScript console + DOM sandbox runner
  const isTypeScript =
    normalizedLang === 'typescript' || normalizedLang === 'ts' || normalizedLang === 'mts';

  const cleanedScript = escapeScriptClose(
    trimmed
      .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+(const|let|var|function|class|type|interface)\s+/g, '$1 ')
  );

  return `<!DOCTYPE html>
<html class="${darkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  ${PREVIEW_ERROR_BRIDGE_SCRIPT}
  <script src="${EXTERNAL_URLS.tailwindCdn}"></script>
  ${isTypeScript ? `<script src="${EXTERNAL_URLS.babelStandaloneCdn}"></script>` : ''}
</head>
<body class="${themeClass} min-h-screen p-6 font-mono text-xs antialiased space-y-4">
  <div id="app"></div>
  <div class="rounded-xl border border-cyan-500/30 bg-slate-900/90 text-slate-100 p-4">
    <div class="text-cyan-400 font-semibold mb-2 uppercase tracking-wider text-[11px]">${
      isTypeScript ? 'TS' : 'JS'
    } Console Output</div>
    <pre id="console-out" class="whitespace-pre-wrap text-emerald-300 leading-relaxed"></pre>
  </div>
  <script>
    (function() {
      const out = document.getElementById('console-out');
      const formatArg = (a) => {
        if (a instanceof Error) return a.name + ': ' + a.message;
        if (typeof a === 'object' && a !== null) {
          try { return JSON.stringify(a, null, 2); } catch (_) { return String(a); }
        }
        return String(a);
      };
      ['log', 'info', 'warn', 'error'].forEach((level) => {
        const orig = console[level];
        console[level] = (...args) => {
          const prefix = level === 'warn' ? '[WARN] ' : level === 'error' ? '[ERROR] ' : '';
          out.textContent += prefix + args.map(formatArg).join(' ') + '\\n';
          if (typeof orig === 'function') orig.apply(console, args);
        };
      });
      console.table = (data) => {
        out.textContent += formatArg(data) + '\\n';
      };

      try {
        const rawSource = ${JSON.stringify(cleanedScript)};
        ${
          isTypeScript
            ? `if (typeof Babel === 'undefined') { throw new Error('TypeScript transpiler unavailable.'); }
               const compiled = Babel.transform(rawSource, { presets: ['typescript'] }).code;
               (0, eval)(compiled);`
            : `(0, eval)(rawSource);`
        }
        if (!out.textContent) out.textContent = '✓ Script evaluated with 0 errors.';
        if (window.__supremeAiReportVerified) window.__supremeAiReportVerified();
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        out.className = 'whitespace-pre-wrap text-rose-400';
        out.textContent = 'Error: ' + msg;
        try { window.parent.postMessage({ channel: 'supremeai-preview', type: 'error', message: msg }, '*'); } catch (_) { /* cross-origin frame may be torn down; nothing actionable */ }
      }
    })();
  </script>
</body>
</html>`;
}

export const WorkspacePreviewTab: React.FC = () => {
  const {
    previewCode,
    previewLang,
    previewTitle,
    viewportDevice,
    mobileOrientation,
    previewDarkMode,
    previewRefreshKey,
    isArtifactStreaming,
    projectTitle,
    projectRuntime,
    projectEntryFile,
    projectFiles,
    projectServerRunResult,
    isRunningServerProject,
    setViewportDevice,
    toggleMobileOrientation,
    togglePreviewDarkMode,
    reloadPreview,
    clearPreviewCode,
    runCurrentServerProject,
    setActiveDockTab,
    setDockOpen,
  } = useWorkspaceStore();

  const isStreamingChat = useChatStore((s) => s.isStreaming);
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [inspectorActive, setInspectorActive] = useState(false);
  const [shareUrlBanner, setShareUrlBanner] = useState<string | null>(null);
  const [shareUrlCopied, setShareUrlCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isAutoHealing, setIsAutoHealing] = useState(false);
  const [autoHealExhausted, setAutoHealExhausted] = useState(false);
  const [phpRoute, setPhpRoute] = useState('/');
  const [phpMethod, setPhpMethod] = useState<'GET' | 'POST'>('GET');
  const [phpFormData, setPhpFormData] = useState<Record<string, string> | undefined>(undefined);
  const [phpRouteHistory, setPhpRouteHistory] = useState<string[]>(['/']);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const autoHealAttemptsRef = useRef<Record<string, number>>({});
  const autoHealPendingSigRef = useRef<string | null>(null);

  const hasProject = projectFiles.length > 0;
  const hasContent = hasProject || previewCode.trim().length > 0;
  const codeCategory = classifyCodeLanguage(previewLang);
  const isNonBrowserCode = !hasProject && codeCategory === 'non-browser';
  const isInteractiveProject =
    hasProject &&
    (projectRuntime === 'php' ||
      projectRuntime === 'web' ||
      projectRuntime === 'react' ||
      projectRuntime === 'python' ||
      projectRuntime === 'node');
  const showViewportControls = !isNonBrowserCode || isInteractiveProject;
  const isShellCode = isShellCommandLanguage(previewLang);
  const artifactSignature = hasProject
    ? `${projectRuntime}:${projectEntryFile}:${projectFiles.map((f) => `${f.path}:${f.content.length}`).join('|')}`
    : `${previewLang}:${previewCode.length}:${previewCode.slice(0, 80)}`;

  useEffect(() => {
    setPhpRoute('/');
    setPhpMethod('GET');
    setPhpFormData(undefined);
    setPhpRouteHistory(['/']);
  }, [projectEntryFile, projectRuntime]);

  useEffect(() => {
    setRuntimeError(null);
    setIsVerified(false);
    setAutoHealExhausted(false);
    autoHealPendingSigRef.current = null;
  }, [previewCode, previewLang, previewRefreshKey, previewDarkMode, projectFiles, phpRoute]);

  useEffect(() => {
    if (!isMoreOpen) return;
    const handleOutside = (ev: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(ev.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    const handleEsc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setIsMoreOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isMoreOpen]);

  useEffect(() => {
    if (!hasContent) {
      setInspectorActive(false);
      setShareUrlBanner(null);
      setIsMoreOpen(false);
      setIsAutoHealing(false);
      setAutoHealExhausted(false);
    }
  }, [hasContent]);

  // Sync inspector toggle state cleanly into the sandboxed iframe
  useEffect(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { channel: 'supremeai-preview-host', type: 'set-inspector', enabled: inspectorActive },
        '*'
      );
    } catch {
      // Ignore cross-frame initialization race
    }
  }, [inspectorActive, previewRefreshKey]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      const payload = event.data as {
        channel?: string;
        type?: string;
        message?: string;
        tag?: string;
        id?: string;
        className?: string;
        text?: string;
        route?: string;
        method?: string;
        formData?: Record<string, string>;
      } | null;
      if (!payload || payload.channel !== 'supremeai-preview') return;

      if (payload.type === 'error') {
        setIsVerified(false);
        setRuntimeError(payload.message || 'Runtime execution error');
      } else if (payload.type === 'verified') {
        setRuntimeError(null);
        setIsVerified(true);
        setIsAutoHealing(false);
        setAutoHealExhausted(false);
        autoHealPendingSigRef.current = null;
      } else if (payload.type === 'php-navigate') {
        const nextRoute = payload.route || '/';
        setPhpRoute(nextRoute);
        setPhpMethod(payload.method === 'POST' ? 'POST' : 'GET');
        setPhpFormData(payload.formData);
        setPhpRouteHistory((prev) =>
          prev[prev.length - 1] === nextRoute ? prev : [...prev.slice(-14), nextRoute]
        );
      } else if (payload.type === 'element-selected') {
        setInspectorActive(false);
        const selector = `<${payload.tag || 'div'}${payload.id || ''}${payload.className || ''}>`;
        const textHint = payload.text ? ` ("${payload.text}")` : '';
        const promptSnippet = `Update ${selector}${textHint}: `;
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setDockOpen(false);
        }
        window.dispatchEvent(
          new CustomEvent('supremeai-insert-chat-prompt', {
            detail: { text: promptSnippet, focus: true },
          })
        );
        toast.info(t.wsInspectElement, t.wsElementSelectedToast);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setDockOpen, t.wsElementSelectedToast, t.wsInspectElement]);

  const renderPlan = useMemo(() => {
    if (!hasProject) return null;
    return resolveProjectRenderPlan({
      files: projectFiles,
      entryPath: projectEntryFile,
      runtime: projectRuntime,
      activeRoute: phpRoute,
      phpMethod,
      phpFormData,
      serverRunResult: projectServerRunResult,
      isRunning: isRunningServerProject,
      darkMode: previewDarkMode,
    });
  }, [
    hasProject,
    projectFiles,
    projectEntryFile,
    projectRuntime,
    phpRoute,
    phpMethod,
    phpFormData,
    projectServerRunResult,
    isRunningServerProject,
    previewDarkMode,
  ]);

  const srcDoc = useMemo(() => {
    if (!hasContent) return '';
    if (renderPlan?.srcDoc) return renderPlan.srcDoc;
    if (renderPlan?.bundledCode) {
      let built = buildSandboxSrcDoc(
        renderPlan.bundledCode,
        renderPlan.bundledLang || 'tsx',
        previewDarkMode
      );
      if (renderPlan.extraCss) {
        const safeCss = renderPlan.extraCss.replace(/<\/style>/gi, '<\\/style>');
        built = built.replace(/<\/head>/i, `<style>${safeCss}</style>\n</head>`);
      }
      return built;
    }
    return buildSandboxSrcDoc(previewCode, previewLang, previewDarkMode);
  }, [hasContent, renderPlan, previewCode, previewLang, previewDarkMode]);

  const handleCopy = () => {
    if (!hasContent) return;
    const textToCopy =
      previewCode || projectFiles.map((f) => `// === ${f.path} ===\n${f.content}`).join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadHtml = () => {
    if (!hasContent) return;
    const blob = new Blob([srcDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supremeai-preview-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePopoutNewTab = () => {
    if (!hasContent) return;
    const blob = new Blob([srcDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handlePublishShare = async () => {
    if (!hasContent || isPublishing) return;
    setIsPublishing(true);
    try {
      const result = await publishPreviewArtifact({
        code: previewCode,
        lang: previewLang,
        title: previewTitle,
      });
      setShareUrlBanner(result.url);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(result.url).catch(() => {});
      }
      toast.success(t.wsPublishShareTitle, t.wsPublishCopied);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAutoFixError = () => {
    if (!runtimeError || isStreamingChat) return;
    const fixPrompt = `The live ${previewLang.toUpperCase()} preview threw this runtime error:\n\`\`\`\n${runtimeError}\n\`\`\`\nPlease fix this bug cleanly and return the complete corrected code.`;
    void useChatStore.getState().sendMessage(fixPrompt);
  };

  // Automatic Background Self-Healing (up to 2 automatic retries on post-stream runtime errors)
  useEffect(() => {
    if (
      !runtimeError ||
      !hasContent ||
      isArtifactStreaming ||
      isStreamingChat ||
      isNonBrowserCode
    ) {
      return;
    }
    const attempts = autoHealAttemptsRef.current[artifactSignature] || 0;
    if (attempts >= 2) {
      setIsAutoHealing(false);
      setAutoHealExhausted(true);
      return;
    }
    if (autoHealPendingSigRef.current === artifactSignature) return;

    autoHealPendingSigRef.current = artifactSignature;
    setIsAutoHealing(true);
    setAutoHealExhausted(false);

    const timer = setTimeout(() => {
      autoHealAttemptsRef.current[artifactSignature] = attempts + 1;
      const fixPrompt = `The live ${previewLang.toUpperCase()} preview threw this runtime error:\n\`\`\`\n${runtimeError}\n\`\`\`\nPlease fix this bug cleanly and return the complete corrected code.`;
      void useChatStore
        .getState()
        .sendMessage(fixPrompt)
        .finally(() => {
          setIsAutoHealing(false);
        });
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [
    runtimeError,
    hasContent,
    isArtifactStreaming,
    isStreamingChat,
    isNonBrowserCode,
    artifactSignature,
    previewLang,
  ]);

  const handleFocusChat = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setDockOpen(false);
    }
    requestAnimationFrame(() => {
      const chatInput = document.getElementById(
        'supremeai-chat-input'
      ) as HTMLTextAreaElement | null;
      if (chatInput) {
        chatInput.focus();
        chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
      {/* Preview Toolbar (Desktop / Mobile Viewport Switcher + Primary Actions + More Menu) */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900/50">
        {/* Device Viewport Selector (Desktop | Mobile + Rotate) */}
        {showViewportControls ? (
          <div className="flex items-center gap-1 shrink-0">
            <div
              role="group"
              aria-label="Preview viewport mode"
              className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/60 shrink-0"
            >
              <button
                type="button"
                data-testid="preview-viewport-desktop"
                aria-pressed={viewportDevice !== 'mobile'}
                aria-label={t.wsDesktopViewport}
                onClick={() => setViewportDevice('desktop')}
                title={t.wsDesktopViewport}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  viewportDevice !== 'mobile'
                    ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">{t.wsBrowserDesktopView}</span>
              </button>
              <button
                type="button"
                data-testid="preview-viewport-mobile"
                aria-pressed={viewportDevice === 'mobile'}
                aria-label={t.wsMobileViewport}
                onClick={() => setViewportDevice('mobile')}
                title={t.wsMobileViewport}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  viewportDevice === 'mobile'
                    ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">{t.wsBrowserMobileView}</span>
              </button>
            </div>
            {viewportDevice === 'mobile' && (
              <button
                type="button"
                data-testid="preview-mobile-rotate-btn"
                onClick={toggleMobileOrientation}
                title={t.wsMobileRotate}
                aria-label={t.wsMobileRotate}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-cyan-500 hover:border-cyan-500/40 transition-colors cursor-pointer shrink-0"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-300/70 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
            <Terminal className="w-3.5 h-3.5 text-cyan-500" />
            <span>{t.wsNonBrowserBadge}</span>
          </span>
        )}

        {/* Source, runtime, live sync & verification status */}
        <button
          type="button"
          onClick={() => setActiveDockTab('code')}
          className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer truncate flex items-center gap-1.5 min-w-0"
        >
          <span className="text-cyan-500 font-semibold uppercase">
            {hasProject ? projectRuntime : previewLang}
          </span>
          {hasProject && (
            <span className="hidden sm:inline text-slate-400">
              · {projectFiles.length} {projectFiles.length === 1 ? 'file' : 'files'}
            </span>
          )}
          {isArtifactStreaming ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>{t.wsLiveSyncStreaming}</span>
            </span>
          ) : (
            isVerified &&
            !runtimeError &&
            hasContent && (
              <span
                title={t.wsVerifiedTooltip}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0"
              >
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">{t.wsVerifiedBadge}</span>
              </span>
            )
          )}
        </button>

        {/* Actions: Run Python/Node (when relevant) · Reload · Zip · Publish · More */}
        <div className="flex items-center gap-1 shrink-0">
          {hasProject && (projectRuntime === 'python' || projectRuntime === 'node') && (
            <button
              type="button"
              onClick={() => void runCurrentServerProject()}
              disabled={isRunningServerProject}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-600 dark:text-emerald-300 disabled:opacity-50 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isRunningServerProject ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              <span className="hidden sm:inline">
                {isRunningServerProject ? t.wsRunningProject : t.wsRunProjectBtn}
              </span>
            </button>
          )}

          {hasProject && (
            <button
              type="button"
              onClick={() => downloadProjectZip(projectTitle || 'supremeai-project', projectFiles)}
              title={t.wsDownloadProjectZip}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-300/70 dark:border-slate-700 hover:border-cyan-500/50 text-slate-600 dark:text-slate-200 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden md:inline">.zip</span>
            </button>
          )}

          <button
            type="button"
            onClick={reloadPreview}
            disabled={!hasContent}
            title={t.wsReloadPreview}
            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handlePublishShare}
            disabled={!hasContent || isPublishing}
            title={t.wsPublishApp}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-600 dark:text-cyan-300 disabled:opacity-40 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.wsPublishApp}</span>
          </button>

          <div ref={moreMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsMoreOpen((v) => !v)}
              aria-expanded={isMoreOpen}
              title={t.wsMoreOptions}
              aria-label={t.wsMoreOptions}
              className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0d1422] shadow-xl p-1 z-50 text-xs">
                {!isNonBrowserCode && (
                  <button
                    type="button"
                    disabled={!hasContent}
                    onClick={() => {
                      setInspectorActive((v) => !v);
                      setIsMoreOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer disabled:opacity-40 ${
                      inspectorActive
                        ? 'bg-cyan-500/15 text-cyan-500 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.wsInspectElement}</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={!hasContent}
                  onClick={() => {
                    handlePopoutNewTab();
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.wsPopoutPreview}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    togglePreviewDarkMode();
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {previewDarkMode ? (
                    <Sun className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{t.wsToggleTheme}</span>
                </button>

                <button
                  type="button"
                  disabled={!hasContent}
                  onClick={() => {
                    handleCopy();
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{copied ? t.copiedBtn : t.copyBtn}</span>
                </button>

                <button
                  type="button"
                  disabled={!hasContent}
                  onClick={() => {
                    handleDownloadHtml();
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.wsDownloadHtml}</span>
                </button>

                <button
                  type="button"
                  disabled={!hasContent}
                  onClick={() => {
                    setIsGitModalOpen(true);
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <GitBranch className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.wsExportGit}</span>
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

                <button
                  type="button"
                  disabled={!hasContent}
                  onClick={() => {
                    clearPreviewCode();
                    setIsMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-rose-500 hover:bg-rose-500/10 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.clear}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PHP Virtual Router Bar */}
      {hasProject && projectRuntime === 'php' && renderPlan && (
        <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/80 dark:bg-[#080d17] flex items-center gap-2 overflow-x-auto no-scrollbar text-[11px]">
          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono shrink-0">
            <Globe className="w-3 h-3 text-cyan-500" />
            <span>{t.wsPhpRouteLabel}:</span>
          </span>
          {renderPlan.routes.map((route) => {
            const active = phpRoute === route;
            return (
              <button
                key={route}
                type="button"
                onClick={() => {
                  setPhpRoute(route);
                  setPhpMethod('GET');
                  setPhpFormData(undefined);
                  setPhpRouteHistory((prev) =>
                    prev[prev.length - 1] === route ? prev : [...prev.slice(-14), route]
                  );
                }}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors cursor-pointer shrink-0 ${
                  active
                    ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-600 dark:text-cyan-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {route}
              </button>
            );
          })}
        </div>
      )}

      {/* Element Inspector Active Hint */}
      {inspectorActive && hasContent && (
        <div className="px-3 py-1.5 bg-cyan-500/10 border-b border-cyan-500/30 flex items-center justify-between gap-2 text-[11px] text-cyan-600 dark:text-cyan-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.wsInspectElementActive}</span>
          </div>
          <button
            type="button"
            onClick={() => setInspectorActive(false)}
            className="p-0.5 rounded hover:bg-cyan-500/20 cursor-pointer shrink-0"
            aria-label={t.close}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Published Share URL Inline Bar */}
      {shareUrlBanner && (
        <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/30 flex items-center gap-2 text-[11px]">
          <Share2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <input
            type="text"
            readOnly
            value={shareUrlBanner}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 bg-transparent font-mono text-[11px] text-emerald-700 dark:text-emerald-300 outline-none truncate"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(shareUrlBanner);
              setShareUrlCopied(true);
              setTimeout(() => setShareUrlCopied(false), 1800);
            }}
            className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer shrink-0"
          >
            {shareUrlCopied ? t.copiedBtn : t.copyBtn}
          </button>
          <a
            href={shareUrlBanner}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 shrink-0"
            title={t.wsPopoutPreview}
          >
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={() => setShareUrlBanner(null)}
            className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 cursor-pointer shrink-0"
            aria-label={t.close}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Non-Browser CLI / Server Code Helper Bar */}
      {isNonBrowserCode && hasContent && !isArtifactStreaming && (
        <div className="px-3 py-1.5 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <span className="truncate">{t.wsNonBrowserHint}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveDockTab('code')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 hover:border-cyan-500/50 text-[11px] font-medium cursor-pointer whitespace-nowrap"
            >
              <Code2 className="w-3 h-3 text-cyan-500" />
              <span>{t.wsOpenInCodeBtn}</span>
            </button>
            {isShellCode && (
              <button
                type="button"
                onClick={() => setActiveDockTab('terminal')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-[11px] font-medium cursor-pointer whitespace-nowrap"
              >
                <Terminal className="w-3 h-3" />
                <span>{t.wsOpenInTerminalBtn}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Background Auto Self-Healing & Fallback Runtime Error Banner */}
      {runtimeError &&
      !isArtifactStreaming &&
      (isAutoHealing || isStreamingChat) &&
      !autoHealExhausted ? (
        <div className="px-3 py-1.5 bg-cyan-500/10 border-b border-cyan-500/30 flex items-center justify-between gap-2 text-[11px] text-cyan-600 dark:text-cyan-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span className="truncate font-medium">{t.wsAutoHealingNotice}</span>
          </div>
          <span className="text-[10px] font-mono opacity-80 shrink-0 truncate max-w-[40%]">
            {runtimeError}
          </span>
        </div>
      ) : (
        runtimeError &&
        !isArtifactStreaming && (
          <div className="px-3 py-1.5 bg-rose-500/10 border-b border-rose-500/30 flex items-center justify-between gap-2 text-[11px] font-mono text-rose-500 dark:text-rose-400">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold shrink-0">
                {autoHealExhausted ? `${t.wsAutoHealingRetry}:` : t.wsRuntimeErrorBanner}
              </span>
              <span className="truncate">{runtimeError}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAutoFixError}
                disabled={isStreamingChat}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-sans font-semibold text-[11px] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Wand2 className="w-3 h-3" />
                <span>{t.wsAutoFixError}</span>
              </button>
              <button
                type="button"
                onClick={() => setRuntimeError(null)}
                className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400 cursor-pointer shrink-0"
                aria-label={t.close}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      )}

      {/* Sandboxed Iframe Container or Empty State */}
      {!hasContent ? (
        <div className="flex-1 min-h-0 overflow-auto flex flex-col items-center justify-center p-5 sm:p-8 bg-slate-100/70 dark:bg-[#05070c]">
          <div className="w-full max-w-lg space-y-5 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br from-cyan-500/15 to-blue-500/10 border border-cyan-500/30 text-cyan-500 dark:text-cyan-400 shadow-xs">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {t.wsPreviewEmptyTitle}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                {t.wsPreviewEmptyHint}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <button
                type="button"
                onClick={handleFocusChat}
                className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 hover:border-cyan-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 dark:text-cyan-400">
                      <MessageSquarePlus className="w-4 h-4" />
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500/60 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 pt-1">
                    {t.wsPreviewChatCardTitle}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t.wsPreviewChatCardDesc}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                  <span>{t.wsPreviewChatCardAction}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDockTab('code')}
                className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 hover:border-cyan-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400">
                      <Code2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 pt-1">
                    {t.wsPreviewCodeCardTitle}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t.wsPreviewCodeCardDesc}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                  <span>{t.wsOpenCodeTab}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-500">
              {t.wsPreviewSupportedFormats}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden bg-slate-200/60 dark:bg-[#05070c] flex justify-center items-center p-2 sm:p-3">
          {viewportDevice === 'mobile' && showViewportControls ? (
            <MobileDeviceFrame
              orientation={mobileOrientation}
              onRotate={toggleMobileOrientation}
              onBack={
                projectRuntime === 'php' && phpRouteHistory.length > 1
                  ? () => {
                      const nextHist = phpRouteHistory.slice(0, -1);
                      setPhpRouteHistory(nextHist);
                      setPhpRoute(nextHist[nextHist.length - 1] || '/');
                      setPhpMethod('GET');
                      setPhpFormData(undefined);
                    }
                  : undefined
              }
              onHome={
                projectRuntime === 'php'
                  ? () => {
                      setPhpRoute('/');
                      setPhpMethod('GET');
                      setPhpFormData(undefined);
                      setPhpRouteHistory(['/']);
                    }
                  : reloadPreview
              }
              onReload={reloadPreview}
              onOpenExternal={handlePopoutNewTab}
              canGoBack={projectRuntime === 'php' ? phpRouteHistory.length > 1 : false}
              darkChrome={previewDarkMode}
            >
              <iframe
                ref={iframeRef}
                key={previewRefreshKey}
                title="SupremeAI Mobile Preview Sandbox"
                srcDoc={srcDoc}
                onLoad={() => {
                  iframeRef.current?.contentWindow?.postMessage(
                    {
                      channel: 'supremeai-preview-host',
                      type: 'set-inspector',
                      enabled: inspectorActive,
                    },
                    '*'
                  );
                }}
                sandbox="allow-scripts allow-forms allow-modals"
                className="w-full h-full border-0"
              />
            </MobileDeviceFrame>
          ) : (
            <div className="w-full h-full rounded-xl overflow-hidden border border-slate-300 dark:border-cyan-500/20 shadow-lg bg-white dark:bg-[#080b11]">
              <iframe
                ref={iframeRef}
                key={previewRefreshKey}
                title="SupremeAI Live Preview Sandbox"
                srcDoc={srcDoc}
                onLoad={() => {
                  iframeRef.current?.contentWindow?.postMessage(
                    {
                      channel: 'supremeai-preview-host',
                      type: 'set-inspector',
                      enabled: inspectorActive,
                    },
                    '*'
                  );
                }}
                sandbox="allow-scripts allow-forms allow-modals"
                className="w-full h-full border-0"
              />
            </div>
          )}
        </div>
      )}

      <GitExportModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        code={previewCode}
        lang={previewLang}
        standaloneHtml={srcDoc || undefined}
        projectFiles={hasProject ? projectFiles : undefined}
        projectTitle={projectTitle || undefined}
      />
    </div>
  );
};
