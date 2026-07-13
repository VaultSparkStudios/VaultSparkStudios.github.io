#!/usr/bin/env node
/**
 * check-render-blocking-routes.mjs — strict-floor routes must ship ZERO eager,
 * first-party, render-blocking `<script src>` tags.
 *
 * WHY THIS EXISTS (S278): check-js-budget.mjs enforces a *byte* budget (80 KB
 * gzipped of blocking JS per page). A small eager script — e.g. a ~2 KB
 * supabase client — sails under that byte budget yet still costs a full
 * render-blocking request that Lighthouse penalises by *count*, not size. That
 * is exactly how `/ranks/` drifted to 0.81 < 0.82 (trust floor) with a single
 * eager `supabase-client.js`. The byte gate stayed green the whole time.
 *
 * This gate closes that hole for the routes that are held to a strict Lighthouse
 * floor above the global minimum — the `core` / `trust` / `catalog` tiers in
 * config/lighthouse-route-tiers.json. Those first-impression / conversion / proof
 * routes get zero tolerance for render-blocking scripts. `longtail` routes keep
 * the byte gate only (they carry the global-minimum floor).
 *
 * The route list is DERIVED from the tier config (source of truth) — not a
 * hand-maintained page list — so adding a route to a strict tier automatically
 * puts it under this gate. The only hand-authored surface is EXEMPT below, and
 * every entry must carry a real reason.
 *
 * Fix when it fires: add `defer` (or `async`, or `type=module`) to the script,
 * and if an inline consumer depends on the global, gate that consumer on
 * DOMContentLoaded (deferred scripts run in document order before it). See
 * docs/SSR_ZERO_CLS_CONVENTION.md and the S278 /ranks/ + /vault-wall/ fixes.
 *
 * Usage:
 *   node scripts/check-render-blocking-routes.mjs             # check, exit 1 on violation
 *   node scripts/check-render-blocking-routes.mjs --self-test # validate detector logic
 *   node scripts/check-render-blocking-routes.mjs --report    # list every strict route + count
 *
 * Exits 0 clean, 1 on any violation or self-test failure.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = join(ROOT, 'config', 'lighthouse-route-tiers.json');

// Tiers whose floor sits ABOVE the global minimum — the strict routes.
// longtail == global-minimum floor, so it stays under the byte gate only.
const STRICT_TIERS = new Set(['core', 'trust', 'catalog']);

// Route → reason. An eager script here is a DELIBERATE, reviewed decision.
// Keep this list honest and small; prefer fixing over exempting.
const EXEMPT = {
  // Paid-membership checkout. membership-access.js gates tier-visible content and
  // must run pre-paint to avoid a flash of gated/ungated content (visible
  // tier-gating rule); supabase-public.js must load before it (ordered eager
  // pair). Deferring either risks a content flash on the conversion surface —
  // reviewed S278, left eager on purpose. Revisit if the auth probe is async
  // anyway (then a flash already exists and defer is free).
  '/vaultsparked/': 'tier-gate must run pre-paint (visible tier-gating)',
};

const SCRIPT_RE = /<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi;
const SAMPLE_BLOCK_RE = /<(pre|code)\b[\s\S]*?<\/\1>/gi;

function isBlocking(attrs) {
  if (/\bdefer\b/i.test(attrs)) return false;
  if (/\basync\b/i.test(attrs)) return false;
  if (/\btype\s*=\s*["']module["']/i.test(attrs)) return false;
  return true;
}

function isFirstParty(src) {
  if (src.startsWith('//')) return false;
  if (/^https?:\/\//i.test(src)) return false;
  return true;
}

/** Count eager, first-party, render-blocking script srcs in an HTML string. */
export function eagerBlockingScripts(html) {
  const stripped = String(html).replace(SAMPLE_BLOCK_RE, '');
  const out = [];
  let m;
  SCRIPT_RE.lastIndex = 0;
  while ((m = SCRIPT_RE.exec(stripped))) {
    const attrs = (m[1] || '') + ' ' + (m[3] || '');
    const src = m[2];
    if (!isBlocking(attrs)) continue;
    if (!isFirstParty(src)) continue;
    out.push(src);
  }
  return out;
}

