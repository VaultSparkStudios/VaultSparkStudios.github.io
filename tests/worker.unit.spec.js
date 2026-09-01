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
import { validateAgentAction } from '../cloudflare/agent-actions.js';
import {
  toOrigin,
  createOriginFetch,
  ORIGIN_FETCH_TIMEOUT_MS,
  drKeyFor,
  isHtmlNavRequest,
  issueCsrfToken,
  verifyCsrfToken,
  verifyTurnstileToken,
  prefixAllowlist,
  makeRumUxCleaner,
  cleanAttentionLabel,
  verifyObeliskSession,
  portalGateRedirect,
  independentBufferedResponse,
  OBELISK_VERIFY_DEFAULT_ENDPOINT,
  cleanSlug,
  validReaction,
  handleDeskReaction,
  handleDeskPresence,
  deskPresenceBand,
  resolvePublicOrigin,
  isAllowedWebPushEndpoint,
  validatePushSubscription,
} from '../cloudflare/worker-lib.mjs';

test('agent action contract is scope-bound and fixed-vocabulary', () => {
  const scopes = new Set(['vaultspark:feedback:write']);
  assert.equal(validateAgentAction({ action: 'feedback.submit', input: { pagePath: '/proof/', answer: 'useful' } }, scopes).ok, true);
  assert.equal(validateAgentAction({ action: 'feedback.submit', input: { pagePath: '/proof/', answer: 'free text' } }, scopes).code, 'invalid_answer');
  assert.equal(validateAgentAction({ action: 'feedback.submit', input: { pagePath: '/proof/', answer: 'useful' } }, new Set()).code, 'scope_required');
  assert.equal(validateAgentAction({ action: 'delete.everything', input: {} }, scopes).code, 'action_not_allowed');
});

