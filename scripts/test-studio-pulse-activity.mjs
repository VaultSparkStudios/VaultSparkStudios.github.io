#!/usr/bin/env node
/**
 * test-studio-pulse-activity.mjs — public-truth self-tests for the Studio Pulse
 * surfaces and the shared derivations behind them.
 *
 *  1. scripts/lib/project-activity.mjs (aggregate counters, shared with generate-heartbeat)
 *  2. assets/studio-pulse-live.js pure selection (forge focus + card copy)
 *  3. assets/changelog-reactions.js row mapping onto the live page_feedback schema
 *  4–7. Studio Pulse live look: card copy, feed freshness, timeline view
 *  8. assets/exit-intent.js row mapping onto the live page_feedback schema
 *  9. public-intelligence derivations (registry total)
 *
 * PRIVACY (CANON-028). Sections 2, 4, 6 and 7 are the regression guard for the
 * session-timing removal: no public surface here may publish WHEN work happened
 * ("work session closed <date>", "last touched", "quiet since", session rows in
 * the timeline), nor derive an activity state from a work timestamp.
 *
 * Usage: node scripts/test-studio-pulse-activity.mjs [--self-test]   (exit 1 on any failure)
 */
import { createRequire } from 'node:module';
import { deriveProjectPulse, portfolioTotalFromRegistry } from './lib/project-activity.mjs';

const require = createRequire(import.meta.url);
const pulse = require('../assets/studio-pulse-live.js');
const reactions = require('../assets/changelog-reactions.js');
const exitIntent = require('../assets/exit-intent.js');

const NOW = Date.parse('2026-09-14T12:00:00Z');
const daysAgo = (d) => new Date(NOW - d * 86_400_000).toISOString();
const cases = [];
const check = (name, ok) => cases.push([name, Boolean(ok)]);

// ── 1. shared lib: aggregate counters only ───────────────────────────────────
const solara = { id: 'solara', githubRepo: 'VaultSparkStudios/solara' };
const events = [
  { ts: daysAgo(93), slug: 'solara', type: 'session-closed' },
  { ts: daysAgo(92.8), slug: 'solara', type: 'pulse-blocker-spike' },
  { ts: daysAgo(2), slug: 'vorn', type: 'session-closed' },
  { ts: daysAgo(1), slug: 'solara', type: 'onboard-applied' },
  { ts: 'garbage', slug: 'solara', type: 'session-closed' },
];
const allTypes = deriveProjectPulse(solara, events, { now: NOW });
check('heartbeat mode (all types) counts pulses in window', allTypes.pulses30d === 1 && allTypes.pulses7d === 1 && allTypes.lastActivity === Date.parse(daysAgo(1)));
const filtered = deriveProjectPulse(solara, events, { now: NOW, types: ['onboard-applied'] });
check('type filter restricts the window counters', filtered.pulses30d === 1 && filtered.lastActivityAt === Date.parse(daysAgo(1)));
check('out-of-window events still set lastActivityAt, never the windowed counter',
  deriveProjectPulse(solara, events, { now: NOW, types: ['session-closed'] }).pulses30d === 0);
// The module must expose no public session-name / "now line" / activity-state helper.
const lib = await import('./lib/project-activity.mjs');
check('shared lib exposes no public session-timing derivation',
  typeof lib.derivePublicNow === 'undefined' && typeof lib.publicSessionName === 'undefined'
  && typeof lib.activityStateFor === 'undefined' && typeof lib.WORK_EVENT_TYPES === 'undefined');

// ── 2. Studio Pulse focus selection (clock-free, status-driven) ──────────────
const solaraItem = { id: 'solara', name: 'Solara', type: 'game', status: 'FORGE', progress: 42, note: 'Desert survival world. Systems converging.' };
const exodusItem = { id: 'the-exodus', name: 'The Exodus', type: 'game', status: 'FORGE', progress: 28, note: 'Narrative survival.' };
const vornItem = { id: 'vorn', name: 'Vorn', type: 'platform', status: 'FORGE', progress: 14, note: 'Give your agent a home.' };
const liveItem = { id: 'call-of-doodie', name: 'Call of Doodie', type: 'game', status: 'SPARKED', progress: 95, note: 'Playable now.' };

const selection = pulse.selectCurrentFocus([exodusItem, vornItem, solaraItem, liveItem]);
check('focus is the highest-progress FORGE world', selection.kind === 'forge' && selection.item.id === 'solara');
check('SPARKED item is never the forge focus', selection.item.status === 'FORGE');
const copy = pulse.focusCopy(selection);
check('focus copy names the world with its editorial note, no date, no live claim',
  copy.eyebrow === 'In the forge' && copy.name === 'Solara' && copy.note === solaraItem.note && copy.live === false);
check('focus copy never publishes timing words',
  !/last touched|quiet since|work session|this week|right now/i.test(copy.eyebrow + ' ' + copy.name + ' ' + copy.note));
