/**
 * news-search-index.mjs — build-time index for The Desk's client-side search.
 *
 * Founder request (2026-10-05): full-text search over every edition (the hub
 * only lists the latest seven), filterable by correspondent, company/topic,
 * edition, month, format and "has a prediction", shareable through the URL.
 *
 * The index is a compact positional JSON written by generate-news-pages.mjs to
 * api/news-desk-search.json and fetched by the hub only when a reader reaches
 * for search (focus, filter panel, or a shared ?q= link) — never on page load.
 *
 * Payload discipline:
 *   - headline, hook and tldr are stored verbatim: they render result cards and
 *     snippets, and are searched directly.
 *   - everything else that is article text (body, facts, stance positions,
 *     transcript, meme line) is reduced to a "bag": unique normalised words not
 *     already in headline/hook/tldr, minus stopwords, minus any word that is a
 *     prefix of another bag word (search is word-PREFIX matching, so the longer
 *     word still matches the shorter query). Full-text recall, a fraction of
 *     the bytes.
 *   - taxonomy (personas, formats, editions, topics) is stored once and each
 *     story references it by index.
 *
 * Topics are DERIVED, not curated: proper names (companies, products, people)
 * that appear capitalised mid-sentence in at least TOPIC_MIN_STORIES stories
 * and never appear lowercase anywhere in the corpus. A word like "Security"
 * that also occurs as "security" is a common noun and is excluded by the
 * corpus itself, so no hand-maintained company list can drift out of date.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SEARCH_INDEX_PATH = 'api/news-desk-search.json';
export const SEARCH_INDEX_VERSION = 1;
export const TOPIC_MIN_STORIES = 4;
export const TOPIC_LIMIT = 24;

/** Flag bits in a story row. */
export const FLAG_PREDICTION = 1;
export const FLAG_LEAD = 2;
export const FLAG_QUIET = 4;
export const FLAG_ART = 8;

/**
 * Row field positions. The client reads the same constants (they are serialised
 * into the index header) so the two sides cannot disagree about the layout.
 */
export const ROW = Object.freeze({
  date: 0, slug: 1, headline: 2, hook: 3, tldr: 4, iso: 5, timeLabel: 6, timeSource: 7,
  edition: 8, format: 9, personas: 10, topics: 11, flags: 12, bag: 13,
});

export const STOPWORDS = new Set(('a an and are as at be been being but by can could did do does for from had has have he her his how i if in into is it its just more most my no not of on or our out over she so than that the their them then there these they this those to too up us was we were what when where which while who why will with would you your about after again all also any because before between both each few into only other own same some such through under until very via says said say new one two its it\'s don\'t can\'t won\'t').split(/\s+/));
const NON_TOPIC = new Set('January February March April May June July August September October November December Monday Tuesday Wednesday Thursday Friday Saturday Sunday I AI SI US UK EU CEO The A An This That These Those It Its While After Before When What Why How Who Where But And Or Not No New On In At For From With By As If Is Are Was Were Be Today Yesterday Tomorrow'.split(' '));

