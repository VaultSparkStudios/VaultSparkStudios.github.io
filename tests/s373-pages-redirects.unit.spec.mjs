import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { parsePagesRedirects, matchPagesRedirect, redirectLocation, pagesRedirectResponse, resetPagesRedirectsCache, PAGES_REDIRECTS_TTL_MS } from '../cloudflare/pages-redirects.js';

// S373: staging answers retired routes the way production does. Every expectation in
// the first test was MEASURED against the production Pages origin on 2026-10-10, using
// this repository's real `_redirects`, so the emulation is pinned to observed behaviour.
const ROOT = path.resolve(import.meta.dirname, '..');
const REAL = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');
const ORIGIN = 'https://website.staging.vaultsparkstudios.com';

function resolve(pathAndQuery, rules = parsePagesRedirects(REAL)) {
  const url = new URL(pathAndQuery, ORIGIN);
  const hit = matchPagesRedirect(rules, url.pathname);
  return hit ? [hit.status, redirectLocation(hit.to, url.search, ORIGIN)] : null;
}

test('the real _redirects resolves exactly as production was observed to', () => {
  const observed = [
    ['/journal/?x=1', '/changelog/?x=1#stories'],
    ['/journal', '/changelog/#stories'],
    ['/journal/archive/old-post/?y=2', '/changelog/?y=2#stories'],
    ['/vaultspark-football-gm/play/index.html', '/games/franchise-architect/play/index.html'],
    ['/franchise-architect/game.html', '/games/franchise-architect/'],
    ['/stats', '/evidence/#numbers'],
    ['/notebook/anything/here', '/studio-pulse/#forge-ledger'],
  ];
  for (const [request, location] of observed) assert.deepEqual(resolve(request), [301, `${ORIGIN}${location}`], request);
});

test('every rule in the real file is understood, and served pages are left alone', () => {
  const written = REAL.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).length;
  assert.equal(parsePagesRedirects(REAL).length, written, 'a rule this module cannot parse would silently not apply on staging');
  for (const served of ['/', '/games/', '/changelog/', '/journal/first-sparks/', '/news/', '/stats.json', '/ask-founders/submit']) assert.equal(resolve(served), null, served);
});

test('parsing skips what it does not implement instead of guessing', () => {
  const rules = parsePagesRedirects([
    '# comment', '', '/old /new/ 301', '/tree/* /dest/:splat 302', '/force /x/ 301!', '/default /y/',
    '/rewrite /z/ 200', '/named/:id /w/:id 301', '/mid/*/x /q/ 301', 'no-slash /a/ 301', '/ext https://example.com/ 308',
  ].join('\n'));
  assert.deepEqual(rules.map((r) => [r.from, r.status]), [['/old', 301], ['/tree/*', 302], ['/force', 301], ['/default', 302], ['/ext', 308]]);
  assert.deepEqual(matchPagesRedirect(rules, '/tree/a/b'), { to: '/dest/a/b', status: 302 });
  assert.deepEqual(matchPagesRedirect(rules, '/tree/'), { to: '/dest/', status: 302 });
  assert.equal(matchPagesRedirect(rules, '/tree'), null, 'a splat needs its slash, as the real file shows by listing both forms');
  assert.equal(redirectLocation('https://example.com/', '?a=1', ORIGIN), 'https://example.com/');
});

test('the first matching rule wins', () => {
  const rules = parsePagesRedirects('/a/special /one/ 301\n/a/* /two/ 301');
  assert.equal(matchPagesRedirect(rules, '/a/special').to, '/one/');
  assert.equal(matchPagesRedirect(rules, '/a/other').to, '/two/');
});

