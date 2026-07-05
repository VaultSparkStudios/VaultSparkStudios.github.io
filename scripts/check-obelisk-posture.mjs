#!/usr/bin/env node
/**
 * CANON-021 — Obelisk Posture Inventory.
 *
 * Reads `context/OBELISK_ADOPTION.md` (if present) and reports the project's
 * declared posture. Designed for the cross-repo audit fleet: each repo runs
 * this script, the studio-ops aggregator collects results and renders the
 * portfolio inventory.
 *
 * Posture values:
 *   not-applicable · pending · phase-0-declared · phase-1-pilot
 *   phase-2-mcp · phase-3-ops-integrated · phase-4-public-app-migrated
 *
 * Exit 0 always (read-only inventory). `--json` for machine consumption.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const asJson = process.argv.includes('--json');
const adoptionPath = path.join(ROOT, 'context/OBELISK_ADOPTION.md');

const VALID_POSTURES = new Set([
  'not-applicable',
  'pending',
  'phase-0-declared',
  'phase-1-pilot',
  'phase-1-passport-bridge',
  'phase-2-mcp',
  'phase-3-ops-integrated',
  'phase-4-public-app-migrated',
]);

function parsePosture(text) {
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!/posture/i.test(line)) continue;
    const cleaned = line
      .replace(/[*`]/g, '')
      .replace(/^\s*posture\s*[:=]\s*/i, '')
      .trim();
    const v = cleaned.split(/\s+/)[0]?.toLowerCase() || null;
    if (v && VALID_POSTURES.has(v)) return v;
  }
  return null;
}
let posture = null;
let source = 'absent';
let coAuthoringRole = null;

if (fs.existsSync(adoptionPath)) {
  const text = fs.readFileSync(adoptionPath, 'utf8');
  posture = parsePosture(text);
  source = posture ? 'parsed' : 'present-unparsed';
  const roleMatch = text.match(/coAuthoringRole\s*[:=]\s*([a-z]+)/i) || text.match(/^\s*(?:[*]{2})?Co-authoring role:?[*]{0,2}\s*[:=]?\s*['"*`]*([a-z-]+)/im);
  if (roleMatch) coAuthoringRole = roleMatch[1].toLowerCase();
}

const payload = {
  schemaVersion: '1.0',
  project: path.basename(ROOT),
  checkedAt: new Date().toISOString(),
  posture: posture || 'pending',
  source,
  coAuthoringRole,
  adoptionFile: fs.existsSync(adoptionPath) ? 'context/OBELISK_ADOPTION.md' : null,
};

if (asJson) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`obelisk posture: ${payload.posture} (source: ${source})`);
  if (coAuthoringRole) console.log(`co-authoring role: ${coAuthoringRole}`);
  if (source === 'absent') {
    console.log('hint: declare posture in context/OBELISK_ADOPTION.md (CANON-021)');
  }
}

process.exit(0);
