#!/usr/bin/env node
/**
 * build-home-desk-module.mjs — S319, promoted to a flagship module in S356.
 *
 * THE GAP THIS CLOSES (founder-reported, twice).
 * S319: The Desk appeared on the homepage only as a nav-dropdown link and a
 * footer link. This module gave it a server-rendered showcase.
 * S356: that showcase sat ~140 lines below <main>, after the Analytica block —
 * far below the fold. The founder asked to "feature The Desk more across the
 * website on the homepage". The module now renders DIRECTLY AFTER THE HERO and
 * carries the lead story's editorial art plus up to four secondary headlines.
 *
 * DESIGN NOTES
 * · Server-rendered into a marked block. No client JS, so this adds no shell
 *   asset, rotates no shell hash, and cannot strand a callee.
 * · Styles are scoped and inlined in the block for the same reason: touching the
 *   shared stylesheet would rotate `style.shell-<hash>.css` for one section.
 * · Cadence language is READ from api/news-desk-freshness.json, never asserted.
 *   If the Desk is overdue the module says so (CANON-031). The pulse dot only
 *   animates when the measured cadence is daily.
 * · Art (S356): the S319 text-only rule existed because the only art was a
 *   ~531 KB social PNG with no AVIF/WebP sibling. Every edition now ships an
 *   article-bound editorial panel at /assets/og/news/<date>--<slug>--meme.{avif,webp,png}
 *   (1200x630, AVIF ~25 KB). The lead renders it as a <picture> with explicit
 *   dimensions, loading="lazy" + decoding="async" and NO fetchpriority: the
 *   block sits below the hero, which is taller than the first viewport at both
 *   390x844 and 1366x900, so it must never compete with the hero LCP image.
 *   Art is rendered only when all three formats exist on disk; otherwise the
 *   lead degrades to text. The feed carries no alt field, so alt text is
 *   DERIVED from the panel's own legible content (persona, headline, meme line).
 *
 * Modes: (default) apply · --check (byte-drift gate) · --self-test
 *        --home <path> points apply/--check at another file (e.g. a temp copy).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argValue = (flag) => {
  const index = process.argv.indexOf(flag);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : null;
};
const HOME = argValue('--home') ? path.resolve(argValue('--home')) : path.join(ROOT, 'index.html');
const DESK_FEED = path.join(ROOT, 'api', 'news-desk.json');
const FRESHNESS_FEED = path.join(ROOT, 'api', 'news-desk-freshness.json');

export const START = '<!-- desk-showcase:start -->';
export const END = '<!-- desk-showcase:end -->';

/**
 * S356: the block is injected immediately BEFORE this marker — the first stable
 * marker after the hero's closing </section>, so the Desk is the first module a
 * visitor reaches after the hero.
 */
export const ANCHOR = '<!-- analytica-showcase:start -->';

/** How many secondary headlines accompany the lead. */
export const MAX_SECONDARY = 4;

