#!/usr/bin/env node
/**
 * build-news-desk.mjs — THE DESK (/news) publishing orchestrator.
 *
 * Modes:
 *   --self-test   hermetic proof of the pure core (scripts/lib/news-desk.mjs)
 *   --simulate    validate the permanent fixture without touching public data.
 *   --rebuild     validate committed real days and deterministically rebuild
 *                 the public ledger, claims feed, carousel, and social cards.
 *   --check       rebuild api/news-desk.json from committed days and fail on
 *                 drift (build:check integration).
 *
 * Live ingest + model debate arrive in Phase 1 behind the same validation
 * gates: a generated day that fails validateDay() is never written, so the
 * quality contract is enforced at the artifact boundary, not by hope.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PERSONAS,
  EDITIONS,
  MAX_STORIES_PER_DAY,
  castForStory,
  computeHeat,
  heatBreakdown,
  validateStance,
  validateTldr,
  scoreMemeLine,
  pickMemeLine,
  validatePrediction,
  appendLedgerEntry,
  verifyLedger,
  personaTrackRecords,
  personaForm,
  validateDay,
  deriveCarousel,
  renderNewsCardSvg,
  renderDispatchCardSvg,
  deriveClaimsFeed,
} from './lib/news-desk.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS_DIR = path.join(ROOT, 'data', 'news-desk', 'days');
const LEDGER_PATH = path.join(ROOT, 'data', 'news-desk', 'prediction-ledger.json');
const CAROUSEL_PATH = path.join(ROOT, 'api', 'news-desk.json');
const FEED_PATH = path.join(ROOT, 'api', 'news-desk-feed.json');
const SITE = 'https://vaultsparkstudios.com';

/* ── Fixture day (Phase 0 proof + permanent simulate corpus) ───────────── */

