#!/usr/bin/env node
/**
 * analyze-tt-violations.mjs (S174 audit #3 · tt-intake-forensics-fix)
 *
 * Reads every sampled Trusted Types report body from Workers KV and clusters
 * violations by (sourceFile, lineNumber) so the burndown is evidence-driven
 * instead of one-sample guesswork.
 *
 * Pairs with the worker-side fix that normalizes the Reporting API array
 * shape (pre-fix rows have all-null fields and are reported as a parse-blind
 * cluster of their own — they age out with the KV TTL).
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
    .map((c) => ({ ...c, sinks: [...c.sinks], days: [...c.days].sort() }))
    .sort((a, b) => b.count - a.count);
}

if (args.includes('--self-test')) {
  const reports = [
    { ts: '2026-06-04T01:00:00Z', documentUri: 'https://x.com/', sourceFile: 'https://x.com/', lineNumber: 15, blockedUri: 'https://x.com/trusted-types-sink', sample: "Element.innerHTML <div>" },
    { ts: '2026-06-04T02:00:00Z', documentUri: 'https://x.com/', sourceFile: 'https://x.com/', lineNumber: 15, blockedUri: 'https://x.com/trusted-types-sink' },
    { ts: '2026-06-05T01:00:00Z', documentUri: null, sourceFile: null, blockedUri: null },
    { ts: '2026-06-05T02:00:00Z', documentUri: null, sourceFile: null, blockedUri: null },
    { ts: '2026-06-05T03:00:00Z', documentUri: 'https://x.com/a/', sourceFile: 'https://x.com/assets/y.js', lineNumber: 3 },
  ];
  const clusters = clusterReports(reports);
  const checks = [
    ['3 clusters', clusters.length === 3],
    ['top cluster is line 15 ×2', clusters[0].count === 2 && clusters[0].key.endsWith(':15')],
    ['parse-blind bucketed', clusters.some((c) => c.parseBlind && c.count === 2)],
    ['sample preserved', clusters[0].sample?.includes('innerHTML')],
    ['days tracked', clusters[0].days.length === 1],
  ];
  let pass = 0;
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (ok) pass++; }
  console.log(`analyze-tt-violations --self-test: ${pass}/${checks.length}`);
  process.exit(pass === checks.length ? 0 : 1);
}

// ---------------------------------------------------------------------------
// KV access (deploy token first — same path probe-tt-soak.mjs verified)
// ---------------------------------------------------------------------------

const { getSecret, redact } = await import('./lib/secrets.mjs');

let token, accountId;
try {
  accountId = getSecret('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.deploy');
  try {
    token = getSecret('CLOUDFLARE_API_TOKEN', 'cloudflare.deploy');
  } catch {
    token = getSecret('CLOUDFLARE_STUDIO_TOKEN', 'cloudflare.studio');
  }
} catch (err) {
  console.error(`analyze-tt-violations: credential resolution failed — ${redact(String(err?.message || err))}`);
  process.exit(1);
}

const API = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${NAMESPACE_ID}`;
const headers = { Authorization: `Bearer ${token}` };

async function cf(pathPart) {
  const res = await fetch(`${API}${pathPart}`, { headers });
  const text = await res.text();
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { detail = JSON.parse(text)?.errors?.map((e) => `${e.code}: ${e.message}`).join(' · ') || detail; } catch {}
    throw new Error(`${detail} (${pathPart.split('?')[0]})`);
  }
  return text;
}

try {
  const keys = [];
  let cursor = '';
  do {
    const page = JSON.parse(await cf(`/keys?prefix=tt%3A&limit=1000${cursor ? `&cursor=${cursor}` : ''}`));
    keys.push(...(page.result || []).map((k) => k.name));
    cursor = page.result_info?.cursor || '';
  } while (cursor);

  const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);
  const reportKeys = keys.filter((k) => {
    const m = k.match(/^tt:(\d{4}-\d{2}-\d{2}):(\d{4})$/);
    return m && m[1] >= cutoff;
  });

  console.log(`analyze-tt-violations: ${reportKeys.length} report body/ies in window (${DAYS}d)`);
  const reports = [];
  for (const key of reportKeys) {
    try {
      reports.push(JSON.parse(await cf(`/values/${encodeURIComponent(key)}`)));
    } catch { /* expired between list and read — skip */ }
  }

  const clusters = clusterReports(reports);
  const today = new Date().toISOString().slice(0, 10);

  const lines = [
    '<!-- generated-by: scripts/analyze-tt-violations.mjs -->',
    `<!-- generated-at: ${today} -->`,
    '',
    '# Trusted Types Violation Burndown',
    '',
    `> ${reports.length} sampled report(s) over last ${DAYS} day(s) · clustered by sourceFile:line.`,
    '> Parse-blind rows predate the S174 intake fix and age out with the KV TTL.',
    '',
    '| Cluster | Count | Days seen | Sink/sample evidence |',
    '|---|---:|---|---|',
    ...clusters.map((c) =>
      `| \`${c.key}\` | ${c.count} | ${c.days.join(', ') || '—'} | ${c.sample ? `\`${String(c.sample).slice(0, 80)}\`` : '—'} |`),
    '',
    '## Next actions',
    '',
    clusters.some((c) => !c.parseBlind)
      ? '- Fix the named sinks above (largest cluster first), redeploy, and rerun `node scripts/probe-tt-soak.mjs`.'
      : '- All rows are parse-blind (pre-fix). Wait one soak interval after the intake fix deploys, then rerun this script for named clusters.',
    '- Enforce canary stays gated until clusters read ~0 (S173 ladder decision).',
    '',
  ];

  if (!NO_WRITE) {
    const out = path.join(ROOT, 'docs', `TT_BURNDOWN_${today}.md`);
    fs.writeFileSync(out, lines.join('\n'));
    fs.mkdirSync(path.join(ROOT, '.cache'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, '.cache', 'tt-violation-clusters.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), windowDays: DAYS, totalReports: reports.length, clusters }, null, 2));
    console.log(`  → ${path.relative(ROOT, out)}`);
  }
  for (const c of clusters.slice(0, 8)) console.log(`  ${String(c.count).padStart(4)}  ${c.key}`);
} catch (err) {
  console.error(`analyze-tt-violations: ${redact(String(err?.message || err))}`);
  process.exit(1);
}
