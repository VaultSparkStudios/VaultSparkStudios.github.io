#!/usr/bin/env node
// @verification-scope doctor — networked advisory probe of the Desk's declared authoring models.
/**
 * check-desk-model-servability.mjs  (S355)
 *
 * Asks each declared Desk authoring model for one tiny completion, with NO
 * failover, and reports which models the provider can actually serve.
 *
 * WHY THIS EXISTS. In S333 the provider retired `Qwen/Qwen3.6-35B-A3B-FP8` while
 * `GET /models` still listed it as available, so no listing check could tell
 * "model exists" from "model is servable", and the newsroom stopped. `chat()`
 * now fails over to a declared standby, which keeps editions shipping but also
 * HIDES a dead primary: every edition quietly costs one failed round trip and is
 * authored by the standby's voice. This probe calls `chatOnce()` per model so a
 * dead primary is visible even while the standby covers for it.
 *
 * Verdicts, per model:
 *   servable    — a completion came back.
 *   unservable  — the endpoint cannot serve this model: exactly the failures
 *                 `isEndpointUnavailable()` treats as failover-worthy (HTTP
 *                 502/503/504, "failed to find endpoint candidates"), or an HTTP
 *                 404 naming the model. This is a statement about the model.
 *   unmeasured  — anything else (missing credential, timeout, transport error,
 *                 429 quota, truncated or empty answer). That is about the
 *                 environment or the account, never evidence about the model.
 *
 * Exit: 1 when any declared model is unservable, else 0. Unmeasured never fails.
 * Modes: (default) human output · --json · --self-test (offline, no credentials)
 */

import process from 'node:process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTHORING_MODELS, chatOnce, isEndpointUnavailable } from './lib/desk-inference.mjs';

const PROMPT = [{ role: 'user', content: 'Reply with the single word: ready' }];

export function classify(result) {
  if (result && result.ok) return 'servable';
  if (isEndpointUnavailable(result)) return 'unservable';
  const reason = String(result?.reason || '');
  if (result?.state === 'http-error' && reason.startsWith('HTTP 404') && /model/i.test(reason)) return 'unservable';
  return 'unmeasured';
}

export async function probeModels(models, probe) {
  const rows = [];
  for (const model of models) {
    let result;
    try { result = await probe(model); } catch (error) { result = { ok: false, state: 'probe-threw', reason: String(error?.message || error) }; }
    rows.push({ model, verdict: classify(result), state: result?.state || 'unknown', reason: result?.ok ? null : String(result?.reason || '').slice(0, 160) });
  }
  const unservable = rows.filter((r) => r.verdict === 'unservable');
  return {
    ok: unservable.length === 0,
    declared: models.length,
    servable: rows.filter((r) => r.verdict === 'servable').map((r) => r.model),
    unservable: unservable.map((r) => r.model),
    unmeasured: rows.filter((r) => r.verdict === 'unmeasured').map((r) => r.model),
    primaryServable: rows[0]?.verdict === 'servable',
    rows,
  };
}

// 12s per model keeps two models inside run-doctor's 30s per-probe spawn timeout;
// a model that cannot answer a one-word prompt in 12s reads as unmeasured, not dead.
function liveProbe(model) {
  return chatOnce({ messages: PROMPT, model, maxTokens: 256, temperature: 0, timeoutMs: 12_000, thinking: false });
}

async function selfTest() {
  const cases = [];
  const results = {
    primary: { ok: true, state: 'ok', content: 'ready' },
    retired503: { ok: false, state: 'http-error', reason: 'HTTP 503: inference error: ServiceUnavailable' },
    noEndpoints: { ok: false, state: 'http-error', reason: 'HTTP 400: failed to find endpoint candidates for model' },
    missing404: { ok: false, state: 'http-error', reason: 'HTTP 404: model "old-model" does not exist' },
    route404: { ok: false, state: 'http-error', reason: 'HTTP 404: not found' },
    quota: { ok: false, state: 'rate-limited', reason: 'quota exceeded (HTTP 429)' },
    timeout: { ok: false, state: 'timeout', reason: 'This operation was aborted' },
    noCreds: { ok: false, state: 'credential-missing', reason: 'hetzner.inference credentials are not resolvable' },
    empty: { ok: false, state: 'empty-response', reason: 'model returned no content' },
  };
  cases.push(['a completion is servable', classify(results.primary) === 'servable']);
  cases.push(['HTTP 503 (the S333 retirement shape) is unservable', classify(results.retired503) === 'unservable']);
  cases.push(['"failed to find endpoint candidates" is unservable', classify(results.noEndpoints) === 'unservable']);
  cases.push(['a 404 naming the model is unservable', classify(results.missing404) === 'unservable']);
  cases.push(['a 404 that does not name a model is unmeasured (route, not model)', classify(results.route404) === 'unmeasured']);
  cases.push(['a 429 is about the account, never the model', classify(results.quota) === 'unmeasured']);
  cases.push(['a timeout is about the network, never the model', classify(results.timeout) === 'unmeasured']);
  cases.push(['a missing credential is unmeasured', classify(results.noCreds) === 'unmeasured']);
  cases.push(['an empty answer is unmeasured', classify(results.empty) === 'unmeasured']);

  const dead = await probeModels(['primary', 'standby'], async (m) => (m === 'primary' ? results.retired503 : results.primary));
  cases.push(['a dead primary behind a live standby still fails the probe', !dead.ok && dead.unservable.join() === 'primary' && !dead.primaryServable]);
  const offline = await probeModels(['primary', 'standby'], async () => results.noCreds);
  cases.push(['no credentials anywhere is unmeasured, never a failure', offline.ok && offline.unmeasured.length === 2]);
  const threw = await probeModels(['primary'], async () => { throw new Error('boom'); });
  cases.push(['a probe that throws is unmeasured, not a crash', threw.ok && threw.rows[0].state === 'probe-threw']);
  cases.push(['the declared list is the one chat() fails over through', Array.isArray(AUTHORING_MODELS) && AUTHORING_MODELS.length >= 2]);

  const failed = cases.filter(([, ok]) => !ok);
  for (const [label, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${label}`);
  console.log(`check-desk-model-servability --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  return failed.length ? 1 : 0;
}

async function main() {
  const summary = await probeModels([...AUTHORING_MODELS], liveProbe);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), ...summary }));
    return summary.ok ? 0 : 1;
  }
  for (const row of summary.rows) {
    console.log(`  ${row.verdict.padEnd(10)} ${row.model}${row.reason ? ` — ${row.state}: ${row.reason}` : ''}`);
  }
  if (!summary.ok) {
    console.error(`check-desk-model-servability ⛔ ${summary.unservable.length}/${summary.declared} declared model(s) unservable: ${summary.unservable.join(', ')}`);
    if (!summary.primaryServable) console.error('  the primary is not answering; editions are being authored by the standby (or not at all).');
    return 1;
  }
  const scope = summary.unmeasured.length ? ` · ${summary.unmeasured.length} unmeasured` : '';
  console.log(`check-desk-model-servability ✓ ${summary.servable.length}/${summary.declared} declared model(s) servable${scope}`);
  return 0;
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  // Set the exit code and let Node exit on its own. process.exit() while fetch's
  // keep-alive sockets are still closing aborts on Windows with libuv's
  // "!(handle->flags & UV_HANDLE_CLOSING)" assertion and exits 127, which the doctor
  // would read as a failure even after a correct 2/2 servable verdict (S355).
  process.exitCode = process.argv.includes('--self-test') ? await selfTest() : await main();
}
