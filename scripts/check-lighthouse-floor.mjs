#!/usr/bin/env node
/**
 * check-lighthouse-floor.mjs (S233)
 *
 * Complements check-lighthouse-trend.mjs (regression gate) with an ABSOLUTE FLOOR
 * gate: detects pages that are consistently below the performance target across
 * multiple recent runs — a "stable but bad" pattern the regression gate misses
 * because there's no single-run regression.
 *
 * Problem: the trend gate catches 0.95 → 0.85 (regression) but not 0.76 → 0.78 → 0.77
 * (hovering at the same bad level). Homepage has been 0.76–0.78 for ≥3 CI runs while
 * the target is 0.80. The regression gate exits 0 each time because no run is ≥0.05
 * worse than the prior one. This gate closes that blind spot.
 *
 * Algorithm: reads .cache/lighthouse-trend.json, takes the last LOOK_BACK runs,
 * and for each page emits WARN (≥WARN_FLOOR) or ERROR (≥ERROR_FLOOR) when the
 * median performance across those runs is below the floor AND the page has appeared
 * in at least MIN_CONSISTENT runs.
 *
 * Thresholds (performance score, 0–1):
 *   WARN_FLOOR  = 0.78  (below target but close — notice + track)
 *   ERROR_FLOOR = 0.74  (clearly failing — blocking)
 *
 * Advisory only — exits 0 in all non-error cases to avoid breaking CI when staging
 * cold-start inflates a single-page LCP (homepage staging LCP is 5–6s cold vs
 * ~1.1s field). Error floor catches genuine regressions, not noise.
 *
 * Usage:
 *   node scripts/check-lighthouse-floor.mjs          # advisory report
 *   node scripts/check-lighthouse-floor.mjs --check  # exits 1 on ERROR_FLOOR breach
 *   node scripts/check-lighthouse-floor.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TREND_FILE = path.join(ROOT, '.cache', 'lighthouse-trend.json');

const WARN_FLOOR = 0.78;
const ERROR_FLOOR = 0.74;
const LOOK_BACK = 4;    // number of recent runs to analyse
const MIN_CONSISTENT = 2; // page must appear in at least this many runs to qualify

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function analyse(runs, { lookBack = LOOK_BACK, warnFloor = WARN_FLOOR, errorFloor = ERROR_FLOOR, minConsistent = MIN_CONSISTENT } = {}) {
  const recent = runs.slice(-lookBack);
  const pageScores = {};
  for (const run of recent) {
    for (const [page, scores] of Object.entries(run.pages || {})) {
      if (!pageScores[page]) pageScores[page] = [];
      if (typeof scores.performance === 'number') pageScores[page].push(scores.performance);
    }
  }
  const findings = [];
  for (const [page, scores] of Object.entries(pageScores)) {
    if (scores.length < minConsistent) continue;
    const med = median(scores);
    if (med === null) continue;
    if (med < errorFloor) {
      findings.push({ page, median: med, level: 'ERROR', runs: scores.length, warnFloor, errorFloor });
    } else if (med < warnFloor) {
      findings.push({ page, median: med, level: 'WARN', runs: scores.length, warnFloor, errorFloor });
    }
  }
  return findings.sort((a, b) => a.median - b.median);
}

if (SELF_TEST) {
  const cases = [];
  // A page consistently at 0.76 → WARN (below 0.78 but above 0.74).
  const f1 = analyse([
    { pages: { '/': { performance: 0.76 } } },
    { pages: { '/': { performance: 0.77 } } },
    { pages: { '/': { performance: 0.75 } } },
  ], { lookBack: 5, minConsistent: 2 });
  cases.push(['/ at 0.76 median → WARN', f1.length === 1 && f1[0].level === 'WARN' && f1[0].page === '/']);

  // A page at 0.73 → ERROR.
  const f2 = analyse([
    { pages: { '/x': { performance: 0.73 } } },
    { pages: { '/x': { performance: 0.72 } } },
  ], { lookBack: 5, minConsistent: 2 });
  cases.push(['/ at 0.73 → ERROR', f2.length === 1 && f2[0].level === 'ERROR']);

  // A page at 0.80 → no finding.
  const f3 = analyse([
    { pages: { '/ok': { performance: 0.80 } } },
    { pages: { '/ok': { performance: 0.82 } } },
  ], { lookBack: 5, minConsistent: 2 });
  cases.push(['/ at 0.80+ → no finding', f3.length === 0]);

  // A page with only 1 run (below minConsistent) → no finding.
  const f4 = analyse([
    { pages: { '/new': { performance: 0.60 } } },
  ], { lookBack: 5, minConsistent: 2 });
  cases.push(['single-run page below floor → no finding (below min_consistent)', f4.length === 0]);

  // lookBack limits to last N runs.
  const f5 = analyse([
    { pages: { '/': { performance: 0.90 } } },
    { pages: { '/': { performance: 0.90 } } },
    { pages: { '/': { performance: 0.70 } } }, // ← only this one is in lookBack=1
  ], { lookBack: 1, minConsistent: 1 });
  cases.push(['lookBack=1 only last run', f5.length === 1 && f5[0].level === 'ERROR']);

  let pass = 0, fail = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); ok ? pass++ : fail++; }
  console.log(`\nself-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

if (!fs.existsSync(TREND_FILE)) {
  console.log('check-lighthouse-floor: no trend ledger found (.cache/lighthouse-trend.json) — skip');
  process.exit(0);
}

let trend;
try {
  trend = JSON.parse(fs.readFileSync(TREND_FILE, 'utf8'));
} catch {
  console.error('check-lighthouse-floor: could not parse lighthouse-trend.json');
  process.exit(0); // advisory: don't break build on parse error
}

const runs = trend.runs || [];
if (runs.length < MIN_CONSISTENT) {
  console.log(`check-lighthouse-floor: only ${runs.length} run(s) in ledger — need ≥${MIN_CONSISTENT} for floor analysis`);
  process.exit(0);
}

const findings = analyse(runs);
let hasError = false;

if (findings.length === 0) {
  const pages = new Set(runs.slice(-LOOK_BACK).flatMap(r => Object.keys(r.pages || {})));
  console.log(`check-lighthouse-floor: ✓ all ${pages.size} page(s) at or above floor (perf ≥${WARN_FLOOR}) across last ${Math.min(runs.length, LOOK_BACK)} run(s)`);
} else {
  for (const f of findings) {
    const icon = f.level === 'ERROR' ? '✗' : '⚠';
    console.log(`${icon}  check-lighthouse-floor: ${f.level} — ${f.page} perf median=${f.median.toFixed(2)} over ${f.runs} run(s) (floor=${f.level === 'ERROR' ? ERROR_FLOOR : WARN_FLOOR})`);
    if (f.level === 'ERROR') hasError = true;
  }
  if (hasError) {
    console.error('check-lighthouse-floor: ERROR — one or more pages consistently below perf floor. See above for details.');
  }
}

process.exit(CHECK && hasError ? 1 : 0);
