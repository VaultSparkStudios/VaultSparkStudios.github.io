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
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const WARN_ONLY = process.argv.includes('--warn-only');
const MANIFEST_PATH = path.join(ROOT, 'assets', 'shell-manifest.json');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('shell-manifest.json not found — run `npm run build` first.');
  process.exit(WARN_ONLY ? 0 : 1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const currentPaths = new Set(Object.values(manifest.assets || {}).map((a) => a.path));

// A shell asset is an orphan only if it is referenced NOWHERE — not in the
// current manifest AND not by any tracked surface (HTML/JS/JSON). The manifest
// alone is NOT sufficient (S182): pages that weren't re-propagated after a hash
// rotation still reference older hashes directly, so a manifest-only check
// false-flagged live files as removable — it suggested `git rm` on assets that
// 18-20 pages reference, and never caught 1.18 MB of genuinely-dead ambient
// bundles (which aren't manifest-tracked). Corpus-aware detection fixes both.
const shellPattern = /^(style|theme-toggle|nav-toggle|shell-health|ambient[a-z-]*)\.shell-[a-f0-9]{10}\.(css|js)$/;
const allAssets = fs.readdirSync(path.join(ROOT, 'assets'));
const shellFiles = allAssets.filter((name) => shellPattern.test(name));

let referenced;
try {
  const grep = execSync(
    'git grep -hoE "(style|theme-toggle|nav-toggle|shell-health|ambient[a-z-]*)\\.shell-[a-f0-9]{10}\\.(css|js)" -- "*.html" "*.js" "*.json"',
    { cwd: ROOT, encoding: 'utf8' },
  );
  referenced = new Set([...currentPaths].map((p) => p.replace(/^assets\//, '')));
  for (const hit of grep.split(/\s+/).filter(Boolean)) referenced.add(hit);
} catch {
  // Without the reference corpus, manifest-only detection is unsafe (false
  // positives on pages still on an old hash). Skip rather than mislead.
  console.warn('check-orphan-shell-assets: git grep unavailable — skipping (manifest-only detection is unsafe).');
  process.exit(0);
}

const orphans = shellFiles.filter((name) => !referenced.has(name));

if (orphans.length === 0) {
  console.log('shell assets ✓  no orphans');
  process.exit(0);
}

console.error(`Found ${orphans.length} orphan shell asset${orphans.length === 1 ? '' : 's'} not in shell-manifest.json:`);
for (const o of orphans) console.error('  - assets/' + o);
console.error('\nIf these are confirmed unused, remove with:');
console.error('  git rm ' + orphans.map((o) => 'assets/' + o).join(' '));
process.exit(WARN_ONLY ? 0 : 1);
