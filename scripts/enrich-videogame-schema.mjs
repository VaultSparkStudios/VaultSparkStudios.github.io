// scripts/enrich-videogame-schema.mjs
// Enriches VideoGame JSON-LD on game pages: adds applicationCategory,
// operatingSystem, image, and an honest availability offer to pages missing them.
// Usage: node scripts/enrich-videogame-schema.mjs [--check]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const CHECK = process.argv.includes('--check');

const FREE_WEB_OFFER = { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' };
const PREVIEW_OFFER = { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/PreOrder' };
const VAULTED_OFFER = { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/Discontinued' };

const GAME_PATCHES = {
  'call-of-doodie': {
    image: 'https://vaultsparkstudios.com/assets/og-cod.png',
  },
  'gridiron-gm': {
    image: 'https://vaultsparkstudios.com/assets/og-gridiron-gm.png',
  },
  'gridiron-gm-play': {
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    image: 'https://vaultsparkstudios.com/assets/og-gridiron-gm.png',
    offers: VAULTED_OFFER,
  },
  'mindframe': {
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    image: 'https://vaultsparkstudios.com/assets/og-mindframe.png',
    offers: PREVIEW_OFFER,
  },
  'project-unknown': {
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    image: 'https://vaultsparkstudios.com/assets/og-project-unknown.png',
    offers: PREVIEW_OFFER,
  },
  'solara': {
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    image: 'https://vaultsparkstudios.com/assets/og-solara.png',
  },
  'the-exodus': {
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    image: 'https://vaultsparkstudios.com/assets/og/og-games-the-exodus.png',
    offers: PREVIEW_OFFER,
  },
  'vaultfront': {
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    image: 'https://vaultsparkstudios.com/assets/og-vaultfront.png',
    offers: PREVIEW_OFFER,
  },
  'franchise-architect': {
    image: 'https://vaultsparkstudios.com/assets/og/og-franchise-architect.png',
  },
  // vaultspark-forge: SoftwareApplication → VideoGame upgrade
  'vaultspark-forge': {
    __upgrade: true,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    image: 'https://vaultsparkstudios.com/assets/og/og-games-vaultspark-forge.png',
    genre: ['Crafting', 'Building'],
    gamePlatform: 'Web Browser',
    offers: PREVIEW_OFFER,
  },
};

const GAMES_INDEX_PATCHES = {
  'Call of Doodie': {
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    offers: FREE_WEB_OFFER,
  },
  'Gridiron GM': {
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    offers: FREE_WEB_OFFER,
  },
  'Franchise Architect': {
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    offers: FREE_WEB_OFFER,
  },
};
let warnings = 0;
let patched = 0;
let upToDate = 0;

for (const [slug, patch] of Object.entries(GAME_PATCHES)) {
  const file = join(root, 'games', slug, 'index.html');
  if (!existsSync(file)) {
    console.warn(`SKIP ${slug}: file not found`);
    continue;
  }

  const html = readFileSync(file, 'utf8');

  // For __upgrade pages: prefer VideoGame (already upgraded); fall back to
  // SoftwareApplication (needs upgrade). For others: look for VideoGame only.
  const candidateTypes = patch.__upgrade ? ['VideoGame', 'SoftwareApplication'] : ['VideoGame'];
  const blockRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  let foundBlock = null;
  let foundJson = null;

  while ((match = blockRe.exec(html)) !== null) {
    try {
      const d = JSON.parse(match[1]);
      if (candidateTypes.includes(d['@type'])) {
        foundBlock = match[0];
        foundJson = d;
        break;
      }
    } catch {}
  }

  if (!foundJson) {
    console.warn(`WARN ${slug}: no target schema found — skipping`);
    warnings++;
    continue;
  }

  // Determine what needs updating
  const { __upgrade, ...fields } = patch;
  const typeNeedsUpgrade = __upgrade && foundJson['@type'] !== 'VideoGame';
  const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const needsUpdate = typeNeedsUpgrade || Object.entries(fields).some(([k, v]) => !deepEq(foundJson[k], v));

  if (!needsUpdate) {
    console.log(`OK   ${slug}: already up to date`);
    upToDate++;
    continue;
  }

  if (CHECK) {
    const missing = Object.keys(fields).filter(k => !foundJson[k]);
    console.error(`FAIL ${slug}: missing or wrong fields: ${missing.join(', ') || 'type upgrade needed'}`);
    warnings++;
    continue;
  }

  // Build updated schema
  const updated = { ...foundJson };
  if (__upgrade && updated['@type'] !== 'VideoGame') updated['@type'] = 'VideoGame';

  // Merge fields (preserve field order: type, name, desc, genre, platform, url, publisher, offers, then new fields)
  for (const [k, v] of Object.entries(fields)) {
    updated[k] = v;
  }

  // Reorder: put new fields after publisher but before any trailing keys
  const ordered = {};
  const PRIORITY_KEYS = ['@context','@type','name','description','genre','gamePlatform','url','publisher','offers','applicationCategory','operatingSystem','image','inLanguage','playMode'];
  for (const k of PRIORITY_KEYS) {
    if (k in updated) ordered[k] = updated[k];
  }
  for (const k of Object.keys(updated)) {
    if (!(k in ordered)) ordered[k] = updated[k];
  }

  const newBlock = `<script type="application/ld+json">\n${JSON.stringify(ordered, null, 2)}\n</script>`;
  const newHtml = html.replace(foundBlock, newBlock);

  if (newHtml === html) {
    console.warn(`WARN ${slug}: replacement produced no change — check pattern`);
    warnings++;
    continue;
  }

  writeFileSync(file, newHtml, 'utf8');
  const action = __upgrade ? 'upgraded SoftwareApplication→VideoGame' : 'enriched';
  console.log(`PATCHED ${slug}: ${action} (${Object.keys(fields).join(', ')})`);
  patched++;
}

const gamesIndex = join(root, 'games', 'index.html');
if (existsSync(gamesIndex)) {
  const html = readFileSync(gamesIndex, 'utf8');
  const blockRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  let nextHtml = html;
  while ((match = blockRe.exec(html)) !== null) {
    let parsed;
    try { parsed = JSON.parse(match[1]); } catch { continue; }
    if (!Array.isArray(parsed['@graph'])) continue;
    let changed = false;
    for (const node of parsed['@graph']) {
      if (!node || node['@type'] !== 'VideoGame') continue;
      const patch = GAMES_INDEX_PATCHES[node.name];
      if (!patch) continue;
      for (const [key, value] of Object.entries(patch)) {
        if (JSON.stringify(node[key]) !== JSON.stringify(value)) {
          node[key] = value;
          changed = true;
        }
      }
    }
    if (!changed) continue;
    if (CHECK) {
      console.error('FAIL games/index: VideoGame graph fields are missing or stale');
      warnings++;
      continue;
    }
    const newBlock = `<script type="application/ld+json">\n${JSON.stringify(parsed, null, 2)}\n</script>`;
    nextHtml = nextHtml.replace(match[0], newBlock);
    patched++;
  }
  if (!CHECK && nextHtml !== html) writeFileSync(gamesIndex, nextHtml, 'utf8');
}
console.log(`\nSummary: ${patched} patched, ${upToDate} up-to-date, ${warnings} warnings`);
if (CHECK && warnings > 0) {
  console.error('build:check FAIL — VideoGame schema gaps detected');
  process.exit(1);
}
