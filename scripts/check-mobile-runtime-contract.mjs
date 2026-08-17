#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { validateReceipt, validateRecords } = require('./lib/mobile-runtime-contract.cjs');
const root = process.cwd();

function selfTest() {
  const pages = [{ id: 'a', url: '/a/' }, { id: 'b', url: '/b/' }];
  const viewports = [{ name: 'small', width: 360, height: 640 }];
  const good = pages.map((page) => ({ ...page, viewport: 'small', issues: [] }));
  if (validateRecords(good, pages, viewports).length) throw new Error('complete clean matrix rejected');
  if (!validateRecords(good.slice(1), pages, viewports).some((error) => error.includes('missing matrix cell'))) throw new Error('incomplete matrix accepted');
  const bad = structuredClone(good); bad[0].issues.push({ severity: 'P1', type: 'target' });
  if (!validateRecords(bad, pages, viewports).some((error) => error.includes('P1 target'))) throw new Error('P1 accepted');
  console.log('check-mobile-runtime-contract: self-test passed');
}

if (process.argv.includes('--self-test')) selfTest();
else {
  const findingsPath = path.join(root, 'docs/mobile-audit/findings.jsonl');
  const receiptPath = path.join(root, 'docs/mobile-audit/receipt.json');
  const records = fs.readFileSync(findingsPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  const errors = validateReceipt(receipt, { root, records });
  if (errors.length) {
    console.error(`check-mobile-runtime-contract: FAIL (${errors.length})`);
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }
  console.log(`check-mobile-runtime-contract: passed · ${records.length}/${receipt.matrix.expectedProbes} cells · zero P0/P1`);
}
