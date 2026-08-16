#!/usr/bin/env node
/**
 * scripts/build-ambient-bundle.mjs (S136 speed sprint · S175 stable-core split)
 *
 * Concatenates the ambient JS files that propagate-nav.mjs used to inject
 * as separate <script> tags on every public page. Each source script is
 * wrapped in its own IIFE so top-level variable declarations don't collide
 * and side effects fire in source order on a single parse pass.
 *
 * S175 stable-core split: ONE bundle became TWO —
 *   assets/ambient-core.bundle.js     shell primitives that rarely change
 *   assets/ambient-feature.bundle.js  engagement surfaces that change often
 *
 * Why the split: every ambient edit used to rotate the single bundle's hash,
 * invalidating the cached bundle for EVERY visitor sitewide (the cold-cache
 * cost documented since S160). With the split, a feature edit only rotates
 * the small feature bundle; the core bundle's hash — and every visitor's
 * cached copy — survives. Both load with `defer`, which guarantees execution
 * order (core first), preserving the signed-in-state → account-chip contract.
 *
 * Wire-up:
 *   1. This script runs in `npm run build` and `npm run build:check`.
 *   2. `build-shell-assets.mjs` hashes both outputs (cache-busting + SW pre-cache).
 *   3. `propagate-nav.mjs` injects two script tags (core, then feature).
 *
 * Run:
 *   node scripts/build-ambient-bundle.mjs            # build + write
 *   node scripts/build-ambient-bundle.mjs --check    # exit 1 if bundles drift from sources
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const checkMode = process.argv.includes('--check');

// CORE — shell primitives + session truth + loaders. Role-stable: these only
// change for infrastructure reasons, so their hash (and every visitor's
// cached copy) should survive ordinary feature sessions.
// Ordering contract: signed-in-state precedes account-chip-loader.
const AMBIENT_CORE_SOURCES = [
  'assets/tt-default-policy.js', // TT migration bridge — MUST precede every sink (S176)
  'assets/native-feel.js',
  'assets/scroll-reveal.js',
  'assets/scroll-depth.js',
  'assets/breadcrumb-render.js',
  'assets/signed-in-state.js',   // single auth query; must precede account-chip
  'assets/account-chip-loader.js',
  'assets/ambient-loader.js',
  'assets/hover-prefetch.js',
  'assets/edge-swipe-nav.js',
  'assets/pointerdown-warm.js',
  'assets/command-palette-loader.js',
  'assets/adaptive-speculation.js',
  'assets/rum-beacon.js',
];

// FEATURE — engagement/intelligence surfaces that audit sessions touch
// routinely. Edits here rotate only this (smaller) bundle.
const AMBIENT_FEATURE_SOURCES = [
  'assets/page-sigil.js',
  'assets/vault-atlas.js',
  // vault-genome-strip.js moved to predicate loading (assets/ambient-loader.js)
  // S178 — #1 ambient split candidate; capability-gated, off the cold-cache path.
  // rank-orb / rate-page / ignis-lens / vault-rank-bar moved to predicate loading
  // S185 ambient-split wave 4. Each parsed on every cold load just to bail on
  // portal/admin/non-game pages; predicates mirror each script's own mount guard.
  // intent-flight-director and ignis-answer-engine moved to predicate loading
  // in S180. Both are route/hook scoped but previously parsed on every page.
  // feedback-decision-board / social-dashboard-public / rank-economy-simulator /
  // security-posture moved to predicate loading (assets/ambient-loader.js) — S179
  // ambient-split wave 2. Each self-mounts only on its own route (/feedback,
  // /social, /membership|/ranks, /security), so it parsed on every cold load just
  // to bail. The predicate mirrors each script's exact mount condition.
  'assets/founder-presence-handle.js',
];

// Combined view — kept for coverage tooling (report-ambient-coverage,
// check-session-state-contract) that reasons about the full ambient set.
const AMBIENT_SOURCES = [...AMBIENT_CORE_SOURCES, ...AMBIENT_FEATURE_SOURCES];

const BUNDLES = [
  { name: 'core', sources: AMBIENT_CORE_SOURCES, output: join(ROOT, 'assets', 'ambient-core.bundle.js') },
  { name: 'feature', sources: AMBIENT_FEATURE_SOURCES, output: join(ROOT, 'assets', 'ambient-feature.bundle.js') },
];

/**
 * S317 — rewrite predicate-loaded script srcs to their content-addressed twin.
 *
 * ambient-loader.js injects scripts by plain path (`/assets/journey-conductor.js`).
 * A plain path is NOT promotable by the content lane — only hash-named shell
 * assets are — so while the full-site lane sat held, journey-conductor 404'd on
 * every page and the browser refused it as `text/html`. Its 38 siblings only
 * work because they shipped in an earlier full deploy.
 *
 * The hash is recomputed here from the file's own bytes, using the SAME
 * function as build-shell-assets (sha256 → first 10 hex, CRLF normalised), so
 * this is single-pass deterministic and never depends on manifest ordering.
 * The loader SOURCE keeps the readable plain path; only the generated bundle
 * carries the hashed one.
 */
const CONTENT_ADDRESSED_PREDICATE_SRCS = ['assets/journey-conductor.js'];

function shellHash(relPath) {
  const full = join(ROOT, relPath);
  if (!existsSync(full)) return null;
  const normalized = readFileSync(full, 'utf-8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(Buffer.from(normalized, 'utf8')).digest('hex').slice(0, 10);
}

function contentAddressPredicateSrcs(src) {
  let out = src;
  for (const rel of CONTENT_ADDRESSED_PREDICATE_SRCS) {
    const hash = shellHash(rel);
    if (!hash) continue;
    const stem = rel.replace(/^assets\//, '').replace(/\.js$/, '');
    out = out.split(`/${rel}`).join(`/assets/${stem}.shell-${hash}.js`);
  }
  return out;
}

function buildBundle(name, sources) {
  const parts = [
    `/* VaultSpark ambient ${name} bundle — generated by scripts/build-ambient-bundle.mjs */`,
    '/* DO NOT EDIT — change source files in the source lists + re-run the build. */',
    `/* Sources: ${sources.length} files, parsed in declared order. */`,
    '',
  ];

  for (const rel of sources) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) {
      console.error(`✘ Missing ambient source: ${rel}`);
      process.exit(1);
    }
    const src = contentAddressPredicateSrcs(readFileSync(full, 'utf-8'));
    // Wrap each source in its own IIFE so top-level `const`/`let` declarations
    // can't collide and `var` declarations don't leak to window.
    parts.push(`/* ── ${rel} ──────────────────────────────────────────── */`);
    parts.push(';(function(window, document, console){');
    parts.push("'use strict';");
    parts.push(src);
    parts.push('})(window, document, console);');
    parts.push('');
  }

  return parts.join('\n');
}

let drift = false;
for (const b of BUNDLES) {
  const bundle = buildBundle(b.name, b.sources);
  if (checkMode) {
    if (!existsSync(b.output) || readFileSync(b.output, 'utf-8') !== bundle) {
      console.error(`✘ Bundle drift: ${b.output} is out of sync. Run \`node scripts/build-ambient-bundle.mjs\`.`);
      drift = true;
      continue;
    }
    console.log(`✓ Ambient ${b.name} bundle in sync (${b.sources.length} sources, ${(bundle.length / 1024).toFixed(1)} KB)`);
  } else {
    writeFileSync(b.output, bundle, 'utf-8');
    console.log(`✓ Wrote ${b.output}  (${b.sources.length} sources, ${(bundle.length / 1024).toFixed(1)} KB)`);
  }
}
if (checkMode && drift) process.exit(1);
