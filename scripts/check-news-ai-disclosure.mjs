#!/usr/bin/env node
/**
 * check-news-ai-disclosure.mjs — The Desk must never let a reader believe a
 * human wrote it.
 *
 * Founder directive (S308): "we never want to trick them and make them think a
 * human wrote any of it if one didn't." That is a stronger requirement than
 * "the page has a disclosure somewhere", because the realistic way a reader is
 * misled here is not a missing footer — it is meeting REX or MARA as a BYLINE.
 * Every other publication's named voices are people, so a named voice with a
 * pull-quote and a track record reads as a columnist by default. The disclosure
 * therefore has to travel with the attribution, and with the artifacts that
 * leave the site entirely.
 *
 * `check-ai-disclosure-alignment.mjs` covers /privacy and /terms. It does not
 * look at /news at all, which is how this surface shipped unguarded.
 *
 * Enforced, per surface, because each fails differently:
 *   - PAGE      an above-content banner, before any persona quote is reachable
 *   - BYLINE    "AI persona" inline at every point of attribution
 *   - JSON-LD   author is an Organization (NEVER a Person) + creditText
 *   - FEED      authors[].name says it — aggregators render that, not prose
 *   - CARD      the OG image says it — social cards travel with zero context
 *
 * Usage: --check (default) | --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderNewsCardSvg, PERSONAS } from './lib/news-desk.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Phrases that make authorship unambiguous rather than merely topical. */
export const PAGE_REQUIRED = [
  /written by ai/i,
  /no human wrote this/i,
  /experimental/i,
  /fictional characters, not people/i,
];

export const FEED_AUTHOR_REQUIRED = /ai personas \(no human author\)/i;
export const CARD_REQUIRED = /WRITTEN BY AI/;

/**
 * "AI signal" is NOT acceptable disclosure and is explicitly rejected: The Desk
 * reports ON artificial intelligence, so a reader parses "AI signal" as the
 * TOPIC, not as the author. That ambiguity is exactly what shipped on the
 * social card until this gate existed.
 */
export const AMBIGUOUS_TOPIC_ONLY = /\bAI SIGNAL\b/;

export function evaluatePage(html, label) {
  const findings = [];
  for (const re of PAGE_REQUIRED) {
    if (!re.test(html)) findings.push(`${label}: missing authorship phrase ${re}`);
  }
  // Every persona attribution must carry the tag at the attribution point.
  const bylines = html.match(/class="desk-stance-name"[\s\S]{0,400}?<\/div>/g) || [];
  for (const b of bylines) {
    if (!/AI persona/i.test(b)) findings.push(`${label}: a persona byline omits "AI persona"`);
  }
  // schema.org author must never be a Person.
  if (/"@type"\s*:\s*"NewsArticle"/.test(html)) {
    const authorBlock = html.match(/"author"\s*:\s*\{[^}]*\}/);
    if (!authorBlock) findings.push(`${label}: NewsArticle has no author`);
    else {
      if (/"@type"\s*:\s*"Person"/.test(authorBlock[0])) findings.push(`${label}: NewsArticle author is a Person — implies a human wrote it`);
      if (!/AI personas/i.test(authorBlock[0])) findings.push(`${label}: NewsArticle author does not disclose AI authorship`);
    }
    if (!/"creditText"/.test(html)) findings.push(`${label}: NewsArticle missing creditText disclosure`);
  }
  return findings;
}

export function evaluateFeed(feed) {
  const findings = [];
  const author = feed?.authors?.[0]?.name || '';
  if (!FEED_AUTHOR_REQUIRED.test(author)) findings.push(`feed authors[0].name does not disclose AI authorship: "${author}"`);
  const d = feed?._vaultspark_disclosure;
  if (!d) findings.push('feed missing _vaultspark_disclosure');
  else {
    if (d.aiGenerated !== true) findings.push('feed disclosure: aiGenerated must be true');
    if (d.humanAuthored !== false) findings.push('feed disclosure: humanAuthored must be false');
    if (d.experimental !== true) findings.push('feed disclosure: experimental must be true');
    if (!/fictional characters, not people/i.test(d.statement || '')) findings.push('feed disclosure statement must say the personas are not people');
  }
  for (const item of feed?.items || []) {
    if (!FEED_AUTHOR_REQUIRED.test(item?.authors?.[0]?.name || '')) {
      findings.push(`feed item ${item?.id} does not carry AI authorship — it can be syndicated alone`);
    }
  }
  return findings;
}

/**
 * Evaluate a RENDERED card, never the renderer's source.
 *
 * The first version of this read `news-desk.mjs` as text, where the byline is
 * the template literal `— ${persona.name}, …`. `${` is not an uppercase name,
 * so the attribution assertion could never match and the check passed
 * vacuously — green while proving nothing, the exact failure mode this whole
 * session kept finding elsewhere. Rendering a real card is the only way to
 * assert what a reader actually sees.
 */
export function evaluateCardSvg(svg) {
  const findings = [];
  if (!CARD_REQUIRED.test(svg)) findings.push('social card does not say WRITTEN BY AI');
  if (AMBIGUOUS_TOPIC_ONLY.test(svg)) findings.push('social card uses "AI SIGNAL", which reads as the topic, not the author');
  const attribution = svg.match(/—\s*([A-Za-z]+)\s*,\s*([^<]{0,60})/);
  if (attribution && !/AI persona/i.test(attribution[2])) {
    findings.push(`social card attributes a quote to "${attribution[1]}" without labelling the speaker an AI persona`);
  }
  return findings;
}