const emptyCopy = pulse.focusCopy(pulse.selectCurrentFocus([liveItem]));
check('no FORGE world → honest empty state, no world named', emptyCopy.state === 'empty' && !/Solara|Doodie/.test(emptyCopy.name + emptyCopy.note));
check('empty catalog → honest empty state', pulse.focusCopy(pulse.selectCurrentFocus([])).state === 'empty');
// A stale feed that still carries the retired field must change nothing.
check('a leftover lastActivityAt in the feed cannot influence focus or copy',
  pulse.focusCopy(pulse.selectCurrentFocus([{ ...vornItem, lastActivityAt: daysAgo(0.1) }, solaraItem])).name === 'Solara');
check('selection takes no clock argument (nothing to derive recency from)', pulse.selectCurrentFocus.length === 1);

// ── 3. changelog reactions → live page_feedback schema ───────────────────────
const ALLOWED = new Set(['useful', 'ok', 'not_useful']); // supabase-page-feedback.sql CHECK
const rows = ['sparked', 'fire', 'gem'].map(reactions.feedbackRowFor);
check('every widget reaction maps to a CHECK-allowed value with path', rows.every((r) => r && ALLOWED.has(r.reaction) && r.path === '/changelog'));
check('rows carry only live columns (no page_path/question/answer/session_id)', rows.every((r) => Object.keys(r).sort().join(',') === 'path,reaction'));
check('unknown reaction → no row', reactions.feedbackRowFor('nope') === null);

// ── 4. card copy is the editorial note, never a recency line ────────────────
check('FORGE card shows its note', pulse.cardActivityNote(solaraItem) === solaraItem.note);
check('SPARKED card shows its note', pulse.cardActivityNote(liveItem) === 'Playable now.');
check('VAULTED card shows its note', pulse.cardActivityNote({ status: 'VAULTED', note: 'Resting.' }) === 'Resting.');
check('a card with no note makes NO claim rather than an inferred one', pulse.cardActivityNote({ status: 'FORGE' }) === '');
check('card copy ignores any leftover work timestamp',
  pulse.cardActivityNote({ ...solaraItem, lastActivityAt: daysAgo(93), activity: 'dormant' }) === solaraItem.note);
check('no card copy path can emit session-timing words', ['FORGE', 'SPARKED', 'VAULTED'].every((status) => (
  !/last touched|quiet since|no recent work sessions|last updated/i.test(
    pulse.cardActivityNote({ status: status, note: '', lastActivityAt: daysAgo(93) }) || ''
  )
)));

// ── 5. relative time + per-feed freshness ────────────────────────────────────
const minsAgo = (m) => new Date(NOW - m * 60_000).toISOString();
check('relativeTime thresholds', pulse.relativeTime(minsAgo(0.5), NOW) === 'just now' && pulse.relativeTime(minsAgo(7), NOW) === '7 min ago'
  && pulse.relativeTime(minsAgo(185), NOW) === '3 h ago' && pulse.relativeTime(daysAgo(3), NOW) === '3 d ago' && pulse.relativeTime(daysAgo(30), NOW) === 'Aug 15'
  && pulse.relativeTime('nope', NOW) === '');
check('relativeDay never claims hour precision', pulse.relativeDay('2026-09-14', NOW) === 'today' && pulse.relativeDay('2026-09-13', NOW) === 'yesterday' && pulse.relativeDay('2026-09-11', NOW) === '3 days ago');
const feed = (id) => pulse.FEEDS.find((f) => f.id === id);
check('fresh 4-hourly feed', pulse.feedFreshness(feed('intel'), minsAgo(130), NOW).state === 'fresh' && pulse.feedFreshness(feed('intel'), minsAgo(130), NOW).text === 'Portfolio feed · updated 2 h ago');
check('4-hourly feed 9h old is flagged behind schedule', pulse.feedFreshness(feed('intel'), minsAgo(540), NOW).state === 'stale' && /behind schedule/.test(pulse.feedFreshness(feed('intel'), minsAgo(540), NOW).text));
check('day-precision ledger dated today is fresh', pulse.feedFreshness(feed('ledger'), '2026-09-14', NOW).text === 'Forge ledger · updated today' && pulse.feedFreshness(feed('ledger'), '2026-09-14', NOW).state === 'fresh');
check('no-cadence feeds show age but are never "stale"', pulse.feedFreshness(feed('timeline'), daysAgo(4), NOW).state === 'fresh');
check('pending / failed / undated feeds are labelled honestly', pulse.feedFreshness(feed('digest'), undefined, NOW).state === 'pending'
  && pulse.feedFreshness(feed('digest'), false, NOW).text === 'Signal digest · unavailable' && pulse.feedFreshness(feed('digest'), null, NOW).state === 'unknown');

