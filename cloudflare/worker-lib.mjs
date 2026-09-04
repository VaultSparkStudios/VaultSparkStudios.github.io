/**
 * worker-lib.mjs — pure, testable primitives extracted from
 * `security-headers-worker.js` so the outage-critical origin-failover path and
 * the CSRF nonce stack can be unit-tested in isolation (audit #14, S183).
 *
 * Nothing here touches Cloudflare-only globals at import time. The origin-fetch
 * factory takes `fetchImpl` + `cachesImpl` so tests can drive failover with a
 * fake-hanging primary instead of waiting on real wall-clock or network.
 *
 * This is the single source of truth — the Worker imports these; it does not
 * keep parallel copies (no drift).
 */

// --- Origin rewriting ------------------------------------------------------

// S179 self-loop fix: the Worker owns the apex route, so `fetch(request)`
// re-enters its own route. toOrigin rewrites the request to a *different*
// hostname (the Pages origin) by protocol/host/port so it can never loop.
export function toOrigin(req, base) {
  const u = new URL(req.url);
  const t = new URL(base);
  u.protocol = t.protocol;
  u.hostname = t.hostname;
  u.port = t.port;
  return new Request(u.toString(), req);
}

export function resolvePublicOrigin(requestUrl, configuredOrigin = '') {
  const fallback = new URL(String(requestUrl)).origin;
  if (typeof configuredOrigin !== 'string' || !configuredOrigin.trim()) return fallback;
  try {
    const candidate = new URL(configuredOrigin.trim());
    const isBareHttpsOrigin = candidate.protocol === 'https:'
      && !candidate.username
      && !candidate.password
      && candidate.pathname === '/'
      && !candidate.search
      && !candidate.hash;
    return isBareHttpsOrigin ? candidate.origin : fallback;
  } catch (_error) {
    return fallback;
  }
}

// --- Web Push enrollment --------------------------------------------------

// Browser vendors issue opaque subscription endpoints, but they are not
// arbitrary callback URLs. Keeping this allowlist narrow prevents the public
// enrollment endpoint from turning later notification dispatch into fan-out
// toward attacker-selected hosts.
const WEB_PUSH_HOSTS = Object.freeze([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
]);

export function isAllowedWebPushEndpoint(value) {
  if (typeof value !== 'string' || value.length < 16 || value.length > 512) return false;
  try {
    const endpoint = new URL(value);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port) return false;
    const host = endpoint.hostname.toLowerCase();
    return WEB_PUSH_HOSTS.includes(host) || host.endsWith('.notify.windows.com');
  } catch (_error) {
    return false;
  }
}

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    const decoded = atob(padded);
    return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  } catch (_error) {
    return null;
  }
}

export function validatePushSubscription(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, errors: ['subscription_object_required'] };
  if (!isAllowedWebPushEndpoint(value.endpoint)) errors.push('invalid_endpoint');
  const p256dh = decodeBase64Url(value.keys?.p256dh);
  const auth = decodeBase64Url(value.keys?.auth);
  if (!p256dh || p256dh.length !== 65 || p256dh[0] !== 4) errors.push('invalid_p256dh');
  if (!auth || auth.length !== 16) errors.push('invalid_auth');
  return { valid: errors.length === 0, errors };
}

// Build a response whose body is backed by its own byte buffer. Response.clone()
// tees a stream; cloning one HTML response into the client, nonce cache, and DR
// cache can deadlock under backpressure even when the source was buffered first.
export function independentBufferedResponse(source, body) {
  if (!(body instanceof ArrayBuffer)) throw new TypeError('buffered response body must be an ArrayBuffer');
  return new Response(body.slice(0), {
    status: source.status,
    statusText: source.statusText,
    headers: new Headers(source.headers),
  });
}

// S176 disaster-recovery cache key — independent of the rotating nonce-window
// key so it survives a nonce rotation.
export function drKeyFor(reqUrl) {
  const u = new URL(reqUrl);
  return new Request(`${u.origin}${u.pathname}?_vsdr=1`);
}

export function isHtmlNavRequest(req) {
  return (req.headers.get('accept') || '').includes('text/html');
}

// S177 origin-hang hardening: bound the idempotent primary + fallback fetches
// so a hanging origin fast-fails into failover instead of blocking the Worker
// until the edge wall-clock limit.
export const ORIGIN_FETCH_TIMEOUT_MS = 8000;

