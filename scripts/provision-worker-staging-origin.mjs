#!/usr/bin/env node
/**
 * Provision the canonical Worker-capable staging topology.
 *
 * Universal TLS does not cover the canonical nested staging hostname. Caddy
 * therefore terminates its existing certificate and reverse-proxies to the
 * isolated workers.dev deployment, which fetches a separate DNS-only origin.
 * Both Caddy configs and both DNS records are rollback-aware.
 *
 * Usage:
 *   node scripts/provision-worker-staging-origin.mjs --self-test
 *   node scripts/provision-worker-staging-origin.mjs --check
 *   node scripts/provision-worker-staging-origin.mjs --apply
 */
import { spawnSync } from './lib/safe-spawn.mjs';
import { getSecret, redact } from './lib/secrets.mjs';

const ORIGIN_DOMAIN = 'website-origin.staging.vaultsparkstudios.com';
const PUBLIC_DOMAIN = 'website.staging.vaultsparkstudios.com';
const WORKER_UPSTREAM = 'vaultspark-security-headers-staging.founder-d73.workers.dev';
const REMOTE_ROOT = '/opt/studio/staging/website';
const REMOTE_CONFIG = '/etc/caddy/conf.d/website-origin-staging.caddy';
const PUBLIC_CONFIG = '/etc/caddy/conf.d/staging.caddy';
const args = new Set(process.argv.slice(2));

export function hostIp(value) {
  const candidate = String(value || '').trim().replace(/^.*@/, '');
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(candidate) ? candidate : null;
}

export function renderCaddy() {
  return `# generated-by: scripts/provision-worker-staging-origin.mjs\n${ORIGIN_DOMAIN} {\n  root * ${REMOTE_ROOT}\n  import /etc/caddy/vaultspark-staging-headers.caddy\n  encode zstd gzip\n  file_server\n  handle_errors {\n    rewrite * /404.html\n    file_server\n  }\n}\n`;
}

export function renderPublicCaddy() {
  return `# generated-by: scripts/provision-worker-staging-origin.mjs\n${PUBLIC_DOMAIN} {\n  reverse_proxy https://${WORKER_UPSTREAM} {\n    header_up Host ${WORKER_UPSTREAM}\n    header_up X-Forwarded-Host {host}\n    header_up X-Forwarded-Proto {scheme}\n    transport http {\n      tls_server_name ${WORKER_UPSTREAM}\n    }\n  }\n}\n`;
}

if (args.has('--self-test')) {
  const text = renderCaddy();
  const publicText = renderPublicCaddy();
  const cases = [
    ['extracts a bounded IPv4 host', hostIp('root@178.156.211.100') === '178.156.211.100'],
    ['rejects shell-bearing hosts', hostIp('root@1.2.3.4;touch /tmp/x') === null],
    ['renders the isolated origin only', text.startsWith(`# generated-by:`) && text.includes(`${ORIGIN_DOMAIN} {`)],
    ['keeps the public hostname out of the origin vhost', !text.includes(`${PUBLIC_DOMAIN} {`)],
    ['pins the bounded staging root', text.includes(`root * ${REMOTE_ROOT}`)],
    ['serves the candidate custom 404 for origin misses', text.includes('handle_errors {') && text.includes('rewrite * /404.html')],
    ['routes the canonical host through the isolated Worker', publicText.includes(`${PUBLIC_DOMAIN} {`) && publicText.includes(`reverse_proxy https://${WORKER_UPSTREAM}`)],
    ['pins upstream Host and TLS SNI', publicText.includes(`header_up Host ${WORKER_UPSTREAM}`) && publicText.includes(`tls_server_name ${WORKER_UPSTREAM}`)],
  ];
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  process.exit(cases.every(([, ok]) => ok) ? 0 : 1);
}

if (!args.has('--check') && !args.has('--apply')) {
  console.error('usage: --self-test | --check | --apply');
  process.exit(1);
}

