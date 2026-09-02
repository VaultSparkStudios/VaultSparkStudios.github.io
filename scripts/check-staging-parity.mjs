#!/usr/bin/env node
/**
 * Production ↔ staging parity health.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PAGE_CSP, WORKER_CSP } from '../config/csp-policy.mjs';
import { shellPaths } from './lib/shell-parity.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'api', 'staging-health.json');
const BUILD_SHA_PATH = path.join(ROOT, 'api', 'build-sha.json');
const ARTIFACT_MANIFEST_PATH = path.join(ROOT, 'api', 'candidate-artifact-manifest.json');
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

async function fetchBuildSha(base) {
  try {
    const res = await fetch(`${base}/api/build-sha.json`, {
      redirect: 'follow',
      headers: { 'user-agent': 'VaultSpark staging parity checker' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return /^[0-9a-f]{40}$/i.test(payload?.sha || '') ? payload.sha : null;
  } catch {
    return null;
  }
}

async function fetchArtifactManifest(base) {
  try {
    const res = await fetch(`${base}/api/candidate-artifact-manifest.json`, {
      redirect: 'follow',
      headers: { 'user-agent': 'VaultSpark staging parity checker' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return /^[0-9a-f]{64}$/i.test(payload?.root || '') && Number.isInteger(payload?.leafCount) ? payload : null;
  } catch {
    return null;
  }
}

function localBuildSha() {
  try {
    const payload = JSON.parse(fs.readFileSync(BUILD_SHA_PATH, 'utf8'));
    return /^[0-9a-f]{40}$/i.test(payload?.sha || '') ? payload.sha : null;
  } catch {
    return null;
  }
}

function localArtifactManifest() {
  try {
    const payload = JSON.parse(fs.readFileSync(ARTIFACT_MANIFEST_PATH, 'utf8'));
    return /^[0-9a-f]{64}$/i.test(payload?.root || '') && Number.isInteger(payload?.leafCount) ? payload : null;
  } catch {
    return null;
  }
}

// Pure status classifier (exported for self-test). Staging unreachable on every
// route → 'staging-unreachable'; reachable + full parity → 'green'; else 'yellow'.
/**
 * S338 — SURFACE parity, as distinct from the three-route sample above.
 *
 * ROUTES is a hand-maintained list of three. That is enough to compare shells,
 * headers and CSP, and it is structurally incapable of noticing that a route
 * production serves is missing from staging — which is exactly what happened:
 * S337 probed `/how-we-build/` and found 200 on production, 404 on staging,
 * while this checker reported `production-parity yellow` and exited 0 for weeks.
 * CANON-007 makes staging the thing production is verified against, so staging
 * quietly older than production inverts the gate the release ceremony leans on.
 *
 * Rather than grow the hand list (which strands the NEXT new route the same
 * way), compare the surface each origin ADVERTISES: two sitemap GETs cover
 * every route the site claims to serve, and new routes are covered the moment
 * they enter the sitemap. `missingOnStaging` is the inversion that matters —
 * production advertising something staging cannot serve.
 */
export function parseSitemapRoutes(xml, origins) {
  // Staging serves a sitemap whose <loc> entries name the CANONICAL production
  // origin, not the host that served the file — correct for SEO, and fatal to a
  // comparison that filters by serving origin: the first live run of this probe
  // read 115 staging entries as 0 and reported `uncomparable`. Accept any known
  // site origin and compare PATHS, which is what parity is actually about.
  const accepted = (Array.isArray(origins) ? origins : [origins]).filter(Boolean);
  const routes = new Set();
  for (const match of String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const raw = match[1];
    const origin = accepted.find((o) => raw.startsWith(o));
    if (!origin) continue;
    const route = raw.slice(origin.length).split('#')[0].split('?')[0] || '/';
    routes.add(route.startsWith('/') ? route : `/${route}`);
  }
  return routes;
}

