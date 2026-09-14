#!/usr/bin/env node
/**
 * check-publisher-resync.mjs  (S355)
 *
 * A `[skip ci]` publisher whose `git add` stages a source of any evidence-graph
 * node must push through `publish-push.sh --resync`.
 *
 * WHY THIS EXISTS. publish-push.sh rebases onto whatever a concurrent publisher
 * landed. Without --resync, derived artifacts built from a source the rebase just
 * changed are pushed stale, and nothing re-derives them until a human session
 * does. S354 measured three publishers staging graph sources without it:
 * refresh-live-data (84 sources feeding 57 nodes), leaderboard-api (1 → 1) and
 * weekly-maintenance (2 → 2). The cascade gate does not see this: it checks that
 * a workflow rebuilds and stages derived artifacts, not that it re-derives them
 * after the push-time rebase.
 *
 * A publisher that stages no graph source is exempt by construction: a rebase
 * cannot strand what the graph does not derive from it.
 *
 * Token semantics mirror check-publish-cascade-coverage.mjs (directory adds,
 * single-segment globs, bare directory names). This file uses no escaped regex
 * so it survives the shells that collapse backslashes.
 *
 * Modes: (default) enforce · --list (every publisher's verdict) · --self-test
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function segmentMatches(pattern, segment) {
  const parts = pattern.split('*');
  if (parts.length === 1) return pattern === segment;
  if (!segment.startsWith(parts[0])) return false;
  let pos = parts[0].length;
  for (let i = 1; i < parts.length - 1; i++) {
    const at = segment.indexOf(parts[i], pos);
    if (at < 0) return false;
    pos = at + parts[i].length;
  }
  const last = parts[parts.length - 1];
  return segment.length - last.length >= pos && segment.endsWith(last);
}

function globCovers(glob, target) {
  const g = glob.split('/');
  const t = target.split('/');
  if (g.length !== t.length) return false;
  return g.every((part, i) => segmentMatches(part, t[i]));
}

export function tokenCovers(token, target) {
  let t = token.trim();
  while (t.startsWith("'") || t.startsWith('"')) t = t.slice(1);
  while (t.endsWith("'") || t.endsWith('"')) t = t.slice(0, -1);
  if (!t || t.startsWith('-')) return false;
  if (t === target) return true;
  if (t.endsWith('/')) return target.startsWith(t);
  if (t.includes('*')) return globCovers(t, target);
  if (!t.includes('.') && !t.includes('/')) return target.startsWith(t + '/');
  return false;
}

const STOP = ['2>', '1>', '>', '<', '||', '&&', '#', ';'];

export function stagedTokens(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    if (line.trim().startsWith('#')) continue;
    const at = line.indexOf('git add ');
    if (at < 0) continue;
    for (const part of line.slice(at + 'git add '.length).split(' ').filter(Boolean)) {
      if (STOP.some((s) => part.startsWith(s))) break;
      out.push(part);
    }
  }
  return out;
}

export function usesResync(text) {
  return String(text).split('\n').some((line) => {
    const code = line.split(' #')[0];
    return !code.trim().startsWith('#') && code.includes('publish-push.sh') && code.includes('--resync');
  });
}

export function graphSources(graph) {
  return [...new Set(graph.nodes.flatMap((n) => n.sources))].filter((s) => !s.startsWith('external:'));
}

export function stagedGraphSources(text, sources) {
  const tokens = stagedTokens(text);
  return sources.filter((source) => {
    const target = source.includes('*') ? source.split('*').join('probe') : source;
    return tokens.some((token) => tokenCovers(token, target));
  });
}

export function checkWorkflow(name, text, graph) {
  if (!String(text).includes('skip ci')) return { name, publisher: false, staged: [], resync: false, ok: true };
  const staged = stagedGraphSources(text, graphSources(graph));
  const resync = usesResync(text);
  return { name, publisher: true, staged, resync, ok: staged.length === 0 || resync };
}

function loadGraph(root = ROOT) {
  return JSON.parse(readFileSync(join(root, 'config', 'evidence-graph.json'), 'utf8'));
}

function selfTest() {
  const graph = { nodes: [
    { id: 'proof', sources: ['api/release-dependencies.json', 'data/days/*.json', 'external:probe'] },
    { id: 'clusters', sources: ['api/leaderboard/v1/all.json'] },
  ] };
  const cases = [];
  const publisher = (add, push) => `run: |\n  git add ${add}\n  git commit -m "chore: x [skip ci]"\n  ${push}`;
  cases.push(['stages a graph source without --resync → fails',
    !checkWorkflow('a.yml', publisher('api/release-dependencies.json', 'bash scripts/ci/publish-push.sh "x"'), graph).ok]);
  cases.push(['the same publisher with --resync → passes',
    checkWorkflow('a.yml', publisher('api/release-dependencies.json', 'bash scripts/ci/publish-push.sh "x" --resync'), graph).ok]);
  cases.push(['a glob add covering a graph source counts (leaderboard-api shape)',
    !checkWorkflow('b.yml', publisher('api/leaderboard/v1/*.json', 'bash scripts/ci/publish-push.sh "leaderboard API"'), graph).ok]);
  cases.push(['a directory add covering a glob source counts',
    !checkWorkflow('c.yml', publisher('data/', 'bash scripts/ci/publish-push.sh "x"'), graph).ok]);
  cases.push(['a publisher staging no graph source is exempt (lighthouse shape)',
    checkWorkflow('d.yml', publisher('.cache/lighthouse-trend.json', 'bash scripts/ci/publish-push.sh "x" --attempts 2'), graph).ok]);
  cases.push(['external: sources never make a publisher need --resync',
    checkWorkflow('e.yml', publisher('external:probe', 'bash scripts/ci/publish-push.sh "x"'), graph).ok]);
  cases.push(['--resync mentioned only in a comment does not count',
    !checkWorkflow('f.yml', publisher('api/release-dependencies.json', 'bash scripts/ci/publish-push.sh "x" # add --resync later'), graph).ok]);
  cases.push(['a workflow with no [skip ci] commit is not a publisher',
    checkWorkflow('g.yml', 'run: |\n  git add api/release-dependencies.json\n  git commit -m "real"', graph).publisher === false]);

  // Negative control against the real pre-fix workflows: S354 measured these three
  // staging graph sources without --resync. Stripping the flag must fail each by name.
  const live = loadGraph();
  for (const wf of ['leaderboard-api.yml', 'refresh-live-data.yml', 'weekly-maintenance.yml']) {
    const path = join(ROOT, '.github', 'workflows', wf);
    if (!existsSync(path)) { cases.push([`${wf} exists for the negative control`, false]); continue; }
    const current = readFileSync(path, 'utf8');
    const stripped = current.split(' --resync').join('');
    cases.push([`${wf} without --resync fails, with it passes`,
      !checkWorkflow(wf, stripped, live).ok && checkWorkflow(wf, current, live).ok]);
  }

  const failed = cases.filter(([, ok]) => !ok);
  for (const [label, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${label}`);
  console.log(`check-publisher-resync --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

function run() {
  const graph = loadGraph();
  const dir = join(ROOT, '.github', 'workflows');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort() : [];
  const results = files.map((f) => checkWorkflow(f, readFileSync(join(dir, f), 'utf8'), graph)).filter((r) => r.publisher);
  if (process.argv.includes('--list')) {
    for (const r of results) {
      const verdict = r.staged.length === 0 ? 'no graph source staged' : r.resync ? 'graph sources + --resync' : 'GRAPH SOURCES WITHOUT --resync';
      console.log(`${r.name.padEnd(32)} ${verdict}${r.staged.length ? ` (${r.staged.length} source(s))` : ''}`);
    }
  }
  const bad = results.filter((r) => !r.ok);
  if (bad.length) {
    console.error('check-publisher-resync: [skip ci] publisher(s) stage evidence-graph sources without --resync:');
    for (const r of bad) console.error(`  ✗ ${r.name}: stages ${r.staged.length} graph source(s), e.g. ${r.staged.slice(0, 3).join(', ')}`);
    console.error('  fix: append --resync to its `bash scripts/ci/publish-push.sh "<label>"` call.');
    process.exit(1);
  }
  const needing = results.filter((r) => r.staged.length).length;
  console.log(`check-publisher-resync: ${results.length} [skip ci] publisher(s) · ${needing} stage graph sources · all push with --resync`);
  process.exit(0);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  if (process.argv.includes('--self-test')) selfTest();
  else run();
}
