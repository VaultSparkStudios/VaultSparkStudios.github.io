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
     node scripts/build-oracle-velocity-public.mjs --check   # verify closed-day history

   The newest UTC day is intentionally mutable. Every older day is closed and
   must remain byte-for-byte stable across overlapping rolling windows. The
   committed feed carries a hash-bound closed-day proof so --check can tolerate
   today's new commits without making historical drift invisible.
     node scripts/build-oracle-velocity-public.mjs --self-test
*/
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

export function closedPairs(feed) {
  const dates = feed?.series?.dates;
  const commits = feed?.series?.commits;
  const openDay = feed?.generatedAt;
  if (!Array.isArray(dates) || !Array.isArray(commits) || dates.length !== commits.length) {
    throw new Error('series dates/commits must be aligned arrays');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(openDay || '')) throw new Error('generatedAt must be a UTC date');
  return dates
    .map((date, index) => [date, commits[index]])
    .filter(([date]) => date < openDay);
}

export function closedFingerprint(pairs) {
  return createHash('sha256').update(JSON.stringify(pairs)).digest('hex');
}

export function attachClosedDayProof(feed) {
  const pairs = closedPairs(feed);
  return {
    ...feed,
    closedDayProof: {
      schemaVersion: '1.0',
      openDay: feed.generatedAt,
      closedThrough: pairs.at(-1)?.[0] || null,
      closedDays: pairs.length,
      sha256: closedFingerprint(pairs),
    },
  };
}

function verifyEmbeddedProof(feed) {
  const proof = feed?.closedDayProof;
  const pairs = closedPairs(feed);
  if (!proof || proof.schemaVersion !== '1.0') throw new Error('committed closed-day proof is missing');
  if (proof.openDay !== feed.generatedAt) throw new Error('committed closed-day proof openDay mismatch');
  if (proof.closedThrough !== (pairs.at(-1)?.[0] || null)) throw new Error('committed closed-day proof boundary mismatch');
  if (proof.closedDays !== pairs.length) throw new Error('committed closed-day proof count mismatch');
  if (!/^[a-f0-9]{64}$/.test(proof.sha256 || '') || proof.sha256 !== closedFingerprint(pairs)) {
    throw new Error('committed closed-day proof hash mismatch');
  }
  return pairs;
}

export function compareClosedDays(committed, current) {
  const committedPairs = verifyEmbeddedProof(committed);
  const currentPairs = closedPairs(current);
  const currentByDate = new Map(currentPairs);
  const overlap = committedPairs.filter(([date]) => currentByDate.has(date));
  if (!overlap.length) throw new Error('closed-day windows have no overlap');
  const drift = overlap.filter(([date, count]) => currentByDate.get(date) !== count);
  if (drift.length) {
    const sample = drift.slice(0, 3).map(([date, count]) => `${date}: committed ${count}, current ${currentByDate.get(date)}`).join('; ');
    throw new Error(`closed-day history drifted (${drift.length} day(s)): ${sample}`);
  }
  return {
    overlapDays: overlap.length,
    closedThrough: overlap.at(-1)[0],
    currentOpenDay: current.generatedAt,
  };
}

export function tallyCommitDays(lines) {
  const tally = {};
  lines.split('\n').filter(Boolean).forEach((stamp) => {
    const instant = new Date(stamp);
    if (Number.isNaN(instant.getTime())) return;
    const day = instant.toISOString().slice(0, 10);
    tally[day] = (tally[day] || 0) + 1;
  });
  return tally;
}

function gitDailyTally() {
  // Count committer instants and normalize them to UTC. Do not pass a date-only
  // --since value: Git interprets that boundary using the current time of day,
  // so the oldest closed day can lose commits while a verification run is in
  // progress. The public repository is small enough to read the full log, and
  // seriesFrom() bounds the published window deterministically.
  let lines = '';
  try {
    lines = execSync('git log --pretty=format:%cI', { cwd: ROOT, encoding: 'utf8' });
  } catch { lines = ''; }
  return tallyCommitDays(lines);
}

