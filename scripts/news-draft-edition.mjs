#!/usr/bin/env node
/**
 * news-draft-edition.mjs — turn a queued topic into an authorable edition draft.
 *
 * This is the missing half of the cadence pipeline. `news-trend-radar.mjs`
 * finds corroborated topics; `build-news-desk.mjs` publishes validated days.
 * Between them sat a manual gap: someone had to compose a whole day artifact by
 * hand. This closes the deterministic 60% of that gap and hands off a focused
 * fill-in for the part that genuinely needs judgment.
 *
 * CANON-015 posture: this script makes NO model calls and costs nothing. The
 * authored fields are filled by a Claude Code session on the Max Plan (the
 * canon-default surface), not by a metered API call. That is deliberate — an
 * agent session can re-read the sources, notice a stance that is not actually
 * source-bound, and refuse to publish; an unattended API call at four editions
 * a day cannot, and would manufacture confident wrongness at volume.
 *
 * What is filled deterministically (no judgment required):
 *   date · slug · kind · edition slot · beats · sourced fact candidates with
 *   their URLs · the seated cast (castForStory) · each persona's voice spec and
 *   ledger standing (personaForm) · prediction ids and resolveBy dates
 *
 * What is left blank because it requires judgment:
 *   headline · hook · tldr · each stance's position/direction/horizon/
 *   confidence · transcript · meme line · prediction claims
 *
 * Drafts are written to .cache/news-drafts/ and NEVER to data/. `data/` is
 * publicly served (probed: /data/staging-deploy-history.ndjson returns 200), so
 * a half-written edition placed there would be a public artifact — and would
 * trip check-public-safe-tracking on the way in.
 *
 * Modes:
 *   --prepare [--topic <slug>] [--edition <id>] [--date YYYY-MM-DD]
 *   --status  [--date YYYY-MM-DD]   which authored fields are still blank
 *   --promote --date YYYY-MM-DD     merge completed drafts into a real day
 *   --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PERSONAS, personaById, castForStory, personaForm, editionById, EDITIONS, validateDay,
  reviewDay, runStandards, DESK_ROLES, checkHorizonSpread, daysBetween, NEAR_TERM_DAYS,
  suggestFormat, formatById,
} from './lib/news-desk.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE_PATH = path.join(ROOT, 'data', 'news-desk', 'topic-queue.json');
const LEDGER_PATH = path.join(ROOT, 'data', 'news-desk', 'prediction-ledger.json');
const DRAFT_DIR = path.join(ROOT, '.cache', 'news-drafts');
const DAYS_DIR = path.join(ROOT, 'data', 'news-desk', 'days');
const UA = 'VaultSparkNewsDesk/1.0 (+https://vaultsparkstudios.com/news/)';

const readJson = (f, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; }
};

/* ── Source text extraction ────────────────────────────────────────────── */

/**
 * Strip an HTML document to readable prose. Deliberately crude and
 * dependency-free: this feeds a HUMAN/agent reading step, not a parser, so
 * approximate text is fine. Script/style/nav content is removed first because
 * boilerplate dominates fact extraction otherwise.
 */
export function extractText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Candidate factual sentences: specific, attributable, and short enough to
 * quote. Scored so the ones a reader could actually verify float up —
 * quantities and named organizations beat adjectives.
 */
export function factCandidates(text, { max = 8 } = {}) {
  const sentences = String(text || '')
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 60 && s.length <= 260);

  const scored = sentences.map((s) => {
    let score = 0;
    if (/\d/.test(s)) score += 3;                                   // quantities
    if (/\b(percent|%|million|billion|thousand)\b/i.test(s)) score += 2;
    if (/\b(said|announced|published|reported|confirmed|will|plans to)\b/i.test(s)) score += 2;
    if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(s)) score += 1;          // proper nouns
    if (/\b(we|our|you|your)\b/i.test(s)) score -= 3;                // marketing voice
    if (/\b(sign up|learn more|contact us|subscribe)\b/i.test(s)) score -= 6;
    return { text: s, score };
  }).filter((c) => c.score > 0);

  scored.sort((a, b) => (b.score - a.score) || (a.text.length - b.text.length));
  const out = [];
  for (const c of scored) {
    if (out.length >= max) break;
    // Drop near-duplicates so one restated claim cannot fill the fact list.
    if (out.some((o) => o.text.slice(0, 60) === c.text.slice(0, 60))) continue;
    out.push(c);
  }
  return out;
}

/** Aggregator links resolve to a consent/redirect shell, never article prose. */
export const isAggregatorLink = (url) => /(^|\/\/)news\.google\.com\//i.test(String(url || ''));

/** Host of a source URL, for "this outlet already refused us" bookkeeping. */
export const sourceHost = (url) => {
  try { return new URL(String(url)).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return null; }
};

/**
 * `ok` means USABLE, not HTTP 200.
 *
 * Google News RSS links are `news.google.com/rss/articles/CBMi…` redirect
 * shells that answer 200 with no article body. Reporting those as reachable
 * produced a draft with four "ok" sources and ZERO facts — a health field that
 * described the transport while saying nothing about whether anything could be
 * written from it. A source is only usable if it yields real prose.
 */
const MIN_ARTICLE_CHARS = 900;

async function fetchSource(url) {
  if (isAggregatorLink(url)) {
    return { url, ok: false, reason: 'aggregator-redirect (no article body)', facts: [] };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: controller.signal });
    if (!res.ok) return { url, ok: false, reason: `HTTP ${res.status}`, facts: [] };
    const text = extractText(await res.text());
    const facts = factCandidates(text);
    if (text.length < MIN_ARTICLE_CHARS) return { url, ok: false, reason: `thin body (${text.length} chars)`, chars: text.length, facts };
    if (!facts.length) return { url, ok: false, reason: 'no extractable factual claims', chars: text.length, facts };
    return { url, ok: true, chars: text.length, facts };
  } catch (err) {
    return { url, ok: false, reason: String(err.name || err).slice(0, 40), facts: [] };
  } finally { clearTimeout(timer); }
}

/**
 * Pick a topic that can actually be drafted. A topic whose every source is an
 * aggregator redirect cannot yield sourced facts, and a story without ≥2
 * sourced facts can never pass validateDay() — so selecting it would guarantee
 * an unpublishable draft. Prefer primary-sourced topics, highest score first.
 */
export function draftableTopics(topics) {
  return (topics || []).filter((t) => (t.sources || []).some((s) => !isAggregatorLink(s.url)));
}