/** Lowercase, strip diacritics and punctuation, collapse to space-separated words. */
export function normalizeSearchText(text) {
  return String(text || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`]s\b/g, '')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/(^|\s)\.+|\.+(?=\s|$)/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokenize(text) {
  const norm = normalizeSearchText(text);
  return norm ? norm.split(' ') : [];
}

const keepWord = (w) => !STOPWORDS.has(w) && (w.length >= 3 || /\d/.test(w));

/**
 * Light suffix stem used ONLY for the bag (and for the query token when it is
 * matched against the bag). "regulated" and "regulating" stem to "regulat", a prefix of
 * "regulation", so one bag entry serves the whole family. The client embeds
 * this exact function (desk-finder.mjs), so both sides stem identically.
 */
export function stemWord(w) {
  if (w.length <= 4 || /\d/.test(w)) return w;
  return w.replace(/(?:ings?|edly|ers?|ed|es|ly|s)$/, '') || w;
}

/** The bag: unique stemmed article words not already searchable in `seen`, prefix-collapsed. */
export function buildBag(texts, seen = new Set()) {
  const words = new Set();
  for (const text of texts) for (const w of tokenize(text)) if (keepWord(w) && !seen.has(w)) words.add(stemWord(w));
  const sorted = [...words].sort();
  // In sorted order a word that is a prefix of another sits immediately before
  // some word that starts with it; drop it, the longer word still matches.
  const kept = sorted.filter((w, i) => !(sorted[i + 1] && sorted[i + 1].startsWith(w)));
  return kept.join(' ');
}

/**
 * Proper names: capitalised words that NEVER appear lowercase anywhere in the
 * corpus (so "Security" and "Why" fall out on their own), recurring in the
 * headline/hook/tldr of at least `minStories` stories. A name that is always
 * followed by the same capitalised word becomes that two-word name
 * ("Hugging" → "Hugging Face").
 */
export function deriveTopics(stories, { minStories = TOPIC_MIN_STORIES, limit = TOPIC_LIMIT } = {}) {
  const lowercase = new Set();
  const heads = stories.map((story) => [story.headline, story.hook, story.tldr].join(' . '));
  stories.forEach((story, i) => {
    const fullText = [heads[i], ...(story.body || []).map((b) => b.text || '')].join(' ');
    for (const m of fullText.matchAll(/\b[a-z][a-z0-9]+\b/g)) lowercase.add(m[0]);
  });
  const storyCount = new Map();
  const occurrences = new Map();
  const followers = new Map();
  for (const text of heads) {
    const seen = new Set();
    for (const m of text.matchAll(/\b([A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*|[A-Z]{2,}[a-z][A-Za-z0-9]*)\b(?=(?:\s+([A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*)\b)?)/g)) {
      const word = m[1];
      if (NON_TOPIC.has(word) || lowercase.has(word.toLowerCase())) continue;
      occurrences.set(word, (occurrences.get(word) || 0) + 1);
      if (!followers.has(word)) followers.set(word, new Map());
      const next = m[2] || '';
      followers.get(word).set(next, (followers.get(word).get(next) || 0) + 1);
      seen.add(word);
    }
    for (const word of seen) storyCount.set(word, (storyCount.get(word) || 0) + 1);
  }
  const named = [...storyCount]
    .filter(([, n]) => n >= minStories)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => {
      const after = [...followers.get(word)];
      return after.length === 1 && after[0][0] && after[0][1] === occurrences.get(word) ? `${word} ${after[0][0]}` : word;
    });
  // "Face" only ever appears inside "Hugging Face": the two-word name covers it.
  const tails = new Set(named.filter((n) => n.includes(' ')).map((n) => n.split(' ')[1]));
  return named
    .filter((n) => !(tails.has(n) && named.some((m) => m.endsWith(` ${n}`) && occurrences.get(m.split(' ')[0]) >= occurrences.get(n))))
    // "Donald Trump" when "Trump" is already a topic on its own: the shorter name matches both.
    .filter((n) => !(n.includes(' ') && named.includes(n.split(' ')[1]) && occurrences.get(n.split(' ')[1]) > occurrences.get(n.split(' ')[0])))
    .slice(0, limit)
    .sort((a, b) => a.localeCompare(b));
}
/** Topics a story mentions (headline, hook, tldr or body), as indices into `topics`. */
export function storyTopics(story, topics) {
  const text = ` ${[story.headline, story.hook, story.tldr, ...(story.body || []).map((b) => b.text || '')].join(' ')} `;
  return topics.flatMap((topic, i) => (new RegExp(`[^A-Za-z0-9]${topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^A-Za-z0-9]`).test(text) ? [i] : []));
}

/**
 * Build the index.
 * @param entries   [{ day, story, time: { iso, label, source }, personaIds, hasArt }]
 *                  newest first, superseded reruns already removed.
 * @param taxonomy  { personas: [[id,name]], formats: [[id,name]], editions: [[id,name]] }
 */
export function buildSearchIndex(entries, taxonomy) {
  const stories = entries.map((e) => e.story);
  const topics = deriveTopics(stories);
  const personaIndex = new Map(taxonomy.personas.map(([id], i) => [id, i]));
  const formatIndex = new Map(taxonomy.formats.map(([id], i) => [id, i]));
  const editionIndex = new Map(taxonomy.editions.map(([id], i) => [id, i]));
  const rows = entries.map(({ day, story, time, personaIds, hasArt, formatId }) => {
    const head = [story.headline, story.hook, story.tldr];
    const seen = new Set(head.flatMap(tokenize));
    const bag = buildBag([
      ...(story.body || []).map((b) => [b.heading, b.text].filter(Boolean).join(' ')),
      ...(story.facts || []).map((f) => f.text),
      story.memeLine?.text,
    ], seen);
    const flags = ((story.predictions || []).length ? FLAG_PREDICTION : 0)
      | (story.slug === day.leadSlug ? FLAG_LEAD : 0)
      | (story.kind === 'quiet' ? FLAG_QUIET : 0)
      | (hasArt ? FLAG_ART : 0);
    return [
      day.date, story.slug, story.headline, story.hook, story.tldr || '', time.iso, time.label, time.source,
      editionIndex.has(story.edition) ? editionIndex.get(story.edition) : -1,
      formatIndex.has(formatId) ? formatIndex.get(formatId) : -1,
      [...new Set(personaIds)].filter((id) => personaIndex.has(id)).map((id) => personaIndex.get(id)),
      storyTopics(story, topics),
      flags,
      bag,
    ];
  });
  return {
    v: SEARCH_INDEX_VERSION,
    about: 'The Desk search index: every published story, newest first. Rows are positional; see "row". AI-generated publication: every story is written by AI personas.',
    row: Object.keys(ROW),
    personas: taxonomy.personas,
    formats: taxonomy.formats,
    editions: taxonomy.editions,
    topics,
    stories: rows,
  };
}

/** Serialised form: compact (no whitespace) with a trailing newline. */
export const serializeSearchIndex = (index) => `${JSON.stringify(index)}\n`;

export const shardPath = (month) => `api/news-desk-search-${month}.json`;

/**
 * Split the index into a small manifest (taxonomy + shard list) and one shard
 * per publication month. The client fetches the manifest, then every shard in
 * parallel newest-first and renders results as each arrives, so no single
 * request grows without bound as the archive does, and a month filter needs
 * exactly one shard.
 * @returns {{ manifest: object, shards: { month: string, path: string, body: object }[] }}
 */
export function shardSearchIndex(index) {
  const months = [...new Set(index.stories.map((row) => row[ROW.date].slice(0, 7)))].sort().reverse();
  const shards = months.map((month) => ({
    month,
    path: shardPath(month),
    body: { v: index.v, month, stories: index.stories.filter((row) => row[ROW.date].startsWith(month)) },
  }));
  const { stories, ...header } = index;
  return {
    manifest: {
      ...header,
      storyCount: stories.length,
      shards: shards.map((s) => ({ month: s.month, count: s.body.stories.length, path: `/${s.path}` })),
    },
    shards,
  };
}

export function selfTestNewsSearchIndex() {
  const results = [];
  const t = (name, ok) => results.push([name, !!ok]);
  t('normalises case, diacritics, possessives and punctuation', normalizeSearchText('OpenAI’s Café — GPT-6 “Sol”!') === 'openai cafe gpt 6 sol');
  t('keeps version numbers whole', tokenize('Claude Opus 5.5 ships.').includes('5.5'));
  const bag = buildBag(['The agents and agentic agent tooling', 'Robots robot'], new Set(['tooling']));
  t('bag stems, drops stopwords, words already in the head, and prefix-covered words', bag === 'agentic robot');
  t('stemWord folds plural and tense', stemWord('regulations').startsWith(stemWord('regulated')) && stemWord('regulating') === stemWord('regulated') && stemWord('agents') === 'agent' && stemWord('gpt5') === 'gpt5');
  const corpus = [
    { headline: 'Why OpenAI and Hugging Face matter', hook: 'Then OpenAI moved.', tldr: 'Security teams watch OpenAI.', body: [{ text: 'security is hard' }] },
    { headline: 'Ask OpenAI about Hugging Face', hook: '', tldr: '' },
    { headline: 'The OpenAI week, Hugging Face too', hook: '', tldr: '' },
    { headline: 'Big OpenAI news from Hugging Face', hook: 'Security first', tldr: '' },
  ];
  const topics = deriveTopics(corpus, { minStories: 3 });
  t('derives recurring proper names, including two-word names', topics.includes('OpenAI') && topics.includes('Hugging Face'));
  t('a word also used lowercase is not a topic', !topics.includes('Security'));
  t('common words that open a sentence are not topics', !topics.includes('Why') && !topics.includes('Ask') && !topics.includes('Big'));
  t('storyTopics matches on word boundaries', storyTopics({ headline: 'OpenAIX ships', hook: '', tldr: '' }, ['OpenAI']).length === 0
    && storyTopics({ headline: 'Inside OpenAI.', hook: '', tldr: '' }, ['OpenAI'])[0] === 0);
  const index = buildSearchIndex([
    { day: { date: '2026-10-04', leadSlug: 'a' }, story: { slug: 'a', headline: 'OpenAI ships', hook: 'Hook', tldr: 'Short', kind: 'trending', edition: 'wire', predictions: [{}], body: [{ text: 'The guardrails moved' }], facts: [{ text: 'A fact about Robinhood' }] },
      time: { iso: '2026-10-04T08:15:38Z', label: 'Sun, Oct 4, 2026 · 4:15 AM ET', source: 'authored' }, personaIds: ['rex', 'rex', 'ghost'], hasArt: true, formatId: 'debate' },
  ], { personas: [['rex', 'REX']], formats: [['debate', 'The Argument']], editions: [['wire', 'The Wire']] });
  const row = index.stories[0];
  t('row layout matches ROW', index.row.length === Object.keys(ROW).length && row[ROW.slug] === 'a' && row[ROW.timeLabel].includes('4:15 AM ET'));
  t('taxonomy is referenced by index; unknown personas are dropped', row[ROW.personas].length === 1 && row[ROW.personas][0] === 0 && row[ROW.edition] === 0 && row[ROW.format] === 0);
  t('flags carry prediction, lead and art', row[ROW.flags] === (FLAG_PREDICTION | FLAG_LEAD | FLAG_ART));
  t('body and fact words reach the bag', row[ROW.bag].includes('guardrail') && row[ROW.bag].includes('robinhood'));
  t('serialised index is compact JSON with a trailing newline', serializeSearchIndex(index).endsWith('}\n') && !serializeSearchIndex(index).includes('\n  '));
  const twoMonths = { ...index, stories: [['2026-10-02', 'b', 'H', '', '', '', '', 'date', -1, -1, [], [], 0, ''], index.stories[0], ['2026-09-30', 'c', 'H', '', '', '', '', 'date', -1, -1, [], [], 0, '']] };
  const sharded = shardSearchIndex(twoMonths);
  t('shards are per month, newest first, and lose no rows', sharded.shards.map((s) => s.month).join() === '2026-10,2026-09'
    && sharded.shards.reduce((n, s) => n + s.body.stories.length, 0) === 3);
  t('manifest lists shards with served paths and carries no story rows', !('stories' in sharded.manifest) && sharded.manifest.storyCount === 3
    && sharded.manifest.shards[0].path === '/api/news-desk-search-2026-10.json' && sharded.manifest.shards[0].count === 2);
  t('shard paths stay inside the Desk content-lane feed pattern', /^api\/news-desk(-[a-z0-9-]+)?[.]json$/.test(shardPath('2026-10')));
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--self-test')) {
  const results = selfTestNewsSearchIndex();
  for (const [name, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`news-search-index self-test: ${results.length - failed}/${results.length}`);
  if (failed) process.exit(1);
}
