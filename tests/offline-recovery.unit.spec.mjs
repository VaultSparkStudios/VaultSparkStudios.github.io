import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/error-pages.js', import.meta.url), 'utf8');
function fixture({ online = true, pathname = '/missing-page/', fetcher } = {}) {
  const listeners = {}, timers = new Map(), requests = [];
  let serial = 0, reloads = 0, replacement = null;
  const label = { textContent: '' }, status = { setAttribute(k, v) { this[k] = v; } };
  const navigator = { onLine: online };
  const window = { location: { pathname, href: 'https://fixture.test' + pathname, reload() { reloads++; }, replace(url) { replacement = url; } }, addEventListener(k, fn) { listeners[k] = fn; } };
  vm.runInNewContext(source, { window, navigator, document: { body: { classList: { contains: () => true } }, getElementById(id) { return { 'offline-net-label': label, 'offline-net-status': status }[id] || null; } }, AbortController,
    setTimeout(fn, ms) { timers.set(++serial, { fn, ms }); return serial; }, clearTimeout(id) { timers.delete(id); },
    fetch(url, options) { requests.push({ url, options }); return fetcher ? fetcher(url, options) : Promise.reject(new Error('unreachable')); }
  });
  return { label, status, navigator, requests, timers, listeners, reloads: () => reloads, replacement: () => replacement, run(ms) { for (const [id, timer] of [...timers]) if (timer.ms === ms) { timers.delete(id); timer.fn(); } } };
}
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test('online adapter with failed origin never reloads or claims restored', async () => {
  const f = fixture(); await settle(); f.run(900);
  assert.equal(f.label.textContent, 'Waiting for signal');
  assert.equal(f.reloads(), 0); assert.equal(f.timers.size, 0);
  assert.equal(f.requests[0].options.method, 'HEAD'); assert.equal(f.requests[0].options.cache, 'no-store');
  assert.equal(f.requests[0].options.redirect, 'error'); assert.equal(f.requests[0].url, 'https://fixture.test/missing-page/');
});
test('confirmed origin recovery reloads once and deduplicates online events', async () => {
  let resolve; const f = fixture({ fetcher: () => new Promise(r => { resolve = r; }) });
  f.listeners.online(); f.listeners.online(); assert.equal(f.requests.length, 1);
  resolve({ ok: true }); await settle(); f.listeners.online();
  assert.equal(f.requests.length, 1); assert.equal(f.status['data-net'], 'online');
  f.run(900); assert.equal(f.reloads(), 1);
});
test('HTTP failure does not announce recovery', async () => {
  const f = fixture({ fetcher: async () => ({ ok: false }) }); await settle(); f.run(900);
  assert.equal(f.reloads(), 0); assert.equal(f.status['data-net'], 'offline');
});
test('offline adapter makes no request', () => {
  const f = fixture({ online: false }); assert.equal(f.requests.length, 0); assert.equal(f.label.textContent, 'Waiting for signal');
});
test('offline event cancels both a probe and a pending reload', async () => {
  let resolve; const f = fixture({ fetcher: () => new Promise(r => { resolve = r; }) });
  f.navigator.onLine = false; f.listeners.offline();
  assert.equal(f.requests[0].options.signal.aborted, true);
  resolve({ ok: true }); await settle(); f.run(900); assert.equal(f.reloads(), 0);
  const g = fixture({ fetcher: async () => ({ ok: true }) }); await settle();
  g.navigator.onLine = false; g.listeners.offline(); g.run(900); assert.equal(g.reloads(), 0);
});
test('timeout aborts and a late successful response cannot schedule reload', async () => {
  let resolve; const f = fixture({ fetcher: () => new Promise(r => { resolve = r; }) });
  f.run(5000); assert.equal(f.requests[0].options.signal.aborted, true);
  resolve({ ok: true }); await settle(); f.run(900); assert.equal(f.reloads(), 0);
});
test('direct offline document probes the home route', async () => {
  const f = fixture({ pathname: '/offline.html' }); await settle(); assert.equal(f.requests[0].url, '/');
});
test('successful direct offline document recovery leaves the fallback document', async () => {
  const f = fixture({ pathname: '/offline.html', fetcher: async () => ({ ok: true }) });
  await settle(); f.run(900); assert.equal(f.replacement(), '/'); assert.equal(f.reloads(), 0);
});
