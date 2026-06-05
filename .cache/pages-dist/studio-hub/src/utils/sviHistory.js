// sviHistory.js — Persistent Studio Vitality Index (SVI) time-series.
// Stores SVI snapshots in localStorage so the Analytics chart can show
// a true historical record — like a stock chart for your studio's health.
//
// SVI: 0–100 (computed by computeSVI in analyticsView.js)
// Timeframes:  1W = 7d · 1M = 30d · 3M = 90d · 6M = 180d · 1Y = 365d · ALL

import { safeGetJSON, safeSetJSON } from './helpers.js';

const SVI_HISTORY_KEY = 'vshub_svi_history';
export const MAX_SVI_HISTORY = 200; // ~4 years of weekly sessions

// ── Persistence ───────────────────────────────────────────────────────────────

/**
 * Load stored SVI snapshots.
 * @returns {Array<{ ts: number, svi: number, ciPassRate: number, weeklyCommits: number, trend: string }>}
 */
export function loadSviHistory() {
  return safeGetJSON(SVI_HISTORY_KEY, []);
}

/**
 * Push a new SVI snapshot, or update in-place within the same 30-min session window.
 */
export function pushSviSnapshot({ svi, ciPassRate = 0, weeklyCommits = 0, trend = '→' } = {}) {
  if (svi == null) return loadSviHistory();
  try {
    const history = loadSviHistory();
    const now     = Date.now();
    const last    = history[history.length - 1];

    if (last && now - last.ts < 30 * 60 * 1000) {
      last.svi = svi; last.ciPassRate = ciPassRate;
      last.weeklyCommits = weeklyCommits; last.trend = trend;
      safeSetJSON(SVI_HISTORY_KEY, history);
      return history;
    }

    history.push({ ts: now, svi, ciPassRate, weeklyCommits, trend });
    if (history.length > MAX_SVI_HISTORY) {
      history.splice(0, history.length - MAX_SVI_HISTORY);
    }
    safeSetJSON(SVI_HISTORY_KEY, history);
    return history;
  } catch {
    return [];
  }
}

/**
 * Filter history by time window in days (null = all), capped at maxPts.
 */
export function filterSviHistory(history, days = null, maxPts = 200) {
  if (!history?.length) return [];
  const data = days == null
    ? history
    : history.filter(h => h.ts >= Date.now() - days * 86400000);
  return data.slice(-maxPts);
}

// ── Technical indicator computations ─────────────────────────────────────────

/**
 * Simple Moving Average over an array of nullable numbers.
 * Returns array of same length; positions before the period are null.
 */
export function computeMA(values, period) {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    const slice = values.slice(i - period + 1, i + 1).filter(v => v != null);
    return slice.length ? slice.reduce((s, v) => s + v, 0) / slice.length : null;
  });
}

/**
 * Bollinger Bands — MA(period) ± mult * σ.
 * Returns { upper, middle, lower } each of same length as input.
 */
export function computeBollinger(values, period = 20, mult = 2) {
  const middle = computeMA(values, period);
  const band = (sign) => values.map((_, i) => {
    if (i < period - 1 || middle[i] == null) return null;
    const slice = values.slice(i - period + 1, i + 1).filter(v => v != null);
    if (slice.length < 2) return null;
    const variance = slice.reduce((s, v) => s + (v - middle[i]) ** 2, 0) / slice.length;
    return middle[i] + sign * mult * Math.sqrt(variance);
  });
  return { upper: band(1), middle, lower: band(-1) };
}

/**
 * Linear regression trend line.
 * Returns { slope, intercept, r2, trendPoints } or null if insufficient data.
 */
export function computeTrendLine(values) {
  const valid = values.map((v, i) => [i, v]).filter(([, v]) => v != null);
  if (valid.length < 3) return null;

  const n   = valid.length;
  const sx  = valid.reduce((s, [x])    => s + x,     0);
  const sy  = valid.reduce((s, [, y])  => s + y,     0);
  const sxy = valid.reduce((s, [x, y]) => s + x * y, 0);
  const sxx = valid.reduce((s, [x])    => s + x * x, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;

  const slope     = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const yMean     = sy / n;
  const ssTot = valid.reduce((s, [, y]) => s + (y - yMean) ** 2, 0);
  const ssRes = valid.reduce((s, [x, y]) => s + (y - (slope * x + intercept)) ** 2, 0);
  const r2    = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return {
    slope,
    intercept,
    r2,
    trendPoints: values.map((_, i) => slope * i + intercept),
  };
}

/**
 * Bollinger Bandwidth = (upper - lower) / middle. Proxy for volatility.
 */
export function bollingerBandwidth(boll, idx) {
  const u = boll.upper[idx], l = boll.lower[idx], m = boll.middle[idx];
  if (u == null || l == null || m == null || m === 0) return null;
  return ((u - l) / m) * 100;
}

// ── Alert detection ───────────────────────────────────────────────────────────

/**
 * Detect session-over-session SVI drops ≥ threshold points.
 * Scans the full history and returns every snapshot where SVI dropped sharply.
 * @param {Array} history - Full sviHistory array
 * @param {number} threshold - Minimum drop magnitude to flag (default: 10)
 * @returns {Array<{ ts: number, from: number, to: number, drop: number }>}
 */
export function getSviAlerts(history, threshold = 10) {
  if (!history || history.length < 2) return [];
  const alerts = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].svi;
    const curr = history[i].svi;
    if (curr != null && prev != null && (prev - curr) >= threshold) {
      alerts.push({ ts: history[i].ts, from: prev, to: curr, drop: prev - curr });
    }
  }
  return alerts;
}
