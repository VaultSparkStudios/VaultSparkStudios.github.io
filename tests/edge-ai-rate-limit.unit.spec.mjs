import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import { aiPrincipalHash, consumeAiRequestLimit, enforceAiRequestLimit, verifiedAiUser } from '../supabase/functions/_shared/aiRequestLimit.ts';

const key = 'server-only-existing-service-role-key-for-test';
const member = '11111111-1111-4111-8111-111111111111';
const req = (ip = '203.0.113.1', authorization = null) => new Request('https://function.invalid/semantic-search', {
  method: 'POST', headers: { 'CF-Connecting-IP': ip, ...(authorization ? { authorization } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'VerifiedGame browser strategy' }),
});

function durableFixture() {
  let used = 0, anonymous = 0;
  const principals = new Map();
  const calls = [];
  return { calls, rpc: async (name, args) => {
    calls.push({ name, args });
    // Independent asynchronous callers share one simulated RPC state. The
    // migration owns the real database transaction/lock; this is not live SQL proof.
    await Promise.resolve();
    const n = principals.get(args.p_principal_hash) || 0;
    if (used >= 120 || n >= 12 || (args.p_anonymous && anonymous >= 60)) return { data: 'limited', error: null };
    used++; if (args.p_anonymous) anonymous++; principals.set(args.p_principal_hash, n + 1);
    return { data: 'allowed', error: null };
  } };
}
const consume = (supabase, request = req(), verifiedUserId = null, endpoint = 'semantic-search', extra = {}) => consumeAiRequestLimit({ req: request, endpoint, supabase, verifiedUserId, serverKey: key, ...extra });

test('principal keys are private, keyed and shared across endpoints; raw header or UUID is never sent', async () => {
  const db = durableFixture();
  await consume(db, req('198.51.100.7'), member);
  await consume(db, req('198.51.100.99'), member, 'ask-ignis');
  assert.equal(db.calls[0].args.p_principal_hash, db.calls[1].args.p_principal_hash);
  assert.match(db.calls[0].args.p_principal_hash, /^[a-f0-9]{64}$/);
  assert.equal(db.calls[0].args.p_anonymous, false);
  assert.doesNotMatch(JSON.stringify(db.calls), /198\.51\.100|11111111-1111/);
  assert.notEqual(await aiPrincipalHash(req(), member, key), await aiPrincipalHash(req(), member, key + '-other-project'));
  assert.notEqual(await aiPrincipalHash(req(member), null, key), await aiPrincipalHash(req(member), member, key));
});

test('concurrent direct callers across the three endpoints share the same principal allowance', async () => {
  const db = durableFixture();
  const endpoints = ['ask-ignis', 'semantic-search', 'eternal-intelligence'];
  const states = await Promise.all(Array.from({ length: 80 }, (_, i) => consume(db, req(String(i)), member, endpoints[i % 3])));
  assert.equal(states.filter((x) => x === 'allowed').length, 12);
  assert.equal(states.filter((x) => x === 'limited').length, 68);
});

test('rotating anonymous identity hints cannot bypass the shared anonymous allowance', async () => {
  const db = durableFixture();
  const states = await Promise.all(Array.from({ length: 100 }, (_, i) => consume(db, req(`spoof-${i}`))));
  assert.equal(states.filter((x) => x === 'allowed').length, 60);
  assert.equal(states.filter((x) => x === 'limited').length, 40);
  assert.ok(db.calls.every(({ args }) => args.p_anonymous));
});

test('the global allowance bounds distinct authenticated principals and endpoint rotation', async () => {
  const db = durableFixture();
  const states = await Promise.all(Array.from({ length: 160 }, (_, i) => consume(db, req(), `${i.toString(16).padStart(8, '0')}-1111-4111-8111-111111111111`, i % 2 ? 'ask-ignis' : 'eternal-intelligence')));
  assert.equal(states.filter((x) => x === 'allowed').length, 120);
});

test('other project state is separate and clients cannot choose an arbitrary namespace/endpoint', async () => {
  const a = durableFixture(), b = durableFixture();
  await Promise.all(Array.from({ length: 12 }, () => consume(a, req(), member)));
  assert.equal(await consume(a, req(), member), 'limited');
  assert.equal(await consume(b, req(), member), 'allowed');
  assert.equal(await consume(b, req(), member, 'made-up-namespace'), 'unavailable');
  assert.ok(b.calls.every(({ args }) => !('p_namespace' in args) && !('p_limit' in args)));
});

