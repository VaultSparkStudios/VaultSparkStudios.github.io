#!/usr/bin/env node
/**
 * pull-rum-summary.mjs (S163 audit #1 · rum-field-lcp-gate)
 *
 * Closes the RUM → perf-budget loop — the missing bridge in an otherwise
 * complete pipeline. The Worker `/v/rum` ingest (S154) writes raw visits to R2;
 * `scripts/rollup-rum.mjs` rolls a raw export into per-day-per-route p75 rows at
 * `data/rum-history.ndjson`. Nothing yet feeds those field numbers into the perf
 * gate, so the gate still judged `/` on cold-bucket synthetic traces — the noise
 * S162 proved was not a real regression. This script aggregates the rollup over a
 * rolling window into `data/rum-summary.json`, which `check-perf-budget.mjs
 * --source=rum` treats as the AUTHORITATIVE signal.
 *
 * Field-first by design. p75 of real visitors is the metric Core Web Vitals
 * actually scores; a synthetic single-trace cold-bucket number is not.
 *
 * Sources (first that resolves wins):
 *   --from=<path>          explicit ndjson|json (rollup rows OR raw rows)
 *   $RUM_RAW_PATH          env path to an export
 *   data/rum-history.ndjson  canonical rollup-rum output (primary)
 *   data/rum-raw.ndjson    raw export drop (secondary)
 *   (none)                 → emits an honest empty summary (totalSamples 0) so
 *                            the gate falls back to synthetic with low-sample.
 *
 * Row shapes accepted:
 *   rollup (preferred): { day, route, samples, lcpP75, clsP75, inpP75, ... }
 *   raw:                { route, lcp, cls, inp, fcp, ttfb, ts? | dt? }
 *
 * Window aggregation: per route, totalSamples = Σ samples across the window;
 * the window p75 is the p75 OF the daily p75 values (one bad day doesn't
 * dominate, mirroring the synthetic gate's rolling-median philosophy). Raw rows
 * are bucketed and p75'd directly.
 *
 * Output: data/rum-summary.json
 *
 * Usage:
 *   node scripts/pull-rum-summary.mjs                  # write summary
 *   node scripts/pull-rum-summary.mjs --from=x.ndjson  # explicit source
 *   node scripts/pull-rum-summary.mjs --window-days=7  # rolling window
 *   node scripts/pull-rum-summary.mjs --check          # present + parseable
 *   node scripts/pull-rum-summary.mjs --self-test      # p75 math unit checks
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'rum-summary.json');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

function flag(name, fallback) {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
}

const WINDOW_DAYS = Math.max(1, Number(flag('--window-days', 7)) || 7);
// Below this per-route sample count, the field number is statistically thin —
// the gate should keep synthetic as a backstop. 50 is a conservative floor for
// a stable p75 on a low-traffic studio site.
const MIN_SAMPLES = Math.max(1, Number(flag('--min-samples', 50)) || 50);

const METRICS = ['lcp', 'cls', 'inp', 'fcp', 'ttfb'];
// CWV "good" p75 thresholds (matches fieldBudget in summary output).
const CWV_BUDGET = { lcp: 2500, cls: 0.1, inp: 200 };

/** Nearest-rank p75 (the percentile CWV scores against). */
function p75(nums) {
  const sorted = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const rank = Math.ceil(0.75 * sorted.length); // 1-based
  return sorted[Math.min(rank, sorted.length) - 1];
}

function normalizeRoute(route) {
  if (!route || typeof route !== 'string') return null;
  let r = route.split('?')[0].split('#')[0].trim();
  if (!r.startsWith('/')) r = `/${r}`;
  return r;
}

function rowTimestamp(row) {
  if (row.ts) { const t = Date.parse(row.ts); if (Number.isFinite(t)) return t; }
  if (row.dt) { const t = Date.parse(row.dt); if (Number.isFinite(t)) return t; }
  return null;
}

const isRollupRow = (row) => row && typeof row === 'object' && (row.lcpP75 != null || row.clsP75 != null || row.day != null);

function rollupDayInWindow(row, cutoff) {
  if (!row.day) return true; // undated rollup rows are kept
  const t = Date.parse(`${row.day}T00:00:00Z`);
  return !Number.isFinite(t) || t >= cutoff;
}

/**
 * Per-route p75 summary within the rolling window. Handles both rollup rows
 * (per-day p75 → window p75-of-p75) and raw rows (bucket → direct p75).
 */
