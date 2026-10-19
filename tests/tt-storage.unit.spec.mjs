import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/security-headers-worker.js';
import { PublicFormRateLimiter } from '../cloudflare/public-form-rate-limit.mjs';
import { readTtReports, decodeXml, parseTtListing } from '../scripts/lib/tt-report-reader.mjs';

async function intake({ raw, storage, budget, rate = '1', method = 'POST', headers = {} } = {}) {
  const pending = [], writes = [];
  const env = {
    TT_REPORT_SAMPLE_RATE: rate,
    RATE_LIMIT: new Proxy({}, { get() { throw new Error('diagnostics touched auth KV'); } }),
    TT_REPORTS: storage === null ? undefined : { put: storage || (async (key, body) => writes.push({ key, body: JSON.parse(body) })) },
    FORM_RATE_LIMIT: budget === null ? undefined : budget || { idFromName: name => name, get: () => ({ fetch: async () => Response.json({ allowed: true, remaining: 2 }) }) },
  };
  const request = new Request('https://vaultsparkstudios.com/v/tt-report', {
    method, headers, ...(method === 'POST' ? { body: typeof raw === 'string' ? raw : JSON.stringify(raw ?? { 'csp-report': { 'document-uri': 'https://vaultsparkstudios.com/proof/', 'source-file': 'https://vaultsparkstudios.com/assets/example.js', 'line-number': 7, 'violated-directive': 'require-trusted-types-for' } }) } : {}),
  });
  const response = await worker.fetch(request, env, { waitUntil(p) { pending.push(p); } });
  await Promise.all(pending);
  return { response, writes };
}
test('TT intake survives exhausted auth KV and stores one normalized private batch', async () => {
  const { response, writes } = await intake();
  assert.equal(response.status, 204);
  assert.equal(writes.length, 1);
  assert.match(writes[0].key, /^tt\/raw\/dt=\d{4}-\d{2}-\d{2}\/[a-f0-9-]+\.json$/);
  assert.equal(writes[0].body.reports.length, 1);
  assert.equal(writes[0].body.reports[0].lineNumber, 7);
  assert.equal(writes[0].body.reports[0].sourceFile, 'https://vaultsparkstudios.com/assets/example.js');
});
test('TT storage outage, absent binding, malformed reports and sampling never fall back to KV', async () => {
  for (const options of [{ storage: async () => { throw new Error('R2 unavailable'); } }, { storage: () => { throw new Error('sync fault'); } }, { storage: null }, { budget: null }, { raw: '{bad' }, { raw: JSON.stringify({ body: { sourceFile: 'x'.repeat(8193) } }) }, { rate: '0' }, { method: 'OPTIONS' }, { headers: { 'Content-Length': '8193' } }]) {
    const { response, writes } = await intake(options);
    assert.equal(response.status, 204);
    assert.equal(writes.length, 0);
  }
});
test('the actual existing SQLite counter caps TT globally at three batches per hour', async () => {
  const values = new Map(); let queue = Promise.resolve();
  const storage = { get: async key => values.get(key), put: async (key, value) => values.set(key, value), transaction(fn) { const result = queue.then(() => fn(storage)); queue = result.catch(() => {}); return result; } };
  const counter = new PublicFormRateLimiter({ storage });
  const names = new Set(), stored = [];
  const budget = { idFromName: name => { names.add(name); return name; }, get: () => ({ fetch: (url, init) => counter.fetch(new Request(url, init)) }) };
  await Promise.all(Array.from({ length: 20 }, () => intake({ budget, storage: async (key, body) => stored.push({ key, body }) })));
  assert.equal(stored.length, 3);
  assert.deepEqual([...names], ['diagnostic:tt:write-budget:v1']);
  assert.equal(values.size, 1, 'one counter row; no visitor identifier or raw report');
});
test('denied, malformed or unavailable diagnostic budget never writes R2', async () => {
  for (const reply of [{ allowed: false, remaining: 0 }, { allowed: true, remaining: 999 }, { allowed: true }, null]) {
    const budget = { idFromName: name => name, get: () => ({ fetch: async () => reply ? Response.json(reply) : new Response('', { status: 503 }) }) };
    const { response, writes } = await intake({ budget });
    assert.equal(response.status, 204); assert.equal(writes.length, 0);
  }
});
test('TT browser batches remain capped at five reports in one object', async () => {
  const { writes } = await intake({ raw: Array.from({ length: 20 }, () => ({ body: { documentURL: 'https://vaultsparkstudios.com/' } })) });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].body.reports.length, 5);
});

