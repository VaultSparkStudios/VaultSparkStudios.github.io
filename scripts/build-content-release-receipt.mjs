#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const argv = process.argv.slice(2);
const arg = (name, fallback = '') => { const at = argv.indexOf(name); return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback; };

export function appendRow(historyText, row) {
  const rows = String(historyText || '').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const previousReceiptId = rows.at(-1)?.receiptId || null;
  const body = { ...row, previousReceiptId };
  const receiptId = sha256(Buffer.from(stable(body)));
  return { rows: [...rows, { ...body, receiptId }], row: { ...body, receiptId } };
}

function writeArtifacts({ receipt, rows, output, historyOutput, continuityOutput }) {
  for (const target of [output, historyOutput, continuityOutput]) fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(historyOutput, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  fs.writeFileSync(continuityOutput, `${JSON.stringify({ schemaVersion: '1.0', generatedAt: receipt.generatedAt, head: rows.at(-1).receiptId, depth: rows.length, current: receipt }, null, 2)}\n`);
}

function initial() {
  const paths = arg('--paths').split(/\s+/).filter(Boolean).sort();
  if (!paths.length) throw new Error('--paths must include at least one promoted path');
  const missing = paths.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length) throw new Error(`promoted path(s) missing: ${missing.join(', ')}`);
  const generatedAt = arg('--generated-at', new Date().toISOString());
  const baselineSha = arg('--baseline');
  const contentLaneHead = arg('--head');
  if (!/^[a-f0-9]{7,40}$/i.test(baselineSha) || !/^[a-f0-9]{7,40}$/i.test(contentLaneHead)) throw new Error('baseline and head must be git SHAs');
  const leaves = paths.map((rel) => ({ path: rel.replace(/\\/g, '/'), sha256: sha256(fs.readFileSync(path.join(ROOT, rel))), bytes: fs.statSync(path.join(ROOT, rel)).size }));
  const manifestRoot = sha256(Buffer.from(leaves.map((leaf) => `${leaf.path}\0${leaf.sha256}\0${leaf.bytes}`).join('\n')));
  const pathSetSha256 = sha256(Buffer.from(paths.join('\n')));
  const promotionPath = path.join(ROOT, 'api', 'promotion-receipt.json');
  const promotionReceiptSha256 = fs.existsSync(promotionPath) ? sha256(fs.readFileSync(promotionPath)) : null;
  const discoveryResultPath = arg('--discovery-result');
  const discovery = discoveryResultPath && fs.existsSync(discoveryResultPath) ? JSON.parse(fs.readFileSync(discoveryResultPath, 'utf8')) : null;
  const row = {
    schemaVersion: '1.0', type: 'content-release-candidate', generatedAt,
    baselineSha, contentLaneHead, promotedCount: leaves.length, pathSetSha256, manifestRoot,
    workflowUrl: arg('--workflow-url') || null, promotionReceiptSha256,
    discoveryManifestRoot: discovery?.discoverySelected ? discovery.bundle?.manifestRoot || null : null,
    contentVerdict: 'candidate-exact', edgeVerdict: 'pending-post-deploy-verification', publicSafe: true,
  };
  const historySource = arg('--history-source');
  const historyText = historySource && fs.existsSync(historySource) ? fs.readFileSync(historySource, 'utf8') : '';
  const appended = appendRow(historyText, row);
  const receipt = { ...appended.row, leaves };
  writeArtifacts({
    receipt, rows: appended.rows,
    output: path.resolve(arg('--output', path.join(ROOT, 'api', 'content-deploy-receipt.json'))),
    historyOutput: path.resolve(arg('--history-output', path.join(ROOT, 'data', 'content-deploy-history.ndjson'))),
    continuityOutput: path.resolve(arg('--continuity-output', path.join(ROOT, 'api', 'content-release-continuity.json'))),
  });
  console.log(`build-content-release-receipt: candidate ${receipt.receiptId.slice(0, 12)} · ${leaves.length} paths · ${manifestRoot.slice(0, 12)}`);
}

function finalize() {
  const output = path.resolve(arg('--output'));
  const historyOutput = path.resolve(arg('--history-output'));
  const continuityOutput = path.resolve(arg('--continuity-output'));
  const verification = JSON.parse(fs.readFileSync(path.resolve(arg('--verification-result')), 'utf8'));
  const current = JSON.parse(fs.readFileSync(output, 'utf8'));
  const historyText = fs.existsSync(historyOutput) ? fs.readFileSync(historyOutput, 'utf8') : '';
  const appended = appendRow(historyText, {
    schemaVersion: '1.0', type: 'content-release-verification', generatedAt: verification.verifiedAt,
    candidateReceiptId: current.receiptId, baselineSha: current.baselineSha, contentLaneHead: current.contentLaneHead,
    manifestRoot: current.manifestRoot, pathSetSha256: current.pathSetSha256,
    contentVerdict: verification.contentVerdict, edgeVerdict: verification.edgeVerdict,
    verifiedPages: verification.summary.pages, verifiedAssets: verification.summary.assets,
    verificationSha256: sha256(Buffer.from(stable(verification))), workflowUrl: current.workflowUrl, publicSafe: true,
  });
  const receipt = { ...current, ...appended.row, leaves: current.leaves, verification };
  writeArtifacts({ receipt, rows: appended.rows, output, historyOutput, continuityOutput });
  console.log(`build-content-release-receipt: verified ${receipt.receiptId.slice(0, 12)} · ${verification.summary.pages} pages · ${verification.summary.assets} assets`);
}

function selfTest() {
  const one = appendRow('', { type: 'candidate', generatedAt: 'T', pathSetSha256: 'a' });
  const two = appendRow(`${JSON.stringify(one.row)}\n`, { type: 'verified', generatedAt: 'U', pathSetSha256: 'a' });
  const repeat = appendRow('', { type: 'candidate', generatedAt: 'T', pathSetSha256: 'a' });
  const ok = one.row.previousReceiptId === null && two.row.previousReceiptId === one.row.receiptId && two.rows.length === 2 && repeat.row.receiptId === one.row.receiptId;
  console.log(`build-content-release-receipt: self-test ${ok ? 'passed' : 'failed'}`);
  if (!ok) process.exit(1);
}

try {
  if (argv.includes('--self-test')) selfTest();
  else if (argv.includes('--finalize')) finalize();
  else initial();
} catch (error) {
  console.error(`build-content-release-receipt: ${error.message}`);
  process.exit(1);
}
