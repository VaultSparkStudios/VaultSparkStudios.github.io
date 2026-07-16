#!/usr/bin/env node
/* notify-subscribers.mjs — S212 W5 · S213 W3a (game segmentation)
   Send a web-push notification to subscribed users via the Cloudflare KV
   subscription list. Uses the cloudflare.deploy capability for the CF API token
   and cloudflare.vapid for VAPID credentials.

   Usage:
     node scripts/notify-subscribers.mjs --title "Title" --body "Body" [--url /path/]
     node scripts/notify-subscribers.mjs --title "..." --body "..." --dry-run
     node scripts/notify-subscribers.mjs --count  # subscriber count + game breakdown
     node scripts/notify-subscribers.mjs --title "..." --body "..." --game cod
       # send only to subscribers whose last game was Call of Doodie

   npm alias: npm run push:notify -- --title "..." --body "..."
*/
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT  = join(dirname(fileURLToPath(import.meta.url)), '..');
const OPS   = join(ROOT, '..', 'vaultspark-studio-ops');
const args  = process.argv.slice(2);

const DRY_RUN     = args.includes('--dry-run');
const COUNT_ONLY  = args.includes('--count');
const GAME_FILTER = args.includes('--game') ? args[args.indexOf('--game') + 1] : null;
const TITLE       = args.includes('--title') ? args[args.indexOf('--title') + 1] : 'VaultSpark Studios';
const BODY        = args.includes('--body')  ? args[args.indexOf('--body')  + 1] : '';
const URL_PATH    = args.includes('--url')   ? args[args.indexOf('--url')   + 1] : '/vault-member/';

const GAME_ALLOW = new Set(['cod', 'fgm', 'forge']);
if (GAME_FILTER && !GAME_ALLOW.has(GAME_FILTER)) {
  console.error(`notify-subscribers: --game must be one of: ${[...GAME_ALLOW].join(', ')}`);
  process.exit(1);
}

// S227: per-game personalized copy variants. When --title/--body are the default values
// and a subscriber's lastGame matches, swap in a more relevant headline/hook.
// Falls back to the caller-supplied title/body when no match.
const GAME_COPY_VARIANTS = {
  cod: {
    title: (base) => base === 'VaultSpark Studios' ? 'Call of Doodie Update' : base,
    body:  (base) => base || 'Your Doodie squad has a new drop waiting.',
    url:   (base) => base === '/vault-member/' ? '/games/call-of-doodie/' : base,
  },
  fgm: {
    title: (base) => base === 'VaultSpark Studios' ? 'Franchise Architect Update' : base,
    body:  (base) => base || 'Gridiron GM has new intel for your franchise.',
    url:   (base) => base === '/vault-member/' ? '/games/gridiron-gm-play/' : base,
  },
  forge: {
    title: (base) => base === 'VaultSpark Studios' ? 'VaultSpark Studios Update' : base,
    body:  (base) => base || 'Something new is sparking in the Vault.',
    url:   (base) => base,
  },
};

const KV_NAMESPACE_ID = '6fde74ca7f3d462786afbb85c85611e0'; // RATE_LIMIT binding (wrangler.toml)
const SUB_PREFIX = 'vs:push:sub:';

async function getSecrets() {
  const opsLib = join(OPS, 'scripts', 'lib', 'secrets.mjs');
  const { getSecret } = await import(new URL('file:///' + opsLib.replace(/\\/g, '/')).href);
  const safe = async (key, cap) => { try { return await getSecret(key, cap); } catch { return null; } };
  const accountId  = await safe('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.deploy');
  const apiToken   = await safe('CLOUDFLARE_API_TOKEN',  'cloudflare.deploy');
  const vapidPub   = await safe('VAPID_PUBLIC_KEY',  'cloudflare.vapid');
  const vapidPriv  = await safe('VAPID_PRIVATE_KEY', 'cloudflare.vapid');
  const vapidSubj  = await safe('VAPID_SUBJECT',     'cloudflare.vapid');
  return { accountId, apiToken, vapidPub, vapidPriv, vapidSubj };
}

async function cfKvList(accountId, apiToken, cursor) {
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${KV_NAMESPACE_ID}/keys`;
  const url  = base + `?prefix=${encodeURIComponent(SUB_PREFIX)}&limit=100` + (cursor ? `&cursor=${cursor}` : '');
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
  if (!resp.ok) throw new Error(`CF KV list failed: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function cfKvGet(accountId, apiToken, key) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${encodeURIComponent(key)}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
  if (!resp.ok) return null;
  return resp.text();
}

