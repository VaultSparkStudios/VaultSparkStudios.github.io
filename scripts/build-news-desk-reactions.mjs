#!/usr/bin/env node
/**
 * build-news-desk-reactions.mjs — the missing half of "N reader signals".
 *
 * Reactions have been COLLECTED since S310 (POST /v/desk-reaction → KV `dr:<slug>`)
 * but never aggregated: the counts lived only in edge KV, so no public surface
 * could say how many readers reacted, and the Director's Report copy already
 * promised a sample-gated update that had nothing to read. This closes that.
 *
 * WHY IT DOES NOT ENUMERATE KV. `KV.list` over an unbounded prefix is both a
 * cost and a correctness trap — it would discover slugs that are no longer
 * published and report reactions for content nobody can read. The slug set is
 * instead derived from the COMMITTED corpus (data/news-desk/days/*.json), which
 * is bounded, reviewable, and exactly the set of stories the site serves. The
 * Worker already exposes a public, unauthenticated GET per slug, so this needs
 * no Worker change at all.
 *
 * MONOTONIC GUARD. KV counters are cumulative and unexpiring, so a total that
 * DROPS means KV loss, not reader behaviour. Smoothing that over would fabricate
 * continuity, so a decrease publishes `state: 'reset'` carrying both numbers.
 *
 * IMAGE PANELS (S376). A reader can also react to a story's illustration and
 * to its satire cartoon. Those counts live under their own keys
 * (`<date>/<slug>/panel/<id>`), so they are probed and published separately
 * and are never added to the story total. Same floor, same reset rule.
 *
 * Network boundary — same idiom as build-deploy-currency:
 *   --probe        fetch live counts, append history, write the feed
 *   (default)      re-derive the feed from committed history, no network
 *   --check        byte-compare the committed feed against that re-derivation
 *   --self-test    pure fixtures
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DAYS_DIR = path.join(ROOT, 'data', 'news-desk', 'days');
const HISTORY = path.join(ROOT, 'data', 'news-desk-reactions-history.ndjson');
const OUT = path.join(ROOT, 'api', 'news-desk-reactions.json');
const PROD = process.env.PROD_ORIGIN || 'https://vaultsparkstudios.com';

const args = new Set(process.argv.slice(2));
const PROBE = args.has('--probe');
const CHECK = args.has('--check');
const SELF_TEST = args.has('--self-test');

/** Publish floor. Matches the studio-wide smallCountThreshold. */
export const MIN_SIGNALS = 5;
/** Hard ceiling on how many slugs may ever be probed in one run. */
export const MAX_SLUGS = 250;
const RECENT_DAYS = 180;
const ALWAYS_RECENT = 60;
const CONCURRENCY = 6;
const TIMEOUT_MS = 8000;
const VOICE_PREFIX = 'voice:';

/**
 * The bounded probe set: every story from the last 180 days, plus the 60 most
 * recent regardless of age, capped at MAX_SLUGS. A corpus that grows past the
 * cap loses the OLDEST entries, never the newest — and the cap is reported in
 * the feed so a silent truncation can never read as full coverage.
 */
export function probeSlugs(stories, now = new Date(), { maxSlugs = MAX_SLUGS } = {}) {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - RECENT_DAYS);
  const sorted = [...stories].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug < b.slug ? -1 : 1));
  const keep = new Map();
  sorted.forEach((story, index) => {
    const fresh = new Date(`${story.date}T00:00:00Z`) >= cutoff;
    if (fresh || index < ALWAYS_RECENT) keep.set(story.slug, story);
  });
  const list = [...keep.values()].slice(0, maxSlugs);
  return { slugs: list, truncated: keep.size > list.length, considered: keep.size };
}

/** Split a raw KV counts object into story reactions and per-voice votes. */
export function splitCounts(counts) {
  const reactions = {};
  const voices = {};
  let total = 0;
  for (const [key, value] of Object.entries(counts || {})) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (key.startsWith(VOICE_PREFIX)) voices[key.slice(VOICE_PREFIX.length)] = n;
    else reactions[key] = n;
    total += n;
  }
  return { reactions, voices, total };
}

