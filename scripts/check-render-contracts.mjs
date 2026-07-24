#!/usr/bin/env node
// check-render-contracts.mjs — assert each page listed in data/renderer-contracts.json
// loads its required <script src=...> assets, in the optional declared order.
//
// Drift class this gate catches:
//   S128 — /studio-pulse/ shipped with `studio-pulse-live.js` written but never <script>-tagged,
//   leaving the page in placeholder mode for two weeks until the founder reported it.
//
// Usage:
//   node scripts/check-render-contracts.mjs           # exit 1 on drift
//   node scripts/check-render-contracts.mjs --report  # always exit 0, print summary

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPORT = process.argv.includes('--report');

const contracts = JSON.parse(readFileSync(resolve(ROOT, 'data/renderer-contracts.json'), 'utf8'));
const shellManifestPath = resolve(ROOT, 'assets/shell-manifest.json');
const shellManifest = existsSync(shellManifestPath)
  ? JSON.parse(readFileSync(shellManifestPath, 'utf8'))
  : { assets: {} };
const shellAliases = new Map(
  Object.values(shellManifest.assets || {}).map((asset) => [
    `/${String(asset.source || '').replace(/^\/+/, '')}`,
    `/${String(asset.path || '').replace(/^\/+/, '')}`,
  ])
);

const SCRIPT_TAG_RE = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

// Pattern → matcher. Strings starting with "@" are package-name substrings
// (matched against the script src); others must match the src exactly OR appear as a suffix.
function matchRawSrc(pattern, src) {
  if (pattern.startsWith('@')) return src.includes(pattern);
  if (pattern.startsWith('/')) return src === pattern || src.endsWith(pattern);
  return src === pattern || src.endsWith(pattern);
}

function matchSrc(pattern, src) {
  if (matchRawSrc(pattern, src)) return true;
  const fingerprinted = shellAliases.get(pattern);
  return fingerprinted ? matchRawSrc(fingerprinted, src) : false;
}

let failures = 0;
const log = [];

for (const c of contracts.contracts) {
  const pagePath = resolve(ROOT, c.page);
  let html;
  try {
    html = readFileSync(pagePath, 'utf8');
  } catch {
    log.push(`✗ MISSING_PAGE ${c.page}`);
    failures++;
    continue;
  }

  const srcs = [];
  let m;
  SCRIPT_TAG_RE.lastIndex = 0;
  while ((m = SCRIPT_TAG_RE.exec(html))) srcs.push(m[1]);

  // Presence check
  const missing = c.requires.filter((req) => !srcs.some((s) => matchSrc(req, s)));
  if (missing.length) {
    log.push(`✗ ${c.page} MISSING [${missing.join(', ')}]`);
    failures++;
    continue;
  }

  // Order check (if declared)
  if (Array.isArray(c.order) && c.order.length > 1) {
    const indices = c.order.map((req) => srcs.findIndex((s) => matchSrc(req, s)));
    const sorted = [...indices].sort((a, b) => a - b);
    const isOrdered = indices.every((v, i) => v === sorted[i]);
    if (!isOrdered) {
      log.push(`✗ ${c.page} WRONG_ORDER expected [${c.order.join(' → ')}] got indices [${indices.join(', ')}]`);
      failures++;
      continue;
    }
  }

  log.push(`✓ ${c.page} (${c.requires.length} required)`);
}

console.log('check-render-contracts · data/renderer-contracts.json');
console.log('─'.repeat(60));
for (const line of log) console.log('  ' + line);
console.log('─'.repeat(60));
if (failures === 0) {
  console.log(`✓ all ${contracts.contracts.length} render contracts satisfied`);
  process.exit(0);
}
console.log(`✗ ${failures} contract violation(s)`);
process.exit(REPORT ? 0 : 1);
