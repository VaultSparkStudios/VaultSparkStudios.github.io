#!/usr/bin/env node
// check-content-freshness.mjs — advisory gate: is the human-VOICE content stale?
//
// The site auto-publishes machine feeds (forge-ledger, dispatches) on every
// closeout, but the CURATED surfaces (journal essays, changelog) drift silently.
// S187 found journal frozen ~11 weeks and changelog ~8. This makes "the studio's
// voice went quiet" a CI signal instead of a thing a visitor notices first.
//
// WARN-ONLY for short drifts (a stale devlog must never block a routine deploy),
// but a surface may declare a HARD `blockDays` ceiling beyond which it BLOCKS the
// build even without --strict. S230: the public /changelog/ went 75 days stale on
// a SPARKED site — a real trust failure no warn-only signal ever stopped. The
// changelog now blocks at 60d so that class can never silently recur; the journal
// stays advisory. Pair with scripts/draft-changelog-entry.mjs to clear it.
//
//   node scripts/check-content-freshness.mjs            # warn-only + hard blockDays (build:check)
//   node scripts/check-content-freshness.mjs --strict   # exit 1 on ANY stale surface
//   node scripts/check-content-freshness.mjs --self-test
//
// Per DECISIONS (S178): exports pure; side effects gate on RUN_DIRECT.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const EDITORIAL_RECEIPT = 'api/forge-editorial-freshness.json';

const SURFACES = [
  { name: 'journal', dir: 'journal', maxDays: 30 },
  // blockDays: a months-stale public changelog is a SPARKED trust failure → hard fail.
  { name: 'changelog', dir: 'changelog', maxDays: 30, blockDays: 60 },
];
const DATE_RE = /20\d\d-[01]\d-[0-3]\d/g;

// Pure: newest YYYY-MM-DD found in any *.html under dir (recursive, shallow ok).
export function newestDateIn(dir, readDir = readdirSync, readFile = readFileSync) {
  let newest = null;
  const visit = (d) => {
    let entries;
    try { entries = readDir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
      const full = join(d, e.name);
      if (e.isDirectory()) visit(full);
      else if (e.name.endsWith('.html')) {
        let txt; try { txt = readFile(full, 'utf8'); } catch { continue; }
        const m = txt.match(DATE_RE);
        if (m) for (const ds of m) { if (!newest || ds > newest) newest = ds; }
      }
    }
  };
  visit(dir);
  return newest;
}

// Pure: classify one surface given its newest date + a reference "now".
// `blocked` is true only when the surface declares a blockDays ceiling and the
// age exceeds it — a hard failure independent of --strict.
export function classify(newest, nowMs, maxDays, blockDays = null) {
  if (!newest) return { status: 'unknown', ageDays: null, blocked: false };
  const ageDays = Math.floor((nowMs - new Date(newest + 'T00:00:00Z').getTime()) / 86400000);
  const blocked = blockDays != null && ageDays > blockDays;
  return { status: ageDays > maxDays ? 'stale' : 'fresh', ageDays, blocked };
}

export function runFreshness({ nowMs, root = '.' } = {}) {
  const results = [];
  for (const s of SURFACES) {
    const dir = join(root, s.dir);
    if (!existsSync(dir)) { results.push({ ...s, status: 'missing', ageDays: null, newest: null }); continue; }
    const newest = newestDateIn(dir);
    results.push({ ...s, newest, ...classify(newest, nowMs, s.maxDays, s.blockDays ?? null) });
  }
  return results;
}

// S335: the community "Upcoming Events" cards carried "April 2026", "May 2026"
// and "Q3 2026" labels four months after those windows closed. A dated event
// card is a public promise with an expiry; once the month/quarter is over the
// card is stale by construction. This is narrow on purpose — it only reads
// [data-event] cards on community/index.html, and only labels shaped like
// "<Month> <year>" or "Q<n> <year>". Undated cadence cards ("Every week") and
// explicit day ranges are left alone.
const EVENT_SURFACE = 'community/index.html';
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const EVENT_LABEL_RE = /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d\d|Q[1-4]\s+20\d\d)\b/g;

