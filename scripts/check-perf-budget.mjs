#!/usr/bin/env node
/**
 * S156 — Perf Budget Guardian (audit #31).
 *
 * Structural gate: fail when the rolling-N-sample median LCP/CLS for any
 * tracked (route × profile) in `data/perf-history.ndjson` exceeds budget.
 *
 * Why this exists:
 *   `append-perf-history --detect-regressions` catches *relative* regressions
 *   (>15% vs prior median). This gate catches *absolute* budget violations
 *   that may have been baked-in for months without a single-session delta.
 *   Pair: the relative gate catches new pain; the absolute gate catches
 *   chronic pain.
 *
 * Default budgets (CWV thresholds):
 *   desktop  LCP ≤ 2500ms · CLS ≤ 0.1
 *   tablet   LCP ≤ 2800ms · CLS ≤ 0.1
 *   mobile   LCP ≤ 3000ms · CLS ≤ 0.1
 *
 * Window: median of the most recent 3 samples per (route × profile).
 *   < 3 samples → skipped (insufficient data, advisory).
 *
 * Usage:
 *   node scripts/check-perf-budget.mjs               # advisory: exit 0, report
 *   node scripts/check-perf-budget.mjs --strict      # fail build on violation
 *   node scripts/check-perf-budget.mjs --self-test
 *
 * Pairs with: scripts/append-perf-history.mjs (S153).
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const SELF_TEST = args.includes('--self-test');
const JSON_MODE = args.includes('--json');
const EMIT_RECIPES = args.includes('--emit-recipes') || args.includes('--recipes');

const HISTORY_PATH = path.join(ROOT, 'data', 'perf-history.ndjson');
const RECIPES_PATH = path.join(ROOT, '.cache', 'perf-fix-recipes.json');
const RUM_SUMMARY_PATH = path.join(ROOT, 'data', 'rum-summary.json');

// S163 (audit #1 rum-field-lcp-gate): --source=rum makes real-user field p75 the
// AUTHORITATIVE signal, demoting synthetic traces to advisory. Field p75 is what
// Core Web Vitals actually scores; a synthetic cold-bucket single trace is not.
// Routes with fewer than the summary's minSamples fall back to synthetic so the
// gate never blocks on statistically thin field data.
const SOURCE = (args.find((a) => a.startsWith('--source=')) || '--source=synthetic').split('=')[1];
const USE_RUM = SOURCE === 'rum';

/**
 * S158 — Recipe synthesizer.
 *
 * Classifies an over-budget violation into one of three failure shapes and
 * returns a ranked list of candidate fixes. Recipes are deliberately concrete:
 * each entry names a file or pattern an implementer can act on immediately.
 *
 * Classes:
 *   LCP-blocking → LCP-candidate is render-blocked (large CSS/font/JS upstream)
 *   LCP-render   → LCP-candidate registers late (animation, idle-loader gating)
 *   CLS-shift    → reserved geometry missing in critical shell
 */