export function compareSurfaces(prodRoutes, stagingRoutes) {
  // An unreadable sitemap is UNCOMPARABLE, never a clean parity. A checker that
  // reports "0 missing" because it could not read the list is the silent-zero
  // shape this project has paid for repeatedly.
  if (!prodRoutes || !stagingRoutes || !prodRoutes.size || !stagingRoutes.size) {
    return { state: 'uncomparable', productionRoutes: prodRoutes?.size ?? null, stagingRoutes: stagingRoutes?.size ?? null, missingOnStaging: [], missingOnStagingCount: null, aheadOnStaging: [], aheadOnStagingCount: null };
  }
  const missing = [...prodRoutes].filter((r) => !stagingRoutes.has(r)).sort();
  const ahead = [...stagingRoutes].filter((r) => !prodRoutes.has(r)).sort();
  return {
    state: missing.length ? 'staging-behind' : (ahead.length ? 'staging-ahead' : 'matched'),
    productionRoutes: prodRoutes.size,
    stagingRoutes: stagingRoutes.size,
    // Bounded so one badly-out-of-sync origin cannot publish an unbounded list
    // into a public-safe feed; the counts stay exact either way.
    missingOnStaging: missing.slice(0, 25),
    missingOnStagingCount: missing.length,
    aheadOnStaging: ahead.slice(0, 25),
    aheadOnStagingCount: ahead.length,
  };
}

async function fetchSitemapRoutes(origin) {
  // Same never-throw contract as fetchRoute: an unreachable origin yields null,
  // which compareSurfaces() reports as `uncomparable` rather than as parity.
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      headers: { 'user-agent': 'VaultSpark staging parity checker' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return parseSitemapRoutes(await res.text(), [PROD, STAGING]);
  } catch {
    return null;
  }
}

export function classifyStatus(routes) {
  const stagingReachable = routes.some((r) => r.stagingReachable);
  if (!stagingReachable) return 'staging-unreachable';
  return routes.every((r) => r.stagingReachable && r.statusParity && r.shellParity && r.headerParity && r.stagingStaticCspSafe) ? 'green' : 'yellow';
}

