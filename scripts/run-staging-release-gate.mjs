#!/usr/bin/env node
/**
 * Run the canonical staging browser suite as a release gate.
 *
 * Release mode is intentionally explicit: callers must pass --url=<origin> or
 * STAGING_RELEASE_URL. The public receipt keeps only aggregate outcomes and
 * bounded test titles/messages; raw browser output is never persisted.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = join(ROOT, 'api', 'staging-release-browser.json');
const SPEC_PATH = 'tests/staging-release.spec.js';
const EXPECTED_TESTS = 6; // two contracts across Chromium, Firefox, and WebKit

function argValue(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function normalizeOrigin(value) {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

function classify({ exitCode, stats = {}, errors = [] }) {
  const passed = Number(stats.expected || 0);
  const failed = Number(stats.unexpected || 0);
  const flaky = Number(stats.flaky || 0);
  const skipped = Number(stats.skipped || 0);
  const observed = passed + failed + flaky + skipped;
  const reasons = [];
  if (observed !== EXPECTED_TESTS) reasons.push(`expected-${EXPECTED_TESTS}-observed-${observed}`);
  if (skipped) reasons.push(`skipped-${skipped}`);
  if (failed) reasons.push(`failed-${failed}`);
  if (flaky) reasons.push(`flaky-${flaky}`);
  if (exitCode !== 0 && !failed) reasons.push(`runner-exit-${exitCode}`);
  return {
    state: reasons.length === 0 ? 'passed' : 'rejected',
    expectedTests: EXPECTED_TESTS,
    observedTests: observed,
    passed,
    failed,
    flaky,
    skipped,
    reasons,
    failures: errors.slice(0, 5),
  };
}

function compactErrors(report) {
  const failures = [];
  function visit(suite) {
    for (const spec of suite?.specs || []) {
      for (const test of spec.tests || []) {
        const bad = (test.results || []).find((result) => result.status === 'failed' || result.status === 'timedOut');
        if (!bad) continue;
        failures.push({
          title: String(spec.title || 'unnamed test').slice(0, 160),
          project: String(test.projectName || 'unknown').slice(0, 40),
          message: String(bad.error?.message || bad.status || 'failed').replace(/\x1b\[[0-9;]*m/g, '').slice(0, 500),
        });
      }
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

function validateReceipt(receipt) {
  const failures = [];
  if (!['passed', 'rejected'].includes(receipt?.state)) failures.push('unknown state');
  if (receipt?.publicSafe !== true) failures.push('receipt is not public-safe');
  if (receipt?.expectedTests !== EXPECTED_TESTS) failures.push('expected test count drifted');
  if (!Number.isInteger(receipt?.observedTests)) failures.push('observed test count missing');
  if (!Array.isArray(receipt?.reasons) || !Array.isArray(receipt?.failures)) failures.push('outcome detail missing');
  if (Object.hasOwn(receipt || {}, 'rawOutput') || Object.hasOwn(receipt || {}, 'responseBody')) failures.push('raw output retained');
  return failures;
}

function selfTest() {
  const green = classify({ exitCode: 0, stats: { expected: 6, unexpected: 0, flaky: 0, skipped: 0 } });
  if (green.state !== 'passed') throw new Error('green fixture rejected');
  const skipped = classify({ exitCode: 0, stats: { expected: 5, skipped: 1 } });
  if (skipped.state !== 'rejected' || !skipped.reasons.includes('skipped-1')) throw new Error('skip fixture accepted');
  const short = classify({ exitCode: 0, stats: { expected: 5 } });
  if (short.state !== 'rejected') throw new Error('short suite accepted');
  const failed = classify({ exitCode: 1, stats: { expected: 5, unexpected: 1 } });
  if (failed.state !== 'rejected' || !failed.reasons.includes('failed-1')) throw new Error('failure fixture accepted');
  console.log('run-staging-release-gate --self-test: OK (green + skip/count/failure negatives)');
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
    console.log(`run-staging-release-gate --check: ${receipt.state} · ${receipt.passed}/${receipt.expectedTests} passed · ${receipt.skipped} skipped`);
    process.exit(receipt.state === 'passed' || !process.argv.includes('--require-ready') ? 0 : 1);
  } catch (error) {
    console.error(`staging browser receipt invalid: ${error.message}`);
    process.exit(1);
  }
}

const origin = normalizeOrigin(argValue('--url') || process.env.STAGING_RELEASE_URL || '');
if (!origin) {
  console.error('Release mode requires --url=https://staging.example or STAGING_RELEASE_URL.');
  process.exit(2);
}

const cli = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
if (!existsSync(cli)) {
  console.error('Playwright CLI is unavailable; run npm ci after package-trust approval.');
  process.exit(2);
}

const run = spawnSync(process.execPath, [cli, 'test', SPEC_PATH, '--reporter=json'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, STAGING_RELEASE_URL: origin, STAGING_RELEASE_REQUIRED: '1' },
});

let outcome;
try {
  const report = parseReport(run.stdout);
  outcome = classify({ exitCode: run.status ?? 1, stats: report.stats, errors: compactErrors(report) });
} catch (error) {
  outcome = classify({ exitCode: run.status ?? 1, stats: {}, errors: [{ title: 'reporter', project: 'runner', message: error.message }] });
}

const receipt = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  publicSafe: true,
  origin,
  suite: SPEC_PATH,
  ...outcome,
};
mkdirSync(dirname(RECEIPT_PATH), { recursive: true });
writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`staging release browser: ${receipt.state} · ${receipt.passed}/${receipt.expectedTests} passed · ${receipt.skipped} skipped`);
for (const reason of receipt.reasons) console.log(`  - ${reason}`);
process.exit(receipt.state === 'passed' || !process.argv.includes('--require-ready') ? 0 : 1);
