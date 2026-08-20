#!/usr/bin/env node
/* build-oracle-velocity-public.mjs — S200 #1

   Root cause this fixes: the Oracle heatmap + smart-insights fetch
   /ignis/output/ecosystem-velocity.json, which is GITIGNORED (local-only) and
   404s on production — so the "60 days of forge weather" heatmap and the
   velocity insight cards sit at "Loading 60-day grid…" forever for every public
   visitor (the exact gitignored-feed-on-prod class from S183). This emits a
   public-safe daily velocity feed at api/ecosystem-velocity.json (commit counts
   only — no internal data) in the EXACT shape oracle-extra.js + the
   oracle-insights compute layer expect (series.dates / series.commits +
   ecosystem.peakCommitDay/peakCommitCount), so those panels render real data on
   prod. Source is the public git log (already on GitHub), zero new deps.

   Import-safe: side effects run only when invoked directly.
   Usage:
     node scripts/build-oracle-velocity-public.mjs           # write api/ecosystem-velocity.json
     node scripts/build-oracle-velocity-public.mjs --check   # print summary, no write

   @check-mode dry-run — --check PRINTS the derived summary and exits 0; it
   never compares against the committed feed, and cannot: the source is a moving
   60-day git-log window, so a drift gate here would go red on every new commit
   rather than on a real defect. api/ecosystem-velocity.json is kept current by
   npm run build and by the 4-hourly refresh-live-data cron instead. Recorded as
   an honest coverage gap (S324), not a gate.
     node scripts/build-oracle-velocity-public.mjs --self-test
*/
import { writeFileSync, readFileSync } from 'node:fs';
import { execSync } from './lib/safe-spawn.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'api', 'ecosystem-velocity.json');
const DAYS = 60;

// Build the rolling DAYS-long date axis ending today (UTC), oldest → newest.
export function dateAxis(endDateStr, days = DAYS) {
  const end = new Date(endDateStr + 'T00:00:00Z');
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// Map a { 'YYYY-MM-DD': count } tally onto the date axis → parallel commits[].
export function seriesFrom(dates, tally) {
  return dates.map((d) => tally[d] || 0);
}

export function peakOf(dates, commits) {
  let peakCommitDay = null, peakCommitCount = 0;
  for (let i = 0; i < dates.length; i++) {
    if (commits[i] > peakCommitCount) { peakCommitCount = commits[i]; peakCommitDay = dates[i]; }
  }
  return { peakCommitDay, peakCommitCount };
}

function gitDailyTally(generatedAt) {
  // commit dates (author date, UTC day) within the window
  const since = new Date(new Date(generatedAt + 'T00:00:00Z').getTime() - (DAYS - 1) * 86400000)
    .toISOString().slice(0, 10);
  let lines = '';
  try {
    lines = execSync(`git log --since=${since} --date=short --pretty=format:%ad`, { cwd: ROOT, encoding: 'utf8' });
  } catch { lines = ''; }
  const tally = {};
  lines.split('\n').filter(Boolean).forEach((d) => { tally[d] = (tally[d] || 0) + 1; });
  return tally;
}

export function build(generatedAt) {
  const dates = dateAxis(generatedAt);
  const tally = gitDailyTally(generatedAt);
  const commits = seriesFrom(dates, tally);
  const ecosystem = peakOf(dates, commits);
  return {
    schemaVersion: '1.0',
    generatedAt,
    source: 'git-log',
    windowDays: DAYS,
    note: 'Public-safe daily commit velocity (commit counts only — no internal data). Mirror of the local /ignis/output feed so Oracle panels render on prod.',
    series: { dates, commits },
    ecosystem,
    totalCommits: commits.reduce((a, b) => a + b, 0),
  };
}

function todayUTC() {
  // generatedAt must be deterministic-friendly; derive from latest commit date.
  try {
    return execSync('git log -1 --date=short --pretty=format:%ad', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch { return '2026-01-01'; }
}

function run({ check } = {}) {
  const feed = build(todayUTC());
  if (check) {
    console.log(`build-oracle-velocity-public --check: ${feed.series.dates.length}-day window · ${feed.totalCommits} commits · peak ${feed.ecosystem.peakCommitCount} on ${feed.ecosystem.peakCommitDay}`);
    return;
  }
  writeFileSync(OUT, JSON.stringify(feed, null, 2) + '\n');
  console.log(`✓ build-oracle-velocity-public: api/ecosystem-velocity.json (${feed.series.dates.length} days · ${feed.totalCommits} commits)`);
}

function selfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };
  const dates = dateAxis('2026-06-15');
  assert(dates.length === 60, '60-day axis');
  assert(dates[59] === '2026-06-15', 'axis ends today');
  assert(dates[0] === '2026-04-17', 'axis starts 59 days back');
  const commits = seriesFrom(dates, { '2026-06-15': 5, '2026-06-14': 9, '2026-01-01': 99 });
  assert(commits[59] === 5 && commits[58] === 9, 'tally maps onto axis by date');
  assert(commits.reduce((a, b) => a + b, 0) === 14, 'out-of-window dates excluded');
  const peak = peakOf(dates, commits);
  assert(peak.peakCommitDay === '2026-06-14' && peak.peakCommitCount === 9, 'peak detected');
  const feed = build('2026-06-15');
  assert(feed.series.dates.length === feed.series.commits.length, 'series arrays aligned');
  assert(feed.schemaVersion && feed.series && feed.ecosystem, 'shape matches consumer expectations');
  if (fail === 0) { console.log('✓ build-oracle-velocity-public --self-test: 8/8 passed'); process.exit(0); }
  console.error(`✗ build-oracle-velocity-public --self-test: ${fail} failed`); process.exit(1);
}

const RUN_DIRECT = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('build-oracle-velocity-public.mjs');
if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else run({ check: process.argv.includes('--check') });
}
