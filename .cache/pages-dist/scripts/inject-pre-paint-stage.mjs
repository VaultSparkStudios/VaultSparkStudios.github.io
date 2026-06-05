#!/usr/bin/env node
/**
 * inject-pre-paint-stage.mjs (S163 audit #7 · pre-paint-stage-lib)
 *
 * Inlines assets/lib/pre-paint-stage.js (the canonical source) into each consumer
 * page's <head> between markers, keeping the no-flash pre-paint snippet in ONE
 * place while it still ships inline (render-blocking by design). Removes the
 * copy-paste drift risk on a load-bearing CLS-safe pattern.
 *
 * Marker block (must already exist in the page <head>):
 *   <!-- pre-paint-stage:start -->
 *   <script>...inlined lib body...</script>
 *   <!-- pre-paint-stage:end -->
 *
 * Idempotent: re-running rewrites the block to match the lib. `--check` exits 1
 * if any consumer has drifted (wired into build:check).
 *
 * Consumers are declared below — add a page here (with the marker block) to give
 * it pre-paint personalization for free.
 *
 * Usage:
 *   node scripts/inject-pre-paint-stage.mjs            # write
 *   node scripts/inject-pre-paint-stage.mjs --check     # exit 1 on drift
 *   node scripts/inject-pre-paint-stage.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LIB = path.join(ROOT, 'assets', 'lib', 'pre-paint-stage.js');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

const START = '<!-- pre-paint-stage:start -->';
const END = '<!-- pre-paint-stage:end -->';

// Consumer pages that opt into pre-paint journey staging. Each must already
// contain the marker block. vaultsparked/ can join once it has the bespoke CSS
// to consume data-journey-stage (deferred — don't stamp a no-op attribute).
const CONSUMERS = ['membership/index.html'];

/** Build the canonical inline block from the lib body. */
function blockFromLib(libBody) {
  return `${START}\n  <script>\n${libBody.trimEnd()}\n  </script>\n  ${END}`;
}

/** Pure: replace the marker block in `html` with `block`. Returns null if no markers. */
function replaceBlock(html, block) {
  const re = new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  if (!re.test(html)) return null;
  return html.replace(re, block);
}

if (SELF_TEST) {
  const lib = '(function(){ document.documentElement.setAttribute("data-journey-stage","curious"); })();';
  const block = blockFromLib(lib);
  const cases = [
    ['block contains markers', block.includes(START) && block.includes(END)],
    ['block wraps lib in script', block.includes('<script>') && block.includes('data-journey-stage')],
    ['replaceBlock swaps existing block', (() => {
      const html = `<head>${START}\n<script>OLD</script>\n${END}</head>`;
      const out = replaceBlock(html, block);
      return out && !out.includes('OLD') && out.includes('data-journey-stage');
    })()],
    ['replaceBlock returns null without markers', replaceBlock('<head>no markers</head>', block) === null],
    ['idempotent: second replace is a no-op', (() => {
      const html = `<head>${START}\n<script>OLD</script>\n${END}</head>`;
      const once = replaceBlock(html, block);
      const twice = replaceBlock(once, block);
      return once === twice;
    })()],
  ];
  let pass = 0, fail = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); ok ? pass++ : fail++; }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

if (!fs.existsSync(LIB)) {
  console.error('inject-pre-paint-stage: assets/lib/pre-paint-stage.js missing');
  process.exit(1);
}
const libBody = fs.readFileSync(LIB, 'utf8');
const block = blockFromLib(libBody);

let drift = 0;
let wrote = 0;
const missing = [];
for (const rel of CONSUMERS) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { missing.push(rel); continue; }
  const html = fs.readFileSync(abs, 'utf8');
  const next = replaceBlock(html, block);
  if (next === null) { missing.push(`${rel} (no marker block)`); continue; }
  if (next !== html) {
    if (CHECK) { drift++; console.error(`  ✗ drift: ${rel}`); }
    else { fs.writeFileSync(abs, next); wrote++; console.log(`  ✓ inlined → ${rel}`); }
  }
}

if (missing.length) {
  console.error(`inject-pre-paint-stage: ${missing.length} consumer(s) missing or lacking markers:`);
  for (const m of missing) console.error(`  • ${m}`);
  process.exit(1);
}
if (CHECK) {
  if (drift) { console.error(`\n✗ ${drift} consumer(s) drifted from canonical lib — run: node scripts/inject-pre-paint-stage.mjs`); process.exit(1); }
  console.log(`inject-pre-paint-stage --check: ✓ ${CONSUMERS.length} consumer(s) in sync`);
  process.exit(0);
}
console.log(`inject-pre-paint-stage: ${wrote} updated, ${CONSUMERS.length - wrote} already in sync`);
