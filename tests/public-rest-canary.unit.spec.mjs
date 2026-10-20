import test from 'node:test';
import assert from 'node:assert/strict';
import { probe, reconcileProbe } from '../scripts/check-public-rest-contract.mjs';

test('REST probe bounds its request and never exposes transport errors', async () => {
  const result = await probe('example|id|where:created_at', async (url, init) => {
    assert.match(url, /limit=0/);
    assert.match(url, /created_at=not.is.null/);
    assert.ok(init.signal instanceof AbortSignal);
    throw new Error('private transport diagnostics');
  });
  assert.deepEqual(result, { verdict: 'failing', status: null, detail: 'transport failure (timeout or network)' });
});

test('live verdict cannot conceal new transport, permission or schema failures under old deferrals', () => {
  const old = { verdict: 'known-failing', status: 400, detail: '42703 missing column', note: 'founder review' };
  assert.equal(reconcileProbe({ verdict: 'failing', status: 400, detail: old.detail }, old).verdict, 'known-failing');
  assert.equal(reconcileProbe({ verdict: 'failing', status: null, detail: 'transport failure' }, old).verdict, 'failing');
  assert.equal(reconcileProbe({ verdict: 'failing', status: 400, detail: 'new rejection' }, old).verdict, 'failing');
  assert.equal(reconcileProbe({ verdict: 'auth-only', status: 401 }, { verdict: 'ok' }).verdict, 'failing');
  assert.equal(reconcileProbe({ verdict: 'auth-only', status: 401 }, { verdict: 'auth-only' }).verdict, 'auth-only');
  assert.equal(reconcileProbe({ verdict: 'ok', status: 200 }, old).verdict, 'ok');
});

test('probe preserves HTTP evidence for success, intended denial and bad queries', async () => {
  for (const [status, body, verdict] of [[200, [], 'ok'], [401, {code:'42501'}, 'auth-only'], [400, {code:'42703',message:'missing column'}, 'failing']]) {
    const result = await probe('table|column', async () => new Response(JSON.stringify(body), { status }));
    assert.equal(result.status, status);
    assert.equal(result.verdict, verdict);
  }
});

test('live canary limits simultaneous probes and reports every key in source order', async () => {
  const { probeAll } = await import('../scripts/check-public-rest-contract.mjs');
  const keys = Array.from({length:9}, (_, i) => `q${i}|id`);
  let active=0, maximum=0;
  const results=await probeAll(keys, {}, async () => {
    active++; maximum=Math.max(maximum, active);
    await new Promise(resolve=>setTimeout(resolve, 2));
    active--;
    return {verdict:'ok',status:200};
  });
  assert.equal(maximum,3);
  assert.deepEqual(Object.keys(results),keys);
  assert.ok(Object.values(results).every(result=>result.verdict==='ok'));
});
