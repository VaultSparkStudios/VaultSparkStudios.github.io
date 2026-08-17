#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { sourceBinding } = require('./lib/mobile-runtime-contract.cjs');

const ROOT = process.cwd();
const RECEIPT_PATH = path.join(ROOT, 'docs', 'visual-qa', 'LATEST.json');

export function validateReceipt(receipt, { verifyFiles = false, root = ROOT } = {}) {
  const errors = [];
  const captures = Array.isArray(receipt?.captures) ? receipt.captures : [];
  if (receipt?.schemaVersion !== 1) errors.push('schemaVersion must remain 1 for canonical CANON-053 compatibility');
  if (receipt?.inspectionSchemaVersion < 2) errors.push('inspectionSchemaVersion must be at least 2');
  if (!captures.length) errors.push('captures must not be empty');
  const matrix = receipt?.matrix;
  if (!receipt?.source?.files?.length) errors.push('source binding is required');
  if (!matrix?.routes?.length || !matrix?.themes?.length || !matrix?.viewports?.length || !matrix?.states?.length) errors.push('declared route × theme × viewport × state matrix is required');
  else {
    const expected = matrix.routes.length * matrix.themes.length * matrix.viewports.length * matrix.states.length;
    if (matrix.expectedCaptures !== expected || matrix.completedCaptures !== captures.length) errors.push('matrix counts do not match declared dimensions/captures');
    const keys = new Set();
    for (const capture of captures) keys.add(`${capture.page}|${capture.theme}|${capture.viewportName}|${capture.state}`);
    if (keys.size !== expected) errors.push('route × theme × viewport × state matrix is incomplete or duplicated');
  }
  if (verifyFiles && receipt?.source?.files?.length && sourceBinding(root, receipt.source.files).sha256 !== receipt.source.sha256) errors.push('visual proof is stale for current bound source');

  let manual = 0;
  for (const capture of captures) {
    const mode = capture?.inspection?.mode;
    if (!['manual', 'automated-only'].includes(mode)) {
      errors.push(`${capture?.file || 'capture'}: inspection.mode must be manual or automated-only`);
    }
    if (mode === 'manual') {
      manual += 1;
      if (!capture.inspection.reviewer) errors.push(`${capture.file}: manual inspection requires reviewer`);
    }
    if (verifyFiles && capture?.file) {
      const filePath = path.join(root, 'docs', 'visual-qa', capture.file);
      if (!fs.existsSync(filePath)) {
        errors.push(`${capture.file}: capture file missing`);
      } else {
        const actual = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
        if (actual !== capture.sha256) errors.push(`${capture.file}: sha256 mismatch`);
      }
    }
  }

  const expectedComplete = captures.length > 0 && manual === captures.length;
  const coverage = receipt?.inspection?.coverage || {};
  if (coverage.totalCaptures !== captures.length) errors.push('inspection.coverage.totalCaptures does not match captures');
  if (coverage.manuallyReviewed !== manual) errors.push('inspection.coverage.manuallyReviewed does not match captures');
  if (coverage.automatedOnly !== captures.length - manual) errors.push('inspection.coverage.automatedOnly does not match captures');
  if (coverage.complete !== expectedComplete) errors.push('inspection.coverage.complete overstates or understates manual review');
  if (receipt?.inspection?.renderedPixelsReviewed !== expectedComplete) {
    errors.push('inspection.renderedPixelsReviewed may be true only when every capture is manually reviewed');
  }
  if (!expectedComplete && receipt?.inspection?.blockingDefectsOpen === 0) {
    errors.push('blockingDefectsOpen cannot be zero while manual review is incomplete');
  }
  return errors;
}

function selfTest() {
  const capture = (file, mode) => ({ file, sha256: '0'.repeat(64), inspection: mode === 'manual' ? { mode, reviewer: 'test' } : { mode } });
  const partial = {
    schemaVersion: 1,
    inspectionSchemaVersion: 2,
    inspection: { renderedPixelsReviewed: false, blockingDefectsOpen: null, coverage: { totalCaptures: 2, manuallyReviewed: 1, automatedOnly: 1, complete: false } },
    source: { files: ['a'], sha256: '0'.repeat(64) },
    matrix: { routes: ['/a/'], themes: ['dark'], viewports: [{ name: 'small' }, { name: 'large' }], states: ['page'], expectedCaptures: 2, completedCaptures: 2 },
    captures: [{ ...capture('a.png', 'manual'), page: '/a/', theme: 'dark', viewportName: 'small', state: 'page' }, { ...capture('b.png', 'automated-only'), page: '/a/', theme: 'dark', viewportName: 'large', state: 'page' }],
  };
  if (validateReceipt(partial).length) throw new Error('truthful partial receipt rejected');
  const overstated = structuredClone(partial);
  overstated.inspection.renderedPixelsReviewed = true;
  if (!validateReceipt(overstated).some((error) => error.includes('only when every capture'))) {
    throw new Error('overstated aggregate review was not rejected');
  }
  const complete = {
    schemaVersion: 1,
    inspectionSchemaVersion: 2,
    inspection: { renderedPixelsReviewed: true, blockingDefectsOpen: 0, coverage: { totalCaptures: 1, manuallyReviewed: 1, automatedOnly: 0, complete: true } },
    source: { files: ['a'], sha256: '0'.repeat(64) },
    matrix: { routes: ['/a/'], themes: ['dark'], viewports: [{ name: 'small' }], states: ['page'], expectedCaptures: 1, completedCaptures: 1 },
    captures: [{ ...capture('a.png', 'manual'), page: '/a/', theme: 'dark', viewportName: 'small', state: 'page' }],
  };
  if (validateReceipt(complete).length) throw new Error('truthful complete receipt rejected');
  console.log('check-visual-review-receipt: self-test passed');
}

const IS_DIRECT = path.resolve(process.argv[1] || '') === path.resolve(url.fileURLToPath(import.meta.url));

if (IS_DIRECT && process.argv.includes('--self-test')) {
  selfTest();
} else if (IS_DIRECT) {
  const receipt = JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8'));
  const errors = validateReceipt(receipt, { verifyFiles: true });
  if (errors.length) {
    console.error(`check-visual-review-receipt: FAIL (${errors.length})`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  const coverage = receipt.inspection.coverage;
  console.log(`check-visual-review-receipt: passed · ${coverage.manuallyReviewed}/${coverage.totalCaptures} manually reviewed · ${coverage.automatedOnly} automated-only`);
}
