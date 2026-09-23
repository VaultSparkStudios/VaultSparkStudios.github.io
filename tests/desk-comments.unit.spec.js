/**
 * desk-comments.unit.spec.js — hermetic unit tests for The Desk community
 * comments (S356): the pure filter, the edge handlers, the Worker route wiring
 * and the newsletter unsubscribe proxy.
 *
 *   node --test tests/desk-comments.unit.spec.js
 *
 * Same shape as tests/worker.unit.spec.js: Node's built-in runner, zero new
 * dependencies, zero network. Every Supabase / Turnstile / Supabase-Functions
 * call is a fake `fetchImpl`, and the route tests go through the REAL Worker
 * entry point (`worker.fetch`) so a handler that works but is not wired — or is
 * wired behind the global form layer — fails here rather than in production.
 *
 * What this file deliberately does NOT claim: report de-duplication and the
 * auto-hold at three reports are enforced inside the Postgres function, so the
 * tests below assert the handler's contract with that function plus the
 * structural presence of the rule in the migration. The behavioural proof is
 * the `desk-comments` probe in scripts/apply-supabase-migration.mjs, run
 * against the real database after the migration is applied.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import worker from '../cloudflare/security-headers-worker.js';
import { issueCsrfToken } from '../cloudflare/worker-lib.mjs';
import {
  filterComment,
  filterDisplayName,
  normalizeText,
  skeleton,
} from '../cloudflare/comment-filter.mjs';
import {
  handleDeskComments,
  threadComments,
  rateDecision,
  validStorySlug,
  hashReader,
  DESK_COMMENT_LIMITS,
  DESK_COMMENTS_PATH,
  DESK_COMMENTS_REPORT_PATH,
} from '../cloudflare/desk-comments.mjs';
import {
  handleNewsletterUnsubscribeProxy,
  NEWSLETTER_UNSUBSCRIBE_PATH,
} from '../cloudflare/newsletter-unsubscribe-proxy.mjs';
import { listQuery, patchQuery, ACTIONS, invalidIds } from '../scripts/moderate-desk-comments.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APEX = 'https://vaultsparkstudios.com';
const SLUG = '2026-09-14/a-real-story';
const MEMBER_UUID = '11111111-1111-4111-8111-111111111111';
const PARENT_UUID = '22222222-2222-4222-8222-222222222222';
const CTX = { waitUntil() {} };

// --- fakes -----------------------------------------------------------------

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function fakeKv(seed = new Map()) {
  const entries = new Map(seed);
  return {
    entries,
    puts: [],
    gets: [],
    async get(key) { this.gets.push(key); return entries.get(key) ?? null; },
    async put(key, value, options) { this.puts.push({ key, value, options }); entries.set(key, value); },
    async delete(key) { entries.delete(key); },
  };
}

/**
 * One fake for every outbound call the handlers can make. Anything unexpected
 * throws, so a new network dependency cannot slip in unnoticed.
 */
function fakeUpstream({
  rows = [],
  parent = null,
  leaderboard = [],
  rpc = { ok: true, counted: true, status: 'published', reportCount: 1 },
  insertOk = true,
  turnstileOk = true,
} = {}) {
  const calls = [];
  const impl = async (url, init = {}) => {
    const href = String(url);
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body ? String(init.body) : null;
    calls.push({ href, method, body, headers: init.headers || {} });

    if (href.startsWith('https://challenges.cloudflare.com/')) {
      return jsonResponse({ success: turnstileOk, hostname: 'vaultsparkstudios.com' });
    }
    if (href.includes('/rest/v1/public_leaderboard')) return jsonResponse(leaderboard);
    if (href.includes('/rest/v1/rpc/desk_comment_report')) {
      return rpc === null ? new Response('boom', { status: 500 }) : jsonResponse(rpc);
    }
    if (href.includes('/rest/v1/desk_comments')) {
      if (method === 'POST') {
        if (!insertOk) return new Response('denied', { status: 403 });
        const sent = JSON.parse(body)[0];
        return jsonResponse([{
          id: '33333333-3333-4333-8333-333333333333',
          parent_id: sent.parent_id,
          body: sent.body,
          author_kind: sent.author_kind,
          display_name: sent.display_name,
          featured: false,
          created_at: '2026-09-14T12:00:00.000Z',
        }], 201);
      }
      // The parent lookup is the only read that projects story_slug.
      if (href.includes('story_slug,parent_id,status')) return jsonResponse(parent ? [parent] : []);
      return jsonResponse(rows);
    }
    throw new Error(`unexpected outbound fetch: ${href}`);
  };
  const inserts = () => calls.filter((c) => c.href.includes('/rest/v1/desk_comments') && c.method === 'POST');
  const challenges = () => calls.filter((c) => c.href.startsWith('https://challenges.cloudflare.com/'));
  return { impl, calls, inserts, challenges };
}

