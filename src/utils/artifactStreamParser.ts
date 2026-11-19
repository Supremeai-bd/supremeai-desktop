export type ArtifactTargetTab = 'preview' | 'sandbox';
export type CodeRuntimeCategory = 'visual' | 'script' | 'data' | 'non-browser';
export type ProjectRuntime = 'web' | 'react' | 'php' | 'python' | 'node' | 'static';

export interface StreamingArtifactMatch {
  lang: string;
  code: string;
  isClosed: boolean;
  targetTab: ArtifactTargetTab;
  blockIndex: number;
}

export interface VirtualProjectFile {
  path: string;
  lang: string;
  content: string;
  isEntry?: boolean;
}

export interface ExtractedVirtualProject {
  title: string;
  runtime: ProjectRuntime;
  entryFile: string;
  files: VirtualProjectFile[];
  isStreaming: boolean;
}

const PREVIEW_LANG_ALIASES: Record<string, string> = {
  html: 'html',
  htm: 'html',
  svg: 'svg',
  tsx: 'tsx',
  jsx: 'jsx',
  react: 'tsx',
  mermaid: 'mermaid',
  mmd: 'mermaid',
};

const SANDBOX_LANG_ALIASES: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  node: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  mts: 'typescript',
};

const DATA_PREVIEW_LANG_ALIASES: Record<string, string> = {
  json: 'json',
  css: 'css',
  scss: 'css',
  markdown: 'markdown',
  md: 'markdown',
};

const SHELL_LANG_SET = new Set([
  'bash',
  'sh',
  'zsh',
  'shell',
  'console',
  'terminal',
  'powershell',
  'ps1',
  'cmd',
  'bat',
]);

const EXT_TO_LANG: Record<string, string> = {
  php: 'php',
  phtml: 'php',
  html: 'html',
  htm: 'html',
  svg: 'svg',
  tsx: 'tsx',
  jsx: 'jsx',
  ts: 'typescript',
  mts: 'typescript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  css: 'css',
  scss: 'css',
  json: 'json',
  py: 'python',
  md: 'markdown',
  sql: 'sql',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  txt: 'text',
  env: 'text',
  gitignore: 'text',
  htaccess: 'text',
};

const LANG_TO_EXT: Record<string, string> = {
  php: 'php',
  html: 'html',
  svg: 'svg',
  tsx: 'tsx',
  jsx: 'jsx',
  typescript: 'ts',
  javascript: 'js',
  css: 'css',
  json: 'json',
  python: 'py',
  markdown: 'md',
  mermaid: 'mmd',
  sql: 'sql',
  yaml: 'yml',
};

export function normalizeArtifactLang(rawLang?: string): string {
  const clean = (rawLang || '').toLowerCase().trim();
  if (!clean) return 'text';
  if (clean in PREVIEW_LANG_ALIASES) return PREVIEW_LANG_ALIASES[clean];
  if (clean in SANDBOX_LANG_ALIASES) return SANDBOX_LANG_ALIASES[clean];
  if (clean in DATA_PREVIEW_LANG_ALIASES) return DATA_PREVIEW_LANG_ALIASES[clean];
  if (clean === 'py') return 'python';
  return clean;
}

export function inferLangFromProjectPath(filePath: string, fallback = 'text'): string {
  const cleanPath = filePath.trim().toLowerCase();
  const baseName = cleanPath.split('/').pop() || cleanPath;
  if (baseName === '.htaccess') return 'text';
  if (baseName.endsWith('.env') || baseName === '.env.example') return 'text';
  const dot = baseName.lastIndexOf('.');
  if (dot >= 0 && dot < baseName.length - 1) {
    const ext = baseName.slice(dot + 1);
    if (ext in EXT_TO_LANG) return EXT_TO_LANG[ext];
  }
  return normalizeArtifactLang(fallback);
}

export function classifyCodeLanguage(rawLang?: string): CodeRuntimeCategory {
  const clean = (rawLang || '').toLowerCase().trim();
  if (clean in PREVIEW_LANG_ALIASES) return 'visual';
  if (clean in SANDBOX_LANG_ALIASES) return 'script';
  if (clean in DATA_PREVIEW_LANG_ALIASES) return 'data';
  return 'non-browser';
}

