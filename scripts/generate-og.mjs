/**
 * VaultSpark Studios — OG Image Generator
 * Generates 1200×630 Open Graph images for each major page.
 * Uses sharp to rasterize SVG → PNG.
 *
 * Run: cd scripts && npm install && node generate-og.mjs
 * Output: ../assets/og-{slug}.png
 */

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = join(__dir, '..', 'assets');

// ── Page definitions ──────────────────────────────────────────────────────
const PAGES = [
  {
    slug:     'og-image',
    title:    'VaultSpark Studios',
    sub:      'Independent game studio forging cinematic worlds',
    accent:   '#FFC400',
    glow:     'rgba(255,196,0,0.18)',
    badge:    '⚡ THE VAULT IS SPARKED',
  },
  {
    slug:     'og-studio',
    title:    'The Studio',
    sub:      'Who we are · What we build · Why it matters',
    accent:   '#FFC400',
    glow:     'rgba(255,196,0,0.15)',
    badge:    '⚡ VAULTSPARK STUDIOS',
  },
  {
    slug:     'og-vault-member',
    title:    'The Vault',
    sub:      'Join the community · Earn points · Unlock rewards',
    accent:   '#FFC400',
    glow:     'rgba(255,196,0,0.18)',
    badge:    '⚡ VAULT MEMBERSHIP',
  },
  {
    slug:     'og-roadmap',
    title:    'Vault Pipeline',
    sub:      'What\'s shipping · What\'s coming · What\'s in the forge',
    accent:   '#3B82F6',
    glow:     'rgba(59,130,246,0.15)',
    badge:    '⚡ VAULT PIPELINE',
  },
  {
    slug:     'og-games',
    title:    'Games',
    sub:      'Free-to-play browser games from VaultSpark Studios',
    accent:   '#FF7A00',
    glow:     'rgba(255,122,0,0.18)',
    badge:    '⚡ VAULTSPARK GAMES',
  },
  {
    slug:     'og-cod',
    title:    'Call of Doodie',
    sub:      'A satirical browser shooter · Free · No download required',
    accent:   '#22C55E',
    glow:     'rgba(34,197,94,0.15)',
    badge:    '⚡ VAULTSPARK GAMES',
  },
  {
    slug:     'og-gridiron-gm',
    title:    'Gridiron GM',
    sub:      'Franchise simulator · Draft · Trade · Dominate',
    accent:   '#3B82F6',
    glow:     'rgba(59,130,246,0.18)',
    badge:    '⚡ VAULTSPARK GAMES',
  },
  {
    slug:     'og-vsfgm',
    title:    'VaultSpark Football GM',
    sub:      'Persistent NFL-style franchise sim · Free in your browser',
    accent:   '#FF7A00',
    glow:     'rgba(255,122,0,0.18)',
    badge:    '⚡ VAULTSPARK GAMES',
  },
  {
    slug:     'og-leaderboards',
    title:    'Leaderboards',
    sub:      'Top Vault Members ranked by points and achievements',
    accent:   '#FFC400',
    glow:     'rgba(255,196,0,0.15)',
    badge:    '⚡ VAULT LEADERBOARDS',
  },
  {
    slug:     'og-community',
    title:    'Community',
    sub:      'Events · Challenges · Vault Member hub',
    accent:   '#8B5CF6',
    glow:     'rgba(139,92,246,0.15)',
    badge:    '⚡ VAULTSPARK COMMUNITY',
  },
  {
    slug:     'og-universe',
    title:    'The Universe',
    sub:      'Lore · Characters · The world of VaultSpark',
    accent:   '#EC4899',
    glow:     'rgba(236,72,153,0.15)',
    badge:    '⚡ VAULTSPARK UNIVERSE',
  },
  {
    slug:     'og-press',
    title:    'Press Kit',
    sub:      'Logos · Screenshots · Studio facts for media',
    accent:   '#64748B',
    glow:     'rgba(100,116,139,0.12)',
    badge:    '⚡ VAULTSPARK PRESS',
  },
  {
    slug:     'og-journal',
    title:    'Signal Log',
    sub:      'Dispatches from the forge · Studio journal',
    accent:   '#14B8A6',
    glow:     'rgba(20,184,166,0.15)',
    badge:    '⚡ SIGNAL LOG',
  },
  {
    slug:     'og-ranks',
    title:    'Vault Ranks',
    sub:      'From Spark to VaultSparked · Earn your place',
    accent:   '#FFC400',
    glow:     'rgba(255,196,0,0.18)',
    badge:    '⚡ VAULT RANKS',
  },
  {
    slug:     'og-dreadspike',
    title:    'DreadSpike',
    sub:      'The Vault\'s most feared champion · Universe lore',
    accent:   '#A855F7',
    glow:     'rgba(168,85,247,0.18)',
    badge:    '⚡ VAULTSPARK UNIVERSE',
  },
  {
    slug:     'og-vaultsparked',
    title:    'VaultSparked',
    sub:      'Premium membership · Exclusive perks · Support the forge',
    accent:   '#FFC400',
    glow:     'rgba(255,196,0,0.22)',
    badge:    '⚡ VAULT PREMIUM',
  },
  {
    slug:     'og-changelog',
    title:    'Changelog',
    sub:      'Every update · Every fix · Every milestone',
    accent:   '#14B8A6',
    glow:     'rgba(20,184,166,0.15)',
    badge:    '⚡ VAULTSPARK CHANGELOG',
  },
  {
    slug:     'og-members',
    title:    'Member Directory',
    sub:      'Vault Members · Rankings · Community profiles',
    accent:   '#8B5CF6',
    glow:     'rgba(139,92,246,0.15)',
    badge:    '⚡ VAULT COMMUNITY',
  },
  {
    slug:     'og-join',
    title:    'Join the Vault',
    sub:      'Create your account · Earn points · Unlock the forge',
    accent:   '#22C55E',
    glow:     'rgba(34,197,94,0.15)',
    badge:    '⚡ JOIN VAULTSPARK',
  },
  {
    slug:     'og-contact',
    title:    'Contact',
    sub:      'Reach the studio · Partnerships · Press enquiries',
    accent:   '#64748B',
    glow:     'rgba(100,116,139,0.12)',
    badge:    '⚡ VAULTSPARK STUDIOS',
  },
];

