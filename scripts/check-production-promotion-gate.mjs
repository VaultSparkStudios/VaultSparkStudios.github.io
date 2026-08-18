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
import { resolveScope } from './check-promotion-scope.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROMOTION_PATH = path.join(ROOT, 'context', 'PRODUCTION_PROMOTION.json');
const IDENTITY_RECEIPT_PATH = path.join(ROOT, 'api', 'identity-migration-receipt.json');
const CONTROL_PLANE_PATH = path.join(ROOT, 'api', 'supabase-control-plane.json');
const MANIFEST_PATH = path.join(ROOT, 'api', 'candidate-artifact-manifest.json');

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

/**
 * Promotion authority (S319, D-S319.2 — founder-authorized).
 *
 * Two ways to be allowed, and the ceremony reports which:
 *
 *   CLEAR   — the historical path. hold is genuinely false, releaseState is
 *             ready, and every dependency is verified. Unchanged.
 *
 *   SCOPED  — a hold is active, but every active reason declares a blast radius
 *             and the candidate leaf set is provably disjoint from all of them.
 *             `dependenciesReady` is deliberately NOT required on this path:
 *             the entire point is that the unready dependency (the honest-dark
 *             Obelisk identity receipt, owned by a sibling repo and
 *             unsatisfiable here under CANON-018) is confined to a radius the
 *             candidate does not touch. Requiring it would re-impose the
 *             whole-site boolean this decision exists to replace.
 *
 * Both paths still require workflow_dispatch + explicit confirmation, and both
 * still require the config and its dependency reasons to validate. The scope
 * resolver fails closed on an undeclared radius, an intersecting leaf, an
 * unclassifiable leaf, or an empty candidate — so SCOPED is a narrower
 * authority than CLEAR, never a wider one.
 */
export function promotionMode(config, eventName, explicitConfirmation, dependencies = {}) {
  if (eventName !== 'workflow_dispatch' || explicitConfirmation !== 'true') return 'blocked';
  if (validatePromotionConfig(config).length !== 0) return 'blocked';
  if (validatePromotionDependencies(config, dependencies.identityReceipt, dependencies.controlPlane).length !== 0) return 'blocked';

  if (config.hold === false
    && config.releaseState === 'ready'
    && dependenciesReady(dependencies.identityReceipt, dependencies.controlPlane)) {
    return 'clear';
  }

  const scope = resolveScope(config, dependencies.candidateLeaves);
  return scope?.promotable === true ? 'scoped' : 'blocked';
}

export function promotionAllowed(config, eventName, explicitConfirmation, dependencies = {}) {
  return promotionMode(config, eventName, explicitConfirmation, dependencies) !== 'blocked';
}

function readConfig() {
  return JSON.parse(fs.readFileSync(PROMOTION_PATH, 'utf8'));
}

