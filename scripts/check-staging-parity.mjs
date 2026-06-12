#!/usr/bin/env node
/**
 * Production ↔ staging parity health.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'api', 'staging-health.json');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const SELF_TEST = args.includes('--self-test');
// S192: --refresh = scheduled low-churn path. Writes a fresh feed even when
// staging is unreachable (status 'staging-unreachable') and exits 0 so a hung
// Hetzner box never fails the workflow or freezes generatedAt into seed-rot.
const REFRESH = args.includes('--refresh');
const PROD = 'https://vaultsparkstudios.com';
const STAGING = 'https://website.staging.vaultsparkstudios.com';
const ROUTES = ['/', '/studio-pulse/', '/membership/'];

function shellPaths(html) {
  return [...String(html).matchAll(/assets\/(?:style|theme-toggle|nav-toggle|shell-health|ambient|ambient-core|ambient-feature)\.shell-[a-f0-9]{10}\.(?:css|js)/g)]
    .map((m) => m[0])
    .sort();
}

function normalizeCsp(csp) {
  // S174: production injects a per-request CSP nonce; staging is a static
  // origin that mirrors the policy without one. Strip nonce tokens so the
  // comparison tests POLICY parity, not per-request randomness.
  return String(csp).replace(/'nonce-[^']*'\s*/g, '').replace(/\s+/g, ' ').trim();
}

function securityHeaders(headers) {
  return {
    csp: normalizeCsp(headers.get('content-security-policy') || ''),
    hsts: headers.get('strict-transport-security') || '',
    xcto: headers.get('x-content-type-options') || '',
    referrer: headers.get('referrer-policy') || '',
  };
}

export function compareRoute(prod, staging) {
  const prodShell = shellPaths(prod.html);
  const stagingShell = shellPaths(staging.html);
  return {
    route: prod.route,
    prodStatus: prod.status,
    stagingStatus: staging.status,
    stagingReachable: staging.reachable !== false && staging.status > 0,
    statusParity: prod.status === staging.status,
    shellParity: JSON.stringify(prodShell) === JSON.stringify(stagingShell),
    prodShell,
    stagingShell,
    headerParity: JSON.stringify(prod.headers) === JSON.stringify(staging.headers),
  };
}

async function fetchRoute(base, route) {
  // S192: never throw on an unreachable origin — a hung/down Hetzner staging box
  // must still yield a writable result (status 0, reachable:false) so the feed
  // refreshes honestly instead of crashing and freezing its timestamp.
  try {
    const res = await fetch(`${base}${route}`, {
      redirect: 'follow',
      headers: { 'user-agent': 'VaultSpark staging parity checker' },
      signal: AbortSignal.timeout(8000),
    });
    return {
      route,
      status: res.status,
      reachable: true,
      headers: securityHeaders(res.headers),
      html: await res.text(),
    };
  } catch (err) {
    return { route, status: 0, reachable: false, headers: {}, html: '', error: String(err && err.name || err) };
  }
}

// Pure status classifier (exported for self-test). Staging unreachable on every
// route → 'staging-unreachable'; reachable + full parity → 'green'; else 'yellow'.
export function classifyStatus(routes) {
  const stagingReachable = routes.some((r) => r.stagingReachable);
  if (!stagingReachable) return 'staging-unreachable';
  return routes.every((r) => r.statusParity && r.shellParity) ? 'green' : 'yellow';
}

if (SELF_TEST) {
  const a = { route: '/', status: 200, headers: { csp: 'x' }, html: '<script src="assets/ambient.shell-aaaaaaaaaa.js"></script>' };
  const b = { route: '/', status: 200, headers: { csp: 'x' }, html: '<script src="assets/ambient.shell-aaaaaaaaaa.js"></script>' };
  const c = { route: '/', status: 200, headers: { csp: 'y' }, html: '<script src="assets/ambient.shell-bbbbbbbbbb.js"></script>' };
  const reachable = { route: '/', status: 200, reachable: true, headers: { csp: 'x' }, html: '<script src="assets/ambient.shell-aaaaaaaaaa.js"></script>' };
  const unreachable = { route: '/', status: 0, reachable: false, headers: {}, html: '' };
  const cases = [
    ['matching route passes shell parity', compareRoute(a, b).shellParity],
    ['different shell fails parity', !compareRoute(a, c).shellParity],
    ['different header fails parity', !compareRoute(a, c).headerParity],
    ['full parity → green', classifyStatus([compareRoute(reachable, reachable)]) === 'green'],
    ['unreachable staging → staging-unreachable', classifyStatus([compareRoute(reachable, unreachable)]) === 'staging-unreachable'],
    ['reachable but mismatched → yellow', classifyStatus([compareRoute(reachable, { ...reachable, html: '<script src="assets/ambient.shell-zzzzzzzzzz.js"></script>' })]) === 'yellow'],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (CHECK) {
  if (!fs.existsSync(OUT)) {
    console.error('check-staging-parity --check: api/staging-health.json missing; run without --check');
    process.exit(1);
  }
  const parsed = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const validStatus = ['green', 'yellow', 'staging-unreachable'].includes(parsed.status);
  if (!parsed.publicSafe || !Array.isArray(parsed.routes) || !validStatus) {
    console.error('check-staging-parity --check: artifact shape drift');
    process.exit(1);
  }
  console.log(`check-staging-parity --check: OK (${parsed.status})`);
  process.exit(0);
}

const routes = [];
for (const route of ROUTES) {
  const [prod, staging] = await Promise.all([fetchRoute(PROD, route), fetchRoute(STAGING, route)]);
  routes.push(compareRoute(prod, staging));
}

const status = classifyStatus(routes);
const payload = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/check-staging-parity.mjs',
  publicSafe: true,
  production: PROD,
  staging: STAGING,
  status,
  // Honest reason when we can't compare — the feed stays fresh (no seed-rot) and
  // says WHY rather than silently reporting a stale 'green'.
  reason: status === 'staging-unreachable'
    ? 'Staging origin did not respond within the probe budget; parity not comparable this cycle.'
    : undefined,
  routes,
};
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`check-staging-parity: ${status} (${routes.length} route(s))`);
// --refresh tolerates an unreachable staging box (scheduled path); the default
// path also exits 0 — staging-unreachable is an honest state, not a build failure.
if (!REFRESH && status === 'staging-unreachable') {
  console.warn('check-staging-parity: staging unreachable — feed refreshed honestly (run with --refresh in scheduled jobs).');
}
process.exit(0);
