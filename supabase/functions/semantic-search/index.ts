/**
 * semantic-search — "Ask the Vault": one grounded, cited answer for humans and agents.
 *
 * Request:  POST { query: string }            (legacy `sources` is accepted and ignored)
 * Response: {
 *   answer: string,                     // prose with [n] markers, '' when noAnswer
 *   citations: [{ n, title, url }],     // n matches the [n] markers, in order
 *   noAnswer: boolean,                  // true → no grounded answer; see suggestions
 *   suggestions: [{ title, url }],      // closest pages + safe defaults (noAnswer only)
 *   model: string | null,               // null when no model was called
 *   cached: boolean,
 *   corpusVersion: string,
 *   // Back-compat for assets/command-palette.js (Cmd+Enter synthesis):
 *   synthesis: string,                  // answer without [n] markers
 *   sources: [{ title, href, snippet }],
 * }
 *
 * Pipeline:
 *   1. Corpus — public-intelligence.json + /.well-known/llms-full.txt + the Desk
 *      JSON Feed, fetched with a 10-minute in-isolate cache and stale fallback,
 *      turned into ~80 citation-indexed passages by _shared/vaultGrounding.ts.
 *   2. Retrieval — BM25-lite picks the top 8 passages. If the best passage is
 *      below MIN_ANSWER_SCORE or covers too little of the question, return an
 *      honest no-answer with suggested links WITHOUT calling the model.
 *   3. Cache — 24h semantic_search_cache keyed on sha256(query | 'ask-vault' |
 *      corpus version). A changed feed changes the version, so stale answers
 *      are never served past a deploy.
 *   4. Cap — fail CLOSED (public, unauthenticated surface), checked after the
 *      cache so cached answers keep flowing once the cap trips.
 *   5. Model — static instructions (system) → grounding block (cache breakpoint)
 *      → question. The model may cite only the passages it was given; citations
 *      outside the range are dropped and an uncited reply becomes a no-answer.
 *
 * ── Measurement plan (cost per answer, before vs after) ──────────────────────
 * Every request writes one privacy-safe row to public.ask_vault_usage (migration
 * supabase-s368-ask-vault-usage.sql): outcome, model, input/output/cache tokens,
 * passages_sent, grounding_chars, corpus size + version, top score, coverage and
 * the USD estimate from _shared/modelPricing.ts. The same row is logged as one
 * `[ask-vault]` JSON line in the function logs. Spend still meters through
 * increment_ignis_meter under 'semantic-search', so the $2.50/day cap is
 * unchanged.
 *   Baseline (before): ignis_daily_meter rows for function_name='semantic-search'
 *     — usd / call_count for the 14 days before the deploy (the old path sent up
 *     to 6 term-overlap chunks with no citation contract; no per-call log exists,
 *     so the daily aggregate is the only baseline).
 *   After: ask_vault_usage_daily.usd_per_request and usd_per_paid_answer, plus
 *     the share of zero_token_no_answers + cache_hits (requests that cost $0).
 *   Read both after 14 days of traffic; the change is worth keeping if
 *     usd_per_request falls and model_no_answers stays under ~15% of answers
 *     (a higher share means the lexical gate is letting weak matches through).
 *   Prompt caching: watch cache_read_tokens. The grounding block carries the
 *     breakpoint; it only pays off when the same passage set repeats inside five
 *     minutes. If cache_create_tokens > 0 while cache_read_tokens stays ~0 for
 *     two weeks, set ASK_VAULT_PROMPT_CACHE=0 to drop the 25% write premium.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  capExceededResponse,
  isCapBreached,
  isPaused,
  meterCall,
} from '../_shared/tokenMeter.ts';
import { buildSearchCacheKey } from '../_shared/ignisCache.ts';
import { HAIKU_MODEL, SONNET_MODEL, estimateUsd, modelRequestExtras } from '../_shared/modelPricing.ts';
import {
  ASK_VAULT_SYSTEM,
  DEFAULT_K,
  MIN_ANSWER_SCORE,
  type AskVaultOutcome,
  type Citation,
  type CorpusIndex,
  type Passage,
  type Retrieval,
  buildGroundingBlock,
  buildIndex,
  buildPassages,
  buildQuestionBlock,
  citationsFor,
  corpusVersion,
  parseCitations,
  selectPassages,
  stripCitationMarkers,
  suggestionsFor,
  usageRow,
} from '../_shared/vaultGrounding.ts';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = SONNET_MODEL;
const MAX_QUERY_LEN = 200;
const MAX_OUTPUT_TOKENS = 400;
const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CORPUS_TTL_MS = 10 * 60 * 1000;
const FEED_TIMEOUT_MS = 5000;
const MODEL_TIMEOUT_MS = 25000;
const CACHE_NAMESPACE = ['ask-vault-v1'];

// supabase-js@2 from esm.sh ships generics that resolve to `never` without a
// generated Database type; the untyped client is what every caller here needs.
// deno-lint-ignore no-explicit-any
type Db = any;

type AskPayload = {
  answer: string;
  citations: Citation[];
  noAnswer: boolean;
  suggestions: Array<{ title: string; url: string }>;
  model: string | null;
  corpusVersion: string;
};

// ── Corpus (in-isolate cache, stale-on-error) ────────────────────────────────

type Corpus = { passages: Passage[]; index: CorpusIndex; version: string; builtAt: number };
let corpusCache: Corpus | null = null;
let corpusInflight: Promise<Corpus | null> | null = null;

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FEED_TIMEOUT_MS) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

function parseJson(text: string | null): unknown {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function loadCorpus(): Promise<Corpus | null> {
  if (corpusCache && Date.now() - corpusCache.builtAt < CORPUS_TTL_MS) return corpusCache;
  if (corpusInflight) return corpusInflight;
  const origin = (Deno.env.get('PUBLIC_SITE_ORIGIN') || 'https://vaultsparkstudios.com').replace(/\/$/, '');
  const intelUrl = Deno.env.get('PUBLIC_INTEL_URL') || `${origin}/api/public-intelligence.json`;
  corpusInflight = (async () => {
    const [intelText, llmsFull, deskText] = await Promise.all([
      fetchText(intelUrl),
      fetchText(`${origin}/.well-known/llms-full.txt`),
      fetchText(`${origin}/api/news-desk-feed.json`),
    ]);
    const passages = buildPassages({ intel: parseJson(intelText), llmsFull, desk: parseJson(deskText) });
    // A partial fetch must not replace a fuller corpus we already hold.
    if (!passages.length || (corpusCache && passages.length < corpusCache.passages.length * 0.5)) {
      if (corpusCache) corpusCache = { ...corpusCache, builtAt: Date.now() - CORPUS_TTL_MS + 60_000 };
      return corpusCache;
    }
    corpusCache = { passages, index: buildIndex(passages), version: corpusVersion(passages), builtAt: Date.now() };
    return corpusCache;
  })().finally(() => { corpusInflight = null; });
  return corpusInflight;
}

// ── Response cache ───────────────────────────────────────────────────────────

async function getCachedSearch(
  supabase: Db,
  key: string,
): Promise<AskPayload | null> {
  try {
    const { data, error } = await supabase
      .from('semantic_search_cache')
      .select('payload')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error || !data) return null;
    const payload = (data as { payload?: AskPayload }).payload;
    return payload && typeof payload.answer === 'string' && Array.isArray(payload.citations) ? payload : null;
  } catch {
    return null;
  }
}

async function setCachedSearch(
  supabase: Db,
  key: string,
  payload: AskPayload,
): Promise<void> {
  try {
    await supabase.from('semantic_search_cache').upsert({
      cache_key: key,
      payload,
      model: payload.model,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + SEARCH_CACHE_TTL_MS).toISOString(),
    }, { onConflict: 'cache_key' });
  } catch { /* non-fatal: the next identical query just pays again */ }
}

