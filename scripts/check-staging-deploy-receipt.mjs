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

const ROOT = path.resolve(import.meta.dirname, '..');
const RECEIPT = path.join(ROOT, 'api', 'staging-deploy-receipt.json');
const HISTORY = path.join(ROOT, 'data', 'staging-deploy-history.ndjson');
const REMOTE_RECEIPT = 'https://website.staging.vaultsparkstudios.com/api/staging-deploy-receipt.json';

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
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`check-staging-deploy-receipt --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

if (!fs.existsSync(RECEIPT) || !fs.existsSync(HISTORY)) {
  console.error('check-staging-deploy-receipt: receipt or history unavailable; run `node scripts/deploy-staging.mjs`');
  process.exit(1);
}

try {
  const localText = fs.readFileSync(RECEIPT, 'utf8');
  const receipt = validateStagingDeployReceipt(JSON.parse(localText), {
    requireVerifiedRemote: true,
  });
  const history = parseStagingDeployHistory(fs.readFileSync(HISTORY, 'utf8'));
  validateStagingDeployHistory(history, { latestReceipt: receipt });
  if (process.argv.includes('--remote')) {
    const remoteText = await readHttpsText(REMOTE_RECEIPT);
    validateStagingDeployReceipt(JSON.parse(remoteText), { requireVerifiedRemote: true });
    if (remoteText !== localText) throw new Error('served receipt bytes do not match the local attestation');
  }
  console.log(`check-staging-deploy-receipt: ${receipt.state} · ${receipt.deploy.manifestFileCount} files · chain ${history.length} · ${receipt.receiptId}${process.argv.includes('--remote') ? ' · served bytes verified' : ''}`);
  process.exit(receipt.state === 'verified' ? 0 : 1);
} catch (error) {
  console.error(`check-staging-deploy-receipt: invalid — ${error.message}`);
  process.exit(1);
}