// Reuse the Studio control plane's bounded DNS client. This keeps credentials
// inside the canonical gateway and makes timeouts/error normalization identical
// to every other Cloudflare mutation in the Studio.
const { cfDns, cfZoneId } = await import('../../vaultspark-studio-ops/scripts/lib/cf-deploy.mjs');
const zoneId = cfZoneId();
const sshKey = getSecret('HETZNER_SSH_KEY_PATH', 'hetzner.ssh');
const sshHost = getSecret('HETZNER_HOST', 'hetzner.ssh');
const ip = hostIp(sshHost);
if (!ip) throw new Error('Hetzner host did not resolve to a bounded IPv4 address');
const sshTarget = String(sshHost).includes('@') ? String(sshHost) : `root@${sshHost}`;

async function cf(path, init = {}) {
  const result = await cfDns(path, init);
  if (!result.ok) {
    throw new Error(`Cloudflare DNS request failed HTTP ${result.status}`);
  }
  return result.body;
}

async function findRecord(name) {
  const listed = await cf(`/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(name)}`);
  return Array.isArray(listed.result) ? listed.result[0] : null;
}

const originExisting = await findRecord(ORIGIN_DOMAIN);
const publicExisting = await findRecord(PUBLIC_DOMAIN);

function caddyProbe() {
  return spawnSync('ssh', [
    '-i', sshKey, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
    '-o', 'StrictHostKeyChecking=accept-new', sshTarget,
    `set -eu; test -f ${REMOTE_CONFIG}; grep -q '^${ORIGIN_DOMAIN} {' ${REMOTE_CONFIG}; test -f ${PUBLIC_CONFIG}; grep -q 'reverse_proxy https://${WORKER_UPSTREAM}' ${PUBLIC_CONFIG}; health=$(mktemp); trap 'rm -f "$health"' EXIT; status=$(curl -sS --max-time 20 --resolve '${PUBLIC_DOMAIN}:443:127.0.0.1' -o "$health" -w '%{http_code}' 'https://${PUBLIC_DOMAIN}/api/auth/me'); test "$status" = 200; grep -q '"identity":null' "$health"`,
  ], { encoding: 'utf8', timeout: 30000, windowsHide: true });
}

if (args.has('--check')) {
  const caddy = caddyProbe();
  const originOk = !!originExisting && originExisting.content === ip && originExisting.proxied === false;
  const publicOk = !!publicExisting && publicExisting.content === ip && publicExisting.proxied === false;
  console.log(`worker staging topology · origin DNS ${originOk ? 'ok' : 'missing/drifted'} · canonical ingress ${publicOk ? 'ok' : 'missing/drifted'} · Caddy proxy ${caddy.status === 0 ? 'ok' : 'missing'}`);
  process.exit(originOk && publicOk && caddy.status === 0 ? 0 : 1);
}

const rollbacks = [];
async function upsertRecord(existing, desired) {
  if (!existing) {
    const made = await cf(`/zones/${zoneId}/dns_records`, { method: 'POST', body: JSON.stringify(desired) });
    rollbacks.push({ action: 'delete', id: made.result.id });
    return made.result;
  }
  if (existing.content === desired.content && existing.proxied === desired.proxied
      && (desired.proxied || existing.ttl === desired.ttl)) return existing;
  const previous = {
    type: existing.type, name: existing.name, content: existing.content,
    ttl: existing.ttl, proxied: existing.proxied,
  };
  const updated = await cf(`/zones/${zoneId}/dns_records/${existing.id}`, { method: 'PUT', body: JSON.stringify(desired) });
  rollbacks.push({ action: 'restore', id: existing.id, previous });
  return updated.result;
}

