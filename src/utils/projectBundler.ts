import type { ProjectRuntime, VirtualProjectFile } from './artifactStreamParser';
import { executeVirtualPhpProject } from './phpPreviewRuntime';

export interface ServerProjectRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  runtime: 'python' | 'node';
  entryFile: string;
  durationMs: number;
  error?: string;
}

export interface ProjectRenderPlan {
  runtime: ProjectRuntime;
  entryPath: string;
  routes: string[];
  activeRoute: string;
  statusCode: number;
  /** Ready-to-render HTML document (set for php, web, python/node output cards, or wrapped react css) */
  srcDoc?: string;
  /** Combined TSX/single-file source to feed through buildSandboxSrcDoc (for react / static / js) */
  bundledCode?: string;
  bundledLang?: string;
  extraCss?: string;
}

function normalizePosixPath(raw: string): string {
  const parts: string[] = [];
  for (const seg of raw.replace(/\\/g, '/').replace(/^\/+/, '').split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      parts.pop();
    } else {
      parts.push(seg);
    }
  }
  return parts.join('/');
}

function resolveRelPath(baseFile: string, relImport: string): string {
  const clean = relImport.trim().replace(/[?#].*$/, '');
  if (clean.startsWith('/')) return normalizePosixPath(clean);
  const dir = baseFile.includes('/') ? baseFile.slice(0, baseFile.lastIndexOf('/')) : '';
  return normalizePosixPath(dir ? `${dir}/${clean}` : clean);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeStyleClose(css: string): string {
  return css.replace(/<\/style>/gi, '<\\/style>');
}

function escapeScriptClose(js: string): string {
  return js.replace(/<\/script>/gi, '<\\/script>');
}

/**
 * Bundles a multi-file HTML + CSS + JS project into one self-contained HTML document.
 */
export function bundleMultiFileWebProject(
  files: VirtualProjectFile[],
  entryPath: string,
  darkMode = true
): string {
  const byLower = new Map<string, VirtualProjectFile>();
  for (const f of files) {
    byLower.set(normalizePosixPath(f.path).toLowerCase(), f);
  }

  const entry =
    byLower.get(normalizePosixPath(entryPath).toLowerCase()) ||
    files.find((f) => /\.html?$/i.test(f.path)) ||
    files[0];

  if (!entry) return '';

  const consumedPaths = new Set<string>([normalizePosixPath(entry.path).toLowerCase()]);
  let html = entry.content;

  // Replace local <link rel="stylesheet" href="..."> with inline <style>
  html = html.replace(
    /<link\b[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*\/?>/gi,
    (full, href: string) => {
      if (/^https?:|^\/\//i.test(href)) return full;
      const targetKey = resolveRelPath(entry.path, href).toLowerCase();
      const matched = byLower.get(targetKey) || byLower.get(normalizePosixPath(href).toLowerCase());
      if (!matched) return full;
      consumedPaths.add(normalizePosixPath(matched.path).toLowerCase());
      return `<style data-file="${escapeHtml(matched.path)}">\n${escapeStyleClose(matched.content)}\n</style>`;
    }
  );

  // Replace local <script src="..."></script> with inline <script>
  html = html.replace(
    /<script\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (full, src: string) => {
      if (/^https?:|^\/\//i.test(src)) return full;
      const targetKey = resolveRelPath(entry.path, src).toLowerCase();
      const matched = byLower.get(targetKey) || byLower.get(normalizePosixPath(src).toLowerCase());
      if (!matched) return full;
      consumedPaths.add(normalizePosixPath(matched.path).toLowerCase());
      return `<script data-file="${escapeHtml(matched.path)}">\n${escapeScriptClose(matched.content)}\n</script>`;
    }
  );

  // Any remaining CSS / JS files in the project get appended automatically so split projects always work
  const unlinkedCss = files
    .filter(
      (f) =>
        (f.lang === 'css' || /\.css$/i.test(f.path)) &&
        !consumedPaths.has(normalizePosixPath(f.path).toLowerCase())
    )
    .map(
      (f) => `<style data-file="${escapeHtml(f.path)}">\n${escapeStyleClose(f.content)}\n</style>`
    )
    .join('\n');

  const unlinkedJs = files
    .filter(
      (f) =>
        (f.lang === 'javascript' || /\.m?js$/i.test(f.path)) &&
        !consumedPaths.has(normalizePosixPath(f.path).toLowerCase())
    )
    .map(
      (f) =>
        `<script data-file="${escapeHtml(f.path)}">\n${escapeScriptClose(f.content)}\n</script>`
    )
    .join('\n');

  const isFullHtml = /^<!doctype\s+html/i.test(html.trim()) || /^<html[\s>]/i.test(html.trim());
  if (!isFullHtml) {
    return `<!DOCTYPE html>
<html class="${darkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${unlinkedCss}
</head>
<body class="${darkMode ? 'bg-[#080b11] text-slate-100' : 'bg-slate-50 text-slate-900'} min-h-screen antialiased">
  ${html}
  ${unlinkedJs}
</body>
</html>`;
  }

  if (unlinkedCss) {
    html = /<\/head>/i.test(html)
      ? html.replace(/<\/head>/i, `${unlinkedCss}\n</head>`)
      : `${unlinkedCss}\n${html}`;
  }
  if (unlinkedJs) {
    html = /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, `${unlinkedJs}\n</body>`)
      : `${html}\n${unlinkedJs}`;
  }

  return html;
}

function findProjectModule(
  byPath: Map<string, VirtualProjectFile>,
  baseFile: string,
  specifier: string
): VirtualProjectFile | undefined {
  const rel = resolveRelPath(baseFile, specifier);
  const candidates = [
    rel,
    `${rel}.tsx`,
    `${rel}.ts`,
    `${rel}.jsx`,
    `${rel}.js`,
    `${rel}/index.tsx`,
    `${rel}/index.ts`,
    `${rel}/index.jsx`,
    `${rel}/index.js`,
  ];
  for (const c of candidates) {
    const found = byPath.get(c.toLowerCase());
    if (found) return found;
  }
  // Fallback lookup without base dir if project placed files flat
  const cleanFlat = normalizePosixPath(specifier);
  for (const ext of ['', '.tsx', '.ts', '.jsx', '.js']) {
    const found = byPath.get(`${cleanFlat}${ext}`.toLowerCase());
    if (found) return found;
  }
  return undefined;
}

/**
 * Resolves relative TSX/TS/JSX/JS/CSS imports across virtual project files into a single
 * combined TSX source ready for transformCodeForBrowserPreview + buildSandboxSrcDoc.
 */
export function bundleMultiFileReactEntry(
  files: VirtualProjectFile[],
  entryPath: string
): { combinedCode: string; collectedCss: string } {
  const byPath = new Map<string, VirtualProjectFile>();
  for (const f of files) {
    byPath.set(normalizePosixPath(f.path).toLowerCase(), f);
  }

  const entryFile =
    byPath.get(normalizePosixPath(entryPath).toLowerCase()) ||
    files.find((f) => f.lang === 'tsx' || f.lang === 'jsx') ||
    files[0];

  if (!entryFile) {
    return { combinedCode: '', collectedCss: '' };
  }

  const visited = new Set<string>();
  const dependencyChunks: string[] = [];
  const cssParts: string[] = [];
  const externalImportLines = new Set<string>();

  // Collect all CSS files first so styles apply consistently
  for (const f of files) {
    if (f.lang === 'css' || /\.css$/i.test(f.path)) {
      cssParts.push(`/* ${f.path} */\n${f.content}`);
    }
  }

  function processModule(mod: VirtualProjectFile, isRootEntry: boolean): void {
    const key = normalizePosixPath(mod.path).toLowerCase();
    if (visited.has(key)) return;
    visited.add(key);

    if (mod.lang === 'css' || /\.css$/i.test(mod.path)) {
      return;
    }

    const linesToKeep: string[] = [];
    const importRegex = /^\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?\s*$/;
    const sideEffectImportRegex = /^\s*import\s+['"]([^'"]+)['"];?\s*$/;

    const statements = mod.content.split(/\r?\n/);
    for (const line of statements) {
      const sideMatch = line.match(sideEffectImportRegex);
      if (sideMatch) {
        const spec = sideMatch[1].trim();
        if (spec.startsWith('.')) {
          const dep = findProjectModule(byPath, mod.path, spec);
          if (dep && dep.lang !== 'css') processModule(dep, false);
          continue;
        }
        externalImportLines.add(line.trim());
        continue;
      }

      const impMatch = line.match(importRegex);
      if (impMatch) {
        const clause = impMatch[1].trim();
        const spec = impMatch[2].trim();
        if (spec.startsWith('.')) {
          const dep = findProjectModule(byPath, mod.path, spec);
          if (dep) {
            processModule(dep, false);
          }
          // If importing a default under a different alias than internal declaration, nothing extra needed if named matches;
          // if dep had anonymous `export default`, alias via __ModExport_...
          continue;
        }
        // Keep external npm / react imports so transformCodeForBrowserPreview resolves esm.sh
        if (!/^type\s+/i.test(clause)) {
          externalImportLines.add(line.trim());
        }
        continue;
      }

      linesToKeep.push(line);
    }

    let body = linesToKeep.join('\n').trim();
    if (!isRootEntry) {
      // Strip `export` keywords from dependency modules so symbols share scope with root entry
      body = body
        .replace(/^\s*export\s+type\s+[\s\S]*?;?\s*$/gm, '')
        .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '')
        .replace(/^\s*export\s+default\s+async\s+function\s+/gm, 'async function ')
        .replace(/^\s*export\s+default\s+function\s+/gm, 'function ')
        .replace(/^\s*export\s+default\s+class\s+/gm, 'class ')
        .replace(/^\s*export\s+default\s+([A-Za-z_$][\w$]*);?\s*$/gm, '')
        .replace(
          /^\s*export\s+(const|let|var|function|async\s+function|class|type|interface|enum)\s+/gm,
          '$1 '
        );
    }

    if (body) {
      dependencyChunks.push(`// --- ${mod.path} ---\n${body}`);
    }
  }

  // Visit dependencies first, then root entry
  const tempVisitDeps = (mod: VirtualProjectFile, seen: Set<string>) => {
    const k = normalizePosixPath(mod.path).toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    const lines = mod.content.split(/\r?\n/);
    for (const line of lines) {
      const m =
        line.match(/from\s+['"]([^'"]+)['"]/) || line.match(/^\s*import\s+['"]([^'"]+)['"]/);
      if (m && m[1].startsWith('.')) {
        const dep = findProjectModule(byPath, mod.path, m[1]);
        if (dep) tempVisitDeps(dep, seen);
      }
    }
    if (k !== normalizePosixPath(entryFile.path).toLowerCase()) {
      processModule(mod, false);
    }
  };

  tempVisitDeps(entryFile, new Set<string>());
  processModule(entryFile, true);

  const combinedCode = [Array.from(externalImportLines).join('\n'), ...dependencyChunks]
    .filter(Boolean)
    .join('\n\n');

  return {
    combinedCode,
    collectedCss: cssParts.join('\n\n'),
  };
}

export function buildServerRuntimePreviewHtml(params: {
  files: VirtualProjectFile[];
  entryPath: string;
  runtime: 'python' | 'node';
  serverRunResult?: ServerProjectRunResult | null;
  isRunning?: boolean;
  darkMode?: boolean;
}): string {
  const { files, entryPath, runtime, serverRunResult, isRunning = false, darkMode = true } = params;
  const bg = darkMode ? '#080b11' : '#f8fafc';
  const card = darkMode ? '#0b101b' : '#ffffff';
  const headerBg = darkMode ? '#0f172a' : '#f1f5f9';
  const border = darkMode ? '#1e293b' : '#cbd5e1';
  const text = darkMode ? '#e2e8f0' : '#0f172a';
  const muted = darkMode ? '#94a3b8' : '#475569';

  const entry = files.find((f) => f.path === entryPath) || files[0];
  const runtimeLabel = runtime === 'python' ? 'PYTHON 3 RUNTIME' : 'NODE.JS RUNTIME';

  let statusText = 'Ready to run';
  let statusColor = '#38bdf8';
  let outputBlock = entry?.content || '';
  let stderrBlock = '';

  if (isRunning) {
    statusText = 'Executing project...';
    statusColor = '#fbbf24';
    outputBlock = 'Running script in isolated sandbox...';
  } else if (serverRunResult) {
    const ok = serverRunResult.exitCode === 0;
    statusText = ok
      ? `Exit 0 · ${serverRunResult.durationMs}ms`
      : `Exit ${serverRunResult.exitCode ?? 'err'} · ${serverRunResult.durationMs}ms`;
    statusColor = ok ? '#10b981' : '#fb7185';
    outputBlock =
      serverRunResult.stdout || (ok ? '(Program finished cleanly with no stdout output)' : '');
    stderrBlock = serverRunResult.stderr || serverRunResult.error || '';
  }

  return `<!DOCTYPE html>
<html class="${darkMode ? 'dark' : ''}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 18px; font-family: system-ui, -apple-system, sans-serif; background: ${bg}; color: ${text}; }
    .card { border-radius: 14px; border: 1px solid ${border}; background: ${card}; overflow: hidden; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 14px; background: ${headerBg}; border-bottom: 1px solid ${border}; font-family: ui-monospace, monospace; font-size: 11px; }
    .title { color: #38bdf8; font-weight: 700; letter-spacing: 0.04em; }
    .status { color: ${statusColor}; font-weight: 600; }
    .section-label { padding: 8px 14px 4px; font-family: ui-monospace, monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: ${muted}; }
    pre { margin: 0; padding: 10px 14px 16px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; overflow-x: auto; }
    .stdout { color: ${serverRunResult ? (darkMode ? '#6ee7b7' : '#047857') : text}; }
    .stderr { color: #fb7185; border-top: 1px solid ${border}; background: rgba(244,63,94,0.06); }
    .files { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 14px; border-top: 1px solid ${border}; font-family: ui-monospace, monospace; font-size: 11px; color: ${muted}; }
    .file-item { padding: 2px 8px; border-radius: 6px; border: 1px solid ${border}; }
  </style>
</head>
<body>
  <div class="card">
    <div class="bar">
      <span class="title">${escapeHtml(runtimeLabel)} · ${escapeHtml(entryPath)}</span>
      <span class="status">${escapeHtml(statusText)}</span>
    </div>
    <div class="section-label">${serverRunResult ? 'Standard Output (stdout)' : 'Entry Source'}</div>
    <pre class="stdout">${escapeHtml(outputBlock)}</pre>
    ${stderrBlock ? `<div class="section-label">Standard Error (stderr)</div><pre class="stderr">${escapeHtml(stderrBlock)}</pre>` : ''}
    ${
      files.length > 1
        ? `<div class="files">${files
            .map((f) => `<span class="file-item">${escapeHtml(f.path)}</span>`)
            .join('')}</div>`
        : ''
    }
  </div>
  <script>
    window.addEventListener('load', function() {
      try { window.parent.postMessage({ channel: 'supremeai-preview', type: 'verified' }, '*'); } catch (_) { /* cross-origin frame may be torn down; nothing actionable */ }
    });
  </script>
</body>
</html>`;
}

export function resolveProjectRenderPlan(params: {
  files: VirtualProjectFile[];
  entryPath: string;
  runtime: ProjectRuntime;
  activeRoute?: string;
  phpMethod?: 'GET' | 'POST';
  phpFormData?: Record<string, string>;
  serverRunResult?: ServerProjectRunResult | null;
  isRunning?: boolean;
  darkMode?: boolean;
}): ProjectRenderPlan {
  const {
    files,
    entryPath,
    runtime,
    activeRoute = '/',
    phpMethod = 'GET',
    phpFormData,
    serverRunResult,
    isRunning = false,
    darkMode = true,
  } = params;

  if (runtime === 'php') {
    const result = executeVirtualPhpProject({
      files,
      entryPath,
      routeUrl: activeRoute,
      method: phpMethod,
      formData: phpFormData,
      darkMode,
    });
    return {
      runtime,
      entryPath,
      routes: result.routes,
      activeRoute,
      statusCode: result.statusCode,
      srcDoc: result.html,
    };
  }

  if (runtime === 'web') {
    const htmlDoc = bundleMultiFileWebProject(files, entryPath, darkMode);
    return {
      runtime,
      entryPath,
      routes: ['/'],
      activeRoute: '/',
      statusCode: 200,
      srcDoc: htmlDoc,
    };
  }

  if (runtime === 'react') {
    const { combinedCode, collectedCss } = bundleMultiFileReactEntry(files, entryPath);
    return {
      runtime,
      entryPath,
      routes: ['/'],
      activeRoute: '/',
      statusCode: 200,
      bundledCode: combinedCode,
      bundledLang: 'tsx',
      extraCss: collectedCss,
    };
  }

  if (runtime === 'python' || runtime === 'node') {
    // Check if there is an HTML entry too (hybrid python/node API + HTML frontend)
    const htmlEntry = files.find((f) => /^index\.html?$/i.test(f.path));
    if (htmlEntry && !serverRunResult && runtime === 'node') {
      return {
        runtime: 'web',
        entryPath: htmlEntry.path,
        routes: ['/'],
        activeRoute: '/',
        statusCode: 200,
        srcDoc: bundleMultiFileWebProject(files, htmlEntry.path, darkMode),
      };
    }

    return {
      runtime,
      entryPath,
      routes: ['/'],
      activeRoute: '/',
      statusCode: serverRunResult && serverRunResult.exitCode !== 0 ? 500 : 200,
      srcDoc: buildServerRuntimePreviewHtml({
        files,
        entryPath,
        runtime,
        serverRunResult,
        isRunning,
        darkMode,
      }),
    };
  }

  const primary = files.find((f) => f.path === entryPath) || files[0];
  return {
    runtime,
    entryPath: primary?.path || entryPath,
    routes: ['/'],
    activeRoute: '/',
    statusCode: 200,
    bundledCode: primary?.content || '',
    bundledLang: primary?.lang || 'text',
  };
}