export function fixtureDay(date = '2026-08-04') {
  const resolveBy = '2026-12-31';
  const sources = {
    lab: 'https://www.anthropic.com/news/claude-fable-5-mythos-5',
    bench: 'https://arxiv.org/abs/2508.01234',
    market: 'https://www.reuters.com/technology/ai-inference-pricing-2026',
  };
  return {
    date,
    // Truth marker: this day is a pipeline dry-run, not reporting. Pages
    // built from a simulated day carry a preview banner + noindex, and the
    // section stays out of the sitemap until real days exist (CANON-031).
    simulated: true,
    leadSlug: 'frontier-tier-split',
    quietStorySlug: 'inference-price-floor',
    stories: [
      {
        slug: 'frontier-tier-split',
        kind: 'trending',
        headline: 'Frontier labs split their top models into public and vetted tiers',
        hook: 'The best model you can buy is no longer the best model that exists.',
        tldr: 'The frontier just forked. Top labs now ship two flavors of their strongest models — one for everyone, one for vetted organizations — and the gap between them is becoming the most important unpublished benchmark in AI. REX calls it a capability overhang with a waiting list; MARA calls it the first honest admission that dual-use cuts deep; DOT just wants to know who pays for two inference stacks. All three agree on one thing: pretending the public tier is the ceiling is now analytically wrong. The desk goes on record below.',
        facts: [
          { text: 'A frontier lab shipped a top-tier model in two variants, with the unrestricted variant limited to approved organizations.', sourceUrl: sources.lab },
          { text: 'Independent benchmark deltas between public and vetted tiers remain unpublished.', sourceUrl: sources.bench },
        ],
        stances: [
          { personaId: 'rex', direction: 2, verdict: 'underhyped', confidence: 0.85, position: 'The vetted tier IS the frontier now. Every roadmap that benchmarks the public model is measuring the second-best thing on earth.', sources: [sources.lab] },
          { personaId: 'mara', direction: -1, verdict: 'fair', confidence: 0.8, position: 'Tiering is the first governance mechanism that shipped before the incident it prevents. Judge it by its audit trail, not its press release.', sources: [sources.lab] },
          { personaId: 'dot', direction: 0, verdict: 'overhyped', confidence: 0.7, position: 'Two tiers means two safety cases, two serving fleets, one revenue line. Someone is eating that margin and it is not the customer.', sources: [sources.bench] },
        ],
        predictions: [
          { id: 'p-2026-08-04-rex-1', personaId: 'rex', claim: 'A third frontier lab announces a vetted-access model tier before year end', confidence: 0.8, resolveBy, status: 'open' },
          { id: 'p-2026-08-04-mara-1', personaId: 'mara', claim: 'A public benchmark measuring the public-vs-vetted capability gap is published before year end', confidence: 0.45, resolveBy, status: 'open' },
        ],
        transcript: [
          { personaId: 'rex', text: 'Say it plainly: the leaderboard era just ended. The best model has a waiting list.' },
          { personaId: 'mara', text: 'The leaderboard era ended when labs started grading their own homework. Tiering at least writes the grade down somewhere auditable.' },
          { personaId: 'dot', text: 'Two inference stacks, one price sheet. I have seen this movie. It ends in an enterprise sales deck.' },
          { personaId: 'rex', text: 'It ends in capability compounding behind a velvet rope while everyone benchmarks the lobby.' },
        ],
        memeLine: { text: 'Everyone is benchmarking the lobby.', personaId: 'rex' },
      },
      {
        slug: 'inference-price-floor',
        kind: 'quiet',
        headline: 'Inference prices quietly stopped falling this quarter',
        hook: 'The cheapest token on the market has cost the same for 11 weeks.',
        tldr: 'Nobody wrote a press release for the most important AI story of the quarter: the price-per-token floor has not moved in eleven weeks, the longest flat stretch since the API era began. DOT has been tracking it since June and says the free-fall era is over — capex gravity finally caught the curve. REX shrugs that efficiency gains now ship as capability instead of discounts, which he insists is better for everyone with ambition. MARA notes flat prices are the quiet end of the growth-at-any-cost subsidy, and subsidy ends have a way of surfacing what was propped up.',
        facts: [
          { text: 'Published per-token prices at the low-cost tier have been unchanged for over ten weeks across major providers.', sourceUrl: sources.market },
          { text: 'Industry capex commitments for inference infrastructure continued rising through the quarter.', sourceUrl: sources.market },
        ],
        stances: [
          { personaId: 'dot', direction: 2, verdict: 'underhyped', confidence: 0.9, position: 'Eleven weeks flat is not noise, it is a floor. The subsidy era of tokens is over and half the agent economy was priced on it continuing.', sources: [sources.market] },
          { personaId: 'rex', direction: -1, verdict: 'fair', confidence: 0.6, position: 'Efficiency did not stop. It moved into the models. You are not paying less per token, you are getting more per token.', sources: [sources.market] },
        ],
        predictions: [
          { id: 'p-2026-08-04-dot-1', personaId: 'dot', claim: 'At least one major provider raises a published per-token price tier before year end', confidence: 0.55, resolveBy, status: 'open' },
        ],
        transcript: [
          { personaId: 'dot', text: 'Week eleven. Flat. I brought a chart. The chart is a horizontal line.' },
          { personaId: 'rex', text: 'A horizontal line under an exponential is still a bargain.' },
          { personaId: 'dot', text: 'A bargain someone else is financing. Ask me what happens when they stop.' },
        ],
        memeLine: { text: 'I brought a chart. The chart is a horizontal line.', personaId: 'dot' },
      },
    ],
  };
}

/* ── IO helpers ────────────────────────────────────────────────────────── */

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

export function loadDays() {
  if (!fs.existsSync(DAYS_DIR)) return [];
  return fs.readdirSync(DAYS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => readJson(path.join(DAYS_DIR, f), null))
    .filter(Boolean);
}

