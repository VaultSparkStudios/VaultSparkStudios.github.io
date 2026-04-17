#!/usr/bin/env node
/**
 * propagate-nav.mjs — Propagate the canonical nav header and footer
 * to all HTML pages in the VaultSpark Studios website.
 *
 * Usage: node scripts/propagate-nav.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const DRY_RUN = process.argv.includes('--dry-run');

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules', 'playwright-report', 'test-results',
  'investor', 'investor-portal', 'studio-hub', 'vaultsparked',
  '.git', '.well-known', 'scripts'
]);

// Standalone game runtimes (no standard nav)
const SKIP_FILES = new Set([
  'vaultspark-football-gm/game.html',
  '404.html', 'offline.html'
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
  if (p.startsWith('leaderboards')) return '/leaderboards/';
  if (p.startsWith('roadmap')) return '/roadmap/';
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

// ─── Build nav HTML ────────────────────────────────────
function buildNav(assetPrefix, activeHref) {
  const a = (href, text) => {
    const isActive = href === activeHref;
    // Games and Projects dropdown parents need special handling
    const cls = isActive ? ' class="active"' : '';
    return `<a href="${href}"${cls}>${text}</a>`;
  };

  const gamesActive = activeHref === '/games/' ? ' class="active"' : '';
  const projectsActive = activeHref === '/projects/' ? ' class="active"' : '';
  const membershipActive = activeHref === '/membership/' ? ' class="active"' : '';

  return `<header class="site-header">
    <div class="container nav">
      <a class="brand" href="/" aria-label="VaultSpark Studios — home">
        <img fetchpriority="high" src="${assetPrefix}assets/vaultspark-icon-nav.webp" alt="VaultSpark Studios icon" width="44" height="44" />
        <span>VaultSpark Studios<small>The vault is sparked</small></span>
      </a>
      <nav class="nav-center" id="nav-menu" aria-label="Primary navigation">
        ${a('/', 'Home')}
        <div class="nav-item has-dropdown"><a href="/games/"${gamesActive}>Games <span class="caret" aria-hidden="true">&#9660;</span></a><div class="nav-dropdown"><span class="dropdown-label">Games</span><a href="/games/">All Games</a><div class="dropdown-divider"></div><span class="dropdown-label" style="color:#fbbf24;">🔥 Sparked</span><a href="/games/call-of-doodie/">Call of Doodie</a><a href="/games/vaultspark-football-gm/">VaultSpark Football GM</a><div class="dropdown-divider"></div><span class="dropdown-label" style="color:#f59e0b;">⚒️ In The Forge</span><a href="/games/vaultfront/">VaultFront</a><a href="/games/solara/">Solara</a><a href="/games/mindframe/">MindFrame</a><a href="/games/the-exodus/">The Exodus</a><div class="dropdown-divider"></div><span class="dropdown-label" style="color:#94a3b8;">🔒 Vaulted</span><a href="/games/gridiron-gm/">Gridiron GM</a><a href="/games/project-unknown/">Project Unknown</a></div></div>
        <div class="nav-item has-dropdown"><a href="/projects/"${projectsActive}>Projects <span class="caret" aria-hidden="true">&#9660;</span></a><div class="nav-dropdown"><span class="dropdown-label">Projects</span><a href="/projects/">All Projects</a><div class="dropdown-divider"></div><span class="dropdown-label" style="color:#fbbf24;">🔥 Sparked</span><a href="/projects/promogrind/">PromoGrind</a><div class="dropdown-divider"></div><span class="dropdown-label" style="color:#f59e0b;">⚒️ In The Forge</span><a href="/projects/velaxis/">Velaxis</a><a href="/projects/vorn/">Vorn</a><a href="/projects/statvault/">StatVault</a><a href="/projects/canon/">Canon</a><a href="/projects/the-living-protocol/">The Living Protocol</a><a href="/projects/ideaforge/">IdeaForge</a></div></div>
        <div class="nav-item has-dropdown"><a href="/membership/"${membershipActive}>Membership <span class="caret" aria-hidden="true">&#9660;</span></a><div class="nav-dropdown"><span class="dropdown-label">Vault Membership</span><a href="/membership/">About Membership</a><a href="/vaultsparked/">Choose Your Tier</a><a href="/membership-value/">Value Breakdown</a><div class="dropdown-divider"></div><span class="dropdown-label" style="color:#FFC400;">Member Area</span><a href="/vault-member/">Vault Portal</a><a href="/vault-wall/">Vault Wall</a><a href="/invite/">Refer a Friend</a></div></div>
        ${a('/universe/', 'Universe')}
        <div class="nav-item has-dropdown"><a href="/studio/"${activeHref === '/studio/' ? ' class="active"' : ''}>Studio <span class="caret" aria-hidden="true">&#9660;</span></a><div class="nav-dropdown"><span class="dropdown-label">Studio</span><a href="/studio/">About</a><a href="/studio-pulse/">Studio Pulse</a><a href="/ignis/">IGNIS</a><a href="/roadmap/">Vault Pipeline</a><a href="/changelog/">Changelog</a><div class="dropdown-divider"></div><span class="dropdown-label">Outside-In</span><a href="/press/">Press Kit</a><a href="/social/">Social</a><a href="/journal/">Signal Log</a></div></div>
        ${a('/contact/', 'Contact')}

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

// ─── Build footer HTML ─────────────────────────────────
function buildFooter() {
  return `<footer class="site-footer" aria-label="Site footer">
    <div class="container">
      <div class="footer-inner">
        <div class="footer-brand">
          <strong>VaultSpark Studios</strong>
          <p>Where worlds are built. Where stories ignite. The vault is sparked. ⚡</p>
        </div>
        <div class="footer-col">
          <h4>Games</h4>
          <a href="/games/">All Games</a>
          <a href="/games/call-of-doodie/">Call Of Doodie</a>
          <a href="/games/gridiron-gm/">Gridiron GM</a>
          <a href="/games/vaultspark-football-gm/">VaultSpark Football GM</a>
        </div>
        <div class="footer-col">
          <h4>Studio</h4>
          <a href="/">Home</a>
          <a href="/studio/">About</a>
          <a href="/studio-pulse/">Studio Pulse</a>
          <a href="/ignis/">IGNIS</a>
          <a href="/roadmap/">Vault Pipeline</a>
          <a href="/changelog/">Changelog</a>
          <a href="/journal/">Signal Log</a>
          <a href="/press/">Press Kit</a>
          <a href="/universe/">Universe</a>
          <a href="/leaderboards/">Leaderboard</a>
          <a href="/community/">Community Hub</a>
        </div>
        <div class="footer-col">
          <h4>Membership</h4>
          <a href="/membership/">About Membership</a>
          <a href="/vaultsparked/">Choose Your Tier</a>
          <a href="/membership-value/">Value Breakdown</a>
          <a href="/vault-member/">Vault Portal</a>
          <a href="/vault-wall/">Vault Wall</a>
          <a href="/invite/">Refer a Friend</a>
        </div>
        <div class="footer-col">
          <h4>Connect</h4>
          <a href="https://x.com/VaultSpark" target="_blank" rel="noreferrer">X / Twitter</a>
          <a href="https://www.reddit.com/r/VaultSparkStudios/" target="_blank" rel="noreferrer">Reddit</a>
          <a href="https://discord.com/users/vaultsparkstudios" target="_blank" rel="noreferrer">Discord</a>
          <a href="https://www.youtube.com/@VaultSparkStudios" target="_blank" rel="noreferrer">YouTube</a>
        </div>
        <div class="footer-col">
          <h4>Resources</h4>
          <a href="/faq/">FAQ</a>
          <a href="/careers/">Careers</a>
          <a href="/rights/">Technology &amp; Rights</a>
          <a href="/accessibility/">Accessibility</a>
          <a href="/security/">Security</a>
          <a href="/sitemap-page/">Sitemap</a>
        </div>
      </div>
      <div class="vault-status-legend" style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;padding:1rem 0;margin-top:1rem;border-top:1px solid rgba(255,255,255,0.06);font-size:0.75rem;font-weight:600;letter-spacing:0.04em;">
        <span class="legend-status-sparked" style="color:#fbbf24;">🔥 SPARKED — Live</span>
        <span class="legend-status-forge" style="color:#f59e0b;">⚒️ FORGE — Building</span>
        <span class="legend-status-vaulted" style="color:#94a3b8;">🔒 VAULTED — Paused</span>
        <span class="legend-status-sealed" style="color:#7EC9FF;">⬡ SEALED — Deep forge</span>
        <span style="margin-left:auto;color:var(--muted);font-weight:500;">27 initiatives under the vault banner · <a href="/studio-pulse/" style="color:var(--gold);">open the Forge Window &rarr;</a></span>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 VaultSpark Studios. All rights reserved. VaultSpark&trade; is a trademark of VaultSpark Studios.</span>
        <span><a href="/privacy/">Privacy</a> &nbsp;&middot;&nbsp; <a href="/cookies/">Cookies</a> &nbsp;&middot;&nbsp; <a href="/terms/">Terms</a> &nbsp;&middot;&nbsp; <a href="/data-deletion/">Data Deletion</a> &nbsp;&middot;&nbsp; <a href="/contact/">Contact</a></span>
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

    if (SKIP_DIRS.has(entry)) continue;
    if (statSync(full).isDirectory()) {
      results.push(...findHtmlFiles(full, base));
    } else if (entry.endsWith('.html')) {
      if (SKIP_FILES.has(rel)) continue;
      results.push({ full, rel });
    }
  }
  return results;
}

// ─── Theme FOUC prevention script (injected at <body> start) ──────────────
// Reads localStorage.vs_theme before any content renders — prevents flash of
// wrong theme when navigating between pages. Tiny inline script, no external dep.
// Applied at <body> start — sets theme class on both <html> and <body> before any
// content paints, eliminating the dark-flash FOUC on page navigation.
const THEME_FIX_SCRIPT = `<script>!function(){try{var t=localStorage.getItem('vs_theme'),m={dark:'dark-mode',light:'light-mode',ambient:'ambient-mode',warm:'warm-mode',cool:'cool-mode',lava:'lava-mode','high-contrast':'high-contrast-mode'};if(t&&m[t]){var c=m[t];document.documentElement.classList.add(c);document.documentElement.dataset.theme=t;document.body.classList.add(c);document.body.dataset.theme=t;}}catch(e){}}();<\/script>`;

// ─── Main ──────────────────────────────────────────────
const files = findHtmlFiles(ROOT);
let updated = 0;
let skipped = 0;

for (const { full, rel } of files) {
  let html = readFileSync(full, 'utf-8');

  // Check if file has a standard nav
  if (!html.includes('site-header') && !html.includes('nav-center')) {
    skipped++;
    continue;
  }

  const assetPrefix = getAssetPrefix(rel);
  const activeHref = getActiveLink(rel);
  const nav = buildNav(assetPrefix, activeHref);
  const footer = buildFooter();

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

  // Inject theme FOUC prevention script right after <body> tag (idempotent)
  if (!html.includes('vs_theme') || !html.includes('THEME_FIX') && !html.includes('theme-fix')) {
    // Check if the tiny inline script is already present
    if (!html.includes("localStorage.getItem('vs_theme')")) {
      html = html.replace(/(<body[^>]*>)/, '$1\n' + THEME_FIX_SCRIPT);
    }
  }

  // ─── Inject resource hints if missing ──────────────────
  if (!html.includes('preconnect')) {
    const hints = [
      '<link rel="preconnect" href="https://fjnpzjjyhnpmunfoycrp.supabase.co" />',
      '<link rel="dns-prefetch" href="https://fjnpzjjyhnpmunfoycrp.supabase.co" />',
    ].join('\n  ');
    html = html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n  ' + hints);
  }
  // Add GTM + Stripe prefetch hints if missing (performance: eliminates DNS lookup latency)
  if (!html.includes('googletagmanager.com"')) {
    html = html.replace(
      /<link rel="preconnect" href="https:\/\/fjnpzjjyhnpmunfoycrp\.supabase\.co" \/>/,
      '<link rel="preconnect" href="https://fjnpzjjyhnpmunfoycrp.supabase.co" />\n  <link rel="preconnect" href="https://www.googletagmanager.com" crossorigin />\n  <link rel="dns-prefetch" href="https://www.googletagmanager.com" />\n  <link rel="dns-prefetch" href="https://www.google-analytics.com" />\n  <link rel="dns-prefetch" href="https://js.stripe.com" />'
    );
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Would update: ${rel}`);
  } else {
    writeFileSync(full, html, 'utf-8');
    console.log(`Updated: ${rel}`);
  }
  updated++;
}

console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
if (DRY_RUN) console.log('(Dry run — no files were modified)');
