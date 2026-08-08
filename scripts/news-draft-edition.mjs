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

/* ── Draft assembly ────────────────────────────────────────────────────── */

/** resolveBy defaults: near enough to be falsifiable, far enough to be real. */
export function defaultResolveBy(date, months = 6) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Build the authorable skeleton. Every deterministic field is filled; every
 * judgment field is an explicit empty string so `--status` can report exactly
 * what remains rather than guessing from a partially-shaped object.
 */
export function buildDraft(topic, { date, edition, standing, sources }) {
  const cast = castForStory({ beats: topic.beats, size: Math.min(4, Math.max(3, topic.speakers?.length || 3)) });
  const ed = editionById(edition) || EDITIONS[1];

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
      predictions: cast.slice(0, 2).map((p, i) => ({
        id: `p-${date}-${p.id}-${i + 1}`, personaId: p.id, claim: '',
        confidence: null, resolveBy: defaultResolveBy(date), status: 'open',
      })),
      transcript: cast.map((p) => ({ personaId: p.id, text: '' })),
      memeLine: { text: '', personaId: cast[0].id },
    },

    // Everything the authoring step needs, inline — so the session filling this
    // in never has to go hunting for a persona's voice rules or its standing.
    _authoring: {
      editionBrief: `${ed.name} (${ed.at}) — ${ed.brief}`,
      constraints: {
        headline: '≤90 chars',
        hook: '≤120 chars',
        tldr: '40–110 words, ONE paragraph, no URLs, no markdown, ends on forward tension',
        position: '20–220 chars, must be supported by the cited sources',
        direction: '-2 overhyped … +2 underhyped',
        horizon: '-2 matters this quarter … +2 matters in a decade',
        confidence: 'stance (0,1]; prediction strictly (0,1) — certainty is not a prediction',
        claim: '15–240 chars, dated and falsifiable',
        memeLine: '8–140 chars, no URLs; short and quotable wins',
      },
      rule: 'Every stance must be defensible from the cited sources. A stance the sources do not support is punditry — cut it rather than soften it.',
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
  const topic = wanted ? queue.topics.find((t) => t.slug === wanted) : draftable[0];
  if (!topic) {
    if (wanted) console.error(`✗ topic not found: ${wanted}`);
    else {
      console.error(`✗ none of the ${queue.topics.length} queued topics is draftable — every source is an aggregator redirect with no article body.`);
      console.error('  The radar corroborates across outlets via Google News, but those links cannot be read for facts.');
      console.error('  Wait for a primary-source topic (lab/regulator blog), or pass --topic <slug> to draft one manually from your own reading.');
    }
    process.exitCode = 1;
    return;
  }
  if (!wanted && draftable.length < queue.topics.length) {
    console.log(`  (${queue.topics.length - draftable.length} queued topic(s) skipped: aggregator-only sources cannot be read for facts)`);
  }

  const date = arg('--date') || queue.generatedAt || new Date().toISOString().slice(0, 10);
  const edition = arg('--edition') || topic.edition || 'midday';

  const urls = [...new Set((topic.sources || []).map((s) => s.url))].slice(0, 4);
  const sources = await Promise.all(urls.map(fetchSource));
  const reachable = sources.filter((s) => s.ok);
  if (!reachable.length) {
    console.error('✗ every source for this topic was unreachable — refusing to draft from nothing');
    for (const s of sources) console.error(`    ${s.url} — ${s.reason}`);
    process.exitCode = 1;
    return;
  }

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
  const day = {
    date,
    simulated: false,
    leadSlug: stories[0].slug,
    quietStorySlug: stories.find((s) => s.kind === 'quiet')?.slug,
    stories,
  };
  const errors = validateDay(day, { today: date });
  if (errors.length) {
    console.error('✗ assembled day fails validation — not written:');
    for (const e of errors) console.error(`    ${e}`);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(DAYS_DIR, { recursive: true });
  const out = path.join(DAYS_DIR, `${date}.json`);
  fs.writeFileSync(out, `${JSON.stringify(day, null, 2)}\n`, 'utf8');
  console.log(`✓ promoted ${stories.length} story(ies) → ${path.relative(ROOT, out)}`);
  console.log('  next: node scripts/build-news-desk.mjs --rebuild && node scripts/generate-news-pages.mjs --apply');
}

/* ── Self-test ─────────────────────────────────────────────────────────── */

function selfTest() {
  const cases = [];
  const t = (label, ok) => cases.push([label, ok]);

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

  t('resolveBy lands in the future', defaultResolveBy('2026-08-08') === '2027-02-08');
  t('resolveBy rolls the year', defaultResolveBy('2026-11-08') === '2027-05-08');

  const topic = { title: 'Lab ships agent control roadmap', slug: 'lab-ships-agent-control-roadmap', score: 70, beats: ['safety', 'agents'], reasons: [], speakers: ['mara', 'vera'], sources: [{ url: 'https://a.test/1' }] };
  const standing = personaForm({ entries: [] });
  const sources = [{ url: 'https://a.test/1', ok: true, facts: [{ text: 'x'.repeat(80) }, { text: 'y'.repeat(80) }] }];
  const draft = buildDraft(topic, { date: '2026-08-08', edition: 'midday', standing, sources });

  t('draft is marked not-public-safe', draft.publicSafe === false);
  t('draft seats a real cast', draft.story.stances.length >= 3 && draft.story.stances.every((s) => personaById(s.personaId)));
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

  const failed = cases.filter(([, ok]) => !ok);
  for (const [label, ok] of cases) if (!ok) console.error(`✗ ${label}`);
  console.log(`news-draft-edition --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  if (failed.length) process.exit(1);
}

const argv = process.argv.slice(2);
if (argv.includes('--self-test')) selfTest();
else if (argv.includes('--prepare')) await prepare(argv);
else if (argv.includes('--status')) status(argv);
else if (argv.includes('--promote')) promote(argv);
else {
  console.error('Usage: --prepare [--topic <slug>] [--edition <id>] [--date <YYYY-MM-DD>] | --status | --promote --date <YYYY-MM-DD> | --self-test');
  process.exitCode = 2;
}
