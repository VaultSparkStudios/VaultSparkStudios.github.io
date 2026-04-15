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
    "script-src 'self' 'sha256-/wHCWsu3/A7Rt8oL/T5Qg3eslm9p+kU2tEYgp4v/xIY=' 'sha256-+OaCNUpUU5GoCU4+oad9b9MacDUFH32YR3GImBA4UN4=' 'sha256-+RIrT64inX0ubBcjOoYWhy7Jb6SAZMUiKEk/eCZqtNg=' 'sha256-1f+iUGaS/tV/IT/SxHxFryi8N+j1nu0ax/cPjHvkExQ=' 'sha256-1UY3+YG3/aghZuROwdh01e6q3uBGn09YVftjxTlBqTE=' 'sha256-1ZsX1Q3JhID5b3Unk1zg9jtp8HuHxURfCnyFzo6uAeU=' 'sha256-2mXITJ1YD8lz4Tw3hXIAQ2hgaIcyBsso606s9iI5g2A=' 'sha256-2xXUg/196h/tX0WnVQlbChmt/j93eXuHaPJeAf1YhVQ=' 'sha256-3OXxYM9KCkAI2lTufdyuFj+VO9LWJnySU3fV5Rgp+Iw=' 'sha256-4y2yTgN07L7tuLdqd22tHqnjb1Yo5EQcJNPOH/fTj6k=' 'sha256-6LhxaKZePez9MP4tlBaCqBzlgynkabWjj7FWyMEaYng=' 'sha256-7BacaBw1R2dA5pWgHSvkrmJ4PsSbfZCGoEbQC+jzAMI=' 'sha256-7bRYfRNF3v0rtgRf+qfpnIxeQQIWRYrnclRLEPwxwhY=' 'sha256-7C2vUIVAJvKmknoPiB6IBynlB3mvTHXCIrMRUB/LZvY=' 'sha256-8T9MUAz019BccEVCJ6buo7p+JM+fJYzUcvnWnduGEog=' 'sha256-8U0RIjARy7qzYC5RwK9GeXc0WtOgOcNhxUTTsE1enp0=' 'sha256-9i2pD2QhYd3osboHWtoNhCnJdrGpc2iGaYBai+wuX90=' 'sha256-AaR3SCdKNH1u0oZvTcN5k27P2LYSqbxtvArx3Bs92YA=' 'sha256-aizFzz4bZutx7qgu7RXmRZGMRd5mYvlspNnLIvS4rkI=' 'sha256-B0Ih8HRLmhPzlG26g5c3tsl1F+qMGidoXr6Tw2pTFI0=' 'sha256-bL/8PICYU8gGT1wjuRN/P7+s+lryCt+83wHP4RfhYKg=' 'sha256-CdXn9YGiqMwd3FW7xyPE30YBeudv+VZ6kKHJ7Cdn5bU=' 'sha256-ciajO9x2ca79NU8K+BmjlysfzbF0ffjN/2i314BZNFc=' 'sha256-Cn8cgKQdmoC3d/Tv86QQd+nDdze0KUVRIfNKXGO52+A=' 'sha256-COUnE3ToJZYJKwuHSNCT8VrWs3abhnWVBQOTHgGTwCk=' 'sha256-cTWw+/37UKLZzzibF7Z4sFhqshwkFkfMvN5moVpGWVs=' 'sha256-DI8wO3BL8C0RW1hL/m3q5V89wajK3zC8Sb+e41ZK1iY=' 'sha256-dZNuqX91zJojUg7FRdKg5d3LknfbrNLsddyjo/JDQiQ=' 'sha256-eFO5NODxDfDVqyEPyqdG/Dz8Mtdjnvh9goAJJe+xoNo=' 'sha256-eRNx56eNVfqSfkdV0D89AOJYd32voJKxy+nRg2ECi4E=' 'sha256-eTF0uPI6DpYpKVmaJJeRRm5TSXzdtCyFkiuOgTRNN5E=' 'sha256-f+8wKcR7c1J4kLNcGbnkeOUhOQc0Ey4PFpiCyQ4EbtU=' 'sha256-GEw0AdBFktwtVecnKrmGqCnQhddgYdiccv8eggRcnA0=' 'sha256-gjrsK+3+1qjtugXehTH/NW0COoI/iuInT8VAUsoz7Xw=' 'sha256-h4sfDKt6K2tjjF3dmOKlVPaxGoKBPgazLnQjsxfHup4=' 'sha256-hMokIpxJV+xG8muehdpUbahVuudRpv7yJP+FKbCjRII=' 'sha256-JlgNW+c5oNngZ1rXtsZXGRsLLX0Yr0DkXQGCLvv1Hlk=' 'sha256-JtO+XML6gBWvTOulkLJgMR3keUN/GqVhk3HPRcztEow=' 'sha256-JujKqvQ+wLaBwZQ+rK0dDSeBX3rT7sN0wby2YNyIlDs=' 'sha256-kbZWY0z2jKEzGLEhfIYBmsc9SwjJa1BmsRwJx7IHfjM=' 'sha256-KecdaJxOiEnwU5qkfW1UHfDsvTfFNioRpAdMt2431PM=' 'sha256-ljgqE4jQKsGm9I/gZbnwtQjLit940k13FUOyoXw1vfg=' 'sha256-LwC/urUyBuOCbU/WBOtkkeiNYU5er25TOxMTF1nNaJE=' 'sha256-mcd67U10waTeaveNwnkY7gYqld6zyN/2PCZQAZF9XgA=' 'sha256-mj9nbBksLckGNaRqDEvnDqifesV34AUlZGqmGntABCQ=' 'sha256-MkWf/kTAOal6If76oa1+fA8xjWeUKKkt1BgpDj4D7LU=' 'sha256-MPCNW8EeYdQO2ENDhJ36wrnu8OnJ9mGgpWmIG21C3rg=' 'sha256-mTVeUmhtx5tdNVR3a747EpmWpUe6l35d9FVRZA+XL9Y=' 'sha256-N/OCmgWRMrDt1JSXitj/rQjPFxJqGhaXPgP7OMRyGB8=' 'sha256-N0fOl/CVxtz6VGyUDrx9bSrgpwyQqxRCoGuWCUBXjA8=' 'sha256-n7gCSh+hU/1xcTDzaobqnsaiWHAUFiqLnpUCOcQSh98=' 'sha256-NOZjWwcSx/j6+rpN4af2WO21BHp+jDrUk/cqQdz3+3c=' 'sha256-o2BXKuyloE3HMVrNhJie0MaDnpdDnG5Msdu62ocdKJI=' 'sha256-O8b0wiLMhUX3A8djPdIJh9k5o1aqly2z9vZZ5sYRZ1s=' 'sha256-OGjKTgfIj8EtC+b24/ADQRob4X3P68RTQi09Z4ssH5g=' 'sha256-oVeOPKPGaKBhpCTYRMKU5qxgqdBjeIb6+nFty1ZXD9A=' 'sha256-P6RV97xfCg4rXjSFg5I9z/dfimNO4ic3nGDhY266ZU8=' 'sha256-pc92owTgV6BIa8Xc5NXyUVrfAQZaJSy2Rp+VITHyeQ8=' 'sha256-q0ByLDZkrFNE5/fVAMa1R4yuB0HHf0j2b+PZwHk7BT8=' 'sha256-qxoC3mKtgmaAmqcL6kfLRd6m2Pmz+aI2b0K0gVjdil0=' 'sha256-rg03oIvrgJxvUNs0QaxQQhzO+NXBVDIiJGjE/nzHLzg=' 'sha256-RRh7pYvJv7ZfAIjulsFXRkeNgc2BM3YeFb46Ak7y3v8=' 'sha256-rv9m+Zwiq39ImAp3CNjC6iySpzCV+/saUqey0gFksjY=' 'sha256-SEG/Iqfp7Jz9ZaM9HXJBeOYplq3Ufv3Lm2TVMyNnqE0=' 'sha256-TBtL6/PNVhPQm61ugN8uNWsNQABMTd35wXKPsL7Fv8c=' 'sha256-TLVBJnWanYh2sw4nDSOC8TLLUfLwFbAG6cctPL95C74=' 'sha256-tzcyzRA1BVljjKPxQcsqyEn62T2GndOkIweuNdj2DbI=' 'sha256-uqyuMjRe3AHxCzBx0FvgB/xL8EKRN1D1jKbWtYfhaa4=' 'sha256-uYEDRGI6TjjpHLWrfzmxAaLptsIOhOI1g4taK18Oxc4=' 'sha256-v9v+Yk52U9LnkFCjckD+mkYvN+N/a1Jl0e5ypZ56JV8=' 'sha256-vmyfqyDZUXXqWf75d8otxKiGl/+tsLjksDDru9KO3M8=' 'sha256-vQEQ5JoaFVv7EkF7Lar4nFxADSCU/ambnhlH6nAntTY=' 'sha256-w2Fca9bqvC7M598cwJOt+MJuHa4b54qrjP1ocOg24p4=' 'sha256-wn0C6i6EwMM/GnXgjKUdPY1N4pC0jmszlxsRTTv/vyM=' 'sha256-XdHcZWQrqgwOuuIEs9J5a0nYI4/agz9wQE8ikMlG4Gs=' 'sha256-XMTWN+tTWBvU9w0HAaXxS6Bb29p1eYb6VNKiS5/vlH0=' 'sha256-YVLnuhVB/nuNGzEDOQgQEQRIufzMjqotqcvE58rdAOc=' 'sha256-z7Sl5Tg//aXuL4lvfOeTl+rbuzK91l/8vs8P6bsG108=' 'sha256-zmT6FzF6S2On2wGptP8icP1tOkFozNId+19sT3vReuU=' 'sha256-zUKHQIDMxojEgcPgYQ+IcB3n7qz/F4cg8BBwGiu4hMI=' 'sha256-zYL1PYLsJ2AVFrGRzf2g71M9If1UAmx1nHJSR0GfDx8=' https://fjnpzjjyhnpmunfoycrp.supabase.co https://cdn.jsdelivr.net https://www.googletagmanager.com https://browser.sentry-cdn.com https://challenges.cloudflare.com https://static.cloudflareinsights.com; " +
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
