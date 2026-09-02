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
const CONTENT_RECEIPT_URL = process.env.CONTENT_RELEASE_RECEIPT_URL
  || 'https://vaultsparkstudios-website.pages.dev/api/content-deploy-receipt.json';

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

    case 'behind': {
      // Normal lag between a merge and its deploy — visible, not alarming.
      // S336: say whether any of that gap is hand-authored content, so "34
      // commits behind" cannot again read the same as "a whole release is
      // stranded". `commitsBehind` counts hourly publisher churn too.
      const contentText = Number.isInteger(receipt.undeployedContentCommits)
        ? (receipt.undeployedContentCommits === 0
          ? ' · no undeployed content'
          : ` · ${receipt.undeployedContentCommits} undeployed content commit(s), oldest ${receipt.contentLagHours ?? '?'}h`)
        : '';
      return { pass: true, warn: true, state, detail: `production ${behindText}${ageText}${contentText} — within the ${receipt.thresholds?.blockHours ?? '?'}h ceiling` };
    }

    case 'content-current':
      // The deployed commit is behind, but the served shell matches the repo
      // exactly — the content lane promoted and the residual gap is the HELD
      // identity backlog. That is a decision, not a defect, so it warns rather
      // than blocking. Blocking here would cry wolf every session and send an
      // operator hunting for content to ship that is already live.
      return { pass: true, warn: true, state, detail: `content promoted (shell parity matched) · ${behindText} of held non-content work — identity backlog unpromoted by design` };

    case 'stale': {
      // S336: two independent clocks can produce `stale`, and they call for
      // different actions. Naming the wrong one sends an operator hunting the
      // wrong gap — the same class of defect this gate exists to prevent.
      const contentCeiling = receipt.thresholds?.contentBlockHours;
      const contentFired = Number.isFinite(receipt.contentLagHours)
        && Number.isFinite(contentCeiling)
        && receipt.contentLagHours >= contentCeiling;
      if (contentFired) {
        return {
          pass: false,
          warn: false,
          state,
          detail: `PRODUCTION STALE: ${receipt.undeployedContentCommits ?? '?'} hand-authored content commit(s) undeployed, oldest ${receipt.contentLagHours}h — past the ${contentCeiling}h content ceiling. Dispatch the content lane (CANON-036)`,
        };
      }
      return { pass: false, warn: false, state, detail: `PRODUCTION STALE: ${behindText}${ageText} — past the ${receipt.thresholds?.blockHours ?? '?'}h ceiling (CANON-036)` };
    }

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

export function evaluateWithContent(receipt, contentReceipt, now = Date.now()) {
  const raw = evaluate(receipt);
  if (raw.pass) return raw;
  if (!contentReceipt || typeof contentReceipt !== 'object') return raw;

  const generatedAt = Date.parse(contentReceipt.generatedAt || '');
  const ageHours = Number.isFinite(generatedAt) ? Math.max(0, (now - generatedAt) / 3_600_000) : null;
  const maxAgeHours = Number(receipt?.thresholds?.blockHours || 48);
  const workflowPrefix = 'https://github.com/VaultSparkStudios/VaultSparkStudios.github.io/actions/runs/';
  const workflowRunId = String(contentReceipt.workflowUrl || '').slice(workflowPrefix.length);
  const valid = contentReceipt.type === 'content-release-verification'
    && contentReceipt.publicSafe === true
    && contentReceipt.contentVerdict === 'exact'
    && /^[a-f0-9]{64}$/i.test(contentReceipt.receiptId || '')
    && /^[a-f0-9]{40}$/i.test(contentReceipt.contentLaneHead || '')
    && /^[a-f0-9]{64}$/i.test(contentReceipt.manifestRoot || '')
    && /^[a-f0-9]{64}$/i.test(contentReceipt.pathSetSha256 || '')
    && /^[a-f0-9]{64}$/i.test(contentReceipt.previousReceiptId || '')
    && String(contentReceipt.workflowUrl || '').startsWith(workflowPrefix)
    && /^[0-9]+$/.test(workflowRunId)
    && contentReceipt.verification?.summary?.allExact === true
    && Number(contentReceipt.verification?.summary?.pages) > 0
    && Number(contentReceipt.verification?.summary?.assets) > 0
    && ageHours !== null
    && ageHours <= maxAgeHours;
  if (!valid) return raw;

  return {
    pass: true,
    warn: true,
    state: 'content-current',
    detail: 'content lane exact at ' + contentReceipt.contentLaneHead.slice(0, 12)
      + ' · receipt ' + contentReceipt.receiptId.slice(0, 12)
      + ' · ' + contentReceipt.promotedCount + ' paths · raw full-release signal ' + raw.state,
  };
}

