import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {
  safeReturnPath,
  verifyObeliskIdToken,
  ensureSupabaseIdentityLink,
  issueSupabaseCompatibilitySession,
  authenticateObeliskRequest,
  handleObeliskAuthRequest,
  revokeObeliskTokens,
  endSessionUrl,
  supabaseSessionFresh,
  linkFailureCode,
  linkFailureReceipt,
  LINK_FAILURE_CODES,
  journeyReceipt,
  __test,
} from '../cloudflare/obelisk-auth.js';

test('S305: journey receipts are bounded and identifier-free even under hostile detail', () => {
  const hostile = {
    attempted: true,
    revoked: ['refresh_token', 'access_token'],
    failed: [],
    reason: 'user f@x.com sub obk_9f2 token eyJhbGciOiJFUzI1NiJ9.payload.sig',
    email: 'f@x.com',
    sub: 'obk_9f2',
  };
  const logout = journeyReceipt('logout', hostile);
  const serialized = JSON.stringify(logout);
  assert.equal(logout.leg, 'logout');
  assert.equal(logout.attempted, true);
  assert.equal(logout.revoked, 2);
  assert.equal(logout.failed, 0);
  assert.equal(logout.reason, null, 'a reason outside the bounded set must not pass through');
  assert.ok(!/@|eyJ|obk_/.test(serialized), 'no email/JWT/subject shapes may survive');

  const callback = journeyReceipt('callback', hostile);
  assert.deepEqual(Object.keys(callback).sort(), ['at', 'leg', 'version'], 'non-logout legs carry no detail at all');

  assert.equal(journeyReceipt('evil-leg').leg, 'unknown');
  assert.equal(journeyReceipt('logout', { reason: 'not_implemented', attempted: false }).reason, 'not_implemented');
});

class FakeKv {
  constructor() { this.values = new Map(); }
  async get(key) { return this.values.get(key) || null; }
  async put(key, value) { this.values.set(key, value); }
  async delete(key) { this.values.delete(key); }
}

function response(body, status = 200) {
  return Response.json(body, { status });
}

function cookieValue(headers, name) {
  const values = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie') || ''];
  const match = values.join('\n').match(new RegExp(`(?:^|\\n|,\\s*)${name}=([^;]*)`));
  return match?.[1] || null;
}

function b64url(value) {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(value);
  return Buffer.from(bytes).toString('base64url');
}

async function identityFixture({ issuer = 'https://identity.test', audience = 'vaultsparkstudios-website', nonce = 'nonce-1' } = {}) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  Object.assign(jwk, { kid: 'current', use: 'sig', alg: 'ES256' });
  const claims = {
    iss: issuer,
    aud: audience,
    sub: 'obl_person_123',
    email: 'member@example.com',
    email_verified: true,
    name: 'Vault Member',
    nonce,
    iat: Math.floor(Date.now() / 1000) - 5,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const header = b64url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'current' }));
  const payload = b64url(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(`${header}.${payload}`)
  );
  return { token: `${header}.${payload}.${b64url(new Uint8Array(signature))}`, claims, jwk };
}

test('safeReturnPath permits only bounded same-origin paths', () => {
  assert.equal(safeReturnPath('/investor-portal/?tab=updates'), '/investor-portal/?tab=updates');
  assert.equal(safeReturnPath('https://evil.example/x'), '/vault-member/');
  assert.equal(safeReturnPath('//evil.example/x'), '/vault-member/');
  assert.equal(safeReturnPath('/ok\r\nSet-Cookie:x=1'), '/vault-member/');
});

test('signed session values reject tampering', async () => {
  const env = { CSRF_SIGNING_KEY: 'test-signing-key-with-sufficient-entropy' };
  const signed = await __test.signedValue('session_123', env);
  assert.equal(await __test.verifySignedValue(signed, env), 'session_123');
  assert.equal(await __test.verifySignedValue(`${signed}x`, env), null);
});

test('corrupt flow state fails closed before token exchange', async () => {
  const kv = new FakeKv();
  const env = {
    RATE_LIMIT: kv,
    CSRF_SIGNING_KEY: 'corrupt-flow-signing-key-with-sufficient-entropy',
    OBELISK_ISSUER: 'https://identity.test',
  };
  const fetchImpl = async (input) => {
    if (String(input).endsWith('/.well-known/openid-configuration')) {
      return response({
        issuer: 'https://identity.test',
        authorization_endpoint: 'https://identity.test/authorize',
        token_endpoint: 'https://identity.test/token',
        jwks_uri: 'https://identity.test/jwks',
      });
    }
    throw new Error('token exchange must not run for corrupt flow state');
  };
  const start = await handleObeliskAuthRequest(
    new Request('https://vaultsparkstudios.com/login?return=/vault-member/'), env, null, { fetchImpl }
  );
  const authorization = new URL(start.headers.get('location'));
  const state = authorization.searchParams.get('state');
  await kv.put(`auth:flow:${state}`, '{not-json');
  const flowCookie = cookieValue(start.headers, 'vs_obelisk_flow');
  const callback = await handleObeliskAuthRequest(new Request(
    `https://vaultsparkstudios.com/auth/callback?code=one-time-code&state=${encodeURIComponent(state)}`,
    { headers: { Cookie: `vs_obelisk_flow=${flowCookie}` } }
  ), env, null, { fetchImpl });
  assert.equal(callback.status, 400);
  assert.equal((await callback.json()).code, 'invalid_flow_state');
  assert.equal(await kv.get(`auth:flow:${state}`), null);
});

