#!/usr/bin/env node
/**
 * check-public-rest-contract.mjs (S390 audit #2 · public-rest-contract-gate)
 *
 * Browser code reads Supabase through PostgREST with the publishable key. The
 * Playwright specs mock those endpoints and fulfil any `select`, so a query
 * naming a column or table that production does not have shipped unseen: S390
 * found ten such queries returning 400/404 to real visitors.
 *
 * This gate extracts every client query (table + select list) and requires it
 * to appear in scripts/public-rest-contract.json with a live verdict:
 *   ok            production accepted it (anon, limit=0)
 *   auth-only     production refused anon by permission (42501) — intended
 *   known-failing production rejects it; allowed only with a `note` naming
 *                 the deferral, so the debt stays visible
 *
 * Offline (build:check) never touches the network. A new or changed query is
 * unverified until someone runs --live --write, which probes production with
 * read-only `limit=0` GETs and records the verdicts.
 *
 * Usage:
 *   node scripts/check-public-rest-contract.mjs              # offline gate
 *   node scripts/check-public-rest-contract.mjs --live       # probe, report
 *   node scripts/check-public-rest-contract.mjs --live --write
 *   node scripts/check-public-rest-contract.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { admitDeployment } from './lib/deploy-argv.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(__dirname, 'public-rest-contract.json');
const args = process.argv.slice(2);
const LIVE = args.includes('--live');
const WRITE = args.includes('--write');
const SELF_TEST = args.includes('--self-test');

const SB_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
const SB_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';

// Client code lives in pages and assets; tooling, tests and private caches do not ship.
// Dot-directories (.git, .cache, .claude worktrees, .wrangler bundles) hold local state, not the site.
const SKIP_DIRS = new Set(['node_modules', 'test-results', 'playwright-report', 'output', 'tests', 'scripts', 'supabase',
  'docs', 'audits', 'context', 'logs', 'handoffs', 'lighthouse-results', 'cloudflare', 'portfolio', 'ignis']);
const COLS = '[A-Za-z0-9_,()*:!.]+';
// `?` followed directly by a closing quote and `+` is a helper's dynamic query (RE_DYNAMIC).
const RE_REST = new RegExp(`rest/v1/([a-z_]+)\\?(?!['"\`]\\s*\\+)[^\\n]{0,200}?select=(${COLS})`, 'g');
const RE_FROM = /from\(\s*['"]([a-z_]+)['"]\s*\)\s*\.select\(\s*['"]([^'"]*)['"]/g;
// A helper that appends a caller-supplied query string: `rest/v1/<table>?' + query`.
const RE_DYNAMIC = /rest\/v1\/([a-z_]+)\?['"`]\s*\+/g;
const RE_BARE = new RegExp(`['"\`]select=(${COLS})`, 'g');

// Filter and order columns fail exactly like selected ones (S390: challenges.is_active).
const RE_URL_FILTER = /[?&]([a-z_]+)=(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd|not)\./g;
const RE_URL_ORDER = /[?&]order=([a-z_]+)/g;
const RE_CHAIN_FILTER = /\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order)\(\s*['"]([a-z_]+)['"]/g;

function key(table, select, filters) {
  const where = [...new Set(filters)].sort();
  return `${table}|${select}${where.length ? `|where:${where.join(',')}` : ''}`;
}

function urlArgument(text, start) {
  const rest = text.slice(start, start + 400);
  const end = rest.search(/['"`]\s*[,)]|\{\s*headers/);
  return end === -1 ? rest : rest.slice(0, end);
}

function chain(text, start) {
  const rest = text.slice(start + 5, start + 600);
  const end = rest.search(/\bfrom\(|;/);
  return end === -1 ? rest : rest.slice(0, end);
}

export function extractQueries(text) {
  const found = new Set();
  for (const m of text.matchAll(RE_REST)) {
    const arg = urlArgument(text, m.index);
    const filters = [...arg.matchAll(RE_URL_FILTER), ...arg.matchAll(RE_URL_ORDER)].map(f => f[1]).filter(c => c !== 'select');
    found.add(key(m[1], m[2], filters));
  }
  for (const m of text.matchAll(RE_FROM)) {
    const filters = [...chain(text, m.index).matchAll(RE_CHAIN_FILTER)].map(f => f[1]);
    found.add(key(m[1], m[2].replace(/\s+/g, ''), filters));
  }
  const dynamic = new Set([...text.matchAll(RE_DYNAMIC)].map(m => m[1]));
  if (dynamic.size === 1) {
    const [table] = dynamic;
    for (const m of text.matchAll(RE_BARE)) {
      const arg = urlArgument(text, m.index + 1);
      found.add(key(table, m[1], [...arg.matchAll(RE_URL_FILTER), ...arg.matchAll(RE_URL_ORDER)].map(f => f[1])));
    }
  }
  return found;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) walk(path.join(dir, entry.name), out);
    } else if (/\.(html|js)$/.test(entry.name)) out.push(path.join(dir, entry.name));
  }
  return out;
}

function collect() {
  const queries = new Map();
  for (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    for (const key of extractQueries(fs.readFileSync(file, 'utf8'))) {
      if (!queries.has(key)) queries.set(key, new Set());
      queries.get(key).add(rel);
    }
  }
  return queries;
}

export function evaluate(queries, manifest) {
  const entries = manifest.queries || {};
  const failures = [];
  const deferred = [];
  for (const key of [...queries.keys()].sort()) {
    const entry = entries[key];
    if (!entry) failures.push(`${key} — not live-verified (run --live --write)`);
    else if (entry.verdict === 'known-failing') {
      if (!entry.note) failures.push(`${key} — known-failing without a deferral note`);
      else deferred.push(`${key} — ${entry.note}`);
    } else if (entry.verdict !== 'ok' && entry.verdict !== 'auth-only') failures.push(`${key} — production rejects it (${entry.status} ${entry.detail || ''})`.trim());
  }
  const stale = Object.keys(entries).filter(key => !queries.has(key)).sort();
  for (const key of stale) failures.push(`${key} — recorded but no longer in client code (run --live --write)`);
  return { failures, deferred };
}

export async function probe(key, fetchFn = fetch) {
  try {
  const [table, select, where = ''] = key.split('|');
  // `not.is.null` is valid for every column type, so it tests only that the column exists.
  const filters = where.replace(/^where:/, '').split(',').filter(Boolean).map(c => `&${c}=not.is.null`).join('');
  const res = await fetchFn(`${SB_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filters}&limit=0`, { headers: { apikey: SB_KEY }, signal: AbortSignal.timeout(10000) });
  if (res.ok) return { verdict: 'ok', status: res.status };
  let body = {};
  try { body = await res.json(); } catch {}
  if (body.code === '42501') return { verdict: 'auth-only', status: res.status };
  return { verdict: 'failing', status: res.status, detail: `${body.code || ''} ${body.message || ''}`.trim().slice(0, 160) };
  } catch {
    return { verdict: 'failing', status: null, detail: 'transport failure (timeout or network)' };
  }
}

export function reconcileProbe(result, prior) {
  // Permission loss is a regression unless the query was already auth-only.
  if (result.verdict === 'auth-only' && prior?.verdict !== 'auth-only') {
    return { ...result, verdict: 'failing', detail: 'unexpected anonymous permission denial' };
  }
  // Never hide transport failure or a different server rejection under old debt.
  if (result.verdict === 'failing' && result.status !== null && prior?.verdict === 'known-failing'
      && prior.note && prior.status === result.status && prior.detail === result.detail) {
    return { ...result, verdict: 'known-failing', note: prior.note };
  }
  return result;
}

// Three bounded read-only requests at once: 125 worst-case timeouts fit the
// ten-minute hosted job budget without creating an unbounded request burst.
export async function probeAll(keys, prior, probeFn = probe) {
  const results = new Map();
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(3, keys.length) }, async () => {
    while (index < keys.length) {
      const key = keys[index++];
      results.set(key, reconcileProbe(await probeFn(key), prior[key]));
    }
  }));
  return Object.fromEntries(keys.map(key => [key, results.get(key)]));
}

function readManifest() {
  try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return { queries: {} }; }
}

async function main() {
  const queries = collect();
  let manifest = readManifest();
  if (LIVE) {
    const next = await probeAll([...queries.keys()].sort(), manifest.queries || {});
    for (const [key, result] of Object.entries(next)) {
      if (result.verdict === 'failing') console.log(`  ✗ ${key} → ${result.status} ${result.detail}`);
    }
    manifest = { schema: 'public-rest-contract/v1', verifiedAt: new Date().toISOString(), queries: next };
    if (WRITE) fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  }
  const { failures, deferred } = evaluate(queries, manifest);
  for (const line of deferred) console.log(`  ⚠ deferred: ${line}`);
  if (failures.length) {
    console.error(`✗ public REST contract: ${failures.length} problem(s)`);
    for (const line of failures) console.error(`  · ${line}`);
    process.exit(1);
  }
  console.log(`✓ public REST contract: ${queries.size} client queries live-verified (${deferred.length} deferred)`);
}

function selfTest() {
  const checks = [];
  const t = (name, ok) => checks.push([name, ok]);
  const page = `fetch(SB+'/rest/v1/event_rsvps?event_slug=eq.'+ev+'&select=event_slug',{})`;
  t('concatenated filter before select', extractQueries(page).has('event_rsvps|event_slug|where:event_slug'));
  t('supabase-js select', extractQueries(`sb.from('vault_members').select('plan_key, is_sparked')`).has('vault_members|plan_key,is_sparked'));
  t('chained filter and order columns', extractQueries(`sb.from('challenges').select('id').eq('is_active', true).order('created_at', false); x.eq('other', 1)`).has('challenges|id|where:created_at,is_active'));
  const helper = `fetch(SB + '/rest/v1/public_leaderboard?' + query); fetchMembers('select=username,points&order=points.desc');`;
  t('helper query attributed to its one table', extractQueries(helper).has('public_leaderboard|username,points|where:points'));
  t('ambiguous helper not guessed', extractQueries(helper + ` fetch(SB + '/rest/v1/teams?' + q)`).size === 0);
  const queries = new Map([['a|x', new Set()], ['b|y', new Set()]]);
  t('unverified query fails', evaluate(queries, { queries: { 'a|x': { verdict: 'ok' } } }).failures.length === 1);
  t('failing verdict fails', evaluate(queries, { queries: { 'a|x': { verdict: 'ok' }, 'b|y': { verdict: 'failing', status: 400 } } }).failures.length === 1);
  t('deferral needs a note', evaluate(queries, { queries: { 'a|x': { verdict: 'ok' }, 'b|y': { verdict: 'known-failing' } } }).failures.length === 1);
  const noted = evaluate(queries, { queries: { 'a|x': { verdict: 'auth-only' }, 'b|y': { verdict: 'known-failing', note: 'later' } } });
  t('noted deferral and auth-only pass', noted.failures.length === 0 && noted.deferred.length === 1);
  t('stale entry fails', evaluate(new Map([['a|x', new Set()]]), { queries: { 'a|x': { verdict: 'ok' }, 'c|z': { verdict: 'ok' } } }).failures.length === 1);
  const failed = checks.filter(([, ok]) => !ok);
  for (const [name, ok] of checks) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) process.exit(1);
  console.log(`✓ check-public-rest-contract self-test: ${checks.length}/${checks.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url)) {
  if (WRITE && !LIVE) {
    console.error('--write requires --live');
    process.exit(2);
  }
  const admitted = admitDeployment({
    name: 'check-public-rest-contract',
    usage: 'node scripts/check-public-rest-contract.mjs [--live [--write] | --self-test]',
    boolFlags: ['--live', '--write', '--self-test'],
    exclusive: [['--self-test', '--live'], ['--self-test', '--write']],
  });
  if (SELF_TEST) selfTest();
  else await main();
}
