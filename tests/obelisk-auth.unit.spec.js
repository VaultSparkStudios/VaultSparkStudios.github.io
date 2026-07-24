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
  __test,
} from '../cloudflare/obelisk-auth.js';

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
