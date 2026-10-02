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

// lastmod comes from dates the page itself declares (article meta or JSON-LD),
// never from git or the clock, so --check stays deterministic across commits.
export function contentDate(html) {
  const pick = [
    /<meta[^>]+property=["']article:modified_time["'][^>]+content=["'](\d{4}-\d{2}-\d{2})/i,
    /"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/,
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["'](\d{4}-\d{2}-\d{2})/i,
    /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/,
  ];
  for (const re of pick) { const m = html.match(re); if (m) return m[1]; }
  return null;
}

/**
 * S368: a route the edge 301s away is never served, even when a stub file is
 * still on disk (a generator may still read it). Listing it would point crawlers
 * at a redirect. Parses _redirects: an exact source retires that route (with or
 * without its trailing slash); a "/x/*" splat retires everything under /x/.
 */
export function redirectedRoutes(text) {
  const exact = new Set();
  const prefixes = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [from, , status] = t.split(/\s+/);
    if (!from || !/^30[1278]$/.test(status || '301')) continue;
    if (from.endsWith('/*')) prefixes.push(from.slice(0, -1));
    else exact.add(from.replace(/\/+$/, '') || '/');
  }
  return (route) => exact.has(route.replace(/\/+$/, '') || '/') || prefixes.some((prefix) => route.startsWith(prefix));
}

const IS_REDIRECTED = redirectedRoutes(fs.existsSync(path.join(ROOT, '_redirects')) ? fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8') : '');

export function renderSitemap(files, isRedirected = IS_REDIRECTED) {
  const routes = files
    .filter((file) => !isNoindex(fs.readFileSync(file, 'utf8')))
    .map(routeFor)
    .filter((route) => !route.includes('/member/'))
    .filter((route) => !isRedirected(route))
    .sort();
  const byRoute = new Map(files.map((file) => [routeFor(file), file]));
  const rows = routes.map((route) => {
    const [freq, score] = priority(route);
    const lastmod = contentDate(fs.readFileSync(byRoute.get(route), 'utf8'));
    return '  <url><loc>' + ORIGIN + route + '</loc>' + (lastmod ? '<lastmod>' + lastmod + '</lastmod>' : '') + '<changefreq>' + freq + '</changefreq><priority>' + score + '</priority></url>';
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
  if (contentDate('<script type="application/ld+json">{"datePublished":"2026-09-30T12:00:00Z"}</script>') !== '2026-09-30') throw new Error('JSON-LD datePublished must become lastmod');
  if (contentDate('<meta property="article:modified_time" content="2026-10-01T00:00:00Z"><script>{"datePublished":"2026-09-01"}</script>') !== '2026-10-01') throw new Error('modified time must win over published time');
  if (contentDate('<p>No dates here</p>') !== null) throw new Error('pages without declared dates must omit lastmod');
  const retired = redirectedRoutes('# c\n/stats/   /evidence/#numbers   301\n/stats    /evidence/#numbers   301\n/careers/*  /collaborate/  301\n/x  /y  200');
  if (!retired('/stats/') || retired('/stats/ecosystem/')) throw new Error('an exact redirect must retire only its own route, not its live children');
  if (!retired('/careers/') || !retired('/careers/old/')) throw new Error('a splat redirect must retire its whole tree');
  if (retired('/x/') || retired('/evidence/')) throw new Error('rewrites (200) and destinations are not retired routes');
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
