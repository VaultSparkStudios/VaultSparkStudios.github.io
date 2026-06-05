/**
 * semantic-search — Cmd+K AI synthesis edge function.
 *
 * Lightweight RAG: pulls /api/public-intelligence.json (already cached at the
 * edge), filters relevant chunks by simple term-overlap, passes the top N to
 * Claude, returns a 1–3 sentence synthesis with up to 3 source links.
 *
 * No embeddings infrastructure required. The intel.json is small enough
 * (~30 KB) that we can score every chunk in pure JS in ~5ms. When the corpus
 * outgrows that, swap in pgvector — the wire shape stays the same.
 *
 * P0 token governance: hard-capped under `semantic-search` ($2.50/day). Kill
 * switch via IGNIS_GLOBAL_PAUSE.
 *
 * Request:  { query: string, sources?: ('catalog'|'pulse'|'changelog')[] }
 * Response: { synthesis: string, sources: [{ title, href, snippet }], model, usage }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  capExceededResponse,
  isCapBreached,
  isPaused,
  meterCall,
} from '../_shared/tokenMeter.ts';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const MAX_QUERY_LEN = 200;
const MAX_CHUNKS = 6;

type Chunk = { kind: string; title: string; href: string; text: string; score: number };

let intelCache: { data: any; fetchedAt: number } | null = null;
const INTEL_TTL_MS = 5 * 60 * 1000;

async function getIntel(url: string): Promise<any> {
  if (intelCache && Date.now() - intelCache.fetchedAt < INTEL_TTL_MS) return intelCache.data;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`intel ${res.status}`);
    const data = await res.json();
    intelCache = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    return intelCache?.data ?? null;
  }
}

function tokenize(s: string): string[] {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

function scoreChunks(query: string, intel: any, sources: Set<string>): Chunk[] {
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) return [];
  const chunks: Chunk[] = [];

  if (sources.has('catalog') && Array.isArray(intel?.catalog)) {
    for (const item of intel.catalog) {
      const text = [item.name, item.note, item.tagline, item.description, item.status].filter(Boolean).join(' ');
      const score = scoreText(text, qTokens);
      if (score === 0) continue;
      const href = item.deployedUrl || (item.type === 'game' ? `/games/${item.id}/` : `/projects/${item.id}/`);
      chunks.push({ kind: 'project', title: item.name, href, text, score });
    }
  }

  if (sources.has('pulse')) {
    const pulse = intel?.pulse || {};
    for (const [bucket, label] of [['now', 'Studio is doing now'], ['next', 'Studio next up'], ['shipped', 'Recently shipped']] as const) {
      for (const line of (pulse[bucket] || [])) {
        const score = scoreText(line, qTokens);
        if (score === 0) continue;
        chunks.push({ kind: 'pulse', title: label, href: '/studio-pulse/', text: line, score });
      }
    }
  }

  if (sources.has('changelog') && Array.isArray(intel?.consumerChangelog)) {
    for (const entry of intel.consumerChangelog) {
      const text = [entry.title, ...(entry.highlights || [])].filter(Boolean).join(' · ');
      const score = scoreText(text, qTokens);
      if (score === 0) continue;
      chunks.push({ kind: 'changelog', title: `${entry.date} — ${entry.title}`, href: '/changelog/', text, score });
    }
  }

  chunks.sort((a, b) => b.score - a.score);
  return chunks.slice(0, MAX_CHUNKS);
}

function scoreText(text: string, qTokens: Set<string>): number {
  const tTokens = tokenize(text);
  let hits = 0;
  for (const t of tTokens) if (qTokens.has(t)) hits++;
  return hits;
}

function buildPrompt(query: string, chunks: Chunk[]): { system: string; user: string } {
  const system = [
    'You are IGNIS, the Vault Oracle for VaultSpark Studios.',
    'You answer the user\'s question using ONLY the provided context chunks.',
    'Voice: warm, precise, never inventing. 1–3 sentences. Reference the most relevant 1–2 chunk titles inline if useful.',
    'If the chunks do not actually answer the query, say so briefly and recommend /studio-pulse/.',
    'Never invent prices, dates, or features. Never use bullet points — flow text only.',
  ].join('\n');

  const ctx = chunks.length
    ? chunks.map((c, i) => `[${i + 1}] ${c.title}\n${c.text}`).join('\n\n')
    : '(no relevant context found)';

  const user = `Query: ${query}\n\n── CONTEXT ──\n${ctx}\n\nAnswer the query in 1–3 sentences.`;
  return { system, user };
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get('SEMANTIC_SEARCH_ALLOWED_ORIGIN') || 'https://vaultsparkstudios.com';
  const cors = corsHeaders(allowedOrigin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  if (isPaused()) return capExceededResponse(cors, 'paused');

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return new Response(JSON.stringify({ error: 'Search unavailable.' }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (await isCapBreached(supabase, 'semantic-search')) return capExceededResponse(cors, 'capped');

  let body: { query?: string; sources?: string[] };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Bad JSON' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }
  const query = String(body.query || '').trim().slice(0, MAX_QUERY_LEN);
  if (!query || query.length < 3) {
    return new Response(JSON.stringify({ error: 'Query must be at least 3 characters.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const sourcesSet = new Set(Array.isArray(body.sources) && body.sources.length
    ? body.sources : ['catalog', 'pulse', 'changelog']);

  const intelUrl = Deno.env.get('PUBLIC_INTEL_URL') || 'https://vaultsparkstudios.com/api/public-intelligence.json';
  const intel = await getIntel(intelUrl);
  const chunks = scoreChunks(query, intel, sourcesSet);

  // No relevant chunks → return early without spending a Claude call.
  if (chunks.length === 0) {
    return new Response(JSON.stringify({
      synthesis: 'No matches in the studio knowledge surface yet. Try the Studio Pulse to see what is currently in motion.',
      sources: [{ title: 'Studio Pulse', href: '/studio-pulse/', snippet: 'Live portfolio heartbeat' }],
      model: null,
      cached: true,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // Short queries with strong matches use Haiku; longer/ambiguous ones use Sonnet.
  const model = (query.length < 30 && chunks[0].score >= 3) ? HAIKU_MODEL : DEFAULT_MODEL;
  const { system, user } = buildPrompt(query, chunks);

  const claudeRes = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 280,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text().catch(() => '');
    console.error(`[semantic-search] anthropic ${claudeRes.status}: ${errText.slice(0, 200)}`);
    return new Response(JSON.stringify({
      error: 'AI synthesis upstream error',
      synthesis: chunks[0]?.text || 'No synthesis available.',
      sources: chunks.slice(0, 3).map((c) => ({ title: c.title, href: c.href, snippet: c.text.slice(0, 120) })),
    }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const json = await claudeRes.json();
  const synthesis = (json.content || []).map((c: any) => c.text || '').join('').trim();
  await meterCall(supabase, 'semantic-search', json.usage);

  return new Response(JSON.stringify({
    synthesis,
    sources: chunks.slice(0, 3).map((c) => ({ title: c.title, href: c.href, snippet: c.text.slice(0, 140) })),
    model: json.model || model,
    usage: json.usage,
  }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
