#!/usr/bin/env node
/* build-oracle-query-insights.mjs — S206 audit item #9 (oracle-query-insights-feed)
   Synthesizes api/oracle-query-insights.json from two sources:
     1. data/rum-ux-history.ndjson — counts oracle-answer/followup events (real usage)
     2. api/oracle-insights.json  — cluster queries (structured knowledge themes)

   honestDark=true when totalAnswers < 10 (insufficient data for meaningful insights).
   Wires into build + check-proof-surface as advisory.

   Exit codes: 0 = ok, 1 = error */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');

// ── Self-test ──────────────────────────────────────────────────────────────
if (SELF_TEST) {
  let passed = 0;
  function assert(cond, msg) {
    if (!cond) { console.error('✗ ' + msg); process.exit(1); }
    console.log('  ✓ ' + msg);
    passed++;
  }

  // T1: honestDark when totalAnswers < 10
  const t1 = buildInsights([], 0, []);
  assert(t1.honestDark === true, 'T1: honestDark=true when 0 answers');

  // T2: honestDark=false when >= 10 answers
  const t2 = buildInsights([{ event: 'oracle-answer:helpful', count: 10 }], 10, []);
  assert(t2.honestDark === false, 'T2: honestDark=false when 10 answers');

  // T3: topClusters capped at 5
  const clusters = Array.from({ length: 8 }, (_, i) => ({ query: 'q' + i }));
  const t3 = buildInsights([], 0, clusters);
  assert(t3.topClusters.length === 5, 'T3: topClusters capped at 5');

  // T4: chipInteractions computed
  const events = [
    { event: 'oracle-chip:click', count: 5 },
    { event: 'oracle-chip:shown', count: 3 },
    { event: 'oracle-followup:ask', count: 2 },
  ];
  const t4 = buildInsights(events, 2, []);
  assert(t4.chipInteractions === 8, 'T4: chipInteractions = click + shown');
  assert(t4.totalAnswers === 2, 'T4: totalAnswers from explicit param');

  console.log(`build-oracle-query-insights --self-test: ${passed}/4 passed`);
  process.exit(0);
}

// ── Core builder ───────────────────────────────────────────────────────────
function buildInsights(rumEvents, totalAnswers, clusters) {
  const chipClick = (rumEvents.find(e => e.event === 'oracle-chip:click') || {}).count || 0;
  const chipShown = (rumEvents.find(e => e.event === 'oracle-chip:shown') || {}).count || 0;
  const chipInteractions = chipClick + chipShown;

  const topClusters = clusters.slice(0, 5).map(c => c.query).filter(Boolean);

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString().slice(0, 10),
    totalAnswers,
    chipInteractions,
    clustersAvailable: clusters.length,
    topClusters,
    honestDark: totalAnswers < 10,
  };
}

// ── Load data ──────────────────────────────────────────────────────────────
function loadRumEvents() {
  const p = path.join(ROOT, 'data/rum-ux-history.ndjson');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch (_) { return null; } })
    .filter(Boolean);
}

function countOracleAnswers(events) {
  return events
    .filter(e => typeof e.event === 'string' && e.event.startsWith('oracle-answer:'))
    .reduce((sum, e) => sum + (Number(e.count) || 0), 0);
}

function loadClusters() {
  const p = path.join(ROOT, 'api/oracle-insights.json');
  if (!existsSync(p)) return [];
  try {
    const d = JSON.parse(readFileSync(p, 'utf8'));
    return Array.isArray(d.clusters) ? d.clusters : [];
  } catch (_) { return []; }
}

// ── Main ───────────────────────────────────────────────────────────────────
const rumEvents = loadRumEvents();
const totalAnswers = countOracleAnswers(rumEvents);
const clusters = loadClusters();

const out = buildInsights(rumEvents, totalAnswers, clusters);

const outPath = path.join(ROOT, 'api/oracle-query-insights.json');
const outStr = JSON.stringify(out, null, 2);

if (CHECK) {
  if (!existsSync(outPath)) {
    console.error('build-oracle-query-insights --check: api/oracle-query-insights.json missing (run without --check to generate)');
    process.exit(1);
  }
  const existing = readFileSync(outPath, 'utf8');
  const existingParsed = JSON.parse(existing);
  if (existingParsed.schemaVersion !== '1.0') {
    console.error('build-oracle-query-insights --check: schema version mismatch');
    process.exit(1);
  }
  console.log('build-oracle-query-insights --check: ok · totalAnswers=' + existingParsed.totalAnswers + ' · honestDark=' + existingParsed.honestDark + ' · clusters=' + existingParsed.clustersAvailable);
  process.exit(0);
}

writeFileSync(outPath, outStr, 'utf8');
console.log('build-oracle-query-insights → api/oracle-query-insights.json (totalAnswers=' + out.totalAnswers + ' honestDark=' + out.honestDark + ' clusters=' + out.clustersAvailable + ')');
