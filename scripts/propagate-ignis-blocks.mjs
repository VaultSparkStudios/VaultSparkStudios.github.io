#!/usr/bin/env node
// S134 — propagate IGNIS project blocks + fix migrated URLs + sync project truth.
// One-pass updater for every project/game landing page.
//
// For each page in PAGE_TO_PROJECT:
//   1. Replaces migrated CTAs (app-dun-six-76.vercel.app, etc.) with canonical liveUrl from registry.
//   2. Replaces dead internal CTAs (/vaultfront/, /velaxis/, /vorn/) with canonical liveUrl.
//   3. Ensures CSS + JS for the IGNIS block are loaded.
//   4. Injects/refreshes <div class="ignis-project-block" data-project="..." data-voice="..."></div>
//      into a designated <!-- IGNIS-BLOCK-SLOT --> marker, or before the side-panel.
//
// Idempotent. Run any time the registry, voices JSON, or canonical URLs change.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const devRoot = process.env.STUDIO_DEV_ROOT || path.resolve(repoRoot, '..');
const opsRoot = path.join(devRoot, 'vaultspark-studio-ops');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry') || args.has('--dry-run');

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

const registry = readJSON(path.join(opsRoot, 'portfolio', 'PROJECT_REGISTRY.json'));
const projectsBySlug = {};
for (const p of registry?.projects ?? []) projectsBySlug[p.slug] = p;

// page-dir → { registry slug, sibling-repo folder, IGNIS pulse name, voice-key }
const PAGES = [
  { page: 'games/call-of-doodie',         slug: 'call-of-doodie',         folder: 'Call-Of-Doodie',         pulse: 'Call-Of-Doodie',                voice: 'call-of-doodie' },
  { page: 'games/gridiron-gm',            slug: 'gridiron-gm',            folder: 'Gridiron-GM',            pulse: 'Gridiron-GM',                   voice: 'gridiron-gm' },
  { page: 'games/gridiron-gm-play',       slug: 'gridiron-gm-play',       folder: 'gridiron-gm-play',       pulse: 'gridiron-gm-play',              voice: 'gridiron-gm-play' },
  { page: 'games/mindframe',              slug: 'mindframe',              folder: 'mindframe',              pulse: 'MindFrame',                     voice: 'mindframe' },
  { page: 'games/solara',                 slug: 'solara',                 folder: 'Solara',                 pulse: 'Solara',                        voice: 'solara' },
  { page: 'games/the-exodus',             slug: 'the-exodus',             folder: 'The-Exodus',             pulse: 'The Exodus',                    voice: 'the-exodus' },
  { page: 'games/vaultfront',             slug: 'vaultfront',             folder: 'VaultFront',             pulse: 'VaultFront',                    voice: 'vaultfront' },
  { page: 'games/vaultspark-football-gm', slug: 'vaultspark-football-gm', folder: 'Franchise Architect', pulse: 'Franchise Architect',        voice: 'vaultspark-football-gm' },
  { page: 'games/project-unknown',        slug: null,                     folder: null,                     pulse: null,                            voice: 'project-unknown' },
  { page: 'projects/canon',               slug: 'canon',                  folder: 'Canon',                  pulse: 'CANON',                         voice: 'canon' },
  { page: 'projects/ideaforge',           slug: 'ideaforge',              folder: 'IdeaForge',              pulse: 'IdeaForge',                     voice: 'ideaforge' },
  { page: 'projects/promogrind',          slug: 'promogrind',             folder: 'PromoGrind',             pulse: 'PromoGrind',                    voice: 'promogrind' },
  { page: 'projects/statvault',           slug: 'statvault',              folder: 'StatVault',              pulse: 'StatVault',                     voice: 'statvault' },
  { page: 'projects/the-living-protocol', slug: 'living-protocol',        folder: 'The-Living-Protocol',    pulse: 'Living Protocol',               voice: 'the-living-protocol' },
  { page: 'projects/velaxis',             slug: 'velaxis',                folder: 'Velaxis',                pulse: 'Velaxis',                       voice: 'velaxis' },
  { page: 'projects/vorn',                slug: 'vorn',                   folder: 'Vorn',                   pulse: 'Vorn',                          voice: 'vorn' },
  { page: 'projects/voidfall',            slug: 'voidfall',               folder: 'Voidfall',               pulse: 'Voidfall',                      voice: 'voidfall' },
  { page: 'projects/voidfall-companion',  slug: 'voidfall-companion',     folder: null,                     pulse: 'Voidfall Companion App',        voice: 'voidfall-companion' },
  { page: 'projects/scriptorium',         slug: 'scriptorium',            folder: 'Scriptorium',            pulse: 'The Scriptorium',               voice: 'scriptorium' },
  { page: 'projects/seamline',            slug: 'seamline',               folder: 'Seamline',               pulse: 'Seamline',                      voice: 'seamline' },
  { page: 'projects/sparkfunnel',         slug: 'sparkfunnel',            folder: 'SparkFunnel',            pulse: 'SparkFunnel',                   voice: 'sparkfunnel' },
  { page: 'projects/studio-ops',          slug: 'studio-ops',             folder: 'vaultspark-studio-ops',  pulse: 'Studio Ops',                    voice: 'studio-ops' },
  { page: 'projects/vaultspark-ignis',    slug: 'vaultspark-ignis',       folder: 'vaultspark-ignis',       pulse: 'IGNIS',                         voice: 'vaultspark-ignis' },
  { page: 'projects/vaultspark-forge',    slug: 'vaultspark-forge',       folder: 'VaultSpark-Forge',       pulse: 'VaultSpark Forge',              voice: 'vaultspark-forge' },
  { page: 'projects/vaultspark-studio-hub', slug: 'vaultspark-studio-hub', folder: 'vaultspark-studio-hub', pulse: 'VaultSpark Studio Hub',         voice: 'vaultspark-studio-hub' },
  { page: 'projects/vaultspark-studios-social-dashboard', slug: 'vaultspark-studios-social-dashboard', folder: 'vaultspark-social-dashboard', pulse: 'VaultSpark Studios Social Dashboard', voice: 'vaultspark-studios-social-dashboard' },
  { page: 'projects/vaultsparkstudios-website', slug: 'vaultsparkstudios-website', folder: null,           pulse: 'VaultSparkStudios.github.io',   voice: 'vaultsparkstudios-website' },
];