/**
 * RETRACTION RULE (S356). Readers can now take a reaction back or switch it,
 * so a total can legitimately fall between probes. A drop is treated as reader
 * retractions — NOT a reset — only when it is small:
 *
 *   drop <= max(RETRACTION_TOLERANCE_MIN, floor(previousTotal * RETRACTION_TOLERANCE_SHARE))
 *   and the counter did not fall to zero.
 *
 * Anything larger (or a wipe to zero) is still published as `reset` with both
 * numbers. The asymmetry is deliberate: the probe runs roughly daily, so a
 * large same-day wave of retractions is implausible, while KV loss typically
 * drops a counter to zero or near it. Erring toward `reset` over-reports a
 * storage problem; erring the other way would hide one.
 */
export const RETRACTION_TOLERANCE_MIN = 3;
export const RETRACTION_TOLERANCE_SHARE = 0.25;

export function isExplainableDrop(previousTotal, observedTotal) {
  const drop = previousTotal - observedTotal;
  if (drop <= 0) return true;
  if (observedTotal <= 0) return false;
  return drop <= Math.max(RETRACTION_TOLERANCE_MIN, Math.floor(previousTotal * RETRACTION_TOLERANCE_SHARE));
}

/**
 * Derive one story row, comparing against the previous history row so a
 * shrinking counter is reported rather than smoothed — unless the drop is
 * small enough to be reader retractions (see RETRACTION RULE above).
 */
export function deriveStoryRow(slug, counts, previousTotal = null) {
  const { reactions, voices, total } = splitCounts(counts);
  if (previousTotal != null && total < previousTotal && !isExplainableDrop(previousTotal, total)) {
    return { slug, state: 'reset', total: null, previousTotal, observedTotal: total, reactions: null, voices: null };
  }
  if (total < MIN_SIGNALS) {
    return { slug, state: 'insufficient', total: null, reactions: null, voices: null };
  }
  return { slug, state: 'sufficient', total, reactions, voices };
}

/**
 * The Worker cuts every key to this many characters. A longer panel key would
 * be read under a different name than the one published here, and two panels of
 * one story could land on the same counter, so such a key is never probed.
 */
export const MAX_KEY_LENGTH = 120;

/** The image panels a story carries, keyed the way the page sends them. */
export function panelScopes(story) {
  return [
    { id: 'illustration', key: `${story.slug}/panel/editorial-illustration-1` },
    ...(story.hasCartoon ? [{ id: 'cartoon', key: `${story.slug}/panel/satire-cartoon` }] : []),
  ].map((panel) => ({ ...panel, readable: panel.key.length <= MAX_KEY_LENGTH }));
}

/** One image panel row. Panels have no voice votes, so none are reported. */
export function derivePanelRow(key, counts, previousTotal = null) {
  const row = deriveStoryRow(key, counts, previousTotal);
  delete row.voices;
  return row;
}

export function deriveSnapshot(rawBySlug, previousBySlug = new Map(), observedAt = null, meta = {}) {
  const stories = [...rawBySlug.keys()].sort().map((slug) =>
    deriveStoryRow(slug, rawBySlug.get(slug), previousBySlug.get(slug) ?? null));
  // Present only when panels were probed, so a snapshot taken before panels
  // existed is not mistaken for one that observed them and found nothing.
  const panels = meta.panelRaw
    ? [...meta.panelRaw.keys()].sort().map((key) =>
      derivePanelRow(key, meta.panelRaw.get(key), previousBySlug.get(key) ?? null))
    : null;
  const payload = {
    schemaVersion: '1.0',
    observedAt,
    minSignals: MIN_SIGNALS,
    maxSlugs: MAX_SLUGS,
    probed: stories.length,
    considered: meta.considered ?? stories.length,
    truncated: Boolean(meta.truncated),
    stories,
    ...(panels ? { panels } : {}),
  };
  return { ...payload, receiptId: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 20) };
}

