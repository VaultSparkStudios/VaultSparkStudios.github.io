#!/usr/bin/env node
/**
 * Run the canonical staging browser suite as a release gate.
 *
 * Release mode is intentionally explicit: callers must pass --url=<origin> or
 * STAGING_RELEASE_URL. The public receipt keeps only aggregate outcomes and
 * bounded test titles/messages; raw browser output is never persisted.
 */
import { spawnSync } from './lib/safe-spawn.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveScope } from './check-promotion-scope.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = join(ROOT, 'api', 'staging-release-browser.json');
const PROMOTION_PATH = join(ROOT, 'context', 'PRODUCTION_PROMOTION.json');
const MANIFEST_PATH = join(ROOT, 'api', 'candidate-artifact-manifest.json');
const SPEC_PATH = 'tests/staging-release.spec.js';
const EXPECTED_TESTS = 6; // two contracts across Chromium, Firefox, and WebKit
const BROWSERS = 3;       // chromium · firefox · webkit

/**
 * Which public surface each contract in the suite actually exercises (S319).
 *
 * Pinned by self-test against the real spec: a renamed test must break the map
 * loudly rather than silently becoming unclassified — and an unclassified
 * contract always RUNS, so a mapping mistake can only ever make the gate
 * stricter.
 */
export const CONTRACT_SURFACE = Object.freeze({
  'mobile drawer and every theme are readable': 'content',
  'anonymous Obelisk boundary is fail-closed and reaches the provider': 'identity',
});

/**
 * HELD IS NOT SKIPPED (S319, D-S319.2 extended to evidence).
 *
 * The promotion AUTHORITY became blast-radius-scoped: a candidate provably
 * disjoint from every active hold may promote. The EVIDENCE suite did not, so it
 * still demanded that the held surface be healthy — and that is what actually
 * blocked the release. Production sign-in is down because an upstream OIDC
 * discovery document serves HTML, so the identity contract fails; requiring it
 * to pass before promoting /news/, /stats/ and the homepage asks a content
 * release to prove something about a surface it does not touch and is not
 * shipping.
 *
 * `held` is therefore a first-class receipt state, and deliberately NOT
 * `skipped` — the receipt contract rejects skips, and it should, because a skip
 * is evidence that silently went missing. A held contract is evidence that was
 * consciously scoped out, with a named reason, and it is permitted ONLY when:
 *
 *   1. the promotion actually resolves as `scoped` (a clear release holds
 *      nothing, so nothing may be held);
 *   2. the contract's surface is inside an ACTIVE blast radius; and
 *   3. that surface is therefore, by the same resolver, not being promoted.
 *
 * Anything unresolvable — unreadable promotion config, unreadable manifest,
 * unmapped contract — runs and must pass. Holding is strictly narrower than
 * running; it can never be used to route around a failure on a surface that IS
 * shipping.
 */
export function resolveHeldSurfaces({ promotion, leaves }) {
  if (!promotion || !Array.isArray(leaves) || leaves.length === 0) {
    return { mode: 'unresolved', held: [], reason: 'promotion-scope-unresolvable' };
  }
  const scope = resolveScope(promotion, leaves);
  // Only a SCOPED promotion holds anything. `clear` promotes everything, so it
  // must prove everything; `blocked` is not promoting at all.
  if (!scope || scope.promotable !== true || scope.scoped !== true) {
    return { mode: scope?.promotable === true ? 'clear' : 'blocked', held: [], reason: scope?.reason || 'not-scoped' };
  }
  const heldSurfaces = (scope.heldSurfaces || [])
    .map((entry) => (entry.startsWith('surface:') ? entry.slice('surface:'.length) : entry))
    .filter((entry) => !entry.includes('/') && !entry.includes('*'));
  return { mode: 'scoped', held: heldSurfaces, reason: 'scoped-disjoint' };
}

/** Contracts whose surface sits inside an active blast radius. */
export function heldContracts(heldSurfaces) {
  return Object.entries(CONTRACT_SURFACE)
    .filter(([, surface]) => heldSurfaces.includes(surface))
    .map(([title]) => title);
}

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

