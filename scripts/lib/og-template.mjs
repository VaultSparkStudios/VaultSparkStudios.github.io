/**
 * og-template.mjs — single source of truth for the VaultSpark Open Graph card SVG.
 *
 * Pure, dependency-free render functions shared by:
 *   • cloudflare/og-image-worker.js  (the legacy edge endpoint, now correctly retired
 *     for og:image use — SVG renders BLANK on FB/X/LinkedIn/Discord/Slack)
 *   • scripts/build-og-cards.mjs     (build-time rasterizer: this SVG → sharp → PNG)
 *
 * Why a shared module: S195 deferred per-title OG cards citing "needs native deps".
 * That premise was false — sharp@0.34.5 is already a trusted devDependency and
 * rasterizes this SVG straight to a 1200×630 PNG. The worker's SVG and the build-time
 * PNG now come from ONE renderer, so the card design can never drift between them.
 */

export const STATUS_COLORS = {
  sparked: { fg: '#7EC9FF', bg: 'rgba(126,201,255,0.18)', label: 'SPARKED' },
  forge:   { fg: '#FFC400', bg: 'rgba(255,196,0,0.18)',   label: 'FORGE' },
  vaulted: { fg: '#9aa4b8', bg: 'rgba(154,164,184,0.16)', label: 'VAULTED' },
  sealed:  { fg: '#7EC9FF', bg: 'rgba(126,201,255,0.18)', label: 'SEALED' },
};

export const THEMES = {
  dark:  { bg: '#0c0d12', text: '#fafafa', muted: '#9aa4b8', glow: 'rgba(212,175,55,0.18)' },
  light: { bg: '#fdf8ec', text: '#1a1f2e', muted: '#5a6378', glow: 'rgba(212,175,55,0.22)' },
};

export function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

export function clamp(s, max) {
  s = String(s || '').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function wrapTitle(text, maxChars) {
  const words = String(text).split(/\s+/);
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

export function renderSvg({ title, eyebrow, status, theme }) {
  const t = THEMES[theme] || THEMES.dark;
  const s = STATUS_COLORS[status] || STATUS_COLORS.sparked;
  const lines = wrapTitle(clamp(title || 'VaultSpark Studios', 80), 22);

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
  <text x="80" y="240" font-family="Georgia, 'Times New Roman', serif" font-size="22" font-weight="500" fill="${t.muted}" letter-spacing="3.2">${escapeXml(String(eyebrow || '').toUpperCase())}</text>

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
