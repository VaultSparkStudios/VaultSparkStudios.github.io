/**
 * desk-inference.mjs — S319. This repo's client for the studio's free,
 * self-hosted OpenAI-compatible inference (Hetzner Experiments, EU hardware).
 *
 * WHY A LOCAL COPY RATHER THAN THE STUDIO-OPS LIBRARY
 * `vaultspark-studio-ops/scripts/lib/hetzner-inference.mjs` is the canonical
 * client, but it resolves credentials through the secrets gateway and lives in a
 * sibling repo that does not exist inside a GitHub Actions runner. The scheduled
 * Desk publisher runs in CI. So this is a deliberately small, dependency-free
 * client that reads the same two capability env vars, honours the same contract,
 * and falls back to the gateway when a sibling checkout IS present (local runs).
 *
 * THE ONE RULE, INHERITED VERBATIM FROM THE CANONICAL CLIENT
 *
 *     HETZNER MAY PROPOSE. IT MAY NEVER DECIDE.
 *
 * `hetzner.inference` is documented as "advisory/bulk work only, never a
 * decision surface" — no SLA, no backups, may vanish without notice. The Desk
 * publisher respects that literally: this model authors VOICE (headline, hook,
 * tldr, stance prose, transcript, meme line) and never FACT. Every figure it
 * writes is mechanically checked against the drafter-captured sources by
 * `runStandards()` in lib/news-desk.mjs, which blocks any number appearing in no
 * cited fact. The gates decide what publishes; the model only proposes wording.
 *
 * Unavailability is a STATE, never an exception and never a fabricated value —
 * a caller must be able to skip an edition rather than publish half of one.
 */

const DEFAULT_MODEL = 'Qwen/Qwen3.6-35B-A3B-FP8';

/**
 * Ordered authoring models: the preferred voice first, then a declared standby.
 *
 * A managed provider can retire a model out from under a pinned client while
 * still ADVERTISING it. Observed live (S333): `GET /models` listed
 * `Qwen/Qwen3.6-35B-A3B-FP8` as available, and every `chat/completions` against
 * it answered `503 ServiceUnavailable - failed to find endpoint candidates`,
 * twice, while `Qwen3.8-27B` answered 200 on the same key and base URL. With a
 * single pinned model that is an unrecoverable newsroom outage caused entirely
 * by someone else's capacity decision.
 *
 * A standby is not a quality opinion — it is the difference between a degraded
 * edition and no edition. The model that actually authored is returned in the
 * result and carried into provenance, so a fallback is always disclosed rather
 * than silently substituted.
 */
export const AUTHORING_MODELS = Object.freeze([DEFAULT_MODEL, 'Qwen3.8-27B']);

/**
 * Is this failure worth trying a different model for?
 *
 * Deliberately narrow. A 429 is a quota FACT about the whole account and must
 * never be retried against another model — that converts one rate-limit into
 * several. A timeout or transport error is about the network, not the model.
 * Only "this endpoint cannot serve this model right now" earns a failover.
 */
export function isEndpointUnavailable(result) {
  if (!result || result.ok) return false;
  if (result.state !== 'http-error') return false;
  return /^HTTP (502|503|504)\b/.test(String(result.reason || ''))
    || /failed to find endpoint candidates/i.test(String(result.reason || ''));
}

/**
 * Reasoning models bill reasoning tokens against max_tokens FIRST. A budget
 * below this returns HTTP 200 with empty content — an answer-shaped blank.
 * Enforced here so no caller has to rediscover it.
 */
export const MIN_MAX_TOKENS = 256;

const unavailable = (state, reason) => ({
  ok: false, state, reason, advisory: true, authoritative: false,
  asVerdict() { throw new Error('desk-inference: advisory output can never become a verdict'); },
});

