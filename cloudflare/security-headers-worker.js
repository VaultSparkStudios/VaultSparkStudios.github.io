/**
 * Cloudflare Worker — Security Headers + Cache + Bot Shield
 * for vaultsparkstudios.com
 *
 * Layers:
 *   1. Scanner / probe blocking (returns 403 immediately, no origin hit)
 *   2. Worker-level cache (serves warm requests without hitting GitHub Pages)
 *   3. Security headers on every response
 *   4. Cache-Control headers on cacheable content types
 *
 * Deploy: Cloudflare Dashboard > Workers, or `wrangler deploy`
 * Route:  vaultsparkstudios.com/*
 */

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'sha256-pc92owTgV6BIa8Xc5NXyUVrfAQZaJSy2Rp+VITHyeQ8=' 'sha256-JujKqvQ+wLaBwZQ+rK0dDSeBX3rT7sN0wby2YNyIlDs=' 'sha256-aizFzz4bZutx7qgu7RXmRZGMRd5mYvlspNnLIvS4rkI=' https://fjnpzjjyhnpmunfoycrp.supabase.co https://cdn.jsdelivr.net https://www.googletagmanager.com https://browser.sentry-cdn.com https://challenges.cloudflare.com https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' https: data:; " +
    "connect-src 'self' https://fjnpzjjyhnpmunfoycrp.supabase.co https://api.github.com https://www.google-analytics.com https://o4511104924909568.ingest.us.sentry.io https://challenges.cloudflare.com https://api.convertkit.com https://api.web3forms.com https://browser.sentry-cdn.com; " +
    "frame-src 'self' https://challenges.cloudflare.com; " +
    "font-src 'self'; " +
    "frame-ancestors 'self'; " +
    "base-uri 'self'; " +
    "form-action 'self' https://api.web3forms.com; " +
    "object-src 'none'; " +
    "upgrade-insecure-requests",
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

// ---------------------------------------------------------------------------
// Cache TTL rules (seconds) — matched against the request pathname in order
// ---------------------------------------------------------------------------

const CACHE_RULES = [
  // Immutable static assets — long TTL
  { pattern: /\.(js|css)(\?.*)?$/i,               ttl: 604800   }, // 7 days
  { pattern: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i, ttl: 2592000 }, // 30 days
  { pattern: /\.(woff2?|ttf|eot)$/i,               ttl: 2592000 }, // 30 days

  // Crawlable metadata — short TTL (these are being hammered; cache cuts origin hits)
  { pattern: /robots\.txt$/i,                      ttl: 3600    }, // 1 hour
  { pattern: /sitemap.*\.xml$/i,                   ttl: 3600    }, // 1 hour
  { pattern: /feed\.xml$/i,                        ttl: 3600    }, // 1 hour
  { pattern: /manifest\.json$/i,                   ttl: 86400   }, // 24 hours

  // HTML pages — medium TTL
  { pattern: /\.html$|\/$|\/[^.]+$/i,              ttl: 7200    }, // 2 hours
];

// ---------------------------------------------------------------------------
// Bot / scanner blocking
// ---------------------------------------------------------------------------

// Known vulnerability scanners and scrapers — block before hitting origin
const BLOCKED_UA_PATTERNS = [
  /zgrab/i,
  /masscan/i,
  /nuclei/i,
  /sqlmap/i,
  /nmap/i,
  /nikto/i,
  /dirbuster/i,
  /gobuster/i,
  /wfuzz/i,
  /acunetix/i,
  /nessus/i,
  /openvas/i,
  /burpsuite/i,
  /python-requests\/[0-9]/i,  // raw requests lib with no custom UA
  /go-http-client\/[0-9]/i,   // raw Go http with no custom UA
  /libwww-perl/i,
  /curl\/[0-9]/i,             // raw curl (no real user sends raw curl UA)
  /wget\//i,
];

// Path patterns probed by scanners — paths that don't exist on this site
// Block before fetching to avoid 4xx load on GitHub Pages
const BLOCKED_PATH_PATTERNS = [
  /\/wp-(?:admin|login|content|includes)/i,
  /\/\.env(\b|$)/,
  /\/config\.(php|yml|yaml|json)(\b|$)/i,
  /\/phpinfo/i,
  /\/administrator\//i,
  /\/xmlrpc\.php/i,
  /\/_profiler/i,
  /\/actuator\//i,
  /\/\.git\//,
  /\/\.ssh\//,
  /\/etc\/passwd/,
];

/**
 * Returns true if the request looks like a scanner or automated probe
 * that should never reach the origin.
 */
function isBlockedRequest(request) {
  const ua = request.headers.get('User-Agent') || '';
  const accept = request.headers.get('Accept') || '';
  const url = new URL(request.url);

  // No UA + no Accept header = raw probe (not a browser, not a search engine)
  if (!ua && !accept) return true;

  // Known malicious/scanner UA strings
  for (const pat of BLOCKED_UA_PATTERNS) {
    if (pat.test(ua)) return true;
  }

  // Scanner-specific paths that will always 404 on this static site
  for (const pat of BLOCKED_PATH_PATTERNS) {
    if (pat.test(url.pathname)) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCacheTTL(url) {
  const path = new URL(url).pathname;
  for (const rule of CACHE_RULES) {
    if (rule.pattern.test(path)) return rule.ttl;
  }
  return 0;
}

function buildResponse(response, ttl) {
  const newHeaders = new Headers(response.headers);

  for (const h of REMOVE_HEADERS) {
    newHeaders.delete(h);
  }

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value);
  }

  if (ttl > 0) {
    // Tell Cloudflare's CDN and browsers how long to cache
    newHeaders.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=60`);
    newHeaders.set('Vary', 'Accept-Encoding');
  } else {
    // Authenticated / dynamic content — never cache
    newHeaders.set('Cache-Control', 'no-store');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    // Only process GET and HEAD; pass everything else through with headers only
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const response = await fetch(request);
      return buildResponse(response, 0);
    }

    // --- Layer 1: Scanner / probe blocking ---
    if (isBlockedRequest(request)) {
      return new Response('Forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const ttl = getCacheTTL(request.url);
    const cache = caches.default;

    // --- Layer 2: Worker cache lookup ---
    if (ttl > 0) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }

    // --- Layer 3: Fetch from origin (GitHub Pages) ---
    const response = await fetch(request);
    const built = buildResponse(response, ttl);

    // Store successful responses in Worker cache
    if (ttl > 0 && response.status === 200) {
      ctx.waitUntil(cache.put(request, built.clone()));
    }

    return built;
  },
};
