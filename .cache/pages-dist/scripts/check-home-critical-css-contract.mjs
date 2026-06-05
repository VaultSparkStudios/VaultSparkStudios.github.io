#!/usr/bin/env node
/**
 * Homepage critical CSS contract.
 *
 * The brand anchor should have one first-viewport CSS source of truth. The
 * homepage previously carried both a page-local #critical-css block and the
 * generated data-vs-critical-shell block, which made field-LCP debugging noisy:
 * two root/header/hero systems competed before the async stylesheet landed.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INDEX = path.join(ROOT, 'index.html');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');

export function inspectHomeCriticalCss(html) {
  const pageLocal = /<style\b[^>]*\bid=["']critical-css["'][^>]*>/i.test(html);
  const generatedShell = /<style\b[^>]*\bdata-vs-critical-shell\b[^>]*>/i.test(html);
  const shellCount = (html.match(/<style\b[^>]*\bdata-vs-critical-shell\b[^>]*>/gi) || []).length;
  const pageLocalCount = (html.match(/<style\b[^>]*\bid=["']critical-css["'][^>]*>/gi) || []).length;
  const violations = [];
  if (pageLocal && generatedShell) {
    violations.push('homepage carries both #critical-css and data-vs-critical-shell');
  }
  if (shellCount !== 1) violations.push(`expected exactly 1 generated shell block, found ${shellCount}`);
  if (pageLocalCount > 1) violations.push(`expected at most 1 page-local critical block, found ${pageLocalCount}`);
  return { pageLocal, generatedShell, shellCount, pageLocalCount, ok: violations.length === 0, violations };
}

if (SELF_TEST) {
  const cases = [
    ['generated only passes', inspectHomeCriticalCss('<style data-vs-critical-shell></style>').ok],
    ['dual blocks fail', !inspectHomeCriticalCss('<style id="critical-css"></style><style data-vs-critical-shell></style>').ok],
    ['missing generated fails', !inspectHomeCriticalCss('<style id="critical-css"></style>').ok],
    ['duplicate generated fails', !inspectHomeCriticalCss('<style data-vs-critical-shell></style><style data-vs-critical-shell></style>').ok],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const result = inspectHomeCriticalCss(fs.readFileSync(INDEX, 'utf8'));
if (!result.ok) {
  console.error('check-home-critical-css-contract: FAIL');
  for (const violation of result.violations) console.error(`- ${violation}`);
  console.error('Fix: keep the generated data-vs-critical-shell block and move any homepage-only critical rules into that generated shell path.');
  process.exit(1);
}

console.log(`check-home-critical-css-contract: OK (generatedShell=${result.generatedShell}, pageLocal=${result.pageLocal})`);