// ── 6. founder presence + work timing: deliberately absent ──────────────────
// The Studio Pulse client must expose no presence reader and no work-recency
// derivation. Both are activity patterns about a private individual (CANON-028).
check('studio-pulse-live exposes no presence copy helper', typeof pulse.presenceCopy === 'undefined');
check('studio-pulse-live declares no presence feed', !pulse.FEEDS.some((f) => f.id === 'presence'));
check('studio-pulse-live exposes no activity-state derivation', typeof pulse.activityStateOf === 'undefined');

// ── 7. timeline view (client re-filter drops session rows) ──────────────────
const tl = {
  windowDays: 7,
  sources: [{ id: 'github', label: 'Public GitHub commits', state: 'unavailable', reason: 'rate-limited' }, { id: 'desk', label: 'The Desk editions', state: 'partial', reason: 'http-500' }],
  items: [
    { id: 'c1', kind: 'commit', at: daysAgo(0.1), precision: 'minute', project: 'Vorn', title: 'agent homes', url: null },
    { id: 'e1', kind: 'edition', at: '2026-09-12T00:00:00.000Z', precision: 'day', project: 'The Desk', title: 'Headline', url: '/news/x/' },
    { id: 'old', kind: 'commit', at: daysAgo(12), precision: 'minute', project: 'Vorn', title: 'aged out', url: null },
    { id: 'anon', kind: 'commit', at: daysAgo(1), precision: 'minute', project: null, title: 'nameless', url: null },
  ],
};
const view = pulse.timelineGroups(tl, NOW);
check('timeline drops rows older than the window (viewer clock) and nameless rows', view.count === 2 && !view.groups.some((g) => g.items.some((i) => i.id === 'old' || i.id === 'anon')));
check('timeline groups newest day first', view.groups.length === 2 && view.groups[0].items[0].id === 'c1');
check('timeline summary counts moves + projects', pulse.timelineSummary(tl, view) === '2 moves across 2 projects in the last 7 days.');
check('empty timeline summary is honest', pulse.timelineSummary({ windowDays: 7 }, pulse.timelineGroups({ items: [] }, NOW)) === 'No public studio activity in the last 7 days.');
// A feed published before this change still carries session rows; the client
// must refuse to render them rather than wait for the next rebuild.
const stale = pulse.timelineGroups({
  windowDays: 7,
  items: [
    { id: 'session:website:1', kind: 'session', at: daysAgo(0.2), precision: 'minute', project: 'Studio Website', title: 'Session 356 closed', url: '/changelog/' },
    { id: 's2', kind: 'commit', at: daysAgo(0.3), precision: 'minute', project: 'Studio Website', title: 'Work session closed', url: null },
    { id: 'c2', kind: 'commit', at: daysAgo(0.4), precision: 'minute', project: 'Vorn', title: 'real work', url: null },
  ],
}, NOW);
check('a stale published feed cannot render session rows or session-titled rows',
  stale.count === 1 && stale.groups[0].items[0].id === 'c2');
check('timeline labels declare no session kind', !Object.prototype.hasOwnProperty.call(pulse.KIND_LABEL || {}, 'session'));
const notes = pulse.sourceNotes(tl);
check('dark sources are named with a plain reason', notes.length === 2 && notes[0].text === 'Public GitHub commits unavailable (rate limited)' && notes[1].text === 'The Desk editions partially available (service error)');
check('day-precision items label by day', pulse.itemTimeLabel(tl.items[1], NOW) === '2 days ago');
check('poll backoff doubles and caps', pulse.nextDelay(90_000, 0) === 90_000 && pulse.nextDelay(90_000, 2) === 360_000 && pulse.nextDelay(300_000, 9) === 900_000);

// ── 8. exit-intent → live page_feedback schema ───────────────────────────────
const exitRows = ['yes', 'not_sure', 'no'].map((a) => exitIntent.feedbackRowFor(a, '/studio-pulse/'));
check('exit-intent answers map onto CHECK-allowed reactions', exitRows.map((r) => r.reaction).join(',') === 'useful,ok,not_useful' && exitRows.every((r) => ALLOWED.has(r.reaction)));
check('exit-intent rows carry only live columns with rate-page path key', exitRows.every((r) => Object.keys(r).sort().join(',') === 'path,reaction' && r.path === '/studio-pulse') && exitIntent.feedbackRowFor('yes', '/').path === '/');
check('unknown exit-intent answer → no row', exitIntent.feedbackRowFor('maybe', '/x/') === null);

// ── 9. public-intelligence derivations (lib) ─────────────────────────────────
check('portfolio total derives from registry entries with ids', portfolioTotalFromRegistry([{ id: 'a' }, { id: 'b' }, null, { name: 'no id' }]) === 2 && portfolioTotalFromRegistry(undefined) === 0);

let failed = 0;
for (const [name, ok] of cases) {
  console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}
console.log(`test-studio-pulse-activity: ${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
