/**
 * news-audience.mjs — per-article REACH derivation for The Desk.
 *
 * Reach and engagement are different measurements and must never be blended:
 *
 *   pageloads  = an ARRIVAL. One document load that reached hide/unload in a
 *                JS-capable browser and emitted the ambient RUM beacon.
 *   engagement = a DEPARTURE. A completed visible-and-focused reading summary,
 *                already the denominator for average engaged seconds.
 *
 * Using engagement rows for both would make reach and read-time the same number
 * wearing two labels. So reach is counted from the beacon that already arrives
 * on every article page — no Worker change, no new client script.
 *
 * THE COUNTING UNIT IS NOT "A ROW". The /v/rum ingest stores one object per
 * beacon, and most beacons are `ux` EVENTS (inp:slow_interaction,
 * engagement:scroll_25, funnel:*). A sampled day held 4 rows of which only 2
 * were pageloads. Counting rows would have inflated reach ~10x on interactive
 * routes and published it as a visitor number. A pageload row is one with NO
 * `ux` key — the vitals beacon.
 *
 * What a published pageload count may claim: "N browser pageloads reported this
 * article in the window." What it may NOT claim, and the feed says so verbatim:
 * not people, not visitors, not sessions, not deduplicated (a reload counts
 * twice), and not server-side bot-filtered — only incidentally filtered, because
 * the beacon needs JS execution plus a visibility transition.
 */

/** Article routes only: /news/<YYYY-MM-DD>/<slug>/ — never the hub, never a sub-path. */
export const ARTICLE_ROUTE = /^\/news\/(\d{4}-\d{2}-\d{2})\/([a-z0-9][a-z0-9-]*)\/$/;

/** Reach floor. Matches the studio-wide smallCountThreshold and the engagement floor. */
export const MIN_PAGELOADS = 5;

/** Idle is published as a coarse band, never as raw seconds (see deriveIdle). */
export const IDLE_BUCKETS = Object.freeze(['under30', '30to119', '120to599', '600plus']);

/** `/news/2026-08-11/some-slug/` → `2026-08-11/some-slug` (the corpus slug form). */
export function routeToSlug(route) {
  const m = ARTICLE_ROUTE.exec(String(route || ''));
  return m ? `${m[1]}/${m[2]}` : null;
}

/** A pageload row is the vitals beacon: an article route with NO `ux` event name. */
export function isPageloadRow(row) {
  if (!row || row.ux) return false;
  if (row.measurement === 'visible-and-focused-seconds') return false;
  return routeToSlug(row.route) !== null;
}

export function idleBucket(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 30) return 'under30';
  if (s < 120) return '30to119';
  if (s < 600) return '120to599';
  return '600plus';
}

/** UTC day window shared with the engagement snapshot, so both describe the same span. */
export function utcWindow(now = new Date(), windowDays = 30) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - windowDays);
  return { start, end };
}

/**
 * Count pageloads per story slug inside the window.
 * Returns a Map slug → count, including counts BELOW the floor: suppression is
 * the publisher's job, not the counter's, so a caller can still tell "3 so far"
 * from "none at all" when deciding what to render.
 */
export function derivePageloads(rawRows, allowedSlugs, now = new Date(), windowDays = 30) {
  const allowed = allowedSlugs instanceof Set ? allowedSlugs : new Set(allowedSlugs || []);
  const { start, end } = utcWindow(now, windowDays);
  const counts = new Map();
  for (const row of rawRows || []) {
    if (!isPageloadRow(row)) continue;
    const slug = routeToSlug(row.route);
    if (!allowed.has(slug)) continue;
    const ts = new Date(row.ts);
    if (Number.isNaN(ts.getTime()) || ts < start || ts >= end) continue;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }
  return counts;
}

/**
 * Idle distribution per slug, from the bucket the CLIENT already computed.
 *
 * The browser sends a band, not a duration. Storing per-session wall-clock
 * seconds beside engaged seconds is a materially richer behavioural fingerprint
 * than one bounded scalar, and D-S315.3 deliberately declined to collect it.
 * A four-way band answers "did they wander off?" without carrying a timing
 * signature, and it is suppressed by the same floor as everything else.
 */
