#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveDeskFreshness, staticDeskEvidence, renderStaticDeskEvidence } from './lib/news-freshness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = path.join(ROOT, 'data', 'news-desk', 'days');
const OUT = path.join(ROOT, 'api', 'news-desk-freshness.json');

const loadDays = () => fs.readdirSync(DAYS).filter((name) => name.endsWith('.json')).sort()
  .map((name) => JSON.parse(fs.readFileSync(path.join(DAYS, name), 'utf8')));

function selfTest() {
  const day = (date) => ({ date, simulated: false });
  const now = new Date('2026-08-16T12:00:00Z');
  const daily = deriveDeskFreshness([day('2026-08-16')], { now });
  const periodic = deriveDeskFreshness([day('2026-08-11')], { now });
  const paused = deriveDeskFreshness([day('2026-08-09')], { now });
  const cases = [
    ['today is daily', deriveDeskFreshness([day('2026-08-16')], { now }).state === 'daily'],
    ['one day old remains inside the daily evidence window', deriveDeskFreshness([day('2026-08-15')], { now }).state === 'daily'],
    ['five days old downgrades to periodic', deriveDeskFreshness([day('2026-08-11')], { now }).state === 'periodic'],
    ['seven days old is paused', deriveDeskFreshness([day('2026-08-09')], { now }).state === 'paused'],
    ['simulated editions cannot refresh the public cadence', deriveDeskFreshness([day('2026-08-11'), { date: '2026-08-16', simulated: true }], { now }).latestEditionDate === '2026-08-11'],
    ['daily evidence satisfies the publisher postcondition', cadenceSatisfied(daily)],
    ['periodic and paused evidence fail the publisher postcondition', !cadenceSatisfied(periodic) && !cadenceSatisfied(paused)],
  ];
  const corpus = [day('2026-08-15')];
  const before = renderStaticDeskEvidence(corpus);
  const oldDate = globalThis.Date;
  let after;
  try {
    globalThis.Date = class { constructor() { throw new Error('static HTML must not read the clock'); } static now() { throw new Error('static HTML must not read the clock'); } };
    after = renderStaticDeskEvidence(corpus);
  } finally { globalThis.Date = oldDate; }
  cases.push(['static evidence is independent of runtime clock', before === after]);
  cases.push(['new published edition changes static evidence', before !== renderStaticDeskEvidence([...corpus, day('2026-08-16')])]);
  cases.push(['simulated edition cannot refresh static evidence', before === renderStaticDeskEvidence([...corpus, {date:'2026-08-16', simulated:true}])]);
  cases.push(['empty corpus remains unavailable, never daily', staticDeskEvidence([]).state === 'unavailable' && renderStaticDeskEvidence([]).includes('not yet available')]);
  cases.push(['unsafe date cannot enter markup', !renderStaticDeskEvidence([{date:'<script>'}]).includes('<script>')]);
  cases.push(['static report makes no relative-age or current-cadence claim', !before.includes('days old') && !before.includes('Daily cadence') && before.includes('/api/news-desk-freshness.json')]);
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`));
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`build-news-freshness --self-test: ${cases.length}/${cases.length} passed`);
}

export function cadenceSatisfied(value) {
  return value && value.state === 'daily';
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const value = deriveDeskFreshness(loadDays());
  const rendered = `${JSON.stringify(value, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (actual !== rendered) {
      console.error('news freshness drift: public cadence no longer matches the latest edition; run node scripts/build-news-freshness.mjs and regenerate news pages');
      process.exit(1);
    }
    console.log(`news freshness: ${value.state} · latest ${value.latestEditionDate || 'none'} · age ${value.ageDays ?? 'unknown'}d`);
  } else {
    fs.writeFileSync(OUT, rendered);
    console.log(`news freshness -> ${value.state} · latest ${value.latestEditionDate || 'none'} · age ${value.ageDays ?? 'unknown'}d`);
  }
  if (process.argv.includes('--require-daily') && !cadenceSatisfied(value)) {
    console.error(`news cadence postcondition failed: public state is ${value.state}; latest edition ${value.latestEditionDate || 'none'} is ${value.ageDays ?? 'unknown'} day(s) old`);
    process.exit(1);
  }
}

main();