export function build(generatedAt) {
  const dates = dateAxis(generatedAt);
  const tally = gitDailyTally();
  const commits = seriesFrom(dates, tally);
  const ecosystem = peakOf(dates, commits);
  return attachClosedDayProof({
    schemaVersion: '1.1',
    generatedAt,
    source: 'git-log',
    windowDays: DAYS,
    note: 'Public-safe daily commit velocity (commit counts only — no internal data). Mirror of the local /ignis/output feed so Oracle panels render on prod.',
    series: { dates, commits },
    ecosystem,
    totalCommits: commits.reduce((a, b) => a + b, 0),
  });
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
    let committed;
    try {
      committed = JSON.parse(readFileSync(OUT, 'utf8'));
    } catch (error) {
      throw new Error(`cannot read committed velocity feed: ${error.message}`);
    }
    const comparison = compareClosedDays(committed, feed);
    console.log(`build-oracle-velocity-public --check: ${comparison.overlapDays} closed day(s) stable through ${comparison.closedThrough} · open day ${comparison.currentOpenDay} allowed to move`);
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
  const normalized = tallyCommitDays('2026-06-22T23:30:00-04:00\n2026-06-23T03:30:00Z\ninvalid');
  assert(normalized['2026-06-23'] === 2 && !normalized['2026-06-22'], 'committer instants normalize to stable UTC days');
  const peak = peakOf(dates, commits);
  assert(peak.peakCommitDay === '2026-06-14' && peak.peakCommitCount === 9, 'peak detected');
  const feed = build('2026-06-15');
  assert(feed.series.dates.length === feed.series.commits.length, 'series arrays aligned');
  assert(feed.schemaVersion && feed.series && feed.ecosystem, 'shape matches consumer expectations');
  assert(/^[a-f0-9]{64}$/.test(feed.closedDayProof.sha256), 'closed-day fingerprint is sha256');
  const fixture = (generatedAt, dates, values) => attachClosedDayProof({
    schemaVersion: '1.1', generatedAt, series: { dates, commits: values },
  });
  const committed = fixture('2026-06-15', ['2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15'], [1, 2, 3, 4]);
  const openEdge = fixture('2026-06-15', ['2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15'], [1, 2, 3, 99]);
  assert(compareClosedDays(committed, openEdge).overlapDays === 3, 'open-day mutation is tolerated');
  const shifted = fixture('2026-06-16', ['2026-06-13', '2026-06-14', '2026-06-15', '2026-06-16'], [2, 3, 8, 1]);
  assert(compareClosedDays(committed, shifted).overlapDays === 2, 'shifted windows compare stable overlap only');
  let driftCaught = false;
  try { compareClosedDays(committed, fixture('2026-06-15', committed.series.dates, [1, 7, 3, 4])); } catch (error) { driftCaught = error.message.includes('drifted'); }
  assert(driftCaught, 'closed-day mutation fails');
  let malformedCaught = false;
  try { compareClosedDays({ ...committed, closedDayProof: { ...committed.closedDayProof, sha256: 'bad' } }, openEdge); } catch (error) { malformedCaught = error.message.includes('hash mismatch'); }
  assert(malformedCaught, 'malformed committed proof is refused');
  if (fail === 0) { console.log('✓ build-oracle-velocity-public --self-test: 14/14 passed'); process.exit(0); }
  console.error(`✗ build-oracle-velocity-public --self-test: ${fail} failed`); process.exit(1);
}

const RUN_DIRECT = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('build-oracle-velocity-public.mjs');
if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else {
    try {
      run({ check: process.argv.includes('--check') });
    } catch (error) {
      console.error(`✗ build-oracle-velocity-public: ${error.message}`);
      process.exit(1);
    }
  }
}
