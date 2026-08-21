#!/usr/bin/env node
// @verification-scope startup — cross-repo lock observation.
/**
 * check-sibling-locks.mjs
 *
 * Scans sibling repos one level above this project for context/.session-lock
 * files and reports any that look stale. This is read-only and safe to run
 * during /start or doctor checks to surface orphaned sessions before they block
 * cross-repo writes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PARENT = path.resolve(ROOT, '..');
const jsonMode = process.argv.includes('--json');
const checkMode = process.argv.includes('--check');
const thresholdIdx = process.argv.indexOf('--threshold-hours');
const thresholdHours = thresholdIdx >= 0
  ? Math.max(1, Number(process.argv[thresholdIdx + 1]) || 12)
  : 12;
const thresholdMs = thresholdHours * 60 * 60 * 1000;

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function parseLock(lockPath) {
  const body = readText(lockPath);
  const stat = fs.statSync(lockPath);
  const sessionStart = body.match(/^session_start:\s*(\S+)/m)?.[1] ?? null;
  const agent = body.match(/^agent:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const model = body.match(/^model:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const project = body.match(/^project:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const note = body.match(/^note:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const startedAtMs = sessionStart ? new Date(sessionStart).getTime() : NaN;
  const referenceMs = Number.isFinite(startedAtMs) ? startedAtMs : stat.mtimeMs;
  const ageMs = Math.max(0, Date.now() - referenceMs);

  return {
    repo: path.basename(path.dirname(path.dirname(lockPath))),
    path: path.relative(ROOT, lockPath).replace(/\\/g, '/'),
    absolutePath: lockPath,
    project,
    agent,
    model,
    note,
    sessionStart,
    lastModified: stat.mtime.toISOString(),
    ageHours: Number((ageMs / 3600000).toFixed(1)),
    stale: ageMs > thresholdMs,
  };
}

function collectLocks() {
  const siblings = [];
  const normalizedRoot = path.resolve(ROOT).toLowerCase();
  for (const entry of fs.readdirSync(PARENT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    const repoRoot = path.join(PARENT, entry.name);
    if (path.resolve(repoRoot).toLowerCase() === normalizedRoot) continue;
    const lockPath = path.join(repoRoot, 'context', '.session-lock');
    if (!fs.existsSync(lockPath)) continue;
    siblings.push(parseLock(lockPath));
  }
  return siblings.sort((a, b) => b.ageHours - a.ageHours);
}

const locks = collectLocks();
const staleLocks = locks.filter((lock) => lock.stale);

if (jsonMode) {
  console.log(JSON.stringify({
    thresholdHours,
    totalLocks: locks.length,
    staleCount: staleLocks.length,
    locks,
  }, null, 2));
  process.exit(checkMode && staleLocks.length ? 1 : 0);
}

console.log(`Sibling session locks · threshold ${thresholdHours}h`);
if (!locks.length) {
  console.log('  ✓ no sibling session locks found');
  process.exit(0);
}

for (const lock of locks) {
  const icon = lock.stale ? '⚠' : '✓';
  const subject = lock.project || lock.repo;
  const agent = lock.agent ? ` · ${lock.agent}` : '';
  const model = lock.model ? ` · ${lock.model}` : '';
  const started = lock.sessionStart ? ` · started ${lock.sessionStart}` : '';
  console.log(`  ${icon} ${subject} · ${lock.ageHours}h old${agent}${model}${started}`);
}

if (staleLocks.length) {
  console.log('');
  console.log(`  ${staleLocks.length} stale lock(s) detected — verify the sessions are closed, then force-clear if orphaned.`);
}

process.exit(checkMode && staleLocks.length ? 1 : 0);