// Pure: return the month/quarter labels on [data-event] cards that are strictly
// in the past at nowMs. A label is past once its month (or the quarter's last
// month) has fully elapsed in UTC.
export function staleEventLabels(html, nowMs) {
  const stale = [];
  const cardRe = /<[^>]*\bdata-event="([^"]+)"[^>]*>([\s\S]*?)(?=<[^>]*\bdata-event="|<!--|$)/g;
  let card;
  while ((card = cardRe.exec(String(html || ''))) !== null) {
    const body = card[2];
    let m;
    EVENT_LABEL_RE.lastIndex = 0;
    while ((m = EVENT_LABEL_RE.exec(body)) !== null) {
      const label = m[1];
      const year = Number(label.slice(-4));
      let endMonth; // 1-based month whose END marks expiry
      const q = /^Q([1-4])/.exec(label);
      if (q) endMonth = Number(q[1]) * 3;
      else endMonth = MONTHS.indexOf(label.split(/\s+/)[0].toLowerCase()) + 1;
      if (!endMonth) continue;
      const expiresMs = Date.UTC(year, endMonth, 1); // first instant AFTER the window
      if (nowMs >= expiresMs && !stale.some((s) => s.label === label && s.event === card[1])) {
        stale.push({ event: card[1], label });
      }
    }
  }
  return stale;
}

export function readEditorialReceipt(root = '.') {
  try {
    const receipt = JSON.parse(readFileSync(join(root, EDITORIAL_RECEIPT), 'utf8'));
    return { state: receipt.state, latest: receipt.latest || null, publishable: receipt.publishable === true, nextAction: receipt.nextAction || null };
  } catch {
    return { state: 'missing', latest: null, publishable: false, nextAction: 'Run node scripts/manage-forge-editorial.mjs --draft' };
  }
}

function selfTest() {
  let pass = 0, fail = 0;
  const check = (n, c) => { c ? pass++ : (fail++, console.log('  ✗ ' + n)); };
  const now = new Date('2026-06-11T00:00:00Z').getTime();
  check('stale when old', classify('2026-03-22', now, 30).status === 'stale');
  check('fresh when recent', classify('2026-06-05', now, 30).status === 'fresh');
  check('unknown when null', classify(null, now, 30).status === 'unknown');
  check('age computed', classify('2026-06-01', now, 30).ageDays === 10);
  check('blocked when past blockDays', classify('2026-03-22', now, 30, 60).blocked === true);
  check('not blocked within blockDays', classify('2026-05-09', now, 30, 60).blocked === false);
  check('no blockDays → never blocked', classify('2024-01-01', now, 30).blocked === false);
  // newestDateIn against fake fs
  const fakeDirs = { 'j': [{ name: 'a', isDirectory: () => false, }, { name: 'b.html', isDirectory: () => false }] };
  const fakeRead = (d) => (d === 'j' ? fakeDirs.j : []);
  const fakeFile = () => 'posted 2026-04-01 and 2026-05-09 here';
  check('newest picks latest date', newestDateIn('j', fakeRead, fakeFile) === '2026-05-09');
  check('missing editorial receipt is honest', readEditorialReceipt('__missing__').state === 'missing');
  // staleEventLabels — dated event cards
  const sep2026 = new Date('2026-09-01T00:00:00Z').getTime();
  const cards = '<div data-event="a"><div>April 2026</div><button data-event="a">RSVP</button></div>'
    + '<div data-event="b"><div>Q3 2026</div></div>'
    + '<div data-event="c"><div>Sep 2 – Oct 14, 2026</div></div>'
    + '<div data-event="d"><div>Every week</div></div>'
    + '<div data-event="e"><div>Q4 2026</div></div>';
  const stale = staleEventLabels(cards, sep2026);
  check('past month label is stale', stale.some((s) => s.event === 'a' && s.label === 'April 2026'));
  check('past-month label reported once per card', stale.filter((s) => s.event === 'a').length === 1);
  check('current quarter is not stale until it ends', !stale.some((s) => s.event === 'b'));
  check('future quarter is not stale', !stale.some((s) => s.event === 'e'));
  check('undated cadence + day-range cards ignored', !stale.some((s) => s.event === 'c' || s.event === 'd'));
  check('quarter goes stale the instant it ends', staleEventLabels(cards, Date.UTC(2026, 9, 1)).some((s) => s.event === 'b'));
  check('no cards → empty', staleEventLabels('<p>nothing</p>', sep2026).length === 0);
  console.log(`check-content-freshness self-test: ${pass}/${pass + fail} passing`);
  return fail === 0;
}

