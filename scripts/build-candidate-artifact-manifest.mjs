#!/usr/bin/env node
/**
 * Deterministic candidate artifact Merkle manifest.
 *
 * The build SHA identifies intent; this manifest identifies the exact critical
 * bytes served to humans and agents. It excludes itself and downstream release
 * receipts, avoiding a self-referential hash graph.
 *
 * REPRODUCIBILITY (S319 — the defect that held production dark for 12.3 days).
 * A Merkle root is only a usable promotion gate when every hashed input is a
 * pure function of the commit. Until S319 two independent inputs were not, and
 * the release candidate was therefore unpromotable by construction:
 *
 *   1. OBSERVED leaves. `api/uptime.json` and `api/worker-route-provenance.json`
 *      are live measurements rewritten hourly by `.github/workflows/uptime-probe.yml`
 *      — the same workflow run that rewrites THIS manifest and `api/release-proof.json`,
 *      the receipt that judges it. The candidate was invalidated and re-judged in
 *      one commit, every hour. They now hash into `observedRoot` and are excluded
 *      from `root`; their bytes are still published, still hashed, still auditable.
 *
 *   2. VOLATILE FIELDS. `assets/shell-manifest.json`, `api/public-intelligence.json`
 *      and `api/build-sha.json` each carry a wall-clock stamp beside otherwise
 *      reproducible content. Measured live: two builds 21 minutes apart differed
 *      ONLY in `generatedAt` while `version`, `cacheName` and the whole asset map
 *      were byte-identical — and produced different roots. These leaves stay in
 *      `root`, hashed over a canonical form with the declared stamp removed, so
 *      the content that matters remains fully tamper-evident.
 *
 * Both exclusions are narrow, declared, and published on the receipt. Anything
 * not on these lists is hashed verbatim. See docs/AUDIT_2026-08-17.md item 1.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'candidate-artifact-manifest.json');
const SHELL_MANIFEST = path.join(ROOT, 'assets', 'shell-manifest.json');

/** Reproducible critical bytes. A pure function of the commit — hashed into `root`. */
export const CORE_PATHS = Object.freeze([
  'index.html',
  'status/index.html',
  'membership/index.html',
  'studio-pulse/index.html',
  'agents.json',
  '.well-known/llms.txt',
  'api/build-sha.json',
  'api/public-intelligence.json',
  'assets/shell-manifest.json',
  'assets/proof-card.js',
  'assets/proof-conversion-line.js',
  'assets/security-posture.js',
]);

/**
 * Live measurements. Their bytes are a function of the WORLD at probe time, not
 * of the commit, so they can never participate in a candidate-vs-staging byte
 * match. Hashed into `observedRoot` — published and tamper-evident, but unable
 * to invalidate a promotion.
 */
export const OBSERVED_PATHS = Object.freeze([
  'api/uptime.json',
  'api/worker-route-provenance.json',
]);

/**
 * Declared wall-clock stamps removed before hashing. Keys are leaf paths, values
 * are TOP-LEVEL JSON fields. Deliberately narrow: only fields proven to vary
 * between two builds of identical source. Never add a field that carries meaning.
 */
export const VOLATILE_FIELDS = Object.freeze({
  'assets/shell-manifest.json': Object.freeze(['generatedAt']),
  'api/public-intelligence.json': Object.freeze(['generatedAt']),
  'api/build-sha.json': Object.freeze(['builtAt']),
});

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalize = (relative) => relative.replaceAll('\\', '/').replace(/^\/+/, '');

/**
 * Strip declared wall-clock fields before hashing. A leaf with no declared
 * volatile fields — and any leaf that does not parse as a JSON object — is
 * hashed verbatim, so a malformed or unexpected file can never be silently
 * canonicalised into agreement.
 */
export function canonicalizeLeaf(relative, bytes) {
  const fields = VOLATILE_FIELDS[normalize(relative)];
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (!fields || !fields.length) return buffer;
  let parsed;
  try { parsed = JSON.parse(buffer.toString('utf8')); } catch { return buffer; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return buffer;
  let removed = false;
  for (const field of fields) {
    if (Object.hasOwn(parsed, field)) { delete parsed[field]; removed = true; }
  }
  if (!removed) return buffer;
  return Buffer.from(JSON.stringify(parsed, null, 2), 'utf8');
}

export function leafHash(relative, contentHash, bytes) {
  return hash(`vaultspark:candidate-artifact:leaf:v1\0${normalize(relative)}\0${contentHash}\0${bytes}`);
}

export function merkleRoot(leaves) {
  if (!leaves.length) return hash('vaultspark:candidate-artifact:empty:v1');
  let level = leaves.map((leaf) => leaf.leafHash);
  while (level.length > 1) {
    const next = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] || left;
      next.push(hash(`vaultspark:candidate-artifact:node:v1\0${left}\0${right}`));
    }
    level = next;
  }
  return level[0];
}