export function isPreviewableCodeLanguage(rawLang?: string): boolean {
  const category = classifyCodeLanguage(rawLang);
  return category === 'visual' || category === 'script' || category === 'data';
}

export function isShellCommandLanguage(rawLang?: string): boolean {
  return SHELL_LANG_SET.has((rawLang || '').toLowerCase().trim());
}

function resolveArtifactTarget(rawLang: string): {
  targetTab: ArtifactTargetTab;
  normalizedLang: string;
} | null {
  const clean = rawLang.toLowerCase().trim();
  if (!clean) return null;
  if (clean in PREVIEW_LANG_ALIASES) {
    return { targetTab: 'preview', normalizedLang: PREVIEW_LANG_ALIASES[clean] };
  }
  if (clean in SANDBOX_LANG_ALIASES) {
    return { targetTab: 'sandbox', normalizedLang: SANDBOX_LANG_ALIASES[clean] };
  }
  return null;
}

function isSubstantialEnoughToSync(
  normalizedLang: string,
  targetTab: ArtifactTargetTab,
  code: string,
  isClosed: boolean
): boolean {
  const trimmed = code.trim();
  if (!trimmed) return false;
  if (isClosed) return true;

  if (targetTab === 'sandbox') {
    return trimmed.length >= 36;
  }

  if (normalizedLang === 'mermaid') {
    return trimmed.length >= 14 && trimmed.includes('\n');
  }

  if (normalizedLang === 'html' || normalizedLang === 'svg') {
    return trimmed.length >= 16 && (trimmed.includes('>') || trimmed.length >= 32);
  }

  return trimmed.length >= 24 && (/</.test(trimmed) || trimmed.length >= 48);
}

interface ParsedFenceBlock {
  rawLang: string;
  rawMeta: string;
  code: string;
  isClosed: boolean;
  blockIndex: number;
  precedingLines: string[];
}

function parseAllFenceBlocks(markdown: string): ParsedFenceBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: ParsedFenceBlock[] = [];

  let inFence = false;
  let fenceLen = 3;
  let currentLang = '';
  let currentMeta = '';
  let currentLines: string[] = [];
  let recentNonFenceLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inFence) {
      const openMatch = line.match(/^\s*(`{3,})\s*([^\s`]*)(.*)$/);
      if (openMatch) {
        inFence = true;
        fenceLen = openMatch[1].length;
        const firstToken = openMatch[2] || '';
        const restMeta = (openMatch[3] || '').trim();
        // Handle ```php:index.php or ```tsx/src/App.tsx
        if (firstToken.includes(':') && !firstToken.startsWith('http')) {
          const colonIdx = firstToken.indexOf(':');
          currentLang = firstToken.slice(0, colonIdx);
          const embeddedPath = firstToken.slice(colonIdx + 1);
          currentMeta = `file="${embeddedPath}" ${restMeta}`.trim();
        } else {
          currentLang = firstToken;
          currentMeta = restMeta;
        }
        currentLines = [];
      } else {
        recentNonFenceLines.push(line);
        if (recentNonFenceLines.length > 5) {
          recentNonFenceLines = recentNonFenceLines.slice(-5);
        }
      }
    } else {
      const closeMatch = line.match(/^\s*(`{3,})\s*$/);
      if (closeMatch && closeMatch[1].length >= fenceLen) {
        blocks.push({
          rawLang: currentLang,
          rawMeta: currentMeta,
          code: currentLines.join('\n'),
          isClosed: true,
          blockIndex: blocks.length,
          precedingLines: [...recentNonFenceLines],
        });
        inFence = false;
        fenceLen = 3;
        currentLang = '';
        currentMeta = '';
        currentLines = [];
        recentNonFenceLines = [];
      } else {
        currentLines.push(line);
      }
    }
  }

  if (inFence) {
    blocks.push({
      rawLang: currentLang,
      rawMeta: currentMeta,
      code: currentLines.join('\n'),
      isClosed: false,
      blockIndex: blocks.length,
      precedingLines: [...recentNonFenceLines],
    });
  }

  return blocks;
}

/**
 * Extracts all fenced code blocks (both completed and currently-streaming unclosed blocks)
 * without regex backtracking overhead, then returns the latest live-renderable artifact.
 */
export function extractStreamingArtifact(markdown: string): StreamingArtifactMatch | null {
  if (!markdown || !markdown.includes('```')) return null;

  const blocks = parseAllFenceBlocks(markdown);

  // Pick the latest artifact block in the message
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    const resolved = resolveArtifactTarget(block.rawLang);
    if (!resolved) continue;

    if (
      isSubstantialEnoughToSync(
        resolved.normalizedLang,
        resolved.targetTab,
        block.code,
        block.isClosed
      )
    ) {
      return {
        lang: resolved.normalizedLang,
        code: block.code,
        isClosed: block.isClosed,
        targetTab: resolved.targetTab,
        blockIndex: block.blockIndex,
      };
    }
  }

  return null;
}

function sanitizeProjectFilePath(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/^(\.\/|\/)+/, '')
    .replace(/\\/g, '/')
    .replace(/:+$/, '');

  if (!cleaned || cleaned.includes('..')) return null;
  if (!/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]{1,8}$/.test(cleaned) && !/^\.htaccess$/i.test(cleaned)) {
    return null;
  }
  return cleaned;
}

