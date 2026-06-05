#!/usr/bin/env node
/**
 * build-analytics-summary.mjs (S175 #5 · edge-analytics-replace-gtag)
 *
 * Self-hosted analytics from data the site already collects: the RUM beacon
 * fires on every page view (no sampling), so data/rum-history.ndjson route-day
 * rows ARE complete first-party page-view analytics. This rollup replaces
 * Google Analytics (founder-approved removal) with zero new collection,
 * zero cookies, zero third-party origins.
 *
 * Output: api/analytics-summary.json — public-safe aggregates only.
 *
 * Usage:
 *   node scripts/build-analytics-summary.mjs            # write
 *   node scripts/build-analytics-summary.mjs --check    # drift gate (ignores generatedAt)
 *   node scripts/build-analytics-summary.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HISTORY = path.join(ROOT, 'data', 'rum-history.ndjson');
const OUT = path.join(ROOT, 'api', 'analytics-summary.json');
const CHECK = process.argv.includes('--check');

export function summarize(rows, todayIso) {
  const today = todayIso || new Date().toISOString().slice(0, 10);
  const dayMs = 86400000;
  const cutoff7 = new Date(new Date(today).getTime() - 7 * dayMs).toISOString().slice(0, 10);
  const cutoff30 = new Date(new Date(today).getTime() - 30 * dayMs).toISOString().slice(0, 10);
  const valid = rows.filter((r) => r && r.route && r.day && Number.isFinite(r.samples) && !r.route.startsWith('/__'));

  const byDay = new Map();
  const byRoute7 = new Map();
  let views7 = 0, views30 = 0;
  for (const r of valid) {
    if (r.day < cutoff30) continue;
    views30 += r.samples;
    byDay.set(r.day, (byDay.get(r.day) || 0) + r.samples);
    if (r.day >= cutoff7) {
      views7 += r.samples;
      byRoute7.set(r.route, (byRoute7.get(r.route) || 0) + r.samples);
    }
  }
  const topRoutes = [...byRoute7.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([route, views]) => ({ route, views }));
  const daily = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, views]) => ({ day, views }));
  return { views7, views30, topRoutes, daily, routesObserved7: byRoute7.size };
}

if (process.argv.includes('--self-test')) {
  const rows = [
    { day: '2026-06-04', route: '/', samples: 10 },
    { day: '2026-06-04', route: '/games/', samples: 3 },
    { day: '2026-05-20', route: '/', samples: 5 },
    { day: '2026-06-04', route: '/__rum_selftest', samples: 99 },
  ];
  const s = summarize(rows, '2026-06-05');
  const checks = [
    ['7d views', s.views7 === 13],
    ['30d includes older', s.views30 === 18],
    ['selftest route excluded', !s.topRoutes.some((r) => r.route.startsWith('/__'))],
    ['top route is home', s.topRoutes[0].route === '/'],
  ];
  let pass = 0;
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (ok) pass++; }
  console.log(`build-analytics-summary --self-test: ${pass}/${checks.length}`);
  process.exit(pass === checks.length ? 0 : 1);
}

const rows = fs.existsSync(HISTORY)
  ? fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } })
  : [];
const payload = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/build-analytics-summary.mjs',
  publicSafe: true,
  note: 'First-party page-view aggregates from the RUM beacon. No cookies, no third parties, no per-visitor data.',
  ...summarize(rows),
};

if (CHECK) {
  if (!fs.existsSync(OUT)) { console.error('build-analytics-summary --check: missing output; run without --check'); process.exit(1); }
  const cur = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  if (JSON.stringify({ ...cur, generatedAt: '' }) !== JSON.stringify({ ...payload, generatedAt: '' })) {
    console.error('build-analytics-summary --check: drift; run node scripts/build-analytics-summary.mjs');
    process.exit(1);
  }
  console.log(`build-analytics-summary --check: ok (${payload.views7} views/7d)`);
  process.exit(0);
}
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
console.log(`build-analytics-summary → api/analytics-summary.json (${payload.views7} views/7d · ${payload.views30} views/30d · top: ${payload.topRoutes[0]?.route ?? '—'})`);
