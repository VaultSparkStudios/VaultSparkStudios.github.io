#!/usr/bin/env node
/**
 * Trusted Types readiness artifact.
 *
 * Separates local unresolved work from long-window live-report soak so AMBER
 * remains actionable without reopening already-fixed sinks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, '.cache', 'tt-active-local-sinks.json');
const OUT = path.join(ROOT, 'api', 'tt-readiness.json');
const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');

const DAY_MS = 86_400_000;

function ageDays(iso, now) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now - t) / DAY_MS));
}

/**
 * S336. This receipt is publicSafe and used to decide whether Trusted Types can
 * move from report-only to enforce. Two defects made it dishonest:
 *
 *  1. It computed no age at all. `amber-soak` held whenever a warm row existed —
 *     forever, at any age — while `nextAction` told the reader to "wait for warm
 *     rows to age out". Nothing aged anything out. D-S335.7 called the ageing
 *     logic "suspect"; it did not exist.
 *  2. It stamped a fresh `generatedAt` on every build regardless of how old its
 *     only input was. The manifest was generated 2026-07-07 with windowDays 30
 *     and never refreshed, so a 56-day-old reading was published under today's
 *     date — a receipt claiming a currency its evidence does not have.
 *
 * The fix computes real ages and DISCLOSES the evidence age. It deliberately
 * does NOT convert a stale manifest into enforcement readiness: ageing rows out
 * of a fossil and calling the result "enforce-candidate" would manufacture
 * readiness from absence. A manifest older than its own soak window yields
 * `stale-evidence`, which keeps enforceEligible false and names the real next
 * step — refresh the soak.
 */
export function buildTtReadiness(manifest, now = Date.now()) {
  const activeRows = Array.isArray(manifest?.activeLocalRows) ? manifest.activeLocalRows : [];
  const warmRows = Array.isArray(manifest?.warmLocalRows) ? manifest.warmLocalRows : [];
  const activeStillPresent = activeRows.filter((row) => row.stillPresentNearReportedLine === true);
  const newestLastSeen = [...activeRows, ...warmRows]
    .map((row) => row.lastSeen)
    .filter(Boolean)
    .sort()
    .pop() || null;
  const staleRows = Number(manifest?.summary?.staleLocal || 0);

  const soakWindowDays = Number(manifest?.windowDays) > 0 ? Number(manifest.windowDays) : 30;
  const manifestGeneratedAt = manifest?.generatedAt || null;
  const manifestAgeDays = manifestGeneratedAt ? ageDays(manifestGeneratedAt, now) : null;
  // Absence of a manifest timestamp is treated as stale, never as fresh.
  const evidenceStale = manifestAgeDays === null || manifestAgeDays > soakWindowDays;

  // Real ageing, computed now against each row's own lastSeen — not the frozen
  // ageDays the manifest recorded when it was written.
  const agedOut = (row) => {
    const d = ageDays(row?.lastSeen, now);
    return d !== null && d > soakWindowDays && row?.stillPresentNearReportedLine !== true;
  };
  const warmLive = warmRows.filter((row) => !agedOut(row));
  const warmAgedOut = warmRows.length - warmLive.length;
  const newestLastSeenAgeDays = newestLastSeen ? ageDays(newestLastSeen, now) : null;

  let status;
  if (activeStillPresent.length > 0) status = 'fix-active-local';
  else if (evidenceStale) status = 'stale-evidence';
  else if (activeRows.length === 0 && warmLive.length === 0) status = 'enforce-candidate';
  else status = 'amber-soak';

  const nextAction = status === 'fix-active-local'
    ? 'Fix still-present active local Trusted Types rows.'
    : status === 'stale-evidence'
      ? `Soak evidence is ${manifestAgeDays === null ? 'undated' : `${manifestAgeDays}d old`}, past its own ${soakWindowDays}d window — re-run scripts/analyze-tt-violations.mjs against live KV reports. Enforcement stays blocked until the reading is current.`
      : status === 'enforce-candidate'
        ? 'Run a fresh live soak and founder-device verification before enforcement.'
        : `Wait for ${warmLive.length} warm row(s) to age past ${soakWindowDays}d, or refresh KV reports before enforcement.`;

  return {
    schemaVersion: '1.1',
    generatedAt: new Date(now).toISOString(),
    generatedBy: 'scripts/build-tt-readiness.mjs',
    publicSafe: true,
    status,
    enforceEligible: status === 'enforce-candidate',
    newestLastSeen,
    newestLastSeenAgeDays,
    // Evidence provenance: how old the INPUT is, so a fresh generatedAt can
    // never again imply a fresh reading.
    manifestGeneratedAt,
    manifestAgeDays,
    soakWindowDays,
    evidenceStale,
    counts: {
      totalReports: Number(manifest?.totalReports || 0),
      activeLocal: activeRows.length,
      activeStillPresent: activeStillPresent.length,
      warmLocal: warmRows.length,
      warmLive: warmLive.length,
      warmAgedOut,
      staleLocal: staleRows,
    },
    nextAction,
  };
}