export function loadPublicDays() {
  return loadDays()
    .filter((day) => day.simulated === false)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildLedgerFromDays(days = loadPublicDays()) {
  const ledger = {
    schemaVersion: '1.0',
    genesis: 'The Desk public ledger · simulated preview corpus excluded',
    entries: [],
    head: null,
    depth: 0,
  };
  for (const day of days) {
    appendLedgerEntry(ledger, {
      date: day.date,
      predictions: day.stories.flatMap((story) => story.predictions),
    });
  }
  return ledger;
}

export function buildCarouselFromDisk({ generatedAt } = {}) {
  const days = loadPublicDays();
  for (const day of days) {
    const errors = validateDay(day, { today: day.date });
    if (errors.length) throw new Error(`committed day ${day.date} fails validation:\n  ${errors.join('\n  ')}`);
  }
  return deriveCarousel(days, { generatedAt });
}

export function buildNewsFeed(days = loadPublicDays()) {
  const newestDate = days.length ? days[days.length - 1].date : '1970-01-01';
  return {
    schemaVersion: '1.0',
    generatedAt: `${newestDate}T00:00:00.000Z`,
    version: 'https://jsonfeed.org/version/1.1',
    title: 'The Desk — VaultSpark AI Signal',
    home_page_url: `${SITE}/news/`,
    feed_url: `${SITE}/api/news-desk-feed.json`,
    description: 'Source-bound AI news argued by named AI personas, with dated predictions and a public record.',
    authors: [{ name: 'The Desk · VaultSpark Studios', url: `${SITE}/news/` }],
    language: 'en-US',
    items: [...days].reverse().flatMap((day) => day.stories.map((story) => ({
      id: `${day.date}:${story.slug}`,
      url: `${SITE}/news/${day.date}/${story.slug}/`,
      title: story.headline,
      summary: story.hook,
      content_text: story.tldr,
      image: `${SITE}/assets/og/news/${day.date}--${story.slug}.png`,
      date_published: `${day.date}T00:00:00.000Z`,
      tags: ['AI news', story.kind === 'quiet' ? 'The Quiet Story' : 'AI signal'],
      _vaultspark: {
        source_urls: [...new Set(story.facts.map((fact) => fact.sourceUrl))],
        heat: computeHeat(story.stances),
        prediction_count: story.predictions.length,
      },
    }))),
  };
}

async function rasterizeCards(day) {
  const { default: sharp } = await import('sharp');
  const outDir = path.join(ROOT, 'assets', 'og', 'news');
  fs.mkdirSync(outDir, { recursive: true });
  let count = 0;
  for (const story of day.stories) {
    const svg = renderNewsCardSvg({
      memeLine: story.memeLine.text,
      personaId: story.memeLine.personaId,
      heat: computeHeat(story.stances),
      date: day.date,
      headline: story.headline,
    });
    await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, `${day.date}--${story.slug}.png`));
    count += 1;
  }
  return count;
}

/**
 * The Dispatch confirmation card. /news/subscribed/ is a real page and needs a
 * real social card — the OG gate correctly rejects the generic site image on
 * any non-root page, and falling back to it would have been a page presenting
 * itself as something it is not.
 */
async function rasterizeDispatchCard() {
  const { default: sharp } = await import('sharp');
  const outDir = path.join(ROOT, 'assets', 'og', 'news');
  fs.mkdirSync(outDir, { recursive: true });
  const svg = renderDispatchCardSvg({
    headline: 'Get the argument, not the noise.',
    subline: 'The day’s lead argument, the quiet story, and every prediction that came due.',
  });
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, 'dispatch-subscribed.png'));
  return 1;
}

/* ── Modes ─────────────────────────────────────────────────────────────── */

