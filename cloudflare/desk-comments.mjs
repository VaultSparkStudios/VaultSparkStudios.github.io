/**
 * desk-comments.mjs — community comments for The Desk (S356).
 *
 * Routes (wired in cloudflare/security-headers-worker.js, Layer 0):
 *   GET  /v/desk-comments?slug=<YYYY-MM-DD>/<slug>   published thread, public fields only
 *   POST /v/desk-comments                            submit (guest or Vault member)
 *   POST /v/desk-comments/report                     reader report
 *
 * Trust model
 *   - ANYONE may comment. Every submission runs through the automatic filter
 *     (./comment-filter.mjs) and is stored with status = the filter verdict, so
 *     a borderline comment is persisted as 'held' and never shown.
 *   - Signed-in Vault members are identified through the existing Obelisk
 *     session cookie (read-only use of authenticateObeliskRequest, injected by
 *     the caller). Member comments are badged and sort ahead of guests.
 *   - The browser never touches Supabase: this handler is the only reader and
 *     writer and projects a fixed public field list. ip_hash, user_id,
 *     filter_score, filter_reasons and report_count never leave the edge.
 *   - Every POST requires a signed CSRF token. Turnstile is additionally
 *     required from guests (and from every reporter); a signed-in member is
 *     already holding a server-issued session cookie, so asking them to prove
 *     humanity again buys nothing — their abuse ceiling is the member rate
 *     limit, not a challenge.
 *
 * KV budget (S319 took production down through KV write exhaustion): a POST
 * performs ONE KV read and at most ONE KV write — a single combined
 * window+day counter. GET touches KV not at all. A KV failure degrades to
 * "allowed" rather than throwing, because Turnstile and CSRF still gate the route.
 */

import { verifyCsrfToken, verifyTurnstileToken } from './worker-lib.mjs';
import { filterComment, filterDisplayName, publicCategory } from './comment-filter.mjs';

export const DESK_COMMENTS_PATH = '/v/desk-comments';
export const DESK_COMMENTS_REPORT_PATH = '/v/desk-comments/report';

/** Must match the story_slug CHECK in supabase/migrations/20260914_desk_comments.sql. */
export const DESK_COMMENT_SLUG_RE = /^\d{4}-\d{2}-\d{2}\/[a-z0-9-]{1,120}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_SUPABASE_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
const PUBLIC_FIELDS = 'id,parent_id,body,author_kind,display_name,featured,created_at';
const THREAD_LIMIT = 200;
const MAX_REQUEST_BYTES = 8192;
const SUPABASE_TIMEOUT_MS = 8000;
export const GET_CACHE_CONTROL = 'public, max-age=30';

export const DESK_COMMENT_LIMITS = Object.freeze({
  guest: { windowSec: 600, windowMax: 3, dayMax: 20 },
  member: { windowSec: 600, windowMax: 10, dayMax: 100 },
  report: { windowSec: 600, windowMax: 5, dayMax: 15 },
});

const MESSAGES = Object.freeze({
  published: 'Your comment is live.',
  held: 'Thanks — your comment is waiting for a quick review.',
  rejected: "This comment can't be posted.",
  reported: 'Thanks — a moderator will take a look.',
});

// --- small helpers ---------------------------------------------------------

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function validStorySlug(value) {
  return typeof value === 'string' && DESK_COMMENT_SLUG_RE.test(value) ? value : null;
}

export function validUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value) ? value : null;
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

/**
 * Daily-salted reader hash. The salt is a Worker secret, so the hash is not
 * reversible by enumerating the IPv4 space, and it rotates every day so no
 * durable per-reader identifier is ever stored.
 */
