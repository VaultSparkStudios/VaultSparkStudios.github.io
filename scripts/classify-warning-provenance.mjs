/**
 * classify-warning-provenance.mjs
 *
 * Classifies each doctor check by OWNERSHIP so the startup brief can show a
 * "9 warn: 1 self · 7 sib · 1 chronic" split instead of a bare count that
 * reads as "9 problems studio-ops owns". Most drift on a project repo is
 * portfolio-rollout that a sibling (studio-ops) owns and propagates.
 *
 * Source of truth: the `driftClass` already attached to each check in
 * context/PROJECT_STATUS.json → doctorScore.checks (no recompute).
 *
 *   driftClass               -> owner
 *   ───────────────────────     ─────
 *   local-*                  -> self      (this repo owns the fix)
 *   portfolio-* / sibling-*  -> sibling   (rolled in from studio-ops)
 *   chronic-* / *-chronic    -> chronic   (long-standing, accepted)
 *   (anything else / absent) -> self      (conservative default)
 *
 * Contract (relied on by render-startup-brief.mjs:672):
 *   loadProvenanceMap() -> { [checkId]: { owner: 'self'|'sibling'|'chronic', driftClass: string } }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATUS_PATH = path.resolve(__dirname, '..', 'context', 'PROJECT_STATUS.json');

/** Map a driftClass string to an owner bucket. */
export function ownerForDriftClass(driftClass) {
  const d = String(driftClass || '').toLowerCase();
  if (!d) return 'self';
  if (d.includes('chronic')) return 'chronic';
  if (d.startsWith('portfolio') || d.startsWith('sibling') || d.includes('rollout') || d.includes('outdated')) {
    return 'sibling';
  }
  if (d.startsWith('local')) return 'self';
  return 'self';
}

/**
 * Build the provenance map from the persisted doctor checks.
 * Degrades to {} on any read/parse error — callers treat absent entries as 'self'.
 * @param {string} [statusPath] - override for testing
 * @returns {Record<string,{owner:string,driftClass:string}>}
 */
export function loadProvenanceMap(statusPath = STATUS_PATH) {
  try {
    const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    const checks = status?.doctorScore?.checks;
    if (!Array.isArray(checks)) return {};
    const map = {};
    for (const c of checks) {
      if (!c || !c.id) continue;
      map[c.id] = { owner: ownerForDriftClass(c.driftClass), driftClass: c.driftClass || '' };
    }
    return map;
  } catch {
    return {};
  }
}

export default { loadProvenanceMap, ownerForDriftClass };