const FILENAME_LIKE_REGEX =
  /([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*\.(?:php|phtml|html|htm|css|scss|tsx|jsx|ts|mts|js|mjs|cjs|json|py|sql|md|yml|yaml|svg|xml|txt|env|htaccess))/i;

function extractFilePathForBlock(block: ParsedFenceBlock): string | null {
  // 1. Explicit fence attribute: file="index.php" or path="src/App.tsx" or title="styles.css"
  const attrMatch = block.rawMeta.match(
    /(?:file|filename|path|title)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s`]+))/i
  );
  if (attrMatch) {
    const candidate = sanitizeProjectFilePath(attrMatch[1] || attrMatch[2] || attrMatch[3] || '');
    if (candidate) return candidate;
  }

  // 2. Bare filename in fence metadata e.g. ```php index.php
  if (block.rawMeta) {
    const bareMetaMatch = block.rawMeta.match(FILENAME_LIKE_REGEX);
    if (bareMetaMatch) {
      const candidate = sanitizeProjectFilePath(bareMetaMatch[1]);
      if (candidate) return candidate;
    }
  }

  // 3. Preceding markdown lines (e.g. "2. `composer.json`:", "### src/App.tsx", "**index.php**")
  for (let i = block.precedingLines.length - 1; i >= 0; i--) {
    const line = block.precedingLines[i].trim();
    if (!line) continue;
    const inlineCodeMatch = line.match(new RegExp('`(' + FILENAME_LIKE_REGEX.source + ')`', 'i'));
    if (inlineCodeMatch) {
      const candidate = sanitizeProjectFilePath(inlineCodeMatch[1]);
      if (candidate) return candidate;
    }
    const lineMatch = line.match(FILENAME_LIKE_REGEX);
    if (lineMatch && line.length <= 120) {
      const candidate = sanitizeProjectFilePath(lineMatch[1]);
      if (candidate) return candidate;
    }
    break;
  }

  // 4. First-line comment header inside code (// index.php, # app.py, /* styles.css */, <!-- index.html -->)
  const firstLine = (block.code.split(/\r?\n/, 2)[0] || '').trim();
  const commentMatch = firstLine.match(
    /^(?:\/\/|#|\/\*|<!--)\s*(?:file\s*:\s*)?([a-zA-Z0-9_./-]+\.[a-zA-Z0-9]{1,8})/i
  );
  if (commentMatch) {
    const candidate = sanitizeProjectFilePath(commentMatch[1]);
    if (candidate) return candidate;
  }

  // Fallback check on line 2 if line 1 was <?php
  if (/^<\?php/i.test(firstLine)) {
    const secondLine = (block.code.split(/\r?\n/, 3)[1] || '').trim();
    const phpCommentMatch = secondLine.match(
      /^(?:\/\/|#|\/\*)\s*(?:file\s*:\s*)?([a-zA-Z0-9_./-]+\.php)/i
    );
    if (phpCommentMatch) {
      const candidate = sanitizeProjectFilePath(phpCommentMatch[1]);
      if (candidate) return candidate;
    }
  }

  return null;
}

function isDirectoryTreeOrNoiseBlock(block: ParsedFenceBlock): boolean {
  const norm = block.rawLang.toLowerCase().trim();
  if (!norm || norm === 'text' || norm === 'plaintext' || norm === 'tree') {
    if (/[├└│─]/.test(block.code)) return true;
  }
  if (isShellCommandLanguage(norm)) {
    // Only keep shell blocks if explicitly given a .sh/.bat file attribute
    const attr = /(?:file|path)\s*=/i.test(block.rawMeta);
    if (!attr) return true;
  }
  return false;
}

export function detectProjectRuntime(files: VirtualProjectFile[]): ProjectRuntime {
  if (files.some((f) => f.lang === 'php' || /\.phtml$|\.php$/i.test(f.path))) {
    return 'php';
  }
  if (files.some((f) => f.lang === 'tsx' || f.lang === 'jsx')) {
    return 'react';
  }
  if (files.some((f) => f.lang === 'python' || /\.py$/i.test(f.path))) {
    return 'python';
  }
  if (files.some((f) => f.lang === 'html' || /\.html?$/i.test(f.path))) {
    return 'web';
  }
  if (files.some((f) => f.lang === 'javascript' || f.lang === 'typescript')) {
    return 'node';
  }
  return 'static';
}

export function pickProjectEntryFile(files: VirtualProjectFile[], runtime: ProjectRuntime): string {
  if (files.length === 0) return '';
  const priorityByRuntime: Record<ProjectRuntime, RegExp[]> = {
    php: [/^index\.php$/i, /^public\/index\.php$/i, /^app\.php$/i, /\.php$/i],
    web: [/^index\.html?$/i, /^public\/index\.html?$/i, /\.html?$/i],
    react: [/^src\/App\.tsx$/i, /^App\.tsx$/i, /^src\/index\.tsx$/i, /\.tsx$/i, /\.jsx$/i],
    python: [/^main\.py$/i, /^app\.py$/i, /^server\.py$/i, /\.py$/i],
    node: [/^index\.(ts|js|mjs)$/i, /^server\.(ts|js)$/i, /^app\.(ts|js)$/i, /\.(ts|js)$/i],
    static: [/^README\.md$/i],
  };

  for (const rx of priorityByRuntime[runtime] || []) {
    const match = files.find((f) => rx.test(f.path));
    if (match) return match.path;
  }
  return files[0].path;
}

function inferDefaultFilename(lang: string, existingPaths: Set<string>): string {
  const norm = normalizeArtifactLang(lang);
  const candidates: Record<string, string[]> = {
    php: ['index.php', 'page.php', 'handler.php'],
    html: ['index.html', 'page.html'],
    css: ['styles.css', 'theme.css'],
    tsx: ['src/App.tsx', 'src/Component.tsx'],
    jsx: ['src/App.jsx', 'src/Component.jsx'],
    python: ['app.py', 'main.py'],
    javascript: ['index.js', 'script.js'],
    typescript: ['index.ts', 'module.ts'],
    json: ['config.json', 'data.json'],
    sql: ['schema.sql', 'queries.sql'],
  };
  const pool = candidates[norm] || [`file.${LANG_TO_EXT[norm] || 'txt'}`];
  for (const name of pool) {
    if (!existingPaths.has(name.toLowerCase())) return name;
  }
  const ext = LANG_TO_EXT[norm] || 'txt';
  let idx = 2;
  while (existingPaths.has(`file-${idx}.${ext}`)) idx++;
  return `file-${idx}.${ext}`;
}

function deriveProjectTitle(markdown: string, entryFile: string, runtime: ProjectRuntime): string {
  const headingMatch = markdown.match(/^\s{0,3}#{1,3}\s+([^\n]+)/m);
  if (headingMatch) {
    const cleanHeading = headingMatch[1]
      .replace(/[*_`#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanHeading.length >= 3 && cleanHeading.length <= 64) {
      return cleanHeading;
    }
  }
  if (entryFile) {
    return `${runtime.toUpperCase()} Project (${entryFile})`;
  }
  return `${runtime.toUpperCase()} Project`;
}

/**
 * Extracts a runnable multi-file (or single-file PHP/Python/React/Web) virtual project from AI markdown.
 * Handles explicit `file="path"` fence metadata, preceding headings/labels, and header comments.
 */
export function extractVirtualProject(markdown: string): ExtractedVirtualProject | null {
  if (!markdown || !markdown.includes('```')) return null;

  const blocks = parseAllFenceBlocks(markdown);
  if (blocks.length === 0) return null;

  const filesMap = new Map<string, VirtualProjectFile>();
  const usedLowerPaths = new Set<string>();
  let anyUnclosed = false;

  for (const block of blocks) {
    if (!block.isClosed) anyUnclosed = true;
    if (isDirectoryTreeOrNoiseBlock(block)) continue;
    if (!block.code.trim()) continue;

    const normLang = normalizeArtifactLang(block.rawLang);
    if (normLang === 'mermaid' || normLang === 'supreme-schedule') continue;

    let filePath = extractFilePathForBlock(block);
    const hasExplicitFileRef = Boolean(filePath);

    // Only infer default filenames if:
    // - We already saw file references (multi-file project), OR
    // - It's a standalone runtime file (php / html / tsx / jsx / python) with substantial content
    if (!filePath) {
      const isRunnableSingleLang =
        normLang === 'php' ||
        normLang === 'html' ||
        normLang === 'tsx' ||
        normLang === 'jsx' ||
        normLang === 'python';
      if (!isRunnableSingleLang && blocks.length < 2) continue;
      if (!block.isClosed && block.code.trim().length < 24) continue;
      filePath = inferDefaultFilename(normLang, usedLowerPaths);
    }

    const resolvedLang = inferLangFromProjectPath(filePath, normLang);
    // Avoid overwriting distinct files that lack explicit path by ensuring unique path unless explicitly tagged
    let finalPath = filePath;
    if (!hasExplicitFileRef && usedLowerPaths.has(finalPath.toLowerCase())) {
      finalPath = inferDefaultFilename(resolvedLang, usedLowerPaths);
    }

    usedLowerPaths.add(finalPath.toLowerCase());
    filesMap.set(finalPath, {
      path: finalPath,
      lang: resolvedLang,
      content: block.code,
    });
  }

  const files = Array.from(filesMap.values());
  if (files.length === 0) return null;

  const runtime = detectProjectRuntime(files);
  // Require at least 2 files OR a runnable server/app entry file (php/python/web/react)
  const hasInteractiveAppFile =
    runtime === 'php' ||
    runtime === 'python' ||
    (files.length >= 2 && (runtime === 'web' || runtime === 'react' || runtime === 'node'));

  if (!hasInteractiveAppFile && files.length === 1) {
    // Single html/tsx/js block works seamlessly via standard live preview & single-file scratchpad
    // unless it explicitly carried a file path (e.g. file="index.html").
    const single = blocks.find((b) => !isDirectoryTreeOrNoiseBlock(b));
    const explicit = single ? extractFilePathForBlock(single) : null;
    if (!explicit) return null;
  }

  const entryFile = pickProjectEntryFile(files, runtime);
  const annotatedFiles = files.map((f) => ({
    ...f,
    isEntry: f.path === entryFile,
  }));

  return {
    title: deriveProjectTitle(markdown, entryFile, runtime),
    runtime,
    entryFile,
    files: annotatedFiles,
    isStreaming: anyUnclosed,
  };
}
