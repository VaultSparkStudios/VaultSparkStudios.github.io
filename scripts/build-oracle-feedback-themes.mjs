#!/usr/bin/env node
/* build-oracle-feedback-themes.mjs — S207 (audit oracle-feedback-themes-loop)
 *
 * Closes the loop on the Oracle thumbs-down feedback form (S206 #13). That form
 * captures free text but — by privacy design — never transmits it; only a
 * volume event (oracle:feedback_submitted) and, since S207, a topic-attributed
 * event (oracle-feedback:<clusterId>) reach RUM. This script turns those into a
 * ranked "topics visitors wish the Oracle answered better" backlog so raw
 * thumbs-down signal becomes the next wave's content priorities.
 *
 * Sources:
 *   data/rum-ux-history.ndjson  — oracle-feedback:<cluster> + oracle:feedback_submitted counts
 *   api/oracle-insights.json    — clusterId → human query label (best-effort)
 *
 * Output: api/oracle-feedback-themes.json
 *   honestDark=true when total submissions < THRESHOLD (insufficient signal).
 *
 * Usage:
 *   node scripts/build-oracle-feedback-themes.mjs            # write the feed
 *   node scripts/build-oracle-feedback-themes.mjs --check    # drift gate
 *   node scripts/build-oracle-feedback-themes.mjs --self-test
 *
 * Exit: 0 ok · 1 error/drift.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const HISTORY = path.join(ROOT, 'data/rum-ux-history.ndjson');
const INSIGHTS = path.join(ROOT, 'api/oracle-insights.json');
const OUT = path.join(ROOT, 'api/oracle-feedback-themes.json');
const THRESHOLD = 5; // min total submissions before the feed is meaningful

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes('--self-test');
const CHECK = argv.includes('--check');

function readHistory() {
  if (!existsSync(HISTORY)) return [];
  return readFileSync(HISTORY, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function readClusterLabels() {
  // Best-effort clusterId → query label from oracle-insights. Tolerant of shape.
  if (!existsSync(INSIGHTS)) return {};
  let d;
  try { d = JSON.parse(readFileSync(INSIGHTS, 'utf8')); } catch { return {}; }
  const map = {};
  const clusters = Array.isArray(d.clusters) ? d.clusters
    : Array.isArray(d.topClusters) ? d.topClusters : [];
  for (const c of clusters) {
    if (c && typeof c === 'object' && c.key) map[c.key] = c.query || c.label || c.key;
  }
  return map;
}

// Pure aggregation — exercised by --self-test without files.
function buildThemes(rows, labels) {
  const perCluster = {};
  let totalSubmissions = 0;
  for (const r of rows) {
    const ev = r.event || '';
    const n = r.count || 0;
    if (ev === 'oracle:feedback_submitted') {
      totalSubmissions += n;
    } else if (ev.startsWith('oracle-feedback:')) {
      const cluster = ev.slice('oracle-feedback:'.length);
      if (cluster) perCluster[cluster] = (perCluster[cluster] || 0) + n;
    }
  }
  const themes = Object.keys(perCluster)
    .map((cluster) => ({
      cluster,
      label: (labels && labels[cluster]) || cluster,
      count: perCluster[cluster],
    }))
    .sort((a, b) => b.count - a.count || a.cluster.localeCompare(b.cluster))
    .slice(0, 8);

  return {
    schemaVersion: '1.0',
    generatedAt: latestDay(rows),
    totalSubmissions,
    attributedSubmissions: Object.values(perCluster).reduce((s, n) => s + n, 0),
    themes,
    honestDark: totalSubmissions < THRESHOLD,
    note: totalSubmissions < THRESHOLD
      ? 'Insufficient feedback volume — feed stays dark until ' + THRESHOLD + '+ submissions accrue.'
      : 'Topics ranked by thumbs-down "tell us more" submission volume. Free text is never transmitted; only the topic cluster.',
  };
}

function latestDay(rows) {
  let max = null;
  for (const r of rows) { if (r.day && (!max || r.day > max)) max = r.day; }
  return max || '1970-01-01';
}

function serialize(obj) { return JSON.stringify(obj, null, 2) + '\n'; }

if (SELF_TEST) {
  let passed = 0;
  const assert = (ok, msg) => { if (!ok) { console.error('✗ ' + msg); process.exit(1); } console.log('  ✓ ' + msg); passed++; };

  const dark = buildThemes([{ event: 'oracle:feedback_submitted', count: 2 }], {});
  assert(dark.honestDark === true, 'honestDark when total submissions < threshold');

  const rows = [
    { day: '2026-06-12', event: 'oracle:feedback_submitted', count: 6 },
    { day: '2026-06-12', event: 'oracle-feedback:membership', count: 4 },
    { day: '2026-06-12', event: 'oracle-feedback:ranks', count: 2 },
  ];
  const lit = buildThemes(rows, { membership: 'How does membership work?' });
  assert(lit.honestDark === false, 'honestDark=false at threshold');
  assert(lit.themes[0].cluster === 'membership' && lit.themes[0].count === 4, 'top theme ranked by volume');
  assert(lit.themes[0].label === 'How does membership work?', 'cluster label resolved from insights');
  assert(lit.themes[1].cluster === 'ranks', 'second theme present');
  assert(lit.attributedSubmissions === 6, 'attributed submissions summed');
  assert(lit.generatedAt === '2026-06-12', 'generatedAt = latest history day (deterministic)');

  console.log(`\nbuild-oracle-feedback-themes self-test: ${passed} passing`);
  process.exit(0);
}

const out = buildThemes(readHistory(), readClusterLabels());
const serialized = serialize(out);

if (CHECK) {
  let committed = '';
  try { committed = readFileSync(OUT, 'utf8'); } catch {}
  if (committed !== serialized) {
    console.error('build-oracle-feedback-themes --check: api/oracle-feedback-themes.json drift; run node scripts/build-oracle-feedback-themes.mjs');
    process.exit(1);
  }
  console.log(`build-oracle-feedback-themes --check: ok (${out.themes.length} theme(s), honestDark=${out.honestDark})`);
  process.exit(0);
}

writeFileSync(OUT, serialized);
console.log(`build-oracle-feedback-themes → api/oracle-feedback-themes.json (${out.themes.length} theme(s), ${out.totalSubmissions} submission(s), honestDark=${out.honestDark})`);
