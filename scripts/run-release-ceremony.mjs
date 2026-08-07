#!/usr/bin/env node
/**
 * One-command production release ceremony.
 *
 * Every full production promotion must prove the exact canonical staging
 * tenant in a browser, the provider redirect contract, staging deploy lineage,
 * a ready promotion interlock, and a Doctor receipt with blockingFailing=0.
 * Raw subprocess output is deliberately discarded from the public artifact.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STUDIO_ROOT = resolve(ROOT, '..', 'vaultspark-studio-ops');
const OUT = join(ROOT, 'api', 'release-ceremony.json');
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
  const blocking = Number(score?.blockingFailing ?? Number.POSITIVE_INFINITY);
  return {
    id: 'doctor',
    state: blocking === 0 ? 'passed' : 'rejected',
    exitCode: blocking === 0 ? 0 : 1,
    durationMs: Date.now() - started,
    blockingFailing: Number.isFinite(blocking) ? blocking : null,
    observedDate: score?.date || null,
  };
}

function promotionReadyStep() {
  const started = Date.now();
  let promotion;
  try { promotion = readJson('context/PRODUCTION_PROMOTION.json'); } catch {}
  const ready = promotion?.hold === false && promotion?.releaseState === 'ready' && (promotion?.reasons || []).length === 0;
  return {
    id: 'promotion-ready',
    state: ready ? 'passed' : 'rejected',
    exitCode: ready ? 0 : 1,
    durationMs: Date.now() - started,
    releaseState: promotion?.releaseState || 'unknown',
    reasonCodes: Array.isArray(promotion?.reasons) ? promotion.reasons : ['promotion-receipt-unavailable'],
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

function priorReceiptHash() {
  try { return sha256(readFileSync(OUT)); } catch { return null; }
}

function validateReceipt(receipt) {
  const errors = [];
  if (!['passed', 'rejected'].includes(receipt?.state)) errors.push('unknown state');
  if (receipt?.publicSafe !== true) errors.push('publicSafe must be true');
  if (receipt?.stagingOrigin !== CANONICAL_STAGING) errors.push('canonical staging origin mismatch');
  if (!Array.isArray(receipt?.steps) || receipt.steps.length !== 8) errors.push('eight ceremony steps required');
  if (!/^[a-f0-9]{64}$/.test(receipt?.evidenceSha256 || '')) errors.push('evidence hash missing');
  if (!/^[a-f0-9]{64}$/.test(receipt?.contractSha256 || '')) errors.push('contract hash missing');
  if (Object.hasOwn(receipt || {}, 'stdout') || Object.hasOwn(receipt || {}, 'stderr')) errors.push('subprocess output retained');
  const allPassed = receipt?.steps?.every((step) => step.state === 'passed');
  if ((receipt?.state === 'passed') !== Boolean(allPassed)) errors.push('state/step disagreement');
  return errors;
}

function selfTest() {
  if (!exactStagingOrigin(`${CANONICAL_STAGING}/`)) throw new Error('canonical origin rejected');
  if (exactStagingOrigin('https://evil.example/')) throw new Error('foreign origin accepted');
  const steps = Array.from({ length: 8 }, (_, index) => ({ id: `s${index}`, state: 'passed' }));
  const base = {
    state: 'passed', publicSafe: true, stagingOrigin: CANONICAL_STAGING, steps,
    evidenceSha256: 'a'.repeat(64), contractSha256: 'b'.repeat(64),
  };
  if (validateReceipt(base).length) throw new Error('green receipt rejected');
  const skippedBrowser = { ...base, state: 'rejected', steps: steps.map((step, index) => index === 3 ? { ...step, state: 'rejected', skipped: 1 } : step) };
  if (validateReceipt(skippedBrowser).length) throw new Error('honest rejected receipt malformed');
  const lying = { ...skippedBrowser, state: 'passed' };
  if (!validateReceipt(lying).some((error) => error.includes('disagreement'))) throw new Error('lying receipt accepted');
  console.log('run-release-ceremony --self-test: OK (origin + eight-step + fail-closed receipts)');
}

if (process.argv.includes('--self-test')) {
  try { selfTest(); } catch (error) { console.error(`self-test failed: ${error.message}`); process.exit(1); }
  process.exit(0);
}

if (process.argv.includes('--check')) {
  try {
    const receipt = JSON.parse(readFileSync(OUT, 'utf8'));
    const errors = validateReceipt(receipt);
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
steps.push(runScript('staging-deploy-lineage', 'scripts/check-staging-deploy-receipt.mjs'));
steps.push(runScript('staging-browser', 'scripts/run-staging-release-gate.mjs', [`--url=${CANONICAL_STAGING}`]));
steps.push(artifactStep('staging-browser-receipt', 'api/staging-release-browser.json',
  (value) => value.state === 'passed' && value.skipped === 0 && value.observedTests === value.expectedTests,
  (value) => ({ passed: value.passed ?? 0, expected: value.expectedTests ?? 0, skipped: value.skipped ?? null })));
steps.push(runScript('promotion-contract', 'scripts/check-production-promotion-gate.mjs', ['--check']));
steps.push(promotionReadyStep());
steps.push(currentDoctorStep({ live: !process.argv.includes('--ci') }));

const receipt = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/run-release-ceremony.mjs',
  publicSafe: true,
  state: steps.every((step) => step.state === 'passed') ? 'passed' : 'rejected',
  stagingOrigin: CANONICAL_STAGING,
  steps,
  evidenceSha256: evidenceHash([
    'api/obelisk-redirect-readiness.json',
    'api/staging-deploy-receipt.json',
    'api/staging-deploy-continuity.json',
    'api/staging-release-browser.json',
    'context/PRODUCTION_PROMOTION.json',
    'context/PROJECT_STATUS.json',
  ]),
  contractSha256: evidenceHash([
    'scripts/run-release-ceremony.mjs',
    'scripts/run-staging-release-gate.mjs',
    'tests/staging-release.spec.js',
    'scripts/check-production-promotion-gate.mjs',
  ]),
  chain: { previousReceiptSha256: priorSha256 },
  privacy: { stdoutRetained: false, stderrRetained: false, responseBodiesRetained: false },
};
writeFileSync(OUT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`release ceremony: ${receipt.state} · ${steps.filter((step) => step.state === 'passed').length}/${steps.length}`);
for (const step of steps.filter((step) => step.state !== 'passed')) console.log(`  - ${step.id}: ${step.reason || step.verdict || step.releaseState || 'rejected'}`);
process.exit(receipt.state === 'passed' || !process.argv.includes('--require-ready') ? 0 : 1);
