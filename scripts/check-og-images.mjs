#!/usr/bin/env node
/* check-og-images.mjs — S194 social-card integrity gate.

   The failure this closes: the /_og/ Worker returns image/svg+xml, and SVG
   og:image renders BLANK on Facebook, X/Twitter, LinkedIn, Discord, Slack and
   iMessage (they reject SVG — it can carry script). For 193 sessions 73 pages
   served a primary share-card no social platform would display, masked by a
   source comment that falsely claimed "social platforms rasterize SVG fine."

   This gate makes that regression impossible:
     • og:image / twitter:image pointing at an SVG (incl the /_og/ endpoint) → ERROR
     • og:image / twitter:image pointing at a missing local asset            → ERROR
     • page with no og:image at all                                          → WARN

   A share card that doesn't render is a silent conversion leak on a
   traffic-starved site; this keeps every crawler-facing image a real raster.

   Import-safe: side effects run only when invoked directly.
   Usage:
     node scripts/check-og-images.mjs            # scan tracked HTML pages
     node scripts/check-og-images.mjs --self-test
*/
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from './lib/safe-spawn.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// S238: intentionally-dark allowlist. A page with no og:image that matches here is a
// deliberate decision (auth flow, agent surface, gated portal, internal dashboard, error
// page) — silent. A no-og page that matches NOTHING here is UNTRIAGED and errors the gate,
// forcing an explicit choice: ship a bespoke card (build-og-cards PUBLIC_NO_OG) or record
// it dark below. This converts the old ambient "N no-og:image" warn — noise nobody
// escalated for 40+ sessions — into a precise signal where any new card-less public page
// surfaces as fresh work instead of vanishing into the count.
export const OG_DARK_PATTERNS = [
  { re: /\/\.ai\/index\.html$/, why: 'agent-facing .ai surface — machine-read, never socially shared' },
  { re: /^investor-portal\//, why: 'gated investor portal — private, not crawled or shared' },
];
export const OG_DARK_PATHS = new Map([
  ['404.html', 'error page'],
  ['solara/404.html', 'error page'],
  ['offline.html', 'offline fallback'],
  ['login.html', 'auth flow'],
  ['auth/callback.html', 'oauth callback'],
  ['obelisk-passport/login.html', 'auth flow'],
  ['obelisk-passport/callback.html', 'oauth callback'],
  ['sitemap.html', 'utility index'],
  ['search/index.html', 'utility search'],
  ['share/index.html', 'share-utility endpoint'],
  ['nervous-system/index.html', 'internal telemetry dashboard'],
  ['ignis-health/index.html', 'internal health dashboard'],
  ['ignis/roi/index.html', 'internal ROI dashboard'],
  ['vault-treasury/index.html', 'internal treasury surface'],
  ['vault-member/admin/ignis-spend/index.html', 'gated admin surface'],
  ['studio-hub/index.html', 'internal studio hub'],
  ['feedback/insights/index.html', 'internal insights dashboard'],
  ['brand/system/index.html', 'internal brand/style guide'],
  ['security/trusted-types/index.html', 'technical security doc'],
  ['solara/sun-widget.html', 'embeddable widget fragment'],
]);
export function isOgDark(rel) {
  const p = String(rel).replace(/\\/g, '/');
  if (OG_DARK_PATHS.has(p)) return true;
  return OG_DARK_PATTERNS.some((x) => x.re.test(p));
}

// Extract the content URL of a given OG/Twitter meta image property.
export function metaImage(html, key) {
  // og:image uses property=, twitter:image uses name= — accept either.
  const re = new RegExp(`<meta (?:property|name)="${key.replace(/[:]/g, '\\:')}" content="([^"]*)"`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

// Classify a single image URL against the rules. Returns {level, msg} or null.
export function classifyImage(url, label, assetExists) {
  if (!url) return null;
  // SVG anywhere — including the dynamic /_og/ endpoint which serves image/svg+xml.
  if (/\.svg(\?|$)/i.test(url) || /\/_og\//.test(url)) {
    return { level: 'error', msg: `${label} is an SVG/_og endpoint (${url}) — renders BLANK on FB/X/LinkedIn/Discord/Slack. Use a PNG/JPG.` };
  }
  // Local asset must exist. Absolute prod URLs to /assets/ map to a repo file.
  const m = url.match(/^https:\/\/vaultsparkstudios\.com(\/assets\/[^"?]+)/) || url.match(/^(\/assets\/[^"?]+)/);
  if (m) {
    const rel = m[1].replace(/^\//, '');
    if (!assetExists(rel)) return { level: 'error', msg: `${label} → ${url} but ${rel} is missing` };
  }
  return null;
}

export function scanPage(html, assetExists) {
  const findings = [];
  const og = metaImage(html, 'og:image');
  const tw = metaImage(html, 'twitter:image');
  if (!og) findings.push({ level: 'warn', msg: 'no og:image meta — link shares render with no card' });
  for (const [url, label] of [[og, 'og:image'], [tw, 'twitter:image']]) {
    const r = classifyImage(url, label, assetExists);
    if (r) findings.push(r);
  }
  return findings;
}

// S210 #6: cross-page OG uniqueness check.
// Returns ERRORs for: (a) og:image URL shared across >1 non-root content page,
// (b) any non-root-index.html page using the generic assets/og-image.png fallback.
// Exclusions: 404.html files (game/section 404s legitimately reuse the section cover);
//   path alias pairs like member/ + members/ (same content, two entry points).
export function checkOgUniqueness(pageImages) {
  // Normalise path separators and exclude 404 pages from uniqueness tracking.
  const norm = (p) => p.replace(/\\/g, '/');
  const filtered = pageImages.filter(({ file }) => !norm(file).endsWith('404.html'));

  const urlToPages = new Map();
  for (const { file, url } of filtered) {
    if (!url) continue;
    if (!urlToPages.has(url)) urlToPages.set(url, []);
    urlToPages.get(url).push(norm(file));
  }

  // Alias pairs: if two files share a URL and one is the plural/alias of the other,
  // allow it (e.g. member/index.html + members/index.html).
  function isAliasPair(pages) {
    if (pages.length !== 2) return false;
    const [a, b] = pages.map((p) => p.replace(/\/index\.html$/, '').replace(/\\/g, '/'));
    return a + 's' === b || b + 's' === a || a.replace(/s$/, '') === b.replace(/s$/, '');
  }

  const errors = [];
  for (const [url, pages] of urlToPages) {
    const isGeneric = /\bog-image\.png$/.test(url);
    const nonRoot = pages.filter((p) => p !== 'index.html');
    if (isGeneric && nonRoot.length) {
      errors.push({ level: 'error', msg: `Generic og-image.png used on non-root page(s): ${nonRoot.join(', ')} — each page needs a bespoke OG card` });
    }
    // Warn on the same non-generic URL shared across more than 1 page.
    // Exceptions: root index.html + one other; alias pairs (member/members).
    // WARN not ERROR — shared OGs reduce social card quality but don't render blank.
    if (!isGeneric && pages.length > 1) {
      const hasRoot = pages.includes('index.html');
      if (!hasRoot && !isAliasPair(pages)) {
        errors.push({ level: 'warn', msg: `og:image ${url} shared by ${pages.length} pages (${pages.slice(0, 3).join(', ')}${pages.length > 3 ? '…' : ''}) — each page should have a unique social card` });
      }
    }
  }
  return errors;
}

function runSelfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };
  const exists = (rel) => rel === 'assets/og-cod.png'; // only this one "exists" in the fixture

  // SVG og:image → error
  let f = scanPage('<meta property="og:image" content="https://vaultsparkstudios.com/_og/?title=X" />', exists);
  assert(f.some((x) => x.level === 'error' && /BLANK/.test(x.msg)), 'flags /_og SVG og:image as error');

  // explicit .svg → error
  f = classifyImage('https://vaultsparkstudios.com/assets/card.svg', 'og:image', exists);
  assert(f && f.level === 'error', 'flags explicit .svg as error');

  // valid PNG that exists → clean
  f = classifyImage('https://vaultsparkstudios.com/assets/og-cod.png', 'og:image', exists);
  assert(f === null, 'valid existing PNG passes');

  // PNG that does not exist → error
  f = classifyImage('https://vaultsparkstudios.com/assets/og-missing.png', 'og:image', exists);
  assert(f && f.level === 'error' && /missing/.test(f.msg), 'flags missing asset');

  // no og:image → warn
  f = scanPage('<meta name="twitter:image" content="https://vaultsparkstudios.com/assets/og-cod.png" />', exists);
  assert(f.some((x) => x.level === 'warn'), 'warns when og:image absent');

  // clean page (both point at existing png) → no error
  f = scanPage('<meta property="og:image" content="https://vaultsparkstudios.com/assets/og-cod.png" /><meta name="twitter:image" content="https://vaultsparkstudios.com/assets/og-cod.png" />', exists);
  assert(!f.some((x) => x.level === 'error'), 'clean page has no errors');

  // S210 #6: uniqueness — generic og-image.png on a project page → error
  let u = checkOgUniqueness([
    { file: 'index.html', url: '/assets/og-image.png' },
    { file: 'games/voidfall/index.html', url: '/assets/og-image.png' },
  ]);
  assert(u.some((x) => x.level === 'error' && /Generic/.test(x.msg)), 'flags generic og-image.png on games/ page');

  // uniqueness — same URL on 3 project pages → warn (not error; doesn't render blank)
  u = checkOgUniqueness([
    { file: 'projects/a/index.html', url: '/assets/og-project-a.png' },
    { file: 'projects/b/index.html', url: '/assets/og-project-a.png' },
    { file: 'projects/c/index.html', url: '/assets/og-project-a.png' },
  ]);
  assert(u.some((x) => x.level === 'warn' && /shared/.test(x.msg)), 'warns URL shared across 3 project pages');

  // uniqueness — unique URLs → no error
  u = checkOgUniqueness([
    { file: 'index.html', url: '/assets/og-home.png' },
    { file: 'games/voidfall/index.html', url: '/assets/og-voidfall.png' },
    { file: 'games/cod/index.html', url: '/assets/og-cod.png' },
  ]);
  assert(u.length === 0, 'unique URLs per page passes');

  // S238: intentionally-dark classification
  assert(isOgDark('login.html'), 'exact dark path matched');
  assert(isOgDark('investor-portal/profile/index.html'), 'investor-portal pattern matched');
  assert(isOgDark('projects/vorn/.ai/index.html'), '.ai agent surface pattern matched');
  assert(isOgDark('games\\mindframe\\.ai\\index.html'), 'windows-separator .ai matched');
  assert(!isOgDark('pathways/builders/index.html'), 'public page is NOT dark (must carry a card)');
  assert(!isOgDark('some/new/public/index.html'), 'unknown public page is untriaged, not dark');

  const total = 15;
  if (fail === 0) { console.log(`✓ check-og-images --self-test: ${total}/${total} passed`); return 0; }
  console.error('✗ check-og-images --self-test: ' + fail + ' failed'); return 1;
}

function runScan() {
  const files = execSync('git ls-files "*.html"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !f.startsWith('docs/'));
  const assetExists = (rel) => existsSync(join(ROOT, rel));
  let errors = 0, warns = 0, dark = 0;
  const untriaged = [];
  const pageImages = [];
  for (const f of files) {
    const html = readFileSync(join(ROOT, f), 'utf8');
    const findings = scanPage(html, assetExists);
    for (const x of findings) {
      // The "no og:image" warn is classified below with path context (dark vs untriaged).
      if (/^no og:image/.test(x.msg)) continue;
      if (x.level === 'error') { console.error(`✗ ${f}: ${x.msg}`); errors++; }
      else { warns++; }
    }
    const og = metaImage(html, 'og:image');
    if (!og) {
      if (isOgDark(f)) dark++;
      else untriaged.push(f);
    }
    pageImages.push({ file: f, url: og });
  }
  // S210 #6: cross-page uniqueness check (ERRORs block; WARNs inform).
  const uniqueErrors = checkOgUniqueness(pageImages);
  for (const x of uniqueErrors) {
    if (x.level === 'error') { console.error(`✗ ${x.msg}`); errors++; }
    else { console.warn(`⚠ ${x.msg}`); warns++; }
  }
  // S238: a public page with no card and no dark-allowlist entry is untriaged — block it.
  for (const f of untriaged) {
    console.error(`✗ ${f}: no og:image and not on the intentionally-dark allowlist — ship a bespoke card (build-og-cards PUBLIC_NO_OG) or record it dark (OG_DARK_PATHS in check-og-images.mjs)`);
    errors++;
  }
  if (errors) {
    console.error(`✗ check-og-images: ${errors} issue(s) — fix before push`);
    return 1;
  }
  console.log(`✓ check-og-images: ${files.length} page(s) scanned · all share-card images are real rasters · ${dark} intentionally dark · 0 untriaged` + (warns ? ` (${warns} advisory warning)` : ''));
  return 0;
}

export function runProofCommand(args = []) {
  try {
    return args.includes('--self-test') ? runSelfTest() : runScan();
  } catch (error) {
    console.error(`check-og-images: ${error.message}`);
    return 1;
  }
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-og-images.mjs');
if (invokedDirectly) {
  process.exitCode = runProofCommand(process.argv.slice(2));
}
