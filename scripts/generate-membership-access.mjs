#!/usr/bin/env node
// generate-membership-access.mjs — emits the browser and edge membership helpers
// from config/membership-entitlements.json (D-S368.1: one source for tier facts).
//
//   node scripts/generate-membership-access.mjs            write both outputs
//   node scripts/generate-membership-access.mjs --dry-run  report which outputs would change, write nothing
//   node scripts/generate-membership-access.mjs --check    exit 1 if either output drifts from the config
//
// Outputs:
//   assets/membership-access.js                     browser IIFE (window.VSMembership)
//   supabase/functions/_shared/membershipAccess.ts  edge ES module (Deno)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'config', 'membership-entitlements.json');
const tiersPath = path.join(root, 'api', 'membership-tiers.json');
const browserOut = path.join(root, 'assets', 'membership-access.js');
const edgeOut = path.join(root, 'supabase', 'functions', '_shared', 'membershipAccess.ts');

// Plan rank for minPlan rules. Every paid plan key in the config must appear here.
const PLAN_ORDER = {
  free: 0,
  promogrind_pro: 1,
  vault_sparked: 2,
  vault_sparked_pro: 3,
};

export function buildOutputs(config, tiers = {}) {
  for (const key of Object.keys(config.plans || {})) {
    if (!(key in PLAN_ORDER)) throw new Error(`PLAN_ORDER is missing plan "${key}" from membership-entitlements.json`);
  }
  const serialized = JSON.stringify(config, null, 2);
  const sparked = config.plans.vault_sparked;
  const eternal = config.plans.vault_sparked_pro;
  const decision = tiers.decision ? `${tiers.decision}: ` : '';
  const versionLine = `// Version: ${config.version} (${decision}${sparked.label} ${sparked.priceDisplay}, ${eternal.label} ${eternal.priceDisplay})`;
  const planOrder = Object.entries(PLAN_ORDER).map(([k, v]) => `  ${k}: ${v},`).join('\n');

  const browser = `// VaultSpark Studios — Membership Access (browser IIFE)
${versionLine}
(function (global) {
  'use strict';

const CONFIG = ${serialized};

const PLAN_ORDER = {
${planOrder}
};

const PLAN_ALIASES = CONFIG.planAliases || {};

function normalizePlanKey(planKey) {
  const raw = typeof planKey === 'string' ? planKey.trim() : '';
  if (!raw) return CONFIG.defaultPlan;
  return PLAN_ALIASES[raw] || raw;
}

function getPlan(planKey) {
  const key = normalizePlanKey(planKey);
  return CONFIG.plans[key] || CONFIG.plans[CONFIG.defaultPlan];
}

function isPaidPlan(planKey) {
  return !!getPlan(planKey).isPaid;
}

function isVaultSparkedPlan(planKey) {
  const key = normalizePlanKey(planKey);
  return key === 'vault_sparked' || key === 'vault_sparked_pro';
}

function isVaultSparkedProPlan(planKey) {
  return normalizePlanKey(planKey) === 'vault_sparked_pro';
}

function getRankIndex(points) {
  const value = Number.isFinite(points) ? points : Number(points || 0);
  let rankIndex = 0;
  for (let i = 0; i < CONFIG.rankThresholds.length; i += 1) {
    if (value >= CONFIG.rankThresholds[i]) rankIndex = i;
  }
  return rankIndex;
}

function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (!subscription.current_period_end) return true;
  return new Date(subscription.current_period_end).getTime() > Date.now();
}

function getActivePlanKey(subscription) {
  if (!isSubscriptionActive(subscription)) return CONFIG.defaultPlan;
  return normalizePlanKey(subscription.plan);
}

function buildContext(input) {
  input = input || {};
  const rankIndex = Number.isInteger(input.rankIndex) ? input.rankIndex : getRankIndex(input.points || 0);
  const hasAccount = input.hasAccount !== false;
  const planKey = normalizePlanKey(input.planKey);
  return {
    hasAccount,
    planKey,
    rankIndex,
    points: Number(input.points || 0),
  };
}

function comparePlanOrder(currentPlan, minimumPlan) {
  const current = PLAN_ORDER[normalizePlanKey(currentPlan)] !== undefined
    ? PLAN_ORDER[normalizePlanKey(currentPlan)]
    : PLAN_ORDER[CONFIG.defaultPlan];
  const required = PLAN_ORDER[normalizePlanKey(minimumPlan)] !== undefined
    ? PLAN_ORDER[normalizePlanKey(minimumPlan)]
    : PLAN_ORDER[CONFIG.defaultPlan];
  return current >= required;
}

function matchesRule(rule, contextInput) {
  rule = rule || {};
  contextInput = contextInput || {};
  const context = buildContext(contextInput);
  if (rule.public) return true;
  if (rule.requiresAccount && !context.hasAccount) return false;
  if (rule.allowedPlans && rule.allowedPlans.length > 0 && !rule.allowedPlans.includes(context.planKey)) return false;
  if (rule.minPlan && !comparePlanOrder(context.planKey, rule.minPlan)) return false;
  if (Number.isInteger(rule.minRankIndex) && context.rankIndex < rule.minRankIndex) return false;
  return true;
}

function getFeature(featureKey) {
  return CONFIG.features[featureKey] || null;
}

function hasEntitlement(featureKey, contextInput) {
  const feature = getFeature(featureKey);
  if (!feature) return false;
  return matchesRule(feature.rule, contextInput);
}

function getProject(projectKey) {
  return CONFIG.projects[projectKey] || null;
}

function getPriceDisplay(planKey) {
  return getPlan(planKey).priceDisplay || '';
}

  global.VSMembership = {
    config: CONFIG,
    normalizePlanKey,
    getPlan,
    isPaidPlan,
    isVaultSparkedPlan,
    isVaultSparkedProPlan,
    getRankIndex,
    isSubscriptionActive,
    getActivePlanKey,
    buildContext,
    matchesRule,
    getFeature,
    hasEntitlement,
    getProject,
    getPriceDisplay,
  };
})(globalThis);
`;

  const edge = `// VaultSpark Studios — Membership Access (edge module)
${versionLine}
// Generated by scripts/generate-membership-access.mjs from config/membership-entitlements.json.
// Do not edit by hand: edit the config, then run the generator.

// deno-lint-ignore no-explicit-any
const CONFIG: any = ${serialized};

const PLAN_ORDER: Record<string, number> = {
${planOrder}
};

const PLAN_ALIASES: Record<string, string> = CONFIG.planAliases || {};

function normalizePlanKey(planKey: string): string {
  const raw = typeof planKey === 'string' ? planKey.trim() : '';
  if (!raw) return CONFIG.defaultPlan;
  return PLAN_ALIASES[raw] || raw;
}

function getPlan(planKey: string) {
  const key = normalizePlanKey(planKey);
  return CONFIG.plans[key] || CONFIG.plans[CONFIG.defaultPlan];
}

function isPaidPlan(planKey: string): boolean {
  return !!getPlan(planKey).isPaid;
}

function isVaultSparkedPlan(planKey: string): boolean {
  const key = normalizePlanKey(planKey);
  return key === 'vault_sparked' || key === 'vault_sparked_pro';
}

function isVaultSparkedProPlan(planKey: string): boolean {
  return normalizePlanKey(planKey) === 'vault_sparked_pro';
}

function getRankIndex(points: number): number {
  const value = Number.isFinite(points) ? points : Number(points || 0);
  let rankIndex = 0;
  for (let i = 0; i < CONFIG.rankThresholds.length; i += 1) {
    if (value >= CONFIG.rankThresholds[i]) rankIndex = i;
  }
  return rankIndex;
}

// deno-lint-ignore no-explicit-any
function isSubscriptionActive(subscription: any): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (!subscription.current_period_end) return true;
  return new Date(subscription.current_period_end).getTime() > Date.now();
}

// deno-lint-ignore no-explicit-any
function getActivePlanKey(subscription: any): string {
  if (!isSubscriptionActive(subscription)) return CONFIG.defaultPlan;
  return normalizePlanKey(subscription.plan);
}

// deno-lint-ignore no-explicit-any
function buildContext(input: any = {}) {
  const rankIndex = Number.isInteger(input.rankIndex) ? input.rankIndex : getRankIndex(input.points || 0);
  const hasAccount = input.hasAccount !== false;
  const planKey = normalizePlanKey(input.planKey);
  return {
    hasAccount,
    planKey,
    rankIndex,
    points: Number(input.points || 0),
  };
}

function comparePlanOrder(currentPlan: string, minimumPlan: string): boolean {
  const current = PLAN_ORDER[normalizePlanKey(currentPlan)] ?? PLAN_ORDER[CONFIG.defaultPlan];
  const required = PLAN_ORDER[normalizePlanKey(minimumPlan)] ?? PLAN_ORDER[CONFIG.defaultPlan];
  return current >= required;
}

// deno-lint-ignore no-explicit-any
function matchesRule(rule: any = {}, contextInput: any = {}): boolean {
  const context = buildContext(contextInput);
  if (rule.public) return true;
  if (rule.requiresAccount && !context.hasAccount) return false;
  if (rule.allowedPlans && rule.allowedPlans.length > 0 && !rule.allowedPlans.includes(context.planKey)) return false;
  if (rule.minPlan && !comparePlanOrder(context.planKey, rule.minPlan)) return false;
  if (Number.isInteger(rule.minRankIndex) && context.rankIndex < rule.minRankIndex) return false;
  return true;
}

function getFeature(featureKey: string) {
  return CONFIG.features[featureKey] || null;
}

// deno-lint-ignore no-explicit-any
function hasEntitlement(featureKey: string, contextInput: any = {}): boolean {
  const feature = getFeature(featureKey);
  if (!feature) return false;
  return matchesRule(feature.rule, contextInput);
}

function getProject(projectKey: string) {
  return CONFIG.projects[projectKey] || null;
}

function getPriceDisplay(planKey: string): string {
  return getPlan(planKey).priceDisplay || '';
}

export {
  CONFIG,
  normalizePlanKey,
  getPlan,
  isPaidPlan,
  isVaultSparkedPlan,
  isVaultSparkedProPlan,
  getRankIndex,
  isSubscriptionActive,
  getActivePlanKey,
  buildContext,
  matchesRule,
  getFeature,
  hasEntitlement,
  getProject,
  getPriceDisplay,
};
`;

  return { browser, edge };
}

function readOptional(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function main(argv) {
  const check = argv.includes('--check');
  const dryRun = argv.includes('--dry-run');
  const config = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const tiers = JSON.parse(readOptional(tiersPath) || '{}');
  const { browser, edge } = buildOutputs(config, tiers);
  const targets = [
    [browserOut, browser],
    [edgeOut, edge],
  ];
  const drifted = targets.filter(([file, content]) => readOptional(file) !== content);

  if (check || dryRun) {
    for (const [file] of targets) {
      const rel = path.relative(root, file).replace(/\\/g, '/');
      console.log(`${drifted.some(([f]) => f === file) ? 'DRIFT' : 'ok   '}  ${rel}`);
    }
    if (check && drifted.length) {
      console.error('Membership access helpers drift from config/membership-entitlements.json. Run: node scripts/generate-membership-access.mjs');
      process.exit(1);
    }
    return;
  }

  for (const [file, content] of drifted) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  console.log(`Generated membership access helpers (${drifted.length} file(s) updated).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
