#!/usr/bin/env node
/**
 * Production ↔ staging parity health.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PAGE_CSP, WORKER_CSP } from '../config/csp-policy.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'api', 'staging-health.json');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const REQUIRE_GREEN = args.includes('--require-green');
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

export function normalizeCsp(csp) {
  // S174: production injects a per-request CSP nonce; staging is a static
  // origin that mirrors the policy without one. Strip nonce tokens so the
  // comparison tests POLICY parity, not per-request randomness.
  const stripped = String(csp)
    .replace(/'(?:nonce|sha256)-[^']*'\s*/g, '')
    .replace(/'strict-dynamic'\s*/g, '');
  const directives = stripped
    .split(';')
    .map((directive) => directive.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  return directives.length ? `${directives.join('; ')};` : '';
}

export function staticCspSafe(csp) {
  // A static origin cannot mint the per-response nonce that makes
  // strict-dynamic viable in production. Treat that combination as a hard
  // browser-safety failure instead of normalizing it away for parity.
  return !/(?:^|[;\s])'strict-dynamic'(?:[;\s]|$)/.test(String(csp));
}

export function nonceWorkerCspSafe(csp) {
  const value = String(csp);
  const strictDynamic = /(?:^|[;\s])'strict-dynamic'(?:[;\s]|$)/.test(value);
  const responseNonce = /'nonce-[A-Za-z0-9+/_=-]{16,}'/.test(value);
  return strictDynamic && responseNonce;
}

