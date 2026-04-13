#!/usr/bin/env node
/**
 * verify-sw-assets.mjs — Verify every STATIC_ASSETS entry in sw.js
 * exists as a real file or directory on disk.
 *
 * Usage:
 *   node scripts/verify-sw-assets.mjs
 *
 * Exit codes:
 *   0 — all assets present
 *   1 — one or more assets missing (list printed to stdout)
 */

import { existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');

// Extract STATIC_ASSETS array from sw.js without importing it (it's not an ES module).
import { readFileSync } from 'fs';

const swSrc = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const match = swSrc.match(/const STATIC_ASSETS\s*=\s*\[([\s\S]*?)\];/);
if (!match) {
  console.error('ERROR: Could not parse STATIC_ASSETS from sw.js');
  process.exit(1);
}

// Parse the array entries — strip comments, extract quoted strings.
const raw = match[1];
const entries = [];
for (const m of raw.matchAll(/'([^']+)'/g)) {
  entries.push(m[1]);
}

let missing = 0;
let ok = 0;

for (const asset of entries) {
  // Convert URL path to filesystem path.
  // '/' → index.html  |  '/assets/style.css' → assets/style.css
  // '/vault-member/' → vault-member/index.html
  let rel = asset.startsWith('/') ? asset.slice(1) : asset;

  // Trailing slash → directory index
  if (rel.endsWith('/') || rel === '') {
    rel = rel + 'index.html';
  }

  const full = join(ROOT, rel);
  if (!existsSync(full)) {
    console.log(`MISSING  ${asset}  →  ${rel}`);
    missing++;
  } else {
    ok++;
  }
}

console.log(`\nChecked: ${ok + missing}  ·  OK: ${ok}  ·  Missing: ${missing}`);

if (missing > 0) {
  console.error(`\nERROR: ${missing} asset(s) listed in STATIC_ASSETS do not exist on disk.`);
  console.error('       Either create the file or remove the entry from sw.js.');
  process.exit(1);
} else {
  console.log('All STATIC_ASSETS verified ✓');
}
