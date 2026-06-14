#!/usr/bin/env node
// build-oracle-query-clusters.mjs (S185 · oracle-query-learning-loop)
//
// Reads api/oracle-queries.json (seeded representative queries per audience tier)
// and data/ignis-search-index.json (all indexed pages), then clusters queries by
// shared keywords and surfaces the top 3 doc matches per cluster as "oracle
// insights" — pre-computed relevance hints the Oracle panel can surface proactively.
//
// S190: re-ranks clusters by recency-weighted helpful-rate from
//   data/oracle-feedback.ndjson (when present). Falls back to coverage score.
//   Each cluster gains a `helpfulScore` field for frontend transparency.
//
// Output: api/oracle-insights.json
// Wired into: npm run build (via build-ignis-search-index step)
// Gates: --check (fail if output is >48h stale)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkHash, saveHash } from './lib/build-cache.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QUERIES_SRC = path.join(ROOT, 'api', 'oracle-queries.json');
const INDEX_SRC = path.join(ROOT, 'data', 'ignis-search-index.json');
const FEEDBACK_SRC = path.join(ROOT, 'data', 'oracle-feedback.ndjson');
const OUT = path.join(ROOT, 'api', 'oracle-insights.json');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');
const FORCE = process.argv.includes('--force');

if (SELF_TEST) {
  const testQueries = { anonymous: ['What games exist?', 'How do I join?'] };
  const testIndex = [{ title: 'Games', url: '/games/', body: 'games play arcade', summary: '' }];
  const feedbackMap = { 'what_games': { helpful: 5, unhelpful: 1, lastDay: '2026-06-10' } };
  const out = buildClusters(testQueries, testIndex, feedbackMap);
  const ok = Array.isArray(out.clusters) && out.clusters.length > 0 && out.clusters[0].topDocs;
  const ranked = out.clusters[0].key === 'what_games'; // higher helpful-rate should rank first
  const hasHelpfulScore = typeof out.clusters[0].helpfulScore === 'number';
  console.log([
    ok ? '  ✓ clusters built' : '  ✗ clusters missing',
    ranked ? '  ✓ helpful-rate ranking applied' : '  ✗ helpful-rate ranking failed',
    hasHelpfulScore ? '  ✓ helpfulScore field present' : '  ✗ helpfulScore field missing',
  ].join('\n'));
  const pass = ok && ranked && hasHelpfulScore;
  console.log(pass ? '✓ self-test passed' : '✗ self-test failed');
  process.exit(pass ? 0 : 1);
}

if (CHECK) {
  if (!fs.existsSync(OUT)) { console.error('✗ oracle-insights.json missing — run build'); process.exit(1); }
  const age = Date.now() - fs.statSync(OUT).mtimeMs;
  if (age > 48 * 60 * 60 * 1000) { console.error('✗ oracle-insights.json stale (>48h)'); process.exit(1); }
  console.log('✓ oracle-insights.json fresh');
  process.exit(0);
}

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

/** Parse oracle-feedback.ndjson → Map<clusterKey, {helpful, unhelpful, lastDay}>.
    Aggregates all rows per key; recency-weights by applying 0.9^daysOld decay. */
function loadFeedbackMap(feedbackPath, refDay) {
  if (!fs.existsSync(feedbackPath)) return {};
  const refMs = new Date(refDay || new Date().toISOString().slice(0, 10)).getTime();
  const acc = {};
  const lines = fs.readFileSync(feedbackPath, 'utf8').trim().split('\n');
  for (const line of lines) {
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    const { clusterKey, date, helpful = 0, unhelpful = 0 } = row;
    if (!clusterKey) continue;
    const daysOld = Math.max(0, Math.round((refMs - new Date(date || '').getTime()) / 86400000));
    const weight = Math.pow(0.9, daysOld); // recency decay: 90% per day older
    if (!acc[clusterKey]) acc[clusterKey] = { helpful: 0, unhelpful: 0, lastDay: date || '' };
    acc[clusterKey].helpful += (helpful || 0) * weight;
    acc[clusterKey].unhelpful += (unhelpful || 0) * weight;
    if ((date || '') > acc[clusterKey].lastDay) acc[clusterKey].lastDay = date;
  }
  return acc;
}

function tokenize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

