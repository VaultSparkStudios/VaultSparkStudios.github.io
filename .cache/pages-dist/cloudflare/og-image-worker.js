/**
 * Cloudflare Worker — Dynamic Open Graph Image Generator.
 *
 * Returns a 1200×630 SVG (Content-Type: image/svg+xml) suitable for og:image.
 * Optional query params:
 *   title    — main heading (max 80 chars). Default: "VaultSpark Studios".
 *   eyebrow  — small label above title. Default: "VAULT · SPARKED".
 *   status   — "sparked" | "forge" | "vaulted" | "sealed" → tints the chip.
 *   theme    — "dark" (default) | "light"
 *
 * Cached at the edge for 1 hour per unique query string. Safe to deploy on its own route
 * (e.g. og.vaultsparkstudios.com/* or vaultsparkstudios.com/_og/*).
 *
 * Why SVG over rasterized PNG: zero dependencies, instant cold-start, social platforms
 * (X/Twitter, LinkedIn, Discord, Slack, Facebook) all rasterize SVG og:image fine.
 */

const STATUS_COLORS = {
  sparked: { fg: '#7EC9FF', bg: 'rgba(126,201,255,0.18)', label: 'SPARKED' },
  forge:   { fg: '#FFC400', bg: 'rgba(255,196,0,0.18)',   label: 'FORGE' },
  vaulted: { fg: '#9aa4b8', bg: 'rgba(154,164,184,0.16)', label: 'VAULTED' },
  sealed:  { fg: '#7EC9FF', bg: 'rgba(126,201,255,0.18)', label: 'SEALED' },
};

const THEMES = {
  dark:  { bg: '#0c0d12', text: '#fafafa', muted: '#9aa4b8', glow: 'rgba(212,175,55,0.18)' },
  light: { bg: '#fdf8ec', text: '#1a1f2e', muted: '#5a6378', glow: 'rgba(212,175,55,0.22)' },
};

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[c]));
}

function clamp(s, max) {
  s = String(s || '').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function wrapTitle(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
    if (lines.length >= 3) break;
  }
  if (current && lines.length < 3) lines.push(current);
  return lines.length ? lines : [''];
}

function renderSvg({ title, eyebrow, status, theme }) {
  const t = THEMES[theme] || THEMES.dark;
  const s = STATUS_COLORS[status] || STATUS_COLORS.sparked;
  const lines = wrapTitle(title, 22);

  const titleLines = lines.map((line, i) => {
    const y = 320 + i * 80;
    return `<text x="80" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-size="68" font-weight="700" fill="${t.text}" letter-spacing="-1.5">${escapeXml(line)}</text>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="20%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${t.glow}" />
      <stop offset="100%" stop-color="${t.bg}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ember" cx="82%" cy="76%" r="40%">
      <stop offset="0%" stop-color="rgba(255,122,0,0.32)" />
      <stop offset="100%" stop-color="${t.bg}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="goldStripe" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#d4af37" stop-opacity="0" />
      <stop offset="50%" stop-color="#d4af37" stop-opacity="1" />
      <stop offset="100%" stop-color="#d4af37" stop-opacity="0" />
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="${t.bg}" />
  <rect width="1200" height="630" fill="url(#glow)" />
  <rect width="1200" height="630" fill="url(#ember)" />

  <!-- top hairline -->
  <rect x="0" y="0" width="1200" height="2" fill="url(#goldStripe)" />

  <!-- status chip -->
  <g transform="translate(80, 140)">
    <rect x="0" y="0" width="${20 + s.label.length * 14}" height="44" rx="22" fill="${s.bg}" stroke="${s.fg}" stroke-opacity="0.42" stroke-width="1.2" />
    <circle cx="22" cy="22" r="6" fill="${s.fg}" />
    <text x="40" y="29" font-family="Georgia, 'Times New Roman', serif" font-size="16" font-weight="600" fill="${s.fg}" letter-spacing="2.4">${escapeXml(s.label)}</text>
  </g>

  <!-- eyebrow -->
  <text x="80" y="240" font-family="Georgia, 'Times New Roman', serif" font-size="22" font-weight="500" fill="${t.muted}" letter-spacing="3.2">${escapeXml(eyebrow.toUpperCase())}</text>

  ${titleLines}

  <!-- footer wordmark -->
  <text x="80" y="565" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="700" fill="${t.text}" letter-spacing="1.8">VAULTSPARK</text>
  <text x="280" y="565" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="400" fill="${t.muted}" letter-spacing="1.8">STUDIOS</text>
  <text x="80" y="595" font-family="Georgia, 'Times New Roman', serif" font-size="14" fill="${t.muted}" letter-spacing="1.4">vaultsparkstudios.com</text>

  <!-- right-side sigil -->
  <g transform="translate(960, 230) scale(2.4)" fill="none" stroke="${s.fg}" stroke-opacity="0.55" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="40,4 76,24 76,64 40,84 4,64 4,24" />
    <polygon points="40,18 64,30 64,58 40,72 16,58 16,30" />
    <circle cx="40" cy="44" r="5" fill="${s.fg}" stroke="none" opacity="0.85" />
  </g>
</svg>`;
}

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