export function servedCspSafe(csp) {
  return staticCspSafe(csp) || nonceWorkerCspSafe(csp);
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
  const statusParity = prod.status === staging.status;
  const shellParity = JSON.stringify(prodShell) === JSON.stringify(stagingShell);
  const headerParity = JSON.stringify(prod.headers) === JSON.stringify(staging.headers);
  const stagingStaticCspSafe = staging.staticCspSafe !== false;
  const stagingCspMode = staging.cspMode === 'dynamic-worker' ? 'dynamic-worker' : 'static';
  const expectedCsp = stagingCspMode === 'dynamic-worker' ? WORKER_CSP : PAGE_CSP;
  const stagingCanonicalCsp = staging.headers?.csp === normalizeCsp(expectedCsp);
  const stagingSecurityHeaders = Boolean(staging.headers?.csp && staging.headers?.hsts && staging.headers?.xcto === 'nosniff' && staging.headers?.referrer);
  const reasonCodes = [];
  if (!(staging.reachable !== false && staging.status > 0)) reasonCodes.push('staging-unreachable');
  if (!statusParity) reasonCodes.push('status-mismatch');
  if (prod.status === 403 && staging.status === 200) reasonCodes.push('prod-forbidden');
  if (!shellParity) reasonCodes.push('shell-mismatch');
  if (!headerParity) reasonCodes.push('header-mismatch');
  if (!stagingStaticCspSafe) reasonCodes.push('staging-static-csp-unsafe');
  if (!stagingCanonicalCsp) reasonCodes.push('staging-canonical-csp-drift');
  if (!stagingSecurityHeaders) reasonCodes.push('staging-security-header-baseline');
  return {
    route: prod.route,
    prodStatus: prod.status,
    stagingStatus: staging.status,
    stagingReachable: staging.reachable !== false && staging.status > 0,
    statusParity,
    shellParity,
    prodShell,
    stagingShell,
    headerParity,
    prodHeaders: prod.headers,
    stagingHeaders: staging.headers,
    stagingStaticCspSafe,
    stagingCspMode,
    stagingCanonicalCsp,
    stagingSecurityHeaders,
    reasonCodes,
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
      staticCspSafe: servedCspSafe(res.headers.get('content-security-policy') || ''),
      cspMode: nonceWorkerCspSafe(res.headers.get('content-security-policy') || '') ? 'dynamic-worker' : 'static',
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
  return routes.every((r) => r.stagingReachable && r.statusParity && r.shellParity && r.headerParity && r.stagingStaticCspSafe) ? 'green' : 'yellow';
}

export function evaluateReleaseArtifact(parsed, now = Date.now(), maxAgeHours = 12, expectedShellByRoute = {}) {
  const findings = [];
  if (!parsed?.publicSafe || !Array.isArray(parsed?.routes)) findings.push('artifact-shape-drift');
  const generated = Date.parse(parsed?.generatedAt || '');
  if (!Number.isFinite(generated) || now - generated > maxAgeHours * 3600000) findings.push('artifact-stale');
  for (const route of parsed?.routes || []) {
    if (route.stagingReachable !== true) findings.push(`${route.route || 'unknown'}:stagingReachable`);
    if (route.stagingStatus < 200 || route.stagingStatus >= 300) findings.push(`${route.route || 'unknown'}:stagingStatus`);
    if (route.stagingCanonicalCsp !== true) findings.push(`${route.route || 'unknown'}:stagingCanonicalCsp`);
    if (route.stagingSecurityHeaders !== true) findings.push(`${route.route || 'unknown'}:stagingSecurityHeaders`);
    if (route.stagingStaticCspSafe !== true) findings.push(`${route.route || 'unknown'}:stagingStaticCspSafe`);
    const expected = expectedShellByRoute[route.route];
    if (!Array.isArray(expected) || JSON.stringify(route.stagingShell) !== JSON.stringify(expected)) {
      findings.push(`${route.route || 'unknown'}:localShellParity`);
    }
  }
  return { ok: findings.length === 0, findings };
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
    ['reason codes name shell/header mismatch', compareRoute(a, c).reasonCodes.includes('shell-mismatch') && compareRoute(a, c).reasonCodes.includes('header-mismatch')],
    ['reason codes name prod forbidden', compareRoute({ ...reachable, status: 403 }, reachable).reasonCodes.includes('prod-forbidden')],
    ['full parity → green', classifyStatus([compareRoute(reachable, reachable)]) === 'green'],
    ['header mismatch cannot classify green', classifyStatus([compareRoute(reachable, { ...reachable, headers: { csp: 'y' } })]) === 'yellow'],
    ['fresh candidate matching local shell is release-ready', evaluateReleaseArtifact({ publicSafe: true, status: 'yellow', generatedAt: new Date().toISOString(), routes: [{ route: '/', stagingStatus: 200, stagingReachable: true, headerParity: true, stagingCanonicalCsp: true, stagingSecurityHeaders: true, stagingStaticCspSafe: true, stagingShell: ['x'] }] }, Date.now(), 12, { '/': ['x'] }).ok],
    ['candidate with wrong local shell is not release-ready', !evaluateReleaseArtifact({ publicSafe: true, generatedAt: new Date().toISOString(), routes: [{ route: '/', stagingStatus: 200, stagingReachable: true, headerParity: true, stagingCanonicalCsp: true, stagingSecurityHeaders: true, stagingStaticCspSafe: true, stagingShell: ['old'] }] }, Date.now(), 12, { '/': ['new'] }).ok],
    ['static strict-dynamic policy is unsafe', !servedCspSafe("script-src 'self' 'strict-dynamic'")],
    ['nonce-bound Worker strict-dynamic policy is safe', servedCspSafe("script-src 'self' 'nonce-abcdefghijklmnop' 'strict-dynamic'")],
    ['short nonce cannot make strict-dynamic safe', !servedCspSafe("script-src 'self' 'nonce-short' 'strict-dynamic'")],
    ['candidate with unsafe static CSP is not release-ready', !evaluateReleaseArtifact({ publicSafe: true, generatedAt: new Date().toISOString(), routes: [{ route: '/', stagingStatus: 200, stagingReachable: true, headerParity: true, stagingCanonicalCsp: true, stagingSecurityHeaders: true, stagingStaticCspSafe: false, stagingShell: ['x'] }] }, Date.now(), 12, { '/': ['x'] }).ok],    ['unreachable staging → staging-unreachable', classifyStatus([compareRoute(reachable, unreachable)]) === 'staging-unreachable'],
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

if (CHECK || REQUIRE_GREEN) {
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
  if (REQUIRE_GREEN) {
    const maxAgeArg = args.find((arg) => arg.startsWith('--max-age-hours='));
    const maxAgeHours = maxAgeArg ? Number(maxAgeArg.split('=')[1]) : 12;
    const expectedShellByRoute = Object.fromEntries(ROUTES.map((route) => {
      const local = route === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, route.slice(1), 'index.html');
      return [route, shellPaths(fs.readFileSync(local, 'utf8'))];
    }));
    const release = evaluateReleaseArtifact(parsed, Date.now(), maxAgeHours, expectedShellByRoute);
    if (!release.ok) {
      console.error(`check-staging-parity --require-green: BLOCKED (${release.findings.join(', ')})`);
      process.exit(1);
    }
  }
  console.log(`check-staging-parity ${REQUIRE_GREEN ? '--require-green: candidate-green' : '--check'} (production-parity ${parsed.status})`);
  process.exit(0);
}

const routes = [];
for (const route of ROUTES) {
  const [prod, staging] = await Promise.all([fetchRoute(PROD, route), fetchRoute(STAGING, route)]);
  routes.push(compareRoute(prod, staging));
}

const status = classifyStatus(routes);
const generatedAt = new Date().toISOString();
const expectedShellByRoute = Object.fromEntries(ROUTES.map((route) => {
  const local = route === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, route.slice(1), 'index.html');
  return [route, shellPaths(fs.readFileSync(local, 'utf8'))];
}));
const candidate = evaluateReleaseArtifact({ publicSafe: true, generatedAt, routes }, Date.now(), 12, expectedShellByRoute);
const payload = {
  schemaVersion: '1.0',
  generatedAt,
  candidateReady: candidate.ok,
  candidateFindings: candidate.findings,
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
