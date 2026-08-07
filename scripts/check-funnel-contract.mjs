#!/usr/bin/env node
/**
 * check-funnel-contract.mjs (S189 · funnel-conversion-rollup)
 *
 * Guards the public conversion-funnel contract the /status/ "Conversion funnel"
 * tile depends on. api/funnel-summary.json is DERIVED from data/rum-ux-history.ndjson
 * (committed source of truth) by scripts/rollup-rum-ux.mjs. This gate proves:
 *   - the summary has the expected shape (schemaVersion, counts-only, honestDark
 *     flag, families[], terminal{}),
 *   - it carries NO PII surface (no email/id/user keys ever leak into a public
 *     funnel artifact),
 *   - it is in sync with the committed history (no drift) — re-derive and compare.
 *
 * Determinism: re-derivation reads only the committed history, so this gate can
 * never flake on volatile .cache state (the trap that bit the S183 --check gates).
 *
 * Usage:
 *   node scripts/check-funnel-contract.mjs --self-test
 *   node scripts/check-funnel-contract.mjs            # validate committed files
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { deriveSummary } from './rollup-rum-ux.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SUMMARY = path.join(ROOT, 'api', 'funnel-summary.json');
const HISTORY = path.join(ROOT, 'data', 'rum-ux-history.ndjson');

// Keys that must NEVER appear in a public funnel artifact (counts-only contract).
const FORBIDDEN_KEYS = ['email', 'ip', 'userId', 'user_id', 'id', 'session', 'token', 'name'];

export function validate(summary, historyRows) {
  const errs = [];
  if (!summary || typeof summary !== 'object') return ['api/funnel-summary.json missing or not an object'];
  if (summary.schemaVersion !== '1.0') errs.push(`schemaVersion must be "1.0" (got ${summary.schemaVersion})`);
  if (typeof summary.totalEvents !== 'number' || summary.totalEvents < 0) errs.push('totalEvents must be a non-negative number');
  if (typeof summary.honestDark !== 'boolean') errs.push('honestDark must be a boolean');
  if (typeof summary.minSamples !== 'number') errs.push('minSamples must be a number');
  if (!summary.events || typeof summary.events !== 'object') errs.push('events{} missing');
  if (!Array.isArray(summary.families)) errs.push('families[] missing');
  if (!summary.terminal || typeof summary.terminal !== 'object') errs.push('terminal{} missing');
  if (!summary.dataWindow || !Object.hasOwn(summary.dataWindow, 'end')) errs.push('dataWindow missing');
  if (!summary.signalWindows || typeof summary.signalWindows !== 'object') errs.push('signalWindows{} missing');
  for (const family of summary.families || []) {
    if (!family.observationWindow || !Object.hasOwn(family.observationWindow, 'end')) {
      errs.push(`family ${family.family || '?'} observationWindow missing`);
    }
  }

  // Counts-only: every events/terminal value must be a non-negative integer.
  for (const [k, v] of Object.entries(summary.events || {})) {
    if (!Number.isInteger(v) || v < 0) errs.push(`events["${k}"] must be a non-negative integer (got ${v})`);
  }
  for (const [k, v] of Object.entries(summary.terminal || {})) {
    if (!Number.isInteger(v) || v < 0) errs.push(`terminal["${k}"] must be a non-negative integer (got ${v})`);
  }

  // No PII surface anywhere in the serialized artifact.
  const blob = JSON.stringify(summary).toLowerCase();
  for (const key of FORBIDDEN_KEYS) {
    // word-boundary-ish check on quoted JSON keys only
    if (blob.includes(`"${key}":`)) errs.push(`forbidden PII-shaped key "${key}" present in public funnel artifact`);
  }

  // honestDark must agree with the threshold.
  if (typeof summary.totalEvents === 'number' && typeof summary.minSamples === 'number') {
    const expected = summary.totalEvents < summary.minSamples;
    if (summary.honestDark !== expected) errs.push(`honestDark (${summary.honestDark}) inconsistent with totalEvents/minSamples`);
  }

  // Drift: re-derive from committed history and compare.
  if (Array.isArray(historyRows)) {
    const rederived = JSON.stringify(deriveSummary(historyRows));
    if (JSON.stringify(summary) !== rederived) {
      errs.push('api/funnel-summary.json drifts from data/rum-ux-history.ndjson — run: node scripts/rollup-rum-ux.mjs');
    }
  }
  return errs;
}

function readHistory() {
  try { return fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
  catch { return []; }
}

function selfTest() {
  // Valid synthetic summary derived from synthetic history.
  const history = [
    { schemaVersion: '1.0', day: '2026-06-10', event: 'proof-line:shown', count: 4 },
    { schemaVersion: '1.0', day: '2026-06-10', event: 'proof-line:click', count: 1 },
    { schemaVersion: '1.0', day: '2026-06-10', event: 'studio-dispatch:subscribe', count: 2 },
  ];
  const good = deriveSummary(history);
  let errs = validate(good, history);
  assert(errs.length === 0, `valid summary should pass, got: ${errs.join('; ')}`);

  // Drift detection.
  const drifted = JSON.parse(JSON.stringify(good));
  drifted.totalEvents = 999;
  errs = validate(drifted, history);
  assert(errs.length > 0, 'tampered totalEvents must fail');

  // PII surface detection.
  const leaky = deriveSummary(history);
  leaky.events.email = 5;
  errs = validate(leaky, null);
  assert(errs.some((e) => /forbidden PII/i.test(e)), 'PII-shaped key must be flagged');

  // honestDark consistency.
  const wrongDark = deriveSummary(history);
  wrongDark.honestDark = false; // totalEvents(7) < minSamples(20) → should be true
  errs = validate(wrongDark, history);
  assert(errs.some((e) => /honestDark/.test(e)), 'inconsistent honestDark must fail');

  assert(good.dataWindow.end === '2026-06-10', 'data window is source-derived');
  assert(good.families.find((family) => family.family === 'oracle-answer').observationWindow.end === null,
    'zero-response family stays unobserved rather than inheriting global freshness');

  console.log('check-funnel-contract --self-test: OK (6 assertions)');
}

function assert(ok, msg) { if (!ok) { console.error('check-funnel-contract --self-test FAIL:', msg); process.exit(1); } }

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) { selfTest(); return; }
  let summary = null;
  try { summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8')); }
  catch { console.error('check-funnel-contract: api/funnel-summary.json missing — run: node scripts/rollup-rum-ux.mjs'); process.exit(1); }
  const errs = validate(summary, readHistory());
  if (errs.length) {
    console.error('check-funnel-contract: FAIL');
    for (const e of errs) console.error('  - ' + e);
    process.exit(1);
  }
  console.log(`check-funnel-contract: OK (${summary.totalEvents} events · honestDark=${summary.honestDark})`);
}

const RUN_DIRECT = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (RUN_DIRECT) main();
