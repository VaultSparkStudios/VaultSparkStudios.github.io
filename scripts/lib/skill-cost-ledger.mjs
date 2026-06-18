/**
 * skill-cost-ledger.mjs
 *
 * Append-only telemetry of per-skill token cost (R-H15 / S118 G4). Each skill
 * render (e.g. /start) records the approximate token footprint it produced so
 * the studio can track which skills are expensive over time. Advisory only —
 * never throws (callers wrap in try/catch and treat failure as a no-op).
 *
 * Contract (relied on by render-startup-brief.mjs:1274):
 *   recordSkillCost(root, { skill, sessionId, actualTokens, status }) -> void
 */

import fs from 'fs';
import path from 'path';

const LEDGER_REL = path.join('docs', 'skill-cost-ledger.ndjson');

/**
 * Append one skill-cost record as an NDJSON line.
 * @param {string} root - repo root
 * @param {object} rec
 * @param {string} rec.skill
 * @param {string} [rec.sessionId]
 * @param {number} [rec.actualTokens]
 * @param {string} [rec.status]
 */
export function recordSkillCost(root, rec = {}) {
  try {
    const target = process.env.SKILL_COST_LEDGER || path.join(root || '.', LEDGER_REL);
    const entry = {
      ts: new Date().toISOString(),
      skill: rec.skill || 'unknown',
      sessionId: rec.sessionId || null,
      actualTokens: Number.isFinite(rec.actualTokens) ? rec.actualTokens : null,
      status: rec.status || 'completed',
    };
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, JSON.stringify(entry) + '\n');
  } catch {
    /* telemetry must never break the caller */
  }
}

/**
 * Read recent ledger entries (best-effort).
 * @param {string} root
 * @param {number} [limit=50]
 * @returns {Array}
 */
export function readSkillCosts(root, limit = 50) {
  try {
    const target = process.env.SKILL_COST_LEDGER || path.join(root || '.', LEDGER_REL);
    const lines = fs.readFileSync(target, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
}

export default { recordSkillCost, readSkillCosts };
