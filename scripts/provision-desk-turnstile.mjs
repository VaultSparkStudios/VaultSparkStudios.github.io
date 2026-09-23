#!/usr/bin/env node
/**
 * Provision this site's existing Turnstile widget secret on its own Worker.
 * Default: read-only. Apply: --apply --env=staging|production.
 * Production requires the promotion gate and fresh canonical ceremony receipt.
 * No widget creation, rotation, domain changes, or unrelated binding updates.
 * API contract verified 2026-09-22:
 * https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/secrets/methods/update/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSecret } from './lib/secrets.mjs';
import { spawnSync } from './lib/safe-spawn.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.cloudflare.com/client/v4';
const BINDING = 'TURNSTILE_SECRET_KEY';
const HOSTS = { staging: 'website.staging.vaultsparkstudios.com', production: 'vaultsparkstudios.com' };

export function parseOptions(argv) {
  const envs = argv.filter((arg) => arg.startsWith('--env='));
  if (envs.length > 1 || argv.filter((arg) => arg === '--apply').length > 1
    || argv.some((arg) => arg !== '--apply' && !arg.startsWith('--env='))) throw new Error('Usage: [--apply] [--env=staging|production]');
  if (argv.includes('--apply') && envs.length !== 1) throw new Error('--apply requires an explicit environment');
  const env = envs.length ? envs[0].slice(6) : 'production';
  if (!Object.hasOwn(HOSTS, env)) throw new Error('Environment must be staging or production');
  return { env, apply: argv.includes('--apply') };
}

export function resolveTarget(config, source, env, gatewayAccount) {
  if (!Object.hasOwn(HOSTS, env)) throw new Error('Invalid target environment');
  const top = config.split(/^\s*\[/m)[0];
  const account = top.match(/^account_id\s*=\s*"([a-f0-9]{32})"\s*$/m)?.[1];
  const name = top.match(/^name\s*=\s*"([^"]+)"\s*$/m)?.[1];
  if (!account || gatewayAccount !== account) throw new Error('Gateway account does not match the Wrangler account');
  if (name !== 'vaultspark-security-headers') throw new Error('Unexpected Worker name in Wrangler configuration');
  const section = config.match(new RegExp('^\\[env\\.' + env + '\\]\\s*\\r?\\n([\\s\\S]*?)(?=^\\[|$(?![\\s\\S]))', 'm'))?.[1];
  if (!section || /^\s*(?:account_id|name)\s*=/m.test(section)) throw new Error('Environment target override or missing environment refused');
  const vars = config.match(new RegExp('^\\[env\\.' + env + '\\.vars\\]\\s*\\r?\\n([\\s\\S]*?)(?=^\\[|$(?![\\s\\S]))', 'm'))?.[1];
  if (!vars?.includes('PUBLIC_ORIGIN = "https://' + HOSTS[env] + '"')) throw new Error('Wrangler public origin does not match target');
  const keys = [...source.matchAll(/\b(?:var|let|const)\s+SITE_KEY\s*=\s*['"]([A-Za-z0-9_-]+)['"]/g)];
  if (keys.length !== 1 || !keys[0][1].startsWith('0x4')) throw new Error('Could not resolve one production site key from assets/turnstile.js');
  return { account, worker: name + '-' + env, env, host: HOSTS[env], sitekey: keys[0][1] };
}

export function validateWidget(widget, target) {
  if (!widget || widget.sitekey !== target.sitekey) throw new Error('Provider widget does not match the source site key');
  if (!Array.isArray(widget.domains) || !widget.domains.some((domain) =>
    domain === target.host || target.host.endsWith('.' + domain))) throw new Error('Widget does not allow the target hostname');
  if (typeof widget.secret !== 'string' || !widget.secret.trim()) throw new Error('Provider widget secret is unavailable');
}

export function validateBindings(settings, target) {
  if (!Array.isArray(settings?.bindings)) throw new Error('Worker bindings are unavailable');
  if (!settings.bindings.some((b) => b.name === 'PUBLIC_ORIGIN' && b.type === 'plain_text'
    && b.text === 'https://' + target.host)) throw new Error('Live Worker origin does not match the explicit target');
  const binding = settings.bindings.find((b) => b.name === BINDING);
  if (binding && binding.type !== 'secret_text') throw new Error('Turnstile binding has an unexpected type');
  return Boolean(binding);
}

export async function cloudflareRequest(pathname, token, init = {}, fetchFn = fetch) {
  let response;
  try {
    response = await fetchFn(API + pathname, {
      ...init, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    });
  } catch { throw new Error('Cloudflare request failed; response details withheld'); }
  let body;
  try { body = await response.json(); } catch { throw new Error('Cloudflare returned invalid JSON; response withheld'); }
  if (!response.ok || body.success !== true) {
    const error = new Error('Cloudflare request refused (HTTP ' + response.status + '); response withheld');
    error.status = response.status;
    error.permissionDenied = response.status === 401 || response.status === 403
      || body.errors?.some((item) => item.code === 10000);
    throw error;
  }
  return body.result;
}

export function productionGate(run = spawnSync) {
  const steps = [
    ['check-production-promotion-gate.mjs', ['--require-allowed']],
    ['run-release-ceremony.mjs', ['--check', '--require-ready', '--require-fresh']],
  ];
  for (const [script, args] of steps) {
    const result = run(process.execPath, [path.join(ROOT, 'scripts', script), ...args], {
      cwd: ROOT, stdio: 'inherit',
      env: { ...process.env, GITHUB_EVENT_NAME: 'workflow_dispatch', PRODUCTION_CONFIRM: 'true' },
    });
    if (result.error || result.status !== 0) throw new Error('Production preflight refused by ' + script);
  }
}

export async function provision(options, {
  config, source, secret = getSecret, request = cloudflareRequest, gate = productionGate,
} = {}) {
  const target = resolveTarget(config, source, options.env, secret('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.deploy'));
  const token = secret('CLOUDFLARE_API_TOKEN', 'cloudflare.deploy');
  if (typeof token !== 'string' || !token.trim()) throw new Error('Cloudflare deploy credential is unavailable');
  const workerPath = '/accounts/' + target.account + '/workers/scripts/' + target.worker;
  const widgetPath = '/accounts/' + target.account + '/challenges/widgets/' + target.sitekey;
  const settings = await request(workerPath + '/settings', token);
  const presentBefore = validateBindings(settings, target);
  let widget;
  try { widget = await request(widgetPath, token); }
  catch (error) {
    if (!error.permissionDenied) throw error;
    const studioToken = secret('CLOUDFLARE_STUDIO_TOKEN', 'cloudflare.studio');
    if (typeof studioToken !== 'string' || !studioToken.trim()) throw new Error('Widget-read authority unavailable');
    // Broader token is used exclusively for this one read, never Worker mutation.
    widget = await request(widgetPath, studioToken);
  }
  validateWidget(widget, target);
  let presentAfter = presentBefore;
  if (options.apply) {
    if (target.env === 'production') await gate();
    await request(workerPath + '/secrets', token, {
      method: 'PUT', body: JSON.stringify({ name: BINDING, text: widget.secret, type: 'secret_text' }),
    });
    presentAfter = validateBindings(await request(workerPath + '/settings', token), target);
    if (!presentAfter) throw new Error('Secret PUT completed but binding readback is missing');
  }
  // Return only public identifiers and presence, never widget response or secret.
  return { env: target.env, worker: target.worker, sitekey: target.sitekey,
    widgetVerified: true, presentBefore, presentAfter, applied: options.apply,
    valueEqualityVerified: false };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseOptions(argv);
  const result = await provision(options, {
    config: fs.readFileSync(path.join(ROOT, 'cloudflare/wrangler.toml'), 'utf8'),
    source: fs.readFileSync(path.join(ROOT, 'assets/turnstile.js'), 'utf8'),
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}
const entry = process.argv[1] && path.resolve(process.argv[1]);
if (entry && entry.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  try { await main(); }
  catch (error) {
    // Unexpected provider/library errors can contain credentials; CLI prints no body.
    console.error('Desk Turnstile provisioning failed: ' +
      (error.message.startsWith('Cloudflare ') || error.message.startsWith('Production preflight')
        || /^(Gateway account|Unexpected Worker|Environment|--apply|Usage:|Widget |Provider widget|Live Worker|Wrangler |Could not resolve|Turnstile binding|Worker bindings|Secret PUT)/.test(error.message)
        ? error.message : 'details withheld'));
    process.exitCode = 1;
  }
}
