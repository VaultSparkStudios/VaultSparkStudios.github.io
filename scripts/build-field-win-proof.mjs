#!/usr/bin/env node
/**
 * build-field-win-proof.mjs (S178 · field-win-auto-publish)
 *
 * The RUM loop already grades deploys (scripts/compare-rum-windows.mjs writes
 * data/field-verdicts.json), but a confirmed win — e.g. the CF Pages origin
 * migration's homepage LCP drop — stays buried in a JSON file until a human
 * notices. This generator publishes the proof: it distills field-verdicts into
 * api/field-win.json containing ONLY confirmed verdicts (improved/regressed with
 * confidence — never `pending`), so the /status/ tile can auto-surface
 * "homepage got N% faster for real visitors, measured from M samples" the moment
 * the evidence lands, with zero session involvement.
 *
 * Honest by construction: while every verdict is still pending (too few samples),
 * `hasConfirmed` is false and the tile renders nothing. The machine never
 * overstates — it waits for its own evidence.
 *
 * Usage:
 *   node scripts/build-field-win-proof.mjs              # write api/field-win.json
 *   node scripts/build-field-win-proof.mjs --check      # fail if out of date
 *   node scripts/build-field-win-proof.mjs --self-test  # pure-logic checks
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'field-verdicts.json');
const OUT = path.join(ROOT, 'api', 'field-win.json');

// Verdicts that count as confirmed evidence (have enough samples on both sides).
const CONFIRMED = new Set(['improved', 'regressed', 'neutral']);

export function distill(verdicts) {
  const confirmed = [];
  for (const b of verdicts.boundaries || []) {
    for (const [route, r] of Object.entries(b.routes || {})) {
      if (!CONFIRMED.has(r.verdict)) continue;
      if (typeof r.lcpDeltaPct !== 'number') continue;
      confirmed.push({
        route,
        boundary: b.date,
        label: b.label || `Deploy ${b.date}`,
        verdict: r.verdict,
        lcpDeltaPct: r.lcpDeltaPct,
        confidence: r.confidence ?? null,
        preSamples: r.pre?.samples ?? null,
        postSamples: r.post?.samples ?? null,
        preLcpP75: r.pre?.lcpP75w ?? null,
        postLcpP75: r.post?.lcpP75w ?? null,
      });
    }
  }
  // Wins first, ranked by magnitude of improvement (most negative delta = best).
  const wins = confirmed.filter((c) => c.verdict === 'improved').sort((a, b) => a.lcpDeltaPct - b.lcpDeltaPct);
  const topWin = wins[0] || null;
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-field-win-proof.mjs',
    publicSafe: true,
    note: 'Confirmed deploy verdicts from real-visitor field windows. Only improved/regressed/neutral (never pending) are published. No per-visit data.',
    hasConfirmed: confirmed.length > 0,
    confirmedCount: confirmed.length,
    topWin,
    confirmed,
  };
}

function readSrc() {
  try { return JSON.parse(fs.readFileSync(SRC, 'utf8')); } catch { return { boundaries: [] }; }
}

// Stable equality ignoring the generatedAt timestamp (so --check is not flaky).
function sameIgnoringTime(a, b) {
  const strip = (o) => { const { generatedAt, ...rest } = o || {}; return JSON.stringify(rest); };
  return strip(a) === strip(b);
}

function selfTest() {
  const src = {
    boundaries: [{
      date: '2026-06-05', label: 'origin migration',
      routes: {
        '/': { verdict: 'improved', lcpDeltaPct: -83.3, confidence: 'medium', pre: { samples: 38, lcpP75w: 9489 }, post: { samples: 6, lcpP75w: 1588 } },
        '/games/': { verdict: 'pending', lcpDeltaPct: null, confidence: null, pre: { samples: 8 }, post: { samples: 0 } },
        '/x/': { verdict: 'regressed', lcpDeltaPct: 21.0, confidence: 'low', pre: { samples: 10, lcpP75w: 1000 }, post: { samples: 10, lcpP75w: 1210 } },
      },
    }],
  };
  const d = distill(src);
  const allPending = distill({ boundaries: [{ date: 'x', routes: { '/': { verdict: 'pending', lcpDeltaPct: null } } }] });
  const cases = [
    ['publishes confirmed verdicts', d.confirmedCount === 2],
    ['excludes pending verdicts', !d.confirmed.some((c) => c.verdict === 'pending')],
    ['topWin is the improved home route', d.topWin && d.topWin.route === '/' && d.topWin.lcpDeltaPct === -83.3],
    ['regression is published honestly', d.confirmed.some((c) => c.verdict === 'regressed')],
    ['hasConfirmed false when all pending', allPending.hasConfirmed === false && allPending.topWin === null],
    ['publicSafe flag set', d.publicSafe === true],
  ];
  let pass = 0;
  for (const [name, ok] of cases) { if (ok) pass += 1; else console.error(`  ✗ ${name}`); }
  console.log(`build-field-win-proof --self-test: ${pass}/${cases.length} passing`);
  process.exit(pass === cases.length ? 0 : 1);
}

if (process.argv.includes('--self-test')) selfTest();

const doc = distill(readSrc());

if (process.argv.includes('--check')) {
  let current = null;
  try { current = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { /* missing */ }
  if (!current || !sameIgnoringTime(current, doc)) {
    console.error('build-field-win-proof: api/field-win.json is stale — run `node scripts/build-field-win-proof.mjs`');
    process.exit(1);
  }
  console.log(`build-field-win-proof --check: ok (${doc.confirmedCount} confirmed${doc.topWin ? `, top win ${doc.topWin.lcpDeltaPct}% on ${doc.topWin.route}` : ''})`);
  process.exit(0);
}

doc.generatedAt = new Date().toISOString();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
console.log(`build-field-win-proof → api/field-win.json (${doc.confirmedCount} confirmed${doc.topWin ? `, top win ${doc.topWin.lcpDeltaPct}% on ${doc.topWin.route}` : ', none yet'})`);