export function evaluateReleaseArtifact(parsed, now = Date.now(), maxAgeHours = 12, expectedShellByRoute = {}, expectedBuildSha = null, expectedManifest = undefined) {
  const findings = [];
  if (!parsed?.publicSafe || !Array.isArray(parsed?.routes)) findings.push('artifact-shape-drift');
  const generated = Date.parse(parsed?.generatedAt || '');
  if (!Number.isFinite(generated) || now - generated > maxAgeHours * 3600000) findings.push('artifact-stale');
  if (!/^[0-9a-f]{40}$/i.test(expectedBuildSha || '')) findings.push('candidate-build-sha-unavailable');
  else if (parsed?.stagingBuildSha !== expectedBuildSha) findings.push('staging-build-sha-mismatch');
  if (expectedManifest !== undefined) {
    if (!expectedManifest || !/^[0-9a-f]{64}$/i.test(expectedManifest.root || '')) findings.push('candidate-artifact-manifest-unavailable');
    else {
      if (parsed?.artifactManifest?.candidateRoot !== expectedManifest.root) findings.push('candidate-artifact-root-drift');
      if (parsed?.artifactManifest?.stagingRoot !== expectedManifest.root) findings.push('staging-artifact-root-mismatch');
      if (parsed?.artifactManifest?.stagingLeafCount !== expectedManifest.leafCount) findings.push('staging-artifact-leaf-count-mismatch');
    }
  }
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
    ['fresh candidate matching local shell and SHA is release-ready', evaluateReleaseArtifact({ publicSafe: true, status: 'yellow', generatedAt: new Date().toISOString(), stagingBuildSha: 'a'.repeat(40), routes: [{ route: '/', stagingStatus: 200, stagingReachable: true, headerParity: true, stagingCanonicalCsp: true, stagingSecurityHeaders: true, stagingStaticCspSafe: true, stagingShell: ['x'] }] }, Date.now(), 12, { '/': ['x'] }, 'a'.repeat(40)).ok],
    ['candidate with wrong local shell is not release-ready', !evaluateReleaseArtifact({ publicSafe: true, generatedAt: new Date().toISOString(), stagingBuildSha: 'a'.repeat(40), routes: [{ route: '/', stagingStatus: 200, stagingReachable: true, headerParity: true, stagingCanonicalCsp: true, stagingSecurityHeaders: true, stagingStaticCspSafe: true, stagingShell: ['old'] }] }, Date.now(), 12, { '/': ['new'] }, 'a'.repeat(40)).ok],
    ['candidate with stale staging SHA is not release-ready', !evaluateReleaseArtifact({ publicSafe: true, generatedAt: new Date().toISOString(), stagingBuildSha: 'b'.repeat(40), routes: [{ route: '/', stagingStatus: 200, stagingReachable: true, headerParity: true, stagingCanonicalCsp: true, stagingSecurityHeaders: true, stagingStaticCspSafe: true, stagingShell: ['x'] }] }, Date.now(), 12, { '/': ['x'] }, 'a'.repeat(40)).ok],
    ['candidate Merkle root must match staging critical bytes', (() => { const root = 'c'.repeat(64); const parsed = { publicSafe: true, generatedAt: new Date().toISOString(), stagingBuildSha: 'a'.repeat(40), artifactManifest: { candidateRoot: root, stagingRoot: root, stagingLeafCount: 24 }, routes: [{ route: '/', stagingStatus: 200, stagingReachable: true, stagingCanonicalCsp: true, stagingSecurityHeaders: true, stagingStaticCspSafe: true, stagingShell: ['x'] }] }; return evaluateReleaseArtifact(parsed, Date.now(), 12, { '/': ['x'] }, 'a'.repeat(40), { root, leafCount: 24 }).ok && !evaluateReleaseArtifact({ ...parsed, artifactManifest: { ...parsed.artifactManifest, stagingRoot: 'd'.repeat(64) } }, Date.now(), 12, { '/': ['x'] }, 'a'.repeat(40), { root, leafCount: 24 }).ok; })()],
    ['static strict-dynamic policy is unsafe', !servedCspSafe("script-src 'self' 'strict-dynamic'")],
    ['nonce-bound Worker strict-dynamic policy is safe', servedCspSafe("script-src 'self' 'nonce-abcdefghijklmnop' 'strict-dynamic'")],
    ['short nonce cannot make strict-dynamic safe', !servedCspSafe("script-src 'self' 'nonce-short' 'strict-dynamic'")],
    ['candidate with unsafe static CSP is not release-ready', !evaluateReleaseArtifact({ publicSafe: true, generatedAt: new Date().toISOString(), stagingBuildSha: 'a'.repeat(40), routes: [{ route: '/', stagingStatus: 200, stagingReachable: true, headerParity: true, stagingCanonicalCsp: true, stagingSecurityHeaders: true, stagingStaticCspSafe: false, stagingShell: ['x'] }] }, Date.now(), 12, { '/': ['x'] }, 'a'.repeat(40)).ok],    ['unreachable staging → staging-unreachable', classifyStatus([compareRoute(reachable, unreachable)]) === 'staging-unreachable'],
    // ── S338: advertised-surface parity ──────────────────────────────────
    ['a sitemap yields the routes of its own origin',
      [...parseSitemapRoutes('<url><loc>https://x.test/</loc></url><url><loc>https://x.test/a/</loc></url>', 'https://x.test')].sort().join(',') === '/,/a/'],
    ['a foreign origin in the sitemap is not counted as ours',
      parseSitemapRoutes('<loc>https://other.test/a/</loc>', 'https://x.test').size === 0],
    // Caught on this probe's own first live run: staging returned 115 entries
    // and they were read as 0, because every one of them names production.
    ['a staging sitemap naming the PRODUCTION origin still yields its routes',
      parseSitemapRoutes('<loc>https://vaultsparkstudios.com/how-we-build/</loc>', ['https://vaultsparkstudios.com', 'https://website.staging.vaultsparkstudios.com']).has('/how-we-build/')],
    // THE LIVE S337 SHAPE: /how-we-build/ advertised by production, absent from
    // staging, while the three-route sample reported parity and exited 0.
    ['a route production advertises and staging lacks is staging-behind', (() => {
      const c = compareSurfaces(new Set(['/', '/how-we-build/']), new Set(['/']));
      return c.state === 'staging-behind' && c.missingOnStagingCount === 1 && c.missingOnStaging[0] === '/how-we-build/';
    })()],
    ['a staging-only route is ahead, not behind',
      compareSurfaces(new Set(['/']), new Set(['/', '/next/'])).state === 'staging-ahead'],
    ['identical surfaces match', compareSurfaces(new Set(['/', '/a/']), new Set(['/a/', '/'])).state === 'matched'],
    // An unreadable sitemap must never render as clean parity — the silent-zero
    // shape this project has already paid for on four public tables.
    ['an unreadable sitemap is uncomparable, never matched',
      compareSurfaces(null, new Set(['/'])).state === 'uncomparable'
      && compareSurfaces(null, new Set(['/'])).missingOnStagingCount === null],
    ['an empty sitemap is uncomparable too', compareSurfaces(new Set(), new Set(['/'])).state === 'uncomparable'],
    ['the published missing list is bounded but the count is exact', (() => {
      const prod = new Set(['/']); for (let i = 0; i < 40; i += 1) prod.add(`/r${i}/`);
      const c = compareSurfaces(prod, new Set(['/']));
      return c.missingOnStaging.length === 25 && c.missingOnStagingCount === 40;
    })()],
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
  if (!parsed.publicSafe || !Array.isArray(parsed.routes) || !validStatus || !parsed.artifactManifest) {
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
    const release = evaluateReleaseArtifact(parsed, Date.now(), maxAgeHours, expectedShellByRoute, localBuildSha(), localArtifactManifest());
    if (!release.ok) {
      console.error(`check-staging-parity --require-green: BLOCKED (${release.findings.join(', ')})`);
      process.exit(1);
    }
  }
  console.log(`check-staging-parity ${REQUIRE_GREEN ? '--require-green: candidate-green' : '--check'} (production-parity ${parsed.status})`);
  process.exit(0);
}

