#!/usr/bin/env node
/**
 * CTA sample-readiness sentinel.
 *
 * A zero-denominator conversion idea is not implementation-ready. This writes a
 * small artifact that generators can use to annotate or suppress phantom-open work.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FUNNEL = path.join(ROOT, 'api', 'funnel-summary.json');
const OUT = path.join(ROOT, '.cache', 'cta-readiness.json');
const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');

const RULES = {
  'play-next': {
    minShown: 20,
    since: '2026-07-02',
    action: 'redesign',
    reason: 'true-viewport post-epoch impressions',
  },
};

/**
 * S328 — say what is actually being measured.
 *
 * `counts.shown` comes from rollup-rum-ux, which computes it over a ROLLING
 * WINDOW (`WINDOW_DAYS = 30`); its own source comment records that an epoch
 * "only TIGHTENS the window; it never widens past WINDOW_DAYS". So `minShown`
 * is a bar to clear INSIDE one window, not a total accumulated since the epoch —
 * and the old `waiting for N more post-epoch impressions` wording promised the
 * second, easier bar while the code enforced the first, harder one.
 *
 * Worse, when the epoch is at or after the funnel's own `asOf`, there is no
 * post-epoch observation span at all yet, and a confident countdown is not an
 * honest thing to print over frozen evidence.
 *
 * Both new fields are source-derived (`funnel.windowDays`, `funnel.asOf`), never
 * wall-clock, so the artifact stays byte-reproducible wherever --check runs.
 * The floor itself is deliberately NOT lowered: minShown, WINDOW_DAYS and the
 * epoch are all untouched.
 */
function utcDay(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

export function deriveEvidenceAge(observedThrough, windowDays, now = new Date()) {
  const observedDay = utcDay(observedThrough);
  const currentDay = utcDay(now);
  if (observedDay === null || currentDay === null) {
    return { evidenceAgeDays: null, evidenceState: 'absent' };
  }
  const evidenceAgeDays = Math.max(0, Math.floor((currentDay - observedDay) / 86_400_000));
  const window = Number(windowDays) || null;
  const evidenceState = window && evidenceAgeDays > window
    ? 'stale'
    : window && evidenceAgeDays > Math.floor(window / 2)
      ? 'aging'
      : 'current';
  return { evidenceAgeDays, evidenceState };
}

export function analyzeCtaReadiness(funnel, rules = RULES, now = new Date()) {
  const families = new Map((funnel?.families || []).map((family) => [family.family, family]));
  const windowDays = Number(funnel?.windowDays) || null;
  const observedThrough = funnel?.asOf || null;
  const evidence = deriveEvidenceAge(observedThrough, windowDays, now);
  const readiness = {};
  for (const [family, rule] of Object.entries(rules)) {
    const row = families.get(family);
    const shown = Number(row?.counts?.shown || 0);
    const click = Number(row?.counts?.click || 0);
    const ready = shown >= rule.minShown;
    const since = row?.since || rule.since || null;
    // No post-epoch span exists yet when the evidence stops at or before the epoch.
    const noSpanYet = Boolean(since && observedThrough && observedThrough <= since);
    const within = windowDays ? ` within a single ${windowDays}-day window` : '';
    let reason;
    if (evidence.evidenceState === 'stale') {
      reason = `evidence is stale — ${evidence.evidenceAgeDays} days old against a ${windowDays}-day window; refresh observations before judging ${rule.action}`;
    } else if (ready) {
      reason = `${shown} ${rule.reason} observed${within}`;
    } else if (noSpanYet) {
      reason = `no post-epoch observation span yet — evidence stops at ${observedThrough}, epoch is ${since}; needs ${rule.minShown} ${rule.reason}${within}`;
    } else {
      reason = `waiting for ${rule.minShown - shown} more ${rule.reason}${within}`;
    }
    readiness[family] = {
      family,
      action: rule.action,
      ready,
      shown,
      click,
      minShown: rule.minShown,
      since,
      rate: row?.rate ?? null,
      // The denominator's shape, stated rather than implied.
      basis: windowDays ? `rolling-${windowDays}d` : 'unknown',
      windowDays,
      observedThrough,
      evidenceAgeDays: evidence.evidenceAgeDays,
      evidenceState: evidence.evidenceState,
      reason,
    };
  }
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    publicSafe: true,
    readiness,
  };
}