test('bridge outage rejects a stale browser session and clears legacy storage', async () => {
  const source = await readFile(new URL('../assets/supabase-client.js', import.meta.url), 'utf8');
  let session = {
    access_token: 'stale-access',
    refresh_token: 'stale-refresh',
    user: { id: 'stale-user', email: 'stale@example.com' },
  };
  const storage = {
    'sb-project-auth-token': JSON.stringify(session),
    removeItem(key) { delete this[key]; },
  };
  const auth = {
    async getSession() { return { data: { session }, error: null }; },
    async setSession(next) { session = { ...next, user: { id: 'linked-user' } }; return { data: { session }, error: null }; },
    async signOut() { session = null; return { data: {}, error: null }; },
  };
  const window = {
    supabase: {
      createClient(_url, _key, options) {
        assert.equal(options.auth.persistSession, false);
        assert.equal(options.auth.autoRefreshToken, false);
        return { auth };
      },
    },
    localStorage: storage,
    fetch: async () => { throw new Error('bridge offline'); },
    location: { pathname: '/vault-member/', search: '', hash: '', assign() {} },
    dispatchEvent() {},
  };
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } }
  vm.runInNewContext(source, { window, URL, URLSearchParams, CustomEvent, Promise, Error, Object }, {
    filename: 'assets/supabase-client.js',
  });
  const authority = await window.VSAuthReady;
  const loaded = await window.VSSupabase.auth.getSession();
  assert.equal(authority.authenticated, false);
  assert.equal(loaded.data.session, null);
  assert.match(loaded.error.message, /bridge is unreachable/);
  assert.equal(storage['sb-project-auth-token'], undefined);
});

test('portal bootstrap stays anonymous without requesting compatibility credentials', async () => {
  const source = await readFile(new URL('../assets/supabase-client.js', import.meta.url), 'utf8');
  let session = null;
  const calls = [];
  const auth = {
    async getSession() { return { data: { session }, error: null }; },
    async setSession(next) { session = next; return { data: { session }, error: null }; },
    async signOut() { session = null; return { data: {}, error: null }; },
  };
  const window = {
    supabase: { createClient() { return { auth }; } },
    localStorage: { removeItem() {} },
    fetch: async (url) => {
      calls.push(url);
      if (url === '/api/auth/me') return response({ ok: true, identity: null });
      throw new Error(`unexpected credential request: ${url}`);
    },
    location: { pathname: '/vault-member/', search: '', hash: '', assign() {} },
    dispatchEvent() {},
  };
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } }
  vm.runInNewContext(source, { window, URL, URLSearchParams, CustomEvent, Promise, Error, Object }, {
    filename: 'assets/supabase-client.js',
  });
  const authority = await window.VSAuthReady;
  assert.equal(authority.authenticated, false);
  assert.deepEqual(calls, ['/api/auth/me']);
});

test('ambient identity requests a compatibility bearer only after verified edge identity', async () => {
  const source = await readFile(new URL('../assets/signed-in-state.js', import.meta.url), 'utf8');
  const listeners = new Map();
  const document = {
    readyState: 'complete',
    body: { setAttribute() {} },
    documentElement: { setAttribute() {} },
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    dispatchEvent(event) { listeners.get(event.type)?.forEach((callback) => callback(event)); },
  };
  const calls = [];
  const identity = {
    provider: 'obelisk',
    sub: 'obl_person_123',
    supabaseUserId: '33333333-3333-4333-8333-333333333333',
    email: 'member@example.com',
    name: 'Vault Member',
  };
  const dataSession = {
    access_token: 'memory-only-access',
    refresh_token: 'memory-only-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: identity.supabaseUserId, email: identity.email },
  };
  const window = {
    fetch: async (url) => {
      calls.push(url);
      if (url === '/api/auth/me') return response({ ok: true, identity });
      if (url === '/api/auth/session') return response({ ok: true, identity, supabase: dataSession });
      return response({}, 404);
    },
    dispatchEvent() {},
  };
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } }
  vm.runInNewContext(source, {
    window, document, CustomEvent, Promise, Date, Error, Object, setTimeout: (callback) => callback(),
  }, { filename: 'assets/signed-in-state.js' });
  const publicIdentity = await window.VSSignedInState.whenReady();
  assert.equal(publicIdentity.identityId, identity.sub);
  assert.deepEqual(calls, ['/api/auth/me']);
  const loaded = await window.VSSignedInState.getDataSession();
  assert.equal(loaded.access_token, 'memory-only-access');
  assert.deepEqual(calls, ['/api/auth/me', '/api/auth/session']);
  assert.equal(window.VSSignedInState.getDataSessionCached().user.id, identity.supabaseUserId);
});

test('ES256 verification enforces issuer, audience, nonce, signature, and verified email', async () => {
  const fixture = await identityFixture();
  const config = { issuer: fixture.claims.iss, clientId: fixture.claims.aud };
  const fetchImpl = async (input) => {
    const url = String(input);
    if (url.endsWith('/.well-known/openid-configuration')) {
      return response({ issuer: config.issuer, authorization_endpoint: `${config.issuer}/authorize`, token_endpoint: `${config.issuer}/token`, jwks_uri: `${config.issuer}/jwks` });
    }
    if (url.endsWith('/jwks')) return response({ keys: [fixture.jwk] });
    throw new Error(`unexpected URL: ${url}`);
  };
  const claims = await verifyObeliskIdToken(fixture.token, { config, nonce: 'nonce-1', fetchImpl });
  assert.equal(claims.sub, 'obl_person_123');
  await assert.rejects(
    verifyObeliskIdToken(fixture.token, { config, nonce: 'wrong', fetchImpl }),
    /id_token_nonce_invalid/
  );
});

