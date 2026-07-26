#!/usr/bin/env node
/**
 * A <base href> must resolve this document's relative assets to files that exist.
 *
 * S294: `franchise-architect/{index,game,404}.html` declared
 * `<base href="/games/franchise-architect/" />` while their own `styles.css`,
 * `setup.js`, and `app.js` live in `/franchise-architect/`. Every relative asset
 * therefore resolved into the About page's directory, which ships no app assets,
 * so the browser got the 404 HTML page back and refused it as a stylesheet
 * ("MIME type ('text/html') is not a supported stylesheet MIME type"). The
 * playable game rendered as unstyled text with a dead module script.
 *
 * It was introduced by the S284 slug rebrand and survived every gate, because a
 * `<base>` is syntactically fine, the referenced files DO exist somewhere in the
 * repo, and link checkers look at hrefs rather than at hrefs-resolved-through-base.
 * That is the whole defect class: a one-line indirection that silently repoints
 * every relative URL in a document.
 *
 * The check: for each HTML file carrying a <base href>, resolve every RELATIVE
 * asset reference through that base and assert the resulting repo path exists.
 * Scoped to relative refs on purpose — those are exactly the ones <base> rewrites.
 * Root-absolute refs are unaffected by <base> and often Worker-served, so
 * including them would only add false positives.
 *
 * Usage:
 *   node scripts/check-base-href-resolution.mjs
 *   node scripts/check-base-href-resolution.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function extractBase(html) {
  const m = html.match(/<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/**
 * Relative asset references only — a leading '/', a scheme, '//', '#', 'data:',
 * or 'mailto:' is not rewritten by <base> (or is not a repo file at all).
 */
export function extractRelativeAssets(html) {
  const found = new Set();
  for (const m of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    const ref = m[1].trim();
    if (!ref) continue;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|\?)/i.test(ref)) continue;
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) continue;
    if (!/\.(css|js|mjs|json|png|jpg|jpeg|webp|svg|ico|woff2?|txt|xml|html)$/i.test(clean)) continue;
    found.add(clean);
  }
  return [...found].sort();
}

/** Resolve a relative ref through a root-absolute base into a repo-relative path. */
export function resolveThroughBase(baseHref, ref) {
  const base = baseHref.startsWith('/') ? baseHref.slice(1) : baseHref;
  const dir = base.endsWith('/') ? base : `${base.split('/').slice(0, -1).join('/')}/`;
  const joined = path.posix.normalize(path.posix.join(dir, ref));
  return joined.replace(/^\/+/, '');
}

function trackedHtml() {
  const out = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  return out.split('\n').map((line) => line.trim()).filter(Boolean);
}

function selfTest() {
  const goodHtml = '<base href="/franchise-architect/" /><link rel="stylesheet" href="./styles.css"><script src="./setup.js"></script>';
  const badHtml = '<base href="/games/franchise-architect/" /><link rel="stylesheet" href="./styles.css">';
  const exists = (p) => ['franchise-architect/styles.css', 'franchise-architect/setup.js'].includes(p);

  const cases = [
    ['a base href is extracted', extractBase(goodHtml) === '/franchise-architect/'],
    ['no base tag yields null', extractBase('<html><head></head></html>') === null],
    ['relative assets are collected', extractRelativeAssets(goodHtml).join(',') === './setup.js,./styles.css'],
    ['root-absolute refs are ignored', extractRelativeAssets('<link href="/assets/x.css">').length === 0],
    ['cross-origin refs are ignored', extractRelativeAssets('<script src="https://cdn.example/x.js">').length === 0],
    ['protocol-relative refs are ignored', extractRelativeAssets('<script src="//cdn.example/x.js">').length === 0],
    ['anchors and queries are ignored', extractRelativeAssets('<a href="#top"></a><a href="?p=1"></a>').length === 0],
    ['non-asset extensions are ignored', extractRelativeAssets('<a href="./about">x</a>').length === 0],
    ['a query string is stripped before resolving', extractRelativeAssets('<link href="./styles.css?v=2">').join(',') === './styles.css'],
    ['resolution walks through the base directory', resolveThroughBase('/franchise-architect/', './styles.css') === 'franchise-architect/styles.css'],
    ['a parent segment resolves', resolveThroughBase('/games/franchise-architect/', '../x.css') === 'games/x.css'],
    ['a base without a trailing slash uses its directory', resolveThroughBase('/a/b.html', './c.css') === 'a/c.css'],
    ['THE S294 BUG: the wrong base resolves to a missing file', !exists(resolveThroughBase(extractBase(badHtml), './styles.css'))],
    ['the corrected base resolves to real files', extractRelativeAssets(goodHtml).every((r) => exists(resolveThroughBase(extractBase(goodHtml), r)))],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-base-href-resolution --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-base-href-resolution --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const findings = [];
  let withBase = 0;
  let checked = 0;
  for (const rel of trackedHtml()) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const html = fs.readFileSync(abs, 'utf8');
    const base = extractBase(html);
    if (!base) continue;
    withBase += 1;
    if (!base.startsWith('/')) {
      findings.push(`${rel}: <base href="${base}"> is not root-absolute — resolution cannot be verified statically`);
      continue;
    }
    for (const ref of extractRelativeAssets(html)) {
      const target = resolveThroughBase(base, ref);
      checked += 1;
      if (!fs.existsSync(path.join(ROOT, target))) {
        findings.push(`${rel}: "${ref}" resolves through <base href="${base}"> to ${target}, which does not exist`);
      }
    }
  }
  if (findings.length) {
    console.error('check-base-href-resolution: <base> repoints relative asset(s) at missing file(s):');
    for (const f of findings) console.error(`  ✗ ${f}`);
    console.error('  a browser receives the 404 HTML page and refuses it by MIME type — the page renders unstyled.');
    console.error('  fix: point <base href> at the document\'s own directory, or move the assets.');
    process.exit(1);
  }
  console.log(`check-base-href-resolution: ${withBase} document(s) with a <base> · ${checked} relative asset ref(s) all resolve to real files`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
