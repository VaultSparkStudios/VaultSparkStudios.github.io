#!/usr/bin/env node
/**
 * inject-new-scripts.mjs — one-shot S87 sweep.
 *
 * Injects three site-wide script tags just before </body>:
 *   - /assets/native-feel.js    (View Transitions + haptics + Web Share — safe everywhere)
 *   - /assets/ignis-lens.js     (bottom-right Ask IGNIS pill — self-suppresses on portals)
 *   - /assets/schema-injector.js (runtime VideoGame/FAQ/BreadcrumbList JSON-LD — no-op w/o data attrs)
 *
 * Idempotent: skips files that already reference each asset. Safe to re-run.
 */
import fs from 'node:fs';
import path from 'node:path';

const NEW_SCRIPTS = [
  '<script src="/assets/native-feel.js" defer></script>',
  '<script src="/assets/ignis-lens.js" defer></script>',
  '<script src="/assets/schema-injector.js" defer></script>',
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'playwright-report', 'test-results', '.cache', 'dist']);
const SKIP_FILES = new Set([
  'open-source/index.html',
  'google-site-verification-REPLACE_ME.html',
  '404.html',
  'offline.html',
]);

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
      continue;
    }
    if (entry.name.endsWith('.html')) out.push(path.join(dir, entry.name));
  }
}

const root = process.cwd();
const files = [];
walk(root, files);

let changed = 0;
let alreadyHas = 0;
let skipped = 0;

for (const abs of files) {
  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (SKIP_FILES.has(rel)) { skipped++; continue; }

  let html = fs.readFileSync(abs, 'utf8');
  if (!html.includes('</body>')) { skipped++; continue; }

  const missing = NEW_SCRIPTS.filter((s) => {
    const m = s.match(/src="([^"]+)"/);
    return !m || !html.includes(m[1]);
  });
  if (!missing.length) { alreadyHas++; continue; }

  // Insert just before the FIRST </body> (handles pages with stray </body> in comments/strings).
  const block = missing.join('\n') + '\n</body>';
  const idx = html.indexOf('</body>');
  const next = html.slice(0, idx) + block + html.slice(idx + '</body>'.length);
  if (next === html) { skipped++; continue; }
  fs.writeFileSync(abs, next, 'utf8');
  changed++;
}

console.log('changed: ' + changed + '  already-has: ' + alreadyHas + '  skipped: ' + skipped);
