#!/usr/bin/env node
/**
 * Public, privacy-thresholded engagement receipt for every Desk article.
 * Raw rows stay in ignored cache/R2. Only story aggregates with at least five
 * completed observations may enter the public append-only history.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { derivePageloads, deriveIdle, deriveAttentionRatio, MIN_PAGELOADS, selfTestNewsAudience } from './lib/news-audience.mjs';
// The 220 wpm estimate is defined ONCE, in news-stats, and the article page
// already prints it. Re-deriving it here with a local constant is how the chip
// and the ratio silently drift apart.
import { wordsIn, readMinutes } from './lib/news-stats.mjs';

const estimatedReadMinutes = (story) => readMinutes(wordsIn(story));

const ROOT = process.cwd();
const args = process.argv.slice(2);
const valueFor = (flag) => {
  const hit = args.find((arg) => arg.startsWith(flag + '='));
  return hit ? hit.slice(flag.length + 1) : null;
};
const RAW = path.resolve(ROOT, valueFor('--input') || '.cache/rum-raw');
const DAYS_DIR = path.join(ROOT, 'data', 'news-desk', 'days');
const HISTORY = path.join(ROOT, 'data', 'news-desk-engagement-history.ndjson');
const OUT = path.join(ROOT, 'api', 'news-desk-engagement.json');
const WINDOW_DAYS = 30;
const MIN_OBSERVATIONS = 5;

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function readNdjson(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

function corpus() {
  if (!fs.existsSync(DAYS_DIR)) return [];
  return fs.readdirSync(DAYS_DIR).filter((name) => name.endsWith('.json')).sort().flatMap((name) => {
    const day = readJson(path.join(DAYS_DIR, name), {});
    if (day.simulated === true) return [];
    return (day.stories || []).map((story) => ({
      slug: day.date + '/' + story.slug,
      date: day.date,
      headline: story.headline,
      url: '/news/' + day.date + '/' + story.slug + '/',
      // S317: the 220 wpm estimate, carried so attentionRatio can name both of
      // its components. Derived from the same words the page prints.
      estimatedMinutes: estimatedReadMinutes(story),
    }));
  });
}

function loadRaw(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir, { recursive: true })) {
    const file = path.join(dir, name);
    if (!fs.statSync(file).isFile() || !/\.(?:json|ndjson)$/i.test(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
      try {
        const row = JSON.parse(line);
        if (!row || !row.ts) continue;
        // Two distinct measurements share this raw store. Engagement summaries
        // carry `measurement`; reach rows are the plain vitals beacon. Keeping
        // both here is what lets one pass derive arrival AND departure without
        // a second scan of several thousand objects.
        if (row.measurement === 'visible-and-focused-seconds' && row.slug) { out.push(row); continue; }
        if (!row.ux && typeof row.route === 'string' && row.route.startsWith('/news/')) out.push(row);
      } catch { /* malformed raw evidence is ignored, never fabricated */ }
    }
  }
  return out;
}

function bucket(seconds) {
  if (seconds < 30) return 'under30';
  if (seconds < 60) return '30to59';
  if (seconds < 120) return '60to119';
  if (seconds < 300) return '120to299';
  return '300plus';
}

