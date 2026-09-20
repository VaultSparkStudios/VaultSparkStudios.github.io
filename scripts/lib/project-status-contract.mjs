import fs from 'node:fs';
import path from 'node:path';
import { validateJsonSchema } from './json-schema-lite.mjs';

export const PROJECT_STATUS_SCHEMA_REL = 'context/PROJECT_STATUS.schema.json';
export const STRUCTURED_SESSION_SCHEMA_VERSION = '1.7';
export const LEGACY_SESSION_FIELDS = ['session', 'sessionCount', 'sessionNumber', 'lastSessionDate'];

function numericSession(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function sessionReferences(value) {
  if (value == null) return [];
  const references = [];
  for (const match of String(value).matchAll(/\bS(\d+)\b|\bSession\s+(\d+)\b/gi)) {
    references.push(Number(match[1] ?? match[2]));
  }
  return [...new Set(references)];
}

function usesStructuredSessionContract(status = {}) {
  const version = Number.parseFloat(String(status.schemaVersion ?? '0'));
  return version >= Number.parseFloat(STRUCTURED_SESSION_SCHEMA_VERSION);
}

/** Semantic checks JSON Schema cannot express across compatibility fields. */
export function validateSessionProjection(status = {}) {
  const errors = [];
  const legacy = LEGACY_SESSION_FIELDS.filter((field) => status[field] !== undefined);
  for (const field of legacy) errors.push(`/${field} is a forbidden legacy duplicate; use /sessionState/durableSession`);

  // S363 — restored after the same inbound propagation that reverted lib/secrets.mjs,
  // check-secrets.mjs, lib/sil-categories.mjs, lib/task-board.mjs and the startup
  // brief renderer. The propagated LEGACY_SESSION_FIELDS check above is kept; this
  // guard sat beside it and was dropped. It bans canonical-name LOOKALIKES: a status
  // file carrying `testsPassed` next to `testsPassing`, or `sil` next to `silScore`,
  // has two fields that read as the same fact and no rule saying which one wins —
  // exactly the multi-writer ambiguity PROJECT_STATUS.json exists to prevent.
  // check-status-projection-coherence.mjs' "stale counter and alias fail" case
  // asserts this behaviour, so the removal was a hard self-test failure. D-S363.4.
  const deprecatedAliases = ['sil', 'silScoreLegacy500', 'testsPassed', 'testsEvidenceReceipt'];
  for (const key of deprecatedAliases) {
    if (Object.hasOwn(status || {}, key)) errors.push(`/${key} deprecated canonical-name lookalike not allowed`);
  }

  const projection = status.sessionState;
  if (!projection) {
    if (usesStructuredSessionContract(status)) errors.push('/sessionState is required for schemaVersion 1.7+');
    return errors;
  }

  const durable = numericSession(projection.durableSession);
  if (durable == null) return [...errors, '/sessionState/durableSession must be a non-negative integer'];

  for (const field of ['currentSession', 'lastSession', 'silLastSession']) {
    const actual = numericSession(status[field]);
    if (actual !== durable) errors.push(`/${field} must equal /sessionState/durableSession (S${durable}); got ${status[field] ?? 'missing'}`);
  }
  for (const field of ['currentFocus', 'nextMilestone', 'lastSessionSummary']) {
    if (status[field] !== projection[field]) errors.push(`/${field} must equal /sessionState/${field}`);
    for (const referenced of sessionReferences(status[field])) {
      if (referenced !== durable) {
        errors.push(`/${field} references S${referenced}, but /sessionState/durableSession is S${durable}`);
      }
    }
  }
  return errors;
}

export function validateProjectStatusShape(status, repoRoot = process.cwd()) {
  const schemaPath = path.join(repoRoot, PROJECT_STATUS_SCHEMA_REL);
  if (!fs.existsSync(schemaPath)) return { ok: false, schemaPath, schemaMissing: true, errors: [`/${PROJECT_STATUS_SCHEMA_REL} missing`] };
  let schema;
  try { schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8')); }
  catch (error) { return { ok: false, schemaPath, schemaMissing: false, errors: [`schema parse error: ${error.message}`] }; }
  const errors = [...validateJsonSchema(status, schema), ...validateSessionProjection(status)];
  return { ok: errors.length === 0, schemaPath, schemaMissing: false, errors };
}

export function formatTruthGenome(value, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value;
  if (Number.isInteger(value)) return `${value}/25`;
  if (value && typeof value === 'object') {
    if (Number.isFinite(value.score)) return `${value.score}/${Number.isFinite(value.max) ? value.max : 25}`;
    if (typeof value.status === 'string' && value.status.trim()) return value.status;
  }
  return fallback;
}