// ── Measurement ──────────────────────────────────────────────────────────────

async function recordUsage(
  supabase: Db | null,
  row: ReturnType<typeof usageRow>,
): Promise<void> {
  console.log(`[ask-vault] ${JSON.stringify(row)}`);
  if (!supabase) return;
  try {
    await supabase.from('ask_vault_usage').insert(row);
  } catch { /* measurement must never break an answer */ }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function toWire(payload: AskPayload, cached: boolean) {
  const linkSet = payload.noAnswer ? payload.suggestions : payload.citations;
  return {
    ...payload,
    cached,
    synthesis: payload.noAnswer
      ? 'No grounded answer in the studio knowledge surface for that question yet.'
      : stripCitationMarkers(payload.answer),
    sources: linkSet.slice(0, 3).map((c) => ({ title: c.title, href: c.url, snippet: '' })),
  };
}

function noAnswerPayload(retrieval: Retrieval, version: string, model: string | null): AskPayload {
  return { answer: '', citations: [], noAnswer: true, suggestions: suggestionsFor(retrieval), model, corpusVersion: version };
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get('SEMANTIC_SEARCH_ALLOWED_ORIGIN') || 'https://vaultsparkstudios.com';
  const cors = corsHeaders(allowedOrigin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  if (isPaused()) return capExceededResponse(cors, 'paused');

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'Ask the Vault is unavailable right now.' }, 503);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase: Db = createClient(supabaseUrl, supabaseKey);
  const meterDb = supabaseUrl ? supabase : null;

  let body: { query?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Bad JSON' }, 400); }
  const query = String(body?.query ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LEN);
  if (query.length < 3) return json({ error: 'Query must be at least 3 characters.' }, 400);

  const corpus = await loadCorpus();
  if (!corpus) return json({ error: 'Ask the Vault is unavailable right now.' }, 503);

  const retrieval = selectPassages(query, corpus.index, DEFAULT_K);
  const base = { corpusPassages: corpus.passages.length, corpusVersion: corpus.version, topScore: retrieval.topScore, coverage: retrieval.coverage };

  // ── Zero-token gate: nothing in the corpus is close enough to answer from ──
  if (!retrieval.answerable) {
    await recordUsage(meterDb, usageRow({ outcome: 'no_answer_short_circuit', ...base }));
    return json(toWire(noAnswerPayload(retrieval, corpus.version, null), false));
  }

  // ── S368 response cache: one paid answer per (query, corpus version) ──
  const cacheKey = supabaseUrl ? await buildSearchCacheKey(query, CACHE_NAMESPACE, corpus.version) : '';
  if (cacheKey) {
    const hit = await getCachedSearch(supabase, cacheKey);
    if (hit) {
      await recordUsage(meterDb, usageRow({ outcome: 'cache_hit', model: hit.model, passagesSent: 0, ...base }));
      return json(toWire(hit, true));
    }
  }

  // Public, unauthenticated surface: fail CLOSED if the meter is unreadable.
  if (await isCapBreached(supabase, 'semantic-search', { failClosed: true })) {
    await recordUsage(meterDb, usageRow({ outcome: 'capped', ...base }));
    return capExceededResponse(cors, 'capped');
  }

  const sent = retrieval.passages;
  const grounding = buildGroundingBlock(sent);
  // Short, fully-covered questions with a strong match go to Haiku; the rest to Sonnet.
  const model = (query.length < 40 && retrieval.coverage >= 0.999 && retrieval.topScore >= MIN_ANSWER_SCORE * 2.5)
    ? HAIKU_MODEL
    : DEFAULT_MODEL;
  const promptCache = Deno.env.get('ASK_VAULT_PROMPT_CACHE') !== '0';

  let claudeRes: Response;
  try {
    claudeRes = await fetch(ANTHROPIC_API, {
      method: 'POST',
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: ASK_VAULT_SYSTEM,
        messages: [{
          role: 'user',
          content: [
            // Static-first order: instructions → passages (breakpoint) → question.
            promptCache
              ? { type: 'text', text: grounding, cache_control: { type: 'ephemeral' } }
              : { type: 'text', text: grounding },
            { type: 'text', text: buildQuestionBlock(query) },
          ],
        }],
        ...modelRequestExtras(model),
      }),
    });
  } catch (err) {
    console.error('[ask-vault] anthropic fetch failed', err instanceof Error ? err.name : 'error');
    await recordUsage(meterDb, usageRow({ outcome: 'upstream_error', model, passagesSent: sent.length, groundingChars: grounding.length, ...base }));
    return json({ ...toWire(noAnswerPayload(retrieval, corpus.version, null), false), error: 'Ask the Vault is unavailable right now.' }, 502);
  }

  if (!claudeRes.ok) {
    const errText = await claudeRes.text().catch(() => '');
    console.error(`[ask-vault] anthropic ${claudeRes.status}: ${errText.slice(0, 200)}`);
    await recordUsage(meterDb, usageRow({ outcome: 'upstream_error', model, passagesSent: sent.length, groundingChars: grounding.length, ...base }));
    // Generic body: never echo the upstream error. The closest pages still help.
    return json({ ...toWire(noAnswerPayload(retrieval, corpus.version, null), false), error: 'Ask the Vault is unavailable right now.' }, 502);
  }

  const out = await claudeRes.json();
  const usedModel: string = out.model || model;
  await meterCall(supabase, 'semantic-search', out.usage, usedModel);

  const rawText = out.stop_reason === 'refusal'
    ? ''
    : (Array.isArray(out.content) ? out.content : [])
      .filter((c: { type?: string }) => c?.type === 'text')
      .map((c: { text?: string }) => c.text || '')
      .join('');
  const parsed = parseCitations(rawText, sent.length);

  const payload: AskPayload = parsed.noAnswer
    ? noAnswerPayload(retrieval, corpus.version, usedModel)
    : {
      answer: parsed.answer,
      citations: citationsFor(parsed, sent),
      noAnswer: false,
      suggestions: [],
      model: usedModel,
      corpusVersion: corpus.version,
    };

  const outcome: AskVaultOutcome = parsed.noAnswer ? 'model_no_answer' : 'answer';
  await recordUsage(meterDb, usageRow({
    outcome,
    model: usedModel,
    usage: out.usage,
    passagesSent: sent.length,
    groundingChars: grounding.length,
    usdEstimate: estimateUsd(usedModel, out.usage),
    ...base,
  }));
  if (cacheKey) await setCachedSearch(supabase, cacheKey, payload);

  return json(toWire(payload, false));
});
