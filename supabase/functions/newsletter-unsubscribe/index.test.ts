// Unit tests for newsletter-unsubscribe. No network, no Supabase.
// Run: deno test --no-lock supabase/functions/newsletter-unsubscribe/index.test.ts
(globalThis as { __UNSUBSCRIBE_NO_SERVE__?: boolean }).__UNSUBSCRIBE_NO_SERVE__ = true;

const mod = await import('./index.ts');
const { createHandler, parseToken, PAGE_STYLE, STYLE_HASH, PAGE_CSP } = mod;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}
function eq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const KNOWN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const UNKNOWN = 'ffffffffffffffffffffffffffffffff';
const BASE = 'https://fn.test/functions/v1/newsletter-unsubscribe';

function harness(opts: { fail?: boolean } = {}) {
  const prefs = new Map<string, boolean>([[KNOWN, false]]); // token → opted_out
  const calls: string[] = [];
  const handler = createHandler({
    env: () => undefined,
    data: () => ({
      unsubscribe(token: string) {
        calls.push(token);
        if (opts.fail) return Promise.reject(new Error('db down'));
        if (!prefs.has(token)) return Promise.resolve('unknown' as const);
        prefs.set(token, true);
        return Promise.resolve('unsubscribed' as const);
      },
    }),
  });
  return { handler, prefs, calls };
}

const get = (query: string, method = 'GET') => new Request(`${BASE}${query}`, { method });
const postForm = (query: string, body: string, contentType = 'application/x-www-form-urlencoded') =>
  new Request(`${BASE}${query}`, { method: 'POST', headers: { 'content-type': contentType }, body });

Deno.test('parseToken is strict', () => {
  eq(parseToken(new URL(`${BASE}?token=${KNOWN}`)), KNOWN, 'valid');
  eq(parseToken(new URL(`${BASE}?token=${KNOWN.toUpperCase()}`)), KNOWN, 'case-normalised');
  eq(parseToken(new URL(`${BASE}`)), null, 'missing');
  eq(parseToken(new URL(`${BASE}?token=abc`)), null, 'short');
  eq(parseToken(new URL(`${BASE}?token=${KNOWN}0`)), null, 'long');
  eq(parseToken(new URL(`${BASE}?token=${'g'.repeat(32)}`)), null, 'non-hex');
  eq(parseToken(new URL(`${BASE}?token=${KNOWN}&token=${UNKNOWN}`)), null, 'duplicated');
  eq(parseToken(new URL(`${BASE}?token=%27%20OR%201=1--`)), null, 'injection-shaped');
});

Deno.test('GET renders confirmation with strict headers and does not mutate', async () => {
  const h = harness();
  const r = await h.handler(get(`?token=${KNOWN}`));
  eq(r.status, 200, 'status');
  const html = await r.text();
  eq(h.calls.length, 0, 'no data access on GET');
  eq(h.prefs.get(KNOWN), false, 'still subscribed');
  eq(r.headers.get('content-type'), 'text/html; charset=utf-8', 'content-type');
  eq(r.headers.get('x-content-type-options'), 'nosniff', 'nosniff');
  eq(r.headers.get('referrer-policy'), 'no-referrer', 'referrer');
  eq(r.headers.get('cache-control'), 'no-store', 'no-store');
  const csp = r.headers.get('content-security-policy') ?? '';
  assert(csp.includes("default-src 'none'") && csp.includes("form-action 'self'") && !csp.includes('script-src'), 'csp');
  assert(html.includes('Unsubscribe from the VaultSpark monthly member newsletter?'), 'question');
  assert(html.includes(`<form method="post" action="?token=${KNOWN}">`), 'post form');
  // CANON-042: the footer year is the current year, never a literal baked into the source.
  assert(html.includes(`© ${new Date().getUTCFullYear()} VaultSpark Studios LLC. All rights reserved.`), 'canon footer with live year');
  assert(!/©\s*20\d\d\s*VaultSpark/.test(mod.renderPage.toString()), 'no hardcoded year in the renderer');
  assert(html.includes('href="https://vaultsparkstudios.com/"'), 'brand link');
  assert(!/<script/i.test(html), 'no scripts');
  assert(!/\sstyle="/i.test(html), 'no inline style attributes (blocked by hashed CSP)');
  eq((await h.handler(get(`?token=${KNOWN}`, 'HEAD'))).status, 200, 'HEAD ok');
  eq(h.calls.length, 0, 'HEAD does not mutate');
});

Deno.test('CSP style hash matches the served stylesheet', async () => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(PAGE_STYLE));
  const expected = `sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}`;
  eq(STYLE_HASH, expected, 'hash');
  assert(PAGE_CSP.includes(`'${expected}'`), 'csp carries hash');
});

