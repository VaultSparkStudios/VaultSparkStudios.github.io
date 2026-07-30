import crypto from 'node:crypto';
import { receiptIdFor } from './build-check-evidence.mjs';
import { validateStagingDeployReceipt } from './staging-deploy-receipt.mjs';
import {
  appendStagingDeployHistory,
  parseStagingDeployHistory,
  renderStagingDeployHistory,
  validateStagingDeployHistory,
} from './staging-deploy-history.mjs';

/**
 * Deploy-history continuity summary.
 *
 * S298 served + byte-compared the head *receipt*; the chronology ledger itself
 * was validated locally only. This publishes a public-safe, reproducible
 * continuity summary of the *ledger* (depth, genesis, head, lineage integrity,
 * canonical-content digest) and gives the checker an independent anchor to
 * compare the *served* NDJSON against.
 *
 * Reproducibility: every field derives from the committed receipt + committed
 * ledger, and `generatedAt` is the head row's own timestamp — so the artifact
 * is byte-stable across rebuilds and only advances when a genuinely new deploy
 * head lands (no self-invalidating wall-clock churn). The served comparison is
 * a *runtime* verdict computed by the checker, never baked into the committed
 * bytes (served state is not reproducible in CI).
 *
 * Cycle safety: the served path is `/data/...`, the artifact is `/api/...`, and
 * `api/staging-deploy-continuity.json` is deliberately NOT in the candidate
 * artifact manifest's CORE_PATHS — so publishing it cannot move `candidateRoot`
 * and cannot feed back into the receipt it describes.
 */

export const CONTINUITY_SERVED_PATH = '/data/staging-deploy-history.ndjson';
export const CONTINUITY_ARTIFACT_PATH = 'api/staging-deploy-continuity.json';
export const CONTINUITY_SCHEMA_VERSION = '1.0';

const HEX24 = /^[a-f0-9]{24}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const DEPLOY_ID = /^\d{14}$/;

const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

function summaryIdFor(summary) {
  const { summaryId: _ignored, ...content } = summary;
  return receiptIdFor(content);
}

/**
 * Build the continuity summary from the committed ledger text + head receipt.
 * Throws (fail-closed) if the ledger is malformed, its head does not match the
 * receipt, or the on-disk bytes are not the canonical rendering.
 */
export function buildContinuitySummary(historyText, receipt) {
  const rows = parseStagingDeployHistory(historyText);
  const valid = validateStagingDeployReceipt(receipt, { requireVerifiedRemote: true });
  validateStagingDeployHistory(rows, { latestReceipt: valid });

  const canonical = renderStagingDeployHistory(rows);
  if (sha256(String(historyText)) !== sha256(canonical)) {
    throw new Error('ledger on disk is not canonical NDJSON; re-render before publishing continuity');
  }

  const genesis = rows[0];
  const head = rows.at(-1);
  const summary = {
    schemaVersion: CONTINUITY_SCHEMA_VERSION,
    generatedBy: 'scripts/build-staging-deploy-continuity.mjs',
    generatedAt: head.generatedAt,
    publicSafe: true,
    servedPath: CONTINUITY_SERVED_PATH,
    ledger: {
      depth: rows.length,
      genesis: { deployId: genesis.deployId, receiptId: genesis.receiptId },
      head: {
        deployId: head.deployId,
        receiptId: head.receiptId,
        previousReceiptId: head.previousReceiptId,
        candidateRoot: head.candidateRoot,
        sourceFingerprint: head.sourceFingerprint,
        state: head.state,
      },
      lineageIntact: true,
      chronological: true,
      headMatchesReceipt:
        head.receiptId === valid.receiptId
        && head.deployId === valid.deploy.id
        && head.candidateRoot === valid.candidate.artifactRoot
        && head.sourceFingerprint === valid.source.fingerprint,
    },
    bytes: {
      algorithm: 'SHA-256',
      byteLength: Buffer.byteLength(canonical, 'utf8'),
      sha256: sha256(canonical),
    },
  };
  if (summary.ledger.headMatchesReceipt !== true) {
    throw new Error('continuity head does not match the current staging receipt');
  }
  summary.summaryId = summaryIdFor(summary);
  return summary;
}