export function deriveFeed(corpusStories, historyRows) {
  const latest = historyRows.at(-1) || null;
  const bySlug = new Map((latest?.stories || []).map((row) => [row.slug, row]));
  const panelByKey = new Map((latest?.panels || []).map((row) => [row.slug, row]));
  const panelFor = ({ key, readable }) => {
    const row = readable ? panelByKey.get(key) || null : null;
    return {
      key,
      state: row ? row.state : 'unavailable',
      ...(readable ? {} : { reason: 'key-longer-than-the-store-allows' }),
      total: row?.total ?? null,
      reactions: row?.reactions ?? null,
      ...(row?.state === 'reset' ? { previousTotal: row.previousTotal, observedTotal: row.observedTotal } : {}),
    };
  };
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-news-desk-reactions.mjs',
    generatedAt: latest?.observedAt || null,
    observedAt: latest?.observedAt || null,
    state: latest ? 'observed' : 'unobserved',
    publicSafe: true,
    sourceReceiptId: latest?.receiptId || null,
    measurement: {
      metric: 'reader-signals',
      metricClass: 'voluntary-signal',
      minSignals: MIN_SIGNALS,
      definition: 'Emoji reactions a reader chose to send on a story, and separately on its generated illustration or satire cartoon. A reaction sent from the panel beside an image is stored under the key of that image, listed under "panels", and never added to the story total. Illustration reactions sent from the older in-story row are stored with the story and stay in its total.',
      isNot: ['a rating', 'a poll', 'representative of readers', 'unique people'],
      privacy: 'Counted per day against a truncated SHA-256 of IP + slug + day, capped at 12 per reader per day. No cookie, account id, raw IP, or durable session id is stored.',
      caveat: 'Only readers who chose to react are counted, so these are self-selected. A story below the floor publishes no total at all.',
      resetSemantics: 'Readers may take back or switch one reaction, so a small drop (at most the larger of 3 or 25% of the previous total, never to zero) is treated as retractions. A total that DROPS beyond what readers can explain (a larger drop, or a wipe to zero) means storage loss, and is published as state "reset" with both numbers rather than smoothed.',
      truncationReported: true,
    },
    stories: corpusStories.map((story) => {
      const row = bySlug.get(story.slug) || null;
      return {
        slug: story.slug,
        date: story.date,
        url: story.url,
        state: row ? row.state : 'unavailable',
        total: row?.total ?? null,
        reactions: row?.reactions ?? null,
        voices: row?.voices ?? null,
        ...(row?.state === 'reset' ? { previousTotal: row.previousTotal, observedTotal: row.observedTotal } : {}),
        panels: Object.fromEntries(panelScopes(story).map((panel) => [panel.id, panelFor(panel)])),
      };
    }),
  };
}

/* ── I/O ──────────────────────────────────────────────────────────────────── */

function corpus() {
  if (!fs.existsSync(DAYS_DIR)) return [];
  return fs.readdirSync(DAYS_DIR).filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort().flatMap((name) => {
    let day; try { day = JSON.parse(fs.readFileSync(path.join(DAYS_DIR, name), 'utf8')); } catch { return []; }
    if (day.simulated === true) return [];
    return (day.stories || []).map((story) => ({
      slug: `${day.date}/${story.slug}`,
      date: day.date,
      url: `/news/${day.date}/${story.slug}/`,
      hasCartoon: Boolean(story.visual?.satireCartoon),
    }));
  });
}

function readNdjson(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

const textFor = (value) => JSON.stringify(value, null, 2) + '\n';

async function fetchCounts(slug) {
  const url = new URL('/v/desk-reaction', PROD);
  url.searchParams.set('slug', slug);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'VaultSparkDeskReactions/1.0' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      credentials: 'omit',
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body && body.ok ? (body.counts || {}) : null;
  } catch { return null; }
}

async function probeAll(slugs) {
  const out = new Map();
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, slugs.length) }, async () => {
    while (cursor < slugs.length) {
      const story = slugs[cursor++];
      const counts = await fetchCounts(story.slug);
      // A failed probe records NOTHING for that slug rather than a zero — an
      // unreachable edge is not evidence that nobody reacted.
      if (counts) out.set(story.slug, counts);
    }
  });
  await Promise.all(workers);
  return out;
}

/* ── Self-test ────────────────────────────────────────────────────────────── */