function readDependencies() {
  let candidateLeaves = [];
  // An unreadable manifest yields an EMPTY leaf set, which resolveScope refuses
  // outright — a missing candidate must never resolve as "nothing intersects".
  try { candidateLeaves = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')).leaves || []; } catch {}
  return {
    identityReceipt: JSON.parse(fs.readFileSync(IDENTITY_RECEIPT_PATH, 'utf8')),
    controlPlane: JSON.parse(fs.readFileSync(CONTROL_PLANE_PATH, 'utf8')),
    candidateLeaves,
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

    // --- S319 scoped promotion (D-S319.2) ---------------------------------
    // A held release whose reason declares a blast radius may promote a
    // candidate that is provably disjoint from it. Every other direction of
    // this feature must still refuse.
    ...(() => {
      // BOTH active reasons must be declared: darkIdentity contributes the
      // provider blocker, and partialControl forces the control-plane reason to
      // be disclosed. An undeclared reason correctly falls back to whole-site.
      const scoped = {
        ...base,
        reasons: ['provider-e2e-pending', 'supabase-control-plane-partial'],
        blastRadius: {
          'provider-e2e-pending': ['auth/**', 'surface:identity', 'worker:identity'],
          'supabase-control-plane-partial': ['auth/**', 'surface:identity'],
        },
      };
      const contentOnly = [{ path: 'index.html' }, { path: 'assets/style.shell-abc.css' }, { path: 'api/uptime.json' }];
      const touchesIdentity = [...contentOnly, { path: 'auth/callback/index.html' }];
      const unclassifiable = [...contentOnly, { path: 'weird/thing.bin' }];
      // darkIdentity is honest-dark / productionEligible:false — the exact
      // dependency state the blast radius exists to confine.
      const deps = (leaves) => ({ identityReceipt: darkIdentity, controlPlane: partialControl, candidateLeaves: leaves });
      // Same reasons, but one radius now covers content — which the candidate
      // does touch, so the promotion must block.
      const scopedIntersecting = { ...scoped,
        blastRadius: { ...scoped.blastRadius, 'supabase-control-plane-partial': ['surface:content'] } };
      return [
        [promotionMode(scoped, 'workflow_dispatch', 'true', deps(contentOnly)) === 'scoped',
          'a disjoint candidate promotes as SCOPED under a declared blast radius'],
        [promotionMode(scoped, 'workflow_dispatch', 'true', deps(touchesIdentity)) === 'blocked',
          'a candidate touching the held identity plane is still BLOCKED'],
        [promotionMode(scoped, 'workflow_dispatch', 'true', deps(unclassifiable)) === 'blocked',
          'an unclassifiable leaf blocks a scoped promotion'],
        [promotionMode(scoped, 'workflow_dispatch', 'true', deps([])) === 'blocked',
          'an empty candidate blocks a scoped promotion'],
        [promotionMode(base, 'workflow_dispatch', 'true', deps(contentOnly)) === 'blocked',
          'a hold with NO declared blast radius keeps whole-site semantics'],
        [promotionMode(scoped, 'push', 'true', deps(contentOnly)) === 'blocked',
          'scoped promotion still requires workflow_dispatch'],
        [promotionMode(scoped, 'workflow_dispatch', 'false', deps(contentOnly)) === 'blocked',
          'scoped promotion still requires explicit confirmation'],
        [promotionMode(scopedIntersecting, 'workflow_dispatch', 'true', deps(contentOnly)) === 'blocked',
          'a second reason whose radius DOES intersect the candidate blocks'],
        [promotionMode(ready, 'workflow_dispatch', 'true', { ...readyDependencies, candidateLeaves: contentOnly }) === 'clear',
          'a genuinely clear release still reports CLEAR, not scoped'],
      ];
    })(),
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
  const mode = promotionMode(config, process.env.GITHUB_EVENT_NAME, process.env.PRODUCTION_CONFIRM, dependencies);
  const allowed = mode !== 'blocked';
  const scope = resolveScope(config, dependencies.candidateLeaves);
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) throw new Error('GITHUB_OUTPUT is required with --emit-github-output');
  fs.appendFileSync(outputPath, `allowed=${allowed}\n`, 'utf8');
  fs.appendFileSync(outputPath, `release_state=${config.releaseState}\n`, 'utf8');
  // Say HOW it was authorised, and what stayed held. A run log that only says
  // "allowed=true" hides the difference between a clear release and a scoped one.
  fs.appendFileSync(outputPath, `promotion_mode=${mode}\n`, 'utf8');
  fs.appendFileSync(outputPath, `held_surfaces=${(scope?.heldSurfaces || []).join(',')}\n`, 'utf8');
  console.log(`production-promotion-gate: allowed=${allowed}; mode=${mode}; state=${config.releaseState}; reasons=${config.reasons.join(',') || 'none'}; held=${(scope?.heldSurfaces || []).join(',') || 'none'}`);
} else if (args.has('--require-allowed')) {
  const { config, dependencies } = checkRepository();
  const allowed = promotionAllowed(config, process.env.GITHUB_EVENT_NAME, process.env.PRODUCTION_CONFIRM, dependencies);
  console.log(`production-promotion-gate: allowed=${allowed}; state=${config.releaseState}; reasons=${config.reasons.join(',') || 'none'}`);
  if (!allowed) process.exitCode = 1;
} else {
  console.error('Usage: --self-test | --check | --require-allowed | --emit-github-output');
  process.exitCode = 2;
}