function selfTest() {
  const waiting = analyzeCtaReadiness({ families: [{ family: 'play-next', counts: { shown: 0, click: 0 }, since: '2026-07-02' }] });
  const ready = analyzeCtaReadiness({ families: [{ family: 'play-next', counts: { shown: 22, click: 1 }, since: '2026-07-02' }] });
  // S328 fixtures: a funnel that declares its window + how far the evidence reaches.
  // S334: pin the clock. These fixtures assert the WINDOW-BOUND wording, which
  // only appears while the evidence is still fresh — and freshness is measured
  // against the wall clock. asOf 2026-08-01 was fresh when the test was written
  // and turned 31 days old on 2026-09-01, at which point the staleness branch
  // took over the reason string and both assertions failed. The gate had not
  // found a defect; it had aged into one. `analyzeCtaReadiness` already accepts
  // an injectable `now` (staleRow below was already using it) — these calls
  // simply were not passing it.
  const NOW = new Date('2026-08-02T12:00:00Z');
  const windowed = analyzeCtaReadiness({
    windowDays: 30,
    asOf: '2026-08-01',
    families: [{ family: 'play-next', counts: { shown: 5, click: 0 }, since: '2026-07-02' }],
  }, RULES, NOW);
  const frozen = analyzeCtaReadiness({
    windowDays: 30,
    asOf: '2026-07-02',
    families: [{ family: 'play-next', counts: { shown: 0, click: 0 }, since: '2026-07-02' }],
  }, RULES, new Date('2026-07-02T12:00:00Z'));
  const currentEvidence = deriveEvidenceAge('2026-08-01', 30, new Date('2026-08-03T12:00:00Z'));
  const agingEvidence = deriveEvidenceAge('2026-08-01', 30, new Date('2026-08-20T12:00:00Z'));
  const staleEvidence = deriveEvidenceAge('2026-08-01', 30, new Date('2026-09-05T12:00:00Z'));
  const absentEvidence = deriveEvidenceAge(null, 30, new Date('2026-08-03T12:00:00Z'));
  const staleRow = analyzeCtaReadiness({
    windowDays: 30,
    asOf: '2026-08-01',
    families: [{ family: 'play-next', counts: { shown: 5, click: 0 }, since: '2026-07-02' }],
  }, RULES, new Date('2026-09-05T12:00:00Z')).readiness['play-next'];
  const w = windowed.readiness['play-next'];
  const f = frozen.readiness['play-next'];
  const cases = [
    ['0 shown is waiting', waiting.readiness['play-next'].ready === false],
    ['waiting reason names remaining samples', /20 more/.test(waiting.readiness['play-next'].reason)],
    ['22 shown is ready', ready.readiness['play-next'].ready === true],
    // The denominator's shape is stated, not implied.
    ['window basis is surfaced from the funnel', w.basis === 'rolling-30d' && w.windowDays === 30],
    ['observedThrough is carried from funnel.asOf', w.observedThrough === '2026-08-01'],
    // The whole point of A3: the bar is per-window, and the message must say so.
    ['waiting reason states the window bound', /within a single 30-day window/.test(w.reason)],
    ['ready reason states the window bound too',
      /within a single 30-day window/.test(analyzeCtaReadiness({ windowDays: 30, asOf: '2026-08-01', families: [{ family: 'play-next', counts: { shown: 22, click: 1 }, since: '2026-07-02' }] }, RULES, NOW).readiness['play-next'].reason)],
    // Evidence that stops at the epoch must not print a confident countdown.
    ['epoch == asOf reports no post-epoch span, not a countdown',
      /no post-epoch observation span yet/.test(f.reason) && !/waiting for/.test(f.reason)],
    ['no-span row still reports not-ready', f.ready === false],
    // Guard the honesty invariant itself: nothing here may lower the floor.
    ['minShown floor is never lowered', w.minShown === 20 && f.minShown === 20],
    // A funnel with no declared window must not fabricate one.
    ['absent windowDays yields unknown basis, not a guess',
      waiting.readiness['play-next'].basis === 'unknown' && waiting.readiness['play-next'].windowDays === null],
    ['current evidence carries an exact source-derived age',
      currentEvidence.evidenceAgeDays === 2 && currentEvidence.evidenceState === 'current'],
    ['aging evidence is distinct from current and stale',
      agingEvidence.evidenceAgeDays === 19 && agingEvidence.evidenceState === 'aging'],
    ['stale evidence names age instead of another countdown',
      staleEvidence.evidenceAgeDays === 35 && staleEvidence.evidenceState === 'stale'
        && /evidence is stale — 35 days old/.test(staleRow.reason) && !/waiting for/.test(staleRow.reason)],
    ['missing observedThrough is explicit, never age zero',
      absentEvidence.evidenceAgeDays === null && absentEvidence.evidenceState === 'absent'],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  if (failed.length) process.exit(1);
  console.log('check-cta-readiness --self-test: all passed');
}

if (SELF_TEST) {
  selfTest();
} else {
  const funnel = JSON.parse(fs.readFileSync(FUNNEL, 'utf8'));
  const result = analyzeCtaReadiness(funnel);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (CHECK) {
    if (!fs.existsSync(OUT)) {
      console.error('check-cta-readiness --check: missing .cache/cta-readiness.json');
      process.exit(1);
    }
    const current = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const currentPlayNext = current.readiness?.['play-next'];
    const nextPlayNext = result.readiness?.['play-next'];
    // Compared fields are all source-derived; the wall-clock generatedAt,
    // evidenceAgeDays, and evidenceState are deliberately excluded. Their
    // source date remains covered by observedThrough, while excluding the
    // derived age prevents a midnight-only byte drift.
    // `basis`/`observedThrough` are compared too: a silent change in the
    // denominator's shape or in how far the evidence reaches is exactly the kind
    // of drift that must not slip through while `shown` happens to match.
    if (currentPlayNext?.ready !== nextPlayNext?.ready
      || currentPlayNext?.shown !== nextPlayNext?.shown
      || currentPlayNext?.basis !== nextPlayNext?.basis
      || currentPlayNext?.observedThrough !== nextPlayNext?.observedThrough) {
      console.error('check-cta-readiness --check: artifact drift; run node scripts/check-cta-readiness.mjs');
      process.exit(1);
    }
    console.log(`check-cta-readiness --check: ok (play-next ${currentPlayNext.ready ? 'ready' : currentPlayNext.reason})`);
    process.exit(0);
  }
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  const playNext = result.readiness['play-next'];
  console.log(`check-cta-readiness: play-next ${playNext.ready ? 'ready' : playNext.reason}`);
}
