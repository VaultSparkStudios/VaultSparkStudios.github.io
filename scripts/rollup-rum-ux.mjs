#!/usr/bin/env node
/**
 * rollup-rum-ux.mjs (S189 · funnel-conversion-rollup)
 *
 * The blind spot this closes: every RUM beacon carries an optional allowlisted
 * `ux` event name (studio-dispatch:subscribe, proof-line:click, play-next:*,
 * oracle-chip:*, ignis-hint:*, oracle-answer:*). The Worker stores it on each
 * raw R2 row and the S188 check-rum-allowlist gate proves emit<->allowlist are
 * in sync — but `rollup-rum.mjs` aggregates ONLY web-vitals percentiles and
 * drops `row.ux` entirely. So the funnel S186-S188 built is instrumented at the
 * edge and invisible at the analysis layer. This rolls the ux events into a
 * committed history + a public-safe conversion-funnel summary.
 *
 * Privacy/cost: counts only. No email, no PII, no per-user rows. Reads the same
 * pulled raw sample dir as rollup-rum.mjs; publishes aggregate integer counts.
 * Cost-neutral per CANON-029 (static derivation, no per-user studio cost).
 *
 * Contract (mirrors rollup-rum / field-win): the COMMITTED history
 * (data/rum-ux-history.ndjson) is the source of truth; api/funnel-summary.json
 * is DERIVED from it. So --check re-derives from committed history (no volatile
 * .cache read) and byte-compares — deterministic, never drifts on cache state.
 *
 * Usage:
 *   node scripts/rollup-rum-ux.mjs                 # rebuild history from .cache/rum-raw, derive summary
 *   node scripts/rollup-rum-ux.mjs --input <dir>   # custom raw sample dir
 *   node scripts/rollup-rum-ux.mjs --check         # re-derive summary from committed history; fail on drift
 *   node scripts/rollup-rum-ux.mjs --self-test     # synthetic-fixture proof of the aggregation logic
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HISTORY = path.join(ROOT, 'data', 'rum-ux-history.ndjson');
const SUMMARY = path.join(ROOT, 'api', 'funnel-summary.json');

const WINDOW_DAYS = 30;
const MIN_SAMPLES = 20; // honest-dark floor: below this the funnel is too sparse to read

// Conversion funnel families. Each maps a family prefix to its tracked parts and
// the (numerator, denominator) that define its headline rate. Keep in lockstep
// with the Worker RUM_UX_EVENTS allowlist (check-rum-allowlist guards emit-side).
const FAMILIES = [
  { family: 'proof-line', parts: ['shown', 'click'], rate: ['click', 'shown'], label: 'proof line click-through' },
  { family: 'play-next', parts: ['shown', 'click'], rate: ['click', 'shown'], label: 'cross-game play-next click-through' },
  { family: 'oracle-chip', parts: ['shown', 'click'], rate: ['click', 'shown'], label: 'Oracle seed-chip click-through' },
  { family: 'ignis-hint', parts: ['shown', 'click', 'dismissed'], rate: ['click', 'shown'], label: 'proactive hint click-through' },
  { family: 'oracle-answer', parts: ['helpful', 'unhelpful'], rate: ['helpful', '_helpfulDenom'], label: 'Oracle answer helpful-rate' },
];
// Terminal conversions have no "shown" pair — they are counted, not rated.
const TERMINAL = ['studio-dispatch:subscribe'];

// ---------------------------------------------------------------------------
// Raw sample → history
// ---------------------------------------------------------------------------

function loadRawSamples(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir, { recursive: true })
    .map((name) => path.join(dir, name))
    .filter((file) => fs.statSync(file).isFile() && /\.(json|ndjson)$/i.test(file));
  const out = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const chunk of text.split('\n').filter(Boolean)) {
      try {
        const parsed = JSON.parse(chunk);
        if (parsed && typeof parsed.ux === 'string' && parsed.ux && parsed.ts) out.push(parsed);
      } catch { /* skip malformed line */ }
    }
  }
  return out;
}

