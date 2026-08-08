#!/usr/bin/env node
/**
 * Overlay the content-pure candidate partition onto canonical Hetzner staging.
 *
 * This is the staging-first counterpart to pages-deploy.yml's production
 * content lane. It deliberately leaves auth, Worker code, headers, service
 * workers, member surfaces, and every unrecognised path at the served baseline.
 *
 * Usage:
 *   node scripts/deploy-staging-content.mjs --self-test
 *   node scripts/deploy-staging-content.mjs --repair-permissions
 *   node scripts/deploy-staging-content.mjs --baseline <served-build-sha>
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { getSecret, redact } from './lib/secrets.mjs';
import { classifyPath, partition } from './check-content-lane-purity.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const STAGING_URL = 'https://website.staging.vaultsparkstudios.com';
const STAGING_ORIGIN = 'website-origin.staging.vaultsparkstudios.com';

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: options.timeout || 120_000,
    ...options,
  });
}

function checked(result, label) {
  if (result.status === 0) return result;
  const output = redact(`${result.stdout || ''}${result.stderr || ''}`.trim());
  throw new Error(`${label} failed${output ? `  ${output.slice(0, 800)}` : ''}`);
}

export function safeRemoteRoot(value) {
  const root = String(value || '').trim().replace(/\/+$/, '');
  return /^(?:\/(?:srv|var\/www)\/[A-Za-z0-9._/-]+|\/opt\/studio\/staging\/[A-Za-z0-9._/-]+)$/.test(root)
    && !root.includes('..')
    && root.split('/').filter(Boolean).length >= 3;
}

export function validBaseline(value) {
  return /^[a-f0-9]{40}$/.test(String(value || ''));
}

function baselineArg() {
  const inline = process.argv.find((arg) => arg.startsWith('--baseline='));
  if (inline) return inline.slice('--baseline='.length);
  const index = process.argv.indexOf('--baseline');
  return index >= 0 ? process.argv[index + 1] : '';
}

function changedPaths(range) {
  const output = checked(
    run('git', ['diff', '--name-only', '--diff-filter=ACMRT', range]),
    'candidate path discovery',
  ).stdout;
  return output.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
}

function deletedContentPaths(range) {
  const output = checked(
    run('git', ['diff', '--name-status', '--find-renames=50%', range]),
    'candidate deletion discovery',
  ).stdout;
  const removed = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields = line.split('\t');
    const status = fields[0];
    const oldPath = status === 'D' ? fields[1] : status.startsWith('R') ? fields[1] : '';
    if (!oldPath || fs.existsSync(path.join(ROOT, oldPath))) continue;
    if (classifyPath(oldPath).ok && /^[A-Za-z0-9._/-]+$/.test(oldPath)) removed.push(oldPath);
  }
  return [...new Set(removed)].sort();
}

async function readServedBaseline() {
  const response = await fetch(`${STAGING_URL}/api/build-sha.json?content-lane-preflight=${Date.now()}`, {
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`served staging build receipt returned HTTP ${response.status}`);
  return response.json();
}

async function verifyRoutes() {
  const probes = [
    ['/news/', 'class="desk-display"'],
    ['/news/2026-08-07/frontier-access-becomes-research-infrastructure/', 'Frontier-model access'],
    ['/news/2026-08-07/agent-control-becomes-operations-discipline/', 'Agent control'],
    ['/assets/news-desk.css', '.desk-display'],
    ['/api/news-desk-feed.json', '"version": "https://jsonfeed.org/version/1.1"'],
  ];
  for (const [route, marker] of probes) {
    const response = await fetch(`${STAGING_URL}${route}?content-lane-verify=${Date.now()}`, {
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.text();
    if (!response.ok || !body.includes(marker)) {
      throw new Error(`staging verification failed for ${route} (HTTP ${response.status}, marker=${body.includes(marker)})`);
    }
    console.log(`  ok ${route} � HTTP ${response.status}`);
  }
}

async function repairPermissions() {
  const key = getSecret('HETZNER_SSH_KEY_PATH', 'hetzner.ssh');
  const host = getSecret('HETZNER_HOST', 'hetzner.ssh');
  const sshTarget = String(host).includes('@') ? String(host) : `root@${host}`;
  const sshBase = ['-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', sshTarget];
  const repair = [
    'set -eu',
    `TARGET=$(grep -rFl "${STAGING_ORIGIN} {" /etc/caddy/conf.d /etc/caddy/Caddyfile 2>/dev/null | grep -vE '[.]vss-|[.]bak$|[.]tmp$' | head -1)`,
    '[ -n "$TARGET" ] || { echo NO_VHOST; exit 1; }',
    `ROOT=$(awk '/^website-origin[.]staging[.]vaultsparkstudios[.]com[[:space:]]*[{]/ { inside=1; next } inside && $1 == "root" { print $NF; exit } inside && /^}/ { exit }' "$TARGET")`,
    '[ -n "$ROOT" ] || { echo NO_ROOT; exit 1; }',
    'case "$ROOT" in /srv/*|/var/www/*|/opt/studio/staging/*) ;; *) echo UNSAFE_ROOT; exit 1;; esac',
    'chmod 755 "$ROOT"',
    'find "$ROOT" -path "$ROOT/.rollback" -prune -o -type d -exec chmod 755 {} +',
    'find "$ROOT" -path "$ROOT/.rollback" -prune -o -type f -exec chmod 644 {} +',
    'printf "STAGING_CONTENT_PERMISSIONS_REPAIRED\\n"',
  ].join('; ');
  const result = checked(run('ssh', [...sshBase, repair], { timeout: 120_000 }), 'bounded staging permission repair');
  console.log(redact(result.stdout.trim()));
}

function selfTest() {
  const cases = [
    ['accepts a full Git SHA', validBaseline('a'.repeat(40))],
    ['rejects a short Git SHA', !validBaseline('abc123')],
    ['accepts a bounded staging root', safeRemoteRoot('/var/www/website/staging')],
    ['rejects a broad web root', !safeRemoteRoot('/var/www')],
    ['rejects traversal', !safeRemoteRoot('/var/www/site/../other')],
    ['News markup is content', classifyPath('news/index.html').ok],
    ['auth markup is withheld', !classifyPath('auth/callback.html').ok],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  console.log(`deploy-staging-content --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
if (process.argv.includes('--repair-permissions')) {
  try {
    await repairPermissions();
    await verifyRoutes();
    console.log('deploy-staging-content: permission repair verified; content is reachable');
    process.exit(0);
  } catch (error) {
    console.error(`deploy-staging-content: ${redact(String(error?.message || error))}`);
    process.exit(1);
  }
}

const baseline = baselineArg();
if (!validBaseline(baseline)) {
  console.error('deploy-staging-content: --baseline requires the exact 40-character SHA served by staging');
  process.exit(2);
}

try {
  checked(run('git', ['cat-file', '-e', `${baseline}^{commit}`]), 'baseline resolution');
  const served = await readServedBaseline();
  if (served.sha !== baseline) {
    throw new Error(`served staging baseline is ${String(served.sha || '(missing)').slice(0, 12)}, not requested ${baseline.slice(0, 12)}`);
  }

  const range = `${baseline}..HEAD`;
  const part = partition(changedPaths(range));
  if (!part.deployable) throw new Error(part.detail);
  const promotable = part.promotable
    .filter((entry) => entry !== 'api/build-sha.json')
    .filter((entry) => fs.existsSync(path.join(ROOT, entry)));
  const removals = deletedContentPaths(range);
  if (!promotable.length) throw new Error('no existing promotable files remain after build-receipt exclusion');

  checked(
    run(process.execPath, [
      path.join(ROOT, 'scripts', 'check-content-hotfix-gate.mjs'),
      '--paths', promotable.join(' '),
      `--baseline=${baseline}`,
    ], { timeout: 120_000 }),
    'content reference gate',
  );

  let key;
  let host;
  key = getSecret('HETZNER_SSH_KEY_PATH', 'hetzner.ssh');
  host = getSecret('HETZNER_HOST', 'hetzner.ssh');
  const sshTarget = String(host).includes('@') ? String(host) : `root@${host}`;
  const sshBase = ['-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', sshTarget];
  const discover = [
    'set -eu',
    `TARGET=$(grep -rFl "${STAGING_ORIGIN} {" /etc/caddy/conf.d /etc/caddy/Caddyfile 2>/dev/null | grep -vE '[.]vss-|[.]bak$|[.]tmp$' | head -1)`,
    '[ -n "$TARGET" ] || { echo NO_VHOST; exit 1; }',
    `ROOT=$(awk '/^website-origin[.]staging[.]vaultsparkstudios[.]com[[:space:]]*[{]/ { inside=1; next } inside && $1 == "root" { print $NF; exit } inside && /^}/ { exit }' "$TARGET")`,
    '[ -n "$ROOT" ] || { echo NO_ROOT; exit 1; }',
    'printf "%s\\n" "$ROOT"',
  ].join('; ');
  const remoteRoot = checked(run('ssh', [...sshBase, discover], { timeout: 60_000 }), 'staging layout probe').stdout.trim();
  if (!safeRemoteRoot(remoteRoot)) throw new Error(`unsafe remote root refused: ${redact(remoteRoot || '(empty)')}`);

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const tempDir = path.join(ROOT, '.cache', 'staging-content-tmp');
  fs.mkdirSync(tempDir, { recursive: true });
  const listRel = path.posix.join('.cache', 'staging-content-tmp', `content-${stamp}.files`);
  const archiveRel = path.posix.join('.cache', 'staging-content-tmp', `content-${stamp}.tgz`);
  fs.writeFileSync(path.join(ROOT, listRel), Buffer.from(promotable.join('\0'), 'utf8'));
  checked(run('tar', ['-czf', archiveRel, '--null', '-T', listRel], { timeout: 300_000 }), 'content archive');
  const archivePath = path.join(ROOT, archiveRel);
  const archiveSha = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
  const remoteArchive = `/tmp/vaultspark-content-${stamp}.tgz`;
  checked(run('scp', ['-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', archiveRel, `${sshTarget}:${remoteArchive}`], { timeout: 300_000 }), 'content upload');

  const head = checked(run('git', ['rev-parse', 'HEAD']), 'HEAD resolution').stdout.trim();
  const remoteDeploy = [
    'set -eu',
    `ROOT='${remoteRoot}'`,
    `ARCHIVE='${remoteArchive}'`,
    `STAMP='${stamp}'`,
    `EXPECTED_SHA='${archiveSha}'`,
    `BASELINE='${baseline}'`,
    `CONTENT_HEAD='${head}'`,
    `CONTENT_COUNT='${promotable.length}'`,
    `DELETE_PATHS='${removals.join(' ')}'`,
    'case "$ROOT" in /srv/*|/var/www/*|/opt/studio/staging/*) ;; *) echo UNSAFE_ROOT; exit 1;; esac',
    'ACTUAL_SHA=$(sha256sum "$ARCHIVE" | awk \'{print $1}\')',
    '[ "$ACTUAL_SHA" = "$EXPECTED_SHA" ] || { echo ARCHIVE_DIGEST_MISMATCH; exit 1; }',
    'STAGE=$(mktemp -d /tmp/vaultspark-content.XXXXXX)',
    'trap \'rm -rf "$STAGE"; rm -f "$ARCHIVE"\' EXIT',
    'tar -xzf "$ARCHIVE" -C "$STAGE"',
    'mkdir -p "$ROOT/.rollback/$STAMP"',
    'rsync -a --backup --backup-dir="$ROOT/.rollback/$STAMP" "$STAGE/" "$ROOT/"',
    'for p in $DELETE_PATHS; do if [ -f "$ROOT/$p" ]; then mkdir -p "$ROOT/.rollback/$STAMP/$(dirname "$p")"; cp -p "$ROOT/$p" "$ROOT/.rollback/$STAMP/$p"; rm -f "$ROOT/$p"; fi; done',
    // Windows-created archives do not carry web-server-safe traversal modes.
    // Normalize only the validated public tree; rollback snapshots stay private.
    'chmod 755 "$ROOT"',
    'find "$ROOT" -path "$ROOT/.rollback" -prune -o -type d -exec chmod 755 {} +',
    'find "$ROOT" -path "$ROOT/.rollback" -prune -o -type f -exec chmod 644 {} +',
    'NOW=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)',
    'DAY=$(date -u +%Y-%m-%d)',
    'mkdir -p "$ROOT/api"',
    'printf \'{\\n  "schemaVersion": "1.0",\\n  "generatedAt": "%s",\\n  "sha": "%s",\\n  "builtAt": "%s",\\n  "deployedBy": "staging-content-lane",\\n  "contentLaneHead": "%s",\\n  "contentLanePaths": "%s"\\n}\\n\' "$DAY" "$BASELINE" "$NOW" "$CONTENT_HEAD" "$CONTENT_COUNT paths" > "$ROOT/api/build-sha.json"',
    'printf "STAGING_CONTENT_DEPLOYED %s %s %s\\n" "$STAMP" "$CONTENT_COUNT" `echo "$DELETE_PATHS" | wc -w | tr -d " "`',
  ].join('; ');
  const deployed = checked(run('ssh', [...sshBase, remoteDeploy], { timeout: 300_000 }), 'atomic staging content deploy');
  console.log(redact(deployed.stdout.trim()));
  await verifyRoutes();
  fs.rmSync(path.join(ROOT, listRel), { force: true });
  fs.rmSync(archivePath, { force: true });
  console.log(`deploy-staging-content: verified ${promotable.length} overlay(s), ${removals.length} safe removal(s), identity untouched`);
} catch (error) {
  console.error(`deploy-staging-content: ${redact(String(error?.message || error))}`);
  process.exit(1);
}
