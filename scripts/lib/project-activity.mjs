/**
 * project-activity.mjs — shared per-project activity derivation over the
 * portfolio events ledger (portfolio/events.ndjson, via readPortfolioEvents).
 *
 * Consumers:
 *   - scripts/generate-heartbeat.mjs (pulses7d / pulses30d / lastActivity)
 *
 * PRIVACY (CANON-028 Founder Identity Privacy). This module derives AGGREGATE
 * counters only. It used to also render public, day-precision lines of the form
 * "<Project> — work-session-closed <Mon D>" plus per-project
 * active/resting/dormant states, both computed from the closeout ledger.
 * Published to anyone, that is a record of WHEN a private individual was at
 * work. It was removed as a privacy incident. Do NOT reintroduce a derivation
 * here that puts a work timestamp — or a recency state derived from one — onto
 * a public surface.
 *
 * Pure: no I/O. `now` is always injected so callers and self-tests are deterministic.
 */
import { matchesProjectSlug } from './public-activity.mjs';

export const MS_DAY = 86_400_000;

/**
 * Derive activity counters for one registry project.
 * @param {object} project   registry entry ({ id, slug, githubRepo, localFolder })
 * @param {object[]} events  portfolio events ({ ts, slug, type })
 * @param {object} opts
 * @param {number} opts.now          epoch ms
 * @param {number} [opts.windowDays] pulse window (default 30)
 * @param {number} [opts.recentDays] recent pulse window (default 7)
 * @param {string[]|null} [opts.types] restrict to these event types (null = all)
 * @returns {{ pulses7d:number, pulses30d:number, lastActivity:number, lastActivityAt:number }}
 *   lastActivity   = newest matching ts INSIDE the window (0 if none) — heartbeat contract
 *   lastActivityAt = newest matching ts at any age (0 if none)
 */
export function deriveProjectPulse(project, events, { now, windowDays = 30, recentDays = 7, types = null } = {}) {
  const typeSet = Array.isArray(types) ? new Set(types) : null;
  const acc = { pulses7d: 0, pulses30d: 0, lastActivity: 0, lastActivityAt: 0 };
  for (const ev of events || []) {
    if (!ev?.slug || !ev?.ts) continue;
    if (typeSet && !typeSet.has(ev.type)) continue;
    if (!matchesProjectSlug(project, ev.slug)) continue;
    const ts = Date.parse(ev.ts);
    if (!Number.isFinite(ts)) continue;
    if (ts > acc.lastActivityAt) acc.lastActivityAt = ts;
    const ageDays = (now - ts) / MS_DAY;
    if (ageDays > windowDays) continue;
    acc.pulses30d += 1;
    if (ageDays <= recentDays) acc.pulses7d += 1;
    if (ts > acc.lastActivity) acc.lastActivity = ts;
  }
  return acc;
}

/** Portfolio total = every registry entry with an id (public + internal + sealed). */
export function portfolioTotalFromRegistry(projects) {
  return (Array.isArray(projects) ? projects : []).filter((p) => p && p.id).length;
}
