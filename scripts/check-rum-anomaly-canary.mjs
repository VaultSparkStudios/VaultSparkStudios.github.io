#!/usr/bin/env node
/**
 * Week-over-week Real User Monitoring (RUM) anomaly canary.
 *
 * Performance verdict and telemetry coverage are separate dimensions. The
 * canary retains the last comparable windows for diagnosis, but never calls
 * empty, thin, or stale current evidence healthy (CANON-031).
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
const STRICT = args.includes('--strict');
const windowArg = args.find((a) => a.startsWith('--window-days='));
const WINDOW_DAYS = Math.max(1, Number(windowArg ? windowArg.split('=')[1] : 7) || 7);
const freshnessArg = args.find((a) => a.startsWith('--fresh-days='));
const FRESH_DAYS = Math.max(1, Number(freshnessArg ? freshnessArg.split('=')[1] : WINDOW_DAYS) || WINDOW_DAYS);
const minArg = args.find((a) => a.startsWith('--min-samples='));
const MIN_SAMPLES = Math.max(1, Number(minArg ? minArg.split('=')[1] : 50) || 50);
const HISTORY = path.join(ROOT, 'data', 'rum-history.ndjson');
const OUT = path.join(ROOT, '.cache', 'rum-anomaly-canary.json');
const DAY_MS = 86400000;

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

function median(values) {
  const sorted = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
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

export function analyze(rows, {
  now = Date.now(),
  windowDays = WINDOW_DAYS,
  freshDays = FRESH_DAYS,
  minSamples = MIN_SAMPLES,
} = {}) {
  const validDays = rows.map((row) => row.day).filter((day) => dayMs(day) !== null).sort();
  const latestDay = validDays.at(-1) || null;
  const latestMs = latestDay ? dayMs(latestDay) : null;
  const nowDayMs = Date.parse(new Date(now).toISOString().slice(0, 10) + 'T00:00:00Z');
  const latestAgeDays = latestMs === null ? null : Math.max(0, Math.floor((nowDayMs - latestMs) / DAY_MS));

  // Last-known comparison is anchored to the latest observation, not wall
  // clock. This preserves useful history during an outage without pretending
  // that the result describes current performance.
  const anchorEnd = latestMs === null ? now : latestMs + DAY_MS;
  const latestStart = anchorEnd - windowDays * DAY_MS;
  const previousStart = latestStart - windowDays * DAY_MS;
  const latest = summarizeWindow(rows, latestStart, anchorEnd);
  const previous = summarizeWindow(rows, previousStart, latestStart);
  const routes = {};
  const anomalies = [];
  let sufficientRouteCount = 0;

  for (const route of new Set([...Object.keys(latest), ...Object.keys(previous)])) {
    const cur = latest[route] || { samples: 0 };
    const prev = previous[route] || { samples: 0 };
    const enough = cur.samples >= minSamples && prev.samples >= minSamples;
    if (enough) sufficientRouteCount += 1;
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
      status: enough ? 'ok' : 'insufficient',
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

  const currentFresh = latestAgeDays !== null && latestAgeDays < freshDays;
  const evidenceState = rows.length === 0 || latestDay === null
    ? 'empty'
    : !currentFresh
      ? 'stale'
      : sufficientRouteCount === 0
        ? 'thin'
        : anomalies.length
          ? 'anomaly'
          : 'healthy';
  const ok = evidenceState === 'healthy' ? true : evidenceState === 'anomaly' ? false : null;

  return {
    schemaVersion: '2.0',
    generatedAt: latestDay ? `${latestDay}T00:00:00.000Z` : null,
    windowDays,
    minSamples,
    evidenceState,
    currentVerdict: ok === true ? 'pass' : ok === false ? 'fail' : 'unavailable',
    status: evidenceState === 'anomaly' ? 'alert' : evidenceState === 'healthy' ? 'ok' : evidenceState,
    ok,
    coverage: {
      totalRows: rows.length,
      observedRoutes: Object.keys(routes).length,
      sufficientRoutes: sufficientRouteCount,
      latestDay,
      latestAgeDays,
      freshnessMaxDays: freshDays,
      currentFresh,
    },
    comparison: {
      basis: 'last-known-observation',
      latestStart: latestDay ? new Date(latestStart).toISOString().slice(0, 10) : null,
      latestEndExclusive: latestDay ? new Date(anchorEnd).toISOString().slice(0, 10) : null,
      previousStart: latestDay ? new Date(previousStart).toISOString().slice(0, 10) : null,
    },
    routes,
    anomalies,
  };
}

export function strictFailure(report) {
  return report.ok !== true;
}

function sampleRows({ lcpPrevious = 1800, lcpCurrent = 1800, samples = 10 } = {}) {
  const rows = [];
  const end = Date.parse('2026-05-28T00:00:00Z');
  for (let daysAgo = 13; daysAgo >= 7; daysAgo--) {
    rows.push({ day: new Date(end - daysAgo * DAY_MS).toISOString().slice(0, 10), route: '/', samples, lcpP75: lcpPrevious, clsP75: 0.02 });
  }
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    rows.push({ day: new Date(end - daysAgo * DAY_MS).toISOString().slice(0, 10), route: '/', samples, lcpP75: lcpCurrent, clsP75: 0.02 });
  }
  return rows;
}

if (SELF_TEST) {
  const now = Date.parse('2026-05-29T12:00:00Z');
  const healthy = analyze(sampleRows(), { now, minSamples: 50 });
  const anomaly = analyze(sampleRows({ lcpCurrent: 2400 }), { now, minSamples: 50 });
  const thin = analyze(sampleRows({ samples: 1 }), { now, minSamples: 50 });
  const stale = analyze(sampleRows(), { now: Date.parse('2026-06-20T00:00:00Z'), minSamples: 50 });
  const empty = analyze([], { now, minSamples: 50 });
  const cases = [
    ['healthy requires fresh sufficient evidence', healthy.evidenceState === 'healthy' && healthy.ok === true],
    ['anomaly is a current failure and alert', anomaly.evidenceState === 'anomaly' && anomaly.ok === false && anomaly.status === 'alert'],
    ['thin evidence is unavailable, not healthy', thin.evidenceState === 'thin' && thin.ok === null && thin.routes['/'].status === 'insufficient'],
    ['stale evidence is unavailable but retains last-known routes', stale.evidenceState === 'stale' && stale.ok === null && stale.routes['/']],
    ['empty ledger is distinct from stale ledger', empty.evidenceState === 'empty' && empty.coverage.totalRows === 0],
    ['strict mode rejects unavailable evidence', strictFailure(stale) && strictFailure(thin) && !strictFailure(healthy)],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`check-rum-anomaly-canary --self-test: ${cases.length - failed}/${cases.length} passed`);
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
  console.log(`  Evidence:  ${report.evidenceState}`);
  console.log(`  Rows:      ${report.coverage.totalRows}`);
  console.log(`  Routes:    ${report.coverage.observedRoutes} (${report.coverage.sufficientRoutes} sufficient)`);
  console.log(`  Latest:    ${report.coverage.latestDay ?? 'none'} (${report.coverage.latestAgeDays ?? '?'}d old)`);
  console.log(`  Anomalies: ${report.anomalies.length}`);
  for (const anomaly of report.anomalies) {
    console.log(`  ${report.evidenceState === 'anomaly' ? 'alert' : 'last-known'}: ${anomaly.route} ${anomaly.metric} degraded (${JSON.stringify(anomaly)})`);
  }
  if (report.evidenceState === 'healthy') console.log('\nok: current week-over-week field evidence has no anomaly');
  if (report.evidenceState === 'stale') console.log('\nadvisory: current anomaly verdict unavailable; stale last-known comparison retained');
  if (report.evidenceState === 'thin') console.log('\nadvisory: current anomaly verdict unavailable; comparison windows are below the sample floor');
  if (report.evidenceState === 'empty') console.log('\nadvisory: current anomaly verdict unavailable; ledger has no observations');
}

if (CHECK && STRICT && strictFailure(report)) process.exit(1);
process.exit(0);