/**
 * How many ranked topics a single slot may try before giving up. Bounded so a
 * broken network cannot turn one cron slot into an unbounded crawl; 4 is deep
 * enough that a normal queue (7+ draftable topics) survives several dead
 * outlets, and shallow enough to stay inside the slot's runtime.
 */
export const MAX_TOPIC_ATTEMPTS = 4;

/** How far back the desk remembers what it already covered. */
export const NOVELTY_WINDOW_DAYS = 14;

/**
 * Words that carry no topical signal, so two headlines are not judged similar
 * for sharing them. Deliberately small: an over-broad stop list makes distinct
 * stories collide, which suppresses real news — a worse failure than an
 * occasional duplicate.
 */
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'it', 'its', 'this', 'that', 'new', 'now', 'how', 'why', 'what', 'just']);

/**
 * Crudest useful stemming: fold a trailing plural.
 *
 * Without it the two real S334 duplicates ("DeepMind Game Research" and
 * "DeepMind's AI Plays Complex Games") scored 0.375 — game and games counted as
 * different topics, which is the opposite of true. A full stemmer would be
 * dependency weight for one comparison; folding the plural recovers most of the
 * signal and cannot merge unrelated words.
 */
const stem = (w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

export function titleTokens(s) {
  return new Set(
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .map(stem)
  );
}

/** Jaccard overlap of two token sets. 0 = disjoint, 1 = identical. */
export function tokenOverlap(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/**
 * At or above this overlap, two headlines are the same story wearing a
 * different slug.
 *
 * Calibrated against the actual S334 duplicates rather than picked round: the
 * two real repeat headlines score 0.57 once plurals fold, and an unrelated AI
 * story sharing three generic tokens with a six-token headline scores ~0.33. So
 * the boundary sits between measured same-story and measured different-story,
 * not at a number that felt safe. The asymmetry is deliberate — suppressing real
 * news is a worse failure than an occasional duplicate, so when in doubt this
 * publishes.
 */
export const SAME_STORY_OVERLAP = 0.45;

/**
 * What the desk published inside the novelty window.
 *
 * `readDay` is injected so this is testable without a filesystem, and `today`
 * so a test is not hostage to the wall clock.
 */
export function recentlyPublished(dayFiles, readDay, today, windowDays = NOVELTY_WINDOW_DAYS) {
  const cutoff = Date.parse(`${today}T00:00:00Z`) - windowDays * 86400000;
  const out = [];
  for (const file of dayFiles) {
    const date = String(file).replace(/\.json$/, '');
    const ts = Date.parse(`${date}T00:00:00Z`);
    if (Number.isNaN(ts) || ts < cutoff) continue;
    const day = readDay(file);
    for (const story of day?.stories || []) {
      out.push({
        date,
        slug: story.slug,
        tokens: titleTokens(story.headline || story.slug),
        sourceUrls: new Set((story.facts || []).map((f) => f && f.sourceUrl).filter(Boolean)),
      });
    }
  }
  return out;
}

/**
 * Has the desk already covered this topic — and if so, does the queue offer a
 * genuine reason to return to it?
 *
 * S334: `selectDraftableTopic()` remembered which HOSTS had refused it (the
 * S333 fix) but nothing about what it had already published. The ranked queue is
 * stable across days, so a story that holds the top slot gets drafted again the
 * next morning: 2026-08-21, -22 and -23 all carry the slug
 * `from-atari-to-eve-online-building-on-15-years`. The duplicates were correctly
 * noindexed and canonicalised downstream, so search was never damaged — but each
 * still spent an LLM draft, an OG render, and one of the newsroom's publish
 * slots, and three days of output became one story. Containing it at publish
 * was always more expensive than declining it at selection.
 *
 * A repeat is NOT automatically wrong: a developing story with new primary
 * sources is a follow-up, which is journalism. So the rule is narrow — refuse a
 * repeat only when it brings nothing the published piece did not already cite.
 */
export function noveltyVerdict(topic, published) {
  const urls = new Set((topic.sources || []).map((s) => s && s.url).filter(Boolean));
  const tokens = titleTokens(topic.title || topic.slug);

  for (const prior of published) {
    const sameSlug = prior.slug && prior.slug === topic.slug;
    const sameStory = sameSlug || tokenOverlap(tokens, prior.tokens) >= SAME_STORY_OVERLAP;
    if (!sameStory) continue;

    const fresh = [...urls].filter((u) => !prior.sourceUrls.has(u));
    if (fresh.length) {
      return { novel: true, followUp: true, priorSlug: prior.slug, priorDate: prior.date, newSources: fresh.length };
    }
    return {
      novel: false,
      followUp: false,
      priorSlug: prior.slug,
      priorDate: prior.date,
      reason: sameSlug
        ? `already published ${prior.date} and no source has been added since`
        : `same story as "${prior.slug}" (${prior.date}) under a different slug, with no new source`,
    };
  }
  return { novel: true, followUp: false };
}

/**
 * Choose the best topic that can ACTUALLY be drafted, not merely the best one
 * that looks draftable.
 *
 * `draftableTopics()` is a STATIC filter: it asks whether a source URL is an
 * aggregator, which is a syntactic property of the string. Reachability is a
 * live property of the network, and the two disagree constantly — a publisher
 * URL is "draftable" right up until it answers 401 behind a paywall.
 *
 * Selecting only `draftable[0]` therefore staked the entire slot on one topic's
 * live behaviour: when its lone direct source 401'd, the run exited nonzero and
 * the whole edition was dropped, even though six other fully readable topics
 * were sitting in the same queue. That is the exact failure that killed eight
 * consecutive scheduled runs and left the public Desk five days stale (S333) —
 * the cadence gate downstream was honest, it was the selection that gave up
 * early.
 *
 * So: walk the ranked topics and keep going until one yields real prose. The
 * fetcher is injected so this is testable without a network.
 */
export async function selectDraftableTopic(topics, {
  fetcher = fetchSource,
  max = MAX_TOPIC_ATTEMPTS,
  maxSources = 4,
  published = [],
} = {}) {
  const ranked = draftableTopics(topics);
  const attempts = [];
  const skipped = [];
  const followUps = [];
  // Blocking is a property of the DOMAIN, not of the story. The queue is ranked
  // by newsworthiness, so one lab's blog can legitimately hold the top four
  // slots — and when that lab answers 403 to our (honestly identified) desk
  // agent, spending the whole budget re-asking the same host four times reaches
  // exactly one outlet. Remember the hosts that already refused us and spend the
  // budget on genuinely different ones instead.
  const deadDomains = new Set();
  let used = 0;

  for (const topic of ranked) {
    if (used >= max) break;

    // Novelty is checked BEFORE the attempt budget is spent, and costs nothing:
    // deciding we already covered a story needs no network. A topic we have
    // covered with nothing new to say is skipped for free, exactly like a topic
    // whose every host has already refused us this run.
    const novelty = noveltyVerdict(topic, published);
    if (!novelty.novel) {
      skipped.push({ slug: topic.slug, title: topic.title, reason: novelty.reason });
      continue;
    }
    if (novelty.followUp) {
      followUps.push({ slug: topic.slug, priorSlug: novelty.priorSlug, priorDate: novelty.priorDate, newSources: novelty.newSources });
    }

    const urls = [...new Set((topic.sources || []).map((s) => s.url))]
      .filter((u) => !isAggregatorLink(u))
      .slice(0, maxSources);
    const domains = [...new Set(urls.map(sourceHost).filter(Boolean))];

    // Every readable source sits on a host that already refused us this run:
    // skip for free rather than spending an attempt to be told the same thing.
    if (domains.length && domains.every((d) => deadDomains.has(d))) {
      skipped.push({ slug: topic.slug, title: topic.title, reason: `host already unreachable this run (${domains.join(', ')})` });
      continue;
    }

    used += 1;
    const sources = await Promise.all(urls.map((u) => fetcher(u)));
    const reachable = sources.filter((s) => s.ok);
    if (reachable.length) return { topic, sources, attempts, skipped, followUps, exhausted: false };
    for (const s of sources) {
      const host = sourceHost(s.url);
      if (host) deadDomains.add(host);
    }
    attempts.push({ slug: topic.slug, title: topic.title, sources });
  }

  // Every attempt failed. Report whether we ran out of topics or out of budget,
  // so a reader can tell "the queue is thin" from "the whole web was down".
  return {
    topic: null,
    sources: [],
    attempts,
    skipped,
    followUps,
    exhausted: used >= max && ranked.length > attempts.length + skipped.length,
  };
}

/* ── Draft assembly ────────────────────────────────────────────────────── */

/**
 * Default horizons, staggered — the FIRST prediction of a story comes due
 * inside the near-term window and later ones may run long.
 *
 * A flat 6-month default (the original) quietly reproduced the exact problem
 * the desk already had: its first four predictions all landed 326–510 days
 * out, so nothing could ever be graded soon enough for a reader to see the
 * track record work. Standards now blocks an all-long-horizon story; this
 * makes the drafter propose a compliant spread instead of one that fails.
 */
export function defaultResolveBy(date, index = 0) {
  const ladder = [45, 120, 240]; // days: one checkable soon, then structural
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (ladder[index] ?? ladder[ladder.length - 1]));
  return d.toISOString().slice(0, 10);
}

/**
 * Build the authorable skeleton. Every deterministic field is filled; every
 * judgment field is an explicit empty string so `--status` can report exactly
 * what remains rather than guessing from a partially-shaped object.
 */
export function buildDraft(topic, { date, edition, standing, sources }) {
  const ed = editionById(edition) || EDITIONS[1];
  const provisionalCast = castForStory({ beats: topic.beats, size: Math.min(4, Math.max(2, topic.speakers?.length || 3)) });
  // Match the FORM to the material before seating the desk. A viral misfire
  // gets a roast, a thin single-source item gets a quick take — answering every
  // event with the same 110-word argument is what made the desk read like an
  // audit rather than a publication.
  const fmt = suggestFormat(topic, { edition: ed.id, castSize: provisionalCast.length });
  const cast = provisionalCast.slice(0, Math.max(fmt.minStances, Math.min(provisionalCast.length, fmt.id === 'debate' ? 4 : 2)));

  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/news-draft-edition.mjs --prepare',
    publicSafe: false,
    status: 'draft',
    date,
    edition: ed.id,
    topic: { title: topic.title, slug: topic.slug, score: topic.score, beats: topic.beats, reasons: topic.reasons },

    story: {
      slug: topic.slug,
      format: fmt.id,
      kind: ed.id === 'latenight' ? 'quiet' : 'trending',
      edition: ed.id,
      headline: '',
      hook: '',
      tldr: '',
      facts: sources.flatMap((s) => s.facts.slice(0, 3).map((f) => ({ text: f.text, sourceUrl: s.url }))),
      stances: cast.map((p) => ({
        personaId: p.id, direction: null, horizon: null, verdict: '', confidence: null,
        position: '', sources: sources.filter((s) => s.ok).map((s) => s.url).slice(0, 2),
      })),
      // Only formats that actually make a claim about the future carry these.
      predictions: fmt.minPredictions === 0 ? [] : cast.slice(0, 2).map((p, i) => ({
        id: `p-${date}-${p.id}-${i + 1}`, personaId: p.id, claim: '',
        confidence: null, resolveBy: defaultResolveBy(date, i), status: 'open',
      })),
      transcript: cast.map((p) => ({ personaId: p.id, text: '' })),
      memeLine: { text: '', personaId: cast[0].id },
      body: [],
      visual: {
        artSource: `data/news-desk/art/${date}--${topic.slug}.png`,
        scene: '',
        alt: '',
        anchors: [],
        relationships: [],
        pixelInspection: { sha256: '', reviewed: false, reviewer: '', semanticVerified: false },
        generatedArt: true,
        satire: { target: '', setup: '', payoff: '', institutional: true },
      },
    },

    // Everything the authoring step needs, inline — so the session filling this
    // in never has to go hunting for a persona's voice rules or its standing.
    _authoring: {
      editionBrief: `${ed.name} (${ed.at}) — ${ed.brief}`,
      formatBrief: `${fmt.name} — ${fmt.brief}`,
      // The bit is the reason a reader comes back for a specific voice. When a
      // persona is seated, they should sound like themselves running their own
      // segment, not like a generic analyst filling a slot.
      signatureBits: cast.map((p) => `${p.name} · ${p.bit}: ${p.bitHow}`),
      toneLicence: fmt.id === 'debate' || fmt.id === 'explainer'
        ? 'Serious register. Wit is welcome; jokes are not the job here.'
        : 'Funny is the job. Be genuinely entertaining — but every stated fact still has to be real and cited. Invent a joke, never a number.',
      constraints: {
        headline: '≤90 chars',
        hook: '≤120 chars',
        tldr: `${fmt.tldrRange[0]}–${fmt.tldrRange[1]} words, ONE paragraph, no URLs, no markdown, ends on forward tension`,
        body: `${fmt.bodyWords[0]}–${fmt.bodyWords[1]} total words across 3–5 prose blocks; use only seated persona ids as voice; no markdown`,
        position: '20–220 chars, must be supported by the cited sources',
        verdict: 'exactly one of: overhyped | underhyped | fair',
        direction: '-2 overhyped … +2 underhyped',
        horizon: '-2 matters this quarter … +2 matters in a decade',
        confidence: 'stance (0,1]; prediction strictly (0,1) — certainty is not a prediction',
        claim: '15–240 chars, dated and falsifiable',
        memeLine: '8–140 chars, no URLs; short and quotable wins',
        visual: 'article-specific scene + alt (each ≥80 chars), exactly 3 verbatim article anchors, ≥1 concrete subject/action/object relationship, and institutional satire target/setup/payoff (each ≥30 chars)',
      },
      rule: 'Every stance must be defensible from the cited sources. A stance the sources do not support is punditry — cut it rather than soften it.',
      // What STANDARDS will mechanically reject, stated up front so the
      // authoring step writes to the gate rather than discovering it at promote.
      standardsWillBlock: [
        'Any figure in a stance or the TLDR that appears in NO cited fact — including a percentage. Quote the sources numbers or do not use one.',
        'A stance citing a URL outside this draft\'s ingested sources.',
        'A stance with no citation at all.',
        'A prediction with neither a date nor a measurable quantity — it could never be graded, which makes the track record unfalsifiable.',
      ],
      editorWillSpike: [
        'An edition where the desk agrees with itself (heat 0) — there is no argument to publish.',
        'A story already covered by a published headline.',
        'Any story with an unresolved standards block.',
      ],
      newsroom: DESK_ROLES.map((r) => ({ name: r.name, title: r.title, mandate: r.mandate, refuses: r.refuses })),
      cast: cast.map((p) => ({
        id: p.id, name: p.name, role: p.role, creed: p.creed, question: p.question,
        voice: p.voice, bias: p.bias, signature: p.signature, forbidden: p.forbidden,
        lexicon: p.lexicon, rival: p.rival,
        standing: standing[p.id]?.standing, toneDirective: standing[p.id]?.tone,
      })),
      sourceHealth: sources.map((s) => ({ url: s.url, ok: s.ok, reason: s.reason || null, factCandidates: s.facts.length })),
    },
  };
}

