#!/usr/bin/env node
/**
 * check-orphan-shell-assets.mjs — Detect `assets/*.shell-<hash>.*` files
 * that the current `assets/shell-manifest.json` no longer references.
 *
 * Each build of a fingerprinted shell asset leaves the prior hash on disk.
 * Over time these stale variants accumulate, inflate the repo, and risk
 * stale cache hits if CDN caches pick up the wrong path. This check runs
 * in build:check, surfaces orphans, and exits 1 when any exist (so the
 * founder can decide whether to remove them in-session — we never
 * auto-delete, because checked-in files may still be referenced by
 * out-of-band surfaces).
 *
 * Usage:
 *   node scripts/check-orphan-shell-assets.mjs
 *   node scripts/check-orphan-shell-assets.mjs --warn-only   # exit 0 even if found
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const WARN_ONLY = process.argv.includes('--warn-only');
const MANIFEST_PATH = path.join(ROOT, 'assets', 'shell-manifest.json');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('shell-manifest.json not found — run `npm run build` first.');
  process.exit(WARN_ONLY ? 0 : 1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const currentPaths = new Set(Object.values(manifest.assets || {}).map((a) => a.path));

const pattern = /^(style|theme-toggle|nav-toggle|shell-health)\.shell-[a-f0-9]{10}\.(css|js)$/;

const orphans = fs.readdirSync(path.join(ROOT, 'assets'))
  .filter((name) => pattern.test(name))
  .filter((name) => !currentPaths.has(`assets/${name}`));

if (orphans.length === 0) {
  console.log('shell assets ✓  no orphans');
  process.exit(0);
}

console.error(`Found ${orphans.length} orphan shell asset${orphans.length === 1 ? '' : 's'} not in shell-manifest.json:`);
for (const o of orphans) console.error('  - assets/' + o);
console.error('\nIf these are confirmed unused, remove with:');
console.error('  git rm ' + orphans.map((o) => 'assets/' + o).join(' '));
process.exit(WARN_ONLY ? 0 : 1);
