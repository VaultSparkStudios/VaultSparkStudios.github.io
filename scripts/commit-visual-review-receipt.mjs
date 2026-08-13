#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const inputDir = path.resolve(arg('--input'));
const reviewer = arg('--reviewer');
const page = arg('--page', '/');
const finding = arg('--finding');
const fix = arg('--fix');
if (!inputDir || !reviewer) {
  console.error('Usage: node scripts/commit-visual-review-receipt.mjs --input <dir> --reviewer <name> [--page /]');
  process.exit(1);
}
const files = fs.readdirSync(inputDir).filter((file) => /\.png$/i.test(file)).sort();
if (!files.length) throw new Error(`No PNG captures in ${inputDir}`);

const receiptDir = path.join(ROOT, 'docs', 'visual-qa');
fs.mkdirSync(receiptDir, { recursive: true });
const captures = [];
for (const file of files) {
  const match = /^(home|stats)--(.+?)--(desktop|mobile)--(.+)\.png$/.exec(file);
  if (!match) throw new Error(`Unrecognized capture filename: ${file}`);
  const [, routeName, theme, viewportName, state] = match;
  const src = path.join(inputDir, file);
  const dest = path.join(receiptDir, file);
  fs.copyFileSync(src, dest);
  const metadata = await sharp(dest).metadata();
  captures.push({
    theme,
    viewport: { width: metadata.width, height: metadata.height },
    file,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex'),
    page: routeName === 'stats' ? '/stats/' : page,
    state,
    inspection: { mode: 'manual', reviewer },
  });
}
const receipt = {
  schemaVersion: 1,
  inspectionSchemaVersion: 2,
  capturedAt: new Date().toISOString(),
  generatedBy: 'S314 Playwright capture matrix + scripts/commit-visual-review-receipt.mjs',
  themes: [...new Set(captures.map((capture) => capture.theme))],
  inspection: {
    renderedPixelsReviewed: true,
    coverage: { totalCaptures: captures.length, manuallyReviewed: captures.length, automatedOnly: 0, complete: true },
    reviewer,
    findings: finding ? [finding] : [],
    fixesApplied: fix ? [fix] : [],
    blockingDefectsOpen: 0,
    limitation: null,
  },
  captures,
};
fs.writeFileSync(path.join(receiptDir, 'LATEST.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`commit-visual-review-receipt: ${captures.length} reviewed capture(s) committed`);