function selfTest() {
  const NOW = Date.parse('2026-09-02T00:00:00Z');
  const fresh = (extra) => ({ generatedAt: '2026-08-30T00:00:00Z', windowDays: 30, ...extra });

  const greenish = buildTtReadiness(fresh({ totalReports: 0, activeLocalRows: [], warmLocalRows: [], summary: {} }), NOW);
  const amber = buildTtReadiness(fresh({
    totalReports: 10,
    activeLocalRows: [{ lastSeen: '2026-08-29', stillPresentNearReportedLine: false }],
    warmLocalRows: [{ lastSeen: '2026-08-28' }],
    summary: {},
  }), NOW);
  const active = buildTtReadiness(fresh({
    totalReports: 1,
    activeLocalRows: [{ lastSeen: '2026-08-29', stillPresentNearReportedLine: true }],
    warmLocalRows: [],
    summary: {},
  }), NOW);

  // THE LIVE S336 SHAPE: the real manifest, 56 days old, 17 warm rows whose
  // sinks are already gone. The old code called this 'amber-soak' forever.
  const fossil = buildTtReadiness({
    generatedAt: '2026-07-07T01:32:44.057Z',
    windowDays: 30,
    totalReports: 328,
    activeLocalRows: [],
    warmLocalRows: Array.from({ length: 17 }, () => ({ lastSeen: '2026-07-03', stillPresentNearReportedLine: false })),
    summary: { staleLocal: 0 },
  }, NOW);

  // A manifest that is FRESH but whose rows have aged past the window: this is
  // the case the old nextAction promised and never delivered.
  const agedRows = buildTtReadiness({
    generatedAt: '2026-09-01T00:00:00Z',
    windowDays: 30,
    totalReports: 5,
    activeLocalRows: [],
    warmLocalRows: [{ lastSeen: '2026-06-01', stillPresentNearReportedLine: false }],
    summary: {},
  }, NOW);

  // An aged row whose sink is STILL PRESENT must not age out.
  const agedButPresent = buildTtReadiness({
    generatedAt: '2026-09-01T00:00:00Z',
    windowDays: 30,
    totalReports: 5,
    activeLocalRows: [],
    warmLocalRows: [{ lastSeen: '2026-06-01', stillPresentNearReportedLine: true }],
    summary: {},
  }, NOW);

  const undated = buildTtReadiness({ windowDays: 30, totalReports: 0, activeLocalRows: [], warmLocalRows: [], summary: {} }, NOW);

  const cases = [
    ['fresh empty manifest is enforce candidate', greenish.enforceEligible],
    ['live warm rows are amber soak', amber.status === 'amber-soak'],
    ['still-present active row requires fix', active.status === 'fix-active-local'],

    // The two defects this rewrite exists to close.
    ['THE LIVE CASE: a 56-day-old manifest is stale-evidence, not amber-soak', fossil.status === 'stale-evidence'],
    ['a stale manifest NEVER unlocks enforcement', fossil.enforceEligible === false],
    ['a stale manifest discloses its own evidence age', fossil.manifestAgeDays === 56 && fossil.evidenceStale === true],
    ['the stale nextAction names the refresh, not a wait', fossil.nextAction.includes('re-run') && !fossil.nextAction.startsWith('Wait')],
    ['stale-evidence and amber-soak read differently', fossil.nextAction !== amber.nextAction],

    ['rows past the soak window actually age out', agedRows.counts.warmAgedOut === 1 && agedRows.counts.warmLive === 0],
    ['aged-out rows on a fresh manifest reach enforce-candidate', agedRows.status === 'enforce-candidate'],
    ['a still-present sink does NOT age out however old', agedButPresent.counts.warmAgedOut === 0 && agedButPresent.status === 'amber-soak'],

    ['an undated manifest is stale, never fresh', undated.status === 'stale-evidence' && undated.enforceEligible === false],
    ['a still-present ACTIVE sink outranks stale evidence', buildTtReadiness({
      generatedAt: '2026-01-01T00:00:00Z', windowDays: 30, totalReports: 1,
      activeLocalRows: [{ lastSeen: '2026-01-01', stillPresentNearReportedLine: true }], warmLocalRows: [], summary: {},
    }, NOW).status === 'fix-active-local'],

    ['evidence age is published, not implicit', typeof greenish.soakWindowDays === 'number' && 'manifestAgeDays' in greenish],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`build-tt-readiness --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`build-tt-readiness --self-test: ${cases.length}/${cases.length} passed`);
}

if (SELF_TEST) {
  selfTest();
} else if (CHECK) {
  if (!fs.existsSync(OUT)) {
    console.error('build-tt-readiness --check: api/tt-readiness.json missing; run without --check');
    process.exit(1);
  }
  const parsed = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  if (parsed.publicSafe !== true || !parsed.counts || !parsed.status) {
    console.error('build-tt-readiness --check: artifact shape drift');
    process.exit(1);
  }
  if (parsed.counts.activeStillPresent > 0) {
    console.error('build-tt-readiness --check: active local TT sinks remain unresolved');
    process.exit(1);
  }
  console.log(`build-tt-readiness --check: ok (${parsed.status})`);
} else {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const payload = buildTtReadiness(manifest);
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`build-tt-readiness: ${payload.status} (active unresolved ${payload.counts.activeStillPresent})`);
}
