#!/usr/bin/env node
/** Upload only changed Desk files through the restricted staging SSH key. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { deskContentPartition, selfTestDeskContentPaths } from './lib/desk-content-paths.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const STAGING = 'https://website.staging.vaultsparkstudios.com';
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : ''; };
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const run = (command, args, extra = {}) => spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', timeout: 120_000, ...extra });
const checked = (result, label) => { if (result.status !== 0) throw new Error(`${label} failed: ${(result.stderr || result.stdout || '').slice(0, 350)}`); return result.stdout.trim(); };

function changedPaths(range) {
  return checked(run('git', ['diff', '--name-only', '--diff-filter=ACMRT', range]), 'Desk diff').split(/\r?\n/).filter(Boolean);
}

function chooseDiffBase(receipt, head, productionBaseline, full = false, isAncestor = (from) => run('git', ['merge-base', '--is-ancestor', from, head]).status === 0) {
  const candidates = full ? [receipt.sha, productionBaseline] : [receipt.contentLaneHead, receipt.sha, productionBaseline];
  const from = candidates.find((value) => /^[a-f0-9]{40}$/.test(String(value || '')) && isAncestor(value));
  if (!from) throw new Error('staging head is outside this checkout and no ancestral production baseline was supplied');
  return from;
}

function selfTestDiffBase() {
  const older = 'a'.repeat(40);
  const staged = 'b'.repeat(40);
  const lane = 'c'.repeat(40);
  const receipt = { sha: staged, contentLaneHead: lane };
  const available = (value) => value === lane || value === older;
  if (chooseDiffBase(receipt, 'd'.repeat(40), older, false, available) !== lane) throw new Error('merged staging head was not preferred');
  if (chooseDiffBase(receipt, 'd'.repeat(40), older, false, (value) => value === older) !== older) throw new Error('production fallback did not recover an unmerged staging head');
  if (chooseDiffBase(receipt, 'd'.repeat(40), older, true, available) !== older) throw new Error('full staging pass did not use the ancestral baseline');
  try {
    chooseDiffBase(receipt, 'd'.repeat(40), older, false, () => false);
    throw new Error('unresolvable staging ancestry was accepted');
  } catch (error) {
    if (!error.message.includes('no ancestral production baseline')) throw error;
  }
  return 4;
}

async function stagingReceipt() {
  const response = await fetch(`${STAGING}/api/build-sha.json?desk-plan=${Date.now()}`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`staging receipt HTTP ${response.status}`);
  const receipt = await response.json();
  if (!/^[a-f0-9]{40}$/.test(String(receipt.sha || ''))) throw new Error('staging baseline missing');
  return receipt;
}

async function plan() {
  const receipt = await stagingReceipt();
  const head = checked(run('git', ['rev-parse', 'HEAD']), 'HEAD');
  const from = chooseDiffBase(receipt, head, arg('--production-baseline'), process.argv.includes('--full'));
  const part = deskContentPartition(changedPaths(`${from}..${head}`));
  const paths = part.promotable.filter((value) => fs.existsSync(path.join(ROOT, value)));
  if (paths.length !== part.promotable.length) throw new Error('Desk diff includes a missing candidate file');
  return { baseline: receipt.sha, from, head, paths };
}

function emitGithub(value) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `staging_paths=${value.paths.length}\nstaging_delta=${value.paths.length ? 'yes' : 'no'}\nstaging_head=${value.head}\nstaging_baseline=${value.baseline}\n`);
}

async function deploy(value) {
  const key = process.env.DESK_STAGING_KEY_PATH;
  const target = process.env.DESK_STAGING_TARGET;
  const knownHosts = process.env.DESK_STAGING_KNOWN_HOSTS_PATH;
  if (!key || !target || !knownHosts || !fs.existsSync(key) || !fs.existsSync(knownHosts)) throw new Error('restricted staging SSH inputs missing');
  if (!/^vss-desk-deploy@[A-Za-z0-9.-]+$/.test(target)) throw new Error('staging SSH target is not the restricted account');
  const pathset = sha256(`${value.paths.join('\n')}\n`);
  const files = Object.fromEntries(value.paths.map((name) => [name, sha256(fs.readFileSync(path.join(ROOT, name)))]));
  const cache = path.join(ROOT, '.cache');
  fs.mkdirSync(cache, { recursive: true });
  const manifest = path.join(cache, 'staging-desk-release.json');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-desk-'));
  const list = path.join(temp, 'paths.txt');
  const archive = path.join(temp, 'payload.tgz');
  try {
    fs.writeFileSync(manifest, `${JSON.stringify({ schemaVersion: 1, baselineSha: value.baseline, headSha: value.head, pathSetSha256: pathset, files })}\n`);
    fs.writeFileSync(list, Buffer.from(['.cache/staging-desk-release.json', ...value.paths].join('\0') + '\0'));
    checked(run('tar', ['-czf', archive, '--null', '-T', list], { timeout: 300_000 }), 'Desk archive');
    const payload = fs.readFileSync(archive);
    const result = run('ssh', [
      '-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
      '-o', `UserKnownHostsFile=${knownHosts}`, target, 'deploy-desk-content',
    ], { input: payload, encoding: null, timeout: 300_000, maxBuffer: 1024 * 1024 });
    if (result.status !== 0) throw new Error(`restricted staging deploy failed: ${String(result.stderr || '').slice(0, 350)}`);
    console.log(String(result.stdout || '').trim());
  } finally {
    fs.rmSync(manifest, { force: true });
    const tempRoot = path.resolve(os.tmpdir());
    const resolved = path.resolve(temp);
    if (path.dirname(resolved) !== tempRoot || !path.basename(resolved).startsWith('vss-desk-')) throw new Error('temporary cleanup path refused');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

try {
  if (process.argv.includes('--self-test')) {
    console.log(`deploy-staging-desk-content --self-test: ${selfTestDeskContentPaths()} path cases, ${selfTestDiffBase()} ancestry cases`);
  } else {
    const value = await plan();
    emitGithub(value);
    console.log(`Desk staging plan: ${value.paths.length} path(s) since ${value.from.slice(0, 12)}; HEAD ${value.head.slice(0, 12)}`);
    if (process.argv.includes('--deploy') && value.paths.length) await deploy(value);
  }
} catch (error) {
  console.error(`deploy-staging-desk-content: ${error.message}`);
  process.exit(1);
}