function simulate() {
  const day = fixtureDay();
  const errors = validateDay(day, { today: day.date });
  if (errors.length) {
    console.error(`✗ fixture day is invalid:\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`✓ simulate: fixture ${day.date} (${day.stories.length} stories) validates; public artifacts untouched`);
}

async function rebuild() {
  const days = loadPublicDays();
  if (days.length === 0) throw new Error('no real news days found; refusing to publish an empty desk');
  for (const day of days) {
    const errors = validateDay(day, { today: day.date });
    if (errors.length) throw new Error(`committed day ${day.date} fails validation:\n  ${errors.join('\n  ')}`);
  }

  const ledger = buildLedgerFromDays(days);
  const chain = verifyLedger(ledger);
  if (!chain.ok) throw new Error(`rebuilt ledger is invalid: ${chain.reason}`);
  writeJson(LEDGER_PATH, ledger);

  const carousel = buildCarouselFromDisk();
  writeJson(CAROUSEL_PATH, carousel);
  writeJson(FEED_PATH, buildNewsFeed(days));
  fs.writeFileSync(path.join(ROOT, 'api', 'news-desk-claims.ndjson'), deriveClaimsFeed(days), 'utf8');

  let cardCount = 0;
  for (const day of days) cardCount += await rasterizeCards(day);
  cardCount += await rasterizeDispatchCard();
  console.log(`✓ rebuild: ${days.length} real day(s) · ledger depth ${ledger.depth} · ${carousel.cards.length} carousel card(s) · ${cardCount} social card(s)`);
}

function check() {
  const expected = JSON.stringify(buildCarouselFromDisk(), null, 2) + '\n';
  const actual = fs.existsSync(CAROUSEL_PATH) ? fs.readFileSync(CAROUSEL_PATH, 'utf8') : null;
  if (loadPublicDays().length === 0) {
    // Pre-launch: no committed days yet. The artifact may be absent or dark.
    if (actual === null || readJson(CAROUSEL_PATH, {}).state === 'dark') {
      console.log('news-desk --check: pre-launch (no committed days) — ok');
      return;
    }
  }
  if (actual !== expected) {
    console.error('news-desk --check: api/news-desk.json drifted; run node scripts/build-news-desk.mjs --rebuild');
    process.exit(1);
  }
  const expectedLedger = JSON.stringify(buildLedgerFromDays(), null, 2) + '\n';
  const actualLedger = fs.existsSync(LEDGER_PATH) ? fs.readFileSync(LEDGER_PATH, 'utf8') : null;
  if (actualLedger !== expectedLedger) {
    console.error('news-desk --check: prediction ledger drifted; run node scripts/build-news-desk.mjs --rebuild');
    process.exit(1);
  }
  const expectedClaims = deriveClaimsFeed(loadPublicDays());
  const claimsPath = path.join(ROOT, 'api', 'news-desk-claims.ndjson');
  const actualClaims = fs.existsSync(claimsPath) ? fs.readFileSync(claimsPath, 'utf8') : null;
  if (actualClaims !== expectedClaims) {
    console.error('news-desk --check: claims feed drifted; run node scripts/build-news-desk.mjs --rebuild');
    process.exit(1);
  }
  const expectedFeed = JSON.stringify(buildNewsFeed(), null, 2) + '\n';
  const actualFeed = fs.existsSync(FEED_PATH) ? fs.readFileSync(FEED_PATH, 'utf8') : null;
  if (actualFeed !== expectedFeed) {
    console.error('news-desk --check: JSON Feed drifted; run node scripts/build-news-desk.mjs --rebuild');
    process.exit(1);
  }
  const chain = verifyLedger(readJson(LEDGER_PATH, { entries: [], head: null }));
  if (!chain.ok) {
    console.error(`news-desk --check: prediction ledger chain broken at ${chain.brokenAt}: ${chain.reason}`);
    process.exit(1);
  }
  console.log(`news-desk --check: carousel in sync · ledger chain verified (depth ${readJson(LEDGER_PATH, {}).depth || 0})`);
}

/* ── Self-test ─────────────────────────────────────────────────────────── */

function selfTest() {
  const cases = [];
  const t = (label, ok) => cases.push([label, ok]);

  // heat
  t('two opposed max-confidence stances → heat 100', computeHeat([
    { direction: -2, confidence: 1 }, { direction: 2, confidence: 1 },
  ]) === 100);
  t('agreement → heat 0', computeHeat([{ direction: 1, confidence: 0.9 }, { direction: 1, confidence: 0.9 }]) === 0);
  t('single stance can never heat', computeHeat([{ direction: 2, confidence: 1 }]) === 0);

  // tldr
  const day = fixtureDay();
  t('fixture tldr validates', validateTldr(day.stories[0].tldr).length === 0);
  t('a caption is rejected', validateTldr('Too short to be a summary.').length > 0);
  t('urls are rejected in tldr', validateTldr(`${'word '.repeat(50)}https://x.test`).length > 0);

  // stances
  const srcSet = new Set(['https://a.test/1']);
  t('stance with unknown source is rejected', validateStance(
    { personaId: 'rex', direction: 1, verdict: 'fair', confidence: 0.5, position: 'A perfectly reasonable position statement here.', sources: ['https://b.test/2'] },
    { sourceUrls: srcSet },
  ).some((e) => /not in the ingested set/.test(e)));
  t('sourceless stance is punditry', validateStance(
    { personaId: 'rex', direction: 1, verdict: 'fair', confidence: 0.5, position: 'A perfectly reasonable position statement here.', sources: [] },
  ).some((e) => /punditry/.test(e)));

  // predictions
  t('certainty is not a prediction', validatePrediction(
    { personaId: 'rex', claim: 'Something specific happens by the deadline', confidence: 1, resolveBy: '2099-01-01' },
    { today: '2026-08-04' },
  ).some((e) => /certainty/.test(e)));
  t('past resolveBy rejected', validatePrediction(
    { personaId: 'rex', claim: 'Something specific happens by the deadline', confidence: 0.5, resolveBy: '2020-01-01' },
    { today: '2026-08-04' },
  ).length > 0);

  // ledger
  const ledger = { schemaVersion: '1.0', entries: [], head: null, depth: 0 };
  appendLedgerEntry(ledger, { date: '2026-08-01', predictions: [{ id: 'a', personaId: 'rex' }] });
  appendLedgerEntry(ledger, { date: '2026-08-02', predictions: [{ id: 'b', personaId: 'dot' }], resolutions: [{ id: 'a', status: 'correct' }] });
  t('ledger chain verifies', verifyLedger(ledger).ok === true);
  const tampered = JSON.parse(JSON.stringify(ledger));
  tampered.entries[0].predictions[0].id = 'evil';
  t('tampered ledger is caught', verifyLedger(tampered).ok === false);
  const records = personaTrackRecords(ledger);
  t('resolved prediction grades the persona', records.rex.correct === 1 && records.rex.accuracy === 100);
  t('open prediction stays open', records.dot.open === 1 && records.dot.accuracy === null);

  // meme picker
  t('meme picker rejects urls', scoreMemeLine('see https://x.test for more') === 0);
  t('meme picker prefers the punchier line', pickMemeLine([
    { text: 'This is a somewhat long and meandering observation about artificial intelligence trends that goes on.' },
    { text: 'Everyone is benchmarking the lobby.' },
  ]).text === 'Everyone is benchmarking the lobby.');

  // day validation
  t('fixture day validates clean', validateDay(day, { today: day.date }).length === 0);
  const broken = fixtureDay();
  broken.stories[0].predictions = [];
  t('a story without predictions is rejected', validateDay(broken, { today: broken.date }).some((e) => /accountability/.test(e)));
  const four = fixtureDay();
  four.stories = [...four.stories, { ...four.stories[0], slug: 'x3' }, { ...four.stories[0], slug: 'x4' }];
  t('volume discipline: >3 stories rejected', validateDay(four, { today: four.date }).some((e) => /volume discipline/.test(e)));

  // carousel
  t('empty days derive an honest dark state', deriveCarousel([]).state === 'dark');
  const carousel = deriveCarousel([day]);
  t('carousel lead is the declared leadSlug', carousel.cards[0].slug === 'frontier-tier-split');
  t('carousel card carries tldr + meme + heat', !!carousel.cards[0].tldr && !!carousel.cards[0].memeLine && Number.isFinite(carousel.cards[0].heat));
  t('persona roster is 6 and unique', PERSONAS.length === 6 && new Set(PERSONAS.map((p) => p.id)).size === 6);
  t('founding three are retained so the ledger keeps its subjects',
    ['rex', 'mara', 'dot'].every((id) => PERSONAS.some((p) => p.id === id)));
  t('every persona declares a full voice spec',
    PERSONAS.every((p) => p.beats?.length && p.lexicon?.length && p.signature && p.forbidden && p.creed && p.question));
  t('every declared rival resolves to a real persona',
    PERSONAS.every((p) => !p.rival || PERSONAS.some((q) => q.id === p.rival)));

  // second axis — the backward-compatibility identity is the whole point
  const oneAxis = [
    { direction: -2, confidence: 1 }, { direction: 2, confidence: 1 },
  ];
  t('horizon-free stances keep the exact pre-S308 heat', computeHeat(oneAxis) === 100);
  t('a published day\'s heat cannot move when the axis is added',
    computeHeat(day.stories[0].stances) === computeHeat(day.stories[0].stances.map((s) => ({ ...s, horizon: 0 }))));
  t('agreeing on worth but splitting on timing still generates heat', computeHeat([
    { direction: 2, horizon: -2, confidence: 1 }, { direction: 2, horizon: 2, confidence: 1 },
  ]) > 0);
  t('heat stays clamped at 100 under two-axis extremes', computeHeat([
    { direction: -2, horizon: -2, confidence: 1 }, { direction: 2, horizon: 2, confidence: 1 },
  ]) === 100);
  t('optional horizon validates, out-of-range does not',
    validateStance({ personaId: 'rex', direction: 1, horizon: 2, verdict: 'fair', confidence: 0.5, position: 'A perfectly reasonable position statement here.', sources: ['https://a.test/1'] }).length === 0
    && validateStance({ personaId: 'rex', direction: 1, horizon: 9, verdict: 'fair', confidence: 0.5, position: 'A perfectly reasonable position statement here.', sources: ['https://a.test/1'] }).some((e) => /horizon/.test(e)));

  // heat breakdown names the SHAPE of the disagreement
  t('a timing-only split is labelled split-on-timing', heatBreakdown([
    { direction: 2, horizon: -2, confidence: 1 }, { direction: 2, horizon: 2, confidence: 1 },
  ]).shape === 'split-on-timing');
  t('a worth-only split is labelled split-on-worth', heatBreakdown([
    { direction: -2, horizon: 0, confidence: 1 }, { direction: 2, horizon: 0, confidence: 1 },
  ]).shape === 'split-on-worth');
  t('consensus is labelled aligned', heatBreakdown([
    { direction: 1, horizon: 1, confidence: 0.9 }, { direction: 1, horizon: 1, confidence: 0.9 },
  ]).shape === 'aligned');

  // casting
  const econCast = castForStory({ beats: ['pricing', 'funding'], size: 3 });
  t('casting seats the beat owner first', econCast[0].id === 'dot');
  t('casting seats the anchor\'s rival so a debate has an opponent',
    econCast.some((p) => p.id === 'rex'));
  t('casting is deterministic', JSON.stringify(castForStory({ beats: ['labor', 'access'], size: 3 }).map((p) => p.id))
    === JSON.stringify(castForStory({ beats: ['labor', 'access'], size: 3 }).map((p) => p.id)));
  t('different beats cast a different desk',
    JSON.stringify(castForStory({ beats: ['labor', 'access'] }).map((p) => p.id))
    !== JSON.stringify(castForStory({ beats: ['safety', 'governance'] }).map((p) => p.id)));
  t('a debate is never cast smaller than two voices', castForStory({ beats: [], size: 1 }).length >= 2);

  // editions
  t('editions cover the day and raise the cap past the legacy three',
    EDITIONS.length === 4 && MAX_STORIES_PER_DAY > 3);
  const edDay = fixtureDay();
  edDay.stories = edDay.stories.map((s, i) => ({ ...s, edition: i === 0 ? 'wire' : 'midday' }));
  t('an editioned day validates', validateDay(edDay, { today: edDay.date }).length === 0);
  const overloaded = fixtureDay();
  overloaded.stories = [0, 1, 2, 3].map((i) => ({ ...overloaded.stories[0], slug: `over-${i}`, edition: 'wire' }));
  t('per-edition cap is enforced', validateDay(overloaded, { today: overloaded.date }).some((e) => /cap is 3/.test(e)));
  const mixed = fixtureDay();
  mixed.stories = [{ ...mixed.stories[0], edition: 'wire' }, { ...mixed.stories[1] }];
  t('a half-editioned day is rejected', validateDay(mixed, { today: mixed.date }).some((e) => /mixed day/.test(e)));
  t('legacy un-editioned days still cap at three',
    validateDay(four, { today: four.date }).some((e) => /volume discipline is a feature/.test(e)));
  t('unknown edition is rejected', validateDay(
    { ...fixtureDay(), stories: [{ ...fixtureDay().stories[0], edition: 'brunch' }] }, { today: '2026-08-04' },
  ).some((e) => /unknown edition/.test(e)));

  // standing — the record drives the voice, and a thin record drives nothing
  const formLedger = { schemaVersion: '1.0', entries: [], head: null, depth: 0 };
  appendLedgerEntry(formLedger, { date: '2026-01-01', predictions: [1, 2, 3, 4, 5].map((n) => ({ id: `w${n}`, personaId: 'rex' })) });
  appendLedgerEntry(formLedger, { date: '2026-02-01', predictions: [{ id: 'q1', personaId: 'mara' }], resolutions: [1, 2, 3, 4, 5].map((n) => ({ id: `w${n}`, status: 'wrong' })) });
  const form = personaForm(formLedger);
  t('a persona with a losing record is written chastened', form.rex.standing === 'cold' && /Chastened/.test(form.rex.tone));
  t('a thin record earns no swagger', form.mara.standing === 'unproven' && /do not reference the record/.test(form.mara.tone));
  t('unresolved confidence buys no standing', form.mara.graded === 0);
  const hotLedger = { schemaVersion: '1.0', entries: [], head: null, depth: 0 };
  appendLedgerEntry(hotLedger, { date: '2026-01-01', predictions: [1, 2, 3, 4, 5].map((n) => ({ id: `c${n}`, personaId: 'dot' })) });
  appendLedgerEntry(hotLedger, { date: '2026-02-01', predictions: [], resolutions: [1, 2, 3, 4, 5].map((n) => ({ id: `c${n}`, status: 'correct' })) });
  t('a persona with a winning record is written emboldened', personaForm(hotLedger).dot.standing === 'hot');
  t('standing reports its own sample size honestly', personaForm(hotLedger).dot.graded === 5);
  const feed = buildNewsFeed([day]);
  t('JSON Feed binds every story to its canonical URL', feed.items.length === day.stories.length && feed.items.every((item) => item.url.startsWith(`${SITE}/news/`)));
  t('JSON Feed carries source provenance and accountability metadata', feed.items.every((item) => item._vaultspark.source_urls.length > 0 && item._vaultspark.prediction_count > 0));

  const failed = cases.filter(([, ok]) => !ok);
  for (const [label, ok] of cases) if (!ok) console.error(`✗ ${label}`);
  console.log(`news-desk self-test: ${cases.length - failed.length}/${cases.length} passed`);
  if (failed.length) process.exit(1);
}

const args = new Set(process.argv.slice(2));
if (args.has('--self-test')) selfTest();
else if (args.has('--simulate')) simulate();
else if (args.has('--rebuild')) rebuild().catch((error) => {
  console.error(`✗ rebuild failed: ${error.message}`);
  process.exitCode = 1;
});
else if (args.has('--check')) check();
else {
  console.error('Usage: --self-test | --simulate | --rebuild | --check');
  process.exitCode = 2;
}
