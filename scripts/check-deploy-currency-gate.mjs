#!/usr/bin/env node
/**
 * CANON-036 alarm: does production serve what this repo built — and do we KNOW?
 *
 * S300 context. `build-deploy-currency.mjs` had been measuring production
 * correctly and publishing `api/deploy-currency.json` for sessions. Nothing read
 * it. The canon matrix classified CANON-036 as `doctor-owned`, the doctor ran
 * 15 probes, and none of them was this one — so `check-canon-conformance`
 * reported 0 GAP / vector green while production served a 2026-07-26 build for
 * six days and 391 commits. The measurement existed; the alarm did not.
 *
 * SEPARATION OF DUTIES (deliberate): the reading and the alarm are different
 * programs. build-deploy-currency.mjs --probe takes the reading over the network
 * and can be challenged, rate-limited, or offline. This gate reads only the
 * committed receipt and is therefore always able to fire — including firing
 * *because* the reading is missing or has aged out. A challenged vantage must
 * never be able to silence the alarm about the vantage being challenged.
 *
 * VERDICTS
 *   current                → pass
 *   behind (< blockHours)  → warn   · normal deploy lag
 *   stale  (≥ blockHours)  → FAIL   · production is silently behind (CANON-036)
 *   unverified             → FAIL   · retained reading aged out; we cannot see prod
 *   unobserved             → FAIL   · no probe has ever run
 *   diverged               → FAIL   · served sha is not in this repo's history
 *   receipt absent         → FAIL   · never green on missing input (S293)
 *
 * Usage:
 *   node scripts/check-deploy-currency-gate.mjs           # human
 *   node scripts/check-deploy-currency-gate.mjs --json    # doctor probe
 *   node scripts/check-deploy-currency-gate.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'api', 'deploy-currency.json');

/**
 * Every state must map to an explicit verdict. A state this gate does not know
 * about resolves to FAIL, not to a default pass — an unrecognised state is
 * exactly the circumstance in which a silent green is most dangerous.
 */
export function evaluate(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { pass: false, warn: false, state: 'absent', detail: 'no deploy-currency receipt — UNVERIFIED (never green on missing input)' };
  }

  const { state, commitsBehind, ageDays, retainedForHours, deployedShaShort } = receipt;
  const behindText = Number.isInteger(commitsBehind) ? `${commitsBehind} commit(s) behind` : 'drift unknown';
  const ageText = ageDays === null || ageDays === undefined ? '' : ` · ${ageDays}d`;

  switch (state) {
    case 'current':
      return { pass: true, warn: false, state, detail: `production current (${deployedShaShort || 'sha unknown'})` };

    case 'behind':
      // Normal lag between a merge and its deploy — visible, not alarming.
      return { pass: true, warn: true, state, detail: `production ${behindText}${ageText} — within the ${receipt.thresholds?.blockHours ?? '?'}h ceiling` };

    case 'content-current':
      // The deployed commit is behind, but the served shell matches the repo
      // exactly — the content lane promoted and the residual gap is the HELD
      // identity backlog. That is a decision, not a defect, so it warns rather
      // than blocking. Blocking here would cry wolf every session and send an
      // operator hunting for content to ship that is already live.
      return { pass: true, warn: true, state, detail: `content promoted (shell parity matched) · ${behindText} of held non-content work — identity backlog unpromoted by design` };

    case 'stale':
      return { pass: false, warn: false, state, detail: `PRODUCTION STALE: ${behindText}${ageText} — past the ${receipt.thresholds?.blockHours ?? '?'}h ceiling (CANON-036)` };

    case 'unverified':
      // Distinct from `stale` on purpose: the fix is the vantage, not a deploy.
      return { pass: false, warn: false, state, detail: `CANNOT VERIFY production: last reading retained ${retainedForHours ?? '?'}h, past the ${receipt.thresholds?.observationMaxAgeHours ?? '?'}h retention ceiling — fix the probe vantage` };

    case 'unobserved':
      return { pass: false, warn: false, state, detail: 'production never observed — no probe has run (CANON-031: absence is not health)' };

    case 'diverged':
      return { pass: false, warn: false, state, detail: `served sha ${deployedShaShort || '?'} is not in this repository's history` };

    default:
      return { pass: false, warn: false, state: String(state ?? 'unknown'), detail: `unrecognised deploy-currency state "${state}" — failing closed` };
  }
}