// Migrated/old URLs that should be replaced wherever they appear → canonical lookup by page
// Hand-mapped to the slug, then resolved at runtime to liveUrl.
const STALE_URL_PATTERNS = [
  /https:\/\/app-dun-six-76\.vercel\.app[^"'<>\s)]*/g,    // ideaforge old
  /https:\/\/the-exodus-client\.vercel\.app[^"'<>\s)]*/g, // exodus old
  /https:\/\/[a-z0-9-]+\.pages\.dev[^"'<>\s)]*/g,         // generic CF preview hosts in CTAs
];

function siblingLiveUrl(folder) {
  if (!folder) return null;
  const status = readJSON(path.join(devRoot, folder, 'context', 'PROJECT_STATUS.json'));
  return status?.liveUrl || status?.runtimeUrl || null;
}

function canonicalUrl(slug, folder) {
  return siblingLiveUrl(folder) || projectsBySlug[slug]?.runtimeUrl || null;
}

function ensureAsset(html, tag, href) {
  if (html.includes(href)) return html;
  // inject before </head>
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function ensureIgnisAssets(html) {
  html = ensureAsset(html, `<link rel="stylesheet" href="/assets/ignis-project-block.css" />`, '/assets/ignis-project-block.css');
  html = ensureAsset(html, `<script defer src="/assets/ignis-project-block.js"></script>`, '/assets/ignis-project-block.js');
  return html;
}

function buildBlockHTML({ pulse, voice, liveUrl }) {
  const liveAttr = liveUrl ? ` data-live-url="${liveUrl}"` : '';
  return [
    '<!-- IGNIS-BLOCK-SLOT:start -->',
    `<div class="ignis-project-block" data-project="${pulse || ''}" data-voice="${voice || ''}"${liveAttr}></div>`,
    '<!-- IGNIS-BLOCK-SLOT:end -->',
  ].join('\n');
}

function injectIgnisBlock(html, blockHtml) {
  // If markers already exist, replace between them.
  const re = /<!--\s*IGNIS-BLOCK-SLOT:start\s*-->[\s\S]*?<!--\s*IGNIS-BLOCK-SLOT:end\s*-->/i;
  if (re.test(html)) return html.replace(re, blockHtml);

  // Otherwise, inject just before the first <div class="side-panel"> (project pages),
  // or before the first <aside> sibling, or before </main> as fallback.
  if (/<div\s+class=["']side-panel["']/i.test(html)) {
    return html.replace(/(<div\s+class=["']side-panel["'])/i, `${blockHtml}\n\n          $1`);
  }
  if (/<\/main>/i.test(html)) {
    return html.replace(/<\/main>/i, `  ${blockHtml}\n</main>`);
  }
  // Worst-case: append to body
  return html.replace(/<\/body>/i, `  ${blockHtml}\n</body>`);
}

function fixStaleUrls(html, liveUrl) {
  if (!liveUrl) return { html, replaced: 0 };
  let replaced = 0;
  for (const pat of STALE_URL_PATTERNS) {
    html = html.replace(pat, () => { replaced++; return liveUrl; });
  }
  return { html, replaced };
}

function fixDeadInternalCTAs(html, page, liveUrl) {
  // Pages where a /<slug>/ link is dead — redirect to liveUrl if we have one.
  const map = {
    'games/vaultfront':  ['/vaultfront/'],
    'projects/velaxis':  ['/velaxis/'],
    'projects/vorn':     ['/vorn/'],
  };
  const dead = map[page];
  if (!dead || !liveUrl) return { html, replaced: 0 };
  let replaced = 0;
  for (const d of dead) {
    const re = new RegExp(`href=["']${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g');
    html = html.replace(re, () => { replaced++; return `href="${liveUrl}"`; });
  }
  return { html, replaced };
}

// ---- main ----
let totalPages = 0, urlsReplaced = 0, deadFixed = 0, blocksInjected = 0, blocksUpdated = 0;
const log = [];

for (const entry of PAGES) {
  const pageFile = path.join(repoRoot, entry.page, 'index.html');
  if (!fs.existsSync(pageFile)) continue;
  totalPages++;

  const original = fs.readFileSync(pageFile, 'utf8');
  let html = original;
  const liveUrl = canonicalUrl(entry.slug, entry.folder);

  // 1. fix migrated/stale URLs site-wide on this page
  const urlFix = fixStaleUrls(html, liveUrl);
  html = urlFix.html;
  urlsReplaced += urlFix.replaced;

  // 2. fix dead internal CTAs
  const deadFix = fixDeadInternalCTAs(html, entry.page, liveUrl);
  html = deadFix.html;
  deadFixed += deadFix.replaced;

  // 3. ensure block assets are loaded
  html = ensureIgnisAssets(html);

  // 4. inject/refresh the IGNIS block
  const hadBlock = /IGNIS-BLOCK-SLOT:start/.test(original);
  html = injectIgnisBlock(html, buildBlockHTML({ ...entry, liveUrl }));
  if (hadBlock) blocksUpdated++; else blocksInjected++;

  if (html !== original) {
    if (!dryRun) fs.writeFileSync(pageFile, html);
    log.push(`  ${dryRun ? '·' : '✓'} ${entry.page}  (urls=${urlFix.replaced} dead=${deadFix.replaced} block=${hadBlock ? 'update' : 'inject'})`);
  } else {
    log.push(`  = ${entry.page}  (no change)`);
  }
}

console.log(`propagate-ignis-blocks${dryRun ? ' [DRY RUN]' : ''}`);
console.log(`  pages:           ${totalPages}`);
console.log(`  URLs replaced:   ${urlsReplaced}`);
console.log(`  dead CTAs fixed: ${deadFixed}`);
console.log(`  blocks injected: ${blocksInjected}`);
console.log(`  blocks updated:  ${blocksUpdated}`);
console.log('');
console.log(log.join('\n'));