export function deriveIdle(rawRows, allowedSlugs, now = new Date(), windowDays = 30) {
  const allowed = allowedSlugs instanceof Set ? allowedSlugs : new Set(allowedSlugs || []);
  const { start, end } = utcWindow(now, windowDays);
  const grouped = new Map();
  for (const row of rawRows || []) {
    if (!row || row.measurement !== 'visible-and-focused-seconds') continue;
    if (!allowed.has(row.slug)) continue;
    const band = IDLE_BUCKETS.includes(row.idleBand) ? row.idleBand : null;
    if (!band) continue;
    const ts = new Date(row.ts);
    if (Number.isNaN(ts.getTime()) || ts < start || ts >= end) continue;
    if (!grouped.has(row.slug)) grouped.set(row.slug, { under30: 0, '30to119': 0, '120to599': 0, '600plus': 0, observations: 0 });
    const entry = grouped.get(row.slug);
    entry[band]++; entry.observations++;
  }
  return grouped;
}

/**
 * How much of the ESTIMATED read a reader actually spends engaged.
 *
 * This is the bridge between the two read-time numbers on the page — the
 * 220 wpm estimate and the measured engaged seconds — so a reader is never left
 * to do bad arithmetic between them. It is deliberately NOT called completion:
 * nobody measured whether anyone reached the end. Null whenever either input is
 * missing; a ratio derived from a guess is a guess.
 */
export function deriveAttentionRatio(averageEngagedSeconds, estimatedMinutes) {
  const engaged = Number(averageEngagedSeconds);
  const minutes = Number(estimatedMinutes);
  if (!Number.isFinite(engaged) || !Number.isFinite(minutes) || engaged <= 0 || minutes <= 0) return null;
  return Math.round((engaged / (minutes * 60)) * 100) / 100;
}

export function selfTestNewsAudience() {
  const slugs = new Set(['2026-08-11/a', '2026-08-11/b']);
  const now = new Date('2026-08-20T00:00:00Z');
  const at = '2026-08-15T12:00:00Z';
  const rows = [
    // 3 genuine pageloads for a
    { route: '/news/2026-08-11/a/', ts: at },
    { route: '/news/2026-08-11/a/', ts: at },
    { route: '/news/2026-08-11/a/', ts: at },
    // ux events on the SAME route must not count
    { route: '/news/2026-08-11/a/', ts: at, ux: 'inp:slow_interaction' },
    { route: '/news/2026-08-11/a/', ts: at, ux: 'engagement:scroll_25' },
    // the hub is not an article
    { route: '/news/', ts: at },
    // an engagement summary is a departure, not an arrival
    { route: '/news/2026-08-11/a/', ts: at, measurement: 'visible-and-focused-seconds', slug: '2026-08-11/a', engagedSeconds: 40 },
    // outside the window
    { route: '/news/2026-08-11/b/', ts: '2026-06-01T12:00:00Z' },
    // not in the published corpus
    { route: '/news/2026-08-11/ghost/', ts: at },
  ];
  const counts = derivePageloads(rows, slugs, now);
  const idleRows = [
    { measurement: 'visible-and-focused-seconds', slug: '2026-08-11/a', ts: at, idleBand: 'under30' },
    { measurement: 'visible-and-focused-seconds', slug: '2026-08-11/a', ts: at, idleBand: '600plus' },
    { measurement: 'visible-and-focused-seconds', slug: '2026-08-11/a', ts: at, idleBand: 'nonsense' },
  ];
  const idle = deriveIdle(idleRows, slugs, now);
  const cases = [
    ['THE COUNTING BUG: ux event rows are not pageloads', counts.get('2026-08-11/a') === 3],
    ['the hub route is never an article', !counts.has('/news/')],
    ['an engagement summary is not counted as reach', counts.get('2026-08-11/a') === 3],
    ['rows outside the window are excluded', !counts.has('2026-08-11/b')],
    ['a route absent from the corpus is ignored', ![...counts.keys()].some((k) => k.includes('ghost'))],
    ['sub-paths and malformed routes do not parse', routeToSlug('/news/2026-08-11/a/panel/1') === null && routeToSlug('/news/') === null],
    ['a valid article route parses to its corpus slug', routeToSlug('/news/2026-08-11/a/') === '2026-08-11/a'],
    ['idle is banded, never raw seconds', idleBucket(0) === 'under30' && idleBucket(45) === '30to119' && idleBucket(300) === '120to599' && idleBucket(9999) === '600plus'],
    ['an unknown idle band is dropped, not coerced', idle.get('2026-08-11/a').observations === 2],
    ['attention ratio bridges estimate and measurement', deriveAttentionRatio(66, 2) === 0.55],
    ['attention ratio is null when either input is missing',
      deriveAttentionRatio(null, 2) === null && deriveAttentionRatio(66, null) === null && deriveAttentionRatio(0, 2) === null],
  ];
  return cases;
}
