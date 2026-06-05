#!/usr/bin/env node
/**
 * RUM strictness ladder.
 *
 * Replaces the binary "wait for 50 samples, then maybe strict" posture with a
 * visible route-level state machine. It does not block builds yet; it tells the
 * next /implement exactly when field data is strong enough to become strict.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SUMMARY = path.join(ROOT, 'data', 'rum-summary.json');
const OUT = path.join(ROOT, '.cache', 'rum-strict-ladder.json');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');

export function buildLadder(summary) {
  const minSamples = Number(summary?.minSamples) || 50;
  const routes = summary?.routes && typeof summary.routes === 'object' ? summary.routes : {};
  const routeStates = Object.entries(routes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([route, info]) => {
      const samples = Number(info?.samples) || 0;
      let state = 'accumulating';
      if (samples >= minSamples) state = 'route-strict-ready';
      else if (samples >= Math.ceil(minSamples / 2)) state = 'warning';
      const remaining = Math.max(0, minSamples - samples);
      return {
        route,
        samples,
        minSamples,
        state,
        remaining,
        p75: info?.p75 || {},
        overBudget: Boolean(
          samples >= minSamples &&
          summary?.fieldBudget &&
          Number(info?.p75?.lcp) > Number(summary.fieldBudget.lcp || Infinity)
        ),
      };
    });
  const readyRoutes = routeStates.filter((r) => r.state === 'route-strict-ready');
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/check-rum-strict-ladder.mjs',
    minSamples,
    totalSamples: Number(summary?.totalSamples) || 0,
    sufficientRoutes: readyRoutes.length,
    siteState: readyRoutes.length >= 3 ? 'site-strict-candidate' : readyRoutes.length ? 'partial-route-strict' : routeStates.some((r) => r.state === 'warning') ? 'warning' : 'accumulating',
    nextRoute: routeStates.filter((r) => r.remaining > 0).sort((a, b) => a.remaining - b.remaining)[0] || null,
    routes: routeStates,
  };
}

if (SELF_TEST) {
  const ladder = buildLadder({
    minSamples: 50,
    totalSamples: 87,
    fieldBudget: { lcp: 2500 },
    routes: {
      '/': { samples: 18, p75: { lcp: 1000 } },
      '/games/': { samples: 26, p75: { lcp: 2600 } },
      '/studio/': { samples: 50, p75: { lcp: 2700 } },
    },
  });
  const cases = [
    ['site is partial strict when one route ready', ladder.siteState === 'partial-route-strict'],
    ['warning route recognized', ladder.routes.find((r) => r.route === '/games/').state === 'warning'],
    ['ready route over budget flagged', ladder.routes.find((r) => r.route === '/studio/').overBudget === true],
    ['next route is closest remaining', ladder.nextRoute.route === '/games/'],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const summary = fs.existsSync(SUMMARY) ? JSON.parse(fs.readFileSync(SUMMARY, 'utf8')) : {};
const ladder = buildLadder(summary);
if (CHECK) {
  if (!fs.existsSync(OUT)) {
    console.error('check-rum-strict-ladder --check: missing .cache/rum-strict-ladder.json; run without --check first');
    process.exit(1);
  }
  const current = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const comparableCurrent = { ...current, generatedAt: '' };
  const comparableNext = { ...ladder, generatedAt: '' };
  if (JSON.stringify(comparableCurrent) !== JSON.stringify(comparableNext)) {
    console.error('check-rum-strict-ladder --check: ladder drift; run node scripts/check-rum-strict-ladder.mjs');
    process.exit(1);
  }
  console.log(`check-rum-strict-ladder: ${ladder.siteState} · totalSamples=${ladder.totalSamples} · readyRoutes=${ladder.sufficientRoutes}`);
  if (ladder.nextRoute) console.log(`  next: ${ladder.nextRoute.route} needs ${ladder.nextRoute.remaining} more sample(s)`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(ladder, null, 2)}\n`, 'utf8');
console.log(`check-rum-strict-ladder: ${ladder.siteState} · totalSamples=${ladder.totalSamples} · readyRoutes=${ladder.sufficientRoutes}`);
if (ladder.nextRoute) console.log(`  next: ${ladder.nextRoute.route} needs ${ladder.nextRoute.remaining} more sample(s)`);
