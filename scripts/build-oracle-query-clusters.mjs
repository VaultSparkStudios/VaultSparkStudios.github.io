#!/usr/bin/env node
// build-oracle-query-clusters.mjs (S185 · oracle-query-learning-loop)
//
// Reads api/oracle-queries.json (seeded representative queries per audience tier)
// and data/ignis-search-index.json (all indexed pages), then clusters queries by
// shared keywords and surfaces the top 3 doc matches per cluster as "oracle
// insights" — pre-computed relevance hints the Oracle panel can surface proactively.
//
// Output: api/oracle-insights.json
// Wired into: npm run build (via build-ignis-search-index step)
// Gates: --check (fail if output is >48h stale)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QUERIES_SRC = path.join(ROOT, 'api', 'oracle-queries.json');
const INDEX_SRC = path.join(ROOT, 'data', 'ignis-search-index.json');
const OUT = path.join(ROOT, 'api', 'oracle-insights.json');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

if (SELF_TEST) {
  const testQueries = { anonymous: ['What games exist?', 'How do I join?'] };
  const testIndex = [{ title: 'Games', url: '/games/', body: 'games play arcade', summary: '' }];
  const out = buildClusters(testQueries, testIndex);
  const ok = Array.isArray(out.clusters) && out.clusters.length > 0 && out.clusters[0].topDocs;
  console.log(ok ? '✓ self-test passed' : '✗ self-test failed');
  process.exit(ok ? 0 : 1);
}

if (CHECK) {
  if (!fs.existsSync(OUT)) { console.error('✗ oracle-insights.json missing — run build'); process.exit(1); }
  const age = Date.now() - fs.statSync(OUT).mtimeMs;
  if (age > 48 * 60 * 60 * 1000) { console.error('✗ oracle-insights.json stale (>48h)'); process.exit(1); }
  console.log('✓ oracle-insights.json fresh');
  process.exit(0);
}

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

function tokenize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

function scoreDoc(queryTokens, doc) {
  const haystack = tokenize((doc.title || '') + ' ' + (doc.summary || '') + ' ' + (doc.body || ''));
  const haystackSet = new Set(haystack);
  return queryTokens.filter(t => haystackSet.has(t)).length;
}

function buildClusters(queries, index) {
  const clusters = [];
  const allQueries = Object.entries(queries).flatMap(([tier, qs]) => qs.map(q => ({ tier, q })));
  const seen = new Set();

  for (const { tier, q } of allQueries) {
    const tokens = tokenize(q);
    if (!tokens.length) continue;

    // Find or create a cluster based on shared lead tokens (first 2 meaningful tokens)
    const clusterKey = tokens.slice(0, 2).join('_');
    if (seen.has(clusterKey)) continue;
    seen.add(clusterKey);

    const topDocs = (index || [])
      .map(doc => ({ doc, score: scoreDoc(tokens, doc) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ doc }) => ({ title: doc.title, url: doc.url, summary: doc.summary }));

    clusters.push({ key: clusterKey, query: q, tier, tokens: tokens.slice(0, 4), topDocs });
  }

  return { schemaVersion: '1.0', generatedAt: new Date().toISOString(), publicSafe: true, clusters };
}

const queries = readJson(QUERIES_SRC);
const index = readJson(INDEX_SRC);

if (!queries) { console.error('oracle-queries.json missing — skipping'); process.exit(0); }
if (!index) { console.warn('ignis-search-index.json missing — clusters will have empty topDocs'); }

const indexDocs = Array.isArray(index) ? index : (index && Array.isArray(index.documents) ? index.documents : []);
const result = buildClusters(queries, indexDocs);
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`✓ oracle-insights.json — ${result.clusters.length} clusters`);
