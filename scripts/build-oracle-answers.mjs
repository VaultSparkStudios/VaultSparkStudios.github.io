#!/usr/bin/env node
/* build-oracle-answers.mjs
 *
 * Builds a committed, public-safe Oracle answer corpus from already-public feeds.
 * Runtime Oracle reads this before falling back to the client-side keyword engine:
 * no per-query API call, no hidden private context, no fabricated answers.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INSIGHTS = path.join(ROOT, 'api', 'oracle-insights.json');
const TIERS = path.join(ROOT, 'api', 'membership-tiers.json');
const CITATION = path.join(ROOT, 'api', 'citation.json');
const OUT_DIR = path.join(ROOT, 'oracle', 'answers');
const OUT = path.join(OUT_DIR, 'index.json');
const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');
const STOPWORDS = new Set([
  'about', 'after', 'again', 'also', 'does', 'from', 'have', 'into', 'many',
  'more', 'most', 'need', 'next', 'right', 'should', 'show', 'that', 'the',
  'their', 'this', 'week', 'what', 'when', 'where', 'which', 'while', 'with',
  'work', 'your',
]);

function readJson(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'answer';
}

function cleanText(s, max = 520) {
  const normalized = String(s || '')
    .replace(/\bS\d{2,3}\b/g, '')
    .replace(/\/(?:start|audit|implement|closeout|go)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length <= max) return normalized;
  return normalized
    .slice(0, max)
    .replace(/\s+\S*$/, '')
    .trim();
}

function keywordsFor(query, tokens = []) {
  return Array.from(new Set([...tokens, ...String(query || '').toLowerCase().split(/[^a-z0-9]+/)]))
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    .slice(0, 16);
}

function uniqSources(sources) {
  const seen = new Set();
  return (sources || [])
    .filter((s) => s && (s.url || s.title))
    .map((s) => ({
      title: cleanText(s.title || s.url, 120),
      url: s.url || '/',
      summary: cleanText(s.summary || '', 240),
    }))
    .filter((s) => {
      const key = s.url + '|' + s.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function buildInsightAnswer(cluster) {
  const query = cluster.query || cluster.key || 'What is VaultSpark building?';
  const sources = uniqSources(cluster.topDocs || []);
  const lead = cleanText(cluster.liveAnswer || '', 260);
  const citedPages = sources
    .slice(0, 2)
    .map((s) => s.title)
    .filter(Boolean)
    .join(' and ');
  const answer = cleanText(
    lead
      ? `${lead}${citedPages ? ` Source pages: ${citedPages}.` : ''}`
      : 'VaultSpark answers this from its public studio feeds.',
    520,
  );
  return {
    id: slugify(query),
    query,
    keywords: keywordsFor(query, cluster.tokens || []),
    answer,
    confidence: sources.length ? 'source-backed' : 'live-feed',
    sources,
  };
}

function buildTierAnswers(tiersDoc) {
  const tiers = Array.isArray(tiersDoc?.tiers) ? tiersDoc.tiers : [];
  if (!tiers.length) return [];
  const sparked = tiers.find((t) => t.id === 'sparked');
  const eternal = tiers.find((t) => t.id === 'eternal');
  const free = tiers.find((t) => t.id === 'free');
  const facts = tiers.map((t) => `${t.name}: ${t.price?.display || 'Free'} (${(t.highlights || []).slice(0, 3).join(', ')})`).join('; ');
  const sources = [{ title: 'Membership tiers', url: '/api/membership-tiers.json', summary: 'Canonical public tier facts for pricing, themes, and perks.' }];
  return [
    {
      id: 'membership-tiers-pricing',
      query: 'How much does VaultSpark membership cost?',
      keywords: ['membership', 'price', 'pricing', 'cost', 'tier', 'sparked', 'eternal', 'free'],
      answer: `Vault membership starts free. ${sparked?.name || 'Vault Sparked'} is ${sparked?.price?.display || '$4.99/mo'} and ${eternal?.name || 'Vault Eternal'} is ${eternal?.price?.display || '$29.99/mo'}; annual options are available for members who want one checkout for the year.`,
      confidence: 'canonical-json',
      sources,
    },
    {
      id: 'membership-difference',
      query: 'What makes a Vault member different?',
      keywords: ['member', 'membership', 'vault', 'rank', 'points', 'perks', 'discord'],
      answer: `A free ${free?.name || 'Vault Member'} gets the rank ladder, achievements, community challenges, and a public Vault Wall profile. Sparked and Eternal add premium access, XP boosts, profile identity, and deeper studio access. ${facts}`,
      confidence: 'canonical-json',
      sources,
    },
  ];
}

export function buildAnswers({ insights, tiers, citation }) {
  const clusters = Array.isArray(insights?.clusters) ? insights.clusters : [];
  const answers = clusters.map(buildInsightAnswer).filter((a) => a.answer && a.query);
  answers.push(...buildTierAnswers(tiers));
  const deduped = [];
  const seen = new Set();
  for (const answer of answers) {
    if (seen.has(answer.id)) continue;
    seen.add(answer.id);
    deduped.push(answer);
  }
  const generatedAt = String(insights?.generatedAt || tiers?.generatedAt || citation?.generatedAt || '1970-01-01').slice(0, 10);
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/build-oracle-answers.mjs',
    generatedAt,
    publicSafe: true,
    runtimeCost: 'zero',
    note: 'Deploy-time prebaked Oracle answers derived only from public feeds. Runtime lookup falls back to the client keyword engine when no answer matches.',
    answers: deduped.slice(0, 40),
  };
}

function assertSafe(doc, { minAnswers = 8 } = {}) {
  const text = JSON.stringify(doc);
  const forbidden = [/Session Intent/i, /\/closeout/i, /\bS\d{2,3}\b/];
  return forbidden.every((re) => !re.test(text)) && Array.isArray(doc.answers) && doc.answers.length >= minAnswers;
}

if (SELF_TEST) {
  const out = buildAnswers({
    insights: {
      generatedAt: '2026-06-29T00:00:00Z',
      clusters: [{ query: 'What games are live?', tokens: ['games', 'live'], liveAnswer: 'Two games are live.', topDocs: [{ title: 'Games', url: '/games/', summary: 'Playable browser games.' }] }],
    },
    tiers: readJson(TIERS, {}),
    citation: {},
  });
  if (!assertSafe(out, { minAnswers: 1 })) {
    console.error('build-oracle-answers self-test failed');
    process.exit(1);
  }
  console.log(`build-oracle-answers self-test: ok (${out.answers.length} answer(s))`);
  process.exit(0);
}

const built = buildAnswers({
  insights: readJson(INSIGHTS, {}),
  tiers: readJson(TIERS, {}),
  citation: readJson(CITATION, {}),
});
const serialized = JSON.stringify(built, null, 2) + '\n';

if (CHECK) {
  const onDisk = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (onDisk !== serialized) {
    console.error('build-oracle-answers --check: oracle/answers/index.json drift; run node scripts/build-oracle-answers.mjs');
    process.exit(1);
  }
  console.log(`build-oracle-answers --check: ok (${built.answers.length} answer(s))`);
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, serialized, 'utf8');
console.log(`build-oracle-answers → oracle/answers/index.json (${built.answers.length} answer(s))`);
