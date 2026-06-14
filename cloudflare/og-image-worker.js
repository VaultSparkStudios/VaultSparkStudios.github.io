/**
 * Cloudflare Worker — Dynamic Open Graph card SVG endpoint (/_og/).
 *
 * Returns a 1200×630 SVG (Content-Type: image/svg+xml). Optional query params:
 *   title    — main heading (max 80 chars). Default: "VaultSpark Studios".
 *   eyebrow  — small label above title. Default: "VAULT · SPARKED".
 *   status   — "sparked" | "forge" | "vaulted" | "sealed" → tints the chip.
 *   theme    — "dark" (default) | "light"
 *
 * ⚠ DO NOT point page og:image / twitter:image at this endpoint. SVG renders BLANK
 * on Facebook, X/Twitter, LinkedIn, Discord, Slack and iMessage (they reject SVG —
 * it can carry script). An earlier version of this comment falsely claimed "social
 * platforms all rasterize SVG fine"; that bug shipped a blank card on 73 pages and
 * was fixed in S194. `check-og-images.mjs` now hard-fails any page whose share image
 * is an SVG or this /_og/ route. The card design lives in scripts/lib/og-template.mjs;
 * scripts/build-og-cards.mjs rasterizes it to real PNGs (via sharp) at build time —
 * that is the supported path for share cards. This endpoint is kept only as a live
 * preview / debugging surface for the card layout.
 */

import { renderSvg, clamp } from '../scripts/lib/og-template.mjs';

export default {
  async fetch(request, _env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }
    const url = new URL(request.url);
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;

    const params = url.searchParams;
    const title   = clamp(params.get('title') || 'VaultSpark Studios', 80);
    const eyebrow = clamp(params.get('eyebrow') || 'Vault · Sparked', 40);
    const status  = (params.get('status') || 'sparked').toLowerCase();
    const theme   = (params.get('theme') || 'dark').toLowerCase();

    const svg = renderSvg({ title, eyebrow, status, theme });
    const res = new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=600',
        'X-Robots-Tag': 'noai, noimageai',
      },
    });
    ctx.waitUntil(cache.put(request, res.clone()));
    return res;
  },
};
