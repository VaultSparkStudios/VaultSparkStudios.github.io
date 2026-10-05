/**
 * news-publish-time.mjs — the one place a Desk story's publish time is decided.
 *
 * Founder request (2026-10-05): every story card and article shows the real
 * publish date AND time, with a machine-readable <time datetime>. The day
 * artifact has no `publishedAt`, so the time is RESOLVED from the best recorded
 * evidence, strongest first, and every rendering says which source it used:
 *
 *   1. `story.publishedAt`               an explicit publish stamp, if a future
 *                                        pipeline writes one            → 'published'
 *   2. data/news-desk/publish-times.json the commit that first put the story into
 *                                        its day artifact on main (git history,
 *                                        captured once into a committed ledger so
 *                                        rendering never depends on clone depth)
 *                                                                        → 'commit'
 *   3. `story.authoredBy.at`             the scheduled publisher's authoring stamp.
 *                                        Measured against git for all 82 cron
 *                                        stories on record: the publish commit
 *                                        lands 7–37 s later        → 'authored'
 *   4. the edition slot in EDITIONS      scheduled time only, labelled as such
 *                                                                        → 'slot'
 *   5. the day itself                    date only, no time is claimed  → 'date'
 *
 * Display is US Eastern ("ET") because that is the founder-chosen reader clock;
 * the ISO value in datetime= is always UTC so machines get the exact instant.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDITIONS } from './news-desk.mjs';

export const PUBLISH_TIME_LEDGER = 'data/news-desk/publish-times.json';
export const DESK_TIME_ZONE = 'America/New_York';
export const DESK_TIME_ZONE_LABEL = 'ET';

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function loadPublishTimeLedger(root) {
  const file = join(root, PUBLISH_TIME_LEDGER);
  if (!existsSync(file)) return { entries: {} };
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return { ...parsed, entries: parsed.entries || {} };
}

const validIso = (value) => typeof value === 'string' && ISO_RE.test(value) && Number.isFinite(Date.parse(value));
/** Second-precision UTC ISO, so equal instants always render byte-identically. */
const canonicalIso = (value) => new Date(Date.parse(value)).toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * Resolve one story's publish instant.
 * @returns {{ iso: string, source: 'published'|'commit'|'authored'|'slot'|'date', precise: boolean }}
 */
export function resolveStoryTime(day, story, ledger = { entries: {} }) {
  const key = `${day.date}/${story.slug}`;
  if (validIso(story.publishedAt)) return { iso: canonicalIso(story.publishedAt), source: 'published', precise: true };
  const recorded = ledger?.entries?.[key];
  if (recorded && validIso(recorded.at)) return { iso: canonicalIso(recorded.at), source: 'commit', precise: true };
  if (validIso(story.authoredBy?.at)) return { iso: canonicalIso(story.authoredBy.at), source: 'authored', precise: true };
  const slot = EDITIONS.find((edition) => edition.id === story.edition);
  if (slot && /^\d{2}:\d{2}$/.test(slot.at) && DATE_RE.test(day.date)) {
    return { iso: `${day.date}T${slot.at}:00Z`, source: 'slot', precise: false };
  }
  return { iso: day.date, source: 'date', precise: false };
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: DESK_TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
});
const TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: DESK_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true,
});
const DATE_ONLY_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
});

/**
 * "Sun, Oct 4, 2026 · 10:07 PM ET". A bare YYYY-MM-DD renders the date alone —
 * a day with no recorded time never gets an invented one.
 */
export function formatDeskTime(iso) {
  if (DATE_RE.test(String(iso))) return DATE_ONLY_FORMAT.format(new Date(`${iso}T12:00:00Z`));
  if (!validIso(iso)) throw new Error(`formatDeskTime: not an ISO instant: ${iso}`);
  const at = new Date(Date.parse(iso));
  // ICU 72+ separates "10:07" and "PM" with U+202F; normalise so output is
  // byte-identical across Node/ICU versions (local vs CI publisher).
  return `${DATE_FORMAT.format(at)} · ${TIME_FORMAT.format(at)} ${DESK_TIME_ZONE_LABEL}`.replace(/[  ]/g, ' ');
}

