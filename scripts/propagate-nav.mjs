#!/usr/bin/env node
/**
 * propagate-nav.mjs — Propagate the canonical nav header and footer
 * to all HTML pages in the VaultSpark Studios website.
 *
 * Usage: node scripts/propagate-nav.mjs [--dry-run]
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const DRY_RUN = process.argv.includes('--dry-run');
const CHECK = process.argv.includes('--check');

const readJson = (relativePath) => JSON.parse(readFileSync(join(ROOT, relativePath), 'utf8'));
const GAME_REGISTRY = readJson('data/game-registry.json');
const PUBLIC_INTELLIGENCE = readJson('api/public-intelligence.json');
const INTELLIGENCE_SUITE = readJson('config/intelligence-suite.json');
const RESOURCE_LINKS = readJson('config/resource-links.json');
const SHELL_MANIFEST = readJson('assets/shell-manifest.json');

// Directories to skip
const SKIP_DIRS = new Set([
  // S342: `_drafts/` is pre-publication by convention — `generate-changelog-entry.mjs`
  // and the journal drafters write HTML there before a human decides it ships. Those
  // pages have no sitewide shell yet and must not, so nav-injecting them (or failing
  // the orphan gate on them) is wrong in both directions. Caught when a locally
  // generated changelog draft failed check-nav-orphans at build:check step 237.
  '_drafts',
  'node_modules', 'playwright-report', 'test-results',
  'investor', 'investor-portal', 'studio-hub',
  '.ai', '.git', '.well-known', 'scripts',
  // S135: legacy /products/ catalog pending architectural decision (Task #5).
  // Has its own design system + 29 duplicate pages of /projects/ + /games/ content.
  'products',
  // S135: internal monitoring/admin/redirect pages without sitewide nav by design.
  'ignis-health', 'vault-treasury',
  // S193: untracked Obelisk-passport WIP (login/callback) — not in git HEAD, not
  // part of the public shell yet. Exempt until finished + committed; remove this
  // skip when it ships so nav-orphan guards it. (Mirrored in check-nav-orphans.)
  'obelisk-passport',
  // S225: Lighthouse CI HTML report artifacts — not part of the public site shell.
  // (Mirrored in check-nav-orphans.)
  'lighthouse-results'
]);
const ROOT_ONLY_SKIP_DIRS = new Set(['solara']);

// Standalone game runtimes (no standard nav) + utility pages (noindex)
const SKIP_FILES = new Set([
  'franchise-architect/game.html',
  'franchise-architect/index.html',
  'franchise-architect/404.html',
  '404.html', 'offline.html',
  // S135: noindex utility pages — share preview + site-verification placeholder
  'share/index.html',
  // S135: internal admin (sub-page of vault-member admin)
  'vault-member/admin/ignis-spend/index.html',
  // S206: vault passport is auth-gated + noindex — own minimal nav, not sitewide shell
  'vault-member/passport/index.html',
  // S207: Obelisk Passport login + OAuth callback — auth utility pages with their
  // own minimal layout (no sitewide header/footer), like the passport page.
  'login.html',
  'auth/callback.html'
]);

// ─── Active link mapping ───────────────────────────────
// Maps directory path prefixes to the nav link that should get class="active"
function getActiveLink(relPath) {
  const p = relPath.replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/\.html$/, '');
  if (p === '' || p === 'index') return '/';
  if (p.startsWith('games')) return '/games/';
  if (p.startsWith('projects')) return '/projects/';
  if (p.startsWith('universe')) return '/universe/';
  if (p.startsWith('studio')) return '/studio/';
  if (p.startsWith('contact')) return '/contact/';
  if (p.startsWith('journal')) return '/journal/';
  if (p.startsWith('news')) return '/news/';
  if (p.startsWith('leaderboards')) return '/leaderboards/';
  if (p.startsWith('roadmap')) return '/roadmap/';
  if (p.startsWith('vault-portal')) return '/membership/';
  if (p.startsWith('vault-member') || p.startsWith('member') || p.startsWith('join')) return '/vault-member/';
  if (p.startsWith('community') || p.startsWith('ranks')) return '/community/';
  if (p.startsWith('membership')) return '/membership/';
  if (p.startsWith('call-of-doodie')) return '/games/';
  if (p.startsWith('gridiron-gm')) return '/games/';
  if (p.startsWith('vaultfront')) return '/games/';
  return null; // no active link
}

// ─── Asset path depth ──────────────────────────────────
function getAssetPrefix(relPath) {
  const depth = relPath.replace(/\\/g, '/').split('/').length - 1;
  if (depth === 0) return '';
  return '../'.repeat(depth);
}

const STATUS_PRESENTATION = Object.freeze({
  SPARKED: { label: '🔥 Sparked', cssClass: 'dropdown-status-sparked' },
  FORGE: { label: '⚒️ In The Forge', cssClass: 'dropdown-status-forge' },
  VAULTED: { label: '🔒 Honored', cssClass: 'dropdown-status-honored' },
});

function deriveGameNav() {
  const groups = new Map();
  for (const [slug, game] of Object.entries(GAME_REGISTRY.games || {})) {
    const status = String(game.status || '').toUpperCase();
    const presentation = STATUS_PRESENTATION[status];
    const href = '/games/' + slug + '/';
    if (!presentation || !existsSync(join(ROOT, href.slice(1), 'index.html'))) continue;
    if (!groups.has(status)) groups.set(status, []);
    groups.get(status).push({ href, label: game.name, navOrder: game.navOrder || 999 });
  }
  return ['SPARKED', 'FORGE', 'VAULTED'].filter((status) => groups.has(status)).map((status) => ({
    status,
    ...STATUS_PRESENTATION[status],
    entries: groups.get(status).sort((a, b) => a.navOrder - b.navOrder || a.label.localeCompare(b.label)),
  }));
}

const PROJECT_ROUTE_OVERRIDES = Object.freeze({
  'football-gm': '/games/franchise-architect/',
  mindframe: '/games/mindframe/',
  promogrind: '/projects/promogrind/',
  velaxis: '/projects/velaxis/',
  vorn: '/projects/vorn/',
});

function deriveProjectNav() {
  const games = new Set(Object.keys(GAME_REGISTRY.games || {}));
  const groups = new Map();
  for (const project of PUBLIC_INTELLIGENCE.catalog || []) {
    if (project.type === 'game' || games.has(project.id)) continue;
    const status = String(project.status || '').toUpperCase();
    const presentation = STATUS_PRESENTATION[status];
    if (!presentation) continue;
    const local = '/projects/' + project.id + '/';
    const href = PROJECT_ROUTE_OVERRIDES[project.id] || (existsSync(join(ROOT, local.slice(1), 'index.html')) ? local : project.deployedUrl);
    if (!href) continue;
    if (!groups.has(status)) groups.set(status, []);
    groups.get(status).push({ href, label: project.name });
  }
  return ['SPARKED', 'FORGE', 'VAULTED'].filter((status) => groups.has(status)).map((status) => ({
    status,
    ...STATUS_PRESENTATION[status],
    entries: groups.get(status).sort((a, b) => a.label.localeCompare(b.label)),
  }));
}

const NAV_GAMES = deriveGameNav();
const NAV_PROJECTS = deriveProjectNav();

// S275: the "See all N in the forge" count was a hardcoded literal that had
// drifted from the hero pulse (12 vs 14) — every forge count now derives from
// the same catalog feed the hero uses (api/public-intelligence.json).
function forgeCatalogCount() {
  const feed = JSON.parse(readFileSync(join(ROOT, 'api/public-intelligence.json'), 'utf-8'));
  const n = (feed.catalog || []).filter((c) => c.status === 'FORGE').length;
  if (!n) throw new Error('forgeCatalogCount: catalog has zero FORGE projects — feed missing or malformed');
  return n;
}

// S329: the footer legend "N initiatives under the vault banner" was a
// hardcoded literal duplicated across every page — it now derives from the
// same feed's portfolio.total so a portfolio change is a one-feed edit.
function portfolioTotal() {
  const feed = JSON.parse(readFileSync(join(ROOT, 'api/public-intelligence.json'), 'utf-8'));
  const n = feed.portfolio && feed.portfolio.total;
  if (!Number.isInteger(n) || n <= 0) throw new Error('portfolioTotal: portfolio.total missing or malformed in api/public-intelligence.json');
  return n;
}

// Build a status-grouped dropdown section from data arrays.
function buildStatusSections(sections) {
  return sections.map((s) =>
    `<div class="dropdown-divider"></div><span class="dropdown-label ${s.cssClass}">${s.label}</span>` +
    s.entries.map((e) => `<a href="${e.href}"${e.cssClass ? ` class="${e.cssClass}"` : ''}>${e.label}</a>`).join('')
  ).join('');
}

function buildCatalogLinks(links, activeHref) {
  return links.map((link) => {
    const active = link.href === activeHref ? ' class="active" aria-current="page"' : (link.intelligence ? ' class="dropdown-link-intel"' : '');
    return '<a href="' + link.href + '"' + active + '>' + link.label + '</a>';
  }).join('');
}

function intelligenceLinks(activeHref) {
  return buildCatalogLinks(INTELLIGENCE_SUITE.routes.map((route) => ({ href: route.href, label: route.label, intelligence: true })), activeHref);
}

function resourceLinks(activeHref) {
  return buildCatalogLinks(RESOURCE_LINKS.links || [], activeHref);
}

function footerLinks(links) {
  return links.map((link) => `<a href="${link.href}">${link.label}</a>`).join('\n          ');
}

function footerProjectLinks() {
  const projects = NAV_PROJECTS.flatMap((group) => group.entries);
  return footerLinks([{ href: '/projects/', label: 'All Projects' }, ...projects]);
}

function footerIntelligenceLinks() {
  return footerLinks(INTELLIGENCE_SUITE.routes);
}

function footerResourceLinks() {
  return footerLinks(RESOURCE_LINKS.links || []);
}

function shellAsset(key) {
  const asset = SHELL_MANIFEST.assets && SHELL_MANIFEST.assets[key];
  if (!asset || !asset.path) throw new Error('shell manifest missing asset: ' + key);
  return '/' + asset.path.replace(/^\/+/, '');
}

function anchorHrefs(fragment) {
  return [...fragment.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
}

// ─── Build nav HTML ────────────────────────────────────
function buildNav(assetPrefix, activeHref) {
  // The active link carries both the visual class and the semantic
  // aria-current="page" so assistive tech announces "you are here".
  const activeAttr = (isActive) => (isActive ? ' class="active" aria-current="page"' : '');
  const a = (href, text) => `<a href="${href}"${activeAttr(href === activeHref)}>${text}</a>`;

  const gamesActive = activeAttr(activeHref === '/games/');
  const projectsActive = activeAttr(activeHref === '/projects/');
  const membershipActive = activeAttr(activeHref === '/membership/');

  return `<header class="site-header">
    <div class="container nav">
      <a class="brand" href="/" aria-label="VaultSpark Studios — home">
        <img fetchpriority="high" src="${assetPrefix}assets/vaultspark-icon-nav.webp" alt="VaultSpark Studios icon" width="44" height="44" />
        <span class="brand-wordmark">VaultSpark<span class="brand-suffix"> Studios</span><small>The vault is sparked</small></span>
      </a>
      <nav class="nav-center" id="nav-menu" aria-label="Primary navigation">
        ${a('/', 'Home')}
        <div class="nav-item has-dropdown"><a href="/games/"${gamesActive}>Games <span class="caret" aria-hidden="true">&#9660;</span></a><div class="nav-dropdown"><span class="dropdown-label">Games</span><a href="/games/">All Games</a>${buildStatusSections(NAV_GAMES)}</div></div>
        <div class="nav-item has-dropdown"><a href="/projects/"${projectsActive}>Projects <span class="caret" aria-hidden="true">&#9660;</span></a><div class="nav-dropdown"><span class="dropdown-label">Projects</span><a href="/projects/">All Projects</a>${buildStatusSections(NAV_PROJECTS)}</div></div>
        <div class="nav-item has-dropdown"><a href="/membership/"${membershipActive}>Membership <span class="caret" aria-hidden="true">&#9660;</span></a><div class="nav-dropdown"><span class="dropdown-label">Vault Membership</span><a href="/membership/#overview">Membership overview</a><a href="/membership/#tiers">Compare tiers</a><a href="/membership/#benefits">Member value</a><div class="dropdown-divider"></div><span class="dropdown-label dropdown-status-intel">Enter the Vault</span><a href="/vault-member/">Vault Member portal</a><a href="/investor-portal/" class="dropdown-link-investor">Investor portal</a><div class="dropdown-divider"></div><span class="dropdown-label">Member Area</span><a href="/community/#wall">Vault Wall</a><a href="/leaderboards/">Leaderboard &amp; ranks</a><a href="/invite/">Refer a Friend</a></div></div>
        <div class="nav-item has-dropdown"><a href="/universe/"${activeAttr(activeHref === '/universe/')}>Universe <span class="caret" aria-hidden="true">&#9660;</span></a><div class="nav-dropdown"><span class="dropdown-label">Universe</span><a href="/universe/">Universe Home</a><div class="dropdown-divider"></div><span class="dropdown-label dropdown-status-active">🔥 Active Worlds</span><a href="/universe/voidfall/">Voidfall</a><div class="dropdown-divider"></div><span class="dropdown-label dropdown-status-honored">🔒 Honored</span><a href="/universe/dreadspike/">DreadSpike (vaulted)</a><div class="dropdown-divider"></div><span class="dropdown-label">Lore Surfaces</span><a href="/journal/dispatches/">Insider Dispatches</a></div></div>
        <div class="nav-item has-dropdown"><a href="/studio/"${activeAttr(activeHref === '/studio/')}>Studio <span class="caret" aria-hidden="true">&#9660;</span></a><div class="nav-dropdown"><span class="dropdown-label dropdown-status-intel">Live Intelligence</span>${intelligenceLinks(activeHref)}<div class="dropdown-divider"></div><span class="dropdown-label">Studio</span><a href="/studio/">About</a><a href="/news/"${activeAttr(activeHref === '/news/')}>The Desk · News</a><a href="/journal/">Signal Log</a><a href="/journal/dispatches/">Insider Dispatches</a><a href="/notebook/">Studio Notebook</a><div class="dropdown-divider"></div><span class="dropdown-label">Community</span><a href="/community/">Community Hub</a><a href="https://discord.gg/rKG9GGaSdu" target="_blank" rel="noreferrer">Discord</a><div class="dropdown-divider"></div><span class="dropdown-label">Outside-In</span><a href="/press/">Press Kit</a><a href="/brand/">Brand Kit</a><a href="/social/">Social Channels</a></div></div>
        <div class="nav-item has-dropdown"><a href="/sitemap-page/">Resources <span class="caret" aria-hidden="true">&#9660;</span></a><div class="nav-dropdown"><span class="dropdown-label">Resources</span>${resourceLinks(activeHref)}<div class="dropdown-divider"></div><span class="dropdown-label">Studio Brand</span><a href="/brand/">Brand Kit</a><a href="/press/">Press Kit</a><div class="dropdown-divider"></div><span class="dropdown-label">The Vault</span><a href="/vault/tombstones/">Tombstones</a><div class="dropdown-divider"></div><span class="dropdown-label">Follow</span><a href="/social/">All Social Channels</a></div></div>

        <div class="mobile-nav-footer">
          <a class="mobile-nav-signin" href="/vault-member/#login">Sign In</a>
          <a class="mobile-nav-join" href="/membership/">Membership</a>
          <a class="mobile-nav-join" href="/vault-member/#register">Join The Vault</a>
          <a class="mobile-nav-github" href="https://github.com/VaultSparkStudios" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </nav>
      <div class="nav-right">
        <a class="nav-icon-link" href="https://github.com/VaultSparkStudios" target="_blank" rel="noreferrer" aria-label="VaultSpark Studios on GitHub"><svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>
        <a class="nav-signin" href="/vault-member/#login">Sign In</a>
        <a class="button button-sm" href="/vault-member/#register">Join The Vault</a>
        <button type="button" class="hamburger" id="hamburger" aria-expanded="false" aria-controls="nav-menu" aria-label="Toggle navigation">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>`;
}

// ─── Footer social icons row ───────────────────────────
// Canonical list of platforms the studio operates on. All 15 surfaces
// from studioRegistry.SOCIAL_ACCOUNTS. Inline SVGs are branded + small.
const FOOTER_SOCIALS = [
  { id: 'youtube',       label: 'YouTube',       url: 'https://www.youtube.com/@VaultSparkStudios' },
  { id: 'github',        label: 'GitHub',        url: 'https://github.com/VaultSparkStudios' },
  { id: 'reddit',        label: 'Reddit',        url: 'https://www.reddit.com/r/VaultSparkStudios/' },
  { id: 'x',             label: 'X',             url: 'https://x.com/VaultSpark' },
  { id: 'instagram',     label: 'Instagram',     url: 'https://www.instagram.com/vaultsparkstudios/' },
  { id: 'tiktok',        label: 'TikTok',        url: 'https://www.tiktok.com/@vaultsparkstudios' },
  { id: 'discord',       label: 'Discord',       url: 'https://discord.gg/rKG9GGaSdu' },
  { id: 'bluesky',       label: 'Bluesky',       url: 'https://bsky.app/profile/vaultsparkstudios.bsky.social' },
  { id: 'threads',       label: 'Threads',       url: 'https://www.threads.com/@vaultsparkstudios' },
  { id: 'facebook',      label: 'Facebook',      url: 'https://www.facebook.com/VaultSparkStudios/' },
  { id: 'pinterest',     label: 'Pinterest',     url: 'https://www.pinterest.com/VaultSparkStudios/' },
  { id: 'gumroad',       label: 'Gumroad',       url: 'https://vaultsparkstudios.gumroad.com/' },
  { id: 'suno',          label: 'Suno',          url: 'https://suno.com/@VaultSparkStudios' },
  { id: 'sora',          label: 'Sora',          url: 'https://sora.chatgpt.com/profile/vaultsparkstudios' },
];

// SVG sprite references — brand marks served from /assets/social-icons.svg.
// Sprite is loaded once per page via <img> preload + inline <use> refs.
const FOOTER_SOCIAL_ICONS = {
  youtube: 'i-youtube', github: 'i-github', reddit: 'i-reddit', x: 'i-x',
  instagram: 'i-instagram', tiktok: 'i-tiktok', discord: 'i-discord',
  bluesky: 'i-bluesky', threads: 'i-threads', facebook: 'i-facebook',
  pinterest: 'i-pinterest', gumroad: 'i-gumroad', suno: 'i-suno', sora: 'i-sora',
};

function buildFooterSocialRow(assetPrefix) {
  const spritePath = `${assetPrefix || '/'}assets/social-icons.svg`;
  return FOOTER_SOCIALS.map((s) => {
    const icon = FOOTER_SOCIAL_ICONS[s.id] || 'i-github';
    return `<a class="footer-social" href="${s.url}" target="_blank" rel="noreferrer me" aria-label="${s.label}" title="${s.label}"><svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="${spritePath}#${icon}"/></svg></a>`;
  }).join('\n          ');
}

// ─── Build footer HTML ─────────────────────────────────
function buildFooter(assetPrefix) {
  return `<footer class="site-footer" aria-label="Site footer">
    <div class="container">
      <div class="footer-inner">
        <div class="footer-brand">
          <strong>VaultSpark Studios</strong>
          <p>Where worlds are built. Where stories ignite. The vault is sparked. ⚡</p>
        </div>
        <div class="footer-col">
          <h2>Games</h2>
          <a href="/games/">All Games</a>
          <a href="/games/call-of-doodie/">Call Of Doodie</a>
          <a href="/games/gridiron-gm/">Gridiron GM</a>
          <a href="/games/franchise-architect/">Franchise Architect</a>
          <a href="/games/vaultfront/">VaultFront</a>
          <a href="/games/solara/">Solara</a>
          <a href="/games/mindframe/">MindFrame</a>
          <a href="/games/the-exodus/">The Exodus</a>
          <a href="/games/project-unknown/">Project Unknown</a>
          <a href="/games/voidfall/">Voidfall Game</a>
          <a href="/games/vaultspark-forge/">VaultSpark Forge</a>
          <a href="/leaderboards/">Leaderboards</a>
          <a href="/community/">Community Hub</a>
        </div>
        <div class="footer-col">
          <h2>Projects</h2>
          ${footerProjectLinks()}
        </div>
        <div class="footer-col">
          <h2>Studio</h2>
          <a href="/">Home</a>
          <a href="/studio/">About</a>
          ${footerIntelligenceLinks()}
          <a href="/news/">The Desk · News</a>
          <a href="/journal/">Signal Log</a>
          <a href="/notebook/">Studio Notebook</a>
          <a href="/press/">Press Kit</a>
          <a href="/brand/">Brand Kit</a>
          <a href="/journal/dispatches/">Insider Dispatches</a>
          <a href="/vault/tombstones/">Tombstones</a>
        </div>
        <div class="footer-col">
          <h2>Membership</h2>
          <a href="/membership/">About Membership</a>
          <a href="/membership/#tiers">Choose Your Tier</a>
          <a href="/membership/#benefits">Value Breakdown</a>
          <a href="/vault-member/">Vault Member</a>
          <a href="/members/">Member Directory</a>
          <a href="/member/">Member Lookup</a>
          <a href="/community/#wall">Vault Wall</a>
          <a href="/leaderboards/#ranks">Vault Ranks</a>
          <a href="/invite/">Refer a Friend</a>
        </div>
        <div class="footer-col">
          <h2>Worlds</h2>
          <a href="/universe/">Universe Home</a>
          <a href="/universe/voidfall/">Voidfall</a>
          <a href="/universe/dreadspike/">DreadSpike</a>
        </div>
        <div class="footer-col">
          <h2>Portals</h2>
          <a href="/vault-member/">Vault Member</a>
          <a href="/investor-portal/">Investor Portal</a>
          <a href="/investor-portal/apply/">Investor Application</a>
        </div>
        <div class="footer-col">
          <h2>Resources</h2>
          ${footerResourceLinks()}
        </div>
        <div class="footer-col footer-col--dispatch">
          <h2>Studio Dispatch</h2>
          <p class="footer-dispatch-sub">One email when something leaves the forge — new games, tools, and reveals. No account needed, no spam.</p>
          <form class="footer-dispatch-form" id="footer-email-form" data-source="footer" novalidate>
            <label class="vs-visually-hidden" for="footer-email-input">Email address</label>
            <input id="footer-email-input" type="email" autocomplete="email" placeholder="you@email.com" required />
            <input id="footer-botcheck" type="checkbox" name="botcheck" tabindex="-1" class="footer-dispatch-bot" aria-label="Spam prevention; leave blank" aria-hidden="true" hidden style="display:none !important;" />
            <button type="submit" class="button button-sm">Join the dispatch</button>
          </form>
          <div class="footer-dispatch-success" id="footer-success" role="status" aria-live="polite" hidden>&#10003; You're on the list — watch for the next signal.</div>
        </div>
      </div>
      <div class="footer-socials-row" aria-label="Follow VaultSpark Studios">
        <span class="footer-socials-label">Follow the Studio</span>
        <div class="footer-socials">
          ${buildFooterSocialRow(assetPrefix)}
        </div>
        <a class="footer-socials-all" href="/social/">All channels &rarr;</a>
      </div>
      <div class="vault-status-legend">
        <span class="legend-status-sparked">🔥 SPARKED — Live &amp; improving</span>
        <span class="legend-status-forge">⚒️ FORGE — Building</span>
        <span class="legend-status-vaulted">🔒 VAULTED — Paused or archived</span>
        <span class="legend-status-meta">${portfolioTotal()} initiatives under the vault banner · <a href="/studio-pulse/">open Studio Pulse &rarr;</a></span>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 VaultSpark Studios LLC. All rights reserved. VaultSpark&trade; and VaultSpark Studios&trade; are trademarks of VaultSpark Studios LLC.</span>
        <span><a href="/privacy/">Privacy</a> &nbsp;&middot;&nbsp; <a href="/cookies/">Cookies</a> &nbsp;&middot;&nbsp; <a href="/terms/">Terms</a> &nbsp;&middot;&nbsp; <a href="/data-deletion/">Data Deletion</a> &nbsp;&middot;&nbsp; <a href="/contact/">Contact</a> &nbsp;&middot;&nbsp; <a href="/evidence/#verify" title="Re-verify our deploy ledger in your own browser">Independently verifiable &#10003;</a></span>
      </div>
    </div>
  </footer>`;
}

// ─── Find all HTML files ───────────────────────────────
function findHtmlFiles(dir, base = dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(base, full).replace(/\\/g, '/');

    if (SKIP_DIRS.has(entry) || ROOT_ONLY_SKIP_DIRS.has(rel)) continue;
    if (statSync(full).isDirectory()) {
      results.push(...findHtmlFiles(full, base));
    } else if (entry.endsWith('.html')) {
      if (SKIP_FILES.has(rel)) continue;
      results.push({ full, rel });
    }
  }
  return results;
}

// ─── Ambient sitewide script block ─────────────────────────────────────────
// Injected before </body>. Idempotent via marker comments. Expands IGNIS/Oracle
// presence, engagement signal, and motion polish to every public page.
// - ignis-lens.js:  floating "Ask IGNIS" pill, self-suppresses on portal pages.
//   Lazy-loads vault-oracle.js on click → Oracle is effectively sitewide.
// - exit-intent.js: one micro-feedback pulse per session, respects preferences.
// - scroll-reveal.js + scroll-depth.js + native-feel.js: motion + analytics.
// Context-conditional: studio-pulse-live on /studio-pulse/, /leaderboards/ + /ranks/,
//                      lore-gates on /universe/*.
function buildAmbientBlock(relPath) {
  const p = relPath.replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/\.html$/, '');
  const isPortal = /^(vault-member|investor-portal|studio-hub|admin|offline|404)/.test(p);
  if (isPortal) return null; // skip portals / shell pages
  // Match `universe` (the /universe/ index) AND `universe/<anything>` — the
  // previous `/^universe\//` regex silently skipped the index page so it
  // never received `lore-gates.js` in its ambient block.
  const universe  = /^universe(\/|$)/.test(p);
  const leaderRanks = /^(studio-pulse|leaderboards|ranks)/.test(p);
  const desk = /^news(\/|$)/.test(p);
  // S136 speed sprint: 18 previously-separate ambient scripts are now
  // concatenated into a single hashed `assets/ambient.shell-<hash>.js` bundle
  // by `scripts/build-ambient-bundle.mjs` + `build-shell-assets.mjs`. The
  // hash is rewritten in place by `build-shell-assets.mjs` so the literal
  // path here is a placeholder pattern that the hashing step updates.
  // Result: 1 HTTP request instead of 18; ~30 KB gzipped vs ~98 KB raw on
  // the wire; single parse + execution context.
  const base = [
    '<script src="' + shellAsset('ambientCore') + '" defer></script>',
    '<script src="' + shellAsset('ambientFeature') + '" defer></script>',
  ];
  if (universe)    base.push('<script src="/assets/lore-gates.js" defer></script>');
  if (leaderRanks) base.push('<script src="/assets/studio-pulse-live.js" defer></script>');
  if (desk) {
    base.push('<script src="/assets/csrf-token.js" defer></script>');
    base.push('<script src="/assets/turnstile.js" defer></script>');
  }
  return `<!-- vs-ambient:start -->\n${base.join('\n')}\n<!-- vs-ambient:end -->`;
}

// ─── Theme FOUC prevention script (injected at <body> start) ──────────────
// Reads localStorage.vs_theme before any content renders — prevents flash of
// wrong theme when navigating between pages. Tiny inline script, no external dep.
// Applied at <body> start — sets theme class on both <html> and <body> before any
// content paints, eliminating the dark-flash FOUC on page navigation.
const THEME_FIX_SCRIPT = `<script>!function(){try{var t=localStorage.getItem('vs_theme'),m={dark:'dark-mode',light:'light-mode',ambient:'ambient-mode',warm:'warm-mode',cool:'cool-mode',lava:'lava-mode','high-contrast':'high-contrast-mode'};if(t&&m[t]){var c=m[t];document.documentElement.classList.add(c);document.documentElement.dataset.theme=t;document.body.classList.add(c);document.body.dataset.theme=t;}var mo=localStorage.getItem('vs_motion');if(mo==='reduced'){document.documentElement.dataset.motion='reduced';document.body.dataset.motion='reduced';}}catch(e){}}();<\/script>`;

// ─── Main ──────────────────────────────────────────────
const files = findHtmlFiles(ROOT);
let updated = 0;
let skipped = 0;

for (const { full, rel } of files) {
  const original = readFileSync(full, 'utf-8');
  let html = original;

  // Check if file has a standard nav
  if (!html.includes('site-header') && !html.includes('nav-center')) {
    skipped++;
    continue;
  }

  const assetPrefix = getAssetPrefix(rel);
  const activeHref = getActiveLink(rel);
  const nav = buildNav(assetPrefix, activeHref);
  const footer = buildFooter(assetPrefix);

  if (CHECK) {
    const currentHeader = html.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
    const currentFooter = html.match(/<footer class="site-footer"[^>]*>[\s\S]*?<\/footer>/)?.[0] || '';
    const footerCurrent = JSON.stringify(anchorHrefs(currentFooter)) === JSON.stringify(anchorHrefs(footer));
    const expectedShellAssets = [shellAsset('ambientCore'), shellAsset('ambientFeature')];
    const shellCurrent = expectedShellAssets.every((asset) => html.includes(asset)) || buildAmbientBlock(rel) === null;
    if (currentHeader !== nav || !footerCurrent || !shellCurrent) {
      const parts = [currentHeader !== nav && 'header', !footerCurrent && 'footer-links', !shellCurrent && 'shell-assets'].filter(Boolean);
      console.log('[check] Catalog or shell drift (' + parts.join(', ') + '): ' + rel);
      updated++;
    } else {
      skipped++;
    }
    continue;
  }

  // Replace header block
  const headerRegex = /<header class="site-header">[\s\S]*?<\/header>/;
  if (headerRegex.test(html)) {
    html = html.replace(headerRegex, nav);
  }

  // Replace footer block
  const footerRegex = /<footer class="site-footer"[^>]*>[\s\S]*?<\/footer>/;
  if (footerRegex.test(html)) {
    html = html.replace(footerRegex, footer);
  }

  // Inject theme FOUC prevention script right after <body> tag (idempotent).
  // Refresh the existing block if it predates the motion-aware variant (S113+).
  const themeScriptRegex = /<script>!function\(\)\{try\{var t=localStorage\.getItem\('vs_theme'\)[\s\S]*?\}\(\);<\/script>/;
  if (themeScriptRegex.test(html)) {
    if (!html.includes('vs_motion')) {
      html = html.replace(themeScriptRegex, THEME_FIX_SCRIPT);
    }
  } else if (!html.includes("localStorage.getItem('vs_theme')")) {
    html = html.replace(/(<body[^>]*>)/, '$1\n' + THEME_FIX_SCRIPT);
  }

  // ─── Inject resource hints if missing ──────────────────
  if (!html.includes('preconnect')) {
    const hints = [
      '<link rel="preconnect" href="https://fjnpzjjyhnpmunfoycrp.supabase.co" />',
      '<link rel="dns-prefetch" href="https://fjnpzjjyhnpmunfoycrp.supabase.co" />',
    ].join('\n  ');
    html = html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n  ' + hints);
  }
  // S194: gtag was removed site-wide (S147/S175) but the googletagmanager +
  // google-analytics resource hints were left behind — dead TLS warm-ups to a
  // tracker that never loads, plus a privacy-optics smell for a privacy-positioning
  // studio. Strip them wherever they survive (js.stripe.com stays — Stripe checkout
  // is real). Idempotent: a re-run over an already-clean page is a no-op.
  html = html.replace(
    /\n\s*<link rel="(?:preconnect|dns-prefetch)" href="https:\/\/www\.google(?:tagmanager|-analytics)\.com"[^>]*\/>/g,
    ''
  );
  // Collapse historical duplicate js.stripe.com dns-prefetch lines (pre-existing
  // debris from earlier injection passes) down to one.
  html = html.replace(
    /(<link rel="dns-prefetch" href="https:\/\/js\.stripe\.com" \/>)(\s*<link rel="dns-prefetch" href="https:\/\/js\.stripe\.com" \/>)+/g,
    '$1'
  );
  // Add Stripe prefetch hint if missing (Stripe Checkout is a live revenue path).
  if (!html.includes('js.stripe.com')) {
    html = html.replace(
      /<link rel="dns-prefetch" href="https:\/\/fjnpzjjyhnpmunfoycrp\.supabase\.co" \/>/,
      '<link rel="dns-prefetch" href="https://fjnpzjjyhnpmunfoycrp.supabase.co" />\n  <link rel="dns-prefetch" href="https://js.stripe.com" />'
    );
  }

  // S228/CANON-048: Agent discovery link — points AI crawlers at /agents.json.
  // Idempotent: guard prevents double-injection on re-runs.
  if (!html.includes('href="/agents.json"')) {
    html = html.replace('</head>', '  <link rel="alternate" type="application/json" href="/agents.json" />\n</head>');
  }

  // S126: Speculation Rules — prerender same-origin nav-target pages on hover.
  // type="speculationrules" is data-not-code; modern CSP exempts it from script-src.
  // Refreshable via marker comments (re-runs replace the block in place).
  if (html.includes('</head>')) {
    const speculationBlock = `<!-- vs-speculation:start -->
  <script type="speculationrules">
  {
    "prerender": [
      {
        "where": {
          "and": [
            { "href_matches": "/*" },
            { "not": { "href_matches": "/vault-member/*" } },
            { "not": { "href_matches": "/investor-portal/*" } },
            { "not": { "href_matches": "/admin/*" } },
            { "not": { "href_matches": "/api/*" } },
            { "not": { "href_matches": "/*/admin/*" } },
            { "not": { "selector_matches": "[data-no-prerender]" } },
            { "not": { "selector_matches": ".no-prerender" } }
          ]
        },
        "eagerness": "moderate"
      }
    ],
    "prefetch": [
      { "where": { "href_matches": "/*" }, "eagerness": "conservative" }
    ]
  }
  </script>
  <!-- vs-speculation:end -->`;
    const specRegex = /<!-- vs-speculation:start -->[\s\S]*?<!-- vs-speculation:end -->/;
    if (specRegex.test(html)) {
      html = html.replace(specRegex, speculationBlock);
    } else {
      html = html.replace('</head>', `${speculationBlock}\n</head>`);
    }
  }

  // ─── Inject / refresh ambient sitewide script block ───────────────────
  const ambient = buildAmbientBlock(rel);
  if (ambient) {
    // Strip any pre-ambient standalone tags for scripts the ambient block now
    // owns — they were left behind from the pre-S98 era when these scripts
    // were injected per-page. Re-adding them inside the ambient block (since
    // S98) made every such page double-load those scripts.
    //
    // Only strip tags that live BEFORE the ambient block to avoid eating the
    // ambient block's own contents. Also skip pages that don't yet have an
    // ambient block — the else-branch below will inject one, and leaving the
    // legacy tags alone for one cycle is safer than deleting them blind.
    const AMBIENT_OWNED = [
      'ignis-lens.js',
      'exit-intent.js',
      'scroll-reveal.js',
      'scroll-depth.js',
      'native-feel.js',
      'presence-badge.js',
      'visit-depth.js',
      // P7 polish — owned by ambient block from S113.
      'breadcrumb-render.js',
      'rate-page.js',
      'account-chip.js',
      'command-palette.js',
      'hover-prefetch.js',
      'edge-swipe-nav.js',
      'pointerdown-warm.js',
      'page-sigil.js',
      'vault-atlas.js',
      'vault-genome-strip.js',
      'rank-orb.js',
      // Context-conditional (universe + leaderboards/ranks) but still ambient-owned.
      'lore-gates.js',
      'studio-pulse-live.js',
    ];
    const startIdx = html.indexOf('<!-- vs-ambient:start -->');
    if (startIdx !== -1) {
      const head = html.slice(0, startIdx);
      const tail = html.slice(startIdx);
      const stripped = AMBIENT_OWNED.reduce((acc, name) => {
        // Match indent + <script src="/assets/NAME" defer></script> + trailing newline.
        const re = new RegExp(
          `[ \\t]*<script src=["'](?:\\.?\\.?/)?assets/${name.replace('.', '\\.')}["'] defer></script>\\r?\\n?`,
          'g'
        );
        return acc.replace(re, '');
      }, head);
      html = stripped + tail;
    }

    const ambientRegex = /<!-- vs-ambient:start -->[\s\S]*?<!-- vs-ambient:end -->/;
    if (ambientRegex.test(html)) {
      html = html.replace(ambientRegex, ambient);
    } else if (html.includes('</body>')) {
      html = html.replace('</body>', `  ${ambient}\n</body>`);
    }
  }

  if (html === original) {
    skipped++;
    continue;
  }
  if (DRY_RUN || CHECK) {
    console.log('[' + (CHECK ? 'check' : 'dry-run') + '] Would update: ' + rel);
  } else {
    writeFileSync(full, html, 'utf-8');
    console.log(`Updated: ${rel}`);
  }
  updated++;
}

console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
if (DRY_RUN) console.log('(Dry run — no files were modified)');
if (CHECK && updated) {
  console.error('propagate-nav --check: FAIL · ' + updated + ' page(s) are not rendered from the canonical catalogs');
  process.exit(1);
}
if (CHECK) console.log('propagate-nav --check: passed · all standard-shell pages match canonical catalogs');

// S175: the nav template still carries inline style attributes; the strict
// intelligence-style gate (S169) forbids them on key pages. Chain the
// extractor so propagation can never re-introduce that debt class.
if (!DRY_RUN && !CHECK) {
  try {
    const { execSync } = await import('node:child_process');
    // S275: execPath must be quoted — "C:\Program Files\nodejs\node.exe" has a
    // space, so the bare interpolation ran 'C:\Program' and silently skipped
    // the extractor on Windows.
    execSync(`"${process.execPath}" scripts/extract-inline-styles.mjs`, { stdio: 'inherit', windowsHide: true });
  } catch {
    console.warn('extract-inline-styles pass failed — run it manually before build:check --strict');
  }
}