function baseEnv(kv = fakeKv()) {
  return {
    CSRF_SIGNING_KEY: 'unit-test-signing-key-not-a-secret',
    TURNSTILE_SECRET_KEY: 'unit-test-turnstile-not-a-secret',
    SUPABASE_SERVICE_ROLE_KEY: 'unit-test-service-role',
    RATE_LIMIT: kv,
  };
}

function postRequest(body, { csrf = null, cookie = null, pathname = DESK_COMMENTS_PATH } = {}) {
  const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' };
  if (csrf) headers['X-CSRF-Token'] = csrf;
  if (cookie) headers.Cookie = cookie;
  return new Request(`${APEX}${pathname}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

/** Run a request through the real Worker entry with a mocked global fetch. */
async function throughWorker(request, env, upstream) {
  const original = globalThis.fetch;
  globalThis.fetch = upstream.impl;
  try {
    return await worker.fetch(request, env, CTX);
  } finally {
    globalThis.fetch = original;
  }
}

// --- the filter ------------------------------------------------------------

test('the filter publishes ordinary comments and holds anything it is unsure about', () => {
  const clean = filterComment('The chaperone model is the part of this that actually matters.');
  assert.equal(clean.verdict, 'published');
  assert.deepEqual(clean.reasons, []);

  const profane = filterComment('This is shit reporting and you know it.');
  assert.equal(profane.verdict, 'held', 'strong language is an opinion, held for a human, never auto-rejected');
  assert.ok(profane.reasons.includes('profanity'));

  // Evasion: spaced-out spelling folds to the same skeleton.
  assert.equal(filterComment('what a f u c k i n g mess this is').verdict, 'held');

  const short = filterComment('a');
  assert.equal(short.verdict, 'rejected');
  assert.deepEqual(short.reasons, ['length']);
  assert.equal(filterComment('x'.repeat(1501)).reasons[0], 'length');
});

test('the filter rejects threats and unambiguous hate, including obfuscated spellings', () => {
  const threat = filterComment('kys, seriously');
  assert.equal(threat.verdict, 'rejected');
  assert.ok(threat.reasons.includes('threat'));
  assert.equal(threat.category, 'threat');

  const threatened = filterComment('i will find you and hurt you');
  assert.equal(threatened.verdict, 'rejected');

  // Leetspeak + separator evasion resolves to the same verdict as plain text.
  for (const attempt of ['n1gger', 'n.i.g.g.e.r', 'n i g g e r']) {
    const result = filterComment(`you ${attempt} clown`);
    assert.equal(result.verdict, 'rejected', `expected rejection for ${attempt}`);
    assert.equal(result.category, 'hate');
  }

  // Reclaimed / ambiguous vocabulary is held for a person, not auto-refused.
  assert.equal(filterComment('there is a chink in that argument').verdict, 'held');
});

test('the filter holds contact details and applies the link allowance per author kind', () => {
  assert.ok(filterComment('mail me at someone@example.com').reasons.includes('email'));
  assert.ok(filterComment('call 555-123-4567 for the real story').reasons.includes('phone'));

  // A specific address is refused. Leetspeak folding rewrites digits in the
  // match skeleton, so this only fires because the rule also runs against the
  // normalized text — assert the verdict, not just the presence of the rule.
  const address = filterComment('he lives at 221 Baker Street, go say hello');
  assert.equal(address.verdict, 'rejected');
  assert.ok(address.reasons.includes('doxxing'));
  assert.equal(address.category, 'privacy');
  assert.equal(filterComment('her SSN is 123-45-6789').verdict, 'rejected');

  // Commentary ABOUT doxxing is a normal thing to say about a story.
  const commentary = filterComment('the piece published his home address, which was reckless');
  assert.equal(commentary.verdict, 'held');
  assert.ok(commentary.reasons.includes('doxxing_mention'));

  const guestLink = filterComment('source: https://example.com/report', { authorKind: 'guest' });
  assert.equal(guestLink.verdict, 'held');
  assert.ok(guestLink.reasons.includes('link'), 'a guest gets no link allowance at all');

  const memberLink = filterComment('source: https://example.com/report', { authorKind: 'member' });
  assert.equal(memberLink.verdict, 'published', 'a member may cite one source without review');

  const memberSpam = filterComment('a.com b.com c.com all worth reading', { authorKind: 'member' });
  assert.equal(memberSpam.verdict, 'held');
  assert.ok(memberSpam.reasons.includes('links_excess'), 'a member past the allowance is still held');
});

test('the filter holds accumulated spam signal without ever rejecting on it alone', () => {
  const shouty = filterComment('BUY NOW CLICK HERE LIMITED TIME OFFER GUARANTEED RETURNS');
  assert.equal(shouty.verdict, 'held');
  assert.ok(shouty.score >= 3);
  assert.notEqual(shouty.verdict, 'rejected', 'spam is held for review, not silenced');
});

test('normalization strips invisible characters and is what gets stored', () => {
  const stored = normalizeText('hel​lo    world\r\n\r\n\r\nagain   ');
  assert.equal(stored, 'hello world\n\nagain');
  assert.ok(!/[ ​]/.test(stored));
  assert.equal(skeleton('рaypal'), 'paypal', 'Cyrillic homoglyphs fold to ASCII for matching only');
  assert.equal(filterComment('hel​lo there reader').text, 'hello there reader');
});

test('display names refuse impersonation, contact details and empty handles', () => {
  assert.equal(filterDisplayName('Jordan').ok, true);
  assert.equal(filterDisplayName('VaultSpark Admin').ok, false, 'a guest may not claim a studio handle');
  assert.ok(filterDisplayName('VaultSpark Admin').reasons.includes('reserved'));
  assert.equal(filterDisplayName('me@example.com').ok, false);
  assert.equal(filterDisplayName('   ').ok, false);
  assert.equal(filterDisplayName('x'.repeat(41)).ok, false);
});

// --- threading + public field projection -----------------------------------

test('the thread sorts featured, then members, then newest — and projects public fields only', () => {
  const rows = [
    { id: 'a', parent_id: null, body: 'old member', author_kind: 'member', display_name: 'vera', featured: false, created_at: '2026-09-10T00:00:00Z', ip_hash: 'LEAK', user_id: MEMBER_UUID, filter_score: 4, filter_reasons: ['profanity'], report_count: 2, status: 'published' },
    { id: 'b', parent_id: null, body: 'new guest', author_kind: 'guest', display_name: 'Jordan', featured: false, created_at: '2026-09-13T00:00:00Z' },
    { id: 'c', parent_id: null, body: 'featured guest', author_kind: 'guest', display_name: 'Sam', featured: true, created_at: '2026-09-01T00:00:00Z' },
    { id: 'd', parent_id: 'b', body: 'first reply', author_kind: 'guest', display_name: 'Ada', featured: false, created_at: '2026-09-13T01:00:00Z' },
    { id: 'e', parent_id: 'b', body: 'second reply', author_kind: 'guest', display_name: 'Lee', featured: false, created_at: '2026-09-13T02:00:00Z' },
    { id: 'f', parent_id: 'ghost', body: 'orphan', author_kind: 'guest', display_name: 'Nobody', featured: false, created_at: '2026-09-13T03:00:00Z' },
  ];
  const thread = threadComments(rows);
  assert.deepEqual(thread.map((c) => c.id), ['c', 'a', 'b'], 'featured first, then the member, then newest');
  assert.deepEqual(thread[2].replies.map((r) => r.id), ['d', 'e'], 'replies read oldest first');
  assert.equal(JSON.stringify(thread).includes('ghost'), false, 'a reply with no visible parent is dropped, not floated');

  const keys = Object.keys(thread[1]).sort();
  assert.deepEqual(keys, ['author_kind', 'body', 'created_at', 'display_name', 'featured', 'id', 'parent_id', 'replies']);
  const serialized = JSON.stringify(thread);
  for (const secret of ['LEAK', MEMBER_UUID, 'filter_score', 'report_count', 'ip_hash']) {
    assert.equal(serialized.includes(secret), false, `${secret} must never leave the edge`);
  }
});

test('slug validation matches the database CHECK constraint', () => {
  assert.equal(validStorySlug(SLUG), SLUG);
  for (const bad of ['2026-09-14/Caps', '2026-9-14/story', 'story', '2026-09-14/', '2026-09-14/a story', null, 42]) {
    assert.equal(validStorySlug(bad), null, `${String(bad)} must not pass`);
  }
});

// --- GET -------------------------------------------------------------------

test('GET is wired into the Worker, is cacheable for 30s, and 400s on a bad slug', async () => {
  const upstream = fakeUpstream({
    rows: [{ id: 'a', parent_id: null, body: 'hello', author_kind: 'guest', display_name: 'Jordan', featured: false, created_at: '2026-09-13T00:00:00Z' }],
  });
  const env = baseEnv();

  const ok = await throughWorker(new Request(`${APEX}${DESK_COMMENTS_PATH}?slug=${encodeURIComponent(SLUG)}`), env, upstream);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('Cache-Control'), 'public, max-age=30', 'the global header layer must not force no-store on the public read');
  assert.equal(ok.headers.get('X-Content-Type-Options'), 'nosniff', 'the route still gets the site security headers');
  const payload = await ok.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.count, 1);
  assert.equal(payload.comments[0].display_name, 'Jordan');

  const bad = await throughWorker(new Request(`${APEX}${DESK_COMMENTS_PATH}?slug=nope`), env, upstream);
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error, 'bad_slug');

  const unconfigured = await throughWorker(
    new Request(`${APEX}${DESK_COMMENTS_PATH}?slug=${encodeURIComponent(SLUG)}`),
    { ...env, SUPABASE_SERVICE_ROLE_KEY: '' },
    upstream,
  );
  assert.equal(unconfigured.status, 503, 'an unconfigured edge degrades honestly rather than 500ing');

  assert.equal(upstream.calls.every((c) => c.method === 'GET'), true, 'a read never writes');
});

// --- POST ------------------------------------------------------------------

test('a clean guest comment publishes, and the stored row carries the verdict and a salted ip hash', async () => {
  const upstream = fakeUpstream();
  const kv = fakeKv();
  const env = baseEnv(kv);
  const csrf = await issueCsrfToken(env);

  const response = await throughWorker(postRequest({
    slug: SLUG,
    body: 'A considered point about the chaperone model.',
    displayName: 'Jordan',
    turnstileToken: 'turnstile-token-value',
  }, { csrf }), env, upstream);

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.status, 'published');
  assert.equal(payload.comment.display_name, 'Jordan');

  const row = JSON.parse(upstream.inserts()[0].body)[0];
  assert.equal(row.status, 'published');
  assert.equal(row.author_kind, 'guest');
  assert.equal(row.user_id, null);
  assert.equal(row.story_slug, SLUG);
  assert.match(row.ip_hash, /^[0-9a-f]{32}$/);
  assert.equal(row.ip_hash.includes('203.0.113.7'), false, 'the reader IP is hashed, never stored');
});

test('the verdict decides the status code: held is accepted quietly, rejected names a category', async () => {
  const env = baseEnv();
  const csrf = await issueCsrfToken(env);

  const heldUpstream = fakeUpstream();
  const held = await throughWorker(postRequest({
    slug: SLUG, body: 'This is shit reporting and you know it.', displayName: 'Jordan', turnstileToken: 'turnstile-token-value',
  }, { csrf }), env, heldUpstream);
  assert.equal(held.status, 202);
  const heldBody = await held.json();
  assert.equal(heldBody.status, 'held');
  assert.equal(heldBody.comment, undefined, 'a held comment is never handed back for rendering');
  assert.equal(JSON.parse(heldUpstream.inserts()[0].body)[0].status, 'held');

  const rejectedUpstream = fakeUpstream();
  const rejected = await throughWorker(postRequest({
    slug: SLUG, body: 'kys you absolute waste', displayName: 'Jordan', turnstileToken: 'turnstile-token-value',
  }, { csrf }), env, rejectedUpstream);
  assert.equal(rejected.status, 422);
  const rejectedBody = await rejected.json();
  assert.equal(rejectedBody.status, 'rejected');
  assert.equal(rejectedBody.category, 'threat');
  assert.equal(JSON.parse(rejectedUpstream.inserts()[0].body)[0].status, 'rejected');
});

test('a guest POST without Turnstile or without CSRF is refused before anything is written', async () => {
  const env = baseEnv();
  const csrf = await issueCsrfToken(env);

  const noTurnstile = fakeUpstream();
  const missing = await throughWorker(postRequest({
    slug: SLUG, body: 'A perfectly ordinary comment.', displayName: 'Jordan',
  }, { csrf }), env, noTurnstile);
  assert.equal(missing.status, 403);
  assert.equal((await missing.json()).error, 'turnstile_token_missing');
  assert.equal(noTurnstile.inserts().length, 0);

  const failed = fakeUpstream({ turnstileOk: false });
  const invalid = await throughWorker(postRequest({
    slug: SLUG, body: 'A perfectly ordinary comment.', displayName: 'Jordan', turnstileToken: 'turnstile-token-value',
  }, { csrf }), env, failed);
  assert.equal(invalid.status, 403);
  assert.equal((await invalid.json()).error, 'turnstile_invalid');
  assert.equal(failed.inserts().length, 0);

  const noCsrf = fakeUpstream();
  const forged = await throughWorker(postRequest({
    slug: SLUG, body: 'A perfectly ordinary comment.', displayName: 'Jordan', turnstileToken: 'turnstile-token-value',
  }), env, noCsrf);
  assert.equal(forged.status, 403);
  assert.equal((await forged.json()).error, 'csrf_invalid');
  assert.equal(noCsrf.calls.length, 0, 'a request with no CSRF token reaches neither Turnstile nor Supabase');

  // The route is NOT in the Worker's global form layer, so the handler's own
  // CSRF check is the only one: a valid token must not be rejected twice.
  const accepted = fakeUpstream();
  const ok = await throughWorker(postRequest({
    slug: SLUG, body: 'A perfectly ordinary comment.', displayName: 'Jordan', turnstileToken: 'turnstile-token-value',
  }, { csrf }), env, accepted);
  assert.equal(ok.status, 201, 'the same token that the handler accepts is not double-gated by Layer 3');
});

test('the guest rate limit costs exactly one KV write per accepted POST and then 429s', async () => {
  const kv = fakeKv();
  const env = baseEnv(kv);
  const csrf = await issueCsrfToken(env);
  const body = { slug: SLUG, body: 'Another considered point entirely.', displayName: 'Jordan', turnstileToken: 'turnstile-token-value' };

  for (let i = 0; i < DESK_COMMENT_LIMITS.guest.windowMax; i++) {
    const response = await throughWorker(postRequest(body, { csrf }), env, fakeUpstream());
    assert.equal(response.status, 201, `submission ${i + 1} should be accepted`);
  }
  assert.equal(kv.puts.length, DESK_COMMENT_LIMITS.guest.windowMax, 'ONE KV write per POST — S319 took production down through write exhaustion');
  assert.ok(kv.puts.every((p) => p.key.startsWith('dc:g:')), 'guests are counted by salted ip hash');

  const limited = await throughWorker(postRequest(body, { csrf }), env, fakeUpstream());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), String(DESK_COMMENT_LIMITS.guest.windowSec));
  assert.equal(kv.puts.length, DESK_COMMENT_LIMITS.guest.windowMax, 'a refused submission writes nothing at all');

  // A rejected draft must not silently burn the reader's remaining quota.
  const fresh = fakeKv();
  const freshEnv = baseEnv(fresh);
  const freshCsrf = await issueCsrfToken(freshEnv);
  const tooShort = await throughWorker(postRequest({ ...body, body: 'a' }, { csrf: freshCsrf }), freshEnv, fakeUpstream());
  assert.equal(tooShort.status, 400);
  assert.equal(fresh.puts.length, 0, 'a draft refused on length costs no rate slot');
});

test('rateDecision is a pure window+day decision with a single combined counter', () => {
  const limits = { windowSec: 600, windowMax: 2, dayMax: 3 };
  const t0 = 1_760_000_000_000;
  const first = rateDecision(null, limits, t0);
  assert.equal(first.allowed, true);
  assert.deepEqual(Object.keys(first.next).sort(), ['d', 'dn', 'n', 'w'], 'one KV value holds both counters');

  const second = rateDecision(first.next, limits, t0);
  assert.equal(second.allowed, true);
  const third = rateDecision(second.next, limits, t0);
  assert.equal(third.allowed, false);
  assert.equal(third.scope, 'window');

  // A later window resets the short counter but keeps the daily one.
  const nextWindow = rateDecision(second.next, limits, t0 + 601_000);
  assert.equal(nextWindow.allowed, true);
  assert.equal(nextWindow.next.dn, 3);
  assert.equal(rateDecision(nextWindow.next, limits, t0 + 1_202_000).scope, 'day');
});

test('a signed-in member is badged from the leaderboard, skips Turnstile, and cannot name themselves', async () => {
  const upstream = fakeUpstream({ leaderboard: [{ username: 'vera' }] });
  const env = baseEnv();
  const csrf = await issueCsrfToken(env);
  const authenticate = async () => ({ record: { link: { userId: MEMBER_UUID }, obelisk: { name: 'Vera Holt' } } });

  const response = await handleDeskComments(
    postRequest({
      slug: SLUG,
      body: 'Member take on the chaperone model.',
      displayName: 'VaultSpark Admin',
      turnstileToken: '',
    }, { csrf, cookie: 'vs_portal_session=signed-value' }),
    env,
    { fetchImpl: upstream.impl, authenticate, now: () => Date.UTC(2026, 8, 14) },
  );

  assert.equal(response.status, 201);
  assert.equal(upstream.challenges().length, 0, 'a member holding a session cookie is not challenged again');
  const row = JSON.parse(upstream.inserts()[0].body)[0];
  assert.equal(row.author_kind, 'member');
  assert.equal(row.user_id, MEMBER_UUID);
  assert.equal(row.display_name, 'vera', 'the public handle comes from the opt-in projection');
  assert.notEqual(row.display_name, 'VaultSpark Admin', 'a member cannot badge themselves as staff');
});

test('a member with no public profile falls back to their Obelisk name, and a cookieless request stays a guest', async () => {
  const env = baseEnv();
  const csrf = await issueCsrfToken(env);
  const authenticate = async () => ({ record: { link: { userId: MEMBER_UUID }, obelisk: { name: 'Vera Holt' } } });

  const fallback = fakeUpstream({ leaderboard: [] });
  const named = await handleDeskComments(
    postRequest({ slug: SLUG, body: 'Member take with no public profile.', turnstileToken: '' },
      { csrf, cookie: 'vs_portal_session=signed-value' }),
    env,
    { fetchImpl: fallback.impl, authenticate, now: () => Date.UTC(2026, 8, 14) },
  );
  assert.equal(named.status, 201);
  assert.equal(JSON.parse(fallback.inserts()[0].body)[0].display_name, 'Vera Holt');

  // No session cookie: the identity plane is never consulted (it costs a KV
  // read and, on a live session, a refresh write).
  let consulted = false;
  const guestUpstream = fakeUpstream();
  const guest = await handleDeskComments(
    postRequest({ slug: SLUG, body: 'Guest take on the same story.', displayName: 'Jordan', turnstileToken: 'turnstile-token-value' },
      { csrf, cookie: 'vs_theme=dark' }),
    env,
    { fetchImpl: guestUpstream.impl, authenticate: async () => { consulted = true; return null; }, now: () => Date.UTC(2026, 8, 14) },
  );
  assert.equal(guest.status, 201);
  assert.equal(consulted, false, 'an unrelated cookie must not trigger a session lookup');
  assert.equal(JSON.parse(guestUpstream.inserts()[0].body)[0].author_kind, 'guest');
  assert.equal(guestUpstream.challenges().length, 1, 'a guest is always challenged');
});

test('replies go exactly one level deep, on the same story, under a published parent', async () => {
  // A fresh KV per case: these six submissions come from one IP and would
  // otherwise trip the guest window limit instead of the parent checks.
  const env = baseEnv();
  const csrf = await issueCsrfToken(env);
  const fresh = () => baseEnv();
  const draft = (parentId) => ({
    slug: SLUG, body: 'A reply to that point.', displayName: 'Jordan', turnstileToken: 'turnstile-token-value', parentId,
  });

  const malformed = await throughWorker(postRequest(draft('not-a-uuid'), { csrf }), env, fakeUpstream());
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, 'bad_parent');

  const missing = fakeUpstream({ parent: null });
  const orphan = await throughWorker(postRequest(draft(PARENT_UUID), { csrf }), fresh(), missing);
  assert.equal(orphan.status, 400);
  assert.equal((await orphan.json()).error, 'parent_not_found');
  assert.equal(missing.inserts().length, 0);

  const otherStory = fakeUpstream({ parent: { id: PARENT_UUID, story_slug: '2026-09-13/another-story', parent_id: null, status: 'published' } });
  const crossed = await throughWorker(postRequest(draft(PARENT_UUID), { csrf }), fresh(), otherStory);
  assert.equal((await crossed.json()).error, 'parent_not_available');

  const heldParent = fakeUpstream({ parent: { id: PARENT_UUID, story_slug: SLUG, parent_id: null, status: 'held' } });
  const underHeld = await throughWorker(postRequest(draft(PARENT_UUID), { csrf }), fresh(), heldParent);
  assert.equal((await underHeld.json()).error, 'parent_not_available', 'you cannot reply to something nobody can see');

  const nested = fakeUpstream({ parent: { id: PARENT_UUID, story_slug: SLUG, parent_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'published' } });
  const deep = await throughWorker(postRequest(draft(PARENT_UUID), { csrf }), fresh(), nested);
  assert.equal((await deep.json()).error, 'parent_not_top_level');
  assert.equal(nested.inserts().length, 0);

  const valid = fakeUpstream({ parent: { id: PARENT_UUID, story_slug: SLUG, parent_id: null, status: 'published' } });
  const reply = await throughWorker(postRequest(draft(PARENT_UUID), { csrf }), fresh(), valid);
  assert.equal(reply.status, 201);
  assert.equal(JSON.parse(valid.inserts()[0].body)[0].parent_id, PARENT_UUID);
});

test('a malformed or oversized body is refused without reaching Supabase', async () => {
  const env = baseEnv();
  const csrf = await issueCsrfToken(env);
  const upstream = fakeUpstream();

  const notJson = await throughWorker(new Request(`${APEX}${DESK_COMMENTS_PATH}`, {
    method: 'POST', headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }, body: 'not json',
  }), env, upstream);
  assert.equal(notJson.status, 400);

  const huge = await throughWorker(postRequest({
    slug: SLUG, body: 'x'.repeat(9000), displayName: 'Jordan', turnstileToken: 'turnstile-token-value',
  }, { csrf }), env, upstream);
  assert.equal(huge.status, 413);
  assert.equal(upstream.inserts().length, 0);

  const wrongMethod = await throughWorker(new Request(`${APEX}${DESK_COMMENTS_PATH}`, { method: 'DELETE' }), env, upstream);
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('Allow'), 'GET, POST, OPTIONS');
});

// --- reports ---------------------------------------------------------------

test('a report is CSRF- and Turnstile-gated and hands de-duplication to one atomic database call', async () => {
  const env = baseEnv();
  const csrf = await issueCsrfToken(env);
  const commentId = PARENT_UUID;

  const forged = fakeUpstream();
  const noCsrf = await throughWorker(postRequest({ commentId, reason: 'spam', turnstileToken: 'turnstile-token-value' },
    { pathname: DESK_COMMENTS_REPORT_PATH }), env, forged);
  assert.equal(noCsrf.status, 403);
  assert.equal(forged.calls.length, 0);

  const accepted = fakeUpstream();
  const ok = await throughWorker(postRequest({ commentId, reason: 'spam', turnstileToken: 'turnstile-token-value' },
    { csrf, pathname: DESK_COMMENTS_REPORT_PATH }), env, accepted);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).ok, true);
  const rpc = accepted.calls.find((c) => c.href.includes('/rpc/desk_comment_report'));
  assert.ok(rpc, 'the report goes through the atomic function, not a read-modify-write');
  const sent = JSON.parse(rpc.body);
  assert.equal(sent.p_comment_id, commentId);
  assert.equal(sent.p_reason, 'spam');
  assert.match(sent.p_ip_hash, /^[0-9a-f]{32}$/);

  // The same reader reporting twice is a no-op decided IN the database; the
  // edge reports success either way so a duplicate cannot be probed for.
  const duplicate = fakeUpstream({ rpc: { ok: true, counted: false, duplicate: true, status: 'published' } });
  const again = await throughWorker(postRequest({ commentId, reason: 'spam', turnstileToken: 'turnstile-token-value' },
    { csrf, pathname: DESK_COMMENTS_REPORT_PATH }), env, duplicate);
  assert.equal(again.status, 200);
  assert.equal((await again.json()).ok, true);

  const gone = fakeUpstream({ rpc: { ok: false, error: 'not_found' } });
  const missing = await throughWorker(postRequest({ commentId, reason: 'spam', turnstileToken: 'turnstile-token-value' },
    { csrf, pathname: DESK_COMMENTS_REPORT_PATH }), env, gone);
  assert.equal(missing.status, 404);

  const getReport = await throughWorker(new Request(`${APEX}${DESK_COMMENTS_REPORT_PATH}`), env, fakeUpstream());
  assert.equal(getReport.status, 405);
});

test('the migration carries the rules the edge relies on but cannot enforce itself', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260914_desk_comments.sql'), 'utf8');
  assert.match(sql, /report_count \+ 1 >= 3 then 'held'/, 'three distinct reports pull a comment back to held');
  assert.match(sql, /on conflict \(comment_id, ip_hash\) do nothing/, 'one report per reader per comment');
  assert.match(sql, /alter table public\.desk_comments\s+enable row level security/);
  assert.match(sql, /revoke all on table public\.desk_comments\s+from public, anon, authenticated/);
  assert.match(sql, /revoke all on table public\.desk_comment_reports from public, anon, authenticated/);
  assert.match(sql, /revoke all on function public\.desk_comment_report\(uuid, text, text\) from public, anon, authenticated/);
  assert.match(sql, /default 'held'/, 'a row is held unless the filter says otherwise');
  assert.match(sql, /create table if not exists/, 'the migration is re-runnable');
});

// --- newsletter unsubscribe proxy ------------------------------------------

function upstreamPage({ status = 200, csp = "default-src 'none'; style-src 'sha256-abc'", contentType = 'text/html; charset=utf-8', body = '<!doctype html><title>Unsubscribed</title>' } = {}) {
  const calls = [];
  const impl = async (url, init = {}) => {
    calls.push({ url: String(url), init, headers: new Headers(init.headers || {}), body: init.body ? new TextDecoder().decode(init.body) : null });
    return new Response(body, {
      status,
      headers: {
        'content-type': contentType,
        'content-security-policy': csp,
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow',
        'set-cookie': 'sb-session=leak; Path=/',
        'transfer-encoding': 'chunked',
      },
    });
  };
  return { impl, calls };
}

test('the unsubscribe proxy is wired at the Worker and keeps the function’s own CSP intact', async () => {
  const upstream = upstreamPage();
  const env = baseEnv();
  const response = await throughWorker(
    new Request(`${APEX}${NEWSLETTER_UNSUBSCRIBE_PATH}?token=abc123&list=members`, {
      headers: { cookie: 'vs_portal_session=should-not-travel', authorization: 'Bearer nope', accept: 'text/html' },
    }),
    env,
    upstream,
  );

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('content-security-policy'),
    "default-src 'none'; style-src 'sha256-abc'",
    'the global header layer must not overwrite the function’s strict per-page CSP',
  );
  assert.equal(response.headers.get('x-frame-options'), 'DENY', 'not downgraded to the site-wide SAMEORIGIN');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(response.headers.get('set-cookie'), null, 'upstream cookies are not relayed to the reader');
  assert.equal(response.headers.get('transfer-encoding'), null, 'hop-by-hop headers are dropped');
  assert.match(await response.text(), /Unsubscribed/);

  const sent = upstream.calls[0];
  assert.equal(sent.url, 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/newsletter-unsubscribe?token=abc123&list=members',
    'the full query string — which carries the capability token — is preserved');
  assert.equal(sent.headers.get('cookie'), null, 'no reader cookie crosses the boundary');
  assert.equal(sent.headers.get('authorization'), null, 'no Authorization header is forwarded');
  assert.equal(sent.headers.get('accept'), 'text/html');
});

test('the unsubscribe proxy forwards RFC 8058 one-click POSTs verbatim and bounds the method set', async () => {
  const upstream = upstreamPage({ contentType: 'application/json', body: '{"ok":true}' });
  const env = baseEnv();

  const response = await throughWorker(new Request(`${APEX}${NEWSLETTER_UNSUBSCRIBE_PATH}?token=abc123`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: 'vs_portal_session=should-not-travel' },
    body: 'List-Unsubscribe=One-Click',
  }), env, upstream);

  assert.equal(response.status, 200);
  const sent = upstream.calls[0];
  assert.equal(sent.init.method, 'POST');
  assert.equal(sent.body, 'List-Unsubscribe=One-Click', 'the one-click body reaches the function unchanged');
  assert.equal(sent.headers.get('content-type'), 'application/x-www-form-urlencoded');
  assert.equal(sent.headers.get('cookie'), null);

  const rejected = await throughWorker(new Request(`${APEX}${NEWSLETTER_UNSUBSCRIBE_PATH}`, { method: 'PUT' }), env, upstream);
  assert.equal(rejected.status, 405);
  assert.equal(rejected.headers.get('allow'), 'GET, HEAD, POST');
});

test('an unreachable unsubscribe function degrades to an honest 504, never a 500', async () => {
  const response = await handleNewsletterUnsubscribeProxy(
    new Request(`${APEX}${NEWSLETTER_UNSUBSCRIBE_PATH}?token=abc123`),
    {},
    { fetchImpl: async () => { throw new Error('upstream down'); } },
  );
  assert.equal(response.status, 504);
  assert.equal(response.headers.get('retry-after'), '300');
  assert.match(await response.text(), /temporarily unavailable/i);
});

// --- moderation CLI contract -----------------------------------------------

test('the moderation CLI queries the review queue and patches only known columns', () => {
  assert.match(listQuery(), /or=%28status\.eq\.held%2Creport_count\.gt\.0%29/);
  assert.match(listQuery({ status: 'reported' }), /report_count=gt\.0/);
  assert.match(listQuery({ limit: 99999 }), /limit=500/);
  assert.equal(patchQuery(['a', 'b']).startsWith('/desk_comments?id=in.(a,b)'), true);
  assert.equal(invalidIds(['nope', MEMBER_UUID]).length, 1);
  assert.deepEqual(ACTIONS.approve, { status: 'published', report_count: 0 }, 'approving clears the reports that held it');
  assert.equal(ACTIONS.remove.featured, false);
  for (const patch of Object.values(ACTIONS)) {
    for (const key of Object.keys(patch)) {
      assert.ok(['status', 'featured', 'report_count'].includes(key), `${key} is not a moderation column`);
    }
  }
});

test('hashReader is salted, daily-rotating, and never reversible to the input', async () => {
  const env = { DESK_COMMENT_SALT: 'unit-salt' };
  const day1 = await hashReader('203.0.113.7', env, Date.UTC(2026, 8, 14));
  const day2 = await hashReader('203.0.113.7', env, Date.UTC(2026, 8, 15));
  const other = await hashReader('203.0.113.8', env, Date.UTC(2026, 8, 14));
  assert.match(day1, /^[0-9a-f]{32}$/);
  assert.notEqual(day1, day2, 'the salt rotates daily so no durable reader identifier is stored');
  assert.notEqual(day1, other);
  assert.equal(day1, await hashReader('203.0.113.7', env, Date.UTC(2026, 8, 14, 23, 59)), 'stable within the day so rate limits work');
  const unsalted = await hashReader('203.0.113.7', { DESK_COMMENT_SALT: 'different-salt' }, Date.UTC(2026, 8, 14));
  assert.notEqual(day1, unsalted, 'the salt is a secret input, not decoration');
});

test('S357: a missing credential and a refused query are DIFFERENT 503 signals', async () => {
  const url = 'https://vaultsparkstudios.com/v/desk-comments?slug=2026-09-16/a-real-story';
  const req = () => new Request(url, { method: 'GET' });

  // No service-role credential reached the Worker at all.
  const unconfigured = await handleDeskComments(req(), {}, {
    fetchImpl: async () => { throw new Error('must not be called without a credential'); },
  });
  assert.equal(unconfigured.status, 503);
  assert.equal((await unconfigured.json()).error, 'comments_unconfigured');

  // Credential present; Supabase refuses it. This is the live production case:
  // the service-role key answers "Invalid API key" because of the
  // credential-project mismatch tracked since S344, and before this split both
  // causes reported the same opaque `comments_unavailable`, which cost six
  // probes to tell apart.
  const refused = await handleDeskComments(req(), { SUPABASE_SERVICE_ROLE_KEY: 'present-but-rejected' }, {
    fetchImpl: async () => new Response(JSON.stringify({ message: 'Invalid API key' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    }),
  });
  assert.equal(refused.status, 503);
  assert.equal((await refused.json()).error, 'comments_upstream_failed');

  // The reader-facing contract is unchanged: both are 503, so the client shows
  // the same honest unavailable state. Only the operator signal differs.
  assert.notEqual('comments_unconfigured', 'comments_upstream_failed');
});