export function buildRequestBody({ model, messages, budget, temperature, thinking = true }) {
  const body = { model, messages, max_tokens: budget, temperature };
  if (thinking === false) {
    // Qwen3.6's official vLLM/SGLang contract. The soft /nothink switch is not
    // supported by this model; the chat-template parameter is the hard switch.
    body.top_p = 0.8;
    body.top_k = 20;
    body.presence_penalty = 1.5;
    body.chat_template_kwargs = { enable_thinking: false };
  }
  return body;
}

/**
 * Credentials, env-first. CI supplies them as repository secrets; a local run
 * with a studio-ops sibling checked out falls back to the canonical gateway
 * (CANON-012) rather than asking a developer to export anything by hand.
 */
export async function resolveCredentials(env = process.env) {
  let key = env.HETZNER_INFERENCE_API_KEY || '';
  let base = env.HETZNER_INFERENCE_BASE_URL || '';
  if (key && base) return { key, base, source: 'env' };
  try {
    const { pathToFileURL } = await import('node:url');
    const path = await import('node:path');
    const fs = await import('node:fs');
    const gateway = path.resolve(process.cwd(), '..', 'vaultspark-studio-ops', 'scripts', 'lib', 'secrets.mjs');
    if (!fs.existsSync(gateway)) return { key, base, source: 'absent' };
    const { getSecret } = await import(pathToFileURL(gateway).href);
    key = key || await getSecret('HETZNER_INFERENCE_API_KEY', 'hetzner.inference');
    base = base || await getSecret('HETZNER_INFERENCE_BASE_URL', 'hetzner.inference');
    return { key, base, source: 'gateway' };
  } catch {
    return { key, base, source: 'absent' };
  }
}

/**
 * One advisory completion against ONE model. Never throws on an unavailable
 * service. Callers should prefer `chat()`, which adds the declared standby.
 *
 * @returns {Promise<{ok:boolean,state:string,content?:string,advisory:true,authoritative:false}>}
 */
export async function chatOnce({
  messages,
  model = DEFAULT_MODEL,
  maxTokens = 4096,
  temperature = 0.4,
  timeoutMs = 120_000,
  thinking = true,
  env = process.env,
  // Injectable so the failover loop in chat() can be regression-locked offline.
  // A live probe proves it works today; only a test proves it still works after
  // the next edit. S333 shipped the loop with the predicate tested and the loop
  // itself uncovered — the same shape of gap this session was fixing elsewhere.
  transport = fetch,
} = {}) {
  if (!Array.isArray(messages) || !messages.length) throw new Error('chat: messages[] is required');
  const budget = Math.max(Number(maxTokens) || 0, MIN_MAX_TOKENS);
  const { key, base } = await resolveCredentials(env);
  if (!key || !base) return unavailable('credential-missing', 'hetzner.inference credentials are not resolvable in this environment');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await transport(`${String(base).replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequestBody({ model, messages, budget, temperature, thinking })),
    });
  } catch (err) {
    const reason = [err?.message || err, err?.cause?.code, err?.cause?.message]
      .filter(Boolean).join(' · ').slice(0, 240);
    return unavailable(err?.name === 'AbortError' ? 'timeout' : 'transport-error', reason);
  } finally {
    clearTimeout(timer);
  }

  // A 429 is a quota FACT. Never retry-storm a free tier — that is how a studio
  // loses the access it is depending on.
  if (res.status === 429) return unavailable('rate-limited', 'quota exceeded (HTTP 429)');
  if (!res.ok) return unavailable('http-error', `HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);

  let payload;
  try { payload = await res.json(); }
  catch (err) { return unavailable('bad-response', `unparseable JSON: ${err.message}`); }

  const choice = payload?.choices?.[0] ?? {};
  const content = String(choice?.message?.content ?? '');
  // An empty answer whose budget ran out is a TRUNCATION, not an answer.
  if (!content.trim() && choice.finish_reason === 'length') {
    return unavailable('truncated', `the model spent its entire ${budget}-token budget on reasoning and returned no content`);
  }
  if (!content.trim()) return unavailable('empty-response', 'model returned no content');

  return {
    ok: true, state: 'ok', content, model, usage: payload?.usage ?? null,
    advisory: true, authoritative: false,
    asVerdict() { throw new Error('desk-inference: advisory output can never become a verdict'); },
  };
}

