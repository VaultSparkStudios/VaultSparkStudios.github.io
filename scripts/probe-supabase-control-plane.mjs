#!/usr/bin/env node
/**
 * Public-safe Supabase authority probe.
 *
 * A service-role key can administer data through REST, but it cannot by itself
 * run SQL migrations, call the Supabase management API, or deploy Edge
 * Functions. This probe keeps those authority planes separate and performs
 * only read-only provider operations (including SELECT 1 for the SQL plane).
 * Secret values are never serialized.
 *
 * Usage:
 *   node scripts/probe-supabase-control-plane.mjs --probe --write
 *   node scripts/probe-supabase-control-plane.mjs --check
 *   node scripts/probe-supabase-control-plane.mjs --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getSecret } from './lib/secrets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'api', 'supabase-control-plane.json');
const MIGRATION_PATH = 'supabase/migrations/20260723_fix_classified_archive_entitlements.sql';
const FUNCTION_PATH = 'supabase/functions/eternal-intelligence/index.ts';
const DEFAULT_PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';
const TIMEOUT_MS = 8_000;

function sha256File(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relativePath))).digest('hex');
}

function projectRefFromUrl(value) {
  try {
    const host = new URL(value).hostname;
    return host.endsWith('.supabase.co') ? host.slice(0, -'.supabase.co'.length) : DEFAULT_PROJECT_REF;
  } catch {
    return DEFAULT_PROJECT_REF;
  }
}

export function normalizeProbe(response) {
  if (!response || response.kind === 'unreachable') return { status: 'unreachable', httpStatus: null };
  const status = Number(response.status || 0);
  if (status >= 200 && status < 300) return { status: 'ok', httpStatus: status };
  if (status === 401 || status === 403) return { status: 'auth-error', httpStatus: status };
  if (status === 404) return { status: 'not-found', httpStatus: status };
  if (status >= 500) return { status: 'unreachable', httpStatus: status };
  return { status: 'rejected', httpStatus: status || null };
}

export function classifyControlPlane({ inventory, observations, source }) {
  const dataRestReady = inventory.dataRest && observations.dataRest?.status === 'ok';
  const managementReady = inventory.managementToken && observations.managementApi?.status === 'ok';
  const functionReady = inventory.managementToken && observations.edgeFunctions?.status === 'ok';
  // SQL authority is proven only by a harmless SELECT through the management
  // query endpoint. Credential presence alone remains available-unverified.
  const sqlReady = inventory.managementToken && observations.sqlMigration?.status === 'ok';
  const sqlStatus = sqlReady ? 'ready' : inventory.databaseCredential ? 'available-unverified' : 'blocked';

  const planes = {
    dataRest: {
      status: dataRestReady ? 'ready' : inventory.dataRest ? 'degraded' : 'blocked',
      authority: 'row-data-admin',
      liveProbe: observations.dataRest || { status: 'not-run', httpStatus: null },
      canRunSqlMigrations: false,
      canDeployEdgeFunctions: false,
    },
    managementApi: {
      status: managementReady ? 'ready' : inventory.managementToken ? 'degraded' : 'blocked',
      authority: 'project-metadata-read',
      liveProbe: observations.managementApi || { status: 'not-run', httpStatus: null },
    },
    sqlMigration: {
      status: sqlStatus,
      authority: 'database-migration',
      liveProbe: observations.sqlMigration || (inventory.databaseCredential
        ? { status: 'credential-present-not-executed', httpStatus: null }
        : { status: 'not-run', httpStatus: null }),
      source,
    },
    edgeFunctions: {
      status: functionReady ? 'ready' : inventory.managementToken ? 'degraded' : 'blocked',
      authority: 'edge-function-deploy',
      liveProbe: observations.edgeFunctions || { status: 'not-run', httpStatus: null },
      source: source.function,
    },
  };

  const blockers = [];
  if (!dataRestReady) blockers.push(inventory.dataRest ? 'supabase-rest-probe-failed' : 'supabase-rest-credential-missing');
  if (!managementReady) blockers.push(inventory.managementToken ? 'supabase-management-probe-failed' : 'supabase-management-token-missing');
  if (!sqlReady) {
    if (inventory.managementToken) blockers.push('supabase-sql-probe-failed');
    else if (inventory.databaseCredential) blockers.push('supabase-sql-probe-unverified');
    else blockers.push('supabase-database-credential-missing');
  }
  if (!functionReady) blockers.push(inventory.managementToken ? 'supabase-functions-probe-failed' : 'supabase-functions-token-missing');

  const allReady = dataRestReady && managementReady && sqlReady && functionReady;
  return {
    overall: allReady ? 'ready' : dataRestReady ? 'partial' : 'blocked',
    planes,
    blockers: [...new Set(blockers)].sort(),
    invariants: {
      serviceRoleDoesNotImplyManagementApi: true,
      serviceRoleDoesNotImplySqlMigration: true,
      serviceRoleDoesNotImplyFunctionDeploy: true,
      noMutatingProbeExecuted: true,
    },
  };
}

async function readOnlyFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    await response.body?.cancel().catch(() => {});
    return normalizeProbe({ status: response.status });
  } catch {
    return normalizeProbe({ kind: 'unreachable' });
  } finally {
    clearTimeout(timer);
  }
}

function credentialInventory() {
  const supabaseUrl = getSecret('SUPABASE_URL', 'supabase.admin');
  const serviceRole = getSecret('SUPABASE_SERVICE_ROLE_KEY', 'supabase.admin');
  const managementToken = getSecret('SUPABASE_ACCESS_TOKEN', 'supabase.management');
  const databaseCredential = [
    'PG_CONNECTION_VAULTSPARKSTUDIOS_WEBSITE',
    'PG_CONNECTION_VAULTSPARKSTUDIOS_GITHUB_IO',
    'SUPABASE_DB_URL',
    'SUPABASE_DATABASE_URL',
    'SUPABASE_DB_PASSWORD',
  ].some((key) => Boolean(getSecret(key, 'supabase.sql-migration')));
  return {
    values: { supabaseUrl, serviceRole, managementToken },
    public: {
      dataRest: Boolean(supabaseUrl && serviceRole),
      managementToken: Boolean(managementToken),
      databaseCredential,
    },
  };
}

async function probeLive(inventory) {
  const { supabaseUrl, serviceRole, managementToken } = inventory.values;
  // This repository owns one declared Supabase project. A studio-global
  // SUPABASE_URL can legitimately point at a sibling project, but it must
  // never retarget this probe or a later deploy.
  const projectRef = DEFAULT_PROJECT_REF;
  const observations = {};
  if (supabaseUrl && serviceRole && projectRefFromUrl(supabaseUrl) === projectRef) {
    observations.dataRest = await readOnlyFetch(`https://${projectRef}.supabase.co/rest/v1/`, {
      headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}`, Accept: 'application/json' },
    });
  } else if (supabaseUrl && serviceRole) {
    observations.dataRest = { status: 'credential-project-mismatch', httpStatus: null };
  }
  if (managementToken) {
    const headers = { Authorization: `Bearer ${managementToken}`, Accept: 'application/json' };
    observations.managementApi = await readOnlyFetch(`https://api.supabase.com/v1/projects/${projectRef}`, { headers });
    observations.sqlMigration = await readOnlyFetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'select 1 as vaultspark_authority_probe' }),
    });
    observations.edgeFunctions = await readOnlyFetch(`https://api.supabase.com/v1/projects/${projectRef}/functions`, { headers });
  }
  return { projectRef, observations };
}

function sourceEvidence() {
  return {
    migration: { path: MIGRATION_PATH, sha256: sha256File(MIGRATION_PATH) },
    function: { path: FUNCTION_PATH, sha256: sha256File(FUNCTION_PATH) },
  };
}

export function validateReceipt(receipt, currentSource = sourceEvidence()) {
  const errors = [];
  if (receipt?.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (receipt?.publicSafe !== true) errors.push('publicSafe must be true');
  if (!['ready', 'partial', 'blocked'].includes(receipt?.overall)) errors.push('overall is invalid');
  for (const key of ['dataRest', 'managementApi', 'sqlMigration', 'edgeFunctions']) {
    if (!receipt?.planes?.[key]) errors.push(`plane missing: ${key}`);
  }
  if (receipt?.planes?.dataRest?.canRunSqlMigrations !== false) errors.push('REST must not imply SQL migration authority');
  if (receipt?.planes?.dataRest?.canDeployEdgeFunctions !== false) errors.push('REST must not imply Function deploy authority');
  if (receipt?.planes?.sqlMigration?.source?.migration?.sha256 !== currentSource.migration.sha256) errors.push('migration source hash drift');
  if (receipt?.planes?.edgeFunctions?.source?.sha256 !== currentSource.function.sha256) errors.push('Function source hash drift');
  if (!Array.isArray(receipt?.blockers)) errors.push('blockers must be an array');

  const serialized = JSON.stringify(receipt);
  if (/(service_role|access_token|password|authorization|bearer\s+[a-z0-9._-]+)/i.test(serialized)) {
    errors.push('receipt contains a forbidden secret-adjacent field or value');
  }
  return errors;
}

function selfTest() {
  const source = { migration: { path: MIGRATION_PATH, sha256: 'a'.repeat(64) }, function: { path: FUNCTION_PATH, sha256: 'b'.repeat(64) } };
  const restOk = { dataRest: { status: 'ok', httpStatus: 200 } };
  const partial = classifyControlPlane({ inventory: { dataRest: true, managementToken: false, databaseCredential: false }, observations: restOk, source });
  const management = classifyControlPlane({
    inventory: { dataRest: true, managementToken: true, databaseCredential: false },
    observations: { ...restOk, managementApi: { status: 'ok', httpStatus: 200 }, sqlMigration: { status: 'ok', httpStatus: 201 }, edgeFunctions: { status: 'ok', httpStatus: 200 } },
    source,
  });
  const authFail = classifyControlPlane({
    inventory: { dataRest: true, managementToken: true, databaseCredential: true },
    observations: { dataRest: { status: 'auth-error', httpStatus: 401 }, managementApi: { status: 'auth-error', httpStatus: 401 }, edgeFunctions: { status: 'auth-error', httpStatus: 401 } },
    source,
  });
  const cases = [
    ['service-role-only is partial', partial.overall === 'partial'],
    ['service role never implies DDL', partial.planes.dataRest.canRunSqlMigrations === false],
    ['missing management token is explicit', partial.blockers.includes('supabase-management-token-missing')],
    ['explicit read-only SQL probe proves migration authority', management.planes.sqlMigration.status === 'ready'],
    ['read-only management and Function probes classify independently', management.planes.managementApi.status === 'ready' && management.planes.edgeFunctions.status === 'ready'],
    ['provider auth failures do not become ready', authFail.overall === 'blocked'],
    ['HTTP normalization distinguishes auth from outage', normalizeProbe({ status: 403 }).status === 'auth-error' && normalizeProbe({ kind: 'unreachable' }).status === 'unreachable'],
    ['no mutating probe is represented', partial.invariants.noMutatingProbeExecuted === true],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  cases.forEach(([label, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${label}`));
  console.log(`supabase-control-plane self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

const args = new Set(process.argv.slice(2));
if (args.has('--self-test')) {
  selfTest();
} else if (args.has('--probe')) {
  const inventory = credentialInventory();
  const { projectRef, observations } = await probeLive(inventory);
  const source = sourceEvidence();
  const classified = classifyControlPlane({ inventory: inventory.public, observations, source });
  const receipt = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/probe-supabase-control-plane.mjs',
    publicSafe: true,
    projectRef,
    ...classified,
  };
  const errors = validateReceipt(receipt, source);
  if (errors.length) throw new Error(errors.join('\n'));
  if (args.has('--write')) fs.writeFileSync(OUT, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(`supabase-control-plane: ${receipt.overall} (${receipt.blockers.join(', ') || 'no blockers'})${args.has('--write') ? ' · wrote public-safe receipt' : ''}`);
} else if (args.has('--check')) {
  const receipt = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const errors = validateReceipt(receipt);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(`supabase-control-plane --check: ${receipt.overall} (${receipt.blockers.length} blocker(s))`);
} else {
  console.error('Usage: --probe [--write] | --check | --self-test');
  process.exit(2);
}
