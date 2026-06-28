#!/usr/bin/env node
/**
 * rollup-inp-telemetry.mjs (S233)
 *
 * Aggregates inp:slow_interaction R2 rows into data/inp-breakdown.json so the
 * dominant offender on each route is immediately visible after field samples land.
 *
 * Background: inp-telemetry.js beacons {event:'inp:slow_interaction', route, element,
 * target, type, duration, inputDelay, processing, presentation} to /v/rum. The S233
 * Worker fix stores this as row.inpPhase in R2. This script reads data/rum-raw.ndjson
 * (R2 export, when available) and emits a phase-aware breakdown per route.
 *
 * Output: data/inp-breakdown.json
 *
 * Usage:
 *   node scripts/rollup-inp-telemetry.mjs              # write breakdown
 *   node scripts/rollup-inp-telemetry.mjs --check      # present + parseable
 *   node scripts/rollup-inp-telemetry.mjs --self-test  # unit checks
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'inp-breakdown.json');
const HISTORY = path.join(ROOT, 'data', 'rum-history.ndjson');
const RAW = path.join(ROOT, 'data', 'rum-raw.ndjson');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

// Only rows within this window are analysed — matches rum-summary window.
const WINDOW_DAYS = 7;

/** Load R2 export rows that carry inpPhase. Prefer rum-raw.ndjson; fall back to
 *  rum-history.ndjson (which won't have inpPhase but lets the --check gate pass). */
function loadRows() {
  for (const file of [RAW, HISTORY]) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8').trim();
    if (!text) return { source: path.relative(ROOT, file), rows: [] };
    const rows = text.split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    return { source: path.relative(ROOT, file), rows };
  }
  return { source: 'none', rows: [] };
}

/** Aggregate inp:slow_interaction rows into per-route phase breakdown. */
function aggregate(rows, { now = Date.now() } = {}) {
  const cutoff = now - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const byRoute = {};

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    if (row.ux !== 'inp:slow_interaction') continue;
    if (!row.inpPhase) continue;
    const ts = row.ts ? Date.parse(row.ts) : null;
    if (ts !== null && Number.isFinite(ts) && ts < cutoff) continue;

    const route = (row.route && typeof row.route === 'string') ? row.route : '/';
    if (!byRoute[route]) byRoute[route] = { samples: 0, targets: {}, types: {}, durations: [], inputDelays: [], processings: [], presentations: [] };
    const r = byRoute[route];
    r.samples++;

    const phase = row.inpPhase;
    const target = (typeof phase.target === 'string' && phase.target) ? phase.target : 'unknown';
    const type = (typeof phase.type === 'string' && phase.type) ? phase.type : 'unknown';
    r.targets[target] = (r.targets[target] || 0) + 1;
    r.types[type] = (r.types[type] || 0) + 1;
    if (Number.isFinite(phase.duration)) r.durations.push(phase.duration);
    if (Number.isFinite(phase.inputDelay)) r.inputDelays.push(phase.inputDelay);
    if (Number.isFinite(phase.processing)) r.processings.push(phase.processing);
    if (Number.isFinite(phase.presentation)) r.presentations.push(phase.presentation);
  }

  function p75(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    if (!sorted.length) return null;
    const rank = Math.ceil(0.75 * sorted.length);
    return sorted[Math.min(rank, sorted.length) - 1];
  }

  function topN(obj, n = 3) {
    return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
  }

  const routes = {};
  for (const [route, r] of Object.entries(byRoute)) {
    routes[route] = {
      samples: r.samples,
      topTargets: topN(r.targets),
      topTypes: topN(r.types),
      p75ms: {
        duration: p75(r.durations),
        inputDelay: p75(r.inputDelays),
        processing: p75(r.processings),
        presentation: p75(r.presentations),
      },
      // Dominant phase: whichever of the three has the highest p75 (tells you WHERE to fix).
      dominantPhase: (() => {
        const phases = [
          { phase: 'inputDelay', val: p75(r.inputDelays) },
          { phase: 'processing', val: p75(r.processings) },
          { phase: 'presentation', val: p75(r.presentations) },
        ].filter((p) => p.val !== null);
        if (!phases.length) return null;
        return phases.reduce((best, cur) => cur.val > best.val ? cur : best).phase;
      })(),
    };
  }
  return routes;
}

