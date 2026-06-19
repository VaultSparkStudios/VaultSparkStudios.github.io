#!/usr/bin/env node
// check-vocabulary-consistency.mjs — fail if deprecated vocabulary appears in public HTML.
// Prevents "Forge Window" from re-entering after the Studio Pulse rename.
//
// Usage: node scripts/check-vocabulary-consistency.mjs
//        node scripts/check-vocabulary-consistency.mjs --self-test
// Wired into: npm run build:check

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');

// Terms banned from public-facing HTML (label, regex, scanFooter?)
// scanFooter:true scans the FULL document (nav + footer included) — required for
// structural status vocab that lives in the shared footer legend. Without it the
// footer is stripped (default) so a banned prose term doesn't fire once per page.
// D-S208: SEALED was retired as a lifecycle status (folds into VAULTED, D-S207.9).
// S207's closeout claimed "purged sitewide" but the footer legend rendered it on
// 89 pages — this gate strips the footer, so it never caught the lie. These precise
// patterns match the retired *status label* only (class + exact legend text + the
// all-caps standalone status badge) and will NOT false-positive on legitimate
// "sealed" brand prose (Canon's "sealed record", narrative flavor, offline page).
const BANNED = [
  { label: 'Forge Window (renamed to Studio Pulse)', pattern: /\bForge\s+Window\b/g },
  { label: 'SEALED status legend class (retired — use VAULTED)', pattern: /legend-status-sealed/g, scanFooter: true },
  { label: 'SEALED status legend text (retired — use VAULTED)', pattern: /SEALED\s+&mdash;\s+Vault sealed|SEALED — Vault sealed/g, scanFooter: true },
  { label: 'SEALED standalone status badge (retired — use VAULTED)', pattern: /<span[^>]*>\s*SEALED\s*<\/span>/g, scanFooter: true },
];

// HTML files to scan — skip generated/internal dirs
const SKIP_DIRS = new Set(['node_modules', '.git', '.cache', 'context', 'scripts', 'docs', 'logs', 'data']);

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

if (SELF_TEST) {
  // Verify each banned pattern detects a known violation, and that legitimate
  // "sealed" brand prose does NOT trip the status-vocab patterns.
  const fixtures = {
    'Forge Window (renamed to Studio Pulse)': 'Forge Window is old',
    'SEALED status legend class (retired — use VAULTED)': '<span class="legend-status-sealed">x</span>',
    'SEALED status legend text (retired — use VAULTED)': '<span>⬡ SEALED — Vault sealed</span>',
    'SEALED standalone status badge (retired — use VAULTED)': '<span class="vs-sealed-label">SEALED</span>',
  };
  // These must NOT match any status pattern (legitimate brand/product/narrative prose).
  const safe = ['a sealed record of who you are', 'the vault is sealed', 'sealed lore drops', 'vaulted again to hold their charge'];
  let pass = 0;
  for (const { label, pattern } of BANNED) {
    pattern.lastIndex = 0;
    if (fixtures[label] && pattern.test(fixtures[label])) pass++;
    else console.error(`✗ self-test: "${label}" failed to detect its fixture`);
  }
  let falsePos = 0;
  for (const { label, pattern, scanFooter } of BANNED) {
    if (!scanFooter) continue; // only status-vocab patterns are tested against safe prose
    for (const s of safe) { pattern.lastIndex = 0; if (pattern.test(s)) { falsePos++; console.error(`✗ self-test: "${label}" false-positived on "${s}"`); } }
  }
  const ok = pass === BANNED.length && falsePos === 0;
  console.log(ok ? `✓ self-test passed (${pass}/${BANNED.length} detect, 0 false-positives)` : '✗ self-test failed');
  process.exit(ok ? 0 : 1);
}

let errorCount = 0;
for (const file of htmlFiles(ROOT)) {
  const content = readFileSync(file, 'utf8');
  // Default pass: skip nav/footer/comments — focus on unique page prose so a banned
  // term in the shared footer doesn't fire once per page.
  const pageContent = content.replace(/<nav[\s\S]*?<\/nav>/g, '').replace(/<footer[\s\S]*?<\/footer>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const { label, pattern, scanFooter } of BANNED) {
    pattern.lastIndex = 0;
    const target = scanFooter ? content : pageContent; // structural status vocab is checked against the FULL doc
    const matches = target.match(pattern);
    if (matches) {
      console.error(`✗ ${relative(ROOT, file)}: "${label}" (${matches.length} occurrences)`);
      errorCount++;
    }
  }
}

if (errorCount === 0) {
  console.log('✓ vocabulary-consistency: no deprecated terms found');
  process.exit(0);
} else {
  console.error(`✗ vocabulary-consistency: ${errorCount} file(s) with deprecated terms — fix before push`);
  process.exit(1);
}
