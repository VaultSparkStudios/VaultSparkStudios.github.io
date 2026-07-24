#!/usr/bin/env node
/** Build a deterministic, privacy-safe Obelisk Phase-2 migration receipt. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'identity-migration-receipt.json');
const EVIDENCE_PATH = path.join(ROOT, 'context', 'IDENTITY_MIGRATION_EVIDENCE.json');
const CONTROL_PATH = path.join(ROOT, 'api', 'supabase-control-plane.json');
const WRANGLER_PATH = path.join(ROOT, 'cloudflare', 'wrangler.toml');
const AUTH_PATH = path.join(ROOT, 'cloudflare', 'obelisk-auth.js');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relativePath))).digest('hex');
}
function capture(source, regex, label) {
  const match = source.match(regex);
  if (!match) throw new Error(`identity receipt could not derive ${label}`);
  return match[1];
}

export function deriveReceipt({ evidence, controlPlane, wranglerSource, authSource, hashes }) {
  const issuer = capture(authSource, /issuer:\s*'([^']+)'/, 'issuer');
  const callbackUrl = capture(wranglerSource, /OBELISK_REDIRECT_URI\s*=\s*"([^"]+)"/, 'callback URI');
  const callback = new URL(callbackUrl);
  const runtime = evidence.runtimeUpdates;
  const journey = evidence.providerJourney;
  const blockers = [];
  if (runtime.databaseMigration.deployed !== true || runtime.databaseMigration.verification !== 'passed') blockers.push('supabase-migration-pending');
  if (runtime.edgeFunction.deployed !== true || runtime.edgeFunction.verification !== 'passed') blockers.push('eternal-function-pending');
  const journeyPassed = journey.signedInCallback === 'passed'
    && journey.compatibilitySession === 'passed'
    && journey.roleMatrix?.member === 'passed'
    && journey.roleMatrix?.investor === 'passed'
    && journey.revocation === 'passed';
  if (!journeyPassed) blockers.push('real-provider-e2e-pending');
  if (controlPlane.overall !== 'ready') blockers.push('supabase-control-plane-partial');
  const rollbackReady = evidence.rollback?.worker === 'prior-version-available'
    && /^\d{14}$/.test(evidence.rollback?.staticSnapshot || '')
    && evidence.rollback?.automaticLivenessRollback === true;
  if (!rollbackReady) blockers.push('rollback-evidence-incomplete');

  const productionEligible = blockers.length === 0
    && evidence.edgeDeployment?.anonymousHealth === 'passed';
  return {
    schemaVersion: '1.0',
    generatedAt: evidence.updatedAt,
    generatedBy: 'scripts/build-identity-migration-receipt.mjs',
    publicSafe: true,
    migrationId: evidence.migrationId,
    environment: evidence.environment,
    state: productionEligible ? 'verified' : 'honest-dark',
    productionEligible,
    bindings: {
      issuer,
      callbackHost: callback.host,
      callbackPath: callback.pathname,
      worker: evidence.edgeDeployment,
    },
    runtimeUpdates: {
      databaseMigration: { ...runtime.databaseMigration, sha256: hashes.migration },
      edgeFunction: { ...runtime.edgeFunction, sha256: hashes.edgeFunction },
    },
    providerJourney: journey,
    rollback: { ...evidence.rollback, ready: rollbackReady },
    controlPlane: {
      overall: controlPlane.overall,
      readyPlanes: Object.values(controlPlane.planes || {}).filter((plane) => plane.status === 'ready').length,
      totalPlanes: Object.keys(controlPlane.planes || {}).length,
    },
    blockers: [...new Set(blockers)].sort(),
    privacy: {
      userIdentifiers: 'excluded',
      credentials: 'excluded',
      providerClaims: 'excluded',
    },
  };
}

export function validateReceipt(receipt) {
  const errors = [];
  if (receipt?.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (receipt?.publicSafe !== true) errors.push('publicSafe must be true');
  if (!['verified', 'honest-dark'].includes(receipt?.state)) errors.push('state is invalid');
  if (receipt?.state === 'verified' !== (receipt?.productionEligible === true)) errors.push('state and productionEligible disagree');
  if (!/^https:\/\//.test(receipt?.bindings?.issuer || '')) errors.push('issuer must be HTTPS');
  if (!/^[0-9a-f-]{36}$/i.test(receipt?.bindings?.worker?.versionId || '')) errors.push('Worker version is invalid');
  if (!/^[0-9a-f]{64}$/i.test(receipt?.runtimeUpdates?.databaseMigration?.sha256 || '')) errors.push('migration hash is invalid');
  if (!/^[0-9a-f]{64}$/i.test(receipt?.runtimeUpdates?.edgeFunction?.sha256 || '')) errors.push('Function hash is invalid');
  if (!Array.isArray(receipt?.blockers)) errors.push('blockers must be an array');
  if (receipt?.productionEligible && receipt.blockers.length) errors.push('eligible receipt cannot have blockers');
  const serialized = JSON.stringify(receipt);
  if (/(authorization|bearer\s|service_role|refresh_token|access_token|id_token|@[a-z0-9.-]+\.[a-z]{2,})/i.test(serialized)) {
    errors.push('receipt contains credential, claim, or user-adjacent material');
  }
  return errors;
}

function selfTest() {
  const baseEvidence = {
    migrationId: 'obelisk-phase2', environment: 'staging', updatedAt: '2026-01-01T00:00:00Z',
    edgeDeployment: { workerName: 'worker-staging', versionId: '11111111-1111-4111-8111-111111111111', sourceCommit: 'a'.repeat(40), anonymousHealth: 'passed' },
    runtimeUpdates: {
      databaseMigration: { path: 'migration.sql', deployed: false, verification: 'unverified' },
      edgeFunction: { path: 'function.ts', deployed: false, verification: 'unverified' },
    },
    providerJourney: { signedInCallback: 'unverified', compatibilitySession: 'unverified', roleMatrix: { member: 'unverified', investor: 'unverified' }, revocation: 'unverified' },
    rollback: { worker: 'prior-version-available', staticSnapshot: '20260101010101', automaticLivenessRollback: true },
  };
  const sources = { wranglerSource: 'OBELISK_REDIRECT_URI = "https://staging.example.com/auth/callback"', authSource: "issuer: 'https://issuer.example.com'", hashes: { migration: 'a'.repeat(64), edgeFunction: 'b'.repeat(64) } };
  const partialControl = { overall: 'partial', planes: { a: { status: 'ready' }, b: { status: 'blocked' } } };
  const dark = deriveReceipt({ evidence: baseEvidence, controlPlane: partialControl, ...sources });
  const passedJourney = { signedInCallback: 'passed', compatibilitySession: 'passed', roleMatrix: { member: 'passed', investor: 'passed' }, revocation: 'passed' };
  const verified = deriveReceipt({
    evidence: { ...baseEvidence, runtimeUpdates: { databaseMigration: { path: 'migration.sql', deployed: true, verification: 'passed' }, edgeFunction: { path: 'function.ts', deployed: true, verification: 'passed' } }, providerJourney: passedJourney },
    controlPlane: { overall: 'ready', planes: { a: { status: 'ready' }, b: { status: 'ready' } } },
    ...sources,
  });
  const cases = [
    ['unknown provider proof stays honest-dark', dark.state === 'honest-dark' && dark.productionEligible === false],
    ['runtime blockers remain distinct', dark.blockers.includes('supabase-migration-pending') && dark.blockers.includes('eternal-function-pending')],
    ['role/revocation gaps share the real-provider gate', dark.blockers.includes('real-provider-e2e-pending')],
    ['partial authority remains blocking', dark.blockers.includes('supabase-control-plane-partial')],
    ['all evidence can produce verified eligibility', verified.state === 'verified' && verified.blockers.length === 0],
    ['receipt validator accepts dark state', validateReceipt(dark).length === 0],
    ['privacy fields remain explicit', dark.privacy.credentials === 'excluded' && dark.privacy.userIdentifiers === 'excluded'],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([label, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${label}`));
  console.log(`identity-migration-receipt self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

const args = new Set(process.argv.slice(2));
if (args.has('--self-test')) {
  selfTest();
} else {
  const evidence = readJson(EVIDENCE_PATH);
  const controlPlane = readJson(CONTROL_PATH);
  const receipt = deriveReceipt({
    evidence,
    controlPlane,
    wranglerSource: fs.readFileSync(WRANGLER_PATH, 'utf8'),
    authSource: fs.readFileSync(AUTH_PATH, 'utf8'),
    hashes: {
      migration: sha256(evidence.runtimeUpdates.databaseMigration.path),
      edgeFunction: sha256(evidence.runtimeUpdates.edgeFunction.path),
    },
  });
  const errors = validateReceipt(receipt);
  if (errors.length) throw new Error(errors.join('\n'));
  const content = `${JSON.stringify(receipt, null, 2)}\n`;
  if (args.has('--check')) {
    const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (actual !== content) {
      console.error('identity-migration-receipt --check: artifact drifted');
      process.exit(1);
    }
    console.log(`identity-migration-receipt --check: ${receipt.state} (${receipt.blockers.length} blocker(s))`);
  } else {
    fs.writeFileSync(OUT, content, 'utf8');
    console.log(`identity-migration-receipt: ${receipt.state} (${receipt.blockers.length} blocker(s))`);
  }
}