function newsPages() {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'index.html') out.push(p);
    }
  };
  walk(path.join(ROOT, 'news'));
  return out;
}

async function check() {
  const findings = [];

  const pages = newsPages();
  if (!pages.length) findings.push('no /news pages found — cannot verify disclosure');
  for (const p of pages) {
    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    // The confirmation landing carries no stories or personas; it needs the
    // closing disclosure but not the pre-content banner.
    if (rel === 'news/subscribed/index.html') continue;
    findings.push(...evaluatePage(fs.readFileSync(p, 'utf8'), rel));
  }

  const feedPath = path.join(ROOT, 'api', 'news-desk-feed.json');
  if (fs.existsSync(feedPath)) {
    try { findings.push(...evaluateFeed(JSON.parse(fs.readFileSync(feedPath, 'utf8')))); }
    catch { findings.push('api/news-desk-feed.json does not parse'); }
  }

  // Render a real card from the live renderer and assert what a reader sees.
  findings.push(...evaluateCardSvg(renderNewsCardSvg({
    memeLine: 'A representative pull quote.',
    personaId: PERSONAS[0].id,
    heat: 50,
    date: '2026-01-01',
    headline: 'A representative headline',
  })));

  if (findings.length) {
    console.error('check-news-ai-disclosure: FAIL — The Desk could mislead a reader about authorship:');
    for (const f of findings) console.error(`  ⛔ ${f}`);
    process.exit(1);
  }
  console.log(`check-news-ai-disclosure: ok — ${pages.length} page(s), feed, and card template all disclose AI authorship`);
}

function selfTest() {
  const cases = [];
  const t = (label, ok) => cases.push([label, ok]);

  const goodPage = `Written by AI. experimental. no human wrote this. fictional characters, not people.
    <div class="desk-stance-name"><strong>REX · AI persona · role</strong></div>
    "@type":"NewsArticle" "author":{"@type":"Organization","name":"The Desk — AI personas"} "creditText":"x"`;
  t('a fully disclosed page passes', evaluatePage(goodPage, 'p').length === 0);
  t('a page missing the banner fails', evaluatePage(goodPage.replace('Written by AI.', ''), 'p').length > 0);
  t('a page that omits "experimental" fails', evaluatePage(goodPage.replace('experimental.', ''), 'p').length > 0);
  t('a page that does not say the personas are not people fails',
    evaluatePage(goodPage.replace('fictional characters, not people.', ''), 'p').length > 0);
  t('an untagged persona byline fails', evaluatePage(
    goodPage.replace('REX · AI persona · role', 'REX · role'), 'p',
  ).some((f) => /byline/.test(f)));
  t('a Person author is rejected outright', evaluatePage(
    goodPage.replace('"@type":"Organization"', '"@type":"Person"'), 'p',
  ).some((f) => /Person/.test(f)));
  t('a NewsArticle without creditText fails', evaluatePage(
    goodPage.replace('"creditText":"x"', ''), 'p',
  ).some((f) => /creditText/.test(f)));

  const goodFeed = {
    authors: [{ name: 'The Desk — AI personas (no human author)' }],
    _vaultspark_disclosure: { aiGenerated: true, humanAuthored: false, experimental: true, statement: 'fictional characters, not people' },
    items: [{ id: 'a', authors: [{ name: 'The Desk — AI personas (no human author)' }] }],
  };
  t('a disclosed feed passes', evaluateFeed(goodFeed).length === 0);
  t('a masthead-style feed author fails', evaluateFeed(
    { ...goodFeed, authors: [{ name: 'The Desk · VaultSpark Studios' }] },
  ).some((f) => /authors\[0\]/.test(f)));
  t('humanAuthored:true is rejected', evaluateFeed(
    { ...goodFeed, _vaultspark_disclosure: { ...goodFeed._vaultspark_disclosure, humanAuthored: true } },
  ).length > 0);
  t('an item without authorship fails — items syndicate alone', evaluateFeed(
    { ...goodFeed, items: [{ id: 'b', authors: [{ name: 'The Desk' }] }] },
  ).some((f) => /item b/.test(f)));
  t('a feed with no disclosure block fails', evaluateFeed({ authors: goodFeed.authors, items: [] }).length > 0);

  t('a disclosed card passes', evaluateCardSvg('WRITTEN BY AI ... — REX, AI persona · role').length === 0);
  t('the ambiguous "AI SIGNAL" wording is rejected', evaluateCardSvg(
    'THE DESK · AI SIGNAL — REX, AI persona',
  ).some((f) => /topic/.test(f)));
  t('a card with no disclosure fails', evaluateCardSvg('THE DESK — REX, role').length > 0);
  t('an unlabelled quote attribution is caught', evaluateCardSvg(
    'WRITTEN BY AI ... — REX, Accelerationist maximalist',
  ).some((f) => /without labelling/.test(f)));
  // The regression that made the first version of this check vacuous.
  t('the live renderer emits a disclosed card', (() => {
    const svg = renderNewsCardSvg({ memeLine: 'q', personaId: PERSONAS[0].id, heat: 50, date: '2026-01-01', headline: 'h' });
    return evaluateCardSvg(svg).length === 0 && /WRITTEN BY AI/.test(svg) && /AI persona/.test(svg);
  })());

  const failed = cases.filter(([, ok]) => !ok);
  for (const [label, ok] of cases) if (!ok) console.error(`✗ ${label}`);
  console.log(`check-news-ai-disclosure --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  if (failed.length) process.exit(1);
}

if (process.argv.includes('--self-test')) selfTest();
else check();
