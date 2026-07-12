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
      Location: `${origin}/vault-member/?gate=1&return=${back}`,
      'Cache-Control': 'no-store',
      Vary: 'Cookie',
    },
  });
}
