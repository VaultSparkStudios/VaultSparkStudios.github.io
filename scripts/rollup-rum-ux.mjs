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
const ORACLE_FEEDBACK = path.join(ROOT, 'data', 'oracle-feedback.ndjson');

const WINDOW_DAYS = 30;
const MIN_SAMPLES = 20; // honest-dark floor: below this the funnel is too sparse to read
// S190: oracle feedback threshold — when a day accumulates this many unhelpful answers,
// write a record to oracle-feedback.ndjson so the cluster ranker can down-weight.
const ORACLE_FEEDBACK_THRESHOLD = 2;

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
    // S192: prefix-aware so a bounded per-cluster name (oracle-answer:helpful:<id>)
    // folds into the GLOBAL family rate alongside the untagged event. Other
    // families have no sub-keys, so the exact match is the only contributor.
    for (const part of parts) {
      const exact = `${family}:${part}`;
      let sum = 0;
      for (const [ev, n] of Object.entries(events)) {
        if (ev === exact || ev.startsWith(exact + ':')) sum += n;
      }
      counts[part] = sum;
    }
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

  // S194: named-event funnel CTAs. funnel-tracking.js (rewired off the dead gtag
  // sink) emits `funnel:<name>` for every data-track-event / -view / -funnel-form
  // interaction. Surface them as a clean name→count map (prefix stripped) so the
  // homepage hero play-vs-explore split and the membership/interview CTAs are
  // readable without digging through the raw events map. Sorted for byte-stability.
  const funnelCtas = {};
  for (const [ev, n] of Object.entries(events)) {
    if (ev.startsWith('funnel:')) funnelCtas[ev.slice('funnel:'.length)] = n;
  }
  const sortedFunnelCtas = {};
  for (const k of Object.keys(funnelCtas).sort()) sortedFunnelCtas[k] = funnelCtas[k];

  // S194: acquisition channel. `source:<bucket>` (search/social/direct/referral)
  // is emitted once per session, domain-classified client-side — never a URL, no
  // PII. The one number a traffic-starved site never measured: which channel the
  // trickle arrives through. Honest-dark like the rest until minSamples.
  const sources = {};
  for (const [ev, n] of Object.entries(events)) {
    if (ev.startsWith('source:')) sources[ev.slice('source:'.length)] = n;
  }
  const sortedSources = {};
  for (const k of Object.keys(sources).sort()) sortedSources[k] = sources[k];

  // S194: per-game share outcomes. `share:<slug>:<outcome>` from share-game.js —
  // which game gets shared, and whether via native sheet or clipboard copy. The
  // studio's prime viral surface, finally measured. Prefix stripped, sorted.
  const shares = {};
  for (const [ev, n] of Object.entries(events)) {
    if (ev.startsWith('share:')) shares[ev.slice('share:'.length)] = n;
  }
  const sortedShares = {};
  for (const k of Object.keys(shares).sort()) sortedShares[k] = shares[k];

  // S198: engagement signals (scroll depth + exit intent) — previously dead gtag sinks,
  // now landing in /v/rum via sendBeacon. Aggregated here as scroll_N counts + intent
  // shown/answered so the studio can finally measure real in-page engagement depth.
  const engagements = {};
  for (const [ev, n] of Object.entries(events)) {
    if (ev.startsWith('engagement:')) engagements[ev.slice('engagement:'.length)] = n;
  }
  const sortedEngagements = {};
  for (const k of Object.keys(engagements).sort()) sortedEngagements[k] = engagements[k];

  // S199: visit-streak.js — daily streak badge render + day/break events.
  // streak:badge-shown → badge appeared on screen; streak:day-N → new consecutive day;
  // streak:break → streak reset. Aggregated as distribution for funnel-summary.
  const streaks = {};
  for (const [ev, n] of Object.entries(events)) {
    if (ev.startsWith('streak:')) streaks[ev.slice('streak:'.length)] = n;
  }
  const sortedStreaks = {};
  for (const k of Object.keys(streaks).sort()) sortedStreaks[k] = streaks[k];

  // S199: pwa-install.js — banner_shown / install_accepted / install_dismissed /
  // already_installed. Measures install-funnel conversion at each step.
  const pwa = {};
  for (const [ev, n] of Object.entries(events)) {
    if (ev.startsWith('pwa:')) pwa[ev.slice('pwa:'.length)] = n;
  }
  const sortedPwa = {};
  for (const k of Object.keys(pwa).sort()) sortedPwa[k] = pwa[k];

  // Sort the events map for byte-stable output.
  const sortedEvents = {};
  for (const k of Object.keys(events).sort()) sortedEvents[k] = events[k];

  return {
    funnelCtas: sortedFunnelCtas,
    sources: sortedSources,
    shares: sortedShares,
    engagements: sortedEngagements,
    streaks: sortedStreaks,
    pwa: sortedPwa,
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
// S190: oracle feedback writer
// ---------------------------------------------------------------------------

/**
 * Derive per-day oracle feedback rows from history. Fires when a day's
 * unhelpful count exceeds ORACLE_FEEDBACK_THRESHOLD. Writes new rows to
 * oracle-feedback.ndjson (append-only; skips days already recorded).
 *
 * clusterKey is 'global' until per-cluster beacons are added to the frontend.
 * The cluster ranker (build-oracle-query-clusters.mjs) ignores 'global' keys,
 * so this doesn't affect ranking today — but builds the file schema for when
 * per-cluster data arrives.
 *
 * Returns the number of new rows appended.
 */
// Parse an oracle-answer ux event into {part, clusterKey}. Per-cluster names are
// `oracle-answer:<part>:<clusterId>` (S192); an untagged name maps to clusterKey
// '*'. clusterId charset mirrors the Worker prefixAllowlist bound ([a-z0-9-]).
export function parseOracleAnswer(event) {
  const m = String(event || '').match(/^oracle-answer:(helpful|unhelpful)(?::([a-z0-9-]+))?$/);
  if (!m) return null;
  return { part: m[1], clusterKey: m[2] || '*' };
}

export function updateOracleFeedback(historyRows, feedbackPath) {
  const fp = feedbackPath || ORACLE_FEEDBACK;

  // Load existing feedback records to avoid duplicating (clusterKey, day) pairs.
  const existing = new Set();
  if (fs.existsSync(fp)) {
    for (const line of fs.readFileSync(fp, 'utf8').split('\n').filter(Boolean)) {
      try { const r = JSON.parse(line); if (r.date) existing.add(`${r.clusterKey || '*'}|${r.date}`); } catch { /* skip */ }
    }
  }

  // Aggregate helpful/unhelpful per (clusterKey, day). A per-cluster event also
  // folds into the '*' global aggregate so the global row stays a true total.
  const byKeyDay = {};
  const bump = (clusterKey, day, part, count) => {
    const k = `${clusterKey}|${day}`;
    if (!byKeyDay[k]) byKeyDay[k] = { clusterKey, day, helpful: 0, unhelpful: 0 };
    byKeyDay[k][part] += count;
  };
  for (const r of historyRows) {
    if (!r.day || !r.event) continue;
    const parsed = parseOracleAnswer(r.event);
    if (!parsed) continue;
    const count = r.count || 1;
    bump(parsed.clusterKey, r.day, parsed.part, count);
    if (parsed.clusterKey !== '*') bump('*', r.day, parsed.part, count);
  }

  const newRows = [];
  for (const { clusterKey, day, helpful, unhelpful } of Object.values(byKeyDay)
    .sort((a, b) => `${a.clusterKey}|${a.day}`.localeCompare(`${b.clusterKey}|${b.day}`))) {
    if (unhelpful < ORACLE_FEEDBACK_THRESHOLD) continue;
    const key = `${clusterKey}|${day}`;
    if (existing.has(key)) continue;
    newRows.push({ clusterKey, date: day, helpful, unhelpful });
  }

  if (newRows.length) {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.appendFileSync(fp, newRows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  }

  return newRows.length;
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

  // S190: oracle-feedback writer
  const tmpFeedback = path.join(dir, 'oracle-feedback.ndjson');
  const appended = updateOracleFeedback(history, tmpFeedback);
  // oracle-answer:unhelpful=1 < threshold(2) → no record written
  assert(appended === 0, `expected 0 feedback rows (unhelpful=1 < threshold), got ${appended}`);
  // Add a day with unhelpful=3 → should write a row
  const highUnhelpful = [...history, { schemaVersion:'1.0', day:'2026-06-11', event:'oracle-answer:unhelpful', count:3 }];
  const appended2 = updateOracleFeedback(highUnhelpful, tmpFeedback);
  assert(appended2 === 1, `expected 1 feedback row when unhelpful=3, got ${appended2}`);
  // Idempotent: same day not re-appended
  const appended3 = updateOracleFeedback(highUnhelpful, tmpFeedback);
  assert(appended3 === 0, `expected 0 rows on re-run (idempotent), got ${appended3}`);

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

  // S192: per-cluster oracle feedback. Parse helper + global fold + per-cluster rows.
  assert(parseOracleAnswer('oracle-answer:helpful').clusterKey === '*', 'untagged → global clusterKey');
  assert(parseOracleAnswer('oracle-answer:unhelpful:what-new').clusterKey === 'what-new', 'tagged → clusterId parsed');
  assert(parseOracleAnswer('oracle-answer:helpful:Bad Key') === null, 'illegal clusterId charset → null');
  assert(parseOracleAnswer('proof-line:shown') === null, 'non-oracle event → null');
  // Per-cluster names fold into the GLOBAL family rate alongside untagged events.
  const clusterHist = [
    { schemaVersion: '1.0', day: '2026-06-12', event: 'oracle-answer:helpful:what-new', count: 4 },
    { schemaVersion: '1.0', day: '2026-06-12', event: 'oracle-answer:unhelpful:what-new', count: 3 },
    { schemaVersion: '1.0', day: '2026-06-12', event: 'oracle-answer:helpful', count: 1 },
  ];
  const clusterSummary = deriveSummary(clusterHist);
  const cFam = clusterSummary.families.find((f) => f.family === 'oracle-answer');
  assert(cFam.counts.helpful === 5 && cFam.counts.unhelpful === 3, `global fold: helpful=5 unhelpful=3, got ${cFam.counts.helpful}/${cFam.counts.unhelpful}`);
  // updateOracleFeedback writes a per-cluster row AND the global '*' row when over threshold.
  const tmpFeedback2 = path.join(dir, 'oracle-feedback-cluster.ndjson');
  const clusterAppended = updateOracleFeedback(clusterHist, tmpFeedback2);
  const writtenCluster = fs.readFileSync(tmpFeedback2, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  assert(clusterAppended === 2, `expected 2 rows (what-new + global '*'), got ${clusterAppended}`);
  assert(writtenCluster.some((r) => r.clusterKey === 'what-new' && r.unhelpful === 3), 'per-cluster row written');
  assert(writtenCluster.some((r) => r.clusterKey === '*' && r.unhelpful === 3), 'global aggregate row written');

  // S194: funnel CTA + acquisition-source aggregation (additive, prefix-stripped).
  const s194Hist = [
    { schemaVersion: '1.0', day: '2026-06-12', event: 'funnel:home_hero_play_click', count: 7 },
    { schemaVersion: '1.0', day: '2026-06-12', event: 'funnel:home_hero_games_click', count: 2 },
    { schemaVersion: '1.0', day: '2026-06-12', event: 'source:search', count: 5 },
    { schemaVersion: '1.0', day: '2026-06-12', event: 'source:direct', count: 4 },
    { schemaVersion: '1.0', day: '2026-06-12', event: 'share:call-of-doodie:native', count: 3 },
    { schemaVersion: '1.0', day: '2026-06-12', event: 'share:call-of-doodie:copy', count: 1 },
    { schemaVersion: '1.0', day: '2026-06-12', event: 'proof-line:shown', count: 1 },
  ];
  const s194 = deriveSummary(s194Hist);
  assert(s194.funnelCtas.home_hero_play_click === 7 && s194.funnelCtas.home_hero_games_click === 2, 'funnelCtas strips funnel: prefix and counts');
  assert(s194.funnelCtas['proof-line:shown'] === undefined, 'funnelCtas excludes non-funnel events');
  assert(s194.sources.search === 5 && s194.sources.direct === 4, 'sources strips source: prefix and counts');
  assert(Object.keys(s194.funnelCtas).join(',') === 'home_hero_games_click,home_hero_play_click', 'funnelCtas keys sorted for byte-stability');
  assert(s194.shares['call-of-doodie:native'] === 3 && s194.shares['call-of-doodie:copy'] === 1, 'shares strips share: prefix and counts per slug:outcome');

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('rollup-rum-ux --self-test: OK (24 assertions)');
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
  const newFeedback = updateOracleFeedback(history);
  const feedbackNote = newFeedback ? ` + ${newFeedback} oracle-feedback row(s)` : '';
  console.log(`rollup-rum-ux: ${samples.length} ux sample(s) → ${history.length} history row(s) → api/funnel-summary.json${feedbackNote}`);
}

const RUN_DIRECT = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (RUN_DIRECT) main();
