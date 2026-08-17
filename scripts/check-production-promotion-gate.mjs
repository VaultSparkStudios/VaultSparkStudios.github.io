#!/usr/bin/env node
/**
 * Fail-closed production promotion gate.
 *
 * A main push may update source control, but it cannot mutate production.
 * Promotion requires all three conditions:
 *   1. context/PRODUCTION_PROMOTION.json has hold=false/releaseState=ready
 *   2. the workflow was started manually (workflow_dispatch)
 *   3. confirm_production=true was explicitly supplied
 *
 * Usage:
 *   node scripts/check-production-promotion-gate.mjs --self-test
 *   node scripts/check-production-promotion-gate.mjs --check
 *   node scripts/check-production-promotion-gate.mjs --emit-github-output
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROMOTION_PATH = path.join(ROOT, 'context', 'PRODUCTION_PROMOTION.json');
const IDENTITY_RECEIPT_PATH = path.join(ROOT, 'api', 'identity-migration-receipt.json');
const CONTROL_PLANE_PATH = path.join(ROOT, 'api', 'supabase-control-plane.json');

const REQUIRED_WORKFLOW_STEPS = {
  '.github/workflows/pages-deploy.yml': [
    'Build clean dist (git-tracked files only)',
    'Stamp honest deployed SHA into build-sha.json',
    'Deploy to Cloudflare Pages',
    'Purge edge HTML cache',
    'Post-purge edge liveness check',
  ],
  '.github/workflows/cloudflare-worker-deploy.yml': [
    'Install deps (pins wrangler via package.json)',
    'Deploy Worker (npm run deploy)',
    'Post-deploy liveness gate',
    'Auto-rollback on failed liveness',
    'Verify rollback restored the site',
  ],
  '.github/workflows/cloudflare-cache-purge.yml': [
    'Purge Cloudflare cache',
  ],
  '.github/workflows/sentry-release.yml': [
    'Create Sentry release',
  ],
};

export function validatePromotionConfig(config) {
  const errors = [];
  if (!config || config.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (typeof config?.hold !== 'boolean') errors.push('hold must be boolean');
  if (!['hold', 'ready'].includes(config?.releaseState)) errors.push('releaseState must be hold or ready');
  if (config?.hold === true && config?.releaseState !== 'hold') errors.push('hold=true requires releaseState=hold');
  if (config?.hold === false && config?.releaseState !== 'ready') errors.push('hold=false requires releaseState=ready');
  if (config?.hold && (!Array.isArray(config?.reasons) || config.reasons.length === 0)) {
    errors.push('a held release requires at least one reason code');
  }
  for (const reason of config?.reasons ?? []) {
    if (typeof reason !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(reason)) {
      errors.push(`invalid public reason code: ${String(reason)}`);
    }
  }
  const contract = config?.promotionContract;
  if (contract?.requiresWorkflowDispatch !== true
      || contract?.requiresExplicitConfirmation !== true
      || contract?.stagingFirst !== true) {
    errors.push('promotionContract must require dispatch, confirmation, and staging-first');
  }
  return errors;
}

export function validatePromotionDependencies(config, identityReceipt, controlPlane) {
  const errors = [];
  if (identityReceipt?.schemaVersion !== '1.0' || identityReceipt?.publicSafe !== true) {
    errors.push('identity migration receipt is missing or invalid');
  }
  if (controlPlane?.schemaVersion !== '1.0' || controlPlane?.publicSafe !== true) {
    errors.push('Supabase control-plane receipt is missing or invalid');
  }

  if (config?.hold === false) {
    if (identityReceipt?.state !== 'verified' || identityReceipt?.productionEligible !== true) {
      errors.push('ready promotion requires a verified, production-eligible identity receipt');
    }
    if ((identityReceipt?.blockers || []).length > 0) {
      errors.push('ready promotion cannot retain identity migration blockers');
    }
    if (controlPlane?.overall !== 'ready') {
      errors.push('ready promotion requires full Supabase control-plane authority for deploy and rollback');
    }
  } else if (config?.hold === true) {
    const reasons = new Set(config.reasons || []);
    for (const blocker of identityReceipt?.blockers || []) {
      if (!reasons.has(blocker)) errors.push(`held promotion is missing dependency reason: ${blocker}`);
    }
    if (controlPlane?.overall !== 'ready' && !reasons.has('supabase-control-plane-partial')) {
      errors.push('held promotion must disclose partial Supabase control-plane authority');
    }
  }
  return errors;
}

function dependenciesReady(identityReceipt, controlPlane) {
  return identityReceipt?.state === 'verified'
    && identityReceipt?.productionEligible === true
    && (identityReceipt?.blockers || []).length === 0
    && controlPlane?.overall === 'ready';
}

export function promotionAllowed(config, eventName, explicitConfirmation, dependencies = {}) {
  return validatePromotionConfig(config).length === 0
    && validatePromotionDependencies(config, dependencies.identityReceipt, dependencies.controlPlane).length === 0
    && dependenciesReady(dependencies.identityReceipt, dependencies.controlPlane)
    && config.hold === false
    && config.releaseState === 'ready'
    && eventName === 'workflow_dispatch'
    && explicitConfirmation === 'true';
}

function readConfig() {
  return JSON.parse(fs.readFileSync(PROMOTION_PATH, 'utf8'));
}

function readDependencies() {
  return {
    identityReceipt: JSON.parse(fs.readFileSync(IDENTITY_RECEIPT_PATH, 'utf8')),
    controlPlane: JSON.parse(fs.readFileSync(CONTROL_PLANE_PATH, 'utf8')),
  };
}

function workflowStepBlock(source, stepName) {
  const marker = `- name: ${stepName}`;
  const start = source.indexOf(marker);
  if (start === -1) return null;
  const next = source.indexOf('\n      - ', start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

export function validateWorkflowSource(source, requiredSteps) {
  const errors = [];
  if (!source.includes('confirm_production:')) errors.push('workflow_dispatch confirm_production input missing');
  if (!source.includes('id: promotion-gate')) errors.push('promotion-gate step missing');
  if (!source.includes('check-production-promotion-gate.mjs --emit-github-output')) {
    errors.push('promotion-gate command missing');
  }
  if (!source.includes('run-release-ceremony.mjs')
      || !source.includes('--url=https://website.staging.vaultsparkstudios.com')
      || !source.includes('--require-ready')) {
    errors.push('full promotion is missing the canonical release ceremony');
  }
  for (const stepName of requiredSteps) {
    const block = workflowStepBlock(source, stepName);
    if (!block) {
      errors.push(`required production step missing: ${stepName}`);
      continue;
    }
    const directlyGated = block.includes("steps.promotion-gate.outputs.allowed == 'true'");
    if (!directlyGated) {
      errors.push(`production step is not gated: ${stepName}`);
    }
  }
  return errors;
}

function checkRepository() {
  const config = readConfig();
  const errors = validatePromotionConfig(config);
  const dependencies = readDependencies();
  errors.push(...validatePromotionDependencies(config, dependencies.identityReceipt, dependencies.controlPlane));
  for (const [relativePath, steps] of Object.entries(REQUIRED_WORKFLOW_STEPS)) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    errors.push(...validateWorkflowSource(source, steps).map((error) => `${relativePath}: ${error}`));
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { config, dependencies };
}

function selfTest() {
  const base = {
    schemaVersion: '1.0',
    releaseState: 'hold',
    hold: true,
    reasons: ['test-pending'],
    promotionContract: {
      requiresWorkflowDispatch: true,
      requiresExplicitConfirmation: true,
      stagingFirst: true,
    },
  };
  const ready = { ...base, releaseState: 'ready', hold: false, reasons: [] };
  const verifiedIdentity = { schemaVersion: '1.0', publicSafe: true, state: 'verified', productionEligible: true, blockers: [] };
  const readyControl = { schemaVersion: '1.0', publicSafe: true, overall: 'ready' };
  const readyDependencies = { identityReceipt: verifiedIdentity, controlPlane: readyControl };
  const darkIdentity = { schemaVersion: '1.0', publicSafe: true, state: 'honest-dark', productionEligible: false, blockers: ['provider-e2e-pending'] };
  const partialControl = { schemaVersion: '1.0', publicSafe: true, overall: 'partial' };
  const wf = (stepGate) => `
on:
  workflow_dispatch:
    inputs:
      confirm_production:
      - name: x
        id: promotion-gate
        run: node scripts/check-production-promotion-gate.mjs --emit-github-output
      - name: Run canonical release ceremony
        run: node scripts/run-release-ceremony.mjs --url=https://website.staging.vaultsparkstudios.com --require-ready
      - name: Deploy Worker (npm run deploy)
        if: ${stepGate}
        run: npm run deploy
`;
  const REQ = ['Deploy Worker (npm run deploy)'];
  const errsFor = (gate) => validateWorkflowSource(wf(gate), REQ);

  const cases = [
    [errsFor("steps.promotion-gate.outputs.allowed == 'true'").length === 0, 'direct promotion-gate gating still passes'],
    [errsFor("always()").some((e) => /not gated/.test(e)), 'a step gated on nothing is STILL rejected'],
    [errsFor("steps.authz.outputs.deploy == 'true'").some((e) => /not gated/.test(e)),
      'an alternate identity resolver cannot bypass the promotion gate'],

    [promotionAllowed(base, 'workflow_dispatch', 'true', readyDependencies) === false, 'hold fails closed'],
    [promotionAllowed(ready, 'push', 'true', readyDependencies) === false, 'push cannot promote'],
    [promotionAllowed(ready, 'schedule', 'true', readyDependencies) === false, 'schedule cannot promote'],
    [promotionAllowed(ready, 'workflow_dispatch', 'false', readyDependencies) === false, 'dispatch needs confirmation'],
    [promotionAllowed(ready, 'workflow_dispatch', 'true', readyDependencies) === true, 'ready confirmed dispatch with verified dependencies promotes'],
    [promotionAllowed(ready, 'workflow_dispatch', 'true', { identityReceipt: darkIdentity, controlPlane: readyControl }) === false, 'cosmetically ready config cannot bypass a dark identity receipt'],
    [promotionAllowed(ready, 'workflow_dispatch', 'true', { identityReceipt: verifiedIdentity, controlPlane: partialControl }) === false, 'cosmetically ready config cannot bypass partial control-plane authority'],
    [validatePromotionDependencies({ ...base, reasons: ['provider-e2e-pending', 'supabase-control-plane-partial'] }, darkIdentity, partialControl).length === 0, 'held reasons reconcile with dark dependencies'],
    [validatePromotionDependencies(base, darkIdentity, partialControl).length > 0, 'missing dependency reasons fail repository validation'],
    [validatePromotionConfig({ ...base, reasons: [] }).length > 0, 'held release needs a reason'],
    [validatePromotionConfig({ ...base, releaseState: 'ready' }).length > 0, 'state and hold agree'],
  ];
  for (const [pass, label] of cases) {
    if (!pass) throw new Error(`self-test failed: ${label}`);
  }
  console.log(`production-promotion-gate self-test: ${cases.length}/${cases.length} passed`);
}

const args = new Set(process.argv.slice(2));
if (args.has('--self-test')) {
  selfTest();
} else if (args.has('--check')) {
  const { config } = checkRepository();
  console.log(`production-promotion-gate: ${config.releaseState} (${config.reasons.join(', ') || 'no blockers'})`);
} else if (args.has('--emit-github-output')) {
  const { config, dependencies } = checkRepository();
  const allowed = promotionAllowed(config, process.env.GITHUB_EVENT_NAME, process.env.PRODUCTION_CONFIRM, dependencies);
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) throw new Error('GITHUB_OUTPUT is required with --emit-github-output');
  fs.appendFileSync(outputPath, `allowed=${allowed}\n`, 'utf8');
  fs.appendFileSync(outputPath, `release_state=${config.releaseState}\n`, 'utf8');
  console.log(`production-promotion-gate: allowed=${allowed}; state=${config.releaseState}; reasons=${config.reasons.join(',') || 'none'}`);
} else if (args.has('--require-allowed')) {
  const { config, dependencies } = checkRepository();
  const allowed = promotionAllowed(config, process.env.GITHUB_EVENT_NAME, process.env.PRODUCTION_CONFIRM, dependencies);
  console.log(`production-promotion-gate: allowed=${allowed}; state=${config.releaseState}; reasons=${config.reasons.join(',') || 'none'}`);
  if (!allowed) process.exitCode = 1;
} else {
  console.error('Usage: --self-test | --check | --require-allowed | --emit-github-output');
  process.exitCode = 2;
}
