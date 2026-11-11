import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { closedSessionFromSil } from './session-identity.mjs';
import { resolveStartupSessions } from './startup-session-identity.mjs';

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}
function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function buildBriefSemanticFingerprint(root = process.cwd()) {
  const status = readJson(path.join(root, 'context', 'PROJECT_STATUS.json'));
  if (!status) return null;
  const handoff = readText(path.join(root, 'context', 'LATEST_HANDOFF.md'));
  const testCache = readJson(path.join(root, '.cache', 'test-count.json'));
  const sessions = resolveStartupSessions({
    silSession: closedSessionFromSil(readText(path.join(root, 'context', 'SELF_IMPROVEMENT_LOOP.md'))),
    statusSession: numberOrNull(status.currentSession),
    lockText: readText(path.join(root, 'context', '.session-lock')),
  });
  const handoffSession = numberOrNull(handoff.match(/(?:Impact Summary|Where We Left Off) \(Session (\d+)\)/i)?.[1]);
  const source = {
    nextSession: sessions.currentSession,
    lastClosedSession: sessions.lastClosedSession,
    silSession: numberOrNull(status.silLastSession),
    silScore: numberOrNull(status.silScore),
    handoffSession,
    testGeneratedAt: testCache?.generatedAt || null,
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex').slice(0, 16);
  return { ...source, hash };
}

export function formatBriefSemanticFingerprint(fingerprint) {
  if (!fingerprint) return null;
  const value = (v) => v == null ? '-' : String(v);
  return `<!-- semantic-freshness: hash=${fingerprint.hash} next=${value(fingerprint.nextSession)} silSession=${value(fingerprint.silSession)} silScore=${value(fingerprint.silScore)} handoff=${value(fingerprint.handoffSession)} tests=${value(fingerprint.testGeneratedAt)} -->`;
}

export function parseBriefSemanticFingerprint(text) {
  const match = String(text).match(/<!-- semantic-freshness:\s*hash=([a-f0-9]{16})\b[^>]*-->/i);
  return match ? { hash: match[1].toLowerCase() } : null;
}
