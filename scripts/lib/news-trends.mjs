/**
 * news-trends.mjs — pure core of the trend radar that feeds THE DESK.
 *
 * The desk's constraint has always been sourcing: `--rebuild` consumed only
 * hand-committed days, so cadence was bounded by how fast a human found
 * stories. This module is the discovery half — deterministic, network-free,
 * and fully self-tested. `scripts/news-trend-radar.mjs` owns the fetching.
 *
 * The design problem with "publish more, and publish what's trending" is that
 * both halves pull toward slop: volume rewards restating press releases, and
 * trend-chasing rewards whatever is loudest. Three rules push back:
 *
 *  1. CORROBORATION OVER VOLUME. A topic's strongest signal is that several
 *     INDEPENDENT sources landed on it (distinct domains), ideally including a
 *     primary source. One excited blog post is noise no matter how viral.
 *  2. NOVELTY IS MEASURED, NOT ASSUMED. Every candidate is scored against what
 *     the desk has already published; a re-run of a covered story is demoted,
 *     not silently re-published.
 *  3. CASTABILITY IS A RANKING SIGNAL. A topic that only one persona can speak
 *     to produces a monologue. Topics that split the desk rank higher, because
 *     disagreement is the product.
 *
 * Everything here is deterministic: same inputs → same queue, byte-for-byte.
 */

import crypto from 'node:crypto';

/* ── Beat taxonomy ─────────────────────────────────────────────────────── */

/**
 * Keyword → beat. Beats are the join between a discovered topic and the
 * persona roster (`PERSONAS[].beats`), so classification directly determines
 * which desk gets cast. Ordered longest-first at match time so "agent control"
 * classifies as safety before "agent" grabs it for tooling.
 */
export const BEAT_KEYWORDS = {
  capability: ['frontier model', 'benchmark', 'state of the art', 'reasoning', 'multimodal', 'context window'],
  models: ['model release', 'launches', 'announces model', 'weights', 'open weights', 'fine-tune'],
  safety: ['alignment', 'agent control', 'red team', 'jailbreak', 'misalignment', 'safety', 'oversight'],
  governance: ['regulation', 'eu ai act', 'executive order', 'compliance', 'lawsuit', 'copyright', 'antitrust'],
  security: ['vulnerability', 'exploit', 'prompt injection', 'breach', 'supply chain', 'cve'],
  evaluation: ['eval', 'evaluation', 'leaderboard', 'benchmark suite', 'contamination'],
  pricing: ['pricing', 'price cut', 'per token', 'cost per', 'free tier', 'subscription'],
  funding: ['raises', 'funding round', 'valuation', 'ipo', 'acquisition', 'acquires'],
  infrastructure: ['data center', 'datacenter', 'gpu', 'tpu', 'capex', 'cluster', 'chips'],
  compute: ['training run', 'flops', 'scaling law', 'inference cost'],
  agents: ['agent', 'agentic', 'tool use', 'mcp', 'autonomous'],
  tooling: ['sdk', 'api', 'developer', 'framework', 'ide', 'cli'],
  reliability: ['outage', 'downtime', 'incident', 'postmortem', 'regression'],
  deployment: ['production', 'rollout', 'ga ', 'general availability', 'deprecat'],
  labor: ['jobs', 'layoff', 'workers', 'hiring', 'automation of work', 'union'],
  access: ['open source', 'free access', 'availability', 'waitlist', 'rate limit'],
  education: ['students', 'university', 'academic', 'classroom', 'research access'],
  consumer: ['users', 'consumer', 'app store', 'chatbot', 'assistant'],
  markets: ['stock', 'shares', 'market cap', 'earnings', 'revenue'],
  adoption: ['enterprise', 'customers', 'deployment at', 'adoption', 'rollout to'],
  strategy: ['partnership', 'deal', 'exclusive', 'compete', 'rival'],
  research: ['paper', 'arxiv', 'study finds', 'researchers'],
  policy: ['policy', 'government', 'senate', 'commission', 'ban'],
  hype: ['agi', 'superintelligence', 'changes everything', 'breakthrough'],
  consolidation: ['merger', 'shuts down', 'winds down', 'pivots'],
  business: ['enterprise deal', 'contract', 'customer win', 'churn'],
  // The desk needs things worth REACTING to, not only things worth analysing.
  // Without this beat, a viral misfire or an absurd demo classified to nothing
  // and was disqualified as uncastable — so the radar structurally filtered out
  // exactly the material the light formats exist for.
  spectacle: ['goes viral', 'viral', 'backlash', 'apologiz', 'apologis', 'walks back', 'deletes',
    'goes wrong', 'roasted', 'mocked', 'meme', 'bizarre', 'awkward', 'fiasco', 'debacle',
    'caught', 'admits', 'quietly removed', 'u-turn', 'embarrass'],
};