async function listAllSubKeys(accountId, apiToken) {
  const keys = [];
  let cursor = null;
  do {
    const page = await cfKvList(accountId, apiToken, cursor);
    const result = page.result || [];
    result.forEach((k) => keys.push(k.name));
    cursor = page.result_info && page.result_info.cursor ? page.result_info.cursor : null;
  } while (cursor);
  return keys;
}

(async function main() {
  const { accountId, apiToken, vapidPub, vapidPriv, vapidSubj } = await getSecrets();

  if (!accountId || !apiToken) {
    console.error('notify-subscribers: cloudflare.deploy credentials MISSING');
    process.exitCode = 1; return;
  }
  if (!vapidPub || !vapidPriv || !vapidSubj) {
    console.error('notify-subscribers: cloudflare.vapid credentials MISSING');
    process.exitCode = 1; return;
  }

  console.log('Listing subscribers from KV…');
  const keys = await listAllSubKeys(accountId, apiToken);
  console.log(`Found ${keys.length} subscriber key(s).`);

  if (COUNT_ONLY) {
    const gameCounts = {};
    let withGame = 0, withoutGame = 0;
    for (const key of keys) {
      const raw = await cfKvGet(accountId, apiToken, key);
      if (!raw) continue;
      try {
        const sub = JSON.parse(raw);
        const g = sub.lastGame || null;
        if (g) { gameCounts[g] = (gameCounts[g] || 0) + 1; withGame++; }
        else withoutGame++;
      } catch (_) {}
    }
    console.log(`  With game context: ${withGame} (${Object.entries(gameCounts).map(([g, n]) => `${g}:${n}`).join(', ') || 'none'})`);
    console.log(`  No game context:   ${withoutGame}`);
    return;
  }

  if (!keys.length) {
    console.log('No subscribers — nothing to send.');
    return;
  }

  if (!BODY) {
    console.error('notify-subscribers: --body is required');
    process.exitCode = 1; return;
  }

  const require = createRequire(import.meta.url);
  let webPush;
  try { webPush = require('web-push'); }
  catch (_) { console.error('notify-subscribers: web-push not installed'); process.exitCode = 1; return; }

  webPush.setVapidDetails(vapidSubj, vapidPub, vapidPriv);

  if (DRY_RUN) {
    console.log('[DRY RUN] Would send to subscribers' + (GAME_FILTER ? ` with game=${GAME_FILTER}` : ' (all, personalized)') + ':');
    console.log('  title:', TITLE, '(may be personalized per sub.lastGame)');
    console.log('  body: ', BODY, '(may be personalized per sub.lastGame)');
    console.log('  url:  ', URL_PATH, '(may be personalized per sub.lastGame)');
    if (GAME_FILTER) console.log('  filter: --game', GAME_FILTER);
    return;
  }

  let sent = 0, failed = 0, skipped = 0;
  for (const key of keys) {
    const raw = await cfKvGet(accountId, apiToken, key);
    if (!raw) { failed++; continue; }
    try {
      const sub = JSON.parse(raw);
      if (GAME_FILTER && sub.lastGame !== GAME_FILTER) { skipped++; continue; }

      // S227: apply per-game copy variant when subscriber has a known lastGame.
      const variant = sub.lastGame && GAME_COPY_VARIANTS[sub.lastGame];
      const personalizedTitle = variant ? variant.title(TITLE) : TITLE;
      const personalizedBody  = variant ? variant.body(BODY)   : BODY;
      const personalizedUrl   = variant ? variant.url(URL_PATH) : URL_PATH;

      const personalizedPayload = JSON.stringify({
        title: personalizedTitle,
        body: personalizedBody,
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/badge-72.png',
        url: personalizedUrl,
        tag: 'vs-notify',
      });

      await webPush.sendNotification(sub, personalizedPayload);
      sent++;
    } catch (e) {
      console.warn(`Failed to send to ${key}: ${e.message}`);
      failed++;
    }
  }
  const skipNote = GAME_FILTER ? ` · ${skipped} skipped (game≠${GAME_FILTER})` : '';
  console.log(`Done: ${sent} sent, ${failed} failed${skipNote} (${keys.length} total).`);
  if (failed > 0 && sent === 0) process.exitCode = 1;
})();
