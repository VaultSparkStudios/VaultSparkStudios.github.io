// Capture-time evidence and immutable publication. Historical receipt readers stay unchanged.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { writeTextArtifact } from './artifact-io.mjs';
const require = createRequire(import.meta.url);
const { sourceBinding, candidateBinding } = require('./mobile-runtime-contract.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const runPattern = /^\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-f0-9]{16}$/;
const filePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*\.png$/;

function ownedPath(root, file) {
  const base = path.resolve(root), absolute = path.resolve(file);
  if (!absolute.startsWith(base + path.sep)) throw new Error('Capture path must stay inside its project');
  let current = base;
  for (const part of path.relative(base, absolute).split(path.sep)) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Capture path must not traverse a symlink');
  }
  return absolute;
}

function sourcePaths(root, files) {
  if (!Array.isArray(files) || !files.length) throw new Error('Capture source files are required');
  for (const file of files) {
    if (typeof file !== 'string' || path.isAbsolute(file) || file.split(/[\\/]/).some(part => part === '..')) throw new Error('Invalid capture source path');
    ownedPath(root, path.join(root, file));
  }
}

function regularFile(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Capture evidence must be a regular file');
  return fs.readFileSync(file);
}

export function beginVisualCapture(root, files, producer) {
  sourcePaths(root, files);
  const startedAt = new Date().toISOString();
  return {
    version: 1,
    runId: startedAt.replace(/[:.]/g, '-') + '-' + crypto.randomBytes(8).toString('hex'),
    producer, startedAt,
    source: sourceBinding(root, files), candidate: candidateBinding(root),
  };
}

export function createVisualCaptureDirectory(root, base, provenance) {
  if (!runPattern.test(provenance?.runId || '')) throw new Error('Invalid capture run identity');
  const directory = ownedPath(root, path.join(base, 'runs', provenance.runId));
  fs.mkdirSync(path.dirname(directory), { recursive: true });
  fs.mkdirSync(directory);
  return directory;
}

export function assertVisualCaptureCurrent(root, provenance, files = provenance?.source?.files) {
  if (provenance?.version !== 1 || !runPattern.test(provenance.runId || '') ||
      !Number.isFinite(Date.parse(provenance.startedAt)) || !provenance.producer ||
      !provenance.source?.files?.length || !provenance.source?.entries?.length ||
      !provenance.candidate?.manifestSha256 || !provenance.candidate?.root) {
    throw new Error('Capture-time provenance missing or invalid; recapture required');
  }
  sourcePaths(root, files);
  if (!same(sourceBinding(root, files), provenance.source) ||
      !same(candidateBinding(root), provenance.candidate)) {
    throw new Error('Capture-time source/candidate drift; recapture required');
  }
}

export function writeVisualCapture(file, bytes) {
  if (!filePattern.test(path.basename(file))) throw new Error('Invalid capture filename');
  fs.writeFileSync(file, bytes, { flag: 'wx' });
  return hash(bytes);
}

export function validateVisualCapture(root, directory, manifest, files) {
  ownedPath(root, directory);
  const provenance = manifest?.captureProvenance;
  assertVisualCaptureCurrent(root, provenance, files);
  if (!Number.isFinite(Date.parse(manifest.capturedAt)) ||
      Date.parse(manifest.capturedAt) < Date.parse(provenance.startedAt) ||
      !Array.isArray(manifest.shots) || !manifest.shots.length) {
    throw new Error('Capture manifest is incomplete');
  }
  const names = new Set();
  const images = manifest.shots.map(shot => {
    if (!filePattern.test(shot.file || '') || names.has(shot.file) || !/^[a-f0-9]{64}$/.test(shot.sha256 || '')) {
      throw new Error('Capture image identity missing, duplicated or invalid');
    }
    names.add(shot.file);
    const bytes = regularFile(path.join(directory, shot.file));
    if (hash(bytes) !== shot.sha256) throw new Error('Capture image hash mismatch; recapture required');
    return { file: shot.file, publishedFile: provenance.runId + '--' + shot.file, bytes, sha256: shot.sha256 };
  });
  return images;
}

export function sealVisualCapture(root, directory, provenance, shots, files) {
  const manifest = { capturedAt: new Date().toISOString(), captureProvenance: provenance, shots };
  validateVisualCapture(root, directory, manifest, files);
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}

// All canonical capture/review writers hold this from receipt read through replacement.
export function acquireVisualPublicationLock(root) {
  const receiptDir = ownedPath(root, path.join(root, 'docs', 'visual-qa'));
  fs.mkdirSync(receiptDir, { recursive: true });
  const lock = path.join(receiptDir, '.capture-publication.lock');
  const fd = fs.openSync(lock, 'wx');
  return () => { fs.closeSync(fd); fs.unlinkSync(lock); };
}

// Validate every input/destination before any copy; serialize these producers' pointer writes.
export function publishVisualCapture(root, directory, manifest, receipt, receiptName = 'LATEST.json', files) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(receiptName)) throw new Error('Invalid receipt filename');
  const images = validateVisualCapture(root, directory, manifest, files);
  const provenance = manifest.captureProvenance;
  if (!same(receipt.source, provenance.source) || !same(receipt.candidate, provenance.candidate) ||
      receipt.capturedAt !== manifest.capturedAt || receipt.captures?.length !== images.length ||
      receipt.captures.some((capture, i) => capture.file !== images[i].publishedFile || capture.sha256 !== images[i].sha256)) {
    throw new Error('Receipt does not preserve capture-time evidence');
  }
  const receiptDir = path.join(root, 'docs', 'visual-qa');
  ownedPath(root, receiptDir);
  const checkDestinations = () => {
    for (const image of images) {
      const dest = path.join(receiptDir, image.publishedFile);
      if (fs.existsSync(dest) && hash(regularFile(dest)) !== image.sha256) throw new Error('Immutable capture destination collision');
    }
  };
  checkDestinations();
  fs.mkdirSync(receiptDir, { recursive: true });
  const release = acquireVisualPublicationLock(root);
  try {
    checkDestinations();
    assertVisualCaptureCurrent(root, provenance, files);
    const target = path.join(receiptDir, receiptName);
    const prior = fs.existsSync(target) ? regularFile(target) : null;
    const assertPointerUnchanged = () => {
      const current = fs.existsSync(target) ? regularFile(target) : null;
      if (prior === null ? current !== null : current === null || !current.equals(prior)) {
        throw new Error('Receipt pointer changed during publication; retry without discarding its current review');
      }
    };
    const archive = prior ? path.join(receiptDir, 'history--' + receiptName.slice(0, -5) + '--' + hash(prior) + '.json') : null;
    if (archive && fs.existsSync(archive) && !regularFile(archive).equals(prior)) throw new Error('Receipt preimage archive collision');
    for (const image of images) {
      const dest = path.join(receiptDir, image.publishedFile);
      if (!fs.existsSync(dest)) fs.writeFileSync(dest, image.bytes, { flag: 'wx' });
    }
    assertVisualCaptureCurrent(root, provenance, files);
    assertPointerUnchanged();
    if (prior) {
      if (!fs.existsSync(archive)) fs.writeFileSync(archive, prior, { flag: 'wx' });
    }
    assertPointerUnchanged();
    // Smaller focused matrices are legitimate: exact prior bytes are archived above.
    writeTextArtifact(target, JSON.stringify(receipt, null, 2) + '\n', { guard: false });
  } finally {
    release();
  }
}