function selfTest() {
  const stories = [
    { slug: '2026-08-11/a', date: '2026-08-11', url: '/news/2026-08-11/a/' },
    { slug: '2026-08-11/b', date: '2026-08-11', url: '/news/2026-08-11/b/' },
  ];
  const raw = new Map([
    ['2026-08-11/a', { 'made-me-laugh': 4, 'want-receipts': 2, 'voice:nib': 3 }],
    ['2026-08-11/b', { 'made-me-laugh': 2 }],
  ]);
  const snap = deriveSnapshot(raw, new Map(), '2026-08-16T00:00:00Z');
  const feed = deriveFeed(stories, [snap]);
  const rowA = feed.stories.find((s) => s.slug.endsWith('/a'));
  const rowB = feed.stories.find((s) => s.slug.endsWith('/b'));

  const resetSnap = deriveSnapshot(
    new Map([['2026-08-11/a', { 'made-me-laugh': 1 }]]),
    new Map([['2026-08-11/a', 9]]),
    '2026-08-16T00:00:00Z',
  );
  const resetRow = deriveFeed(stories, [resetSnap]).stories.find((s) => s.slug.endsWith('/a'));

  // Dated INSIDE the 180-day window, so the cap is what bounds them — dating
  // them outside it would exercise the 60-most-recent rule instead.
  const many = Array.from({ length: 400 }, (_, i) => ({ slug: `2026-08-01/s${i}`, date: '2026-08-01' }));
  const bounded = probeSlugs(many, new Date('2026-08-16T00:00:00Z'));

  const withCartoon = { slug: '2026-10-12/c', date: '2026-10-12', url: '/news/2026-10-12/c/', hasCartoon: true };
  const panelSnap = deriveSnapshot(
    new Map([['2026-10-12/c', { 'made-me-laugh': 6 }]]),
    new Map([['2026-10-12/c/panel/editorial-illustration-1', 20]]),
    '2026-10-12T00:00:00Z',
    { panelRaw: new Map([
      ['2026-10-12/c/panel/satire-cartoon', { 'panel-laugh': 5, 'panel-think': 2 }],
      ['2026-10-12/c/panel/editorial-illustration-1', { 'panel-100': 2 }],
    ]) },
  );
  const panelFeedRow = deriveFeed([withCartoon, ...stories], [panelSnap]).stories[0];

  const cases = [
    ['a story without a cartoon publishes an illustration panel only',
      Object.keys(rowA.panels).join() === 'illustration'],
    ['a snapshot taken before panels were probed reports them unavailable, not empty',
      !('panels' in snap) && rowA.panels.illustration.state === 'unavailable' && rowA.panels.illustration.total === null],
    ['a cartoon panel above the floor publishes its own total and reactions',
      panelFeedRow.panels.cartoon.state === 'sufficient' && panelFeedRow.panels.cartoon.total === 7
        && panelFeedRow.panels.cartoon.reactions['panel-laugh'] === 5 && !('voices' in panelFeedRow.panels.cartoon)],
    ['image reactions are never added to the story total', panelFeedRow.total === 6],
    ['the reset rule applies to a panel as it does to a story',
      panelFeedRow.panels.illustration.state === 'reset' && panelFeedRow.panels.illustration.previousTotal === 20
        && panelFeedRow.panels.illustration.observedTotal === 2],
    ['a panel key longer than the store allows is never probed or matched',
      (() => {
        const long = { slug: `2026-10-12/${'x'.repeat(100)}`, date: '2026-10-12', url: '/x/', hasCartoon: true };
        const scopes = panelScopes(long);
        const snapshot = deriveSnapshot(new Map(), new Map(), null, { panelRaw: new Map([[scopes[0].key, { 'panel-100': 9 }]]) });
        const row = deriveFeed([long], [snapshot]).stories[0].panels.illustration;
        return scopes[0].readable === false && scopes[1].readable === false
          && row.state === 'unavailable' && row.total === null && row.reason === 'key-longer-than-the-store-allows';
      })()],
    ['each panel names the key it was read from',
      panelFeedRow.panels.cartoon.key === '2026-10-12/c/panel/satire-cartoon'],
    ['story absent from an observed snapshot remains unavailable', deriveFeed([...stories, {slug:'2026-08-16/unprobed',date:'2026-08-16',url:'/news/2026-08-16/unprobed/'}], [snap]).stories.at(-1).state === 'unavailable'],
    ['observed below-floor story remains insufficient', rowB.state === 'insufficient' && rowB.total === null],
    ['story reactions and voice votes are separated',
      rowA.reactions['made-me-laugh'] === 4 && rowA.voices.nib === 3 && !('voice:nib' in rowA.reactions)],
    ['the total counts every signal including voices', rowA.total === 9],
    ['below the floor publishes NO total', rowB.state === 'insufficient' && rowB.total === null && rowB.reactions === null],
    ['THE RESET CASE: a shrinking counter is reported, never smoothed',
      resetRow.state === 'reset' && resetRow.previousTotal === 9 && resetRow.observedTotal === 1 && resetRow.total === null],
    ['enumeration is bounded and the cap is published',
      bounded.slugs.length === MAX_SLUGS && bounded.truncated === true],
    ['truncation is surfaced on the snapshot, not silent',
      deriveSnapshot(new Map(), new Map(), null, { truncated: true, considered: 400 }).truncated === true],
    ['an unprobed story is unavailable before any observation exists',
      deriveFeed(stories, []).stories.every((s) => s.state === 'unavailable' && s.total === null)],
    ['zero and negative counts are ignored, never published',
      splitCounts({ a: 0, b: -3, c: 5 }).total === 5],
    ['the feed says what a signal is NOT',
      feed.measurement.isNot.includes('representative of readers') && feed.measurement.isNot.includes('a rating')],
    ['reset semantics are declared on the artifact', /DROPS beyond what readers can explain.*means storage loss/.test(feed.measurement.resetSemantics)],
    ['a small drop from a retraction is NOT a reset',
      deriveStoryRow('s', { 'panel-100': 4, 'panel-think': 4 }, 9).state === 'sufficient'],
    ['a switch (one down, one up) leaves the total unchanged and publishes normally',
      deriveStoryRow('s', { 'made-me-laugh': 5, 'voice:vera': 4 }, 9).total === 9],
    ['a drop beyond the tolerance is still a reset',
      deriveStoryRow('s', { 'made-me-laugh': 5 }, 20).state === 'reset'],
    ['a wipe to zero is always a reset, never retractions',
      deriveStoryRow('s', {}, 5).state === 'reset'],
    ['tolerance boundary: max(3, 25%) of the previous total',
      isExplainableDrop(9, 6) && !isExplainableDrop(9, 5) && isExplainableDrop(40, 30) && !isExplainableDrop(40, 29)],
    ['an explainable drop below the floor becomes insufficient, not reset',
      deriveStoryRow('s', { 'made-me-laugh': 3 }, 5).state === 'insufficient'],
  ];
  let pass = 0;
  for (const [name, ok] of cases) { console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`); if (ok) pass++; }
  console.log(`build-news-desk-reactions --self-test: ${pass}/${cases.length}`);
  return pass === cases.length;
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

if (SELF_TEST) process.exit(selfTest() ? 0 : 1);

const stories = corpus();
const history = readNdjson(HISTORY);

if (PROBE) {
  const { slugs, truncated, considered } = probeSlugs(stories);
  const previousBySlug = new Map([...(history.at(-1)?.stories || []), ...(history.at(-1)?.panels || [])]
    .filter((row) => row.total != null).map((row) => [row.slug, row.total]));
  const raw = await probeAll(slugs);
  const panelRaw = await probeAll(slugs.flatMap((story) => panelScopes(story).filter((panel) => panel.readable).map((panel) => ({ slug: panel.key }))));
  const snapshot = deriveSnapshot(raw, previousBySlug, new Date().toISOString(), { truncated, considered, panelRaw });
  const last = history.at(-1);
  // Append only when the observation actually changed, so a quiet day adds no
  // row — the same low-churn contract the engagement history uses.
  if (!last || last.receiptId !== snapshot.receiptId) {
    fs.appendFileSync(HISTORY, JSON.stringify(snapshot) + '\n');
    history.push(snapshot);
  }
  if (truncated) console.log(`build-news-desk-reactions: probe truncated at ${MAX_SLUGS} of ${considered} slug(s)`);
}

const feed = deriveFeed(stories, history);
const expected = textFor(feed);

if (CHECK) {
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== expected) {
    console.error('build-news-desk-reactions: feed drift — run: node scripts/build-news-desk-reactions.mjs');
    process.exit(1);
  }
  const published = feed.stories.filter((s) => s.state === 'sufficient').length;
  console.log(`build-news-desk-reactions --check: ok (${feed.stories.length} stories · ${published} above the signal floor)`);
  process.exit(0);
}

fs.writeFileSync(OUT, expected);
const published = feed.stories.filter((s) => s.state === 'sufficient').length;
const reset = feed.stories.filter((s) => s.state === 'reset').length;
console.log(`build-news-desk-reactions → ${feed.stories.length} stories · ${published} above the signal floor${reset ? ` · ${reset} reset` : ''}`);
