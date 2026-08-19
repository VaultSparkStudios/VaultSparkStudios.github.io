#!/usr/bin/env node
/* check-registry-freshness.mjs — D-S208.7: surface drift between the website's local
 * project registry (studio-hub/src/data/studioRegistry.js) and the canonical
 * portfolio/PROJECT_REGISTRY.json in the studio-ops sibling repo.
 *
 * The whole S208 "wrong links / missing projects" problem was SILENT divergence: the
 * local registry lagged the canonical one (stale URLs/statuses, missing public
 * projects) and nothing flagged it. This gate makes that drift VISIBLE so it's caught
 * at build time instead of by a founder noticing wrong links.
 *
 * Advisory by design (the local registry intentionally overrides some canonical
 * audience flags + URLs per founder direction — see D-S208.4/5). It WARNs, never
 * blocks, and SKIPs cleanly when the sibling repo isn't reachable (e.g. CI).
 *
 * Usage: node scripts/check-registry-freshness.mjs [--json] [--self-test]
 * Exit: 0 always (advisory) unless --self-test fails.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const JSON_MODE = argv.includes('--json');
const SELF_TEST = argv.includes('--self-test');

const CANON_PATHS = [
  resolve(ROOT, '../vaultspark-studio-ops/portfolio/PROJECT_REGISTRY.json'),
  resolve(ROOT, '../../vaultspark-studio-ops/portfolio/PROJECT_REGISTRY.json'),
];

// Pure: compare local vs canonical project sets. Both are arrays of {id/slug, vaultStatus, deployedUrl/url}.
// Returns { missingPublic, statusDrift, urlDrift } — all advisory.
// Known slug aliases (canonical slug → local id) — same project, historically different id.
const ALIASES = { 'franchise-architect': 'football-gm' };

export function diffRegistries(localProjects, canonProjects, { internalIds = new Set() } = {}) {
  const norm = (s) => String(s || '').toLowerCase();
  // URL normalizer: trim + lowercase + drop a single trailing slash so
  // "https://x.com/" and "https://x.com" are treated as the same link.
  const normUrl = (s) => norm(s).trim().replace(/\/+$/, '');
  const localById = new Map(localProjects.map((p) => [p.id, p]));
  const localId = (canonSlug) => (localById.has(canonSlug) ? canonSlug : (ALIASES[canonSlug] || canonSlug));
  const missingPublic = [];
  const statusDrift = [];
  const urlDrift = [];
  for (const c of canonProjects) {
    const id = c.slug;
    if (!id) continue;
    const isPublic = /public/i.test(c.audience || '');
    if (!isPublic) continue;                 // only public projects belong on the site
    if (internalIds.has(id)) continue;       // explicitly site-internal
    if (id === 'vaultsparkstudios-website') continue;
    const local = localById.get(localId(id));
    if (!local) { missingPublic.push({ id, name: c.name, audience: c.audience }); continue; }
    // Status drift (only flag when canonical is sparked but local isn't — under-promotion is the risky case).
    const cStatus = norm(c.vaultStatus);
    const lStatus = norm(local.vaultStatus);
    if (cStatus === 'sparked' && lStatus !== 'sparked') statusDrift.push({ id, canonical: cStatus, local: lStatus });
    // URL drift (S323): urlDrift was declared and returned but NEVER populated —
    // so the stale/wrong-link symptom this gate names as its whole reason for
    // existing (S208 "wrong links") was structurally unmeasurable, the bucket
    // always empty. Mirror the statusDrift pattern: for a public project present
    // in BOTH registries, flag when the deployed link the site would render
    // disagrees with the canonical one. Only compare when both sides declare a
    // URL — a null local URL is an intentional "no link yet", not drift.
    const cUrl = normUrl(c.deployedUrl);
    const lUrl = normUrl(local.deployedUrl);
    if (cUrl && lUrl && cUrl !== lUrl) urlDrift.push({ id, local: local.deployedUrl, canonical: c.deployedUrl });
  }
  return { missingPublic, statusDrift, urlDrift };
}

if (SELF_TEST) {
  const local = [
    { id: 'a', vaultStatus: 'sparked', deployedUrl: 'https://a.com/' }, // same link (trailing-slash only) — no drift
    { id: 'b', vaultStatus: 'forge' },
    { id: 'e', vaultStatus: 'sparked', deployedUrl: 'https://old-e.example' }, // stale link vs canonical
  ];
  const canon = [
    { slug: 'a', vaultStatus: 'sparked', audience: 'public-live', deployedUrl: 'https://a.com' },
    { slug: 'b', vaultStatus: 'sparked', audience: 'public-unlaunched' }, // drift: canon sparked, local forge
    { slug: 'c', vaultStatus: 'forge', audience: 'public-unlaunched' },   // missing from local
    { slug: 'd', vaultStatus: 'forge', audience: 'internal' },            // internal — ignored
    { slug: 'e', vaultStatus: 'sparked', audience: 'public-live', deployedUrl: 'https://new-e.example' }, // URL drift
  ];
  const r = diffRegistries(local, canon);
  let fail = 0; const a = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } else console.log('  ✓ ' + m); };
  a(r.missingPublic.length === 1 && r.missingPublic[0].id === 'c', 'detects missing public project (c)');
  a(r.statusDrift.length === 1 && r.statusDrift[0].id === 'b', 'detects under-promotion drift (b)');
  a(!r.missingPublic.find((x) => x.id === 'd'), 'ignores internal-audience project (d)');
  // S323 — both directions of the previously-dead urlDrift bucket:
  a(r.urlDrift.length === 1 && r.urlDrift[0].id === 'e', '(a) differing deployedUrl for same slug → urlDrift entry (e)');
  a(r.urlDrift[0] && r.urlDrift[0].local === 'https://old-e.example' && r.urlDrift[0].canonical === 'https://new-e.example',
    '    urlDrift entry carries local + canonical link');
  a(!r.urlDrift.find((x) => x.id === 'a'), '(b) identical URLs (trailing-slash only) produce no urlDrift (a)');
  console.log(`\ncheck-registry-freshness self-test: ${fail ? '✗ ' + fail + ' failed' : 'all passed'}`);
  process.exit(fail ? 1 : 0);
}

// Load local registry (ESM dynamic import — pathToFileURL for Windows, per memory).
let localProjects = [];
try {
  const m = await import(pathToFileURL(join(ROOT, 'studio-hub/src/data/studioRegistry.js')).href);
  localProjects = m.PROJECTS || [];
} catch (e) {
  console.log('check-registry-freshness · SKIP — local registry unreadable: ' + e.message);
  process.exit(0);
}
const canonPath = CANON_PATHS.find((p) => existsSync(p));
if (!canonPath) {
  console.log('check-registry-freshness · SKIP — canonical registry not reachable (expected in CI)');
  process.exit(0);
}
const canonProjects = JSON.parse(readFileSync(canonPath, 'utf8')).projects || [];
const internalIds = new Set(['studio-ops', 'social-dashboard', 'sparkfunnel', 'vaultspark-studio-hub', 'vaultspark-ignis', 'gridiron-gm', 'gridiron-gm-play', 'statsforge', 'website']);
const { missingPublic, statusDrift, urlDrift } = diffRegistries(localProjects, canonProjects, { internalIds });

if (JSON_MODE) { console.log(JSON.stringify({ missingPublic, statusDrift, urlDrift }, null, 2)); process.exit(0); }

console.log('check-registry-freshness  (local studioRegistry.js vs canonical PROJECT_REGISTRY.json)');
console.log('──────────────────────────────────────────────');
if (!missingPublic.length && !statusDrift.length && !urlDrift.length) {
  console.log('  ✓ local registry covers every public canonical project; no under-promotion or link drift.');
  process.exit(0);
}
if (missingPublic.length) {
  console.log(`  ⚠ ${missingPublic.length} public canonical project(s) not on the site:`);
  for (const p of missingPublic) console.log(`      · ${p.id} (${p.audience})`);
}
if (statusDrift.length) {
  console.log(`  ⚠ ${statusDrift.length} project(s) canonical-SPARKED but local-${statusDrift[0].local}:`);
  for (const p of statusDrift) console.log(`      · ${p.id}: canonical ${p.canonical} ≠ local ${p.local}`);
}
if (urlDrift.length) {
  console.log(`  ⚠ ${urlDrift.length} project(s) with a deployedUrl the site would render that disagrees with canonical:`);
  for (const p of urlDrift) console.log(`      · ${p.id}: local ${p.local} ≠ canonical ${p.canonical}`);
}
console.log('  → advisory: confirm with founder, then sync studio-hub/src/data/studioRegistry.js (or ship Ark to studio-ops).');
process.exit(0);
