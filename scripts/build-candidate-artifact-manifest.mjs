#!/usr/bin/env node
/**
 * Deterministic candidate artifact Merkle manifest.
 *
 * The build SHA identifies intent; this manifest identifies the exact critical
 * bytes served to humans and agents. It excludes itself and downstream release
 * receipts, avoiding a self-referential hash graph.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'candidate-artifact-manifest.json');
const SHELL_MANIFEST = path.join(ROOT, 'assets', 'shell-manifest.json');

export const CORE_PATHS = Object.freeze([
  'index.html',
  'status/index.html',
  'membership/index.html',
  'studio-pulse/index.html',
  'agents.json',
  '.well-known/llms.txt',
  'api/build-sha.json',
  'api/public-intelligence.json',
  'api/uptime.json',
  'api/worker-route-provenance.json',
  'assets/shell-manifest.json',
  'assets/proof-card.js',
  'assets/proof-conversion-line.js',
  'assets/security-posture.js',
]);

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalize = (relative) => relative.replaceAll('\\', '/').replace(/^\/+/, '');

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

export function buildManifest(files, candidateSha = null, generatedAt = null) {
  const leaves = [...files.entries()]
    .map(([relative, bytes]) => {
      const content = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
      const contentHash = hash(content);
      return { path: normalize(relative), bytes: content.byteLength, sha256: contentHash, leafHash: leafHash(relative, contentHash, content.byteLength) };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
  return {
    schemaVersion: '1.0',
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
    candidateSha,
    root: merkleRoot(leaves),
    leafCount: leaves.length,
    totalBytes: leaves.reduce((sum, leaf) => sum + leaf.bytes, 0),
    leaves,
  };
}

function readBuildIdentity() {
  try {
    const payload = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'build-sha.json'), 'utf8'));
    return {
      sha: /^[0-9a-f]{40}$/i.test(payload.sha) ? payload.sha : null,
      generatedAt: payload.builtAt || payload.generatedAt || null,
    };
  } catch {
    return { sha: null, generatedAt: null };
  }
}

function buildFromRepo() {
  const paths = [...new Set([...CORE_PATHS, ...shellPaths()])].sort();
  const files = new Map();
  for (const relative of paths) {
    const absolute = path.resolve(ROOT, relative);
    if (!absolute.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(absolute)) throw new Error(`critical artifact missing or outside root: ${relative}`);
    files.set(relative, fs.readFileSync(absolute));
  }
  const build = readBuildIdentity();
  return buildManifest(files, build.sha, build.generatedAt);
}

function selfTest() {
  const files = new Map([['b.txt', 'beta'], ['a.txt', 'alpha'], ['c.txt', 'gamma']]);
  const reordered = new Map([...files.entries()].reverse());
  const observed = '2026-07-25T00:00:00Z';
  const first = buildManifest(files, 'a'.repeat(40), observed);
  const second = buildManifest(reordered, 'a'.repeat(40), observed);
  const tampered = buildManifest(new Map([['b.txt', 'BETA'], ['a.txt', 'alpha'], ['c.txt', 'gamma']]), 'a'.repeat(40), observed);
  const removed = buildManifest(new Map([['a.txt', 'alpha'], ['c.txt', 'gamma']]), 'a'.repeat(40), observed);
  const cases = [
    ['deterministic across input order', first.root === second.root],
    ['leaves sort by path', first.leaves.map((leaf) => leaf.path).join(',') === 'a.txt,b.txt,c.txt'],
    ['one-byte-domain tamper changes root', first.root !== tampered.root],
    ['missing leaf changes root and cardinality', first.root !== removed.root && removed.leafCount === 2],
    ['root is SHA-256', /^[0-9a-f]{64}$/.test(first.root)],
    ['candidate SHA is metadata, not fabricated', first.candidateSha === 'a'.repeat(40)],
    ['generatedAt is source-derived, not wall-clock drift', first.generatedAt === observed && first.generatedAt === second.generatedAt],
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