/**
 * Build the origin-fetch function. In the Worker it's called with the real
 * globals; in tests `fetchImpl`/`cachesImpl` are injected.
 *
 * Contract (preserved exactly from the inline S177 implementation):
 *  - GET/HEAD are idempotent and time-bounded; a hang/throw or 5xx on the
 *    primary fails over to FALLBACK_ORIGIN, then to the DR cache for HTML navs.
 *  - Non-idempotent methods (POST) keep their original behavior: no abort
 *    signal (no double-submit), no failover.
 */
export function createOriginFetch({
  PRIMARY_ORIGIN,
  FALLBACK_ORIGIN,
  timeoutMs = ORIGIN_FETCH_TIMEOUT_MS,
  fetchImpl = fetch,
  cachesImpl = (typeof caches !== 'undefined' ? caches : undefined),
}) {
  return async function originFetch(req) {
    const m = req.method || 'GET';
    const idempotent = m === 'GET' || m === 'HEAD';
    let primary = null;
    try {
      primary = await fetchImpl(
        toOrigin(req, PRIMARY_ORIGIN),
        idempotent ? { signal: AbortSignal.timeout(timeoutMs) } : {}
      );
    } catch (_e) { /* timeout or network error → fall through to failover */ }
    if (primary && (primary.status < 500 || !idempotent)) return primary;
    if (!idempotent) return primary || new Response('origin unavailable', { status: 502 });
    try {
      const u = new URL(req.url);
      const fb = await fetchImpl(`${FALLBACK_ORIGIN}${u.pathname}${u.search}`, {
        method: m,
        headers: { accept: req.headers.get('accept') || '*/*', 'accept-encoding': req.headers.get('accept-encoding') || '' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (fb.status < 500) return fb;
    } catch (_e) { /* keep primary */ }
    // Last resort: stale HTML from the disaster-recovery cache.
    if (isHtmlNavRequest(req) && cachesImpl) {
      try {
        const dr = await cachesImpl.default.match(drKeyFor(req.url));
        if (dr) {
          const stale = new Response(dr.body, dr);
          stale.headers.set('X-VS-Disaster-Recovery', 'stale');
          stale.headers.set('Cache-Control', 'no-store');
          return stale;
        }
      } catch (_e) { /* fall through to error */ }
    }
    return primary || new Response('origin unavailable', { status: 502 });
  };
}

// --- CSRF nonce stack ------------------------------------------------------

export async function hmacSign(key, data) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '');
}

export async function hmacVerify(key, data, signature) {
  const expected = await hmacSign(key, data);
  // Constant-time-ish compare via length + char-by-char; sufficient for our threat model.
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export const CSRF_TTL_MS = 60 * 60 * 1000; // 1 hour

// generateNonce mirrors the Worker's exactly (16 random bytes → base64, trailing
// `=` stripped). The base64 alphabet has no `.`, so the `${ts}.${rand}.${sig}`
// token always splits into 3 parts.
function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/, '');
}

export async function issueCsrfToken(env) {
  if (!env.CSRF_SIGNING_KEY) return null;
  const ts = Date.now();
  const rand = generateNonce();
  const sig = await hmacSign(env.CSRF_SIGNING_KEY, `${ts}.${rand}`);
  return `${ts}.${rand}.${sig}`;
}

export async function verifyCsrfToken(env, token) {
  if (!token || !env.CSRF_SIGNING_KEY) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [ts, rand, sig] = parts;
  if (!ts || !rand || !sig) return false;
  if (Date.now() - Number(ts) > CSRF_TTL_MS) return false;
  return hmacVerify(env.CSRF_SIGNING_KEY, `${ts}.${rand}`, sig);
}

export async function verifyTurnstileToken({ token, ip = '', secret, fetchImpl = fetch }) {
  if (!secret) return { ok: false, error: 'turnstile_not_configured' };
  if (typeof token !== 'string' || token.length < 8 || token.length > 4096) return { ok: false, error: 'turnstile_token_missing' };
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) return { ok: false, error: 'turnstile_unreachable' };
    const result = await response.json();
    return result?.success === true ? { ok: true, hostname: result.hostname || null } : { ok: false, error: 'turnstile_invalid' };
  } catch {
    return { ok: false, error: 'turnstile_unreachable' };
  }
}