function shellPaths() {
  const manifest = JSON.parse(fs.readFileSync(SHELL_MANIFEST, 'utf8'));
  const values = [];
  const walk = (value) => {
    if (typeof value === 'string' && /^assets\/.+\.shell-[a-f0-9]{10}\.(?:css|js)$/.test(value)) values.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(manifest);
  return values;
}

function toLeaves(files) {
  return [...files.entries()]
    .map(([relative, bytes]) => {
      const raw = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
      const canonical = canonicalizeLeaf(relative, raw);
      const contentHash = hash(canonical);
      const stripped = !canonical.equals(raw);
      return {
        path: normalize(relative),
        bytes: raw.byteLength,
        sha256: contentHash,
        leafHash: leafHash(relative, contentHash, canonical.byteLength),
        ...(stripped ? { volatileFieldsStripped: [...VOLATILE_FIELDS[normalize(relative)]] } : {}),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function buildManifest(files, candidateSha = null, generatedAt = null, observedFiles = new Map()) {
  const leaves = toLeaves(files);
  const observedLeaves = toLeaves(observedFiles);
  return {
    schemaVersion: '1.1',
    generatedBy: 'scripts/build-candidate-artifact-manifest.mjs',
    generatedAt,
    publicSafe: true,
    algorithm: {
      digest: 'SHA-256',
      leafDomain: 'vaultspark:candidate-artifact:leaf:v1',
      nodeDomain: 'vaultspark:candidate-artifact:node:v1',
      ordering: 'path-ascending',
      oddLeaf: 'duplicate-last',
    },
    // The exclusions are part of the public contract: a reader can see exactly
    // how wide they are and verify that nothing else was quietly dropped.
    reproducibility: {
      rootCoversCommitDerivedBytesOnly: true,
      observedPaths: [...OBSERVED_PATHS],
      observedReason: 'live measurements rewritten on a schedule by .github/workflows/uptime-probe.yml; a function of the world at probe time, not of the commit',
      volatileFields: Object.fromEntries(Object.entries(VOLATILE_FIELDS).map(([leaf, fields]) => [leaf, [...fields]])),
      volatileReason: 'wall-clock stamps removed before hashing so identical source cannot produce different roots; all remaining bytes stay tamper-evident',
    },
    candidateSha,
    root: merkleRoot(leaves),
    leafCount: leaves.length,
    totalBytes: leaves.reduce((sum, leaf) => sum + leaf.bytes, 0),
    leaves,
    observedRoot: merkleRoot(observedLeaves),
    observedLeafCount: observedLeaves.length,
    observedLeaves,
  };
}

/**
 * The manifest's own `generatedAt` must be reproducible too — this file is
 * byte-checked by build:check, so a wall-clock stamp here reintroduces exactly
 * the drift the root exclusions remove. Anchor it to the COMMIT time of the
 * candidate SHA: identical for every rebuild of the same commit, on any machine.
 */
function commitTime(sha) {
  if (!/^[0-9a-f]{40}$/i.test(sha || '')) return null;
  const result = spawnSync('git', ['show', '-s', '--format=%cI', sha], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true,
  });
  if (result.status !== 0) return null;
  const stamp = (result.stdout || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T/.test(stamp)) return null;
  return stamp.endsWith('Z') ? stamp.slice(0, -1) + '+00:00' : stamp;
}

function readBuildIdentity() {
  try {
    const payload = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'build-sha.json'), 'utf8'));
    const sha = /^[0-9a-f]{40}$/i.test(payload.sha) ? payload.sha : null;
    // Never payload.builtAt — that is the wall-clock field this fix exists to remove.
    return { sha, generatedAt: commitTime(sha) || payload.generatedAt || null };
  } catch {
    return { sha: null, generatedAt: null };
  }
}

function readAll(paths) {
  const files = new Map();
  for (const relative of paths) {
    const absolute = path.resolve(ROOT, relative);
    if (!absolute.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(absolute)) throw new Error(`critical artifact missing or outside root: ${relative}`);
    files.set(relative, fs.readFileSync(absolute));
  }
  return files;
}

function buildFromRepo() {
  const sourcePaths = [...new Set([...CORE_PATHS, ...shellPaths()])].sort();
  const overlap = sourcePaths.filter((relative) => OBSERVED_PATHS.includes(relative));
  if (overlap.length) throw new Error(`path is both source and observed: ${overlap.join(', ')}`);
  const build = readBuildIdentity();
  return buildManifest(readAll(sourcePaths), build.sha, build.generatedAt, readAll([...OBSERVED_PATHS]));
}

function selfTest() {
  const files = new Map([['b.txt', 'beta'], ['a.txt', 'alpha'], ['c.txt', 'gamma']]);
  const reordered = new Map([...files.entries()].reverse());
  const observed = '2026-07-25T00:00:00Z';
  const first = buildManifest(files, 'a'.repeat(40), observed);
  const second = buildManifest(reordered, 'a'.repeat(40), observed);
  const tampered = buildManifest(new Map([['b.txt', 'BETA'], ['a.txt', 'alpha'], ['c.txt', 'gamma']]), 'a'.repeat(40), observed);
  const removed = buildManifest(new Map([['a.txt', 'alpha'], ['c.txt', 'gamma']]), 'a'.repeat(40), observed);
  // --- S319 reproducibility fixtures -------------------------------------
  // A volatile-field leaf whose declared stamp moves but whose real content is
  // identical must NOT move the root; a leaf whose real content moves MUST.
  const shellAt = (stamp, version) => JSON.stringify({ schemaVersion: '1.0', generatedAt: stamp, version }, null, 2);
  const withShell = (stamp, version) => new Map([['assets/shell-manifest.json', shellAt(stamp, version)]]);
  const shellBase = buildManifest(withShell('2026-01-01T00:00:00Z', 'v1'), null, observed);
  const shellStampMoved = buildManifest(withShell('2026-06-06T12:34:56Z', 'v1'), null, observed);
  const shellContentMoved = buildManifest(withShell('2026-01-01T00:00:00Z', 'v2'), null, observed);
  // An undeclared leaf carrying the same field name must still be hashed verbatim.
  const undeclared = (stamp) => new Map([['api/other.json', JSON.stringify({ generatedAt: stamp }, null, 2)]]);
  const undeclaredA = buildManifest(undeclared('2026-01-01T00:00:00Z'), null, observed);
  const undeclaredB = buildManifest(undeclared('2026-06-06T12:34:56Z'), null, observed);
  // Malformed JSON must never be canonicalised into agreement.
  const malformed = (body) => new Map([['assets/shell-manifest.json', body]]);
  const malformedA = buildManifest(malformed('{not json'), null, observed);
  const malformedB = buildManifest(malformed('{also not json'), null, observed);
  // Observed leaves are published and hashed, but sit outside `root`.
  const observedFiles = (body) => new Map([['api/uptime.json', body]]);
  const obsA = buildManifest(files, null, observed, observedFiles('{"overall":"up"}'));
  const obsB = buildManifest(files, null, observed, observedFiles('{"overall":"down"}'));

  const cases = [
    ['deterministic across input order', first.root === second.root],
    ['leaves sort by path', first.leaves.map((leaf) => leaf.path).join(',') === 'a.txt,b.txt,c.txt'],
    ['one-byte-domain tamper changes root', first.root !== tampered.root],
    ['missing leaf changes root and cardinality', first.root !== removed.root && removed.leafCount === 2],
    ['root is SHA-256', /^[0-9a-f]{64}$/.test(first.root)],
    ['candidate SHA is metadata, not fabricated', first.candidateSha === 'a'.repeat(40)],
    ['generatedAt is source-derived, not wall-clock drift', first.generatedAt === observed && first.generatedAt === second.generatedAt],
    // The fix: a moved stamp is inert, and that inertness is declared.
    ['declared volatile stamp does not move the root', shellBase.root === shellStampMoved.root],
    ['volatile stripping is declared on the leaf', shellBase.leaves[0].volatileFieldsStripped?.join(',') === 'generatedAt'],
    ['raw byte length is still reported for a stripped leaf', shellBase.leaves[0].bytes === Buffer.byteLength(shellAt('2026-01-01T00:00:00Z', 'v1'))],
    // The fix is exactly this wide and no wider.
    ['real content change still moves the root', shellBase.root !== shellContentMoved.root],
    ['same field name on an undeclared leaf is hashed verbatim', undeclaredA.root !== undeclaredB.root],
    ['malformed JSON is hashed verbatim, never canonicalised', malformedA.root !== malformedB.root],
    // Observed leaves: published, hashed, and unable to invalidate a promotion.
    ['observed churn leaves the promotion root untouched', obsA.root === obsB.root],
    ['observed churn does move the observed root', obsA.observedRoot !== obsB.observedRoot],
    ['observed leaves are still published, not dropped', obsA.observedLeafCount === 1 && obsA.observedLeaves[0].path === 'api/uptime.json'],
    ['observed and source path sets are disjoint', !CORE_PATHS.some((p) => OBSERVED_PATHS.includes(p))],
    ['every cron-owned leaf is classified observed', ['api/uptime.json', 'api/worker-route-provenance.json'].every((p) => OBSERVED_PATHS.includes(p))],
  ];
  for (const [name, ok] of cases) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`candidate-artifact-manifest self-test: ${cases.length}/${cases.length}`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const manifest = buildFromRepo();
  const content = JSON.stringify(manifest, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (actual !== content) {
      console.error('candidate-artifact-manifest: drifted; rebuild the candidate artifact graph');
      process.exit(1);
    }
  } else {
    fs.writeFileSync(OUT, content);
  }
  console.log(`candidate-artifact-manifest: ${manifest.root.slice(0, 12)} (${manifest.leafCount} leaves, ${manifest.totalBytes} bytes)`);
}

if (import.meta.main ?? process.argv[1]?.endsWith('build-candidate-artifact-manifest.mjs')) main();
