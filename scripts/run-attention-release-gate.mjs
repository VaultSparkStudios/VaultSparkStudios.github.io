#!/usr/bin/env node
/** Fail-closed new/returning visitor attention suite for release candidates. */
import { spawnSync } from './lib/safe-spawn.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = join(ROOT, 'api', 'staging-attention-browser.json');
const SPEC_PATH = 'tests/attention-surfaces.spec.js';
const CANONICAL_STAGING = 'https://website.staging.vaultsparkstudios.com';
const EXPECTED_TESTS = 15;

function argValue(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

export function exactStagingOrigin(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}` === CANONICAL_STAGING && url.pathname === '/';
  } catch { return false; }
}

export function classify({ exitCode, stats = {}, failures = [] }) {
  const passed = Number(stats.expected || 0);
  const failed = Number(stats.unexpected || 0);
  const flaky = Number(stats.flaky || 0);
  const skipped = Number(stats.skipped || 0);
  const observedTests = passed + failed + flaky + skipped;
  const reasons = [];
  if (observedTests !== EXPECTED_TESTS) reasons.push(`expected-${EXPECTED_TESTS}-observed-${observedTests}`);
  if (skipped) reasons.push(`skipped-${skipped}`);
  if (failed) reasons.push(`failed-${failed}`);
  if (flaky) reasons.push(`flaky-${flaky}`);
  if (exitCode !== 0 && !failed) reasons.push(`runner-exit-${exitCode}`);
  return {
    state: reasons.length ? 'rejected' : 'passed', expectedTests: EXPECTED_TESTS,
    observedTests, passed, failed, flaky, skipped, reasons, failures: failures.slice(0, 5),
  };
}

function compactFailures(report) {
  const failures = [];
  function visit(suite) {
    for (const spec of suite?.specs || []) for (const test of spec.tests || []) {
      const bad = (test.results || []).find((result) => ['failed', 'timedOut'].includes(result.status));
      if (bad) failures.push({
        title: String(spec.title || 'unnamed test').slice(0, 160),
        project: String(test.projectName || 'unknown').slice(0, 40),
        message: String(bad.error?.message || bad.status || 'failed').replace(/\x1b\[[0-9;]*m/g, '').slice(0, 500),
      });
    }
    for (const child of suite?.suites || []) visit(child);
  }
  for (const suite of report?.suites || []) visit(suite);
  return failures;
}

function parseReport(stdout) {
  const text = String(stdout || '').trim();
  const start = text.indexOf('{');
  if (start < 0) throw new Error('Playwright JSON reporter did not emit a report');
  return JSON.parse(text.slice(start));
}

export function validateReceipt(receipt) {
  const failures = [];
  if (!['passed', 'rejected'].includes(receipt?.state)) failures.push('unknown state');
  if (receipt?.publicSafe !== true) failures.push('receipt is not public-safe');
  if (receipt?.origin !== CANONICAL_STAGING) failures.push('canonical staging origin mismatch');
  if (receipt?.expectedTests !== EXPECTED_TESTS) failures.push('expected test count drifted');
  if (receipt?.observedTests !== EXPECTED_TESTS) failures.push('observed test count drifted');
  if (!Array.isArray(receipt?.reasons) || !Array.isArray(receipt?.failures)) failures.push('outcome detail missing');
  if (Object.hasOwn(receipt || {}, 'rawOutput') || Object.hasOwn(receipt || {}, 'responseBody')) failures.push('raw output retained');
  return failures;
}

function selfTest() {
  if (!exactStagingOrigin(`${CANONICAL_STAGING}/`) || exactStagingOrigin('https://evil.example/')) throw new Error('origin boundary failed');
  const green = classify({ exitCode: 0, stats: { expected: 15 } });
  if (green.state !== 'passed' || validateReceipt({ ...green, publicSafe: true, origin: CANONICAL_STAGING }).length) throw new Error('green fixture rejected');
  if (classify({ exitCode: 0, stats: { expected: 14, skipped: 1 } }).state !== 'rejected') throw new Error('skip accepted');
  if (classify({ exitCode: 1, stats: { expected: 14, unexpected: 1 } }).state !== 'rejected') throw new Error('failure accepted');
  if (classify({ exitCode: 0, stats: { expected: 14 } }).state !== 'rejected') throw new Error('count drift accepted');
  const spec = readFileSync(join(ROOT, SPEC_PATH), 'utf8');
  const profiles = [...spec.matchAll(/\{\s*name:\s*'(?:desktop|mobile)'/g)].length;
  const profiledContracts = [...spec.matchAll(/test\(\`[^\`]*\$\{profile\.name\}/g)].length;
  const fixedContracts = [...spec.matchAll(/\btest\('[^']+'/g)].length;
  if ((profiles * profiledContracts + fixedContracts) * 3 !== EXPECTED_TESTS) throw new Error('expected count no longer matches spec x browsers');
  console.log('run-attention-release-gate --self-test: OK (origin + green + skip/failure/count negatives)');
}

if (process.argv.includes('--self-test')) {
  try { selfTest(); } catch (error) { console.error(`self-test failed: ${error.message}`); process.exit(1); }
  process.exit(0);
}

if (process.argv.includes('--check')) {
  try {
    const receipt = JSON.parse(readFileSync(RECEIPT_PATH, 'utf8'));
    const failures = validateReceipt(receipt);
    if (failures.length) throw new Error(failures.join('; '));
    console.log(`attention browser receipt: ${receipt.state} · ${receipt.passed}/${receipt.expectedTests} passed · ${receipt.skipped} skipped`);
    process.exit(receipt.state === 'passed' || !process.argv.includes('--require-ready') ? 0 : 1);
  } catch (error) {
    console.error(`attention browser receipt invalid: ${error.message}`);
    process.exit(1);
  }
}

const origin = argValue('--url') || process.env.STAGING_RELEASE_URL || '';
if (!exactStagingOrigin(origin)) {
  console.error(`Attention release gate requires --url=${CANONICAL_STAGING} exactly.`);
  process.exit(2);
}
const cli = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
if (!existsSync(cli)) {
  console.error('Playwright CLI is unavailable; run npm ci after package-trust approval.');
  process.exit(2);
}
const run = spawnSync(process.execPath, [cli, 'test', SPEC_PATH, '--reporter=json'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, BASE_URL: CANONICAL_STAGING },
});
let outcome;
try {
  const report = parseReport(run.stdout);
  outcome = classify({ exitCode: run.status ?? 1, stats: report.stats, failures: compactFailures(report) });
} catch (error) {
  outcome = classify({ exitCode: run.status ?? 1, failures: [{ title: 'reporter', project: 'runner', message: error.message }] });
}
const receipt = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), generatedBy: 'scripts/run-attention-release-gate.mjs',
  publicSafe: true, origin: CANONICAL_STAGING, suite: SPEC_PATH, ...outcome,
};
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`attention browser: ${receipt.state} · ${receipt.passed}/${receipt.expectedTests} passed · ${receipt.skipped} skipped`);
for (const reason of receipt.reasons) console.log(`  - ${reason}`);
process.exit(receipt.state === 'passed' || !process.argv.includes('--require-ready') ? 0 : 1);
