#!/usr/bin/env node
/**
 * check-playwright-locator-all.mjs (S224 → S225)
 *
 * Scans tests/*.spec.js for the .all() + async-attribute-read race condition:
 *   locator.all() collects a snapshot of elements at one moment, but then
 *   getAttribute()/textContent()/innerText() on each handle is a new async call —
 *   if the page re-renders between .all() and the attribute read, elements can
 *   be detached, causing "Element is not attached to the DOM" failures (flaky).
 *
 * Pattern detected:
 *   const items = await something.all()        ← collect
 *   for (const item of items) {
 *     await item.getAttribute(...)             ← async read on potentially-detached handle
 *   }
 *
 * Fix: replace with a single page.evaluate() snapshot that atomically reads all
 * values from the DOM before any re-render can occur (S224 accessibility.spec.js fix).
 *
 * Run: node scripts/check-playwright-locator-all.mjs [--self-test] [--check]
 * Exit: 0 ok · 1 pattern found (or self-test fail)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TESTS_DIR = path.join(ROOT, 'tests');

// Lines that indicate a .all() call pattern (locator.all())
const ALL_PATTERN = /\.all\(\)/;
// Lines that indicate an async attribute read on a locator handle in a loop context
const ASYNC_READ_PATTERN = /await\s+\w+\.(getAttribute|textContent|innerText|innerHTML|inputValue|isVisible|isEnabled|isChecked)\s*\(/;

function scanFile(filepath) {
  const src = readFileSync(filepath, 'utf8');
  const lines = src.split('\n');
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    if (!ALL_PATTERN.test(lines[i])) continue;

    // Found .all() — scan the next 8 lines for async attribute reads
    const window = lines.slice(i + 1, i + 9);
    const forOfIdx = window.findIndex(l => /for\s*\(/.test(l));
    if (forOfIdx === -1) continue; // no for loop following — not the pattern

    // Check for async reads inside/after the for-of
    const innerLines = window.slice(forOfIdx);
    const asyncReadIdx = innerLines.findIndex(l => ASYNC_READ_PATTERN.test(l));
    if (asyncReadIdx === -1) continue;

    const lineNum = i + 1;
    const col = (lines[i].match(/\.all\(\)/) || {}).index || 0;
    const asyncLine = i + 1 + forOfIdx + asyncReadIdx + 1;
    const methodMatch = innerLines[asyncReadIdx].match(ASYNC_READ_PATTERN);
    findings.push({
      file: path.relative(ROOT, filepath),
      line: lineNum,
      asyncLine,
      method: methodMatch ? methodMatch[1] : '?',
      snippet: lines[i].trim().slice(0, 80),
    });
  }

  return findings;
}

function runCheck() {
  if (!existsSync(TESTS_DIR)) {
    console.log('check-playwright-locator-all: tests/ dir not found — skipping');
    return 0;
  }

  const specFiles = readdirSync(TESTS_DIR)
    .filter(f => f.endsWith('.spec.js') || f.endsWith('.spec.ts'))
    .map(f => path.join(TESTS_DIR, f));

  const allFindings = [];
  for (const f of specFiles) {
    allFindings.push(...scanFile(f));
  }

  if (allFindings.length === 0) {
    console.log(`check-playwright-locator-all: ✓ ${specFiles.length} spec file(s) clean — no .all() + async-attribute race`);
    return 0;
  }

  console.error(`check-playwright-locator-all: ${allFindings.length} potential race(s) found:`);
  for (const f of allFindings) {
    console.error(`  ${f.file}:${f.line}: .all() followed by .${f.method}() at line ${f.asyncLine}`);
    console.error(`    ${f.snippet}`);
    console.error(`    → Replace with page.evaluate() snapshot to atomically read all values`);
  }
  console.error(`  See S224 accessibility.spec.js fix for the canonical pattern`);
  return 1;
}

const isSelfTest = process.argv.includes('--self-test');

if (isSelfTest) {
  let pass = 0;
  let fail = 0;
  const assert = (ok, label) => { if (ok) { pass++; } else { fail++; console.error('FAIL: ' + label); } };

  // Test the pattern scanner with synthetic code
  const tmpLines = [
    'const items = await page.locator(".foo").all();',
    'for (const item of items) {',
    '  const text = await item.getAttribute("data-val");',
    '}',
  ];
  const tmpSrc = tmpLines.join('\n');
  const tmpFile = path.join(ROOT, '.cache', '__test_locator_all.spec.js');
  import('node:fs').then(({ writeFileSync, unlinkSync }) => {
    writeFileSync(tmpFile, tmpSrc);
    const results = scanFile(tmpFile);
    unlinkSync(tmpFile);

    // Case 1: detects the race pattern
    assert(results.length === 1, 'case-1: detects .all() + getAttribute race');
    assert(results[0].method === 'getAttribute', 'case-1: method identified');

    // Case 2: clean code (no for-of after .all())
    const cleanSrc = ['const items = await page.locator(".foo").all();', 'const count = items.length;'].join('\n');
    writeFileSync(tmpFile, cleanSrc);
    const cleanResults = scanFile(tmpFile);
    unlinkSync(tmpFile);
    assert(cleanResults.length === 0, 'case-2: clean code has no findings');

    // Case 3: page.evaluate() pattern is NOT flagged (no .all() + for-of)
    const evalSrc = 'const vals = await page.evaluate(() => [...doc.querySelectorAll(".f")].map(e=>e.textContent));';
    writeFileSync(tmpFile, evalSrc);
    const evalResults = scanFile(tmpFile);
    unlinkSync(tmpFile);
    assert(evalResults.length === 0, 'case-3: page.evaluate() pattern is clean');

    console.log(`Self-test: ${pass} pass, ${fail} fail`);
    process.exit(fail > 0 ? 1 : 0);
  });
} else {
  process.exit(runCheck());
}