/** Which judgment fields are still blank. */
export function blankFields(draft) {
  const s = draft?.story || {};
  const missing = [];
  for (const k of ['headline', 'hook', 'tldr']) if (!s[k]) missing.push(`story.${k}`);
  if (!s.memeLine?.text) missing.push('story.memeLine.text');
  if ('body' in s && !(s.body || []).some((block) => String(block?.text || '').trim())) missing.push('story.body');
  if ('visual' in s) {
    for (const key of ['scene', 'alt']) if (!String(s.visual?.[key] || '').trim()) missing.push(`story.visual.${key}`);
    if ((s.visual?.anchors || []).length < 3) missing.push('story.visual.anchors (need 3)');
    if (!(s.visual?.relationships || []).length) missing.push('story.visual.relationships');
    for (const key of ['target', 'setup', 'payoff']) {
      if (!String(s.visual?.satire?.[key] || '').trim()) missing.push(`story.visual.satire.${key}`);
    }
  }
  (s.stances || []).forEach((st, i) => {
    if (!st.position) missing.push(`stances[${i}].position (${st.personaId})`);
    if (st.direction === null) missing.push(`stances[${i}].direction (${st.personaId})`);
    if (st.horizon === null) missing.push(`stances[${i}].horizon (${st.personaId})`);
    if (!st.verdict) missing.push(`stances[${i}].verdict (${st.personaId})`);
    if (st.confidence === null) missing.push(`stances[${i}].confidence (${st.personaId})`);
  });
  (s.predictions || []).forEach((p, i) => {
    if (!p.claim) missing.push(`predictions[${i}].claim (${p.personaId})`);
    if (p.confidence === null) missing.push(`predictions[${i}].confidence (${p.personaId})`);
  });
  (s.transcript || []).forEach((t, i) => { if (!t.text) missing.push(`transcript[${i}].text (${t.personaId})`); });
  if ((s.facts || []).length < 2) missing.push('story.facts (need ≥2 sourced facts)');
  return missing;
}