const now = new Date('2026-10-18T12:00:00Z');
const row = { ts: '2026-10-18T10:00:00Z', documentUri: 'https://vaultsparkstudios.com/proof/', sourceFile: '/assets/example.js', lineNumber: 7 };
const key = 'tt/raw/dt=2026-10-18/abc-123.json';
function fixture({ fail, truncated = false, old = false } = {}) {
  const calls = [];
  const fetchImpl = async url => {
    url = new URL(url); calls.push(url);
    if (fail?.(url)) return new Response('', { status: 503 });
    if (url.pathname.endsWith('/keys')) return Response.json({ success: true, result: [{ name: 'tt:2026-10-18:0001' }], result_info: { cursor: '' } });
    if (url.pathname.includes('/values/')) return Response.json(row);
    if (url.searchParams.get('list-type') === '2') {
      if (!url.searchParams.has('continuation-token')) return new Response(`<ListBucketResult><IsTruncated>true</IsTruncated>${truncated ? '' : '<NextContinuationToken>next&amp;page</NextContinuationToken>'}</ListBucketResult>`);
      assert.equal(url.searchParams.get('continuation-token'), 'next&page');
      return new Response(`<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>${key}</Key></Contents></ListBucketResult>`);
    }
    assert.equal(decodeURIComponent(url.pathname), '/vaultspark-rum/' + key);
    return Response.json({ schemaVersion: 1, reports: [old ? { ...row, ts: '2026-01-01T00:00:00Z' } : row] });
  };
  return { fetchImpl, secret: () => 'fixture', now, calls };
}
test('reader merges legacy KV and paginated R2 without losing a batch', async () => {
  const evidence = await readTtReports(fixture());
  assert.equal(evidence.complete, true);
  assert.equal(evidence.reports.length, 2);
  assert.equal(evidence.r2Objects, 1);
  assert.equal(evidence.legacyRecords, 1);
  assert.equal(decodeXml('next&amp;page&#x2f;'), 'next&page/');
});
test('reader filters stale rows by report timestamp', async () => {
  const evidence = await readTtReports(fixture({ old: true }));
  assert.equal(evidence.reports.length, 1);
});
test('failed legacy KV or R2 reads and truncated listing remain nonpassing', async () => {
  for (const fail of [u => u.pathname.endsWith('/keys'), u => u.pathname.includes('/values/'), u => u.hostname.endsWith('r2.cloudflarestorage.com'), u => u.pathname.endsWith('.json')]) {
    await assert.rejects(readTtReports(fixture({ fail })), /HTTP 503/);
  }
  await assert.rejects(readTtReports(fixture({ truncated: true })), /Incomplete TT R2 listing/);
});
test('malformed HTTP-200 XML cannot claim complete empty evidence', () => {
  for (const fragment of ['<Contents/>', '<Contents />', '<KeyCount>1</KeyCount>', '&broken']) {
    assert.throws(() => parseTtListing(`<ListBucketResult><IsTruncated>false</IsTruncated>${fragment}</ListBucketResult>`), /TT R2/);
  }
  assert.throws(() => parseTtListing('garbage<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>'), /TT R2/);
  for (const xml of ['<ListBucketResult>', '<ListBucketResult></ListBucketResult>', '<ListBucketResult><IsTruncated>false</IsTruncated><Contents></ListBucketResult>', '<ListBucketResult><IsTruncated>false</IsTruncated><Contents></Contents></ListBucketResult>', '<ListBucketResult><IsTruncated>false</IsTruncated><IsTruncated>true</IsTruncated></ListBucketResult>']) {
    assert.throws(() => parseTtListing(xml), /TT R2/);
  }
  assert.deepEqual(parseTtListing('<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><IsTruncated>false</IsTruncated></ListBucketResult>'), { keys: [], cursor: '' });
});