test('identity continuity keeps an existing UUID and auth email when the provider email changes', async () => {
  const config = { supabaseUrl: 'https://supabase.test', issuer: 'https://identity.test' };
  const userId = '11111111-1111-4111-8111-111111111111';
  const claims = { sub: 'obl_person_123', email: 'member@example.com' };
  const calls = [];
  let user = {
    id: userId,
    email: claims.email,
    last_sign_in_at: '2026-01-01T00:00:00Z',
    app_metadata: { obelisk_sub: claims.sub, existing_role: 'member' },
  };
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    const method = init.method || 'GET';
    calls.push({ url, method, body: init.body ? JSON.parse(init.body) : null });
    if (url.includes('/auth/v1/admin/users?page=') && method === 'GET') return response({ users: [user] });
    if (url.endsWith(`/auth/v1/admin/users/${userId}`) && method === 'PUT') {
      const body = JSON.parse(init.body);
      user = { ...user, app_metadata: body.app_metadata };
      return response(user);
    }
    throw new Error(`unexpected request: ${method} ${url}`);
  };
  const link = await ensureSupabaseIdentityLink(claims, { config, serviceRole: 'service-role', fetchImpl });
  assert.equal(link.userId, userId);
  assert.equal(link.compatibilityEmail, claims.email);
  const rotated = await ensureSupabaseIdentityLink(
    { ...claims, email: 'new-address@example.com' },
    { config, serviceRole: 'service-role', fetchImpl }
  );
  assert.equal(rotated.userId, userId);
  assert.equal(rotated.email, 'new-address@example.com');
  assert.equal(rotated.compatibilityEmail, claims.email);
  assert.equal(user.app_metadata.obelisk_verified_email, 'new-address@example.com');
  assert.equal(user.app_metadata.existing_role, 'member');
  assert.equal(user.email, claims.email);
  assert.equal(calls.filter((call) => call.method === 'PUT').every((call) => !('email' in call.body)), true);
});

test('first Obelisk login creates one confirmed compatibility user with privileged link metadata', async () => {
  const config = { supabaseUrl: 'https://supabase.test', issuer: 'https://identity.test' };
  const claims = { sub: 'obl_person_new', email: 'new@example.com', name: 'New Member' };
  const userId = '12121212-1212-4212-8212-121212121212';
  const calls = [];
  let user = null;
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url, method, body });
    if (url.includes('/auth/v1/admin/users?page=') && method === 'GET') return response({ users: user ? [user] : [] });
    if (url.endsWith('/auth/v1/admin/users') && method === 'POST') {
      user = { id: userId, email: body.email, app_metadata: body.app_metadata };
      return response(user);
    }
    if (url.endsWith(`/auth/v1/admin/users/${userId}`) && method === 'PUT') {
      user = { ...user, app_metadata: body.app_metadata };
      return response(user);
    }
    throw new Error(`unexpected request: ${method} ${url}`);
  };
  const linked = await ensureSupabaseIdentityLink(claims, { config, serviceRole: 'service-role', fetchImpl });
  assert.equal(linked.userId, userId);
  assert.equal(linked.existing, false);
  const create = calls.find((call) => call.method === 'POST');
  assert.equal(create.body.email_confirm, true);
  assert.equal(create.body.app_metadata.obelisk_sub, claims.sub);
  assert.equal(create.body.user_metadata.display_name, claims.name);
});

test('duplicate privileged subject links fail closed', async () => {
  const config = { supabaseUrl: 'https://supabase.test', issuer: 'https://identity.test' };
  const claims = { sub: 'obl_duplicate', email: 'first@example.com' };
  const fetchImpl = async () => response({ users: [
    { id: 'one', email: claims.email, app_metadata: { obelisk_sub: claims.sub } },
    { id: 'two', email: 'second@example.com', app_metadata: { obelisk_sub: claims.sub } },
  ] });
  await assert.rejects(
    ensureSupabaseIdentityLink(claims, { config, serviceRole: 'service-role', fetchImpl }),
    /identity_subject_duplicate/
  );
});
test('compatibility session is issued server-side from a non-delivery magic-link token', async () => {
  const calls = [];
  const config = { supabaseUrl: 'https://supabase.test', supabaseAnonKey: 'anon' };
  const fetchImpl = async (input, init) => {
    calls.push({ url: String(input), init });
    if (String(input).endsWith('/admin/generate_link')) return response({ hashed_token: 'hashed-one-time-token' });
    if (String(input).endsWith('/auth/v1/verify')) {
      assert.deepEqual(JSON.parse(init.body), { token_hash: 'hashed-one-time-token', type: 'email' });
      return response({ access_token: 'access', refresh_token: 'refresh', user: { id: 'user-id' } });
    }
    throw new Error('unexpected request');
  };
  const session = await issueSupabaseCompatibilitySession('member@example.com', { config, serviceRole: 'service', fetchImpl });
  assert.equal(session.user.id, 'user-id');
  assert.equal(calls.length, 2);
});

test('ambient identity is a clean null projection while compatibility credentials fail closed', async () => {
  const env = { RATE_LIMIT: new FakeKv(), CSRF_SIGNING_KEY: 'anonymous-projection-signing-key' };
  const me = await handleObeliskAuthRequest(new Request('https://vaultsparkstudios.com/api/auth/me'), env);
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { ok: true, identity: null });
  const session = await handleObeliskAuthRequest(new Request('https://vaultsparkstudios.com/api/auth/session'), env);
  assert.equal(session.status, 401);
  assert.deepEqual(await session.json(), { ok: false, code: 'not_authenticated' });
});

