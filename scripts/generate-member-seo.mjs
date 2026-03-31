#!/usr/bin/env node
/**
 * generate-member-seo.mjs
 *
 * Fetches all vault_members from Supabase and generates a static,
 * SEO-optimised HTML page per member at /member/{slug}/index.html.
 * Also writes member-sitemap.xml with every profile URL.
 *
 * Run:  node scripts/generate-member-seo.mjs
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');
const MEMBER = join(ROOT, 'member');
const BASE   = 'https://vaultsparkstudios.com';

const SUPABASE_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';

/* ── Rank tiers ─────────────────────────────────────────────── */

const RANKS = [
  { min: 5000, name: 'The Sparked',   color: '#E040FB', bg: 'rgba(224,64,251,0.12)', border: 'rgba(224,64,251,0.35)' },
  { min: 1500, name: 'Vault Keeper',  color: '#FFC400', bg: 'rgba(255,196,0,0.12)',   border: 'rgba(255,196,0,0.35)' },
  { min: 500,  name: 'Forge Guard',   color: '#FF6D00', bg: 'rgba(255,109,0,0.12)',   border: 'rgba(255,109,0,0.35)' },
  { min: 100,  name: 'Vault Runner',  color: '#1FA2FF', bg: 'rgba(31,162,255,0.12)',  border: 'rgba(31,162,255,0.35)' },
  { min: 0,    name: 'Spark Initiate',color: '#90A4AE', bg: 'rgba(144,164,174,0.12)', border: 'rgba(144,164,174,0.35)' },
];

function getRank(pts) {
  return RANKS.find(r => pts >= r.min) || RANKS[RANKS.length - 1];
}

/* ── Slug helper ────────────────────────────────────────────── */

function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ── Fetch members ──────────────────────────────────────────── */

