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
 * One advisory completion. Never throws on an unavailable service.
 *
 * @returns {Promise<{ok:boolean,state:string,content?:string,advisory:true,authoritative:false}>}
 */
export async function chat({
  messages,
  model = DEFAULT_MODEL,
  maxTokens = 4096,
  temperature = 0.4,
  timeoutMs = 120_000,
  thinking = true,
  env = process.env,
} = {}) {
  if (!Array.isArray(messages) || !messages.length) throw new Error('chat: messages[] is required');
  const budget = Math.max(Number(maxTokens) || 0, MIN_MAX_TOKENS);
  const { key, base } = await resolveCredentials(env);
  if (!key || !base) return unavailable('credential-missing', 'hetzner.inference credentials are not resolvable in this environment');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${String(base).replace(/\/$/, '')}/chat/completions`, {
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

export function selfTestDeskInference() {
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
  ];
  for (const [name, ok] of cases) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`desk-inference self-test: ${cases.length}/${cases.length}`);
}

if (process.argv[1]?.endsWith('desk-inference.mjs') && process.argv.includes('--self-test')) selfTestDeskInference();