test('authorization-code + PKCE callback creates a live edge session without exposing Obelisk tokens', async () => {
  const issuer = 'https://roundtrip-identity.test';
  const kv = new FakeKv();
  const env = {
    RATE_LIMIT: kv,
    CSRF_SIGNING_KEY: 'roundtrip-signing-key-with-sufficient-entropy',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    OBELISK_ISSUER: issuer,
    OBELISK_REDIRECT_URI: 'https://vaultsparkstudios.com/auth/callback',
  };
  let fixture;
  const supabaseUserId = '22222222-2222-4222-8222-222222222222';
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    if (url === `${issuer}/.well-known/openid-configuration`) {
      return response({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks` });
    }
    if (url === `${issuer}/jwks`) return response({ keys: [fixture.jwk] });
    if (url === `${issuer}/token`) return response({ id_token: fixture.token, access_token: 'obelisk-access', refresh_token: 'obelisk-refresh', expires_in: 3600 });
    if (url.includes('/auth/v1/admin/users?page=') && (init.method || 'GET') === 'GET') {
      return response({ users: [{
        id: supabaseUserId,
        email: fixture.claims.email,
        last_sign_in_at: '2026-01-01T00:00:00Z',
        app_metadata: { obelisk_sub: fixture.claims.sub },
      }] });
    }
    if (url.endsWith(`/auth/v1/admin/users/${supabaseUserId}`) && init.method === 'PUT') {
      const body = JSON.parse(init.body);
      return response({ id: supabaseUserId, email: fixture.claims.email, app_metadata: body.app_metadata });
    }
    if (url.endsWith('/auth/v1/admin/generate_link')) return response({ hashed_token: 'bridge-token' });
    if (url.endsWith('/auth/v1/verify')) {
      return response({
        access_token: 'supabase-access', refresh_token: 'supabase-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600, token_type: 'bearer', user: { id: supabaseUserId, email: fixture.claims.email },
      });
    }
    throw new Error(`unexpected request: ${url} ${init.method || 'GET'}`);
  };

  const start = await handleObeliskAuthRequest(
    new Request('https://vaultsparkstudios.com/login?return=/investor-portal/&intent=signin'), env, null, { fetchImpl }
  );
  assert.equal(start.status, 302);
  const authorization = new URL(start.headers.get('location'));
  assert.equal(authorization.origin, issuer);
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
  assert.match(authorization.searchParams.get('code_challenge'), /^[A-Za-z0-9_-]{43}$/);
  const state = authorization.searchParams.get('state');
  const flow = JSON.parse(await kv.get(`auth:flow:${state}`));
  fixture = await identityFixture({ issuer, nonce: flow.nonce });
  const flowCookie = cookieValue(start.headers, 'vs_obelisk_flow');

  const callback = await handleObeliskAuthRequest(new Request(
    `https://vaultsparkstudios.com/auth/callback?code=one-time-code&state=${encodeURIComponent(state)}`,
    { headers: { Cookie: `vs_obelisk_flow=${flowCookie}` } }
  ), env, null, { fetchImpl });
  assert.equal(callback.status, 302);
  assert.equal(callback.headers.get('location'), '/investor-portal/');
  const sessionCookie = cookieValue(callback.headers, 'vs_portal_session');
  assert.ok(sessionCookie);

  const sessionRequest = new Request('https://vaultsparkstudios.com/api/auth/session', {
    headers: { Cookie: `vs_portal_session=${sessionCookie}` },
  });
  const loaded = await authenticateObeliskRequest(sessionRequest, env, { fetchImpl });
  assert.equal(loaded.record.obelisk.sub, fixture.claims.sub);
  const sessionResponse = await handleObeliskAuthRequest(sessionRequest, env, null, { fetchImpl });
  const body = await sessionResponse.json();
  assert.equal(body.identity.provider, 'obelisk');
  assert.equal(body.identity.supabaseUserId, supabaseUserId);
  assert.equal(body.supabase.access_token, 'supabase-access');
  assert.equal(JSON.stringify(body).includes('obelisk-access'), false);
  assert.equal(JSON.stringify(body).includes('obelisk-refresh'), false);
});

// --- S302: provider-side logout ---------------------------------------------
// Deleting our KV record only ends OUR session. Without revocation the Obelisk
// grant and its refresh token stay alive, so "sign out" signed the user out of
// nothing durable. These pin the contract, including that it must fail open.

const REVOKE_CONFIG = Object.freeze({
  issuer: 'https://identity.test',
  clientId: 'test-client',
  redirectUri: 'https://app.test/auth/callback',
});

function discoveryDoc(extra = {}) {
  return {
    issuer: 'https://identity.test',
    authorization_endpoint: 'https://identity.test/auth/authorize',
    token_endpoint: 'https://identity.test/auth/token',
    jwks_uri: 'https://identity.test/auth/jwks',
    revocation_endpoint: 'https://identity.test/auth/revoke',
    end_session_endpoint: 'https://identity.test/auth/logout',
    ...extra,
  };
}

function revocationHarness({ discovery = discoveryDoc(), revokeStatus = 200, throwOnRevoke = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const href = String(url);
    calls.push({ url: href, options });
    if (href.endsWith('/.well-known/openid-configuration')) {
      if (!discovery) throw new Error('discovery down');
      return response(discovery);
    }
    if (href === discovery?.revocation_endpoint) {
      if (throwOnRevoke) throw new Error('network down');
      return new Response('', { status: revokeStatus });
    }
    throw new Error(`unexpected request: ${href}`);
  };
  return { calls, fetchImpl };
}

const REVOKE_RECORD = Object.freeze({
  obelisk: { accessToken: 'obelisk-access-token', refreshToken: 'obelisk-refresh-token' },
});

test('logout revokes both provider tokens, refresh first', async () => {
  const { calls, fetchImpl } = revocationHarness();
  const result = await revokeObeliskTokens(REVOKE_RECORD, { config: REVOKE_CONFIG, fetchImpl });

  assert.equal(result.attempted, true);
  assert.deepEqual(result.revoked, ['refresh_token', 'access_token']);
  assert.deepEqual(result.failed, []);

  const revokes = calls.filter((call) => call.url === 'https://identity.test/auth/revoke');
  assert.equal(revokes.length, 2);
  // Refresh first: it is the durable credential, so if the second call never
  // lands the long-lived grant is already dead.
  assert.match(revokes[0].options.body, /token_type_hint=refresh_token/);
  assert.match(revokes[1].options.body, /token_type_hint=access_token/);
  assert.equal(revokes[0].options.method, 'POST');
});

test('a revoked token is never placed in a URL', async () => {
  const { calls, fetchImpl } = revocationHarness();
  await revokeObeliskTokens(REVOKE_RECORD, { config: REVOKE_CONFIG, fetchImpl });
  for (const call of calls) {
    assert.equal(call.url.includes('obelisk-access-token'), false);
    assert.equal(call.url.includes('obelisk-refresh-token'), false);
  }
  // ...and they DO travel in the body, so the assertion above is not vacuous.
  const body = calls.find((call) => call.url.endsWith('/auth/revoke')).options.body;
  assert.equal(body.includes('obelisk-refresh-token'), true);
});

test('a provider that rejects revocation never traps the user signed in', async () => {
  for (const harness of [
    revocationHarness({ revokeStatus: 503 }),
    revocationHarness({ throwOnRevoke: true }),
    revocationHarness({ discovery: null }),
    revocationHarness({ discovery: discoveryDoc({ revocation_endpoint: undefined }) }),
  ]) {
    const result = await revokeObeliskTokens(REVOKE_RECORD, { config: REVOKE_CONFIG, fetchImpl: harness.fetchImpl });
    assert.equal(result.revoked.length, 0);           // nothing revoked
    assert.ok(Array.isArray(result.failed));           // but it reported, and
    assert.doesNotThrow(() => JSON.stringify(result)); // it never threw
  }
});

test('an already-invalid token still counts as revoked (RFC 7009 section 2.2)', async () => {
  const { fetchImpl } = revocationHarness({ revokeStatus: 200 });
  const result = await revokeObeliskTokens(
    { obelisk: { refreshToken: 'already-dead' } }, { config: REVOKE_CONFIG, fetchImpl },
  );
  assert.deepEqual(result.revoked, ['refresh_token']);
});

test('a session with no provider tokens reports not-attempted rather than success', async () => {
  const { fetchImpl } = revocationHarness();
  const result = await revokeObeliskTokens({ obelisk: {} }, { config: REVOKE_CONFIG, fetchImpl });
  assert.equal(result.attempted, false);
  assert.deepEqual(result.revoked, []);
});

test('the end-session URL carries the client and a post-logout return, never a token', () => {
  const url = endSessionUrl(discoveryDoc(), { config: REVOKE_CONFIG });
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, 'https://identity.test/auth/logout');
  assert.equal(parsed.searchParams.get('client_id'), 'test-client');
  assert.equal(parsed.searchParams.get('post_logout_redirect_uri'), 'https://app.test/');
  assert.equal(url.includes('id_token'), false);
});

