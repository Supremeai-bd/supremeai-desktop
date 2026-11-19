import { describe, it, expect, beforeEach } from 'vitest';
import { extractVirtualProject } from './artifactStreamParser';
import { executeVirtualPhpProject } from './phpPreviewRuntime';
import { bundleMultiFileReactEntry, bundleMultiFileWebProject } from './projectBundler';
import { buildProjectZipUint8Array, slugifyProjectTitle } from './projectZipExport';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

describe('Multi-file Virtual Project Builder & Runtimes', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().clearVirtualProject();
    useWorkspaceStore.getState().setBrowserViewportDevice('desktop');
  });

  describe('extractVirtualProject', () => {
    it('extracts multi-file PHP project using file="..." attributes and filters tree/bash noise', () => {
      const markdown = `
Here is your **Task Tracker PHP App**:

\`\`\`text
/php-app
├── index.php
└── includes/db.php
\`\`\`

\`\`\`php file="includes/db.php"
<?php
$tasks = [
  ['title' => 'Build API', 'status' => 'Done'],
  ['title' => 'Ship Studio', 'status' => 'Active'],
];
?>
\`\`\`

\`\`\`css file="assets/style.css"
body { font-family: sans-serif; background: #0f172a; color: #f8fafc; }
\`\`\`

\`\`\`php file="index.php"
<?php
require_once 'includes/db.php';
$filter = $_GET['filter'] ?? 'all';
?>
<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="assets/style.css"></head>
<body>
  <h1>Tasks (<?php echo $filter; ?>)</h1>
  <ul>
    <?php foreach ($tasks as $task): ?>
      <li><?= $task['title'] ?></li>
    <?php endforeach; ?>
  </ul>
</body>
</html>
\`\`\`

\`\`\`bash
php -S localhost:8000
\`\`\`
`;

      const project = extractVirtualProject(markdown);
      expect(project).not.toBeNull();
      expect(project?.runtime).toBe('php');
      expect(project?.entryFile).toBe('index.php');
      expect(project?.files.map((f) => f.path)).toEqual([
        'includes/db.php',
        'assets/style.css',
        'index.php',
      ]);
    });

    it('detects preceding inline backtick filenames and infers React runtime', () => {
      const markdown = `
### \`src/components/Card.tsx\`
\`\`\`tsx
export function Card({ label }: { label: string }) {
  return <div className="p-4">{label}</div>;
}
\`\`\`

### \`App.tsx\`
\`\`\`tsx
import { Card } from './src/components/Card';
export default function App() {
  return <Card label="Ready" />;
}
\`\`\`
`;
      const project = extractVirtualProject(markdown);
      expect(project).not.toBeNull();
      expect(project?.runtime).toBe('react');
      expect(project?.entryFile).toBe('App.tsx');
      expect(project?.files).toHaveLength(2);
    });
  });

  describe('executeVirtualPhpProject', () => {
    it('executes require_once, loops, $_GET parameters, and inlines local CSS into HTML preview', () => {
      const files = [
        {
          path: 'includes/data.php',
          lang: 'php',
          content: `<?php $items = ['Alpha', 'Beta', 'Gamma']; ?>`,
        },
        {
          path: 'style.css',
          lang: 'css',
          content: `h1 { color: #38bdf8; }`,
        },
        {
          path: 'index.php',
          lang: 'php',
          content: `<?php
require_once 'includes/data.php';
$page = $_GET['page'] ?? 'home';
function greet($name) { return "Hello " . $name; }
?>
<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="style.css"></head>
<body>
  <h1><?= greet($page) ?></h1>
  <ul>
  <?php foreach ($items as $item): ?>
    <li><?php echo $item; ?></li>
  <?php endforeach; ?>
  </ul>
</body>
</html>`,
        },
      ];

      const res = executeVirtualPhpProject({
        files,
        entryPath: 'index.php',
        routeUrl: '/index.php?page=dashboard',
      });

      expect(res.statusCode).toBe(200);
      expect(res.html).toContain('<h1>Hello dashboard</h1>');
      expect(res.html).toContain('<li>Alpha</li>');
      expect(res.html).toContain('<li>Gamma</li>');
      expect(res.html).toContain('h1 { color: #38bdf8; }');
      expect(res.html).toContain('php-navigate');
    });

    it('formats plain PHP CLI output inside a styled terminal preview HTML', () => {
      const res = executeVirtualPhpProject({
        files: [
          {
            path: 'index.php',
            lang: 'php',
            content: `<?php echo "Hello from PHP CLI!\n"; ?>`,
          },
        ],
        entryPath: 'index.php',
      });

      expect(res.statusCode).toBe(200);
      expect(res.html).toContain('Hello from PHP CLI!');
    });
  });

  describe('bundleMultiFileWebProject & bundleMultiFileReactEntry', () => {
    it('inlines relative CSS and JS assets into HTML entry', () => {
      const html = bundleMultiFileWebProject(
        [
          { path: 'css/app.css', lang: 'css', content: 'body { margin: 0; }' },
          { path: 'js/app.js', lang: 'javascript', content: 'console.log("ok");' },
          {
            path: 'index.html',
            lang: 'html',
            content:
              '<!DOCTYPE html><html><head><link rel="stylesheet" href="css/app.css"></head><body><h1>App</h1><script src="js/app.js"></script></body></html>',
          },
        ],
        'index.html'
      );

      expect(html).toContain('data-file="css/app.css"');
      expect(html).toContain('body { margin: 0; }');
      expect(html).toContain('data-file="js/app.js"');
      expect(html).toContain('console.log("ok");');
    });

    it('inlines local React component imports into TSX entry', () => {
      const { combinedCode } = bundleMultiFileReactEntry(
        [
          {
            path: 'components/Badge.tsx',
            lang: 'tsx',
            content: 'export function Badge() { return <span>v1</span>; }',
          },
          {
            path: 'App.tsx',
            lang: 'tsx',
            content:
              'import { Badge } from "./components/Badge";\nexport default function App() { return <Badge />; }',
          },
        ],
        'App.tsx'
      );

      expect(combinedCode).toContain('function Badge()');
      expect(combinedCode).not.toContain('./components/Badge');
      expect(combinedCode).toContain('export default function App');
    });
  });

  describe('buildProjectZipUint8Array', () => {
    it('creates a valid PKZIP archive containing all project file paths', () => {
      const zip = buildProjectZipUint8Array([
        { path: 'index.php', content: '<?php echo "ok"; ?>' },
        { path: 'assets/app.css', content: 'body { color: white; }' },
      ]);

      // Local file header signature PK\x03\x04
      expect(zip[0]).toBe(0x50);
      expect(zip[1]).toBe(0x4b);
      expect(zip[2]).toBe(0x03);
      expect(zip[3]).toBe(0x04);

      // End of central directory signature PK\x05\x06 near end
      const eocdOffset = zip.length - 22;
      expect(zip[eocdOffset]).toBe(0x50);
      expect(zip[eocdOffset + 1]).toBe(0x4b);
      expect(zip[eocdOffset + 2]).toBe(0x05);
      expect(zip[eocdOffset + 3]).toBe(0x06);

      const ascii = new TextDecoder('latin1').decode(zip);
      expect(ascii).toContain('index.php');
      expect(ascii).toContain('assets/app.css');
      expect(slugifyProjectTitle('My PHP App!')).toBe('my-php-app');
    });
  });

  describe('useWorkspaceStore project & mobile viewport actions', () => {
    it('supports creating, updating, deleting files and toggling browser mobile orientation', () => {
      const store = useWorkspaceStore.getState();
      store.syncVirtualProject(
        {
          title: 'Starter PHP',
          runtime: 'php',
          entryFile: 'index.php',
          files: [{ path: 'index.php', lang: 'php', content: '<?php echo "hi"; ?>' }],
        },
        { isFinal: true, autoOpenDock: true }
      );

      expect(useWorkspaceStore.getState().projectFiles).toHaveLength(1);
      expect(useWorkspaceStore.getState().activeDockTab).toBe('preview');

      useWorkspaceStore.getState().createProjectFile('styles.css', 'body{}');
      expect(useWorkspaceStore.getState().projectFiles).toHaveLength(2);
      expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('styles.css');

      useWorkspaceStore.getState().updateProjectFileContent('styles.css', 'body { padding: 8px; }');
      expect(
        useWorkspaceStore.getState().projectFiles.find((f) => f.path === 'styles.css')?.content
      ).toContain('padding: 8px');

      useWorkspaceStore.getState().deleteProjectFile('styles.css');
      expect(useWorkspaceStore.getState().projectFiles).toHaveLength(1);

      useWorkspaceStore.getState().setBrowserViewportDevice('mobile');
      expect(useWorkspaceStore.getState().browserViewportDevice).toBe('mobile');
      useWorkspaceStore.getState().toggleMobileOrientation();
      expect(useWorkspaceStore.getState().mobileOrientation).toBe('landscape');
    });
  });
});