// Build per-day, per-event count rows from raw samples (full rebuild, like rollup-rum).
export function rollupUx(samples) {
  const buckets = new Map(); // `${day}|${event}` -> count
  for (const s of samples) {
    const ts = new Date(s.ts);
    if (Number.isNaN(ts.getTime())) continue;
    const day = ts.toISOString().slice(0, 10);
    const event = String(s.ux).slice(0, 64);
    const key = `${day}|${event}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [day, event] = key.split('|');
      return { schemaVersion: '1.0', day, event, count };
    });
}

// ---------------------------------------------------------------------------
// History → funnel summary (DETERMINISTIC: derived purely from history rows)
// ---------------------------------------------------------------------------

export function deriveSummary(historyRows) {
  const rows = Array.isArray(historyRows) ? historyRows.filter((r) => r && r.day && r.event) : [];
  const days = rows.map((r) => r.day).sort();
  const asOf = days.length ? days[days.length - 1] : null;
  // Window: last WINDOW_DAYS up to asOf.
  let windowRows = rows;
  if (asOf) {
    const cutoff = new Date(asOf);
    cutoff.setUTCDate(cutoff.getUTCDate() - (WINDOW_DAYS - 1));
    const cutoffDay = cutoff.toISOString().slice(0, 10);
    windowRows = rows.filter((r) => r.day >= cutoffDay && r.day <= asOf);
  }

  const events = {};
  for (const r of windowRows) {
    const n = Number(r.count) || 0;
    events[r.event] = (events[r.event] || 0) + n;
  }
  const totalEvents = Object.values(events).reduce((a, b) => a + b, 0);

  const families = FAMILIES.map(({ family, parts, rate, label }) => {
    const counts = {};
    for (const part of parts) counts[part] = events[`${family}:${part}`] || 0;
    // oracle-answer denominator = helpful + unhelpful
    const denom = rate[1] === '_helpfulDenom'
      ? (counts.helpful || 0) + (counts.unhelpful || 0)
      : (counts[rate[1]] || 0);
    const num = counts[rate[0]] || 0;
    const ratePct = denom > 0 ? +((num / denom) * 100).toFixed(1) : null;
    return { family, label, counts, rate: ratePct, rateBasis: `${rate[0]}/${rate[1] === '_helpfulDenom' ? 'helpful+unhelpful' : rate[1]}` };
  });

  const terminal = {};
  for (const name of TERMINAL) terminal[name] = events[name] || 0;

  // Sort the events map for byte-stable output.
  const sortedEvents = {};
  for (const k of Object.keys(events).sort()) sortedEvents[k] = events[k];

  return {
    schemaVersion: '1.0',
    // generatedAt mirrors asOf (latest history day) — deterministic, NOT wall-clock,
    // so --check byte-comparison never drifts. Satisfies the public-contract-health
    // generatedAt-presence requirement without sacrificing the determinism contract.
    generatedAt: asOf,
    asOf,
    publicSafe: true,
    windowDays: WINDOW_DAYS,
    minSamples: MIN_SAMPLES,
    totalEvents,
    honestDark: totalEvents < MIN_SAMPLES,
    events: sortedEvents,
    families,
    terminal,
    note: 'Aggregate anonymous interaction counts only — no PII, no per-user data. Honest-dark until minSamples is reached.',
  };
}

function readHistory() {
  try {
    return fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}

function writeHistory(rows) {
  fs.mkdirSync(path.dirname(HISTORY), { recursive: true });
  fs.writeFileSync(HISTORY, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function writeSummary(summary) {
  fs.mkdirSync(path.dirname(SUMMARY), { recursive: true });
  fs.writeFileSync(SUMMARY, JSON.stringify(summary, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

function selfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-rum-ux-'));
  const raw = [
    { ux: 'proof-line:shown', ts: '2026-06-10T01:00:00.000Z', route: '/vault-member/' },
    { ux: 'proof-line:shown', ts: '2026-06-10T02:00:00.000Z', route: '/vault-member/' },
    { ux: 'proof-line:shown', ts: '2026-06-10T03:00:00.000Z', route: '/vault-member/' },
    { ux: 'proof-line:click', ts: '2026-06-10T04:00:00.000Z', route: '/vault-member/' },
    { ux: 'studio-dispatch:subscribe', ts: '2026-06-10T05:00:00.000Z', route: '/faq/' },
    { ux: 'oracle-answer:helpful', ts: '2026-06-10T06:00:00.000Z', route: '/oracle/' },
    { ux: 'oracle-answer:unhelpful', ts: '2026-06-10T07:00:00.000Z', route: '/oracle/' },
    { ux: 'oracle-answer:helpful', ts: '2026-06-10T08:00:00.000Z', route: '/oracle/' },
    { vitals: { lcp: 1000 }, ts: '2026-06-10T09:00:00.000Z', route: '/' }, // no ux → ignored
    { ux: 'not-allowlisted-junk', ts: 'bad-timestamp', route: '/' }, // bad ts → skipped in rollup
  ];
  fs.writeFileSync(path.join(dir, 'a.ndjson'), raw.map((r) => JSON.stringify(r)).join('\n'));

  const samples = loadRawSamples(dir);
  assert(samples.length === 9, `expected 9 ux-bearing samples, got ${samples.length}`);

  const history = rollupUx(samples);
  const proofShown = history.find((r) => r.event === 'proof-line:shown' && r.day === '2026-06-10');
  assert(proofShown && proofShown.count === 3, 'expected 3 proof-line:shown on 2026-06-10');
  const subs = history.find((r) => r.event === 'studio-dispatch:subscribe');
  assert(subs && subs.count === 1, 'expected 1 studio-dispatch:subscribe');

  const summary = deriveSummary(history);
  assert(summary.events['proof-line:shown'] === 3, 'summary proof-line:shown=3');
  assert(summary.terminal['studio-dispatch:subscribe'] === 1, 'summary terminal subscribe=1');
  const proofFam = summary.families.find((f) => f.family === 'proof-line');
  assert(proofFam.rate === 33.3, `expected proof-line rate 33.3, got ${proofFam.rate}`);
  const ansFam = summary.families.find((f) => f.family === 'oracle-answer');
  assert(ansFam.rate === 66.7, `expected oracle-answer helpful-rate 66.7, got ${ansFam.rate}`);
  assert(summary.honestDark === true, 'expected honest-dark with <20 events');
  assert(summary.asOf === '2026-06-10', 'expected asOf from latest history day');

  // Determinism: deriveSummary is pure over history.
  const a = JSON.stringify(deriveSummary(history));
  const b = JSON.stringify(deriveSummary(history));
  assert(a === b, 'deriveSummary must be deterministic');

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('rollup-rum-ux --self-test: OK (8 assertions)');
}

function assert(ok, msg) { if (!ok) { console.error('rollup-rum-ux --self-test FAIL:', msg); process.exit(1); } }

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) { selfTest(); return; }

  if (args.includes('--check')) {
    // Deterministic: derive from committed history only, compare to committed summary.
    const derived = JSON.stringify(deriveSummary(readHistory()), null, 2) + '\n';
    let committed = '';
    try { committed = fs.readFileSync(SUMMARY, 'utf8'); } catch {}
    if (derived !== committed) {
      console.error('rollup-rum-ux --check: api/funnel-summary.json drifts from data/rum-ux-history.ndjson');
      console.error('  fix: node scripts/rollup-rum-ux.mjs');
      process.exit(1);
    }
    console.log('rollup-rum-ux --check: OK (summary in sync with committed history)');
    return;
  }

  // Default: rebuild history from pulled raw samples, then derive summary.
  const inputArg = args.indexOf('--input');
  const inputDir = inputArg >= 0 ? args[inputArg + 1] : '.cache/rum-raw';
  const samples = loadRawSamples(path.resolve(ROOT, inputDir));

  if (samples.length) {
    writeHistory(rollupUx(samples));
  }
  const history = readHistory();
  writeSummary(deriveSummary(history));
  console.log(`rollup-rum-ux: ${samples.length} ux sample(s) → ${history.length} history row(s) → api/funnel-summary.json`);
}

const RUN_DIRECT = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (RUN_DIRECT) main();