async function fetchMembers() {
  const url = `${SUPABASE_URL}/vault_members?select=username,points,member_number,created_at&order=points.desc`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

/* ── HTML template ──────────────────────────────────────────── */

function formatDate(iso) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildPage(member) {
  const { username, points, member_number, created_at } = member;
  const rank  = getRank(points);
  const slug  = toSlug(username);
  const url   = `${BASE}/member/${slug}/`;
  const safe  = escHtml(username);
  const initial = safe.charAt(0).toUpperCase();
  const isFounding = member_number != null && member_number <= 100;
  const joinDate   = formatDate(created_at);

  const title = `${safe} - ${rank.name} | VaultSpark Studios`;
  const desc  = `${safe} is a ${rank.name} in the VaultSpark Vault with ${points.toLocaleString()} points. View their profile, achievements, and activity.`;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: username,
    url,
    jobTitle: rank.name,
    memberOf: {
      '@type': 'Organization',
      name: 'VaultSpark Studios',
      url: BASE + '/',
    },
    dateJoined: created_at || undefined,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${escHtml(desc)}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow" />

  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${escHtml(desc)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${BASE}/assets/og-members.png" />
  <meta property="og:site_name" content="VaultSpark Studios" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@VaultSparkStudios" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${escHtml(desc)}" />
  <meta name="twitter:image" content="${BASE}/assets/og-members.png" />

  <script type="application/ld+json">${jsonLd}</script>

  <link rel="icon" type="image/png" href="/assets/icon-32.png" />
  <link rel="stylesheet" href="/assets/style.css" />

  <!-- Security headers -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://fjnpzjjyhnpmunfoycrp.supabase.co https://cdn.jsdelivr.net https://www.googletagmanager.com https://browser.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://fjnpzjjyhnpmunfoycrp.supabase.co https://api.github.com https://www.google-analytics.com https://o4511104924909568.ingest.us.sentry.io; font-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" />
  <meta http-equiv="X-Content-Type-Options" content="nosniff" />
  <meta http-equiv="X-Frame-Options" content="SAMEORIGIN" />
  <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
  <meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin" />
  <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), interest-cohort=()" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />

  <style>
    .seo-profile{padding:5rem 0 3rem;min-height:60vh}
    .seo-card{background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:2.5rem;max-width:520px;margin:0 auto;text-align:center}
    .seo-avatar{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;margin:0 auto 1rem;color:#fff;background:${rank.bg};border:2px solid ${rank.border}}
    .seo-name{font-family:Georgia,"Times New Roman",serif;font-size:1.8rem;font-weight:400;margin:0 0 .4rem;color:var(--text)}
    .seo-rank{display:inline-block;font-size:.82rem;font-weight:700;padding:.3rem .85rem;border-radius:999px;background:${rank.bg};color:${rank.color};border:1px solid ${rank.border}}
    .seo-stats{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin:1.5rem 0}
    .seo-stat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:.85rem;text-align:center}
    .seo-stat small{display:block;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);margin-bottom:.3rem}
    .seo-stat strong{font-size:1.3rem;font-weight:800}
    .seo-founding{display:inline-flex;align-items:center;gap:.3rem;font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:.25rem .7rem;border-radius:999px;background:rgba(255,196,0,.12);color:var(--gold,#FFC400);border:1px solid rgba(255,196,0,.3);margin-top:.5rem}
    .seo-cta{display:inline-block;margin-top:1.5rem;padding:.75rem 1.8rem;border-radius:10px;background:var(--blue,#1FA2FF);color:#fff;font-weight:700;text-decoration:none;font-size:.95rem}
    .seo-cta:hover{opacity:.85}
    .seo-back{display:block;margin-top:1rem;font-size:.85rem;color:var(--dim);text-decoration:none}
    .seo-back:hover{color:var(--text)}
  </style>

  <script>
    // Redirect browsers to the full interactive profile
    if (typeof window !== 'undefined' && !navigator.userAgent.match(/bot|crawl|spider|slurp|googlebot|bingbot|yandex/i)) {
      window.location.replace('/member/?u=${encodeURIComponent(username)}');
    }
  </script>
</head>
<body>
<a href="#main-content" class="skip-link">Skip to main content</a>

  <header class="site-header">
    <div class="container nav">
      <a class="brand" href="/" aria-label="VaultSpark Studios - home">
        <img loading="lazy" src="/assets/vaultspark-icon.webp" alt="VaultSpark Studios icon" width="44" height="44" />
        <span>VaultSpark Studios<small>The vault is sparked</small></span>
      </a>
      <nav class="nav-center" id="nav-menu" aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/games/">Games</a>
        <a href="/members/">Members</a>
        <a href="/community/">Community</a>
        <div class="mobile-nav-footer">
          <a class="mobile-nav-signin" href="/vault-member/#login">Sign In</a>
          <a class="mobile-nav-join" href="/vault-member/#register">Join The Vault</a>
          <a class="mobile-nav-github" href="https://github.com/VaultSparkStudios" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </nav>
      <div class="nav-right">
        <a class="nav-signin" href="/vault-member/#login">Sign In</a>
        <a class="button button-sm" href="/vault-member/#register">Join The Vault</a>
        <button type="button" class="hamburger" id="hamburger" aria-expanded="false" aria-controls="nav-menu" aria-label="Toggle navigation">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>

  <main id="main-content">
    <section class="seo-profile">
      <div class="container">
        <div class="seo-card">
          <div class="seo-avatar" aria-hidden="true">${initial}</div>
          <h1 class="seo-name">${safe}</h1>
          <span class="seo-rank">${rank.name}</span>
          ${isFounding ? '<div><span class="seo-founding">&#9733; Founding Member</span></div>' : ''}
          <div class="seo-stats">
            <div class="seo-stat"><small>Points</small><strong>${points.toLocaleString()}</strong></div>
            <div class="seo-stat"><small>Joined</small><strong>${joinDate}</strong></div>
          </div>
          <a class="seo-cta" href="/member/?u=${encodeURIComponent(username)}">View Full Profile</a>
          <a class="seo-back" href="/members/">&larr; Members Directory</a>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer" aria-label="Site footer">
    <div class="container">
      <div class="footer-inner">
        <div class="footer-brand">
          <strong>VaultSpark Studios</strong>
          <p>Independent game studio forging cinematic worlds, sports simulations, and playable experiments. The vault is sparked.</p>
        </div>
        <div class="footer-col">
          <h4>Games</h4>
          <a href="/games/">All Games</a>
          <a href="/games/call-of-doodie/">Call Of Doodie</a>
          <a href="/games/gridiron-gm/">Gridiron GM</a>
        </div>
        <div class="footer-col">
          <h4>Studio</h4>
          <a href="/studio/">About VaultSpark</a>
          <a href="/roadmap/">Vault Pipeline</a>
          <a href="/journal/">Signal Log</a>
          <a href="/vault-member/">Vault Membership</a>
        </div>
        <div class="footer-col">
          <h4>Community</h4>
          <a href="/leaderboards/">Leaderboard</a>
          <a href="/members/">Members</a>
          <a href="/community/">Community Hub</a>
          <a href="https://discord.gg/bgR3mSB2" target="_blank" rel="noreferrer">Discord</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 VaultSpark Studios. All rights reserved.</span>
        <span><a href="/privacy/">Privacy Policy</a> &middot; <a href="/terms/">Terms of Service</a> &middot; <a href="/contact/">Contact</a></span>
      </div>
    </div>
  </footer>
  <script src="/assets/nav-toggle.js" defer></script>
</body>
</html>`;
}

/* ── Sitemap ────────────────────────────────────────────────── */

function buildSitemap(slugs) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = slugs.map(s =>
    `  <url>\n    <loc>${BASE}/member/${s}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

/* ── Main ───────────────────────────────────────────────────── */

async function main() {
  console.log('Fetching vault members...');
  const members = await fetchMembers();
  console.log(`Fetched ${members.length} members`);

  // Clean previously-generated directories (skip the main member/index.html)
  const generated = [];
  const seen = new Set();

  for (const m of members) {
    if (!m.username || !m.username.trim()) {
      console.warn('Skipping member with empty username');
      continue;
    }

    const slug = toSlug(m.username);
    if (!slug) {
      console.warn(`Skipping invalid slug for "${m.username}"`);
      continue;
    }
    if (seen.has(slug)) {
      console.warn(`Duplicate slug "${slug}" — skipping`);
      continue;
    }
    seen.add(slug);

    const dir  = join(MEMBER, slug);
    const file = join(dir, 'index.html');

    mkdirSync(dir, { recursive: true });
    const html = buildPage(m);
    writeFileSync(file, html, 'utf8');
    generated.push(slug);
  }

  // Write member-sitemap.xml
  const sitemapPath = join(ROOT, 'member-sitemap.xml');
  writeFileSync(sitemapPath, buildSitemap(generated), 'utf8');

  console.log(`Generated ${generated.length} member profile pages`);
  console.log(`Wrote ${sitemapPath}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});



