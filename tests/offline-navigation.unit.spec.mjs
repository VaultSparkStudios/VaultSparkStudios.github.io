import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const origin = 'https://vaultsparkstudios.com';

function worker({ online } = {}) {
  const handlers = {}, stores = new Map(), lookups = [], deleted = [];
  const key = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  function store(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async match(request) { lookups.push([name, key(request)]); return entries.get(key(request))?.clone(); },
      async put(request, response) { entries.set(key(request), response.clone()); },
      async delete(request) { deleted.push([name, key(request)]); return entries.delete(key(request)); },
      async keys() { return [...entries.keys()]; },
    };
  }
  const context = {
    self: { location: { origin }, addEventListener(name, callback) { handlers[name] = callback; } },
    caches: {
      async open(name) { return store(name); },
      // A cross-cache lookup would let stale/unrelated caches satisfy navigation.
      match() { throw new Error('Navigation must use the current named cache'); },
    },
    fetch: async () => { if (online) return online.clone(); throw new Error('Origin unreachable'); },
    URL, Headers, Response, Date, Set, Promise,
  };
  vm.runInNewContext(source + '\nglobalThis.config = { CACHE_NAME, PAGE_CACHE, PAGE_TTL_MS };', context);
  const config = context.config;
  store(config.CACHE_NAME).put('/offline.html', new Response('offline fallback'));
  return {
    config, lookups, deleted, store,
    seed(name, path, body, age = 0) {
      return store(name).put(path, new Response(body, { headers: { 'x-cached-at': String(Date.now() - age) } }));
    },
    async navigate(path, options = {}) {
      let response;
      handlers.fetch({ request: { url: new URL(path, origin).href, mode: 'navigate', method: 'GET', headers: new Headers(), ...options },
        respondWith(promise) { response = promise; } });
      return response ? (await response)?.text() : undefined;
    },
  };
}

test('fresh runtime page wins over the public precache', async () => {
  const w = worker();
  await w.seed(w.config.PAGE_CACHE, '/games/', 'recent page');
  await w.seed(w.config.CACHE_NAME, '/games/', 'installed page');
  assert.equal(await w.navigate('/games/'), 'recent page');
});

test('first offline navigation opens an explicitly installed public page, normalizing only its query', async () => {
  const w = worker();
  await w.seed(w.config.CACHE_NAME, '/games/', 'installed page');
  assert.equal(await w.navigate('/games/'), 'installed page');
  assert.equal(await w.navigate('/games/?source=offline'), 'installed page');
  assert.equal(await w.navigate('/games/private/'), 'offline fallback');
});

test('expired runtime entry is deleted before falling back to current public precache', async () => {
  const w = worker();
  await w.seed(w.config.PAGE_CACHE, '/games/', 'expired', w.config.PAGE_TTL_MS + 1000);
  await w.seed(w.config.CACHE_NAME, '/games/', 'installed page');
  assert.equal(await w.navigate('/games/'), 'installed page');
  assert.deepEqual(w.deleted, [[w.config.PAGE_CACHE, origin + '/games/']]);
});

test('missing, undeclared, protected and asset routes never borrow other precached documents', async () => {
  const w = worker();
  await w.seed(w.config.CACHE_NAME, '/unlisted/', 'unlisted');
  await w.seed(w.config.CACHE_NAME, '/vault-member/', 'member shell');
  await w.seed(w.config.CACHE_NAME, '/vault-member/admin/', 'admin');
  await w.seed(w.config.CACHE_NAME, '/vault-member/portal-core.js', 'script');
  for (const route of ['/contact/', '/unlisted/', '/vault-member/', '/vault-member/admin/', '/vault-member/portal-core.js']) {
    assert.equal(await w.navigate(route), 'offline fallback', route);
  }
});

test('non-GET or authorized requests cannot use the new public fallback', async () => {
  const w = worker();
  await w.seed(w.config.CACHE_NAME, '/games/', 'installed page');
  assert.equal(await w.navigate('/games/', { method: 'POST' }), 'offline fallback');
  assert.equal(await w.navigate('/games/', { headers: new Headers({ Authorization: 'Bearer fixture' }) }), 'offline fallback');
});

test('expired undeclared runtime page falls back offline and unrelated caches stay unused', async () => {
  const w = worker();
  await w.seed(w.config.PAGE_CACHE, '/unlisted/', 'expired', w.config.PAGE_TTL_MS + 1000);
  await w.seed('old-release', '/unlisted/', 'old page');
  await w.seed('old-release', '/games/', 'old game');
  await w.seed('old-release', '/offline.html', 'old offline');
  assert.equal(await w.navigate('/unlisted/'), 'offline fallback');
  assert.equal(await w.navigate('/games/'), 'offline fallback');
  assert.ok(w.lookups.every(([name]) => [w.config.CACHE_NAME, w.config.PAGE_CACHE].includes(name)));
});

test('online response and existing runtime stamping remain authoritative', async () => {
  const w = worker({ online: new Response('network page') });
  await w.seed(w.config.CACHE_NAME, '/games/', 'installed page');
  assert.equal(await w.navigate('/games/?q=1'), 'network page');
  const cached = await w.store(w.config.PAGE_CACHE).match('/games/?q=1');
  assert.equal(await cached.text(), 'network page');
  assert.ok(Number(cached.headers.get('x-cached-at')) > 0);
});

test('HTTP errors retain their network response and foreign navigation is not intercepted', async () => {
  const w = worker({ online: new Response('not found', { status: 404 }) });
  await w.seed(w.config.CACHE_NAME, '/games/', 'installed page');
  assert.equal(await w.navigate('/games/'), 'not found');
  assert.equal(await w.store(w.config.PAGE_CACHE).match('/games/'), undefined);
  assert.equal(await w.navigate('https://other.example/games/'), undefined);
});
