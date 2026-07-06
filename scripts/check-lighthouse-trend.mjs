#!/usr/bin/env node
/**
 * check-lighthouse-trend.mjs (S225 second-order innovation)
 *
 * Reads lighthouse-results/lhr-*.json (Lighthouse CI artifacts), computes per-page
 * median scores, and compares against a session-over-session ledger at
 * .cache/lighthouse-trend.json to catch regressions before they reach production.
 *
 * Why: Lighthouse CI only reports PASS/FAIL at a threshold. It cannot detect a
 * score sliding from 0.95 → 0.88 → 0.82 → 0.80 (just passing) across sessions —
 * a slow bleed that the binary gate misses until you fall below the floor. This
 * tracker surfaces that trend and emits a warning (or error) so regressions are
 * caught while still recoverable.
 *
 * Modes:
 *   (default)    print trend report for current results; exit 0
 *   --check      exit 1 only for ERROR_DELTA regressions; WARN_DELTA stays visible/advisory
 *   --update     write current medians as a new entry in .cache/lighthouse-trend.json
 *   --session N  label the new entry as "SN" (used with --update)
 *   --self-test  run synthetic fixture tests; exit 0/1
 *
 * The medians of the current LHR set are always shown regardless of mode.
 * --check and --update are composable (check first, then update).
 *
 * Regression thresholds:
 *   WARN_DELTA  = 0.05  → ⚠  warning (always advisory; paired with floor gate for sustained debt)
 *   ERROR_DELTA = 0.10  → ✗  error   (exits 1 in all modes, including --check)
 *
 * Categories tracked: performance · accessibility · best-practices · seo
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LHR_DIR = path.join(ROOT, 'lighthouse-results');
const TREND_FILE = path.join(ROOT, '.cache', 'lighthouse-trend.json');
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
// Raw timing metrics tracked for diagnostic context (not used for regression gating)
// integer:true → store as ms integer; integer:false → store as raw float (e.g. CLS 0.003)
const RAW_METRICS = [
  { key: 'largest-contentful-paint', label: 'lcp_ms', integer: true },
  { key: 'first-contentful-paint',   label: 'fcp_ms', integer: true },
  { key: 'total-blocking-time',      label: 'tbt_ms', integer: true },
  { key: 'cumulative-layout-shift',  label: 'cls',    integer: false },
];
const RAW_METRIC_LABELS = new Set(RAW_METRICS.map(m => m.label));
const WARN_DELTA = 0.05;
const ERROR_DELTA = 0.10;
const BASELINE_WINDOW = 10;

const args = process.argv.slice(2);
const doCheck = args.includes('--check');
const doUpdate = args.includes('--update');
const isSelfTest = args.includes('--self-test');
const sessionArg = (() => {
  const i = args.indexOf('--session');
  return i !== -1 ? args[i + 1] : null;
})();

// ── Pure core ───────────────────────────────────────────────────────────────────

/** median(arr) — NaN-safe; returns null for empty arrays */
function median(arr) {
  const sorted = arr.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * parseLhrDir(dir) — read all lhr-*.json files in dir.
 * Returns { pageSlug → { category → [score, …], lcp_ms → [ms, …], … } }
 */
export function parseLhrDir(dir) {
  const byPage = {};
  let files = [];
  try {
    files = fs.readdirSync(dir).filter(f => /^lhr-.*\.json$/.test(f));
  } catch {
    return byPage;
  }
  for (const f of files) {
    let lhr;
    try { lhr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    const rawUrl = lhr.finalUrl || lhr.requestedUrl || '';
    const slug = rawUrl.replace(/^https?:\/\/[^/]+/, '') || '/';
    if (!byPage[slug]) byPage[slug] = {};
    for (const cat of CATEGORIES) {
      const score = lhr.categories?.[cat]?.score;
      if (typeof score === 'number') {
        if (!byPage[slug][cat]) byPage[slug][cat] = [];
        byPage[slug][cat].push(score);
      }
    }
    // S226: also collect raw metric timings for diagnostic context
    for (const { key, label, integer } of RAW_METRICS) {
      const val = lhr.audits?.[key]?.numericValue;
      if (typeof val === 'number' && !isNaN(val)) {
        if (!byPage[slug][label]) byPage[slug][label] = [];
        byPage[slug][label].push(integer ? Math.round(val) : val);
      }
    }
  }
  return byPage;
}

/**
 * computeMedians(byPage) — collapse runs to medians.
 * Returns { pageSlug → { category → medianScore } }
 */
export function computeMedians(byPage) {
  const out = {};
  for (const [slug, cats] of Object.entries(byPage)) {
    out[slug] = {};
    for (const [cat, scores] of Object.entries(cats)) {
      const m = median(scores);
      if (m !== null) {
        if (cat === 'cls') out[slug][cat] = Math.round(m * 10000) / 10000; // 4dp for CLS
        else if (RAW_METRIC_LABELS.has(cat)) out[slug][cat] = Math.round(m); // ms → integer
        else out[slug][cat] = Math.round(m * 100) / 100; // category scores → 2dp
      }
    }
  }
  return out;
}

/**
 * buildBaselines(history) — compute a recent rolling median score for each
 * page+category. A median baseline dampens single-run runner luck while keeping
 * real sustained regressions visible.
 * Returns { pageSlug -> { category -> baselineScore } }
 */
export function buildBaselines(history, windowSize = BASELINE_WINDOW) {
  const recent = history.slice(-windowSize);
  const values = {};
  for (const entry of recent) {
    for (const [slug, cats] of Object.entries(entry.pages || {})) {
      if (!values[slug]) values[slug] = {};
      for (const [cat, score] of Object.entries(cats)) {
        if (!CATEGORIES.includes(cat)) continue;
        if (typeof score !== 'number') continue;
        if (!values[slug][cat]) values[slug][cat] = [];
        values[slug][cat].push(score);
      }
    }
  }

  const baselines = {};
  for (const [slug, cats] of Object.entries(values)) {
    baselines[slug] = {};
    for (const [cat, scores] of Object.entries(cats)) {
      const m = median(scores);
      if (m !== null) baselines[slug][cat] = Math.round(m * 100) / 100;
    }
  }
  return baselines;
}

/**
 * detectRegressions(current, history) — compare current medians against
 * the recent rolling median for each page+category in the history array.
 * Returns [{slug, cat, baseline, now, delta, severity:'warn'|'error'}]
 */
export function detectRegressions(current, history, windowSize = BASELINE_WINDOW) {
  const baselines = buildBaselines(history, windowSize);
  const regressions = [];
  for (const [slug, cats] of Object.entries(current)) {
    for (const [cat, now] of Object.entries(cats)) {
      if (!CATEGORIES.includes(cat)) continue; // raw metrics are diagnostic context, not regression gates
      const prev = baselines[slug]?.[cat];
      if (prev === undefined) continue;
      // Round to 2dp before comparison to avoid floating-point precision surprises
      // (e.g. 0.95 - 0.90 = 0.04999... which incorrectly misses the WARN_DELTA threshold).
      const delta = Math.round((prev - now) * 100) / 100;
      if (delta >= WARN_DELTA) {
        regressions.push({ slug, cat, baseline: prev, now, delta,
          severity: delta >= ERROR_DELTA ? 'error' : 'warn' });
      }
    }
  }
  return regressions;
}

// ── Self-test ───────────────────────────────────────────────────────────────────
if (isSelfTest) {
  let pass = 0, fail = 0;
  const ok = (cond, label) => { if (cond) pass++; else { fail++; console.error(`  ✗ ${label}`); } };

  // median()
  ok(median([0.42, 0.76, 0.78]) === 0.76, 'median odd array');
  ok(median([0.80, 0.82]) === 0.81, 'median even array');
  ok(median([]) === null, 'median empty → null');
  ok(median([NaN, 0.5, NaN]) === 0.5, 'median filters NaN');

  // parseLhrDir on synthetic fixtures
  const tmpDir = path.join(ROOT, '.cache', '__lhr_test_tmp__');
  fs.mkdirSync(tmpDir, { recursive: true });
  const fakeLhr = (url, perfScore, a11yScore, lcpMs = 2000) => ({
    finalUrl: url,
    categories: { performance: { score: perfScore }, accessibility: { score: a11yScore }, 'best-practices': { score: 0.9 }, seo: { score: 0.95 } },
    audits: {
      'largest-contentful-paint': { numericValue: lcpMs },
      'first-contentful-paint':   { numericValue: 800 },
      'total-blocking-time':      { numericValue: 120 },
      'cumulative-layout-shift':  { numericValue: 0.003 },
    },
  });
  fs.writeFileSync(path.join(tmpDir, 'lhr-001.json'), JSON.stringify(fakeLhr('http://127.0.0.1:4173/', 0.80, 0.92, 2400)));
  fs.writeFileSync(path.join(tmpDir, 'lhr-002.json'), JSON.stringify(fakeLhr('http://127.0.0.1:4173/', 0.84, 0.92, 1800)));
  fs.writeFileSync(path.join(tmpDir, 'lhr-003.json'), JSON.stringify(fakeLhr('http://127.0.0.1:4173/games/', 0.90, 0.95, 1200)));

  const byPage = parseLhrDir(tmpDir);
  ok(Object.keys(byPage).length === 2, 'parseLhrDir: 2 pages');
  ok((byPage['/']?.performance || []).length === 2, 'parseLhrDir: 2 perf scores for /');
  ok((byPage['/games/']?.performance || []).length === 1, 'parseLhrDir: 1 perf score for /games/');
  ok((byPage['/']?.lcp_ms || []).length === 2, 'parseLhrDir: raw lcp_ms collected for /');
  ok(byPage['/'].cls?.[0] === 0.003, 'parseLhrDir: cls stored as raw float (not rounded to int)');

  const medians = computeMedians(byPage);
  ok(medians['/'].performance === 0.82, 'computeMedians: / perf median = 0.82');
  ok(medians['/games/'].performance === 0.90, 'computeMedians: /games/ perf = 0.90');
  // median of [2400, 1800] = 2100
  ok(medians['/'].lcp_ms === 2100, `computeMedians: / lcp_ms median = 2100 (got ${medians['/'].lcp_ms})`);
  ok(medians['/'].cls === 0.003, `computeMedians: / cls median = 0.003 (4dp) (got ${medians['/'].cls})`);

  // detectRegressions
  const history = [{ pages: { '/': { performance: 0.90 }, '/games/': { performance: 0.95 } } }];
  const regs = detectRegressions(medians, history);
  ok(regs.length === 2, 'detectRegressions: 2 regressions (/ perf Δ0.08 + /games/ perf Δ0.05)');
  const perfReg = regs.find(r => r.slug === '/' && r.cat === 'performance');
  // 0.90 - 0.82 = 0.08 -> WARN (>= WARN_DELTA=0.05, < ERROR_DELTA=0.10)
  ok(perfReg?.severity === 'warn', 'detectRegressions: / perf delta 0.08 = warn severity');

  // S243: one lucky historical outlier must not become the permanent baseline.
  const noisyHistory = [
    { pages: { '/games/': { performance: 0.80 } } },
    { pages: { '/games/': { performance: 0.81 } } },
    { pages: { '/games/': { performance: 0.87 } } },
    { pages: { '/games/': { performance: 0.80 } } },
    { pages: { '/games/': { performance: 0.81 } } },
  ];
  const noisyRegs = detectRegressions({ '/games/': { performance: 0.81 } }, noisyHistory, 10);
  ok(noisyRegs.length === 0, 'detectRegressions: rolling median ignores one lucky outlier');

  const sustainedRegs = detectRegressions({ '/games/': { performance: 0.74 } }, noisyHistory, 10);
  ok(sustainedRegs.length === 1 && sustainedRegs[0].severity === 'warn', 'detectRegressions: sustained drop from rolling baseline still warns');

  // cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`check-lighthouse-trend --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

// ── Live run ────────────────────────────────────────────────────────────────────

// Parse current results
const byPage = parseLhrDir(LHR_DIR);
if (!Object.keys(byPage).length) {
  console.log('check-lighthouse-trend: lighthouse-results/ is empty or missing — skipping (no LHR artifacts yet)');
  process.exit(0);
}
const current = computeMedians(byPage);

// Load ledger
let ledger = { runs: [] };
try {
  if (fs.existsSync(TREND_FILE)) {
    ledger = JSON.parse(fs.readFileSync(TREND_FILE, 'utf8'));
  }
} catch { /* malformed — treat as empty */ }

// Detect regressions vs history
const regressions = detectRegressions(current, ledger.runs);

// Print current medians
const pageCount = Object.keys(current).length;
const lhrCount = Object.values(byPage).reduce((s, cats) => s + Math.max(...Object.values(cats).map(a => a.length)), 0);
console.log(`check-lighthouse-trend: ${lhrCount} LHR(s) across ${pageCount} page(s)`);
for (const [slug, cats] of Object.entries(current)) {
  const perf = cats.performance !== undefined ? ` perf=${cats.performance.toFixed(2)}` : '';
  const a11y = cats.accessibility !== undefined ? ` a11y=${cats.accessibility.toFixed(2)}` : '';
  const bp = cats['best-practices'] !== undefined ? ` bp=${cats['best-practices'].toFixed(2)}` : '';
  const seo = cats.seo !== undefined ? ` seo=${cats.seo.toFixed(2)}` : '';
  const lcp = cats.lcp_ms !== undefined ? ` lcp=${cats.lcp_ms}ms` : '';
  const tbt = cats.tbt_ms !== undefined ? ` tbt=${cats.tbt_ms}ms` : '';
  console.log(`  ${slug}${perf}${a11y}${bp}${seo}${lcp}${tbt}`);
}

let exitCode = 0;

if (!ledger.runs.length) {
  console.log('  ℹ  No prior history — this run will seed the trend ledger. Use --update to save.');
} else if (!regressions.length) {
  console.log(`  ✓ No regressions vs rolling median of last ${Math.min(BASELINE_WINDOW, ledger.runs.length)} prior run(s)`);
} else {
  for (const r of regressions) {
    const indicator = r.severity === 'error' ? '✗' : '⚠';
    console[r.severity === 'error' ? 'error' : 'warn'](
      `  ${indicator} ${r.slug} [${r.cat}]: baseline ${r.baseline.toFixed(2)} → ${r.now.toFixed(2)} (−${r.delta.toFixed(2)}) [${r.severity}]`
    );
  }
  const hasError = regressions.some(r => r.severity === 'error');
  if (hasError) {
    console.error(`  → Regression ≥${ERROR_DELTA}: fix before merging`);
    exitCode = 1;
  } else if (doCheck) {
    console.warn(`  → Regression ≥${WARN_DELTA} detected: advisory trend warning; hard failure is reserved for ≥${ERROR_DELTA} or the absolute floor gate`);
  }
}

// Update ledger if requested
if (doUpdate) {
  const today = new Date().toISOString().slice(0, 10);
  const session = sessionArg ? `S${sessionArg.replace(/^S/, '')}` : null;
  ledger.runs.push({ date: today, ...(session ? { session } : {}), pages: current });
  // Cap at 50 runs to bound file size
  if (ledger.runs.length > 50) ledger.runs = ledger.runs.slice(-50);
  fs.mkdirSync(path.dirname(TREND_FILE), { recursive: true });
  fs.writeFileSync(TREND_FILE, JSON.stringify(ledger, null, 2));
  console.log(`  ✓ Trend ledger updated (${ledger.runs.length} run(s) total)${session ? ` [${session}]` : ''}`);
}

process.exit(exitCode);