function readReceipt() {
  if (!fs.existsSync(RECEIPT)) return null;
  try { return JSON.parse(fs.readFileSync(RECEIPT, 'utf8')); } catch { return null; }
}

async function readContentReceipt() {
  try {
    const response = await fetch(CONTENT_RECEIPT_URL, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function selfTest() {
  const T = { blockHours: 48, observationMaxAgeHours: 12 };
  const TC = { blockHours: 48, contentBlockHours: 12, observationMaxAgeHours: 12 };
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

    // ── S336: the content clock, reported distinctly from the churn clock ──
    ['a behind receipt says when NO content is undeployed',
      evaluate({ state: 'behind', commitsBehind: 34, ageDays: 0.4, undeployedContentCommits: 0, thresholds: TC }).detail.includes('no undeployed content')],
    ['a behind receipt names undeployed content when there is some',
      evaluate({ state: 'behind', commitsBehind: 34, ageDays: 0.4, undeployedContentCommits: 2, contentLagHours: 5, thresholds: TC }).detail.includes('2 undeployed content commit')],
    ['THE S336 CASE: a content-clock stale names the content ceiling, not the 48h one',
      (() => {
        const d = evaluate({ state: 'stale', commitsBehind: 34, ageDays: 0.4, undeployedContentCommits: 1, contentLagHours: 26, thresholds: TC }).detail;
        return d.includes('content ceiling') && d.includes('content lane') && !d.includes('48h');
      })()],
    ['a churn-clock stale still names the 48h ceiling',
      (() => {
        const d = evaluate({ state: 'stale', commitsBehind: 391, ageDays: 6.8, undeployedContentCommits: 0, contentLagHours: 1, thresholds: TC }).detail;
        return d.includes('48h') && !d.includes('content ceiling');
      })()],
    ['both stale flavours still FAIL',
      evaluate({ state: 'stale', commitsBehind: 1, undeployedContentCommits: 1, contentLagHours: 26, thresholds: TC }).pass === false
      && evaluate({ state: 'stale', commitsBehind: 391, ageDays: 6.8, thresholds: TC }).pass === false],
    ['a receipt with no content fields degrades gracefully, not into a crash',
      evaluate({ state: 'behind', commitsBehind: 3, thresholds: T }).pass === true],

    ['verified composite content upgrades an unobserved raw SHA to warning', (() => {
      const r = evaluateWithContent(
        { state: 'unobserved', thresholds: T },
        {
          type: 'content-release-verification', publicSafe: true, contentVerdict: 'exact',
          generatedAt: '2026-08-13T00:00:00.000Z',
          receiptId: 'a'.repeat(64), previousReceiptId: 'b'.repeat(64),
          contentLaneHead: 'c'.repeat(40), manifestRoot: 'd'.repeat(64), pathSetSha256: 'e'.repeat(64),
          workflowUrl: 'https://github.com/VaultSparkStudios/VaultSparkStudios.github.io/actions/runs/123',
          promotedCount: 4, verification: { summary: { allExact: true, pages: 1, assets: 1 } },
        },
        Date.parse('2026-08-13T01:00:00.000Z'),
      );
      return r.pass === true && r.warn === true && r.state === 'content-current';
    })()],
    ['an invalid composite receipt cannot upgrade raw failure', evaluateWithContent({ state: 'unobserved', thresholds: T }, { contentVerdict: 'exact' }).pass === false],
    ['an aged composite receipt cannot upgrade raw failure', (() => {
      const content = {
        type: 'content-release-verification', publicSafe: true, contentVerdict: 'exact',
        generatedAt: '2026-08-10T00:00:00.000Z',
        receiptId: 'a'.repeat(64), previousReceiptId: 'b'.repeat(64),
        contentLaneHead: 'c'.repeat(40), manifestRoot: 'd'.repeat(64), pathSetSha256: 'e'.repeat(64),
        workflowUrl: 'https://github.com/VaultSparkStudios/VaultSparkStudios.github.io/actions/runs/123',
        promotedCount: 4, verification: { summary: { allExact: true, pages: 1, assets: 1 } },
      };
      return evaluateWithContent({ state: 'unobserved', thresholds: T }, content, Date.parse('2026-08-13T01:00:00.000Z')).pass === false;
    })()],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-deploy-currency-gate --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-deploy-currency-gate --self-test: ${cases.length}/${cases.length} passed`);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const receipt = readReceipt();
  const raw = evaluate(receipt);
  const result = raw.pass ? raw : evaluateWithContent(receipt, await readContentReceipt());
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
if (isDirect) await main();
