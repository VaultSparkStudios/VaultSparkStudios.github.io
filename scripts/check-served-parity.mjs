#!/usr/bin/env node
// @verification-scope scheduled-assurance
/**
 * check-served-parity.mjs — compare the bytes an origin SERVES with a commit.
 *
 * WHY (S373). In S372 a session reported "fully deployed" after a Worker deploy and
 * a content-lane run that both ended in success. Production was content-current but
 * not tree-current: six served data files still differed from main, because the
 * content lane withholds them by type. A lane's exit status says the lane ran; it
 * does not say what the origin serves. This measures that directly.
 *
 * It fetches every git-tracked, served, text-type file from the origin, compares it
 * with the committed blob, and groups the differences by the release lane that can
 * carry them (content lane, or full promotion only). Read-only: GET requests, no
 * bodies recorded, nothing written unless --json-out is given.
 *
 * Usage:
 *   node scripts/check-served-parity.mjs                      # vs the sha the origin reports
 *   node scripts/check-served-parity.mjs --against=HEAD       # how far main is ahead
 *   node scripts/check-served-parity.mjs --require=tree-current
 *   node scripts/check-served-parity.mjs --self-test
 */
import { writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from './lib/safe-spawn.mjs';
import { classifyPath, NOT_SERVED } from './check-content-lane-purity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? fallback;

export const TEXT_EXT = Object.freeze(['.html', '.js', '.css', '.json', '.ndjson', '.xml', '.txt', '.svg', '.webmanifest']);
// Tracked but never part of the public build, beyond the content lane's own list.
const EXTRA_NOT_SERVED = Object.freeze(['portfolio/', 'config/', 'cloudflare/', 'supabase/', 'audits/', 'output/', '.ops-cache/', 'ignis-health/']);
// Stamped by the deploy itself with the deployed SHA, so it differs from the commit by design.
export const DEPLOY_STAMPED = Object.freeze(["api/build-sha.json"]);
const ROOT_NOT_SERVED = new Set(['package.json', 'package-lock.json', 'playwright.config.js', '_headers', '_redirects', 'README_DEPLOY.txt', '.mcp.json', '.lighthouserc.json']);

/** Pages serves clean URLs: `x/index.html` answers at `x/` and `foo.html` at `foo`. */
export function routeFor(file) {
  if (file === 'index.html') return '';
  return file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
}

export function isServedCandidate(file) {
  const rel = String(file).replace(/\\/g, '/');
  if (!TEXT_EXT.includes(path.extname(rel).toLowerCase())) return false;
  if ([...NOT_SERVED, ...EXTRA_NOT_SERVED].some((prefix) => rel.startsWith(prefix))) return false;
  return !ROOT_NOT_SERVED.has(rel) && !DEPLOY_STAMPED.includes(rel);
}

/** Which lane can move a differing file to production. */
export function laneFor(file) {
  return classifyPath(file).ok ? 'content-lane' : 'full-promotion-only';
}

export function summarize(results) {
  const by = (state) => results.filter((r) => r.state === state);
  const differ = by('differ');
  const contentLag = differ.filter((r) => r.lane === 'content-lane');
  const fullOnly = differ.filter((r) => r.lane === 'full-promotion-only');
  // An origin that could not be read is not evidence of parity.
  const unread = by('error').length;
  const verdict = unread ? 'unverified' : contentLag.length ? 'content-lag' : fullOnly.length ? 'content-current' : 'tree-current';
  return {
    verdict, checked: results.length, identical: by('identical').length, differ: differ.length,
    contentLag: contentLag.map((r) => r.file).sort(), fullPromotionOnly: fullOnly.map((r) => r.file).sort(),
    redirected: by('redirected').length, notServed: by('not-served').map((r) => r.file).sort(), unread,
  };
}

const ORDER = ['unverified', 'content-lag', 'content-current', 'tree-current'];
export function meets(verdict, required) {
  return ORDER.indexOf(verdict) >= ORDER.indexOf(required) && ORDER.includes(required);
}

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (argv, opts = {}) => execFileSync('git', ['-C', ROOT, ...argv], { maxBuffer: 1 << 28, ...opts });

async function fetchBytes(url, attempts = 2) {
  let last;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'VaultSpark-Served-Parity/1.0' }, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(60_000) });
      if (res.status !== 200) return { status: res.status };
      return { status: 200, bytes: Buffer.from(await res.arrayBuffer()) };
    } catch (error) { last = error; }
  }
  throw last;
}

async function compare(origin, sha, files, width = 10) {
  const results = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(width, files.length) }, async () => {
    while (cursor < files.length) {
      const file = files[cursor++];
      const lane = laneFor(file);
      try {
        const served = await fetchBytes(`${origin}/${routeFor(file).split('/').map(encodeURIComponent).join('/')}`);
        if (served.status === 404) { results.push({ file, lane, state: 'not-served' }); continue; }
        if ([301, 302, 307, 308].includes(served.status)) { results.push({ file, lane, state: 'redirected' }); continue; }
        if (served.status !== 200) { results.push({ file, lane, state: 'error', detail: `HTTP ${served.status}` }); continue; }
        const blob = git(['show', `${sha}:${file}`]);
        results.push({ file, lane, state: sha256(served.bytes) === sha256(blob) ? 'identical' : 'differ' });
      } catch (error) { results.push({ file, lane, state: 'error', detail: error.message }); }
    }
  }));
  return results;
}