export async function hashReader(value, env = {}, nowMs = Date.now()) {
  const day = new Date(nowMs).toISOString().slice(0, 10);
  const salt = env.DESK_COMMENT_SALT || env.CSRF_SIGNING_KEY || 'vaultspark-desk-comments';
  const data = new TextEncoder().encode(`${salt}|${day}|${value}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// --- rate limiting (pure decision + one KV write) --------------------------

export function rateDecision(state, limits, nowMs) {
  const window = Math.floor(nowMs / (limits.windowSec * 1000));
  const day = Math.floor(nowMs / 86400000);
  const prev = state && typeof state === 'object' ? state : {};
  const windowCount = prev.w === window ? Number(prev.n) || 0 : 0;
  const dayCount = prev.d === day ? Number(prev.dn) || 0 : 0;
  if (windowCount >= limits.windowMax) {
    return { allowed: false, scope: 'window', retryAfter: limits.windowSec, next: null };
  }
  if (dayCount >= limits.dayMax) {
    return { allowed: false, scope: 'day', retryAfter: 3600, next: null };
  }
  return { allowed: true, next: { w: window, n: windowCount + 1, d: day, dn: dayCount + 1 } };
}

async function consumeRate(env, key, limits, nowMs) {
  if (!env.RATE_LIMIT) return { allowed: true, storage: 'unavailable' };
  let state = null;
  try {
    const raw = await env.RATE_LIMIT.get(key);
    state = raw ? JSON.parse(raw) : null;
  } catch (_e) {
    state = null;
  }
  const decision = rateDecision(state, limits, nowMs);
  if (!decision.allowed) return decision;
  try {
    await env.RATE_LIMIT.put(key, JSON.stringify(decision.next), { expirationTtl: 86400 + 600 });
  } catch (_e) {
    // Quota exhaustion must degrade, never 500 (S319).
  }
  return decision;
}

// --- Supabase (service role, edge-only) ------------------------------------

function supabaseClient(env, fetchImpl) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const base = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  return {
    async call(path, init = {}) {
      const headers = {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      };
      const response = await fetchImpl(`${base}${path}`, {
        ...init,
        headers,
        signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
      });
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (_e) { data = null; }
      return { ok: response.ok, status: response.status, data };
    },
  };
}

// --- threading -------------------------------------------------------------

function publicComment(row) {
  return {
    id: row.id,
    parent_id: row.parent_id || null,
    body: String(row.body || ''),
    author_kind: row.author_kind === 'member' ? 'member' : 'guest',
    display_name: String(row.display_name || ''),
    featured: row.featured === true,
    created_at: row.created_at,
  };
}

/**
 * Top level: featured first, then members, then newest. Replies ascend under
 * their parent so a conversation reads top to bottom. Replies whose parent is
 * not in the published set are dropped rather than floated to the top level.
 */
export function threadComments(rows) {
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r && r.id).map(publicComment);
  const time = (r) => Date.parse(r.created_at) || 0;
  const byParent = new Map();
  for (const row of list) {
    if (!row.parent_id) continue;
    if (!byParent.has(row.parent_id)) byParent.set(row.parent_id, []);
    byParent.get(row.parent_id).push(row);
  }
  return list
    .filter((r) => !r.parent_id)
    .sort((a, b) => (Number(b.featured) - Number(a.featured))
      || ((b.author_kind === 'member' ? 1 : 0) - (a.author_kind === 'member' ? 1 : 0))
      || (time(b) - time(a)))
    .map((top) => ({
      ...top,
      replies: (byParent.get(top.id) || []).sort((a, b) => time(a) - time(b)),
    }));
}

// --- GET -------------------------------------------------------------------

async function handleGet(request, env, { fetchImpl }) {
  const slug = validStorySlug(new URL(request.url).searchParams.get('slug'));
  if (!slug) return json({ ok: false, error: 'bad_slug' }, 400);

  const db = supabaseClient(env, fetchImpl);
  if (!db) return json({ ok: false, error: 'comments_unavailable' }, 503);

  const query = `/rest/v1/desk_comments?story_slug=eq.${encodeURIComponent(slug)}`
    + `&status=eq.published&select=${PUBLIC_FIELDS}&order=created_at.desc&limit=${THREAD_LIMIT}`;
  const result = await db.call(query);
  if (!result.ok || !Array.isArray(result.data)) {
    return json({ ok: false, error: 'comments_unavailable' }, 503);
  }
  const comments = threadComments(result.data);
  const count = comments.reduce((total, c) => total + 1 + c.replies.length, 0);
  return json({ ok: true, slug, count, comments }, 200, { 'Cache-Control': GET_CACHE_CONTROL });
}

// --- POST ------------------------------------------------------------------

async function readJsonBody(request) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_REQUEST_BYTES) return { error: 'payload_too_large' };
  let raw = '';
  try { raw = await request.text(); } catch (_e) { return { error: 'bad_json' }; }
  if (raw.length > MAX_REQUEST_BYTES) return { error: 'payload_too_large' };
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'bad_json' };
    return { value };
  } catch (_e) {
    return { error: 'bad_json' };
  }
}

/** Only consult the identity plane when the session cookie is actually present:
 *  a call with a live session refreshes it, which costs a KV write. Matching the
 *  specific cookie (not merely "any Cookie header") keeps a reader who only
 *  carries a theme or consent cookie off the identity path entirely. */
function hasSessionCookie(request, env) {
  const name = env.PORTAL_GATE_COOKIE || 'vs_portal_session';
  // Cookie names are a fixed token vocabulary; anything else is treated as
  // absent rather than being escaped into a regex.
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(name)) return false;
  const header = request.headers.get('Cookie') || '';
  return header.split(';').some((part) => part.trim().startsWith(`${name}=`));
}

async function resolveMember(request, env, authenticate) {
  if (typeof authenticate !== 'function') return null;
  if (!hasSessionCookie(request, env)) return null;
  let session = null;
  try { session = await authenticate(request, env); } catch (_e) { session = null; }
  const userId = validUuid(session?.record?.link?.userId);
  if (!userId) return null;
  return { userId, name: session?.record?.obelisk?.name || '' };
}

/**
 * Members' public handle comes from the opt-in projection, not the base table,
 * and NEVER from the request body: a member who could name themselves would be
 * a badged impersonation vector ("VaultSpark Staff") that the reserved-name
 * check deliberately does not apply to members.
 */
async function memberDisplayName(db, member) {
  let username = '';
  try {
    const result = await db.call(`/rest/v1/public_leaderboard?id=eq.${encodeURIComponent(member.userId)}&select=username&limit=1`);
    if (result.ok && Array.isArray(result.data) && result.data[0]?.username) username = String(result.data[0].username);
  } catch (_e) {
    username = '';
  }
  for (const candidate of [username, member.name, 'Vault member']) {
    if (!candidate) continue;
    const checked = filterDisplayName(candidate, { authorKind: 'member' });
    if (checked.ok) return checked.name;
  }
  return 'Vault member';
}

async function handlePost(request, env, { fetchImpl, authenticate, now }) {
  const body = await readJsonBody(request);
  if (body.error) {
    return json({ ok: false, error: body.error }, body.error === 'payload_too_large' ? 413 : 400);
  }
  const payload = body.value;
  const slug = validStorySlug(payload.slug);
  if (!slug) return json({ ok: false, error: 'bad_slug' }, 400);
  if (typeof payload.body !== 'string') return json({ ok: false, error: 'body_required' }, 400);
  const parentId = payload.parentId === undefined || payload.parentId === null || payload.parentId === ''
    ? null
    : validUuid(payload.parentId);
  if (payload.parentId && !parentId) return json({ ok: false, error: 'bad_parent' }, 400);

  const db = supabaseClient(env, fetchImpl);
  if (!db) return json({ ok: false, error: 'comments_unavailable' }, 503);

  if (!(await verifyCsrfToken(env, request.headers.get('X-CSRF-Token') || ''))) {
    return json({ ok: false, error: 'csrf_invalid', message: 'Your session timed out. Please try again.' }, 403);
  }

  const ip = clientIp(request);
  // Identity is resolved BEFORE Turnstile so a signed-in member is not asked to
  // prove humanity twice: the session cookie is the stronger signal, and the
  // member rate limit is what bounds an abused session.
  const member = await resolveMember(request, env, authenticate);
  const authorKind = member ? 'member' : 'guest';

  if (!member) {
    const turnstile = await verifyTurnstileToken({
      token: payload.turnstileToken,
      ip,
      secret: env.TURNSTILE_SECRET_KEY,
      fetchImpl,
    });
    if (!turnstile.ok) {
      return json({ ok: false, error: turnstile.error, message: 'We could not verify you are human. Please try again.' }, 403);
    }
  }

  // Everything cheap and local is decided before a rate slot is spent, so a
  // mistyped draft never costs the reader one of their few submissions.
  const verdict = filterComment(payload.body, { authorKind });
  if (verdict.reasons.includes('length')) {
    return json({ ok: false, error: 'bad_length', message: 'Comments run from 2 to 1500 characters.' }, 400);
  }

  let guestName = '';
  if (!member) {
    if (typeof payload.displayName !== 'string' || !payload.displayName.trim()) {
      return json({ ok: false, error: 'display_name_required', message: 'Add a display name so people know who is talking.' }, 400);
    }
    const checked = filterDisplayName(payload.displayName, { authorKind: 'guest' });
    if (!checked.ok) {
      return json({ ok: false, error: 'display_name_rejected', message: 'Please choose a different display name.' }, 400);
    }
    guestName = checked.name;
  }

  const nowMs = now();
  const ipHash = await hashReader(ip, env, nowMs);
  const limits = member ? DESK_COMMENT_LIMITS.member : DESK_COMMENT_LIMITS.guest;
  const rateKey = member ? `dc:m:${await hashReader(member.userId, env, nowMs)}` : `dc:g:${ipHash}`;
  const rate = await consumeRate(env, rateKey, limits, nowMs);
  if (!rate.allowed) {
    return json(
      { ok: false, error: 'rate_limited', message: 'You are commenting quickly — take a short breather and try again in a few minutes.' },
      429,
      { 'Retry-After': String(rate.retryAfter || 600) },
    );
  }

  const displayName = member ? await memberDisplayName(db, member) : guestName;

  if (parentId) {
    const parent = await db.call(`/rest/v1/desk_comments?id=eq.${encodeURIComponent(parentId)}&select=id,story_slug,parent_id,status&limit=1`);
    const row = Array.isArray(parent.data) ? parent.data[0] : null;
    if (!parent.ok || !row) return json({ ok: false, error: 'parent_not_found' }, 400);
    if (row.status !== 'published' || row.story_slug !== slug) return json({ ok: false, error: 'parent_not_available' }, 400);
    if (row.parent_id) return json({ ok: false, error: 'parent_not_top_level', message: 'Replies only go one level deep.' }, 400);
  }

  const insert = await db.call(`/rest/v1/desk_comments?select=${PUBLIC_FIELDS}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([{
      story_slug: slug,
      parent_id: parentId,
      body: verdict.text,
      author_kind: authorKind,
      user_id: member ? member.userId : null,
      display_name: displayName,
      status: verdict.verdict,
      filter_score: verdict.score,
      filter_reasons: verdict.reasons,
      ip_hash: ipHash,
    }]),
  });
  if (!insert.ok) return json({ ok: false, error: 'comments_unavailable' }, 503);

  if (verdict.verdict === 'rejected') {
    return json({
      ok: false,
      status: 'rejected',
      category: publicCategory(verdict.reasons),
      message: MESSAGES.rejected,
    }, 422);
  }
  if (verdict.verdict === 'held') {
    return json({ ok: true, status: 'held', message: MESSAGES.held }, 202);
  }
  const row = Array.isArray(insert.data) ? insert.data[0] : null;
  return json({
    ok: true,
    status: 'published',
    message: MESSAGES.published,
    comment: row ? { ...publicComment(row), replies: [] } : null,
  }, 201);
}