test('a provider without an end-session endpoint yields null, not a broken URL', () => {
  assert.equal(endSessionUrl(discoveryDoc({ end_session_endpoint: undefined }), { config: REVOKE_CONFIG }), null);
  assert.equal(endSessionUrl(null, { config: REVOKE_CONFIG }), null);
});

test('an advertised-but-unimplemented revocation route is not a failure, and is only paid for once', async () => {
  // Obelisk advertises revocation_endpoint and answers 404 unknown-auth-route.
  // `failed` invites a retry on every sign-out; `not_implemented` is a
  // cross-repo finding. They must not share a verdict.
  const issuer = 'https://not-implemented.test';
  const discovery = discoveryDoc({
    issuer,
    authorization_endpoint: `${issuer}/auth/authorize`,
    token_endpoint: `${issuer}/auth/token`,
    jwks_uri: `${issuer}/auth/jwks`,
    revocation_endpoint: `${issuer}/auth/revoke`,
  });
  let revokeAttempts = 0;
  const fetchImpl = async (url) => {
    const href = String(url);
    if (href.endsWith('/.well-known/openid-configuration')) return response(discovery);
    if (href === discovery.revocation_endpoint) {
      revokeAttempts += 1;
      return Response.json({ ok: false, reason: 'unknown-auth-route' }, { status: 404 });
    }
    throw new Error(`unexpected request: ${href}`);
  };
  const config = { ...REVOKE_CONFIG, issuer };

  const first = await revokeObeliskTokens(REVOKE_RECORD, { config, fetchImpl });
  assert.equal(first.reason, 'not_implemented');
  assert.deepEqual(first.failed, []);          // not a failure
  assert.deepEqual(first.revoked, []);         // and not a success
  assert.equal(revokeAttempts, 1);

  // Second sign-out must short-circuit rather than pay for the round trip again.
  const second = await revokeObeliskTokens(REVOKE_RECORD, { config, fetchImpl });
  assert.equal(second.reason, 'not_implemented');
  assert.equal(revokeAttempts, 1, 'the doomed call must not be repeated');
});

// --- S302: the silent sign-out --------------------------------------------
// We bookkept freshness from expires_at while supabase-js reads the access
// token's own exp and refreshes on its own initiative. Trusting our field while
// the browser trusts the token is how a member ended up signed out in the UI
// while signed in at the edge.

function jwtWithExp(expSeconds) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ exp: expSeconds, sub: 'user' }));
  return `${header}.${body}.signature`;
}

test('a token that expires before our bookkeeping says is not fresh', () => {
  const now = 1_000_000_000_000;
  // expires_at claims an hour of life; the token itself expires in 10 seconds.
  const session = { expires_at: Math.floor(now / 1000) + 3600, access_token: jwtWithExp(Math.floor(now / 1000) + 10) };
  assert.equal(supabaseSessionFresh(session, now), false);
});

test('a healthy pair is fresh', () => {
  const now = 1_000_000_000_000;
  const soon = Math.floor(now / 1000) + 3600;
  assert.equal(supabaseSessionFresh({ expires_at: soon, access_token: jwtWithExp(soon) }, now), true);
});

test('bookkeeping alone cannot certify a session whose token is already dead', () => {
  const now = 1_000_000_000_000;
  const session = { expires_at: Math.floor(now / 1000) + 3600, access_token: jwtWithExp(Math.floor(now / 1000) - 60) };
  assert.equal(supabaseSessionFresh(session, now), false);
});

test('an unreadable or absent expiry is never fresh', () => {
  const now = 1_000_000_000_000;
  assert.equal(supabaseSessionFresh({ access_token: 'not-a-jwt' }, now), false);
  assert.equal(supabaseSessionFresh({}, now), false);
  assert.equal(supabaseSessionFresh(null, now), false);
});

