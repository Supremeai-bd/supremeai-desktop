#!/usr/bin/env node
/**
 * Synchronizes the canonical version from package.json into:
 *  - src-tauri/tauri.conf.json (used by both Desktop and Tauri v2 Android)
 *  - src-tauri/Cargo.toml
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;

if (!version || typeof version !== 'string') {
  console.error('Invalid version in package.json');
  process.exit(1);
}

// 1. Tauri config (Desktop + Android)
const tauriConfPath = path.join(root, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version;
writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);

// 2. Cargo.toml
const cargoPath = path.join(root, 'src-tauri', 'Cargo.toml');
const cargoRaw = readFileSync(cargoPath, 'utf8');
const cargoUpdated = cargoRaw.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
writeFileSync(cargoPath, cargoUpdated);

console.log(`Synchronized Web, Desktop, and Tauri v2 Android to version ${version}`);
