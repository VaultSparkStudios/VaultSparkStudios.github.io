#!/usr/bin/env node
/* check-dead-ctas.mjs — S205 #14
   Reads api/funnel-summary.json, flags CTAs with zero engagement in the
   active window, and writes api/dead-ctas.json for SIGNALS block consumption.

   Dead CTA definition:
     families entry with counts.shown >= MIN_SHOWN AND counts.click === 0
     funnelCtas entry with clicks7d === 0 (when non-empty)

   Exits:
     0 — no dead CTAs found (or no data yet)
     1 — dead CTAs detected (SIGNAL output; non-fatal advisory in CI)

   Usage:
     node scripts/check-dead-ctas.mjs          # write + print
     node scripts/check-dead-ctas.mjs --check  # verify api/dead-ctas.json in sync
     node scripts/check-dead-ctas.mjs --self-test
*/
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUNNEL_PATH = join(ROOT, 'api', 'funnel-summary.json');
const OUT = join(ROOT, 'api', 'dead-ctas.json');
const MIN_SHOWN = 5;

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');
const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('check-dead-ctas.mjs');

// ── Self-test ──────────────────────────────────────────────────────────────

function selfTest() {
  const cases = [
    {
      name: 'empty funnelCtas + no families → no dead CTAs',
      funnel: { funnelCtas: {}, families: [] },
      expectDead: 0,
    },
    {
      name: 'family shown:10, click:0 → dead CTA',
      funnel: { funnelCtas: {}, families: [{ family: 'hero-cta', label: 'hero CTA', counts: { shown: 10, click: 0 } }] },
      expectDead: 1,
    },
    {
      name: 'family shown:3 (below threshold) → not dead',
      funnel: { funnelCtas: {}, families: [{ family: 'hero-cta', label: 'hero CTA', counts: { shown: 3, click: 0 } }] },
      expectDead: 0,
    },
    {
      name: 'family shown:10, click:2 → not dead',
      funnel: { funnelCtas: {}, families: [{ family: 'hero-cta', label: 'hero CTA', counts: { shown: 10, click: 2 } }] },
      expectDead: 0,
    },
    {
      name: 'funnelCtas entry with clicks7d:0 → dead',
      funnel: { funnelCtas: { 'hero-play': { clicks7d: 0, shown7d: 15 } }, families: [] },
      expectDead: 1,
    },
  ];
  let pass = 0, fail = 0;
  for (const c of cases) {
    const { dead } = analyze(c.funnel);
    if (dead.length === c.expectDead) {
      pass++;
    } else {
      fail++;
      console.error('  FAIL ' + c.name + ': expected ' + c.expectDead + ' dead, got ' + dead.length);
    }
  }
  console.log('check-dead-ctas self-test: ' + pass + '/' + cases.length + ' passed' + (fail ? ' — ' + fail + ' failed' : ''));
  process.exit(fail > 0 ? 1 : 0);
}

// ── Analyze ────────────────────────────────────────────────────────────────

function analyze(funnel) {
  const dead = [];

  // families: shown >= MIN_SHOWN but zero clicks
  (funnel.families || []).forEach(function (f) {
    const shown = (f.counts && f.counts.shown) || 0;
    const click = (f.counts && f.counts.click) || 0;
    if (shown >= MIN_SHOWN && click === 0) {
      dead.push({ source: 'family', id: f.family, label: f.label || f.family, shown, click });
    }
  });

  // funnelCtas: explicit 0-click entries
  Object.entries(funnel.funnelCtas || {}).forEach(function ([key, val]) {
    const clicks = typeof val === 'object' ? (val.clicks7d ?? val.clicks ?? val.count ?? 0) : (typeof val === 'number' ? val : 0);
    const shown = typeof val === 'object' ? (val.shown7d ?? val.shown ?? 0) : 0;
    if (shown >= MIN_SHOWN && clicks === 0) {
      dead.push({ source: 'funnelCtas', id: key, label: key, shown, click: clicks });
    }
  });

  const noData = !funnel.families?.length && !Object.keys(funnel.funnelCtas || {}).length;
  return { dead, noData };
}

// ── Main ───────────────────────────────────────────────────────────────────

if (SELF_TEST) { selfTest(); }

if (!SELF_TEST && RUN_DIRECT) {
  let funnel = {};
  try { funnel = JSON.parse(readFileSync(FUNNEL_PATH, 'utf8')); } catch { /* file missing */ }

  const { dead, noData } = analyze(funnel);

  const result = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString().slice(0, 10),
    noData,
    deadCount: dead.length,
    dead,
  };

  if (CHECK) {
    if (!existsSync(OUT)) {
      console.error('check-dead-ctas --check: missing api/dead-ctas.json');
      process.exit(1);
    }
    const current = JSON.parse(readFileSync(OUT, 'utf8'));
    if (current.deadCount !== result.deadCount) {
      console.error('check-dead-ctas --check: drift (deadCount changed ' + current.deadCount + ' → ' + result.deadCount + ')');
      process.exit(1);
    }
    console.log('check-dead-ctas --check: ok (' + result.deadCount + ' dead CTA(s))');
    process.exit(0);
  }

  writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');

  if (noData) {
    console.log('check-dead-ctas: no CTA tracking data yet (funnelCtas empty + no families)');
    process.exit(0);
  }

  if (dead.length === 0) {
    console.log('check-dead-ctas ✓ no dead CTAs found (' + (funnel.families || []).length + ' families checked)');
    process.exit(0);
  }

  console.warn('⚠  SIGNAL: ' + dead.length + ' dead CTA(s) — shown ≥' + MIN_SHOWN + ' impressions, zero clicks:');
  dead.forEach(function (d) {
    console.warn('  · ' + d.id + ' (' + d.shown + ' shown, 0 clicks)');
  });
  process.exit(1);
}

export { analyze };
