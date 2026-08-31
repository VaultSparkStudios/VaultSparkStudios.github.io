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
    // Bind the PROMOTION content, not the churn around it (D-S333.18).
    //
    // This compared `manifestSha256` and `root` as well. Both move for reasons
    // that say nothing about what the proof attests: `root` folds in
    // cron-owned observed leaves, and `manifestSha256` hashes the manifest file
    // including its own `generatedAt`, so it changes on every regeneration even
    // when no content did. Measured in S333: regenerations with ZERO changed
    // leaves and an identical `candidateSha` invalidated both receipts
    // repeatedly, each time costing a 12-minute mobile audit and a 14-capture
    // review to re-assert something that had not changed.
    //
    // The manifest itself draws exactly this line — its self-test asserts
    // "observed churn leaves the promotion root untouched" — so binding the
    // churn discarded a distinction the producer had already made.
    //
    // Nothing is weakened: the per-file `source.entries` digests above are what
    // actually prove the tested pages are unmodified, and they are compared
    // byte-for-byte. `candidateSha` pins the promotion content those pages
    // belong to. A change to any tested file, or to promotion content, still
    // fails. Only observed-lane churn and a wall-clock stamp stop lying about it.
    if ((receipt.candidate.manifest ?? null) !== (currentCandidate.manifest ?? null)) {
      errors.push(label + ': candidate.manifest does not match the final candidate manifest');
    }
    if ((receipt.candidate.candidateSha ?? null) !== (currentCandidate.candidateSha ?? null)) {
      errors.push(label + ': candidate.candidateSha does not match the final candidate manifest');
    }
    // A receipt with no candidateSha at all predates the binding and cannot be
    // trusted to attest anything about a promotion candidate.
    if (!receipt.candidate.candidateSha) {
      errors.push(label + ': candidate.candidateSha is missing; regenerate the receipt');
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

    // D-S333.18: the binding follows PROMOTION content, so the two halves of
    // "the manifest changed" must now be told apart.
    const manifestPath = path.join(root, 'api', 'candidate-artifact-manifest.json');
    const sealed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // (a) Observed-lane churn and a fresh wall-clock stamp must be TOLERATED.
    //     Same promotion content, different file bytes — previously this was the
    //     false invalidation that forced a needless re-proof.
    fs.writeFileSync(manifestPath, JSON.stringify({
      ...sealed,
      generatedAt: '2099-01-01',
      observedRoot: '9'.repeat(64),
      root: '2'.repeat(64),
    }));
    if (validate().length) {
      throw new Error('observed churn / timestamp drift wrongly rejected — the false invalidation is back');
    }

    // (b) A change to the PROMOTION root must still be rejected.
    fs.writeFileSync(manifestPath, JSON.stringify({ ...sealed, candidateSha: 'b'.repeat(40) }));
    if (!validate().some((error) => error.includes('candidate.candidateSha'))) {
      throw new Error('promotion-candidate mutation was not rejected');
    }

    // (c) A receipt that predates the binding cannot silently pass.
    fs.writeFileSync(manifestPath, JSON.stringify(sealed));
    const unbound = structuredClone(receipt);
    delete unbound.candidate.candidateSha;
    if (!validateProofBinding(unbound, { root, label: 'unbound' }).some((error) => error.includes('candidateSha is missing'))) {
      throw new Error('receipt without a candidateSha was accepted');
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
