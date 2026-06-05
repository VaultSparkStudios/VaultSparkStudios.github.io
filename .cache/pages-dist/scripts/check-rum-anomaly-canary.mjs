#!/usr/bin/env node
/**
 * Week-over-week RUM anomaly canary.
 *
 * Reads rollup RUM history and warns when the latest window degrades sharply
 * versus the immediately preceding window. This is advisory by default: it
 * catches drift before the strict field budget is ready to fail.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const CHECK = args.includes('--check');
const JSON_MODE = args.includes('--json');
const strict = args.includes('--strict');
const windowArg = args.find((a) => a.startsWith('--window-days='));
const WINDOW_DAYS = Math.max(1, Number(windowArg ? windowArg.split('=')[1] : 7) || 7);
const minArg = args.find((a) => a.startsWith('--min-samples='));
const MIN_SAMPLES = Math.max(1, Number(minArg ? minArg.split('=')[1] : 50) || 50);
const HISTORY = path.join(ROOT, 'data', 'rum-history.ndjson');
const OUT = path.join(ROOT, '.cache', 'rum-anomaly-canary.json');

function loadRows(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

function dayMs(day) {
  const t = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(t) ? t : null;
}

function summarizeWindow(rows, start, end) {
  const routes = new Map();
  for (const row of rows) {
    const t = dayMs(row.day);
    if (t === null || t < start || t >= end) continue;
    const route = row.route || '/';
    if (!routes.has(route)) routes.set(route, { samples: 0, lcp: [], cls: [], inp: [] });
    const bucket = routes.get(route);
    bucket.samples += Number(row.samples) || 0;
    if (Number.isFinite(Number(row.lcpP75))) bucket.lcp.push(Number(row.lcpP75));
    if (Number.isFinite(Number(row.clsP75))) bucket.cls.push(Number(row.clsP75));
    if (Number.isFinite(Number(row.inpP75))) bucket.inp.push(Number(row.inpP75));
  }
  const out = {};
  for (const [route, bucket] of routes) {
    out[route] = {
      samples: bucket.samples,
      lcpP75: median(bucket.lcp),
      clsP75: median(bucket.cls),
      inpP75: median(bucket.inp),
    };
  }
  return out;
}

function median(values) {
  const sorted = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function analyze(rows, { now = Date.now(), windowDays = WINDOW_DAYS, minSamples = MIN_SAMPLES } = {}) {
  const latestDay = rows
    .map((row) => row.day)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
  const end = now;
  const latestStart = end - windowDays * 86400000;
  const previousStart = latestStart - windowDays * 86400000;
  const latest = summarizeWindow(rows, latestStart, end);
  const previous = summarizeWindow(rows, previousStart, latestStart);
  const routes = {};
  const anomalies = [];
  for (const route of new Set([...Object.keys(latest), ...Object.keys(previous)])) {
    const cur = latest[route] || { samples: 0 };
    const prev = previous[route] || { samples: 0 };
    const enough = cur.samples >= minSamples && prev.samples >= minSamples;
    const lcpDeltaPct = enough && prev.lcpP75 ? ((cur.lcpP75 - prev.lcpP75) / prev.lcpP75) * 100 : null;
    const clsDelta = enough && prev.clsP75 !== null && cur.clsP75 !== null ? cur.clsP75 - prev.clsP75 : null;
    const routeResult = {
      currentSamples: cur.samples || 0,
      previousSamples: prev.samples || 0,
      sufficient: enough,
      current: { lcpP75: cur.lcpP75 ?? null, clsP75: cur.clsP75 ?? null, inpP75: cur.inpP75 ?? null },
      previous: { lcpP75: prev.lcpP75 ?? null, clsP75: prev.clsP75 ?? null, inpP75: prev.inpP75 ?? null },
      lcpDeltaPct: lcpDeltaPct === null ? null : Number(lcpDeltaPct.toFixed(1)),
      clsDelta: clsDelta === null ? null : Number(clsDelta.toFixed(4)),
      status: 'ok',
    };
    if (enough && lcpDeltaPct !== null && lcpDeltaPct >= 20 && (cur.lcpP75 - prev.lcpP75) >= 250) {
      routeResult.status = 'anomaly';
      anomalies.push({ route, metric: 'lcp', deltaPct: routeResult.lcpDeltaPct, current: cur.lcpP75, previous: prev.lcpP75 });
    }
    if (enough && clsDelta !== null && clsDelta >= 0.03) {
      routeResult.status = 'anomaly';
      anomalies.push({ route, metric: 'cls', delta: routeResult.clsDelta, current: cur.clsP75, previous: prev.clsP75 });
    }
    routes[route] = routeResult;
  }
  return {
    schemaVersion: '1.0',
    generatedAt: latestDay ? `${latestDay}T00:00:00.000Z` : null,
    windowDays,
    minSamples,
    ok: anomalies.length === 0,
    routes,
    anomalies,
  };
}

if (SELF_TEST) {
  const rows = [];
  const base = Date.parse('2026-05-27T00:00:00Z');
  for (let i = 13; i >= 7; i--) rows.push({ day: new Date(base - i * 86400000).toISOString().slice(0, 10), route: '/', samples: 10, lcpP75: 1800, clsP75: 0.02 });
  for (let i = 6; i >= 0; i--) rows.push({ day: new Date(base - i * 86400000).toISOString().slice(0, 10), route: '/', samples: 10, lcpP75: 2400, clsP75: 0.02 });
  const report = analyze(rows, { now: base + 86400000, windowDays: 7, minSamples: 50 });
  const thin = analyze(rows, { now: base + 86400000, windowDays: 7, minSamples: 500 });
  const cases = [
    ['detects LCP anomaly', report.anomalies.some((a) => a.metric === 'lcp')],
    ['marks thin samples non-anomalous', thin.anomalies.length === 0 && thin.routes['/'].sufficient === false],
    ['emits route deltas', report.routes['/'].lcpDeltaPct > 20],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const report = analyze(loadRows(HISTORY));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

if (JSON_MODE) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('rum-anomaly-canary');
  console.log('──────────────────────────────────────────────');
  console.log(`  Routes:    ${Object.keys(report.routes).length}`);
  console.log(`  Anomalies: ${report.anomalies.length}`);
  for (const anomaly of report.anomalies) {
    console.log(`  warn: ${anomaly.route} ${anomaly.metric} degraded (${JSON.stringify(anomaly)})`);
  }
  if (!report.anomalies.length) console.log('\nok: no week-over-week field anomaly detected');
  if (!Object.keys(report.routes).length) console.log('\n(no data/rum-history.ndjson rows yet; canary artifact written as empty)');
}

if (CHECK && report.anomalies.length && strict) process.exit(1);
process.exit(0);
