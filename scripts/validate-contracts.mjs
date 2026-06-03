/**
 * validate-contracts.mjs — Contract schema validator
 *
 * Validates context/contracts/*.json against their expected schemas.
 * Run before editing the Social Dashboard repo or any cross-surface
 * integration to catch contract drift early.
 *
 * Usage:
 *   node scripts/validate-contracts.mjs           (validate all)
 *   node scripts/validate-contracts.mjs --check   (exit 1 if any invalid)
 *
 * Exit code 0 = all contracts valid. Non-zero = at least one invalid.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checkMode = process.argv.includes('--check');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// Assert helpers — collect failures instead of throwing
function assert(failures, condition, message) {
  if (!condition) failures.push(message);
}

function assertField(failures, obj, field, type, context) {
  if (obj == null) {
    failures.push(`${context}: object is null/undefined`);
    return;
  }
  if (!(field in obj)) {
    failures.push(`${context}: missing required field "${field}"`);
    return;
  }
  if (type && typeof obj[field] !== type && !(type === 'array' && Array.isArray(obj[field]))) {
    failures.push(`${context}.${field}: expected ${type}, got ${typeof obj[field]}`);
  }
}

// ── social-dashboard.json schema ────────────────────────────────────────────
function validateSocialDashboard(contract, failures) {
  const ctx = 'social-dashboard';
  assertField(failures, contract, 'schemaVersion', 'string', ctx);
  assertField(failures, contract, 'consumer', 'string', ctx);
  assertField(failures, contract, 'listingMetadata', 'object', ctx);
  assertField(failures, contract, 'bridge', 'object', ctx);
  assertField(failures, contract, 'socialPresence', 'object', ctx);
  assertField(failures, contract, 'funnelSignals', 'object', ctx);
  assertField(failures, contract, 'feedbackSignals', 'object', ctx);
  assertField(failures, contract, 'normalizedActivity', 'object', ctx);

  // bridge sub-fields
  const bridge = contract.bridge || {};
  assertField(failures, bridge, 'websiteProject', 'object', `${ctx}.bridge`);
  assertField(failures, bridge, 'socialDashboardProject', 'object', `${ctx}.bridge`);
  assertField(failures, bridge.websiteProject || {}, 'repo', 'string', `${ctx}.bridge.websiteProject`);
  assertField(failures, bridge.websiteProject || {}, 'liveUrl', 'string', `${ctx}.bridge.websiteProject`);

  // socialPresence sub-fields
  const sp = contract.socialPresence || {};
  assertField(failures, sp, 'summary', 'object', `${ctx}.socialPresence`);
  assertField(failures, sp, 'featuredAccounts', 'array', `${ctx}.socialPresence`);
  assertField(failures, sp, 'accounts', 'array', `${ctx}.socialPresence`);
  const summary = sp.summary || {};
  assertField(failures, summary, 'trackedAccounts', 'number', `${ctx}.socialPresence.summary`);
  assertField(failures, summary, 'liveApiAccounts', 'number', `${ctx}.socialPresence.summary`);

  // funnelSignals sub-fields
  const fs2 = contract.funnelSignals || {};
  assertField(failures, fs2, 'publicIntelEndpoint', 'string', `${ctx}.funnelSignals`);
  assertField(failures, fs2, 'entryPaths', 'array', `${ctx}.funnelSignals`);
  assert(failures, (fs2.entryPaths || []).length > 0, `${ctx}.funnelSignals.entryPaths: must have at least one entry path`);

  // feedbackSignals sub-fields
  const fb = contract.feedbackSignals || {};
  assertField(failures, fb, 'mode', 'string', `${ctx}.feedbackSignals`);
  assertField(failures, fb, 'summaryFields', 'array', `${ctx}.feedbackSignals`);

  // normalizedActivity sub-fields
  const activity = contract.normalizedActivity || {};
  assertField(failures, activity, 'schemaVersion', 'string', `${ctx}.normalizedActivity`);
  assertField(failures, activity, 'mode', 'string', `${ctx}.normalizedActivity`);
  assertField(failures, activity, 'fields', 'array', `${ctx}.normalizedActivity`);
  assertField(failures, activity, 'acceptedTypes', 'array', `${ctx}.normalizedActivity`);
  assertField(failures, activity, 'latest', 'array', `${ctx}.normalizedActivity`);
  assert(failures, (activity.fields || []).includes('occurredAt'), `${ctx}.normalizedActivity.fields: must include occurredAt`);

  // consumer must match expected value
  assert(failures, contract.consumer === 'social-dashboard', `${ctx}.consumer: expected "social-dashboard", got "${contract.consumer}"`);
}

// ── website-public.json schema ───────────────────────────────────────────────
function validateWebsitePublic(contract, failures) {
  const ctx = 'website-public';
  assertField(failures, contract, 'schemaVersion', 'string', ctx);
  assertField(failures, contract, 'listingMetadata', 'object', ctx);
  assertField(failures, contract, 'bridges', 'object', ctx);
  assertField(failures, contract, 'surfaces', 'object', ctx);
  assertField(failures, contract, 'normalizedActivity', 'object', ctx);
  // surfaces entries are arrays of {label, url, path} objects
  const surfaces = contract.surfaces || {};
  assertField(failures, surfaces, 'production', 'array', `${ctx}.surfaces`);
  assertField(failures, surfaces, 'github', 'array', `${ctx}.surfaces`);
  const prod = (surfaces.production || [])[0] || {};
  assertField(failures, prod, 'url', 'string', `${ctx}.surfaces.production[0]`);
}

// ── hub.json schema ──────────────────────────────────────────────────────────
function validateHub(contract, failures) {
  const ctx = 'hub';
  assertField(failures, contract, 'schemaVersion', 'string', ctx);
  assertField(failures, contract, 'consumer', 'string', ctx);
  assertField(failures, contract, 'pulse', 'object', ctx);
  assertField(failures, contract, 'socialPresence', 'object', ctx);
  assertField(failures, contract, 'feedbackSignals', 'object', ctx);
  assertField(failures, contract, 'normalizedActivity', 'object', ctx);
  assert(failures, contract.consumer === 'studio-hub', `${ctx}.consumer: expected "studio-hub", got "${contract.consumer}"`);
  assertField(failures, contract.pulse || {}, 'queues', 'object', `${ctx}.pulse`);
  assertField(failures, (contract.pulse || {}).queues || {}, 'now', 'array', `${ctx}.pulse.queues`);
}

// ── Runner ───────────────────────────────────────────────────────────────────
const VALIDATORS = [
  { file: 'context/contracts/social-dashboard.json', validate: validateSocialDashboard },
  { file: 'context/contracts/website-public.json', validate: validateWebsitePublic },
  { file: 'context/contracts/hub.json', validate: validateHub },
];

let totalPassed = 0;
let totalFailed = 0;

for (const { file, validate } of VALIDATORS) {
  const filePath = path.join(root, file);
  const contract = readJson(filePath);

  if (!contract) {
    process.stdout.write(`  ✗  ${file}  (file missing or invalid JSON)\n`);
    totalFailed++;
    continue;
  }

  const failures = [];
  validate(contract, failures);

  if (failures.length === 0) {
    process.stdout.write(`  ✓  ${file}\n`);
    totalPassed++;
  } else {
    process.stdout.write(`  ✗  ${file}\n`);
    failures.forEach(f => process.stdout.write(`       ${f}\n`));
    totalFailed++;
  }
}

process.stdout.write(`\n${totalPassed} valid, ${totalFailed} invalid\n`);
if (checkMode && totalFailed > 0) process.exit(1);