export function deriveSnapshot(rawRows, allowedStories, now = new Date()) {
  const allowed = new Set(allowedStories.map((story) => story.slug));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - WINDOW_DAYS);
  const grouped = new Map();
  for (const row of rawRows) {
    const ts = new Date(row.ts);
    const seconds = Math.min(Math.max(Math.round(Number(row.engagedSeconds) || 0), 0), 1800);
    if (!allowed.has(row.slug) || !seconds || Number.isNaN(ts.getTime()) || ts < start || ts >= end) continue;
    if (!grouped.has(row.slug)) grouped.set(row.slug, []);
    grouped.get(row.slug).push(seconds);
  }
  // S317 — reach and idle derive from the SAME window as engagement, so a story
  // can never show arrivals from one span beside read-time from another.
  const allowedSlugs = new Set(allowedStories.map((story) => story.slug));
  const pageloads = derivePageloads(rawRows, allowedSlugs, now, WINDOW_DAYS);
  const idleBySlug = deriveIdle(rawRows, allowedSlugs, now, WINDOW_DAYS);

  const stories = [];
  const reach = [];
  for (const [slug, count] of [...pageloads.entries()].sort()) {
    // Suppressed below the floor, but the slug is still listed so the feed can
    // say "not enough yet" rather than pretending the story does not exist.
    reach.push({ slug, pageloads: count >= MIN_PAGELOADS ? count : null, belowFloor: count < MIN_PAGELOADS });
  }
  for (const [slug, values] of [...grouped.entries()].sort()) {
    if (values.length < MIN_OBSERVATIONS) continue;
    const durationBuckets = { under30: 0, '30to59': 0, '60to119': 0, '120to299': 0, '300plus': 0 };
    for (const value of values) durationBuckets[bucket(value)]++;
    const total = values.reduce((sum, value) => sum + value, 0);
    const idle = idleBySlug.get(slug) || null;
    stories.push({
      slug,
      observations: values.length,
      totalEngagedSeconds: total,
      averageEngagedSeconds: Math.round(total / values.length),
      durationBuckets,
      // Idle rides the SAME five-observation floor as engaged time.
      idleBands: idle && idle.observations >= MIN_OBSERVATIONS
        ? { under30: idle.under30, '30to119': idle['30to119'], '120to599': idle['120to599'], '600plus': idle['600plus'], observations: idle.observations }
        : null,
    });
  }
  const payload = {
    schemaVersion: '1.1',
    observedThrough: new Date(end.getTime() - 1).toISOString(),
    windowStart: start.toISOString(),
    windowEndExclusive: end.toISOString(),
    windowDays: WINDOW_DAYS,
    minObservations: MIN_OBSERVATIONS,
    minPageloads: MIN_PAGELOADS,
    stories,
    reach,
  };
  return { ...payload, receiptId: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 20) };
}

/**
 * Derive the milestone only from already-thresholded public reach rows.
 *
 * History order is authoritative because the NDJSON ledger is append-only: the
 * first row that publishes a count at the floor is the first receipt that
 * proved qualification. A suppressed/null row never qualifies, even when its
 * `belowFloor` flag is malformed or missing.
 */
export function deriveQualification(historyRows) {
  const qualifiedStories = new Set();
  let firstQualified = null;

  for (const receipt of historyRows) {
    const qualifiedInReceipt = (receipt && Array.isArray(receipt.reach) ? receipt.reach : [])
      .filter((row) => row && typeof row.slug === 'string'
        && Number.isFinite(row.pageloads)
        && row.pageloads >= MIN_PAGELOADS)
      .sort((a, b) => a.slug.localeCompare(b.slug));

    for (const row of qualifiedInReceipt) qualifiedStories.add(row.slug);
    if (!firstQualified && qualifiedInReceipt.length) {
      firstQualified = {
        story: qualifiedInReceipt[0].slug,
        receipt: typeof receipt.receiptId === 'string' ? receipt.receiptId : null,
        date: typeof receipt.observedThrough === 'string' ? receipt.observedThrough : null,
      };
    }
  }

  const qualifiedCount = qualifiedStories.size;
  return {
    state: qualifiedCount ? 'qualified' : 'abstained',
    floor: MIN_PAGELOADS,
    qualifiedCount,
    firstQualified,
    abstentionReason: qualifiedCount
      ? null
      : historyRows.length
        ? `No thresholded story row has reached the ${MIN_PAGELOADS}-pageload privacy floor. Counts below ${MIN_PAGELOADS} remain suppressed.`
        : `No engagement receipt has been recorded, so no story can be shown to have reached the ${MIN_PAGELOADS}-pageload privacy floor.`,
  };
}

