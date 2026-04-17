/**
 * update-og-images.mjs
 * One-shot script: rewrites all public-page og:image meta tags to point at the
 * dynamic og-image-worker at https://vaultsparkstudios.com/_og/.
 *
 * Extracts og:title from each file, derives eyebrow + status from path,
 * and URL-encodes the params into the new content value.
 *
 * Skip list: vault-member, investor-portal, studio-hub, share, open-source,
 * 404, offline, google-site-verification.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASE_URL = 'https://vaultsparkstudios.com/_og/';

const SKIP_DIRS = new Set([
  'vault-member', 'investor-portal', 'studio-hub', 'node_modules',
  '.git', '.github', 'share',
]);
const SKIP_FILES = new Set(['404.html', 'offline.html']);
const SKIP_PATH_CONTAINS = ['open-source', 'google-site-verification'];

// Path-based metadata derivation
function getMeta(rel) {
  const p = rel.replace(/\\/g, '/');

  // Game pages
  if (p.startsWith('games/') && p !== 'games/index.html') {
    const slug = p.split('/')[1];
    const statusMap = {
      'call-of-doodie': 'sparked',
      'vaultspark-football-gm': 'sparked',
      'gridiron-gm': 'forge',
      'mindframe': 'forge',
      'project-unknown': 'sealed',
      'solara': 'forge',
      'the-exodus': 'forge',
      'vaultfront': 'forge',
    };
    return { eyebrow: 'Game · VaultSpark Studios', status: statusMap[slug] || 'forge' };
  }
  if (p.startsWith('games/')) return { eyebrow: 'Games · VaultSpark Studios', status: 'sparked' };

  // Universe pages
  if (p.startsWith('universe/')) return { eyebrow: 'Universe · VaultSpark Studios', status: 'forge' };

  // Journal pages
  if (p.startsWith('journal/')) return { eyebrow: 'Journal · VaultSpark Studios', status: 'sparked' };

  // Leaderboard pages
  if (p.startsWith('leaderboards/') || p.startsWith('api/leaderboard')) {
    return { eyebrow: 'Leaderboard · VaultSpark Studios', status: 'sparked' };
  }

  // Membership / VaultSparked
  if (p.startsWith('membership/') || p.startsWith('vaultsparked/')) {
    return { eyebrow: 'Vault Membership · VaultSpark Studios', status: 'sparked' };
  }

  // Studio surfaces
  if (p.startsWith('studio-pulse/') || p.startsWith('ignis/') || p.startsWith('notebook/') || p.startsWith('signal-log/')) {
    return { eyebrow: 'Studio · VaultSpark Studios', status: 'sparked' };
  }

  // Social / Vault surfaces
  if (p.startsWith('vault-wall/') || p.startsWith('social/') || p.startsWith('invite/')) {
    return { eyebrow: 'Community · VaultSpark Studios', status: 'sparked' };
  }

  // Press / Studio about
  if (p.startsWith('press/') || p.startsWith('studio/')) {
    return { eyebrow: 'About · VaultSpark Studios', status: 'sparked' };
  }

  // Changelog
  if (p.startsWith('changelog/')) return { eyebrow: 'Changelog · VaultSpark Studios', status: 'sparked' };

  // Homepage
  if (p === 'index.html') return { eyebrow: 'Vault · SPARKED', status: 'sparked' };

  // Default
  return { eyebrow: 'VaultSpark Studios', status: 'sparked' };
}

function buildOgUrl(title, eyebrow, status) {
  const params = new URLSearchParams({ title, eyebrow, status });
  return BASE_URL + '?' + params.toString();
}

function extractOgTitle(html) {
  const m = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
  return m ? m[1] : null;
}

function* walkHtml(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      yield* walkHtml(full);
    } else if (entry.endsWith('.html')) {
      yield full;
    }
  }
}

let updated = 0;
let skipped = 0;
let noOg = 0;

for (const full of walkHtml(ROOT)) {
  const rel = relative(ROOT, full).replace(/\\/g, '/');

  // Skip rules
  if (SKIP_FILES.has(full.split(/[\\/]/).pop())) { skipped++; continue; }
  if (SKIP_PATH_CONTAINS.some(s => rel.includes(s))) { skipped++; continue; }

  const html = readFileSync(full, 'utf8');
  if (!html.includes('property="og:image"')) { noOg++; continue; }

  const title = extractOgTitle(html);
  if (!title) { skipped++; continue; }

  const { eyebrow, status } = getMeta(rel);
  const newUrl = buildOgUrl(title, eyebrow, status);

  const newHtml = html.replace(
    /(<meta\s+property="og:image"\s+content=")[^"]+(")/,
    `$1${newUrl}$2`
  );

  if (newHtml !== html) {
    writeFileSync(full, newHtml, 'utf8');
    console.log(`  ✓ ${rel}`);
    updated++;
  }
}

console.log(`\nDone: ${updated} updated · ${skipped} skipped · ${noOg} had no og:image`);