test('Turnstile rejects tokenless and invalid paths, accepts verified path', async () => {
  const tokenless = await verifyTurnstileToken({ token: '', secret: 'secret', fetchImpl: async () => { throw new Error('must not call'); } });
  assert.deepEqual(tokenless, { ok: false, error: 'turnstile_token_missing' });

  const invalid = await verifyTurnstileToken({
    token: 'invalid-token',
    secret: 'secret',
    fetchImpl: async () => new Response(JSON.stringify({ success: false }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  });
  assert.deepEqual(invalid, { ok: false, error: 'turnstile_invalid' });

  let requestBody = '';
  const valid = await verifyTurnstileToken({
    token: 'verified-token',
    ip: '203.0.113.9',
    secret: 'secret',
    fetchImpl: async (_url, init) => {
      requestBody = init.body.toString();
      return new Response(JSON.stringify({ success: true, hostname: 'vaultsparkstudios.com' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  assert.deepEqual(valid, { ok: true, hostname: 'vaultsparkstudios.com' });
  assert.match(requestBody, /response=verified-token/);
  assert.match(requestBody, /remoteip=203\.0\.113\.9/);
});

const APEX = 'https://vaultsparkstudios.com';
const PAGES = 'https://vaultsparkstudios-website.pages.dev';

const PUSH_KEYS = Object.freeze({
  p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString('base64url'),
  auth: Buffer.alloc(16, 9).toString('base64url'),
});

function pushSubscription(id = 'one') {
  return { endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, keys: { ...PUSH_KEYS }, route: '/news/', lastGame: 'forge' };
}

function fakePushKv(seed = new Map()) {
  const entries = new Map(seed);
  return {
    entries,
    puts: [],
    deletes: [],
    async get(key) { return entries.get(key) ?? null; },
    async put(key, value, options) { this.puts.push({ key, value, options }); entries.set(key, value); },
    async delete(key) { this.deletes.push(key); entries.delete(key); },
    async list({ prefix, limit }) {
      const keys = [...entries.keys()].filter((key) => key.startsWith(prefix)).slice(0, limit).map((name) => ({ name }));
      return { keys, list_complete: [...entries.keys()].filter((key) => key.startsWith(prefix)).length <= limit };
    },
  };
}

async function pushRequest(kv, body, { origin = APEX, ip = '203.0.113.7', method = 'POST' } = {}) {
  return worker.fetch(new Request(`${APEX}/v/push-subscribe`, {
    method,
    headers: { origin, 'content-type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify(body),
  }), { RATE_LIMIT: kv }, { waitUntil() {} });
}

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

test('attention labels are a fixed surface and coarse visit-depth pair', () => {
  assert.equal(cleanAttentionLabel('pwa-install|first'), 'pwa-install|first');
  assert.equal(cleanAttentionLabel('weekly-recap|established'), 'weekly-recap|established');
  assert.equal(cleanAttentionLabel('pwa-install|visitor-42'), null);
  assert.equal(cleanAttentionLabel('free-text|returning'), null);
  assert.equal(cleanAttentionLabel('pwa-install|first|extra'), null);
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

/* ── Desk reactions (S310) ────────────────────────────────────────────────
   The endpoint writes to shared KV from unauthenticated public traffic, so its
   input validation is the whole security boundary. Tested here rather than
   discovered in production. */
test('reaction ids: only the known set and well-formed voice ids are accepted', () => {
  assert.equal(validReaction('changed-my-mind'), 'changed-my-mind');
  assert.equal(validReaction('voice:vera'), 'voice:vera');
  assert.equal(validReaction('made-up-reaction'), null);
  assert.equal(validReaction('voice:'), null);
  // A voice id is the KV key suffix — anything that is not plain lowercase
  // letters could shape the key space from outside.
  assert.equal(validReaction('voice:../../etc'), null);
  assert.equal(validReaction('voice:VERA'), null);
  assert.equal(validReaction(''), null);
  assert.equal(validReaction(null), null);
});

test('reaction slug is sanitised to path-safe characters and bounded', () => {
  assert.equal(cleanSlug('2026-08-10/a-story'), '2026-08-10/a-story');
  assert.equal(cleanSlug('bad key$%^&*'), 'badkey');
  assert.ok(cleanSlug('x'.repeat(400)).length <= 120);
  assert.equal(cleanSlug(null), '');
});

test('reaction GET with no KV bound reports storage unavailable, never a fake count', async () => {
  const res = await handleDeskReaction(
    new Request('https://x.test/v/desk-reaction?slug=2026-08-10/a-story'),
    {},
  );
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.counts, {});
  assert.equal(body.storage, 'unavailable');
});

test('reaction POST rejects an unknown reaction before touching storage', async () => {
  let wrote = false;
  const env = { RATE_LIMIT: { get: async () => null, put: async () => { wrote = true; } } };
  const res = await handleDeskReaction(new Request('https://x.test/v/desk-reaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: '2026-08-10/a-story', reaction: 'nope' }),
  }), env);
  assert.equal(res.status, 400);
  assert.equal(wrote, false, 'a rejected reaction must not write to KV');
});

test('reaction POST increments a real count and dedupes the second identical vote', async () => {
  const store = new Map();
  const env = {
    RATE_LIMIT: {
      get: async (k) => (store.has(k) ? store.get(k) : null),
      put: async (k, v) => { store.set(k, v); },
    },
  };
  const req = () => new Request('https://x.test/v/desk-reaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' },
    body: JSON.stringify({ slug: '2026-08-10/a-story', reaction: 'changed-my-mind' }),
  });

  const first = await (await handleDeskReaction(req(), env)).json();
  assert.equal(first.counts['changed-my-mind'], 1);

  const second = await (await handleDeskReaction(req(), env)).json();
  assert.equal(second.alreadyCounted, true);
  assert.equal(second.counts['changed-my-mind'], 1, 'the same reader must not be able to inflate the count');
});

test('Desk presence suppresses exact low counts', () => {
  assert.deepEqual(deskPresenceBand(0), { activeReaders: 0, activeBand: 'none' });
  assert.deepEqual(deskPresenceBand(2), { activeReaders: null, activeBand: 'one-or-two' });
  assert.deepEqual(deskPresenceBand(4), { activeReaders: 4, activeBand: 'three-to-nine' });
});

test('Desk presence stores only ephemeral hashes and returns a bounded public band', async () => {
  const store = new Map();
  const env = { RATE_LIMIT: {
    get: async (key) => store.get(key) || null,
    put: async (key, value) => { store.set(key, value); },
    list: async ({ prefix }) => ({ keys: [...store.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })) }),
  } };
  const request = new Request('https://x.test/v/desk-presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.10' },
    body: JSON.stringify({ kind: 'presence', slug: '2026-08-11/a-story', session: 'abcdefghijklmnop' }),
  });
  assert.equal((await handleDeskPresence(request, env)).status, 202);
  assert.equal([...store.keys()].some((key) => key.includes('203.0.113.10') || key.includes('abcdefghijklmnop')), false);
  const body = await (await handleDeskPresence(new Request('https://x.test/v/desk-presence?slug=2026-08-11/a-story'), env)).json();
  assert.equal(body.activeBand, 'one-or-two');
  assert.equal(body.activeReaders, null);
});

test('Desk engagement writes one identifier-free summary and dedupes repeats', async () => {
  const store = new Map();
  const rows = [];
  const pending = [];
  const env = {
    RATE_LIMIT: {
      get: async (key) => store.get(key) || null,
      put: async (key, value) => { store.set(key, value); },
      list: async () => ({ keys: [] }),
    },
    RUM_BUCKET: { put: async (_key, value) => { rows.push(JSON.parse(value)); } },
  };
  const ctx = { waitUntil(promise) { pending.push(promise); } };
  const make = () => new Request('https://x.test/v/desk-presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.11' },
    body: JSON.stringify({ kind: 'summary', slug: '2026-08-11/a-story', session: 'abcdefghijklmnop', engagedSeconds: 87 }),
  });
  assert.equal((await handleDeskPresence(make(), env, ctx)).status, 202);
  await Promise.all(pending.splice(0));
  const second = await (await handleDeskPresence(make(), env, ctx)).json();
  assert.equal(second.state, 'already-counted');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    schemaVersion: '1.1', ts: rows[0].ts, route: '/news/2026-08-11/a-story/',
    slug: '2026-08-11/a-story', engagedSeconds: 87, measurement: 'visible-and-focused-seconds',
  });
  // S317: no idleBand was sent, so none is stored — the field is omitted, not
  // defaulted. A default would invent an away-time observation nobody made.
  assert.ok(!('idleBand' in rows[0]));
});