test('missing key, RPC errors, malformed/unknown results and timeouts fail closed with no paid work', async () => {
  const bad = [null, {}, { data: true }, { data: 'allowed', error: { code: 'outage' } }, { data: 'unknown' }];
  for (const result of bad) assert.equal(await consume({ rpc: async () => result }), 'unavailable');
  assert.equal(await consume({ rpc: () => { throw Error('outage'); } }), 'unavailable');
  let called = false;
  assert.equal(await consume({ rpc: async () => { called = true; } }, req(), null, 'semantic-search', { serverKey: '' }), 'unavailable');
  assert.equal(called, false);
  assert.equal(await consume({ rpc: () => new Promise(() => {}) }, req(), null, 'semantic-search', { timeoutMs: 5 }), 'unavailable');
  const response = await enforceAiRequestLimit({ req: req(), endpoint: 'ask-ignis', supabase: { rpc: async () => ({ error: 'outage' }) }, verifiedUserId: null, serverKey: key }, {});
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await response.json()).code, 'ai_request_limit_unavailable');
});

test('only Auth verification supplies a member principal; forged hints/tokens stay anonymous', async () => {
  const seen = [];
  const authClient = { auth: { getUser: async (token) => { seen.push(token); return token === 'valid' ? { data: { user: { id: member, is_anonymous: false } } } : { error: 'invalid' }; } } };
  assert.equal(await verifiedAiUser(authClient, 'Bearer valid'), member);
  assert.equal(await verifiedAiUser(authClient, 'Bearer forged.uuid.claim'), null);
  assert.equal(await verifiedAiUser(authClient, `Basic ${member}`), null);
  assert.deepEqual(seen, ['valid', 'forged.uuid.claim']);
  for (const user of [{ id: member, is_anonymous: true }, { id: member }, { id: member, is_anonymous: 'false' }]) {
    assert.equal(await verifiedAiUser({ auth: { getUser: async () => ({ data: { user } }) } }, 'Bearer valid'), null);
  }
});

test('the migration serializes read/check/increment, bounds retained rows and locks RPC/table access', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/20261123041000_website_ai_request_limits.sql', import.meta.url), 'utf8');
  const lock = sql.indexOf('perform pg_advisory_xact_lock(736903)');
  assert.ok(lock >= 0 && lock < sql.indexOf('v_now := clock_timestamp()'));
  assert.ok(lock < sql.indexOf('select used into v_global'));
  assert.ok(sql.indexOf('coalesce(v_global,0) >= 120') < sql.indexOf('insert into public.website_ai_request_limits'));
  assert.match(sql, /coalesce\(v_principal,0\) >= 12/);
  assert.match(sql, /coalesce\(v_anonymous,0\) >= 60/);
  assert.match(sql, /interval '2 minutes'/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public.website_ai_request_limits from public, anon, authenticated, service_role/);
  assert.match(sql, /grant execute on function public.claim_website_ai_request\(text,text,boolean\) to service_role/);
  assert.doesNotMatch(sql, /grant execute[^;]+to (?:anon|authenticated|public)/);
});

