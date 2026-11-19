import { Suspense, lazy } from 'react';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

export interface CodeViewerProps {
  value: string;
  language?: string;
  theme?: 'dark' | 'light';
  onChange?: (value: string) => void;
}

export function CodeViewer({
  value,
  language = 'typescript',
  theme = 'dark',
  onChange,
}: CodeViewerProps) {
  return (
    <Suspense
      fallback={
        <div className="h-full w-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 font-mono">
          Loading editor…
        </div>
      }
    >
      <MonacoEditor
        height="100%"
        language={language}
        value={value}
        onChange={(v) => onChange?.(v ?? '')}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 12 },
        }}
      />
    </Suspense>
  );
}