test('desk presence stores an allow-listed idle BAND and rejects anything else', async () => {
  const pending = [];
  const rows = [];
  const store = new Map();
  const env = {
    RATE_LIMIT: {
      get: async (key) => store.get(key) || null,
      put: async (key, value) => { store.set(key, value); },
      list: async () => ({ keys: [] }),
    },
    RUM_BUCKET: { put: async (_key, value) => { rows.push(JSON.parse(value)); } },
  };
  const ctx = { waitUntil(promise) { pending.push(promise); } };
  const send = (idleBand, session) => handleDeskPresence(new Request('https://x.test/v/desk-presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.12' },
    body: JSON.stringify({ kind: 'summary', slug: '2026-08-11/a-story', session, engagedSeconds: 42, idleBand }),
  }), env, ctx);

  assert.equal((await send('120to599', 'sessionaaaaaaaaaa')).status, 202);
  await Promise.all(pending.splice(0));
  assert.equal(rows[0].idleBand, '120to599');

  // A free-text value must never reach storage: an unvalidated field on an
  // identifier-free row is how a precise duration (and a behavioural
  // fingerprint) sneaks back in past D-S315.3.
  assert.equal((await send('427.318', 'sessionbbbbbbbbbb')).status, 202);
  await Promise.all(pending.splice(0));
  assert.ok(!('idleBand' in rows[1]), 'an unrecognised idle value is dropped, never stored');
});

test('push subscriptions require a known HTTPS Web Push host and exact browser key shapes', () => {
  assert.equal(isAllowedWebPushEndpoint('https://fcm.googleapis.com/fcm/send/abc'), true);
  assert.equal(isAllowedWebPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc'), true);
  assert.equal(isAllowedWebPushEndpoint('https://web.push.apple.com/Qx/abc'), true);
  assert.equal(isAllowedWebPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=abc'), true);
  assert.equal(isAllowedWebPushEndpoint('http://fcm.googleapis.com/fcm/send/abc'), false);
  assert.equal(isAllowedWebPushEndpoint('https://attacker.example/push'), false);
  assert.equal(validatePushSubscription(pushSubscription()).valid, true);
  assert.deepEqual(validatePushSubscription({ ...pushSubscription(), keys: { ...PUSH_KEYS, auth: 'short' } }).errors, ['invalid_auth']);
  assert.deepEqual(validatePushSubscription({ ...pushSubscription(), keys: { ...PUSH_KEYS, p256dh: Buffer.alloc(65, 7).toString('base64url') } }).errors, ['invalid_p256dh']);
});

test('push enrollment rejects cross-origin and attacker-selected endpoints before KV mutation', async () => {
  const kv = fakePushKv();
  const crossOrigin = await pushRequest(kv, pushSubscription(), { origin: 'https://evil.example' });
  assert.equal(crossOrigin.status, 403);
  assert.equal((await crossOrigin.json()).error, 'invalid_origin');
  const hostile = await pushRequest(kv, { ...pushSubscription(), endpoint: 'https://evil.example/callback' });
  assert.equal(hostile.status, 400);
  assert.equal((await hostile.json()).error, 'invalid_subscription');
  assert.equal(kv.puts.length, 0);
});

test('push enrollment stores one bounded active row and deduplicates key refreshes', async () => {
  const kv = fakePushKv();
  const first = await pushRequest(kv, pushSubscription());
  assert.equal(first.status, 201);
  assert.equal((await first.json()).activeSubscriptions, 1);
  const second = await pushRequest(kv, pushSubscription());
  assert.equal(second.status, 200);
  assert.equal((await second.json()).deduplicated, true);
  assert.equal([...kv.entries.keys()].filter((key) => key.startsWith('vs:push:sub:')).length, 1);
  assert.equal(kv.puts.filter((put) => put.key.startsWith('vs:push:quota:ip:')).length, 1);
});

test('push enrollment enforces per-IP daily and global active-set caps', async () => {
  const perIp = fakePushKv();
  for (let i = 0; i < 5; i++) assert.equal((await pushRequest(perIp, pushSubscription(`per-ip-${i}`))).status, 201);
  const sixth = await pushRequest(perIp, pushSubscription('per-ip-6'));
  assert.equal(sixth.status, 429);
  assert.equal((await sixth.json()).error, 'enrollment_rate_limited');

  const full = new Map(Array.from({ length: 1000 }, (_, i) => [`vs:push:sub:seed-${i}`, JSON.stringify(pushSubscription(`seed-${i}`))]));
  const global = fakePushKv(full);
  const capped = await pushRequest(global, pushSubscription('over-cap'), { ip: '203.0.113.99' });
  assert.equal(capped.status, 503);
  assert.equal((await capped.json()).error, 'enrollment_capacity_reached');
  assert.equal([...global.entries.keys()].filter((key) => key.startsWith('vs:push:sub:')).length, 1000);
});

test('push enrollment quarantines a malformed legacy dedupe row before replacement', async () => {
  const sub = pushSubscription('legacy-corrupt');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub.endpoint));
  const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
  const key = `vs:push:sub:${hash}`;
  const kv = fakePushKv(new Map([[key, '{not-json']]));
  const response = await pushRequest(kv, sub);
  assert.equal(response.status, 201);
  assert.equal(kv.deletes.includes(key), true);
  assert.equal([...kv.entries.keys()].some((candidate) => candidate.startsWith(`vs:push:quarantine:${hash}:`)), true);
  assert.equal(validatePushSubscription(JSON.parse(kv.entries.get(key))).valid, true);
});

