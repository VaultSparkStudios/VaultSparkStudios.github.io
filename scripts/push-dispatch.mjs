#!/usr/bin/env node
/* push-dispatch.mjs — S205 #19
   Send a test web-push notification to verify the VAPID stack end-to-end.

   CREDENTIAL GATE: requires cloudflare.vapid capability (VAPID_PUBLIC_KEY +
   VAPID_PRIVATE_KEY + VAPID_SUBJECT) in the secrets gateway. Generate VAPID
   keys once via: npx web-push generate-vapid-keys
   Then store in vaultspark-studio-ops/secrets/cloudflare.vapid.env

   Usage:
     node scripts/push-dispatch.mjs --endpoint <push-subscription-url>
     node scripts/push-dispatch.mjs --test   # uses TEST_ENDPOINT from secrets (if set)
     node scripts/push-dispatch.mjs --status # just check if VAPID is ready

   Requires: web-push package installed (npm install web-push --save-dev)
   Status: READY — cloudflare.vapid present in secrets gateway (web-push installed, VAPID keys provisioned S207)
*/
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const STATUS_ONLY = args.includes('--status');
const TEST_MODE = args.includes('--test');
const endpointArg = args.includes('--endpoint') ? args[args.indexOf('--endpoint') + 1] : null;

async function getVapidCreds() {
  try {
    const opsPath = join(ROOT, '..', 'vaultspark-studio-ops', 'scripts', 'lib', 'secrets.mjs');
    const { getSecret } = await import(new URL('file:///' + opsPath.replace(/\\/g, '/')).href);
    // getSecret is synchronous — `await getSecret(...).catch()` throws (".catch is
    // not a function") and was silently swallowed, faking MISSING. Resolve each
    // defensively (works whether getSecret is sync or returns a thenable). [S207 fix]
    const safe = async (key) => { try { return await getSecret(key, 'cloudflare.vapid'); } catch { return null; } };
    const pub = await safe('VAPID_PUBLIC_KEY');
    const priv = await safe('VAPID_PRIVATE_KEY');
    const subj = await safe('VAPID_SUBJECT');
    return { pub, priv, subj };
  } catch (_) {
    return { pub: null, priv: null, subj: null };
  }
}

(async function main() {
  const { pub, priv, subj } = await getVapidCreds();
  const ready = pub && priv && subj;

  if (STATUS_ONLY) {
    console.log(ready ? 'VAPID READY' : 'VAPID MISSING — generate keys and store in secrets gateway');
    process.exit(ready ? 0 : 1);
  }

  if (!ready) {
    console.error([
      'push-dispatch: VAPID credentials MISSING.',
      '',
      'Steps to unblock:',
      '  1. Generate VAPID keys:',
      '       npx web-push generate-vapid-keys',
      '  2. Store in vaultspark-studio-ops/secrets/cloudflare.vapid.env:',
      '       VAPID_PUBLIC_KEY=<key>',
      '       VAPID_PRIVATE_KEY=<key>',
      '       VAPID_SUBJECT=mailto:studio@vaultsparkstudios.com',
      '  3. Add public key to Worker env as VAPID_PUBLIC_KEY',
      '  4. Re-run: node scripts/push-dispatch.mjs --test',
    ].join('\n'));
    process.exit(1);
  }

  if (!endpointArg && !TEST_MODE) {
    console.error('push-dispatch: pass --endpoint <url> or --test (uses TEST_ENDPOINT from secrets)');
    process.exit(1);
  }

  // web-push must be installed
  const require = createRequire(import.meta.url);
  let webPush;
  try { webPush = require('web-push'); } catch (_) {
    console.error('push-dispatch: web-push not installed. Run: npm install web-push --save-dev');
    process.exit(1);
  }

  webPush.setVapidDetails(subj, pub, priv);

  const endpoint = endpointArg || (TEST_MODE ? process.env.TEST_PUSH_ENDPOINT : null);
  if (!endpoint) { console.error('push-dispatch: no endpoint. Set TEST_PUSH_ENDPOINT env or --endpoint'); process.exit(1); }

  const payload = JSON.stringify({
    title: 'VaultSpark Studio',
    body: 'Test notification from the forge — push stack verified.',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/badge-72.png',
    tag: 'vs-test-push',
  });

  try {
    const sub = JSON.parse(endpoint);
    await webPush.sendNotification(sub, payload);
    console.log('push-dispatch: test push sent successfully ✓');
  } catch (e) {
    console.error('push-dispatch: send failed — ' + e.message);
    process.exit(1);
  }
})();