// --- POST /report ----------------------------------------------------------

async function handleReport(request, env, { fetchImpl, now }) {
  const body = await readJsonBody(request);
  if (body.error) {
    return json({ ok: false, error: body.error }, body.error === 'payload_too_large' ? 413 : 400);
  }
  const commentId = validUuid(body.value.commentId);
  if (!commentId) return json({ ok: false, error: 'bad_comment_id' }, 400);

  const db = supabaseClient(env, fetchImpl);
  if (!db) return json({ ok: false, error: 'comments_unavailable' }, 503);

  if (!(await verifyCsrfToken(env, request.headers.get('X-CSRF-Token') || ''))) {
    return json({ ok: false, error: 'csrf_invalid', message: 'Your session timed out. Please try again.' }, 403);
  }
  const ip = clientIp(request);
  const turnstile = await verifyTurnstileToken({ token: body.value.turnstileToken, ip, secret: env.TURNSTILE_SECRET_KEY, fetchImpl });
  if (!turnstile.ok) {
    return json({ ok: false, error: turnstile.error, message: 'We could not verify you are human. Please try again.' }, 403);
  }

  const nowMs = now();
  const ipHash = await hashReader(ip, env, nowMs);
  const rate = await consumeRate(env, `dc:r:${ipHash}`, DESK_COMMENT_LIMITS.report, nowMs);
  if (!rate.allowed) {
    return json({ ok: false, error: 'rate_limited', message: 'Too many reports for now. Please try again later.' }, 429,
      { 'Retry-After': String(rate.retryAfter || 600) });
  }

  const reason = typeof body.value.reason === 'string' ? body.value.reason.slice(0, 200) : null;
  // One atomic round trip: dedupe, bump the counter, hold at three reports.
  const result = await db.call('/rest/v1/rpc/desk_comment_report', {
    method: 'POST',
    body: JSON.stringify({ p_comment_id: commentId, p_ip_hash: ipHash, p_reason: reason }),
  });
  if (!result.ok || !result.data || result.data.ok === false) {
    const missing = result.data && result.data.error === 'not_found';
    return json({ ok: false, error: missing ? 'not_found' : 'report_failed' }, missing ? 404 : 503);
  }
  return json({ ok: true, message: MESSAGES.reported });
}

