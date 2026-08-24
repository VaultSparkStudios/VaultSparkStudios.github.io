#!/usr/bin/env node
/* build-hero-portfolio.mjs — S207 hero redesign (fusion of Cinematic Split + Living Portfolio)
 *
 * The hero is the first interface for BOTH humans and agents, so it must be the
 * most machine-legible AND the most visually immersive component on the site.
 * This generator server-renders the hero's living-portfolio showcase from the
 * canonical live feed (api/public-intelligence.json catalog) so the hero is:
 *   • instant (no client fetch — LCP-safe)
 *   • crawlable + agent-readable (real <a> tiles + an ItemList JSON-LD block)
 *   • always truthful (live/forge status + counts derived from real data)
 *
 * It injects, between markers in index.html:
 *   <!-- hero-showcase:start --> … <!-- hero-showcase:end -->
 *       a scoped <style> (per-tile accent + cover, NO inline style= attrs — the
 *       intelligence-style-contract forbids them on index.html), the tile grid,
 *       and an ItemList JSON-LD block.
 *   <!-- hero-stats:start --> … <!-- hero-stats:end -->
 *       the live · forge · total count line.
 *
 * Usage:
 *   node scripts/build-hero-portfolio.mjs            # inject into index.html
 *   node scripts/build-hero-portfolio.mjs --check    # drift gate (no write)
 *   node scripts/build-hero-portfolio.mjs --self-test
 *
 * Exit: 0 ok · 1 drift/error.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FEED = path.join(ROOT, 'api/public-intelligence.json');
const INDEX = path.join(ROOT, 'index.html');
// S329: full-registry total derives from the feed's portfolio.total (single
// authority: generate-public-intelligence.mjs PORTFOLIO_TOTAL) — no local literal.
function totalProjects() {
  const n = JSON.parse(readFileSync(FEED, 'utf8'))?.portfolio?.total;
  if (!Number.isInteger(n) || n <= 0) throw new Error('build-hero-portfolio: portfolio.total missing or malformed in api/public-intelligence.json');
  return n;
}
const MAX_TILES = 5;       // featured (full-width) + 4 in a 2×2 bento — balanced against the lede

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes('--self-test');
const CHECK = argv.includes('--check');

// id → bespoke cover art (others fall back to the accent-gradient tile).
// S249: veilos + vorn added so the S248 spotlight (cod · mindframe · veilos · vorn ·
// football-gm) has full cover-art parity — no gradient-only tiles in the featured set.
const COVERS = {
  'call-of-doodie': 'doodie', 'football-gm': 'footballgm', 'franchise-architect': 'footballgm',
  'gridiron-gm': 'gridiron', 'mindframe': 'mindframe', 'solara': 'solara',
  'the-exodus': 'the-exodus', 'vaultfront': 'vaultfront',
  'veilos': 'veilos', 'vorn': 'vorn',
};

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// A few registry ids don't match their on-disk page directory (the page predates
// the registry slug). Map id → page dir so the studio-page link resolves to the real
// page instead of a generic section landing. (football-gm's page lives at
// games/franchise-architect/ and root /franchise-architect/.)
const PAGE_ALIAS = { 'football-gm': 'franchise-architect' };

// Resolve a safe link target: prefer an on-disk canonical page, else deployedUrl, else section landing.
function resolveHref(item, fileExists) {
  const id = PAGE_ALIAS[item.id] || item.id;
  const isGame = item.type === 'game';
  // Prefer the type-natural location, but fall back to the OTHER section so a
  // type-mismatched project (e.g. MindFrame is typed tool but its page lives at
  // games/mindframe) still resolves to its real page, not a generic landing (D-S208.8).
  const candidates = isGame
    ? [`games/${id}/index.html`, `projects/${id}/index.html`, `${id}/index.html`]
    : [`projects/${id}/index.html`, `games/${id}/index.html`, `${id}/index.html`];
  for (const rel of candidates) {
    if (fileExists(rel)) return '/' + rel.replace(/index\.html$/, '');
  }
  // Studio landing page only — never the live deployedUrl (that's liveHref's job).
  return isGame ? '/games/' : '/projects/';
}

// Dev/staging hosts that must NEVER be surfaced as a public "live" link, even if a
// project is mis-flagged SPARKED. Real product domains (velaxis.markets, joinvorn.com,
// veilos.io, promogrind.bet, …) pass through; these do not. (D-S208.4)
const DEV_HOST_RE = /(\.up\.railway\.app|\.railway\.app|\.pages\.dev|\.workers\.dev|\.onrender\.com|\.vercel\.app|\.netlify\.app|localhost|127\.0\.0\.1)$/i;

// The live/deployed destination (play/open the actual thing), or null if none.
// A real product URL — on our apex (→ pathname) or an external product domain
// (→ absolute). Dev/staging hosts resolve to null so they never become a CTA.
function liveHref(item) {
  if (!item.deployedUrl) return null;
  try {
    const u = new URL(item.deployedUrl);
    if (DEV_HOST_RE.test(u.hostname)) return null;
    return u.origin.includes('vaultsparkstudios.com') ? u.pathname : item.deployedUrl;
  } catch { return null; }
}

const STATUS_LABEL = { SPARKED: 'Sparked', FORGE: 'In the Forge', VAULTED: 'Vaulted' };

// Project-specific primary CTA label. Compact labels on small tiles (where a
// second button shares the row); fuller labels on the featured tile.
function primaryLabel(item, hasLive, featured) {
  if (!hasLive) return 'Explore →';
  if (item.status === 'SPARKED') {
    if (item.type === 'game') return featured ? '▶ Play free' : '▶ Play';
    return featured ? 'Open →' : 'Open';
  }
  return featured ? 'Try it →' : 'Try it'; // forge with a live build (external beta)
}

// Pure: build the ordered tile list + counts from the catalog.
//
// Tile ORDER follows an editorial hero spotlight when the feed carries one (catalog
// items with an integer `spotlight` rank — the studio's curated flagship showcase,
// index 0 = featured). This lets the founder decide which worlds greet every human +
// agent first, instead of surfacing whichever SPARKED items happen to tie on progress
// (which put market/betting-adjacent utilities front-and-centre). If the spotlight
// leaves free tiles (< MAX_TILES), they backfill with the live-first, progress-desc
// auto-rank. With NO spotlight in the feed, behaviour is identical to the original
// auto-rank — a pure, backward-compatible fallback. COUNTS are always the true
// catalog-wide live/forge/total totals, unaffected by curation (no lying surface).
export function planPortfolio(catalog) {
  const live = catalog.filter((c) => c.status === 'SPARKED');
  const forge = catalog.filter((c) => c.status === 'FORGE');
  const vaulted = catalog.filter((c) => c.status === 'VAULTED');
  const byProgress = (a, b) => (b.progress || 0) - (a.progress || 0);
  // Auto-rank: live first (by progress desc), then forge (by progress desc).
  const autoRank = [...live].sort(byProgress).concat([...forge].sort(byProgress));
  const spotlit = catalog
    .filter((c) => Number.isInteger(c.spotlight) && c.spotlight >= 0 && c.status !== 'VAULTED')
    .sort((a, b) => a.spotlight - b.spotlight);
  let ordered;
  if (spotlit.length) {
    const chosen = new Set(spotlit.map((c) => c.id));
    const backfill = autoRank.filter((c) => !chosen.has(c.id));
    ordered = [...spotlit, ...backfill].slice(0, MAX_TILES);
  } else {
    ordered = autoRank.slice(0, MAX_TILES);
  }
  return {
    tiles: ordered,
    counts: { live: live.length, forge: forge.length, vaulted: vaulted.length, total: totalProjects() },
  };
}

function renderTile(item, fileExists, featured) {
  const page = resolveHref(item, fileExists);   // studio landing page
  const live = liveHref(item);                  // live/deployed site, or null
  // Only truly-live (SPARKED) projects route to their live site; FORGE projects
  // route to their studio page (a forge dev/staging URL is not a public destination).
  const sparkedLive = item.status === 'SPARKED' && live;
  const primary = sparkedLive ? live : page;
  const coverKey = COVERS[item.id];
  const statusClass = item.status === 'SPARKED' ? 'is-live' : item.status === 'VAULTED' ? 'is-vaulted' : 'is-forge';
  const badge = STATUS_LABEL[item.status] || item.status;
  const mark = esc((item.name || '?').trim().charAt(0).toUpperCase());
  // Specific category (e.g. "AI Intelligence") from the feed; fall back to a type label.
  const typeLabel = item.category || (item.type === 'game' ? 'Game' : item.type === 'tool' ? 'Tool' : item.type === 'platform' ? 'Platform' : 'World');
  const ext = (href) => href.startsWith('http') ? ' rel="noopener"' : '';
  const pLabel = primaryLabel(item, !!sparkedLive, featured);
  // Dual buttons only when a SPARKED project has a distinct live site + studio page.
  const dual = !!sparkedLive && live !== page;
  const detailsLabel = featured ? 'Details →' : 'Details';

  const cls = ['hero-tile', `ht-${item.id}`, statusClass, featured ? 'hero-tile--featured' : '', coverKey ? 'has-cover' : 'no-cover', dual ? 'hero-tile--dual' : ''].filter(Boolean).join(' ');
  // Featured tile with a cover: use <picture><img fetchpriority="high"> instead of a CSS
  // background <span>. Chrome cannot match <link rel="preload"> to image-set() backgrounds,
  // so the background is late-discovered (~3s Load Delay). A real <img> is visible in HTML
  // and correctly matched to the preload hint, cutting Load Delay to near 0.
  const coverEl = (featured && coverKey)
    ? `<span class="hero-tile__cover hero-tile__cover--lcp" aria-hidden="true"><picture><source srcset="/assets/covers/${coverKey}.avif" type="image/avif"><source srcset="/assets/covers/${coverKey}.webp" type="image/webp"><img src="/assets/covers/${coverKey}.png" fetchpriority="high" alt=""></picture></span>`
    : `<span class="hero-tile__cover" aria-hidden="true"></span>`;
  const inner = [
    coverEl,
    coverKey ? '' : `<span class="hero-tile__mark" aria-hidden="true">${mark}</span>`,
    `<span class="hero-tile__veil" aria-hidden="true"></span>`,
    `<span class="hero-tile__badge"><span class="hero-tile__dot" aria-hidden="true"></span>${esc(badge)}</span>`,
    `<span class="hero-tile__body">`,
    `<span class="hero-tile__kicker">${esc(typeLabel)}</span>`,
    `<span class="hero-tile__name">${esc(item.name)}</span>`,
    featured && item.note ? `<span class="hero-tile__note">${esc(item.note)}</span>` : '',
  ];

  if (dual) {
    // Container is NOT an <a> (can't nest anchors) — two real buttons instead.
    inner.push(
      `<span class="hero-tile__actions">`,
      `<a class="hero-tile__btn hero-tile__btn--primary" href="${esc(primary)}"${ext(primary)} data-track-event="home_hero_tile_play" aria-label="${esc(pLabel.replace(/[▶→]/g, '').trim())} — ${esc(item.name)}">${esc(pLabel)}</a>`,
      `<a class="hero-tile__btn hero-tile__btn--ghost" href="${esc(page)}" data-track-event="home_hero_tile_details" aria-label="Details for ${esc(item.name)}">${detailsLabel}</a>`,
      `</span>`,
      `</span>`, // /body
    );
    return `<div class="${cls}" role="group" aria-label="${esc(item.name)} — ${esc(badge)}">${inner.join('')}</div>`;
  }

  // Whole tile is one link to the primary destination; CTA text states the action.
  inner.push(`<span class="hero-tile__cta">${esc(pLabel)}</span>`, `</span>`);
  return `<a class="${cls}" href="${esc(primary)}"${ext(primary)} data-track-event="home_hero_tile_click">${inner.join('')}</a>`;
}

// D-S208: cover delivery uses image-set() with a PNG base + @supports guard, so
// browsers that grok image-set()+type() pull the AVIF (~93% smaller) or WebP, and
// everything else keeps the original PNG. Pure progressive enhancement — no markup
// change, no regression risk on the (mature, S207-redesigned) hero surface.
function coverRule(id, key) {
  const base = `.ht-${id} .hero-tile__cover{background-image:url(/assets/covers/${key}.png)}`;
  const modern = `@supports (background-image:image-set(url(/assets/covers/${key}.avif) type("image/avif"))){`
    + `.ht-${id} .hero-tile__cover{background-image:image-set(`
    + `url(/assets/covers/${key}.avif) type("image/avif"),`
    + `url(/assets/covers/${key}.webp) type("image/webp"),`
    + `url(/assets/covers/${key}.png) type("image/png"))}}`;
  return base + modern;
}

function renderTileStyles(tiles) {
  const rules = tiles.map((t, i) => {
    const accent = t.color || '#ffc400';
    const coverKey = COVERS[t.id];
    // Featured tile (i=0) with a cover now uses <picture><img> — skip CSS background rule.
    const cover = (coverKey && i > 0) ? coverRule(t.id, coverKey) : '';
    return `.ht-${t.id}{--tile-accent:${accent}}${cover}`;
  });
  return `<style data-hero-portfolio-style>${rules.join('')}</style>`;
}

// Enriched ItemList JSON-LD (S220): the hero is the first interface for agents +
// search engines, so each tile carries image/description/genre + game-specific
// fields and a sameAs link to the real live destination — all derived from the
// committed feed (no new build inputs, so --check stays deterministic).
const SITE = 'https://vaultsparkstudios.com';
function renderJsonLd(tiles, fileExists) {
  const items = tiles.map((t, i) => {
    const isGame = t.type === 'game';
    const coverKey = COVERS[t.id];
    const url = SITE + resolveHref(t, fileExists).replace(/^https?:\/\/[^/]+/, '');
    // liveHref → apex pathname | absolute external product URL | null.
    const live = liveHref(t);
    const sameAs = live ? (live.startsWith('http') ? live : SITE + live) : null;
    const item = {
      '@type': isGame ? 'VideoGame' : 'CreativeWork',
      name: t.name,
      url,
      creativeWorkStatus: t.status === 'SPARKED' ? 'Published' : 'In development',
    };
    const desc = t.note || t.category;
    if (desc) item.description = desc;
    if (t.category) item.genre = t.category;
    if (coverKey) item.image = `${SITE}/assets/covers/${coverKey}.png`;
    if (isGame) {
      item.applicationCategory = 'GameApplication';
      item.gamePlatform = 'Web browser';
      item.operatingSystem = 'Any (modern web browser)';
    }
    // Only link out when the live destination is genuinely distinct from the
    // studio page (an external product domain, or a distinct playable build path).
    if (sameAs && sameAs !== url) item.sameAs = sameAs;
    return { '@type': 'ListItem', position: i + 1, item };
  });
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: 'VaultSpark Studios portfolio', itemListElement: items };
  // Neutralise any literal </script> in free-text fields (JSON-safe: < decodes back to <).
  return `<script type="application/ld+json" data-hero-portfolio-ld>${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
}

export function renderShowcase(catalog, fileExists) {
  const { tiles } = planPortfolio(catalog);
  const tileHtml = tiles.map((t, i) => renderTile(t, fileExists, i === 0)).join('');
  return [
    renderTileStyles(tiles),
    `<div class="hero-showcase" role="group" aria-label="VaultSpark Studios portfolio — live and in-forge worlds">${tileHtml}</div>`,
    renderJsonLd(tiles, fileExists),
  ].join('');
}

export function renderStats(catalog) {
  const { counts } = planPortfolio(catalog);
  return `<span class="hero-stat-dot" aria-hidden="true"></span><strong>${counts.live}</strong> live<span class="hero-stat-sep">·</span><strong>${counts.forge}</strong> in the forge<span class="hero-stat-sep">·</span><strong>${counts.total}</strong> total`;
}

// S275: the hero-stats pulse, the stat-mini tile, and the nav dropdown each
// showed a different forge count (14 / hardcoded 10+ / hardcoded 12) — a trust
// contradiction on the landing page. Every forge count now derives from the
// same catalog. This renders the stat-mini number for the forge-stat marker.
export function renderForgeStat(catalog) {
  const { counts } = planPortfolio(catalog);
  return String(counts.forge);
}

function injectBlock(html, marker, content) {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const re = new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!re.test(html)) throw new Error(`marker ${marker} not found in index.html`);
  return html.replace(re, `${start}${content}${end}`);
}

// S225: preload hint for the hero LCP candidate (featured tile CSS background image).
// CSS background-images are late-discovered — the browser can't start fetching them
// until after layout/style computation (~800ms of Style&Layout on CI). A <link
// rel="preload"> in <head> moves the fetch to the HTML parsing phase, trimming
// ~800ms-2s off LCP on simulated-throttle Lighthouse runs.
function renderLcpPreload(catalog) {
  const { tiles } = planPortfolio(catalog);
  const featured = tiles[0];
  if (!featured) return '';
  const coverKey = COVERS[featured.id];
  if (!coverKey) return '';
  // Preload only the primary AVIF candidate. Preloading the WebP fallback makes
  // modern Chrome fetch AVIF, skip WebP, then warn that the WebP preload was
  // unused. Browsers without AVIF support still discover the WebP <source>.
  return `<link rel="preload" as="image" href="/assets/covers/${coverKey}.avif" type="image/avif" fetchpriority="high">`;
}

function build({ write }) {
  const catalog = JSON.parse(readFileSync(FEED, 'utf8')).catalog;
  const fileExists = (rel) => existsSync(path.join(ROOT, rel));
  let html = readFileSync(INDEX, 'utf8');
  const next = injectBlock(
    injectBlock(
      injectBlock(
        injectBlock(html, 'hero-showcase', renderShowcase(catalog, fileExists)),
        'hero-stats', renderStats(catalog)
      ),
      'hero-lcp-preload', renderLcpPreload(catalog)
    ),
    'forge-stat', renderForgeStat(catalog)
  );
  if (CHECK) {
    if (next !== html) { console.error('build-hero-portfolio --check: index.html hero showcase/stats drift; run node scripts/build-hero-portfolio.mjs'); process.exit(1); }
    console.log('build-hero-portfolio --check: ok (hero showcase in sync)');
    return;
  }
  if (write && next !== html) writeFileSync(INDEX, next);
  const { tiles, counts } = planPortfolio(catalog);
  console.log(`build-hero-portfolio → ${tiles.length} tiles · ${counts.live} live · ${counts.forge} forge · ${counts.total} total`);
}

if (SELF_TEST) {
  let passed = 0;
  const assert = (ok, m) => { if (!ok) { console.error('✗ ' + m); process.exit(1); } console.log('  ✓ ' + m); passed++; };
  const cat = [
    { id: 'call-of-doodie', name: 'Call of Doodie', type: 'game', status: 'SPARKED', progress: 85, color: '#ff9478', category: 'Multiplayer chaos', note: 'Co-op chaos in the browser.', deployedUrl: 'https://vaultsparkstudios.com/call-of-doodie/' },
    { id: 'football-gm', name: 'Franchise Architect', type: 'game', status: 'SPARKED', progress: 78 },
    { id: 'solara', name: 'Solara', type: 'game', status: 'FORGE', progress: 40 },
    { id: 'voidfall', name: 'Voidfall', type: 'game', status: 'FORGE', progress: 20 },
  ];
  const plan = planPortfolio(cat);
  assert(plan.tiles[0].id === 'call-of-doodie', 'featured = highest-progress live');
  assert(plan.counts.live === 2 && plan.counts.forge === 2, 'counts derived from status');
  // Editorial spotlight: curated order drives tiles; a FORGE item can be featured/spotlit;
  // backfill fills remaining tiles by auto-rank; counts stay catalog-wide (not curated).
  const spotCat = [
    { id: 'call-of-doodie', name: 'Call of Doodie', type: 'game', status: 'SPARKED', progress: 85, spotlight: 0 },
    { id: 'promogrind', name: 'PromoGrind', type: 'tool', status: 'SPARKED', progress: 85 },
    { id: 'velaxis', name: 'Velaxis', type: 'tool', status: 'SPARKED', progress: 85 },
    { id: 'mindframe', name: 'MindFrame', type: 'tool', status: 'FORGE', progress: 85, spotlight: 1 },
    { id: 'veilos', name: 'Veilos', type: 'platform', status: 'SPARKED', progress: 85, spotlight: 2 },
    { id: 'football-gm', name: 'Franchise Architect', type: 'game', status: 'SPARKED', progress: 78, spotlight: 3 },
  ];
  const sp = planPortfolio(spotCat);
  assert(sp.tiles.map((t) => t.id).join(',') === 'call-of-doodie,mindframe,veilos,football-gm,promogrind',
    'spotlight order drives tiles + backfills the 5th by auto-rank');
  assert(sp.tiles[1].id === 'mindframe' && sp.tiles[1].status === 'FORGE', 'a FORGE flagship can be spotlit');
  assert(!sp.tiles.slice(0, 4).some((t) => t.id === 'velaxis'), 'non-spotlit velaxis dropped from curated set');
  assert(sp.counts.live === 5 && sp.counts.forge === 1, 'counts stay catalog-wide, not curated');
  // PAGE_ALIAS: football-gm's page lives at franchise-architect/ — resolve to it, not /games/.
  const fgFe = (rel) => rel === 'games/franchise-architect/index.html';
  assert(resolveHref({ id: 'football-gm', type: 'game' }, fgFe) === '/games/franchise-architect/',
    'PAGE_ALIAS resolves football-gm to its real page, not the generic /games/ landing');
  // VAULTED can never be spotlit even if mis-tagged.
  const vaultSpot = planPortfolio([{ id: 'x', name: 'X', type: 'tool', status: 'VAULTED', progress: 9, spotlight: 0 },
    { id: 'y', name: 'Y', type: 'game', status: 'SPARKED', progress: 50 }]);
  assert(vaultSpot.tiles[0].id === 'y', 'VAULTED spotlight ignored — never featured');
  const fe = (rel) => rel === 'games/call-of-doodie/index.html';
  const showcase = renderShowcase(cat, fe);
  assert(showcase.includes('hero-tile--featured'), 'featured tile rendered');
  assert(!/ style\s*=\s*["']/.test(showcase), 'NO inline style= attributes (style-contract safe)');
  assert(showcase.includes('/games/call-of-doodie/'), 'on-disk canonical link resolved');
  assert(showcase.includes('application/ld+json'), 'ItemList JSON-LD emitted (agent-readable)');
  // S226: LCP fix — featured cover uses <picture><img fetchpriority="high">, not CSS background.
  assert(showcase.includes('hero-tile__cover--lcp'), 'featured LCP cover uses picture/img element');
  assert(showcase.includes('fetchpriority="high"'), 'featured img carries fetchpriority=high');
  assert(showcase.includes('type="image/avif"'), 'picture source includes AVIF source');
  // Non-featured tiles still use CSS background (no --lcp class).
  const nonFeatured = showcase.replace(/<!--.*?-->|hero-tile--featured[^>]*>[\s\S]*?<\/div>/, '');
  assert(!nonFeatured.includes('hero-tile__cover--lcp'), 'non-featured tiles keep CSS background span');
  // S220: enriched JSON-LD — image, description, genre, game fields, sameAs.
  assert(showcase.includes('/assets/covers/doodie.png'), 'JSON-LD carries cover image');
  assert(showcase.includes('"description":"Co-op chaos in the browser."'), 'JSON-LD carries description');
  assert(showcase.includes('"genre":"Multiplayer chaos"'), 'JSON-LD carries genre/category');
  assert(showcase.includes('"applicationCategory":"GameApplication"'), 'VideoGame items get game schema fields');
  assert(showcase.includes('"gamePlatform":"Web browser"'), 'VideoGame items declare web platform');
  assert(showcase.includes('"sameAs":"https://vaultsparkstudios.com/call-of-doodie/"'), 'sameAs links the live playable build');
  const ldPayload = (showcase.match(/data-hero-portfolio-ld>([\s\S]*?)<\/script>/) || [])[1];
  assert(ldPayload && !ldPayload.includes('<'), 'JSON-LD payload escapes < (no </script> breakout)');
  assert(renderStats(cat).includes('<strong>2</strong> live'), 'stat line reflects live count');
  console.log(`\nbuild-hero-portfolio self-test: ${passed} passing`);
  process.exit(0);
}

build({ write: true });