const draftPath = (date, slug) => path.join(DRAFT_DIR, `${date}--${slug}.json`);

/* ── Modes ─────────────────────────────────────────────────────────────── */

async function prepare(argv) {
  const arg = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const queue = readJson(QUEUE_PATH);
  if (!queue?.topics?.length) {
    console.error('✗ no topic queue — run: node scripts/news-trend-radar.mjs --scan');
    process.exitCode = 1;
    return;
  }

  const wanted = arg('--topic');
  const draftable = draftableTopics(queue.topics);

  let topic;
  let sources;

  if (wanted) {
    // An explicitly named topic is a human decision. Never silently substitute
    // a different story for the one that was asked for.
    topic = queue.topics.find((t) => t.slug === wanted);
    if (!topic) {
      console.error(`✗ topic not found: ${wanted}`);
      process.exitCode = 1;
      return;
    }
    const urls = [...new Set((topic.sources || []).map((s) => s.url))].slice(0, 4);
    sources = await Promise.all(urls.map(fetchSource));
    if (!sources.some((s) => s.ok)) {
      console.error(`✗ every source for ${wanted} was unreachable — refusing to draft from nothing`);
      for (const s of sources) console.error(`    ${s.url} — ${s.reason}`);
      process.exitCode = 1;
      return;
    }
  } else {
    if (!draftable.length) {
      console.error(`✗ none of the ${queue.topics.length} queued topics is draftable — every source is an aggregator redirect with no article body.`);
      console.error('  The radar corroborates across outlets via Google News, but those links cannot be read for facts.');
      console.error('  Wait for a primary-source topic (lab/regulator blog), or pass --topic <slug> to draft one manually from your own reading.');
      process.exitCode = 1;
      return;
    }
    if (draftable.length < queue.topics.length) {
      console.log(`  (${queue.topics.length - draftable.length} queued topic(s) skipped: aggregator-only sources cannot be read for facts)`);
    }

    // What the desk already said, so it does not say it again for free.
    const today = arg('--date') || new Date().toISOString().slice(0, 10);
    let dayFiles = [];
    try { dayFiles = fs.readdirSync(DAYS_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)); } catch {}
    const published = recentlyPublished(dayFiles, (f) => readJson(path.join(DAYS_DIR, f)), today);

    const picked = await selectDraftableTopic(queue.topics, { published });
    if (published.length) {
      console.log(`  · novelty: ${published.length} story/stories published in the last ${NOVELTY_WINDOW_DAYS} days are held against the queue`);
    }
    // A follow-up is a deliberate return to a developing story, not a duplicate.
    // Say so in the log, or the next reader cannot tell the two apart.
    for (const f of picked.followUps || []) {
      console.log(`  ↻ ${f.slug} is a FOLLOW-UP to "${f.priorSlug}" (${f.priorDate}) — ${f.newSources} source(s) it did not cite`);
    }
    // Say what was tried and why it lost — a dropped slot must be diagnosable
    // from the run log alone, without re-running the fetches by hand.
    for (const a of picked.attempts) {
      console.log(`  ↷ skipped ${a.slug} — no readable source:`);
      for (const s of a.sources) console.log(`      ${s.url} — ${s.reason}`);
    }
    for (const s of picked.skipped) console.log(`  ↷ skipped ${s.slug} — ${s.reason}`);
    if (!picked.topic) {
      console.error(`✗ no draftable topic yielded a readable source after ${picked.attempts.length} attempt(s) — refusing to draft from nothing`);
      if (picked.exhausted) console.error(`  Attempt budget (${MAX_TOPIC_ATTEMPTS}) reached with ${draftable.length} draftable topic(s) queued; the next slot retries.`);
      process.exitCode = 1;
      return;
    }
    ({ topic, sources } = picked);
  }

  const reachable = sources.filter((s) => s.ok);
  const date = arg('--date') || queue.generatedAt || new Date().toISOString().slice(0, 10);
  const edition = arg('--edition') || topic.edition || 'midday';

  const standing = personaForm(readJson(LEDGER_PATH, { entries: [] }));
  const draft = buildDraft(topic, { date, edition, standing, sources });

  fs.mkdirSync(DRAFT_DIR, { recursive: true });
  const out = draftPath(date, topic.slug);
  fs.writeFileSync(out, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');

  const missing = blankFields(draft);
  console.log(`✓ draft prepared → ${path.relative(ROOT, out)}`);
  console.log(`  topic: ${topic.title.slice(0, 72)}`);
  console.log(`  edition: ${draft.edition} · cast: ${draft._authoring.cast.map((c) => c.name).join(', ')}`);
  console.log(`  sources: ${reachable.length}/${sources.length} reachable · ${draft.story.facts.length} sourced fact candidate(s)`);
  for (const s of sources.filter((x) => !x.ok)) console.log(`    ⚠ unreachable: ${s.url} (${s.reason})`);
  console.log(`  ${missing.length} authored field(s) to fill — see _authoring for voice + standing`);
}

