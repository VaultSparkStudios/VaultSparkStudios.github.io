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
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { renderEditorialOverlaySvg } from './lib/news-memes.mjs';
import {
  PERSONAS,
  personaById,
  DESK_ROLES,
  roleById,
  runStandards,
  editorialReview,
  reviewDay,
  similarHeadline,
  extractFigures,
  checkHorizonSpread,
  daysBetween,
  NEAR_TERM_DAYS,
  STORY_FORMATS,
  formatById,
  formatFor,
  suggestFormat,
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
  validateResolution,
  validateDirectorsReport,
  deriveDeskPerformance,
  planLedgerEntries,
  deriveCarousel,
  renderDispatchCardSvg,
  deriveClaimsFeed,
} from './lib/news-desk.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS_DIR = path.join(ROOT, 'data', 'news-desk', 'days');
const LEDGER_PATH = path.join(ROOT, 'data', 'news-desk', 'prediction-ledger.json');
const RESOLUTIONS_PATH = path.join(ROOT, 'data', 'news-desk', 'resolutions.json');
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
        body: [
          { voice: 'rex', text: 'The leaderboard era ended quietly and nobody sent a memo. The best model you can buy is no longer the best model that exists, and every roadmap still benchmarking the public tier is measuring the second-best thing on earth.' },
          { text: 'A frontier lab shipped a top-tier model in two variants, with the unrestricted one limited to approved organizations. Independent benchmark deltas between the public and vetted tiers remain unpublished.' },
          { voice: 'mara', text: 'Tiering is the first governance mechanism I have seen ship before the incident it exists to prevent, which is genuinely novel. Judge it by its audit trail rather than its announcement, and the audit trail is the part nobody has shown us yet.' },
          { voice: 'dot', text: 'Two tiers means two safety cases and two serving fleets against one revenue line. Someone is absorbing that, and it is not the customer.' },
          { voice: 'rex', text: 'You are both describing the mechanics and missing the consequence. Capability is now compounding behind a velvet rope while the entire industry benchmarks the lobby and calls it the state of the art. Every comparison chart published this quarter is measuring a deliberately handicapped artifact against another deliberately handicapped artifact, and drawing confident conclusions about where the frontier is.' },
          { voice: 'mara', text: 'That is a fair description of the problem and a terrible argument for removing the rope. The reason the vetted tier exists is that somebody looked at the unrestricted variant and decided it should not be generally available. I would like to know what they saw. Not because I assume it is alarming, but because "we withheld it" and "we withheld it for this specific measured reason" are different claims, and only one of them can be checked.' },
          { voice: 'dot', text: 'The reason will be in a filing eventually. It always is.' },
          { voice: 'mara', text: 'Filings are where reasons go to be technically disclosed. I would rather have the benchmark.' },
          { voice: 'rex', text: 'You will not get it, and you know you will not get it. Nobody voluntarily publishes the number that makes their own shipped product look like the compromise it obviously is.' },
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
        body: [
          { voice: 'dot', text: 'Eleven weeks. Flat. That is the longest the cheapest token on the market has not moved since the API era began, and nobody wrote it up because nothing happened, which is exactly the point.' },
          { text: 'Published per-token prices at the low-cost tier have been unchanged for over ten weeks across major providers, while industry capex commitments for inference infrastructure continued rising through the quarter.' },
          { voice: 'rex', text: 'Efficiency did not stop. It moved into the models. You are not paying less per token, you are getting more per token, and that is the better trade if you are building anything ambitious.' },
          { voice: 'dot', text: 'That is a real argument and it does not change the line on the chart. A flat floor means the era where you could plan around price falling underneath you has ended. Half the agent economy was priced on that assumption continuing, quietly, forever.' },
          { voice: 'rex', text: 'Half the agent economy was priced on nothing at all. That is not the floor\'s fault.' },
          { voice: 'dot', text: 'No. But it is going to be their problem.' },
          { voice: 'dot', text: 'It will be everyone\'s problem briefly, and then nobody\'s, because the companies built on the assumption will quietly stop existing and the survivors will describe their pricing discipline as strategy. That retrospective is always written by whoever got lucky on timing.' },
          { voice: 'rex', text: 'Or by whoever built something people actually wanted at the price that existed. Those are not the same company and they are not always the lucky one.' },
          { voice: 'dot', text: 'Eleven weeks is not luck. It is capex gravity arriving exactly on schedule. Someone financed a very large number of accelerators against a demand curve they drew themselves, and the interest on that debt does not care what anyone published this quarter.' },
          { voice: 'rex', text: 'And in the meantime the models got better for the same money, which is the only number most builders will ever actually feel. Nobody outside this conversation is tracking the floor. They are tracking whether the thing they shipped last quarter works better this quarter, and it does.' },
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

function articleArtPath(story) {
  return path.resolve(ROOT, String(story?.visual?.artSource || ''));
}

function assertArticleArtSources(days) {
  const artRoot = path.resolve(ROOT, 'data', 'news-desk', 'art') + path.sep;
  const seen = new Set();
  const seenHashes = new Set();
  const budgets = { '.png': 650_000, '.webp': 250_000, '.avif': 210_000 };
  for (const day of days) {
    for (const story of day.stories) {
      const source = articleArtPath(story);
      if (!source.startsWith(artRoot)) throw new Error(`${day.date}/${story.slug}: editorial art must live in data/news-desk/art/`);
      if (!fs.existsSync(source)) throw new Error(`${day.date}/${story.slug}: missing editorial art ${story.visual.artSource}`);
      if (seen.has(source)) throw new Error(`${day.date}/${story.slug}: editorial art is reused; every story needs a unique scene`);
      seen.add(source);
      const artHash = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
      if (seenHashes.has(artHash)) throw new Error(`${day.date}/${story.slug}: editorial pixels duplicate another story`);
      seenHashes.add(artHash);
      const base = path.join(ROOT, 'assets', 'og', 'news', `${day.date}--${story.slug}--meme`);
      for (const [ext, maxBytes] of Object.entries(budgets)) {
        const derivative = `${base}${ext}`;
        if (!fs.existsSync(derivative)) throw new Error(`${day.date}/${story.slug}: missing responsive editorial panel ${ext}`);
        const bytes = fs.statSync(derivative).size;
        if (bytes > maxBytes) throw new Error(`${day.date}/${story.slug}: ${ext} panel is ${bytes} bytes (budget ${maxBytes})`);
      }
    }
  }
}

export function loadResolutions() {
  const raw = readJson(RESOLUTIONS_PATH, null);
  return Array.isArray(raw?.resolutions) ? raw.resolutions : [];
}

/** Every prediction the corpus has ever made, id → {date, personaId}. */
export function predictionIndex(days = loadPublicDays()) {
  const index = new Map();
  for (const day of days) {
    for (const story of day.stories) {
      for (const p of story.predictions) index.set(p.id, { ...p, date: day.date });
    }
  }
  return index;
}

/**
 * Rebuild the ledger from committed days AND committed resolutions.
 *
 * The resolutions half is the S308 fix: this function previously passed only
 * `predictions`, so grading was destroyed on every rebuild and the desk's
 * accountability claim was unbacked by construction.
 */
export function buildLedgerFromDays(days = loadPublicDays(), resolutions = loadResolutions()) {
  const ledger = {
    schemaVersion: '1.1',
    genesis: 'The Desk public ledger · simulated preview corpus excluded',
    entries: [],
    head: null,
    depth: 0,
  };
  for (const entry of planLedgerEntries(days, resolutions)) appendLedgerEntry(ledger, entry);
  return ledger;
}

export function buildCarouselFromDisk({ generatedAt } = {}) {
  const days = loadPublicDays();
  for (const day of days) {
    const errors = validateDay(day, { today: day.date });
    if (errors.length) throw new Error(`committed day ${day.date} fails validation:\n  ${errors.join('\n  ')}`);
  }
  assertArticleArtSources(days);
  return deriveCarousel(days, { generatedAt });
}

export function buildNewsFeed(days = loadPublicDays()) {
  const newestDate = days.length ? days[days.length - 1].date : '1970-01-01';
  return {
    schemaVersion: '1.0',
    generatedAt: `${newestDate}T00:00:00.000Z`,
    version: 'https://jsonfeed.org/version/1.1',
    title: 'The Desk — AI-written news, argued on the record',
    home_page_url: `${SITE}/news/`,
    feed_url: `${SITE}/api/news-desk-feed.json`,
    // Authorship disclosure is carried in the AUTHOR field, not only in prose.
    // Aggregators, readers and agents surface `authors[].name` as the byline,
    // so a name that reads like an ordinary masthead would imply a human wrote
    // this even while the description said otherwise.
    description: 'EXPERIMENTAL, AI-GENERATED. Every word is written by AI personas — no human authors this. Source-bound AI news argued by named AI personas, with dated predictions and a public record.',
    authors: [{ name: 'The Desk — AI personas (no human author) · VaultSpark Studios', url: `${SITE}/news/` }],
    language: 'en-US',
    _vaultspark_disclosure: {
      aiGenerated: true,
      humanAuthored: false,
      experimental: true,
      personas: PERSONAS.map((p) => ({ id: p.id, name: p.name, role: p.role, kind: 'ai-persona' })),
      statement: 'The Desk is an experimental AI publication. Every story, stance, quote and prediction is generated by named AI personas. The personas are fictional characters, not people. Facts are bound to cited primary sources; the commentary around them is AI-generated and may be wrong.',
    },
    items: [...days].reverse().flatMap((day) => day.stories.map((story) => ({
      id: `${day.date}:${story.slug}`,
      url: `${SITE}/news/${day.date}/${story.slug}/`,
      title: story.headline,
      summary: story.hook,
      content_text: story.tldr,
      image: `${SITE}/assets/og/news/${day.date}--${story.slug}.png`,
      date_published: `${day.date}T00:00:00.000Z`,
      // Per-item authorship too: an item can be syndicated away from the feed
      // header, and a story quoting "REX" with no byline reads like a columnist.
      authors: [{ name: 'The Desk — AI personas (no human author)', url: `${SITE}/news/` }],
      tags: ['AI-generated', 'AI news', story.kind === 'quiet' ? 'The Quiet Story' : 'AI signal'],
      _vaultspark: {
        source_urls: [...new Set(story.facts.map((fact) => fact.sourceUrl))],
        heat: computeHeat(story.stances),
        prediction_count: story.predictions.length,
        ...(story.visual ? {
          visual: {
            social_image: `${SITE}/assets/og/news/${day.date}--${story.slug}.png`,
            editorial_panel: `${SITE}/assets/og/news/${day.date}--${story.slug}--meme.webp`,
            scene: story.visual.scene,
            alt: story.visual.alt,
            article_anchors: story.visual.anchors,
            generated_art: true,
            factual_evidence: false,
          },
        } : {}),
      },
    }))),
  };
}

/**
 * One meme panel per story, drawn in the register of whichever voice made the
 * line. The old card was a single shared layout with a different sentence in
 * it — a pull quote, not a meme. A reader should recognise WHO made a panel
 * before reading a word of it.
 */
async function rasterizeMemes(day) {
  const { default: sharp } = await import('sharp');
  const outDir = path.join(ROOT, 'assets', 'og', 'news');
  fs.mkdirSync(outDir, { recursive: true });
  let count = 0;
  for (const story of day.stories) {
    const persona = PERSONAS.find((p) => p.id === story.memeLine?.personaId);
    if (!persona || !story.memeLine?.text) continue;
    const overlay = renderEditorialOverlaySvg({
      text: story.memeLine.text,
      eyebrow: `${persona.name} · ${String(persona.bit || 'THE PANEL').toUpperCase()}`,
      footer: 'AI-GENERATED EDITORIAL ART · SOURCE-BOUND TO THIS ARTICLE',
      accent: persona.accent,
      date: day.date,
      fontSize: 46,
    });
    // On-page images need AVIF/WebP siblings and a <picture> wrapper — the
    // panels are rendered at full width, so a bare PNG is a real payload cost,
    // not a formality.
    const base = path.join(outDir, `${day.date}--${story.slug}--meme`);
    const panel = sharp(articleArtPath(story))
      .resize(1200, 630, { fit: 'cover', position: 'attention' })
      .composite([{ input: Buffer.from(overlay) }]);
    await panel.clone().png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(`${base}.png`);
    await panel.clone().webp({ quality: 80, smartSubsample: true }).toFile(`${base}.webp`);
    await panel.clone().avif({ quality: 58, effort: 6 }).toFile(`${base}.avif`);
    count += 1;
  }
  return count;
}

async function rasterizeCards(day) {
  const { default: sharp } = await import('sharp');
  const outDir = path.join(ROOT, 'assets', 'og', 'news');
  fs.mkdirSync(outDir, { recursive: true });
  let count = 0;
  for (const story of day.stories) {
    const persona = PERSONAS.find((p) => p.id === story.memeLine?.personaId);
    const overlay = renderEditorialOverlaySvg({
      text: story.headline,
      eyebrow: `${formatFor(story).name} · THE DESK`,
      footer: `${persona?.name || 'THE DESK'} · AI PERSONA · SOURCE-BOUND EDITORIAL ART`,
      accent: persona?.accent || '#ffc400',
      date: day.date,
      fontSize: 52,
    });
    await sharp(articleArtPath(story))
      .resize(1200, 630, { fit: 'cover', position: 'attention' })
      .composite([{ input: Buffer.from(overlay) }])
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .toFile(path.join(outDir, `${day.date}--${story.slug}.png`));
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

/**
 * The Director's Report card. ORSON's review is a standalone public page and a
 * shared link to it should carry the week's actual verdict.
 *
 * It has to live HERE rather than in build-og-cards (S309). That promoter does
 * rewrite generic cards automatically — but it reads og:title to pick the
 * headline, and the Desk's chromeHead deliberately emits none, so it skips
 * every news page silently. The report therefore shipped pointing at the
 * generic site card: a page presenting itself as the studio in general rather
 * than as the week's review.
 */
async function rasterizeDirectorsCard() {
  const dir = path.join(ROOT, 'data', 'news-desk', 'directors-reports');
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse();
  if (!files.length) return 0;
  const report = JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
  const { default: sharp } = await import('sharp');
  const outDir = path.join(ROOT, 'assets', 'og', 'news');
  fs.mkdirSync(outDir, { recursive: true });
  const svg = renderDispatchCardSvg({
    headline: report.headline,
    subline: `ORSON reviews the desk: who filed, who didn't, and what each writer owes the reader next.`,
    eyebrow: "THE DESK · THE DIRECTOR'S REPORT",
    footnote: `${report.period} · written by ORSON, an AI editor`,
    maxTitleLines: 3,
  });
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, 'directors-report.png'));
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

  // A grade is a public claim about a persona's record, so it is validated at
  // the same boundary as a story: an invalid resolution is never published.
  const resolutions = loadResolutions();
  const index = predictionIndex(days);
  const today = new Date().toISOString().slice(0, 10);
  for (const r of resolutions) {
    const errors = validateResolution(r, { predictions: index, today });
    if (errors.length) throw new Error(`resolution ${r.id || '?'} is invalid:\n  ${errors.join('\n  ')}`);
  }

  const ledger = buildLedgerFromDays(days, resolutions);
  const chain = verifyLedger(ledger);
  if (!chain.ok) throw new Error(`rebuilt ledger is invalid: ${chain.reason}`);
  writeJson(LEDGER_PATH, ledger);

  const carousel = buildCarouselFromDisk();
  writeJson(CAROUSEL_PATH, carousel);
  writeJson(FEED_PATH, buildNewsFeed(days));
  fs.writeFileSync(path.join(ROOT, 'api', 'news-desk-claims.ndjson'), deriveClaimsFeed(days), 'utf8');

  let cardCount = 0;
  for (const day of days) cardCount += await rasterizeCards(day);
  for (const day of days) cardCount += await rasterizeMemes(day);
  cardCount += await rasterizeDispatchCard();
  cardCount += await rasterizeDirectorsCard();
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

/* ── CORRECTIONS: grade a prediction against evidence ──────────────────── */

/**
 * `--resolve --id <p> --status correct|wrong|void --note "..." --evidence <url>`
 *
 * The Corrections desk's only write path. Validation runs BEFORE the file is
 * touched, so a bad grade cannot land and be discovered later — and grading is
 * append-only against a prediction that actually exists, which is what stops
 * the record being quietly rewritten to flatter a persona.
 */
function resolve(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const entry = {
    id: arg('--id'),
    status: arg('--status'),
    resolvedOn: arg('--on') || new Date().toISOString().slice(0, 10),
    note: arg('--note') || '',
    evidenceUrl: arg('--evidence') || '',
  };

  const index = predictionIndex();
  const errors = validateResolution(entry, { predictions: index, today: new Date().toISOString().slice(0, 10) });
  if (errors.length) {
    console.error(`✗ refusing to record this grade:\n  ${errors.join('\n  ')}`);
    if (entry.id && !index.has(entry.id)) {
      console.error(`  known prediction ids: ${[...index.keys()].join(', ') || '(none published yet)'}`);
    }
    process.exitCode = 1;
    return;
  }

  const existing = loadResolutions();
  if (existing.some((r) => r.id === entry.id)) {
    console.error(`✗ ${entry.id} is already graded — the record is append-only; publish a correction rather than overwriting it`);
    process.exitCode = 1;
    return;
  }

  const next = [...existing, entry].sort((a, b) => (a.resolvedOn < b.resolvedOn ? -1 : (a.resolvedOn > b.resolvedOn ? 1 : (a.id < b.id ? -1 : 1))));
  const doc = readJson(RESOLUTIONS_PATH, { schemaVersion: '1.0', publicSafe: true, resolutions: [] });
  writeJson(RESOLUTIONS_PATH, { ...doc, resolutions: next });

  const p = index.get(entry.id);
  const persona = PERSONAS.find((x) => x.id === p.personaId);
  console.log(`✓ ${persona?.name || p.personaId} graded ${entry.status.toUpperCase()} on ${entry.id}`);
  console.log(`  ${entry.note}`);
  console.log(`  evidence: ${entry.evidenceUrl || '(void — no outcome to cite)'}`);
  console.log('  next: node scripts/build-news-desk.mjs --rebuild');
}

/** Print the desk's own accountability state, honestly. */
function record() {
  const days = loadPublicDays();
  const resolutions = loadResolutions();
  const ledger = buildLedgerFromDays(days, resolutions);
  const records = personaTrackRecords(ledger);
  const form = personaForm(ledger);
  const index = predictionIndex(days);

  console.log(`The Desk · public record — ledger depth ${ledger.depth} · ${index.size} prediction(s) · ${resolutions.length} graded`);
  for (const p of PERSONAS) {
    const r = records[p.id];
    const acc = r.accuracy === null ? 'ungraded' : `${r.accuracy}%`;
    console.log(`  ${p.name.padEnd(5)} ${String(r.correct).padStart(2)}✓ ${String(r.wrong).padStart(2)}✗ ${String(r.open).padStart(2)}⏳  ${acc.padStart(8)}  ${form[p.id].standing}`);
  }
  const open = [...index.values()].filter((p) => !resolutions.some((r) => r.id === p.id));
  const due = open.filter((p) => p.resolveBy <= new Date().toISOString().slice(0, 10));
  if (due.length) {
    console.log(`\n  ${due.length} prediction(s) PAST DUE and ungraded — the record is stale:`);
    for (const p of due) console.log(`    ${p.id} (${p.personaId}) due ${p.resolveBy}: ${p.claim.slice(0, 70)}`);
  } else if (open.length) {
    const today = new Date().toISOString().slice(0, 10);
    const next = open.sort((a, b) => (a.resolveBy < b.resolveBy ? -1 : 1))[0];
    const wait = daysBetween(today, next.resolveBy);
    console.log(`\n  nothing due yet · next: ${next.id} on ${next.resolveBy} (${wait} days away)`);
    // Say it plainly: a record whose first grade is a year out is a promise,
    // not a track record. Standards blocks this shape in new editions, but the
    // already-published ones keep their dates — retroactively re-dating a
    // public prediction to look better would be the worst kind of correction.
    if (wait > NEAR_TERM_DAYS) {
      console.log(`  ⚠ the desk cannot be shown wrong for ${wait} days. Every published prediction is long-horizon,`);
      console.log(`    so "publicly graded" produces nothing observable until then. New editions are blocked by`);
      console.log(`    Standards unless one call comes due within ${NEAR_TERM_DAYS} days; published dates stand as written.`);
    }
  }
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
  t('persona roster is 7 and unique', PERSONAS.length === 7 && new Set(PERSONAS.map((p) => p.id)).size === 7);
  t('every voice has its own visual register',
    new Set(PERSONAS.map((p) => p.memeStyle)).size === PERSONAS.length);
  t('NIB is the cartoonist and aims at institutions, not people',
    personaById('nib')?.memeStyle === 'cartoon' && /NEVER at individuals/i.test(personaById('nib')?.forbidden || ''));
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

  // ── Resolutions: the P0 defect and its fix ──────────────────────────────
  const predIndex = new Map([['p-1', { id: 'p-1', personaId: 'rex', date: '2026-01-01' }]]);
  const goodRes = { id: 'p-1', status: 'correct', resolvedOn: '2026-06-01', note: 'The lab published the report as predicted.', evidenceUrl: 'https://a.test/proof' };
  t('a well-formed resolution validates', validateResolution(goodRes, { predictions: predIndex, today: '2026-08-08' }).length === 0);
  t('grading an unknown prediction is rejected', validateResolution({ ...goodRes, id: 'nope' }, { predictions: predIndex }).some((e) => /no known prediction/.test(e)));
  t('a grade without a receipt is punditry', validateResolution({ ...goodRes, evidenceUrl: '' }, { predictions: predIndex }).some((e) => /receipts/.test(e)));
  t('void needs a reason but no outcome citation', validateResolution({ ...goodRes, status: 'void', evidenceUrl: '' }, { predictions: predIndex }).length === 0);
  t('a resolution cannot predate its prediction', validateResolution({ ...goodRes, resolvedOn: '2025-01-01' }, { predictions: predIndex }).some((e) => /predates/.test(e)));
  t('a resolution cannot be in the future', validateResolution({ ...goodRes, resolvedOn: '2099-01-01' }, { predictions: predIndex, today: '2026-08-08' }).some((e) => /future/.test(e)));
  t('an invalid status is rejected', validateResolution({ ...goodRes, status: 'probably' }, { predictions: predIndex }).length > 0);

  const twoDays = [
    { date: '2026-01-01', stories: [{ predictions: [{ id: 'p-1', personaId: 'rex' }] }] },
    { date: '2026-07-01', stories: [{ predictions: [{ id: 'p-2', personaId: 'dot' }] }] },
  ];
  const planned = planLedgerEntries(twoDays, [goodRes]);
  t('a resolution attaches to the first day at or after it', planned[1].resolutions.some((r) => r.id === 'p-1'));
  t('a resolution never attaches to an earlier day', planned[0].resolutions.length === 0);
  t('planning is deterministic', JSON.stringify(planLedgerEntries(twoDays, [goodRes])) === JSON.stringify(planned));
  const late = planLedgerEntries(twoDays, [{ ...goodRes, resolvedOn: '2026-12-01' }]);
  t('a resolution after every published day still lands', late[late.length - 1].resolutions.length === 1 && late.length === 3);
  t('a grading gap cannot silently swallow a resolution',
    planLedgerEntries(twoDays, [goodRes, { ...goodRes, id: 'p-2', resolvedOn: '2026-12-01' }])
      .flatMap((e) => e.resolutions).length === 2);

  // The regression itself: rebuild must not discard grading.
  const rebuilt = { schemaVersion: '1.1', entries: [], head: null, depth: 0 };
  for (const e of planned) appendLedgerEntry(rebuilt, e);
  t('a rebuilt ledger retains resolutions', rebuilt.entries.flatMap((e) => e.resolutions || []).length === 1);
  t('the track record actually grades after rebuild', personaTrackRecords(rebuilt).rex.correct === 1);
  t('standing can now leave unproven once graded',
    personaTrackRecords({ entries: planned }).rex.accuracy === 100);

  // ── Standards ───────────────────────────────────────────────────────────
  const grounded = {
    headline: 'Lab commits 250 million dollars',
    tldr: 'The lab committed 250 million to the program over two years and named 10,000 participants.',
    facts: [
      { text: 'The lab committed 250 million dollars through 2027.', sourceUrl: 'https://a.test/1' },
      { text: 'The program begins with 10,000 researchers.', sourceUrl: 'https://b.test/2' },
    ],
    stances: [{ personaId: 'rex', position: 'A 250 million commitment buys 10,000 experiments.', sources: ['https://a.test/1'] }],
    predictions: [{ id: 'x', claim: 'The lab publishes an outcomes report by 2027' }],
  };
  t('a fully grounded story clears standards', runStandards(grounded).filter((f) => f.severity === 'block').length === 0);
  t('a figure absent from every source is blocked', runStandards({
    ...grounded,
    stances: [{ personaId: 'rex', position: 'Fully 40% of deployments already fail.', sources: ['https://a.test/1'] }],
  }).some((f) => /40%/.test(f.detail)));
  t('an invented figure in the summary is blocked', runStandards({ ...grounded, tldr: 'Some 87% of labs agree.' }).some((f) => /87%/.test(f.detail)));
  t('a stance with no citation is blocked', runStandards({
    ...grounded, stances: [{ personaId: 'rex', position: 'A view.', sources: [] }],
  }).some((f) => /no citation/.test(f.detail)));
  t('a source outside the ingested set is blocked', runStandards({
    ...grounded, stances: [{ personaId: 'rex', position: 'A view.', sources: ['https://evil.test/x'] }],
  }).some((f) => /outside the ingested set/.test(f.detail)));
  t('an ungradeable prediction is blocked', runStandards({
    ...grounded, predictions: [{ id: 'y', claim: 'Things will get better eventually' }],
  }).some((f) => /not falsifiable/.test(f.detail)));

  // Horizon spread — the flaw the founder caught: every published prediction
  // was 326–510 days out, so the desk could never be shown wrong in time to
  // matter, and the "publicly graded" claim would go a year producing nothing.
  const longOnly = { date: '2026-08-08', predictions: [
    { id: 'a', resolveBy: '2027-06-30' }, { id: 'b', resolveBy: '2027-12-31' },
  ] };
  t('an all-long-horizon story is blocked', checkHorizonSpread(longOnly).some((f) => /near-term/.test(f.detail)));
  t('one near-term call is enough to clear it', checkHorizonSpread({
    ...longOnly, predictions: [...longOnly.predictions, { id: 'c', resolveBy: '2026-09-15' }],
  }).length === 0);
  t('long-horizon calls are still allowed alongside a near one', checkHorizonSpread({
    date: '2026-08-08', predictions: [{ id: 'c', resolveBy: '2026-09-01' }, { id: 'd', resolveBy: '2028-01-01' }],
  }).length === 0);
  t('the block names the soonest offender', checkHorizonSpread(longOnly)[0].detail.includes('a'));
  t('a story with no predictions is not judged on spread', checkHorizonSpread({ date: '2026-08-08', predictions: [] }).length === 0);
  t('horizon spread is wired into standards', runStandards({ ...grounded, date: '2026-08-08', predictions: [{ id: 'z', claim: 'A lab ships 2 things by 2028', resolveBy: '2028-01-01' }] })
    .some((f) => /near-term/.test(f.detail)));
  t('day counting is calendar-correct', daysBetween('2026-08-08', '2026-09-07') === 30);

  // ── Formats: the desk is allowed to be funny ────────────────────────────
  const light = {
    slug: 'roast-1', format: 'roast', headline: 'A demo went sideways', hook: 'It did not go well.',
    tldr: 'The demo fell over live on stage, and the desk has thoughts about the phrase "unexpected edge case".',
    facts: [{ text: 'The live demo failed during the keynote.', sourceUrl: 'https://a.test/1' }],
    stances: [
      { personaId: 'echo', direction: -1, verdict: 'overhyped', confidence: 0.7, position: 'We have watched this exact keynote before, twice.', sources: ['https://a.test/1'] },
      { personaId: 'vera', direction: -1, verdict: 'overhyped', confidence: 0.8, position: 'That is not an edge case. That is Tuesday.', sources: ['https://a.test/1'] },
    ],
    predictions: [], transcript: [], memeLine: { text: 'That is not an edge case. That is Tuesday.', personaId: 'vera' },
    body: [{ voice: 'vera', text: 'The demo fell over live on stage, which is the only part of a keynote I have ever found relatable. Somebody called it an unexpected edge case. I have been paged for that exact edge case, on a Tuesday, twice, and the workaround is not in any documentation I could find at three in the morning. It is not an edge case. It is the shape of the thing.' }, { voice: 'echo', text: 'We have watched this exact keynote before, twice, and the pattern is always the same: the failure is more informative than the feature, and nobody writes that part up. In 2013 a very large company demonstrated a voice assistant live on stage and it misheard the presenter twice in ninety seconds. That product shipped anyway, sold reasonably well, and the demo is the only part anyone remembers a decade later, which tells you roughly how much a keynote stumble predicts about anything.' }]
  };
  t('a roast publishes with NO prediction', validateDay({ date: '2026-08-08', stories: [light] }, { today: '2026-08-08' }).length === 0);
  t('the flagship still demands a prediction', validateDay({
    date: '2026-08-08', stories: [{ ...light, format: 'debate', slug: 'd' }],
  }, { today: '2026-08-08' }).some((e) => /accountability is the product/.test(e)));
  t('a quick take may be one voice and one fact', validateDay({
    date: '2026-08-08',
    stories: [{
      ...light, format: 'quick', slug: 'q',
      tldr: 'The demo fell over live on stage and nobody in the room said anything.',
      stances: [light.stances[0]],
      body: [{ voice: 'echo', text: 'We have watched this exact keynote before, twice, and the pattern never changes: the failure teaches you more than the feature, and nobody writes that part up. In 2013 a very large company demonstrated a voice assistant live on stage and it misheard the presenter twice inside ninety seconds. That product shipped anyway, sold perfectly well for years, and the stumble is the only part anyone still remembers a decade later. Which tells you roughly how much a keynote failure predicts about anything at all, which is nothing. The demo is a performance. The thing you should want to see is the incident report from the first quarter it ran in production, and nobody has ever put one of those on a stage with the lights down and the music up.' }],
    }],
  }, { today: '2026-08-08' }).length === 0);
  const shortTake = 'The demo fell over live on stage and nobody in the room said anything.';
  t('a short tldr is fine for a quick take but not the flagship',
    validateTldr(shortTake, { range: formatById('quick').tldrRange }).length === 0
    && validateTldr(shortTake, { range: formatById('debate').tldrRange }).length > 0);
  t('an unknown format is rejected', validateDay({
    date: '2026-08-08', stories: [{ ...light, format: 'listicle' }],
  }, { today: '2026-08-08' }).some((e) => /unknown format/.test(e)));
  t('legacy stories with no format keep the flagship bar',
    formatFor({}).id === 'debate');
  t('every format still requires cited facts', validateDay({
    date: '2026-08-08', stories: [{ ...light, facts: [] }],
  }, { today: '2026-08-08' }).some((e) => /sourced fact/.test(e)));
  t('the editor does not spike a roast for agreeing', editorialReview(light).decision === 'run');
  t('the editor still spikes an argument that agrees', editorialReview({
    ...light, format: 'debate',
    stances: light.stances.map((s) => ({ ...s, direction: 1, horizon: 0 })),
    predictions: [{ id: 'p', claim: 'A lab ships 2 things by 2027', resolveBy: '2026-09-15' }], date: '2026-08-08',
  }).reasons.some((r) => /agrees with itself/.test(r)));
  t('horizon spread does not judge a format with no predictions',
    runStandards(light).filter((f) => /near-term/.test(f.detail)).length === 0);

  t('every persona owns a signature bit', PERSONAS.every((p) => p.bit && p.bitHow));
  t('signature bits are distinct', new Set(PERSONAS.map((p) => p.bit)).size === PERSONAS.length);
  t('spectacle is castable, or roasts could never run',
    PERSONAS.some((p) => p.beats.includes('spectacle')));
  t('a viral topic is proposed as a roast', suggestFormat({ beats: ['spectacle'], sourceCount: 3 }).id === 'roast');
  t('a thin single-source item becomes a quick take', suggestFormat({ beats: ['models'], sourceCount: 1 }).id === 'quick');
  t('a well-sourced beat story stays the flagship', suggestFormat({ beats: ['safety'], sourceCount: 3 }, { castSize: 3 }).id === 'debate');
  t('late night proposes the explainer', suggestFormat({ beats: ['safety'], sourceCount: 3 }, { edition: 'latenight', castSize: 3 }).id === 'explainer');
  t('formats cover both rigour and reaction',
    STORY_FORMATS.some((f) => f.minPredictions > 0) && STORY_FORMATS.some((f) => f.minPredictions === 0));
  t('single-source corroboration warns without blocking', runStandards({
    ...grounded, facts: [grounded.facts[0]],
  }).some((f) => f.severity === 'warn' && /single source/.test(f.detail)));
  t('figures normalize across formats', extractFigures('250 million and 10,000').has('250million'));
  // The false negative this regex was fixed for: a percentage must not reduce
  // to a bare number, or "40%" would match a fact saying "40 researchers".
  t('a percentage keeps its unit', extractFigures('some 40% of them').has('40%'));
  t('a percentage is not confusable with a count', !extractFigures('40 researchers').has('40%'));
  t('"percent" spelled out normalizes to %', extractFigures('40 percent').has('40%'));

  // ── The Editor ──────────────────────────────────────────────────────────
  const runnable = { ...grounded, slug: 's', stances: [
    { personaId: 'rex', direction: 2, confidence: 0.8, position: 'A 250 million commitment compounds.', sources: ['https://a.test/1'] },
    { personaId: 'dot', direction: -2, confidence: 0.8, position: 'A 250 million line item is a sales budget.', sources: ['https://a.test/1'] },
  ] };
  t('the editor runs a sourced, contested story', editorialReview(runnable).decision === 'run');
  t('the editor spikes on a standards block', editorialReview({
    ...runnable, stances: [{ personaId: 'rex', position: 'Some 99% agree.', sources: ['https://a.test/1'] }],
  }).decision === 'spike');
  t('the editor spikes a desk that agrees with itself', editorialReview({
    ...runnable,
    stances: runnable.stances.map((s) => ({ ...s, direction: 1 })),
  }).reasons.some((r) => /agrees with itself/.test(r)));
  t('the editor spikes a re-run', editorialReview(runnable, {
    publishedHeadlines: ['Lab commits 250 million dollars to program'],
  }).reasons.some((r) => /already covered/.test(r)));
  t('a spike always carries a reason', editorialReview({
    ...runnable, stances: [{ personaId: 'rex', position: 'Some 99% agree.', sources: ['https://a.test/1'] }],
  }).reasons.length > 0);
  t('a run decision explains itself too', editorialReview(runnable).reasons.length > 0);
  t('unrelated headlines are not re-runs', !similarHeadline('Lab commits funding to research', 'Regulator opens antitrust probe'));
  t('reviewDay holds the edition if any story is spiked', reviewDay({
    stories: [runnable, { ...runnable, slug: 't', stances: [{ personaId: 'rex', position: 'Some 99% agree.', sources: ['https://a.test/1'] }] }],
  }).decision === 'hold');
  t('reviewDay runs a clean edition', reviewDay({ stories: [runnable] }).decision === 'run');
  t('the newsroom has an editor, standards, corrections and a director', DESK_ROLES.length === 4
    && ['editor', 'standards', 'corrections', 'orson'].every((id) => roleById(id)));
  t('the director answers for assignments in public',
    /Director/i.test(roleById('orson')?.mandate || ''));
  t('roles are distinct from commentators', DESK_ROLES.every((r) => !PERSONAS.some((p) => p.id === r.id)));

  // ── The Director's Report ───────────────────────────────────────────────
  const perfDays = [{
    date: '2026-08-08', leadSlug: 's1',
    stories: [{ slug: 's1', headline: 'H', format: 'debate', memeLine: { personaId: 'dot' },
      body: [{ voice: 'rex', text: 'one two three four five' }, { voice: 'mara', text: 'six seven' }] }],
  }];
  const perf = deriveDeskPerformance(perfDays, { entries: [] });
  const rexRow = perf.find((r) => r.id === 'rex');
  t('performance counts words per writer, not per story', rexRow.words === 5);
  t('an assignment is counted from the body, not the cast list', rexRow.assignments === 1);
  t('the lead byline is credited', rexRow.leads === 1);
  t('panels are credited to whoever drew them', perf.find((r) => r.id === 'dot').panels === 1);
  t('writers who filed nothing still appear', perf.find((r) => r.id === 'juno').assignments === 0);
  t('performance covers the whole roster', perf.length === PERSONAS.length);

  const goodReport = {
    date: '2026-08-09', period: 'Opening week',
    headline: 'Three writers carried the week. Three did not file at all.',
    opening: 'w '.repeat(45),
    reviews: PERSONAS.map((p2, i) => ({
      personaId: p2.id, rank: i + 1,
      note: 'This is a genuine note about the work that is long enough to count as feedback and says something.',
      improve: 'Something specific to work on.',
    })),
  };
  t('a complete report validates', validateDirectorsReport(goodReport).length === 0);
  t('every writer must get something to work on', validateDirectorsReport({
    ...goodReport,
    reviews: goodReport.reviews.map((r, i) => (i === 0 ? { ...r, improve: '' } : r)),
  }).some((e) => /work on/.test(e)));
  t('ranks may not tie — a ranking that refuses to choose is not one', validateDirectorsReport({
    ...goodReport, reviews: goodReport.reviews.map((r) => ({ ...r, rank: 1 })),
  }).some((e) => /1\.\.n/.test(e)));
  t('a one-line note is not feedback', validateDirectorsReport({
    ...goodReport, reviews: goodReport.reviews.map((r, i) => (i === 0 ? { ...r, note: 'Good.' } : r)),
  }).some((e) => /too short/.test(e)));
  t('an unknown writer is rejected', validateDirectorsReport({
    ...goodReport, reviews: [...goodReport.reviews, { personaId: 'ghost', rank: 8, note: 'x '.repeat(15), improve: 'y' }],
  }).some((e) => /unknown writer/.test(e)));
  t('a thin opening is rejected — the director has to say something', validateDirectorsReport({
    ...goodReport, opening: 'Fine week.',
  }).some((e) => /too thin/.test(e)));
  t('a writer who filed nothing must be named as such', validateDirectorsReport(
    goodReport, { performance: perf },
  ).some((e) => /filed nothing/.test(e)));

  // The committed report must itself be valid — the surface is public.
  const liveReport = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'news-desk', 'directors-reports', '2026-08-09.json'), 'utf8'));
  // Scoped to the report's own date, exactly as the renderer scopes it. Left
  // unscoped this asserted the wrong thing: it demanded that a published review
  // of opening week stay consistent with work filed AFTER opening week, which is
  // only satisfiable by re-writing the verdict (S309).
  const livePerf = deriveDeskPerformance(loadPublicDays(), readJson(LEDGER_PATH, { entries: [] }), { through: liveReport.date });
  t('the published report validates against real performance',
    validateDirectorsReport(liveReport, { performance: livePerf }).length === 0);
  t('the published report ranks the whole desk', (liveReport.reviews || []).length === PERSONAS.length);

  // Both directions of the filed/did-not-file rule, on real data. A one-way rule
  // let the page print "1 assignment · 249 words" beside "Did not file."
  const laterPerf = deriveDeskPerformance(loadPublicDays(), readJson(LEDGER_PATH, { entries: [] }));
  t('an unscoped period makes a stale "did not file" note a hard error',
    validateDirectorsReport(liveReport, { performance: laterPerf }).some((e) => /did not file/.test(e)));

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
else if (args.has('--resolve')) resolve(process.argv.slice(2));
else if (args.has('--record')) record();
else {
  console.error('Usage: --self-test | --simulate | --rebuild | --check | --record');
  console.error('       --resolve --id <predictionId> --status correct|wrong|void --note "..." [--evidence <url>] [--on YYYY-MM-DD]');
  process.exitCode = 2;
}
