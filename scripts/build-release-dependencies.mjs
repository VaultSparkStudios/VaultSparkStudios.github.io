#!/usr/bin/env node
/** Build a public-safe, signature-aware release dependency handshake. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STUDIO_ROOT = resolve(ROOT, '..', 'vaultspark-studio-ops');
const CONFIG_PATH = join(ROOT, 'config', 'release-dependencies.json');
const OUT = join(ROOT, 'api', 'release-dependencies.json');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => JSON.stringify(value, Object.keys(value).sort());

function linkedCargoId(cargo) {
  const payload = cargo?.payload || {};
  const ids = [payload.origCargoId, ...(payload.origCargoIds || []), payload.replyToCargoId, payload.requestCargoId];
  return ids.filter(Boolean);
}

export function deriveDependency({ config, cargo, receipts = [], replies = [], signatureState = 'unverified', now = new Date() }) {
  const contractSha256 = sha256(JSON.stringify({
    id: config.id,
    cargoId: config.cargoId,
    ownerSlug: config.ownerSlug,
    requesterSlug: config.requesterSlug,
    type: config.type,
    requestedChecks: config.requestedChecks,
    expectedAcceptance: config.expectedAcceptance,
  }));
  if (!cargo) {
    return { id: config.id, cargoId: config.cargoId, ownerSlug: config.ownerSlug, contractSha256, status: 'missing', signatureState, requestedChecks: config.requestedChecks };
  }
  const exact = cargo.id === config.cargoId
    && cargo.from === config.requesterSlug
    && cargo.to === config.ownerSlug
    && cargo.type === config.type
    && JSON.stringify(cargo.payload?.acceptance || []) === JSON.stringify(config.expectedAcceptance);
  const expiresAt = new Date(new Date(cargo.shippedAt).getTime() + Number(cargo.ttlHours || 0) * 3600_000).toISOString();
  const ack = receipts
    .filter((item) => item.from === config.ownerSlug && linkedCargoId(item).includes(config.cargoId))
    .sort((a, b) => String(a.shippedAt).localeCompare(String(b.shippedAt))).at(-1) || null;
  const completion = replies
    .filter((item) => item.from === config.ownerSlug && linkedCargoId(item).includes(config.cargoId))
    .sort((a, b) => String(a.shippedAt).localeCompare(String(b.shippedAt))).at(-1) || null;
  let status = 'sent';
  if (!exact || signatureState !== 'verified') status = 'invalid';
  else if (completion) status = 'completed';
  else if (now.getTime() > new Date(expiresAt).getTime()) status = 'expired';
  else if (ack) status = 'acknowledged';
  return {
    id: config.id,
    cargoId: config.cargoId,
    ownerSlug: config.ownerSlug,
    requesterSlug: config.requesterSlug,
    contractSha256,
    cargoSignatureSha256: /^[a-f0-9]{64}$/.test(cargo.sig || '') ? sha256(cargo.sig) : null,
    signatureState,
    status,
    requestedChecks: config.requestedChecks,
    sentAt: cargo.shippedAt,
    acknowledgedAt: ack?.shippedAt || null,
    completedAt: completion?.shippedAt || null,
    expiresAt,
    ttlHours: cargo.ttlHours,
  };
}

export function validateReceipt(receipt) {
  const errors = [];
  if (receipt?.schemaVersion !== 1 || receipt?.publicSafe !== true) errors.push('receipt envelope invalid');
  if (!['completed', 'pending', 'rejected'].includes(receipt?.state)) errors.push('unknown aggregate state');
  if (!Array.isArray(receipt?.dependencies) || receipt.dependencies.length === 0) errors.push('dependencies missing');
  for (const dep of receipt?.dependencies || []) {
    if (!/^[a-f0-9]{64}$/.test(dep.contractSha256 || '')) errors.push(`${dep.id}: contract hash missing`);
    if (!['missing', 'invalid', 'sent', 'acknowledged', 'expired', 'completed'].includes(dep.status)) errors.push(`${dep.id}: status invalid`);
    if (!Array.isArray(dep.requestedChecks) || dep.requestedChecks.length === 0) errors.push(`${dep.id}: checks missing`);
  }
  const allDone = receipt?.dependencies?.every((dep) => dep.status === 'completed');
  if ((receipt?.state === 'completed') !== Boolean(allDone)) errors.push('aggregate/dependency disagreement');
  if (/"payload"\s*:/.test(JSON.stringify(receipt))) errors.push('payload bodies are forbidden');
  return errors;
}

// S324: the --check exit code as a pure function, so the self-test can prove it
// fails in the exact direction the old branch never could (a well-formed
// `rejected` receipt). Returns 0 = pass · 1 = hold.
export function receiptCheckExit(receipt) {
  if (validateReceipt(receipt).length) return 1;
  return receipt.state === 'rejected' ? 1 : 0;
}

function selfTest() {
  const config = {
    id: 'dep', cargoId: '01TEST', ownerSlug: 'owner', requesterSlug: 'requester', type: 'repo-question',
    requestedChecks: ['one'], expectedAcceptance: ['one'],
  };
  const cargo = { id: '01TEST', from: 'requester', to: 'owner', type: 'repo-question', shippedAt: '2026-01-01T00:00:00.000Z', ttlHours: 72, payload: { acceptance: ['one'] }, sig: 'a'.repeat(64) };
  const sent = deriveDependency({ config, cargo, signatureState: 'verified', now: new Date('2026-01-02T00:00:00Z') });
  const ackCargo = { from: 'owner', shippedAt: '2026-01-02T01:00:00Z', payload: { origCargoIds: ['01TEST'] } };
  const ack = deriveDependency({ config, cargo, receipts: [ackCargo], signatureState: 'verified', now: new Date('2026-01-02T02:00:00Z') });
  const expired = deriveDependency({ config, cargo, signatureState: 'verified', now: new Date('2026-01-05T02:00:00Z') });
  const completed = deriveDependency({ config, cargo, replies: [{ ...ackCargo, payload: { replyToCargoId: '01TEST' } }], signatureState: 'verified', now: new Date('2026-01-02T02:00:00Z') });
  const invalid = deriveDependency({ config, cargo: { ...cargo, to: 'other' }, signatureState: 'verified', now: new Date('2026-01-02T00:00:00Z') });
  const cases = [
    ['sent', sent.status === 'sent'], ['acknowledged', ack.status === 'acknowledged'],
    ['expired', expired.status === 'expired'], ['completed', completed.status === 'completed'],
    ['mismatch rejected', invalid.status === 'invalid'], ['payload excluded', !JSON.stringify(sent).includes('payload')],
  ];

  // S324 · --check exit-code contract, both directions. The pre-S324 branch
  // returned 0 for every one of these, including the rejected one.
  const envelope = (state, status) => ({
    schemaVersion: 1, publicSafe: true, state,
    dependencies: [{ id: 'dep', contractSha256: 'a'.repeat(64), status, requestedChecks: ['one'] }],
  });
  cases.push(['check holds on a well-formed rejected receipt', receiptCheckExit(envelope('rejected', 'missing')) === 1]);
  cases.push(['check holds on an expired dependency', receiptCheckExit(envelope('rejected', 'expired')) === 1]);
  cases.push(['check passes a completed receipt', receiptCheckExit(envelope('completed', 'completed')) === 0]);
  cases.push(['check passes an in-flight pending receipt', receiptCheckExit(envelope('pending', 'sent')) === 0]);
  cases.push(['check holds on a malformed receipt', receiptCheckExit({ schemaVersion: 1, publicSafe: true, state: 'pending', dependencies: [] }) === 1]);
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`build-release-dependencies --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

export async function buildReleaseDependencies() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  let cargo = [];
  let posture = { ok: false, activeFailures: [], disposed: [], retired: [] };
  try {
    const ark = await import(pathToFileURL(join(STUDIO_ROOT, 'scripts', 'lib', 'ark.mjs')).href);
    cargo = ark.listCargo({ sinceHours: 168, studioOpsRoot: STUDIO_ROOT });
    posture = ark.inspectCargoSignatures({ sinceHours: 168, studioOpsRoot: STUDIO_ROOT });
  } catch {}
  const invalidIds = new Set([
    ...(posture.activeFailures || []).map((item) => item.cargo?.id),
    ...(posture.disposed || []).map((item) => item.cargo?.id),
    ...(posture.retired || []).map((item) => item.id),
  ]);
  const receipts = cargo.filter((item) => item.type === 'cargo-receipt');
  const replies = cargo.filter((item) => ['repo-answer', 'unblock-signal', 'release-dependency-ack'].includes(item.type));
  const dependencies = config.dependencies.map((dep) => {
    const request = cargo.find((item) => item.id === dep.cargoId);
    const signatureState = posture.ok && request && !invalidIds.has(dep.cargoId) ? 'verified' : 'unverified';
    return deriveDependency({ config: dep, cargo: request, receipts, replies, signatureState });
  });
  const state = dependencies.every((dep) => dep.status === 'completed')
    ? 'completed'
    : (dependencies.some((dep) => ['missing', 'invalid', 'expired'].includes(dep.status)) ? 'rejected' : 'pending');
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/build-release-dependencies.mjs',
    publicSafe: true,
    state,
    dependencies,
    privacy: { payloadBodiesIncluded: false, credentialsIncluded: false },
  };
}

export async function writeReleaseDependencies() {
  const receipt = await buildReleaseDependencies();
  const errors = validateReceipt(receipt);
  if (errors.length) throw new Error(errors.join('; '));
  writeFileSync(OUT, `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('/build-release-dependencies.mjs');
if (isMain && process.argv.includes('--self-test')) selfTest();
if (isMain && process.argv.includes('--check')) {
  try {
    const receipt = JSON.parse(readFileSync(OUT, 'utf8'));
    const errors = validateReceipt(receipt);
    if (errors.length) throw new Error(errors.join('; '));
    const summary = `${receipt.state} · ${receipt.dependencies.map((dep) => `${dep.id}:${dep.status}`).join(', ')}`;
    // S324: this branch used to print `rejected` and then fall out of the try
    // with exit 0 — a well-formed rejection read as a pass, so the handshake
    // gate could never hold a release. `rejected` means a declared dependency
    // is missing/invalid/expired and IS a failure. `pending` is an honest
    // in-flight state (cargo sent, not yet answered) and stays non-blocking.
    if (receipt.state === 'rejected') {
      console.error(`✗ build-release-dependencies --check: ${summary}`);
      process.exit(1);
    }
    console.log(`build-release-dependencies --check: ${summary}`);
  } catch (error) {
    console.error(`build-release-dependencies --check failed: ${error.message}`);
    process.exit(1);
  }
} else if (isMain) {
  const receipt = await writeReleaseDependencies();
  console.log(`build-release-dependencies: ${receipt.state} · ${receipt.dependencies.map((dep) => `${dep.id}:${dep.status}`).join(', ')}`);
}
