/**
 * Cloudflare Worker — Security Headers + Cache + Bot Shield + Edge Gate + Nonce CSP + Rate Limit + CSRF
 * for vaultsparkstudios.com
 *
 * Layers:
 *   1. Scanner / probe blocking (returns 403 immediately, no origin hit)
 *   2. Edge gate for private portals (401/redirect on missing session cookie)
 *   3. Rate-limit + CSRF check on POST to public forms (KV-backed)
 *   4. Worker-level cache (serves warm requests without hitting GitHub Pages)
 *   5. CSP nonce injection on HTML responses (when env.NONCE_CSP_ENABLED = "1")
 *   6. Security headers on every response
 *   7. Cache-Control headers on cacheable content types
 *
 * Env (wrangler secret put / vars):
 *   NONCE_CSP_ENABLED       — "1" to enable nonce-based CSP injection (default: off, hashes still apply)
 *   PORTAL_GATE_ENABLED     — "1" to enable edge gate on private portals (default: off)
 *   PORTAL_GATE_COOKIE      — name of httpOnly auth cookie to require (default: "vs_portal_session")
 *   RATE_LIMIT_ENABLED      — "1" to enable POST rate limiting (default: off; needs RATE_LIMIT KV binding)
 *   CSRF_SIGNING_KEY        — HMAC key for signed CSRF nonces (required if rate-limit on)
 *   RATE_LIMIT (KV)         — KV namespace binding for IP buckets
 *
 * Deploy: `wrangler deploy --env production`
 */

import { WORKER_CSP } from '../config/csp-policy.mjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'X-Robots-Tag': 'noai, noimageai',
};

const REMOVE_HEADERS = ['x-powered-by', 'server'];

const CACHE_RULES = [
  { pattern: /\.(js|css)(\?.*)?$/i,                ttl: 604800   },
  { pattern: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i, ttl: 2592000 },
  { pattern: /\.(woff2?|ttf|eot)$/i,                ttl: 2592000 },
  { pattern: /robots\.txt$/i,                       ttl: 3600    },
  { pattern: /sitemap.*\.xml$/i,                    ttl: 3600    },
  { pattern: /feed\.xml$/i,                         ttl: 3600    },
  { pattern: /manifest\.json$/i,                    ttl: 86400   },
  { pattern: /\.html$|\/$|\/[^.]+$/i,               ttl: 7200    },
];

const BLOCKED_UA_PATTERNS = [
  /zgrab/i, /masscan/i, /nuclei/i, /sqlmap/i, /nmap/i, /nikto/i, /dirbuster/i,
  /gobuster/i, /wfuzz/i, /acunetix/i, /nessus/i, /openvas/i, /burpsuite/i,
  /python-requests\/[0-9]/i, /go-http-client\/[0-9]/i, /libwww-perl/i,
  /curl\/[0-9]/i, /wget\//i,
];

const BLOCKED_PATH_PATTERNS = [
  /\/wp-(?:admin|login|content|includes)/i, /\/\.env(\b|$)/,
  /\/config\.(php|yml|yaml|json)(\b|$)/i, /\/phpinfo/i, /\/administrator\//i,
  /\/xmlrpc\.php/i, /\/_profiler/i, /\/actuator\//i, /\/\.git\//, /\/\.ssh\//,
  /\/etc\/passwd/,
];

// Private surfaces. Edge gate redirects to public sign-in if no session cookie.
const GATED_PATH_PATTERNS = [
  /^\/investor-portal(\/|$)/i,
  /^\/studio-hub(\/|$)/i,
  /^\/vault-member\/admin(\/|$)/i,
];

// Public forms protected by rate-limit + CSRF (POST only).
const RATE_LIMITED_FORM_PATHS = [
  '/contact/submit',
  '/ask-founders/submit',
];

