#!/usr/bin/env node
/**
 * sync-staging-headers.mjs (S174 audit #7 · staging-header-parity-fix)
 *
 * Staging (Hetzner Caddy) served zero security headers while production
 * serves the CSP/HSTS/XCTO/Referrer-Policy quartet from the Cloudflare
 * Worker — so staging could never catch header drift (CANON-007).
 *
 * This script makes staging mirror production:
 *   1. Fetch production's live security headers.
 *   2. Strip the per-request CSP nonce (staging is static — no nonce).
 *   3. Write /etc/caddy/vaultspark-staging-headers.caddy on the Hetzner box.
 *   4. Ensure the website.staging block imports it; validate + reload Caddy.
 *
 * When production CSP changes, parity goes yellow and rerunning this script
 * is the one-command fix. Uses hetzner.ssh via the secrets gateway.
 *
 * Usage:
 *   node scripts/sync-staging-headers.mjs           # sync + reload
 *   node scripts/sync-staging-headers.mjs --dry-run # print snippet only
 */

import { spawnSync } from './lib/safe-spawn.mjs';

const DRY = process.argv.includes('--dry-run');
const PROD = 'https://vaultsparkstudios.com/';
const SNIPPET_PATH = '/etc/caddy/vaultspark-staging-headers.caddy';
const CADDYFILE = '/etc/caddy/Caddyfile';

const { getSecret, redact } = await import('./lib/secrets.mjs');

const res = await fetch(PROD, { headers: { 'user-agent': 'Mozilla/5.0 VaultSpark staging-header-sync' } });
if (!res.ok) {
  console.error(`sync-staging-headers: prod fetch failed HTTP ${res.status}`);
  process.exit(1);
}

const csp = (res.headers.get('content-security-policy') || '')
  .replace(/'nonce-[^']*'\s*/g, '') // per-request — staging is static
  .replace(/\s+/g, ' ')
  .trim();
const hsts = res.headers.get('strict-transport-security') || 'max-age=31536000; includeSubDomains; preload';
const xcto = res.headers.get('x-content-type-options') || 'nosniff';
const referrer = res.headers.get('referrer-policy') || 'strict-origin-when-cross-origin';

if (!csp) {
  console.error('sync-staging-headers: prod returned no CSP — refusing to sync an empty policy');
  process.exit(1);
}

const snippet = `# generated-by: scripts/sync-staging-headers.mjs (website repo)
# Mirrors production security headers (CSP nonce stripped — static origin).
# Regenerate: node scripts/sync-staging-headers.mjs
header {
  Content-Security-Policy "${csp.replace(/"/g, '\\"')}"
  Strict-Transport-Security "${hsts}"
  X-Content-Type-Options "${xcto}"
  Referrer-Policy "${referrer}"
}
`;

if (DRY) {
  console.log(snippet);
  process.exit(0);
}

let key, host;
try {
  key = getSecret('HETZNER_SSH_KEY_PATH', 'hetzner.ssh');
  host = getSecret('HETZNER_HOST', 'hetzner.ssh');
} catch (err) {
  console.error(`sync-staging-headers: credential resolution failed — ${redact(String(err?.message || err))}`);
  process.exit(1);
}

const remote = [
  `cat > ${SNIPPET_PATH} << 'VSEOF'`,
  snippet,
  'VSEOF',
  // The staging vhost lives in conf.d/staging.caddy (probed S174); fall back
  // to the main Caddyfile if the layout changes again.
  `TARGET=$(grep -rln "^website.staging.vaultsparkstudios.com {" /etc/caddy/conf.d/ ${CADDYFILE} 2>/dev/null | head -1)`,
  `[ -n "$TARGET" ] || { echo NO_VHOST_FILE; exit 1; }`,
  `grep -q "import ${SNIPPET_PATH}" "$TARGET" || sed -i '/^website.staging.vaultsparkstudios.com {/a\\\timport ${SNIPPET_PATH}' "$TARGET"`,
  `caddy validate --config ${CADDYFILE} && systemctl reload caddy && echo CADDY_RELOADED`,
].join('\n');

const r = spawnSync('ssh', ['-i', key, '-o', 'StrictHostKeyChecking=accept-new', `root@${host}`, remote], {
  encoding: 'utf8', timeout: 60000,
});
const out = `${r.stdout || ''}${r.stderr || ''}`;
if (!out.includes('CADDY_RELOADED')) {
  console.error(`sync-staging-headers: remote update failed —\n${redact(out.slice(0, 600))}`);
  process.exit(1);
}
console.log('sync-staging-headers: staging now mirrors prod security headers (nonce stripped) · Caddy reloaded');
