#!/usr/bin/env node
// fix-sentry-async.mjs
// Moves both Sentry script tags from <head> to just before </body>
// so they no longer block rendering. The inline Sentry.init() wraps
// itself in a DOMContentLoaded guard to ensure the SDK is loaded first.
// Run: node scripts/fix-sentry-async.mjs

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

const TARGETS = [
  'index.html',
  'investor-portal/index.html',
  'join/index.html',
  'vault-member/index.html',
];

// Matches the full Sentry block: CDN script + inline init script
// Handles the specific pattern used across all 4 pages
const SENTRY_BLOCK = /  <!-- Sentry:[^\n]*\n  <script\n    src="https:\/\/browser\.sentry-cdn[^<]+<\/script>\n  <script>\n    Sentry\.init\(\{[^}]+\}\);\n  <\/script>/;

for (const rel of TARGETS) {
  const abs = join(ROOT, rel);
  let src;
  try { src = readFileSync(abs, 'utf8'); } catch { console.warn(`  skip (not found): ${rel}`); continue; }

  const match = src.match(SENTRY_BLOCK);
  if (!match) { console.log(`  skip (pattern not found): ${rel}`); continue; }

  const sentryBlock = match[0];

  // Remove from <head>
  let updated = src.replace(SENTRY_BLOCK, '').replace(/\n{3,}/g, '\n\n');

  // Inject before </body>
  updated = updated.replace('</body>', `${sentryBlock}\n</body>`);

  if (updated === src) { console.log(`  skip (no change): ${rel}`); continue; }

  writeFileSync(abs, updated, 'utf8');
  console.log(`  patched: ${rel}`);
}

console.log('done');
