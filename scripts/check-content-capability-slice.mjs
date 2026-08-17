#!/usr/bin/env node
/**
 * Prevent a content-only release from promoting a browser caller while its
 * Worker callee is absent from production. The input is the exact promotable
 * overlay, never the raw candidate diff. Literal /v/* calls in promoted JS are
 * bound to fresh, route-level production provenance.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_RECEIPT = path.join(ROOT, 'api', 'worker-route-provenance.json');
const MAX_PROOF_AGE_MS = 72 * 60 * 60 * 1000;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function extractCapabilityManifest(paths, { readSource = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8') } = {}) {
  const callers = [];
  for (const relative of [...new Set(paths || [])].sort()) {
    if (!/\.js$/i.test(relative)) continue;
    let source;
    try { source = readSource(relative); } catch {
      callers.push({ path: relative, sourceSha256: null, routes: [], unreadable: true });
      continue;
    }
    const routes = [...new Set([...source.matchAll(/["'`]\/v\/([a-z0-9-]+)(?:[/?#][^"'`]*)?["'`]/gi)]
      .map((match) => `/v/${match[1].toLowerCase()}`))].sort();
    callers.push({ path: relative, sourceSha256: sha256(source), routes });
  }
  return {
    schemaVersion: '1.0',
    generatedBy: 'scripts/check-content-capability-slice.mjs',
    callers,
    requiredRoutes: [...new Set(callers.flatMap((caller) => caller.routes))].sort(),
  };
}

export function evaluateCapabilitySlice({ paths, receipt, now = Date.now(), readSource }) {
  const manifest = extractCapabilityManifest(paths, { readSource });
  const blockers = [];
  for (const caller of manifest.callers) {
    if (caller.unreadable) blockers.push(`${caller.path}: promoted caller could not be read`);
  }
  if (!manifest.requiredRoutes.length) return { allowed: blockers.length === 0, manifest, blockers };

  let observedAt = Number.NaN;
  try { observedAt = Date.parse(receipt?.generatedAt); } catch {}
  if (!receipt || receipt.schemaVersion !== '1.0' || receipt.publicSafe !== true) blockers.push('Worker route provenance receipt is missing or invalid');
  if (receipt?.observedOrigin !== 'https://vaultsparkstudios.com') blockers.push('Worker route provenance was not observed at the production origin');
  if (!Number.isFinite(observedAt) || observedAt > now + 5 * 60 * 1000 || now - observedAt > MAX_PROOF_AGE_MS) {
    blockers.push('Worker route provenance is missing, future-dated, or older than 72 hours');
  }

  const proven = new Map((receipt?.routes || []).map((route) => [route.path, route]));
  for (const routePath of manifest.requiredRoutes) {
    const route = proven.get(routePath);
    if (!route) blockers.push(`${routePath}: no production route contract exists`);
    else if (route.matched !== true || route.observedStatus !== route.expectedStatus) blockers.push(`${routePath}: production route is not proven live`);
  }
  return { allowed: blockers.length === 0, manifest, blockers };
}

function selfTest() {
  const now = Date.parse('2026-08-16T12:00:00Z');
  const sources = new Map([
    ['assets/news-desk.shell-a1b2c3d4.js', "fetch('/v/desk-reaction',{method:'POST'}); fetch(`/v/desk-presence`);"],
    ['assets/inert.shell-b2c3d4e5.js', "console.log('no worker capability')"],
  ]);
  const readSource = (relative) => {
    if (!sources.has(relative)) throw new Error('missing');
    return sources.get(relative);
  };
  const receipt = {
    schemaVersion: '1.0', publicSafe: true, generatedAt: '2026-08-16T11:00:00Z',
    observedOrigin: 'https://vaultsparkstudios.com',
    routes: [
      { path: '/v/desk-reaction', matched: true, observedStatus: 204, expectedStatus: 204 },
      { path: '/v/desk-presence', matched: true, observedStatus: 204, expectedStatus: 204 },
    ],
  };
  const desk = ['assets/news-desk.shell-a1b2c3d4.js'];
  const cases = [
    ['S317 caller shape extracts both Worker routes', extractCapabilityManifest(desk, { readSource }).requiredRoutes.join(',') === '/v/desk-presence,/v/desk-reaction'],
    ['a changed caller passes only with fresh per-route production proof', evaluateCapabilitySlice({ paths: desk, receipt, now, readSource }).allowed],
    ['mutation: one missing Desk route blocks the slice', !evaluateCapabilitySlice({ paths: desk, receipt: { ...receipt, routes: receipt.routes.slice(0, 1) }, now, readSource }).allowed],
    ['mutation: a mismatched Desk route blocks the slice', !evaluateCapabilitySlice({ paths: desk, receipt: { ...receipt, routes: receipt.routes.map((r) => r.path.endsWith('reaction') ? { ...r, matched: false, observedStatus: 404 } : r) }, now, readSource }).allowed],
    ['mutation: stale proof blocks a changed caller', !evaluateCapabilitySlice({ paths: desk, receipt: { ...receipt, generatedAt: '2026-08-10T00:00:00Z' }, now, readSource }).allowed],
    ['a changed script with no Worker calls needs no Worker proof', evaluateCapabilitySlice({ paths: ['assets/inert.shell-b2c3d4e5.js'], receipt: null, now, readSource }).allowed],
    ['an unreadable promoted caller fails closed', !evaluateCapabilitySlice({ paths: ['assets/missing.shell-c3d4e5f6.js'], receipt, now, readSource }).allowed],
  ];
  for (const [label, pass] of cases) console.log(`  ${pass ? '✓' : '✗'} ${label}`);
  if (cases.some(([, pass]) => !pass)) process.exit(1);
  console.log(`check-content-capability-slice --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const arg = (name) => {
    const exact = process.argv.indexOf(name);
    if (exact >= 0) return process.argv[exact + 1] || '';
    return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) || '';
  };
  const paths = (arg('--paths') || process.env.LANE_PATHS || '').split(/\s+/).filter(Boolean);
  if (!paths.length) {
    console.error('content-capability-slice: --paths or LANE_PATHS is required');
    process.exit(2);
  }
  let receipt = null;
  try { receipt = JSON.parse(fs.readFileSync(arg('--receipt') || DEFAULT_RECEIPT, 'utf8')); } catch {}
  const verdict = evaluateCapabilitySlice({ paths, receipt });
  const jsonOut = arg('--json-out');
  if (jsonOut) {
    fs.mkdirSync(path.dirname(path.resolve(ROOT, jsonOut)), { recursive: true });
    fs.writeFileSync(path.resolve(ROOT, jsonOut), JSON.stringify({ ...verdict.manifest, allowed: verdict.allowed, blockers: verdict.blockers }, null, 2) + '\n');
  }
  console.log(`content-capability-slice: ${verdict.allowed ? 'READY' : 'BLOCKED'} · ${verdict.manifest.callers.length} caller(s) · ${verdict.manifest.requiredRoutes.length} Worker route(s)`);
  for (const blocker of verdict.blockers) console.error(`  - ${blocker}`);
  if (!verdict.allowed) process.exit(1);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