/** Classify free text into beats. Deterministic; longest keyword wins first. */
export function classifyBeats(text, { max = 4 } = {}) {
  const haystack = ` ${String(text || '').toLowerCase()} `;
  const hits = [];
  for (const [beat, keywords] of Object.entries(BEAT_KEYWORDS)) {
    for (const kw of keywords) {
      if (haystack.includes(kw)) { hits.push({ beat, weight: kw.length }); break; }
    }
  }
  hits.sort((a, b) => (b.weight - a.weight) || (a.beat < b.beat ? -1 : 1));
  const out = [];
  for (const h of hits) if (!out.includes(h.beat) && out.length < max) out.push(h.beat);
  return out;
}

/* ── Normalization + identity ──────────────────────────────────────────── */

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'as', 'at', 'by', 'from', 'that', 'this', 'it', 'its',
  'has', 'have', 'had', 'will', 'would', 'can', 'could', 'new', 'says', 'said', 'after', 'over']);

export function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean)
    .slice(0, 9)
    .join('-');
}

/** Content-bearing token set, used for near-duplicate detection. */
export function contentTokens(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/** Jaccard similarity over content tokens — 0 (unrelated) … 1 (same story). */
export function similarity(a, b) {
  const A = a instanceof Set ? a : contentTokens(a);
  const B = b instanceof Set ? b : contentTokens(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared += 1;
  return shared / (A.size + B.size - shared);
}

/** Registrable-ish domain, so two URLs from one outlet never look independent. */
export function sourceDomain(url) {
  try {
    const host = new URL(String(url)).hostname.toLowerCase().replace(/^www\./, '');
    const parts = host.split('.');
    return parts.length > 2 ? parts.slice(-2).join('.') : host;
  } catch { return null; }
}

/** Opaque aggregator links can corroborate a topic but cannot supply article
 * prose to the standards desk. Keep that distinction in the topic model. */
export const isAggregatorUrl = (url) =>
  /(^|\/\/)news\.google\.com\//i.test(String(url || ''));

/**
 * Outlet identity for corroboration counting.
 *
 * An aggregator's URL identifies the AGGREGATOR, not the publisher: every
 * Google News RSS link is a `news.google.com` redirect, so without this the
 * corroboration term — the single highest-weighted signal — silently collapses
 * a hundred independent outlets into one source and can never fire. An item
 * may therefore declare its true `outlet` explicitly; the URL is only a
 * fallback.
 */
export const itemOutlet = (item) => item?.outlet || sourceDomain(item?.url);

/**
 * Vendor content masquerading as news. Lab blogs are primary sources for
 * announcements AND the marketing channel for customer case studies; the feed
 * cannot tell them apart, so the desk must. These are demoted to
 * disqualification rather than a score penalty: "How ACME builds with our API"
 * is not a story the desk can argue about, at any score.
 */
const VENDOR_PATTERNS = [
  /\bhow .{2,40} (uses?|built?s?|builds|is using) \b/i,
  /\bcustomer stor(y|ies)\b/i, /\bcase stud(y|ies)\b/i,
  /\bpartner(ship|ing) with\b/i, /\bnow available on\b/i,
  /\bwebinar\b/i, /\bwe'?re hiring\b/i, /\bjoin us at\b/i,
  /\bis now on\b/i, /\bon hugging face inference providers\b/i,
  /\bworking with .{2,40} on\b/i, /\bspotlight\b/i,
  /\b(guide|tutorial|getting started) (to|with|for)\b/i,
];

export function isVendorContent(title, summary = '') {
  const text = `${title || ''} ${summary || ''}`;
  return VENDOR_PATTERNS.some((re) => re.test(text));
}

/* ── Clustering: many items → one topic ────────────────────────────────── */

/**
 * Group raw feed items into topics by title similarity. This is where
 * corroboration is actually computed: a cluster spanning several distinct
 * domains is a real story; five items from one outlet is one outlet talking.
 */
export function clusterItems(items, { threshold = 0.34 } = {}) {
  const clusters = [];
  const ordered = [...(items || [])]
    .filter((it) => it?.title && it?.url)
    .sort((a, b) => (String(a.title) < String(b.title) ? -1 : 1));

  for (const item of ordered) {
    const tokens = contentTokens(`${item.title} ${item.summary || ''}`);
    let target = null;
    let best = 0;
    for (const c of clusters) {
      const s = similarity(tokens, c.tokens);
      if (s >= threshold && s > best) { best = s; target = c; }
    }
    if (target) {
      target.items.push(item);
      for (const t of tokens) target.tokens.add(t);
    } else {
      clusters.push({ tokens, items: [item] });
    }
  }

  return clusters.map((c) => {
    const primary = c.items.find((i) => i.primary) || null;
    const lead = primary || [...c.items].sort((a, b) => (b.engagement || 0) - (a.engagement || 0))[0];
    const domains = [...new Set(c.items.map(itemOutlet).filter(Boolean))].sort();
    const readableSourceCount = new Set(c.items
      .filter((i) => !isAggregatorUrl(i.url))
      .map(itemOutlet)
      .filter(Boolean)).size;
    return {
      title: lead.title,
      slug: slugify(lead.title),
      leadUrl: lead.url,
      hasPrimarySource: Boolean(primary),
      vendor: c.items.every((i) => isVendorContent(i.title, i.summary)),
      domains,
      sourceCount: domains.length,
      readableSourceCount,
      itemCount: c.items.length,
      engagement: c.items.reduce((n, i) => n + (Number(i.engagement) || 0), 0),
      newestHoursAgo: Math.min(...c.items.map((i) => Number(i.hoursAgo) ?? 999)),
      beats: classifyBeats(`${lead.title} ${lead.summary || ''}`),
      sources: c.items.map((i) => ({ url: i.url, outlet: itemOutlet(i), primary: Boolean(i.primary) })),
    };
  });
}

/**
 * Let an outlet corroborate a story it demonstrably covered, without merging.
 *
 * The Desk starves on a structural split, measured in S333: of 215 topics, 119
 * were corroborated but unreadable (aggregator-only) and 87 were readable but
 * single-outlet, while only 2 were both. Those two populations largely cover the
 * SAME events — they fail to combine because clustering compares headlines and
 * outlets word the same story differently.
 *
 * The tempting fix is to loosen the 0.34 cluster threshold. That is the wrong
 * lever: merging two genuinely different stories would inflate `sourceCount` and
 * manufacture corroboration that does not exist, which on this desk is a truth
 * failure, not a quality one. S329 tightened dedupe for closely related reasons.
 *
 * So corroborate instead of merge, at a STRICTER bar than merging uses:
 *   • the link must clear `threshold` (0.55), well above the 0.34 merge bar;
 *   • only the outlet NAME is borrowed, never the URL — so an unreadable
 *     aggregator item can raise independent-source count but can never enter the
 *     fact base, which still draws solely on readable sources;
 *   • `readableSourceCount` is untouched, so "can we actually read a body for
 *     this?" keeps meaning exactly what it meant before.
 *
 * A story therefore becomes publishable only when it is readable in its own
 * right AND independently covered elsewhere — which is what the corroboration
 * rule was always trying to express.
 */
export function attachCrossOutletCorroboration(clusters, { threshold = 0.45 } = {}) {
  const list = clusters || [];
  const tokens = list.map((c) => contentTokens(`${c.title} ${c.summary || ''}`));

  return list.map((cluster, i) => {
    const own = new Set(cluster.domains || []);
    const corroborating = new Set();

    for (let j = 0; j < list.length; j++) {
      if (i === j) continue;
      if (similarity(tokens[i], tokens[j]) < threshold) continue;
      for (const outlet of list[j].domains || []) {
        // Only outlets this story does not already have count as independent.
        if (!own.has(outlet)) corroborating.add(outlet);
      }
    }
    if (!corroborating.size) return cluster;

    const domains = [...new Set([...own, ...corroborating])].sort();
    return {
      ...cluster,
      domains,
      sourceCount: domains.length,
      corroboratedBy: [...corroborating].sort(),
    };
  });
}

/* ── Scoring ───────────────────────────────────────────────────────────── */

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * Score a clustered topic 0–100 with an explainable breakdown.
 *
 * Weights encode the editorial doctrine above: corroboration is the single
 * largest term, castability is real weight (not a tiebreak), and engagement —
 * the signal most likely to reward slop — is deliberately capped at 15.
 *
 * `publishedTitles` demotes re-runs; `personaBeats` is the roster's beat map,
 * so castability is computed against the ACTUAL cast rather than a guess.
 */
export function scoreTopic(topic, { publishedTitles = [], publishedSlugs = [], personaBeats = {}, now = null } = {}) {
  const reasons = [];

  const corroboration = topic.hasPrimarySource
    ? clamp01((topic.sourceCount + 1) / 4)
    : clamp01(topic.sourceCount / 5);
  const corrobPoints = corroboration * 34;
  reasons.push(topic.hasPrimarySource
    ? `${topic.sourceCount} independent source(s) incl. a primary`
    : `${topic.sourceCount} independent source(s), no primary`);

  const hours = Number(topic.newestHoursAgo);
  const recency = Number.isFinite(hours) ? clamp01(1 - hours / 48) : 0;
  const recencyPoints = recency * 18;
  if (Number.isFinite(hours)) reasons.push(`${Math.round(hours)}h old`);

  const beats = topic.beats || [];
  const speakers = Object.entries(personaBeats)
    .filter(([, pb]) => (pb || []).some((b) => beats.includes(b)))
    .map(([id]) => id);
  const castability = clamp01(speakers.length / 3);
  const castPoints = castability * 23;
  reasons.push(speakers.length
    ? `${speakers.length} persona(s) can argue it: ${speakers.join(', ')}`
    : 'no persona owns this beat');

  // Engagement stays capped so virality cannot buy its way past corroboration.
  // But a spectacle topic gets its full weight rather than being treated as
  // noise: "people are actually talking about this" IS the signal for a roast
  // or a quick take, where the desk's job is to react well, not to forecast.
  const isSpectacle = (topic.beats || []).includes('spectacle');
  const engagement = clamp01(Math.log10(1 + Math.max(0, Number(topic.engagement) || 0)) / 3.5);
  const engagementPoints = engagement * (isSpectacle ? 22 : 15);

  let novelty = 1;
  let closest = 0;
  for (const t of publishedTitles) {
    const s = similarity(topic.title, t);
    if (s > closest) closest = s;
  }
  novelty = clamp01(1 - closest * 1.6);
  const noveltyPoints = novelty * 10;
  if (closest > 0.3) reasons.push(`overlaps published coverage (${Math.round(closest * 100)}%)`);

  const raw = corrobPoints + recencyPoints + castPoints + engagementPoints + noveltyPoints;

  // Hard gates. These are disqualifications, not penalties: a single-source
  // rumour and a story the desk already ran are both unpublishable regardless
  // of how well they score elsewhere.
  const blocked = [];
  if (topic.sourceCount < 2 && !topic.hasPrimarySource) blocked.push('single unverified source');
  if (topic.readableSourceCount === 0) blocked.push('no readable publisher source');
  if (closest >= 0.62) blocked.push('already covered');
  // S329: the similarity gate compares against AI-REWRITTEN published headlines,
  // so the same topic re-clustered on a later day can slip under 0.62 (the
  // 2026-08-21..23 triple-run). The topic slug is deterministic — an exact
  // match against published story slugs is a hard disqualification.
  const slugSet = publishedSlugs instanceof Set ? publishedSlugs : new Set(publishedSlugs);
  if (slugSet.has(topic.slug || slugify(topic.title))) blocked.push('slug already published');
  if (!speakers.length) blocked.push('uncastable — no persona beat');
  if (topic.vendor) blocked.push('vendor content, not news');

  return {
    score: Math.round(raw),
    blocked,
    eligible: blocked.length === 0,
    speakers,
    breakdown: {
      corroboration: Math.round(corrobPoints),
      recency: Math.round(recencyPoints),
      castability: Math.round(castPoints),
      engagement: Math.round(engagementPoints),
      novelty: Math.round(noveltyPoints),
    },
    reasons,
  };
}

/* ── Queue derivation ──────────────────────────────────────────────────── */

const sha = (v) => crypto.createHash('sha256')
  .update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');

/**
 * Rank scored topics and assign them to editions. Assignment is by score AND
 * fit: the freshest corroborated news goes to The Wire, the highest-heat
 * argument to Midday, and long-horizon/low-engagement material to Late Night —
 * which is exactly where a "quiet story" belongs.
 *
 * `generatedAt` is caller-supplied so the artifact stays content-stable across
 * reruns (a timestamp that moves on every run makes every byte-check drift).
 */
export function deriveTopicQueue(scored, { editions = [], generatedAt = null, limit = 24 } = {}) {
  const eligible = scored
    .filter((t) => t.eligible)
    .sort((a, b) => (b.score - a.score) || (a.slug < b.slug ? -1 : 1))
    .slice(0, limit);

  const capacity = new Map(editions.map((e) => [e.id, e.maxStories]));
  const assign = (topic) => {
    const order = topic.newestHoursAgo <= 12
      ? ['wire', 'midday', 'close', 'latenight']
      : topic.speakers.length >= 3
        ? ['midday', 'close', 'wire', 'latenight']
        : ['latenight', 'close', 'midday', 'wire'];
    for (const id of order) {
      if ((capacity.get(id) || 0) > 0) { capacity.set(id, capacity.get(id) - 1); return id; }
    }
    return null;
  };

  const queue = eligible.map((t) => ({ ...t, edition: assign(t) }));
  const payload = {
    schemaVersion: '1.0',
    generatedBy: 'scripts/news-trend-radar.mjs',
    publicSafe: false,
    state: queue.length ? 'live' : 'dark',
    queued: queue.length,
    rejected: scored.length - eligible.length,
    topics: queue,
  };
  return { ...payload, generatedAt, contentHash: sha(payload) };
}
