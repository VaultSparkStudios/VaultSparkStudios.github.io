#!/usr/bin/env node
/**
 * Route-level INP soak verdicts for mitigation boundaries.
 *
 * This is intentionally conservative: if we only have the current aggregate, it
 * records a pending baseline rather than claiming improvement.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'data', 'inp-breakdown.json');
const CANONICAL = path.join(ROOT, 'data', 'inp-soak-verdicts.json');
const PUBLIC = path.join(ROOT, 'api', 'inp-soak-verdicts.json');
const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');

const DEFAULT_BOUNDARY = {
  id: 's262-football-gm-inp-presentation-mitigation',
  session: 262,
  date: '2026-07-06',
  route: '/games/vaultspark-football-gm/',
  label: 'S262 Football GM INP presentation mitigation',
  minPostSamples: 30,
};

export function gradeBoundary(inp, boundary) {
  const route = inp?.routes?.[boundary.route] || null;
  if (!route) {
    return {
      ...boundary,
      verdict: 'pending',
      confidence: null,
      reason: 'route not present in current INP breakdown',
      current: null,
    };
  }
  const samples = Number(route.samples || 0);
  const duration = Number(route.p75ms?.duration || 0);
  const presentation = Number(route.p75ms?.presentation || 0);
  return {
    ...boundary,
    verdict: 'pending',
    confidence: samples >= boundary.minPostSamples ? 'baseline-ready' : 'low',
    reason: `awaiting post-boundary comparison window; current aggregate has ${samples} samples`,
    current: {
      samples,
      p75DurationMs: duration || null,
      p75PresentationMs: presentation || null,
      dominantPhase: route.dominantPhase || null,
      topType: route.topTypes?.[0]?.name || null,
      generatedAt: inp.generatedAt || null,
    },
  };
}

export function buildVerdicts(inp, boundaries = [DEFAULT_BOUNDARY]) {
  const entries = boundaries.map((boundary) => gradeBoundary(inp, boundary));
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/build-inp-soak-verdicts.mjs',
    publicSafe: true,
    note: 'Aggregated INP soak state only; no per-visit data. Pending until a post-boundary comparison window is available.',
    boundaries: entries,
  };
}

function selfTest() {
  const fixture = {
    generatedAt: '2026-07-06T00:00:00.000Z',
    routes: {
      '/games/vaultspark-football-gm/': {
        samples: 91,
        p75ms: { duration: 640, presentation: 351 },
        dominantPhase: 'presentation',
        topTypes: [{ name: 'pointerenter', count: 56 }],
      },
    },
  };
  const verdicts = buildVerdicts(fixture);
  const row = verdicts.boundaries[0];
  const cases = [
    ['default boundary present', row.id === DEFAULT_BOUNDARY.id],
    ['records current samples', row.current.samples === 91],
    ['stays pending', row.verdict === 'pending'],
    ['confidence baseline-ready', row.confidence === 'baseline-ready'],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  if (failed.length) process.exit(1);
  console.log('build-inp-soak-verdicts --self-test: all passed');
}

if (SELF_TEST) {
  selfTest();
} else if (CHECK) {
  if (!fs.existsSync(CANONICAL) || !fs.existsSync(PUBLIC)) {
    console.error('build-inp-soak-verdicts --check: missing verdict artifacts; run without --check');
    process.exit(1);
  }
  const canonical = JSON.parse(fs.readFileSync(CANONICAL, 'utf8'));
  const pub = JSON.parse(fs.readFileSync(PUBLIC, 'utf8'));
  if (!Array.isArray(canonical.boundaries) || pub.publicSafe !== true || !Array.isArray(pub.boundaries)) {
    console.error('build-inp-soak-verdicts --check: artifact shape drift');
    process.exit(1);
  }
  console.log(`build-inp-soak-verdicts --check: ok (${canonical.boundaries.length} boundary/ies)`);
} else {
  const inp = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const payload = buildVerdicts(inp);
  fs.writeFileSync(CANONICAL, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  fs.writeFileSync(PUBLIC, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const first = payload.boundaries[0];
  console.log(`build-inp-soak-verdicts: ${first.id} ${first.verdict} (${first.current?.samples || 0} current samples)`);
}
