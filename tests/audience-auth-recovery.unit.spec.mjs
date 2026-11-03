import test from 'node:test';
import assert from 'node:assert/strict';
import { handleObeliskAuthRequest, safeReturnPath, __test } from '../cloudflare/obelisk-auth.js';
import { portalGateRedirect } from '../cloudflare/worker-lib.mjs';

const origin = 'https://vaultsparkstudios.com';
let sequence = 0;
async function journey(returnTo, intent = 'signin') {
  const values = new Map();
  const issuer = `https://audience-${++sequence}.test`;
  const env = {
    RATE_LIMIT: {
      get: async key => values.get(key) || null,
      put: async (key, value) => values.set(key, value),
      delete: async key => values.delete(key),
    },
    OBELISK_ISSUER: issuer,
    OBELISK_SESSION_SIGNING_KEY: 'audience-test-signing-key-with-sufficient-entropy',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
  };
  let token, jwk;
  const calls = [];
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === `${issuer}/.well-known/openid-configuration`) return Response.json({
      issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks`,
    });
    if (url === `${issuer}/token`) return Response.json({ id_token: token, access_token: 'provider-access' });
    if (url === `${issuer}/jwks`) return Response.json({ keys: [jwk] });
    if (url.includes('/rest/v1/obelisk_identity_link')) return Response.json([{ user_id: 'compat-user' }]);
    if (url.includes('/auth/v1/admin/users/compat-user')) return Response.json({
      id: 'compat-user', email: 'member@example.test', app_metadata: { obelisk_sub: 'subject' },
    });
    if (url.endsWith('/auth/v1/admin/generate_link')) return Response.json({ hashed_token: 'compat-hash' });
    if (url.endsWith('/auth/v1/verify')) return Response.json({
      access_token: 'compat-access', refresh_token: 'compat-refresh', user: { id: 'compat-user' },
    });
    throw new Error('unexpected fixture request');
  };
  const startUrl = new URL('/login', origin);
  if (returnTo !== undefined) startUrl.searchParams.set('return', returnTo);
  startUrl.searchParams.set('intent', intent);
  const start = await handleObeliskAuthRequest(new Request(startUrl), env, null, { fetchImpl });
  const authorize = new URL(start.headers.get('location'));
  const state = authorize.searchParams.get('state');
  const flow = JSON.parse(values.get(`auth:flow:${state}`));
  const signed = start.headers.get('set-cookie').match(/^vs_obelisk_flow=([^;]+)/)[1];
  async function callback(query = { code: 'one-use-code' }, cookie = signed) {
    const url = new URL('/auth/callback', origin);
    url.searchParams.set('state', state);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return handleObeliskAuthRequest(new Request(url, {
      headers: cookie ? { Cookie: `vs_obelisk_flow=${cookie}` } : {},
    }), env, null, { fetchImpl });
  }
  async function prepareToken(nonce = flow.nonce) {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'key', alg: 'ES256' };
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: 'key' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: issuer, aud: 'vaultsparkstudios-website', sub: 'subject', email: 'member@example.test', email_verified: true,
      nonce, exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url');
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey,
      new TextEncoder().encode(`${header}.${payload}`));
    token = `${header}.${payload}.${Buffer.from(signature).toString('base64url')}`;
  }
  return { values, env, flow, state, signed, start, authorize, calls, callback, prepareToken };
}
function destination(response) {
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return new URL(response.headers.get('location'), origin);
}

for (const [audience, returnTo, entry] of [
  ['member', '/vault-member/settings/?tab=profile#saved', '/vault-member/'],
  ['investor', '/investor-portal/reports/?period=2026#latest', '/investor-portal/login/'],
]) {
  for (const intent of ['signin', 'signup']) {
    for (const error of ['provider_denied', 'code_missing', 'flow_expired']) {
      test(`${audience} ${intent}: ${error} recovers signed source and original intent`, async () => {
        const j = await journey(returnTo, intent);
        assert.equal(j.authorize.searchParams.get('login_hint'), intent);
        assert.equal(j.authorize.searchParams.get('code_challenge_method'), 'S256');
        if (error === 'flow_expired') j.values.delete(`auth:flow:${j.state}`);
        const query = error === 'provider_denied' ? { error: 'access_denied' } : {};
        // A callback cannot replace the signed journey, even with same-origin URLs.
        Object.assign(query, { return: '/vault-member/evil', next: '//evil.test/', audience: 'member', intent: 'signup' });
        const res = await j.callback(query);
        const url = destination(res);
        assert.equal(url.pathname, entry);
        assert.equal(url.searchParams.get('auth_error'), error);
        assert.equal(url.searchParams.get('next'), returnTo);
        assert.equal(url.searchParams.get('auth_intent'), intent);
        assert.equal(url.hash, audience === 'member' ? (intent === 'signup' ? '#register' : '#login') : '');
        assert.match(res.headers.get('set-cookie'), /Max-Age=0/);
        assert.ok(!j.calls.some(call => call.url.endsWith('/token')));
      });
    }
  }
  test(`${audience}: signed callback succeeds with PKCE and source-bound destination`, async () => {
    const j = await journey(returnTo);
    await j.prepareToken();
    const res = await j.callback({ code: 'one-use-code', return: '//evil.test/', audience: 'other' });
    assert.equal(destination(res).href, origin + returnTo);
    assert.match(res.headers.get('set-cookie'), /vs_portal_session=/);
    const tokenRequest = j.calls.find(call => call.url.endsWith('/token'));
    assert.equal(new URLSearchParams(tokenRequest.init.body).get('code_verifier'), j.flow.verifier);
    assert.equal(j.values.has(`auth:flow:${j.state}`), false);
  });
}

test('missing, tampered or mismatched flow cookie/state cannot choose an audience or reach exchange', async () => {
  for (const kind of ['missing', 'signature', 'state']) {
    const j = await journey('/investor-portal/private/');
    const res = await j.callback({ code: 'code', state: kind === 'state' ? 'hostile-state' : j.state,
      audience: 'investor', return: '/investor-portal/private/' },
    kind === 'missing' ? '' : kind === 'signature' ? `${j.signed}x` : j.signed);
    const url = destination(res);
    assert.equal(url.pathname, '/sign-in/');
    assert.equal(url.searchParams.get('auth_error'), 'state_invalid');
    assert.equal(url.searchParams.get('next'), null);
    assert.ok(!j.calls.some(call => call.url.endsWith('/token')));
    assert.ok(j.values.has(`auth:flow:${j.state}`), 'unmatched state must not consume another flow');
  }
});

test('an absent or unsafe original return cannot default failed journeys into membership', async () => {
  for (const value of [undefined, 'https://evil.test/', '//evil.test/', '/\\evil.test/', '/ok\r\nLocation:bad', '/other/']) {
    const j = await journey(value, 'signup-injected');
    j.values.clear();
    const url = destination(await j.callback());
    assert.equal(url.pathname, '/sign-in/');
    assert.equal(url.searchParams.get('next'), null);
    assert.equal(url.searchParams.get('auth_intent'), null);
    assert.equal(j.authorize.searchParams.get('login_hint'), 'signin');
  }
});

test('expired signed browser context loses recovery authority even if a flow exists', async () => {
  const j = await journey('/investor-portal/');
  const plain = await __test.verifySignedValue(j.signed, j.env);
  const payload = JSON.parse(Buffer.from(plain, 'base64url').toString());
  payload.createdAt = Date.now() - 21 * 60 * 1000;
  const signed = await __test.signedValue(Buffer.from(JSON.stringify(payload)).toString('base64url'), j.env);
  assert.equal(destination(await j.callback({}, signed)).pathname, '/sign-in/');
});

test('a mutated KV context cannot replace the signed destination or initiate token exchange', async () => {
  const j = await journey('/investor-portal/private/', 'signup');
  j.values.set(`auth:flow:${j.state}`, JSON.stringify({ ...j.flow, returnTo: '/vault-member/' }));
  const url = destination(await j.callback());
  assert.equal(url.pathname, '/investor-portal/login/');
  assert.equal(url.searchParams.get('auth_error'), 'state_invalid');
  assert.equal(url.searchParams.get('next'), '/investor-portal/private/');
  assert.ok(!j.calls.some(call => call.url.endsWith('/token')));
});

test('missing PKCE verifier fails closed using signed recovery context', async () => {
  const j = await journey('/investor-portal/private/');
  j.values.set(`auth:flow:${j.state}`, JSON.stringify({ ...j.flow, verifier: '' }));
  const url = destination(await j.callback());
  assert.equal(url.pathname, '/investor-portal/login/');
  assert.equal(url.searchParams.get('auth_error'), 'flow_expired');
  assert.ok(!j.calls.some(call => call.url.endsWith('/token')));
});

test('wrong nonce rejects validly signed provider token without issuing an edge session', async () => {
  const j = await journey('/investor-portal/private/', 'signup');
  await j.prepareToken('different-nonce');
  const res = await j.callback();
  const url = destination(res);
  assert.equal(url.pathname, '/investor-portal/login/');
  assert.equal(url.searchParams.get('auth_error'), 'bridge_failed');
  assert.equal(url.searchParams.get('auth_intent'), 'signup');
  assert.ok(!res.headers.get('set-cookie').includes('vs_portal_session='));
});

test('legacy state-only in-flight cookie still succeeds and recovers known KV context', async () => {
  const j = await journey('/investor-portal/');
  const legacy = await __test.signedValue(j.state, j.env);
  await j.prepareToken();
  assert.equal(destination(await j.callback({ code: 'code' }, legacy)).pathname, '/investor-portal/');
  const denied = await journey('/investor-portal/', 'signup');
  const deniedCookie = await __test.signedValue(denied.state, denied.env);
  assert.equal(destination(await denied.callback({ error: 'denied' }, deniedCookie)).pathname, '/investor-portal/login/');
  const expired = await journey('/investor-portal/');
  const expiredCookie = await __test.signedValue(expired.state, expired.env);
  expired.values.clear();
  assert.equal(destination(await expired.callback({}, expiredCookie)).pathname, '/sign-in/');
});

test('investor protected gates preserve safe deep link through branded gateway with no-store', () => {
  const res = portalGateRedirect(origin, '/investor-portal/reports/', '?period=2026');
  const url = destination(res);
  assert.equal(url.pathname, '/investor-portal/login/');
  assert.equal(url.searchParams.get('next'), '/investor-portal/reports/?period=2026');
  assert.equal(res.headers.get('vary'), 'Cookie');
  assert.equal(destination(portalGateRedirect(origin, '/studio-hub/', '?a=1')).pathname, '/login');
  for (const bad of ['//evil.test/', '/\\evil.test/', '/ok\r\nLocation:bad']) {
    assert.equal(safeReturnPath(bad, '/sign-in/'), '/sign-in/');
    const fallback = destination(portalGateRedirect(origin, bad));
    assert.equal(fallback.searchParams.get('return'), '/');
  }
});