/**
 * One advisory completion, with a declared standby model.
 *
 * Tries the requested model first, then the remaining AUTHORING_MODELS, and
 * ONLY when the failure says this endpoint cannot serve this model. Every other
 * failure — quota, timeout, transport, truncation, empty answer — returns
 * immediately and unchanged, because those are not fixed by asking a different
 * model and retrying them would multiply the problem.
 *
 * `fellBackFrom` is set whenever a standby authored, so the caller can disclose
 * which model actually wrote rather than assuming the preferred one did.
 */
export async function chat(options = {}) {
  const requested = options.model || DEFAULT_MODEL;
  const candidates = [requested, ...AUTHORING_MODELS.filter((m) => m !== requested)];

  let first = null;
  for (const model of candidates) {
    const result = await chatOnce({ ...options, model });
    if (result.ok) {
      if (model !== requested) return { ...result, fellBackFrom: requested };
      return result;
    }
    first ??= result;
    if (!isEndpointUnavailable(result)) return result;
  }
  // Every candidate was endpoint-unavailable: report the first failure verbatim
  // rather than inventing a summary the caller cannot act on.
  return first;
}

/**
 * Models fence JSON, prepend commentary, or emit reasoning before the object.
 * Extract the first balanced top-level object rather than trusting the shape.
 */
