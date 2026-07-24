#!/usr/bin/env node
/**
 * Deploy the edge Worker with Cloudflare credentials supplied by the audited
 * Studio secrets gateway. Secret values are inherited by Wrangler and are
 * never copied into the parent shell or written to deploy output.
 */
import { existsSync } from 'node:fs';
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

const readiness = resolveCapability('cloudflare.deploy');
if (!readiness.ok) {
  console.error(`deploy-worker: cloudflare.deploy is unavailable (missing: ${readiness.missing.join(', ') || 'capability mapping'})`);
  process.exit(1);
}

const wrangler = resolve(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!existsSync(wrangler)) {
  console.error('deploy-worker: local Wrangler is missing; run the repository install workflow first');
  process.exit(1);
}

console.log(`deploy-worker: deploying ${target} through the Studio secrets gateway`);
const result = spawnSync(
  process.execPath,
  [wrangler, 'deploy', '--config', 'cloudflare/wrangler.toml', '--env', target],
  {
    cwd: ROOT,
    env: envForSpawn('cloudflare.deploy', [
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID',
    ]),
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error(`deploy-worker: could not start Wrangler (${result.error.message})`);
  process.exit(1);
}
process.exit(result.status ?? 1);