export function deriveFeed(stories, historyRows) {
  const latest = historyRows.at(-1) || null;
  const bySlug = new Map((latest && latest.stories || []).map((row) => [row.slug, row]));
  const reachBySlug = new Map((latest && latest.reach || []).map((row) => [row.slug, row]));
  return {
    schemaVersion: '1.2',
    generatedAt: latest && latest.observedThrough || null,
    observedAt: latest && latest.observedThrough || null,
    state: latest ? 'observed' : 'unobserved',
    generatedBy: 'scripts/build-news-desk-engagement.mjs',
    publicSafe: true,
    measurement: {
      metric: 'visible-and-focused-seconds',
      metricClass: 'engagement-observation',
      windowDays: WINDOW_DAYS,
      minObservations: MIN_OBSERVATIONS,
      livePresenceWindowSeconds: 90,
      privacy: 'No cookie, account id, raw IP, or durable session id. Exact live counts are suppressed below three; engagement aggregates are suppressed below five completed observations.',
      caveat: 'Observations are completed visible-and-focused browser sessions, not unique people and not Cloudflare visits.',
      minPageloads: MIN_PAGELOADS,
      // Say precisely what reach is NOT, on the artifact itself, so no consumer
      // has to infer it and no future surface can quietly relabel it "visitors".
      reach: {
        metric: 'browser-pageloads',
        metricClass: 'arrival-observation',
        definition: 'One document load that reached hide/unload in a JS-capable browser and emitted the ambient RUM beacon.',
        isNot: ['people', 'visitors', 'sessions', 'unique', 'deduplicated', 'server-side bot-filtered'],
        caveat: 'A reader who reloads is counted twice. Crawlers are only incidentally excluded, because the beacon requires JS execution and a visibility transition — that filter is real but unverifiable, and is not a bot classification.',
      },
      // Idle is collected as a coarse band, never as a duration.
      idleTime: {
        measured: true,
        metric: 'idle-band',
        bands: ['under30', '30to119', '120to599', '600plus'],
        definition: 'Hidden or blurred seconds during the same reading session, reported as a band.',
        rationale: 'A band answers "did they wander off?" without carrying the per-session wall-clock timing signature that D-S315.3 declined to store.',
        closestHonestProxy: 'attentionRatio',
      },
      attentionRatio: {
        definition: 'averageEngagedSeconds ÷ (estimated read minutes × 60).',
        isNot: ['completion', 'scroll depth', 'comprehension'],
        caveat: 'Nobody measured whether a reader reached the end. Null whenever either component is missing.',
      },
    },
    sourceReceiptId: latest && latest.receiptId || null,
    observedThrough: latest && latest.observedThrough || null,
    qualification: deriveQualification(historyRows),
    stories: stories.map((story) => {
      const measured = bySlug.get(story.slug);
      const reachRow = reachBySlug.get(story.slug) || null;
      const pageloads = reachRow && reachRow.pageloads != null ? reachRow.pageloads : null;
      const reachState = !latest ? 'unavailable' : pageloads != null ? 'sufficient' : 'insufficient';
      return measured ? {
        ...story,
        state: 'sufficient',
        observations: measured.observations,
        averageEngagedSeconds: measured.averageEngagedSeconds,
        durationBuckets: measured.durationBuckets,
        idleBands: measured.idleBands ?? null,
        // Both components are named on the row, so the ratio is auditable
        // rather than a bare number the reader has to trust.
        attentionRatio: deriveAttentionRatio(measured.averageEngagedSeconds, story.estimatedMinutes),
        estimatedMinutes: story.estimatedMinutes ?? null,
        pageloads,
        reachState,
        windowDays: WINDOW_DAYS,
      } : {
        ...story,
        state: latest ? 'insufficient' : 'unavailable',
        observations: null,
        averageEngagedSeconds: null,
        durationBuckets: null,
        idleBands: null,
        attentionRatio: null,
        estimatedMinutes: story.estimatedMinutes ?? null,
        // Reach is independent of engagement: an article can clear the arrival
        // floor long before five readers finish a session. Reporting reach as
        // unavailable just because engagement is thin would hide real data.
        pageloads,
        reachState,
        windowDays: WINDOW_DAYS,
      };
    }),
  };
}

