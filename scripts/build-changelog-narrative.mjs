#!/usr/bin/env node
/* build-changelog-narrative.mjs — S205 #18 · re-sourced S359
   Builds the public plain-English changelog feeds from data/consumer-changelog.json:
     api/changelog-narrative.json — one entry per founder-approved changelog entry,
                                    plus a byWeek index (returning-visitor surfaces,
                                    IGNIS topic chips, subscriber notifications)
     api/recent-ships.json        — the compact projection the homepage hero reads

   S359 — why this no longer reads git. It used to turn api/commit-map.json into
   "SOUL-voice" sentences with a verb map and a jargon strip. The feed it produced
   held lines like "Refined record the three board items worked." and "Shipped
   rebind the mobile proof without re-running the 215-cell audit." — commit
   subjects with a verb glued on. S358 moved the hero ticker and the "You asked"
   box off it; this finishes the job for every remaining consumer, including the
   web-push notifier, which would have sent that exact sentence to subscribers.
   The consumer changelog is reader prose by construction (founder-approved,
   dev-voice rejected at publish time by publish-changelog-draft), so no filter
   has to guess what a reader can read.

   Usage:
     node scripts/build-changelog-narrative.mjs
     node scripts/build-changelog-narrative.mjs --check
     node scripts/build-changelog-narrative.mjs --self-test
*/
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'api', 'changelog-narrative.json');
const RECENT_SHIPS_OUT = join(ROOT, 'api', 'recent-ships.json');
const CONSUMER_CHANGELOG = join(ROOT, 'data', 'consumer-changelog.json');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');
const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('build-changelog-narrative.mjs');

function isoWeek(ts) {
  try {
    var d = new Date(ts);
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return 'W' + String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0') + '-' + d.getUTCFullYear();
  } catch (_) { return 'unknown'; }
}

