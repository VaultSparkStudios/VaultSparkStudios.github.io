// silTrend.js — Persistent SIL score snapshots and trend alert detection.
// Mirrors the truthDebtHistory pattern: pushes a snapshot each Hub session
// and flags projects with a significant avg3 drop vs the previous snapshot.
//
// SIL score: 0–500 (SIL v2.0). Read from PROJECT_STATUS.json → silScore + silAvg3.
// A drop > DROP_THRESHOLD_PCT (10%) in avg3 session-over-session triggers a red badge.

import { safeGetJSON, safeSetJSON } from "./helpers.js";

const SIL_HISTORY_KEY    = "vshub_sil_history";
export const MAX_SIL_HISTORY    = 52;   // ~1yr of weekly snapshots
export const DROP_THRESHOLD_PCT = 10;   // percent drop in silAvg3 to trigger alert

/**
 * Load the stored SIL history array.
 * @returns {Array<{ ts: number, scores: Record<string, { silScore: number|null, silAvg3: number|null }> }>}
 */
export function loadSilHistory() {
  return safeGetJSON(SIL_HISTORY_KEY, []);
}

/**
 * Push a new SIL snapshot.
 * @param {Record<string, { silScore: number|null, silAvg3: number|null }>} perProject
 * @returns {Array} Updated history.
 */
export function pushSilSnapshot(perProject = {}) {
  try {
    const history = loadSilHistory();
    const now = Date.now();
    const last = history[history.length - 1];

    if (last && now - last.ts < 30 * 60 * 1000) {
      // Update in-place if within same session window
      last.scores = perProject;
      safeSetJSON(SIL_HISTORY_KEY, history);
      return history;
    }

    history.push({ ts: now, scores: perProject });
    if (history.length > MAX_SIL_HISTORY) {
      history.splice(0, history.length - MAX_SIL_HISTORY);
    }
    safeSetJSON(SIL_HISTORY_KEY, history);
    return history;
  } catch {
    return [];
  }
}

/**
 * Detect projects whose silAvg3 dropped significantly vs the previous snapshot.
 *
 * @param {Array}  history   - SIL history from loadSilHistory()
 * @param {number} threshold - Percent drop threshold (default DROP_THRESHOLD_PCT)
 * @returns {Array<{ slug, currentAvg3, prevAvg3, dropPct, severity }>}
 */
export function getSilTrendAlerts(history, threshold = DROP_THRESHOLD_PCT) {
  if (!history || history.length < 2) return [];

  const prev    = history[history.length - 2];
  const current = history[history.length - 1];
  const alerts  = [];

  for (const slug of Object.keys(current.scores ?? {})) {
    const curVal  = current.scores[slug]?.silAvg3;
    const prevVal = prev.scores?.[slug]?.silAvg3;

    if (curVal == null || prevVal == null || prevVal === 0) continue;

    const dropPct = ((prevVal - curVal) / prevVal) * 100;
    if (dropPct >= threshold) {
      alerts.push({
        slug,
        currentAvg3: curVal,
        prevAvg3:    prevVal,
        dropPct:     Math.round(dropPct),
        severity:    dropPct >= threshold * 2 ? 'critical' : 'warning',
      });
    }
  }

  return alerts.sort((a, b) => b.dropPct - a.dropPct);
}

/**
 * Render a compact SIL trend badge for a single project.
 * @param {Array}  history - SIL history
 * @param {string} slug    - Project slug
 * @returns {string} HTML badge string, or empty string if no data.
 */
export function renderSilTrendBadge(history, slug) {
  if (!history || history.length < 2) return '';

  const values = history
    .map(h => h.scores?.[slug]?.silAvg3)
    .filter(v => v != null);

  if (values.length < 2) return '';

  const first = values[0];
  const last  = values[values.length - 1];
  const delta = last - first;
  const pct   = first > 0 ? Math.round((delta / first) * 100) : 0;

  if (Math.abs(pct) < 2) return ''; // noise threshold

  const color = delta > 0  ? 'var(--green)'
              : delta < -DROP_THRESHOLD_PCT * first / 100 ? 'var(--red)'
              : 'var(--gold)';
  const arrow = delta > 0 ? '↑' : '↓';

  return `<span style="font-size:10px;color:${color};font-weight:700;margin-left:4px;" title="SIL avg3 trend: ${delta > 0 ? '+' : ''}${pct}% over ${values.length} snapshots">${arrow}${Math.abs(pct)}%</span>`;
}

/**
 * Render the portfolio-wide SIL trend alert banner (shown at Hub top if alerts exist).
 * @param {Array} alerts - From getSilTrendAlerts()
 * @returns {string} HTML string, or empty string if no alerts.
 */
export function renderSilAlertBanner(alerts) {
  if (!alerts || alerts.length === 0) return '';

  const critical = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');

  const rows = alerts.map(a => {
    const color = a.severity === 'critical' ? 'var(--red)' : 'var(--gold)';
    return `<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0;">
      <span style="font-weight:600;color:${color};">${a.slug}</span>
      <span style="color:var(--muted);font-size:11px;">avg3 ${a.prevAvg3} → ${a.currentAvg3} <span style="color:${color};">↓${a.dropPct}%</span></span>
    </div>`;
  }).join('');

  const headerColor = critical.length ? 'var(--red)' : 'var(--gold)';
  const icon        = critical.length ? '⚠' : '△';
  const label       = critical.length
    ? `${critical.length} critical SIL drop${critical.length > 1 ? 's' : ''}`
    : `${warnings.length} SIL warning${warnings.length > 1 ? 's' : ''}`;

  return `
    <div style="background:color-mix(in srgb, ${headerColor} 8%, transparent);border:1px solid color-mix(in srgb, ${headerColor} 30%, transparent);border-radius:6px;padding:8px 12px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <span style="color:${headerColor};font-size:13px;">${icon}</span>
        <span style="font-weight:700;font-size:12px;color:${headerColor};">SIL Trend Alert — ${label}</span>
        <span style="margin-left:auto;font-size:10px;color:var(--muted);">≥${DROP_THRESHOLD_PCT}% avg3 drop</span>
      </div>
      <div style="font-size:11px;">${rows}</div>
    </div>
  `;
}
