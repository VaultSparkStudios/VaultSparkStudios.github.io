/**
 * s368-wave0-security.unit.spec.mjs — hermetic checks for the S368 Wave 0
 * server-side security + AI cost changes (docs/AUDIT_2026-10-02.md):
 *   ignis-cache-privacy · ai-endpoint-abuse-caps · model-currency-and-caching ·
 *   definer-rpc-caller-trust · portal-xss-admin-server-side · csp-tightening
 *
 *   node --test tests/s368-wave0-security.unit.spec.mjs
 *
 * The edge-function helpers are plain TypeScript with no remote imports, so
 * Node's built-in type stripping (Node >= 23.6) imports them directly.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import {
  buildReplyCacheKey,
  buildSearchCacheKey,
  countUserTurns,
  interviewStageFromHistory,
  interviewTurnCapExceeded,
  intelVersionOf,
  promptIsPersonalized,
  replyCacheAllowed,
  INTERVIEW_MAX_USER_TURNS,
} from '../supabase/functions/_shared/ignisCache.ts';
import {
  HAIKU_MODEL,
  MODEL_FALLBACKS,
  MODEL_PRICES,
  SONNET_MODEL,
  estimateUsd,
  modelRequestExtras,
  priceKeyFor,
} from '../supabase/functions/_shared/modelPricing.ts';
import { WORKER_CSP, PAGE_CSP } from '../config/csp-policy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// ── ignis-cache-privacy ─────────────────────────────────────────────────────

test('S368 cache: two members with personalised prompts never share a cache entry', async () => {
  // Simulated shared cache with the exact read/write gate ask-ignis uses.
  const cache = new Map();
  async function ask({ mode, planTier, context, question, memoryBlock, profileBlock, history = [] }) {
    const personalized = promptIsPersonalized(mode === 'interview', memoryBlock, profileBlock);
    const allowed = replyCacheAllowed({ isMultiTurn: history.length > 0, personalized });
    const key = allowed ? await buildReplyCacheKey({ mode, planTier, context, question }) : '';
    if (allowed && cache.has(key)) return { reply: cache.get(key), hit: true };
    const reply = `answer for ${memoryBlock || profileBlock || 'nobody'}`;
    if (allowed) cache.set(key, reply);
    return { reply, hit: false };
  }

  const q = 'What should I play next?';
  const a = await ask({ mode: 'oracle', planTier: 'vault_sparked:std', context: null, question: q,
    memoryBlock: '── PRIOR CONVERSATION MEMORY ── member A likes Voidfall', profileBlock: 'Deep member' });
  const b = await ask({ mode: 'oracle', planTier: 'vault_sparked:std', context: null, question: q,
    memoryBlock: '── PRIOR CONVERSATION MEMORY ── member B likes MindFrame', profileBlock: 'Newer member' });
  assert.equal(a.hit, false);
  assert.equal(b.hit, false, 'member B must not receive member A\'s cached reply');
  assert.notEqual(a.reply, b.reply);
  assert.equal(cache.size, 0, 'personalised replies are never written to the shared cache');

  // A non-personalised reply is cached and served to the same mode/tier/context only.
  const anon1 = await ask({ mode: 'interview', planTier: 'free:std', context: null, question: 'Starting the interview.', memoryBlock: '', profileBlock: '' });
  const anon2 = await ask({ mode: 'interview', planTier: 'free:std', context: null, question: 'Starting the interview.', memoryBlock: '', profileBlock: '' });
  assert.equal(anon1.hit, false);
  assert.equal(anon2.hit, true);
});

test('S368 cache key binds mode, tier, context and normalised question', async () => {
  const base = { mode: 'oracle', planTier: 'vault_sparked:std', context: '/games/', question: 'What is VaultFront?' };
  const k = await buildReplyCacheKey(base);
  assert.match(k, /^[0-9a-f]{64}$/);
  assert.equal(await buildReplyCacheKey({ ...base, question: '  what is vaultfront  ' }), k, 'normalisation is stable');
  assert.notEqual(await buildReplyCacheKey({ ...base, mode: 'interview' }), k);
  assert.notEqual(await buildReplyCacheKey({ ...base, planTier: 'vault_sparked_pro:pro' }), k);
  assert.notEqual(await buildReplyCacheKey({ ...base, context: '/universe/' }), k);
  assert.notEqual(await buildReplyCacheKey({ ...base, context: null }), k);
});

test('S368 interview mode never counts as personalised; oracle with memory or profile does', () => {
  assert.equal(promptIsPersonalized(true, 'memory', 'profile'), false);
  assert.equal(promptIsPersonalized(false, '', ''), false);
  assert.equal(promptIsPersonalized(false, 'memory', ''), true);
  assert.equal(promptIsPersonalized(false, '', 'profile'), true);
  assert.equal(replyCacheAllowed({ isMultiTurn: true, personalized: false }), false);
});

// ── ai-endpoint-abuse-caps ──────────────────────────────────────────────────

test('S368 interview stage comes from history, not the client turn counter', () => {
  assert.equal(interviewStageFromHistory([]), 0);
  assert.equal(interviewStageFromHistory([{ role: 'assistant', content: 'q1' }, { role: 'user', content: 'a1' }]), 0);
  const two = [{ role: 'assistant' }, { role: 'user' }, { role: 'assistant' }, { role: 'user' }];
  assert.equal(interviewStageFromHistory(two), 1);
  assert.equal(interviewStageFromHistory([...two, { role: 'assistant' }, { role: 'user' }]), 2);
  assert.equal(interviewStageFromHistory(Array.from({ length: 20 }, () => ({ role: 'user' }))), 2, 'clamped to final stage');
  assert.equal(countUserTurns('nope'), 0);
});

test('S368 interview turn cap refuses histories longer than the interview can produce', () => {
  const ok = Array.from({ length: INTERVIEW_MAX_USER_TURNS }, () => ({ role: 'user', content: 'x' }));
  assert.equal(interviewTurnCapExceeded(ok), false);
  assert.equal(interviewTurnCapExceeded([...ok, { role: 'user', content: 'x' }]), true);
});

test('S368 ask-ignis: interview pinned to Haiku, generic 502, fail-closed for anonymous', () => {
  const src = read('supabase/functions/ask-ignis/index.ts');
  assert.match(src, /interviewMode\s*\?\s*\[HAIKU_MODEL\]/, 'interview model chain is Haiku only');
  assert.match(src, /isCapBreached\(supabase, meterFunctionName, \{ failClosed: !membership\.authenticated \}\)/);
  assert.doesNotMatch(src, /triedModels/, '502 body must not echo the model chain');
  assert.doesNotMatch(src, /detail:\s*lastErrText/, '502 body must not echo the upstream error');
  assert.match(src, /interviewTurnCapExceeded\(body\.history\)/);
  // The client-supplied interviewTurn is not used to compute the stage.
  assert.doesNotMatch(src, /Number\(body\.interviewTurn/);
});

test('S368 semantic-search: response cache before the paid call, fail-closed cap', () => {
  const src = read('supabase/functions/semantic-search/index.ts');
  const cacheAt = src.indexOf('getCachedSearch(supabase, cacheKey)');
  const capAt = src.indexOf("isCapBreached(supabase, 'semantic-search', { failClosed: true })");
  const callAt = src.indexOf('await fetch(ANTHROPIC_API');
  assert.ok(cacheAt > 0 && capAt > cacheAt && callAt > capAt, 'cache lookup → cap check → Claude call');
  assert.match(src, /setCachedSearch\(supabase, cacheKey, payload\)/);
});

test('S368 search cache key: query + sources + intel version', async () => {
  const v1 = intelVersionOf({ schemaVersion: '1.2', generatedAt: '2026-10-01T00:00:00Z' });
  const v2 = intelVersionOf({ schemaVersion: '1.2', generatedAt: '2026-10-02T00:00:00Z' });
  const k = await buildSearchCacheKey('VaultFront release', ['pulse', 'catalog'], v1);
  assert.equal(await buildSearchCacheKey('vaultfront release!', ['catalog', 'pulse'], v1), k);
  assert.notEqual(await buildSearchCacheKey('VaultFront release', ['catalog'], v1), k);
  assert.notEqual(await buildSearchCacheKey('VaultFront release', ['pulse', 'catalog'], v2), k);
  assert.equal(intelVersionOf(null), 'na:na');
});

test('S368 tokenMeter: cap check honours failClosed on read error and exception', () => {
  const src = read('supabase/functions/_shared/tokenMeter.ts');
  assert.match(src, /failClosed\?: boolean/);
  assert.match(src, /if \(error\) \{[\s\S]*?return failClosed;/);
  assert.match(src, /catch \(err\) \{[\s\S]*?return failClosed;/);
  assert.match(src, /p_model: model/);
});

// ── model-currency-and-caching ──────────────────────────────────────────────

test('S368 models: current IDs, retired fallbacks gone, beta header dropped', () => {
  assert.equal(SONNET_MODEL, 'claude-sonnet-5-5');
  assert.equal(HAIKU_MODEL, 'claude-haiku-4-5-20251001');
  assert.deepEqual([...MODEL_FALLBACKS], [HAIKU_MODEL]);
  for (const rel of ['supabase/functions/ask-ignis/index.ts', 'supabase/functions/semantic-search/index.ts']) {
    const src = read(rel);
    assert.doesNotMatch(src, /claude-sonnet-4-[56]/, `${rel} still names a retired Sonnet`);
    assert.doesNotMatch(src, /prompt-caching-2024-07-31/, `${rel} still sends the obsolete beta header`);
  }
});

test('S368 ask-ignis system blocks: one cached static prefix, per-request data uncached', () => {
  const src = read('supabase/functions/ask-ignis/index.ts');
  assert.match(src, /\{ type: 'text', text: staticBlock, cache_control: \{ type: 'ephemeral' \} \}/);
  assert.match(src, /systemMessages\.push\(\{ type: 'text', text: dynamicBlock \}\)/);
  assert.equal((src.match(/cache_control:/g) || []).length, 1, 'exactly one breakpoint');
  assert.match(src, /\[pageContextBlock, memoryBlock, profileBlock\]/);
});

test('S368 Sonnet 5.5 requests keep thinking at its lowest setting; other models send nothing extra', () => {
  assert.deepEqual(modelRequestExtras('claude-sonnet-5-5'), { thinking: { type: 'between_tools' } });
  assert.deepEqual(modelRequestExtras(HAIKU_MODEL), {});
  assert.deepEqual(modelRequestExtras('claude-sonnet-4-6'), {});
});

test('S368 price table: per-model pricing, SQL and TS mirror agree', () => {
  assert.equal(priceKeyFor('claude-haiku-4-5-20251001'), 'claude-haiku-4-5');
  assert.equal(priceKeyFor(undefined), 'default');
  const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000 };
  assert.equal(estimateUsd('claude-sonnet-5-5', usage), 12);
  assert.equal(estimateUsd(HAIKU_MODEL, usage), 6);
  assert.equal(estimateUsd('mystery-model', usage), 18);

  const sql = read('supabase/migrations/supabase-s368-ignis-meter-model-pricing.sql');
  const rows = [
    ['claude-sonnet-5-5', MODEL_PRICES['claude-sonnet-5-5']],
    ['claude-haiku-4-5', MODEL_PRICES['claude-haiku-4-5']],
    ['claude-opus-5-5', MODEL_PRICES['claude-opus-5-5']],
  ];
  for (const [model, p] of rows) {
    const re = new RegExp(`like '%${model}%' then\\s+v_in_rate := ${p.input.toFixed(2)}; v_out_rate := ${p.output.toFixed(2)};\\s*v_read_rate := ${p.cacheRead.toFixed(2)}; v_write_rate := ${p.cacheWrite.toFixed(2)};`);
    assert.match(sql, re, `SQL price row for ${model} must match modelPricing.ts`);
  }
  assert.match(sql, /p_model\s+text\s+default null/);
  assert.match(sql, /revoke execute on function public\.increment_ignis_meter\(text, bigint, bigint, bigint, bigint, text\) from anon;/);
});

// ── definer-rpc-caller-trust ────────────────────────────────────────────────

test('S368 caller-trust migration: RPCs bind to auth.uid() and lose anon EXECUTE', () => {
  const sql = read('supabase/migrations/supabase-s368-caller-trust.sql');
  assert.match(sql, /submit_weekly_score\(p_user_id uuid, p_game_slug text, p_score integer\)/, 'signature kept for clients');
  assert.match(sql, /p_user_id <> v_uid then\s+return jsonb_build_object\('ok', false, 'error', 'user_mismatch'\)/);
  assert.match(sql, /revoke execute on function public\.submit_weekly_score\(uuid, text, integer\) from anon;/);
  assert.match(sql, /follower_id = auth\.uid\(\)/);
  assert.match(sql, /vm\.public_profile = true/);
  assert.match(sql, /revoke execute on function public\.get_following_feed\(uuid, integer\) from anon;/);
  assert.match(sql, /create or replace view public\.teams_public[\s\S]*?select id, name, total_points, created_at/);
  assert.doesNotMatch(sql.match(/create or replace view public\.teams_public[\s\S]*?;/)[0], /invite_code/);
  assert.match(sql, /create or replace view public\.fan_art_vote_counts[\s\S]*?count\(\*\)/);
  assert.match(sql, /array\['challenge_streak', 'last_challenge_date', 'rank_name'\]/);
  assert.match(sql, /cols := cols \|\| 'username_lower'::text/);
});

test('S368 /member/ lookup is exact (eq on username_lower), never ilike', () => {
  const html = read('member/index.html');
  assert.doesNotMatch(html, /username=ilike\./);
  assert.match(html, /username_lower=eq\.'\+encodeURIComponent\(raw\.toLowerCase\(\)\)/);
});

// ── portal-xss-admin-server-side ────────────────────────────────────────────

function loadPortalHelpers() {
  const src = read('vault-member/portal-features.js');
  const start = src.indexOf('// ── Shared portal escaping helpers');
  const end = src.indexOf('// ── Fan Art Moderation');
  assert.ok(start > 0 && end > start, 'helper block located');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src.slice(start, end) + '\nthis.h = { escHtml, escAttr, safeUrl, safeStoragePath, csvCell };', ctx);
  return ctx.h;
}

test('S368 portal escaping helpers', () => {
  const { escHtml, escAttr, safeUrl, safeStoragePath } = loadPortalHelpers();
  assert.equal(escHtml('<img src=x onerror="a()">'), '&lt;img src=x onerror=&quot;a()&quot;&gt;');
  assert.equal(escHtml("it's"), 'it&#39;s');
  assert.equal(escHtml(0), '0');
  assert.equal(escHtml(null), '');
  assert.equal(escAttr('a`b'), 'a&#96;b');

  assert.equal(safeUrl('https://example.com/a.png'), 'https://example.com/a.png');
  assert.equal(safeUrl('/games/'), '/games/');
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl(' JaVaScRiPt:alert(1)'), '');
  assert.equal(safeUrl('java\tscript:alert(1)'), '');
  assert.equal(safeUrl('data:text/html,<script>'), '');
  assert.equal(safeUrl('//evil.example/x'), '');

  assert.equal(safeStoragePath('user-1/art 1.png'), 'user-1/art%201.png');
  assert.equal(safeStoragePath('../secret'), '');
  assert.equal(safeStoragePath('a/"onerror=x'), 'a/%22onerror%3Dx');
});

test('S368 CSV export neutralises formula injection', () => {
  const { csvCell } = loadPortalHelpers();
  for (const lead of ['=', '+', '-', '@', '\t', '\r']) {
    assert.ok(csvCell(lead + 'cmd').startsWith("'") || csvCell(lead + 'cmd').startsWith("\"'"), `leading ${JSON.stringify(lead)} is prefixed`);
  }
  assert.equal(csvCell('=HYPERLINK("x")'), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell(42), '42');
  assert.match(read('vault-member/portal-features.js'), /\.map\(csvCell\)\.join\(','\)/);
});

test('S368 portal: fan-art file paths and archive/challenge titles are escaped; admin needs is_vault_admin()', () => {
  const features = read('vault-member/portal-features.js');
  assert.doesNotMatch(features, /fan-art\/\$\{r\.file_path\}/, 'raw file_path no longer interpolated');
  assert.match(features, /safeStoragePath\(r\.file_path\)/);
  const challenges = read('vault-member/portal-challenges.js');
  assert.doesNotMatch(challenges, /<span class="file-title">\$\{f\.title\}<\/span>/);
  assert.doesNotMatch(challenges, /\$\{f\.classification\}/);
  assert.doesNotMatch(challenges, /<div class="challenge-title">\$\{ch\.title\}<\/div>/);
  assert.match(challenges, /rpc\('record_challenge_streak'\)/);
  const auth = read('vault-member/portal-auth.js');
  assert.match(auth, /rpc\('is_vault_admin'\)/);
  assert.match(auth, /data !== true\) return;/);
});

// ── csp-tightening ──────────────────────────────────────────────────────────

function trackedJsdelivrUrls() {
  const files = execFileSync('git', ['ls-files', '*.html', '*.js'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter((f) => f && !f.startsWith('.cache/'));
  const urls = new Set();
  for (const f of files) {
    let text;
    try { text = readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
    for (const m of text.matchAll(/https:\/\/cdn\.jsdelivr\.net\/[^"'\s)>]+/g)) urls.add(m[0]);
  }
  return [...urls];
}

test('S368 CSP: jsdelivr is path-scoped and every used jsdelivr script stays allowed', () => {
  for (const csp of [WORKER_CSP, PAGE_CSP]) {
    const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src '));
    const sources = scriptSrc.split(/\s+/).slice(1);
    assert.ok(!sources.includes('https://cdn.jsdelivr.net'), 'no bare jsdelivr host');
    const jsd = sources.filter((s) => s.startsWith('https://cdn.jsdelivr.net/'));
    assert.ok(jsd.length >= 1);
    for (const url of trackedJsdelivrUrls()) {
      const allowed = jsd.some((s) => (s.endsWith('/') ? url.startsWith(s) : url === s));
      assert.ok(allowed, `${url} is used by a tracked page but not allowed by script-src`);
    }
  }
});

test('S368 worker no longer sends the deprecated X-XSS-Protection header', () => {
  const src = read('cloudflare/security-headers-worker.js');
  const block = src.slice(src.indexOf('const SECURITY_HEADERS = {'), src.indexOf('};', src.indexOf('const SECURITY_HEADERS = {')));
  assert.doesNotMatch(block, /X-XSS-Protection/i);
  assert.match(src, /const REMOVE_HEADERS = \[[^\]]*'x-xss-protection'/);
});
