/**
 * worker.unit.spec.js — fast, hermetic unit tests for the outage-critical
 * Worker primitives (audit #14, S183). Runs under Node's built-in test runner
 * (`node --test`) with zero new dependencies and zero network — failover is
 * driven by a fake `fetchImpl`, so "hangs" resolve instantly.
 *
 *   node --test tests/worker.unit.spec.js
 *
 * Covers the three assertions the audit called out:
 *   1. toOrigin never yields the apex host (the S179 self-loop bug).
 *   2. A hanging/erroring primary fails over to the Pages origin (S177), and
 *      the abort budget is 8s.
 *   3. CSRF verify rejects tampered and expired tokens (S?? CSRF stack).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/security-headers-worker.js';
import {
  toOrigin,
  createOriginFetch,
  ORIGIN_FETCH_TIMEOUT_MS,
  drKeyFor,
  isHtmlNavRequest,
  issueCsrfToken,
  verifyCsrfToken,
  prefixAllowlist,
  makeRumUxCleaner,
  verifyObeliskSession,
  portalGateRedirect,
  independentBufferedResponse,
  OBELISK_VERIFY_DEFAULT_ENDPOINT,
  resolvePublicOrigin,
} from '../cloudflare/worker-lib.mjs';

const APEX = 'https://vaultsparkstudios.com';
const PAGES = 'https://vaultsparkstudios-website.pages.dev';

test('edge health is public, dependency-free, and method bounded', async () => {
  const ctx = { waitUntil() {} };
  const get = await worker.fetch(new Request(`${APEX}/_health`, {
    headers: { accept: 'application/json', 'user-agent': 'health-probe/1.0' },
  }), {}, ctx);
  assert.equal(get.status, 200);
  assert.deepEqual(await get.json(), { ok: true, service: 'vaultspark-edge', auth: 'obelisk' });
  assert.equal(get.headers.get('cache-control'), 'no-store');
  assert.equal(get.headers.get('x-content-type-options'), 'nosniff');

  const head = await worker.fetch(new Request(`${APEX}/_health`, {
    method: 'HEAD',
    headers: { accept: 'application/json', 'user-agent': 'health-probe/1.0' },
  }), {}, ctx);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');

  const post = await worker.fetch(new Request(`${APEX}/_health`, {
    method: 'POST',
    headers: { accept: 'application/json', 'user-agent': 'health-probe/1.0' },
  }), {}, ctx);
  assert.equal(post.status, 405);
  assert.equal((await post.json()).code, 'method_not_allowed');
});

test('public redirects keep the configured canonical origin behind a staging proxy', () => {
  assert.equal(
    resolvePublicOrigin('https://internal-worker.example/vaultsparked', 'https://website.staging.vaultsparkstudios.com'),
    'https://website.staging.vaultsparkstudios.com'
  );
  assert.equal(
    resolvePublicOrigin('https://vaultsparkstudios.com/path', 'javascript:alert(1)'),
    'https://vaultsparkstudios.com'
  );
});

test('buffered HTML cache copies consume independently without stream tees', async () => {
  const bytes = new TextEncoder().encode('<!doctype html><title>independent</title>').buffer;
  const source = new Response(bytes, { status: 200, headers: { 'content-type': 'text/html' } });
  const client = independentBufferedResponse(source, bytes);
  const nonceCache = independentBufferedResponse(source, bytes);
  const disasterRecovery = independentBufferedResponse(source, bytes);
  const bodies = await Promise.all([client.text(), nonceCache.text(), disasterRecovery.text()]);
  assert.deepEqual(bodies, Array(3).fill('<!doctype html><title>independent</title>'));
  assert.equal(client.headers.get('content-type'), 'text/html');
});

// --- 1. toOrigin -----------------------------------------------------------

test('toOrigin rewrites an apex request to the Pages host (never self-loops)', () => {
  const req = new Request(`${APEX}/membership/?ref=x`, { headers: { accept: 'text/html' } });
  const out = toOrigin(req, PAGES);
  const u = new URL(out.url);
  assert.equal(u.hostname, 'vaultsparkstudios-website.pages.dev');
  assert.notEqual(u.hostname, 'vaultsparkstudios.com');
  // Path + query preserved; only origin swapped.
  assert.equal(u.pathname, '/membership/');
  assert.equal(u.search, '?ref=x');
});

test('toOrigin preserves method and headers of the source request', () => {
  const req = new Request(`${APEX}/x`, { method: 'GET', headers: { 'x-test': '1', accept: 'text/html' } });
  const out = toOrigin(req, PAGES);
  assert.equal(out.method, 'GET');
  assert.equal(out.headers.get('x-test'), '1');
});

test('toOrigin carries a non-default port from the base origin', () => {
  const out = toOrigin(new Request(`${APEX}/p`), 'http://localhost:8788');
  const u = new URL(out.url);
  assert.equal(u.hostname, 'localhost');
  assert.equal(u.port, '8788');
  assert.equal(u.protocol, 'http:');
});

// --- 2. origin failover ----------------------------------------------------

test('abort budget is 8 seconds', () => {
  assert.equal(ORIGIN_FETCH_TIMEOUT_MS, 8000);
});

test('a hanging primary fails over to the Pages fallback', async () => {
  const calls = [];
  const fetchImpl = async (input, init) => {
    const urlStr = typeof input === 'string' ? input : input.url;
    calls.push(urlStr);
    if (urlStr.includes('-website.pages.dev')) {
      return new Response('FALLBACK OK', { status: 200 });
    }
    // Primary "hangs": reject the way AbortSignal.timeout would.
    throw new DOMException('The operation was aborted', 'TimeoutError');
  };
  const originFetch = createOriginFetch({ PRIMARY_ORIGIN: 'https://primary.example', FALLBACK_ORIGIN: PAGES, fetchImpl, cachesImpl: undefined });
  const res = await originFetch(new Request(`${APEX}/`, { headers: { accept: 'text/html' } }));
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'FALLBACK OK');
  // The primary attempt carried an abort signal (time-bounded).
  assert.ok(calls.length >= 2, 'should have attempted primary then fallback');
});

test('a primary 5xx (clean) fails over to the fallback', async () => {
  const fetchImpl = async (input) => {
    const urlStr = typeof input === 'string' ? input : input.url;
    if (urlStr.includes('-website.pages.dev') && typeof input === 'string') {
      return new Response('ok', { status: 200 });
    }
    return new Response('boom', { status: 503 });
  };
  const originFetch = createOriginFetch({ PRIMARY_ORIGIN: 'https://primary.example', FALLBACK_ORIGIN: PAGES, fetchImpl, cachesImpl: undefined });
  const res = await originFetch(new Request(`${APEX}/`, { headers: { accept: 'text/html' } }));
  assert.equal(res.status, 200);
});

test('a healthy primary is returned without touching the fallback', async () => {
  let fallbackHit = false;
  const fetchImpl = async (input) => {
    const urlStr = typeof input === 'string' ? input : input.url;
    if (typeof input === 'string' && urlStr.includes('-website.pages.dev')) { fallbackHit = true; return new Response('fb'); }
    return new Response('primary', { status: 200 });
  };
  const originFetch = createOriginFetch({ PRIMARY_ORIGIN: 'https://primary.example', FALLBACK_ORIGIN: PAGES, fetchImpl, cachesImpl: undefined });
  const res = await originFetch(new Request(`${APEX}/`, { headers: { accept: 'text/html' } }));
  assert.equal(await res.text(), 'primary');
  assert.equal(fallbackHit, false);
});

test('POST is not retried and never carries an abort signal (no double-submit)', async () => {
  let primaryInit = null;
  let attempts = 0;
  const fetchImpl = async (input, init) => {
    attempts++;
    if (input instanceof Request) primaryInit = init;
    return new Response('created', { status: 500 }); // even a 5xx must NOT trigger a retry for POST
  };
  const originFetch = createOriginFetch({ PRIMARY_ORIGIN: 'https://primary.example', FALLBACK_ORIGIN: PAGES, fetchImpl, cachesImpl: undefined });
  const res = await originFetch(new Request(`${APEX}/api`, { method: 'POST', body: 'x' }));
  assert.equal(res.status, 500);
  assert.equal(attempts, 1, 'POST must hit origin exactly once');
  assert.deepEqual(primaryInit, {}, 'POST primary fetch must pass no abort signal');
});

test('double-5xx HTML nav serves the stale DR cache copy', async () => {
  const fetchImpl = async () => new Response('down', { status: 503 });
  const cachesImpl = {
    default: {
      async match(key) {
        assert.ok(key.url.includes('_vsdr=1'), 'DR key must be used');
        return new Response('<html>stale</html>', { status: 200, headers: { 'content-type': 'text/html' } });
      },
    },
  };
  const originFetch = createOriginFetch({ PRIMARY_ORIGIN: 'https://primary.example', FALLBACK_ORIGIN: PAGES, fetchImpl, cachesImpl });
  const res = await originFetch(new Request(`${APEX}/`, { headers: { accept: 'text/html' } }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('X-VS-Disaster-Recovery'), 'stale');
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('double-5xx for a non-HTML request returns the primary error (no DR cache)', async () => {
  const fetchImpl = async () => new Response('down', { status: 503 });
  const cachesImpl = { default: { async match() { throw new Error('should not be consulted'); } } };
  const originFetch = createOriginFetch({ PRIMARY_ORIGIN: 'https://primary.example', FALLBACK_ORIGIN: PAGES, fetchImpl, cachesImpl });
  const res = await originFetch(new Request(`${APEX}/api/data.json`, { headers: { accept: 'application/json' } }));
  assert.equal(res.status, 503);
});

// --- DR key + HTML detection helpers --------------------------------------

test('drKeyFor produces a query-tagged key independent of the real query', () => {
  const a = drKeyFor(`${APEX}/page/?nonce=1`);
  const b = drKeyFor(`${APEX}/page/?nonce=2`);
  assert.equal(new URL(a.url).search, '?_vsdr=1');
  assert.equal(a.url, b.url, 'DR key must ignore the rotating query string');
});

test('isHtmlNavRequest only matches text/html accept', () => {
  assert.equal(isHtmlNavRequest(new Request(`${APEX}/`, { headers: { accept: 'text/html,application/xhtml+xml' } })), true);
  assert.equal(isHtmlNavRequest(new Request(`${APEX}/`, { headers: { accept: 'application/json' } })), false);
  assert.equal(isHtmlNavRequest(new Request(`${APEX}/`)), false);
});

// --- 3. CSRF ---------------------------------------------------------------

const ENV = { CSRF_SIGNING_KEY: 'unit-test-signing-key-do-not-ship' };

test('issued CSRF token round-trips through verify', async () => {
  const token = await issueCsrfToken(ENV);
  assert.ok(token, 'token should be issued when a signing key is present');
  assert.equal(token.split('.').length, 3);
  assert.equal(await verifyCsrfToken(ENV, token), true);
});

test('verify rejects a tampered signature', async () => {
  const token = await issueCsrfToken(ENV);
  const [ts, rand] = token.split('.');
  const forged = `${ts}.${rand}.AAAAtamperedAAAA`;
  assert.equal(await verifyCsrfToken(ENV, forged), false);
});

test('verify rejects a token signed with a different key', async () => {
  const token = await issueCsrfToken(ENV);
  assert.equal(await verifyCsrfToken({ CSRF_SIGNING_KEY: 'a-different-key' }, token), false);
});

test('verify rejects an expired token (timestamp older than the TTL)', async () => {
  // Forge a token with a 2-hour-old timestamp but a *valid* signature for it,
  // proving expiry is enforced independently of signature validity.
  const { hmacSign } = await import('../cloudflare/worker-lib.mjs');
  const oldTs = Date.now() - 2 * 60 * 60 * 1000;
  const rand = 'abcdef';
  const sig = await hmacSign(ENV.CSRF_SIGNING_KEY, `${oldTs}.${rand}`);
  const expired = `${oldTs}.${rand}.${sig}`;
  assert.equal(await verifyCsrfToken(ENV, expired), false);
});

test('verify rejects malformed tokens and missing keys', async () => {
  assert.equal(await verifyCsrfToken(ENV, ''), false);
  assert.equal(await verifyCsrfToken(ENV, 'only.two'), false);
  assert.equal(await verifyCsrfToken(ENV, 'a.b.c.d'), false);
  assert.equal(await verifyCsrfToken({}, 'a.b.c'), false, 'no signing key → reject');
  assert.equal(await issueCsrfToken({}), null, 'no signing key → no token issued');
});

// --- 4. Disaster-recovery cache (S184 dr-cache-smoke) ----------------------
// The DR cache is the last line of defense: when BOTH the primary and the
// fallback origin return 5xx (or hang), an HTML nav must be served stale HTML
// from caches.default with the X-VS-Disaster-Recovery: stale header. An
// untested failover is a hope, not a guarantee — these exercise the path so a
// regression fails CI instead of an outage.

const DR_PRIMARY = 'https://vaultsparkstudios.com';
const DR_FALLBACK = 'https://vaultsparkstudios-website.pages.dev';

function htmlNavRequest(pathQ = '/membership/') {
  return new Request(`${DR_PRIMARY}${pathQ}`, { headers: { accept: 'text/html' } });
}

// caches.default stub holding one stale entry keyed by drKeyFor(url).
function drCacheStub(url, body) {
  const key = drKeyFor(url).url;
  const stale = new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
  return { default: { match: async (req) => (req.url === key ? stale.clone() : undefined) } };
}

test('DR cache serves stale HTML with the disaster-recovery header on a double-5xx', async () => {
  const req = htmlNavRequest('/membership/');
  let calls = 0;
  const originFetch = createOriginFetch({
    PRIMARY_ORIGIN: DR_PRIMARY,
    FALLBACK_ORIGIN: DR_FALLBACK,
    fetchImpl: async () => { calls++; return new Response('upstream boom', { status: 503 }); },
    cachesImpl: drCacheStub(req.url, '<!doctype html><title>stale</title>'),
  });
  const res = await originFetch(req);
  assert.equal(res.headers.get('X-VS-Disaster-Recovery'), 'stale', 'DR header must be set');
  assert.equal(res.headers.get('Cache-Control'), 'no-store', 'stale response must not be re-cached');
  assert.equal(await res.text(), '<!doctype html><title>stale</title>', 'stale body served');
  assert.ok(calls >= 2, 'both primary and fallback were attempted before DR');
});

test('DR cache serves stale HTML when both origins HANG (not just 5xx)', async () => {
  const req = htmlNavRequest('/');
  const originFetch = createOriginFetch({
    PRIMARY_ORIGIN: DR_PRIMARY,
    FALLBACK_ORIGIN: DR_FALLBACK,
    timeoutMs: 5,
    // Reject as an aborted fetch would; failover must still reach the DR cache.
    fetchImpl: () => Promise.reject(new Error('simulated hang/abort')),
    cachesImpl: drCacheStub(req.url, '<!doctype html><title>home-stale</title>'),
  });
  const res = await originFetch(req);
  assert.equal(res.headers.get('X-VS-Disaster-Recovery'), 'stale');
  assert.equal(await res.text(), '<!doctype html><title>home-stale</title>');
});

test('DR cache miss on a double-5xx returns the upstream error, never a false 200', async () => {
  const req = htmlNavRequest('/no-snapshot/');
  const originFetch = createOriginFetch({
    PRIMARY_ORIGIN: DR_PRIMARY,
    FALLBACK_ORIGIN: DR_FALLBACK,
    fetchImpl: async () => new Response('boom', { status: 502 }),
    cachesImpl: { default: { match: async () => undefined } }, // nothing cached
  });
  const res = await originFetch(req);
  assert.equal(res.headers.get('X-VS-Disaster-Recovery'), null, 'no DR header when nothing to serve');
  assert.ok(res.status >= 500, 'honest upstream error, not a fabricated success');
});

test('DR cache is NOT consulted for non-HTML (asset/JSON) requests', async () => {
  const req = new Request(`${DR_PRIMARY}/api/uptime.json`, { headers: { accept: 'application/json' } });
  let matched = false;
  const originFetch = createOriginFetch({
    PRIMARY_ORIGIN: DR_PRIMARY,
    FALLBACK_ORIGIN: DR_FALLBACK,
    fetchImpl: async () => new Response('boom', { status: 503 }),
    cachesImpl: { default: { match: async () => { matched = true; return undefined; } } },
  });
  const res = await originFetch(req);
  assert.equal(matched, false, 'DR cache must only back HTML navs, not assets');
  assert.ok(res.status >= 500);
});

// --- RUM ux-event allowlisting (S192) --------------------------------------

test('prefixAllowlist admits a bounded family suffix and rejects unbounded input', () => {
  const match = prefixAllowlist('oracle-answer:helpful', { maxLen: 24 });
  assert.equal(match('oracle-answer:helpful:pricing'), true, 'valid clusterId suffix passes');
  assert.equal(match('oracle-answer:helpful:a-b-9'), true, 'charset [a-z0-9-] passes');
  assert.equal(match('oracle-answer:helpful:'), false, 'empty suffix rejected');
  assert.equal(match('oracle-answer:helpful:Pricing'), false, 'uppercase rejected by default charset');
  assert.equal(match('oracle-answer:helpful:free text'), false, 'spaces/free-text rejected');
  assert.equal(match('oracle-answer:helpful:' + 'x'.repeat(25)), false, 'over maxLen rejected');
  assert.equal(match('oracle-answer:unhelpful:pricing'), false, 'different family not matched');
  assert.equal(match(42), false, 'non-string rejected');
});

test('makeRumUxCleaner: exact Set wins first, then bounded dynamic families, else null', () => {
  const exact = new Set(['nav-sheet:open', 'oracle-answer:helpful']);
  const clean = makeRumUxCleaner(exact, [
    prefixAllowlist('oracle-answer:helpful', { maxLen: 24 }),
    prefixAllowlist('oracle-answer:unhelpful', { maxLen: 24 }),
  ]);
  assert.equal(clean('nav-sheet:open'), 'nav-sheet:open', 'static exact name passes through');
  assert.equal(clean('oracle-answer:helpful'), 'oracle-answer:helpful', 'static global feedback still passes');
  assert.equal(clean('oracle-answer:helpful:pricing'), 'oracle-answer:helpful:pricing', 'bounded per-cluster name admitted');
  assert.equal(clean('oracle-answer:unhelpful:vault-sso'), 'oracle-answer:unhelpful:vault-sso', 'second family admitted');
  assert.equal(clean('oracle-answer:helpful:DROP TABLE'), null, 'illegal-charset suffix dropped');
  assert.equal(clean('totally-unknown'), null, 'unknown name dropped (no silent free-text storage)');
  assert.equal(clean(null), null, 'non-string dropped');
});

test('S194: funnel + source families admit bounded names, reject free-text/PII', () => {
  const clean = makeRumUxCleaner(new Set(), [
    prefixAllowlist('funnel', { charset: /^[a-z0-9_]+$/, maxLen: 48 }),
    prefixAllowlist('source', { charset: /^[a-z]+$/, maxLen: 16 }),
  ]);
  // funnel: underscores are the funnel-tracking.js naming convention.
  assert.equal(clean('funnel:home_hero_play_click'), 'funnel:home_hero_play_click', 'hero CTA name admitted');
  assert.equal(clean('funnel:interview_start_click'), 'funnel:interview_start_click', 'interview funnel name admitted');
  assert.equal(clean('funnel:join_form_submit_started'), 'funnel:join_form_submit_started', 'form-stage name admitted');
  assert.equal(clean('funnel:DROP TABLE users'), null, 'spaces/uppercase free-text dropped');
  assert.equal(clean('funnel:' + 'x'.repeat(49)), null, 'over-48 suffix dropped');
  assert.equal(clean('funnel:'), null, 'empty funnel suffix dropped');
  // source: a single lowercase channel bucket — never a URL or hostname.
  assert.equal(clean('source:search'), 'source:search', 'search channel admitted');
  assert.equal(clean('source:direct'), 'source:direct', 'direct channel admitted');
  assert.equal(clean('source:evil.com/track?u=1'), null, 'a referrer URL can never reach storage');
  assert.equal(clean('source:Search'), null, 'uppercase rejected (canonicalize client-side)');
});

test('S194: share:<slug>:<outcome> admits bounded game shares, rejects free-text', () => {
  const clean = makeRumUxCleaner(new Set(), [
    prefixAllowlist('share', { charset: /^[a-z0-9-]+:[a-z]+$/, maxLen: 40 }),
  ]);
  assert.equal(clean('share:call-of-doodie:native'), 'share:call-of-doodie:native', 'slug:native admitted');
  assert.equal(clean('share:gridiron-gm:copy'), 'share:gridiron-gm:copy', 'slug:copy admitted');
  assert.equal(clean('share:solara:cancel'), 'share:solara:cancel', 'slug:cancel admitted');
  assert.equal(clean('share:game:native:extra'), null, 'a third segment is rejected');
  assert.equal(clean('share:Call Of Doodie:native'), null, 'spaces/uppercase free-text dropped');
  assert.equal(clean('share:only-slug'), null, 'missing outcome segment dropped');
});

// --- Obelisk verifier bridge ----------------------------------------------

test('Obelisk session verifier rejects malformed tokens before any upstream call', async () => {
  let called = false;
  const result = await verifyObeliskSession({
    token: 'short',
    env: { OBELISK_VERIFY_SECRET: 'secret' },
    fetchImpl: async () => { called = true; return new Response('{}'); },
  });
  assert.equal(called, false, 'malformed tokens must not hit the IdP');
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.code, 'invalid_token');
});

test('Obelisk session verifier fails closed when deployment secret is missing', async () => {
  let called = false;
  const result = await verifyObeliskSession({
    token: 'x'.repeat(64),
    env: {},
    fetchImpl: async () => { called = true; return new Response('{}'); },
  });
  assert.equal(called, false, 'missing secret must not call upstream');
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.code, 'missing_config');
});

test('Obelisk session verifier normalizes a verified identity and sends bearer secret only upstream', async () => {
  const calls = [];
  const result = await verifyObeliskSession({
    token: 't'.repeat(64),
    env: { OBELISK_VERIFY_SECRET: 'unit-secret' },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return Response.json({ ok: true, sub: 'user-123', exp: 1783000000, capabilities: ['studio.read'] });
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, OBELISK_VERIFY_DEFAULT_ENDPOINT);
  assert.equal(calls[0].init.headers.authorization, 'Bearer unit-secret');
  assert.equal(result.ok, true);
  assert.equal(result.identityId, 'user-123');
  assert.deepEqual(result.capabilities, ['studio.read']);
});

test('Obelisk session verifier rejects upstream success without identity id', async () => {
  const result = await verifyObeliskSession({
    token: 't'.repeat(64),
    env: { OBELISK_VERIFY_SECRET: 'unit-secret' },
    fetchImpl: async () => Response.json({ ok: true }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 502);
  assert.equal(result.code, 'identity_missing');
});
// --- portalGateRedirect (S275) ----------------------------------------------

test('portal gate redirect is a 302 with no-store (never cacheable)', () => {
  const res = portalGateRedirect('https://vaultsparkstudios.com', '/studio-hub/', '?a=1');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(res.headers.get('Vary'), 'Cookie');
  const loc = res.headers.get('Location');
  assert.ok(loc.startsWith('https://vaultsparkstudios.com/login?intent=signin&return='));
  assert.ok(loc.includes(encodeURIComponent('/studio-hub/?a=1')));
});

test('portal gate redirect tolerates an empty search string', () => {
  const res = portalGateRedirect('https://vaultsparkstudios.com', '/investor-portal/');
  assert.equal(res.status, 302);
  assert.ok(res.headers.get('Location').includes(encodeURIComponent('/investor-portal/')));
});
