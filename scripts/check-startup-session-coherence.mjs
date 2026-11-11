#!/usr/bin/env node
// @verification-scope closeout — validates the generated next-session brief against write-back.
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
import { closedSessionFromSil, committedSessionFromGit } from './lib/session-identity.mjs';
import { resolveStartupSessions, resolveStartupBriefIdentity } from './lib/startup-session-identity.mjs';

import { spawnSync } from './lib/safe-spawn.mjs';

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
  sil: closedSessionFromSil(readText('context/SELF_IMPROVEMENT_LOOP.md')),
  handoff: Number.isFinite(handoffCompleted) ? handoffCompleted : null,
  taskBoard: maxSessionInText(readText('context/TASK_BOARD.md')),
  currentState: maxSessionInText(readText('context/CURRENT_STATE.md')),
  workLog: maxSessionInText(readText('logs/WORK_LOG.md')),
};

// Arbitrary context mentions include interrupted and future sessions. The SIL
// ledger owns completion; an active lock owns the current arc separately.
const completed = sources.sil;
if (!Number.isFinite(completed)) {
  console.error('check-startup-session-coherence: no completed-session evidence found');
  process.exit(1);
}

const brief = readText('docs/STARTUP_BRIEF.md');
const rendered = parseInt(brief.match(/║\s+Session\s+(\d+)\b/)?.[1] ?? '', 10);
const generatedAt = parseInt(brief.match(/generated-at: .*?\(last closed Session\s+(\d+)\b/)?.[1]
  ?? brief.match(/generated-at: .*?\(Session\s+(\d+)\s+closeout\)/)?.[1] ?? '', 10);
const lockText=readText('context/.session-lock');
let committedSession=null,committedBriefText=null;
// No live owner is inferred. Git proves ONLY the rendered committed snapshot.
if(!fs.existsSync(path.join(root,'context/.session-lock'))&&!lockText.trim()&&Number.isFinite(rendered)&&rendered>completed+1){
  const git=args=>spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:1048576});
  const log=git(['log','-200','--format=%s']);
  const published=git(['show','HEAD:docs/STARTUP_BRIEF.md']);
  if(!log.error&&log.status===0&&!published.error&&published.status===0){
    committedSession=committedSessionFromGit(root,{floor:completed,text:log.stdout});
    committedBriefText=published.stdout;
  }
}
const identity=resolveStartupBriefIdentity({silSession:completed,statusSession:status.currentSession,lockText,briefText:brief,committedSession,committedBriefText});
const expected=identity.expectedSession;

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

console.log(`check-startup-session-coherence: ok (completed S${completed} -> brief S${rendered}; source ${identity.source}; live ${identity.liveSession===null?'unknown':'S'+identity.liveSession})`);