function routeToRel(route) {
  if (route === '/') return 'index.html';
  return route.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
}

function runSelfTest() {
  const cases = [
    ['eager first-party flagged', eagerBlockingScripts('<script src="/a.js"></script>').length === 1],
    ['defer ignored', eagerBlockingScripts('<script src="/a.js" defer></script>').length === 0],
    ['async ignored', eagerBlockingScripts('<script src="/a.js" async></script>').length === 0],
    ['module ignored', eagerBlockingScripts('<script src="/a.js" type="module"></script>').length === 0],
    ['cross-origin ignored', eagerBlockingScripts('<script src="https://cdn.x/a.js"></script>').length === 0],
    ['protocol-relative ignored', eagerBlockingScripts('<script src="//cdn.x/a.js"></script>').length === 0],
    ['inline sample not counted', eagerBlockingScripts('<pre><script src="/a.js"></script></pre>').length === 0],
    ['defer attr after src', eagerBlockingScripts('<script src="/a.js" defer ></script>').length === 0],
    ['two eager counted', eagerBlockingScripts('<script src="/a.js"></script><script src="/b.js"></script>').length === 2],
    ['route→rel root', routeToRel('/') === 'index.html'],
    ['route→rel nested', routeToRel('/ranks/') === 'ranks/index.html'],
  ];
  let ok = true;
  for (const [name, pass] of cases) {
    console.log(`  ${pass ? '✓' : '✗'} ${name}`);
    if (!pass) ok = false;
  }
  console.log(ok ? '✓ check-render-blocking-routes --self-test: all passed'
                 : '✗ check-render-blocking-routes --self-test: FAILED');
  process.exit(ok ? 0 : 1);
}

function main() {
  if (process.argv.includes('--self-test')) return runSelfTest();
  const report = process.argv.includes('--report');

  let config;
  try {
    config = JSON.parse(readFileSync(CONFIG, 'utf8'));
  } catch (e) {
    console.error(`✗ cannot read ${CONFIG}: ${e.message}`);
    process.exit(1);
  }

  const strictRoutes = Object.entries(config.routes || {})
    .filter(([, tier]) => STRICT_TIERS.has(tier));

  let violations = 0;
  const rows = [];
  for (const [route, tier] of strictRoutes) {
    const rel = routeToRel(route);
    let html;
    try {
      html = readFileSync(join(ROOT, rel), 'utf8');
    } catch {
      // A configured route with no file on disk is a config-drift problem, not a
      // perf violation — surface it but don't fail this gate (sitemap gate owns it).
      rows.push({ route, tier, rel, count: null, scripts: [] });
      continue;
    }
    const scripts = eagerBlockingScripts(html);
    rows.push({ route, tier, rel, count: scripts.length, scripts });
    if (scripts.length > 0 && !EXEMPT[route]) {
      violations++;
      console.error(`✗ ${route} [${tier}]: ${scripts.length} eager render-blocking script(s)`);
      scripts.forEach((s) => console.error(`    ${s}  → add defer (gate inline consumer on DOMContentLoaded)`));
    }
  }

  if (report) {
    console.log('\nStrict-floor routes — eager render-blocking first-party scripts:\n');
    for (const r of rows) {
      const tag = EXEMPT[r.route] ? ` [exempt: ${EXEMPT[r.route]}]` : '';
      const c = r.count === null ? 'missing' : String(r.count);
      console.log(`  ${c.padStart(3)}  ${r.route} [${r.tier}]${tag}`);
    }
  }

  if (violations) {
    console.error(`\n✗ check-render-blocking-routes: ${violations} strict route(s) with render-blocking scripts`);
    console.error('  Fix: defer/async the script; see docs/SSR_ZERO_CLS_CONVENTION.md');
    process.exit(1);
  }
  const exemptCount = Object.keys(EXEMPT).length;
  console.log(`✓ check-render-blocking-routes: ${strictRoutes.length} strict route(s) clean (${exemptCount} documented exempt)`);
}

main();
