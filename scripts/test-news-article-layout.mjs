#!/usr/bin/env node
/**
 * test-news-article-layout.mjs — S356 reader-first Desk article contract.
 *
 * Reads the RENDERED story pages (never the generator source) and asserts the
 * reading order and the contracts other agents build against:
 *   - first screen order: h1 → deck → byline (+ AI-written line) → illustration
 *     → News Brief, with reader-activity numbers after the story body
 *   - the satire cartoon follows persona analysis and The Desk's Take, before
 *     the full authorship disclosure and subscription area
 *   - every fact <li> keeps id + data-fact-hash and folds its receipt into a
 *     <details class="desk-receipt">
 *   - the community slot matches the desk-comments.js contract exactly
 *   - the story page adds no inline style= attributes inside the article
 *     except the stance-axis dot positions (which need a computed left %)
 *   - "More from The Desk" never links back to the page itself
 *
 * Usage: node scripts/test-news-article-layout.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERSONAS } from './lib/news-desk.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DAYS_DIR = join(ROOT, 'data', 'news-desk', 'days');

const days = readdirSync(DAYS_DIR)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(join(DAYS_DIR, f), 'utf8')))
  .filter((d) => d.simulated === false);

const errors = [];
let pages = 0;

for (const day of days) {
  for (const story of day.stories || []) {
    const rel = `news/${day.date}/${story.slug}/index.html`;
    const file = join(ROOT, rel);
    if (!existsSync(file)) { errors.push(`${rel}: missing`); continue; }
    pages += 1;
    const html = readFileSync(file, 'utf8');
    const article = html.slice(html.indexOf('<article class="desk-article">'), html.indexOf('</article>'));
    const leadPicture = article.match(/id="editorial-illustration-1"[\s\S]*?<picture>([\s\S]*?)<\/picture>/)?.[1];
    const hints = [...html.slice(0, html.indexOf('</head>')).matchAll(/<link[^>]*data-desk-editorial-preload[^>]*>/g)].map(m => m[0]);
    if (leadPicture && !hints.length) errors.push(rel + ': lead image discovery hint missing');
    for (const hint of hints) {
      const href = hint.match(/href="([^"]+)"/)?.[1];
      if (!href || !leadPicture?.includes('srcset="' + href + '"') || !existsSync(join(ROOT, href))) errors.push(rel + ': preload does not match an available lead picture source');
      if (!hint.includes('fetchpriority="high"') || !hint.includes('as="image"')) errors.push(rel + ': lead hint priority/type missing');
    }
    if (hints.length > 1 || hints.some(h => !h.includes('media="(min-width: 601px)"'))) errors.push(rel + ': image preload competes with mobile overview');
    const at = (needle) => article.indexOf(needle);
    const order = [
      ['<h1>', 'headline'],
      ['class="desk-article-deck"', 'deck'],
      ['class="desk-byline"', 'byline'],
      ['class="desk-ai-line"', 'AI-written line'],
      ['id="desk-overview-title"', 'Story Overview'],
      ['id="editorial-illustration-1"', 'illustration'],
      ['id="desk-short-title"', 'News Brief'],
      ['id="story"', 'story body'],
      ['id="sources"', 'sources'],
      ['id="positions"', "The Desk's Take"],
      ['data-story-signals', 'reader views summary'],
      ['data-desk-engagement=', 'reader activity panel'],
      ['id="community"', 'community'],
    ];
    let prev = -1;
    for (const [needle, label] of order) {
      const pos = at(needle);
      if (pos < 0) { errors.push(`${rel}: ${label} missing`); continue; }
      if (pos < prev) errors.push(`${rel}: ${label} renders out of reading order`);
      prev = Math.max(prev, pos);
    }
    if (!/Written by AI personas — no human wrote this\./.test(article)) errors.push(`${rel}: short AI authorship line missing`);
    if (!article.includes('class="desk-ai-banner"')) errors.push(`${rel}: full AI banner copy missing`);
    if (!article.includes('>News Brief</h2>')) errors.push(`${rel}: News Brief heading missing`);
    if (!article.includes('The Desk’s Take')) errors.push(`${rel}: updated persona-analysis heading missing`);
    if (at('id="satire-cartoon"') >= 0) {
      const cartoon = at('id="satire-cartoon"');
      for (const needle of ['id="positions"', 'id="predictions"', 'id="argument"']) {
        if (at(needle) >= 0 && cartoon < at(needle)) errors.push(`${rel}: satire precedes persona analysis`);
      }
      for (const needle of ['id="how-this-was-written"', 'data-desk-dispatch="story"']) {
        if (at(needle) < 0 || cartoon > at(needle)) errors.push(`${rel}: satire follows or lacks authorship/subscription area`);
      }
    }

    const community = `<section class="desk-comments" id="community" data-desk-comments data-slug="${day.date}/${story.slug}" aria-labelledby="desk-comments-title"><h2 id="desk-comments-title">Community</h2><p class="desk-comments-fallback">Comments are loading…</p></section>`;
    if (!article.includes(community)) errors.push(`${rel}: community slot does not match the desk-comments contract`);

    const commentsScript = html.match(/<script src="\/(assets\/desk-comments\.shell-[a-f0-9]{10}\.js)" defer><\/script>/);
    if (!commentsScript || !existsSync(join(ROOT, commentsScript[1]))) errors.push(`${rel}: fingerprinted comments client missing`);
    if (!html.includes('<link rel="stylesheet" href="/assets/desk-comments.css">')) errors.push(`${rel}: comments stylesheet missing`);
    const facts = [...article.matchAll(/<li id="(fact-[^"]+)" data-fact-id="[^"]+" data-fact-hash="([a-f0-9]{64})">([\s\S]*?)<\/li>/g)];
    if (facts.length !== (story.facts || []).length) errors.push(`${rel}: ${facts.length} fact rows rendered, ${(story.facts || []).length} in corpus`);
    for (const [, id, hash, body] of facts) {
      if (!/<details class="desk-receipt"><summary>Receipt<\/summary><code class="desk-claim-receipt"/.test(body)) errors.push(`${rel}: ${id} receipt is not folded into a disclosure`);
      if (!body.includes(`sha256:${hash}`)) errors.push(`${rel}: ${id} receipt hash mismatch`);
      if (!/class="desk-source" href="[^"]+"/.test(body)) errors.push(`${rel}: ${id} has no source link`);
    }

    const inlineStyles = (article.match(/<[^>]+style="[^"]*"/g) || []).filter((tag) => !tag.includes('class="desk-axis-dot"'));
    if (inlineStyles.length) errors.push(`${rel}: ${inlineStyles.length} inline style attribute(s) in the article, e.g. ${inlineStyles[0].slice(0, 90)}`);

    const more = article.slice(at('class="desk-more"'));
    if (at('class="desk-more"') >= 0 && more.includes(`href="/news/${day.date}/${story.slug}/"`)) errors.push(`${rel}: More from The Desk links to itself`);
    if ((article.match(/data-reaction="panel-/g) || []).length !== 8) errors.push(`${rel}: expected eight panel reactions`);
  }
}

const hub = readFileSync(join(ROOT, 'news', 'index.html'), 'utf8');
if ((hub.match(/class="desk-panel desk-story-card desk-lead"/g) || []).length !== 1) errors.push('news/index.html: expected exactly one lead card');
if (!hub.includes('class="desk-story-grid"')) errors.push('news/index.html: story grid missing');
const publishedDays = [...days].filter((day) => day.stories?.some((story) => !story.supersededBy)).sort((a, b) => b.date.localeCompare(a.date));
const recentDays = publishedDays.slice(0, 7);
if ((hub.match(/class="desk-edition"/g) || []).length !== recentDays.length) errors.push('news/index.html: expected the latest seven full editions');
for (const day of recentDays) {
  for (const story of day.stories.filter((entry) => !entry.supersededBy)) {
    if (!hub.includes(`href="/news/${day.date}/${story.slug}/"`)) errors.push(`news/index.html: recent story ${day.date}/${story.slug} missing`);
  }
}
const archiveIndexPath = join(ROOT, 'news', 'archive', 'index.html');
if (!existsSync(archiveIndexPath)) errors.push('news/archive/index.html: missing');
const archiveIndex = existsSync(archiveIndexPath) ? readFileSync(archiveIndexPath, 'utf8') : '';
if (!hub.includes('href="/news/archive/"')) errors.push('news/index.html: archive link missing');
const monthKeys = [...new Set(publishedDays.map((day) => day.date.slice(0, 7)))];
for (const month of monthKeys) {
  const rel = `news/archive/${month}/index.html`;
  const file = join(ROOT, rel);
  if (!archiveIndex.includes(`href="/news/archive/${month}/"`)) errors.push(`news/archive/index.html: ${month} missing`);
  if (!existsSync(file)) { errors.push(`${rel}: missing`); continue; }
  const html = readFileSync(file, 'utf8');
  if (Buffer.byteLength(html) > 200 * 1024) errors.push(`${rel}: exceeds the 200 KiB HTML budget`);
  for (const day of publishedDays.filter((entry) => entry.date.startsWith(month))) {
    for (const story of day.stories.filter((entry) => !entry.supersededBy)) {
      if (!html.includes(`href="/news/${day.date}/${story.slug}/"`)) errors.push(`${rel}: ${day.date}/${story.slug} missing`);
    }
  }
}
if (Buffer.byteLength(hub) > 200 * 1024) errors.push('news/index.html: exceeds the 200 KiB HTML budget');
if (Buffer.byteLength(archiveIndex) > 200 * 1024) errors.push('news/archive/index.html: exceeds the 200 KiB HTML budget');

// Growing profile histories must remain complete without making one page unbounded.
for (const persona of PERSONAS) {
  const base = `news/personas/${persona.id}/`;
  const pageDir = join(ROOT, base, 'page');
  const profilePaths = [base + 'index.html', ...(existsSync(pageDir) ? readdirSync(pageDir).filter(n => /^\d+$/.test(n)).sort((a,b) => Number(a)-Number(b)).map(n => `${base}page/${n}/index.html`) : [])];
  const expected = [...days].sort((a,b) => b.date.localeCompare(a.date)).flatMap(day => (day.stories || []).filter(story => !story.supersededBy && (
    story.body?.some(block => block.voice === persona.id && block.text) || story.stances?.some(stance => stance.personaId === persona.id) ||
    story.transcript?.some(turn => turn.personaId === persona.id && turn.text) || (story.memeLine?.personaId === persona.id && story.memeLine?.text) ||
    story.predictions?.some(prediction => prediction.personaId === persona.id)
  )).map(story => `/news/${day.date}/${story.slug}/`));
  const actual = [];
  for (const rel of profilePaths) {
    const html = readFileSync(join(ROOT, rel), 'utf8');
    if (Buffer.byteLength(html) > 200 * 1024) errors.push(`${rel}: exceeds the 200 KiB HTML budget`);
    const feed = html.match(/<ol class="desk-profile-feed"[^>]*>([\s\S]*?)<\/ol>/)?.[1] || '';
    const links = [...feed.matchAll(/<h3><a href="([^"]+)">/g)].map(match => match[1]);
    if (links.length > 12) errors.push(`${rel}: unbounded profile feed`);
    actual.push(...links);
    for (const match of html.matchAll(/href="(\/news\/personas\/[^"#]+)(?:#profile-work)?"/g)) {
      if (!existsSync(join(ROOT, match[1], 'index.html'))) errors.push(`${rel}: missing profile pagination destination ${match[1]}`);
    }
    const canonical = rel.slice(0, -'index.html'.length);
    if (!html.includes(`rel="canonical" href="https://vaultsparkstudios.com/${canonical}"`)) errors.push(`${rel}: incorrect profile canonical`);
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${base}: profile history has missing, duplicate or out-of-order contributions`);
}

if (errors.length) {
  console.error(`test-news-article-layout: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`test-news-article-layout: ${pages} article(s) + index + ${monthKeys.length} archive month(s) — reader-first order and contracts hold`);
