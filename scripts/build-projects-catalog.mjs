#!/usr/bin/env node
/**
 * build-projects-catalog.mjs — renders the /projects/ catalog grid from the public
 * intelligence feed (studio-ops canon via the in-repo registry mirror).
 *
 * S368 registry-truth-everywhere: the generated grid is now THE catalog. It sits at
 * the top of the #catalog section (id="projects-grid", so the status filter drives
 * it) and the hand-written cards that used to precede it — which listed FORGE tools
 * as SPARKED and omitted eight registry projects — are gone. On-disk project pages
 * that the registry does not list (site features, earlier profiles) render as a
 * plain "Also on file" link row with NO status claim, so they stay discoverable
 * without the page asserting a vault status canon never gave them.
 *
 * Import-safe (scripts/derive-registry-surfaces.mjs reuses renderCatalog); side
 * effects run only when invoked directly.
 *
 * Usage: node scripts/build-projects-catalog.mjs [--check] [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = path.join(ROOT, 'projects', 'index.html');
const FEED = path.join(ROOT, 'api', 'public-intelligence.json');
export const CATALOG_START = '<!-- registry-project-catalog:start -->';
export const CATALOG_END = '<!-- registry-project-catalog:end -->';

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const STATUS_BADGE = { sparked: '🔥 Sparked', forge: '⚒️ Forge', vaulted: '🔒 Vaulted' };
const STATUS_ARIA = { sparked: 'Sparked', forge: 'In The Forge', vaulted: 'Vaulted' };

export function isCatalogProject(project) {
  return project && project.type !== 'game' && project.id !== 'mindframe';
}

function defaultExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

export function routeFor(project, exists = defaultExists) {
  const local = '/projects/' + project.id + '/';
  return exists(local.slice(1) + 'index.html') ? local : (project.deployedUrl || null);
}

export function isNoindexed(html) {
  return [...String(html).matchAll(/<meta\b[^>]*>/gi)].some(([tag]) => /name\s*=\s*["']robots["']/i.test(tag) && /content\s*=\s*["'][^"']*noindex/i.test(tag));
}

/** On-disk /projects/<dir>/ pages that the registry catalog does not list (and that are indexable). */
export function offRegistryPages(catalog, root = ROOT) {
  const listed = new Set((catalog || []).filter(isCatalogProject).map((p) => p.id));
  const dir = path.join(root, 'projects');
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || listed.has(entry.name)) continue;
    const page = path.join(dir, entry.name, 'index.html');
    if (!fs.existsSync(page)) continue;
    const html = fs.readFileSync(page, 'utf8');
    // D-S368.5: an off-catalog page that is noindexed is reachable by URL but is
    // removed from every listing until it joins the public catalog.
    if (isNoindexed(html)) continue;
    const title = (html.match(/<title>([^<|—]+)/) || [])[1];
    out.push({ href: '/projects/' + entry.name + '/', name: (title || entry.name).trim() });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function renderCatalog(catalog, { extraPages = [], exists = defaultExists } = {}) {
  const projects = (catalog || []).filter(isCatalogProject);
  const cards = projects.map((project) => {
    const status = String(project.status || '').toLowerCase();
    const href = routeFor(project, exists);
    const external = href && href.startsWith('http');
    const action = href
      ? '<a class="button-secondary button-sm" href="' + esc(href) + '"' + (external ? ' target="_blank" rel="noreferrer"' : '') + '>' + (external ? 'Visit ' + esc(project.name) + ' &rarr;' : 'About ' + esc(project.name)) + '</a>'
      : '<span class="status status-forge">Profile in the forge</span>';
    return '<article class="project-card" data-status="' + esc(status) + '" data-project="' + esc(project.id) + '" aria-label="' + esc(project.name) + ' — ' + esc(STATUS_ARIA[status] || project.status) + '">'
      + '<div class="card-content"><span class="status status-' + esc(status) + '">' + esc(STATUS_BADGE[status] || project.status) + '</span>'
      + '<h3>' + esc(project.name) + '</h3>'
      + (project.category ? '<p class="project-eyebrow">' + esc(project.category) + '</p>' : '')
      + '<p>' + esc(project.note || 'A VaultSpark Studios initiative.') + '</p>'
      + '<div class="project-card-actions">' + action + '</div></div></article>';
  }).join('\n');
  const extras = extraPages.length
    ? '\n<p class="projects-also" data-registry-off-catalog="' + extraPages.length + '">Also on file: '
      + extraPages.map((p) => '<a href="' + esc(p.href) + '">' + esc(p.name) + '</a>').join(' &middot; ')
      + '</p>'
    : '';
  return CATALOG_START
    + '\n<div class="projects-section-label" data-section="all"><span>Every studio project</span></div>'
    + '\n<div class="projects-grid" id="projects-grid" data-registry-project-count="' + projects.length + '">\n' + cards + '\n</div>'
    + extras
    + '\n' + CATALOG_END;
}

export function injectCatalog(html, block) {
  const re = new RegExp(CATALOG_START + '[\\s\\S]*?' + CATALOG_END);
  if (re.test(html)) return html.replace(re, () => block);
  return html.replace('</main>', block + '\n</main>');
}

function selfTest() {
  const rendered = renderCatalog(
    [{ id: 'x', name: 'X', type: 'tool', status: 'FORGE', note: '<safe>', deployedUrl: null }, { id: 'g', name: 'G', type: 'game', status: 'FORGE' }],
    { extraPages: [{ href: '/projects/y/', name: 'Y' }], exists: () => false },
  );
  if (!rendered.includes('&lt;safe&gt;') || rendered.includes('>G<') || !rendered.includes('data-registry-project-count="1"')) throw new Error('catalog filter/escaping contract failed');
  if (!rendered.includes('id="projects-grid"')) throw new Error('catalog grid must carry id="projects-grid" so the status filter drives it');
  if (!rendered.includes('Also on file: <a href="/projects/y/">Y</a>')) throw new Error('off-registry pages must render as a status-free link row');
  if (!isNoindexed('<meta content="noindex, follow" name="robots">') || isNoindexed('<meta name="robots" content="index,follow">')) throw new Error('noindex detection must be attribute-order independent and must not flag indexable pages');
  console.log('build-projects-catalog: self-test passed');
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/build-projects-catalog.mjs');

if (isMain) {
  const CHECK = process.argv.includes('--check');
  if (process.argv.includes('--self-test')) selfTest();
  else {
    const feed = JSON.parse(fs.readFileSync(FEED, 'utf8'));
    const catalog = feed.catalog || [];
    const current = fs.readFileSync(PAGE, 'utf8');
    const next = injectCatalog(current, renderCatalog(catalog, { extraPages: offRegistryPages(catalog) }));
    if (CHECK && current !== next) {
      console.error('build-projects-catalog: FAIL · projects/index.html is stale for public intelligence catalog');
      process.exit(1);
    }
    if (!CHECK && current !== next) fs.writeFileSync(PAGE, next);
    console.log('build-projects-catalog: ' + (CHECK ? 'check passed' : 'rendered') + ' · ' + catalog.filter(isCatalogProject).length + ' registry projects');
  }
}
