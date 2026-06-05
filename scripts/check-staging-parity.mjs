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
const PROD = 'https://vaultsparkstudios.com';
const STAGING = 'https://website.staging.vaultsparkstudios.com';
const ROUTES = ['/', '/studio-pulse/', '/membership/'];

function shellPaths(html) {
  return [...String(html).matchAll(/assets\/(?:style|theme-toggle|nav-toggle|shell-health|ambient)\.shell-[a-f0-9]{10}\.(?:css|js)/g)]
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
    statusParity: prod.status === staging.status,
    shellParity: JSON.stringify(prodShell) === JSON.stringify(stagingShell),
    prodShell,
    stagingShell,
    headerParity: JSON.stringify(prod.headers) === JSON.stringify(staging.headers),
  };
}

async function fetchRoute(base, route) {
  const res = await fetch(`${base}${route}`, {
    redirect: 'follow',
    headers: { 'user-agent': 'VaultSpark staging parity checker' },
  });
  return {
    route,
    status: res.status,
    headers: securityHeaders(res.headers),
    html: await res.text(),
  };
}

if (SELF_TEST) {
  const a = { route: '/', status: 200, headers: { csp: 'x' }, html: '<script src="assets/ambient.shell-aaaaaaaaaa.js"></script>' };
  const b = { route: '/', status: 200, headers: { csp: 'x' }, html: '<script src="assets/ambient.shell-aaaaaaaaaa.js"></script>' };
  const c = { route: '/', status: 200, headers: { csp: 'y' }, html: '<script src="assets/ambient.shell-bbbbbbbbbb.js"></script>' };
  const cases = [
    ['matching route passes shell parity', compareRoute(a, b).shellParity],
    ['different shell fails parity', !compareRoute(a, c).shellParity],
    ['different header fails parity', !compareRoute(a, c).headerParity],
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
  if (!parsed.publicSafe || !Array.isArray(parsed.routes)) {
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

const ok = routes.every((route) => route.statusParity && route.shellParity);
const payload = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/check-staging-parity.mjs',
  publicSafe: true,
  production: PROD,
  staging: STAGING,
  status: ok ? 'green' : 'yellow',
  routes,
};
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`check-staging-parity: ${payload.status} (${routes.length} route(s))`);
