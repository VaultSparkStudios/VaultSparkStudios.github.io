#!/usr/bin/env node
/**
 * sync-staging-headers.mjs (S174 audit #7 · staging-header-parity-fix)
 *
 * Staging must exercise the same security-header classes as production
 * without copying production's per-request nonce contract into a static host.
 * The static hash policy is transferred as a file so Windows shells never
 * embed a large CSP in an SSH command.
 *
 * Usage:
 *   node scripts/sync-staging-headers.mjs
 *   node scripts/sync-staging-headers.mjs --dry-run
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { PAGE_CSP } from '../config/csp-policy.mjs';
import { renderCaddyRoutePolicies, staticCspForHtml } from './lib/static-csp.mjs';

const DRY = process.argv.includes('--dry-run');
const PROD = 'https://vaultsparkstudios.com/';
const SNIPPET_PATH = '/etc/caddy/vaultspark-staging-headers.caddy';
const CADDYFILE = '/etc/caddy/Caddyfile';
const ROOT = resolve(import.meta.dirname, '..');
const SKIP_HTML_DIRS = new Set(['.git', '.cache', '.ops-cache', 'context', 'docs', 'lighthouse-results', 'node_modules', 'output', 'playwright-report', 'scripts', 'test-results', 'tests']);

function collectPublicHtml(dir = ROOT, pages = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_HTML_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectPublicHtml(full, pages);
    else if (entry.isFile() && entry.name.endsWith('.html')) {
      pages.push({
        relativePath: relative(ROOT, full).replaceAll('\\', '/'),
        html: readFileSync(full, 'utf8'),
      });
    }
  }
  return pages;
}
const res = await fetch(PROD, {
  headers: { 'user-agent': 'Mozilla/5.0 VaultSpark staging-header-sync' },
  signal: AbortSignal.timeout(15000),
});
if (!res.ok) {
  console.error(`sync-staging-headers: prod fetch failed HTTP ${res.status}`);
  process.exit(1);
}

const pages = collectPublicHtml();
const csp = staticCspForHtml(PAGE_CSP, '');
const routePolicies = renderCaddyRoutePolicies(pages, PAGE_CSP);
const hsts = res.headers.get('strict-transport-security') || 'max-age=31536000; includeSubDomains; preload';
const xcto = res.headers.get('x-content-type-options') || 'nosniff';
const referrer = res.headers.get('referrer-policy') || 'strict-origin-when-cross-origin';

if (!csp) {
  console.error('sync-staging-headers: canonical static CSP is empty — refusing to sync');
  process.exit(1);
}

const snippet = `# generated-by: scripts/sync-staging-headers.mjs (website repo)
# Canonical route-scoped static hash policies — deliberately no nonce/strict-dynamic.
# Regenerate: node scripts/sync-staging-headers.mjs
header {
  Strict-Transport-Security "${hsts}"
  X-Content-Type-Options "${xcto}"
  Referrer-Policy "${referrer}"
}
${routePolicies}
`;

if (DRY) {
  console.log(snippet);
}

if (!DRY) {
const { spawnSync } = await import('./lib/safe-spawn.mjs');
const { getSecret, redact } = await import('./lib/secrets.mjs');

let key;
let host;
try {
  key = getSecret('HETZNER_SSH_KEY_PATH', 'hetzner.ssh');
  host = getSecret('HETZNER_HOST', 'hetzner.ssh');
} catch (err) {
  console.error(`sync-staging-headers: credential resolution failed — ${redact(String(err?.message || err))}`);
  process.exit(1);
}

const sshTarget = String(host).includes('@') ? String(host) : `root@${host}`;
const localDir = mkdtempSync(join(tmpdir(), 'vaultspark-staging-headers-'));
const localSnippet = join(localDir, 'vaultspark-staging-headers.caddy');
const remoteTemp = `/tmp/vaultspark-staging-headers.${process.pid}.caddy`;

try {
  writeFileSync(localSnippet, snippet, { encoding: 'utf8', mode: 0o600 });
  const copy = spawnSync('scp', [
    '-i', key,
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=15',
    '-o', 'StrictHostKeyChecking=accept-new',
    localSnippet,
    `${sshTarget}:${remoteTemp}`,
  ], { encoding: 'utf8', timeout: 45000 });
  if (copy.status !== 0) {
    const output = `${copy.stdout || ''}${copy.stderr || ''}`;
    throw new Error(`secure copy failed — ${output.slice(0, 500)}`);
  }

  const remote = [
    `install -o root -g root -m 0644 ${remoteTemp} ${SNIPPET_PATH}`,
    `rm -f ${remoteTemp}`,
    `TARGET=$(grep -rln "^website.staging.vaultsparkstudios.com {" /etc/caddy/conf.d/ ${CADDYFILE} 2>/dev/null | head -1)`,
    `[ -n "$TARGET" ] || { echo NO_VHOST_FILE; exit 1; }`,
    `grep -q "import ${SNIPPET_PATH}" "$TARGET" || sed -i '/^website.staging.vaultsparkstudios.com {/a\`timport ${SNIPPET_PATH}' "$TARGET"`,
    `caddy validate --config ${CADDYFILE}`,
    'systemctl reload caddy',
    'echo CADDY_RELOADED',
  ].join('\n');
  const update = spawnSync('ssh', [
    '-i', key,
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=15',
    '-o', 'StrictHostKeyChecking=accept-new',
    sshTarget,
    remote,
  ], { encoding: 'utf8', timeout: 60000 });
  const output = `${update.stdout || ''}${update.stderr || ''}`;
  if (update.status !== 0 || !output.includes('CADDY_RELOADED')) {
    throw new Error(`remote update failed — ${output.slice(0, 600)}`);
  }
} catch (err) {
  console.error(`sync-staging-headers: ${redact(String(err?.message || err))}`);
  process.exitCode = 1;
} finally {
  rmSync(localDir, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`sync-staging-headers: ${pages.length} route-scoped CSP policies + transport headers · Caddy reloaded`);
}