// truthDebtHistory.js — Persistent truth debt snapshots for trendline rendering.
// Mirrors the score-history pattern: pushes a snapshot each Hub session and
// keeps up to MAX_HISTORY weeks of data.

import { safeGetJSON, safeSetJSON } from "./helpers.js";

const TRUTH_DEBT_KEY = "vshub_truth_debt_history";
export const MAX_TRUTH_HISTORY = 52; // ~1yr of weekly snapshots

/**
 * Load the stored truth debt history array.
 * @returns {Array<{ ts: number, total: number, projects: Record<string, number> }>}
 */
export function loadTruthDebtHistory() {
  return safeGetJSON(TRUTH_DEBT_KEY, []);
}

/**
 * Push a new truth debt snapshot.
 * @param {number} totalDebt - Total portfolio contradiction count.
 * @param {Record<string, number>} perProject - Contradiction count per project slug.
 * @returns {Array} Updated history array.
 */
export function pushTruthDebtSnapshot(totalDebt, perProject = {}) {
  try {
    const history = loadTruthDebtHistory();
    const now = Date.now();

    // Deduplicate: skip if we already have a snapshot from this session (< 30 min ago)
    const last = history[history.length - 1];
    if (last && now - last.ts < 30 * 60 * 1000) {
      // Update the latest snapshot in place (fresher data)
      last.total = totalDebt;
      last.projects = perProject;
      safeSetJSON(TRUTH_DEBT_KEY, history);
      return history;
    }

    history.push({ ts: now, total: totalDebt, projects: perProject });
    if (history.length > MAX_TRUTH_HISTORY) {
      history.splice(0, history.length - MAX_TRUTH_HISTORY);
    }
    safeSetJSON(TRUTH_DEBT_KEY, history);
    return history;
  } catch {
    return [];
  }
}

/**
 * Render a mini truth debt trendline as an SVG sparkline string.
 * @param {Array} history - History array from loadTruthDebtHistory().
 * @param {{ w?: number, h?: number }} opts
 * @returns {string} SVG HTML string.
 */
export function renderTruthDebtSparkline(history, { w = 180, h = 40 } = {}) {
  const values = history.map((entry) => entry.total);
  if (values.length < 2) {
    return `<span style="font-size:10px;color:var(--muted);font-style:italic;">Not enough history yet</span>`;
  }

  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const range = mx - mn || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 6) + 3;
    const y = h - 4 - ((v - mn) / range) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const lastPt = pts.split(" ").pop().split(",");
  const lx = parseFloat(lastPt[0]);
  const ly = parseFloat(lastPt[1]);

  // Color logic: improving (down) = green, worsening (up) = amber, flat = muted
  const first = values[0];
  const last  = values[values.length - 1];
  const delta = last - first;
  const color = delta < 0 ? "#7ae7c7" : delta > 0 ? "#fbbf24" : "#64748b";
  const trend = delta < 0 ? "↓ improving" : delta > 0 ? "↑ worsening" : "→ stable";

  const fillPts = `3,${h} ${pts} ${lx},${h}`;

  return `
    <div style="display:flex;flex-direction:column;gap:4px;">
      <svg width="${w}" height="${h}" style="display:block;overflow:visible;" aria-label="Truth debt trend">
        <polygon points="${fillPts}" fill="${color}" opacity="0.10"/>
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${lx}" cy="${ly}" r="2.5" fill="${color}"/>
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);">
        <span>${history.length} snapshots · ${trend}</span>
        <span style="color:${color};font-weight:700;">${last} now</span>
      </div>
    </div>
  `;
}
