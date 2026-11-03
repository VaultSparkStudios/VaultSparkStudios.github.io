import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleObeliskAuthRequest, safeReturnPath, __test } from '../cloudflare/obelisk-auth.js';
import { portalGateRedirect } from '../cloudflare/worker-lib.mjs';
import { launchBrowser, openFixture, html, waitFor } from './fixtures/browser-harness.mjs';

const origin = 'https://vaultsparkstudios.com';
let browser;
after(async () => { await browser?.close(); });
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

// Compose the real entry controllers and member bootstrap/profile listener with
// the real edge start/callback handlers. Only identity/data providers and final
// destination content are local fixtures; no browser URL construction is mocked.
async function entryComposition(run, { member = true, intent = 'signin' } = {}) {
  browser ||= await launchBrowser();
  let authenticated = false;
  const row = { username: 'VaultPerson', points: 10, created_at: '2026-01-01T00:00:00Z', achievements: [] };
  const dataScript = () => `(() => {
    const session = ${authenticated ? JSON.stringify({ user: { id: 'composition-person', email: 'person@example.test' } }) : 'null'};
    let hasMember = ${member && intent === 'signin'};
    function q(table) {
      const result = {};
      for (const key of ['select','eq','gte','lt','lte','order','limit','in','is']) result[key] = () => result;
      result.then = (yes,no) => Promise.resolve({data:[],error:null}).then(yes,no);
      result.single = result.maybeSingle = async () => ({data:hasMember?${JSON.stringify(row)}:null,error:null});
      return result;
    }
    window.VSSupabase = {from:q,rpc:async(name) => {
      if(name==='get_member_bootstrap')return {data:{member:hasMember?${JSON.stringify(row)}:null},error:null};
      if(name==='register_open'){hasMember=true;return {data:{},error:null};}
      if(name==='get_my_investor_profile')return {data:{id:'approved-investor'},error:null};
      return {data:null,error:null};
    },auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
    window.VSObeliskIdentity=session?{sub:'fixture-sub',supabaseUserId:session.user.id,email:session.user.email}:null;
    window.VSCompatibilitySession=session?{...session,access_token:'fixture-compatibility-access'}:null;
    window.VSAuthReady=Promise.resolve();
    window.VSGate={getNextAppName:()=>null,redirect:()=>false};
  })();`;
  const f = await openFixture(browser, {
    pages: {
      '/vault-member/': fs.readFileSync('vault-member/index.html', 'utf8'),
      '/investor-portal/login/': fs.readFileSync('investor-portal/login/index.html', 'utf8'),
      '/vault-member/passport/': html({ body: '<h1>Member destination fixture</h1>' }),
      '/investor-portal/documents/': html({ body: '<h1>Investor destination fixture</h1>' }),
    },
    handlers: [
      { match: u => u.pathname.startsWith('/assets/supabase-client'), handle: r => r.fulfill({ contentType: 'application/javascript', body: dataScript() }) },
      { match: u => /^\/assets\/(?:account-entry|investor-experience)(?:\.shell-[a-f0-9]+)?\.js$/.test(u.pathname), handle: (r, req) => {
        const name = new URL(req.url()).pathname.includes('account-entry') ? 'account-entry' : 'investor-experience';
        return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(`assets/${name}.js`, 'utf8') });
      } },
      { match: u => /^\/vault-member\/[a-zA-Z0-9.-]+\.(?:js|css)$/.test(u.pathname), handle: (r, req) => {
        const file = new URL(req.url()).pathname.slice(1).replace(/\.shell-[a-f0-9]+(?=\.(?:js|css)$)/, '');
        return r.fulfill({ contentType: file.endsWith('.css') ? 'text/css' : 'application/javascript', body: fs.readFileSync(file, 'utf8') });
      } },
    ],
  });
  try { await run(f, () => { authenticated = true; }); } finally { await f.close(); }
}