/** Published entries only: a dated, titled entry, newest first. */
function publishedEntries(changelog) {
  return ((changelog && changelog.entries) || [])
    .filter(function (e) { return e && typeof e.title === 'string' && e.title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')); })
    .slice()
    .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
}

/**
 * A stable identity for an entry that does not depend on git. The notifier keys
 * its "already sent" sentinel on this, so a republished entry with the same date
 * and title is never sent twice, and an edited title is a new notification.
 */
export function entryId(entry) {
  return createHash('sha256').update(entry.date + '|' + entry.title.trim()).digest('hex').slice(0, 12);
}

/**
 * Pure. Field names are the ones every consumer already reads: `sentence` + `ts`
 * (returning-signal strip, notifier), `title` + `date` (IGNIS topic chips).
 * Highlights ride along so a consumer can show more than the headline.
 */
export function narrativeFromChangelog(changelog) {
  const entries = publishedEntries(changelog).map(function (e) {
    return {
      id: entryId(e),
      date: e.date,
      ts: e.date,
      title: e.title.trim(),
      sentence: e.title.trim(),
      highlights: Array.isArray(e.highlights) ? e.highlights.slice(0, 7) : [],
      badge: '⚡',
      tone: 'shipped',
    };
  });
  const byWeek = {};
  entries.forEach(function (e) {
    var wk = isoWeek(e.ts);
    if (!byWeek[wk]) byWeek[wk] = [];
    byWeek[wk].push(e);
  });
  return {
    schemaVersion: '2.0',
    generatedAt: String((changelog && changelog.updated) || ''),
    generatedBy: 'scripts/build-changelog-narrative.mjs',
    source: 'data/consumer-changelog.json',
    totalEntries: entries.length,
    entries,
    byWeek,
  };
}

/**
 * S358 — the homepage hero ticker reads the READER changelog, never git.
 * No scope chip: an entry's title carries its own subject.
 */
export function recentShipsFor(changelog) {
  return {
    schemaVersion: '1.0',
    generatedAt: String((changelog && changelog.updated) || ''),
    generatedBy: 'scripts/build-changelog-narrative.mjs',
    source: 'data/consumer-changelog.json',
    ships: publishedEntries(changelog).slice(0, 12).map(function (entry) {
      return { date: entry.date, title: entry.title.trim() };
    }),
  };
}

function selfTest() {
  var fixture = { updated: '2026-09-17', entries: [
    { date: '2026-07-16', title: 'Older entry', highlights: ['a'] },
    { date: '2026-09-17', title: 'The Desk: real art', highlights: ['b', 'c'] },
    { date: 'soon', title: 'Undated' },
    { date: '2026-09-10', title: '   ' },
  ] };
  var n = narrativeFromChangelog(fixture);
  var ships = recentShipsFor(fixture);
  var cases = [
    ['newest reader entry leads the narrative', n.entries[0].title === 'The Desk: real art' && n.entries[0].ts === '2026-09-17'],
    ['undated and untitled entries never publish', n.totalEntries === 2 && ships.ships.length === 2],
    ['consumer field names are all present', ['sentence', 'ts', 'title', 'date', 'id'].every(function (k) { return k in n.entries[0]; })],
    ['no commit fields survive (sha, scope)', n.entries.every(function (e) { return !('sha' in e) && !('scope' in e); })],
    ['the sentence IS the approved title — nothing composed', n.entries[0].sentence === 'The Desk: real art'],
    ['entry ids are stable', entryId({ date: '2026-09-17', title: 'The Desk: real art' }) === n.entries[0].id],
    ['an edited title is a new id', entryId({ date: '2026-09-17', title: 'The Desk: real art!' }) !== n.entries[0].id],
    ['byWeek indexes every entry', Object.values(n.byWeek).reduce(function (s, a) { return s + a.length; }, 0) === 2],
    ['the narrative names its source', n.source === 'data/consumer-changelog.json'],
    ['newest reader entry leads the hero', ships.ships[0].title === 'The Desk: real art' && ships.ships[0].date === '2026-09-17'],
    ['no commit fields reach the hero', ships.ships.every(function (x) { return !('sha' in x) && !('scope' in x); })],
    ['an empty changelog is honest-dark, not an error', narrativeFromChangelog(null).totalEntries === 0 && recentShipsFor(null).ships.length === 0],
  ];
  var failed = cases.filter(function (c) { return !c[1]; });
  cases.forEach(function (c) { console.log('  ' + (c[1] ? 'ok' : 'FAIL') + ' ' + c[0]); });
  console.log('build-changelog-narrative self-test: ' + (cases.length - failed.length) + '/' + cases.length + ' passed');
  process.exit(failed.length ? 1 : 0);
}

if (SELF_TEST) { selfTest(); }

if (!SELF_TEST && RUN_DIRECT) {
  let consumerChangelog = { entries: [] };
  try { consumerChangelog = JSON.parse(readFileSync(CONSUMER_CHANGELOG, 'utf8')); } catch { /* absent → honest-dark */ }
  const result = narrativeFromChangelog(consumerChangelog);
  const recentShips = recentShipsFor(consumerChangelog);

  if (CHECK) {
    // Full content comparison. The pre-S359 check compared only entry COUNTS, so
    // any same-length change (an edited title) passed as "no drift".
    const drift = [];
    for (const [file, expected] of [[OUT, result], [RECENT_SHIPS_OUT, recentShips]]) {
      if (!existsSync(file)) { drift.push(file.replace(ROOT, '').replace(/\\/g, '/') + ' missing'); continue; }
      if (readFileSync(file, 'utf8') !== JSON.stringify(expected, null, 2) + '\n') drift.push(file.replace(ROOT, '').replace(/\\/g, '/') + ' drifted');
    }
    if (drift.length) {
      console.error('build-changelog-narrative --check: ' + drift.join('; ') + ' — run node scripts/build-changelog-narrative.mjs');
      process.exit(1);
    }
    console.log('build-changelog-narrative --check: ok (' + result.totalEntries + ' narratives)');
  } else {
    writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
    writeFileSync(RECENT_SHIPS_OUT, JSON.stringify(recentShips, null, 2) + '\n');
    console.log('build-changelog-narrative → api/changelog-narrative.json + api/recent-ships.json (' + result.totalEntries + ' entries)');
  }
}
