import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicMcp, PUBLIC_MCP_RESOURCES } from '../cloudflare/public-mcp.mjs';
import worker from '../cloudflare/security-headers-worker.js';

const origin = 'https://vaultsparkstudios.com';
function request(method, params = {}, { modern = false, headers = {}, raw = null, url = `${origin}/mcp` } = {}) {
  const meta = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientInfo': { name: 'owned-test', version: '1' }, 'io.modelcontextprotocol/clientCapabilities': {} };
  const body = { jsonrpc: '2.0', id: 1, method, params: modern ? { ...params, _meta: meta } : params };
  return new Request(url, { method: 'POST', headers: {
    Host: 'vaultsparkstudios.com', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
    ...(modern ? { 'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': method, ...(method === 'resources/read' ? { 'Mcp-Name': params.uri } : {}) } : {}), ...headers,
  }, body: raw ?? JSON.stringify(body) });
}
async function payload(response) {
  const text = await response.text();
  return JSON.parse(text.startsWith('event:') ? text.split('\n').find(line => line.startsWith('data: ')).slice(6) : text);
}
function fixture(read = async path => Response.json({ path, actual: true })) {
  const paths = [];
  const mcp = createPublicMcp({ publicOrigin: origin, readFeed: async (path, signal) => { paths.push(path); assert.ok(signal instanceof AbortSignal); return read(path); } });
  return { paths, fetch: req => mcp.fetch(req) };
}

test('actual SDK serves legacy initialization and exactly four declared read resources', async () => {
  const mcp = fixture();
  const initialized = await payload(await mcp.fetch(request('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'legacy', version: '1' } })));
  assert.equal(initialized.result.protocolVersion, '2025-11-25');
  assert.equal(initialized.result.capabilities.tools, undefined);
  const list = await payload(await mcp.fetch(request('resources/list')));
  assert.deepEqual(list.result.resources.map(r => r.uri), PUBLIC_MCP_RESOURCES.map(r => r.uri));
  const read = await payload(await mcp.fetch(request('resources/read', { uri: PUBLIC_MCP_RESOURCES[0].uri })));
  assert.equal(JSON.parse(read.result.contents[0].text).path, '/api/public-intelligence.json');
  assert.deepEqual(mcp.paths, ['/api/public-intelligence.json']);
});

test('modern discovery and resource reads use current per-request metadata and public cache hints', async () => {
  const mcp = fixture();
  const discovered = await payload(await mcp.fetch(request('server/discover', {}, { modern: true })));
  assert.ok(discovered.result.supportedVersions.includes('2026-07-28'));
  assert.equal(discovered.result.capabilities.tools, undefined);
  const read = await payload(await mcp.fetch(request('resources/read', { uri: PUBLIC_MCP_RESOURCES[1].uri }, { modern: true })));
  assert.equal(read.result.resultType, 'complete');
  assert.equal(read.result.cacheScope, 'public');
  assert.equal(read.result.ttlMs, 60000);
  assert.equal(JSON.parse(read.result.contents[0].text).path, '/api/public-status.json');
});

test('write, tool, account and arbitrary URL requests cannot reach any upstream', async () => {
  const mcp = fixture();
  for (const method of ['tools/call', 'resources/write', 'account/delete', 'publish', 'subscriptions/listen', 'resources/subscribe']) {
    const body = await payload(await mcp.fetch(request(method, { name: 'delete_account', arguments: { user: 'other' } })));
    assert.ok(body.error, method);
  }
  for (const uri of ['https://private.example.test/', 'vaultspark://studio/overview?path=/context/', 'vaultspark://studio/../account', 'file:///etc/passwd']) {
    assert.ok((await payload(await mcp.fetch(request('resources/read', { uri })))).error);
  }
  assert.deepEqual(mcp.paths, []);
});

test('origin, host, route and transport method checks refuse before resource work', async () => {
  const mcp = fixture();
  assert.equal((await mcp.fetch(request('resources/list', {}, { headers: { Origin: 'https://foreign.example.test' } }))).status, 403);
  assert.equal((await mcp.fetch(request('resources/list', {}, { headers: { Host: 'foreign.example.test' } }))).status, 403);
  assert.equal((await mcp.fetch(request('resources/list', {}, { url: `${origin}/mcp?feed=private` }))).status, 404);
  for (const method of ['GET', 'DELETE', 'PUT']) {
    const response = await mcp.fetch(new Request(`${origin}/mcp`, { method, headers: { Host: 'vaultsparkstudios.com' } }));
    assert.equal(response.status, 405);
  }
  assert.deepEqual(mcp.paths, []);
});

test('oversized body and wrong media type fail closed; malformed JSON has an SDK parse error', async () => {
  const mcp = fixture();
  assert.equal((await mcp.fetch(request('resources/list', {}, { raw: 'x'.repeat(17000) }))).status, 413);
  assert.equal((await mcp.fetch(request('resources/list', {}, { headers: { 'Content-Type': 'text/plain' } }))).status, 415);
  assert.equal((await mcp.fetch(request('resources/list', {}, { raw: JSON.stringify([
    { jsonrpc: '2.0', id: 1, method: 'resources/read', params: { uri: PUBLIC_MCP_RESOURCES[0].uri } },
    { jsonrpc: '2.0', id: 2, method: 'resources/read', params: { uri: PUBLIC_MCP_RESOURCES[1].uri } },
  ]) }))).status, 400);
  const malformed = await mcp.fetch(request('resources/list', {}, { raw: '{' }));
  assert.equal(malformed.status, 400);
  assert.ok((await payload(malformed)).error);
  assert.deepEqual(mcp.paths, []);
});

test('modern header/body mismatch and unsupported revision are rejected by the actual SDK', async () => {
  const mcp = fixture();
  const mismatch = await mcp.fetch(request('resources/list', {}, { modern: true, headers: { 'Mcp-Method': 'tools/call' } }));
  assert.equal(mismatch.status, 400);
  assert.ok((await payload(mismatch)).error);
  const unsupported = await mcp.fetch(request('server/discover', {}, { modern: true, headers: { 'MCP-Protocol-Version': '2099-01-01' } }));
  assert.equal(unsupported.status, 400);
  assert.ok((await payload(unsupported)).error);
});

test('a valid modern subscription request cannot allocate the SDK implicit SSE stream', async () => {
  const mcp = fixture();
  const response = await mcp.fetch(request('subscriptions/listen', { notifications: {} }, { modern: true }));
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.equal((await payload(response)).error.code, -32601);
  assert.deepEqual(mcp.paths, []);
});

test('unavailable, malformed and oversized public feeds return an error instead of partial resources', async () => {
  for (const read of [
    async () => new Response('private upstream failure', { status: 503 }),
    async () => new Response('{', { headers: { 'Content-Type': 'application/json' } }),
    async () => new Response('private-upstream-marker-invalid-json', { headers: { 'Content-Type': 'application/json' } }),
    async () => Response.json({ value: 'x'.repeat(270000) }),
  ]) {
    const mcp = fixture(read);
    const body = await payload(await mcp.fetch(request('resources/read', { uri: PUBLIC_MCP_RESOURCES[0].uri })));
    assert.ok(body.error);
    assert.equal(body.result, undefined);
    assert.ok(!JSON.stringify(body).includes('private upstream failure'));
    assert.ok(!JSON.stringify(body).includes('private-upstream-marker'));
  }
});

test('a request deadline is not extended by a cancellation hook that never settles', async () => {
  const mcp = fixture();
  const stream = new ReadableStream({ pull() { return new Promise(() => {}); }, cancel() { return new Promise(() => {}); } });
  const req = new Request(`${origin}/mcp`, { method: 'POST', duplex: 'half', headers: { Host: 'vaultsparkstudios.com', 'Content-Type': 'application/json', Accept: 'application/json' }, body: stream });
  const response = await Promise.race([mcp.fetch(req), new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('read deadline did not settle')), 6500); timer.unref(); })]);
  assert.equal(response.status, 408);
});

