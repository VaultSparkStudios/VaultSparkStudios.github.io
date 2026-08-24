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
import { isDiscoveryPath } from './lib/discovery-content.mjs';
import { deriveNewsReleaseContract, runNewsReleaseContractSelfTest } from './lib/news-release-contract.mjs';

/**
 * S328 — remove ONLY the edge-injected CSP nonce from an HTML body before hashing.
 *
 * The staging edge mints a per-response nonce and stamps it onto every script tag
 * plus a `<meta name="csp-nonce">`. Those bytes exist only in the response and are
 * absent from the committed artifact, so a raw byte comparison of any HTML route
 * could never pass — the gate was failing on transport, not on content.
 *
 * This narrows what is compared; it does not weaken it. Only the nonce ATTRIBUTE
 * and the nonce META element are dropped. Script bodies, `src`, `defer`, tag
 * order, and every other byte remain part of the hash, so a real content change
 * still fails — asserted in both directions in selfTest().
 *
 * Non-HTML routes are returned untouched: the edge does not inject nonces into
 * JSON/NDJSON, so those stay strictly byte-exact.
 */
export function normaliseEdgeNonces(route, buffer) {
  const isHtml = route.endsWith('/') || route.endsWith('.html');
  if (!isHtml) return buffer;
  const normalised = buffer.toString('utf8')
    .replace(/\s+nonce="[A-Za-z0-9+/_=-]*"/g, '')
    .replace(/<meta name="csp-nonce" content="[A-Za-z0-9+/_=-]*">/g, '');
  return Buffer.from(normalised, 'utf8');
}

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
  const candidateFeed = fs.readFileSync(path.join(ROOT, 'api', 'news-desk-feed.json'));
  const candidateClaims = fs.readFileSync(path.join(ROOT, 'api', 'news-desk-claims.ndjson'));
  const candidateEvidence = deriveNewsReleaseContract(JSON.parse(candidateFeed.toString('utf8')), candidateClaims.toString('utf8'));
  const probes = [
    ['/news/', 'class="desk-display"'],
    ['/assets/news-desk.css', '.desk-display'],
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

  const exact = [
    [candidateEvidence.route, fs.readFileSync(path.join(ROOT, candidateEvidence.route.replace(/^\//, ''), 'index.html'))],
    ['/api/news-desk-feed.json', candidateFeed],
    ['/api/news-desk-claims.ndjson', candidateClaims],
  ];
  const live = new Map();
  for (const [route, candidate] of exact) {
    const response = await fetch(`${STAGING_URL}${route}?content-lane-verify=${Date.now()}`, { signal: AbortSignal.timeout(20_000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    // HTML is compared through the edge, which mints a per-response CSP nonce and
    // stamps it onto every script tag plus a <meta name="csp-nonce">. Those bytes
    // are edge-injected transport, not content, so hashing them raw made this gate
    // structurally unpassable for any HTML route (S328). JSON/NDJSON are untouched
    // by that injection and stay byte-exact with no normalisation at all.
    const candidateHash = crypto.createHash('sha256').update(normaliseEdgeNonces(route, candidate)).digest('hex');
    const liveHash = crypto.createHash('sha256').update(normaliseEdgeNonces(route, bytes)).digest('hex');
    if (!response.ok || candidateHash !== liveHash) throw new Error(`staging exact-byte verification failed for ${route} (HTTP ${response.status})`);
    live.set(route, bytes);
    console.log(`  ok ${route} � exact ${liveHash.slice(0, 12)}`);
  }
  const liveEvidence = deriveNewsReleaseContract(
    JSON.parse(live.get('/api/news-desk-feed.json').toString('utf8')),
    live.get('/api/news-desk-claims.ndjson').toString('utf8'),
  );
  if (JSON.stringify(liveEvidence) !== JSON.stringify(candidateEvidence)) throw new Error('staging newest-edition claim contract differs from candidate');
  console.log(`  ok newest ${candidateEvidence.date} � ${candidateEvidence.factCount} fact / ${candidateEvidence.stanceCount} stance rows`);
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
    ['exact discovery roots are content', classifyPath('sitemap.xml').ok && classifyPath('.well-known/llms.txt').ok],
    ['auth markup is withheld', !classifyPath('auth/callback.html').ok],
    // S328 — edge-injected CSP nonces are transport, not content. These assert in
    // BOTH directions, so the normalisation can neither rot inert nor quietly
    // swallow a real content difference.
    ...(() => {
      const local = Buffer.from('<html><script>a()</script><script src="/x.js" defer></script></html>');
      const served = Buffer.from('<html><script nonce="dnNfNTk1ODQ1OV9ub25jZQ__">a()</script><script src="/x.js" defer nonce="dnNfNTk1ODQ1OV9ub25jZQ__"></script><meta name="csp-nonce" content="dnNfNTk1ODQ1OV9ub25jZQ__"></html>');
      const changed = Buffer.from('<html><script nonce="dnNfNTk1ODQ1OV9ub25jZQ__">b()</script><script src="/x.js" defer nonce="dnNfNTk1ODQ1OV9ub25jZQ__"></script><meta name="csp-nonce" content="dnNfNTk1ODQ1OV9ub25jZQ__"></html>');
      const eq = (a, b) => normaliseEdgeNonces('/news/', a).equals(normaliseEdgeNonces('/news/', b));
      return [
        ['nonce-injected HTML matches its committed source', eq(local, served)],
        ['a real HTML content change still fails', !eq(local, changed)],
        ['two different nonces normalise to the same bytes',
          eq(served, Buffer.from(served.toString('utf8').replaceAll('dnNfNTk1ODQ1OV9ub25jZQ__', 'AAAAdifferentNONCE99')))],
        ['a JSON route is never normalised',
          normaliseEdgeNonces('/api/news-desk-feed.json', served).equals(served)],
        ['src and defer survive normalisation',
          normaliseEdgeNonces('/news/', served).toString('utf8').includes('<script src="/x.js" defer>')],
        ['no nonce attribute survives',
          !/nonce=/.test(normaliseEdgeNonces('/news/', served).toString('utf8'))],
      ];
    })(),
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
  try {
    const contractCases = runNewsReleaseContractSelfTest((line) => console.log(line.replace(/^  /, '  ')));
    console.log(`deploy-staging-content --self-test: ${cases.length - failed.length + contractCases}/${cases.length + contractCases}`);
  } catch (error) {
    console.error(error.message);
    failed.push(['News release contract', false]);
  }
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
  if (promotable.some(isDiscoveryPath)) {
    checked(run(process.execPath, [path.join(ROOT, 'scripts', 'check-discovery-content-lane.mjs'), '--paths', promotable.join(' '), '--origin', STAGING_URL], { timeout: 120_000 }), 'served staging discovery verification');
  }
  fs.rmSync(path.join(ROOT, listRel), { force: true });
  fs.rmSync(archivePath, { force: true });
  console.log(`deploy-staging-content: verified ${promotable.length} overlay(s), ${removals.length} safe removal(s), identity untouched`);
} catch (error) {
  console.error(`deploy-staging-content: ${redact(String(error?.message || error))}`);
  process.exit(1);
}
