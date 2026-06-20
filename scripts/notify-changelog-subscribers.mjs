#!/usr/bin/env node
/* notify-changelog-subscribers.mjs — S212 W6
   Reads api/changelog-narrative.json, compares the latest entry SHA against
   data/last-notified-changelog.json, and dispatches a push notification if
   a new changelog entry has shipped.

   Usage:
     node scripts/notify-changelog-subscribers.mjs
     node scripts/notify-changelog-subscribers.mjs --dry-run  # preview without sending
     node scripts/notify-changelog-subscribers.mjs --force    # resend even if already notified
     npm run notify:changelog

   The sentinel data/last-notified-changelog.json stores the last dispatched SHA.
   Update it only AFTER a successful send (honest-dark pattern).
*/
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const FEED     = join(ROOT, 'api', 'changelog-narrative.json');
const SENTINEL = join(ROOT, 'data', 'last-notified-changelog.json');
const args     = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const FORCE    = args.includes('--force');

function loadFeed() {
  if (!existsSync(FEED)) {
    console.error('notify-changelog: api/changelog-narrative.json not found');
    process.exit(1);
  }
  return JSON.parse(readFileSync(FEED, 'utf8'));
}

function loadSentinel() {
  if (!existsSync(SENTINEL)) return { lastNotifiedSha: null, lastNotifiedAt: null };
  return JSON.parse(readFileSync(SENTINEL, 'utf8'));
}

function writeSentinel(sha) {
  writeFileSync(SENTINEL, JSON.stringify({ lastNotifiedSha: sha, lastNotifiedAt: new Date().toISOString() }, null, 2));
}

async function dispatch(entry) {
  // Delegate to notify-subscribers.mjs with appropriate title/body/url.
  const { createRequire } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  const OPS = join(ROOT, '..', 'vaultspark-studio-ops');
  const opsLib = join(OPS, 'scripts', 'lib', 'secrets.mjs');
  const { getSecret } = await import(pathToFileURL(opsLib).href);
  const safe = async (k, c) => { try { return await getSecret(k, c); } catch { return null; } };
  const accountId = await safe('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.deploy');
  const apiToken  = await safe('CLOUDFLARE_API_TOKEN', 'cloudflare.deploy');
  const vapidPub  = await safe('VAPID_PUBLIC_KEY', 'cloudflare.vapid');
  const vapidPriv = await safe('VAPID_PRIVATE_KEY', 'cloudflare.vapid');
  const vapidSubj = await safe('VAPID_SUBJECT', 'cloudflare.vapid');

  if (!accountId || !apiToken || !vapidPub || !vapidPriv || !vapidSubj) {
    console.error('notify-changelog: credentials MISSING (cloudflare.deploy or cloudflare.vapid)');
    process.exit(1);
  }

  const KV_NS = '6fde74ca7f3d462786afbb85c85611e0';
  const SUB_PREFIX = 'vs:push:sub:';

  async function kvList(cursor) {
    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${KV_NS}/keys`;
    const url = base + `?prefix=${encodeURIComponent(SUB_PREFIX)}&limit=100` + (cursor ? `&cursor=${cursor}` : '');
    const r = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
    if (!r.ok) throw new Error(`KV list failed: ${r.status}`);
    return r.json();
  }

  async function kvGet(key) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${KV_NS}/values/${encodeURIComponent(key)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
    return r.ok ? r.text() : null;
  }

  const keys = [];
  let cursor = null;
  do {
    const page = await kvList(cursor);
    (page.result || []).forEach((k) => keys.push(k.name));
    cursor = page.result_info && page.result_info.cursor ? page.result_info.cursor : null;
  } while (cursor);

  console.log(`notify-changelog: ${keys.length} subscriber(s) found.`);
  if (!keys.length) return 0;

  const require = createRequire(import.meta.url);
  const webPush = require('web-push');
  webPush.setVapidDetails(vapidSubj, vapidPub, vapidPriv);

  const badge = entry.tone === 'feat' ? '✨' : entry.tone === 'fix' ? '🔧' : '📦';
  const title = `${badge} VaultSpark Update`;
  const body = entry.sentence.length > 100 ? entry.sentence.slice(0, 97) + '…' : entry.sentence;
  const url = '/changelog/';

  const payload = JSON.stringify({ title, body, icon: '/assets/icons/icon-192.png', badge: '/assets/icons/badge-72.png', url, tag: `vs-changelog-${entry.sha}` });

  let sent = 0, failed = 0;
  for (const key of keys) {
    const raw = await kvGet(key);
    if (!raw) { failed++; continue; }
    try {
      await webPush.sendNotification(JSON.parse(raw), payload);
      sent++;
    } catch (e) {
      console.warn(`Failed ${key}: ${e.message}`);
      failed++;
    }
  }
  console.log(`notify-changelog: ${sent} sent, ${failed} failed.`);
  return sent;
}

(async function main() {
  const feed = loadFeed();
  const entries = feed.entries || [];
  if (!entries.length) {
    console.log('notify-changelog: no entries in feed.');
    process.exit(0);
  }

  const latest = entries[0];
  const sentinel = loadSentinel();

  if (!FORCE && sentinel.lastNotifiedSha === latest.sha) {
    console.log(`notify-changelog: already notified for ${latest.sha} — nothing to do.`);
    process.exit(0);
  }

  console.log(`notify-changelog: new entry → sha=${latest.sha} tone=${latest.tone}`);
  console.log(`  "${latest.sentence}"`);

  if (DRY_RUN) {
    console.log('[DRY RUN] Would dispatch to subscribers. Sentinel NOT updated.');
    process.exit(0);
  }

  const sent = await dispatch(latest);
  if (sent > 0 || !entries.length) {
    writeSentinel(latest.sha);
    console.log(`notify-changelog: sentinel updated → ${latest.sha}`);
  }
  process.exit(0);
})();