// --- entry point -----------------------------------------------------------

/**
 * @param {Request} request
 * @param {object} env Worker env (SUPABASE_SERVICE_ROLE_KEY, TURNSTILE_SECRET_KEY, CSRF_SIGNING_KEY, RATE_LIMIT)
 * @param {object} deps `authenticate` is authenticateObeliskRequest, injected so
 *                      this module stays unit-testable without an Obelisk session.
 */
export async function handleDeskComments(request, env, deps = {}) {
  const { fetchImpl = fetch, authenticate = null, now = () => Date.now() } = deps;
  const url = new URL(request.url);
  const isReport = url.pathname === DESK_COMMENTS_REPORT_PATH;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: isReport ? 'POST, OPTIONS' : 'GET, POST, OPTIONS', 'Cache-Control': 'no-store' } });
  }
  try {
    if (isReport) {
      if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'POST, OPTIONS' });
      return await handleReport(request, env, { fetchImpl, now });
    }
    if (request.method === 'GET') return await handleGet(request, env, { fetchImpl });
    if (request.method === 'POST') return await handlePost(request, env, { fetchImpl, authenticate, now });
    return json({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'GET, POST, OPTIONS' });
  } catch (error) {
    // Comments must never be able to take the edge down (S321).
    console.error('desk-comments failed', { code: error?.message || 'unknown', path: url.pathname });
    return json({ ok: false, error: 'comments_unavailable' }, 503);
  }
}
