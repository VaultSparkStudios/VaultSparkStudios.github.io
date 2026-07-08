#!/usr/bin/env node
/**
 * check-worker-deploy-token-scope.mjs
 *
 * Cloudflare validates bound resources during `wrangler deploy`. If the Worker
 * config binds R2, the GitHub Actions deploy token must be documented and
 * provisioned with R2 bucket permission, not only Workers Scripts + Zone Read.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SELF_TEST = process.argv.includes('--self-test');

export function hasProductionR2Binding(wranglerText) {
  return /\[\[env\.production\.r2_buckets\]\]/.test(String(wranglerText || ''));
}

export function workflowMentionsRequiredR2Scope(workflowText) {
  const text = String(workflowText || '');
  return /CF_WORKER_API_TOKEN/.test(text)
    && /R2/i.test(text)
    && /(Bucket|Storage|Object)/i.test(text)
    && /(Read|Edit)/i.test(text);
}

export function evaluate({ wranglerText, workflowText }) {
  const r2Bound = hasProductionR2Binding(wranglerText);
  const r2ScopeDocumented = workflowMentionsRequiredR2Scope(workflowText);
  return {
    ok: !r2Bound || r2ScopeDocumented,
    r2Bound,
    r2ScopeDocumented,
    requiredScope: r2Bound ? 'R2 bucket read/edit access for bound buckets such as vaultspark-rum' : null,
  };
}

function selfTest() {
  const cases = [
    [
      'no R2 binding passes without R2 scope text',
      evaluate({ wranglerText: 'name = "x"', workflowText: 'CF_WORKER_API_TOKEN Workers Scripts: Edit + Zone: Read' }).ok,
    ],
    [
      'R2 binding fails when workflow omits R2 scope',
      !evaluate({ wranglerText: '[[env.production.r2_buckets]]\nbucket_name = "vaultspark-rum"', workflowText: 'CF_WORKER_API_TOKEN Workers Scripts: Edit + Zone: Read' }).ok,
    ],
    [
      'R2 binding passes when workflow names R2 bucket read/edit',
      evaluate({ wranglerText: '[[env.production.r2_buckets]]\nbucket_name = "vaultspark-rum"', workflowText: 'CF_WORKER_API_TOKEN Workers Scripts: Edit + Zone: Read + R2 Bucket Read/Edit' }).ok,
    ],
  ];
  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nself-test: ${cases.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (SELF_TEST) selfTest();

const result = evaluate({
  wranglerText: readFileSync(resolve(ROOT, 'cloudflare/wrangler.toml'), 'utf8'),
  workflowText: readFileSync(resolve(ROOT, '.github/workflows/cloudflare-worker-deploy.yml'), 'utf8'),
});

if (!result.ok) {
  console.error('check-worker-deploy-token-scope: FAIL');
  console.error(`  production R2 binding present: ${result.r2Bound}`);
  console.error('  CF_WORKER_API_TOKEN docs omit required R2 bucket read/edit access.');
  process.exit(1);
}

console.log(`check-worker-deploy-token-scope: ok${result.r2Bound ? ' (R2 binding scope documented)' : ''}`);