let harnessId = 0;
async function endpointHarness(t, endpoint, options = {}) {
  const events = [];
  const env = new Map(Object.entries({ SUPABASE_URL: 'https://owned.invalid', SUPABASE_SERVICE_ROLE_KEY: key, SUPABASE_ANON_KEY: 'browser-safe-key', ANTHROPIC_API_KEY: 'fake-test-only-key' }));
  let handler;
  const db = {
    rpc: async (name, args) => { events.push({ kind: 'rpc', name, args }); return options.limiterDb ? options.limiterDb.rpc(name, args) : options.rateOutage ? { error: 'unavailable' } : { data: options.limited ? 'limited' : 'allowed' }; },
    auth: { getUser: async (token) => {
      events.push({ kind: 'auth', token });
      if (options.authUserForToken) return { data: { user: options.authUserForToken(token) } };
      return options.authValid && token === 'valid' ? { data: { user: { id: member, is_anonymous: options.authAnonymous === true } } } : { error: 'invalid' };
    } },
    from(table) {
      events.push({ kind: 'table', table });
      const result = () => ({ data: table === 'vault_members' ? { plan_key: 'vault_sparked_pro', is_sparked: true }
        : table === 'subscriptions' ? null
        : table === 'ignis_usage_monthly' ? { request_count: 0 }
        : table === 'semantic_search_cache' && options.cacheHit ? { payload: { answer: 'Cached answer [1]', citations: [], noAnswer: false, suggestions: [], model: 'cached-model', corpusVersion: 'fixture' } }
        : table === 'ignis_response_cache' && options.cacheHit ? { reply: endpoint === 'ask-ignis' ? 'A grounded cached answer.' : JSON.stringify({ title: 'Cached briefing', dek: 'Grounded', sections: [{ heading: 'A', body: 'A' }, { heading: 'B', body: 'B' }] }), model: 'cached-model' }
        : null, error: null });
      const chain = new Proxy({}, { get: (_, name) => name === 'then' ? (resolve) => Promise.resolve(result()).then(resolve)
        : name === 'maybeSingle' || name === 'single' ? async () => result()
        : () => chain });
      return chain;
    },
  };
  const previous = { Deno: globalThis.Deno, fetch: globalThis.fetch, h: globalThis.__aiEndpointHarness };
  globalThis.Deno = { env: { get: (name) => env.get(name) }, serve: (fn) => { handler = fn; } };
  globalThis.__aiEndpointHarness = {
    createClient: () => db,
    isPaused: () => false,
    isCapBreached: async () => { events.push({ kind: 'spend-cap' }); return options.spendCapped === true; },
    capExceededResponse: () => new Response(JSON.stringify({ code: 'spend-capped' }), { status: 429 }),
    loadUserMemory: async () => [], loadMemberProfile: async () => null,
    memberProfileAsContextBlock: () => '', memoryAsContextBlock: () => '', tierPersonaSuffix: () => '', meterCall: async () => {},
  };
  globalThis.fetch = async (url) => {
    events.push({ kind: 'fetch', url: String(url) });
    if (String(url).includes('anthropic') || String(url).includes('/v1/chat/completions')) throw Error('Unexpected model call in no-paid-work test');
    if (String(url).includes('llms-full')) return new Response('# VerifiedGame\nVerifiedGame is a browser strategy game made by VaultSpark Studios.');
    if (String(url).includes('news-desk-feed')) return Response.json({ items: [] });
    return Response.json({ project: { name: 'VaultSpark Studios' }, catalog: [
      { id: 'verifiedgame', name: 'VerifiedGame', status: 'SPARKED', note: 'VerifiedGame browser strategy game made by VaultSpark Studios.', deployedUrl: 'https://vaultsparkstudios.com/games/verifiedgame/' },
      ...Array.from({ length: 9 }, (_, i) => ({ id: `other-${i}`, name: `Other ${i}`, status: 'FORGE', note: 'A different research project about music and painting.' })),
    ], portfolio: {}, pulse: {} });
  };
  const id = ++harnessId;
  const hook = registerHooks({
    resolve(specifier, context, next) {
      if (specifier.startsWith('https://esm.sh/')) return { url: `ai-fixture:client-${id}`, shortCircuit: true };
      if (specifier.startsWith('https://deno.land/')) return { url: `ai-fixture:serve-${id}`, shortCircuit: true };
      if (specifier.endsWith('/tokenMeter.ts')) return { url: `ai-fixture:meter-${id}`, shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url.startsWith('ai-fixture:client-')) return { format: 'module', source: 'export const createClient=(...a)=>globalThis.__aiEndpointHarness.createClient(...a);', shortCircuit: true };
      if (url.startsWith('ai-fixture:serve-')) return { format: 'module', source: 'export const serve=(fn)=>globalThis.Deno.serve(fn);', shortCircuit: true };
      if (url.startsWith('ai-fixture:meter-')) {
        const names = ['isPaused','isCapBreached','capExceededResponse','loadUserMemory','loadMemberProfile','memberProfileAsContextBlock','memoryAsContextBlock','tierPersonaSuffix','meterCall'];
        return { format: 'module', source: names.map((name) => `export const ${name}=(...a)=>globalThis.__aiEndpointHarness.${name}(...a);`).join('\n'), shortCircuit: true };
      }
      return next(url, context);
    },
  });
  t.after(() => { hook.deregister(); globalThis.Deno = previous.Deno; globalThis.fetch = previous.fetch; globalThis.__aiEndpointHarness = previous.h; });
  await import(new URL(`../supabase/functions/${endpoint}/index.ts?ai-test=${id}`, import.meta.url));
  assert.equal(typeof handler, 'function');
  return { events, handler };
}

for (const endpoint of ['ask-ignis', 'semantic-search', 'eternal-intelligence']) {
  test(`${endpoint}: actual handler fails closed on limiter outage before cache, public fetch or model`, async (t) => {
    const h = await endpointHarness(t, endpoint, { rateOutage: true, authValid: true });
    const request = req('203.0.113.9', 'Bearer valid');
    let bodyParsed = false;
    request.json = async () => { bodyParsed = true; throw Error('Body must not be decoded before rate admission'); };
    const r = await h.handler(request);
    assert.equal(r.status, 503);
    assert.equal(bodyParsed, false);
    assert.equal(h.events.some((x) => x.kind === 'fetch' || x.kind === 'spend-cap' || (x.kind === 'table' && /cache/.test(x.table))), false);
    const call = h.events.find((x) => x.kind === 'rpc');
    assert.equal(call.args.p_anonymous, false);
    assert.equal(call.args.p_principal_hash, await aiPrincipalHash(req('203.0.113.9'), member, key));
    assert.ok(h.events.findIndex((x) => x.kind === 'auth') < h.events.findIndex((x) => x.kind === 'rpc'));
  });
  test(`${endpoint}: verified anonymous Auth accounts retain the anonymous rate class`, async (t) => {
    const h = await endpointHarness(t, endpoint, { authValid: true, authAnonymous: true, limited: true });
    const request = req('203.0.113.9', 'Bearer valid');
    const response = await h.handler(request);
    assert.equal(response.status, 429);
    const call = h.events.find((x) => x.kind === 'rpc');
    assert.equal(call.args.p_anonymous, true);
    assert.equal(call.args.p_principal_hash, await aiPrincipalHash(request, null, key));
    assert.equal(h.events.some((x) => x.kind === 'fetch'), false);
  });
}

