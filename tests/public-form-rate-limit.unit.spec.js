import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicFormRateLimiter, checkDurableFormRateLimit } from '../cloudflare/public-form-rate-limit.mjs';

function fixture(previous) {
  let record = previous, queue = Promise.resolve();
  const storage = {
    get: async () => record,
    put: async (_key, value) => { record = value; },
    transaction(fn) { const next = queue.then(() => fn(storage)); queue = next.catch(() => {}); return next; },
  };
  const object = new PublicFormRateLimiter({ storage });
  let identifier;
  const env = {
    RATE_LIMIT: { get: async () => '0', put: async () => { throw new Error('KV put() limit exceeded for the day.'); } },
    FORM_RATE_LIMIT: { idFromName(name) { identifier = name; return name; }, get() {
      return { fetch: (url, init) => object.fetch(new Request(url, init)) };
    } },
  };
  return { env, identifier: () => identifier };
}

test('exhausted shared KV writes do not break signup; concurrent attempts still enforce three per hour', async () => {
  const f = fixture();
  const results = await Promise.all(Array.from({ length: 10 }, () => checkDurableFormRateLimit(f.env, '192.0.2.12', '/desk/dispatch/subscribe')));
  assert.equal(results.filter(result => result.allowed).length, 3);
  assert.equal(results.filter(result => !result.allowed).length, 7);
  assert.match(f.identifier(), /^[a-f0-9]{64}$/);
  assert.ok(!f.identifier().includes('192.0.2.12'));
});

test('migration preserves legacy attempts and next hourly window resets', async () => {
  const f = fixture({ window: Math.floor(Date.now() / 3600000) - 1, count: 3 });
  f.env.RATE_LIMIT.get = async () => '2';
  assert.deepEqual(await checkDurableFormRateLimit(f.env, '192.0.2.12', '/desk/dispatch/subscribe'), { allowed: true, remaining: 0 });
  assert.deepEqual(await checkDurableFormRateLimit(f.env, '192.0.2.12', '/desk/dispatch/subscribe'), { allowed: false, remaining: 0 });
});

test('legacy reads can fail while durable enforcement remains active; durable outages fail closed', async () => {
  const f = fixture();
  f.env.RATE_LIMIT.get = async () => { throw new Error('KV unavailable'); };
  assert.equal((await checkDurableFormRateLimit(f.env, '192.0.2.12', '/desk/dispatch/subscribe')).allowed, true);
  f.env.FORM_RATE_LIMIT.get = () => ({ fetch: async () => new Response('Unavailable', { status: 503 }) });
  await assert.rejects(checkDurableFormRateLimit(f.env, '192.0.2.12', '/desk/dispatch/subscribe'), /counter unavailable/);
});
