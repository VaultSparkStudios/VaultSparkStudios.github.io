#!/usr/bin/env node
/** Transfer a validated Desk index to a separate, non-authoring publication job.
 * Reuses Git's binary patch format and archive path admission. The consumer
 * executes only source-checkout tooling, never a script from the artifact.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { assertArchivePath } from './lib/staging-archive.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const MAX_PATCH_BYTES = 150 * 1024 * 1024;
const exactPaths = new Set([
  'index.html', 'data/lqip-map.json', 'api/news-desk.json', 'api/news-desk-feed.json',
  'api/news-desk-claims.ndjson', 'api/news-desk-search.json', 'api/news-desk-stats.json',
  'api/news-desk-freshness.json', 'api/news-desk-reactions.json', 'api/news-desk-engagement.json',
  'api/news-visual-receipts.json', 'api/news-critique-packets.json', 'api/newsroom-run.json',
  'api/candidate-artifact-manifest.json', 'api/deploy-currency.json', 'api/release-proof.json',
  'api/status-proof.json', 'api/citation.json', 'api/intent-map.json', 'api/studio-timeline.json',
  'data/stats-surface.json', 'stats.json', 'api/ecosystem-stats.json', 'sitemap.xml',
  'sitemap-page/index.html', 'assets/shell-manifest.json', 'sw.js', 'data/news-desk-engagement-history.ndjson',
]);

export function allowedDeskPublicationPath(name) {
  try { assertArchivePath(name); } catch { return false; }
  return exactPaths.has(name)
    || /^api\/news-desk-search-\d{4}-\d{2}\.json$/.test(name)
    || /^data\/news-desk\/[A-Za-z0-9_./-]+\.(?:json|ndjson|png|webp|avif|svg)$/.test(name)
    || /^assets\/og\/news\/[A-Za-z0-9_.-]+\.(?:png|webp|avif|svg)$/.test(name)
    || /^news\/(?:[A-Za-z0-9_-]+\/)*(?:index\.html|critique\.json)$/.test(name);
}

const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function git(root, args) {
  const r = spawnSync('git', args, { cwd: root, windowsHide: true, maxBuffer: MAX_PATCH_BYTES + 1024 });
  if (r.status !== 0) throw Error(`Desk publication Git operation failed: ${args[0]}`);
  return r.stdout;
}
function names(bytes) { return bytes.toString('utf8').split('\0').filter(Boolean); }
export function patchPaths(bytes) {
  return names(bytes).map((row) => {
    const match = /^(?:\d+|-)\t(?:\d+|-)\t(.+)$/.exec(row);
    if (!match || !allowedDeskPublicationPath(match[1])) throw Error('Desk patch contains an unsupported path');
    return match[1];
  }).sort();
}
function assertPathSet(actual, expected) {
  if (!actual.length || actual.length > 10000 || new Set(actual).size !== actual.length
    || JSON.stringify(actual) !== JSON.stringify(expected)) throw Error('Desk publication path set mismatch');
}
function regular(file, limit) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > limit) throw Error('Unsafe Desk artifact file');
  return fs.readFileSync(file);
}

function assertTransferredModes(root, patchFile, files) {
  const selected = new Set(files);
  for (const entry of names(git(root, ['ls-files', '--stage', '-z']))) {
    const match = /^(\d{6}) [0-9a-f]{40} (\d)\t(.+)$/.exec(entry);
    if (!match) throw Error('Unsupported Desk index entry');
    if (selected.has(match[3]) && (match[1] !== '100644' || match[2] !== '0')) throw Error('Desk publication requires regular nonexecutable files');
  }
  // Ask Git how it interprets the patch rather than trusting the producer's
  // manifest. This is read-only; reject mode changes, links and gitlinks before
  // --apply can touch the real index/worktree. Renames are not in this protocol.
  const summary = git(root, ['apply', '--summary', patchFile]).toString('utf8');
  for (const row of summary.split('\n').filter(Boolean)) {
    const match = /^ (?:create|delete) mode 100644 (.+)$/.exec(row);
    if (!match || !selected.has(match[1])) throw Error('Desk publication requires regular nonexecutable files');
  }
}

export function captureDeskPublication({ root = ROOT, output }) {
  const baseSha = git(root, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const files = names(git(root, ['diff', '--cached', '--name-only', '--no-renames', '-z'])).sort();
  if (files.some((file) => !allowedDeskPublicationPath(file))) throw Error('Desk index contains a non-publication path');
  const modes = names(git(root, ['diff', '--cached', '--raw', '--no-renames', '-z']));
  for (let i = 0; i < modes.length; i += 2) {
    // Never transfer symlinks, submodules or executable blobs, even at allowed names.
    if (!/^:100644 (?:100644|000000) |^:000000 100644 /.test(modes[i])) throw Error('Desk publication requires regular nonexecutable files');
  }
  const patch = git(root, ['diff', '--cached', '--binary', '--full-index', '--no-renames']);
  if (patch.length > MAX_PATCH_BYTES) throw Error('Desk publication exceeds the artifact bound');
  fs.mkdirSync(output, { recursive: true });
  const patchFile = path.join(output, 'candidate.patch');
  fs.writeFileSync(patchFile, patch);
  assertPathSet(patchPaths(git(root, ['apply', '--numstat', '-z', patchFile])), files);
  const manifest = { schemaVersion: 1, baseSha, patchSha256: hash(patch), files };
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'manifest.json'), bytes);
  return { manifestSha256: hash(bytes), files: files.length };
}

export function applyDeskPublication({ root = ROOT, input, expectedManifestSha256 }) {
  if (!/^[0-9a-f]{64}$/.test(expectedManifestSha256 || '')) throw Error('Desk manifest hash is required');
  const manifestBytes = regular(path.join(input, 'manifest.json'), 2 * 1024 * 1024);
  if (hash(manifestBytes) !== expectedManifestSha256) throw Error('Desk publication manifest digest mismatch');
  const manifest = JSON.parse(manifestBytes);
  if (manifest.schemaVersion !== 1 || !/^[0-9a-f]{40}$/.test(manifest.baseSha)
    || !/^[0-9a-f]{64}$/.test(manifest.patchSha256) || !Array.isArray(manifest.files)
    || manifest.files.some((name) => !allowedDeskPublicationPath(name))) throw Error('Invalid Desk publication manifest');
  if (git(root, ['status', '--porcelain']).length) throw Error('Desk publication checkout must be clean');
  if (git(root, ['rev-parse', 'HEAD']).toString('utf8').trim() !== manifest.baseSha) throw Error('Desk publication base differs from validated source');
  const patchFile = path.join(input, 'candidate.patch');
  const patch = regular(patchFile, MAX_PATCH_BYTES);
  if (hash(patch) !== manifest.patchSha256) throw Error('Desk publication patch digest mismatch');
  assertPathSet(patchPaths(git(root, ['apply', '--numstat', '-z', patchFile])), manifest.files);
  assertTransferredModes(root, patchFile, manifest.files);
  git(root, ['apply', '--check', '--index', patchFile]);
  git(root, ['apply', '--index', patchFile]);
  assertPathSet(names(git(root, ['diff', '--cached', '--name-only', '--no-renames', '-z'])).sort(), manifest.files);
  return { files: manifest.files.length, baseSha: manifest.baseSha };
}

function main(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('Usage: desk-publication-artifact.mjs --capture --output <directory> | --apply --input <directory> --expected-manifest-sha256 <sha256>');
    return;
  }
  const flags = new Map();
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (flags.has(key) || !['--capture', '--apply', '--output', '--input', '--expected-manifest-sha256'].includes(key)) throw Error('Invalid Desk publication arguments');
    if (key === '--capture' || key === '--apply') flags.set(key, true);
    else { const value = args[++i]; if (!value || value.startsWith('-')) throw Error('Missing Desk publication argument'); flags.set(key, value); }
  }
  if (flags.has('--capture') && flags.size === 2 && flags.has('--output')) {
    const result = captureDeskPublication({ output: path.resolve(flags.get('--output')) });
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `manifest_sha256=${result.manifestSha256}\nready=yes\n`);
    console.log(`Desk publication captured: ${result.files} files · ${result.manifestSha256}`);
  } else if (flags.has('--apply') && flags.size === 3 && flags.has('--input') && flags.has('--expected-manifest-sha256')) {
    const result = applyDeskPublication({ input: path.resolve(flags.get('--input')), expectedManifestSha256: flags.get('--expected-manifest-sha256') });
    console.log(`Desk publication verified and staged: ${result.files} files`);
  } else throw Error('Invalid Desk publication mode');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
