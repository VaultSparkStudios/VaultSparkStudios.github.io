#!/usr/bin/env node
/**
 * Deploy the exact public working tree to the Hetzner staging origin.
 *
 * The file manifest comes from `git ls-files -co --exclude-standard`, so
 * ignored credentials and build caches cannot enter the archive. The remote
 * Caddy root is discovered from the dedicated origin vhost, constrained to a
 * bounded web root, and updated through rsync with replaced/deleted files
 * retained in a timestamped rollback directory.
 *
 * Usage:
 *   node scripts/deploy-staging.mjs --self-test
 *   node scripts/deploy-staging.mjs --probe
 *   node scripts/deploy-staging.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { getSecret, redact } from './lib/secrets.mjs';
import { verificationSurfaceFingerprint } from './lib/build-check-evidence.mjs';
import { writeJsonAtomic, writeTextAtomic } from './lib/evidence-io.mjs';
import { appendStagingDeployHistory, parseStagingDeployHistory, renderStagingDeployHistory } from './lib/staging-deploy-history.mjs';
import { createStagingDeployReceipt, runStagingDeployReceiptSelfTest, validateStagingDeployReceipt } from './lib/staging-deploy-receipt.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = new Set(process.argv.slice(2));
const SELF_TEST = args.has('--self-test');
const PROBE = args.has('--probe');
const ZOMBIE = 'scripts/fetch-studio-feed.mjs';
const RECEIPT_REL = 'api/staging-deploy-receipt.json';
const RECEIPT_OUT = path.join(ROOT, RECEIPT_REL);
const HISTORY_REL = 'data/staging-deploy-history.ndjson';
const HISTORY_OUT = path.join(ROOT, HISTORY_REL);
const STAGING_ORIGIN = 'website-origin.staging.vaultsparkstudios.com';
const SENSITIVE = /(^|\/)(?:\.env(?:\..*)?|secrets?)(?:\/|$)|\.(?:pem|key|p12|pfx)$/i;

export function safeManifest(files) {
  return [...new Set(files.map((file) => file.replaceAll('\\', '/')))]
    .filter((file) => file && !file.includes('\n') && file !== ZOMBIE && file !== RECEIPT_REL)
    .filter((file) => !SENSITIVE.test(file))
    .filter((file) => !/^(?:\.git|\.playwright-cli|node_modules|output|test-results|playwright-report|ignis\/output)(?:\/|$)/.test(file))
    .filter((file) => !/^\.tmp(?:-|\.|$)/.test(file))
    .sort();
}

export function safeRemoteRoot(root) {
  const normalized = String(root || '').trim().replace(/\/+$/, '');
  return /^(?:\/(?:srv|var\/www)\/[A-Za-z0-9._/-]+|\/opt\/studio\/staging\/[A-Za-z0-9._/-]+)$/.test(normalized)
    && !normalized.includes('..')
    && normalized.split('/').filter(Boolean).length >= 3;
}

export function parseDeployAcknowledgement(output) {
  const matches = [...String(output || '').matchAll(/(?:^|\r?\n)STAGING_DEPLOYED\s+(\d{14})\s+(\d+)(?=\r?$|\r?\n)/g)];
  if (matches.length !== 1) throw new Error(`expected one staging acknowledgement, received ${matches.length}`);
  const [, deployId, countText] = matches[0];
  const remoteFileCount = Number(countText);
  if (!Number.isSafeInteger(remoteFileCount) || remoteFileCount <= 0) throw new Error('staging acknowledgement file count is invalid');
  return { deployId, remoteFileCount };
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
    '.playwright-cli/console.log', 'output/lighthouse/report.json', '.tmp-wrangler-gateway.mjs', RECEIPT_REL,
  ]);
  const cases = [
    ['keeps public files', manifest.includes('index.html') && manifest.includes('.well-known/llms.txt')],
    ['rejects secrets, local evidence, temporary helpers, and ignored trees', manifest.length === 3],
    ['rejects zombie helper', !manifest.includes(ZOMBIE)],
    ['accepts bounded web roots', safeRemoteRoot('/var/www/website/staging') && safeRemoteRoot('/srv/www/vaultspark') && safeRemoteRoot('/opt/studio/staging/website')],
    ['rejects dangerous roots', !safeRemoteRoot('/') && !safeRemoteRoot('/var/www') && !safeRemoteRoot('/srv/site/../other')],
    ['ack parser accepts bounded noise and CRLF', (() => { const parsed = parseDeployAcknowledgement('notice\r\nSTAGING_DEPLOYED 20260728000000 42\r\n'); return parsed.deployId === '20260728000000' && parsed.remoteFileCount === 42; })()],
    ['ack parser rejects duplicate acknowledgements', (() => { try { parseDeployAcknowledgement('STAGING_DEPLOYED 20260728000000 42\nSTAGING_DEPLOYED 20260728000001 43\n'); return false; } catch { return true; } })()],
    ['ack parser rejects zero count', (() => { try { parseDeployAcknowledgement('STAGING_DEPLOYED 20260728000000 0\n'); return false; } catch { return true; } })()],
    ...runStagingDeployReceiptSelfTest().map(([name, ok]) => [`receipt contract · ${name}`, ok]),
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
  `TARGET=$(grep -rFl "${STAGING_ORIGIN} {" /etc/caddy/conf.d /etc/caddy/Caddyfile 2>/dev/null | grep -vE '[.]vss-|[.]bak$|[.]tmp$' | head -1)`,
  '[ -n "$TARGET" ] || { echo NO_VHOST; exit 1; }',
  `ROOT=$(awk '/^website-origin[.]staging[.]vaultsparkstudios[.]com[[:space:]]*[{]/ { inside=1; next } inside && $1 == "root" { print $NF; exit } inside && /^}/ { exit }' "$TARGET")`,
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
  const archiveSha256 = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
  checked(run('scp', ['-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', archivePath, `${sshTarget}:${remoteArchive}`], { timeout: 300_000 }), 'staging upload');

  const deploy = [
    'set -eu',
    `ROOT='${remoteRoot}'`,
    `ARCHIVE='${remoteArchive}'`,
    `STAMP='${stamp}'`,
    `EXPECTED_ARCHIVE_SHA='${archiveSha256}'`,
    'case "$ROOT" in /srv/*|/var/www/*|/opt/studio/staging/*) ;; *) echo UNSAFE_ROOT; exit 1;; esac',
    'STAGE=$(mktemp -d /tmp/vaultspark-release.XXXXXX)',
    "trap 'rm -rf \"$STAGE\"; rm -f \"$ARCHIVE\"' EXIT",
    'ACTUAL_ARCHIVE_SHA=$(sha256sum "$ARCHIVE" | awk \'{print $1}\')',
    '[ "$ACTUAL_ARCHIVE_SHA" = "$EXPECTED_ARCHIVE_SHA" ] || { echo ARCHIVE_DIGEST_MISMATCH; exit 1; }',
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
    `REMOTE_FILE_COUNT=$(find "$ROOT" -path "$ROOT/.rollback" -prune -o -path "$ROOT/${RECEIPT_REL}" -prune -o -type f -print | wc -l | tr -d ' ')`,
    'printf "STAGING_DEPLOYED %s %s\\n" "$STAMP" "$REMOTE_FILE_COUNT"',
  ].join('; ');
  const deployed = checked(run('ssh', [...sshBase, deploy], { timeout: 300_000 }), 'atomic staging deploy');
  const acknowledgement = parseDeployAcknowledgement(deployed.stdout);
  if (acknowledgement.deployId !== stamp) throw new Error(`remote acknowledgement deploy id ${acknowledgement.deployId} does not match ${stamp}`);
  const remoteFileCount = acknowledgement.remoteFileCount;
  if (remoteFileCount !== manifest.length) throw new Error(`remote file count ${remoteFileCount} does not match bounded manifest ${manifest.length}`);

  checked(run(process.execPath, [path.join(ROOT, 'scripts', 'check-staging-parity.mjs')], { timeout: 120_000 }), 'post-deploy staging parity');
  const parity = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'staging-health.json'), 'utf8'));
  const build = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'build-sha.json'), 'utf8'));
  const candidate = JSON.parse(fs.readFileSync(path.join(ROOT, 'api', 'candidate-artifact-manifest.json'), 'utf8'));
  const receiptInput = {
    generatedAt: new Date().toISOString(),
    commitSha: build.sha,
    sourceFingerprint: verificationSurfaceFingerprint(ROOT),
    candidateRoot: candidate.root,
    candidateLeafCount: candidate.leafCount,
    archiveSha256,
    archiveBytes,
    deployId: stamp,
    manifestFileCount: manifest.length,
    remoteFileCount,
    remoteRoot,
    parity,
  };

  function installAndReadPublicFile(relative, text, phase) {
    if (!/^(?:api|data)\/[a-z0-9.-]+$/.test(relative)) throw new Error(`unsafe public evidence path: ${relative}`);
    const suffix = relative.endsWith('.json') ? 'json' : 'ndjson';
    const localEvidencePath = path.join(os.tmpdir(), `vaultspark-staging-${stamp}-${phase}.${suffix}`);
    const remoteEvidencePath = `/tmp/vaultspark-staging-${stamp}-${phase}.${suffix}`;
    fs.writeFileSync(localEvidencePath, text, 'utf8');
    try {
      checked(run('scp', ['-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', localEvidencePath, `${sshTarget}:${remoteEvidencePath}`], { timeout: 120_000 }), `${phase} evidence upload`);
      const install = [
        'set -eu',
        `ROOT='${remoteRoot}'`,
        `SOURCE='${remoteEvidencePath}'`,
        `TARGET="$ROOT/${relative}"`,
        `TMP="$TARGET.${stamp}.${phase}.tmp"`,
        'mkdir -p "$(dirname "$TARGET")"',
        'cp "$SOURCE" "$TMP"',
        'chmod 644 "$TMP"',
        'mv -f "$TMP" "$TARGET"',
        'rm -f "$SOURCE"',
        'cat "$TARGET"',
      ].join('; ');
      const installed = checked(run('ssh', [...sshBase, install], { timeout: 120_000 }), `${phase} evidence atomic install`);
      if (String(installed.stdout) !== text) throw new Error(`${phase} evidence remote byte-equality failed`);
    } finally {
      fs.rmSync(localEvidencePath, { force: true });
    }
  }

  function installAndReadReceipt(receipt, phase) {
    validateStagingDeployReceipt(receipt);
    installAndReadPublicFile(RECEIPT_REL, `${JSON.stringify(receipt, null, 2)}\n`, phase);
  }

  const pendingReceipt = createStagingDeployReceipt({ ...receiptInput, remoteVerified: false });
  installAndReadReceipt(pendingReceipt, 'pending');
  const finalReceipt = createStagingDeployReceipt({ ...receiptInput, remoteVerified: true });
  installAndReadReceipt(finalReceipt, 'verified');
  validateStagingDeployReceipt(finalReceipt, { requireVerifiedRemote: true });
  const existingHistory = fs.existsSync(HISTORY_OUT) ? parseStagingDeployHistory(fs.readFileSync(HISTORY_OUT, 'utf8')) : [];
  const nextHistory = appendStagingDeployHistory(existingHistory, finalReceipt);
  const historyText = renderStagingDeployHistory(nextHistory);
  installAndReadPublicFile(HISTORY_REL, historyText, 'history');
  writeTextAtomic(HISTORY_OUT, historyText);
  writeJsonAtomic(RECEIPT_OUT, finalReceipt);
  console.log(`deploy-staging: deployed ${manifest.length} file(s) · ${(archiveBytes / 1_048_576).toFixed(1)} MiB archive · rollback ${remoteRoot}/.rollback/${stamp} · receipt ${finalReceipt.receiptId}`);
  if (finalReceipt.state !== 'verified') throw new Error(`post-deploy parity degraded — ${finalReceipt.parity.findings.join(', ')}`);
  fs.rmSync(listPath, { force: true });
  fs.rmSync(archivePath, { force: true });
} catch (error) {
  console.error(`deploy-staging: ${redact(String(error?.message || error))}`);
  process.exit(1);
}