/** Hover/AT explanation of where the time came from. Plain text, no markup. */
export function timeSourceNote(source) {
  return {
    published: 'Publish time recorded in the story record.',
    commit: 'Publish time: when the story was committed to the live site.',
    authored: 'Publish time: when the scheduled desk filed the story; it goes live seconds later.',
    slot: 'No publish time was recorded; this is the edition’s scheduled slot.',
    date: 'No publish time was recorded; date only.',
  }[source] || '';
}

/**
 * The <time> element every Desk surface renders. A scheduled-slot fallback
 * says "Scheduled" in the visible text, not only in a tooltip, so an estimate
 * never reads as a recorded fact.
 */
export function deskTimeHtml(resolved, { escape, className = 'desk-time' } = {}) {
  if (typeof escape !== 'function') throw new Error('deskTimeHtml requires an escape function');
  const label = `${resolved.source === 'slot' ? 'Scheduled ' : ''}${formatDeskTime(resolved.iso)}`;
  return `<time class="${className}" datetime="${escape(resolved.iso)}" data-time-source="${escape(resolved.source)}" title="${escape(timeSourceNote(resolved.source))}">${escape(label)}</time>`;
}

export function selfTestNewsPublishTime() {
  const results = [];
  const t = (name, ok) => results.push([name, !!ok]);
  const day = { date: '2026-10-04' };
  const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const ledger = { entries: { '2026-10-04/hand': { at: '2026-10-04T16:45:31Z' } } };

  t('explicit publishedAt wins', resolveStoryTime(day, { slug: 'x', publishedAt: '2026-10-04T09:00:00.000Z', authoredBy: { at: '2026-10-04T08:00:00Z' } }, ledger).source === 'published');
  t('ledger commit beats the authoring stamp', resolveStoryTime(day, { slug: 'hand', authoredBy: { at: '2026-10-04T08:00:00Z' } }, ledger).iso === '2026-10-04T16:45:31Z');
  const authored = resolveStoryTime(day, { slug: 'cron', edition: 'wire', authoredBy: { at: '2026-10-04T08:15:38.520Z' } }, ledger);
  t('authoredBy.at is used and canonicalised to whole seconds', authored.source === 'authored' && authored.iso === '2026-10-04T08:15:38Z');
  const slot = resolveStoryTime(day, { slug: 'n', edition: 'latenight' }, ledger);
  t('edition slot fallback is marked imprecise', slot.source === 'slot' && slot.iso === '2026-10-04T22:00:00Z' && slot.precise === false);
  t('no edition and no stamp degrades to date only', resolveStoryTime(day, { slug: 'n' }, ledger).iso === '2026-10-04');
  t('a malformed stamp is ignored, never rendered', resolveStoryTime(day, { slug: 'n', authoredBy: { at: 'yesterday' } }, ledger).source === 'date');

  t('EDT formatting (founder example shape)', formatDeskTime('2026-10-05T02:07:00Z') === 'Sun, Oct 4, 2026 · 10:07 PM ET');
  t('EST formatting after the DST change', formatDeskTime('2026-12-01T17:30:00Z') === 'Tue, Dec 1, 2026 · 12:30 PM ET');
  t('morning time', formatDeskTime('2026-10-04T08:15:38Z') === 'Sun, Oct 4, 2026 · 4:15 AM ET');
  t('date-only input keeps its own calendar day', formatDeskTime('2026-10-04') === 'Sun, Oct 4, 2026');
  t('garbage input throws', (() => { try { formatDeskTime('nope'); return false; } catch { return true; } })());

  const html = deskTimeHtml(authored, { escape: esc });
  t('time element carries the UTC ISO instant', html.includes('datetime="2026-10-04T08:15:38Z"') && html.includes('>Sun, Oct 4, 2026 · 4:15 AM ET</time>'));
  t('time element names its source', html.includes('data-time-source="authored"') && /title="[^"]+"/.test(html));
  t('a slot estimate says Scheduled in visible text', deskTimeHtml(slot, { escape: esc }).includes('>Scheduled Sun, Oct 4, 2026 · 6:00 PM ET</time>'));
  t('every source has a note', ['published', 'commit', 'authored', 'slot', 'date'].every((s) => timeSourceNote(s).length > 10));
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--self-test')) {
  const results = selfTestNewsPublishTime();
  for (const [name, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`news-publish-time self-test: ${results.length - failed}/${results.length}`);
  if (failed) process.exit(1);
}