function summarize(rows, { windowDays = WINDOW_DAYS, now = Date.now() } = {}) {
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  const rollups = new Map(); // route → [dailyRow]
  const raws = new Map();     // route → [rawRow]
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const route = normalizeRoute(row.route);
    if (!route) continue;
    if (isRollupRow(row)) {
      if (!rollupDayInWindow(row, cutoff)) continue;
      if (!rollups.has(route)) rollups.set(route, []);
      rollups.get(route).push(row);
    } else {
      const ts = rowTimestamp(row);
      if (ts !== null && ts < cutoff) continue;
      if (!raws.has(route)) raws.set(route, []);
      raws.get(route).push(row);
    }
  }

  const routes = {};
  const allRoutes = new Set([...rollups.keys(), ...raws.keys()]);
  for (const route of [...allRoutes].sort()) {
    const dayRows = rollups.get(route) || [];
    const rawRows = raws.get(route) || [];
    let samples = 0;
    const p = {};
    if (dayRows.length) {
      samples += dayRows.reduce((n, r) => n + (Number(r.samples) || 0), 0);
      // window p75 = p75 of the daily p75 values for each metric.
      p.lcp = p75(dayRows.map((r) => Number(r.lcpP75)));
      p.cls = p75(dayRows.map((r) => Number(r.clsP75)));
      p.inp = p75(dayRows.map((r) => Number(r.inpP75)));
      p.fcp = p75(dayRows.map((r) => Number(r.fcpP75)));
      p.ttfb = p75(dayRows.map((r) => Number(r.ttfbP75)));
    } else {
      samples += rawRows.length;
      for (const m of METRICS) p[m] = p75(rawRows.map((r) => Number(r[m])));
    }
    const lcpOk = p.lcp != null && p.lcp <= CWV_BUDGET.lcp;
    const clsOk = p.cls != null && p.cls <= CWV_BUDGET.cls;
    const inpOk = p.inp != null && p.inp <= CWV_BUDGET.inp;
    const hasCwv = p.lcp != null && p.cls != null && p.inp != null;
    routes[route] = {
      samples,
      sufficient: samples >= MIN_SAMPLES,
      cwvPass: hasCwv ? (lcpOk && clsOk && inpOk) : null,
      p75: {
        lcp: p.lcp == null ? null : Math.round(p.lcp),
        cls: p.cls == null ? null : Number(p.cls.toFixed(4)),
        inp: p.inp == null ? null : Math.round(p.inp),
        fcp: p.fcp == null ? null : Math.round(p.fcp),
        ttfb: p.ttfb == null ? null : Math.round(p.ttfb),
      },
    };
  }
  return routes;
}

function loadRows() {
  const explicit = flag('--from', process.env.RUM_RAW_PATH || '');
  const candidates = [
    explicit,
    path.join(ROOT, 'data', 'rum-history.ndjson'), // canonical rollup-rum output (primary)
    path.join(ROOT, 'data', 'rum-raw.ndjson'),     // raw export drop (secondary)
    path.join(ROOT, 'data', 'rum-raw.json'),
  ].filter(Boolean);
  for (const file of candidates) {
    const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8').trim();
    if (!text) return { source: path.relative(ROOT, abs), rows: [] };
    // Accept either a JSON array or newline-delimited JSON.
    if (text[0] === '[') {
      try { return { source: path.relative(ROOT, abs), rows: JSON.parse(text) }; } catch { /* fall through */ }
    }
    const rows = text.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    return { source: path.relative(ROOT, abs), rows };
  }
  return { source: 'none', rows: [] };
}

if (SELF_TEST) {
  const cases = [];
  // p75 nearest-rank.
  cases.push(['p75 of 1..4 → 4 (ceil(0.75*4)=3 → idx2=3? nearest-rank=3rd)', p75([1, 2, 3, 4]) === 3]);
  cases.push(['p75 of [10] → 10', p75([10]) === 10]);
  cases.push(['p75 empty → null', p75([]) === null]);
  // route normalization strips query/hash.
  cases.push(['normalizeRoute /a?x=1 → /a', normalizeRoute('/a?x=1') === '/a']);
  cases.push(['normalizeRoute foo → /foo', normalizeRoute('foo') === '/foo']);
  // summarize groups by route and flags sufficiency.
  const rows = [
    ...Array.from({ length: 60 }, (_, i) => ({ route: '/', lcp: 1000 + i * 10, cls: 0.01, inp: 50 })),
    { route: '/membership/', lcp: 4000, cls: 0.2, inp: 300 },
  ];
  const sum = summarize(rows, { windowDays: 7 });
  cases.push(['/ has 60 samples → sufficient', sum['/'].samples === 60 && sum['/'].sufficient === true]);
  cases.push(['/membership/ has 1 sample → not sufficient', sum['/membership/'].sufficient === false]);
  cases.push(['/ p75 lcp is finite', Number.isFinite(sum['/'].p75.lcp)]);
  // window drop: an ancient timestamped row is excluded.
  const windowed = summarize([{ route: '/old', lcp: 9999, ts: '2000-01-01T00:00:00Z' }], { windowDays: 7 });
  cases.push(['ancient row dropped by window', windowed['/old'] === undefined]);
  // rollup rows (rollup-rum output) are recognized and aggregated.
  const today = new Date().toISOString().slice(0, 10);
  const rollupSum = summarize([
    { day: today, route: '/', samples: 70, lcpP75: 2100, clsP75: 0.04, inpP75: 80 },
    { day: today, route: '/', samples: 40, lcpP75: 2300, clsP75: 0.05, inpP75: 90 },
  ], { windowDays: 7 });
  cases.push(['rollup rows summed: / has 110 samples', rollupSum['/'].samples === 110]);
  cases.push(['rollup window p75 lcp finite', Number.isFinite(rollupSum['/'].p75.lcp)]);
  // ancient rollup day dropped.
  const oldRollup = summarize([{ day: '2000-01-01', route: '/x', samples: 999, lcpP75: 1 }], { windowDays: 7 });
  cases.push(['ancient rollup day dropped', oldRollup['/x'] === undefined]);
  let pass = 0, fail = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); ok ? pass++ : fail++; }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const { source, rows } = loadRows();