const RUN_DIRECT = (import.meta.main ?? (process.argv[1] && process.argv[1].endsWith('check-content-freshness.mjs')));

if (RUN_DIRECT) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const ni = argv.indexOf('--now');
  const nowMs = ni >= 0 ? new Date(argv[ni + 1]).getTime() : Date.now();
  const strict = argv.includes('--strict');

  const results = runFreshness({ nowMs });
  const editorial = readEditorialReceipt();
  let anyStale = false, anyBlocked = false;
  for (const r of results) {
    const icon = r.blocked ? '⛔' : r.status === 'stale' ? '⚠' : r.status === 'fresh' ? '✓' : '∅';
    const age = r.ageDays == null ? 'no dated entry' : `${r.ageDays}d old (newest ${r.newest})`;
    console.log(`${icon}  ${r.name.padEnd(10)} ${r.status.padEnd(8)} ${age}`);
    if (r.blocked) {
      anyBlocked = true;
      console.log(`     ⛔ BLOCKING — public ${r.name} exceeds its ${r.blockDays}d trust ceiling on a SPARKED site.`);
      console.log(`        Run: node scripts/draft-changelog-entry.mjs → review the paste-ready HTML → publish to ${r.dir}/index.html.`);
    } else if (r.status === 'stale') {
      anyStale = true;
      console.log(`     → curated voice is stale. Run: node scripts/draft-weekly-forge.mjs, then review + publish.`);
    }
  }
  const editorialIcon = editorial.state === 'fresh' ? '✓' : editorial.publishable ? '◐' : '⚠';
  console.log(`${editorialIcon}  forge-edit ${editorial.state}${editorial.latest ? ` · ${editorial.latest.id} (${editorial.latest.status})` : ''}`);
  if (editorial.nextAction) console.log(`     → ${editorial.nextAction}`);

  // Dated event cards on /community/ — a past month/quarter label is a public
  // promise that already expired. Hard fail (no --strict needed): the fix is
  // to replace or undate the card, which is a one-line edit.
  let eventHtml = null;
  try { eventHtml = readFileSync(EVENT_SURFACE, 'utf8'); } catch { /* surface absent → nothing to judge */ }
  const staleEvents = eventHtml ? staleEventLabels(eventHtml, nowMs) : [];
  if (staleEvents.length) {
    anyBlocked = true;
    console.log(`⛔  events     stale    ${staleEvents.length} dated card${staleEvents.length === 1 ? '' : 's'} already in the past on ${EVENT_SURFACE}`);
    for (const s of staleEvents) console.log(`     ⛔ [data-event="${s.event}"] labelled "${s.label}"`);
    console.log('        → replace the card with a current window, or drop the month/quarter label for an undated cadence card.');
  } else {
    console.log(`✓  events     fresh    no past-dated [data-event] cards on ${EVENT_SURFACE}`);
  }
  if (anyBlocked) process.exit(1);          // hard ceiling — blocks regardless of --strict
  if (anyStale && strict) process.exit(1);
  process.exit(0); // warn-only by default
}
