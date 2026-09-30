#!/usr/bin/env node
/** Exact candidate/staging parity for every file in an automated Desk release. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { deskContentPartition, isDeskContentPath } from './lib/desk-content-paths.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const STAGING = 'https://website.staging.vaultsparkstudios.com';
const PRODUCTION = 'https://vaultsparkstudios-website.pages.dev';
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : ''; };
const digest = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const git = (...args) => { const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' }); if (result.status !== 0) throw new Error(`git ${args[0]} failed`); return result.stdout.trim(); };

function routeFor(file) {
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
  return `/${file}`;
}

function normalise(route, buffer) {
  if (!route.endsWith('/') && !route.endsWith('.html')) return buffer;
  return Buffer.from(buffer.toString('utf8')
    .replace(/\s+nonce="[A-Za-z0-9+/_=-]*"/g, '')
    .replace(/<meta name="csp-nonce" content="[A-Za-z0-9+/_=-]*">/g, ''), 'utf8');
}

async function receipt(url) {
  const response = await fetch(`${url}/api/build-sha.json?desk-parity=${Date.now()}`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${url} build receipt HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const head = git('rev-parse', 'HEAD');
  const expectedHead = arg('--head') || head;
  if (expectedHead !== head) throw new Error('requested head differs from checked-out commit');
  const [stage, prod] = await Promise.all([receipt(STAGING), receipt(PRODUCTION)]);
  if (!/^[a-f0-9]{40}$/.test(String(prod.sha || ''))) throw new Error('production baseline invalid');
  if (!/^[a-f0-9]{40}$/.test(String(stage.contentLaneHead || ''))) throw new Error('staging content head missing');
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', stage.contentLaneHead, head], { cwd: ROOT });
  if (ancestor.status !== 0) throw new Error('staging content head is not an ancestor of candidate');
  const listed = (arg('--paths') || process.env.LANE_PATHS || '').split(/\s+/).filter(Boolean);
  const changed = git('diff', '--name-only', '--diff-filter=ACMRT', `${prod.sha}..${head}`).split(/\r?\n/).filter(Boolean);
  const expected = deskContentPartition(changed).promotable.filter((file) => fs.existsSync(path.join(ROOT, file)));
  if (!expected.length || !expected.includes('news/index.html') || !expected.includes('index.html')) throw new Error('candidate has no homepage/newsroom Desk edition');
  const paths = listed.length ? [...new Set(listed)].sort() : expected;
  if (JSON.stringify(paths) !== JSON.stringify(expected)) throw new Error('release paths differ from the current production-baseline Desk partition');
  if (paths.some((file) => !isDeskContentPath(file))) throw new Error('non-Desk release path refused');
  let next = 0;
  async function worker() {
    while (next < paths.length) {
      const file = paths[next++];
      const route = routeFor(file);
      const response = await fetch(`${STAGING}${route}?desk-parity=${Date.now()}-${next}`, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`${route} staging HTTP ${response.status}`);
      const candidate = normalise(route, fs.readFileSync(path.join(ROOT, file)));
      const served = normalise(route, Buffer.from(await response.arrayBuffer()));
      if (digest(candidate) !== digest(served)) throw new Error(`${route} candidate/staging byte mismatch`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, paths.length) }, () => worker()));
  console.log(`staging Desk parity: ${paths.length} exact route(s), head ${head.slice(0, 12)}, staging ${stage.contentLaneHead.slice(0, 12)}`);
}

main().catch((error) => { console.error(`staging Desk parity: ${error.message}`); process.exit(1); });
