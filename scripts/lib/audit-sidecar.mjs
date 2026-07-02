/**
 * audit-sidecar.mjs — JSON sidecar for docs/AUDIT_<date>.md (G2, S118).
 *
 * Replaces the markdown-table-as-contract between /audit and /implement.
 * /audit writes both files; /implement reads the JSON.
 *
 * Schema (v1.0):
 *   {
 *     schemaVersion: "1.0",
 *     generatedAt: ISO-8601,
 *     project: { slug, type, name },
 *     axes: { gamification: 3, ux: 2, ... },        // applied weights
 *     items: [
 *       {
 *         id: 1,                                     // matches # in markdown
 *         slug: "single-page-magic-link",
 *         tier: "🔥" | "⚡" | "💡",
 *         axis: "ux" | "security" | ...,
 *         effortHours: 4,
 *         impact: 9,
 *         innovation: 8,
 *         priority: 12.7,
 *         title: "Replace 3-step signup with single-page magic-link",
 *         why: "Friction kills 40% of signups...",
 *         recipe: "Implement /api/magic-link endpoint...",
 *         status: "pending" | "shipped" | "blocked" | "deferred",
 *         executionLog: [{ at, status, note }]
 *       }
 *     ],
 *     totals: { count: N, priority: PPP.PP, top3: [slug,slug,slug] },
 *     innovationReserve: [slug,...],
 *     skipped: [{ slug, reason }],
 *   }
 */

import fs from 'fs';
import path from 'path';

const SCHEMA_VERSION = '1.0';

// CANON-028 — founder identity must NEVER be committed. The /audit pipeline was
// leaking carterglotz@gmail.com into committed sidecars (S142 audit item 3), so
// every sidecar write is now scrubbed at the source. Substitutions mirror
// scripts/check-founder-identity-leak.mjs FORBIDDEN_PATTERNS.
const FOUNDER_IDENTITY_SUBS = [
  [/carterglotz@gmail\.com/g, 'founder@vaultsparkstudios.com'],
  [/Carter\s+G\.\s+Riven/g, 'the Founder'],
  [/\bCarter\s+Riven\b/g, 'the Founder'],
];

function redactFounderIdentity(value) {
  if (typeof value === 'string') {
    let out = value;
    for (const [re, sub] of FOUNDER_IDENTITY_SUBS) out = out.replace(re, sub);
    return out;
  }
  if (Array.isArray(value)) return value.map(redactFounderIdentity);
  if (value && typeof value === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(value)) o[k] = redactFounderIdentity(v);
    return o;
  }
  return value;
}

export { redactFounderIdentity };

export function sidecarPath(repoRoot, date) {
  return path.join(repoRoot, 'docs', `AUDIT_${date}.json`);
}

export function readAuditSidecar(repoRoot, date) {
  try { return JSON.parse(fs.readFileSync(sidecarPath(repoRoot, date), 'utf8')); } catch { return null; }
}

export function writeAuditSidecar(repoRoot, date, audit) {
  audit.schemaVersion = SCHEMA_VERSION;
  audit.generatedAt = audit.generatedAt || new Date().toISOString();
  const safe = redactFounderIdentity(audit);  // CANON-028 scrub at the source
  const p = sidecarPath(repoRoot, date);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(safe, null, 2) + '\n');
  return p;
}

/**
 * Find the latest AUDIT_*.json in docs/. Returns { date, audit } or null.
 */
export function findLatestAuditSidecar(repoRoot) {
  const dir = path.join(repoRoot, 'docs');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(f => /^AUDIT_\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  if (!files.length) return null;
  const latest = files[files.length - 1];
  const date = latest.match(/AUDIT_(\d{4}-\d{2}-\d{2})\.json/)[1];
  return { date, audit: readAuditSidecar(repoRoot, date), path: path.join(dir, latest) };
}

/**
 * Merge: if a sidecar exists for the same date, preserve executionLog and
 * status of items whose slug matches; new items append.
 */
export function mergeAudit(existing, incoming) {
  if (!existing) return incoming;
  const bySlug = new Map(existing.items.map(it => [it.slug, it]));
  const merged = {
    ...incoming,
    items: incoming.items.map(it => {
      const prior = bySlug.get(it.slug);
      if (!prior) return { ...it, status: it.status || 'pending', executionLog: [] };
      bySlug.delete(it.slug);
      return {
        ...it,
        status: prior.status === 'shipped' ? 'shipped' : (it.status || 'pending'),
        executionLog: prior.executionLog || [],
      };
    }),
  };
  // Preserve items that were in prior audit but not in incoming (already-shipped, etc.)
  for (const surplus of bySlug.values()) {
    merged.items.push(surplus);
  }
  return merged;
}

export function appendExecution(audit, slug, entry) {
  const it = audit.items.find(i => i.slug === slug);
  if (!it) return null;
  it.executionLog = it.executionLog || [];
  it.executionLog.push({ at: new Date().toISOString(), ...entry });
  if (entry.status) it.status = entry.status;
  return it;
}

export default { sidecarPath, readAuditSidecar, writeAuditSidecar, findLatestAuditSidecar, mergeAudit, appendExecution };
