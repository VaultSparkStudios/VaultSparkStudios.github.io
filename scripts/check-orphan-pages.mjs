#!/usr/bin/env node
/**
 * scripts/check-orphan-pages.mjs (S135)
 *
 * Finds HTML pages that exist on disk but aren't linked from anywhere
 * agents/visitors could discover them: sitewide nav, footer, sitemap.xml,
 * or homepage. This is the "tombstone class" of bug — a page ships, then
 * silently disappears from the public surface area.
 *
 * Companion to check-nav-orphans.mjs (which finds pages missing their
 * header/footer markers). This script finds pages that have nav but aren't
 * reachable.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SKIP_DIRS = new Set([
  'node_modules', 'playwright-report', 'test-results', '.git', '.well-known',
  'scripts', 'docs', 'context', 'logs', 'supabase', 'config', 'public', 'tests',
  'workers', 'cloudflare', '_og', 'data', 'site', 'build', 'dist', '.github',
  '.cache', 'coverage', 'assets',
  // S225: Lighthouse CI HTML report artifacts — not part of the public site.
  'lighthouse-results'
]);

const SKIP_FILES = new Set([
  '404.html', 'offline.html', 'sitemap.html',
  'franchise-architect/game.html',
  'franchise-architect/404.html'
]);

// Pages we accept as not-linked-from-nav (intentional: redirects, admin, deep
// links, sub-routes, premium-flow children, etc).
const EXEMPT_PATTERNS = [
  /^\/investor\//,                // legacy redirect alias
  /^\/admin\//,                   // any admin
  /\/admin\//,                    // sub-route admin
  /^\/vault-member\/admin\//,
  /^\/share\//,                   // share preview (noindex)
  /^\/vault-treasury\//,          // redirect alias
  /^\/products\//,                // legacy catalog (Task #5)
  /^\/investor-portal\/(documents|login|message|profile|updates|apply|admin)\//, // gated sub-routes
  /^\/security\/trusted-types\//,  // S158: noindex observability surface
  /\/\.ai\//,                       // S160 #14: AI-canonical fact sheets — linked from /.well-known/llms.txt, not nav
  /^\/obelisk-passport\//,          // S193: untracked Obelisk-passport WIP (not in git HEAD) — remove when it ships
  /^\/studio-hub\//,                // S275: private portal — robots-Disallowed + Worker 301 to hub subdomain; its only prior "reachability" was the sitemap contradiction removed at S275
  /^\/ignis-health\//,              // S275: private observability portal — robots-Disallowed, deliberately unlinked
  /^\/solara\//,                    // S193: standalone Vite game app (own UI, no VaultSpark shell nav) — like football-gm
  /^\/vault-member\/passport\//,    // S207: Vault Passport — noindex member card, reached via portal + share link only (own minimal nav)
  /^\/login\/?$/,                   // S207: Obelisk Passport login — auth utility page, own minimal layout
  /^\/login\.html$/,
  /^\/auth\/callback\/?$/,          // S207: OAuth callback landing — not nav-reachable by design
  /^\/auth\/callback\.html$/,
  /^\/leaderboards\/[^/]+\//,       // S225: SEO sub-pages (global/challenges/recruiters/etc) — linked
                                    // from leaderboards/index.html via anchor CTAs, not from sitewide nav
  /^\/news\//,                      // S305: THE DESK dark-run — noindex preview, deliberately unlinked
                                    // until the 2-week dark period ends; remove this exemption at launch
                                    // and add news/index.html to `sources` instead
];

function normalizeRel(full) {
  let r = relative(ROOT, full).replace(/\\/g, '/');
  if (r === 'index.html') return '/';
  if (r.endsWith('/index.html')) r = r.slice(0, -'index.html'.length);
  else if (r.endsWith('.html')) r = r.slice(0, -'.html'.length);
  let url = '/' + r;
  if (!url.endsWith('/')) url += '/';
  return url === '//' ? '/' : url;
}

const allPages = new Set();
function walk(d) {
  for (const entry of readdirSync(d)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(d, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (entry.endsWith('.html')) {
      const rel = relative(ROOT, full).replace(/\\/g, '/');
      if (SKIP_FILES.has(rel) || SKIP_FILES.has(entry)) continue;
      // Skip pages that are redirect shims.
      const html = readFileSync(full, 'utf-8');
      if (/<meta\s+http-equiv=["']refresh["']/i.test(html)) continue;
      allPages.add(normalizeRel(full));
    }
  }
}
walk(ROOT);

const linked = new Set();
function harvest(src) {
  const re = /(?:href|src)=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    let h = m[1].replace(/^https?:\/\/vaultsparkstudios\.com/, '').split('#')[0].split('?')[0];
    if (!h.startsWith('/')) continue;
    if (!h.endsWith('/') && !/\.[a-z0-9]+$/i.test(h)) h += '/';
    linked.add(h);
  }
  // sitemap loc tags
  const reLoc = /<loc>([^<]+)<\/loc>/g;
  while ((m = reLoc.exec(src))) {
    let h = m[1].replace(/^https?:\/\/vaultsparkstudios\.com/, '');
    if (!h.endsWith('/') && !/\.[a-z0-9]+$/i.test(h)) h += '/';
    linked.add(h);
  }
}

// Sources of "is this page linked from somewhere discoverable" — sitewide
// nav/footer + sitemap + homepage + section hub pages that fan out to articles.
const sources = [
  'scripts/propagate-nav.mjs',
  'sitemap.xml',
  'index.html',
  'sitemap-page/index.html',
  'journal/index.html',
  'journal/archive/index.html',
  'games/index.html',
  'projects/index.html',
  'universe/index.html',
  'changelog/index.html',
  'press/index.html',
];
for (const s of sources) {
  try { harvest(readFileSync(join(ROOT, s), 'utf-8')); } catch {}
}

const orphans = [...allPages]
  .filter((p) => !linked.has(p))
  .filter((p) => !EXEMPT_PATTERNS.some((re) => re.test(p)))
  .sort();

if (orphans.length === 0) {
  console.log('✓ Orphan-page check: every public HTML page is reachable from nav/footer/sitemap/home');
  process.exit(0);
}

console.error(`⚠ Orphan-page check found ${orphans.length} page(s) on disk but unreachable from nav/footer/sitemap/home:\n`);
for (const p of orphans) console.error('  ' + p);
console.error(`\nIf intentional, add to EXEMPT_PATTERNS in scripts/check-orphan-pages.mjs.`);
console.error(`If a real disappearance, add to header/footer (propagate-nav.mjs) and sitemap.xml.`);
process.exit(2); // non-zero but distinct from check-nav-orphans (exit 1)
