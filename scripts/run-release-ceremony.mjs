#!/usr/bin/env node
/**
 * One-command production release ceremony.
 *
 * Every full production promotion must prove the exact canonical staging
 * tenant in a browser, the provider redirect contract, staging deploy lineage,
 * a ready promotion interlock, and a Doctor receipt with blockingFailing=0.
 * Raw subprocess output is deliberately discarded from the public artifact.
 */
import { spawnSync } from './lib/safe-spawn.mjs';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { promotionMode } from './check-production-promotion-gate.mjs';
import * as nativeEvidence from './lib/isolated-staging-evidence.mjs';
import { runtimeContextArgs, loadRuntimeContext, runtimeArtifactPath, CONTRACT_FILES, assertAdmittedContext } from './lib/isolated-staging-evidence.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STUDIO_ROOT = resolve(ROOT, '..', 'vaultspark-studio-ops');
const direct=process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url);
const isolatedArgs=direct ? runtimeContextArgs(process.argv.slice(2)) : null;
const isolatedContext=isolatedArgs ? await loadRuntimeContext(ROOT,isolatedArgs.file,isolatedArgs.hash) : null;
const isolatedCli=isolatedArgs ? [`--isolated-staging-context=${isolatedArgs.file}`,`--isolated-staging-context-sha256=${isolatedArgs.hash}`] : [];
const nativeRuntime=isolatedContext?.installation?.schemaVersion===2 ? nativeEvidence.stageNativeAuthorization(isolatedContext) : null;
const OUT = isolatedContext ? runtimeArtifactPath(ROOT,isolatedContext,'release-ceremony') : join(ROOT, 'api', 'release-ceremony.json');
const CANONICAL_STAGING = 'https://website.staging.vaultsparkstudios.com';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

