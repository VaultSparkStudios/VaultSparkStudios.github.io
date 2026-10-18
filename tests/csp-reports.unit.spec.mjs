import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/security-headers-worker.js';
import { handleCspReport, handleCspSummary, normalizeCspReports, CSP_MAX_BODY_BYTES } from '../cloudflare/csp-reports.mjs';

const now = new Date('2026-10-18T12:00:00Z');
const row = (directive = 'script-src', day = '2026-10-18') => ({ ts: `${day}T12:00:00Z`, directive, documentUri: 'https://private.test/secret?q=private' });
function fixture() {
  const legacy = new Map(), objects = new Map(), writes = [], names = [];
  let used = 0;
  const env = {
    RATE_LIMIT: {
      list: async ({ prefix }) => ({ keys: [...legacy.keys()].filter(name => name.startsWith(prefix)).map(name => ({ name })), list_complete: true }),
      get: async key => legacy.has(key) ? JSON.stringify(legacy.get(key)) : null,
      put: async () => { throw new Error('Shared KV must never be written'); },
    },
    TT_REPORTS: {
      list: async ({ prefix }) => ({ objects: [...objects.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })), truncated: false }),
      get: async key => objects.has(key) ? { json: async () => objects.get(key) } : null,
      put: async (key, value) => { writes.push(key); objects.set(key, JSON.parse(value)); },
    },
    FORM_RATE_LIMIT: { idFromName: name => { names.push(name); return name; }, get: () => ({ fetch: async () => Response.json(used < 3 ? { allowed: true, remaining: 2 - used++ } : { allowed: false, remaining: 0 }) }) },
  };
  return { env, legacy, objects, writes, names };
}
const request = body => new Request('https://vaultsparkstudios.com/v/csp-report', { method: 'POST', body: JSON.stringify(body) });
async function intake(req, env) {
  const waits = [];
  const response = await handleCspReport(req, env, { waitUntil: p => waits.push(p) });
  await Promise.all(waits);
  assert.equal(response.status, 204);
}

test('500 diagnostic posts use only three private batches and never even read shared KV', async () => {
  const f = fixture();
  f.env.RATE_LIMIT = new Proxy({}, { get() { throw new Error('CSP intake touched shared KV'); } });
  for (let i = 0; i < 500; i++) await intake(request({ 'csp-report': { 'violated-directive': 'script-src' } }), f.env);
  assert.equal(f.writes.length, 3);
  assert.equal(new Set(f.names).size, 1);
  assert.equal(f.names[0], 'diagnostic:csp:write-budget:v1');
  assert.equal([...f.objects.values()][0].collection.sampleRate, 1);
});

test('real worker routes preserve report 204 and complete aggregate contract', async () => {
  const f = fixture(), waits = [];
  const response = await worker.fetch(request({ 'csp-report': { 'violated-directive': 'script-src' } }), f.env, { waitUntil: p => waits.push(p) });
  await Promise.all(waits);
  assert.equal(response.status, 204);
  const summary = await worker.fetch(new Request('https://vaultsparkstudios.com/v/csp-violations-summary'), f.env, {});
  assert.equal(summary.status, 200);
  assert.equal((await summary.json()).total3d, 1);
});

test('chunked oversized input without content-length is cancelled before storage', async () => {
  const f = fixture(); let cancelled = false;
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(CSP_MAX_BODY_BYTES)); c.enqueue(new Uint8Array(1)); }, cancel() { cancelled = true; } });
  await intake(new Request('https://example.test/v/csp-report', { method: 'POST', body, duplex: 'half' }), f.env);
  assert.equal(cancelled, true);
  assert.equal(f.names.length, 0);
});

test('normalization handles browser wire formats, bounds batches and strips URL query/hash', () => {
  const reports = normalizeCspReports(Array.from({ length: 8 }, () => ({ type: 'csp-violation', url: 'https://a.test/path?secret=1#private', body: { effectiveDirective: 'img-src', blockedURL: 'https://b.test/x?key=1#z' } })), now);
  assert.equal(reports.length, 5);
  assert.equal(reports[0].directive, 'img-src');
  assert.equal(reports[0].documentUri, 'https://a.test/path');
  assert.equal(reports[0].blockedUri, 'https://b.test/x');
  assert.equal(normalizeCspReports({}).length, 0);
  assert.equal(normalizeCspReports({ violatedDirective: 'https://private.test/secret' })[0].directive, 'unknown');
  assert.equal(normalizeCspReports({ violatedDirective: "script-src 'self' https://private.test" })[0].directive, 'script-src');
});

test('missing bindings, failed counters and rejected object writes remain best-effort 204', async () => {
  await intake(request({ violatedDirective: 'x' }), {});
  for (const source of ['counter', 'object']) {
    const f = fixture();
    if (source === 'counter') f.env.FORM_RATE_LIMIT.get = () => ({ fetch: async () => { throw new Error('offline'); } });
    else f.env.TT_REPORTS.put = async () => { throw new Error('offline'); };
    await intake(request({ violatedDirective: 'x' }), f.env);
  }
});

