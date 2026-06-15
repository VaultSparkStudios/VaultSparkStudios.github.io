#!/usr/bin/env node
/**
 * build-nav-sheet-stats.mjs
 *
 * Rolls privacy-minimized nav-sheet UX beacons into a public-safe aggregate.
 * Input is an exported raw RUM ndjson/json file; no IDs, emails, or free text
 * are read or written. Missing input emits an honest empty artifact so the
 * mobile default-swap remains evidence-gated instead of blocked on tooling.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'nav-sheet-stats.json');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');
const ALLOWED = new Set([
  'nav-sheet:open',
  'nav-sheet:close',
  'nav-sheet:backdrop-close',
  'nav-sheet:drag-close',
]);

function flag(name, fallback) {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
}

function normalizeRoute(route) {
  if (!route || typeof route !== 'string') return '/';
  const clean = route.split('?')[0].split('#')[0].trim() || '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

function loadRows() {
  const explicit = flag('--from', '');
  const candidates = [
    explicit,
    path.join(ROOT, 'data', 'rum-raw.ndjson'),
    path.join(ROOT, 'data', 'rum-raw.json'),
  ].filter(Boolean);
  for (const file of candidates) {
    const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8').trim();
    if (!text) return { source: path.relative(ROOT, abs), rows: [] };
    if (text[0] === '[') {
      try { return { source: path.relative(ROOT, abs), rows: JSON.parse(text) }; } catch {}
    }
    const rows = text.split('\n')
      .filter(Boolean)
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
    return { source: path.relative(ROOT, abs), rows };
  }
  // Fallback: scan .cache/rum-raw/ date-partitioned directories (fetch-rum-from-r2 output)
  const cacheDir = path.join(ROOT, '.cache', 'rum-raw');
  if (fs.existsSync(cacheDir)) {
    const rows = [];
    for (const dt of fs.readdirSync(cacheDir).sort()) {
      const dtDir = path.join(cacheDir, dt);
      if (!fs.statSync(dtDir).isDirectory()) continue;
      for (const f of fs.readdirSync(dtDir)) {
        if (!f.endsWith('.json')) continue;
        try {
          const parsed = JSON.parse(fs.readFileSync(path.join(dtDir, f), 'utf8'));
          rows.push(parsed);
        } catch {}
      }
    }
    if (rows.length > 0) return { source: `.cache/rum-raw (${rows.length} events)`, rows };
  }
  return { source: 'none', rows: [] };
}

function summarize(rows, { minOpens = 50 } = {}) {
  const totals = {
    opens: 0,
    closes: 0,
    backdropCloses: 0,
    dragCloses: 0,
    ignored: 0,
  };
  const routes = {};
  for (const row of rows) {
    const event = typeof row?.ux === 'string' ? row.ux : '';
    if (!ALLOWED.has(event)) {
      if (event) totals.ignored += 1;
      continue;
    }
    const route = normalizeRoute(row.route);
    if (!routes[route]) {
      routes[route] = { opens: 0, closes: 0, backdropCloses: 0, dragCloses: 0 };
    }
    if (event === 'nav-sheet:open') {
      totals.opens += 1;
      routes[route].opens += 1;
    } else {
      totals.closes += 1;
      routes[route].closes += 1;
      if (event === 'nav-sheet:backdrop-close') {
        totals.backdropCloses += 1;
        routes[route].backdropCloses += 1;
      }
      if (event === 'nav-sheet:drag-close') {
        totals.dragCloses += 1;
        routes[route].dragCloses += 1;
      }
    }
  }
  const closeDenominator = Math.max(1, totals.closes);
  const remainingOpens = Math.max(0, minOpens - totals.opens);
  const decisionETA = totals.opens >= minOpens
    ? 'ready-for-evaluation'
    : totals.opens === 0
      ? `needs ${remainingOpens} mobile sheet open event(s)`
      : `needs ${remainingOpens} more open event(s)`;
  const readiness = {
    minOpens,
    canaryPercent: 25,
    sufficient: totals.opens >= minOpens,
    remainingOpens,
    decisionETA,
    backdropCloseRate: Number((totals.backdropCloses / closeDenominator).toFixed(3)),
    dragCloseRate: Number((totals.dragCloses / closeDenominator).toFixed(3)),
    defaultSwapReady: totals.opens >= minOpens && (totals.backdropCloses / closeDenominator) <= 0.35,
  };
  return { totals, routes, readiness };
}

if (SELF_TEST) {
  const sample = [
    { route: '/?nav=sheet', ux: 'nav-sheet:open' },
    { route: '/', ux: 'nav-sheet:drag-close' },
    { route: '/membership/#x', ux: 'nav-sheet:open' },
    { route: '/membership/', ux: 'nav-sheet:backdrop-close' },
    { route: '/membership/', ux: 'bad-event' },
  ];
  const sum = summarize(sample, { minOpens: 2 });
  const cases = [
    ['counts opens', sum.totals.opens === 2],
    ['counts close causes', sum.totals.dragCloses === 1 && sum.totals.backdropCloses === 1],
    ['normalizes routes', !!sum.routes['/'] && !!sum.routes['/membership/']],
    ['ignores non-allowlisted ux', sum.totals.ignored === 1],
    ['readiness computes', sum.readiness.sufficient === true && sum.readiness.defaultSwapReady === false],
    ['decision ETA exists', typeof sum.readiness.decisionETA === 'string'],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (CHECK) {
  if (!fs.existsSync(OUT)) {
    console.error('build-nav-sheet-stats --check: api/nav-sheet-stats.json missing');
    process.exit(1);
  }
  const parsed = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  if (!parsed || parsed.schemaVersion !== '1.0' || !parsed.readiness) {
    console.error('build-nav-sheet-stats --check: invalid artifact shape');
    process.exit(1);
  }
  console.log(`build-nav-sheet-stats --check: ok (${parsed.totals?.opens || 0} opens, ready=${!!parsed.readiness.defaultSwapReady})`);
  process.exit(0);
}

const { source, rows } = loadRows();
const stats = summarize(rows);
const artifact = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/build-nav-sheet-stats.mjs',
  source,
  publicSafe: true,
  totals: stats.totals,
  routes: stats.routes,
  readiness: stats.readiness,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`build-nav-sheet-stats -> api/nav-sheet-stats.json (${artifact.totals.opens} opens, ready=${artifact.readiness.defaultSwapReady})`);