function argValue(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function exactStagingOrigin(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}` === CANONICAL_STAGING && url.pathname === '/';
  } catch {
    return false;
  }
}

function runScript(id, relative, args = []) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [join(ROOT, relative), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, STAGING_RELEASE_URL: CANONICAL_STAGING, STAGING_RELEASE_REQUIRED: '1' },
  });
  return {
    id,
    state: result.status === 0 ? 'passed' : 'rejected',
    exitCode: result.status ?? 1,
    durationMs: Date.now() - started,
  };
}

function currentDoctorStep({ live }) {
  const started = Date.now();
  if (live) {
    const doctor = join(STUDIO_ROOT, 'scripts', 'run-doctor.mjs');
    if (!existsSync(doctor)) {
      return { id: 'doctor', state: 'rejected', exitCode: 2, durationMs: Date.now() - started, reason: 'studio-doctor-unavailable' };
    }
    spawnSync(process.execPath, [doctor, '--json', '--machine', '--update-json'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
  }
  let score;
  try { score = readJson('context/PROJECT_STATUS.json').doctorScore; } catch {}
  let deployCurrency;
  try { deployCurrency = readJson('api/deploy-currency.json'); } catch {}
  let releaseProof;
  try { releaseProof = isolatedContext ? JSON.parse(readFileSync(runtimeArtifactPath(ROOT,isolatedContext,'release-proof'),'utf8')) : readJson('api/release-proof.json'); } catch {}
  let browserReceipt;
  try { browserReceipt = readJson('api/staging-release-browser.json'); } catch {}
  let attentionReceipt;
  try { attentionReceipt = readJson('api/staging-attention-browser.json'); } catch {}
  return evaluateDoctorStep(score, deployCurrency, { releaseProof, browserReceipt, attentionReceipt }, Date.now() - started,isolatedContext);
}

function evaluateDoctorStep(score, deployCurrency, stagingEvidence = {}, durationMs = 0, variantContext = null) {
  const blocking = Number(score?.blockingFailing ?? Number.POSITIVE_INFINITY);
  const blockingChecks = Array.isArray(score?.checks)
    ? score.checks.filter((check) => check?.blocking === true && check?.pass !== true)
    : [];
  const staging = stagingEvidence.releaseProof?.staging;
  const browser = stagingEvidence.browserReceipt;
  const attention = stagingEvidence.attentionReceipt;
  let variant=null;
  try { variant=variantContext ? assertAdmittedContext(variantContext) : null; }
  catch {return{id:'doctor',state:'rejected',exitCode:1,durationMs,reason:'isolated-observation-expired-or-invalid'};}
  const identityBound=variant ? stagingEvidence.releaseProof?.mode==='isolated-variant'
    && stagingEvidence.releaseProof?.isolatedStaging?.observationSha256===variant.transport.observationHash
    && staging?.candidateBuildSha===variant.receipt.productionSource.commitSha
    : staging?.candidateShaBound===true && staging?.candidateBuildSha===staging?.deployedBuildSha && staging?.artifactManifest?.matched===true;
  const verifiedStagingCandidate = staging?.candidateReady === true
    && identityBound
    && staging?.deployReceipt?.state === 'verified'
    && staging?.deployReceipt?.attested === true
    && /^[a-f0-9]{24}$/.test(staging?.deployReceipt?.receiptId || '')
    && /^[a-f0-9]{64}$/.test(staging?.artifactManifest?.candidateRoot || '')
    && browser?.state === 'passed'
    && browser?.skipped === 0
    && browser?.observedTests === browser?.expectedTests
    && attention?.state === 'passed'
    && attention?.skipped === 0
    && attention?.failed === 0
    && attention?.flaky === 0
    && attention?.observedTests === 15
    && attention?.expectedTests === 15;
  // Production being stale is the condition this ceremony exists to repair.
  // Requiring that probe to turn green before a production deploy creates an
  // impossible cycle. Exempt only the single, explicitly identified stale
  // production reading; missing/unverified/diverged evidence and every other
  // Doctor blocker remain fail-closed.
  const expectedPreDeployStaleness = blocking === 1
    && blockingChecks.length === 1
    && blockingChecks[0].id === 'deploy-currency-live'
    && deployCurrency?.state === 'stale'
    && verifiedStagingCandidate;
  const acceptedBlocking = blocking === 0 || expectedPreDeployStaleness;
  return {
    id: 'doctor',
    state: acceptedBlocking ? 'passed' : 'rejected',
    exitCode: acceptedBlocking ? 0 : 1,
    durationMs,
    blockingFailing: Number.isFinite(blocking) ? blocking : null,
    exemptedBlocking: expectedPreDeployStaleness ? 1 : 0,
    reason: expectedPreDeployStaleness ? 'expected-pre-deploy-staleness' : undefined,
    stagingReceiptId: expectedPreDeployStaleness ? staging.deployReceipt.receiptId : undefined,
    stagingBuildSha: expectedPreDeployStaleness ? staging.deployedBuildSha : undefined,
    stagingArtifactRoot: expectedPreDeployStaleness ? staging.artifactManifest.candidateRoot : undefined,
    stagingBrowserGeneratedAt: expectedPreDeployStaleness ? browser.generatedAt : undefined,
    stagingAttentionGeneratedAt: expectedPreDeployStaleness ? attention.generatedAt : undefined,
    observedDate: score?.date || null,
  };
}

/**
 * Full-rollout readiness uses the existing clear contract or actual admitted
 * stage-native evidence for the exact affected candidate. The production hold
 * remains truthful pending postflight. A critical-leaf subset cannot establish
 * that the full archive or Worker is disjoint from affected identity bytes.
 */
function promotionReadyStep() {
  const started = Date.now();
  let promotion, identityReceipt, controlPlane, manifest;
  try { promotion=readJson('context/PRODUCTION_PROMOTION.json'); } catch {}
  try { identityReceipt=readJson('api/identity-migration-receipt.json'); } catch {}
  try { controlPlane=readJson('api/supabase-control-plane.json'); } catch {}
  try { manifest=readJson('api/candidate-artifact-manifest.json'); } catch {}
  const mode=promotionMode(promotion,'workflow_dispatch','true',{
    identityReceipt,controlPlane,candidateLeaves:manifest?.leaves,footprint:'full',isolatedContext,
  });
  const native=mode==='affected-auth-stage-verified' ? nativeEvidence.stageNativeAuthorization(isolatedContext) : null;
  return {
    id:'promotion-ready',state:mode==='blocked'?'rejected':'passed',exitCode:mode==='blocked'?1:0,
    durationMs:Date.now()-started,releaseState:promotion?.releaseState||'unknown',
    reasonCodes:Array.isArray(promotion?.reasons)?promotion.reasons:['promotion-receipt-unavailable'],
    promotionMode:mode,scopeReason:null,heldSurfaces:[],blockedLeaves:[],unclassifiedLeaves:[],
    ...(native ? {stageNativeSha256:native.stageNativeSha256,productionNativePending:true,fullReleaseAccepted:false} : {}),
  };
}

function artifactStep(id, path, predicate, details = () => ({})) {
  const started = Date.now();
  let value;
  try { value = readJson(path); } catch {}
  const passed = Boolean(value && predicate(value));
  return {
    id,
    state: passed ? 'passed' : 'rejected',
    exitCode: passed ? 0 : 1,
    durationMs: Date.now() - started,
    ...details(value || {}),
  };
}

function evidenceHash(paths) {
  const parts = [];
  for (const path of paths) {
    try { parts.push(`${path}\0${read(path)}`); } catch { parts.push(`${path}\0missing`); }
  }
  return sha256(parts.join('\n'));
}

function currentCeremonyHashes(contextFile=null) {
  return {
evidenceSha256:evidenceHash([
    'api/obelisk-redirect-readiness.json',
    'api/staging-deploy-receipt.json',
    'api/staging-deploy-continuity.json',
    'api/staging-release-browser.json',
    'api/staging-attention-browser.json',
    'context/PRODUCTION_PROMOTION.json',
    'context/PROJECT_STATUS.json',
    ...(contextFile ? [contextFile] : []),
  ]),
contractSha256:evidenceHash([
    'scripts/run-release-ceremony.mjs',
    'scripts/run-staging-release-gate.mjs',
    'tests/staging-release.spec.js',
    // S337: the release contract must cover the code that DECIDES pass/fail.
    // The Trusted Types report-only classifier moved out of the spec into this
    // module (a spec importing another spec double-registers its tests), and it
    // is what separates an expected report-only notice from a real console
    // error. Left unhashed, the single most consequential predicate in the
    // browser gate could change without changing contractSha256.
    'tests/lib/tt-report-only.js',
    'scripts/run-attention-release-gate.mjs',
    'tests/attention-surfaces.spec.js',
    'scripts/check-production-promotion-gate.mjs',
    ...(contextFile ? CONTRACT_FILES : []),
  ]),
  };
}

function priorReceiptHash() {
  try { return sha256(readFileSync(OUT)); } catch { return null; }
}

const EXPECTED_STEP_IDS = ['redirect-readiness-probe', 'redirect-readiness', 'staging-deploy-lineage', 'lane-held-asset-drift', 'staging-browser', 'staging-browser-receipt', 'attention-browser', 'attention-browser-receipt', 'promotion-contract', 'promotion-ready', 'doctor'];
Object.freeze(EXPECTED_STEP_IDS);

function validateReceipt(receipt, native = null) {
  const errors = [];
  if (receipt?.stagingMode !== undefined && (receipt.stagingMode!=='isolated-variant'
    || !/^[a-f0-9]{64}$/.test(receipt.installationPayloadSha256 || '')
    || !/^[a-f0-9]{64}$/.test(receipt.observationPayloadSha256 || ''))) errors.push('invalid isolated ceremony association');
  if (!['passed', 'rejected'].includes(receipt?.state)) errors.push('unknown state');
  if (receipt?.publicSafe !== true) errors.push('publicSafe must be true');
  if (receipt?.stagingOrigin !== CANONICAL_STAGING) errors.push('canonical staging origin mismatch');
  const steps = Array.isArray(receipt?.steps) ? receipt.steps : [];
  const ids = steps.map((step) => step?.id);
  if (steps.length !== EXPECTED_STEP_IDS.length || new Set(ids).size !== EXPECTED_STEP_IDS.length || EXPECTED_STEP_IDS.some((id) => !ids.includes(id))) errors.push('exact eleven ceremony step IDs required; missing, duplicate or unknown step');
  if (!/^[a-f0-9]{64}$/.test(receipt?.evidenceSha256 || '')) errors.push('evidence hash missing');
  if (!/^[a-f0-9]{64}$/.test(receipt?.contractSha256 || '')) errors.push('contract hash missing');
  if (Object.hasOwn(receipt || {}, 'stdout') || Object.hasOwn(receipt || {}, 'stderr')) errors.push('subprocess output retained');
  const allPassed = steps.length > 0 && steps.every((step) => step?.state === 'passed');
  if ((receipt?.state === 'passed') !== Boolean(allPassed)) errors.push('state/step disagreement');
  if (!native && receipt?.promotionMode==='affected-auth-stage-verified') errors.push('stage-native context required');
  if (native) {
    const promotion = steps.find(step => step?.id === 'promotion-ready');
    if (receipt?.promotionMode !== native.mode || receipt.productionNativePending !== true || receipt.fullReleaseAccepted !== false
      || promotion?.promotionMode !== native.mode || promotion?.productionNativePending !== true
      || promotion?.stageNativeSha256 !== native.stageNativeSha256) errors.push('stage-native authorization association changed');
  }
  return errors;
}

function selfTest() {
  if (!exactStagingOrigin(`${CANONICAL_STAGING}/`)) throw new Error('canonical origin rejected');
  if (exactStagingOrigin('https://evil.example/')) throw new Error('foreign origin accepted');
  const steps = EXPECTED_STEP_IDS.map((id) => ({ id, state: 'passed' }));
  const base = {
    state: 'passed', publicSafe: true, stagingOrigin: CANONICAL_STAGING, steps,
    evidenceSha256: 'a'.repeat(64), contractSha256: 'b'.repeat(64),
  };
  if (validateReceipt(base).length) throw new Error('green receipt rejected');
  for (const invalidSteps of [steps.filter((step) => step.id !== 'lane-held-asset-drift'), [...steps, { id: 'unexpected', state: 'passed' }], steps.map((step, index) => index === 3 ? steps[0] : step), steps.map((step, index) => index === 3 ? { ...step, id: 'unexpected' } : step), steps.map((step, index) => index === 3 ? null : step), null, {}]) {
    if (!validateReceipt({ ...base, steps: invalidSteps }).length) throw new Error('missing, duplicate, unknown or malformed ceremony steps accepted');
  }
  const skippedBrowser = { ...base, state: 'rejected', steps: steps.map((step, index) => index === 3 ? { ...step, state: 'rejected', skipped: 1 } : step) };
  if (validateReceipt(skippedBrowser).length) throw new Error('honest rejected receipt malformed');
  const lying = { ...skippedBrowser, state: 'passed' };
  if (!validateReceipt(lying).some((error) => error.includes('disagreement'))) throw new Error('lying receipt accepted');
  const staleOnly = { date: '2026-08-16', blockingFailing: 1, checks: [{ id: 'deploy-currency-live', blocking: true, pass: false }] };
  const verifiedStaging = {
    releaseProof: { staging: {
      candidateReady: true, candidateShaBound: true, candidateBuildSha: '1'.repeat(40), deployedBuildSha: '1'.repeat(40),
      artifactManifest: { matched: true, candidateRoot: 'a'.repeat(64) },
      deployReceipt: { state: 'verified', attested: true, receiptId: 'b'.repeat(24) },
    } },
    browserReceipt: { state: 'passed', skipped: 0, observedTests: 6, expectedTests: 6, generatedAt: '2026-08-16T00:00:00.000Z' },
    attentionReceipt: { state: 'passed', skipped: 0, failed: 0, flaky: 0, observedTests: 15, expectedTests: 15, generatedAt: '2026-08-16T00:00:00.000Z' },
  };
  if (evaluateDoctorStep(staleOnly, { state: 'stale' }, verifiedStaging).state !== 'passed') throw new Error('expected pre-deploy staleness was not accepted');
  if (evaluateDoctorStep(staleOnly, { state: 'unverified' }, verifiedStaging).state !== 'rejected') throw new Error('unverified production was exempted');
  if (evaluateDoctorStep(staleOnly, { state: 'stale' }, {}).state !== 'rejected') throw new Error('staleness without verified staging was exempted');
  if (evaluateDoctorStep({ ...staleOnly, blockingFailing: 2 }, { state: 'stale' }, verifiedStaging).state !== 'rejected') throw new Error('multiple Doctor blockers were exempted');
  if (evaluateDoctorStep({ date: '2026-08-16', blockingFailing: 0, checks: [] }, { state: 'current' }, {}).state !== 'passed') throw new Error('green Doctor was rejected');
  console.log('run-release-ceremony --self-test: OK (origin + exact eleven-step IDs + fail-closed receipts + pre-deploy Doctor classification)');
}

if (direct) {
if (process.argv.includes('--self-test')) {
  try { selfTest(); } catch (error) { console.error(`self-test failed: ${error.message}`); process.exit(1); }
  process.exit(0);
}

if (process.argv.includes('--check')) {
  try {
    const receipt = JSON.parse(readFileSync(OUT, 'utf8'));
    const expectedPromotion = promotionReadyStep();
    const errors = validateReceipt(receipt,expectedPromotion.promotionMode==='affected-auth-stage-verified'?nativeRuntime:null);
    const recordedPromotion = receipt.steps?.find(step=>step?.id==='promotion-ready');
    if (recordedPromotion?.promotionMode!==expectedPromotion.promotionMode || recordedPromotion?.state!==expectedPromotion.state) errors.push('ceremony promotion authorization changed');
    if(isolatedContext && (receipt.stagingMode!=='isolated-variant'
      || receipt.installationPayloadSha256!==isolatedContext.transport.installationHash
      || receipt.observationPayloadSha256!==isolatedContext.transport.observationHash)) errors.push('ceremony runtime evidence association changed');
    if (process.argv.includes('--require-fresh')) {
      const generatedAt = Date.parse(receipt.generatedAt);
      if (!Number.isFinite(generatedAt) || generatedAt > Date.now() + 60_000 || Date.now() - generatedAt > 15 * 60_000) {
        errors.push('receipt is not fresh (maximum age 15 minutes)');
      }
      const currentContractSha256 = currentCeremonyHashes(isolatedArgs?.file || null).contractSha256;
      if (receipt.contractSha256 !== currentContractSha256) errors.push('receipt is not bound to the current release contract');
    }
    if (errors.length) throw new Error(errors.join('; '));
    console.log(`release ceremony --check: ${receipt.state} · ${receipt.steps.filter((step) => step.state === 'passed').length}/${receipt.steps.length}`);
    process.exit(receipt.state === 'passed' || !process.argv.includes('--require-ready') ? 0 : 1);
  } catch (error) {
    console.error(`release ceremony receipt invalid: ${error.message}`);
    process.exit(1);
  }
}

const suppliedOrigin = argValue('--url') || process.env.STAGING_RELEASE_URL || '';
if (!exactStagingOrigin(suppliedOrigin)) {
  console.error(`Release ceremony requires --url=${CANONICAL_STAGING} exactly.`);
  process.exit(2);
}

const priorSha256 = priorReceiptHash();
const steps = [];
steps.push(runScript('redirect-readiness-probe', 'scripts/check-obelisk-redirect-readiness.mjs'));
steps.push(artifactStep('redirect-readiness', 'api/obelisk-redirect-readiness.json', (value) => value.state === 'passed' && value.ready === true,
  (value) => ({ verdict: value.state || 'unavailable', contractSha256: value.contractSha256 || null })));
steps.push(runScript('staging-deploy-lineage', 'scripts/check-staging-deploy-receipt.mjs',isolatedCli));
// S357 — lane-held asset drift, measured at the moment it matters. The content
// lane HOLDS unhashed .js, so a plain client script cannot be updated by a
// promotion; it changes only on a full deploy. That is how a fetch S356 deleted
// stayed live in served bytes. This reports (exit 0 unless --strict) so the
// number is in front of whoever is promoting, rather than reconstructed by hand
// after a browser gate happens to trip over the consequence.
steps.push(runScript('lane-held-asset-drift', 'scripts/check-lane-held-asset-drift.mjs', [`--origin=${CANONICAL_STAGING}`]));
steps.push(runScript('staging-browser', 'scripts/run-staging-release-gate.mjs', [`--url=${CANONICAL_STAGING}`,...isolatedCli]));
// S319: `held` is accepted, `skipped` is still not. A held contract is evidence
// consciously scoped out of a blast-radius-disjoint promotion, declared on the
// receipt with the surface that justifies it; a skip is evidence that silently
// went missing. Coverage remains total — executed + held must equal expected —
// and the gate runner only permits a hold when the promotion actually resolves
// as `scoped` and the contract's surface sits inside an active radius.
steps.push(artifactStep('staging-browser-receipt', 'api/staging-release-browser.json',
  (value) => value.state === 'passed'
    && value.skipped === 0
    && value.failed === 0
    && value.flaky === 0
    && value.observedTests === value.expectedTests
    && (value.held ?? 0) === (value.heldContracts?.length ?? 0) * 3
    && (!nativeRuntime || (value.held===0 && value.heldContracts?.length===0
      && value.promotionMode===nativeRuntime.mode && value.sourceCommit===nativeRuntime.sourceCommit
      && value.stageNativeSha256===nativeRuntime.stageNativeSha256)),
  (value) => ({
    passed: value.passed ?? 0,
    expected: value.expectedTests ?? 0,
    skipped: value.skipped ?? null,
    held: value.held ?? 0,
    heldContracts: value.heldContracts ?? [],
    heldSurfaces: value.heldSurfaces ?? [],
  })));
steps.push(runScript('attention-browser', 'scripts/run-attention-release-gate.mjs', [`--url=${CANONICAL_STAGING}`]));
steps.push(artifactStep('attention-browser-receipt', 'api/staging-attention-browser.json',
  (value) => value.state === 'passed'
    && value.origin === CANONICAL_STAGING
    && value.passed === 15
    && value.expectedTests === 15
    && value.observedTests === 15
    && value.skipped === 0
    && value.failed === 0
    && value.flaky === 0,
  (value) => ({
    passed: value.passed ?? 0,
    expected: value.expectedTests ?? 0,
    skipped: value.skipped ?? null,
    failed: value.failed ?? null,
    flaky: value.flaky ?? null,
  })));
steps.push(runScript('promotion-contract', 'scripts/check-production-promotion-gate.mjs', ['--check']));
steps.push(promotionReadyStep());
steps.push(currentDoctorStep({ live: !process.argv.includes('--ci') }));
if (isolatedContext) {
  try { assertAdmittedContext(isolatedContext); }
  catch { const step=steps.find(s=>s.id==='staging-deploy-lineage'); step.state='rejected';step.exitCode=1;step.reason='isolated-observation-expired'; }
}

const receipt = {
  schemaVersion: 1,
  ...(isolatedContext ? {stagingMode:'isolated-variant',installationPayloadSha256:isolatedContext.transport.installationHash,
    observationPayloadSha256:isolatedContext.transport.observationHash} : {}),
  ...(steps.some(step=>step.productionNativePending===true)?{promotionMode:'affected-auth-stage-verified',productionNativePending:true,fullReleaseAccepted:false}:{}),
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/run-release-ceremony.mjs',
  publicSafe: true,
  state: steps.every((step) => step.state === 'passed') ? 'passed' : 'rejected',
  stagingOrigin: CANONICAL_STAGING,
  steps,
  ...currentCeremonyHashes(isolatedArgs?.file || null),
  chain: { previousReceiptSha256: priorSha256 },
  privacy: { stdoutRetained: false, stderrRetained: false, responseBodiesRetained: false },
};
if (isolatedContext) mkdirSync(dirname(OUT),{recursive:true});
writeFileSync(OUT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`release ceremony: ${receipt.state} · ${steps.filter((step) => step.state === 'passed').length}/${steps.length}`);
for (const step of steps.filter((step) => step.state !== 'passed')) console.log(`  - ${step.id}: ${step.reason || step.verdict || step.releaseState || 'rejected'}`);
process.exit(receipt.state === 'passed' || !process.argv.includes('--require-ready') ? 0 : 1);

}
export {EXPECTED_STEP_IDS,validateReceipt,currentCeremonyHashes};
