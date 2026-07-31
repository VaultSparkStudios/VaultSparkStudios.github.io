#!/usr/bin/env node
/**
 * Deploy the edge Worker with Cloudflare credentials supplied by the audited
 * Studio secrets gateway. Secret values are inherited by Wrangler and are
 * never copied into the parent shell or written to deploy output.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { envForSpawn, resolveCapability } from './lib/secrets.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const envFlag = args.indexOf('--env');
const target = envFlag >= 0 ? args[envFlag + 1] : 'staging';

if (!['staging', 'production'].includes(target)) {
  console.error('deploy-worker: --env must be staging or production');
  process.exit(2);
}
if (target === 'production' && !args.includes('--confirm-production')) {
  console.error('deploy-worker: production requires --confirm-production after release gates pass');
  process.exit(2);
}

/**
 * Credential source: gateway first, CI environment second.
 *
 * S300: this script could NEVER deploy from CI. It resolved `cloudflare.deploy`
 * exclusively through the Studio secrets gateway, which lives in the
 * `vaultspark-studio-ops` sibling repo — absent on a GitHub runner. So every CI
 * deploy died with "cloudflare.deploy is unavailable (missing: capability
 * mapping)" while a perfectly valid CF_WORKER_API_TOKEN sat right there in the
 * step environment, untouched. That is one of three independent reasons the edge
 * Worker went a month without a deploy (the others: a self-referential promotion
 * deadlock, D-S300.9, and the resulting stale live build).
 *
 * The gateway remains the PREFERRED path and CANON-012 is unchanged for local
 * work — nothing about the local security model moves. CI simply has a different
 * legitimate vault: GitHub Actions Secrets, injected as env. Requiring a
 * gateway that cannot exist there is not a security control, it is a permanent
 * outage. Same sibling-fallback shape already used by the propagated-doc gate.
 *
 * Fails closed either way: no gateway AND no env token is still a hard exit.
 */
const REQUIRED_ENV = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];
const readiness = resolveCapability('cloudflare.deploy');

let credentialSource = 'gateway';
if (!readiness.ok) {
  // Only the API token is genuinely required from the environment. The account
  // is already pinned in cloudflare/wrangler.toml (`account_id = …`), and
  // Wrangler reads it from there — demanding CLOUDFLARE_ACCOUNT_ID as well made
  // the CI path fail on a value it never needed. Still required when the config
  // does NOT pin one, so a misconfigured deploy cannot pick the wrong account.
  const accountPinned = /^\s*account_id\s*=/m.test(
    existsSync(resolve(ROOT, 'cloudflare', 'wrangler.toml'))
      ? readFileSync(resolve(ROOT, 'cloudflare', 'wrangler.toml'), 'utf8')
      : '',
  );
  const needed = accountPinned ? ['CLOUDFLARE_API_TOKEN'] : REQUIRED_ENV;
  const fromEnv = needed.filter((key) => !process.env[key]);
  if (fromEnv.length) {
    console.error(`deploy-worker: cloudflare.deploy is unavailable (gateway missing: ${readiness.missing.join(', ') || 'capability mapping'}; env missing: ${fromEnv.join(', ')}${accountPinned ? '' : '; no account_id pinned in wrangler.toml'})`);
    process.exit(1);
  }
  credentialSource = 'ci-environment';
}

const wrangler = resolve(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!existsSync(wrangler)) {
  console.error('deploy-worker: local Wrangler is missing; run the repository install workflow first');
  process.exit(1);
}

console.log(`deploy-worker: deploying ${target} · credentials from ${credentialSource === 'gateway' ? 'the Studio secrets gateway' : 'the CI environment (gateway unavailable)'}`);

// Gateway path builds a scrubbed env containing ONLY the declared keys. The CI
// path inherits the runner env, which already holds exactly those secrets and
// nothing else this process put there. Neither branch prints a value.
const spawnEnv = credentialSource === 'gateway'
  ? envForSpawn('cloudflare.deploy', REQUIRED_ENV)
  : { ...process.env };

const result = spawnSync(
  process.execPath,
  [wrangler, 'deploy', '--config', 'cloudflare/wrangler.toml', '--env', target],
  { cwd: ROOT, env: spawnEnv, stdio: 'inherit' },
);

if (result.error) {
  console.error(`deploy-worker: could not start Wrangler (${result.error.message})`);
  process.exit(1);
}
process.exit(result.status ?? 1);
