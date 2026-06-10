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