// --- RUM ux-event allowlisting (S192) --------------------------------------

// The Worker stores an optional `ux` interaction name on each RUM beacon, gated
// by an EXACT-match Set (RUM_UX_EVENTS) so only known, names-only events are
// ever persisted — no free text. That Set cannot admit a *dynamic* name (e.g.
// per-cluster Oracle feedback `oracle-answer:helpful:<clusterId>`): such names
// silently drop at the edge (the S186 silent-drop class). prefixAllowlist gives
// a BOUNDED escape hatch — a family admits `${family}:${suffix}` only when the
// suffix passes a charset + length cap, so dynamic instrumentation ships without
// loosening the global Set. The suffix is a single bounded token (colon-free);
// structured names use a longer multi-segment family (e.g. 'oracle-answer:helpful').
// S343 — separate machines from people at the beacon.
//
// The funnel had no bot filter anywhere, so every conversion number on the site
// was undecidable. Measured live: `cta:hero-choice:shown` = 371 with zero clicks
// on any of the three hero CTAs, while `data/rum-summary.json` reported
// `totalSamples: 0` over a 7-day window. A rendering crawler trips an
// IntersectionObserver exactly like a person and then never clicks, which
// produces precisely that shape. Without this flag a 0% click rate is
// indistinguishable from an audience made entirely of robots.
//
// PRIVACY: this returns a BOOLEAN. The user-agent is read and discarded — it is
// never stored, because a stored UA string is a fingerprint and this repo's
// beacon contract is names-and-counts only. Conservative by design: anything not
// positively matched is treated as human, so the filter can under-count bots but
// never silently discards a real person's signal.
const BOT_UA = /(bot|crawl|spider|slurp|search|fetch|monitor|scan|check|preview|render|headless|phantom|puppeteer|playwright|selenium|lighthouse|curl|wget|python-requests|axios|okhttp|java\/|go-http|libwww|httpclient|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|slackbot|discordbot|twitterbot|linkedinbot|applebot|duckduck|yandex|baidu|sogou|exabot|ia_archiver|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|claudebot|perplexity|ccbot|anthropic|openai)/i;

export function looksLikeBot(userAgent) {
  if (typeof userAgent !== 'string' || !userAgent.trim()) return true; // no UA at all is not a browser
  return BOT_UA.test(userAgent);
}

export function prefixAllowlist(family, { charset = /^[a-z0-9-]+$/, maxLen = 32 } = {}) {
  const prefix = `${family}:`;
  return (value) => {
    if (typeof value !== 'string' || !value.startsWith(prefix)) return false;
    const suffix = value.slice(prefix.length);
    if (!suffix || suffix.length > maxLen) return false;
    return charset.test(suffix);
  };
}

// Build a RUM ux-event sanitizer: the exact-match Set wins first (authoritative
// for all static names), then each bounded dynamic family matcher. Returns the
// value when admitted, else null. Keeping the Set first means static behavior is
// byte-identical; dynamic families are purely additive.
export function makeRumUxCleaner(exactSet, dynamicMatchers = []) {
  return (value) => {
    if (typeof value !== 'string') return null;
    if (exactSet.has(value)) return value;
    for (const match of dynamicMatchers) { if (match(value)) return value; }
    return null;
  };
}

export const ATTENTION_SURFACES = new Set([
  'pwa-install',
  'exit-intent',
  'visit-depth',
  'journey-tour',
  'decision-feedback',
  'returning-digest',
  'onboarding',
  'portal-tour',
  'rank-ceremony',
  'anniversary',
  'weekly-recap',
  'whats-new',
]);

export const ATTENTION_DEPTHS = new Set(['first', 'returning', 'established', 'unknown']);

export function cleanAttentionLabel(value) {
  if (typeof value !== 'string' || value.length > 48) return null;
  const parts = value.split('|');
  if (parts.length !== 2) return null;
  const [surface, depth] = parts;
  if (!ATTENTION_SURFACES.has(surface) || !ATTENTION_DEPTHS.has(depth)) return null;
  return surface + '|' + depth;
}

// --- Obelisk session verification -----------------------------------------

export const OBELISK_VERIFY_DEFAULT_ENDPOINT = 'https://obeliskgate.com/auth/verify-session';

