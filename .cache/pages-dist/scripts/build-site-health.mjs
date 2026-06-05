#!/usr/bin/env node
/**
 * build-site-health.mjs (S172 audit #4 · field-health-public-badge)
 *
 * Public-safe site-health artifact: visitor-measured Core Web Vitals from the
 * RUM field loop (S172 rum-r2-field-unlock), published at api/site-health.json
 * for the /studio-pulse/ proof strip. A studio that sells release discipline
 * should prove its speed with real-visit numbers, not self-reported lab runs
 * (S169 posture: public proof).
 *
 * Honesty gates:
 *   - p75 numbers are only published for routes with >= MIN_SAMPLES field
 *     samples; thin routes are counted but never quoted.
 *   - When no route qualifies, fieldReady:false and the UI shows an
 *     accumulating state — never a fake number.
 *   - Aggregates only: no IDs, UAs, geos, or per-visit rows (publicSafe).
 *
 * Usage:
 *   node scripts/build-site-health.mjs            # write api/site-health.json
 *   node scripts/build-site-health.mjs --check    # present + parseable + fresh-shape
 *   node scripts/build-site-health.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SUMMARY = path.join(ROOT, 'data', 'rum-summary.json');
const OUT = path.join(ROOT, 'api', 'site-health.json');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

const MIN_SAMPLES = 50;
const ROUTE_ALLOWLIST = /^\/[a-z0-9\-\/]*$/; // public-safe route shape only

export function buildPayload(summary, { minSamples = MIN_SAMPLES } = {}) {
  const routes = summary?.routes && typeof summary.routes === 'object' ? summary.routes : {};
  const measured = [];
  let totalSamples = 0;
  for (const [route, info] of Object.entries(routes)) {
    if (!ROUTE_ALLOWLIST.test(route)) continue;
    const samples = Number(info?.samples) || 0;
    totalSamples += samples;
    if (samples >= minSamples && info?.p75) {
      measured.push({
        route,
        samples,
        p75: {
          lcp: Number.isFinite(info.p75.lcp) ? Math.round(info.p75.lcp) : null,
          cls: Number.isFinite(info.p75.cls) ? Math.round(info.p75.cls * 10000) / 10000 : null,
          inp: Number.isFinite(info.p75.inp) ? Math.round(info.p75.inp) : null,
        },
      });
    }
  }
  measured.sort((a, b) => b.samples - a.samples);
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/build-site-health.mjs',
    publicSafe: true,
    source: 'field-rum',
    windowDays: Number(summary?.windowDays) || 7,
    totalSamples,
    routesObserved: Object.keys(routes).length,
    minSamples,
    fieldReady: measured.length > 0,
    measured: measured.slice(0, 8),
  };
}

if (SELF_TEST) {
  const ready = buildPayload({ windowDays: 7, routes: { '/': { samples: 60, p75: { lcp: 2100.4, cls: 0.0512, inp: 120 } }, '/thin/': { samples: 3, p75: { lcp: 99999, cls: 1, inp: 9 } } } });
  ok(ready.fieldReady === true, 'route with 60 samples → fieldReady');
  ok(ready.measured.length === 1 && ready.measured[0].route === '/', 'thin route never quoted');
  ok(ready.measured[0].p75.lcp === 2100, 'lcp rounded');
  ok(ready.totalSamples === 63, 'total counts thin routes');
  const thin = buildPayload({ routes: { '/': { samples: 37, p75: { lcp: 17824, cls: 0.1, inp: 296 } } } });
  ok(thin.fieldReady === false && thin.measured.length === 0, 'sub-threshold → accumulating state, no numbers');
  const hostile = buildPayload({ routes: { '/<script>/': { samples: 999, p75: { lcp: 1 } } } });
  ok(hostile.routesObserved === 1 && hostile.measured.length === 0 && hostile.totalSamples === 0, 'non-allowlisted route shape excluded everywhere');
  console.log('build-site-health --self-test: OK (6 checks)');
  process.exit(0);
}

function ok(cond, msg) {
  if (!cond) { console.error(`self-test FAIL: ${msg}`); process.exit(1); }
}

if (CHECK) {
  if (!fs.existsSync(OUT)) { console.error('build-site-health --check: api/site-health.json missing — run npm run build'); process.exit(1); }
  try {
    const j = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    if (j.publicSafe !== true || typeof j.fieldReady !== 'boolean') throw new Error('shape drift');
    console.log(`build-site-health --check: OK (fieldReady=${j.fieldReady}, totalSamples=${j.totalSamples})`);
    process.exit(0);
  } catch (err) {
    console.error(`build-site-health --check: ${err.message}`);
    process.exit(1);
  }
}

let summary = null;
try { summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8')); } catch {}
const payload = buildPayload(summary);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`build-site-health → api/site-health.json (fieldReady=${payload.fieldReady} · ${payload.totalSamples} sample(s) · ${payload.measured.length} route(s) quoted)`);