const textFor = (value) => JSON.stringify(value, null, 2) + '\n';

function selfTest() {
  const stories = [{ slug: '2026-01-01/a' }, { slug: '2026-01-01/b' }];
  const raw = [
    ...[10, 40, 80, 150, 320].map((engagedSeconds) => ({ slug: stories[0].slug, engagedSeconds, measurement: 'visible-and-focused-seconds', ts: '2026-01-20T12:00:00Z' })),
    ...[10, 20, 30, 40].map((engagedSeconds) => ({ slug: stories[1].slug, engagedSeconds, measurement: 'visible-and-focused-seconds', ts: '2026-01-20T12:00:00Z' })),
    { slug: 'unknown', engagedSeconds: 999, measurement: 'visible-and-focused-seconds', ts: '2026-01-20T12:00:00Z' },
  ];
  const snap = deriveSnapshot(raw, stories, new Date('2026-02-01T12:00:00Z'));
  const feed = deriveFeed(stories, [snap]);
  // Reach fixture: 5 genuine pageloads for /a (clears the floor) + 3 ux event
  // rows on the same route that must NOT count, and 2 pageloads for /b (below).
  const reachRaw = [
    ...Array.from({ length: 5 }, () => ({ route: '/news/2026-01-01/a/', ts: '2026-01-20T12:00:00Z' })),
    ...Array.from({ length: 3 }, () => ({ route: '/news/2026-01-01/a/', ts: '2026-01-20T12:00:00Z', ux: 'inp:slow_interaction' })),
    ...Array.from({ length: 2 }, () => ({ route: '/news/2026-01-01/b/', ts: '2026-01-20T12:00:00Z' })),
  ];
  const reachSnap = deriveSnapshot([...raw, ...reachRaw], stories, new Date('2026-01-25T00:00:00Z'));
  const reachFeed = deriveFeed(stories, [reachSnap]);
  const receipt = (receiptId, observedThrough, reach) => ({ receiptId, observedThrough, reach });
  const zeroQualification = deriveQualification([]);
  const belowFloorQualification = deriveQualification([
    receipt('below', '2026-01-20T23:59:59.999Z', [
      { slug: stories[0].slug, pageloads: null, belowFloor: true },
      // A malformed public row must not evade the numeric threshold.
      { slug: stories[1].slug, pageloads: 4, belowFloor: false },
    ]),
  ]);
  const atFloorQualification = deriveQualification([
    receipt('floor', '2026-01-21T23:59:59.999Z', [{ slug: stories[0].slug, pageloads: 5, belowFloor: false }]),
  ]);
  const multipleQualification = deriveQualification([
    receipt('first', '2026-01-21T23:59:59.999Z', [{ slug: stories[0].slug, pageloads: 5 }]),
    receipt('second', '2026-01-22T23:59:59.999Z', [
      { slug: stories[0].slug, pageloads: 8 },
      { slug: stories[1].slug, pageloads: 6 },
    ]),
  ]);
  const historyOrderQualification = deriveQualification([
    receipt('append-first', '2026-01-22T23:59:59.999Z', [{ slug: stories[1].slug, pageloads: 5 }]),
    receipt('append-second', '2026-01-21T23:59:59.999Z', [{ slug: stories[0].slug, pageloads: 9 }]),
  ]);

  const checks = [
    ['five observations publish', snap.stories.length === 1 && snap.stories[0].observations === 5],
    ['four observations stay private', feed.stories.find((row) => row.slug.endsWith('/b')).observations === null],
    ['unknown slug rejected', !snap.stories.some((row) => row.slug === 'unknown')],
    ['average exact', snap.stories[0].averageEngagedSeconds === 120],
    ['measurement is not called people or visits', /not unique people.*not Cloudflare visits/.test(feed.measurement.caveat)],
    // ── S317 reach / attention / idle ──────────────────────────────────────
    ...selfTestNewsAudience(),
    ['reach below the floor publishes null, not a small number',
      reachFeed.stories.find((r) => r.slug.endsWith('/b')).pageloads === null],
    ['reach at the floor publishes the count',
      reachFeed.stories.find((r) => r.slug.endsWith('/a')).pageloads === 5],
    ['reach is independent of engagement — arrivals can publish while read-time is thin',
      reachFeed.stories.find((r) => r.slug.endsWith('/a')).reachState === 'sufficient'],
    ['ux event rows can never inflate reach',
      reachSnap.reach.find((r) => r.slug.endsWith('/a')).pageloads === 5],
    ['reach names what it is NOT, on the artifact',
      feed.measurement.reach.isNot.includes('people') && feed.measurement.reach.isNot.includes('deduplicated')],
    ['idle is declared as a band, never a duration',
      feed.measurement.idleTime.measured === true && feed.measurement.idleTime.metric === 'idle-band'],
    ['attentionRatio disclaims completion', feed.measurement.attentionRatio.isNot.includes('completion')],
    ['qualification: zero receipts explicitly abstains',
      zeroQualification.state === 'abstained'
        && zeroQualification.floor === 5
        && zeroQualification.qualifiedCount === 0
        && zeroQualification.firstQualified === null
        && /No engagement receipt/.test(zeroQualification.abstentionReason)],
    ['qualification: below-floor rows stay private and explicitly abstain',
      belowFloorQualification.state === 'abstained'
        && belowFloorQualification.qualifiedCount === 0
        && belowFloorQualification.firstQualified === null
        && /remain suppressed/.test(belowFloorQualification.abstentionReason)],
    ['qualification: exactly five pageloads qualifies with receipt provenance',
      atFloorQualification.state === 'qualified'
        && atFloorQualification.qualifiedCount === 1
        && atFloorQualification.firstQualified.story === stories[0].slug
        && atFloorQualification.firstQualified.receipt === 'floor'
        && atFloorQualification.firstQualified.date === '2026-01-21T23:59:59.999Z'
        && atFloorQualification.abstentionReason === null],
    ['qualification: multiple receipts count distinct qualified stories',
      multipleQualification.qualifiedCount === 2
        && multipleQualification.firstQualified.receipt === 'first'],
    ['qualification: append-only history order selects the first proving receipt',
      historyOrderQualification.firstQualified.story === stories[1].slug
        && historyOrderQualification.firstQualified.receipt === 'append-first'
        && historyOrderQualification.firstQualified.date === '2026-01-22T23:59:59.999Z'],
    ['schema version bumped with the feed contract', feed.schemaVersion === '1.2' && snap.schemaVersion === '1.1'],
  ];
  const failed = checks.filter((entry) => !entry[1]);
  checks.forEach((entry) => console.log('  ' + (entry[1] ? 'ok' : 'FAIL') + ' ' + entry[0]));
  console.log('build-news-desk-engagement --self-test: ' + (checks.length - failed.length) + '/' + checks.length + ' passed');
  process.exit(failed.length ? 1 : 0);
}

if (args.includes('--self-test')) selfTest();
const stories = corpus();
const history = readNdjson(HISTORY);
if (args.includes('--check')) {
  const expected = textFor(deriveFeed(stories, history));
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== expected) {
    console.error('news engagement feed drift — run: node scripts/build-news-desk-engagement.mjs');
    process.exit(1);
  }
  console.log('news engagement --check: ' + stories.length + ' stories · ' + ((history.at(-1) && history.at(-1).stories || []).length) + ' above privacy floor');
  process.exit(0);
}

const snapshot = deriveSnapshot(loadRaw(RAW), stories);
const previous = history.at(-1);
if (snapshot.stories.length && (!previous || previous.receiptId !== snapshot.receiptId)) {
  fs.appendFileSync(HISTORY, JSON.stringify(snapshot) + '\n');
  history.push(snapshot);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, textFor(deriveFeed(stories, history)));
console.log('news engagement → ' + stories.length + ' stories · ' + ((history.at(-1) && history.at(-1).stories || []).length) + ' above privacy floor');
