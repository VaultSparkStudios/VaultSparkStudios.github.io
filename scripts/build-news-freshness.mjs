#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveDeskFreshness } from './lib/news-freshness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = path.join(ROOT, 'data', 'news-desk', 'days');
const OUT = path.join(ROOT, 'api', 'news-desk-freshness.json');

const loadDays = () => fs.readdirSync(DAYS).filter((name) => name.endsWith('.json')).sort()
  .map((name) => JSON.parse(fs.readFileSync(path.join(DAYS, name), 'utf8')));

function selfTest() {
  const day = (date) => ({ date, simulated: false });
  const now = new Date('2026-08-16T12:00:00Z');
  const cases = [
    ['today is daily', deriveDeskFreshness([day('2026-08-16')], { now }).state === 'daily'],
    ['one day old remains inside the daily evidence window', deriveDeskFreshness([day('2026-08-15')], { now }).state === 'daily'],
    ['five days old downgrades to periodic', deriveDeskFreshness([day('2026-08-11')], { now }).state === 'periodic'],
    ['seven days old is paused', deriveDeskFreshness([day('2026-08-09')], { now }).state === 'paused'],
    ['simulated editions cannot refresh the public cadence', deriveDeskFreshness([day('2026-08-11'), { date: '2026-08-16', simulated: true }], { now }).latestEditionDate === '2026-08-11'],
  ];
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`));
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`build-news-freshness --self-test: ${cases.length}/${cases.length} passed`);
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
    return;
  }
  fs.writeFileSync(OUT, rendered);
  console.log(`news freshness → ${value.state} · latest ${value.latestEditionDate || 'none'} · age ${value.ageDays ?? 'unknown'}d`);
}

main();
