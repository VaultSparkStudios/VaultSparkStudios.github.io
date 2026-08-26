#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = path.join(ROOT, 'projects', 'index.html');
const FEED = path.join(ROOT, 'api', 'public-intelligence.json');
const START = '<!-- registry-project-catalog:start -->';
const END = '<!-- registry-project-catalog:end -->';
const CHECK = process.argv.includes('--check');

const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function routeFor(project) {
  const local = '/projects/' + project.id + '/';
  return fs.existsSync(path.join(ROOT, local.slice(1), 'index.html')) ? local : (project.deployedUrl || null);
}

export function renderCatalog(catalog) {
  const projects = catalog.filter((project) => project.type !== 'game' && project.id !== 'mindframe');
  const cards = projects.map((project) => {
    const href = routeFor(project);
    const action = href ? '<a class="button-secondary button-sm" href="' + esc(href) + '"' + (href.startsWith('http') ? ' target="_blank" rel="noreferrer"' : '') + '>Open project</a>' : '<span class="status status-forge">Profile in the forge</span>';
    return '<article class="project-card" data-status="' + esc(String(project.status || '').toLowerCase()) + '"><div class="card-content"><span class="status status-' + esc(String(project.status || '').toLowerCase()) + '">' + esc(project.status) + '</span><h3>' + esc(project.name) + '</h3><p>' + esc(project.note || 'A VaultSpark Studios initiative.') + '</p><div class="project-card-actions">' + action + '</div></div></article>';
  }).join('');
  return START + '\n<section aria-labelledby="registry-projects-heading" class="projects-catalog"><div class="container"><div class="projects-section-label"><span>Registry-complete catalog</span></div><h2 id="registry-projects-heading">Every current studio project.</h2><p class="projects-lead">Generated from the same portfolio registry that powers Studio Pulse. No hand-maintained omissions.</p><div class="projects-grid" data-registry-project-count="' + projects.length + '">' + cards + '</div></div></section>\n' + END;
}

function inject(html, block) {
  if (html.includes(START) && html.includes(END)) return html.replace(new RegExp(START + '[\\s\\S]*?' + END), block);
  return html.replace('</main>', block + '\n</main>');
}

function selfTest() {
  const rendered = renderCatalog([{ id: 'x', name: 'X', type: 'tool', status: 'FORGE', note: '<safe>', deployedUrl: null }, { id: 'g', name: 'G', type: 'game', status: 'FORGE' }]);
  if (!rendered.includes('&lt;safe&gt;') || rendered.includes('>G<') || !rendered.includes('data-registry-project-count="1"')) throw new Error('catalog filter/escaping contract failed');
  console.log('build-projects-catalog: self-test passed');
}

if (process.argv.includes('--self-test')) selfTest();
else {
  const feed = JSON.parse(fs.readFileSync(FEED, 'utf8'));
  const current = fs.readFileSync(PAGE, 'utf8');
  const next = inject(current, renderCatalog(feed.catalog || []));
  if (CHECK && current !== next) {
    console.error('build-projects-catalog: FAIL · projects/index.html is stale for public intelligence catalog');
    process.exit(1);
  }
  if (!CHECK && current !== next) fs.writeFileSync(PAGE, next);
  const count = (feed.catalog || []).filter((project) => project.type !== 'game' && project.id !== 'mindframe').length;
  console.log('build-projects-catalog: ' + (CHECK ? 'check passed' : 'rendered') + ' · ' + count + ' registry projects');
}
