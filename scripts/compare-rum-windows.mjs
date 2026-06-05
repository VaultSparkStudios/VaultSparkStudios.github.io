#!/usr/bin/env node
/**
 * S174 field-verdict-engine — deploy-annotated field-performance verdicts.
 *
 * Segments data/rum-history.ndjson into pre/post windows around registered
 * deploy boundaries and emits an honest per-route verdict:
 *   pending   — not enough samples on one or both sides (MIN_SIDE each)
 *   improved  — weighted LCP p75 moved ≤ −10%
 *   regressed — weighted LCP p75 moved ≥ +10%
 *   neutral   — within ±10%
 *
 * Every verdict carries a confidence tier (low/medium/high) from the smaller
 * side's sample count, so nobody mistakes a 5-sample delta for proof.
 *
 * Usage:
 *   node scripts/compare-rum-windows.mjs --boundary 2026-06-05 --label "S173 homepage critical path"
 *   node scripts/compare-rum-windows.mjs --grade-receipts   # re-grade all boundaries (CI mode)
 *   node scripts/compare-rum-windows.mjs --self-test
 *
 * Outputs:
 *   data/field-verdicts.json  — canonical artifact (boundaries + route verdicts)
 *   api/field-verdicts.json   — public-safe mirror (aggregates only)
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HISTORY = path.join(ROOT, 'data', 'rum-history.ndjson');
const CANONICAL = path.join(ROOT, 'data', 'field-verdicts.json');
const PUBLIC = path.join(ROOT, 'api', 'field-verdicts.json');

const MIN_SIDE = 5;        // samples required on each side before a verdict
const DELTA_THRESHOLD = 0.10; // ±10% to leave "neutral"
const PRE_WINDOW_DAYS = 30;

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = args[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export function parseHistory(ndjson) {
  return String(ndjson)
    .split('\n')
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && r.route && r.day && Number.isFinite(r.samples) && !r.route.startsWith('/__'));
}

function aggregate(rows) {
  // Weighted mean of route-day p75s by sample count. Honest label: this is a
  // weighted p75 aggregate, not a true p75 over raw samples.
  let samples = 0;
  let lcpWeight = 0, lcpSamples = 0;
  for (const r of rows) {
    samples += r.samples;
    if (Number.isFinite(r.lcpP75)) { lcpWeight += r.lcpP75 * r.samples; lcpSamples += r.samples; }
  }
  return { samples, lcpP75w: lcpSamples ? Math.round(lcpWeight / lcpSamples) : null };
}

function confidence(n) {
  if (n >= 30) return 'high';
  if (n >= 10) return 'medium';
  return 'low';
}

export function judgeBoundary(rows, boundaryDate) {
  const preCutoff = new Date(new Date(boundaryDate).getTime() - PRE_WINDOW_DAYS * 86400000)
    .toISOString().slice(0, 10);
  const byRoute = new Map();
  for (const r of rows) {
    if (r.day < preCutoff) continue;
    if (!byRoute.has(r.route)) byRoute.set(r.route, { pre: [], post: [] });
    (r.day < boundaryDate ? byRoute.get(r.route).pre : byRoute.get(r.route).post).push(r);
  }
  const routes = {};
  for (const [route, { pre, post }] of byRoute) {
    const a = aggregate(pre);
    const b = aggregate(post);
    let verdict = 'pending';
    let lcpDeltaPct = null;
    if (a.samples >= MIN_SIDE && b.samples >= MIN_SIDE && a.lcpP75w && b.lcpP75w) {
      const delta = (b.lcpP75w - a.lcpP75w) / a.lcpP75w;
      lcpDeltaPct = Math.round(delta * 1000) / 10;
      verdict = delta <= -DELTA_THRESHOLD ? 'improved' : delta >= DELTA_THRESHOLD ? 'regressed' : 'neutral';
    }
    if (route !== '/' && verdict === 'pending' && a.samples + b.samples < MIN_SIDE) continue; // noise cut
    routes[route] = {
      pre: a, post: b, lcpDeltaPct, verdict,
      confidence: verdict === 'pending' ? null : confidence(Math.min(a.samples, b.samples)),
    };
  }
  const home = routes['/'];
  return { routes, overall: home ? home.verdict : 'pending' };
}

function loadCanonical() {
  try { return JSON.parse(fs.readFileSync(CANONICAL, 'utf8')); } catch { return { schemaVersion: '1.0', boundaries: [] }; }
}

function gradeAll(doc, rows) {
  for (const b of doc.boundaries) {
    const judged = judgeBoundary(rows, b.date);
    b.routes = judged.routes;
    b.overall = judged.overall;
    b.gradedAt = new Date().toISOString();
  }
  return doc;
}

function writeOut(doc) {
  doc.generatedAt = new Date().toISOString();
  doc.generatedBy = 'scripts/compare-rum-windows.mjs';
  fs.mkdirSync(path.dirname(CANONICAL), { recursive: true });
  fs.writeFileSync(CANONICAL, JSON.stringify(doc, null, 2) + '\n');
  const pub = { ...doc, publicSafe: true, note: 'Aggregated field-visit windows around deploys. No per-visit data.' };
  fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
  fs.writeFileSync(PUBLIC, JSON.stringify(pub, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

if (args.includes('--self-test')) {
  const synthetic = [
    { day: '2026-05-20', route: '/', samples: 6, lcpP75: 10000 },
    { day: '2026-05-25', route: '/', samples: 6, lcpP75: 9000 },
    { day: '2026-06-06', route: '/', samples: 7, lcpP75: 4000 },
    { day: '2026-06-07', route: '/', samples: 5, lcpP75: 4400 },
    { day: '2026-06-06', route: '/thin/', samples: 1, lcpP75: 2000 },
    { day: '2026-05-20', route: '/__rum_selftest', samples: 1, lcpP75: 1 },
  ].map((r) => JSON.stringify({ schemaVersion: '1.0', ...r })).join('\n');
  const rows = parseHistory(synthetic);
  const judged = judgeBoundary(rows, '2026-06-05');
  const home = judged.routes['/'];
  const checks = [
    ['selftest route excluded', !Object.keys(judged.routes).some((r) => r.startsWith('/__'))],
    ['home improved', home?.verdict === 'improved'],
    ['delta is negative', home?.lcpDeltaPct < 0],
    ['confidence medium', home?.confidence === 'medium'],
    ['thin route culled', !judged.routes['/thin/']],
    ['overall follows home', judged.overall === 'improved'],
    ['pending without samples', judgeBoundary(rows.slice(0, 2), '2026-06-05').overall === 'pending'],
  ];
  let pass = 0;
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (ok) pass++; }
  console.log(`compare-rum-windows --self-test: ${pass}/${checks.length}`);
  process.exit(pass === checks.length ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!fs.existsSync(HISTORY)) {
  console.log('compare-rum-windows: no data/rum-history.ndjson yet — nothing to grade.');
  process.exit(0);
}
const rows = parseHistory(fs.readFileSync(HISTORY, 'utf8'));
const doc = loadCanonical();

const boundary = flag('boundary', null);
if (boundary && typeof boundary === 'string') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(boundary)) { console.error('compare-rum-windows: --boundary must be YYYY-MM-DD'); process.exit(1); }
  let entry = doc.boundaries.find((b) => b.date === boundary);
  if (!entry) {
    entry = { id: `deploy-${boundary}`, date: boundary, label: flag('label', `Deploy ${boundary}`) };
    doc.boundaries.push(entry);
    doc.boundaries.sort((a, b) => a.date.localeCompare(b.date));
    console.log(`compare-rum-windows: registered boundary ${boundary} (${entry.label})`);
  } else if (typeof flag('label', null) === 'string') {
    entry.label = flag('label', entry.label);
  }
}

gradeAll(doc, rows);
writeOut(doc);

for (const b of doc.boundaries) {
  const home = b.routes?.['/'];
  const detail = home && home.verdict !== 'pending'
    ? `LCP ${home.lcpDeltaPct > 0 ? '+' : ''}${home.lcpDeltaPct}% (${home.pre.samples} pre / ${home.post.samples} post · ${home.confidence} confidence)`
    : `accumulating (${home ? `${home.pre.samples} pre / ${home.post.samples} post` : 'no home rows'} · need ${MIN_SIDE}+ each side)`;
  console.log(`  ${b.date}  ${b.label}: ${b.overall.toUpperCase()} — ${detail}`);
}
console.log(`compare-rum-windows → data/field-verdicts.json + api/field-verdicts.json (${doc.boundaries.length} boundary/ies)`);
