#!/usr/bin/env node
/**
 * build-home-desk-module.mjs — S319. Put The Desk on the homepage.
 *
 * THE GAP THIS CLOSES (founder-reported).
 * The Desk appeared on the homepage exactly twice: once in the Studio nav
 * dropdown and once in the footer link list. Both are plain `<a href="/news/">`.
 * There was no hero slot, no card, no latest-edition strip — so a visitor who
 * never opened a dropdown had no way to discover that the site publishes a
 * newsroom at all. `/stats/` got homepage showcase cards in S314; The Desk never
 * did.
 *
 * DESIGN NOTES
 * · Server-rendered into a marked block. No client JS, so this adds no shell
 *   asset, rotates no shell hash (which would cost every returning visitor a
 *   cold cache), and cannot become a promoted caller whose callee is stranded.
 * · Styles are scoped and inlined in the block for the same reason: touching the
 *   shared stylesheet would rotate `style.shell-<hash>.css` for one section.
 * · Cadence language is READ from api/news-desk-freshness.json, never asserted.
 *   If the Desk is overdue the module says so. The floors are the feature: a
 *   homepage module that claims "Daily" while the corpus is seven days old is
 *   exactly the fabrication CANON-031 exists to prevent.
 * · Text-only by design. The feed carries a 1200x630 social OG card, but it is
 *   ~531 KB with no AVIF/WebP sibling and would land above the fold against a
 *   blocking Lighthouse perf floor. See the note at the render site.
 *
 * Modes: (default) apply · --check (byte-drift gate) · --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = path.join(ROOT, 'index.html');
const DESK_FEED = path.join(ROOT, 'api', 'news-desk.json');
const FRESHNESS_FEED = path.join(ROOT, 'api', 'news-desk-freshness.json');

export const START = '<!-- desk-showcase:start -->';
export const END = '<!-- desk-showcase:end -->';

/** The block is injected immediately after this existing marked section. */
const ANCHOR = '<!-- analytica-showcase:end -->';

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
  if (!state || !latest) return { label: 'Unverified', detail: 'Cadence evidence is unavailable.' };
  if (state === 'daily') {
    return { label: 'Daily', detail: `Latest edition ${latest}${age === 0 ? ' — today' : age === 1 ? ' — yesterday' : ''}.` };
  }
  if (state === 'periodic') {
    return { label: 'Periodic', detail: `Latest edition ${latest} · ${age} days ago. Not claiming a daily edition while overdue.` };
  }
  return { label: 'Paused', detail: `Latest edition ${latest} · ${age} days ago. Published work stays available.` };
}

/**
 * Render the block. Returns the marked HTML including both markers so the
 * splice is a pure string replacement with no positional guessing.
 */
