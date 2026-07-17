#!/usr/bin/env node
/**
 * Deploy the exact public working tree to the Hetzner staging origin.
 *
 * The file manifest comes from `git ls-files -co --exclude-standard`, so
 * ignored credentials and build caches cannot enter the archive. The remote
 * Caddy root is discovered from the live vhost, constrained to /srv or
 * /var/www, and updated through rsync with replaced/deleted files retained in
 * a timestamped rollback directory.
 *
 * Usage:
 *   node scripts/deploy-staging.mjs --self-test
 *   node scripts/deploy-staging.mjs --probe
 *   node scripts/deploy-staging.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { getSecret, redact } from './lib/secrets.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = new Set(process.argv.slice(2));
const SELF_TEST = args.has('--self-test');
const PROBE = args.has('--probe');
const ZOMBIE = 'scripts/fetch-studio-feed.mjs';
const SENSITIVE = /(^|\/)(?:\.env(?:\..*)?|secrets?)(?:\/|$)|\.(?:pem|key|p12|pfx)$/i;

export function safeManifest(files) {
  return [...new Set(files.map((file) => file.replaceAll('\\', '/')))]
    .filter((file) => file && !file.includes('\n') && file !== ZOMBIE)
    .filter((file) => !SENSITIVE.test(file))
    .filter((file) => !/^(?:\.git|node_modules|test-results|playwright-report|ignis\/output)(?:\/|$)/.test(file))
    .sort();
}

export function safeRemoteRoot(root) {
  const normalized = String(root || '').trim().replace(/\/+$/, '');
  return /^(?:\/(?:srv|var\/www)\/[A-Za-z0-9._/-]+|\/opt\/studio\/staging\/[A-Za-z0-9._/-]+)$/.test(normalized)
    && !normalized.includes('..')
    && normalized.split('/').filter(Boolean).length >= 3;
}

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: options.timeout || 120_000,
    ...options,
  });
}

function checked(result, label) {
  if (result.status === 0) return result;
  const output = redact(`${result.stdout || ''}${result.stderr || ''}`.trim());
  throw new Error(`${label} failed${output ? ` — ${output.slice(0, 800)}` : ''}`);
}

if (SELF_TEST) {
  const manifest = safeManifest([
    'index.html', '.well-known/llms.txt', 'assets/icon.png', '.env',
    'secrets/token.txt', 'keys/deploy.pem', ZOMBIE, 'node_modules/x.js',
  ]);
  const cases = [
    ['keeps public files', manifest.includes('index.html') && manifest.includes('.well-known/llms.txt')],
    ['rejects secrets and ignored trees', manifest.length === 3],
    ['rejects zombie helper', !manifest.includes(ZOMBIE)],
    ['accepts bounded web roots', safeRemoteRoot('/var/www/website/staging') && safeRemoteRoot('/srv/www/vaultspark') && safeRemoteRoot('/opt/studio/staging/website')],
    ['rejects dangerous roots', !safeRemoteRoot('/') && !safeRemoteRoot('/var/www') && !safeRemoteRoot('/srv/site/../other')],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`deploy-staging --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

let key;
let host;
try {
  key = getSecret('HETZNER_SSH_KEY_PATH', 'hetzner.ssh');
  host = getSecret('HETZNER_HOST', 'hetzner.ssh');
} catch (error) {
  console.error(`deploy-staging: credential resolution failed — ${redact(String(error?.message || error))}`);
  process.exit(1);
}

const sshTarget = String(host).includes('@') ? String(host) : `root@${host}`;
const sshBase = ['-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', sshTarget];
const discover = [
  'set -eu',
  'TARGET=$(grep -rFl "website.staging.vaultsparkstudios.com {" /etc/caddy/conf.d /etc/caddy/Caddyfile 2>/dev/null | head -1)',
  '[ -n "$TARGET" ] || { echo NO_VHOST; exit 1; }',
  "ROOT=$(awk '/^website[.]staging[.]vaultsparkstudios[.]com[[:space:]]*[{]/ { inside=1; next } inside && $1 == \"root\" { print $NF; exit } inside && /^}/ { exit }' \"$TARGET\")",
  '[ -n "$ROOT" ] || { echo NO_ROOT; exit 1; }',
  'printf "%s\\n%s\\n" "$TARGET" "$ROOT"',
].join('; ');

try {
  const probe = checked(run('ssh', [...sshBase, discover], { timeout: 60_000 }), 'staging layout probe');
  const [vhost, remoteRoot] = String(probe.stdout || '').trim().split(/\r?\n/);
  if (!safeRemoteRoot(remoteRoot)) throw new Error(`unsafe remote root refused: ${redact(remoteRoot || '(empty)')}`);
  console.log(`deploy-staging: vhost ${vhost} · root ${remoteRoot}`);
  if (PROBE) process.exit(0);

  const listed = checked(run('git', ['ls-files', '-co', '--exclude-standard', '-z']), 'git manifest').stdout;
  const manifest = safeManifest(String(listed).split('\0'))
    // `git ls-files` retains tracked paths deleted in the working tree. Their
    // absence is release state, not an archive error; remote rsync --delete
    // applies it while retaining the old files in the rollback directory.
    .filter((file) => fs.existsSync(path.join(ROOT, file)));
  for (const required of ['index.html', 'oracle/index.html', 'api/ecosystem-state.json', 'favicon.ico']) {
    if (!manifest.includes(required)) throw new Error(`release manifest missing ${required}`);
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const listPath = path.join(os.tmpdir(), `vaultspark-staging-${stamp}.files`);
  const archivePath = path.join(os.tmpdir(), `vaultspark-staging-${stamp}.tgz`);
  const remoteArchive = `/tmp/vaultspark-staging-${stamp}.tgz`;
  // NUL framing is required on Windows: BSD tar can otherwise interpret CRLF
  // and edge-case path bytes as empty entries.
  fs.writeFileSync(listPath, Buffer.from(manifest.join('\0'), 'utf8'));
  checked(run('tar', ['-czf', archivePath, '--null', '-T', listPath], { timeout: 300_000 }), 'release archive');
  const archiveBytes = fs.statSync(archivePath).size;
  checked(run('scp', ['-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', archivePath, `${sshTarget}:${remoteArchive}`], { timeout: 300_000 }), 'staging upload');

  const deploy = [
    'set -eu',
    `ROOT='${remoteRoot}'`,
    `ARCHIVE='${remoteArchive}'`,
    `STAMP='${stamp}'`,
    'case "$ROOT" in /srv/*|/var/www/*|/opt/studio/staging/*) ;; *) echo UNSAFE_ROOT; exit 1;; esac',
    'STAGE=$(mktemp -d /tmp/vaultspark-release.XXXXXX)',
    "trap 'rm -rf \"$STAGE\"; rm -f \"$ARCHIVE\"' EXIT",
    'tar -xzf "$ARCHIVE" -C "$STAGE"',
    'test -f "$STAGE/index.html"',
    'test -f "$STAGE/oracle/index.html"',
    'test -f "$STAGE/api/ecosystem-state.json"',
    'test -f "$STAGE/favicon.ico"',
    'mkdir -p "$ROOT" "$ROOT/.rollback/$STAMP"',
    'rsync -a --delete --exclude=.rollback/ --backup --backup-dir="$ROOT/.rollback/$STAMP" "$STAGE/" "$ROOT/"',
    // Windows-created archives do not carry a traversable mode for the release
    // root. Normalize only the public tree; keep rollback snapshots private.
    'chmod 755 "$ROOT"',
    'find "$ROOT" -path "$ROOT/.rollback" -prune -o -type d -exec chmod 755 {} +',
    'find "$ROOT" -path "$ROOT/.rollback" -prune -o -type f -exec chmod 644 {} +',
    'printf "STAGING_DEPLOYED %s\\n" "$STAMP"',
  ].join('; ');
  const deployed = checked(run('ssh', [...sshBase, deploy], { timeout: 300_000 }), 'atomic staging deploy');
  if (!String(deployed.stdout).includes('STAGING_DEPLOYED')) throw new Error('remote deploy returned no completion receipt');
  console.log(`deploy-staging: deployed ${manifest.length} file(s) · ${(archiveBytes / 1_048_576).toFixed(1)} MiB archive · rollback ${remoteRoot}/.rollback/${stamp}`);
  fs.rmSync(listPath, { force: true });
  fs.rmSync(archivePath, { force: true });
} catch (error) {
  console.error(`deploy-staging: ${redact(String(error?.message || error))}`);
  process.exit(1);
}
