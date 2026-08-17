#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const receiptPath = path.join(ROOT, 'docs', 'visual-qa', 'LATEST.json');
const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const files = new Set(arg('--files').split(',').map((value) => value.trim()).filter(Boolean));
const reviewer = arg('--reviewer');
const finding = arg('--finding');
const fix = arg('--fix');
if (!reviewer) {
  console.error('Usage: node scripts/record-visual-review.mjs (--files a.png,b.png | --all) --reviewer "name" [--finding "result"]');
  process.exit(1);
}

const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
const captures = Array.isArray(receipt.captures) ? receipt.captures : [];
if (argv.includes('--all')) for (const capture of captures) files.add(capture.file);
if (!files.size) {
  console.error('record-visual-review: no captures selected; pass --files or --all');
  process.exit(1);
}
const known = new Set(captures.map((capture) => capture.file));
const unknown = [...files].filter((file) => !known.has(file));
if (unknown.length) {
  console.error(`record-visual-review: unknown capture(s): ${unknown.join(', ')}`);
  process.exit(1);
}

for (const capture of captures) {
  if (files.has(capture.file)) capture.inspection = { mode: 'manual', reviewer };
}
const manuallyReviewed = captures.filter((capture) => capture.inspection?.mode === 'manual').length;
const complete = captures.length > 0 && manuallyReviewed === captures.length;
receipt.inspection = {
  ...receipt.inspection,
  renderedPixelsReviewed: complete,
  coverage: {
    totalCaptures: captures.length,
    manuallyReviewed,
    automatedOnly: captures.length - manuallyReviewed,
    complete,
  },
  reviewer,
  findings: finding ? [...new Set([...(receipt.inspection?.findings || []), finding])] : (receipt.inspection?.findings || []),
  fixesApplied: fix ? [...new Set([...(receipt.inspection?.fixesApplied || []), fix])] : (receipt.inspection?.fixesApplied || []),
  blockingDefectsOpen: complete ? 0 : null,
  limitation: complete
    ? null
    : 'Unreviewed captures prove rendering and hash binding only; they do not claim human-judged hierarchy, readability, or contrast.',
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`record-visual-review: ${manuallyReviewed}/${captures.length} capture(s) manually reviewed`);