test('the refresh skew is honoured, so a pair about to die is refreshed early', () => {
  const now = 1_000_000_000_000;
  const inOneMinute = Math.floor(now / 1000) + 60;      // inside the 2-minute skew
  assert.equal(supabaseSessionFresh({ expires_at: inOneMinute, access_token: jwtWithExp(inOneMinute) }, now), false);
});

// ── S303: structured receipt on identity-link FAILURE ─────────────────────────

test('a link failure maps to its bounded code family, never free text', () => {
  assert.equal(linkFailureCode(new Error('identity_email_duplicate: 2 rows for x@y.z')), 'identity_email_duplicate');
  assert.equal(linkFailureCode(new Error('supabase_user_scan_limit')), 'supabase_user_scan_limit');
  assert.equal(linkFailureCode(new Error('something exploded: jane@example.com sub=ob_123')), 'unknown');
  assert.equal(linkFailureCode(null), 'unknown');
});

test('the failure receipt carries no identifier — even when the error message does', () => {
  const err = new Error('token_exchange_failed for jane@example.com sub=ob_9f31 token=eyJabc');
  const receipt = linkFailureReceipt(err, 'exchange');
  const serialized = JSON.stringify(receipt);
  assert.equal(receipt.code, 'token_exchange_failed');
  assert.equal(receipt.plane, 'exchange');
  assert.ok(!serialized.includes('jane'), 'email leaked into receipt');
  assert.ok(!serialized.includes('ob_9f31'), 'subject leaked into receipt');
  assert.ok(!serialized.includes('eyJ'), 'token leaked into receipt');
  assert.deepEqual(Object.keys(receipt).sort(), ['at', 'code', 'plane', 'version'], 'receipt shape is closed — new fields need a new privacy review');
});

test('an unrecognized plane is recorded as unknown, not trusted', () => {
  assert.equal(linkFailureReceipt(new Error('x'), 'lateral-move').plane, 'unknown');
});

test('LINK_FAILURE_CODES is the only vocabulary auth_detail can speak', () => {
  for (const code of LINK_FAILURE_CODES) {
    assert.match(code, /^[a-z_]+$/, `code ${code} must be a bounded snake_case token`);
  }
  assert.ok(LINK_FAILURE_CODES.has('unknown'), 'the fallback family must itself be bounded');
});

// ── S304: public.obelisk_identity_link — indexed fast path + fallback ────────

function linkTableHarness({ linkRows = {}, users = {} } = {}) {
  const calls = [];
  const state = { linkRows: { ...linkRows }, users: { ...users } };
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    const method = init.method || 'GET';
    calls.push({ url, method });
    if (url.includes('/rest/v1/obelisk_identity_link?obelisk_sub=eq.') && method === 'GET') {
      const sub = decodeURIComponent(url.split('obelisk_sub=eq.')[1].split('&')[0]);
      const userId = state.linkRows[sub];
      return response(userId ? [{ user_id: userId }] : []);
    }
    if (url.endsWith('/rest/v1/obelisk_identity_link') && method === 'POST') {
      const body = JSON.parse(init.body);
      const existing = state.linkRows[body.obelisk_sub];
      if (existing && existing !== body.user_id) return response({ message: 'duplicate key' }, 409);
      const takenBy = Object.entries(state.linkRows).find(([, uid]) => uid === body.user_id);
      if (takenBy && takenBy[0] !== body.obelisk_sub) return response({ message: 'duplicate key' }, 409);
      state.linkRows[body.obelisk_sub] = body.user_id;
      return response([{ obelisk_sub: body.obelisk_sub, user_id: body.user_id }]);
    }
    const byId = url.match(/\/auth\/v1\/admin\/users\/([^/?]+)$/);
    if (byId && method === 'GET') {
      const u = state.users[decodeURIComponent(byId[1])];
      return u ? response(u) : response({ message: 'not found' }, 404);
    }
    if (byId && method === 'PUT') {
      const u = state.users[decodeURIComponent(byId[1])];
      const body = JSON.parse(init.body);
      state.users[u.id] = { ...u, app_metadata: body.app_metadata };
      return response(state.users[u.id]);
    }
    if (url.includes('/auth/v1/admin/users?page=') && method === 'GET') {
      return response({ users: Object.values(state.users) });
    }
    throw new Error(`unexpected request: ${method} ${url}`);
  };
  return { calls, state, fetchImpl };
}

test('S304 fast path: a returning linked member resolves with ZERO admin scans', async () => {
  const config = { supabaseUrl: 'https://supabase.test', issuer: 'https://identity.test' };
  const userId = '33333333-3333-4333-8333-333333333333';
  const claims = { sub: 'obl_fast_1', email: 'fast@example.com' };
  const h = linkTableHarness({
    linkRows: { obl_fast_1: userId },
    users: { [userId]: { id: userId, email: 'fast@example.com', app_metadata: { obelisk_sub: 'obl_fast_1' } } },
  });
  const link = await ensureSupabaseIdentityLink(claims, { config, serviceRole: 'sr', fetchImpl: h.fetchImpl });
  assert.equal(link.userId, userId);
  assert.equal(link.existing, true);
  assert.equal(h.calls.filter((c) => c.url.includes('/auth/v1/admin/users?page=')).length, 0, 'no full scan may run on the fast path');
});

test('S304 self-heal: an orphan link row (metadata write never landed) completes the link', async () => {
  const config = { supabaseUrl: 'https://supabase.test', issuer: 'https://identity.test' };
  const userId = '44444444-4444-4444-8444-444444444444';
  const claims = { sub: 'obl_orphan_1', email: 'orphan@example.com' };
  const h = linkTableHarness({
    linkRows: { obl_orphan_1: userId },
    users: { [userId]: { id: userId, email: 'orphan@example.com', app_metadata: {} } },
  });
  const link = await ensureSupabaseIdentityLink(claims, { config, serviceRole: 'sr', fetchImpl: h.fetchImpl });
  assert.equal(link.userId, userId);
  assert.equal(h.state.users[userId].app_metadata.obelisk_sub, 'obl_orphan_1', 'orphan row self-healed via the metadata write');
});

