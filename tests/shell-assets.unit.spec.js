// S360 — build-shell-assets is import-safe, so its pure gate helper is testable,
// and the leaderboard embed never reads its host page's theme tokens.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'assets', 'shell-manifest.json');
const SW = path.join(ROOT, 'sw.js');
const before = fs.readFileSync(MANIFEST, 'utf8');
const swBefore = fs.readFileSync(SW, 'utf8');
const { predicatesMissingShellAsset } = await import('../scripts/build-shell-assets.mjs');
const bundle = (entries) => `const CONTENT_ADDRESSED_PREDICATE_SRCS = [\n${entries}\n];`;

test('importing build-shell-assets does not run the build', () => {
  // main() regenerates the manifest (fresh generatedAt) and rewrites pages; an
  // import that left the manifest byte-identical did not run it.
  // (Compare bytes, not `git status`: a tree mid-build legitimately holds an
  // uncommitted manifest, and that says nothing about what the import did.)
  assert.equal(fs.readFileSync(MANIFEST, 'utf8'), before, 'importing must not regenerate the shell manifest');
  assert.equal(fs.readFileSync(SW, 'utf8'), swBefore, 'importing must not rewrite the service worker');
});

test('a listed predicate that is a shell asset passes', () => {
  assert.deepEqual(predicatesMissingShellAsset(bundle("  'assets/a.js',"), ['assets/a.js']), []);
});

test('a listed predicate that is not a shell asset is named', () => {
  assert.deepEqual(predicatesMissingShellAsset(bundle("  'assets/a.js',\n  'assets/b.js',"), ['assets/a.js']), ['assets/b.js']);
});

test('a commented-out entry is not a listed predicate', () => {
  assert.deepEqual(predicatesMissingShellAsset(bundle("  // 'assets/gone.js',\n  'assets/a.js',"), ['assets/a.js']), []);
});

test('a missing predicate block fails loudly instead of passing empty', () => {
  const out = predicatesMissingShellAsset('const SOMETHING_ELSE = [];', []);
  assert.equal(out.length, 1);
  assert.match(out[0], /not found/);
});

test('the real ambient bundle lists no predicate outside the shell set', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'build-ambient-bundle.mjs'), 'utf8');
  const manifest = JSON.parse(before);
  const entries = Array.isArray(manifest.assets) ? manifest.assets : Object.values(manifest.assets || {});
  const sources = entries.map((a) => a && a.source).filter(Boolean);
  assert.ok(sources.length > 10, 'manifest must list the shell assets');
  assert.deepEqual(predicatesMissingShellAsset(src, sources), []);
});

test('the service-worker precache has no duplicate requests (Cache.addAll rejects them)', () => {
  // S360: three duplicates made every production install go `redundant` —
  // no offline precache and no push notifications for months.
  const sw = fs.readFileSync(SW, 'utf8');
  const block = /const STATIC_ASSETS = \[([\s\S]*?)\];/.exec(sw);
  assert.ok(block, 'STATIC_ASSETS not found in sw.js');
  const urls = [...block[1].replace(/\/\/[^\n]*/g, '').matchAll(/'([^']+)'/g)].map((m) => new URL(m[1], 'https://x/').href);
  assert.ok(urls.length > 20, 'precache list parsed');
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  assert.deepEqual(dupes, [], 'duplicate precache entries: ' + dupes.join(', '));
});

test('a duplicate precache entry is caught by the same parser (negative control)', () => {
  const fixture = "const STATIC_ASSETS = [\n  '/a.js',\n  // '/a.js' commented out is fine\n  '/b.js',\n  '/a.js',\n];";
  const urls = [.../const STATIC_ASSETS = \[([\s\S]*?)\];/.exec(fixture)[1].replace(/\/\/[^\n]*/g, '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(urls.filter((u, i) => urls.indexOf(u) !== i), ['/a.js']);
});

test('the leaderboard embed paints with its own palette, never host tokens', () => {
  const widget = fs.readFileSync(path.join(ROOT, 'api', 'leaderboard', 'v1', 'widget.js'), 'utf8');
  assert.equal(/var\(--/.test(widget), false, 'widget CSS must not read host custom properties over its fixed #0a0a0a ground');
});
