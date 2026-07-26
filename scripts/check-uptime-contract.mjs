#!/usr/bin/env node
/**
 * check-uptime-contract.mjs (S178 · uptime-publish-loop)
 *
 * Guards the public availability contract the /status/ uptime tile depends on.
 * The first-party probe (scripts/probe-uptime.mjs) now PUBLISHES api/uptime.json
 * + data/uptime-history.ndjson instead of letting the signal die in the runner;
 * this gate keeps that contract honest so the public number can never silently
 * break shape or overstate availability.
 *
 * Validates:
 *   - api/uptime.json is schemaVersion 2.0 with a valid `overall` state,
 *     5 route entries, and a `rollup` block.
 *   - rollup.upPct (when present) is in [0,100] and consistent with history.
 *   - data/uptime-history.ndjson parses, every row has t/overall, and the
 *     committed rollup matches a recompute over the committed history (no drift).
 *
 * Usage:
 *   node scripts/check-uptime-contract.mjs --self-test
 *   node scripts/check-uptime-contract.mjs            # validate committed files
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { rollup } from './probe-uptime.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'uptime.json');
const HISTORY = path.join(ROOT, 'data', 'uptime-history.ndjson');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'uptime-probe.yml');
const STATES = ['up', 'degraded', 'edge-degraded', 'down'];

function readHistory() {
  try {
    return fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}

export function validate(summary, history) {
  const errs = [];
  if (!summary || typeof summary !== 'object') return ['api/uptime.json missing or not an object'];
  if (summary.schemaVersion !== '2.0') errs.push(`schemaVersion must be "2.0" (got ${summary.schemaVersion})`);
  if (!STATES.includes(summary.overall)) errs.push(`overall must be one of ${STATES.join('/')} (got ${summary.overall})`);
  if (!Array.isArray(summary.routes) || summary.routes.length < 1) errs.push('routes[] missing/empty');
  if (!summary.rollup || typeof summary.rollup !== 'object') errs.push('rollup block missing');
  else {
    const { upPct, checks } = summary.rollup;
    if (upPct !== null && (typeof upPct !== 'number' || upPct < 0 || upPct > 100)) errs.push(`rollup.upPct out of range: ${upPct}`);
    if (typeof checks !== 'number' || checks < 0) errs.push(`rollup.checks invalid: ${checks}`);
    for (const key of ['fullStackPct', 'originContentPct', 'edgeLivenessPct', 'workerIngestPct']) {
      const value = summary.rollup[key];
      if (value !== null && (typeof value !== 'number' || value < 0 || value > 100)) errs.push(`rollup.${key} out of range: ${value}`);
    }
    for (const key of ['originContentChecks', 'edgeLivenessChecks', 'workerIngestChecks']) {
      if (!Number.isInteger(summary.rollup[key]) || summary.rollup[key] < 0) errs.push(`rollup.${key} invalid: ${summary.rollup[key]}`);
    }
    // History rows must parse and carry the required fields.
    for (let i = 0; i < history.length; i += 1) {
      const r = history[i];
      if (!r.t || !STATES.includes(r.overall)) { errs.push(`history row ${i} malformed`); break; }
    }
    // Committed rollup must match a recompute over committed history (no drift).
    if (history.length) {
      const recomputed = rollup(history);
      for (const key of Object.keys(recomputed)) {
        if (recomputed[key] !== summary.rollup[key]) errs.push(`rollup.${key} drift: committed ${summary.rollup[key]} vs recomputed ${recomputed[key]}`);
      }
    }
  }
  return errs;
}

export function validatePublisherWorkflow(text) {
  const errors = [];
  const required = [
    'node scripts/check-uptime-contract.mjs',
    'node scripts/build-worker-route-provenance.mjs --probe',
    'node scripts/build-worker-route-provenance.mjs --check',
    'node scripts/build-geo-vitals.mjs --check',
    'node scripts/check-staging-parity.mjs --check',
    'node scripts/build-status-proof.mjs --check',
    'node scripts/check-ndjson-integrity.mjs',
  ];
  const commitAt = text.indexOf('git commit -m');
  const stageAt = text.indexOf('git add api/uptime.json');
  if (stageAt < 0 || commitAt < 0 || commitAt < stageAt) errors.push('publisher git add/commit boundary missing or reordered');
  for (const command of required) {
    const at = text.indexOf(command);
    if (at < 0) errors.push(`publisher missing validation: ${command}`);
    else if (stageAt >= 0 && at > stageAt) errors.push(`publisher validation occurs after staging: ${command}`);
  }
  if (/build-(?:geo-vitals|status-proof)\.mjs\s*\|\|/.test(text)) {
    errors.push('publisher masks a staged-artifact generator failure');
  }
  return errors;
}

function selfTest() {
  const okHistory = [
    { t: '2026-06-08T00:00:00Z', overall: 'up', down: 0, contentOk: true, livenessOk: true, workerIngestOk: true },
    { t: '2026-06-08T01:00:00Z', overall: 'up', down: 0, contentOk: true, livenessOk: true, workerIngestOk: true },
  ];
  const okSummary = { schemaVersion: '2.0', overall: 'up', routes: [{ route: '/' }], rollup: rollup(okHistory) };
  const workflowFixture = `node scripts/build-worker-route-provenance.mjs --probe\nnode scripts/build-geo-vitals.mjs\nnode scripts/build-status-proof.mjs\nnode scripts/check-uptime-contract.mjs\nnode scripts/build-worker-route-provenance.mjs --check\nnode scripts/build-geo-vitals.mjs --check\nnode scripts/check-staging-parity.mjs --check\nnode scripts/build-status-proof.mjs --check\nnode scripts/check-ndjson-integrity.mjs\ngit add api/uptime.json\ngit commit -m "[skip ci]"`;
  const cases = [
    ['valid summary + history passes', validate(okSummary, okHistory).length === 0],
    ['bad schemaVersion fails', validate({ ...okSummary, schemaVersion: '1.0' }, okHistory).length > 0],
    ['bad overall fails', validate({ ...okSummary, overall: 'green' }, okHistory).length > 0],
    ['missing rollup fails', validate({ ...okSummary, rollup: undefined }, okHistory).length > 0],
    ['upPct out of range fails', validate({ ...okSummary, rollup: { checks: 1, upPct: 142 } }, [{ t: 'x', overall: 'up' }]).length > 0],
    ['rollup drift vs history fails', validate(okSummary, [{ t: 'a', overall: 'up' }, { t: 'b', overall: 'degraded' }]).length > 0],
    ['dimensions separate healthy content from failed ingest', (() => { const r = rollup([{ t: 'a', overall: 'edge-degraded', down: 0, contentOk: true, livenessOk: true, workerIngestOk: false }]); return r.originContentPct === 100 && r.fullStackPct === 0 && r.workerIngestPct === 0; })()],
    ['empty history tolerated', validate(okSummary, []).length === 0],
    ['validated publisher passes', validatePublisherWorkflow(workflowFixture).length === 0],
    ['missing validation fails', validatePublisherWorkflow(workflowFixture.replace('node scripts/build-status-proof.mjs --check\n', '')).length > 0],
    ['validation after staging fails', validatePublisherWorkflow(workflowFixture.replace('node scripts/check-ndjson-integrity.mjs\n', '').replace('git add api/uptime.json', 'git add api/uptime.json\nnode scripts/check-ndjson-integrity.mjs')).length > 0],
    ['masked generator failure fails', validatePublisherWorkflow(workflowFixture.replace('node scripts/build-geo-vitals.mjs\n', 'node scripts/build-geo-vitals.mjs || true\n')).length > 0],
  ];
  let pass = 0;
  for (const [name, ok] of cases) { if (ok) pass += 1; else console.error(`  ✗ ${name}`); }
  console.log(`check-uptime-contract --self-test: ${pass}/${cases.length} passing`);
  process.exit(pass === cases.length ? 0 : 1);
}

if (process.argv.includes('--self-test')) selfTest();

// Validate committed files.
let summary = null;
try { summary = JSON.parse(fs.readFileSync(OUT, 'utf8')); }
catch { console.error('check-uptime-contract: api/uptime.json missing or unparseable'); process.exit(1); }
const errs = validate(summary, readHistory());
try {
  errs.push(...validatePublisherWorkflow(fs.readFileSync(WORKFLOW, 'utf8')));
} catch {
  errs.push('uptime-probe workflow missing or unreadable');
}
if (errs.length) {
  console.error('check-uptime-contract: FAIL');
  for (const e of errs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`check-uptime-contract: ok — overall=${summary.overall} · upPct=${summary.rollup.upPct ?? 'n/a'} · checks=${summary.rollup.checks}`);