for (const audience of ['member', 'investor']) for (const intent of ['signin', 'signup']) {
  test(`${audience} ${intent}: actual entry -> signed edge denial -> actual retry -> confirmed destination`, async () => {
    const member = audience === 'member';
    await entryComposition(async (f, authenticate) => {
      const leaf = member ? '/vault-member/passport/?view=progress#achievements' : '/investor-portal/documents/?type=legal#record';
      const entry = member ? '/vault-member/' : '/investor-portal/login/';
      await f.goto(entry + '?' + new URLSearchParams({ next: leaf, ...(member ? { ref: 'VaultFriend' } : {}) }) + (member ? (intent === 'signup' ? '#register' : '#login') : ''));
      const selector = member ? (intent === 'signup' ? '#obelisk-create-account' : '#obelisk-sign-in')
        : (intent === 'signup' ? '#investorCreateIdentity' : '#investorObeliskSignIn');
      const first = new URL(await f.page.locator(selector).getAttribute('href'), origin);
      assert.equal(first.searchParams.get('intent'), intent);
      const originalReturn = first.searchParams.get('return');
      if (member || intent === 'signup') assert.equal(new URL(originalReturn, origin).pathname, entry);
      const flow = await journey(originalReturn, intent);
      const recovery = destination(await flow.callback({ error: 'access_denied', return: '//evil.test/', audience: 'other', intent: 'other' }));
      assert.equal(recovery.pathname, entry);
      assert.equal(recovery.searchParams.get('auth_intent'), intent);
      assert.equal(recovery.searchParams.get('auth_error'), 'provider_denied');
      assert.equal(recovery.searchParams.get(member ? 'return' : 'next'), leaf);
      if (member) {
        assert.equal(recovery.searchParams.get('next'), null, 'member root must not be wrapped in another next');
        assert.equal(recovery.searchParams.get('ref'), 'VaultFriend');
        assert.equal(recovery.hash, intent === 'signup' ? '#register' : '#login');
      }
      await f.goto(recovery.pathname + recovery.search + recovery.hash);
      if (member) assert.equal(await f.page.locator(intent === 'signup' ? '#panel-register' : '#panel-login').isVisible(), true);
      const retry = new URL(await f.page.locator(selector).getAttribute('href'), origin);
      assert.equal(retry.searchParams.get('intent'), intent);
      const retryReturn = retry.searchParams.get('return');
      const resumed = new URL(retryReturn, origin);
      if (member) {
        assert.equal(resumed.pathname, '/vault-member/');
        assert.equal(resumed.searchParams.get('return'), leaf);
        assert.equal(resumed.searchParams.get('ref'), 'VaultFriend');
      } else if (intent === 'signup') {
        assert.equal(resumed.pathname, '/investor-portal/login/');
        assert.equal(resumed.searchParams.get('next'), leaf);
        assert.equal(resumed.searchParams.get('identity'), 'created');
      } else assert.equal(retryReturn, leaf);
      const second = await journey(retryReturn, intent);
      await second.prepareToken();
      const success = destination(await second.callback());
      authenticate();
      await f.goto(success.pathname + success.search + success.hash);
      if (member && intent === 'signup') {
        await f.page.locator('#panel-oauth-complete').waitFor({ state: 'visible' });
        assert.equal(new URL(f.page.url()).pathname, '/vault-member/', 'identity alone does not bypass profile completion');
        await f.page.locator('#oauth-username').fill('VaultPerson');
        await f.page.locator('#oauth-subscribe').uncheck();
        await f.page.locator('#oauth-complete-form button[type="submit"]').click();
      }
      await waitFor(async () => new URL(f.page.url()).pathname === new URL(leaf, origin).pathname);
      const arrived = new URL(f.page.url());
      assert.equal(arrived.searchParams.get(member ? 'view' : 'type'), member ? 'progress' : 'legal');
      assert.equal(arrived.hash, member ? '#achievements' : '#record');
      if (member) assert.equal(arrived.searchParams.get('ref'), 'VaultFriend');
    }, { member, intent });
  });
}

test('known-entry recovery allowlists handoff context and drops unbounded auth/query decoration', async () => {
  for (const [path, params, key, leaf] of [
    ['/vault-member/', { return: '/vault-member/passport/', ref: 'VaultFriend' }, 'return', '/vault-member/passport/'],
    ['/vault-member/', { next: '/vault-member/passport/', ref: 'VaultFriend' }, 'next', '/vault-member/passport/'],
    ['/investor-portal/login/', { next: '/investor-portal/documents/', identity: 'created', application: 'submitted' }, 'next', '/investor-portal/documents/'],
  ]) {
    const original = path + '?' + new URLSearchParams({ ...params, auth_error: 'forged', auth_intent: 'forged', auth_detail: 'forged', extra: 'unbounded' });
    const flow = await journey(original, 'signup');
    flow.values.clear();
    const recovery = destination(await flow.callback({ error: 'ignored' }));
    assert.equal(recovery.pathname, path);
    assert.equal(recovery.searchParams.get(key), leaf);
    assert.equal(recovery.searchParams.get('auth_error'), 'flow_expired');
    assert.equal(recovery.searchParams.get('auth_intent'), 'signup');
    assert.equal(recovery.searchParams.get('auth_detail'), null);
    assert.equal(recovery.searchParams.get('extra'), null);
    if (params.ref) assert.equal(recovery.searchParams.get('ref'), params.ref);
    if (params.identity) assert.equal(recovery.searchParams.get('identity'), 'created');
    if (params.application) assert.equal(recovery.searchParams.get('application'), 'submitted');
  }
});

test('signed nested hostile or recursive entry fields never become external or recursive client retries', async () => {
  for (const member of [true, false]) await entryComposition(async f => {
    const entry = member ? '/vault-member/' : '/investor-portal/login/';
    const key = member ? 'return' : 'next';
    for (const hostile of ['https://evil.test/', '//evil.test/', '/\\evil.test/', entry + '?next=' + encodeURIComponent(entry), member ? '/investor-portal/documents/' : '/vault-member/passport/']) {
      const original = entry + '?' + new URLSearchParams({ [key]: hostile, ref: '<bad>', identity: 'unbounded', application: 'unbounded', auth_detail: 'forged' });
      const flow = await journey(original, 'signup');
      const recovery = destination(await flow.callback({ error: 'denied' }));
      assert.equal(recovery.origin, origin);
      assert.equal(recovery.pathname, entry);
      assert.equal(recovery.searchParams.get('ref'), null);
      assert.equal(recovery.searchParams.get('identity'), null);
      assert.equal(recovery.searchParams.get('application'), null);
      assert.equal(recovery.searchParams.get('auth_detail'), null);
      await f.goto(recovery.pathname + recovery.search + recovery.hash);
      const retry = new URL(await f.page.locator(member ? '#obelisk-create-account' : '#investorCreateIdentity').getAttribute('href'), origin);
      const back = new URL(retry.searchParams.get('return'), origin);
      assert.equal(back.origin, origin);
      assert.equal(back.pathname, entry);
      assert.equal(back.searchParams.get(key), member ? null : '/investor-portal/');
    }
  }, { member, intent: 'signup' });
});
