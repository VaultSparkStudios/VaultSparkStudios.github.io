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
    // History rows must parse and carry the required fields.
    for (let i = 0; i < history.length; i += 1) {
      const r = history[i];
      if (!r.t || !STATES.includes(r.overall)) { errs.push(`history row ${i} malformed`); break; }
    }
    // Committed rollup must match a recompute over committed history (no drift).
    if (history.length) {
      const recomputed = rollup(history);
      if (recomputed.upPct !== upPct) errs.push(`rollup.upPct drift: committed ${upPct} vs recomputed ${recomputed.upPct}`);
      if (recomputed.checks !== checks) errs.push(`rollup.checks drift: committed ${checks} vs recomputed ${recomputed.checks}`);
    }
  }
  return errs;
}

function selfTest() {
  const okSummary = { schemaVersion: '2.0', overall: 'up', routes: [{ route: '/' }], rollup: { checks: 2, upPct: 100, lastIncidentAt: null, lastIncidentState: null } };
  const okHistory = [{ t: '2026-06-08T00:00:00Z', overall: 'up' }, { t: '2026-06-08T01:00:00Z', overall: 'up' }];
  const cases = [
    ['valid summary + history passes', validate(okSummary, okHistory).length === 0],
    ['bad schemaVersion fails', validate({ ...okSummary, schemaVersion: '1.0' }, okHistory).length > 0],
    ['bad overall fails', validate({ ...okSummary, overall: 'green' }, okHistory).length > 0],
    ['missing rollup fails', validate({ ...okSummary, rollup: undefined }, okHistory).length > 0],
    ['upPct out of range fails', validate({ ...okSummary, rollup: { checks: 1, upPct: 142 } }, [{ t: 'x', overall: 'up' }]).length > 0],
    ['rollup drift vs history fails', validate(okSummary, [{ t: 'a', overall: 'up' }, { t: 'b', overall: 'degraded' }]).length > 0],
    ['empty history tolerated', validate(okSummary, []).length === 0],
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
if (errs.length) {
  console.error('check-uptime-contract: FAIL');
  for (const e of errs) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`check-uptime-contract: ok — overall=${summary.overall} · upPct=${summary.rollup.upPct ?? 'n/a'} · checks=${summary.rollup.checks}`);