test('S304 slow path writes the link row BEFORE the metadata write', async () => {
  const config = { supabaseUrl: 'https://supabase.test', issuer: 'https://identity.test' };
  const userId = '55555555-5555-4555-8555-555555555555';
  const claims = { sub: 'obl_order_1', email: 'order@example.com' };
  const h = linkTableHarness({
    users: { [userId]: { id: userId, email: 'order@example.com', app_metadata: {} } },
  });
  await ensureSupabaseIdentityLink(claims, { config, serviceRole: 'sr', fetchImpl: h.fetchImpl });
  const insertIndex = h.calls.findIndex((c) => c.method === 'POST' && c.url.endsWith('/rest/v1/obelisk_identity_link'));
  const putIndex = h.calls.findIndex((c) => c.method === 'PUT');
  assert.ok(insertIndex >= 0 && putIndex >= 0 && insertIndex < putIndex, 'link insert must precede the privileged metadata write');
});

test('S304 fail-closed: a subject already linked to a DIFFERENT user is identity_subject_duplicate', async () => {
  const config = { supabaseUrl: 'https://supabase.test', issuer: 'https://identity.test' };
  const userA = '66666666-6666-4666-8666-666666666666';
  const userB = '77777777-7777-4777-8777-777777777777';
  const claims = { sub: 'obl_dup_1', email: 'b@example.com' };
  const h = linkTableHarness({
    users: { [userB]: { id: userB, email: 'b@example.com', app_metadata: {} } },
  });
  // Simulate a concurrent callback landing the subject on userA between the
  // fast-path miss and the slow-path insert.
  const baseFetch = h.fetchImpl;
  let firstLookupDone = false;
  const racingFetch = async (input, init = {}) => {
    const url = String(input);
    if (url.includes('obelisk_sub=eq.') && !firstLookupDone) {
      firstLookupDone = true;
      return response([]);
    }
    if (url.includes('obelisk_sub=eq.')) return response([{ user_id: userA }]);
    if (url.endsWith('/rest/v1/obelisk_identity_link') && (init.method || 'GET') === 'POST') {
      return response({ message: 'duplicate key' }, 409);
    }
    return baseFetch(input, init);
  };
  await assert.rejects(
    ensureSupabaseIdentityLink(claims, { config, serviceRole: 'sr', fetchImpl: racingFetch }),
    /identity_subject_duplicate/,
  );
});

test('S304 fallback: with the table absent the legacy scan path still links end-to-end', async () => {
  const config = { supabaseUrl: 'https://supabase.test', issuer: 'https://identity.test' };
  const userId = '88888888-8888-4888-8888-888888888888';
  const claims = { sub: 'obl_legacy_1', email: 'legacy@example.com' };
  let user = { id: userId, email: 'legacy@example.com', app_metadata: {} };
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    const method = init.method || 'GET';
    if (url.includes('/rest/v1/obelisk_identity_link')) return response({ message: 'relation does not exist' }, 404);
    if (url.includes('/auth/v1/admin/users?page=') && method === 'GET') return response({ users: [user] });
    if (url.endsWith(`/auth/v1/admin/users/${userId}`) && method === 'PUT') {
      user = { ...user, app_metadata: JSON.parse(init.body).app_metadata };
      return response(user);
    }
    throw new Error(`unexpected request: ${method} ${url}`);
  };
  const link = await ensureSupabaseIdentityLink(claims, { config, serviceRole: 'sr', fetchImpl });
  assert.equal(link.userId, userId);
  assert.equal(user.app_metadata.obelisk_sub, claims.sub);
});

test('S319: a broken provider discovery yields an honest 503, never a Worker crash', async () => {
  // obeliskgate.com/.well-known/openid-configuration answered 200 with HTML (its
  // SPA catch-all shadowed the discovery path), so authorization_endpoint was
  // undefined, getDiscovery threw, nothing caught it, and Cloudflare returned
  // error 1101 — HTTP 500 on /login in BOTH production and staging.
  const puts = [];
  const env = {
    RATE_LIMIT: { put: async (k, v) => { puts.push([k, v]); }, get: async () => null, delete: async () => {} },
    OBELISK_SESSION_SIGNING_KEY: 'x'.repeat(48),
    OBELISK_CLIENT_ID: 'client',
  };
  const htmlDiscovery = async () => new Response('<!doctype html><html lang="en">', {
    status: 200, headers: { 'content-type': 'text/html' },
  });

  const response = await handleObeliskAuthRequest(
    new Request('https://vaultsparkstudios.com/login?intent=signin&return=/vault-member/'),
    env, null, { fetchImpl: htmlDiscovery },
  );

  assert.equal(response.status, 503, 'a provider outage is 503, not 500 and not a throw');
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.code, 'identity_provider_unavailable', 'the surface names the real cause');
  assert.equal(puts.length, 0, 'a login that cannot start must not persist an orphan flow record');
});

