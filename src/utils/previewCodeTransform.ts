import { EXTERNAL_URLS } from '../config/externalUrls';

export interface TransformedPreviewCode {
  transformedCode: string;
  externalPackages: string[];
  usesEsmImports: boolean;
  importMapJson: string;
  reactBindings: string[];
}

const CORE_REACT_HOOKS = [
  'useState',
  'useEffect',
  'useRef',
  'useMemo',
  'useCallback',
  'useReducer',
  'useContext',
  'useLayoutEffect',
  'useId',
  'Fragment',
  'forwardRef',
  'memo',
  'createContext',
];

const BUILTIN_REACT_MODULES = new Set([
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
]);

const STYLE_EXTENSION_RE = /\.(css|scss|sass|less|styl)$/i;

export function buildPreviewImportMap(externalPackages: string[]): string {
  const imports: Record<string, string> = {
    react: EXTERNAL_URLS.esmPreviewReact,
    'react/': `${EXTERNAL_URLS.esmPreviewReact}/`,
    'react/jsx-runtime': `${EXTERNAL_URLS.esmPreviewReact}/jsx-runtime`,
    'react/jsx-dev-runtime': `${EXTERNAL_URLS.esmPreviewReact}/jsx-dev-runtime`,
    'react-dom': EXTERNAL_URLS.esmPreviewReactDom,
    'react-dom/': `${EXTERNAL_URLS.esmPreviewReactDom}/`,
    'react-dom/client': `${EXTERNAL_URLS.esmPreviewReactDom}/client`,
  };

  for (const pkg of externalPackages) {
    if (!imports[pkg]) {
      imports[pkg] = `${EXTERNAL_URLS.esmCdnOrigin}/${pkg}?deps=react@18.3.1,react-dom@18.3.1`;
    }
  }

  return JSON.stringify({ imports }, null, 2);
}

function parseNamedBindings(rawSpecifiers: string): string {
  const cleaned = rawSpecifiers
    .replace(/^\{|\}$/g, '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith('type '))
    .map((part) => {
      const noType = part.replace(/^type\s+/, '');
      return noType.replace(/\s+as\s+/g, ': ');
    });
  return cleaned.join(', ');
}

function collectReactNamedSpecifiers(rawClause: string, target: Set<string>): void {
  const namedMatch = rawClause.match(/\{([\s\S]*?)\}/);
  if (!namedMatch) return;
  for (const part of namedMatch[1].split(',')) {
    const clean = part
      .trim()
      .replace(/^type\s+/, '')
      .split(/\s+as\s+/)[0]
      .trim();
    if (clean && /^[A-Za-z_$][\w$]*$/.test(clean)) {
      target.add(clean);
    }
  }
}

export function transformCodeForBrowserPreview(code: string): TransformedPreviewCode {
  const externalSet = new Set<string>();
  const reactSet = new Set<string>(CORE_REACT_HOOKS);
  const dynamicImportPreamble: string[] = [];

  // 1. Strip `import type ... from '...'` cleanly
  let working = code.replace(/^\s*import\s+type\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');

  // 2. Transform `import <clause> from '<pkg>'` (supports multiline clauses)
  working = working.replace(
    /^\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?\s*$/gm,
    (_full, rawClause: string, pkg: string) => {
      const trimmedPkg = pkg.trim();
      const clause = rawClause.trim();

      if (trimmedPkg.startsWith('.') || STYLE_EXTENSION_RE.test(trimmedPkg)) {
        return '';
      }

      if (BUILTIN_REACT_MODULES.has(trimmedPkg)) {
        collectReactNamedSpecifiers(clause, reactSet);
        return '';
      }

      externalSet.add(trimmedPkg);
      const cdnUrl = `${EXTERNAL_URLS.esmCdnOrigin}/${trimmedPkg}?deps=react@18.3.1,react-dom@18.3.1`;

      // Namespace import: `import * as Motion from 'framer-motion'`
      const nsMatch = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
      if (nsMatch) {
        dynamicImportPreamble.push(
          `const ${nsMatch[1]} = await import(${JSON.stringify(cdnUrl)});`
        );
        return '';
      }

      // Combined default + named: `import ReactFoo, { useFoo, bar as baz } from 'pkg'`
      const combinedMatch = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*\{([\s\S]*)\}$/);
      if (combinedMatch) {
        const defaultName = combinedMatch[1];
        const named = parseNamedBindings(combinedMatch[2]);
        const bindings = named ? `default: ${defaultName}, ${named}` : `default: ${defaultName}`;
        dynamicImportPreamble.push(
          `const { ${bindings} } = await import(${JSON.stringify(cdnUrl)});`
        );
        return '';
      }

      // Named only: `import { motion, AnimatePresence } from 'framer-motion'`
      const namedMatch = clause.match(/^\{([\s\S]*)\}$/);
      if (namedMatch) {
        const named = parseNamedBindings(namedMatch[1]);
        if (named) {
          dynamicImportPreamble.push(
            `const { ${named} } = await import(${JSON.stringify(cdnUrl)});`
          );
        }
        return '';
      }

      // Default import: `import confetti from 'canvas-confetti'`
      const defaultMatch = clause.match(/^([A-Za-z_$][\w$]*)$/);
      if (defaultMatch) {
        dynamicImportPreamble.push(
          `const { default: ${defaultMatch[1]} } = await import(${JSON.stringify(cdnUrl)});`
        );
        return '';
      }

      return '';
    }
  );

  // 3. Transform side-effect `import '<pkg>'`
  working = working.replace(/^\s*import\s+['"]([^'"]+)['"];?\s*$/gm, (_full, pkg: string) => {
    const trimmedPkg = pkg.trim();
    if (trimmedPkg.startsWith('.') || STYLE_EXTENSION_RE.test(trimmedPkg)) {
      return '';
    }
    if (BUILTIN_REACT_MODULES.has(trimmedPkg)) {
      return '';
    }
    externalSet.add(trimmedPkg);
    const cdnUrl = `${EXTERNAL_URLS.esmCdnOrigin}/${trimmedPkg}?deps=react@18.3.1,react-dom@18.3.1`;
    dynamicImportPreamble.push(`await import(${JSON.stringify(cdnUrl)});`);
    return '';
  });

  // 4. Neutralize ES module exports so Babel output can mount cleanly inside the preview runner
  working = working
    .replace(/^\s*export\s+type\s+[\s\S]*?;?\s*$/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/export\s+default\s+async\s+function\s+/g, 'const __DefaultExport__ = async function ')
    .replace(/export\s+default\s+function\s+/g, 'const __DefaultExport__ = function ')
    .replace(/export\s+default\s+class\s+/g, 'const __DefaultExport__ = class ')
    .replace(/export\s+default\s+/g, 'const __DefaultExport__ = ')
    .replace(
      /export\s+(const|let|var|function|async\s+function|class|type|interface|enum)\s+/g,
      '$1 '
    );

  const externalPackages = Array.from(externalSet);
  const preambleText =
    dynamicImportPreamble.length > 0 ? `${dynamicImportPreamble.join('\n')}\n\n` : '';

  return {
    transformedCode: `${preambleText}${working.trim()}`,
    externalPackages,
    usesEsmImports: externalPackages.length > 0,
    importMapJson: buildPreviewImportMap(externalPackages),
    reactBindings: Array.from(reactSet),
  };
}