function readReceipt() {
  if (!fs.existsSync(RECEIPT)) return null;
  try { return JSON.parse(fs.readFileSync(RECEIPT, 'utf8')); } catch { return null; }
}

function selfTest() {
  const T = { blockHours: 48, observationMaxAgeHours: 12 };
  const cases = [
    ['current passes', evaluate({ state: 'current', commitsBehind: 0, thresholds: T }).pass === true],
    ['current does not warn', evaluate({ state: 'current', commitsBehind: 0, thresholds: T }).warn === false],
    ['behind passes but warns', (() => { const r = evaluate({ state: 'behind', commitsBehind: 3, ageDays: 0.2, thresholds: T }); return r.pass === true && r.warn === true; })()],

    // THE LIVE CASE this gate was written for.
    ['THE LIVE CASE: stale FAILS', evaluate({ state: 'stale', commitsBehind: 391, ageDays: 6.8, thresholds: T }).pass === false],
    ['a stale detail names the commit count', evaluate({ state: 'stale', commitsBehind: 391, ageDays: 6.8, thresholds: T }).detail.includes('391')],

    ['unverified FAILS', evaluate({ state: 'unverified', retainedForHours: 40, thresholds: T }).pass === false],
    ['unverified points at the vantage, not a deploy', evaluate({ state: 'unverified', retainedForHours: 40, thresholds: T }).detail.includes('vantage')],
    ['stale and unverified read differently', evaluate({ state: 'stale', commitsBehind: 5, thresholds: T }).detail !== evaluate({ state: 'unverified', retainedForHours: 40, thresholds: T }).detail],

    ['unobserved FAILS', evaluate({ state: 'unobserved', thresholds: T }).pass === false],
    ['diverged FAILS', evaluate({ state: 'diverged', deployedShaShort: 'deadbeefcafe', thresholds: T }).pass === false],

    // The S293 default-to-green class, asserted in both directions.
    ['ABSENT RECEIPT FAILS — never green on missing input', evaluate(null).pass === false],
    ['an absent receipt says UNVERIFIED', evaluate(null).detail.includes('UNVERIFIED')],
    ['a non-object receipt FAILS', evaluate('not-a-receipt').pass === false],
    ['an unknown state FAILS CLOSED', evaluate({ state: 'something-new', thresholds: T }).pass === false],
    ['an unknown state says so', evaluate({ state: 'something-new', thresholds: T }).detail.includes('unrecognised')],

    // Guards the exact inversion that would re-open the hole.
    ['no state is silently treated as current', evaluate({ commitsBehind: 0, thresholds: T }).pass === false],

    // S300 content lane: content promoted, identity backlog held.
    ['content-current PASSES with a warning', (() => { const r = evaluate({ state: 'content-current', commitsBehind: 448, thresholds: T }); return r.pass === true && r.warn === true; })()],
    ['content-current says the backlog is held by design', evaluate({ state: 'content-current', commitsBehind: 448, thresholds: T }).detail.includes('by design')],
    ['content-current still reports the residual gap', evaluate({ state: 'content-current', commitsBehind: 448, thresholds: T }).detail.includes('448')],
    ['content-current and stale read differently', evaluate({ state: 'content-current', commitsBehind: 448, thresholds: T }).detail !== evaluate({ state: 'stale', commitsBehind: 448, thresholds: T }).detail],
    ['stale STILL fails — the escape hatch did not widen', evaluate({ state: 'stale', commitsBehind: 448, thresholds: T }).pass === false],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-deploy-currency-gate --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-deploy-currency-gate --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const result = evaluate(readReceipt());
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result));
    // The doctor reads the JSON verdict, not the exit code; exit 0 so a failing
    // probe is reported as a finding rather than as a broken probe.
    return;
  }
  console.log(`deploy-currency: ${result.pass ? (result.warn ? 'WARN' : 'ok') : 'FAIL'} · ${result.detail}`);
  if (!result.pass) process.exit(1);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
