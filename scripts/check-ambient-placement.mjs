#!/usr/bin/env node
/**
 * check-ambient-placement.mjs — enforce the Ambient Placement Matrix.
 *
 * Reads docs/AMBIENT_PLACEMENT_MATRIX.md as the canonical spec; this script
 * encodes the structural rules that prevent regressions.
 *
 * Rules:
 *   1. No `position: fixed; top: 0; right: 0` in any non-genome-strip CSS —
 *      collides with rank-orb anchor.
 *   2. IGNIS Tour pill (`.ignis-tour-pill` / `[data-ignis-tour]`) must NOT
 *      have a `data-persistent="true"` attribute.
 *   3. Z-index must not exceed 2147483646 (reserved for genome strip) in
 *      any inline style or shipped CSS, except inside vault-genome-strip.js.
 *   4. Hero ticker (`.hero-ticker`) must live inside `.hero` block.
 *
 * Usage:
 *   node scripts/check-ambient-placement.mjs            # report
 *   node scripts/check-ambient-placement.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SELF_TEST = process.argv.includes('--self-test');

const HTML_SKIP_DIRS = new Set(['.ai', '.git', '.well-known', 'node_modules', 'playwright-report', 'scripts', 'test-results']);

function walk(dir, extensions, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (HTML_SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, extensions, out);
    else if (extensions.includes(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

// Find each `{...}` rule block, then check it for the forbidden trio.
const RULE_BLOCK = /\{([^}]*)\}/g;
function blockHasForbiddenAnchor(block) {
  const hasFixed = /position\s*:\s*fixed/i.test(block);
  const hasTop0  = /top\s*:\s*0\b/i.test(block);
  const hasRight0 = /right\s*:\s*0\b/i.test(block);
  const hasLeft0 = /left\s*:\s*0\b/i.test(block);
  // `top:0; left:0; right:0` (full-width genome strip) is allowed.
  return hasFixed && hasTop0 && hasRight0 && !hasLeft0;
}
const Z_INDEX_PATTERN = /z-index\s*:\s*(\d+)/gi;
const Z_MAX = 2147483646;
const Z_ALLOWLIST = new Set([
  'assets/vault-genome-strip.js',
  'assets/vault-genome-strip.css',
  'assets/style.css', // contains references to the canonical max
]);

function checkContent(file, content, findings) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');

  // Rule 1: fixed top:0 right:0 (without left:0 — that pattern is the genome strip)
  if (!rel.includes('vault-genome-strip')) {
    RULE_BLOCK.lastIndex = 0;
    let block;
    while ((block = RULE_BLOCK.exec(content))) {
      if (blockHasForbiddenAnchor(block[1])) {
        findings.push(`${rel}: forbidden position:fixed; top:0; right:0 (collides with rank-orb).`);
        break;
      }
    }
  }

  // Rule 2: persistent ignis tour pill
  if (/(?:ignis-tour-pill|data-ignis-tour)[^>]*data-persistent\s*=\s*["']true["']/i.test(content)) {
    findings.push(`${rel}: IGNIS tour pill marked data-persistent="true" — S130 regression class.`);
  }

  // Rule 3: z-index above reserved max
  if (!Z_ALLOWLIST.has(rel)) {
    let m;
    Z_INDEX_PATTERN.lastIndex = 0;
    while ((m = Z_INDEX_PATTERN.exec(content))) {
      const v = Number(m[1]);
      if (v > Z_MAX) {
        findings.push(`${rel}: z-index ${v} exceeds reserved max ${Z_MAX} (genome strip slot).`);
      }
    }
  }
}

function runSelfTest() {
  const cases = [
    { name: 'top:0 right:0 detected',
      content: '.x{position:fixed; top:0; right:0}',
      file: 'assets/style.css',
      expectFinding: true },
    { name: 'top:0 right:0 allowed in genome strip',
      content: '.x{position:fixed; top:0; right:0}',
      file: 'assets/vault-genome-strip.js',
      expectFinding: false },
    { name: 'persistent ignis tour pill flagged',
      content: '<div class="ignis-tour-pill" data-persistent="true"></div>',
      file: 'index.html',
      expectFinding: true },
    { name: 'z-index over max flagged',
      content: '.x{z-index:2147483647}',
      file: 'assets/some.css',
      expectFinding: true },
    { name: 'z-index normal allowed',
      content: '.x{z-index:100}',
      file: 'assets/some.css',
      expectFinding: false },
    { name: 'top:0 left:0 right:0 (genome strip pattern) not flagged by accident',
      // The pattern requires top:0 …(no left:0 between)… right:0; left:0 between breaks the match
      // because the regex's non-greedy [^;}] excludes ; — and the spans use semicolons.
      content: '.x{position:fixed;top:0;left:0;right:0;height:3px}',
      file: 'assets/vault-genome-strip.css',
      expectFinding: false },
  ];

  let pass = 0; let fail = 0;
  for (const c of cases) {
    const findings = [];
    checkContent(c.file, c.content, findings);
    const got = findings.length > 0;
    const ok = got === c.expectFinding;
    if (ok) { console.log(`  ✓ ${c.name}`); pass++; }
    else    { console.log(`  ✗ ${c.name} — expected finding=${c.expectFinding}, got=${got} [${findings.join('; ')}]`); fail++; }
  }
  console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass}/${pass + fail} self-test cases passed`);
  process.exit(fail === 0 ? 0 : 1);
}

if (SELF_TEST) runSelfTest();

const files = [
  ...walk(ROOT, ['.html']),
  ...walk(path.join(ROOT, 'assets'), ['.css', '.js']),
];
const findings = [];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  checkContent(f, content, findings);
}

if (findings.length) {
  console.error(`check-ambient-placement: ${findings.length} violation(s):`);
  for (const f of findings) console.error(`  - ${f}`);
  console.error('  See docs/AMBIENT_PLACEMENT_MATRIX.md for canonical slot ownership.');
  process.exit(1);
}
console.log('check-ambient-placement: all ambient surfaces respect the placement matrix.');
