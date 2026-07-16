#!/usr/bin/env node
/**
 * build-ecosystem-bridges.mjs — S218
 *
 * The "Also From The Vault" ecosystem-bridge on every individual game/project page
 * shipped (S216, upgrade-individual-pages.mjs) with the SAME 4 hardcoded links on
 * every page — and the subtitles had drifted stale vs the catalog (Velaxis labelled
 * "Sports Intelligence" when it is "Trading Intelligence"; MindFrame "Cognitive
 * Training" vs "AI Intelligence"; a `vault-member` link not in the catalog at all).
 * Hardcoded public surfaces drift and lie (CANON-031) — derive them.
 *
 * This regenerates each bridge's links block from api/public-intelligence.json:
 *   - page-specific: related items ranked by CATEGORY-TOKEN affinity (survival↔survival,
 *     sports↔sports, agent↔agent, creator↔creator, intelligence↔intelligence), self
 *     (and its slug-aliases) excluded, prominence (SPARKED + progress) as tiebreak/fallback.
 *   - honest: only links to catalog items that have a real on-disk page; real subtitles
 *     are the catalog category, not a hand-typed guess.
 *   - idempotent: replaces the content between the <h2> and inside .ecosystem-bridge-links
 *     by marker, so re-running (every build) refreshes from the live catalog.
 *
 *   node scripts/build-ecosystem-bridges.mjs          # apply
 *   node scripts/build-ecosystem-bridges.mjs --check  # verify in sync (CI), exit 1 on drift
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

// Page-dir slug → catalog id (the catalog keys games as `football-gm`; the live pages
// are aliases). Keeps relatedness self-exclusion correct for the aliased game.
const SLUG_ALIAS = {
  'gridiron-gm': 'football-gm',
  'gridiron-gm-play': 'football-gm',
  'franchise-architect': 'football-gm',
};

function loadCatalog() {
  const pi = JSON.parse(readFileSync(join(ROOT, 'api/public-intelligence.json'), 'utf8'));
  const raw = pi.catalog ? Object.values(pi.catalog) : [];
  // Resolve each catalog item to its real on-disk page URL (games first, then projects).
  return raw.map((c) => {
    let url = null;
    if (existsSync(join(ROOT, 'games', c.id, 'index.html'))) url = `/games/${c.id}/`;
    else if (existsSync(join(ROOT, 'projects', c.id, 'index.html'))) url = `/projects/${c.id}/`;
    return { id: c.id, name: c.name, type: c.type, category: c.category || '', status: c.status, progress: c.progress || 0, url };
  });
}

function tokens(category) {
  return (category || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Top-N related catalog items for a page, by category-token affinity then prominence.
// `selfId` is the page's resolved catalog id (may be null for catalog-less pages).
// `preferType` softly biases toward the opposite type to fit the section heading.
function relatedFor(selfId, preferType, catalog, n = 3) {
  const self = catalog.find((c) => c.id === selfId);
  const selfToks = new Set(self ? tokens(self.category) : []);
  return catalog
    .filter((c) => c.url && c.id !== selfId)
    .map((c) => {
      const overlap = tokens(c.category).filter((t) => selfToks.has(t)).length;
      const typeBias = preferType && c.type === preferType ? 1 : 0;
      const statusScore = c.status === 'SPARKED' ? 1 : 0;
      // affinity dominates; then opposite-type bias; then prominence.
      const score = overlap * 1000 + typeBias * 100 + statusScore * 20 + c.progress / 10;
      return { c, score, overlap };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((s) => s.c);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderLinks(items, anchorHref, anchorLabel, anchorSub) {
  const lines = items.map(
    (c) => `            <a href="${c.url}" class="eco-link">${esc(c.name)} <span>${esc(c.category)}</span></a>`
  );
  lines.push(`            <a href="${anchorHref}" class="eco-link">${anchorLabel} <span>${anchorSub}</span></a>`);
  return lines.join('\n');
}

// Replace the inner content of the FIRST .ecosystem-bridge-links block (idempotent).
function replaceLinksBlock(html, linksHtml) {
  const re = /(<div class="ecosystem-bridge-links">)[\s\S]*?(<\/div>)/;
  if (!re.test(html)) return html;
  return html.replace(re, `$1\n${linksHtml}\n          $2`);
}

// Canonicalize the bridge <h2> so it fits affinity-mixed (possibly same-type) related items.
function setHeading(html, heading) {
  const re = /(<section class="ecosystem-bridge"[\s\S]*?<h2>)[\s\S]*?(<\/h2>)/;
  return re.test(html) ? html.replace(re, `$1${heading}$2`) : html;
}

function pageSlug(file) {
  const m = file.replace(/\\/g, '/').match(/\/(games|projects)\/([^/]+)\/index\.html$/);
  return m ? { section: m[1], slug: m[2] } : null;
}

function processFile(file, catalog) {
  const info = pageSlug(file);
  if (!info) return null;
  const src = readFileSync(file, 'utf8');
  const isGame = /ecosystem-bridge-inject:game/.test(src);
  const isProject = /ecosystem-bridge-inject:project/.test(src);
  if (!isGame && !isProject) return null;

  const selfId = SLUG_ALIAS[info.slug] || info.slug;
  // Game pages bias toward tools/platforms ("Projects That Power The Games"); project
  // pages bias toward games. Affinity still wins, so a survival game can surface its
  // survival siblings when no thematically-linked tool exists.
  const preferType = isGame ? 'tool' : 'game';
  const related = relatedFor(selfId, preferType, catalog, 3);
  const linksHtml = isGame
    ? renderLinks(related, '/games/', 'All Games', 'VaultSpark Universe')
    : renderLinks(related, '/projects/', 'All Projects', 'Full Portfolio');
  const heading = 'Explore More From The Vault';

  let next = setHeading(src, heading);
  next = replaceLinksBlock(next, linksHtml);
  return next === src ? { file, changed: false } : { file, changed: true, content: next };
}

function collectBridgePages() {
  const out = [];
  for (const section of ['games', 'projects']) {
    const base = join(ROOT, section);
    if (!existsSync(base)) continue;
    for (const entry of readdirSafe(base)) {
      const f = join(base, entry, 'index.html');
      if (existsSync(f)) out.push(f);
    }
  }
  return out;
}

function readdirSafe(dir) {
  try { return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); }
  catch { return []; }
}

const catalog = loadCatalog();
const withPages = catalog.filter((c) => c.url).length;
const files = collectBridgePages();
let changed = 0, drift = [];
for (const f of files) {
  const res = processFile(f, catalog);
  if (!res || !res.changed) continue;
  changed++;
  drift.push(f.replace(ROOT, '').replace(/\\/g, '/'));
  if (!CHECK) writeFileSync(f, res.content);
}

if (CHECK) {
  if (changed > 0) {
    console.error(`✗ ecosystem-bridges DRIFT: ${changed} page(s) out of sync with catalog`);
    for (const d of drift.slice(0, 10)) console.error('   ' + d);
    process.exit(1);
  }
  console.log(`✓ ecosystem-bridges in sync (${files.length} pages · ${withPages} linkable catalog items)`);
} else {
  console.log(`✓ ecosystem-bridges: regenerated ${changed}/${files.length} page(s) from catalog (${withPages} linkable items)`);
}