export function classify({ exitCode, stats = {}, errors = [], held = [], heldSurfaces = [] }) {
  const passed = Number(stats.expected || 0);
  const failed = Number(stats.unexpected || 0);
  const flaky = Number(stats.flaky || 0);
  const skipped = Number(stats.skipped || 0);
  const ran = passed + failed + flaky + skipped;
  // Each held CONTRACT accounts for one case per browser project.
  const heldTests = held.length * BROWSERS;
  const observed = ran + heldTests;
  const reasons = [];
  // Coverage is still total: run + held must account for every expected case, so
  // a contract cannot quietly vanish by being neither executed nor declared.
  if (observed !== EXPECTED_TESTS) reasons.push(`expected-${EXPECTED_TESTS}-observed-${observed}`);
  if (skipped) reasons.push(`skipped-${skipped}`);
  if (failed) reasons.push(`failed-${failed}`);
  if (flaky) reasons.push(`flaky-${flaky}`);
  if (exitCode !== 0 && !failed) reasons.push(`runner-exit-${exitCode}`);
  return {
    state: reasons.length === 0 ? 'passed' : 'rejected',
    expectedTests: EXPECTED_TESTS,
    observedTests: observed,
    executedTests: ran,
    passed,
    failed,
    flaky,
    skipped,
    // Named, not just counted: a reader of the public receipt can see exactly
    // which contract was scoped out and which held surface justified it.
    held: heldTests,
    heldContracts: [...held],
    heldSurfaces: [...heldSurfaces],
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

  // --- S319 held-contract scoping -------------------------------------------
  const scopedPromotion = {
    hold: true, releaseState: 'hold', schemaVersion: '1.0',
    reasons: ['real-provider-e2e-pending'],
    blastRadius: { 'real-provider-e2e-pending': ['auth/**', 'surface:identity', 'worker:identity'] },
    promotionContract: { requiresWorkflowDispatch: true, requiresExplicitConfirmation: true, stagingFirst: true },
  };
  const contentLeaves = [{ path: 'index.html' }, { path: 'assets/style.shell-abc.css' }];
  const identityLeaves = [...contentLeaves, { path: 'auth/callback/index.html' }];

  const scoped = resolveHeldSurfaces({ promotion: scopedPromotion, leaves: contentLeaves });
  if (scoped.mode !== 'scoped') throw new Error('a disjoint scoped promotion should resolve as scoped');
  if (!scoped.held.includes('identity')) throw new Error('the held identity surface should be named');
  if (heldContracts(scoped.held).length !== 1) throw new Error('exactly the identity contract should be held');

  // A held contract still accounts for its cases; coverage stays total.
  const withHeld = classify({ exitCode: 0, stats: { expected: 3 }, held: heldContracts(scoped.held), heldSurfaces: scoped.held });
  if (withHeld.state !== 'passed') throw new Error('a scoped run with a held contract should pass');
  if (withHeld.observedTests !== 6 || withHeld.held !== 3 || withHeld.executedTests !== 3) throw new Error('held cases must still account for full coverage');
  if (!withHeld.heldContracts.length || !withHeld.heldSurfaces.includes('identity')) throw new Error('the receipt must name what was held and why');

  // Holding may never rescue a failure on a surface that IS shipping.
  const heldButContentFailed = classify({ exitCode: 1, stats: { expected: 2, unexpected: 1 }, held: heldContracts(scoped.held), heldSurfaces: scoped.held });
  if (heldButContentFailed.state !== 'rejected') throw new Error('a promoted-surface failure must still reject');

  // A contract cannot vanish: neither executed nor declared held.
  const vanished = classify({ exitCode: 0, stats: { expected: 3 }, held: [], heldSurfaces: [] });
  if (vanished.state !== 'rejected' || !vanished.reasons.some((r) => r.startsWith('expected-6-observed-3'))) throw new Error('an unaccounted contract must reject');

  // A skip is still a skip — held did not become a laundering route.
  const stillSkip = classify({ exitCode: 0, stats: { expected: 2, skipped: 1 }, held: heldContracts(scoped.held), heldSurfaces: scoped.held });
  if (stillSkip.state !== 'rejected' || !stillSkip.reasons.includes('skipped-1')) throw new Error('skips must still reject even when something is held');

  // Fail-closed directions: nothing may be held unless the promotion is scoped.
  if (resolveHeldSurfaces({ promotion: scopedPromotion, leaves: identityLeaves }).held.length !== 0) throw new Error('a candidate touching identity must hold nothing');
  if (resolveHeldSurfaces({ promotion: { hold: false, releaseState: 'ready', reasons: [] }, leaves: contentLeaves }).held.length !== 0) throw new Error('a clear release must prove everything');
  if (resolveHeldSurfaces({ promotion: null, leaves: contentLeaves }).held.length !== 0) throw new Error('an unreadable promotion config must hold nothing');
  if (resolveHeldSurfaces({ promotion: scopedPromotion, leaves: [] }).held.length !== 0) throw new Error('an unreadable candidate must hold nothing');
  const unscoped = { ...scopedPromotion, blastRadius: undefined };
  if (resolveHeldSurfaces({ promotion: unscoped, leaves: contentLeaves }).held.length !== 0) throw new Error('an undeclared radius must hold nothing');

  // The contract map must track the real spec: a rename fails loudly.
  const specSource = readFileSync(join(ROOT, SPEC_PATH), 'utf8');
  for (const title of Object.keys(CONTRACT_SURFACE)) {
    if (!specSource.includes(title)) throw new Error(`contract map names a test absent from the spec: ${title}`);
  }
  // Every contract in the spec must be mapped. An unmapped one always RUNS, so
  // this is not a safety hole — but it must be a deliberate choice, not a drift.
  const specTitles = [...specSource.matchAll(/\btest\('([^']+)'/g)].map((m) => m[1]);
  for (const title of specTitles) {
    if (!Object.hasOwn(CONTRACT_SURFACE, title)) throw new Error(`spec contract is unmapped (it would always run, but say so): ${title}`);
  }
  if (specTitles.length * 3 !== EXPECTED_TESTS) throw new Error('expected-test count no longer matches contracts x browsers');

  console.log('run-staging-release-gate --self-test: OK (green + skip/count/failure negatives + held-contract scoping, 15 cases)');
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

// Resolve what the promotion is actually shipping before deciding what it must
// prove. Anything unreadable leaves `held` empty, so the full suite runs.
let promotion = null;
let leaves = [];
try { promotion = JSON.parse(readFileSync(PROMOTION_PATH, 'utf8')); } catch { promotion = null; }
try { leaves = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')).leaves || []; } catch { leaves = []; }
const scope = resolveHeldSurfaces({ promotion, leaves });
const held = process.argv.includes('--prove-all') ? [] : heldContracts(scope.held);

if (held.length) {
  console.log(`staging release browser: promotion is ${scope.mode}; holding ${held.length} contract(s) covering ${scope.held.join(', ')}`);
  for (const title of held) console.log(`  held: ${title}`);
}

const grepArgs = held.length
  // Exclude by exact contract title. Held contracts are NOT executed and NOT
  // reported as skips — they are declared on the receipt with the surface that
  // justifies them.
  ? ['--grep-invert', held.map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')]
  : [];

const run = spawnSync(process.execPath, [cli, 'test', SPEC_PATH, '--reporter=json', ...grepArgs], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, STAGING_RELEASE_URL: origin, STAGING_RELEASE_REQUIRED: '1' },
});

let outcome;
try {
  const report = parseReport(run.stdout);
  outcome = classify({ exitCode: run.status ?? 1, stats: report.stats, errors: compactErrors(report), held, heldSurfaces: scope.held });
} catch (error) {
  outcome = classify({ exitCode: run.status ?? 1, stats: {}, errors: [{ title: 'reporter', project: 'runner', message: error.message }], held, heldSurfaces: scope.held });
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
