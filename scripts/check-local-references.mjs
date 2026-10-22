#!/usr/bin/env node
/**
 * Every internal href/src on a tracked public page must resolve to something
 * the site actually serves.
 *
 * S396: two live 404s had shipped past every gate. /news/subscribed/ — the page
 * every confirmed Desk Dispatch subscriber lands on — linked "Meet your AI news
 * desk" to /news/personas/, a directory with per-persona pages but no index.
 * Eight investor-portal pages, including the public login and interest form,
 * rendered a broken brand image from ../assets/logo.png, a file that never
 * existed.
 *
 * Neither was caught because each neighbouring gate is scoped to a different
 * question: crawl-all-pages.mjs asks whether each ROUTE answers, audit-site-
 * links.mjs asks whether project-slug anchors point at canon, and check-base-
 * href-resolution.mjs only inspects documents that declare a <base>. None asks
 * whether the references a page makes land on a real file.
 *
 * The check: for each tracked HTML page outside internal dirs, strip script,
 * style, template and comment bodies (their URLs are built at runtime), collect
 * every href/src, resolve root-absolute and relative refs (honouring <base>),
 * and require an existing file, a directory index.html, a Pages _redirects
 * source, or a declared runtime route.
 *
 * Usage:
 *   node scripts/check-local-references.mjs
 *   node scripts/check-local-references.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';
import { parsePagesRedirects, matchPagesRedirect } from '../cloudflare/pages-redirects.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Internal, never-deployed trees. Mirrors the crawl's skip list for tracked dirs.
const SKIP_PREFIXES = ['.cache/', 'docs/', 'tests/', 'context/', 'logs/', 'scripts/', 'supabase/', 'cloudflare/', 'node_modules/'];

// Served by the edge Worker, not by a file in the tree.
const RUNTIME_ROUTES = new Set(['/login', '/login/', '/auth/callback', '/auth/callback/']);

// Bodies only: the opening <script src> tag is a real reference and must stay.
// <template data-after-paint> blocks are kept whole — their parked tags load
// for real after first paint.
export function stripDynamicBodies(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1')
    .replace(/(<style\b[^>]*>)[\s\S]*?<\/style>/gi, '$1');
}

export function extractBase(html) {
  const m = html.match(/<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/** Internal references only: no scheme, no protocol-relative, no bare fragment/query, no templating. */
export function extractReferences(html) {
  const found = new Set();
  for (const m of stripDynamicBodies(html).matchAll(/<(?!base\b)[a-z][a-z0-9-]*\b[^>]*?\s(?:href|src)\s*=\s*["']([^"']*)["']/gi)) {
    const ref = m[1].trim();
    if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(ref)) continue;
    if (ref.includes('${') || ref.includes('{{')) continue;
    const clean = ref.split('#')[0].split('?')[0];
    if (clean) found.add(clean);
  }
  return [...found].sort();
}

/** Repo-relative URL path (leading slash kept) for a ref on the page at `rel`. */
export function resolveReference(rel, ref, base = null) {
  if (ref.startsWith('/')) return path.posix.normalize(ref);
  const from = base && base.startsWith('/') ? base : `/${rel}`;
  const dir = from.endsWith('/') ? from : from.slice(0, from.lastIndexOf('/') + 1);
  return path.posix.normalize(path.posix.join(dir, ref));
}

export function referenceResolves(urlPath, { exists, redirects = [] }) {
  let decoded = urlPath;
  try { decoded = decodeURI(urlPath); } catch { /* keep raw */ }
  if (RUNTIME_ROUTES.has(decoded)) return true;
  if (matchPagesRedirect(redirects, decoded) || matchPagesRedirect(redirects, decoded.replace(/\/$/, ''))) return true;
  const rel = decoded.replace(/^\/+/, '');
  if (rel === '') return exists('index.html');
  if (decoded.endsWith('/')) return exists(`${rel}index.html`);
  return exists(rel) || exists(`${rel}/index.html`) || exists(`${rel}.html`);
}

function trackedHtml() {
  const out = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  return out.split('\n').map((line) => line.trim()).filter((rel) => rel && !SKIP_PREFIXES.some((p) => rel.startsWith(p)));
}