function classifyAndRecommend({ route, profile, lcpMed, clsMed, budget, reasons }) {
  const lcpOver = lcpMed > budget.lcp;
  const clsOver = clsMed > budget.cls;
  const lcpRatio = lcpMed / budget.lcp;
  const recipes = [];

  if (clsOver) {
    recipes.push({
      class: 'CLS-shift',
      severity: clsMed > 0.25 ? 'high' : 'medium',
      candidates: [
        `Audit critical-shell geometry in scripts/build-shell-assets.mjs for ${route} — check that header/nav/hero reservations cover this profile.`,
        `Open assets/style.css and verify @media (max-width: 768px) blocks reserve mobile geometry without late-injected layout shifts.`,
        `Look for any idle-loaded renderer that injects above-the-fold cards without a placeholder slot.`,
      ],
    });
  }

  if (lcpOver) {
    if (lcpRatio > 1.5) {
      recipes.push({
        class: 'LCP-blocking',
        severity: 'high',
        candidates: [
          `LCP is ${Math.round((lcpRatio - 1) * 100)}% over budget — likely render-blocking. Verify critical CSS shell includes ${route} viewport-1 selectors.`,
          `Inspect deferred scripts: check assets/${route === '/' ? 'home-idle-loader.js' : 'membership-idle-loader.js'} for accidentally-eager loads.`,
          `Run \`node scripts/measure-page-performance.mjs --routes=${route} --profiles=${profile}\` and capture the resource waterfall.`,
        ],
      });
    } else {
      recipes.push({
        class: 'LCP-render',
        severity: 'medium',
        candidates: [
          `LCP is ${Math.round((lcpRatio - 1) * 100)}% over budget — likely render-timing. If the LCP candidate is an animated element, drop \`animation-fill-mode: forwards\` and \`will-change\` so the candidate registers immediately.`,
          `If LCP is an image, add \`fetchpriority="high"\` to its <img> tag.`,
          `Consider promoting the LCP-candidate element above any conditional render in its component.`,
        ],
      });
    }
  }

  return {
    route,
    profile,
    lcpMed,
    clsMed,
    budget,
    reasons,
    recipes,
  };
}

