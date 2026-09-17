// S357 scratch — read the production/staging Worker secret NAMES (never values)
// through the studio secrets gateway, to tell a missing SUPABASE_SERVICE_ROLE_KEY
// apart from a failing Supabase query. Both currently surface as the same opaque
// `comments_unavailable` 503.
import { envForSpawn } from '../scripts/lib/secrets.mjs';

const env = await envForSpawn('cloudflare.deploy');
const token = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_STUDIO_TOKEN;
const account = env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) { console.log('no gateway credential'); process.exit(1); }

for (const script of ['vaultspark-security-headers-production', 'vaultspark-security-headers-staging']) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${script}/secrets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await r.json().catch(() => null);
  if (!r.ok || !body?.success) {
    console.log(`${script}: HTTP ${r.status} ${JSON.stringify(body?.errors || body).slice(0, 160)}`);
    continue;
  }
  const names = (body.result || []).map((s) => s.name).sort();
  console.log(`${script}: ${names.length} secret(s) → ${names.join(', ') || '(none)'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY present: ${names.includes('SUPABASE_SERVICE_ROLE_KEY')}`);
}
