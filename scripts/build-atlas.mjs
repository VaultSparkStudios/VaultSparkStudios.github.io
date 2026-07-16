#!/usr/bin/env node
/* build-atlas.mjs — S207: the public Atlas (ecosystem map) at /atlas/.
 *
 * Server-renders the full studio ecosystem index into atlas/index.html from the
 * canonical live feed (api/public-intelligence.json catalog), grouped by status
 * (Live · In the Forge · Vaulted). Every project is a hyperlinked row — SPARKED
 * projects link to their live site, others to their studio page (no raw dev URLs).
 * Instant (server-rendered), crawlable, and carries an ItemList JSON-LD for agents.
 *
 * Usage:
 *   node scripts/build-atlas.mjs            # inject into atlas/index.html
 *   node scripts/build-atlas.mjs --check    # drift gate
 *   node scripts/build-atlas.mjs --self-test
 * Exit: 0 ok · 1 drift/error.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FEED = path.join(ROOT, 'api/public-intelligence.json');
const PAGE = path.join(ROOT, 'atlas/index.html');

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes('--self-test');
const CHECK = argv.includes('--check');

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageHref(item, fileExists) {
  const isGame = item.type === 'game';
  // Check both sections (type-natural first) so a type-mismatched project resolves
  // to its real page instead of a generic landing (D-S208.8).
  const cands = isGame
    ? [`games/${item.id}/index.html`, `projects/${item.id}/index.html`, `${item.id}/index.html`]
    : [`projects/${item.id}/index.html`, `games/${item.id}/index.html`, `${item.id}/index.html`];
  for (const rel of cands) if (fileExists(rel)) return '/' + rel.replace(/index\.html$/, '');
  return isGame ? '/games/' : '/projects/';
}
// Dev/staging hosts never become a public "live" link (D-S208.4) — real product
// domains pass through, dev hosts resolve to null (→ studio page instead).
const DEV_HOST_RE = /(\.up\.railway\.app|\.railway\.app|\.pages\.dev|\.workers\.dev|\.onrender\.com|\.vercel\.app|\.netlify\.app|localhost|127\.0\.0\.1)$/i;
function liveHref(item) {
  if (!item.deployedUrl) return null;
  try {
    const u = new URL(item.deployedUrl);
    if (DEV_HOST_RE.test(u.hostname)) return null;
    return u.origin.includes('vaultsparkstudios.com') ? u.pathname : item.deployedUrl;
  } catch { return null; }
}
function destination(item, fileExists) {
  const live = liveHref(item);
  const sparkedLive = item.status === 'SPARKED' && live;
  return { href: sparkedLive ? live : pageHref(item, fileExists), external: !!(sparkedLive && live.startsWith('http')) };
}
function goLabel(item, isLive) {
  if (item.status === 'VAULTED') return 'Vaulted';
  if (isLive && item.status === 'SPARKED') return item.type === 'game' ? 'Play →' : 'Open →';
  return 'Explore →';
}

const GROUPS = [
  { status: 'SPARKED', cls: 'is-live', title: 'Sparked', blurb: 'Live — playable or usable right now.' },
  { status: 'FORGE', cls: 'is-forge', title: 'In the Forge', blurb: 'Being built in the open.' },
  { status: 'VAULTED', cls: 'is-vaulted', title: 'Vaulted', blurb: 'Paused — holding their charge until they respark.' },
];

// D-S208 (Atlas v2): project id → bespoke cover key (assets/covers/<key>.{avif,webp,png}).
// Mirrors build-hero-portfolio's COVERS map. Rows with a cover get a thumbnail; the
// rest fall back to an accent-tinted initial tile so the column stays consistent.
const COVERS = {
  'call-of-doodie': 'doodie', 'football-gm': 'footballgm', 'franchise-architect': 'footballgm',
  'gridiron-gm': 'gridiron', 'mindframe': 'mindframe', 'solara': 'solara',
  'the-exodus': 'the-exodus', 'vaultfront': 'vaultfront',
};

// Cover delivery via image-set() + @supports + PNG fallback (D-S208) — AVIF ~93%
// smaller than PNG, PNG kept for non-supporting browsers. One rule per covered row.
function coverStyleRule(id, key) {
  return `.atlas-row.ht-${id} .atlas-row__thumb{background-image:url(/assets/covers/${key}.png)}`
    + `@supports (background-image:image-set(url(/assets/covers/${key}.avif) type("image/avif"))){`
    + `.atlas-row.ht-${id} .atlas-row__thumb{background-image:image-set(`
    + `url(/assets/covers/${key}.avif) type("image/avif"),`
    + `url(/assets/covers/${key}.webp) type("image/webp"),`
    + `url(/assets/covers/${key}.png) type("image/png"))}}`;
}

export function renderAtlas(catalog, fileExists) {
  const blocks = [];
  const ld = [];
  const coverRules = [];
  let pos = 0;
  for (const g of GROUPS) {
    const items = catalog.filter((c) => c.status === g.status);
    if (!items.length) continue;
    const rows = items.map((item) => {
      const { href, external } = destination(item, fileExists);
      const isLive = !!(item.status === 'SPARKED' && liveHref(item));
      const accent = item.color || '#ffc400';
      const coverKey = COVERS[item.id];
      // D-S208: thumbnail — bespoke cover when one exists, else an accent-initial
      // tile (decorative, aria-hidden; the row's accessible name is on the <a>).
      let thumb;
      if (coverKey) {
        coverRules.push(coverStyleRule(esc(item.id), coverKey));
        thumb = `<span class="atlas-row__thumb has-cover" aria-hidden="true"></span>`;
      } else {
        const initial = esc((item.name || '?').trim().charAt(0).toUpperCase());
        thumb = `<span class="atlas-row__thumb no-cover" aria-hidden="true">${initial}</span>`;
      }
      ld.push({ '@type': 'ListItem', position: ++pos, name: item.name, url: 'https://vaultsparkstudios.com' + (href.startsWith('http') ? '' : href) });
      return [
        `<a class="atlas-row ht-${esc(item.id)}" href="${esc(href)}"${external ? ' rel="noopener"' : ''} style="--row-accent:${esc(accent)}" data-track-event="atlas_row_click" aria-label="${esc(item.name)} — ${esc(item.category || item.type)}">`,
        thumb,
        `<span class="atlas-row__main"><span class="atlas-row__top"><span class="atlas-row__name">${esc(item.name)}</span><span class="atlas-row__cat">${esc(item.category || item.type)}</span></span>`,
        `<span class="atlas-row__note">${esc(item.note || '')}</span></span>`,
        `<span class="atlas-row__go" aria-hidden="true">${goLabel(item, isLive)}</span>`,
        `</a>`,
      ].join('');
    }).join('');
    blocks.push(
      `<div class="atlas-group ${g.cls}">` +
      `<div class="atlas-group__head"><span class="atlas-group__dot" aria-hidden="true"></span>` +
      `<span class="atlas-group__title">${esc(g.title)}</span><span class="atlas-group__count">${items.length}</span></div>` +
      `<p class="section-intro" style="margin-bottom:1rem;">${esc(g.blurb)}</p>` +
      `<div class="atlas-rows">${rows}</div></div>`
    );
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'VaultSpark Studios ecosystem', itemListElement: ld });
  const coverStyle = coverRules.length ? `<style data-atlas-covers>${coverRules.join('')}</style>` : '';
  return coverStyle + blocks.join('') + `<script type="application/ld+json" data-atlas-ld>${json}</script>`;
}

function inject(html, content) {
  const re = /<!-- atlas-ecosystem:start -->[\s\S]*?<!-- atlas-ecosystem:end -->/;
  if (!re.test(html)) throw new Error('atlas-ecosystem markers not found in atlas/index.html');
  return html.replace(re, `<!-- atlas-ecosystem:start -->${content}<!-- atlas-ecosystem:end -->`);
}

if (SELF_TEST) {
  let passed = 0;
  const assert = (ok, m) => { if (!ok) { console.error('✗ ' + m); process.exit(1); } console.log('  ✓ ' + m); passed++; };
  const cat = [
    { id: 'call-of-doodie', name: 'Call of Doodie', type: 'game', category: 'Action Comedy', status: 'SPARKED', note: 'Live.', deployedUrl: 'https://vaultsparkstudios.com/call-of-doodie/', color: '#ff9478' },
    { id: 'mindframe', name: 'MindFrame', type: 'tool', category: 'AI Intelligence', status: 'FORGE', note: 'In the forge.', deployedUrl: 'https://ext.example.com', color: '#38bdf8' },
  ];
  const fe = (rel) => rel === 'games/call-of-doodie/index.html';
  const out = renderAtlas(cat, fe);
  assert(out.includes('atlas-group is-live') && out.includes('atlas-group is-forge'), 'groups rendered by status');
  assert(out.includes('/call-of-doodie/') && out.includes('Play →'), 'live project → live site + Play');
  assert(out.includes('/projects/') && !out.includes('ext.example.com'), 'forge → studio page, never raw dev URL');
  assert(out.includes('AI Intelligence'), 'category shown');
  assert(out.includes('application/ld+json'), 'ItemList JSON-LD for agents');
  console.log(`\nbuild-atlas self-test: ${passed} passing`);
  process.exit(0);
}

const catalog = JSON.parse(readFileSync(FEED, 'utf8')).catalog;
const fileExists = (rel) => existsSync(path.join(ROOT, rel));
const html = readFileSync(PAGE, 'utf8');
const next = inject(html, renderAtlas(catalog, fileExists));
if (CHECK) {
  if (next !== html) { console.error('build-atlas --check: atlas/index.html ecosystem drift; run node scripts/build-atlas.mjs'); process.exit(1); }
  console.log('build-atlas --check: ok'); process.exit(0);
}
if (next !== html) writeFileSync(PAGE, next);
console.log(`build-atlas → atlas/index.html (${catalog.length} initiatives mapped)`);