/** Editorial panel geometry (scripts/build-news-desk.mjs renders 1200x630). */
export const ART_WIDTH = 1200;
export const ART_HEIGHT = 630;
const ART_FORMATS = ['avif', 'webp', 'png'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PERSONA_RE = /^[a-z]{2,16}$/;

const readJson = (file, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};

/**
 * A colour fallback is theme-blind by construction: `var(--x, #hex)` renders the
 * hex in EVERY theme whenever --x is undefined. The first version of this module
 * used var(--surface,#15151b) and var(--border,#2a2a33) — tokens this site never
 * defined — so the staging gate found 338 WCAG AA contrast violations in light
 * mode. Only real tokens may appear in the block.
 */
const THEME_BLIND_FALLBACK = new RegExp('var\\(--[a-z-]+\\s*,\\s*#[0-9a-f]{3,8}\\)', 'i');

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

/**
 * Cadence copy, derived strictly from the freshness receipt.
 *
 * `state` is evidence-derived by lib/news-freshness.mjs — it reports the cadence
 * OBSERVED in the corpus, not the cadence the cron schedule intends. So this
 * function never needs to know whether the scheduler is healthy; it only ever
 * repeats a measured fact.
 */
export function cadenceLine(freshness) {
  const state = freshness?.state || null;
  const latest = freshness?.latestEditionDate || null;
  const age = Number.isFinite(freshness?.ageDays) ? freshness.ageDays : null;
  if (!state || !latest) return { key: 'unverified', label: 'Unverified', detail: 'Cadence evidence is unavailable.' };
  if (state === 'daily') {
    return { key: 'daily', label: 'Daily', detail: `Latest edition ${latest}${age === 0 ? ' — today' : age === 1 ? ' — yesterday' : ''}.` };
  }
  if (state === 'periodic') {
    return { key: 'periodic', label: 'Periodic', detail: `Latest edition ${latest} · ${age} days ago. Not claiming a daily edition while overdue.` };
  }
  return { key: 'paused', label: 'Paused', detail: `Latest edition ${latest} · ${age} days ago. Published work stays available.` };
}

/** The art base path for a card, or null when date/slug are not path-safe. */
export function artBase(card) {
  if (!DATE_RE.test(card?.date || '') || !SLUG_RE.test(card?.slug || '')) return null;
  return `/assets/og/news/${card.date}--${card.slug}--meme`;
}

/** Disk probe used by the real build: art counts only when every format exists. */
export function diskHasArt(base, root = ROOT) {
  if (typeof base !== 'string' || !base.startsWith('/assets/og/news/')) return false;
  return ART_FORMATS.every((ext) => fs.existsSync(path.join(root, `${base.slice(1)}.${ext}`)));
}

/** Persona display name — the Desk's personas are named by their uppercased id. */
export function personaName(card) {
  const id = String(card?.memePersona || '');
  return PERSONA_RE.test(id) ? id.toUpperCase() : null;
}

/**
 * Derived alt text. api/news-desk.json carries no alt field (gap reported in
 * S356), and the panel is a text composition: persona, date, headline and the
 * meme line. The alt therefore says what a sighted reader can read on it.
 */
export function artAlt(card) {
  const persona = personaName(card);
  const who = persona ? `${persona}’s editorial panel` : 'Editorial panel';
  const headline = String(card?.headline || '').replace(/\s+/g, ' ').trim();
  const line = typeof card?.memeLine === 'string' && card.memeLine.trim() ? `: “${card.memeLine.replace(/\s+/g, ' ').trim()}”` : '';
  return `${who} for “${headline}”${line}`;
}

const STYLE = [
  '      <style>',
  '        .desk-showcase{padding:3.5rem 0 4rem}',
  '        .desk-showcase__head{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end;justify-content:space-between;margin-bottom:.6rem}',
  '        .desk-showcase__title{margin-top:.6rem}',
  '        .desk-showcase__cadence{color:var(--muted);font-size:.9rem;margin:0 0 1.5rem}',
  '        .desk-showcase__cadence b{color:var(--text)}',
  '        .desk-showcase__dot{display:inline-block;vertical-align:middle;width:8px;height:8px;margin:0 .5rem 2px 0;border-radius:50%;background:var(--gold)}',
  '        .desk-showcase__dot[data-cadence="paused"],.desk-showcase__dot[data-cadence="unverified"]{background:var(--dim)}',
  '        .desk-showcase__dot[data-cadence="daily"]{animation:desk-showcase-pulse 2.4s ease-in-out infinite}',
  '        @keyframes desk-showcase-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
  '        @media (prefers-reduced-motion:reduce){.desk-showcase__dot{animation:none}}',
  '        [data-motion="reduced"] .desk-showcase__dot{animation:none}',
  '        .desk-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:1.5rem;align-items:start}',
  '        .desk-lead{display:block;border:1px solid var(--header-border);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;background:var(--bg-soft)}',
  '        .desk-lead:hover,.desk-lead:focus-visible{border-color:var(--gold)}',
  '        .desk-lead__art{display:block;aspect-ratio:1200/630;background:var(--bg)}',
  '        .desk-lead__art img{display:block;width:100%;height:100%;object-fit:cover}',
  '        .desk-lead__body{padding:1.25rem 1.35rem 1.4rem}',
  '        .desk-lead__kicker{font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}',
  '        .desk-lead__headline{font-size:1.5rem;line-height:1.22;margin:.45rem 0 .55rem}',
  '        .desk-lead__hook{color:var(--muted)}',
  '        .desk-lead__read{display:inline-block;margin-top:.9rem;font-weight:600;color:var(--text)}',
  '        .desk-lead__kicker,.desk-lead__hook{margin:0}',
  '        .desk-column{display:flex;flex-direction:column;gap:.85rem}',
  '        .desk-column__label{font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}',
  '        .desk-mini{display:flex;flex-direction:column;gap:.3rem;padding:.9rem 1rem;border:1px solid var(--header-border);border-radius:12px;text-decoration:none;color:inherit;background:var(--bg-soft)}',
  '        .desk-mini:hover,.desk-mini:focus-visible{border-color:var(--gold)}',
  '        .desk-mini__meta{font-size:.75rem;color:var(--muted)}',
  '        .desk-mini__headline{font-weight:600;line-height:1.3}',
  '        .desk-mini__hook{font-size:.86rem;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
  '        .desk-showcase__empty{color:var(--muted)}',
  '        @media (max-width:820px){.desk-grid{grid-template-columns:1fr}.desk-lead__headline{font-size:1.25rem}}',
  '      </style>',
];

const HEAD = [
  '        <div class="desk-showcase__head">',
  '          <div><p class="eyebrow">The Desk · AI news station</p><h2 id="desk-showcase-title" class="desk-showcase__title">AI news, argued by the desk.</h2></div>',
  '          <a class="button-secondary button-sm" href="/news/" data-track-event="home_desk_deep_click">Read The Desk →</a>',
  '        </div>',
];

/**
 * Render the block. Returns the marked HTML including both markers so the
 * splice is a pure string replacement with no positional guessing.
 *
 * `hasArt(base)` decides whether the lead's editorial panel exists. It defaults
 * to "no art" so the renderer stays pure; the real build passes diskHasArt.
 */
export function renderBlock(deskFeed, freshness, { hasArt = () => false } = {}) {
  const cards = Array.isArray(deskFeed?.cards) ? deskFeed.cards : [];
  const live = deskFeed?.state === 'live' && cards.length > 0;
  const cadence = cadenceLine(freshness);

  // No editions is a real state, not an empty grid. Say it plainly rather than
  // rendering a skeleton that looks broken.
  if (!live) {
    return [
      START,
      '    <section class="desk-showcase" aria-labelledby="desk-showcase-title" data-desk-surface="showcase" data-desk-state="empty">',
      ...STYLE,
      '      <div class="container">',
      ...HEAD,
      `        <p class="desk-showcase__empty">No published edition yet. <a href="/api/news-desk-freshness.json">Check freshness →</a></p>`,
      '      </div>',
      '    </section>',
      END,
    ].join('\n');
  }

  const [lead, ...rest] = cards;
  const secondary = rest.slice(0, MAX_SECONDARY);

  const base = artBase(lead);
  const art = base && hasArt(base) === true ? base : null;
  const leadPersona = personaName(lead);
  const storyCount = Number.isInteger(lead.storyCount) && lead.storyCount > 1 ? `${lead.storyCount} stories` : null;
  const leadKicker = [`Lead story · ${lead.date}`, leadPersona && `${leadPersona}’s take`, storyCount].filter(Boolean).join(' · ');

  const artHtml = art ? [
    '            <picture class="desk-lead__art">',
    `              <source srcset="${escapeHtml(art)}.avif" type="image/avif">`,
    `              <source srcset="${escapeHtml(art)}.webp" type="image/webp">`,
    `              <img src="${escapeHtml(art)}.png" width="${ART_WIDTH}" height="${ART_HEIGHT}" alt="${escapeHtml(artAlt(lead))}" loading="lazy" decoding="async">`,
    '            </picture>',
  ] : [];

  const secondaryHtml = secondary.flatMap((card) => {
    const persona = personaName(card);
    return [
      `            <a class="desk-mini" href="${escapeHtml(card.href)}">`,
      `              <span class="desk-mini__meta">Edition ${escapeHtml(card.date)}${persona ? ` · ${escapeHtml(persona)}’s take` : ''}</span>`,
      `              <span class="desk-mini__headline">${escapeHtml(card.headline)}</span>`,
      card.hook ? `              <span class="desk-mini__hook">${escapeHtml(card.hook)}</span>` : '',
      '            </a>',
    ];
  });

  return [
    START,
    '    <section class="desk-showcase" aria-labelledby="desk-showcase-title" data-desk-surface="showcase" data-desk-state="live">',
    ...STYLE,
    '      <div class="container">',
    ...HEAD,
    `        <p class="desk-showcase__cadence"><span class="desk-showcase__dot" data-cadence="${escapeHtml(cadence.key)}" aria-hidden="true"></span><b>${escapeHtml(cadence.label)} cadence</b> · ${escapeHtml(cadence.detail)}</p>`,
    '        <div class="desk-grid">',
    `          <a class="desk-lead" href="${escapeHtml(lead.href)}" data-track-event="home_desk_lead_click">`,
    ...artHtml,
    '            <div class="desk-lead__body">',
    `              <p class="desk-lead__kicker">${escapeHtml(leadKicker)}</p>`,
    `              <h3 class="desk-lead__headline">${escapeHtml(lead.headline)}</h3>`,
    lead.hook ? `              <p class="desk-lead__hook">${escapeHtml(lead.hook)}</p>` : '',
    '              <span class="desk-lead__read">Read the story →</span>',
    '            </div>',
    '          </a>',
    secondary.length ? '          <div class="desk-column">' : '',
    secondary.length ? '            <p class="desk-column__label">Also on The Desk</p>' : '',
    ...secondaryHtml,
    secondary.length ? '          </div>' : '',
    '        </div>',
    '      </div>',
    '    </section>',
    END,
  ].filter((line) => line !== '').join('\n');
}

/**
 * Remove a prior block wherever it sits, restoring the surrounding bytes.
 *  · current placement: `<indent>START…END\n\n<indent>ANCHOR` → `<indent>ANCHOR`
 *  · pre-S356 placement: `…analytica-showcase:end -->\n\nSTART…END` → original
 */
export function stripBlock(html) {
  const startIndex = html.indexOf(START);
  const endIndex = html.indexOf(END);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return html;
  let before = html.slice(0, startIndex);
  let after = html.slice(endIndex + END.length);
  if (/^\s*<!-- analytica-showcase:start -->/.test(after)) after = after.replace(/^\s+/, '');
  else before = before.replace(/\n\n$/, '');
  return before + after;
}

/** Splice the block directly after the hero (before ANCHOR), replacing any prior one. */
export function spliceBlock(html, block) {
  const clean = stripBlock(html);
  const anchorIndex = clean.indexOf(ANCHOR);
  if (anchorIndex === -1) throw new Error(`cannot place the Desk module: anchor ${ANCHOR} not found in index.html`);
  const lineStart = clean.lastIndexOf('\n', anchorIndex) + 1;
  const indent = clean.slice(lineStart, anchorIndex);
  const safeIndent = /^[ \t]*$/.test(indent) ? indent : '';
  return `${clean.slice(0, anchorIndex)}${block}\n\n${safeIndent}${clean.slice(anchorIndex)}`;
}

function build() {
  const html = fs.readFileSync(HOME, 'utf8');
  const block = renderBlock(readJson(DESK_FEED), readJson(FRESHNESS_FEED), { hasArt: (base) => diskHasArt(base) });
  return spliceBlock(html, block);
}

function selfTest() {
  const t = [];
  const add = (name, ok) => t.push([name, ok]);

  const feed = {
    state: 'live',
    cards: [
      { date: '2026-08-11', slug: 'a-story', href: '/news/a/', headline: 'A headline', hook: 'A hook', memeLine: 'A meme line', memePersona: 'vera', storyCount: 3, image: '/assets/og/a.png' },
      { date: '2026-08-10', slug: 'b-story', href: '/news/b/', headline: 'B headline', hook: 'B hook', memePersona: 'rex' },
      { date: '2026-08-09', slug: 'c-story', href: '/news/c/', headline: 'C headline', hook: 'C hook' },
      { date: '2026-08-08', slug: 'd-story', href: '/news/d/', headline: 'D headline', hook: 'D hook' },
      { date: '2026-08-07', slug: 'e-story', href: '/news/e/', headline: 'E headline', hook: 'E hook' },
      { date: '2026-08-06', slug: 'f-story', href: '/news/f/', headline: 'F headline', hook: 'F hook' },
    ],
  };
  const withArt = { hasArt: () => true };

  const daily = renderBlock(feed, { state: 'daily', latestEditionDate: '2026-08-11', ageDays: 0 }, withArt);
  const periodic = renderBlock(feed, { state: 'periodic', latestEditionDate: '2026-08-11', ageDays: 6 }, withArt);
  const paused = renderBlock(feed, { state: 'paused', latestEditionDate: '2026-08-11', ageDays: 7 }, withArt);
  const noArt = renderBlock(feed, { state: 'daily', latestEditionDate: '2026-08-11', ageDays: 0 });
  const empty = renderBlock({ state: 'empty', cards: [] }, { state: 'paused', latestEditionDate: null, ageDays: null });

  add('the lead edition is rendered', daily.includes('A headline') && daily.includes('/news/a/'));
  add(`at most ${MAX_SECONDARY} secondary cards render`, (daily.match(/class="desk-mini"/g) || []).length === MAX_SECONDARY);
  add('cards beyond the secondary budget are not rendered', !daily.includes('F headline') && daily.includes('E headline'));
  add('a card without art or persona still renders', daily.includes('C headline'));
  add('persona and edition labels render', daily.includes('VERA’s take') && daily.includes('Edition 2026-08-10 · REX’s take') && daily.includes('3 stories'));

  // Image contract (S356): the ONLY image is the lead's lazy <picture>.
  const img = (daily.match(/<img\b[^>]*>/g) || []);
  add('exactly one picture and one img, both inside the lead', (daily.match(/<picture\b/g) || []).length === 1 && img.length === 1
    && daily.indexOf('<picture') > daily.indexOf('class="desk-lead"') && daily.indexOf('<picture') < daily.indexOf('class="desk-mini"'));
  add('the img is lazy, async and has explicit dimensions', /loading="lazy"/.test(img[0] || '') && /decoding="async"/.test(img[0] || '')
    && (img[0] || '').includes(`width="${ART_WIDTH}"`) && (img[0] || '').includes(`height="${ART_HEIGHT}"`));
  add('the module never sets fetchpriority (the hero owns LCP)', !/fetchpriority/i.test(daily));
  add('sources are avif then webp with a png img, one base', daily.indexOf('--meme.avif" type="image/avif"') !== -1
    && daily.indexOf('--meme.avif') < daily.indexOf('--meme.webp') && (img[0] || '').includes('src="/assets/og/news/2026-08-11--a-story--meme.png"'));
  add('alt is derived from the card (persona, headline, meme line)', (img[0] || '').includes('alt="VERA’s editorial panel for “A headline”: “A meme line”"'));
  add('the social OG image field is never used', !daily.includes('/assets/og/a.png'));
  add('missing art degrades to a text-only lead', !/<picture|<img/i.test(noArt) && noArt.includes('A headline'));
  add('hasArt must be strictly true', !/<picture/.test(renderBlock(feed, null, { hasArt: () => 'yes' })));
  const hostileSlug = renderBlock({ state: 'live', cards: [{ date: '2026-08-11', slug: '../../evil', href: '/news/x/', headline: 'H' }] }, null, withArt);
  add('a non-path-safe slug can never become an image path', !/<picture|<img|evil/i.test(hostileSlug));
  add('disk probe refuses paths outside the Desk art directory', diskHasArt('/etc/passwd') === false && diskHasArt('/assets/og/news/does-not-exist--meme') === false);

  // The honesty property: the module repeats measured cadence, never asserts one.
  add('daily cadence is stated only when measured daily', daily.includes('Daily cadence'));
  add('an overdue desk does not claim daily', !periodic.includes('Daily cadence') && periodic.includes('Periodic cadence'));
  add('a paused desk says paused', paused.includes('Paused cadence') && !paused.includes('Daily cadence'));
  add('overdue copy names the real age', periodic.includes('6 days ago'));
  add('missing freshness degrades to unverified, never to daily', renderBlock(feed, null).includes('Unverified'));
  add('the pulse dot animates only on a measured daily cadence', daily.includes('data-cadence="daily" aria-hidden')
    && !periodic.includes('data-cadence="daily" aria-hidden') && !paused.includes('data-cadence="daily" aria-hidden'));
  add('the pulse respects reduced motion', daily.includes('@media (prefers-reduced-motion:reduce){.desk-showcase__dot{animation:none}}'));

  add('an empty feed renders an honest state, not a skeleton', empty.includes('No published edition yet') && empty.includes('data-desk-state="empty"'));
  add('every state links to The Desk with a Read The Desk CTA', [daily, periodic, paused, empty, noArt].every((b) => b.includes('href="/news/"') && b.includes('Read The Desk →')));

  // Escaping: a headline is authored by a model on a schedule now.
  const hostile = renderBlock({ state: 'live', cards: [{ date: '2026-08-11', slug: 'ok', href: '/x/', headline: '<script>alert(1)</script>', hook: 'h & "q"', memeLine: '"><img src=x>' }] }, { state: 'daily', latestEditionDate: 'd', ageDays: 0 }, withArt);
  add('a headline cannot inject markup', !hostile.includes('<script>alert(1)</script>') && hostile.includes('&lt;script&gt;'));
  add('ampersands and quotes are escaped', hostile.includes('&amp;') && hostile.includes('&quot;'));
  add('alt text cannot break out of its attribute', (hostile.match(/<img\b/g) || []).length === 1 && hostile.includes('&quot;&gt;&lt;img src=x&gt;'));

  // Splice behaviour.
  const hero = '<main>\n    <section class="hero"></section>\n\n';
  const page = `${hero}    ${ANCHOR}\n    <section class="analytica-showcase"></section>\n    <!-- analytica-showcase:end -->\n\n    <section id="next"></section>\n<footer>x</footer>`;
  const once = spliceBlock(page, daily);
  const twice = spliceBlock(once, periodic);
  add('the block is inserted directly after the hero, before the anchor', once.indexOf('class="hero"') < once.indexOf(START) && once.indexOf(END) < once.indexOf(ANCHOR)
    && /<\/section>\n\n {4}<!-- desk-showcase:start -->/.test(once) && once.includes(`${END}\n\n    ${ANCHOR}`));
  add('re-running replaces rather than appends', (twice.match(/desk-showcase:start/g) || []).length === 1);
  add('replacement uses the new content', twice.includes('Periodic cadence') && !twice.includes('Daily cadence'));
  add('re-running the same block is byte-stable', spliceBlock(once, daily) === once);
  add('stripping restores the original page exactly', stripBlock(once) === page);
  const legacy = page.replace('<!-- analytica-showcase:end -->', `<!-- analytica-showcase:end -->\n\n${daily}`);
  const migrated = spliceBlock(legacy, daily);
  add('a pre-S356 block after Analytica is moved above it', migrated === once);
  add('surrounding markup survives', twice.includes('<footer>x</footer>') && twice.includes('<section id="next">'));
  add('a missing anchor fails loudly', (() => {
    try { spliceBlock('<main></main>', daily); return false; } catch { return true; }
  })());

  add('the block carries no client script', !/<script/i.test(daily));
  // S319 regression pin. The first version used var(--surface,#15151b) and
  // var(--border,#2a2a33); neither token exists on this site, so the dark hex
  // fallbacks rendered in EVERY theme and the staging gate found 338 WCAG AA
  // contrast violations in light mode. A colour fallback is theme-blind by
  // construction — only real tokens may appear.
  // --gold is an accent tuned for dark backgrounds. As SMALL TEXT it fails WCAG
  // AA on the light themes — measured on staging: .desk-mini__date x2 and
  // .desk-lead__kicker x1. It stays as a border/dot accent, which carries no
  // text-contrast requirement. Both directions are pinned.
  add('gold is never used as text colour (fails AA on light themes)', !/[;{]\s*color:\s*var\(--gold\)/.test(daily));
  add('gold survives as a border accent', /border-color:\s*var\(--gold\)/.test(daily));
  add('no theme-blind colour fallback in the block', !THEME_BLIND_FALLBACK.test(daily));
  add('only tokens this site actually defines are used', (() => {
    const defined = ['--bg', '--bg-soft', '--text', '--muted', '--gold', '--header-border', '--dim', '--page-bg'];
    const used = [...daily.matchAll(new RegExp('var\\((--[a-z-]+)', 'g'))].map((m) => m[1]);
    return used.length > 0 && used.every((token) => defined.includes(token));
  })());
  add('no inline style attributes (extract-inline-styles contract)', !/\sstyle="/i.test(daily));

  for (const [name, ok] of t) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (t.some(([, ok]) => !ok)) process.exit(1);
  console.log(`home-desk-module self-test: ${t.length}/${t.length}`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const next = build();
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(HOME, 'utf8') !== next) {
      console.error('home-desk-module: index.html drifted from the Desk feed — run `node scripts/build-home-desk-module.mjs`');
      process.exit(1);
    }
    console.log('home-desk-module: --check ok');
    return;
  }
  fs.writeFileSync(HOME, next);
  console.log(`home-desk-module: ${path.relative(ROOT, HOME) || HOME} updated`);
}

if (process.argv[1]?.endsWith('build-home-desk-module.mjs')) main();