test('S321: an unhandled throw anywhere in the edge handler becomes an honest 503, never Cloudflare 1101', async () => {
  // Production served a bare `HTTP 500` / "error code: 1101" twice — the S319 KV
  // write-quota exhaustion and the earlier oidc_discovery_invalid throw — because
  // nothing caught what escaped the handler. Both roots are fixed at source; this
  // is the boundary that makes the NEXT one degrade instead of taking the edge down
  // opaquely. It must stay observable, not swallow silently (CANON-031).
  const original = worker.handle;
  const errors = [];
  const consoleError = console.error;
  console.error = (...args) => errors.push(args);
  try {
    worker.handle = async () => { throw new Error('simulated unhandled edge failure'); };
    const response = await worker.fetch(
      new Request('https://vaultsparkstudios.com/login'), {}, { waitUntil() {} },
    );
    assert.equal(response.status, 503, 'an escaped throw is a named 503, not a 1101');
    assert.equal(response.headers.get('Cache-Control'), 'no-store', 'a failure must never be cached');
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.code, 'edge_handler_unavailable');
    assert.equal(body.route, '/login', 'the failing route is named so the outage is diagnosable');
    assert.equal(errors.length, 1, 'the boundary logs rather than silently absorbing the failure');
  } finally {
    worker.handle = original;
    console.error = consoleError;
  }
});

test('S321: the last-resort boundary does not intercept a healthy response', async () => {
  // Mutation guard: a boundary that returned 503 unconditionally would pass the
  // test above while breaking every route. The healthy branch must pass through
  // untouched.
  const original = worker.handle;
  try {
    worker.handle = async () => new Response('ok', { status: 200 });
    const response = await worker.fetch(
      new Request('https://vaultsparkstudios.com/'), {}, { waitUntil() {} },
    );
    assert.equal(response.status, 200, 'a healthy handler response is returned unchanged');
    assert.equal(await response.text(), 'ok');
  } finally {
    worker.handle = original;
  }
});

test('S335: Trusted Types enforce is a one-variable flip with report-only as the default', async () => {
  const ctx = { waitUntil() {} };
  const req = () => new Request(`${APEX}/_health`, { headers: { accept: 'application/json' } });
  const reportOnly = await worker.fetch(req(), {}, ctx);
  assert.equal(reportOnly.headers.get('content-security-policy-report-only'), "require-trusted-types-for 'script'; report-to vs-tt");
  assert.ok(!(reportOnly.headers.get('content-security-policy') || '').includes('require-trusted-types-for'), 'default policy does not enforce');

  const enforced = await worker.fetch(req(), { TT_ENFORCE_ENABLED: '1' }, ctx);
  assert.equal(enforced.headers.get('content-security-policy-report-only'), null, 'report-only header dropped under enforce');
  assert.ok((enforced.headers.get('content-security-policy') || '').includes("require-trusted-types-for 'script'"), 'live policy carries the directive');
  assert.equal(enforced.headers.get('reporting-endpoints'), 'vs-tt="/v/tt-report"', 'reports still route to the intake');

  // The flag is per-request: a following request without it must fall back.
  const after = await worker.fetch(req(), {}, ctx);
  assert.ok(after.headers.get('content-security-policy-report-only'), 'no state leaks between requests');
});
