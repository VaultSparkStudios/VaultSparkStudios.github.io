#!/usr/bin/env node
/**
 * test-news-article-layout.mjs — S356 reader-first Desk article contract.
 *
 * Reads the RENDERED story pages (never the generator source) and asserts the
 * reading order and the contracts other agents build against:
 *   - first screen order: h1 → deck → byline (+ AI-written line) → illustration
 *     → "The short version", with reader-activity numbers after the story body
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
    const at = (needle) => article.indexOf(needle);
    const order = [
      ['<h1>', 'headline'],
      ['class="desk-article-deck"', 'deck'],
      ['class="desk-byline"', 'byline'],
      ['class="desk-ai-line"', 'AI-written line'],
      ['id="editorial-illustration-1"', 'illustration'],
      ['id="desk-short-title"', 'short version'],
      ['id="story"', 'story body'],
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

if (errors.length) {
  console.error(`test-news-article-layout: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`test-news-article-layout: ${pages} article(s) + index — reader-first order and contracts hold`);