test('parallel clients read only their requested fixed public resources', async () => {
  const mcp = fixture();
  const results = await Promise.all(PUBLIC_MCP_RESOURCES.map(r => mcp.fetch(request('resources/read', { uri: r.uri }, { modern: true })).then(payload)));
  assert.deepEqual(results.map(r => JSON.parse(r.result.contents[0].text).path), PUBLIC_MCP_RESOURCES.map(r => r.path));
  assert.deepEqual(mcp.paths.sort(), PUBLIC_MCP_RESOURCES.map(r => r.path).sort());
});

test('actual Worker serves public MCP for an ordinary agent without forwarding client credentials or relaxing portal gates', async t => {
  const upstream = [];
  t.mock.method(globalThis, 'fetch', async req => { upstream.push(req); return Response.json({ public: true }); });
  const req = request('resources/read', { uri: PUBLIC_MCP_RESOURCES[0].uri }, { headers: { 'User-Agent': 'curl/8.0', Authorization: 'Bearer must-not-forward', Cookie: 'private=must-not-forward' } });
  const response = await worker.fetch(req, { PUBLIC_ORIGIN: origin, PRIMARY_ORIGIN: 'https://owned-origin.example.test', FALLBACK_ORIGIN: 'https://owned-origin.example.test' }, { waitUntil() {} });
  assert.equal(response.status, 200);
  assert.equal(JSON.parse((await payload(response)).result.contents[0].text).public, true);
  assert.equal(upstream.length, 1);
  assert.equal(new URL(upstream[0].url).pathname, '/api/public-intelligence.json');
  assert.equal(upstream[0].headers.get('authorization'), null);
  assert.equal(upstream[0].headers.get('cookie'), null);
  const denied = await worker.fetch(new Request(`${origin}/vault-member/private`, { method: 'POST', headers: { 'User-Agent': 'curl/8.0', Accept: 'application/json' } }), {}, { waitUntil() {} });
  assert.equal(denied.status, 403);
  assert.equal(upstream.length, 1);
});