try {
  await upsertRecord(originExisting, { type: 'A', name: ORIGIN_DOMAIN, content: ip, ttl: 300, proxied: false });
  await upsertRecord(publicExisting, { type: 'A', name: PUBLIC_DOMAIN, content: ip, ttl: 300, proxied: false });

  const caddyBase64 = Buffer.from(renderCaddy(), 'utf8').toString('base64');
  const publicCaddyBase64 = Buffer.from(renderPublicCaddy(), 'utf8').toString('base64');
  const remoteScript = `set -euo pipefail\norigin_b64="$1"\npublic_b64="$2"\norigin_config='${REMOTE_CONFIG}'\npublic_config='${PUBLIC_CONFIG}'\nroot='${REMOTE_ROOT}'\ntest -d "$root"\nstamp="$(date -u +%Y%m%dT%H%M%SZ)"\norigin_backup="${REMOTE_CONFIG}.vss-$stamp"\npublic_backup="${PUBLIC_CONFIG}.vss-$stamp"\norigin_existed=0\npublic_existed=0\nif test -f "$origin_config"; then cp -p "$origin_config" "$origin_backup"; origin_existed=1; fi\nif test -f "$public_config"; then cp -p "$public_config" "$public_backup"; public_existed=1; fi\norigin_tmp="$(mktemp /etc/caddy/conf.d/website-origin-staging.XXXXXX)"\npublic_tmp="$(mktemp /etc/caddy/conf.d/website-staging-worker.XXXXXX)"\nhealth_tmp="$(mktemp /tmp/website-staging-health.XXXXXX)"\ntrap 'rm -f "$origin_tmp" "$public_tmp" "$health_tmp"' EXIT\nrollback() {\n  if test "$origin_existed" = 1; then cp -p "$origin_backup" "$origin_config"; else rm -f "$origin_config"; fi\n  if test "$public_existed" = 1; then cp -p "$public_backup" "$public_config"; else rm -f "$public_config"; fi\n  caddy validate --config /etc/caddy/Caddyfile >/dev/null\n  systemctl reload caddy\n}\nprintf '%s' "$origin_b64" | base64 -d > "$origin_tmp"\nprintf '%s' "$public_b64" | base64 -d > "$public_tmp"\ninstall -o root -g root -m 0644 "$origin_tmp" "$origin_config"\ninstall -o root -g root -m 0644 "$public_tmp" "$public_config"\nif ! caddy validate --config /etc/caddy/Caddyfile >/dev/null; then rollback; exit 42; fi\nsystemctl reload caddy\nstatus=000\nfor attempt in 1 2 3 4 5; do\n  status="$(curl -sS --max-time 20 --resolve '${PUBLIC_DOMAIN}:443:127.0.0.1' -o "$health_tmp" -w '%{http_code}' 'https://${PUBLIC_DOMAIN}/api/auth/me' || true)"\n  if test "$status" = 200 && grep -q '"identity":null' "$health_tmp"; then break; fi\n  sleep 2\ndone\nif test "$status" != 200 || ! grep -q '"identity":null' "$health_tmp"; then rollback; echo "WORKER_HEALTH_$status" >&2; exit 43; fi\necho CADDY_RELOADED\n`;
  const result = spawnSync('ssh', [
    '-i', sshKey, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
    '-o', 'StrictHostKeyChecking=accept-new', sshTarget, `bash -s -- ${caddyBase64} ${publicCaddyBase64}`,
  ], { input: remoteScript, encoding: 'utf8', timeout: 60000, windowsHide: true });
  if (result.status !== 0 || !String(result.stdout).includes('CADDY_RELOADED')) {
    throw new Error(`Caddy origin update failed: ${String(`${result.stdout || ''}${result.stderr || ''}${result.error?.message || ''}`).slice(-900)}`);
  }
  console.log(`worker staging topology provisioned · canonical Caddy TLS → Worker → DNS-only origin · anonymous identity contract verified`);
} catch (error) {
  for (const rollback of rollbacks.reverse()) {
    if (rollback.action === 'delete') {
      await cf(`/zones/${zoneId}/dns_records/${rollback.id}`, { method: 'DELETE' }).catch(() => {});
    } else {
      await cf(`/zones/${zoneId}/dns_records/${rollback.id}`, { method: 'PUT', body: JSON.stringify(rollback.previous) }).catch(() => {});
    }
  }
  console.error(redact(String(error?.message || error)));
  process.exit(1);
}
