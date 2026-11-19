import { readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const { GITHUB_REPOSITORY, RELEASE_TAG } = process.env;
if (!GITHUB_REPOSITORY || !['latest', `v${version}`].includes(RELEASE_TAG)) {
  throw new Error('Expected GITHUB_REPOSITORY and a RELEASE_TAG matching package.json (or latest).');
}

const artifactDir = 'release-artifacts/release-desktop-windows';
const installers = readdirSync(artifactDir, { recursive: true })
  .filter((file) => file.endsWith(`_${version}_x64-setup.exe`));
if (installers.length !== 1) {
  throw new Error(`Expected exactly one NSIS x64 installer for ${version}; found ${installers.length}.`);
}
// GitHub normalizes spaces in asset filenames to dots on upload.
const installer = join(artifactDir, installers[0]);
const asset = basename(installer).replace(/[^a-zA-Z0-9_@+.-]/g, '.');
if (basename(installer) !== asset) renameSync(installer, join(dirname(installer), asset));
const manifest = {
  version,
  notes: 'SupremeAI Studio Unified Monorepo release (Web + Desktop + Android)',
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      url: `https://github.com/${GITHUB_REPOSITORY}/releases/download/${RELEASE_TAG}/${encodeURIComponent(asset)}`,
    },
  },
};
writeFileSync('latest-desktop.json', `${JSON.stringify(manifest, null, 2)}\n`);
