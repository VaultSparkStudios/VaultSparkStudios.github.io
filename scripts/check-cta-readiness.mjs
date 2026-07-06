#!/usr/bin/env node
/**
 * CTA sample-readiness sentinel.
 *
 * A zero-denominator conversion idea is not implementation-ready. This writes a
 * small artifact that generators can use to annotate or suppress phantom-open work.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FUNNEL = path.join(ROOT, 'api', 'funnel-summary.json');
const OUT = path.join(ROOT, '.cache', 'cta-readiness.json');
const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');

const RULES = {
  'play-next': {
    minShown: 20,
    since: '2026-07-02',
    action: 'redesign',
    reason: 'true-viewport post-epoch impressions',
  },
};

export function analyzeCtaReadiness(funnel, rules = RULES) {
  const families = new Map((funnel?.families || []).map((family) => [family.family, family]));
  const readiness = {};
  for (const [family, rule] of Object.entries(rules)) {
    const row = families.get(family);
    const shown = Number(row?.counts?.shown || 0);
    const click = Number(row?.counts?.click || 0);
    const ready = shown >= rule.minShown;
    readiness[family] = {
      family,
      action: rule.action,
      ready,
      shown,
      click,
      minShown: rule.minShown,
      since: row?.since || rule.since || null,
      rate: row?.rate ?? null,
      reason: ready
        ? `${shown} ${rule.reason} observed`
        : `waiting for ${rule.minShown - shown} more ${rule.reason}`,
    };
  }
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    publicSafe: true,
    readiness,
  };
}

function selfTest() {
  const waiting = analyzeCtaReadiness({ families: [{ family: 'play-next', counts: { shown: 0, click: 0 }, since: '2026-07-02' }] });
  const ready = analyzeCtaReadiness({ families: [{ family: 'play-next', counts: { shown: 22, click: 1 }, since: '2026-07-02' }] });
  const cases = [
    ['0 shown is waiting', waiting.readiness['play-next'].ready === false],
    ['waiting reason names remaining samples', /20 more/.test(waiting.readiness['play-next'].reason)],
    ['22 shown is ready', ready.readiness['play-next'].ready === true],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  if (failed.length) process.exit(1);
  console.log('check-cta-readiness --self-test: all passed');
}

if (SELF_TEST) {
  selfTest();
} else {
  const funnel = JSON.parse(fs.readFileSync(FUNNEL, 'utf8'));
  const result = analyzeCtaReadiness(funnel);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (CHECK) {
    if (!fs.existsSync(OUT)) {
      console.error('check-cta-readiness --check: missing .cache/cta-readiness.json');
      process.exit(1);
    }
    const current = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const currentPlayNext = current.readiness?.['play-next'];
    const nextPlayNext = result.readiness?.['play-next'];
    if (currentPlayNext?.ready !== nextPlayNext?.ready || currentPlayNext?.shown !== nextPlayNext?.shown) {
      console.error('check-cta-readiness --check: artifact drift; run node scripts/check-cta-readiness.mjs');
      process.exit(1);
    }
    console.log(`check-cta-readiness --check: ok (play-next ${currentPlayNext.ready ? 'ready' : currentPlayNext.reason})`);
    process.exit(0);
  }
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  const playNext = result.readiness['play-next'];
  console.log(`check-cta-readiness: play-next ${playNext.ready ? 'ready' : playNext.reason}`);
}