export function renderBlock(deskFeed, freshness) {
  const cards = Array.isArray(deskFeed?.cards) ? deskFeed.cards : [];
  const live = deskFeed?.state === 'live' && cards.length > 0;
  const cadence = cadenceLine(freshness);

  // No editions is a real state, not an empty grid. Say it plainly rather than
  // rendering a skeleton that looks broken.
  if (!live) {
    return [
      START,
      '    <section class="desk-showcase" aria-labelledby="desk-showcase-title" data-desk-surface="showcase" data-desk-state="empty">',
      '      <div class="container">',
      '        <div class="desk-showcase__head">',
      '          <div><p class="eyebrow">The Desk</p><h2 id="desk-showcase-title">AI news, argued by the desk.</h2></div>',
      '          <a class="button-secondary button-sm" href="/news/" data-track-event="home_desk_deep_click">Open The Desk →</a>',
      '        </div>',
      `        <p class="desk-showcase__empty">No published edition yet. <a href="/api/news-desk-freshness.json">Check freshness →</a></p>`,
      '      </div>',
      '    </section>',
      END,
    ].join('\n');
  }

  const [lead, ...rest] = cards;
  const secondary = rest.slice(0, 2);

  // DELIBERATELY TEXT-ONLY (S319). The card feed carries an `image` — the 1200x630
  // social OG card — and the obvious move is to render it as the lead visual. It
  // is not the right move here:
  //   · the asset is ~531 KB PNG with no AVIF/WebP sibling (the converter reports
  //     negative gain on these cards), so check-image-formats blocks it and would
  //     be right to;
  //   · it would land above the fold on the homepage, against a blocking
  //     Lighthouse floor of perf >= 0.78.
  // A social card is built to survive being scaled down in a timeline, not to
  // carry a homepage hero. Text-only keeps the module fast and the gate honest.
  const secondaryHtml = secondary.map((card) => [
    `          <a class="desk-mini" href="${escapeHtml(card.href)}">`,
    `            <span class="desk-mini__date">${escapeHtml(card.date)}</span>`,
    `            <span class="desk-mini__headline">${escapeHtml(card.headline)}</span>`,
    `            <span class="desk-mini__hook">${escapeHtml(card.hook)}</span>`,
    '          </a>',
  ].join('\n')).join('\n');

  return [
    START,
    '    <section class="desk-showcase" aria-labelledby="desk-showcase-title" data-desk-surface="showcase" data-desk-state="live">',
    '      <style>',
    '        .desk-showcase{padding:4rem 0}',
    '        .desk-showcase__head{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end;justify-content:space-between;margin-bottom:.5rem}',
    '        .desk-showcase__cadence{color:var(--muted);font-size:.9rem;margin:0 0 1.75rem}',
    '        .desk-showcase__cadence b{color:var(--text)}',
    '        .desk-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:1.5rem;align-items:start}',
    '        .desk-lead{display:block;border:1px solid var(--header-border);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;background:var(--bg-soft)}',
    '        .desk-lead:hover,.desk-lead:focus-visible{border-color:var(--gold)}',
    '        .desk-lead__body{padding:1.25rem}',
    '        .desk-lead__kicker{font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}',
    '        .desk-lead__headline{font-size:1.4rem;line-height:1.25;margin:.4rem 0 .5rem}',
    '        .desk-lead__hook{color:var(--muted);margin:0}',
    '        .desk-column{display:flex;flex-direction:column;gap:1rem}',
    '        .desk-mini{display:flex;flex-direction:column;gap:.3rem;padding:1rem;border:1px solid var(--header-border);border-radius:12px;text-decoration:none;color:inherit;background:var(--bg-soft)}',
    '        .desk-mini:hover,.desk-mini:focus-visible{border-color:var(--gold)}',
    '        .desk-mini__date{font-size:.75rem;color:var(--muted)}',
    '        .desk-mini__headline{font-weight:600;line-height:1.3}',
    '        .desk-mini__hook{font-size:.88rem;color:var(--muted)}',
    '        .desk-showcase__empty{color:var(--muted)}',
    '        @media (max-width:820px){.desk-grid{grid-template-columns:1fr}.desk-lead__headline{font-size:1.2rem}}',
    '      </style>',
    '      <div class="container">',
    '        <div class="desk-showcase__head">',
    '          <div><p class="eyebrow">The Desk</p><h2 id="desk-showcase-title">AI news, argued by the desk.</h2></div>',
    '          <a class="button-secondary button-sm" href="/news/" data-track-event="home_desk_deep_click">Open The Desk →</a>',
    '        </div>',
    `        <p class="desk-showcase__cadence"><b>${escapeHtml(cadence.label)} cadence</b> · ${escapeHtml(cadence.detail)}</p>`,
    '        <div class="desk-grid">',
    `          <a class="desk-lead" href="${escapeHtml(lead.href)}">`,
    '            <div class="desk-lead__body">',
    `              <p class="desk-lead__kicker">Latest edition · ${escapeHtml(lead.date)}</p>`,
    `              <h3 class="desk-lead__headline">${escapeHtml(lead.headline)}</h3>`,
    `              <p class="desk-lead__hook">${escapeHtml(lead.hook)}</p>`,
    '            </div>',
    '          </a>',
    '          <div class="desk-column">',
    secondaryHtml,
    '          </div>',
    '        </div>',
    '      </div>',
    '    </section>',
    END,
  ].filter((line) => line !== '').join('\n');
}

/** Splice the block into the homepage, replacing any prior one. */
export function spliceBlock(html, block) {
  const startIndex = html.indexOf(START);
  const endIndex = html.indexOf(END);
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return html.slice(0, startIndex) + block + html.slice(endIndex + END.length);
  }
  const anchorIndex = html.indexOf(ANCHOR);
  if (anchorIndex === -1) throw new Error(`cannot place the Desk module: anchor ${ANCHOR} not found in index.html`);
  const insertAt = anchorIndex + ANCHOR.length;
  return `${html.slice(0, insertAt)}\n\n${block}${html.slice(insertAt)}`;
}

function build() {
  const html = fs.readFileSync(HOME, 'utf8');
  const block = renderBlock(readJson(DESK_FEED), readJson(FRESHNESS_FEED));
  return spliceBlock(html, block);
}

