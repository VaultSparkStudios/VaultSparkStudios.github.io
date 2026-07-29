#!/usr/bin/env node
/**
 * Keep the homepage's no-JavaScript launch age derived from the same committed
 * observation clock used by the cross-surface coherence gate.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HOME = path.join(ROOT, 'index.html');
const STATUS = path.join(ROOT, 'api', 'public-status.json');
const LAUNCH_UTC = Date.UTC(2026, 2, 4);
const DAY = 86_400_000;

export function launchAgeAt(generatedAt) {
  const now = Date.parse(generatedAt);
  if (!Number.isFinite(now) || now < LAUNCH_UTC) throw new Error('public status has an invalid observation clock');
  return Math.max(1, Math.floor((now - LAUNCH_UTC) / DAY));
}

export function replaceLaunchAge(html, age) {
  if (!Number.isInteger(age) || age < 1) throw new Error('launch age must be a positive integer');
  const pattern = /(<strong id="days-since-launch">)\d+(<\/strong>)/;
  if (!pattern.test(html)) throw new Error('homepage launch-age SSR marker is missing');
  return html.replace(pattern, `$1${age}$2`);
}

if (process.argv.includes('--self-test')) {
  const fixture = '<strong id="days-since-launch">116</strong>';
  const cases = [
    ['launch day has a one-day floor', launchAgeAt('2026-03-04T00:00:00.000Z') === 1],
    ['whole days derive deterministically', launchAgeAt('2026-03-14T12:00:00.000Z') === 10],
    ['SSR value is replaced exactly', replaceLaunchAge(fixture, 147).includes('>147<')],
    ['replacement is idempotent', replaceLaunchAge(replaceLaunchAge(fixture, 147), 147) === replaceLaunchAge(fixture, 147)],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${name}`));
  console.log(`build-launch-age --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

const status = JSON.parse(fs.readFileSync(STATUS, 'utf8'));
const age = launchAgeAt(status.generatedAt);
const actual = fs.readFileSync(HOME, 'utf8');
const expected = replaceLaunchAge(actual, age);

if (process.argv.includes('--check')) {
  if (actual !== expected) {
    console.error(`build-launch-age --check: homepage SSR drifted; expected ${age}`);
    process.exit(1);
  }
  console.log(`build-launch-age --check: ${age} day(s)`);
} else {
  fs.writeFileSync(HOME, expected, 'utf8');
  console.log(`build-launch-age: ${age} day(s)`);
}