function status(argv) {
  if (!fs.existsSync(DRAFT_DIR)) { console.log('no drafts'); return; }
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const date = arg('--date');
  const files = fs.readdirSync(DRAFT_DIR).filter((f) => f.endsWith('.json') && (!date || f.startsWith(date)));
  if (!files.length) { console.log('no drafts match'); return; }
  for (const f of files) {
    const d = readJson(path.join(DRAFT_DIR, f));
    const missing = blankFields(d);
    console.log(`${missing.length === 0 ? '✓' : '◻'} ${f} — ${missing.length ? `${missing.length} blank` : 'COMPLETE'}`);
    for (const m of missing.slice(0, 8)) console.log(`    ${m}`);
    if (missing.length > 8) console.log(`    … +${missing.length - 8} more`);
  }
}

/**
 * Add a newly approved slot to an existing publication day without erasing
 * earlier slots. A repeated slug replaces its prior copy in place so retries
 * remain idempotent; genuinely new stories append in publication order.
 */
export function mergeDayArtifact(existingDay, incomingStories, date) {
  const existing = Array.isArray(existingDay?.stories) ? existingDay.stories : [];
  const incoming = Array.isArray(incomingStories) ? incomingStories : [];
  const incomingBySlug = new Map(incoming.map((story) => [story.slug, story]));
  const existingSlugs = new Set(existing.map((story) => story.slug));
  const stories = existing
    .map((story) => incomingBySlug.get(story.slug) || story)
    .concat(incoming.filter((story) => !existingSlugs.has(story.slug)));
  return {
    date,
    simulated: false,
    leadSlug: incoming[0]?.slug || existingDay?.leadSlug || stories[0]?.slug,
    quietStorySlug: incoming.find((story) => story.kind === 'quiet')?.slug
      || existingDay?.quietStorySlug
      || stories.find((story) => story.kind === 'quiet')?.slug,
    stories,
  };
}

/**
 * Merge completed drafts into a real day artifact. Fails closed: a draft with
 * any blank authored field, or a day that does not pass validateDay(), is never
 * written to data/news-desk/days/.
 */