const RATE_LIMIT_WINDOW_SEC = 3600;
const RATE_LIMIT_MAX = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBlockedRequest(request) {
  const ua = request.headers.get('User-Agent') || '';
  const accept = request.headers.get('Accept') || '';
  const url = new URL(request.url);
  if (!ua && !accept) return true;
  for (const pat of BLOCKED_UA_PATTERNS) if (pat.test(ua)) return true;
  for (const pat of BLOCKED_PATH_PATTERNS) if (pat.test(url.pathname)) return true;
  return false;
}

function isGatedPath(pathname) {
  return GATED_PATH_PATTERNS.some((p) => p.test(pathname));
}

function getCacheTTL(url) {
  const path = new URL(url).pathname;
  for (const rule of CACHE_RULES) if (rule.pattern.test(path)) return rule.ttl;
  return 0;
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/, '');
}

async function hmacSign(key, data) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '');
}

async function hmacVerify(key, data, signature) {
  const expected = await hmacSign(key, data);
  // Constant-time-ish compare via length + char-by-char; sufficient for our threat model.
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// CSRF nonce — issue + verify (signed `${ts}.${rand}.${hmac}`)
// ---------------------------------------------------------------------------

const CSRF_TTL_MS = 60 * 60 * 1000; // 1 hour

async function issueCsrfToken(env) {
  if (!env.CSRF_SIGNING_KEY) return null;
  const ts = Date.now();
  const rand = generateNonce();
  const sig = await hmacSign(env.CSRF_SIGNING_KEY, `${ts}.${rand}`);
  return `${ts}.${rand}.${sig}`;
}

async function verifyCsrfToken(env, token) {
  if (!token || !env.CSRF_SIGNING_KEY) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [ts, rand, sig] = parts;
  if (!ts || !rand || !sig) return false;
  if (Date.now() - Number(ts) > CSRF_TTL_MS) return false;
  return hmacVerify(env.CSRF_SIGNING_KEY, `${ts}.${rand}`, sig);
}

// ---------------------------------------------------------------------------
// Rate limit (KV-backed sliding window via fixed bucket)
// ---------------------------------------------------------------------------

async function checkRateLimit(env, ip, path) {
  if (!env.RATE_LIMIT) return { allowed: true, remaining: RATE_LIMIT_MAX };
  const key = `rl:${path}:${ip}:${Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SEC * 1000))}`;
  const current = Number(await env.RATE_LIMIT.get(key)) || 0;
  if (current >= RATE_LIMIT_MAX) return { allowed: false, remaining: 0 };
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW_SEC + 60 });
  return { allowed: true, remaining: RATE_LIMIT_MAX - current - 1 };
}

// ---------------------------------------------------------------------------
// CSP — hash mode (default) vs nonce mode (env-flagged migration)
// ---------------------------------------------------------------------------

function buildCspWithNonce(nonce) {
  // Replace 'sha256-...' hashes with nonce. Other directives untouched.
  return WORKER_CSP.replace(/script-src ([^;]+);/, (_match, srcs) => {
    const filtered = srcs
      .split(/\s+/)
      .filter((s) => !s.startsWith("'sha256-"))
      .concat([`'nonce-${nonce}'`, "'strict-dynamic'"])
      .join(' ');
    return `script-src ${filtered};`;
  });
}

class NonceInjector {
  constructor(nonce) {
    this.nonce = nonce;
  }
  element(el) {
    if (el.tagName === 'script' || el.tagName === 'style') {
      if (!el.getAttribute('nonce')) el.setAttribute('nonce', this.nonce);
    }
    if (el.tagName === 'head') {
      el.append(`<meta name="csp-nonce" content="${this.nonce}">`, { html: true });
    }
  }
}

// ---------------------------------------------------------------------------
// Response builder
// ---------------------------------------------------------------------------

