#!/usr/bin/env node
// @verification-scope external — credentialed Cloudflare control-plane probe.
import { getSecret } from './lib/secrets.mjs';

const accountId = getSecret('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.studio');
const token = getSecret('CLOUDFLARE_STUDIO_TOKEN', 'cloudflare.studio')
  || getSecret('CLOUDFLARE_API_TOKEN', 'cloudflare.deploy');
if (!accountId || !token) {
  console.error('check-cloudflare-web-analytics: Cloudflare account capability unavailable');
  process.exit(1);
}

const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/rum/site_info/list?per_page=100`, {
  headers: { Authorization: `Bearer ${token}` },
});
const payload = await response.json().catch(() => null);
if (!response.ok || payload?.success === false) {
  const code = payload?.errors?.[0]?.code || response.status;
  console.error(`check-cloudflare-web-analytics: unavailable (${code}) · requires Account Settings Read; no token value logged`);
  process.exit(2);
}
const sites = (payload.result || []).map((site) => ({
  host: site.rules?.find((rule) => rule.inclusive)?.host || site.ruleset?.zone_name || null,
  enabled: site.ruleset?.enabled !== false,
  autoInstall: site.auto_install === true,
  zone: site.ruleset?.zone_name || null,
})).sort((a, b) => String(a.host).localeCompare(String(b.host)));
console.log(JSON.stringify({ available: true, count: sites.length, mainSiteEnabled: sites.some((site) => site.host === 'vaultsparkstudios.com' && site.enabled), sites }, null, 2));