function selfTest() {
  const t = [];
  const add = (name, ok) => t.push([name, ok]);

  const feed = {
    state: 'live',
    cards: [
      { date: '2026-08-11', href: '/news/a/', headline: 'A headline', hook: 'A hook', image: '/assets/og/a.png' },
      { date: '2026-08-10', href: '/news/b/', headline: 'B headline', hook: 'B hook' },
      { date: '2026-08-09', href: '/news/c/', headline: 'C headline', hook: 'C hook' },
      { date: '2026-08-07', href: '/news/d/', headline: 'D headline', hook: 'D hook' },
    ],
  };

  const daily = renderBlock(feed, { state: 'daily', latestEditionDate: '2026-08-11', ageDays: 0 });
  const periodic = renderBlock(feed, { state: 'periodic', latestEditionDate: '2026-08-11', ageDays: 6 });
  const paused = renderBlock(feed, { state: 'paused', latestEditionDate: '2026-08-11', ageDays: 7 });
  const empty = renderBlock({ state: 'empty', cards: [] }, { state: 'paused', latestEditionDate: null, ageDays: null });

  add('the lead edition is rendered', daily.includes('A headline') && daily.includes('/news/a/'));
  add('exactly two secondary cards render', (daily.match(/desk-mini"/g) || []).length === 2);
  add('the fourth card is not rendered', !daily.includes('D headline'));
  add('the module ships no image, whatever the feed offers', !/<img|<picture/i.test(daily));
  add('a card without art still renders', daily.includes('B headline'));

  // The honesty property: the module repeats measured cadence, never asserts one.
  add('daily cadence is stated only when measured daily', daily.includes('Daily cadence'));
  add('an overdue desk does not claim daily', !periodic.includes('Daily cadence') && periodic.includes('Periodic cadence'));
  add('a paused desk says paused', paused.includes('Paused cadence') && !paused.includes('Daily cadence'));
  add('overdue copy names the real age', periodic.includes('6 days ago'));
  add('missing freshness degrades to unverified, never to daily', renderBlock(feed, null).includes('Unverified'));

  add('an empty feed renders an honest state, not a skeleton', empty.includes('No published edition yet') && empty.includes('data-desk-state="empty"'));
  add('every state still links to The Desk', [daily, periodic, paused, empty].every((b) => b.includes('href="/news/"')));

  // Escaping: a headline is authored by a model on a schedule now.
  const hostile = renderBlock({ state: 'live', cards: [{ date: 'd', href: '/x/', headline: '<script>alert(1)</script>', hook: 'h & "q"' }] }, { state: 'daily', latestEditionDate: 'd', ageDays: 0 });
  add('a headline cannot inject markup', !hostile.includes('<script>alert(1)</script>') && hostile.includes('&lt;script&gt;'));
  add('ampersands and quotes are escaped', hostile.includes('&amp;') && hostile.includes('&quot;'));

  // Splice behaviour.
  const page = `<main>\n${ANCHOR}\n<footer>x</footer>`;
  const once = spliceBlock(page, daily);
  const twice = spliceBlock(once, periodic);
  add('the block is inserted after the anchor', once.indexOf(ANCHOR) < once.indexOf(START));
  add('re-running replaces rather than appends', (twice.match(/desk-showcase:start/g) || []).length === 1);
  add('replacement uses the new content', twice.includes('Periodic cadence') && !twice.includes('Daily cadence'));
  add('surrounding markup survives', twice.includes('<footer>x</footer>'));
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
  // .desk-lead__kicker x1. It stays as a border accent, which carries no
  // contrast requirement. Both directions are pinned so neither the removal nor
  // the surviving accent can silently regress.
  add('gold is never used as text colour (fails AA on light themes)', !/[;{]color:\s*var\(--gold\)/.test(daily));
  add('gold survives as a border accent', /border-color:\s*var\(--gold\)/.test(daily));
  add('no theme-blind colour fallback in the block', !THEME_BLIND_FALLBACK.test(daily));
  add('only tokens this site actually defines are used', (() => {
    const defined = ['--bg', '--bg-soft', '--text', '--muted', '--gold', '--header-border', '--dim', '--page-bg'];
    const used = [...daily.matchAll(new RegExp('var\\((--[a-z-]+)', 'g'))].map((m) => m[1]);
    return used.length > 0 && used.every((token) => defined.includes(token));
  })());

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
  console.log('home-desk-module: index.html updated');
}

if (process.argv[1]?.endsWith('build-home-desk-module.mjs')) main();