test('legacy modulo-zero full ring counts all 200 actual slots and first 0001 report', async () => {
  const f = fixture();
  f.legacy.set('csp:2026-10-18:counter', 0);
  for (let i = 0; i < 200; i++) f.legacy.set(`csp:2026-10-18:${String(i).padStart(4, '0')}`, row());
  let summary = await (await handleCspSummary(f.env, now)).json();
  assert.equal(summary.total3d, 200);
  assert.deepEqual(summary.topDirectives, [{ directive: 'script-src', count: 200 }]);
  f.legacy.clear(); f.legacy.set('csp:2026-10-18:0001', row('img-src'));
  summary = await (await handleCspSummary(f.env, now)).json();
  assert.equal(summary.total3d, 1);
  assert.equal(summary.topDirectives[0].directive, 'img-src');
});

test('complete sources combine all three days, disclose retained meaning, expose no URLs', async () => {
  const f = fixture();
  f.legacy.set('csp:2026-10-16:0001', row('style-src', '2026-10-16'));
  f.objects.set('csp/raw/dt=2026-10-17/a.json', { schemaVersion: 1, reports: [row('img-src', '2026-10-17'), row('img-src', '2026-10-17')] });
  const result = await handleCspSummary(f.env, now), body = await result.text(), summary = JSON.parse(body);
  assert.equal(result.status, 200);
  assert.equal(summary.total3d, 3);
  assert.equal(summary.collection.countMeaning, 'retained-reports');
  assert.equal(summary.collection.exhaustive, false);
  assert.equal(summary.collection.legacyRecords, 1);
  assert.equal(body.includes('private'), false);
  assert.equal(body.includes('documentUri'), false);
});

test('pagination reads every legacy and new page, without trusting counts', async () => {
  const f = fixture();
  f.legacy.set('csp:2026-10-18:0001', row());
  f.objects.set('csp/raw/dt=2026-10-18/a.json', { schemaVersion: 1, reports: [row('img-src')] });
  const originalKv = f.env.RATE_LIMIT.list, originalR2 = f.env.TT_REPORTS.list;
  f.env.RATE_LIMIT.list = args => args.cursor ? originalKv(args) : Promise.resolve({ keys: [], list_complete: false, cursor: 'next' });
  f.env.TT_REPORTS.list = args => args.cursor ? originalR2(args) : Promise.resolve({ objects: [], truncated: true, cursor: 'next' });
  assert.equal((await (await handleCspSummary(f.env, now)).json()).total3d, 2);
});

test('maximum accepted window stays below internal request budget with at most five concurrent reads', async () => {
  const f = fixture();
  for (const day of ['2026-10-18', '2026-10-17', '2026-10-16']) {
    for (let i = 0; i < 200; i++) f.legacy.set(`csp:${day}:${String(i).padStart(4, '0')}`, row('script-src', day));
    for (let i = 0; i < 96; i++) f.objects.set(`csp/raw/dt=${day}/a-${i}.json`, { schemaVersion: 1, reports: [row('img-src', day)] });
  }
  let active = 0, peak = 0, calls = 0;
  for (const [binding, method] of [[f.env.RATE_LIMIT, 'get'], [f.env.RATE_LIMIT, 'list'], [f.env.TT_REPORTS, 'get'], [f.env.TT_REPORTS, 'list']]) {
    const original = binding[method];
    binding[method] = async (...args) => {
      calls++; active++; peak = Math.max(peak, active);
      try { await Promise.resolve(); return await original(...args); } finally { active--; }
    };
  }
  const result = await handleCspSummary(f.env, now);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).total3d, 888);
  assert.equal(calls, 894);
  assert.ok(peak <= 5);
});

test('a verified empty source is zero; unavailable, malformed or truncated sources are unknown', async () => {
  assert.equal((await (await handleCspSummary(fixture().env, now)).json()).total3d, 0);
  const mutations = [
    f => { delete f.env.TT_REPORTS; }, f => { delete f.env.RATE_LIMIT; },
    f => { f.env.RATE_LIMIT.list = async () => { throw new Error('offline'); }; },
    f => { f.env.TT_REPORTS.list = async () => ({ objects: [], truncated: true, cursor: 'same' }); },
    f => { f.env.RATE_LIMIT.list = async () => ({ keys: [], list_complete: false }); },
    f => { f.legacy.set('csp:2026-10-18:0001', {}); },
    f => { f.objects.set('csp/raw/dt=2026-10-18/a.json', { reports: [] }); },
    f => { f.objects.set('csp/raw/dt=2026-10-18/a.json', { schemaVersion: 1, reports: [row()] }); f.env.TT_REPORTS.get = async () => null; },
    f => { for (let i = 0; i < 97; i++) f.objects.set(`csp/raw/dt=2026-10-18/a-${i}.json`, { schemaVersion: 1, reports: [row()] }); },
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f);
    const result = await handleCspSummary(f.env, now), body = await result.json();
    assert.equal(result.status, 503); assert.equal(body.total3d, null); assert.equal(body.state, 'unavailable');
  }
});