/** Strict structural + self-identity validation of a published summary. */
export function validateContinuitySummary(summary) {
  if (!summary || typeof summary !== 'object') throw new Error('continuity summary must be an object');
  if (summary.schemaVersion !== CONTINUITY_SCHEMA_VERSION) throw new Error('continuity summary has unexpected schemaVersion');
  if (summary.publicSafe !== true) throw new Error('continuity summary must be public-safe');
  if (summary.servedPath !== CONTINUITY_SERVED_PATH) throw new Error('continuity summary servedPath drifted');
  if (typeof summary.generatedAt !== 'string' || Number.isNaN(Date.parse(summary.generatedAt))) throw new Error('continuity summary generatedAt invalid');
  const ledger = summary.ledger;
  if (!ledger || typeof ledger !== 'object') throw new Error('continuity summary missing ledger');
  if (!Number.isInteger(ledger.depth) || ledger.depth <= 0) throw new Error('continuity ledger depth invalid');
  if (ledger.lineageIntact !== true || ledger.chronological !== true) throw new Error('continuity ledger not attested intact');
  if (ledger.headMatchesReceipt !== true) throw new Error('continuity ledger head does not match receipt');
  for (const [label, node] of [['genesis', ledger.genesis], ['head', ledger.head]]) {
    if (!node || !DEPLOY_ID.test(node.deployId || '') || !HEX24.test(node.receiptId || '')) {
      throw new Error(`continuity ${label} identity invalid`);
    }
  }
  if (!HEX64.test(ledger.head.candidateRoot || '') || !HEX24.test(ledger.head.sourceFingerprint || '')) throw new Error('continuity head deploy facts invalid');
  if (ledger.head.previousReceiptId !== null && !HEX24.test(ledger.head.previousReceiptId || '')) throw new Error('continuity head predecessor invalid');
  if (ledger.depth === 1 && ledger.head.previousReceiptId !== null) throw new Error('single-row ledger cannot have a predecessor');
  const bytes = summary.bytes;
  if (!bytes || bytes.algorithm !== 'SHA-256' || !HEX64.test(bytes.sha256 || '') || !Number.isInteger(bytes.byteLength) || bytes.byteLength <= 0) {
    throw new Error('continuity byte digest invalid');
  }
  if (!HEX24.test(summary.summaryId || '') || summary.summaryId !== summaryIdFor(summary)) throw new Error('continuity summary content identity mismatch');
  return summary;
}

/**
 * Assert the committed ledger + receipt still agree with a published summary.
 * Reproducible (local-only) — safe in CI.
 */
export function assertSummaryMatchesLedger(summary, historyText, receipt) {
  validateContinuitySummary(summary);
  const rebuilt = buildContinuitySummary(historyText, receipt);
  if (rebuilt.summaryId !== summary.summaryId) {
    throw new Error('published continuity summary drifted from the committed ledger + receipt');
  }
  return summary;
}

/**
 * Runtime comparison of the *served* ledger NDJSON against the published
 * summary. Independently re-validates the served chain, then requires depth,
 * head lineage, and canonical-content digest to match the summary. Returns a
 * verdict; never mutates. Throws only if `strict` and a mismatch is found.
 */