test('actual public handler cannot rotate verified anonymous Auth UUIDs around the shared anonymous budget', async (t) => {
  const limiterDb = durableFixture();
  const h = await endpointHarness(t, 'semantic-search', {
    limiterDb, cacheHit: true,
    authUserForToken: (token) => ({
      id: `${Number(token.slice(5)).toString(16).padStart(8, '0')}-1111-4111-8111-111111111111`,
      is_anonymous: true,
    }),
  });
  const results = [];
  for (let i = 0; i < 80; i++) results.push(await h.handler(req(`spoof-${i}`, `Bearer anon-${i}`)));
  assert.equal(results.filter((r) => r.status === 200).length, 60);
  assert.equal(results.filter((r) => r.status === 429).length, 20);
  assert.ok(limiterDb.calls.every(({ args }) => args.p_anonymous === true));
  assert.equal(h.events.some((x) => x.kind === 'spend-cap'), false);
});

test('rate-only anonymous classification does not change existing member entitlements', async (t) => {
  const h = await endpointHarness(t, 'ask-ignis', { authValid: true, authAnonymous: true });
  const r = await h.handler(new Request('https://function.invalid/ask-ignis', {
    method: 'POST', headers: { authorization: 'Bearer valid', 'Content-Type': 'application/json' }, body: JSON.stringify({ probe: true }),
  }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).access.isPro, true);
  assert.equal(h.events.find((x) => x.kind === 'rpc').args.p_anonymous, true);
});

test('semantic-search: actual public cache hit remains available under the spend cap without a model call', async (t) => {
  const h = await endpointHarness(t, 'semantic-search', { cacheHit: true, spendCapped: true });
  const r = await h.handler(req());
  assert.equal(r.status, 200);
  assert.equal((await r.json()).cached, true);
  assert.equal(h.events.some((x) => x.kind === 'spend-cap'), false);
  assert.equal(h.events.filter((x) => x.kind === 'rpc').length, 1);
});

test('semantic-search: rejected forged auth token never buys a member allowance', async (t) => {
  const h = await endpointHarness(t, 'semantic-search', { limited: true });
  const r = await h.handler(req(member, 'Bearer forged.uuid.claim'));
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('Retry-After'), '60');
  assert.equal(h.events.find((x) => x.kind === 'rpc').args.p_anonymous, true);
  assert.equal(h.events.some((x) => x.kind === 'fetch'), false);
});

test('eternal-intelligence: a real cached dispatch still avoids inference and spending-cap work', async (t) => {
  const h = await endpointHarness(t, 'eternal-intelligence', { cacheHit: true, spendCapped: true, authValid: true });
  const r = await h.handler(req('203.0.113.1', 'Bearer valid'));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).intelligence.semanticCache, true);
  assert.equal(h.events.some((x) => x.kind === 'spend-cap'), false);
});

test('ask-ignis: actual member cache hit preserves access/monthly accounting without a model call', async (t) => {
  const h = await endpointHarness(t, 'ask-ignis', { cacheHit: true, authValid: true });
  const r = await h.handler(new Request('https://function.invalid/ask-ignis', { method: 'POST', headers: { authorization: 'Bearer valid', 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'What projects are live?' }) }));
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.semanticCache, true);
  assert.equal(body.reply, 'A grounded cached answer.');
  assert.equal(h.events.filter((x) => x.kind === 'rpc').length, 1);
  assert.equal(h.events.some((x) => x.kind === 'fetch'), false);
});

test('OPTIONS and unsupported methods do not consume AI request budgets', async (t) => {
  const h = await endpointHarness(t, 'semantic-search');
  assert.equal((await h.handler(new Request('https://function.invalid', { method: 'OPTIONS' }))).status, 204);
  assert.equal((await h.handler(new Request('https://function.invalid', { method: 'GET' }))).status, 405);
  assert.equal(h.events.some((x) => x.kind === 'rpc'), false);
});