test('S319: a healthy provider still starts the flow and persists exactly one record', async () => {
  // The other direction: the guard must not have turned every login into a 503.
  const puts = [];
  const env = {
    RATE_LIMIT: { put: async (k, v) => { puts.push([k, v]); }, get: async () => null, delete: async () => {} },
    OBELISK_SESSION_SIGNING_KEY: 'x'.repeat(48),
    OBELISK_CLIENT_ID: 'client',
  };
  const goodDiscovery = async (url) => new Response(JSON.stringify({
    issuer: 'https://obeliskgate.com',
    authorization_endpoint: 'https://obeliskgate.com/authorize',
    token_endpoint: 'https://obeliskgate.com/token',
    jwks_uri: 'https://obeliskgate.com/jwks',
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  const response = await handleObeliskAuthRequest(
    new Request('https://vaultsparkstudios.com/login?intent=signin&return=/vault-member/'),
    env, null, { fetchImpl: goodDiscovery },
  );

  assert.equal(response.status, 302, 'a healthy provider redirects to authorize');
  assert.ok((response.headers.get('location') || '').startsWith('https://obeliskgate.com/authorize?'), 'redirects to the provider authorize endpoint');
  assert.equal(puts.length, 1, 'exactly one flow record is persisted');
  assert.match(puts[0][0], /^auth:flow:/);
});

test('S319: an exhausted KV quota yields 503, never a Worker crash (the live 500)', async () => {
  // Measured in production 2026-08-18: /login returned HTTP 500 body "error code:
  // 1101" because free-tier KV writes were exhausted by the /v/rum beacon writing
  // a rate-limit counter on every request to the same namespace. The rejection
  // escaped startLogin and the runtime returned 1101.
  const env = {
    RATE_LIMIT: {
      put: async () => { throw new Error('KV PUT failed: 10048 free usage limit reached'); },
      get: async () => null,
      delete: async () => {},
    },
    OBELISK_SESSION_SIGNING_KEY: 'x'.repeat(48),
    OBELISK_CLIENT_ID: 'client',
  };
  const goodDiscovery = async () => new Response(JSON.stringify({
    issuer: 'https://obeliskgate.com',
    authorization_endpoint: 'https://obeliskgate.com/authorize',
    token_endpoint: 'https://obeliskgate.com/token',
    jwks_uri: 'https://obeliskgate.com/jwks',
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  const response = await handleObeliskAuthRequest(
    new Request('https://vaultsparkstudios.com/login?intent=signin'),
    env, null, { fetchImpl: goodDiscovery },
  );

  assert.equal(response.status, 503, 'a storage fault is a named 503, not a crash and not a 500');
  const body = await response.json();
  assert.equal(body.code, 'auth_store_unavailable');
  // Fails CLOSED: no redirect to the provider without a persisted flow record,
  // because the callback would have no nonce or verifier to check.
  assert.equal(response.headers.get('location'), null, 'a login without flow state must not proceed to the provider');
});

test('S321: the CALLBACK leg degrades to a named 503 when the KV write fails, instead of crashing', async () => {
  // S319 fixed this crash class in startLogin and stopped there. `.delete()` is a
  // KV *write*, and finishLogin issued one before any try block — so the same
  // free-tier quota exhaustion that took /login down rejected on /auth/callback,
  // escaped the Worker fetch handler, and Cloudflare answered 1101 / HTTP 500.
  // This leg is the costlier one: the member has already completed the passkey
  // ceremony by the time they reach it.
  const kv = new FakeKv();
  const env = {
    RATE_LIMIT: kv,
    OBELISK_SESSION_SIGNING_KEY: 'x'.repeat(48),
    OBELISK_CLIENT_ID: 'client',
  };
  const discovery = async () => new Response(JSON.stringify({
    issuer: 'https://obeliskgate.com',
    authorization_endpoint: 'https://obeliskgate.com/authorize',
    token_endpoint: 'https://obeliskgate.com/token',
    jwks_uri: 'https://obeliskgate.com/jwks',
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  const start = await handleObeliskAuthRequest(
    new Request('https://vaultsparkstudios.com/login?intent=signin'), env, null, { fetchImpl: discovery },
  );
  assert.equal(start.status, 302, 'precondition: the start leg succeeds while KV is healthy');
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const flowCookie = cookieValue(start.headers, 'vs_obelisk_flow');
  assert.ok(state && flowCookie, 'precondition: a flow record and signed cookie exist');

  // Exhaust the quota only now, so the failure is isolated to the callback leg.
  kv.delete = async () => { throw new Error('KV DELETE failed: 10048 free usage limit reached'); };

  const callback = await handleObeliskAuthRequest(new Request(
    `https://vaultsparkstudios.com/auth/callback?code=one-time-code&state=${encodeURIComponent(state)}`,
    { headers: { Cookie: `vs_obelisk_flow=${flowCookie}` } },
  ), env, null, { fetchImpl: discovery });

  assert.equal(callback.status, 503, 'a storage fault on the callback is a named 503, not a crash and not a 500');
  assert.equal((await callback.json()).code, 'auth_store_unavailable');
});

test('S321: logout still ends the browser session when the store delete fails, and reports it', async () => {
  // The third instance of the same class — but this one must NOT 503. Clearing the
  // signed cookie is what actually ends the member's session, and it succeeds
  // regardless of KV. Failing the request would leave the credential in the
  // browser: strictly worse. So it degrades, and says so rather than claiming a
  // clean logout (CANON-031).
  const kv = new FakeKv();
  const env = {
    RATE_LIMIT: kv,
    OBELISK_SESSION_SIGNING_KEY: 'x'.repeat(48),
    OBELISK_CLIENT_ID: 'client',
  };
  const sessionId = 'a'.repeat(48);
  await kv.put(`auth:session:${sessionId}`, JSON.stringify({
    version: 1, obelisk: { sub: 'obl_x' }, supabase: { user: { id: 'uuid' } }, link: { userId: 'uuid' },
  }));
  const signed = await __test.signedValue(sessionId, env);
  kv.delete = async () => { throw new Error('KV DELETE failed: 10048 free usage limit reached'); };

  const response = await handleObeliskAuthRequest(new Request('https://vaultsparkstudios.com/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: `vs_portal_session=${signed}`, Origin: 'https://vaultsparkstudios.com' },
  }), env, null, { fetchImpl: async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }) });

  assert.equal(response.status, 200, 'the browser-side logout succeeded, so the request did not fail');
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.storeCleared, false, 'the degraded store delete is reported, not hidden');
  assert.match(cookieValue(response.headers, 'vs_portal_session') ?? '', /^$/, 'the session cookie is cleared regardless');
});