test('the edge Worker applies _redirects only when the staging flag is set', async () => {
  const { default: worker } = await import('../cloudflare/security-headers-worker.js');
  const realFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (input) => {
    const target = new URL(typeof input === 'string' ? input : input.url);
    requested.push(target.pathname);
    if (target.pathname === '/_redirects') return new Response(REAL, { status: 200, headers: { 'content-type': 'text/plain' } });
    throw new Error(`unexpected origin fetch in a hermetic test: ${target.pathname}`);
  };
  try {
    resetPagesRedirectsCache();
    const env = { PAGES_REDIRECTS_EMULATION: '1', PUBLIC_ORIGIN: ORIGIN, PRIMARY_ORIGIN: 'https://website-origin.staging.vaultsparkstudios.com', EDGE_CACHE_ENABLED: '0' };
    const ctx = { waitUntil() {} };
    const get = (p) => worker.fetch(new Request(`${ORIGIN}${p}`, { headers: { accept: 'text/html' } }), env, ctx);
    const retired = await get('/journal/?x=1');
    assert.equal(retired.status, 301);
    assert.equal(retired.headers.get('Location'), `${ORIGIN}/changelog/?x=1#stories`);
    const splat = await get('/vaultspark-football-gm/play/');
    // The Worker's own legacy map answers this one first, exactly as on production.
    assert.equal(splat.status, 301);
    assert.equal(splat.headers.get('Location'), `${ORIGIN}/games/franchise-architect/`);
    assert.deepEqual([...new Set(requested)], ['/_redirects']);

    // Flag off (production): the file is never requested.
    resetPagesRedirectsCache();
    requested.length = 0;
    await worker.fetch(new Request(`${ORIGIN}/journal/`, { headers: { accept: 'text/html' } }), { ...env, PAGES_REDIRECTS_EMULATION: undefined }, ctx).catch(() => null);
    assert.equal(requested.includes('/_redirects'), false);
  } finally {
    globalThis.fetch = realFetch;
    resetPagesRedirectsCache();
  }
});

test('only the staging environment sets the emulation flag', () => {
  const toml = fs.readFileSync(path.join(ROOT, 'cloudflare', 'wrangler.toml'), 'utf8');
  const stagingAt = toml.indexOf('[env.staging]');
  assert.ok(stagingAt > 0);
  assert.equal(toml.slice(0, stagingAt).includes('PAGES_REDIRECTS_EMULATION'), false, 'production must keep getting redirects from Pages itself');
  assert.match(toml.slice(stagingAt), /^PAGES_REDIRECTS_EMULATION = "1"$/m);
});

test('the Worker hook redirects, caches the file, and never fails a request', async () => {
  resetPagesRedirectsCache();
  let fetches = 0;
  const originFetch = async (request) => { fetches += 1; assert.equal(new URL(request.url).pathname, '/_redirects'); return new Response(REAL, { status: 200 }); };
  const first = await pagesRedirectResponse(new URL(`${ORIGIN}/journal/?x=1`), { originFetch, publicOrigin: ORIGIN, now: 1_000 });
  assert.equal(first.status, 301);
  assert.equal(first.headers.get('Location'), `${ORIGIN}/changelog/?x=1#stories`);
  assert.equal(await pagesRedirectResponse(new URL(`${ORIGIN}/games/`), { originFetch, publicOrigin: ORIGIN, now: 2_000 }), null);
  assert.equal(fetches, 1, 'the parsed file is reused inside the TTL');
  await pagesRedirectResponse(new URL(`${ORIGIN}/stats`), { originFetch, publicOrigin: ORIGIN, now: 2_000 + PAGES_REDIRECTS_TTL_MS + 1 });
  assert.equal(fetches, 2, 'and re-read after it');

  resetPagesRedirectsCache();
  assert.equal(await pagesRedirectResponse(new URL(`${ORIGIN}/journal/`), { originFetch: async () => new Response('nope', { status: 404 }), publicOrigin: ORIGIN }), null, 'a missing file declines');
  assert.equal(await pagesRedirectResponse(new URL(`${ORIGIN}/journal/`), { originFetch: async () => { throw new Error('origin down'); }, publicOrigin: ORIGIN }), null, 'an origin error declines');
});
