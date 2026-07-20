#!/usr/bin/env node
/**
 * check-startup-session-coherence.mjs
 *
 * Verifies docs/STARTUP_BRIEF.md starts the next session after the freshest
 * completed-session evidence in repo-owned context files. This catches the S246
 * regression where a lagging detailed SIL entry moved PROJECT_STATUS backward.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readText(rel) {
  try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return ''; }
}

function readJson(rel) {
  try { return JSON.parse(readText(rel)); } catch { return {}; }
}

function maxSessionInText(text) {
  const nums = [...String(text || '').matchAll(/\bSession\s+(\d+)\b/gi)]
    .map(m => parseInt(m[1], 10))
    .filter(Number.isFinite);
  return nums.length ? Math.max(...nums) : null;
}

const status = readJson('context/PROJECT_STATUS.json');
const handoff = readText('context/LATEST_HANDOFF.md');
const handoffCompleted = parseInt(
  handoff.match(/^# Latest Handoff\s+[—-]\s+Session\s+(\d+)\b/im)?.[1]
    ?? handoff.match(/^## Where We Left Off \(Session\s+(\d+)\)/im)?.[1]
    ?? '',
  10,
);
const sources = {
  status: typeof status.currentSession === 'number' ? status.currentSession : null,
  sil: maxSessionInText(readText('context/SELF_IMPROVEMENT_LOOP.md')),
  handoff: Number.isFinite(handoffCompleted) ? handoffCompleted : null,
  taskBoard: maxSessionInText(readText('context/TASK_BOARD.md')),
  currentState: maxSessionInText(readText('context/CURRENT_STATE.md')),
  workLog: maxSessionInText(readText('logs/WORK_LOG.md')),
};

const completed = Math.max(...Object.values(sources).filter(Number.isFinite));
if (!Number.isFinite(completed)) {
  console.error('check-startup-session-coherence: no completed-session evidence found');
  process.exit(1);
}

const brief = readText('docs/STARTUP_BRIEF.md');
const rendered = parseInt(brief.match(/║\s+Session\s+(\d+)\b/)?.[1] ?? '', 10);
const generatedAt = parseInt(brief.match(/generated-at: .*?\(Session\s+(\d+)\s+closeout\)/)?.[1] ?? '', 10);
const expected = completed + 1;

const failures = [];
if (rendered !== expected) failures.push(`brief header Session ${rendered || '?'} != expected Session ${expected}`);
if (generatedAt !== completed) failures.push(`generated-at closeout Session ${generatedAt || '?'} != completed Session ${completed}`);
if (typeof status.currentSession === 'number' && status.currentSession < completed) {
  failures.push(`PROJECT_STATUS.currentSession ${status.currentSession} is behind completed Session ${completed}`);
}

if (failures.length) {
  console.error('check-startup-session-coherence: FAIL');
  for (const f of failures) console.error(`  - ${f}`);
  console.error(`  sources: ${JSON.stringify(sources)}`);
  process.exit(1);
}

console.log(`check-startup-session-coherence: ok (completed S${completed} -> brief S${rendered})`);
