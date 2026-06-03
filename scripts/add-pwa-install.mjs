#!/usr/bin/env node
// add-pwa-install.mjs
// Injects <script defer src="/assets/pwa-install.js"> after the analytics.js
// script tag in every HTML file that has analytics but not pwa-install.
// Run: node scripts/add-pwa-install.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// Pages where the install prompt doesn't add value
const EXCLUDE = new Set([
  'offline.html',
  'vaultfront/404.html',
  'vaultspark-football-gm/404.html',
]);

function walk(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    if (['.git', 'studio-hub', 'node_modules'].includes(entry)) continue;
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, results);
    else if (entry.endsWith('.html')) results.push(abs);
  }
  return results;
}
const files = walk(ROOT).map(abs => abs.slice(ROOT.length + 1).replace(/\\/g, '/'));

let patched = 0;
let skipped = 0;

for (const rel of files) {
  if (EXCLUDE.has(rel)) { skipped++; continue; }

  const abs = join(ROOT, rel);
  const src = readFileSync(abs, 'utf8');

  if (!src.includes('analytics.js')) { skipped++; continue; }
  if (src.includes('pwa-install')) { skipped++; continue; }

  // Match both attribute orders: defer src=... and src=... defer
  const updated = src.replace(
    /(<script[^>]*['"\/]analytics\.js['"][^>]*><\/script>)/,
    '$1\n<script defer src="/assets/pwa-install.js"></script>'
  );

  if (updated === src) { skipped++; continue; }

  writeFileSync(abs, updated, 'utf8');
  console.log(`  patched: ${rel}`);
  patched++;
}

console.log(`\ndone — ${patched} patched, ${skipped} skipped`);
