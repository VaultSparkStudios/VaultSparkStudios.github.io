#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function assert(label, condition) {
  if (!condition) failures.push(label);
}

const portalFeatures = read('vault-member/portal-features.js');
const portalCore = read('vault-member/portal-core.js');
const portalAuth = read('vault-member/portal-auth.js');
const portalHtml = read('vault-member/index.html');
const worker = read('sw.js');
const edge = read('supabase/functions/send-push/index.ts');
const prompt = read('assets/push-prompt.js');

assert('portal has a VAPID public key', /const VAPID_PUBLIC_KEY = 'B[A-Za-z0-9_-]{80,}'/.test(portalFeatures));
assert('portal registers service worker for push', /navigator\.serviceWorker\.register\('\/sw\.js'\)/.test(portalFeatures));
assert('portal subscribes with userVisibleOnly', /pushManager\.subscribe\(\{\s*userVisibleOnly:\s*true/s.test(portalFeatures));
assert('portal stores push subscription through RPC', /rpc\('upsert_push_subscription'/.test(portalFeatures));
assert('portal can delete push subscription through RPC', /rpc\('delete_push_subscription'/.test(portalFeatures));
assert('portal exposes push toggle handler', /togglePushNotifications\(e\.target\.checked\)/.test(portalCore));
assert('portal initializes push status after auth dashboard load', /registerServiceWorker\(\)\.then\(\(\) => loadPushStatus\(\)\)/.test(portalAuth));
assert('portal has push settings anchor', /id="push"/.test(portalHtml));
assert('portal has admin test push button', /id="admin-push-test-btn"/.test(portalHtml));
assert('admin push test invokes send-push', /functions\.invoke\('send-push'/.test(portalFeatures));

assert('service worker handles push events', /self\.addEventListener\('push'/.test(worker));
assert('service worker shows notifications', /showNotification\(data\.title/.test(worker));
assert('service worker opens notification URL on click', /clients\.openWindow\(url\)/.test(worker));

assert('send-push requires POST', /req\.method !== 'POST'/.test(edge));
assert('send-push only handles INSERT payloads', /payload\.type !== 'INSERT'/.test(edge));
assert('send-push routes notifications by category', /function notificationFor\(payload: any\)/.test(edge));
assert('send-push reads classified_files record title', /table === 'classified_files'/.test(edge) && /record\.title/.test(edge));
assert('send-push supports SPARKED drop notifications', /category === 'drop_shipped'/.test(edge) && /New SPARKED Drop/.test(edge));
assert('send-push supports leaderboard overtake notifications', /category === 'leaderboard_overtake'/.test(edge) && /Leaderboard Overtake/.test(edge));
assert('send-push skips unsupported categories safely', /unsupported_category/.test(edge));
assert('send-push reads push_subscriptions table', /\.from\('push_subscriptions'\)/.test(edge));
assert('send-push removes stale subscriptions', /\.delete\(\)\.in\('endpoint', stale\)/.test(edge));
assert('send-push uses VAPID env keys', /VAPID_PUBLIC_KEY/.test(edge) && /VAPID_PRIVATE_KEY/.test(edge));

assert('public push prompt links to canonical portal toggle', /href="\/vault-member\/#push"/.test(prompt));
assert('public push prompt checks PushManager support', /'PushManager' in window/.test(prompt));
assert('public push prompt suppresses denied permission', /Notification\.permission === 'denied'/.test(prompt));

if (failures.length) {
  console.error('Push contract verification failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Push contract verified: portal opt-in, service worker receipt, category-routed send-push edge route, stale cleanup, and public prompt are wired.');
