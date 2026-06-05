#!/usr/bin/env node
/**
 * scripts/migrate-products-to-redirects.mjs (S135)
 *
 * Task #5 — Replace each /products/<slug>/index.html with a redirect to the
 * canonical /projects/<slug>/, /games/<slug>/, /universe/<slug>/, or /studio/.
 * Eliminates 29-page SEO duplicate-content catalog while preserving any link
 * equity from existing inbound links.
 *
 * Redirect pattern matches /investor/index.html: meta-refresh + canonical
 * pointer + noindex during transition.
 *
 * Run: node scripts/migrate-products-to-redirects.mjs --apply
 * Default (no --apply): dry-run prints the mapping.
 */
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PRODUCTS_DIR = join(ROOT, 'products');
const apply = process.argv.includes('--apply');

// slug → canonical destination URL.
// External URLs (https://…) are for products that live on their own apex
// domain — the studio site no longer hosts the canonical experience.
const MAP = {
  // Games — external canonical for SPARKED products with their own domains
  'call-of-doodie':                       'https://callofdoodie.wtf/',
  'gridiron-gm':                          '/games/gridiron-gm/',
  'gridiron-gm-play':                     '/games/gridiron-gm/',
  'mindframe':                            '/games/mindframe/',
  'solara':                               '/games/solara/',
  'the-exodus':                           '/games/the-exodus/',
  'vaultfront':                           '/games/vaultfront/',
  'vaultspark-football-gm':               '/games/vaultspark-football-gm/',
  // Projects (public) — external canonical for Vorn (apex on joinvorn.com)
  'canon':                                '/projects/canon/',
  'ideaforge':                            '/projects/ideaforge/',
  'promogrind':                           '/projects/promogrind/',
  'seamline':                             '/projects/seamline/',
  'statvault':                            '/projects/statvault/',
  'velaxis':                              '/projects/velaxis/',
  'vorn':                                 'https://joinvorn.com/',
  'living-protocol':                      '/projects/the-living-protocol/',
  // Universe / lore
  'voidfall':                             '/universe/voidfall/',
  'voidfall-companion':                   '/universe/voidfall/',
  // Internal infrastructure / tools — no public canonical, route to /studio/
  'orva-eon':                             '/studio/',
  'scriptorium':                          '/studio/',
  'sparkfunnel':                          '/studio/',
  'studio-ops':                           '/studio/',
  'vaultspark-forge':                     '/studio/',
  'vaultspark-studio-hub':                '/studio/',
  'vaultspark-studios-social-dashboard':  '/studio/',
  'vaultsparkstudios-website':            '/',
  // IGNIS — has a public page
  'vaultspark-ignis':                     '/ignis/',
};

function redirectHtml(destUrl, slug) {
  const isExternal = /^https?:\/\//i.test(destUrl);
  const canonical  = isExternal ? destUrl : `https://vaultsparkstudios.com${destUrl}`;
  const niceDest   = destUrl === '/' ? 'VaultSpark Studios home' : destUrl;
  const externalAttrs = isExternal ? ' rel="noreferrer"' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="refresh" content="0; url=${destUrl}" />
  <meta name="vs-redirect" content="${destUrl}" />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${canonical}" />
  <title>Redirecting to ${niceDest}</title>
  <meta http-equiv="X-Content-Type-Options" content="nosniff" />
  <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
  <meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin" />
  <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), interest-cohort=()" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <script src="/assets/redirect-page.js"></script>
</head>
<body>
  <p>Redirecting to <a href="${destUrl}"${externalAttrs}>${niceDest}</a>…</p>
  <script src="/assets/native-feel.js" defer></script>
</body>
</html>
`;
}

if (!existsSync(PRODUCTS_DIR)) {
  console.log('No /products/ directory present — nothing to migrate.');
  process.exit(0);
}

const slugs = readdirSync(PRODUCTS_DIR).filter((e) => {
  try { return statSync(join(PRODUCTS_DIR, e)).isDirectory(); } catch { return false; }
});

const unmapped = slugs.filter((s) => !MAP[s]);
if (unmapped.length) {
  console.error('Unmapped product slugs (add to MAP before applying):');
  for (const s of unmapped) console.error('  ' + s);
  process.exit(1);
}

console.log(`Migrating ${slugs.length} /products/<slug>/ entries to 301 redirects (mode: ${apply ? 'APPLY' : 'dry-run'})\n`);

let written = 0;
for (const slug of slugs) {
  const dest = MAP[slug];
  const filePath = join(PRODUCTS_DIR, slug, 'index.html');
  console.log(`  /products/${slug}/  →  ${dest}`);
  if (apply) {
    writeFileSync(filePath, redirectHtml(dest, slug), 'utf-8');
    written++;
  }
}

// Also rewrite /products/index.html (the catalog landing) to redirect to /projects/.
const productsIndex = join(PRODUCTS_DIR, 'index.html');
if (existsSync(productsIndex)) {
  console.log(`\n  /products/  →  /projects/`);
  if (apply) {
    writeFileSync(productsIndex, redirectHtml('/projects/', 'index'), 'utf-8');
    written++;
  }
}

console.log(`\n${apply ? `Applied: ${written} file(s) replaced with redirects.` : 'Dry-run only. Pass --apply to write.'}`);
