#!/usr/bin/env node
/**
 * news-trend-radar.mjs — topic discovery for THE DESK (/news).
 *
 * Answers the sourcing half of "publish throughout the day": it sweeps free,
 * key-less sources, clusters them into corroborated topics, scores them
 * against the persona roster, and writes a ranked `topic-queue.json` that the
 * editorial pass draws from. It NEVER writes public artifacts — the queue is
 * an internal work list, and a topic only becomes a story once it has been
 * written and passes validateDay().
 *
 * Modes:
 *   --self-test   hermetic proof of the pure core (scripts/lib/news-trends.mjs)
 *   --scan        fetch live sources → data/news-desk/topic-queue.json
 *   --show        print the current queue without touching the network
 *
 * CANON-029: every source below is free and unauthenticated. No API keys, no
 * paid trend product, no marginal cost per scan.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERSONAS, EDITIONS } from './lib/news-desk.mjs';
import {
  classifyBeats,
  clusterItems,
  attachCrossOutletCorroboration,
  scoreTopic,
  deriveTopicQueue,
  similarity,
  slugify,
  sourceDomain,
  itemOutlet,
  isAggregatorUrl,
  isVendorContent,
  contentTokens,
} from './lib/news-trends.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS_DIR = path.join(ROOT, 'data', 'news-desk', 'days');
const QUEUE_PATH = path.join(ROOT, 'data', 'news-desk', 'topic-queue.json');

/* ── Sources (free, key-less) ──────────────────────────────────────────── */

/**
 * `primary` marks a first-party announcement — the lab/regulator itself, not
 * coverage of it. Corroboration scoring treats one primary source as worth
 * more than several aggregators repeating each other.
 */
/**
 * Verified 2026-08-08 by live probe. Anthropic and Meta AI publish no public
 * RSS (both 404), so first-party coverage of them arrives via the aggregator
 * queries below rather than being silently absent — an unreachable source that
 * nobody notices is indistinguishable from a quiet news day.
 */
const FEEDS = [
  { url: 'https://openai.com/blog/rss.xml', primary: true },
  { url: 'https://deepmind.google/blog/rss.xml', primary: true },
  { url: 'https://blog.google/technology/ai/rss/', primary: true },
  { url: 'https://engineering.fb.com/feed/', primary: true },
  { url: 'https://huggingface.co/blog/feed.xml', primary: true },
  // Publisher-owned feeds provide readable article URLs. Google News remains
  // valuable for corroboration, but its opaque redirect tokens cannot supply
  // the sourced prose required by the drafting gate. These endpoints were
  // live-probed on 2026-08-21 and are fetched in parallel with the rest.
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', primary: false },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', primary: false },
  { url: 'https://venturebeat.com/category/ai/feed/', primary: false },
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', primary: false },
  { url: 'https://www.wired.com/feed/tag/ai/latest/rss', primary: false },
  // S333: readable-source breadth, not more corroboration.
  //
  // Measured starvation: a scan produced 181 topics and queued ZERO, and the
  // dominant blocker was `no readable publisher source` (127 of 181) — the top
  // five near-misses were blocked by that rule ALONE, at scores 70-83. Google
  // News surfaced 230 distinct outlets of which only 3 were readable here, and
  // `attachDirectPublisherUrls` can only rescue an aggregator item when the SAME
  // story appears in a publisher feed we already read. So aggregator breadth is
  // unusable breadth, and the fix is more readable publishers rather than more
  // aggregator queries. Chasing the aggregator's own top outlets would not work
  // either — its supply is long-tailed (top 12 unreadable outlets were only 21%
  // of items) and dominated by crypto/finance sites irrelevant to this desk.
  //
  // These four were probed live before being added: reachable, parseable, AI
  // scoped, and carrying items inside the radar's 72h freshness window.
  { url: 'https://the-decoder.com/feed/', primary: false },
  { url: 'https://www.marktechpost.com/feed/', primary: false },
  { url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml', primary: false },
  { url: 'https://www.theregister.com/software/ai_ml/headlines.atom', primary: false },
  { url: 'https://news.google.com/rss/search?q=artificial+intelligence+when:2d&hl=en-US&gl=US&ceid=US:en', primary: false },
  { url: 'https://news.google.com/rss/search?q=AI+agents+OR+%22AI+regulation%22+when:2d&hl=en-US&gl=US&ceid=US:en', primary: false },
  { url: 'https://news.google.com/rss/search?q=Anthropic+OR+Claude+AI+when:2d&hl=en-US&gl=US&ceid=US:en', primary: false },
  { url: 'https://news.google.com/rss/search?q=OpenAI+OR+%22Google+DeepMind%22+when:2d&hl=en-US&gl=US&ceid=US:en', primary: false },
];

