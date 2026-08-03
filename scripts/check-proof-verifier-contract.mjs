#!/usr/bin/env node
/**
 * check-proof-verifier-contract.mjs — S304 (plan item 3).
 *
 * THE GAP IT CLOSES: /proof's browser verifier re-implements the ledger row
 * content-address (`rowId`) independently of the writer. That duplication
 * already shipped one live false red X (the page excluded only `rowId` while
 * the writer's `receiptIdFor` also strips `receiptId`). This gate EXECUTES the
 * page's actual extracted functions (Node's WebCrypto is API-identical) against
 * every committed ledger row and asserts byte-equality with the writer's
 * `rowIdFor` — so the two can never drift silently again.
 *
 * Modes:
 *   --self-test   fixtures + mutation cases, exit 0/1
 *   (default)     full committed-ledger comparison, exit 0/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { receiptIdFor } from './lib/build-check-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERIFIER = path.join(ROOT, 'assets', 'proof-verify.js');
const LEDGER = path.join(ROOT, 'data', 'staging-deploy-history.ndjson');
const SELF_TEST = process.argv.includes('--self-test');

/** The writer's row identity, via the same lib the ledger appender uses. */
function writerRowId(row) {
  const { rowId: _ignored, ...content } = row;
  return receiptIdFor(content); // receiptIdFor strips receiptId internally
}

/** Extract a top-level `async function <name>(...) { ... }` from the page source. */
export function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  if (start < 0) return null;
  let i = source.indexOf('{', start);
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return source.slice(start, i + 1); }
  }
  return null;
}

/** Build a callable contentId from the PAGE'S OWN CODE (not a reimplementation). */
export function pageContentId(source) {
  const sha = extractFunction(source, 'sha256Hex');
  const cid = extractFunction(source, 'contentId');
  if (!sha || !cid) throw new Error('could not extract sha256Hex/contentId from assets/proof-verify.js');
  // Node ≥19: globalThis.crypto.subtle + TextEncoder match the browser API.
  return new Function(`${sha}\n${cid}\nreturn contentId;`)();
}

async function compareAll(rows, contentId) {
  const problems = [];
  for (let i = 0; i < rows.length; i++) {
    const page = await contentId(rows[i]);
    const writer = writerRowId(rows[i]);
    if (page !== writer) problems.push(`row ${i + 1}: page ${page} ≠ writer ${writer} — the verifier has drifted from the writer`);
    if (page !== rows[i].rowId) problems.push(`row ${i + 1}: computed ${page} ≠ stored rowId ${rows[i].rowId}`);
  }
  return problems;
}

async function selfTest() {
  let pass = 0, fail = 0;
  const ok = (cond, label) => { if (cond) { pass++; console.log(`  ✓ ${label}`); } else { fail++; console.error(`  ✗ ${label}`); } };

  const source = fs.readFileSync(VERIFIER, 'utf8');
  const contentId = pageContentId(source);
  const fixture = { schemaVersion: '1.0', deployId: 'x', generatedAt: '2026-01-01T00:00:00Z', receiptId: 'aa'.repeat(12), previousReceiptId: null, state: 'verified' };
  fixture.rowId = writerRowId(fixture);

  ok((await contentId(fixture)) === fixture.rowId, 'page code reproduces the writer identity on a fixture row');
  ok((await contentId({ ...fixture, receiptId: 'bb'.repeat(12) })) === fixture.rowId, 'receiptId is excluded from the identity by BOTH sides');
  ok((await contentId({ ...fixture, state: 'tampered' })) !== fixture.rowId, 'MUTATION: a flipped field changes the identity (tamper detected)');
  ok((await contentId({ ...fixture, rowId: undefined })) === fixture.rowId, 'a missing rowId still hashes content (page compares ≠ undefined → fails, never skips)');
  ok(!/rows\[i\]\.rowId\s*&&/.test(source), 'THE VACUOUS GUARD IS GONE: the page no longer skips rows without rowId');

  const rows = fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  ok(rows.length > 0 && (await compareAll(rows.slice(0, 3), contentId)).length === 0, 'first committed ledger rows verify through the page code');

  console.log(`check-proof-verifier-contract --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

async function main() {
  const source = fs.readFileSync(VERIFIER, 'utf8');
  const contentId = pageContentId(source);
  const rows = fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const problems = await compareAll(rows, contentId);
  if (/rows\[i\]\.rowId\s*&&/.test(source)) problems.push('assets/proof-verify.js re-grew the vacuous rowId guard');
  if (problems.length) {
    console.error(`✗ check-proof-verifier-contract: ${problems.length} failure(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`✓ check-proof-verifier-contract: page verifier ≡ writer across ${rows.length} committed ledger row(s)`);
}

if (SELF_TEST) await selfTest(); else await main();
