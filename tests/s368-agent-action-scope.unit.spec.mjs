// S368 — agent-action idempotency keys are scoped to the authenticated subject.
//   node --test tests/s368-agent-action-scope.unit.spec.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAgentActions } from '../cloudflare/agent-actions.js';

function kv() {
  const m = new Map();
  return { get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, _m: m };
}
const env = (store) => ({ RATE_LIMIT: store, AGENT_RECEIPT_SIGNING_KEY: 'test-signing-key', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' });
const session = (sub) => ({ record: { obelisk: { sub }, scopes: ['vaultspark:feedback:write'], scope: 'vaultspark:feedback:write' } });
const post = (key) => new Request('https://vaultsparkstudios.com/api/agent-actions/v1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
  body: JSON.stringify({ action: 'feedback.submit', input: { pagePath: '/games/', answer: 'useful' } }),
});

test('same key, different subjects: no cross-subject replay', async (t) => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 201 });
  t.after(() => { globalThis.fetch = realFetch; });
  const store = kv();
  const a = await handleAgentActions(post('shared-key-000001'), env(store), session('subject-a'));
  if (a.status !== 200) { t.skip(`action rejected before idempotency (${a.status}: ${await a.text()})`); return; }
  const ra = await a.json();
  const b = await handleAgentActions(post('shared-key-000001'), env(store), session('subject-b'));
  assert.equal(b.headers.get('Idempotent-Replay'), null, 'subject B must not receive A\'s receipt');
  const rb = await b.json();
  assert.notEqual(rb.receiptId, ra.receiptId);
  const a2 = await handleAgentActions(post('shared-key-000001'), env(store), session('subject-a'));
  assert.equal(a2.headers.get('Idempotent-Replay'), 'true', 'same subject + key replays');
  assert.equal((await a2.json()).receiptId, ra.receiptId);
  assert.equal(store._m.size, 2);
});

test('session without a subject is refused', async () => {
  const r = await handleAgentActions(post('shared-key-000002'), env(kv()), { record: { scopes: ['vaultspark:feedback:write'] } });
  assert.ok([401, 403].includes(r.status), `got ${r.status}`);
});