function promote(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const date = arg('--date');
  if (!date) { console.error('✗ --promote requires --date YYYY-MM-DD'); process.exitCode = 1; return; }
  if (!fs.existsSync(DRAFT_DIR)) { console.error('✗ no drafts'); process.exitCode = 1; return; }

  const drafts = fs.readdirSync(DRAFT_DIR)
    .filter((f) => f.startsWith(date) && f.endsWith('.json'))
    .map((f) => readJson(path.join(DRAFT_DIR, f)))
    .filter(Boolean);
  if (!drafts.length) { console.error(`✗ no drafts for ${date}`); process.exitCode = 1; return; }

  const incomplete = drafts.filter((d) => blankFields(d).length);
  if (incomplete.length) {
    console.error(`✗ ${incomplete.length} draft(s) still have blank authored fields — refusing to publish a half-written edition`);
    for (const d of incomplete) console.error(`    ${d.story.slug}: ${blankFields(d).length} blank`);
    process.exitCode = 1;
    return;
  }

  const stories = drafts.map((d) => d.story);
  const out = path.join(DAYS_DIR, `${date}.json`);
  const existingDay = readJson(out, null);
  const day = mergeDayArtifact(existingDay, stories, date);
  const errors = validateDay(day, { today: date });
  if (errors.length) {
    console.error('✗ assembled day fails validation — not written:');
    for (const e of errors) console.error(`    ${e}`);
    process.exitCode = 1;
    return;
  }

  // The Editor's authority. validateDay() asked whether the edition is
  // well-formed; this asks whether it should run at all — and a well-formed
  // edition can still be unpublishable. This is the refusal mechanism that
  // makes autonomous publishing safe rather than merely fast.
  const published = [];
  const publishedSlugDates = new Map();
  if (fs.existsSync(DAYS_DIR)) {
    for (const f of fs.readdirSync(DAYS_DIR).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x) && x !== `${date}.json`)) {
      for (const s of readJson(path.join(DAYS_DIR, f), { stories: [] }).stories || []) {
        published.push(s.headline);
        if (s.slug && !s.supersededBy) publishedSlugDates.set(s.slug, f.slice(0, 10));
      }
    }
  }
  // S329: hard cross-date slug refusal. The radar's slug gate is the first
  // guard; this is the final funnel that also catches manual --topic drafts.
  // The 2026-08-21..23 triple-run shipped the same slug three days straight
  // because only rewritten HEADLINES were compared here.
  const reruns = stories.filter((s) => publishedSlugDates.has(s.slug));
  if (reruns.length) {
    console.error(`✗ ${reruns.length} story(ies) rerun a slug already published on another date — refusing to publish a duplicate:`);
    for (const s of reruns) console.error(`    ${s.slug} — first published ${publishedSlugDates.get(s.slug)}`);
    process.exitCode = 1;
    return;
  }
  const review = reviewDay(day, { publishedHeadlines: published });
  for (const r of review.stories) {
    const mark = r.decision === 'run' ? '✓' : '⛔';
    console.log(`  ${mark} EDITOR · ${r.slug}: ${r.decision.toUpperCase()}`);
    for (const reason of r.reasons) console.log(`      ${reason}`);
    for (const f of r.findings.filter((x) => x.severity === 'warn')) console.log(`      ⚠ ${f.role}: ${f.detail}`);
  }
  if (review.decision !== 'run') {
    console.error(`✗ the editor spiked ${review.spiked} story(ies) — the edition is held, nothing written`);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(DAYS_DIR, { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(day, null, 2)}\n`, 'utf8');
  console.log(`✓ promoted ${stories.length} story(ies) → ${path.relative(ROOT, out)} (${day.stories.length} total today)`);
  console.log('  next: node scripts/build-news-desk.mjs --rebuild && node scripts/generate-news-pages.mjs --apply');
}

/* ── Self-test ─────────────────────────────────────────────────────────── */

async function selfTest() {
  const cases = [];
  const t = (label, ok) => cases.push([label, ok]);

  /* novelty (S334) — the three cases that matter, plus the two failure modes
     an over-eager novelty gate would introduce. */
  const days = { '2026-08-21.json': { stories: [{ slug: 'atari-to-eve', headline: 'From Atari to EVE: DeepMind Game Research', facts: [{ sourceUrl: 'https://deepmind.example/post' }] }] } };
  const pub = recentlyPublished(Object.keys(days), (f) => days[f], '2026-08-23');
  t('published history is read from the day artifacts', pub.length === 1 && pub[0].slug === 'atari-to-eve');

  const exact = noveltyVerdict({ slug: 'atari-to-eve', title: 'From Atari to EVE: DeepMind Game Research', sources: [{ url: 'https://deepmind.example/post' }] }, pub);
  t('an identical slug with no new source is refused', exact.novel === false);

  const reslugged = noveltyVerdict({ slug: 'atari-to-eve-online-building-on-15-years', title: 'From Atari to EVE: DeepMind’s AI Plays Complex Games', sources: [{ url: 'https://deepmind.example/post' }] }, pub);
  t('the same story under a new slug is refused', reslugged.novel === false);

  const followUp = noveltyVerdict({ slug: 'atari-to-eve', title: 'From Atari to EVE: DeepMind Game Research', sources: [{ url: 'https://deepmind.example/post' }, { url: 'https://regulator.example/filing' }] }, pub);
  t('a repeat carrying a new primary source is allowed as a follow-up', followUp.novel === true && followUp.followUp === true);

  const unrelated = noveltyVerdict({ slug: 'chip-export-rules', title: 'New Export Rules Reshape Chip Supply', sources: [{ url: 'https://x.example/a' }] }, pub);
  t('an unrelated story is not suppressed by a shared common word', unrelated.novel === true);

  const stale = recentlyPublished(['2026-07-01.json'], () => days['2026-08-21.json'], '2026-08-23');
  t('history outside the window is forgotten', stale.length === 0);

  const refusedFree = await selectDraftableTopic(
    [{ slug: 'atari-to-eve', title: 'From Atari to EVE: DeepMind Game Research', sources: [{ url: 'https://deepmind.example/post' }] },
     { slug: 'fresh-one', title: 'Something Genuinely Different Happened', sources: [{ url: 'https://y.example/a' }] }],
    { published: pub, fetcher: async (url) => ({ url, ok: true, chars: 2000, facts: [{ text: 'f', score: 1 }] }) }
  );
  t('a covered topic is skipped for free and the next one is drafted', refusedFree.topic?.slug === 'fresh-one' && refusedFree.attempts.length === 0);

  const priorStory = { slug: 'morning-story', headline: 'Morning' };
  const closeStory = { slug: 'close-story', headline: 'Close' };
  const mergedDay = mergeDayArtifact({ date: '2026-08-08', leadSlug: priorStory.slug, stories: [priorStory] }, [closeStory], '2026-08-08');
  const retriedDay = mergeDayArtifact(mergedDay, [{ ...closeStory, headline: 'Close corrected' }], '2026-08-08');
  t('later slots append without erasing earlier stories', mergedDay.stories.map((story) => story.slug).join(',') === 'morning-story,close-story');
  t('the latest slot becomes the day lead', mergedDay.leadSlug === 'close-story');
  t('a retried slug replaces rather than duplicates', retriedDay.stories.length === 2 && retriedDay.stories[1].headline === 'Close corrected');

  t('scripts and styles are stripped', !/alert/.test(extractText('<script>alert(1)</script><p>Real text here.</p>')));
  t('entities decode', extractText('<p>A &amp; B</p>') === 'A & B');
  t('nav boilerplate is dropped', !/Home Menu/.test(extractText('<nav>Home Menu</nav><p>Body copy.</p>')));
  t('empty input is safe', extractText('') === '' && extractText(null) === '');

  const prose = 'OpenAI said the program will begin with 10,000 researchers and expand to 100,000 scientists through 2027. '
    + 'We think you should sign up for our newsletter today to learn more about it. '
    + 'The company confirmed that participants receive free frontier-model access and expanded research tooling.';
  const facts = factCandidates(prose);
  t('quantified claims are surfaced', facts.some((f) => /10,000 researchers/.test(f.text)));
  t('marketing voice is demoted or dropped', !facts.some((f) => /sign up for our newsletter/.test(f.text)));
  t('fact candidates are quotable length', facts.every((f) => f.text.length >= 60 && f.text.length <= 260));
  t('empty prose yields no facts', factCandidates('').length === 0);

  t('the first prediction comes due inside the near-term window',
    daysBetween('2026-08-08', defaultResolveBy('2026-08-08', 0)) <= NEAR_TERM_DAYS);
  t('later predictions may run structural',
    daysBetween('2026-08-08', defaultResolveBy('2026-08-08', 2)) > NEAR_TERM_DAYS);
  t('horizons are staggered, not flat',
    defaultResolveBy('2026-08-08', 0) !== defaultResolveBy('2026-08-08', 1));
  t('resolveBy rolls the year correctly', defaultResolveBy('2026-12-20', 0) === '2027-02-03');

  const topic = { title: 'Lab ships agent control roadmap', slug: 'lab-ships-agent-control-roadmap', score: 70, beats: ['safety', 'agents'], reasons: [], speakers: ['mara', 'vera'], sources: [{ url: 'https://a.test/1' }] };
  const standing = personaForm({ entries: [] });
  const sources = [{ url: 'https://a.test/1', ok: true, facts: [{ text: 'x'.repeat(80) }, { text: 'y'.repeat(80) }] }];
  const draft = buildDraft(topic, { date: '2026-08-08', edition: 'midday', standing, sources });

  t('draft is marked not-public-safe', draft.publicSafe === false);
  // Cast size follows the FORMAT, not a fixed number — a quick take is one
  // voice by design, and demanding three there would recreate the monotony
  // formats exist to break.
  t('draft seats a real cast sized for its format',
    draft.story.stances.length >= formatById(draft.story.format).minStances
    && draft.story.stances.every((s) => personaById(s.personaId)));
  t('every seated persona gets a voice spec + standing', draft._authoring.cast.every((c) => c.voice && c.toneDirective));
  t('facts carry their source url', draft.story.facts.every((f) => /^https?:/.test(f.sourceUrl)));
  t('prediction ids are unique', new Set(draft.story.predictions.map((p) => p.id)).size === draft.story.predictions.length);
  t('prediction resolveBy is in the future', draft.story.predictions.every((p) => p.resolveBy > draft.date));
  t('late night drafts the quiet story', buildDraft(topic, { date: '2026-08-08', edition: 'latenight', standing, sources }).story.kind === 'quiet');

  const missing = blankFields(draft);
  t('a fresh draft reports its blanks', missing.length > 0);
  t('blanks name the judgment fields', missing.some((m) => /tldr/.test(m)) && missing.some((m) => /position/.test(m)));
  t('a filled draft reports none', blankFields({
    story: {
      headline: 'h', hook: 'k', tldr: 'body', memeLine: { text: 'm' },
      facts: [{ text: 'a' }, { text: 'b' }],
      stances: [{ personaId: 'rex', position: 'p', direction: 1, horizon: 0, verdict: 'fair', confidence: 0.5 }],
      predictions: [{ personaId: 'rex', claim: 'c', confidence: 0.5 }],
      transcript: [{ personaId: 'rex', text: 't' }],
    },
  }).length === 0);
  t('a blank stance confidence is caught', blankFields({
    story: {
      headline: 'h', hook: 'k', tldr: 'b', memeLine: { text: 'm' },
      facts: [{ text: 'a' }, { text: 'b' }],
      stances: [{ personaId: 'rex', position: 'p', direction: 1, horizon: 0, verdict: 'fair', confidence: null }],
      predictions: [], transcript: [],
    },
  }).some((m) => /confidence/.test(m)));
  t('too few facts is caught', blankFields({
    story: {
      headline: 'h', hook: 'k', tldr: 'b', memeLine: { text: 'm' },
      facts: [{ text: 'a' }], stances: [], predictions: [], transcript: [],
    },
  }).some((m) => /facts/.test(m)));

  t('the authoring brief states what standards will block', draft._authoring.standardsWillBlock.length >= 4);
  t('the authoring brief names the newsroom roles', draft._authoring.newsroom.length === DESK_ROLES.length);
  t('a draft that would be spiked is caught before promote', reviewDay({
    stories: [{ slug: 's', headline: 'h', tldr: 'Some 90% agree.', facts: [{ text: 'a', sourceUrl: 'https://a.test/1' }], stances: [{ personaId: 'rex', position: 'A view.', sources: ['https://a.test/1'] }], predictions: [] }],
  }).decision === 'hold');
  t('standards run over a draft story without throwing', Array.isArray(runStandards(draft.story)));
  // The drafter must PROPOSE a compliant horizon spread, not hand the authoring
  // step a skeleton that Standards will reject at promote.
  t('a prepared draft already clears the horizon-spread rule',
    checkHorizonSpread({ ...draft.story, date: draft.date }).length === 0);
  t('the drafter proposes a format rather than defaulting to the flagship',
    Boolean(formatById(draft.story.format)));
  t('the draft carries only the predictions its format calls for',
    draft.story.predictions.length === (formatById(draft.story.format).minPredictions === 0
      ? 0
      : draft.story.predictions.length));
  t('a light format drafts NO prediction — the whole point of formats',
    buildDraft({ ...topic, beats: ['spectacle'], sourceCount: 3 }, { date: '2026-08-08', edition: 'wire', standing, sources })
      .story.predictions.length === 0);
  // When a format DOES carry predictions, the first must still be checkable soon.
  const flagshipDraft = buildDraft({ ...topic, beats: ['safety', 'agents', 'evaluation'], sourceCount: 3, speakers: ['mara', 'vera', 'rex'] },
    { date: '2026-08-08', edition: 'midday', standing, sources });
  t('a flagship draft carries predictions', flagshipDraft.story.predictions.length > 0);
  t('the drafted near-term call is genuinely near-term',
    daysBetween(flagshipDraft.date, flagshipDraft.story.predictions[0].resolveBy) <= NEAR_TERM_DAYS);
  t('a spectacle topic drafts as a roast',
    buildDraft({ ...topic, beats: ['spectacle'], sourceCount: 3 }, { date: '2026-08-08', edition: 'wire', standing, sources }).story.format === 'roast');
  t('the authoring brief licenses humour on light formats',
    /Funny is the job/.test(buildDraft({ ...topic, beats: ['spectacle'], sourceCount: 3 }, { date: '2026-08-08', edition: 'wire', standing, sources })._authoring.toneLicence));
  t('the authoring brief hands each voice its own column',
    draft._authoring.signatureBits.length === draft.story.stances.length);

  t('drafts never target the served data/ tree', !DRAFT_DIR.includes(`${path.sep}data${path.sep}`));
  t('roster is available to the authoring brief', PERSONAS.length >= 3);

  // The regression that produced a draft with 4 "ok" sources and 0 facts.
  t('a google news redirect is recognised as an aggregator link',
    isAggregatorLink('https://news.google.com/rss/articles/CBMi8AFBVV95cUx'));
  t('a real publisher url is not an aggregator link',
    !isAggregatorLink('https://www.reuters.com/technology/some-story'));
  t('aggregator-only topics are excluded from selection', draftableTopics([
    { slug: 'a', sources: [{ url: 'https://news.google.com/rss/articles/X' }] },
  ]).length === 0);
  t('a topic with one readable source is draftable', draftableTopics([
    { slug: 'b', sources: [{ url: 'https://news.google.com/rss/articles/X' }, { url: 'https://openai.com/index/a' }] },
  ]).length === 1);
  t('draftability is decided per topic, not per queue', draftableTopics([
    { slug: 'a', sources: [{ url: 'https://news.google.com/rss/articles/X' }] },
    { slug: 'b', sources: [{ url: 'https://deepmind.google/blog/x' }] },
  ]).map((t2) => t2.slug).join() === 'b');
  t('an empty queue yields nothing draftable', draftableTopics([]).length === 0 && draftableTopics(null).length === 0);

  // S333 regression lock. Eight consecutive scheduled runs were lost because
  // selection stopped at draftable[0]: that topic passed the STATIC aggregator
  // filter, then its only direct source answered 401, and the slot was dropped
  // while six readable topics waited in the same queue.
  const deadUrl = 'https://paywalled.test/story';
  const liveUrl = 'https://openai.com/index/live';
  const fakeFetch = async (url) => (url === liveUrl
    ? { url, ok: true, chars: 2000, facts: [{ text: 'A fact.', score: 5 }] }
    : { url, ok: false, reason: 'HTTP 401', facts: [] });
  const twoTopics = [
    { slug: 'dead', title: 'Dead', sources: [{ url: deadUrl }] },
    { slug: 'live', title: 'Live', sources: [{ url: liveUrl }] },
  ];

  const fellBack = await selectDraftableTopic(twoTopics, { fetcher: fakeFetch });
  t('a topic whose live sources all fail falls back to the next ranked topic',
    fellBack.topic?.slug === 'live');
  t('the fallback reports which topics it skipped and why',
    fellBack.attempts.length === 1
    && fellBack.attempts[0].slug === 'dead'
    && fellBack.attempts[0].sources[0].reason === 'HTTP 401');
  t('rank order is preserved when the top topic is readable',
    (await selectDraftableTopic([twoTopics[1], twoTopics[0]], { fetcher: fakeFetch })).topic?.slug === 'live');
  t('a fully unreachable queue still refuses to draft',
    (await selectDraftableTopic([twoTopics[0]], { fetcher: fakeFetch })).topic === null);
  t('aggregator-only topics are never attempted by the fallback',
    (await selectDraftableTopic([{ slug: 'agg', sources: [{ url: 'https://news.google.com/rss/articles/X' }] }],
      { fetcher: fakeFetch })).attempts.length === 0);
  t('the attempt budget is bounded', (await selectDraftableTopic(
    Array.from({ length: 12 }, (_, i) => ({ slug: `d${i}`, sources: [{ url: `https://dead${i}.test/a` }] })),
    { fetcher: fakeFetch },
  )).attempts.length === MAX_TOPIC_ATTEMPTS);
  t('exhausting the budget is distinguished from exhausting the queue',
    (await selectDraftableTopic(
      Array.from({ length: 12 }, (_, i) => ({ slug: `d${i}`, sources: [{ url: `https://dead${i}.test/a` }] })),
      { fetcher: fakeFetch },
    )).exhausted === true
    && (await selectDraftableTopic([twoTopics[0]], { fetcher: fakeFetch })).exhausted === false);

  // S333: a single blocked HOST must not consume the whole attempt budget. The
  // real queue ranked four consecutive openai.com stories on top; when that host
  // answered 403 the budget was spent asking one outlet four times, and the
  // readable huggingface.co story further down was never reached.
  const oneHostThenOther = [
    ...Array.from({ length: 5 }, (_, i) => ({ slug: `blocked${i}`, sources: [{ url: `https://blocked.test/${i}` }] })),
    { slug: 'reachable', sources: [{ url: liveUrl }] },
  ];
  const hostAware = await selectDraftableTopic(oneHostThenOther, { fetcher: fakeFetch });
  t('one blocked host does not consume the whole attempt budget',
    hostAware.topic?.slug === 'reachable');
  t('further topics on an already-refused host are skipped without an attempt',
    hostAware.attempts.length === 1 && hostAware.skipped.length === 4);
  t('a host is only presumed dead after it actually refused us',
    hostAware.attempts[0].slug === 'blocked0');


  const failed = cases.filter(([, ok]) => !ok);
  for (const [label, ok] of cases) if (!ok) console.error(`✗ ${label}`);
  console.log(`news-draft-edition --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  if (failed.length) process.exit(1);
}

/**
 * RUN_DIRECT guard (S319). This module exports `blankFields`, which
 * `author-news-edition.mjs` imports on every scheduled run. Without this guard
 * the import fell through to the usage branch below, printing "Usage: …" and
 * setting `process.exitCode = 2` — so the publisher would have reported failure
 * on every successful edition. A side-effecting script that is also a module
 * must dispatch only when it is the entrypoint.
 */
const RUN_DIRECT = process.argv[1]?.endsWith('news-draft-edition.mjs');
const argv = process.argv.slice(2);
if (RUN_DIRECT) {
  if (argv.includes('--self-test')) await selfTest();
  else if (argv.includes('--prepare')) await prepare(argv);
  else if (argv.includes('--status')) status(argv);
  else if (argv.includes('--promote')) promote(argv);
  else {
    console.error('Usage: --prepare [--topic <slug>] [--edition <id>] [--date <YYYY-MM-DD>] | --status | --promote --date <YYYY-MM-DD> | --self-test');
    process.exitCode = 2;
  }
}