// ── SVG template ──────────────────────────────────────────────────────────
function buildSVG(page) {
  // Truncate long titles/subs to avoid overflow
  const title = page.title.length > 28 ? page.title.slice(0, 26) + '…' : page.title;
  const sub   = page.sub.length   > 58 ? page.sub.slice(0, 56)   + '…' : page.sub;

  // Compute font size based on title length
  const titleSize = title.length > 20 ? 64 : title.length > 14 ? 76 : 88;

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#0e101e"/>
      <stop offset="100%" stop-color="#060810"/>
    </linearGradient>
    <radialGradient id="glow1" cx="120" cy="315" r="380" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${page.accent}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${page.accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="1080" cy="315" r="300" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${page.accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${page.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow1)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>

  <!-- Grid lines (subtle) -->
  <line x1="0" y1="1" x2="1200" y2="1" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
  <line x1="0" y1="629" x2="1200" y2="629" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
  <line x1="1" y1="0" x2="1" y2="630" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
  <line x1="1199" y1="0" x2="1199" y2="630" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>

  <!-- Left accent bar -->
  <rect x="80" y="100" width="4" height="430" rx="2" fill="${page.accent}" opacity="0.6"/>

  <!-- Badge / eyebrow -->
  <text
    x="104" y="140"
    font-family="'Segoe UI', system-ui, -apple-system, sans-serif"
    font-size="15" font-weight="700" letter-spacing="2.5"
    fill="${page.accent}"
    opacity="0.9"
  >${escXml(page.badge)}</text>

  <!-- Main title -->
  <text
    x="104" y="${220 + (88 - titleSize) * 0.8}"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${titleSize}" font-weight="700"
    letter-spacing="-1.5"
    fill="white"
  >${escXml(title)}</text>

  <!-- Subtitle -->
  <text
    x="104" y="${250 + titleSize}"
    font-family="'Segoe UI', system-ui, -apple-system, sans-serif"
    font-size="26" font-weight="400"
    fill="rgba(255,255,255,0.5)"
  >${escXml(sub)}</text>

  <!-- Divider line -->
  <rect x="104" y="470" width="60" height="3" rx="1.5" fill="${page.accent}" opacity="0.8"/>

  <!-- Studio wordmark -->
  <text
    x="104" y="520"
    font-family="'Segoe UI', system-ui, -apple-system, sans-serif"
    font-size="16" font-weight="600" letter-spacing="1.5"
    fill="rgba(255,255,255,0.3)"
  >VAULTSPARK STUDIOS — vaultsparkstudios.com</text>

  <!-- Corner accent (decorative geometric) -->
  <polygon
    points="1200,0 1200,180 1020,0"
    fill="${page.accent}" opacity="0.06"
  />
  <polygon
    points="1200,0 1200,90 1110,0"
    fill="${page.accent}" opacity="0.08"
  />

  <!-- Bottom-right "⚡" brand mark -->
  <text
    x="1120" y="580"
    font-family="'Segoe UI', system-ui, sans-serif"
    font-size="52" text-anchor="middle"
    fill="${page.accent}" opacity="0.12"
  >⚡</text>
</svg>`;
}

function escXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Generate ─────────────────────────────────────────────────────────────
async function main() {
  let ok = 0, fail = 0;
  for (const page of PAGES) {
    const svgStr = buildSVG(page);
    const outPath = join(OUT, page.slug + '.png');
    try {
      await sharp(Buffer.from(svgStr))
        .png({ compressionLevel: 9, quality: 95 })
        .resize(1200, 630)
        .toFile(outPath);
      console.log(`  ✓ ${page.slug}.png`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${page.slug}.png — ${err.message}`);
      fail++;
    }
  }
  console.log(`\nDone: ${ok} generated, ${fail} failed.`);
}

main();
