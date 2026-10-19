#!/usr/bin/env node
/**
 * analyze-tt-violations.mjs (S174 audit #3 · tt-intake-forensics-fix)
 *
 * Reads sampled Trusted Types reports from private R2 plus legacy Workers KV and clusters
 * violations by (sourceFile, lineNumber) so the burndown is evidence-driven
 * instead of one-sample guesswork.
 *
 * S259 adds a freshness lens: the burndown keeps the 30-day volume view, but
 * also ranks clusters by most-recent violation day so stale pre-deploy noise
 * cannot outrank currently active sinks during enforcement decisions.
 *
 * Output: docs/TT_BURNDOWN_<date>.md + .cache/tt-violation-clusters.json
 *
 * Usage:
 *   node scripts/analyze-tt-violations.mjs            # last 30 days
 *   node scripts/analyze-tt-violations.mjs --days=14
 *   node scripts/analyze-tt-violations.mjs --no-write
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const NO_WRITE = args.includes('--no-write');

function flag(name, fallback) {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
}

const DAYS = Math.max(1, Number(flag('--days', 30)) || 30);
const NAMESPACE_ID = flag('--namespace', '6fde74ca7f3d462786afbb85c85611e0');

// ---------------------------------------------------------------------------
// Clustering (pure — exported for self-test)
// ---------------------------------------------------------------------------

export function clusterReports(reports) {
  const clusters = new Map();
  for (const r of reports) {
    const parseBlind = !r.documentUri && !r.sourceFile && !r.blockedUri;
    const key = parseBlind
      ? 'PARSE-BLIND (pre-fix intake rows — no fields survived normalization)'
      : `${r.sourceFile || r.documentUri || 'unknown-source'}:${r.lineNumber ?? '?'}`;
    if (!clusters.has(key)) {
      clusters.set(key, { key, count: 0, parseBlind, sample: null, sinks: new Set(), days: new Set() });
    }
    const c = clusters.get(key);
    c.count++;
    if (r.ts) c.days.add(String(r.ts).slice(0, 10));
    if (!c.sample && (r.sample || r.blockedUri)) c.sample = r.sample || r.blockedUri;
    if (r.blockedUri) c.sinks.add(r.blockedUri);
  }
  return [...clusters.values()]
    .map((c) => {
      const days = [...c.days].sort();
      return { ...c, sinks: [...c.sinks], days, firstSeen: days[0] || null, lastSeen: days.at(-1) || null };
    })
    .sort((a, b) => b.count - a.count);
}

export function classifyFreshness(cluster, today = new Date().toISOString().slice(0, 10)) {
  if (!cluster.lastSeen) {
    return { bucket: 'unknown', ageDays: null, rank: 3 };
  }
  const ageDays = Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${cluster.lastSeen}T00:00:00Z`)) / 86400000));
  if (ageDays <= 3) return { bucket: 'active-3d', ageDays, rank: 0 };
  if (ageDays <= 7) return { bucket: 'warm-7d', ageDays, rank: 1 };
  return { bucket: 'stale-8d+', ageDays, rank: 2 };
}

export function rankByFreshness(clusters, today = new Date().toISOString().slice(0, 10)) {
  return clusters
    .map((cluster) => ({ ...cluster, freshness: classifyFreshness(cluster, today) }))
    .sort((a, b) =>
      a.freshness.rank - b.freshness.rank
      || (b.lastSeen || '').localeCompare(a.lastSeen || '')
      || b.count - a.count
      || a.key.localeCompare(b.key));
}

function parseLocalClusterKey(key, repoRoot = ROOT) {
  const match = String(key).match(/^https:\/\/vaultsparkstudios\.com\/(.+):(\d+|\?)$/);
  if (!match) return null;
  const [, rawPath, rawLine] = match;
  if (!rawPath || rawPath.includes('://')) return null;

  let localPath = decodeURIComponent(rawPath).replace(/^\/+/, '');
  if (!localPath || localPath.endsWith('/')) {
    localPath = `${localPath}index.html`;
  } else if (!path.extname(localPath)) {
    localPath = `${localPath}/index.html`;
  }

  const absolute = path.resolve(repoRoot, localPath);
  const relative = path.relative(repoRoot, absolute).replace(/\\/g, '/');
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return {
    localPath: relative,
    lineNumber: rawLine === '?' ? null : Number(rawLine),
  };
}

function sinkNeedle(sample = '') {
  const text = String(sample);
  if (/Element innerHTML|Element\.innerHTML/i.test(text)) return 'innerHTML';
  if (/Element insertAdjacentHTML/i.test(text)) return 'insertAdjacentHTML';
  if (/HTMLScriptElement textContent/i.test(text)) return 'textContent';
  if (/HTMLScriptElement text\|/i.test(text)) return '.text';
  if (/HTMLScriptElement src/i.test(text)) return '.src';
  if (/Function\|/i.test(text)) return 'Function(';
  return null;
}

function sourceStillContainsSink(repoRoot, row) {
  const needle = sinkNeedle(row.sample);
  if (!needle) return null;
  if (needle === '.src') return false;
  const abs = path.join(repoRoot, row.localPath);
  if (!fs.existsSync(abs)) return null;
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  if (!row.lineNumber) return lines.some((line) => line.includes(needle));
  const start = Math.max(0, row.lineNumber - 8);
  const end = Math.min(lines.length, row.lineNumber + 7);
  return lines.slice(start, end).some((line) => line.includes(needle));
}

export function deriveLocalSinkRows(freshnessRanked, repoRoot = ROOT) {
  const rows = [];
  for (const cluster of freshnessRanked) {
    if (cluster.parseBlind) continue;
    const parsed = parseLocalClusterKey(cluster.key, repoRoot);
    if (!parsed) continue;
    const row = {
      key: cluster.key,
      localPath: parsed.localPath,
      lineNumber: parsed.lineNumber,
      count: cluster.count,
      lastSeen: cluster.lastSeen || null,
      freshness: cluster.freshness,
      sample: cluster.sample || null,
      sinkNeedle: sinkNeedle(cluster.sample),
    };
    row.stillPresentNearReportedLine = sourceStillContainsSink(repoRoot, row);
    rows.push(row);
  }
  return {
    activeLocalRows: rows.filter((row) => row.freshness?.bucket === 'active-3d'),
    warmLocalRows: rows.filter((row) => row.freshness?.bucket === 'warm-7d'),
    staleLocalRows: rows.filter((row) => row.freshness?.bucket === 'stale-8d+'),
    allLocalRows: rows,
  };
}
if (args.includes('--self-test')) {
  const reports = [
    { ts: '2026-06-04T01:00:00Z', documentUri: 'https://x.com/', sourceFile: 'https://x.com/', lineNumber: 15, blockedUri: 'https://x.com/trusted-types-sink', sample: 'Element.innerHTML <div>' },
    { ts: '2026-06-04T02:00:00Z', documentUri: 'https://x.com/', sourceFile: 'https://x.com/', lineNumber: 15, blockedUri: 'https://x.com/trusted-types-sink' },
    { ts: '2026-06-05T01:00:00Z', documentUri: null, sourceFile: null, blockedUri: null },
    { ts: '2026-06-05T02:00:00Z', documentUri: null, sourceFile: null, blockedUri: null },
    { ts: '2026-06-08T03:00:00Z', documentUri: 'https://x.com/a/', sourceFile: 'https://x.com/a/', lineNumber: 3 },
  ];
  const clusters = clusterReports(reports);
  const fresh = rankByFreshness(clusters, '2026-06-08');
  const localRows = deriveLocalSinkRows(fresh, ROOT);
  const checks = [
    ['3 clusters', clusters.length === 3],
    ['top cluster is line 15 x2', clusters[0].count === 2 && clusters[0].key.endsWith(':15')],
    ['parse-blind bucketed', clusters.some((c) => c.parseBlind && c.count === 2)],
    ['sample preserved', clusters[0].sample?.includes('innerHTML')],
    ['days tracked', clusters[0].days.length === 1],
    ['last seen tracked', clusters[0].lastSeen === '2026-06-04'],
    ['freshness outranks stale volume', fresh[0].key.endsWith('/a/:3') && fresh[0].freshness.bucket === 'active-3d'],
    ['local rows derived', Array.isArray(localRows.activeLocalRows)],
  ];
  let pass = 0;
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (ok) pass++; }
  console.log(`analyze-tt-violations --self-test: ${pass}/${checks.length}`);
  process.exit(pass === checks.length ? 0 : 1);
}

// ---------------------------------------------------------------------------
// KV access (deploy token first — same path probe-tt-soak.mjs verified)
// ---------------------------------------------------------------------------

const { redact } = await import('./lib/secrets.mjs');
const { readTtReports } = await import('./lib/tt-report-reader.mjs');
try {
  const evidence = await readTtReports({ days: DAYS, namespace: NAMESPACE_ID });
  const reports = evidence.reports;
  console.log(`analyze-tt-violations: ${reports.length} reports · ${evidence.legacyRecords} legacy KV records + ${evidence.r2Objects} R2 batches · complete`);
  console.log('Storage reads are complete; sampled and budget-capped intake is not a complete traffic census.');
  const clusters = clusterReports(reports);
  const today = new Date().toISOString().slice(0, 10);
  const freshnessRanked = rankByFreshness(clusters, today);
  const bucketCounts = freshnessRanked.reduce((acc, c) => {
    acc[c.freshness.bucket] = (acc[c.freshness.bucket] || 0) + 1;
    return acc;
  }, {});

  const lines = [
    '<!-- generated-by: scripts/analyze-tt-violations.mjs -->',
    `<!-- generated-at: ${today} -->`,
    '',
    '# Trusted Types Violation Burndown',
    '',
    `> ${reports.length} sampled report(s) over last ${DAYS} day(s) · clustered by sourceFile:line.`,
    '> Parse-blind rows predate the S174 intake fix and age out with the KV TTL.',
    `> Freshness lens: active-3d=${bucketCounts['active-3d'] || 0} · warm-7d=${bucketCounts['warm-7d'] || 0} · stale-8d+=${bucketCounts['stale-8d+'] || 0} · unknown=${bucketCounts.unknown || 0}.`,
    '',
    '## Freshness-ranked clusters',
    '',
    '| Cluster | Count | Last seen | Freshness | Sink/sample evidence |',
    '|---|---:|---|---|---|',
    ...freshnessRanked.map((c) =>
      `| \`${c.key}\` | ${c.count} | ${c.lastSeen || '—'} | ${c.freshness.bucket}${c.freshness.ageDays == null ? '' : ` (${c.freshness.ageDays}d old)`} | ${c.sample ? `\`${String(c.sample).slice(0, 80)}\`` : '—'} |`),
    '',
    '## Volume-ranked clusters',
    '',
    '| Cluster | Count | Days seen | Sink/sample evidence |',
    '|---|---:|---|---|',
    ...clusters.map((c) =>
      `| \`${c.key}\` | ${c.count} | ${c.days.join(', ') || '—'} | ${c.sample ? `\`${String(c.sample).slice(0, 80)}\`` : '—'} |`),
    '',
    '## Next actions',
    '',
    clusters.some((c) => !c.parseBlind)
      ? '- Fix active-3d and warm-7d named sinks first, then use the volume-ranked table for residual long-window cleanup.'
      : '- All rows are parse-blind (pre-fix). Wait one soak interval after the intake fix deploys, then rerun this script for named clusters.',
    '- Enforce canary stays gated until active and warm clusters read ~0 (S173 ladder decision).',
    '',
  ];

  if (!NO_WRITE) {
    const out = path.join(ROOT, 'docs', `TT_BURNDOWN_${today}.md`);
    const localRows = deriveLocalSinkRows(freshnessRanked, ROOT);
    fs.writeFileSync(out, lines.join('\n'));
    fs.mkdirSync(path.join(ROOT, '.cache'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, '.cache', 'tt-violation-clusters.json'),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        windowDays: DAYS,
        totalReports: reports.length,
        freshnessBuckets: bucketCounts,
        clusters,
        freshnessRanked,
        localRows,
      }, null, 2));
    fs.writeFileSync(path.join(ROOT, '.cache', 'tt-active-local-sinks.json'),
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        windowDays: DAYS,
        totalReports: reports.length,
        activeLocalRows: localRows.activeLocalRows,
        warmLocalRows: localRows.warmLocalRows,
        summary: {
          activeLocal: localRows.activeLocalRows.length,
          activeStillPresent: localRows.activeLocalRows.filter((row) => row.stillPresentNearReportedLine === true).length,
          warmLocal: localRows.warmLocalRows.length,
        },
      }, null, 2));
    console.log(`  → ${path.relative(ROOT, out)}`);
    console.log('  → .cache/tt-active-local-sinks.json');
  }
  for (const c of freshnessRanked.slice(0, 8)) {
    console.log(`  ${String(c.count).padStart(4)}  ${c.lastSeen || 'unknown'}  ${c.freshness.bucket.padEnd(9)}  ${c.key}`);
  }
} catch (err) {
  console.error(`analyze-tt-violations: ${redact(String(err?.message || err))}`);
  process.exit(1);
}
