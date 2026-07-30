#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {
  runStagingDeployReceiptSelfTest,
  validateStagingDeployReceipt,
} from './lib/staging-deploy-receipt.mjs';
import {
  parseStagingDeployHistory,
  runStagingDeployHistorySelfTest,
  validateStagingDeployHistory,
} from './lib/staging-deploy-history.mjs';
import {
  assertSummaryMatchesLedger,
  compareServedLedger,
  runStagingDeployContinuitySelfTest,
} from './lib/staging-deploy-continuity.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const RECEIPT = path.join(ROOT, 'api', 'staging-deploy-receipt.json');
const HISTORY = path.join(ROOT, 'data', 'staging-deploy-history.ndjson');
const CONTINUITY = path.join(ROOT, 'api', 'staging-deploy-continuity.json');
const REMOTE_RECEIPT = 'https://website.staging.vaultsparkstudios.com/api/staging-deploy-receipt.json';
const REMOTE_HISTORY = 'https://website.staging.vaultsparkstudios.com/data/staging-deploy-history.ndjson';

function readHttpsText(url, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: { accept: 'application/json', 'cache-control': 'no-cache' },
      agent: false,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`served receipt returned HTTP ${response.statusCode}`));
          return;
        }
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('served receipt request timed out')));
    request.on('error', reject);
  });
}

if (process.argv.includes('--self-test')) {
  const fixture = JSON.parse(fs.readFileSync(RECEIPT, 'utf8'));
  const cases = [
    ...runStagingDeployReceiptSelfTest(),
    ...runStagingDeployHistorySelfTest(fixture).map(([name, ok]) => [`history · ${name}`, ok]),
    ...runStagingDeployContinuitySelfTest(fixture).map(([name, ok]) => [`continuity · ${name}`, ok]),
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`check-staging-deploy-receipt --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

if (!fs.existsSync(RECEIPT) || !fs.existsSync(HISTORY) || !fs.existsSync(CONTINUITY)) {
  console.error('check-staging-deploy-receipt: receipt, history, or continuity summary unavailable; run `node scripts/deploy-staging.mjs` then `node scripts/build-staging-deploy-continuity.mjs`');
  process.exit(1);
}

try {
  const localText = fs.readFileSync(RECEIPT, 'utf8');
  const receipt = validateStagingDeployReceipt(JSON.parse(localText), {
    requireVerifiedRemote: true,
  });
  const historyText = fs.readFileSync(HISTORY, 'utf8');
  const history = parseStagingDeployHistory(historyText);
  validateStagingDeployHistory(history, { latestReceipt: receipt });

  // The published continuity summary must still agree with the committed
  // ledger + receipt (reproducible, local-only).
  const summary = JSON.parse(fs.readFileSync(CONTINUITY, 'utf8'));
  assertSummaryMatchesLedger(summary, historyText, receipt);

  let servedLedger = null;
  if (process.argv.includes('--remote')) {
    const remoteText = await readHttpsText(REMOTE_RECEIPT);
    validateStagingDeployReceipt(JSON.parse(remoteText), { requireVerifiedRemote: true });
    if (remoteText !== localText) throw new Error('served receipt bytes do not match the local attestation');
    // Independently fetch + compare the served chronology ledger itself.
    const remoteHistory = await readHttpsText(REMOTE_HISTORY);
    const verdict = compareServedLedger(remoteHistory, summary, { strict: true });
    servedLedger = `served ledger verified (depth ${verdict.servedDepth} · ${verdict.servedSha.slice(0, 12)})`;
  }
  const remoteNote = process.argv.includes('--remote') ? ` · served receipt verified · ${servedLedger}` : '';
  console.log(`check-staging-deploy-receipt: ${receipt.state} · ${receipt.deploy.manifestFileCount} files · chain ${history.length} · continuity ${summary.summaryId} · ${receipt.receiptId}${remoteNote}`);
  process.exit(receipt.state === 'verified' ? 0 : 1);
} catch (error) {
  console.error(`check-staging-deploy-receipt: invalid — ${error.message}`);
  process.exit(1);
}
