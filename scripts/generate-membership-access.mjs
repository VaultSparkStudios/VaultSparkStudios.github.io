import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'config', 'membership-entitlements.json');
const browserOut = path.join(root, 'assets', 'membership-access.js');
const edgeOut = path.join(root, 'supabase', 'functions', '_shared', 'membershipAccess.ts');

const config = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const serialized = JSON.stringify(config, null, 2);

const sharedBody = `
const CONFIG = ${serialized};

const PLAN_ORDER = {
  free: 0,
  promogrind_pro: 1,
  vault_sparked: 2,
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
  return normalizePlanKey(planKey) === 'vault_sparked';
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

function buildContext(input = {}) {
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
  const current = PLAN_ORDER[normalizePlanKey(currentPlan)] ?? PLAN_ORDER[CONFIG.defaultPlan];
  const required = PLAN_ORDER[normalizePlanKey(minimumPlan)] ?? PLAN_ORDER[CONFIG.defaultPlan];
  return current >= required;
}

function matchesRule(rule = {}, contextInput = {}) {
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

function hasEntitlement(featureKey, contextInput = {}) {
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
`;

const browserSource = `// Generated file. Do not edit manually.
(function (global) {
  'use strict';
${sharedBody}
  global.VSMembership = {
    config: CONFIG,
    normalizePlanKey,
    getPlan,
    isPaidPlan,
    isVaultSparkedPlan,
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

const edgeSource = `// Generated file. Do not edit manually.
${sharedBody}

export {
  CONFIG,
  normalizePlanKey,
  getPlan,
  isPaidPlan,
  isVaultSparkedPlan,
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

fs.mkdirSync(path.dirname(browserOut), { recursive: true });
fs.mkdirSync(path.dirname(edgeOut), { recursive: true });
fs.writeFileSync(browserOut, browserSource);
fs.writeFileSync(edgeOut, edgeSource);

console.log('Generated membership access helpers.');