const HN_ENDPOINT = 'https://hn.algolia.com/api/v1/search_by_date'
  + '?tags=story&numericFilters=points%3E40&hitsPerPage=60&query=';
const HN_QUERIES = ['AI', 'LLM', 'agents', 'OpenAI', 'Anthropic'];

const UA = 'VaultSparkNewsDesk/1.0 (+https://vaultsparkstudios.com/news/)';
const FETCH_TIMEOUT_MS = 12_000;

async function getText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; } finally { clearTimeout(timer); }
}

/* ── Minimal RSS/Atom extraction ───────────────────────────────────────── */

const strip = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? strip(m[1]) : '';
};

/**
 * Parse RSS <item> and Atom <entry> blocks. Per-entry try/catch: one malformed
 * entry must never zero out an entire feed (a whole-file parse in a single
 * try/catch is exactly how a feed silently becomes empty).
 */
export function parseFeed(xml, { primary = false, now = Date.now() } = {}) {
  const out = [];
  const blocks = String(xml || '').match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  for (const block of blocks) {
    try {
      let title = tag(block, 'title');
      let url = tag(block, 'link');
      if (!url) {
        const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
        url = href ? strip(href[1]) : '';
      }
      if (!title || !/^https?:\/\//.test(url)) continue;

      // Aggregator feeds (Google News) carry the real publisher in <source>
      // and repeat it as a " - Publisher" title suffix. Recovering it is what
      // makes corroboration counting work at all — every link in that feed is
      // a news.google.com redirect, so the URL identifies the aggregator.
      const srcMatch = block.match(/<source[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
      let outlet = null;
      if (srcMatch) {
        outlet = sourceDomain(strip(srcMatch[1]));
        const publisher = strip(srcMatch[2]);
        if (publisher && title.endsWith(` - ${publisher}`)) {
          title = title.slice(0, -(publisher.length + 3)).trim();
        }
      }

      const dateStr = tag(block, 'pubDate') || tag(block, 'updated') || tag(block, 'published');
      const ts = dateStr ? Date.parse(dateStr) : NaN;
      out.push({
        title,
        url,
        outlet,
        summary: tag(block, 'description') || tag(block, 'summary'),
        primary,
        engagement: 0,
        hoursAgo: Number.isFinite(ts) ? Math.max(0, (now - ts) / 3.6e6) : 72,
      });
    } catch { /* skip this entry only */ }
  }
  return out;
}

export function parseHn(json, { now = Date.now() } = {}) {
  const hits = json?.hits || [];
  return hits
    .filter((h) => h?.title && (h.url || h.objectID))
    .map((h) => ({
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      summary: '',
      primary: false,
      engagement: (Number(h.points) || 0) + (Number(h.num_comments) || 0) * 2,
      hoursAgo: h.created_at_i ? Math.max(0, (now - h.created_at_i * 1000) / 3.6e6) : 72,
    }));
}

/**
 * Replace an opaque Google News URL with the readable publisher URL only when
 * a publisher-owned feed contains a sufficiently similar headline from the
 * same outlet. Outlet + headline agreement is deliberately required: matching
 * on title alone could send a story to a different publisher's coverage, while
 * matching on outlet alone could attach the wrong article from a busy feed.
 */
export function attachDirectPublisherUrls(items, { threshold = 0.34 } = {}) {
  const direct = (items || []).filter((item) =>
    item?.url && !isAggregatorUrl(item.url));
  let resolved = 0;
  const mapped = (items || []).map((item) => {
    if (!isAggregatorUrl(item?.url) || !itemOutlet(item)) return item;
    let best = null;
    let bestScore = 0;
    for (const candidate of direct) {
      if (itemOutlet(candidate) !== itemOutlet(item)) continue;
      const score = similarity(item.title, candidate.title);
      if (score >= threshold && score > bestScore) { best = candidate; bestScore = score; }
    }
    if (!best) return item;
    resolved++;
    return {
      ...item,
      url: best.url,
      summary: best.summary || item.summary,
      primary: Boolean(item.primary || best.primary),
      resolvedFromAggregator: true,
    };
  });
  return { items: mapped, resolved };
}

/* ── Published-coverage memory ─────────────────────────────────────────── */

export function publishedTitles() {
  if (!fs.existsSync(DAYS_DIR)) return [];
  const titles = [];
  for (const file of fs.readdirSync(DAYS_DIR)) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(file)) continue;
    try {
      const day = JSON.parse(fs.readFileSync(path.join(DAYS_DIR, file), 'utf8'));
      for (const story of day.stories || []) titles.push(`${story.headline} ${story.hook || ''}`);
    } catch { /* a malformed day must not blind the radar */ }
  }
  return titles;
}

// S329: exact slug memory. Titles above are AI-rewritten per edition, so the
// similarity gate can miss a re-clustered rerun of the same topic (the
// 2026-08-21..23 triple-run). Slugs are deterministic — collect every story
// slug published inside the window so scoreTopic can hard-block exact reruns.
export function publishedSlugs({ windowDays = 14, today = new Date() } = {}) {
  if (!fs.existsSync(DAYS_DIR)) return new Set();
  // A window of zero days contains nothing. Without this the floor lands on
  // today's own date and the `>= floor` comparison keeps an edition published
  // TODAY, so a zero-day window returns a non-empty set.
  //
  // This was latent for months and could only surface on a day the Desk had
  // already published: before 2026-08-31 no committed day was ever 0 days old,
  // so the boundary was never exercised. S333 published an edition and the
  // assertion started failing the same day — and nothing noticed, because this
  // self-test is not wired into any runner (now fixed).
  //
  // Handled as an explicit guard rather than by tightening the comparison to
  // `> floor`, which would silently move the real 14-day dedupe boundary and
  // change editorial re-run behaviour.
  if (windowDays <= 0) return new Set();
  const floor = new Date(today.getTime() - windowDays * 86400000).toISOString().slice(0, 10);
  const slugs = new Set();
  for (const file of fs.readdirSync(DAYS_DIR)) {
    const m = file.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
    if (!m || m[1] < floor) continue;
    try {
      const day = JSON.parse(fs.readFileSync(path.join(DAYS_DIR, file), 'utf8'));
      for (const story of day.stories || []) if (story.slug) slugs.add(story.slug);
    } catch { /* a malformed day must not blind the radar */ }
  }
  return slugs;
}

const personaBeatMap = () => Object.fromEntries(PERSONAS.map((p) => [p.id, p.beats]));

/* ── Modes ─────────────────────────────────────────────────────────────── */

async function scan() {
  const now = Date.now();
  const items = [];
  const reached = [];
  const failed = [];

  const results = await Promise.all(FEEDS.map(async (f) => ({ f, xml: await getText(f.url) })));
  for (const { f, xml } of results) {
    if (!xml) { failed.push(sourceDomain(f.url)); continue; }
    const parsed = parseFeed(xml, { primary: f.primary, now });
    if (parsed.length) reached.push(sourceDomain(f.url));
    items.push(...parsed);
  }

  const hn = await Promise.all(HN_QUERIES.map(async (q) => await getText(HN_ENDPOINT + encodeURIComponent(q))));
  for (const raw of hn) {
    if (!raw) { failed.push('hn.algolia.com'); continue; }
    try { items.push(...parseHn(JSON.parse(raw), { now })); reached.push('hn.algolia.com'); } catch { failed.push('hn.algolia.com'); }
  }

  const directResolution = attachDirectPublisherUrls(items);
  const fresh = directResolution.items.filter((i) => i.hoursAgo <= 72);
  const clusters = attachCrossOutletCorroboration(clusterItems(fresh));
  const titles = publishedTitles();
  const slugs = publishedSlugs();
  const personaBeats = personaBeatMap();
  const scored = clusters.map((c) => ({ ...c, ...scoreTopic(c, { publishedTitles: titles, publishedSlugs: slugs, personaBeats }) }));

  // A radar that reports a healthy queue while every source failed is the
  // "absent producer reads as green" trap. Sources are reported explicitly.
  const queue = deriveTopicQueue(scored, {
    editions: EDITIONS,
    generatedAt: new Date(now).toISOString().slice(0, 10),
  });
  queue.sourceHealth = {
    reached: [...new Set(reached)].sort(),
    failed: [...new Set(failed)].sort(),
    itemsSeen: items.length,
    itemsFresh: fresh.length,
    clusters: clusters.length,
    resolvedPublisherUrls: directResolution.resolved,
  };

  if (!reached.length) {
    console.error('✗ scan: every source failed — refusing to overwrite the queue with an empty result');
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
  console.log(`✓ scan: ${items.length} items → ${clusters.length} topics → ${queue.queued} queued, ${queue.rejected} rejected`);
  console.log(`  sources reached ${queue.sourceHealth.reached.length}/${FEEDS.length + 1}${failed.length ? ` · failed: ${[...new Set(failed)].join(', ')}` : ''}`);
  for (const t of queue.topics.slice(0, 8)) {
    console.log(`  ${String(t.score).padStart(3)} [${t.edition || '—'}] ${t.title.slice(0, 72)}`);
    console.log(`      ${t.reasons.join(' · ')}`);
  }

  // Why the REJECTED ones were rejected.
  //
  // This loop previously printed only queued topics, so a scan that queued
  // nothing printed nothing at all — "0 queued, 177 rejected" with no way to
  // tell a healthy-but-quiet news cycle from a threshold that has become
  // unsatisfiable. Observed live (S333): the Desk starved on an empty queue and
  // the only way to find out why was to re-derive the pipeline by hand.
  //
  // A topic can be blocked for several reasons at once, so the tally counts
  // reason occurrences and is explicitly NOT expected to sum to the topic count.
  const tally = new Map();
  for (const t of scored) {
    if (t.eligible) continue;
    for (const reason of t.blocked || []) tally.set(reason, (tally.get(reason) || 0) + 1);
  }
  if (tally.size) {
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`  rejected ${queue.rejected} topic(s) — blocking reasons (a topic may hit several):`);
    for (const [reason, count] of ranked) {
      console.log(`      ${String(count).padStart(4)} × ${reason}`);
    }
    // The near-misses are the actionable part: one reason away from publishable.
    const nearMiss = scored
      .filter((t) => !t.eligible && (t.blocked || []).length === 1)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
    if (nearMiss.length) {
      console.log(`  closest ${nearMiss.length} topic(s) — blocked by exactly one rule:`);
      for (const t of nearMiss) {
        console.log(`      ${String(t.score).padStart(3)} ${t.blocked[0].padEnd(30)} ${String(t.title).slice(0, 56)}`);
      }
    }
    // Which single rule, removed, would unlock the most topics? The ranked tally
    // above counts every reason a topic was blocked, so a rule can look dominant
    // while every topic it blocks is also blocked by something else. Only the
    // topics blocked by EXACTLY one rule represent real headroom for that rule.
    const solo = new Map();
    for (const t of scored) {
      if (t.eligible) continue;
      const b = t.blocked || [];
      if (b.length !== 1) continue;
      solo.set(b[0], (solo.get(b[0]) || 0) + 1);
    }
    if (solo.size) {
      console.log('  single-blocker headroom (topics that ONLY this rule blocks):');
      for (const [reason, count] of [...solo.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`      ${String(count).padStart(4)} × ${reason}`);
      }
    }
    // Supply shape. Eligibility needs corroboration (>=2 outlets, or a primary
    // source) AND readability (>=1 non-aggregator source). Those can starve for
    // opposite reasons, so the counts alone cannot tell you which side is short:
    // aggregator clusters carry many outlets and no readable body, while a
    // publisher-direct story is readable but often stands alone. Cross-tabulating
    // them says which half to widen.
    const bucket = { readableCorroborated: 0, readableSingle: 0, unreadableCorroborated: 0, unreadableSingle: 0 };
    for (const t of scored) {
      const readable = (t.readableSourceCount || 0) > 0;
      const corroborated = (t.sourceCount || 0) >= 2 || t.hasPrimarySource;
      if (readable && corroborated) bucket.readableCorroborated++;
      else if (readable) bucket.readableSingle++;
      else if (corroborated) bucket.unreadableCorroborated++;
      else bucket.unreadableSingle++;
    }
    const linked = scored.filter((t) => Array.isArray(t.corroboratedBy) && t.corroboratedBy.length);
    const links = linked.reduce((n, t) => n + t.corroboratedBy.length, 0);
    const worst = linked.reduce((m, t) => Math.max(m, t.corroboratedBy.length), 0);
    console.log(`  ${linked.length} topic(s) gained ${links} cross-outlet link(s) · most on one topic: ${worst}`);
    // Name the heaviest link so over-linking is auditable rather than a number.
    // A genuine mega-story legitimately draws many outlets; a generic wording
    // that matches everything looks identical in the count and nothing else.
    const heaviest = linked.sort((a, b) => b.corroboratedBy.length - a.corroboratedBy.length)[0];
    if (heaviest) {
      console.log(`      heaviest link: "${String(heaviest.title).slice(0, 60)}"`);
      console.log(`      borrowed from: ${heaviest.corroboratedBy.slice(0, 8).join(', ')}${heaviest.corroboratedBy.length > 8 ? ' …' : ''}`);
    }
    console.log('  supply shape (readable = has a non-aggregator source · corroborated = 2+ outlets or primary):');
    console.log(`      ${String(bucket.readableCorroborated).padStart(4)} readable + corroborated  ← the only publishable shape`);
    console.log(`      ${String(bucket.readableSingle).padStart(4)} readable, single outlet`);
    console.log(`      ${String(bucket.unreadableCorroborated).padStart(4)} corroborated, unreadable`);
    console.log(`      ${String(bucket.unreadableSingle).padStart(4)} neither`);
  }
}

function show() {
  if (!fs.existsSync(QUEUE_PATH)) { console.log('topic queue: absent — run --scan'); return; }
  const q = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  console.log(`topic queue (${q.generatedAt}): ${q.queued} queued · ${q.rejected} rejected · state ${q.state}`);
  for (const t of q.topics || []) {
    console.log(`  ${String(t.score).padStart(3)} [${t.edition || '—'}] ${t.title.slice(0, 72)}`);
  }
}

/* ── Self-test ─────────────────────────────────────────────────────────── */

function selfTest() {
  const cases = [];
  const t = (label, ok) => cases.push([label, ok]);
  const personaBeats = personaBeatMap();

  // beat classification
  t('safety language classifies to a safety beat', classifyBeats('New agent control and oversight roadmap').includes('safety'));
  t('pricing language classifies to pricing', classifyBeats('Provider announces price cut per token').includes('pricing'));
  t('unclassifiable text yields no beats', classifyBeats('a pleasant walk in the garden').length === 0);
  t('classification is capped', classifyBeats('agent alignment pricing funding gpu eval regulation jobs').length <= 4);

  // slug + tokens + similarity
  t('slug is url-safe and bounded', /^[a-z0-9-]+$/.test(slugify('OpenAI’s "Big" Launch: Everything, Everywhere!!')));
  t('same story is similar', similarity('OpenAI launches new reasoning model', 'OpenAI launches a new reasoning model today') > 0.5);
  t('different stories are not similar', similarity('OpenAI launches reasoning model', 'EU fines chipmaker over antitrust') < 0.2);
  t('stopwords do not create similarity', similarity('the and of to', 'the and of to') === 0);
  t('domain strips subdomains', sourceDomain('https://blog.google/technology/ai/x') === 'blog.google');
  t('bad url yields no domain', sourceDomain('not a url') === null);

  // feed parsing
  const rss = `<rss><channel>
    <item><title>Lab ships frontier model</title><link>https://openai.com/a</link><description>A new model.</description><pubDate>${new Date().toUTCString()}</pubDate></item>
    <item><title>Broken entry</title></item>
    <item><title>Second story</title><link>https://openai.com/b</link><pubDate>${new Date().toUTCString()}</pubDate></item>
  </channel></rss>`;
  const parsed = parseFeed(rss, { primary: true });
  t('rss items parse', parsed.length === 2);
  t('an entry with no link is skipped, not fatal', parsed.every((p) => /^https?:/.test(p.url)));
  t('one malformed entry does not zero the feed', parseFeed(`<item><title>ok</title><link>https://a.test/1</link></item><item>`).length === 1);
  t('primary flag propagates', parsed.every((p) => p.primary === true));
  const atom = `<feed><entry><title>Atom story</title><link href="https://deepmind.google/x"/><updated>${new Date().toISOString()}</updated></entry></feed>`;
  t('atom entries parse', parseFeed(atom).length === 1 && parseFeed(atom)[0].url === 'https://deepmind.google/x');
  t('cdata titles unwrap', parseFeed('<item><title><![CDATA[Wrapped & Titled]]></title><link>https://a.test/1</link></item>')[0].title === 'Wrapped & Titled');
  t('html entities decode', parseFeed('<item><title>A &amp; B</title><link>https://a.test/1</link></item>')[0].title === 'A & B');
  t('empty xml yields nothing, never throws', parseFeed('').length === 0 && parseFeed(null).length === 0);

  // aggregator identity — the bug that silently killed corroboration
  const gnews = `<item><title>Lab ships a model - Reuters</title>
    <link>https://news.google.com/rss/articles/CBMi_redirect</link>
    <source url="https://www.reuters.com">Reuters</source></item>`;
  const gitem = parseFeed(gnews)[0];
  t('aggregator item recovers the real publisher', gitem.outlet === 'reuters.com');
  t('publisher suffix is stripped from the title', gitem.title === 'Lab ships a model');
  t('outlet identity beats the redirect url', itemOutlet(gitem) === 'reuters.com'
    && sourceDomain(gitem.url) === 'google.com');
  t('a feed without a source tag still resolves an outlet',
    itemOutlet(parseFeed('<item><title>T</title><link>https://ft.com/a</link></item>')[0]) === 'ft.com');
  t('two aggregator items from different publishers count as two sources',
    clusterItems([
      { title: 'Lab ships frontier model', url: 'https://news.google.com/x1', outlet: 'reuters.com', hoursAgo: 1 },
      { title: 'Lab ships frontier model today', url: 'https://news.google.com/x2', outlet: 'theverge.com', hoursAgo: 1 },
    ])[0].sourceCount === 2);
  t('without outlet recovery those two would have collapsed to one',
    clusterItems([
      { title: 'Lab ships frontier model', url: 'https://news.google.com/x1', hoursAgo: 1 },
      { title: 'Lab ships frontier model today', url: 'https://news.google.com/x2', hoursAgo: 1 },
    ])[0].sourceCount === 1);
  const directResolution = attachDirectPublisherUrls([
    { title: 'OpenAI outage blocks ChatGPT logins', url: 'https://news.google.com/rss/articles/opaque', outlet: 'techcrunch.com' },
    { title: 'OpenAI outage blocks ChatGPT login attempts', url: 'https://techcrunch.com/2026/outage/', outlet: 'techcrunch.com', summary: 'Readable report.' },
    { title: 'OpenAI outage blocks ChatGPT logins', url: 'https://theverge.com/other', outlet: 'theverge.com' },
  ]);
  t('same-outlet headline agreement resolves an opaque aggregator url',
    directResolution.resolved === 1 && directResolution.items[0].url === 'https://techcrunch.com/2026/outage/');
  t('publisher-url resolution carries readable source context',
    directResolution.items[0].summary === 'Readable report.' && directResolution.items[0].resolvedFromAggregator === true);
  t('a different outlet cannot hijack an aggregator source',
    attachDirectPublisherUrls([
      { title: 'Same headline', url: 'https://news.google.com/rss/articles/opaque', outlet: 'a.test' },
      { title: 'Same headline', url: 'https://b.test/story', outlet: 'b.test' },
    ]).resolved === 0);

  // vendor content is not news
  t('a customer case study is vendor content', isVendorContent('How HSP GRUPPE builds AI capabilities for tax advisory'));
  t('a partner post is vendor content', isVendorContent('Baseten on Hugging Face Inference Providers'));
  t('a real announcement is not vendor content', !isVendorContent('OpenAI releases a frontier reasoning model'));
  t('a regulatory story is not vendor content', !isVendorContent('EU opens antitrust probe into chip supply'));
  t('an all-vendor cluster is flagged', clusterItems([
    { title: 'How ACME uses our platform', url: 'https://openai.com/a', primary: true, hoursAgo: 1 },
  ])[0].vendor === true);
  t('vendor content is blocked no matter how well it scores', !scoreTopic(
    { title: 'How ACME uses our agent platform', vendor: true, sourceCount: 4, hasPrimarySource: true, newestHoursAgo: 1, engagement: 5000, beats: ['agents', 'tooling'] },
    { personaBeats },
  ).eligible);
  t('a cluster with one real story among vendor posts survives', clusterItems([
    { title: 'Lab ships frontier reasoning model', url: 'https://openai.com/a', primary: true, hoursAgo: 1 },
    { title: 'How ACME uses the frontier reasoning model', url: 'https://reuters.com/a', hoursAgo: 1 },
  ])[0].vendor === false);

  // hn parsing
  const hn = parseHn({ hits: [{ title: 'Agents in production', url: 'https://x.test/1', points: 100, num_comments: 50, created_at_i: Math.floor(Date.now() / 1000) }] });
  t('hn engagement combines points and comments', hn[0].engagement === 200);
  t('hn hit without url falls back to the discussion', parseHn({ hits: [{ title: 'T', objectID: '42', points: 9 }] })[0].url.includes('item?id=42'));
  t('empty hn payload is safe', parseHn({}).length === 0 && parseHn(null).length === 0);

  // clustering + corroboration
  const items = [
    { title: 'Lab releases frontier reasoning model', url: 'https://openai.com/a', primary: true, hoursAgo: 2, engagement: 0 },
    { title: 'Lab releases new frontier reasoning model today', url: 'https://reuters.com/a', hoursAgo: 3, engagement: 120 },
    { title: 'Lab releases frontier reasoning model, analysts say', url: 'https://theverge.com/a', hoursAgo: 4, engagement: 80 },
    { title: 'EU opens antitrust probe into chip supply', url: 'https://ft.com/b', hoursAgo: 5, engagement: 60 },
  ];
  const clusters = clusterItems(items);
  t('related items cluster together', clusters.length === 2);
  const big = clusters.find((c) => c.sourceCount === 3);
  t('corroboration counts distinct domains', Boolean(big));
  t('a primary source in the cluster is detected', big.hasPrimarySource === true);
  t('clustering is deterministic', JSON.stringify(clusterItems(items)) === JSON.stringify(clusterItems([...items].reverse())));
  const sameOutlet = clusterItems([
    { title: 'One outlet says a thing about agents', url: 'https://blog.test/1', hoursAgo: 1 },
    { title: 'One outlet says a thing about agents again', url: 'https://blog.test/2', hoursAgo: 1 },
  ]);
  t('five posts from one outlet are still one source', sameOutlet[0].sourceCount === 1);

  // scoring + gates
  const strong = scoreTopic(
    { title: 'Lab ships agent control roadmap with safety evaluation', sourceCount: 3, hasPrimarySource: true, newestHoursAgo: 2, engagement: 400, beats: ['safety', 'agents', 'evaluation'] },
    { personaBeats },
  );
  // S333 · cross-outlet corroboration (D-S333.19). Borrow the OUTLET of a story
  // another cluster demonstrably covered, never its URL, and only above a bar
  // stricter than the 0.34 merge threshold — so corroboration can rise without
  // merging distinct stories into fake agreement.
  const coreA = { title: 'OpenAI ships a frontier reasoning model today', domains: ['openai.com'], sourceCount: 1, readableSourceCount: 1 };
  const coreB = { title: 'OpenAI ships frontier reasoning model today', domains: ['reuters.com'], sourceCount: 1, readableSourceCount: 0 };
  const unrelated = { title: 'EU fines a chipmaker over antitrust findings', domains: ['ft.com'], sourceCount: 1, readableSourceCount: 0 };
  const linked = attachCrossOutletCorroboration([coreA, coreB, unrelated]);
  t('a near-identical story from another outlet raises corroboration',
    linked[0].sourceCount === 2 && linked[0].domains.includes('reuters.com'));
  t('the corroborating outlet is recorded, not silently folded in',
    Array.isArray(linked[0].corroboratedBy) && linked[0].corroboratedBy.includes('reuters.com'));
  t('corroboration never invents a readable source',
    linked[0].readableSourceCount === 1 && linked[1].readableSourceCount === 0);
  t('an unrelated story is not borrowed from',
    !linked[0].domains.includes('ft.com') && linked[2].sourceCount === 1);
  t('an outlet the topic already has is not double counted',
    attachCrossOutletCorroboration([
      { title: 'Same wording exactly here', domains: ['a.test'], sourceCount: 1 },
      { title: 'Same wording exactly here', domains: ['a.test'], sourceCount: 1 },
    ])[0].sourceCount === 1);
  t('a match on a non-lead wording still corroborates', (() => {
    // The lead headlines disagree; a member wording agrees. Real outlets rarely
    // word a lead identically, which is why lead-only matching found almost none.
    const linkedByMember = attachCrossOutletCorroboration([
      { title: 'Chipmaker posts record quarter', memberTitles: ['Chipmaker posts record quarter', 'OpenAI ships a frontier reasoning model today'], domains: ['a.test'], sourceCount: 1 },
      { title: 'Unrelated lead about logistics', memberTitles: ['Unrelated lead about logistics', 'OpenAI ships frontier reasoning model today'], domains: ['b.test'], sourceCount: 1 },
    ]);
    return linkedByMember[0].sourceCount === 2 && linkedByMember[0].corroboratedBy.includes('b.test');
  })());
  t('borrowing is capped so one match cannot dominate corroboration', (() => {
    const many = [{ title: 'Same big story wording here', memberTitles: ['Same big story wording here'], domains: ['lead.test'], sourceCount: 1 }];
    for (let i = 0; i < 20; i++) {
      many.push({ title: 'Same big story wording here', memberTitles: ['Same big story wording here'], domains: [`o${i}.test`], sourceCount: 1 });
    }
    const capped = attachCrossOutletCorroboration(many)[0];
    return capped.corroboratedBy.length === 8 && capped.corroborationCapped === 20;
  })());
  t('an uncapped borrow records no cap marker',
    attachCrossOutletCorroboration([
      { title: 'OpenAI ships a frontier reasoning model today', domains: ['openai.com'], sourceCount: 1 },
      { title: 'OpenAI ships frontier reasoning model today', domains: ['reuters.com'], sourceCount: 1 },
    ])[0].corroborationCapped === undefined);

  t('the corroboration bar is stricter than the merge bar',
    attachCrossOutletCorroboration([
      { title: 'OpenAI ships a frontier reasoning model today', domains: ['openai.com'], sourceCount: 1 },
      { title: 'Frontier model pricing shifts across the industry', domains: ['x.test'], sourceCount: 1 },
    ])[0].sourceCount === 1);

  t('a corroborated fresh castable topic scores well', strong.score >= 60 && strong.eligible);
  t('score breakdown is explainable', Object.keys(strong.breakdown).length === 5);
  t('breakdown sums to the score', Math.abs(Object.values(strong.breakdown).reduce((a, b) => a + b, 0) - strong.score) <= 3);
  const rumour = scoreTopic(
    { title: 'Anonymous claim about a model', sourceCount: 1, hasPrimarySource: false, newestHoursAgo: 1, engagement: 9000, beats: ['models'] },
    { personaBeats },
  );
  t('a single unverified source is blocked regardless of engagement', !rumour.eligible && rumour.blocked.includes('single unverified source'));
  const uncastable = scoreTopic(
    { title: 'A pleasant walk in the garden', sourceCount: 4, hasPrimarySource: true, newestHoursAgo: 1, engagement: 10, beats: [] },
    { personaBeats },
  );
  t('an uncastable topic is blocked', !uncastable.eligible && uncastable.blocked.includes('uncastable — no persona beat'));
  const rerun = scoreTopic(
    { title: 'Frontier-model access is becoming research infrastructure', sourceCount: 3, hasPrimarySource: true, newestHoursAgo: 1, engagement: 50, beats: ['research', 'access'] },
    { personaBeats, publishedTitles: ['Frontier-model access is becoming research infrastructure'] },
  );
  t('a story already covered is blocked as a re-run', !rerun.eligible && rerun.blocked.includes('already covered'));
  // S329: THE LIVE CASE — the 2026-08-21..23 triple-run. The rewritten headline
  // scores under the 0.62 similarity gate, but the deterministic topic slug is
  // an exact match against published coverage and must hard-block.
  const slugRerun = scoreTopic(
    { title: 'From Atari to EVE Online, building on 15 years', sourceCount: 3, hasPrimarySource: true, newestHoursAgo: 1, engagement: 50, beats: ['research', 'models'] },
    { personaBeats, publishedTitles: ['DeepMind’s AI Just Learned 3D Games — and what that unlocks'], publishedSlugs: new Set(['from-atari-to-eve-online-building-on-15-years']) },
  );
  t('an exact slug rerun is blocked even when the rewritten headline reads fresh',
    !slugRerun.eligible && slugRerun.blocked.includes('slug already published'));
  const slugFresh = scoreTopic(
    { title: 'A genuinely new agent benchmark drops', sourceCount: 3, hasPrimarySource: true, newestHoursAgo: 1, engagement: 50, beats: ['research', 'models'] },
    { personaBeats, publishedSlugs: new Set(['from-atari-to-eve-online-building-on-15-years']) },
  );
  t('a fresh slug passes the slug gate', !slugFresh.blocked.includes('slug already published'));
  t('published slugs load from committed days within the window',
    publishedSlugs({ windowDays: 36500 }) instanceof Set && publishedSlugs({ windowDays: 0 }).size === 0);
  t('engagement alone cannot carry a topic', rumour.breakdown.engagement <= 15);

  // queue
  const scored = [strong, rumour, uncastable].map((s, i) => ({ ...s, slug: `t${i}`, title: `T${i}`, newestHoursAgo: 2 }));
  const queue = deriveTopicQueue(scored, { editions: EDITIONS, generatedAt: '2026-08-08' });
  t('only eligible topics are queued', queue.queued === 1 && queue.rejected === 2);
  t('queued topics are assigned an edition', Boolean(queue.topics[0].edition));
  t('queue carries a content hash', /^[a-f0-9]{64}$/.test(queue.contentHash));
  t('queue is content-stable across reruns',
    deriveTopicQueue(scored, { editions: EDITIONS, generatedAt: '2026-08-08' }).contentHash === queue.contentHash);
  t('an empty queue derives an honest dark state', deriveTopicQueue([], { editions: EDITIONS }).state === 'dark');
  t('the queue is marked not-public-safe', queue.publicSafe === false);
  const many = Array.from({ length: 40 }, (_, i) => ({ ...strong, slug: `s${i}`, title: `S${i}`, newestHoursAgo: 1 }));
  t('edition capacity is respected', deriveTopicQueue(many, { editions: EDITIONS, generatedAt: 'x' })
    .topics.filter((x) => x.edition === 'wire').length <= 3);
  t('overflow past capacity is queued unassigned, not dropped',
    deriveTopicQueue(many, { editions: EDITIONS, generatedAt: 'x' }).topics.some((x) => x.edition === null));

  // published-coverage memory reads real committed days
  t('published titles load from committed days', Array.isArray(publishedTitles()));
  t('content tokens drop stopwords', !contentTokens('the model of the year').has('the'));

  const failed = cases.filter(([, ok]) => !ok);
  for (const [label, ok] of cases) if (!ok) console.error(`✗ ${label}`);
  console.log(`news-trends self-test: ${cases.length - failed.length}/${cases.length} passed`);
  if (failed.length) process.exit(1);
}

const args = new Set(process.argv.slice(2));
if (args.has('--self-test')) selfTest();
else if (args.has('--scan')) await scan();
else if (args.has('--show')) show();
else {
  console.error('Usage: --self-test | --scan | --show');
  process.exitCode = 2;
}
