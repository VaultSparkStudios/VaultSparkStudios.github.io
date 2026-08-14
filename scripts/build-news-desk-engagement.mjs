#!/usr/bin/env node
/**
 * Public, privacy-thresholded engagement receipt for every Desk article.
 * Raw rows stay in ignored cache/R2. Only story aggregates with at least five
 * completed observations may enter the public append-only history.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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
        if (row && row.measurement === 'visible-and-focused-seconds' && row.slug && row.ts) out.push(row);
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
  const stories = [];
  for (const [slug, values] of [...grouped.entries()].sort()) {
    if (values.length < MIN_OBSERVATIONS) continue;
    const durationBuckets = { under30: 0, '30to59': 0, '60to119': 0, '120to299': 0, '300plus': 0 };
    for (const value of values) durationBuckets[bucket(value)]++;
    const total = values.reduce((sum, value) => sum + value, 0);
    stories.push({
      slug,
      observations: values.length,
      totalEngagedSeconds: total,
      averageEngagedSeconds: Math.round(total / values.length),
      durationBuckets,
    });
  }
  const payload = {
    schemaVersion: '1.0',
    observedThrough: new Date(end.getTime() - 1).toISOString(),
    windowStart: start.toISOString(),
    windowEndExclusive: end.toISOString(),
    windowDays: WINDOW_DAYS,
    minObservations: MIN_OBSERVATIONS,
    stories,
  };
  return { ...payload, receiptId: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 20) };
}

export function deriveFeed(stories, historyRows) {
  const latest = historyRows.at(-1) || null;
  const bySlug = new Map((latest && latest.stories || []).map((row) => [row.slug, row]));
  return {
    schemaVersion: '1.0',
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
    },
    sourceReceiptId: latest && latest.receiptId || null,
    observedThrough: latest && latest.observedThrough || null,
    stories: stories.map((story) => {
      const measured = bySlug.get(story.slug);
      return measured ? {
        ...story,
        state: 'sufficient',
        observations: measured.observations,
        averageEngagedSeconds: measured.averageEngagedSeconds,
        durationBuckets: measured.durationBuckets,
        windowDays: WINDOW_DAYS,
      } : {
        ...story,
        state: latest ? 'insufficient' : 'unavailable',
        observations: null,
        averageEngagedSeconds: null,
        durationBuckets: null,
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
  const checks = [
    ['five observations publish', snap.stories.length === 1 && snap.stories[0].observations === 5],
    ['four observations stay private', feed.stories.find((row) => row.slug.endsWith('/b')).observations === null],
    ['unknown slug rejected', !snap.stories.some((row) => row.slug === 'unknown')],
    ['average exact', snap.stories[0].averageEngagedSeconds === 120],
    ['measurement is not called people or visits', /not unique people.*not Cloudflare visits/.test(feed.measurement.caveat)],
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
