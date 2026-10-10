#!/usr/bin/env node
/**
 * Final-tree proof ordering gate. Visual and mobile receipts only prove the
 * bytes they observed, so this runs after generators and rejects later changes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';

const require = createRequire(import.meta.url);
const { bindingDigest, candidateBinding, routineRegionDigest, sourceBinding } = require('./lib/mobile-runtime-contract.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/**
 * S373 (D-S373.6): proof that routine Desk content set aside by the binding is exactly
 * what the generator renders from the committed Desk data. `generate-news-pages --check`
 * compares every news page byte-for-byte with its own output, and the generator is a
 * bound source of the receipt. No generator, or a failing check, is NOT a pass.
 */
export function proveRoutineByGenerator(root) {
  const generator = path.join(root, 'scripts', 'generate-news-pages.mjs');
  if (!fs.existsSync(generator)) return { ok: false, detail: 'scripts/generate-news-pages.mjs is not present to prove it' };
  const run = spawnSync(process.execPath, [generator, '--check'], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (run.status === 0) return { ok: true, detail: 'generate-news-pages --check passed' };
  return { ok: false, detail: 'generate-news-pages --check failed: ' + String(run.stderr || run.stdout || '').trim().split(/\r?\n/).pop() };
}

export function validateProofBinding(receipt, { root, label, currentCandidate = candidateBinding(root), proveRoutine = proveRoutineByGenerator, notes = [] }) {
  const errors = [];
  const files = Array.isArray(receipt?.source?.files) ? receipt.source.files : [];
  const entries = Array.isArray(receipt?.source?.entries) ? receipt.source.entries : [];
  if (!files.length) return [label + ': source.files is missing'];
  if (!entries.length) return [label + ': source.entries is missing; regenerate the receipt with per-file proof'];

  const normalizedFiles = files.map((file) => file.replaceAll('\\', '/'));
  const entryMap = new Map(entries.map((entry) => [entry?.path?.replaceAll('\\', '/'), entry?.sha256]));
  const routineAtReview = new Map(entries.filter((entry) => entry?.routineRegionSha256).map((entry) => [entry.path.replaceAll('\\', '/'), entry.routineRegionSha256]));
  const routineNow = [];
  for (const normalized of normalizedFiles) {
    const absolute = path.resolve(root, normalized);
    if (!absolute.startsWith(path.resolve(root) + path.sep)) {
      errors.push(label + ': ' + normalized + ': source path escapes project root');
    } else if (!fs.existsSync(absolute)) {
      errors.push(label + ': ' + normalized + ': bound source is missing');
    } else if (!entryMap.has(normalized)) {
      errors.push(label + ': ' + normalized + ': per-file digest is missing');
    } else if (bindingDigest(root, normalized) !== entryMap.get(normalized)) {
      errors.push(label + ': ' + normalized + ': changed after receipt');
    } else {
      const current = routineRegionDigest(normalized, fs.readFileSync(absolute));
      if (current) routineNow.push([normalized, current]);
    }
  }

  // Every byte is either hashed above or proven derived here. The block is only ever
  // set aside when the generator vouches for the whole page; otherwise this receipt
  // fails, which forces the same re-review a whole-page hash would have.
  if (routineNow.length) {
    const proof = proveRoutine(root, routineNow.map(([file]) => file));
    if (!proof?.ok) {
      errors.push(label + ': routine Desk content in ' + routineNow.length + ' bound article(s) is not proven generator output (' + (proof?.detail || 'no proof') + ')');
    } else {
      for (const [file, current] of routineNow) {
        if (!routineAtReview.has(file)) {
          errors.push(label + ': ' + file + ': receipt predates routine-region binding; regenerate the receipt');
        } else if (routineAtReview.get(file) !== current) {
          notes.push(label + ': ' + file + ': routine Desk content changed since review (proven generator output, not re-reviewed)');
        }
      }
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
    // D-S373.6: routine Desk content inside a reviewed article.
    const article = 'news/2026-01-02/a-story/index.html';
    const page = (cards, body = 'reviewed body') => '<html><body><article>' + body + '</article><section class="desk-more" aria-labelledby="t"><ul>' + cards + '</ul></section><footer>f</footer></body></html>';
    fs.mkdirSync(path.join(root, path.dirname(article)), { recursive: true });
    fs.writeFileSync(path.join(root, article), page('<li>edition one</li>'));
    const desk = { source: sourceBinding(root, ['a.txt', article]), candidate: candidateBinding(root) };
    if (!desk.source.entries.find((entry) => entry.path === article)?.routineRegionSha256) throw new Error('routine block digest was not recorded at review');
    let proofCalls = 0;
    const proven = () => { proofCalls += 1; return { ok: true, detail: 'fixture' }; };
    const refuted = () => ({ ok: false, detail: 'fixture generator mismatch' });
    const check = (proveRoutine, notes = []) => validateProofBinding(desk, { root, label: 'desk', proveRoutine, notes });

    if (check(proven).length) throw new Error('fresh Desk receipt rejected');
    const plainCalls = proofCalls;
    validateProofBinding(receipt, { root, label: 'fixture', proveRoutine: proven });
    if (proofCalls !== plainCalls) throw new Error('generator proof was demanded for a receipt with no routine content');

    // Routine publish: the block changes, the generator vouches for it → valid, and visible.
    fs.writeFileSync(path.join(root, article), page('<li>edition two</li><li>new art</li>'));
    const drift = [];
    if (check(proven, drift).length) throw new Error('proven routine content wrongly invalidated the receipt — the S372 failure is back');
    if (drift.length !== 1 || !drift[0].includes('changed since review')) throw new Error('routine drift was accepted silently instead of being reported');

    // The same bytes without proof are NOT accepted: nothing is merely left out.
    if (!check(refuted).some((error) => error.includes('not proven generator output'))) throw new Error('unproven routine content was accepted');
    // No generator at all is a failure, never a pass.
    if (proveRoutineByGenerator(root).ok) throw new Error('a missing generator was treated as proof');

    // Reviewed content outside the block still fails, proof or not.
    fs.writeFileSync(path.join(root, article), page('<li>edition two</li>', 'edited after review'));
    if (!check(proven).some((error) => error.includes(article + ': changed after receipt'))) throw new Error('a change outside the routine block was not rejected');

    // Anything but exactly one block is hashed whole.
    const twoBlocks = page('<li>one</li>') .replace('<footer>', '<section class="desk-more"><ul><li>second</li></ul></section><footer>');
    fs.writeFileSync(path.join(root, article), twoBlocks);
    const whole = { source: sourceBinding(root, [article]), candidate: candidateBinding(root) };
    if (whole.source.entries[0].routineRegionSha256) throw new Error('an ambiguous page was treated as having a routine block');
    fs.writeFileSync(path.join(root, article), twoBlocks.replace('<li>one</li>', '<li>changed</li>'));
    if (!validateProofBinding(whole, { root, label: 'whole', proveRoutine: proven }).some((error) => error.includes('changed after receipt'))) throw new Error('an ambiguous page was not hashed whole');

    // A receipt written before this rule cannot ride on it.
    fs.writeFileSync(path.join(root, article), page('<li>edition one</li>'));
    const predates = { source: sourceBinding(root, [article]), candidate: candidateBinding(root) };
    delete predates.source.entries[0].routineRegionSha256;
    if (!validateProofBinding(predates, { root, label: 'old', proveRoutine: proven }).some((error) => error.includes('predates routine-region binding'))) throw new Error('a receipt without the routine digest was accepted');

    console.log('check-receipt-ordering: self-test passed · bound mutation rejected · unrelated mutation accepted · candidate mutation rejected · routine Desk content accepted only when proven, reported when changed');
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
  const notes = [];
  const errors = proofs.flatMap(([label, file]) => validateProofBinding(readJson(file), { root: ROOT, label, currentCandidate, notes }));
  if (errors.length) {
    console.error('check-receipt-ordering: FAIL (' + errors.length + ')');
    for (const error of errors) console.error('  - ' + error);
    process.exit(1);
  }
  // Routine drift is stated, never hidden: a green line must not imply a re-review.
  for (const note of notes) console.log('  note: ' + note);
  console.log('check-receipt-ordering: passed · ' + proofs.length + ' receipts match final tree and candidate ' + currentCandidate.root.slice(0, 12)
    + (notes.length ? ' · ' + notes.length + ' bound article(s) carry newer routine Desk content, proven generator output' : ''));
}

if (process.argv.includes('--self-test')) selfTest();
else liveCheck();