function withSecurityHeaders(response, { ttl = 0, csp, extra } = {}) {
  const newHeaders = new Headers(response.headers);
  for (const h of REMOVE_HEADERS) newHeaders.delete(h);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) newHeaders.set(key, value);
  if (csp) newHeaders.set('Content-Security-Policy', csp);
  if (ttl > 0) {
    newHeaders.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=60`);
    newHeaders.set('Vary', 'Accept-Encoding');
  } else {
    newHeaders.set('Cache-Control', 'no-store');
  }
  if (extra) for (const [k, v] of Object.entries(extra)) newHeaders.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // --- Layer 0: CSRF token endpoint (lightweight, public, no caching) ---
    if (method === 'GET' && url.pathname === '/_csrf') {
      const token = await issueCsrfToken(env);
      if (!token) return new Response('CSRF disabled', { status: 503 });
      return withSecurityHeaders(
        new Response(JSON.stringify({ token, ttlSec: Math.floor(CSRF_TTL_MS / 1000) }), {
          headers: { 'Content-Type': 'application/json' },
        }),
        { ttl: 0, csp: WORKER_CSP }
      );
    }

    // --- Layer 1: Scanner / probe blocking ---
    if (isBlockedRequest(request)) {
      return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } });
    }

    // --- Layer 2: Edge gate for private portals ---
    if (env.PORTAL_GATE_ENABLED === '1' && isGatedPath(url.pathname)) {
      const cookieName = env.PORTAL_GATE_COOKIE || 'vs_portal_session';
      const session = getCookie(request, cookieName);
      if (!session) {
        // Soft gate: redirect to /vault-member/?gate=1&return=... so JS can re-auth and set cookie.
        const back = encodeURIComponent(url.pathname + url.search);
        return Response.redirect(`${url.origin}/vault-member/?gate=1&return=${back}`, 302);
      }
    }

    // --- Layer 3: Rate-limit + CSRF on protected POST forms ---
    if (method === 'POST' && env.RATE_LIMIT_ENABLED === '1' && RATE_LIMITED_FORM_PATHS.includes(url.pathname)) {
      const ip = getClientIp(request);
      const csrf = request.headers.get('X-CSRF-Token') || '';
      if (!(await verifyCsrfToken(env, csrf))) {
        return new Response('Invalid or expired CSRF token', { status: 403 });
      }
      const { allowed, remaining } = await checkRateLimit(env, ip, url.pathname);
      if (!allowed) {
        return withSecurityHeaders(
          new Response('Too many requests. Try again in an hour.', { status: 429 }),
          { ttl: 0, csp: WORKER_CSP, extra: { 'Retry-After': String(RATE_LIMIT_WINDOW_SEC) } }
        );
      }
      // Attach remaining count for client visibility.
      const upstream = await fetch(request);
      return withSecurityHeaders(upstream, { ttl: 0, csp: WORKER_CSP, extra: { 'X-RateLimit-Remaining': String(remaining) } });
    }

    // Pass non-GET/HEAD through with security headers only.
    if (method !== 'GET' && method !== 'HEAD') {
      const passthrough = await fetch(request);
      return withSecurityHeaders(passthrough, { ttl: 0, csp: WORKER_CSP });
    }

    const ttl = getCacheTTL(request.url);
    const cache = caches.default;

    // --- Layer 4: Worker cache lookup ---
    if (ttl > 0) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }

    // --- Layer 5: Origin fetch + optional nonce injection on HTML ---
    const upstream = await fetch(request);
    const contentType = upstream.headers.get('Content-Type') || '';
    const isHtml = contentType.includes('text/html');

    let finalResponse;
    if (isHtml && env.NONCE_CSP_ENABLED === '1') {
      const nonce = generateNonce();
      const rewriter = new HTMLRewriter()
        .on('script,style', new NonceInjector(nonce))
        .on('head', new NonceInjector(nonce));
      const rewritten = rewriter.transform(upstream);
      finalResponse = withSecurityHeaders(rewritten, { ttl, csp: buildCspWithNonce(nonce) });
    } else {
      finalResponse = withSecurityHeaders(upstream, { ttl, csp: WORKER_CSP });
    }

    // --- Layer 6: Cache successful 200 responses (skip nonce'd HTML — nonce must be unique per request) ---
    if (ttl > 0 && upstream.status === 200 && !(isHtml && env.NONCE_CSP_ENABLED === '1')) {
      ctx.waitUntil(cache.put(request, finalResponse.clone()));
    }

    return finalResponse;
  },
};