export async function verifyObeliskSession({ token, env = {}, fetchImpl = fetch }) {
  if (typeof token !== 'string' || token.length < 16 || token.length > 4096) {
    return { ok: false, status: 400, code: 'invalid_token', message: 'Obelisk session token is missing or malformed.' };
  }
  const secret = env.OBELISK_VERIFY_SECRET || env.OBELISK_IDP_SECRET || env.OBELISK_SESSION_VERIFY_SECRET;
  if (!secret) {
    return { ok: false, status: 503, code: 'missing_config', message: 'Obelisk verifier is not configured for this deployment.' };
  }
  const endpoint = env.OBELISK_VERIFY_ENDPOINT || OBELISK_VERIFY_DEFAULT_ENDPOINT;
  let upstream;
  try {
    upstream = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (_e) {
    return { ok: false, status: 502, code: 'upstream_unreachable', message: 'Obelisk verifier did not respond.' };
  }
  let data = null;
  try { data = await upstream.json(); } catch (_e) { /* handled below */ }
  if (!upstream.ok || !data || data.ok === false) {
    return {
      ok: false,
      status: upstream.status || 502,
      code: data?.code || 'verify_failed',
      message: data?.message || 'Obelisk session could not be verified.',
    };
  }
  const identityId = data.identityId || data.identity_id || data.sub || data.user?.id;
  if (!identityId) {
    return { ok: false, status: 502, code: 'identity_missing', message: 'Obelisk verifier returned no identity id.' };
  }
  return {
    ok: true,
    status: 200,
    identityId,
    expiresAt: data.expiresAt || data.expires_at || data.exp || null,
    capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
  };
}
// --- Portal gate redirect (S275) --------------------------------------------
// Auth-gate redirects must never be cacheable: a stored 302 replays the
// sign-in bounce after the member authenticates, and a shared cache could
// serve one visitor's gate response to another. Response.redirect() returns
// immutable headers, so the response is built manually with no-store.
export function portalGateRedirect(origin, pathname, search = '') {
  const back = encodeURIComponent(pathname + search);
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origin}/login?intent=signin&return=${back}`,
      'Cache-Control': 'no-store',
      Vary: 'Cookie',
    },
  });
}

// ---------------------------------------------------------------------------
// Reader reactions for THE DESK (/v/desk-reaction)
//
// Identity-free by construction, like the Dispatch: no account, no cookie, no
// stored identifier. Dedupe uses a SHA-256 of (ip + slug + day-bucket) that is
// never written anywhere in reversible form — enough to stop one browser
// clicking a hundred times, not enough to profile a reader.
//
// Counts must be REAL or absent. There is no seeding, no "starting at 3 to look
// alive": an unread story shows zero, because a fabricated engagement number on
// a desk whose product is verifiable claims would poison the one thing it sells.
// ---------------------------------------------------------------------------
function corsJsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Cache-Control', 'no-store');
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return new Response(body, { ...init, headers });
}

const REACTIONS = new Set([
  'changed-my-mind', 'knew-this', 'want-receipts', 'made-me-laugh',
  'panel-like', 'panel-fire', 'panel-laugh', 'panel-wow',
]);
const REACTION_VOICE_PREFIX = 'voice:';
const REACTION_MAX_PER_DAY = 12;
const REACTION_DAY_SEC = 86400;

export const cleanSlug = (s) => String(s || '').slice(0, 120).replace(/[^a-z0-9/-]/gi, '');

export function validReaction(value) {
  const v = String(value || '');
  if (REACTIONS.has(v)) return v;
  if (v.startsWith(REACTION_VOICE_PREFIX)) {
    const id = v.slice(REACTION_VOICE_PREFIX.length);
    if (/^[a-z]{2,12}$/.test(id)) return v;
  }
  return null;
}

async function reactionFingerprint(ip, slug) {
  const bucket = Math.floor(Date.now() / (REACTION_DAY_SEC * 1000));
  const data = new TextEncoder().encode(`${ip}|${slug}|${bucket}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function handleDeskReaction(request, env) {
  if (request.method === 'OPTIONS') return corsJsonResponse(null, { status: 204 });
  const url = new URL(request.url);
  const slug = cleanSlug(url.searchParams.get('slug'));

  if (request.method === 'GET') {
    if (!slug) return corsJsonResponse(JSON.stringify({ ok: false, error: 'slug_required' }), { status: 400 });
    if (!env.RATE_LIMIT) return corsJsonResponse(JSON.stringify({ ok: true, slug, counts: {}, storage: 'unavailable' }));
    const raw = await env.RATE_LIMIT.get(`dr:${slug}`);
    let counts = {};
    // One bad JSON value must not erase the whole tally — parse defensively and
    // report an empty object rather than throwing a 500 over a corrupt key.
    try { counts = raw ? JSON.parse(raw) : {}; } catch { counts = {}; }
    return corsJsonResponse(JSON.stringify({ ok: true, slug, counts }));
  }

  if (request.method !== 'POST') {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405 });
  }
  if (Number(request.headers.get('Content-Length') || 0) > 2048) {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'payload_too_large' }), { status: 413 });
  }

  let body;
  try { body = await request.json(); } catch { return corsJsonResponse(JSON.stringify({ ok: false, error: 'bad_json' }), { status: 400 }); }
  const postSlug = cleanSlug(body?.slug || slug);
  const reaction = validReaction(body?.reaction);
  if (!postSlug || !reaction) {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'bad_request' }), { status: 400 });
  }
  if (!env.RATE_LIMIT) {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'storage_unavailable' }), { status: 503 });
  }

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const fp = await reactionFingerprint(ip, postSlug);
  const dedupeKey = `drx:${fp}:${reaction}`;
  if (await env.RATE_LIMIT.get(dedupeKey)) {
    const raw = await env.RATE_LIMIT.get(`dr:${postSlug}`);
    let counts = {};
    try { counts = raw ? JSON.parse(raw) : {}; } catch { counts = {}; }
    return corsJsonResponse(JSON.stringify({ ok: true, slug: postSlug, counts, alreadyCounted: true }));
  }

  const budgetKey = `drb:${fp}`;
  const used = Number(await env.RATE_LIMIT.get(budgetKey)) || 0;
  if (used >= REACTION_MAX_PER_DAY) {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'rate_limited' }), { status: 429 });
  }

  const key = `dr:${postSlug}`;
  let counts = {};
  try {
    const raw = await env.RATE_LIMIT.get(key);
    counts = raw ? JSON.parse(raw) : {};
  } catch { counts = {}; }
  counts[reaction] = (Number(counts[reaction]) || 0) + 1;

  await env.RATE_LIMIT.put(key, JSON.stringify(counts));
  await env.RATE_LIMIT.put(dedupeKey, '1', { expirationTtl: REACTION_DAY_SEC });
  await env.RATE_LIMIT.put(budgetKey, String(used + 1), { expirationTtl: REACTION_DAY_SEC });

  return corsJsonResponse(JSON.stringify({ ok: true, slug: postSlug, counts }));
}