const PROFILE_BUDGET = {
  desktop:       { lcp: 2500, cls: 0.1 },
  'desktop-light': { lcp: 2500, cls: 0.1 },
  tablet:        { lcp: 2800, cls: 0.1 },
  'tablet-light': { lcp: 2800, cls: 0.1 },
  mobile:        { lcp: 3000, cls: 0.1 },
  'mobile-light': { lcp: 3000, cls: 0.1 },
};
const DEFAULT_BUDGET = { lcp: 3000, cls: 0.1 };
const WINDOW = 3;

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function loadHistory(text) {
  return text
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

function evaluate(rows) {
  // Group by route × profile, take latest WINDOW samples (newest first by ts).
  const groups = new Map();
  for (const r of rows) {
    if (!r.route || !r.profile) continue;
    const key = `${r.route}|${r.profile}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const results = [];
  for (const [key, samples] of groups) {
    samples.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    const window = samples.slice(0, WINDOW);
    const [route, profile] = key.split('|');
    if (window.length < WINDOW) {
      results.push({ route, profile, status: 'insufficient', count: window.length });
      continue;
    }
    const lcps = window.map(s => Number(s.lcp)).filter(n => Number.isFinite(n));
    const clss = window.map(s => Number(s.cls)).filter(n => Number.isFinite(n));
    if (!lcps.length || !clss.length) {
      results.push({ route, profile, status: 'no-metrics', count: window.length });
      continue;
    }
    const lcpMed = median(lcps);
    const clsMed = median(clss);
    const budget = PROFILE_BUDGET[profile] || DEFAULT_BUDGET;
    const lcpOver = lcpMed > budget.lcp;
    const clsOver = clsMed > budget.cls;
    results.push({
      route, profile,
      status: (lcpOver || clsOver) ? 'over-budget' : 'ok',
      lcpMed: Math.round(lcpMed), clsMed: Number(clsMed.toFixed(4)),
      budget,
      reasons: [
        lcpOver ? `LCP ${Math.round(lcpMed)}ms > ${budget.lcp}ms` : null,
        clsOver ? `CLS ${clsMed.toFixed(4)} > ${budget.cls}` : null,
      ].filter(Boolean),
    });
  }
  return results;
}

/**
 * S163 — Evaluate real-user field p75 against the CWV "good" budget. Returns
 * rows shaped like evaluate() so downstream reporting is identical, tagged with
 * profile 'field' and a `source: 'rum'` marker. Routes below minSamples are
 * returned as status 'low-sample' (advisory — caller falls back to synthetic).
 */
function evaluateRum(summary) {
  const out = [];
  if (!summary || !summary.routes) return out;
  const budget = summary.fieldBudget || { lcp: 2500, cls: 0.1, inp: 200 };
  for (const [route, r] of Object.entries(summary.routes)) {
    if (!r || !r.sufficient) {
      out.push({ route, profile: 'field', source: 'rum', status: 'low-sample', count: r ? r.samples : 0 });
      continue;
    }
    const lcpMed = Number(r.p75?.lcp);
    const clsMed = Number(r.p75?.cls);
    if (!Number.isFinite(lcpMed) || !Number.isFinite(clsMed)) {
      out.push({ route, profile: 'field', source: 'rum', status: 'no-metrics', count: r.samples });
      continue;
    }
    const lcpOver = lcpMed > budget.lcp;
    const clsOver = clsMed > budget.cls;
    out.push({
      route, profile: 'field', source: 'rum',
      status: (lcpOver || clsOver) ? 'over-budget' : 'ok',
      lcpMed: Math.round(lcpMed), clsMed: Number(clsMed.toFixed(4)),
      budget, samples: r.samples,
      reasons: [
        lcpOver ? `field p75 LCP ${Math.round(lcpMed)}ms > ${budget.lcp}ms (${r.samples} samples)` : null,
        clsOver ? `field p75 CLS ${clsMed.toFixed(4)} > ${budget.cls} (${r.samples} samples)` : null,
      ].filter(Boolean),
    });
  }
  return out;
}

function loadRumSummary() {
  if (!fs.existsSync(RUM_SUMMARY_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(RUM_SUMMARY_PATH, 'utf8')); } catch { return null; }
}

if (SELF_TEST) {
  // RUM evaluator unit checks (S163).
  const rumCases = [
    {
      name: 'rum: sufficient route under field budget → ok',
      summary: { fieldBudget: { lcp: 2500, cls: 0.1, inp: 200 }, routes: { '/': { samples: 80, sufficient: true, p75: { lcp: 2100, cls: 0.05 } } } },
      expect: 'ok',
    },
    {
      name: 'rum: sufficient route over field LCP → over-budget',
      summary: { fieldBudget: { lcp: 2500, cls: 0.1, inp: 200 }, routes: { '/': { samples: 80, sufficient: true, p75: { lcp: 3300, cls: 0.05 } } } },
      expect: 'over-budget',
    },
    {
      name: 'rum: thin route → low-sample (advisory, falls back)',
      summary: { fieldBudget: { lcp: 2500, cls: 0.1, inp: 200 }, routes: { '/': { samples: 3, sufficient: false, p75: { lcp: 9000, cls: 0.9 } } } },
      expect: 'low-sample',
    },
  ];
  let rp = 0, rf = 0;
  for (const c of rumCases) {
    const got = evaluateRum(c.summary)[0]?.status;
    const ok = got === c.expect;
    console.log(`  ${ok ? '✓' : '✗'} ${c.name} (expect ${c.expect}, got ${got})`);
    ok ? rp++ : rf++;
  }
  const cases = [
    {
      name: '3 samples all under budget → ok',
      rows: [
        { ts: '2026-05-22T10:00Z', route: '/', profile: 'desktop', lcp: 1800, cls: 0.04 },
        { ts: '2026-05-22T09:00Z', route: '/', profile: 'desktop', lcp: 2000, cls: 0.05 },
        { ts: '2026-05-22T08:00Z', route: '/', profile: 'desktop', lcp: 1900, cls: 0.03 },
      ],
      expectStatus: 'ok',
    },
    {
      name: 'median LCP over budget → over-budget',
      rows: [
        { ts: '2026-05-22T10:00Z', route: '/', profile: 'desktop', lcp: 3200, cls: 0.04 },
        { ts: '2026-05-22T09:00Z', route: '/', profile: 'desktop', lcp: 1800, cls: 0.04 },
        { ts: '2026-05-22T08:00Z', route: '/', profile: 'desktop', lcp: 3100, cls: 0.04 },
      ],
      expectStatus: 'over-budget',
    },
    {
      name: 'median CLS over budget → over-budget',
      rows: [
        { ts: '2026-05-22T10:00Z', route: '/', profile: 'desktop', lcp: 1500, cls: 0.15 },
        { ts: '2026-05-22T09:00Z', route: '/', profile: 'desktop', lcp: 1500, cls: 0.18 },
        { ts: '2026-05-22T08:00Z', route: '/', profile: 'desktop', lcp: 1500, cls: 0.12 },
      ],
      expectStatus: 'over-budget',
    },
    {
      name: '2 samples → insufficient',
      rows: [
        { ts: '2026-05-22T10:00Z', route: '/', profile: 'desktop', lcp: 1800, cls: 0.04 },
        { ts: '2026-05-22T09:00Z', route: '/', profile: 'desktop', lcp: 2000, cls: 0.05 },
      ],
      expectStatus: 'insufficient',
    },
    {
      name: 'newest-3-of-5 used → ignores older outliers',
      rows: [
        { ts: '2026-05-22T10:00Z', route: '/', profile: 'desktop', lcp: 1800, cls: 0.04 },
        { ts: '2026-05-22T09:00Z', route: '/', profile: 'desktop', lcp: 2000, cls: 0.05 },
        { ts: '2026-05-22T08:00Z', route: '/', profile: 'desktop', lcp: 1900, cls: 0.03 },
        { ts: '2026-05-22T07:00Z', route: '/', profile: 'desktop', lcp: 9000, cls: 0.9 },
        { ts: '2026-05-22T06:00Z', route: '/', profile: 'desktop', lcp: 8000, cls: 0.8 },
      ],
      expectStatus: 'ok',
    },
    {
      name: 'mobile budget is higher than desktop',
      rows: [
        { ts: '2026-05-22T10:00Z', route: '/', profile: 'mobile', lcp: 2900, cls: 0.04 },
        { ts: '2026-05-22T09:00Z', route: '/', profile: 'mobile', lcp: 2950, cls: 0.04 },
        { ts: '2026-05-22T08:00Z', route: '/', profile: 'mobile', lcp: 2800, cls: 0.04 },
      ],
      expectStatus: 'ok',
    },
  ];
  let pass = 0, fail = 0;
  for (const c of cases) {
    const results = evaluate(c.rows);
    const got = results[0]?.status;
    const ok = got === c.expectStatus;
    console.log(`  ${ok ? '✓' : '✗'} ${c.name} (expect ${c.expectStatus}, got ${got})`);
    ok ? pass++ : fail++;
  }
  // S172: forensic correlator pure-function checks (injected fixtures, no git)
  let forensicsPassed = 0, forensicsFailed = 0;
  try {
    const { selfTest } = await import('./lib/perf-forensics.mjs');
    forensicsPassed = selfTest();
    console.log(`  ✓ perf-forensics self-test (${forensicsPassed} checks)`);
  } catch (err) {
    forensicsFailed = 1;
    console.log(`  ✗ perf-forensics self-test: ${err.message}`);
  }
  console.log(`\nself-test: ${pass + rp + forensicsPassed} passed, ${fail + rf + forensicsFailed} failed`);
  process.exit((fail + rf + forensicsFailed) ? 1 : 0);
}

if (!fs.existsSync(HISTORY_PATH)) {
  if (JSON_MODE) console.log(JSON.stringify({ status: 'no-history' }));
  else console.log('check-perf-budget: no data/perf-history.ndjson — advisory skip');
  process.exit(0);
}

const rows = loadHistory(fs.readFileSync(HISTORY_PATH, 'utf8'));
const synthResults = evaluate(rows);

// S163: when --source=rum, field p75 is authoritative. For each route that has
// sufficient field samples, the RUM verdict replaces every synthetic
// (route × profile) verdict for that route; routes with thin field data keep
// their synthetic verdicts. This is how `--strict` flips honestly without
// blocking on cold-bucket synthetic noise.
let results = synthResults;
let rumActive = false;
let rumNote = '';
if (USE_RUM) {
  const summary = loadRumSummary();
  if (!summary) {
    rumNote = 'no data/rum-summary.json — run scripts/pull-rum-summary.mjs first; using synthetic';
  } else {
    const rumResults = evaluateRum(summary);
    const fieldRoutes = new Set(rumResults.filter(r => r.status === 'ok' || r.status === 'over-budget').map(r => r.route));
    rumActive = fieldRoutes.size > 0;
    if (rumActive) {
      const synthForThinRoutes = synthResults.filter(r => !fieldRoutes.has(r.route));
      const authoritativeRum = rumResults.filter(r => fieldRoutes.has(r.route));
      results = [...authoritativeRum, ...synthForThinRoutes];
      rumNote = `field p75 authoritative for ${fieldRoutes.size} route(s); synthetic backstop for the rest`;
    } else {
      rumNote = `RUM summary present but no route has ≥${summary.minSamples || 50} samples yet — using synthetic (advisory)`;
    }
  }
}

const overBudget = results.filter(r => r.status === 'over-budget');
const ok = results.filter(r => r.status === 'ok');
const insufficient = results.filter(r => r.status === 'insufficient');

if (EMIT_RECIPES || overBudget.length) {
  const recipeEntries = overBudget.map(classifyAndRecommend);
  if (recipeEntries.length) {
    // S172 perf-forensic-commit-correlator: name the suspect commits inside
    // the last-good → first-bad window so the recipe starts the bisect for you.
    try {
      const { correlate } = await import('./lib/perf-forensics.mjs');
      for (const entry of recipeEntries) {
        const budget = PROFILE_BUDGET[entry.profile] || PROFILE_BUDGET.desktop;
        entry.forensics = correlate({
          history: rows,
          route: entry.route,
          profile: entry.profile,
          lcpBudget: budget.lcp,
        });
      }
    } catch { /* forensics is additive — recipes remain valid without it */ }
    const cacheDir = path.dirname(RECIPES_PATH);
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const payload = {
      schemaVersion: '1.1',
      generatedAt: new Date().toISOString(),
      window: WINDOW,
      entries: recipeEntries,
    };
    fs.writeFileSync(RECIPES_PATH, JSON.stringify(payload, null, 2));
  }
}

if (JSON_MODE) {
  console.log(JSON.stringify({ source: USE_RUM ? 'rum' : 'synthetic', rumActive, rumNote, overBudget, ok, insufficient, window: WINDOW }, null, 2));
  process.exit(overBudget.length && STRICT ? 1 : 0);
}

console.log('check-perf-budget');
console.log('──────────────────────────────────────────────');
if (USE_RUM) console.log(`  Source:        rum${rumActive ? ' (field p75 authoritative)' : ''}${rumNote ? ` — ${rumNote}` : ''}`);
console.log(`  Window:        last ${WINDOW} samples per (route × profile)`);
console.log(`  Groups OK:     ${ok.length}`);
console.log(`  Insufficient:  ${insufficient.length}`);
console.log(`  Over budget:   ${overBudget.length}`);

if (overBudget.length) {
  console.log('');
  for (const r of overBudget) {
    console.log(`  ✗ ${r.route} (${r.profile})`);
    for (const reason of r.reasons) console.log(`      ${reason}`);
  }
  if (fs.existsSync(RECIPES_PATH)) {
    console.log(`\n  → fix recipes written to .cache/perf-fix-recipes.json (${overBudget.length} group${overBudget.length === 1 ? '' : 's'})`);
  }
}

if (overBudget.length && STRICT) {
  console.error(`\n✗ ${overBudget.length} (route × profile) group${overBudget.length === 1 ? '' : 's'} over budget`);
  process.exit(1);
} else {
  console.log(overBudget.length ? '\n(advisory mode — not blocking)' : '\n✓ all tracked groups within budget');
}
