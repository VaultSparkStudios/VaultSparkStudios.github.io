import { receiptIdFor } from './build-check-evidence.mjs';
import { validateStagingDeployReceipt } from './staging-deploy-receipt.mjs';

function rowIdFor(row) {
  const { rowId: _ignored, ...content } = row;
  return receiptIdFor(content);
}

export function historyRowFor(receipt, previousReceiptId = null) {
  const valid = validateStagingDeployReceipt(receipt, { requireVerifiedRemote: true });
  const row = {
    schemaVersion: '1.0',
    deployId: valid.deploy.id,
    generatedAt: valid.generatedAt,
    receiptId: valid.receiptId,
    previousReceiptId,
    state: valid.state,
    sourceCommitSha: valid.source.commitSha,
    sourceFingerprint: valid.source.fingerprint,
    candidateRoot: valid.candidate.artifactRoot,
    archiveSha256: valid.archive.sha256,
    fileCount: valid.deploy.manifestFileCount,
    rollbackPath: valid.deploy.rollbackPath,
  };
  row.rowId = rowIdFor(row);
  return row;
}

export function parseStagingDeployHistory(text) {
  const rows = String(text || '').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`history row ${index + 1} is invalid JSON: ${error.message}`); }
  });
  return validateStagingDeployHistory(rows);
}

export function validateStagingDeployHistory(rows, { latestReceipt = null } = {}) {
  if (!Array.isArray(rows)) throw new Error('staging deploy history must be an array');
  const deployIds = new Set();
  const receiptIds = new Set();
  rows.forEach((row, index) => {
    if (!row || row.schemaVersion !== '1.0' || !/^\d{14}$/.test(row.deployId || '')) throw new Error(`history row ${index + 1} has invalid identity`);
    if (typeof row.generatedAt !== 'string' || Number.isNaN(Date.parse(row.generatedAt))) throw new Error(`history row ${index + 1} has invalid timestamp`);
    if (!/^[a-f0-9]{24}$/.test(row.receiptId || '') || !/^[a-f0-9]{24}$/.test(row.rowId || '')) throw new Error(`history row ${index + 1} has invalid receipt identity`);
    if (row.rowId !== rowIdFor(row)) throw new Error(`history row ${index + 1} content identity mismatch`);
    if (deployIds.has(row.deployId) || receiptIds.has(row.receiptId)) throw new Error(`history row ${index + 1} duplicates deploy or receipt identity`);
    deployIds.add(row.deployId);
    receiptIds.add(row.receiptId);
    const previous = index ? rows[index - 1] : null;
    if (row.previousReceiptId !== (previous?.receiptId ?? null)) throw new Error(`history row ${index + 1} breaks the receipt chain`);
    if (previous && row.deployId <= previous.deployId) throw new Error(`history row ${index + 1} is not chronological`);
    if (!['verified', 'degraded'].includes(row.state)
      || !/^[a-f0-9]{40}$/.test(row.sourceCommitSha || '')
      || !/^[a-f0-9]{24}$/.test(row.sourceFingerprint || '')
      || !/^[a-f0-9]{64}$/.test(row.candidateRoot || '')
      || !/^[a-f0-9]{64}$/.test(row.archiveSha256 || '')
      || !Number.isInteger(row.fileCount) || row.fileCount <= 0
      || !String(row.rollbackPath || '').endsWith(`/.rollback/${row.deployId}`)) {
      throw new Error(`history row ${index + 1} has invalid deploy facts`);
    }
  });
  if (latestReceipt) {
    const receipt = validateStagingDeployReceipt(latestReceipt, { requireVerifiedRemote: true });
    const head = rows.at(-1);
    if (!head || head.receiptId !== receipt.receiptId
      || head.deployId !== receipt.deploy.id
      || head.candidateRoot !== receipt.candidate.artifactRoot
      || head.sourceFingerprint !== receipt.source.fingerprint) {
      throw new Error('history head does not match the current staging receipt');
    }
  }
  return rows;
}

export function appendStagingDeployHistory(rows, receipt) {
  const existing = validateStagingDeployHistory(rows);
  const valid = validateStagingDeployReceipt(receipt, { requireVerifiedRemote: true });
  const same = existing.find((row) => row.receiptId === valid.receiptId);
  if (same) {
    validateStagingDeployHistory(existing, { latestReceipt: valid });
    return existing;
  }
  if (existing.some((row) => row.deployId === valid.deploy.id)) throw new Error('deploy id already belongs to another receipt');
  const head = existing.at(-1);
  if (head && valid.deploy.id <= head.deployId) throw new Error('new receipt is not newer than the ledger head');
  const next = [...existing, historyRowFor(valid, head?.receiptId ?? null)];
  validateStagingDeployHistory(next, { latestReceipt: valid });
  return next;
}

export function renderStagingDeployHistory(rows) {
  validateStagingDeployHistory(rows);
  return rows.length ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '';
}

export function runStagingDeployHistorySelfTest(receipt) {
  const first = appendStagingDeployHistory([], receipt);
  const idempotent = appendStagingDeployHistory(first, receipt);
  const nextDeployId = String(Number(receipt.deploy.id) + 1).padStart(14, '0');
  const secondReceipt = {
    ...receipt,
    generatedAt: new Date(Date.parse(receipt.generatedAt) + 1_000).toISOString(),
    source: { ...receipt.source, fingerprint: 'e'.repeat(24) },
    archive: { ...receipt.archive, sha256: 'f'.repeat(64) },
    deploy: {
      ...receipt.deploy,
      id: nextDeployId,
      rollbackPath: `${receipt.deploy.remoteRoot}/.rollback/${nextDeployId}`,
    },
  };
  secondReceipt.receiptId = receiptIdFor(secondReceipt);
  const second = appendStagingDeployHistory(first, secondReceipt);
  const rejects = (candidate, options = {}) => {
    try { validateStagingDeployHistory(candidate, options); return false; } catch { return true; }
  };
  return [
    ['first receipt seeds the chain', first.length === 1 && first[0].previousReceiptId === null],
    ['re-appending one receipt is idempotent', idempotent.length === 1],
    ['second receipt chains to the first', second.length === 2 && second[1].previousReceiptId === first[0].receiptId],
    ['detached row is rejected', rejects([{ ...first[0], previousReceiptId: 'a'.repeat(24) }])],
    ['row mutation is rejected', rejects([{ ...first[0], fileCount: first[0].fileCount + 1 }])],
    ['replayed head is rejected against current receipt', rejects(first, { latestReceipt: secondReceipt })],
    ['NDJSON round-trip validates', parseStagingDeployHistory(renderStagingDeployHistory(second)).length === 2],
  ];
}