// Privacy-minimized live reader presence + engaged-time summaries for THE DESK.
// Presence keys contain only a truncated SHA-256 and expire after 90 seconds.
// Exact public counts are suppressed below three. Completed engagement rows
// contain no IP, cookie, account id, or session identifier.
export const DESK_PRESENCE_TTL_SEC = 90;
const DESK_PRESENCE_MAX_SECONDS = 30 * 60;
const DESK_PRESENCE_RL_MAX = 12;

export function deskPresenceBand(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n === 0) return { activeReaders: 0, activeBand: 'none' };
  if (n < 3) return { activeReaders: null, activeBand: 'one-or-two' };
  return { activeReaders: Math.min(n, 999), activeBand: n >= 10 ? 'ten-plus' : 'three-to-nine' };
}

async function deskPresenceFingerprint(ip, slug, session) {
  const bytes = new TextEncoder().encode(`${ip}|${slug}|${session}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function deskPresenceRateAllowed(env, ip) {
  if (!env.RATE_LIMIT || !ip) return true;
  const minute = Math.floor(Date.now() / 60000);
  const digest = await deskPresenceFingerprint(ip, 'rate', String(minute));
  const key = `dprl:${digest}`;
  const current = Number(await env.RATE_LIMIT.get(key)) || 0;
  if (current >= DESK_PRESENCE_RL_MAX) return false;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 120 });
  return true;
}

export async function handleDeskPresence(request, env, ctx = { waitUntil() {} }) {
  if (request.method === 'OPTIONS') return corsJsonResponse(null, { status: 204 });
  const url = new URL(request.url);
  const querySlug = cleanSlug(url.searchParams.get('slug'));

  if (request.method === 'GET') {
    if (!querySlug) return corsJsonResponse(JSON.stringify({ ok: false, error: 'slug_required' }), { status: 400 });
    if (!env.RATE_LIMIT?.list) {
      return corsJsonResponse(JSON.stringify({ ok: true, state: 'unavailable', activeReaders: null, activeBand: 'unavailable', windowSeconds: DESK_PRESENCE_TTL_SEC }));
    }
    const listed = await env.RATE_LIMIT.list({ prefix: `dp:${querySlug}:`, limit: 1000 });
    const count = Array.isArray(listed?.keys) ? listed.keys.length : 0;
    return corsJsonResponse(JSON.stringify({
      ok: true,
      state: 'observed',
      ...deskPresenceBand(count),
      windowSeconds: DESK_PRESENCE_TTL_SEC,
      observedAt: new Date().toISOString(),
    }));
  }

  if (request.method !== 'POST') {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405 });
  }
  if (Number(request.headers.get('Content-Length') || 0) > 1024) {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'payload_too_large' }), { status: 413 });
  }
  let body;
  try { body = await request.json(); } catch { return corsJsonResponse(JSON.stringify({ ok: false, error: 'bad_json' }), { status: 400 }); }
  const slug = cleanSlug(body?.slug || querySlug);
  const session = typeof body?.session === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(body.session) ? body.session : null;
  const kind = body?.kind === 'summary' ? 'summary' : body?.kind === 'presence' ? 'presence' : null;
  if (!slug || !session || !kind) {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'bad_request' }), { status: 400 });
  }
  if (!env.RATE_LIMIT) {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'storage_unavailable' }), { status: 503 });
  }
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await deskPresenceRateAllowed(env, ip))) {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'rate_limited' }), { status: 429 });
  }
  const fingerprint = await deskPresenceFingerprint(ip, slug, session);

  if (kind === 'presence') {
    await env.RATE_LIMIT.put(`dp:${slug}:${fingerprint}`, '1', { expirationTtl: DESK_PRESENCE_TTL_SEC });
    return corsJsonResponse(JSON.stringify({ ok: true, state: 'accepted', windowSeconds: DESK_PRESENCE_TTL_SEC }), { status: 202 });
  }

  const engagedSeconds = Math.min(Math.max(Math.round(Number(body?.engagedSeconds) || 0), 0), DESK_PRESENCE_MAX_SECONDS);
  if (engagedSeconds < 1) {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'empty_observation' }), { status: 400 });
  }
  const dedupeKey = `dps:${fingerprint}`;
  if (await env.RATE_LIMIT.get(dedupeKey)) {
    return corsJsonResponse(JSON.stringify({ ok: true, state: 'already-counted' }), { status: 200 });
  }
  if (!env.RUM_BUCKET?.put) {
    return corsJsonResponse(JSON.stringify({ ok: false, error: 'aggregate_storage_unavailable' }), { status: 503 });
  }
  const ts = new Date().toISOString();
  // S317 — idle arrives as one of four BANDS, never as a duration. Validate
  // against the allow-list rather than storing whatever the client sent: an
  // unvalidated free-text field on an identifier-free row is how a precise
  // timing value (and with it a behavioural fingerprint) sneaks back in.
  const IDLE_BANDS = ['under30', '30to119', '120to599', '600plus'];
  const idleBand = IDLE_BANDS.includes(body?.idleBand) ? body.idleBand : null;
  const row = {
    schemaVersion: '1.1',
    ts,
    route: `/news/${slug}/`,
    slug,
    engagedSeconds,
    ...(idleBand ? { idleBand } : {}),
    measurement: 'visible-and-focused-seconds',
  };
  // Reuse the existing pulled RUM prefix; the distinct measurement schema
  // keeps these rows out of Core Web Vitals rollups (which require vitals).
  const key = `rum/raw/dt=${ts.slice(0, 10)}/${crypto.randomUUID()}.json`;
  const writes = Promise.all([
    env.RUM_BUCKET.put(key, JSON.stringify(row), { httpMetadata: { contentType: 'application/json' } }),
    env.RATE_LIMIT.put(dedupeKey, '1', { expirationTtl: 7 * 86400 }),
  ]);
  ctx.waitUntil(writes);
  return corsJsonResponse(JSON.stringify({ ok: true, state: 'accepted' }), { status: 202 });
}
