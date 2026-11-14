#!/usr/bin/env node
/**
 * Deploy the edge Worker with Cloudflare credentials supplied by the audited
 * Studio secrets gateway. Secret values are inherited by Wrangler and are
 * never copied into the parent shell or written to deploy output.
 */
import { existsSync, readFileSync, mkdirSync, lstatSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';

import { admitDeployment } from './lib/deploy-argv.mjs';
const admitted = admitDeployment({"name":"deploy-worker","boolFlags":["--self-test","--confirm-production"],"valueFlags":["--env","--isolated-staging-context","--isolated-staging-context-sha256"],"usage":"node scripts/deploy-worker.mjs [--env staging|production] [--confirm-production] [--isolated-staging-context=<file> --isolated-staging-context-sha256=<sha256>] | --self-test"});

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);

export function productionPreflightPlan({ ci = false, isolatedCli = [] } = {}) {
  return [
    {
      script: 'check-production-promotion-gate.mjs',
      args: ['--require-allowed',...isolatedCli],
      env: { GITHUB_EVENT_NAME: 'workflow_dispatch', PRODUCTION_CONFIRM: 'true' },
    },
    ci
      ? { script: 'run-release-ceremony.mjs', args: ['--check', '--require-ready', '--require-fresh',...isolatedCli] }
      : { script: 'run-release-ceremony.mjs', args: ['--url=https://website.staging.vaultsparkstudios.com', '--require-ready',...isolatedCli] },
  ];
}

if (args.includes('--self-test')) {
  const local = productionPreflightPlan({ ci: false });
  const ci = productionPreflightPlan({ ci: true });
  const cases = [
    ['promotion gate runs before ceremony', local[0].script === 'check-production-promotion-gate.mjs' && local[1].script === 'run-release-ceremony.mjs'],
    ['local deploy runs the full staging ceremony', local[1].args.includes('--url=https://website.staging.vaultsparkstudios.com') && local[1].args.includes('--require-ready')],
    ['CI deploy requires a fresh ceremony receipt', ci[1].args.includes('--require-fresh') && ci[1].args.includes('--require-ready')],
    ['promotion confirmation is explicit and manual-shaped', local[0].env.GITHUB_EVENT_NAME === 'workflow_dispatch' && local[0].env.PRODUCTION_CONFIRM === 'true'],
  ];
  for (const [label, pass] of cases) console.log(`  ${pass ? '✓' : '✗'} ${label}`);
  if (cases.some(([, pass]) => !pass)) process.exit(1);
  console.log(`deploy-worker --self-test: ${cases.length}/${cases.length} passed`);
  process.exit(0);
}

const target = admitted.values['--env'] ?? 'staging';
const isolated = admitted.values['--isolated-staging-context'] !== undefined || admitted.values['--isolated-staging-context-sha256'] !== undefined
  ? await import('./lib/isolated-staging-evidence.mjs') : null;
const isolatedArgs = isolated ? isolated.runtimeContextArgs(args) : null;
const isolatedCli = isolatedArgs ? [`--isolated-staging-context=${isolatedArgs.file}`,`--isolated-staging-context-sha256=${isolatedArgs.hash}`] : [];
if (isolatedArgs && target !== 'production') {
  console.error('deploy-worker: isolated production context cannot target staging');
  process.exit(2);
}

if (!['staging', 'production'].includes(target)) {
  console.error('deploy-worker: --env must be staging or production');
  process.exit(2);
}
if (target === 'production' && !args.includes('--confirm-production')) {
  console.error('deploy-worker: production requires an explicit --confirm-production; npm run deploy alone never authorizes production');
  process.exit(2);
}

if (target === 'production') {
  for (const step of productionPreflightPlan({ ci: process.env.GITHUB_ACTIONS === 'true', isolatedCli })) {
    console.log(`deploy-worker: production preflight · ${step.script}`);
    const result = spawnSync(process.execPath, [resolve(ROOT, 'scripts', step.script), ...step.args], {
      cwd: ROOT,
      env: { ...process.env, ...(step.env || {}) },
      stdio: 'inherit',
    });
    if (result.error || result.status !== 0) {
      console.error(`deploy-worker: production preflight rejected by ${step.script}`);
      process.exit(result.status || 1);
    }
  }
}

