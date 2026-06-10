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

// Terms banned from public-facing HTML (label, regex)
const BANNED = [
  { label: 'Forge Window (renamed to Studio Pulse)', pattern: /\bForge\s+Window\b/g },
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
  // Verify the gate detects known violations
  const violations = [];
  for (const { pattern } of BANNED) {
    if ('Forge Window is old'.match(pattern)) violations.push('detected');
  }
  console.log(violations.length === BANNED.length ? '✓ self-test passed' : '✗ self-test failed');
  process.exit(violations.length === BANNED.length ? 0 : 1);
}

let errorCount = 0;
for (const file of htmlFiles(ROOT)) {
  const content = readFileSync(file, 'utf8');
  // Skip nav/footer blocks — focus on unique page content
  const pageContent = content.replace(/<nav[\s\S]*?<\/nav>/g, '').replace(/<footer[\s\S]*?<\/footer>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const { label, pattern } of BANNED) {
    const matches = pageContent.match(pattern);
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