if (SELF_TEST) {
  const cases = [];
  const now = new Date('2026-06-28T12:00:00Z').getTime();
  const ts = new Date('2026-06-27T12:00:00Z').toISOString();

  // A well-formed inp row is counted.
  const r1 = aggregate([{
    ux: 'inp:slow_interaction', route: '/games/', ts,
    inpPhase: { element: 'button', target: '[data-filter=all]', type: 'click', duration: 220, inputDelay: 10, processing: 180, presentation: 30 },
  }], { now });
  cases.push(['inp row counted on /games/', r1['/games/']?.samples === 1]);
  cases.push(['top target is [data-filter=all]', r1['/games/']?.topTargets[0]?.name === '[data-filter=all]']);
  cases.push(['dominant phase is processing', r1['/games/']?.dominantPhase === 'processing']);
  cases.push(['p75 duration = 220', r1['/games/']?.p75ms.duration === 220]);

  // A row without inpPhase is ignored.
  const r2 = aggregate([{ ux: 'inp:slow_interaction', route: '/', ts }], { now });
  cases.push(['row without inpPhase ignored', !r2['/']]);

  // A non-inp UX event is ignored.
  const r3 = aggregate([{ ux: 'oracle:viewed', route: '/', ts, inpPhase: { duration: 500 } }], { now });
  cases.push(['non-inp ux event ignored', !r3['/']]);

  // Ancient row is dropped by window.
  const ancient = aggregate([{
    ux: 'inp:slow_interaction', route: '/', ts: '2020-01-01T00:00:00Z',
    inpPhase: { duration: 300, inputDelay: 10, processing: 200, presentation: 90 },
  }], { now });
  cases.push(['ancient row dropped', !ancient['/']]);

  // Multiple targets — top target wins.
  const multiTarget = aggregate([
    { ux: 'inp:slow_interaction', route: '/', ts, inpPhase: { target: 'a', type: 'click', duration: 200, inputDelay: 5, processing: 150, presentation: 45 } },
    { ux: 'inp:slow_interaction', route: '/', ts, inpPhase: { target: 'a', type: 'click', duration: 210, inputDelay: 5, processing: 155, presentation: 50 } },
    { ux: 'inp:slow_interaction', route: '/', ts, inpPhase: { target: 'b', type: 'touchstart', duration: 230, inputDelay: 10, processing: 160, presentation: 60 } },
  ], { now });
  cases.push(['top target = a (2 hits)', multiTarget['/']?.topTargets[0]?.name === 'a']);

  let pass = 0, fail = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); ok ? pass++ : fail++; }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

if (CHECK) {
  if (!fs.existsSync(OUT)) {
    console.error('rollup-inp-telemetry --check: data/inp-breakdown.json missing — run without --check first');
    process.exit(1);
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const n = Object.keys(parsed.routes || {}).length;
    console.log(`rollup-inp-telemetry --check: ok (${n} route(s), ${parsed.totalSamples ?? 0} sample(s))`);
    process.exit(0);
  } catch {
    console.error('rollup-inp-telemetry --check: data/inp-breakdown.json is not valid JSON');
    process.exit(1);
  }
}

const { source, rows } = loadRows();
const routes = aggregate(rows);
const totalSamples = Object.values(routes).reduce((n, r) => n + r.samples, 0);

const out = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/rollup-inp-telemetry.mjs',
  source,
  windowDays: WINDOW_DAYS,
  totalSamples,
  routes,
};

if (totalSamples === 0) {
  console.log('rollup-inp-telemetry: 0 inp:slow_interaction samples — data will populate once field traffic arrives');
  console.log('  NOTE: requires Worker S233 fix deployed (raw.event → raw.ux fallback + inpPhase storage)');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`rollup-inp-telemetry → ${path.relative(ROOT, OUT)} (${totalSamples} sample(s))`);
if (totalSamples > 0) {
  for (const [route, r] of Object.entries(routes)) {
    const top = r.topTargets[0];
    console.log(`  ${route}: ${r.samples} samples · dominant=${r.dominantPhase ?? 'unknown'} · top target=${top?.name ?? 'unknown'}`);
  }
}
