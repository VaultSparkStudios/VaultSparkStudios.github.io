/**
 * newsletter-unsubscribe-proxy.mjs — same-origin proxy for the member
 * newsletter unsubscribe page / RFC 8058 one-click endpoint (S356).
 *
 * Why a proxy exists: the Supabase Edge Function gateway rewrites HTML
 * responses on *.supabase.co, so the confirmation page cannot be served from
 * the function's own hostname as HTML. Fronting it at
 * vaultsparkstudios.com/api/newsletter/unsubscribe keeps the link on our own
 * domain (which is also what mailbox providers show the reader) and lets the
 * page render as HTML.
 *
 * Deliberate properties:
 *   - The function OWNS its response headers. This handler passes them through
 *     unchanged — including its strict per-page CSP — and only fills in
 *     baseline headers the upstream did not set. It must therefore NOT be
 *     wrapped in the Worker's withSecurityHeaders(), which would overwrite
 *     X-Frame-Options: DENY and Referrer-Policy: no-referrer with the softer
 *     site-wide values. The route returns this response directly.
 *   - Cookies and Authorization are never forwarded: the capability is the
 *     128-bit token in the query string, and the function runs with
 *     verify_jwt = false (supabase/config.toml).
 *   - No CSRF token and no Turnstile: RFC 8058 one-click POSTs arrive from
 *     mailbox providers, which carry neither. The path is therefore absent
 *     from RATE_LIMITED_FORM_PATHS, and this handler returns before the
 *     Worker's form layer can see it. There is no KV rate limit either — a KV
 *     write per unsubscribe is exactly the quota pattern that took production
 *     down in S319, and an unguessable token plus the function's own
 *     validation is the real control.
 */

export const NEWSLETTER_UNSUBSCRIBE_PATH = '/api/newsletter/unsubscribe';
export const NEWSLETTER_UNSUBSCRIBE_UPSTREAM = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/newsletter-unsubscribe';
export const NEWSLETTER_UNSUBSCRIBE_TIMEOUT_MS = 10000;
const MAX_BODY_BYTES = 16384;

const ALLOWED_METHODS = ['GET', 'HEAD', 'POST'];

// Hop-by-hop plus headers that describe a body this handler re-materializes.
const DROP_RESPONSE_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer',
  'transfer-encoding', 'upgrade', 'content-length', 'content-encoding', 'set-cookie',
  'server', 'x-powered-by', 'alt-svc',
]);

// Only these request headers cross the boundary.
const FORWARD_REQUEST_HEADERS = ['accept', 'accept-language', 'content-type'];

const BASELINE_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
  'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow',
};

function baseline(extra = {}) {
  return new Headers({ ...BASELINE_HEADERS, 'content-type': 'text/plain; charset=utf-8', ...extra });
}

/**
 * @param {Request} request
 * @param {object} env optional NEWSLETTER_UNSUBSCRIBE_UPSTREAM override
 * @param {{fetchImpl?: typeof fetch}} deps
 */
export async function handleNewsletterUnsubscribeProxy(request, env = {}, { fetchImpl = fetch } = {}) {
  const method = request.method.toUpperCase();
  if (!ALLOWED_METHODS.includes(method)) {
    return new Response('Method Not Allowed', { status: 405, headers: baseline({ allow: 'GET, HEAD, POST' }) });
  }

  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(String(env.NEWSLETTER_UNSUBSCRIBE_UPSTREAM || NEWSLETTER_UNSUBSCRIBE_UPSTREAM));
  // Full query string passthrough — the unsubscribe token lives here.
  upstreamUrl.search = requestUrl.search;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let body = null;
  if (method === 'POST') {
    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > MAX_BODY_BYTES) {
      return new Response('Payload Too Large', { status: 413, headers: baseline() });
    }
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > MAX_BODY_BYTES) {
      return new Response('Payload Too Large', { status: 413, headers: baseline() });
    }
    body = buffer;
  }

  let upstream;
  try {
    upstream = await fetchImpl(upstreamUrl.toString(), {
      method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(NEWSLETTER_UNSUBSCRIBE_TIMEOUT_MS),
    });
  } catch (error) {
    // Honest degradation: say the upstream did not answer (CANON-031).
    console.error('newsletter-unsubscribe proxy failed', { code: error?.name || 'unknown' });
    return new Response('Unsubscribe is temporarily unavailable. Please try the link again shortly.', {
      status: 504,
      headers: baseline({ 'retry-after': '300' }),
    });
  }

  const out = new Headers();
  for (const [name, value] of upstream.headers) {
    const key = name.toLowerCase();
    if (DROP_RESPONSE_HEADERS.has(key) || key.startsWith('sb-')) continue;
    out.set(key, value);
  }

  const payload = method === 'HEAD' ? null : await upstream.arrayBuffer();

  // The Supabase gateway can downgrade the function's `text/html` to
  // `text/plain` on GET. Restore it only when the pinned upstream actually
  // returned its own HTML page: it carries the function's per-page CSP and the
  // body starts with a doctype. Nothing else is sniffed or rewritten.
  if (payload && out.has('content-security-policy') && /^text\/plain/i.test(out.get('content-type') || '')) {
    const head = new TextDecoder().decode(payload.slice(0, 64)).trimStart().toLowerCase();
    if (head.startsWith('<!doctype html')) out.set('content-type', 'text/html; charset=utf-8');
  }

  for (const [name, value] of Object.entries(BASELINE_HEADERS)) {
    if (name === 'strict-transport-security' || !out.has(name)) out.set(name, value);
  }

  return new Response(payload, { status: upstream.status, statusText: upstream.statusText, headers: out });
}
