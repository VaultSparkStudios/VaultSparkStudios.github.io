#!/usr/bin/env node
/**
 * inject-main-content-id.mjs
 *
 * Every page ships a sitewide skip link (`<a class="skip-link" href="#main-content">`),
 * but 28 pages carried a bare `<main>` with no `id="main-content"` target — so the
 * skip link resolved to nothing (axe `skip-link` → "No skip link target"), a real
 * keyboard/screen-reader failure that also drags the Lighthouse accessibility score
 * on those routes (surfaced on /games/ at S280).
 *
 * This injector guarantees the target: for every git-tracked HTML page that has the
 * skip link AND whose `<main>` lacks an id, it adds `id="main-content"` to the first
 * such `<main>`. Idempotent. Runs in `npm run build` (after generators, so generated
 * pages are covered) and gates drift in build:check via `--check`.
 *
 * Modes:
 *   (default)   apply — write the id into any page missing it; report count
 *   --check     exit 1 if any page still needs it (drift gate); no writes
 *   --self-test synthetic fixtures; exit 0/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from './lib/safe-spawn.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

const SKIP_TARGET = 'main-content';
const HAS_SKIP_LINK = /href=["']#main-content["']/i;
const HAS_TARGET_ID = /id=["']main-content["']/i;
// First <main ...> whose attributes do NOT already contain an id.
const BARE_MAIN = /<main\b((?:(?!id=)[^>])*)>/i;

/**
 * Returns the transformed HTML plus whether a change was made. A page needs the id
 * only when it carries the skip link to #main-content but has no element already
 * bearing that id; we then stamp the first id-less <main>.
 */
export function ensureMainContentId(html) {
  if (!HAS_SKIP_LINK.test(html)) return { html, changed: false, reason: 'no-skip-link' };
  if (HAS_TARGET_ID.test(html)) return { html, changed: false, reason: 'already-present' };
  if (!BARE_MAIN.test(html)) return { html, changed: false, reason: 'no-bare-main' };
  const next = html.replace(BARE_MAIN, (m, attrs) => `<main id="${SKIP_TARGET}"${attrs}>`);
  return { html: next, changed: next !== html, reason: 'injected' };
}

function gitTrackedHtml() {
  const out = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

function runSelfTest() {
  const cases = [
    // bare <main> + skip link → injected
    ['<a class="skip-link" href="#main-content">s</a><main>x</main>',
      (r) => r.changed && /<main id="main-content">/.test(r.html)],
    // <main> with attrs but no id → id added, attrs preserved
    ['<a href="#main-content">s</a><main class="wrap" data-x="1">x</main>',
      (r) => r.changed && /<main id="main-content" class="wrap" data-x="1">/.test(r.html)],
    // already has id=main-content (on main) → no change
    ['<a href="#main-content">s</a><main id="main-content">x</main>',
      (r) => !r.changed && r.reason === 'already-present'],
    // target id present on a different element → no double-inject
    ['<a href="#main-content">s</a><div id="main-content"></div><main>x</main>',
      (r) => !r.changed && r.reason === 'already-present'],
    // no skip link → never force an id
    ['<main>x</main>',
      (r) => !r.changed && r.reason === 'no-skip-link'],
    // main already carries a different id → left alone (BARE_MAIN won't match)
    ['<a href="#main-content">s</a><main id="other">x</main>',
      (r) => !r.changed && r.reason === 'no-bare-main'],
    // idempotent: re-running the injected output is a no-op
    ['<a href="#main-content">s</a><main>x</main>',
      (r) => ensureMainContentId(r.html).changed === false],
  ];
  let failed = 0;
  for (const [input, ok] of cases) {
    const res = ensureMainContentId(input);
    const pass = ok(res);
    console.log(`  ${pass ? 'ok' : 'FAIL'} ${res.reason}`);
    if (!pass) failed += 1;
  }
  console.log(`inject-main-content-id --self-test: ${cases.length - failed}/${cases.length}`);
  process.exit(failed ? 1 : 0);
}

if (SELF_TEST) runSelfTest();

const files = gitTrackedHtml();
const needing = [];
let written = 0;
for (const rel of files) {
  const abs = path.join(ROOT, rel);
  let html;
  try {
    html = fs.readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  const res = ensureMainContentId(html);
  if (!res.changed) continue;
  needing.push(rel);
  if (!CHECK) {
    fs.writeFileSync(abs, res.html);
    written += 1;
  }
}

if (CHECK) {
  if (needing.length) {
    console.error(`inject-main-content-id --check: ${needing.length} page(s) missing the #main-content skip target`);
    for (const rel of needing.slice(0, 20)) console.error(`  - ${rel}`);
    console.error('  fix: node scripts/inject-main-content-id.mjs');
    process.exit(1);
  }
  console.log(`inject-main-content-id --check: ok (${files.length} page(s) — every skip link has its target)`);
  process.exit(0);
}

console.log(`inject-main-content-id: ${written} page(s) stamped with id="main-content" (${files.length} scanned)`);
