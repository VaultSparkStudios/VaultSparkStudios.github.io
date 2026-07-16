#!/usr/bin/env node
/* check-nav-catalog-sync.mjs — S210 #8 nav-dropdown catalog derivation gate
 *
 * The fix this closes: propagate-nav.mjs hardcoded Games + Projects dropdown HTML
 * drifted twice (S208, S209). S210 refactored to NAV_GAMES + NAV_PROJECTS data
 * arrays. This gate warns when a SPARKED catalog entry is absent from those arrays.
 *
 * Strategy: advisory WARN on missing entries (catalog IDs may not match nav slugs
 * 1:1 for all games); ERROR only if propagate-nav.mjs parse fails.
 *
 * Implementation: parse href strings from propagate-nav.mjs source (no import —
 * the script has module-level side effects). Only SPARKED entries are checked since
 * those are the ones visitors expect to find in the nav.
 *
 * Import-safe: side effects only when invoked directly.
 * Usage:
 *   node scripts/check-nav-catalog-sync.mjs            # advisory
 *   node scripts/check-nav-catalog-sync.mjs --self-test
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAV_SRC = join(ROOT, 'scripts', 'propagate-nav.mjs');
const CATALOG_PATH = join(ROOT, 'api', 'public-intelligence.json');
const RUN_DIRECT = process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('check-nav-catalog-sync.mjs');

// Extract all href strings from the NAV_GAMES or NAV_PROJECTS blocks in the source.
export function parseNavHrefs(src) {
  // Match { href: '/games/...' } or { href: '/projects/...' } patterns in the source.
  const re = /href:\s*'([^']+)'/g;
  const hrefs = new Set();
  let m;
  while ((m = re.exec(src)) !== null) hrefs.add(m[1]);
  return hrefs;
}

function loadCatalog() {
  try {
    const d = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
    return Object.values(d.catalog || {});
  } catch (_) { return []; }
}

function selfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };
  const fakeSrc = `
    const NAV_GAMES = [{ status: 'SPARKED', entries: [{ href: '/games/alpha/', label: 'Alpha' }] }];
    const NAV_PROJECTS = [{ status: 'SPARKED', entries: [{ href: '/projects/beta/', label: 'Beta' }] }];
  `;
  const hrefs = parseNavHrefs(fakeSrc);
  assert(hrefs.has('/games/alpha/'), 'extracts games href');
  assert(hrefs.has('/projects/beta/'), 'extracts projects href');
  assert(!hrefs.has('/games/missing/'), 'absent href not present');
  assert(hrefs.size === 2, 'size matches entry count');
  if (fail === 0) { console.log('✓ check-nav-catalog-sync --self-test: 4/4 passed'); process.exit(0); }
  console.error('✗ check-nav-catalog-sync --self-test: ' + fail + ' failed'); process.exit(1);
}

function run() {
  let src;
  try {
    src = readFileSync(NAV_SRC, 'utf8');
  } catch (e) {
    console.error('✗ check-nav-catalog-sync: cannot read propagate-nav.mjs — ' + e.message);
    process.exit(1);
  }

  const navHrefs = parseNavHrefs(src);

  const catalog = loadCatalog();
  if (!catalog.length) {
    console.warn('  ⚠ check-nav-catalog-sync: catalog empty — skipping drift check (run npm run build first)');
    return;
  }

  const SITE = 'https://vaultsparkstudios.com';
  // Derive the internal slug from deployedUrl when available (catalog ID may differ).
  function internalSlug(entry) {
    const url = entry.deployedUrl || '';
    if (!url.startsWith(SITE) && !url.startsWith('/')) return null; // external — skip
    return url.replace(SITE, '').replace(/\/?$/, '/'); // normalize to /slug/
  }

  let warns = 0;
  const sparked = catalog.filter((e) => e.status === 'SPARKED');
  for (const entry of sparked) {
    const slug = internalSlug(entry);
    if (!slug) continue; // external-URL projects legitimately absent from nav

    // Accept match from deployedUrl slug OR catalog-ID-derived paths.
    // Also try /games/<slug> and /projects/<slug> since deployedUrls sometimes
    // use the root path (e.g. /franchise-architect/) while nav uses /games/...
    const slugBase = slug.replace(/^\/|\/$/g, ''); // "franchise-architect"
    const candidates = [
      slug,
      `/games/${entry.id}/`,
      `/projects/${entry.id}/`,
      `/games/${slugBase}/`,
      `/projects/${slugBase}/`,
    ];
    if (!candidates.some((h) => navHrefs.has(h))) {
      console.warn(`  ⚠ SPARKED catalog entry "${entry.id}" (${entry.name}) → ${slug} missing from nav arrays — add to NAV_GAMES or NAV_PROJECTS in propagate-nav.mjs`);
      warns++;
    }
  }

  if (warns === 0) {
    console.log('✓ check-nav-catalog-sync: NAV_GAMES + NAV_PROJECTS cover all SPARKED catalog entries');
  } else {
    console.warn(`  ⚠ check-nav-catalog-sync: ${warns} SPARKED catalog entry/entries absent from nav (advisory — update propagate-nav.mjs)`);
  }
}

if (RUN_DIRECT) {
  if (process.argv.includes('--self-test')) selfTest();
  else run();
}