Deno.test('malformed token is rejected with 400 on GET and POST without data access', async () => {
  const h = harness();
  eq((await h.handler(get('?token=not-a-token'))).status, 400, 'GET malformed');
  eq((await h.handler(get(''))).status, 400, 'GET missing');
  eq((await h.handler(postForm('?token=zzz', 'List-Unsubscribe=One-Click'))).status, 400, 'POST malformed');
  eq(h.calls.length, 0, 'no data access');
});

Deno.test('RFC 8058 one-click POST unsubscribes and returns 200 text', async () => {
  const h = harness();
  const r = await h.handler(postForm(`?token=${KNOWN}`, 'List-Unsubscribe=One-Click'));
  eq(r.status, 200, 'status');
  assert((r.headers.get('content-type') ?? '').startsWith('text/plain'), 'plain');
  eq(h.prefs.get(KNOWN), true, 'opted out');
  const again = await h.handler(postForm(`?token=${KNOWN}`, 'List-Unsubscribe=One-Click'));
  eq(again.status, 200, 'idempotent');
});

Deno.test('one-click also accepted as multipart/form-data', async () => {
  const h = harness();
  const fd = new FormData();
  fd.set('List-Unsubscribe', 'One-Click');
  const probe = new Request('https://x.test', { method: 'POST', body: fd });
  const ct = probe.headers.get('content-type')!;
  const body = await probe.text();
  const r = await h.handler(postForm(`?token=${KNOWN}`, body, ct));
  eq(r.status, 200, 'status');
  eq(h.prefs.get(KNOWN), true, 'opted out');
});

Deno.test('confirmation form POST unsubscribes and renders done page with re-subscribe path', async () => {
  const h = harness();
  const r = await h.handler(postForm(`?token=${KNOWN}`, 'confirm=yes'));
  eq(r.status, 200, 'status');
  eq(r.headers.get('content-type'), 'text/html; charset=utf-8', 'html');
  const html = await r.text();
  assert(html.includes("You're unsubscribed"), 'done heading');
  assert(html.includes('https://vaultsparkstudios.com/vault-member/'), 'resubscribe via portal');
  eq(h.prefs.get(KNOWN), true, 'opted out');
});

Deno.test('unknown token gets the same neutral success response', async () => {
  const h = harness();
  const known = await h.handler(postForm(`?token=${KNOWN}`, 'confirm=yes'));
  const unknown = await h.handler(postForm(`?token=${UNKNOWN}`, 'confirm=yes'));
  eq(unknown.status, known.status, 'same status');
  eq(await unknown.text(), await known.text(), 'same body');
  const oneClick = await h.handler(postForm(`?token=${UNKNOWN}`, 'List-Unsubscribe=One-Click'));
  eq(oneClick.status, 200, 'one-click neutral');
  eq(h.calls.length, 3, 'unknown tokens still reach the data layer');
});

Deno.test('POST without a recognised intent does not mutate', async () => {
  const h = harness();
  eq((await h.handler(postForm(`?token=${KNOWN}`, ''))).status, 400, 'empty body');
  eq((await h.handler(postForm(`?token=${KNOWN}`, 'List-Unsubscribe=Maybe'))).status, 400, 'wrong value');
  eq((await h.handler(postForm(`?token=${KNOWN}`, '{"List-Unsubscribe":"One-Click"}', 'application/json'))).status, 415, 'json');
  eq((await h.handler(postForm(`?token=${KNOWN}`, `confirm=yes&pad=${'x'.repeat(3000)}`))).status, 413, 'oversized');
  eq(h.calls.length, 0, 'no data access');
  eq(h.prefs.get(KNOWN), false, 'still subscribed');
});

Deno.test('other methods are 405', async () => {
  const h = harness();
  const r = await h.handler(new Request(`${BASE}?token=${KNOWN}`, { method: 'PUT', body: 'x' }));
  eq(r.status, 405, 'status');
  eq(h.calls.length, 0, 'no data access');
});

Deno.test('database failure is 503 and never claims success', async () => {
  const h = harness({ fail: true });
  const one = await h.handler(postForm(`?token=${KNOWN}`, 'List-Unsubscribe=One-Click'));
  eq(one.status, 503, 'one-click 503');
  const form = await h.handler(postForm(`?token=${KNOWN}`, 'confirm=yes'));
  eq(form.status, 503, 'form 503');
  assert(!(await form.text()).includes("You're unsubscribed"), 'no false success');
});