// The same Wrangler invocation writes the actual bundle it uploads. Never use
// a later reconstruction or a caller-selected deployment JSON as that proof.
let bundleDirectory = null;
if (target === 'production' && isolatedArgs) {
  const context = await isolated.loadRuntimeContext(ROOT,isolatedArgs.file,isolatedArgs.hash);
  if (context.installation.schemaVersion === 2) {
    const native = isolated.stageNativeAuthorization(context);
    const rollback = isolated.productionRollbackAuthorization(context);
    const {assertCurrentWorkerRollback} = await import('./lib/production-postflight.mjs');
    await assertCurrentWorkerRollback(ROOT,context,rollback);
    if (process.env.GITHUB_ACTIONS==='true') {
      if (!process.env.GITHUB_OUTPUT) throw new Error('deploy-worker: original rollback output unavailable');
      const workerVersion=rollback.worker.workerVersionId,pagesDeployment=rollback.pages.pagesDeploymentId;
      if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(workerVersion)
        || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(pagesDeployment)) throw new Error('deploy-worker: original rollback identity malformed');
      appendFileSync(process.env.GITHUB_OUTPUT,`production_rollback_worker_version=${workerVersion}\nproduction_rollback_pages_deployment=${pagesDeployment}\n`);
    }
    bundleDirectory = resolve(ROOT,'.cache','production-postflight',native.sourceCommit,
      `${context.request.workflowRunId}-${context.request.workflowRunAttempt}`,'worker-build');
    if (existsSync(bundleDirectory)) throw new Error('deploy-worker: owned bundle output already exists');
    let current = ROOT;
    for (const part of ['.cache','production-postflight',native.sourceCommit,`${context.request.workflowRunId}-${context.request.workflowRunAttempt}`]) {
      current = resolve(current,part);
      if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error('deploy-worker: linked bundle output refused');
    }
    mkdirSync(bundleDirectory,{recursive:true});
  }
}

// Local deploys use the canonical broker closure. A present-but-failing adapter
// never falls back to raw environment credentials. GitHub Actions has its own
// explicit secret injection when the sibling control plane is absent.
const REQUIRED_ENV = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];
const brokerAdapter = resolve(ROOT, '../vaultspark-studio-ops/scripts/lib/cf-deploy.mjs');
const useBroker = existsSync(brokerAdapter);
if (!useBroker && process.env.GITHUB_ACTIONS !== 'true') {
  console.error('deploy-worker: canonical Cloudflare broker adapter is unavailable; local deployment fails closed');
  process.exit(1);
}
if (!useBroker) {
  const accountPinned = /^\s*account_id\s*=/m.test(
    existsSync(resolve(ROOT, 'cloudflare', 'wrangler.toml'))
      ? readFileSync(resolve(ROOT, 'cloudflare', 'wrangler.toml'), 'utf8')
      : '',
  );
  const needed = accountPinned ? ['CLOUDFLARE_API_TOKEN'] : REQUIRED_ENV;
  if (needed.some(key => !process.env[key])) {
    console.error('deploy-worker: required explicit GitHub Actions credentials are unavailable');
    process.exit(1);
  }
}

const wrangler = resolve(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!existsSync(wrangler)) {
  console.error('deploy-worker: local Wrangler is missing; run the repository install workflow first');
  process.exit(1);
}

console.log(`deploy-worker: deploying ${target} - credentials from ${useBroker ? 'the Studio broker' : 'the GitHub Actions environment (canonical adapter absent)'}`);

function deployWithEnv(env) {
  return spawnSync(
    process.execPath,
    [wrangler, 'deploy', '--config', 'cloudflare/wrangler.toml', '--env', target,...(bundleDirectory?['--outdir',bundleDirectory]:[])],
    { cwd: ROOT, env, stdio: 'inherit' },
  );
}
let result;
if (useBroker) {
  try {
    const { withDeployEnv } = await import(pathToFileURL(brokerAdapter).href);
    result = await withDeployEnv('website-worker-deploy-' + target, (env) => {
      if (REQUIRED_ENV.some(key => typeof env[key] !== 'string' || !env[key])) {
        throw new Error('required-broker-credentials-unavailable');
      }
      // Only this closure receives broker credentials; preserve subprocess
      // runtime environment and overwrite inherited deployment keys explicitly.
      return deployWithEnv({ ...process.env, ...env });
    });
  } catch {
    console.error('deploy-worker: canonical Cloudflare broker refused or is unavailable; deployment stopped');
    process.exit(1);
  }
} else {
  result = deployWithEnv({ ...process.env });
}

if (result.error) {
  console.error(`deploy-worker: could not start Wrangler (${result.error.message})`);
  process.exit(1);
}
process.exit(result.status ?? 1);
