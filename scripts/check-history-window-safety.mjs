#!/usr/bin/env node
/**
 * Prevent automation churn from burying meaningful history behind a raw-count
 * window. A history reader may use:
 *   - an unbounded/anchor/time-bounded query;
 *   - a semantic quota after filtering; or
 *   - a count ceiling with one-record sentinel and an explicit truncated state.
 *
 * What it may not do is fetch "last N", discard bot/noise rows, and silently
 * treat an empty remainder as complete history.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = path.basename(fileURLToPath(import.meta.url));

export function fixedGitWindows(source) {
  const text = String(source || '');
  return [
    ...text.matchAll(/git\s+log[^\n'\";]*(?:-n\s*\d+|--max-count(?:=|\s+)\d+)/gi),
    ...text.matchAll(/['\"]--max-count=\d+['\"]/g),
  ].map((match) => match[0]);
}

export function hasSentinelContract(source) {
  const text = String(source || '');
  return /max\s*\+\s*1/.test(text)
    && /moreHistoryBeyondWindow/.test(text)
    && /scan-ceiling-reached/.test(text);
}

export function inspect(name, source) {
  const windows = fixedGitWindows(source);
  if (!windows.length || hasSentinelContract(source)) return [];
  return windows.map((window) => `${name}: raw-count Git history window \`${window}\` has no +1 sentinel and explicit truncated verdict`);
}

function selfTest() {
  const cases = [
    ['unsafe last-N query is rejected', inspect('unsafe.mjs', `const x = sh('git log -n 30 --pretty=%s').out.split('\\n').filter(noise);`).length === 1],
    ['numeric max-count is rejected', inspect('unsafe.mjs', `exec('git log --max-count=120');`).length === 1],
    ['sentinel-aware ceiling is accepted', inspect('safe.mjs', `args=['--max-count=' + (max + 1)]; return { moreHistoryBeyondWindow, state: 'scan-ceiling-reached' };`).length === 0],
    ['time-bounded history is semantic, not raw-count bounded', inspect('safe.mjs', `spawn('git', ['log', '--since=200 days ago']);`).length === 0],
    ['unbounded history with post-filter quota is accepted', inspect('safe.mjs', `sh('git log --pretty=%s').out.split('\\n').filter(noise).slice(0, 5);`).length === 0],
  ];
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  const failed = cases.filter(([, ok]) => !ok);
  console.log(`check-history-window-safety --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.mjs') && entry.name !== SELF) out.push(full);
  }
  return out;
}

export function auditHistoryWindows(root = ROOT) {
  return walk(path.join(root, 'scripts')).flatMap((file) =>
    inspect(path.relative(ROOT, file).replaceAll('\\', '/'), fs.readFileSync(file, 'utf8')));
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const findings = auditHistoryWindows();
  if (findings.length) {
    console.error('check-history-window-safety: unsafe fixed history window(s):');
    for (const finding of findings) console.error(`  ✗ ${finding}`);
    process.exit(1);
  }
  console.log('check-history-window-safety: all Git-history readers are anchor/time/unbounded or sentinel-aware');
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