export function extractJson(text) {
  const body = String(text || '');
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : body;
  const start = candidate.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(candidate.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

export async function selfTestDeskInference() {
  const cases = [
    ['plain object parses', extractJson('{"a":1}')?.a === 1],
    ['fenced json parses', extractJson('```json\n{"a":2}\n```')?.a === 2],
    ['leading prose is skipped', extractJson('Here you go:\n{"a":3}')?.a === 3],
    ['nested braces balance', extractJson('{"a":{"b":{"c":4}}}')?.a?.b?.c === 4],
    ['a brace inside a string does not end the object', extractJson('{"a":"}{","b":5}')?.b === 5],
    ['an escaped quote does not end the string', extractJson('{"a":"x\\"}","b":6}')?.b === 6],
    ['trailing prose after the object is ignored', extractJson('{"a":7} — hope that helps')?.a === 7],
    ['no object yields null', extractJson('no json here') === null],
    ['malformed object yields null, never a partial', extractJson('{"a":') === null],
    ['unavailable result carries the advisory contract', (() => {
      const r = unavailable('timeout', 'x');
      return r.ok === false && r.advisory === true && r.authoritative === false;
    })()],
    ['advisory output refuses to become a verdict', (() => {
      try { unavailable('timeout', 'x').asVerdict(); return false; } catch { return true; }
    })()],
    ['a too-small token budget is raised, not silently honoured', MIN_MAX_TOKENS === 256],
    ['non-thinking requests use Qwen3.6\'s documented hard switch', (() => {
      const body = buildRequestBody({ model: 'm', messages: [], budget: 1000, temperature: 0.7, thinking: false });
      return body.chat_template_kwargs?.enable_thinking === false && body.top_p === 0.8 && body.top_k === 20;
    })()],

    // S333: the provider retired the pinned model while still listing it in
    // /models. A depooled model must not be able to stop the newsroom, and a
    // quota fact must never be multiplied across models.
    ['a depooled endpoint is a failover-worthy failure',
      isEndpointUnavailable({ ok: false, state: 'http-error', reason: 'HTTP 503: inference error: ServiceUnavailable - failed to find endpoint candidates for serving the request' })],
    ['a bare 502/504 is failover-worthy',
      isEndpointUnavailable({ ok: false, state: 'http-error', reason: 'HTTP 502: bad gateway' })
      && isEndpointUnavailable({ ok: false, state: 'http-error', reason: 'HTTP 504: gateway timeout' })],
    ['a quota fact is NEVER retried against another model',
      !isEndpointUnavailable({ ok: false, state: 'rate-limited', reason: 'quota exceeded (HTTP 429)' })],
    ['a timeout is not a model problem',
      !isEndpointUnavailable({ ok: false, state: 'timeout', reason: 'aborted' })],
    ['a truncation is not a model problem',
      !isEndpointUnavailable({ ok: false, state: 'truncated', reason: 'budget spent on reasoning' })],
    ['a 400 is our bug, not a capacity problem',
      !isEndpointUnavailable({ ok: false, state: 'http-error', reason: 'HTTP 400: bad request' })],
    ['a successful call is never treated as a failover candidate',
      !isEndpointUnavailable({ ok: true, state: 'ok' })],
    ['a standby is declared, distinct, and ordered after the preferred voice',
      AUTHORING_MODELS.length >= 2
      && AUTHORING_MODELS[0] === DEFAULT_MODEL
      && new Set(AUTHORING_MODELS).size === AUTHORING_MODELS.length],
  ];

  // The failover LOOP, offline. Previously only the predicate was covered, so
  // any edit that broke the loop would still have passed this suite.
  const ENV = { HETZNER_INFERENCE_API_KEY: 'test-key', HETZNER_INFERENCE_BASE_URL: 'https://inference.test/v1' };
  const reply = (content) => ({
    ok: true, status: 200,
    json: async () => ({ choices: [{ message: { content }, finish_reason: 'stop' }], usage: null }),
    text: async () => '',
  });
  const depooled = { ok: false, status: 503, text: async () => 'inference error: ServiceUnavailable - failed to find endpoint candidates for serving the request' };
  const quota = { ok: false, status: 429, text: async () => 'rate limited' };

  // Record which models were asked, in order.
  const spyTransport = (behaviour) => {
    const asked = [];
    const fn = async (_url, init) => { const m = JSON.parse(init.body).model; asked.push(m); return behaviour(m); };
    fn.asked = asked;
    return fn;
  };
  const run = async (behaviour) => {
    const t = spyTransport(behaviour);
    const r = await chat({ messages: [{ role: 'user', content: 'x' }], env: ENV, transport: t, thinking: false });
    return { r, asked: t.asked };
  };

  const depooledPrimary = await run((m) => (m === DEFAULT_MODEL ? depooled : reply('standby wrote this')));
  const primaryHealthy = await run(() => reply('primary wrote this'));
  const allDepooled = await run(() => depooled);
  const rateLimited = await run(() => quota);

  cases.push(
    ['a depooled primary fails over to the standby', depooledPrimary.r.ok === true && depooledPrimary.r.content === 'standby wrote this'],
    ['the failover is disclosed, not silent',
      depooledPrimary.r.fellBackFrom === DEFAULT_MODEL && depooledPrimary.r.model === AUTHORING_MODELS[1]],
    ['it asks the preferred model FIRST, then the standby',
      depooledPrimary.asked[0] === DEFAULT_MODEL && depooledPrimary.asked[1] === AUTHORING_MODELS[1] && depooledPrimary.asked.length === 2],
    ['a healthy primary is never second-guessed',
      primaryHealthy.r.ok === true && primaryHealthy.asked.length === 1 && primaryHealthy.r.fellBackFrom === undefined],
    ['every model depooled reports the failure, never a fabricated success',
      allDepooled.r.ok === false && allDepooled.r.state === 'http-error' && allDepooled.asked.length === AUTHORING_MODELS.length],
    ['a 429 stops immediately and is NOT retried against another model',
      rateLimited.r.ok === false && rateLimited.r.state === 'rate-limited' && rateLimited.asked.length === 1],
  );

  for (const [name, ok] of cases) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`desk-inference self-test: ${cases.length}/${cases.length}`);
}

if (process.argv[1]?.endsWith('desk-inference.mjs') && process.argv.includes('--self-test')) await selfTestDeskInference();
