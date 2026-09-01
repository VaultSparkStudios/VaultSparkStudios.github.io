#!/usr/bin/env node
/**
 * Structural sitemap generator: indexability comes from each page's robots
 * directive, never from path-substring guesses in workflow shell.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'sitemap.xml');
const ORIGIN = 'https://vaultsparkstudios.com';
const CHECK = process.argv.includes('--check');
const NON_PUBLIC_DIRECTORIES = new Set([
  'node_modules',
  'docs',
  'context',
  'tests',
  'scripts',
  'playwright-report',
  'test-results',
  'lighthouse-results',
  'output',
]);

/**
 * Dot-directories are tooling by convention (.git, .cache, .claude, .wrangler)
 * — except one.
 *
 * S334: `.ai/` holds the 17 index-follow, "cite this page" canonical fact
 * sheets, and the blanket startsWith('.') rule swallowed every one of them. The
 * layer was built to be found by machines and was absent from the single file
 * machines read to find things. The exception is explicit rather than a
 * loosened prefix rule, so the next dot-directory is still excluded by default.
 */
const PUBLIC_DOT_DIRECTORIES = new Set(['.ai']);

export function isExcludedDirectory(name) {
  if (PUBLIC_DOT_DIRECTORIES.has(name)) return false;
  return name.startsWith('.') || NON_PUBLIC_DIRECTORIES.has(name);
}

function htmlFiles(dir = ROOT, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (isExcludedDirectory(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(absolute, found);
    else if (entry.name === 'index.html') found.push(absolute);
  }
  return found;
}

export function isNoindex(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].some((match) => {
    const tag = match[0];
    return /name\s*=\s*["']robots["']/i.test(tag) && /content\s*=\s*["'][^"']*noindex/i.test(tag);
  });
}

export function routeFor(file) {
  const relative = path.relative(ROOT, file).replaceAll('\\', '/').replace(/index\.html$/, '');
  return '/' + relative;
}

function priority(route) {
  const depth = route.split('/').filter(Boolean).length;
  return depth === 0 ? ['weekly', '1.0'] : depth === 1 ? ['weekly', '0.8'] : ['monthly', '0.6'];
}

export function renderSitemap(files) {
  const routes = files
    .filter((file) => !isNoindex(fs.readFileSync(file, 'utf8')))
    .map(routeFor)
    .filter((route) => !route.includes('/member/'))
    .sort();
  const rows = routes.map((route) => {
    const [freq, score] = priority(route);
    return '  <url><loc>' + ORIGIN + route + '</loc><changefreq>' + freq + '</changefreq><priority>' + score + '</priority></url>';
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows.join('\n') + '\n</urlset>\n';
}

function selfTest() {
  if (!isNoindex('<meta content="follow,noindex" name="robots">')) throw new Error('attribute-order-independent noindex parse failed');
  if (isNoindex('<meta name="robots" content="index,follow">')) throw new Error('indexable page classified noindex');
  if (!isExcludedDirectory('playwright-report')) throw new Error('Playwright report directory must never enter the public sitemap');
  if (!isExcludedDirectory('test-results')) throw new Error('test result directory must never enter the public sitemap');
  if (isExcludedDirectory('projects')) throw new Error('public project directory was excluded');
  if (isExcludedDirectory('.ai')) throw new Error('the .ai fact-sheet layer must reach the sitemap — it is the surface machines read to find it');
  if (!isExcludedDirectory('.cache')) throw new Error('the .ai exception must not loosen the dot-directory rule for tooling directories');
  console.log('generate-sitemap: self-test passed');
}

if (process.argv.includes('--self-test')) selfTest();
else {
  const rendered = renderSitemap(htmlFiles());
  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (CHECK && existing !== rendered) {
    console.error('generate-sitemap: FAIL · sitemap.xml is stale for semantic robots directives');
    process.exit(1);
  }
  if (!CHECK) fs.writeFileSync(OUT, rendered);
  console.log('generate-sitemap: ' + (CHECK ? 'check passed' : 'wrote') + ' · ' + (rendered.match(/<url>/g) || []).length + ' indexable routes');
}
