#!/usr/bin/env node
/**
 * Adds missing og:image dimensions + alt + twitter:description to game/project pages.
 * All OG images are 1200×630 — studio standard. Only modifies pages that need it.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

const targets = [
  'games/index.html',
  'games/call-of-doodie/index.html',
  'games/solara/index.html',
  'games/voidfall/index.html',
  'games/the-exodus/index.html',
  'games/vaultspark-forge/index.html',
  'games/mindframe/index.html',
  'games/vaultfront/index.html',
  'games/gridiron-gm/index.html',
  'games/gridiron-gm-play/index.html',
  'games/vaultspark-football-gm/index.html',
  'games/project-unknown/index.html',
  'projects/index.html',
  'projects/concurrent/index.html',
  'projects/hashmark/index.html',
  'projects/ideaforge/index.html',
  'projects/vorn/index.html',
  'projects/signal-log/index.html',
  'projects/vault-member/index.html',
  'projects/sparkraid/index.html',
  'projects/obelisk/index.html',
  'projects/syntha/index.html',
  'projects/seamline/index.html',
  'projects/shadow/index.html',
  'projects/canon/index.html',
  'projects/statvault/index.html',
  'projects/velaxis/index.html',
  'projects/vault-pipeline/index.html',
  'projects/ouren/index.html',
  'projects/promogrind/index.html',
  'projects/the-living-protocol/index.html',
];

let changed = 0;
let skipped = 0;

for (const rel of targets) {
  const path = resolve(ROOT, rel);
  let html;
  try {
    html = readFileSync(path, 'utf8');
  } catch {
    console.warn(`SKIP (not found): ${rel}`);
    skipped++;
    continue;
  }

  let modified = html;
  let dirty = false;

  // ── 1. og:image:width / height / alt ────────────────────────────────────
  if (!modified.includes('og:image:width')) {
    // Extract og:title for the alt text
    const ogTitleMatch = modified.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    const altText = ogTitleMatch ? ogTitleMatch[1] : 'VaultSpark Studios';

    // Insert dimensions + alt immediately after the og:image line
    modified = modified.replace(
      /(<meta\s+property="og:image"\s+content="[^"]+"\s*\/>)/,
      `$1\n  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />\n  <meta property="og:image:alt" content="${altText}" />`
    );
    dirty = true;
  }

  // ── 2. twitter:description (and full card if title/image also missing) ──
  if (!modified.includes('twitter:description')) {
    const ogDescMatch = modified.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
    const ogTitleMatch2 = modified.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    const ogImageMatch = modified.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    const twitterDesc = ogDescMatch ? ogDescMatch[1] : '';
    const twitterTitle = ogTitleMatch2 ? ogTitleMatch2[1] : '';
    const twitterImage = ogImageMatch ? ogImageMatch[1] : '';

    if (!twitterDesc) {
      // nothing to use as description, skip
    } else if (modified.includes('twitter:title')) {
      // Has title — just add description after it
      modified = modified.replace(
        /(<meta\s+name="twitter:title"\s+content="[^"]+"\s*\/>)/,
        `$1\n  <meta name="twitter:description" content="${twitterDesc}" />`
      );
      dirty = true;
    } else {
      // No twitter:title at all — inject full set after twitter:site
      const inject = [
        twitterTitle ? `  <meta name="twitter:title" content="${twitterTitle}" />` : null,
        `  <meta name="twitter:description" content="${twitterDesc}" />`,
        twitterImage ? `  <meta name="twitter:image" content="${twitterImage}" />` : null,
      ].filter(Boolean).join('\n');

      modified = modified.replace(
        /(<meta\s+name="twitter:site"\s+content="[^"]+"\s*\/>)/,
        `$1\n${inject}`
      );
      dirty = true;
    }
  }

  if (dirty) {
    writeFileSync(path, modified, 'utf8');
    console.log(`FIXED: ${rel}`);
    changed++;
  } else {
    console.log(`OK (already complete): ${rel}`);
  }
}

console.log(`\nDone. ${changed} files updated, ${skipped} not found.`);
