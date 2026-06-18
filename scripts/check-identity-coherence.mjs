#!/usr/bin/env node
/* check-identity-coherence.mjs — S206 identity-drift gate.

   Mission: WARN when any mission surface narrows VaultSpark's identity to
   "game studio" instead of the canonical "creative studio building games,
   cinematic worlds, creative tools, and AI-native intelligence."

   Decision source: DECISIONS.md D-S203 · TASK_BOARD [S203][SIL][STRUCT/P3]

   Six mission surfaces checked:
     index.html              — homepage (schema + visible copy)
     studio/index.html       — The VaultSpark Manifesto
     press/index.html        — press bio
     join/index.html         — join page subtext
     universe/index.html     — EXEMPT (in-world cosmology)
     universe/voidfall/index.html — EXEMPT (fiction lore)

   Allowlisted contexts (legal/SEO — not mission copy):
     <meta name="keywords"> ... </meta>
     investor-portal/ pages
     privacy.html · terms.html · cookies.html · data-deletion.html · accessibility.html

   Identity violations (case-insensitive, word-boundary):
     "game studio" standalone — the S204-retired narrowing

   Exit codes:
     0 — clean
     1 — violation found in a non-allowlisted mission surface (advisory only) */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SURFACES = [
  { rel: 'index.html', exempt: false },
  { rel: 'studio/index.html', exempt: false },
  { rel: 'press/index.html', exempt: false },
  { rel: 'join/index.html', exempt: false },
  { rel: 'universe/index.html', exempt: true },
  { rel: 'universe/voidfall/index.html', exempt: true },
];

const BANNED = [
  /\bgame studio\b/i,
];

const KEYWORD_META = /<meta\s[^>]*name=["']keywords["'][^>]*\/?>/gi;
const INVESTOR_PORTAL = /investor[_-]?portal/i;

let violations = 0;

for (const { rel, exempt } of SURFACES) {
  const fullPath = path.join(ROOT, rel);
  if (!existsSync(fullPath)) continue;
  if (exempt) continue;

  const raw = readFileSync(fullPath, 'utf8');
  // Strip keyword meta and investor portal sections from the check scope.
  const stripped = raw.replace(KEYWORD_META, '').replace(INVESTOR_PORTAL, '');

  for (const pat of BANNED) {
    const match = stripped.match(pat);
    if (match) {
      console.warn(`  WARN: ${rel} — "${match[0]}" narrows identity (use "creative studio" instead)`);
      violations++;
    }
  }
}

if (violations === 0) {
  console.log('check-identity-coherence ✓  all mission surfaces use creative-studio identity');
  process.exit(0);
} else {
  console.warn(`check-identity-coherence: ${violations} identity-narrowing instance(s) found (advisory)`);
  process.exit(1);
}