function scoreDoc(queryTokens, doc) {
  const haystack = tokenize((doc.title || '') + ' ' + (doc.summary || '') + ' ' + (doc.body || ''));
  const haystackSet = new Set(haystack);
  return queryTokens.filter(t => haystackSet.has(t)).length;
}

/** Compute sort score: helpful-rate (0-1) when feedback exists, else coverage score normalised. */
function rankScore(clusterKey, coverageScore, feedbackMap, maxCoverage) {
  const fb = feedbackMap[clusterKey];
  if (fb && (fb.helpful + fb.unhelpful) > 0) {
    const rate = fb.helpful / (fb.helpful + fb.unhelpful);
    return { helpfulScore: Math.round(rate * 100) / 100, sortKey: rate, hasFeedback: true };
  }
  // No feedback yet: normalise coverage score so it lives in [0, 0.5) range,
  // always below any cluster with real feedback (which starts at ≥0).
  const normalised = maxCoverage > 0 ? (coverageScore / maxCoverage) * 0.5 : 0;
  return { helpfulScore: null, sortKey: normalised, hasFeedback: false };
}

function buildClusters(queries, index, feedbackMap = {}) {
  const clusters = [];
  const allQueries = Object.entries(queries).flatMap(([tier, qs]) => qs.map(q => ({ tier, q })));
  const seen = new Set();

  for (const { tier, q } of allQueries) {
    const tokens = tokenize(q);
    if (!tokens.length) continue;

    const clusterKey = tokens.slice(0, 2).join('_');
    if (seen.has(clusterKey)) continue;
    seen.add(clusterKey);

    const scoredDocs = (index || [])
      .map(doc => ({ doc, score: scoreDoc(tokens, doc) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    const topDocs = scoredDocs.slice(0, 3)
      .map(({ doc }) => ({ title: doc.title, url: doc.url, summary: doc.summary }));

    const coverageScore = scoredDocs.reduce((s, { score }) => s + score, 0);
    clusters.push({ key: clusterKey, query: q, tier, tokens: tokens.slice(0, 4), topDocs, _coverage: coverageScore });
  }

  const maxCoverage = clusters.reduce((m, c) => Math.max(m, c._coverage || 0), 0);

  // Attach helpful-rate scores and sort: real feedback first (by rate), then by coverage
  const ranked = clusters
    .map(c => {
      const { helpfulScore, sortKey } = rankScore(c.key, c._coverage || 0, feedbackMap, maxCoverage);
      const { _coverage, ...rest } = c; // strip internal field
      return { ...rest, helpfulScore, _sortKey: sortKey };
    })
    .sort((a, b) => b._sortKey - a._sortKey)
    .map(({ _sortKey, ...c }) => c); // strip sort helper

  return { schemaVersion: '1.0', generatedAt: new Date().toISOString(), publicSafe: true, clusters: ranked };
}

// Content-hash skip: rebuild only when oracle-queries or the ignis index changes.
const ORACLE_INPUTS = [QUERIES_SRC, INDEX_SRC, FEEDBACK_SRC];
const oracleCache = (!FORCE) ? checkHash('oracle-clusters', ORACLE_INPUTS) : { hit: false, hash: '' };
if (!CHECK && oracleCache.hit) {
  console.log('build-oracle-query-clusters: SKIP (inputs unchanged)');
  process.exit(0);
}

const queries = readJson(QUERIES_SRC);
const index = readJson(INDEX_SRC);
const feedbackMap = loadFeedbackMap(FEEDBACK_SRC);

if (!queries) { console.error('oracle-queries.json missing — skipping'); process.exit(0); }
if (!index) { console.warn('ignis-search-index.json missing — clusters will have empty topDocs'); }

const indexDocs = Array.isArray(index) ? index : (index && Array.isArray(index.documents) ? index.documents : []);
const result = buildClusters(queries, indexDocs, feedbackMap);
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
saveHash('oracle-clusters', oracleCache.hash);
const feedbackNote = Object.keys(feedbackMap).length ? ` (${Object.keys(feedbackMap).length} clusters with feedback data)` : ' (no feedback data yet — ranked by coverage)';
console.log(`✓ oracle-insights.json — ${result.clusters.length} clusters${feedbackNote}`);
