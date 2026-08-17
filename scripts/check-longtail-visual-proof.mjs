#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { validateReceipt } from './check-visual-review-receipt.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');
const MANIFEST = path.join(ROOT, 'docs', 'visual-proof', 'longtail-s171', 'manifest.json');
const REVIEW_RECEIPT = path.join(ROOT, 'docs', 'visual-qa', 'LATEST.json');

const REQUIRED = [
  ['projects/vorn/', 'desktop'],
  ['projects/vorn/', 'mobile'],
  ['privacy/', 'desktop'],
  ['privacy/', 'mobile'],
  ['journal/community-enters-the-vault/', 'desktop'],
  ['journal/community-enters-the-vault/', 'mobile']
];

function normalizeRoute(route) {
  return String(route || '').replace(/^\/+/, '').replace(/\/?$/, '/');
}

export function evaluate(manifest, exists = () => true) {
  const findings = [];
  if (!manifest || manifest.schemaVersion !== '1.0') findings.push('manifest schemaVersion must be 1.0');
  if (!Array.isArray(manifest?.captures)) findings.push('manifest captures must be an array');
  const captures = manifest?.captures || [];
  for (const [route, viewport] of REQUIRED) {
    const capture = captures.find((item) => normalizeRoute(item.route) === normalizeRoute(route) && item.viewport === viewport);
    if (!capture) {
      findings.push(`missing ${viewport} capture for /${normalizeRoute(route)}`);
      continue;
    }
    if (capture.status !== 200) findings.push(`${capture.route} ${viewport} status ${capture.status}, expected 200`);
    if (!capture.screenshot || !exists(capture.screenshot)) findings.push(`${capture.route} ${viewport} screenshot file missing`);
    if ((capture.bytes || 0) < 8000) findings.push(`${capture.route} ${viewport} screenshot too small to prove layout`);
    if ((capture.nonBlankScore || 0) < 2) findings.push(`${capture.route} ${viewport} screenshot appears blank`);
    if (Array.isArray(capture.pageErrors) && capture.pageErrors.length) findings.push(`${capture.route} ${viewport} page errors: ${capture.pageErrors.join('; ')}`);
  }
  return findings;
}

if (SELF_TEST) {
  const good = {
    schemaVersion: '1.0',
    captures: REQUIRED.map(([route, viewport]) => ({
      route: `/${route}`,
      viewport,
      status: 200,
      screenshot: `docs/visual-proof/longtail-s171/${route.replace(/\W+/g, '-')}-${viewport}.png`,
      bytes: 12000,
      nonBlankScore: 9,
      pageErrors: []
    }))
  };
  const bad = { schemaVersion: '1.0', captures: [good.captures[0]] };
  const partialReview = {
    schemaVersion: 1,
    inspectionSchemaVersion: 2,
    inspection: { renderedPixelsReviewed: false, blockingDefectsOpen: null, coverage: { totalCaptures: 1, manuallyReviewed: 0, automatedOnly: 1, complete: false } },
    source: { files: ['capture-source.html'], sha256: '0'.repeat(64) },
    matrix: { routes: ['/capture/'], themes: ['dark'], viewports: [{ name: 'mobile' }], states: ['page'], expectedCaptures: 1, completedCaptures: 1 },
    captures: [{ file: 'capture.png', sha256: '0'.repeat(64), page: '/capture/', theme: 'dark', viewportName: 'mobile', state: 'page', inspection: { mode: 'automated-only' } }],
  };
  const overstatedReview = structuredClone(partialReview);
  overstatedReview.inspection.renderedPixelsReviewed = true;
  const goodFindings = evaluate(good, () => true);
  const badFindings = evaluate(bad, () => false);
  console.log(`  ${goodFindings.length === 0 ? 'ok' : 'fail'} good long-tail visual proof`);
  console.log(`  ${badFindings.length >= 5 ? 'ok' : 'fail'} bad long-tail visual proof`);
  const partialFindings = validateReceipt(partialReview);
  const overstatedFindings = validateReceipt(overstatedReview);
  console.log(`  ${partialFindings.length === 0 ? 'ok' : 'fail'} truthful partial visual review receipt`);
  console.log(`  ${overstatedFindings.length > 0 ? 'ok' : 'fail'} overstated visual review receipt`);
  process.exit(goodFindings.length === 0 && badFindings.length >= 5 && partialFindings.length === 0 && overstatedFindings.length > 0 ? 0 : 1);
}

if (!fs.existsSync(MANIFEST)) {
  console.error('long-tail visual proof missing — run `node scripts/capture-longtail-visual-proof.mjs`');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const findings = evaluate(manifest, (rel) => fs.existsSync(path.join(ROOT, rel)));
if (!fs.existsSync(REVIEW_RECEIPT)) {
  findings.push('visual review receipt missing — run the changed-surface capture workflow');
} else {
  const receipt = JSON.parse(fs.readFileSync(REVIEW_RECEIPT, 'utf8'));
  findings.push(...validateReceipt(receipt, { verifyFiles: true, root: ROOT }).map((finding) => `visual review receipt: ${finding}`));
}
if (findings.length) {
  console.error(`long-tail visual proof failed (${findings.length})`);
  findings.forEach((finding) => console.error(`  ${finding}`));
  process.exit(1);
}

console.log(`long-tail visual proof ok (${manifest.captures.length} screenshots)`);