// Exact-case: Windows stat ignores case, Linux CI and the Pages origin do not.
const listings = new Map();
function listing(dir) {
  if (!listings.has(dir)) {
    try { listings.set(dir, new Set(fs.readdirSync(dir))); } catch { listings.set(dir, new Set()); }
  }
  return listings.get(dir);
}
function fileExists(rel) {
  try {
    if (!fs.statSync(path.join(ROOT, rel)).isFile()) return false;
  } catch { return false; }
  let dir = ROOT;
  for (const part of rel.split('/')) {
    if (!listing(dir).has(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

function selfTest() {
  const files = new Set(['index.html', 'news/index.html', 'news/personas/vera/index.html', 'assets/icon-128.webp', 'investor-portal/apply/index.html', 'games/x/styles.css']);
  const exists = (p) => files.has(p);
  const redirects = parsePagesRedirects('/old-page  /news/  301\n/legacy/*  /games/  301\n');
  const ok = (rel, ref, base) => referenceResolves(resolveReference(rel, ref, base), { exists, redirects });

  const cases = [
    ['root-absolute directory with index resolves', ok('index.html', '/news/')],
    ['THE S396 PERSONAS BUG: a directory without an index fails', !ok('news/subscribed/index.html', '/news/personas/')],
    ['a real persona page still resolves', ok('news/subscribed/index.html', '/news/personas/vera/')],
    ['THE S396 LOGO BUG: a relative ref to a missing file fails', !ok('investor-portal/apply/index.html', '../../assets/logo.png')],
    ['a relative ref to a real asset resolves', ok('investor-portal/apply/index.html', '../../assets/icon-128.webp')],
    ['a Pages redirect source resolves', ok('index.html', '/old-page')],
    ['a splat redirect source resolves', ok('index.html', '/legacy/anything/')],
    ['a runtime Worker route resolves', ok('index.html', '/login')],
    ['a <base> repoints relative refs', ok('a/b/index.html', './styles.css', '/games/x/')],
    ['a wrong <base> fails', !ok('a/b/index.html', './styles.css', '/games/y/')],
    ['the root path resolves to index.html', ok('news/index.html', '/')],
    ['external, protocol-relative, mailto, fragment and query refs are ignored',
      extractReferences('<a href="https://x.dev/a"></a><img src="//cdn/x.png"><a href="mailto:a@b"></a><a href="#top"></a><a href="?p=2"></a>').length === 0],
    ['refs inside script bodies, style bodies and comments are ignored',
      extractReferences('<script>a.href="/nope/"</script><style>.x{background:url("/nope.png")}</style><!-- <a href="/nope/"> -->').length === 0],
    ['a <script src> opening tag is checked', extractReferences('<script src="/missing.js"></script>').join(',') === '/missing.js'],
    ['parked tags inside <template> are checked', extractReferences('<template data-after-paint><script src="/parked.js" defer></script></template>').join(',') === '/parked.js'],
    ['templated refs are ignored', extractReferences('<a href="${x}"></a><a href="{{y}}"></a>').length === 0],
    ['fragments and queries are stripped', extractReferences('<a href="/news/?a=1#b">x</a>').join(',') === '/news/'],
    ['the <base> tag itself is not a reference', extractReferences('<base href="/games/x/"><link href="./a.css">').join(',') === './a.css'],
  ];
  const failed = cases.filter(([, pass]) => !pass);
  for (const [name, pass] of cases) console.log(`  ${pass ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-local-references --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-local-references --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  let redirects = [];
  try { redirects = parsePagesRedirects(fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8')); } catch { /* no redirects file */ }
  const pages = trackedHtml().filter(fileExists);
  const broken = new Map();
  let checked = 0;
  for (const rel of pages) {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const base = extractBase(html);
    for (const ref of extractReferences(html)) {
      checked += 1;
      const target = resolveReference(rel, ref, base);
      if (referenceResolves(target, { exists: fileExists, redirects })) continue;
      if (!broken.has(target)) broken.set(target, []);
      broken.get(target).push(`${rel} ("${ref}")`);
    }
  }
  if (broken.size) {
    console.error(`check-local-references: ${broken.size} internal target(s) do not exist — visitors and agents get a 404:`);
    for (const [target, from] of broken) {
      console.error(`  ✗ ${target}  ← ${from.slice(0, 4).join(', ')}${from.length > 4 ? ` (+${from.length - 4} more)` : ''}`);
    }
    console.error('  fix: point the reference at a real file or index, or add a _redirects rule if the old path must keep working.');
    process.exit(1);
  }
  console.log(`check-local-references: ${pages.length} page(s) · ${checked} internal reference(s) all resolve`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