function selfTest() {
  const r = (file, state) => ({ file, lane: laneFor(file), state });
  const cases = [
    ['index pages answer at the directory', routeFor('news/index.html') === 'news/' && routeFor('index.html') === ''],
    ['other html answers without its extension', routeFor('auth/callback.html') === 'auth/callback'],
    ['non-html keeps its path', routeFor('api/build-sha.json') === 'api/build-sha.json'],
    ['repo internals are not served candidates', !isServedCandidate('context/TASK_BOARD.md') && !isServedCandidate('scripts/x.mjs') && !isServedCandidate('docs/a.json') && !isServedCandidate('package.json')],
    ['images are outside the text sweep', !isServedCandidate('assets/a.png')],
    ['the deploy-stamped sha file is not compared', !isServedCandidate('api/build-sha.json') && isServedCandidate('api/heartbeat.json')],
    ['served text is a candidate', isServedCandidate('index.html') && isServedCandidate('data/stats-surface.json') && isServedCandidate('sw.js')],
    ['a page moves on the content lane', laneFor('games/index.html') === 'content-lane'],
    ['browser-read data moves only on a full promotion', laneFor('data/ignis-search-index.json') === 'full-promotion-only'],
    ['executable js moves only on a full promotion', laneFor('assets/analytics.js') === 'full-promotion-only'],
    ['no difference is tree-current', summarize([r('index.html', 'identical')]).verdict === 'tree-current'],
    ['only full-promotion files differing is content-current', summarize([r('index.html', 'identical'), r('data/lqip-map.json', 'differ')]).verdict === 'content-current'],
    ['a differing page is content-lag', summarize([r('index.html', 'differ'), r('data/lqip-map.json', 'differ')]).verdict === 'content-lag'],
    ['an unread file is unverified, never current', summarize([r('index.html', 'identical'), r('sw.js', 'error')]).verdict === 'unverified'],
    ['redirects and not-served files do not count as differences', summarize([r('journal/index.html', 'redirected'), r('index.html', 'identical'), r('assets/x.json', 'not-served')]).verdict === 'tree-current'],
    ['content-current does not satisfy tree-current', !meets('content-current', 'tree-current') && meets('tree-current', 'content-current')],
    ['unverified satisfies nothing stronger and an unknown requirement fails', !meets('unverified', 'content-current') && !meets('tree-current', 'bogus')],
  ];
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (cases.some(([, ok]) => !ok)) throw new Error('served-parity self-test failed');
  console.log(`check-served-parity --self-test: ${cases.length}/${cases.length} passed`);
}

async function main() {
  if (args.includes('--self-test')) return selfTest();
  const origin = option('--origin', 'https://vaultsparkstudios-website.pages.dev').replace(/\/$/, '');
  let against = option('--against', '');
  let reported = null;
  if (!against) {
    const res = await fetchBytes(`${origin}/api/build-sha.json`);
    if (res.status !== 200) throw new Error(`origin build-sha.json returned HTTP ${res.status}`);
    reported = JSON.parse(res.bytes.toString('utf8'));
    against = reported.contentLaneHead || reported.sha;
  }
  let sha;
  try { sha = git(['rev-parse', '--verify', `${against}^{commit}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch {
    // A shallow checkout cannot name the deployed commit; say so instead of guessing.
    console.log(`check-served-parity: unverified · commit ${String(against).slice(0, 12)} is not in this checkout (shallow clone?)`);
    if (option('--require', '')) process.exitCode = 1;
    return;
  }
  const files = git(['ls-tree', '-r', '--name-only', sha], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean).filter(isServedCandidate);
  const summary = summarize(await compare(origin, sha, files, Number(option('--concurrency', '10'))));
  const report = { checkedAt: new Date().toISOString(), origin, against: sha, deployedBy: reported?.deployedBy ?? null, ...summary };
  const jsonOut = option('--json-out', '');
  if (jsonOut) await writeFile(path.resolve(jsonOut), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`check-served-parity: ${summary.verdict} · ${origin} vs ${sha.slice(0, 12)} · ${summary.identical}/${summary.checked} identical · ${summary.differ} differ (${summary.contentLag.length} content-lane, ${summary.fullPromotionOnly.length} full-promotion-only) · ${summary.redirected} redirected · ${summary.notServed.length} not served · ${summary.unread} unread`);
  for (const file of summary.contentLag.slice(0, 20)) console.log(`  content-lane lag: ${file}`);
  for (const file of summary.fullPromotionOnly.slice(0, 20)) console.log(`  full-promotion-only lag: ${file}`);
  const required = option('--require', '');
  if (required && !meets(summary.verdict, required)) {
    console.error(`check-served-parity: ${summary.verdict} does not meet --require=${required}`);
    process.exitCode = 1;
  }
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (direct) main().catch((error) => { console.error(`check-served-parity failed: ${error.message}`); process.exitCode = 1; });