const prodSitemapPromise = fetchSitemapRoutes(PROD);
const stagingSitemapPromise = fetchSitemapRoutes(STAGING);
const stagingBuildPromise = fetchBuildSha(STAGING);
const stagingManifestPromise = fetchArtifactManifest(STAGING);
const routes = [];
for (const route of ROUTES) {
  const [prod, staging] = await Promise.all([fetchRoute(PROD, route), fetchRoute(STAGING, route)]);
  routes.push(compareRoute(prod, staging));
}

const status = classifyStatus(routes);
const generatedAt = new Date().toISOString();
const candidateBuildSha = localBuildSha();
const stagingBuildSha = await stagingBuildPromise;
const stagingArtifactManifest = await stagingManifestPromise;
const candidateArtifactManifest = localArtifactManifest();
const expectedShellByRoute = Object.fromEntries(ROUTES.map((route) => {
  const local = route === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, route.slice(1), 'index.html');
  return [route, shellPaths(fs.readFileSync(local, 'utf8'))];
}));
const artifactManifest = {
  candidateRoot: candidateArtifactManifest?.root ?? null,
  candidateLeafCount: candidateArtifactManifest?.leafCount ?? null,
  stagingRoot: stagingArtifactManifest?.root ?? null,
  stagingLeafCount: stagingArtifactManifest?.leafCount ?? null,
  matched: Boolean(candidateArtifactManifest?.root && candidateArtifactManifest.root === stagingArtifactManifest?.root && candidateArtifactManifest.leafCount === stagingArtifactManifest?.leafCount),
};
const surfaceParity = compareSurfaces(await prodSitemapPromise, await stagingSitemapPromise);
const candidate = evaluateReleaseArtifact({ publicSafe: true, generatedAt, stagingBuildSha, artifactManifest, routes }, Date.now(), 12, expectedShellByRoute, candidateBuildSha, candidateArtifactManifest);
const payload = {
  schemaVersion: '1.0',
  generatedAt,
  candidateReady: candidate.ok,
  candidateFindings: candidate.findings,
  candidateBuildSha,
  stagingBuildSha,
  artifactManifest,
  generatedBy: 'scripts/check-staging-parity.mjs',
  publicSafe: true,
  production: PROD,
  staging: STAGING,
  status,
  // S338 — advertised-surface parity, reported but NOT gating. Staging is known
  // to be behind production right now (the S337 probe), so wiring this into
  // classifyStatus() today would turn staging-health red on a blocker already on
  // the board and block releases on a condition nobody has fixed yet. Publishing
  // the measurement first is the honest order: the gate flips once staging
  // refresh is understood, and until then the number is visible instead of absent.
  surfaceParity: { ...surfaceParity, gating: false, gatingDeferredBecause: 'staging refresh path is an open blocker (S337); measure before gating' },
  // Honest reason when we can't compare — the feed stays fresh (no seed-rot) and
  // says WHY rather than silently reporting a stale 'green'.
  reason: status === 'staging-unreachable'
    ? 'Staging origin did not respond within the probe budget; parity not comparable this cycle.'
    : undefined,
  routes,
};
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`check-staging-parity: ${status} (${routes.length} sampled route(s)) · surface ${surfaceParity.state}${surfaceParity.missingOnStagingCount ? ` · ${surfaceParity.missingOnStagingCount} route(s) missing on staging` : ''}`);
// --refresh tolerates an unreachable staging box (scheduled path); the default
// path also exits 0 — staging-unreachable is an honest state, not a build failure.
if (!REFRESH && status === 'staging-unreachable') {
  console.warn('check-staging-parity: staging unreachable — feed refreshed honestly (run with --refresh in scheduled jobs).');
}
process.exit(0);