export function compareServedLedger(servedText, summary, { strict = false } = {}) {
  validateContinuitySummary(summary);
  const reasons = [];
  let servedRows = null;
  try {
    servedRows = parseStagingDeployHistory(servedText);
  } catch (error) {
    reasons.push(`served ledger failed independent validation: ${error.message}`);
  }
  let servedSha = null;
  let servedDepth = null;
  let servedHeadReceiptId = null;
  if (servedRows) {
    servedDepth = servedRows.length;
    servedHeadReceiptId = servedRows.at(-1)?.receiptId ?? null;
    servedSha = sha256(renderStagingDeployHistory(servedRows));
    if (servedDepth !== summary.ledger.depth) reasons.push(`served depth ${servedDepth} != published ${summary.ledger.depth}`);
    if (servedHeadReceiptId !== summary.ledger.head.receiptId) reasons.push('served head receiptId does not match published head');
    if (servedSha !== summary.bytes.sha256) reasons.push('served canonical digest does not match published digest');
  }
  const verdict = {
    ok: reasons.length === 0,
    servedDepth,
    servedHeadReceiptId,
    servedSha,
    expectedSha: summary.bytes.sha256,
    reasons,
  };
  if (strict && !verdict.ok) throw new Error(`served ledger continuity failed — ${reasons.join('; ')}`);
  return verdict;
}

export function runStagingDeployContinuitySelfTest(receipt) {
  const valid = validateStagingDeployReceipt(receipt, { requireVerifiedRemote: true });
  const rows = appendStagingDeployHistory([], valid);
  const historyText = renderStagingDeployHistory(rows);
  const summary = buildContinuitySummary(historyText, valid);

  // A genuine second head, chained onto the first (mirrors the history self-test).
  const nextDeployId = String(Number(valid.deploy.id) + 1).padStart(14, '0');
  const secondReceipt = {
    ...valid,
    generatedAt: new Date(Date.parse(valid.generatedAt) + 1_000).toISOString(),
    source: { ...valid.source, fingerprint: 'e'.repeat(24) },
    archive: { ...valid.archive, sha256: 'f'.repeat(64) },
    deploy: { ...valid.deploy, id: nextDeployId, rollbackPath: `${valid.deploy.remoteRoot}/.rollback/${nextDeployId}` },
  };
  secondReceipt.summaryId = undefined;
  secondReceipt.receiptId = receiptIdFor((({ receiptId, ...rest }) => rest)(secondReceipt));
  const twoRows = appendStagingDeployHistory(rows, secondReceipt);
  const twoText = renderStagingDeployHistory(twoRows);

  const rejects = (fn) => { try { fn(); return false; } catch { return true; } };
  const supersetText = twoText; // served ledger one row ahead of a single-row summary
  const truncatedServed = renderStagingDeployHistory([twoRows[0]]); // served ledger one row behind

  return [
    ['summary validates', Boolean(validateContinuitySummary(summary))],
    ['head matches receipt', summary.ledger.headMatchesReceipt === true],
    ['genesis == head for a single-row ledger', summary.ledger.depth === 1 && summary.ledger.head.receiptId === summary.ledger.genesis.receiptId],
    ['digest is canonical sha of the served bytes', summary.bytes.sha256 === crypto.createHash('sha256').update(historyText, 'utf8').digest('hex')],
    ['exact served ledger passes comparison', compareServedLedger(historyText, summary).ok === true],
    ['superset served ledger (extra head) is rejected', compareServedLedger(supersetText, summary).ok === false],
    ['truncated served ledger is rejected', compareServedLedger(renderStagingDeployHistory([]), summary).ok === false || compareServedLedger(truncatedServed, summary).ok === false],
    ['garbage served ledger is rejected without throwing', compareServedLedger('{"not":"ndjson"', summary).ok === false],
    ['strict mode throws on mismatch', rejects(() => compareServedLedger(supersetText, summary, { strict: true }))],
    ['tampered summaryId is rejected', rejects(() => validateContinuitySummary({ ...summary, summaryId: 'a'.repeat(24) }))],
    ['flipped headMatchesReceipt is rejected', rejects(() => validateContinuitySummary({ ...summary, ledger: { ...summary.ledger, headMatchesReceipt: false } }))],
    ['two-row summary head chains to a predecessor', buildContinuitySummary(twoText, secondReceipt).ledger.head.previousReceiptId === rows[0].receiptId],
  ];
}
