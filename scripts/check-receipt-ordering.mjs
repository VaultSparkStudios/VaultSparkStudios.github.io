#!/usr/bin/env node
/**
 * Final-tree proof ordering gate. Visual and mobile receipts only prove the
 * bytes they observed, so this runs after generators and rejects later changes.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { candidateBinding, sourceBinding } = require('./lib/mobile-runtime-contract.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function validateProofBinding(receipt, { root, label, currentCandidate = candidateBinding(root) }) {
  const errors = [];
  const files = Array.isArray(receipt?.source?.files) ? receipt.source.files : [];
  const entries = Array.isArray(receipt?.source?.entries) ? receipt.source.entries : [];
  if (!files.length) return [label + ': source.files is missing'];
  if (!entries.length) return [label + ': source.entries is missing; regenerate the receipt with per-file proof'];

  const normalizedFiles = files.map((file) => file.replaceAll('\\', '/'));
  const entryMap = new Map(entries.map((entry) => [entry?.path?.replaceAll('\\', '/'), entry?.sha256]));
  for (const normalized of normalizedFiles) {
    const absolute = path.resolve(root, normalized);
    if (!absolute.startsWith(path.resolve(root) + path.sep)) {
      errors.push(label + ': ' + normalized + ': source path escapes project root');
    } else if (!fs.existsSync(absolute)) {
      errors.push(label + ': ' + normalized + ': bound source is missing');
    } else if (!entryMap.has(normalized)) {
      errors.push(label + ': ' + normalized + ': per-file digest is missing');
    } else if (sha256File(absolute) !== entryMap.get(normalized)) {
      errors.push(label + ': ' + normalized + ': changed after receipt');
    }
  }
  for (const entry of entries) {
    const normalized = entry?.path?.replaceAll('\\', '/');
    if (!normalizedFiles.includes(normalized)) {
      errors.push(label + ': ' + (normalized || '<unknown>') + ': digest is not declared in source.files');
    }
  }

  if (!errors.length && receipt.source.sha256 !== sourceBinding(root, files).sha256) {
    errors.push(label + ': aggregate source digest is stale');
  }

  if (!receipt?.candidate) {
    errors.push(label + ': release-candidate binding is missing');
  } else {
    for (const field of ['manifest', 'manifestSha256', 'candidateSha', 'root']) {
      if ((receipt.candidate[field] ?? null) !== (currentCandidate[field] ?? null)) {
        errors.push(label + ': candidate.' + field + ' does not match the final candidate manifest');
      }
    }
  }
  return errors;
}

function selfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultspark-receipt-ordering-'));
  try {
    fs.mkdirSync(path.join(root, 'api'));
    fs.writeFileSync(path.join(root, 'a.txt'), 'alpha');
    fs.writeFileSync(path.join(root, 'b.txt'), 'beta');
    fs.writeFileSync(path.join(root, 'api', 'candidate-artifact-manifest.json'), JSON.stringify({ candidateSha: 'a'.repeat(40), root: '1'.repeat(64) }));
    const receipt = { source: sourceBinding(root, ['a.txt']), candidate: candidateBinding(root) };
    const validate = () => validateProofBinding(receipt, { root, label: 'fixture' });
    if (validate().length) throw new Error('fresh receipt rejected');

    fs.writeFileSync(path.join(root, 'b.txt'), 'unrelated mutation');
    if (validate().length) throw new Error('unrelated source mutation rejected');

    fs.writeFileSync(path.join(root, 'a.txt'), 'built after receipt');
    if (!validate().some((error) => error.includes('a.txt: changed after receipt'))) {
      throw new Error('bound source mutation was not diagnosed by exact path');
    }
    fs.writeFileSync(path.join(root, 'a.txt'), 'alpha');

    fs.writeFileSync(path.join(root, 'api', 'candidate-artifact-manifest.json'), JSON.stringify({ candidateSha: 'b'.repeat(40), root: '2'.repeat(64) }));
    if (!validate().some((error) => error.includes('candidate.manifestSha256'))) {
      throw new Error('candidate mutation was not rejected');
    }

    const legacy = structuredClone(receipt);
    delete legacy.source.entries;
    if (!validateProofBinding(legacy, { root, label: 'legacy' }).some((error) => error.includes('source.entries'))) {
      throw new Error('legacy aggregate-only receipt accepted');
    }
    console.log('check-receipt-ordering: self-test passed · bound mutation rejected · unrelated mutation accepted · candidate mutation rejected');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function liveCheck() {
  const proofs = [
    ['visual', path.join(ROOT, 'docs', 'visual-qa', 'LATEST.json')],
    ['mobile', path.join(ROOT, 'docs', 'mobile-audit', 'receipt.json')],
  ];
  const currentCandidate = candidateBinding(ROOT);
  const errors = proofs.flatMap(([label, file]) => validateProofBinding(readJson(file), { root: ROOT, label, currentCandidate }));
  if (errors.length) {
    console.error('check-receipt-ordering: FAIL (' + errors.length + ')');
    for (const error of errors) console.error('  - ' + error);
    process.exit(1);
  }
  console.log('check-receipt-ordering: passed · ' + proofs.length + ' receipts match final tree and candidate ' + currentCandidate.root.slice(0, 12));
}

if (process.argv.includes('--self-test')) selfTest();
else liveCheck();
