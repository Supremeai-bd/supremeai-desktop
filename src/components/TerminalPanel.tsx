import { useEffect, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import type { WorkspaceFile } from '../types/studio';

export interface TerminalPanelProps {
  files: WorkspaceFile[];
  activeModelName: string;
  gatewayStatus: string;
  runtimeLabel: string;
  theme: 'dark' | 'light';
}

export function TerminalPanel({
  files,
  activeModelName,
  gatewayStatus,
  runtimeLabel,
  theme,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ files, activeModelName, gatewayStatus, runtimeLabel });
  stateRef.current = { files, activeModelName, gatewayStatus, runtimeLabel };

  useEffect(() => {
    let disposed = false;
    let term: import('@xterm/xterm').Terminal | null = null;
    let fit: import('@xterm/addon-fit').FitAddon | null = null;
    let observer: ResizeObserver | null = null;

    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ]);
      if (disposed || !containerRef.current) return;

      term = new Terminal({
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        lineHeight: 1.45,
        theme:
          theme === 'dark'
            ? {
                background: '#091121',
                foreground: '#e2e8f0',
                cursor: '#38bdf8',
                selectionBackground: 'rgba(56, 189, 248, 0.25)',
              }
            : {
                background: '#f8fafc',
                foreground: '#0f172a',
                cursor: '#0284c7',
                selectionBackground: 'rgba(2, 132, 199, 0.2)',
              },
      });
      fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      const promptStr = '\x1b[36msupremeai\x1b[0m \x1b[90m~/studio\x1b[0m $ ';
      const writePrompt = () => term?.write(`\r\n${promptStr}`);

      term.writeln('\x1b[1;36mSupremeAI Studio Desktop Console\x1b[0m');
      term.writeln('Type \x1b[33mhelp\x1b[0m to view available workspace commands.');
      term.write(promptStr);

      let lineBuffer = '';

      const runCommand = (raw: string) => {
        if (!term) return;
        const trimmed = raw.trim();
        const [cmd, ...args] = trimmed.split(/\s+/);
        const snap = stateRef.current;

        if (!cmd) return;
        if (cmd === 'help') {
          term.writeln('\r\nAvailable commands:');
          term.writeln('  help      Show this list');
          term.writeln('  status    Show desktop runtime, gateway, and active model');
          term.writeln('  ls        List files open in Workspace Dock');
          term.writeln('  cat <f>   Print a workspace file');
          term.writeln('  version   Print SupremeAI Studio Desktop version');
          term.writeln('  clear     Clear terminal output');
        } else if (cmd === 'status') {
          term.writeln(`\r\nRuntime : ${snap.runtimeLabel}`);
          term.writeln(`Gateway : ${snap.gatewayStatus}`);
          term.writeln(`Model   : ${snap.activeModelName}`);
          term.writeln(`Files   : ${snap.files.length} workspace file(s)`);
        } else if (cmd === 'ls') {
          term.writeln('');
          snap.files.forEach((f) =>
            term?.writeln(`  ${f.name.padEnd(22)} ${f.language.padEnd(12)} ${f.content.length} B`)
          );
        } else if (cmd === 'cat') {
          const target = args[0];
          const found = snap.files.find((f) => f.name === target);
          if (!found) {
            term.writeln(`\r\ncat: ${target || '(missing filename)'}: no such workspace file`);
          } else {
            term.writeln('');
            found.content.split('\n').slice(0, 40).forEach((l) => term?.writeln(l));
          }
        } else if (cmd === 'version') {
          term.writeln(`\r\nSupremeAI Studio Desktop v${__APP_VERSION__}`);
        } else if (cmd === 'clear') {
          term.clear();
        } else {
          term.writeln(`\r\nUnknown command: ${cmd}. Type "help" for workspace commands.`);
        }
      };

      term.onData((data) => {
        if (!term) return;
        if (data === '\r') {
          runCommand(lineBuffer);
          lineBuffer = '';
          writePrompt();
        } else if (data === '\u007F') {
          if (lineBuffer.length > 0) {
            lineBuffer = lineBuffer.slice(0, -1);
            term.write('\b \b');
          }
        } else if (data >= ' ') {
          lineBuffer += data;
          term.write(data);
        }
      });

      observer = new ResizeObserver(() => {
        try {
          fit?.fit();
        } catch {
          // Ignore fit errors during panel collapse
        }
      });
      observer.observe(containerRef.current);
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      term?.dispose();
    };
  }, [theme]);

  return <div ref={containerRef} className="h-full w-full p-2 overflow-hidden" />;
}