const routes = summarize(rows);
const totalSamples = Object.values(routes).reduce((n, r) => n + r.samples, 0);
const sufficientRoutes = Object.values(routes).filter((r) => r.sufficient).length;

// CWV composite pass rate — % of sufficient routes where all 3 p75s meet budget.
// null when no sufficient routes have all three vitals measured.
const sufficientWithCwv = Object.values(routes).filter((r) => r.sufficient && r.cwvPass !== null);
const cwvPassRouteCount = sufficientWithCwv.filter((r) => r.cwvPass === true).length;
const cwvPassRate = sufficientWithCwv.length > 0
  ? Math.round((cwvPassRouteCount / sufficientWithCwv.length) * 100)
  : null;

const summary = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/pull-rum-summary.mjs',
  source,
  windowDays: WINDOW_DAYS,
  minSamples: MIN_SAMPLES,
  fieldBudget: { lcp: 2500, cls: 0.1, inp: 200 }, // CWV "good" p75 thresholds
  totalSamples,
  sufficientRoutes,
  cwvPassRate,
  cwvPassRouteCount,
  cwvMeasuredRouteCount: sufficientWithCwv.length,
  routes,
};

if (CHECK) {
  if (!fs.existsSync(OUT)) {
    console.error('pull-rum-summary --check: data/rum-summary.json missing — run without --check first');
    process.exit(1);
  }
  try {
    JSON.parse(fs.readFileSync(OUT, 'utf8'));
    console.log(`pull-rum-summary --check: ok (source=${source}, totalSamples=${totalSamples}, sufficientRoutes=${sufficientRoutes})`);
    process.exit(0);
  } catch (e) {
    console.error('pull-rum-summary --check: data/rum-summary.json is not valid JSON');
    process.exit(1);
  }
}

// S176 conflict guard: the nightly rum-pull.yml cron commits this file from
// CI — a local rewrite while a CI commit is in flight produced a UU merge
// conflict on a generated file (S176 /start). When the last commit touching
// the summary is a fresh github-actions one, skip the local rewrite unless
// --force is passed.
if (!args.includes('--force')) {
  try {
    const { execFileSync } = await import('node:child_process');
    // execFileSync bypasses the shell — the `|` separator in a --format string
    // is otherwise interpreted as a pipe by Windows cmd.exe (breaks %an). Use
    // git's own %n newline token as the separator.
    const log = execFileSync('git', ['log', '-1', '--format=%cI%n%an', '--', 'data/rum-summary.json'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const [iso, author] = log.split(/\r?\n/);
    const ageH = (Date.now() - Date.parse(iso)) / 36e5;
    if (/github-actions/i.test(author || '') && ageH < 24) {
      console.log(`pull-rum-summary: CI-fresh (committed by ${author} ${ageH.toFixed(1)}h ago) — skipping local rewrite. Use --force to override.`);
      process.exit(0);
    }
  } catch { /* not a git checkout or no history — proceed */ }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`pull-rum-summary → ${path.relative(ROOT, OUT)}`);
console.log(`  source: ${source} · window: ${WINDOW_DAYS}d · totalSamples: ${totalSamples} · sufficientRoutes: ${sufficientRoutes}`);
if (source === 'none') {
  console.log('  (no RUM export found — summary is empty; perf-budget --source=rum will fall back to synthetic)');
  console.log('  to activate: drop a raw RUM export at data/rum-raw.ndjson or set RUM_RAW_PATH / --from=');
}
