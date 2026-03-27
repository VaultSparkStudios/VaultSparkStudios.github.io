// Score forecast and decay detection utilities.
// Operates on the score history array stored in localStorage by clientApp.js.
// History format: [{ ts, scores: {projectId: number}, ci: {projectId: string}, issues: {projectId: number} }, ...]

// Returns { projectId: forecastedScore } using the average of the last 2 deltas.
// Returns {} if not enough history to compute.
export function forecastScores(history) {
  if (!history || history.length < 2) return {};
  const h1 = history[history.length - 2].scores || {};
  const h2 = history[history.length - 1].scores || {};
  const result = {};
  for (const id of Object.keys(h2)) {
    const s1 = h1[id];
    const s2 = h2[id];
    if (s1 == null || s2 == null) continue;
    const delta = s2 - s1;
    // For 3+ entries, average the last 2 deltas for smoother forecast
    if (history.length >= 3) {
      const h0 = history[history.length - 3].scores || {};
      const s0 = h0[id];
      const delta0 = s0 != null ? s1 - s0 : delta;
      result[id] = Math.max(0, Math.min(100, Math.round(s2 + (delta + delta0) / 2)));
    } else {
      result[id] = Math.max(0, Math.min(100, Math.round(s2 + delta)));
    }
  }
  return result;
}

// Returns true if a project's score has declined in each of the last 2 consecutive snapshot pairs.
// Requires at least 3 history entries.
export function isDecaying(history, projectId) {
  if (!history || history.length < 3) return false;
  const last3 = history.slice(-3);
  const s0 = last3[0].scores?.[projectId];
  const s1 = last3[1].scores?.[projectId];
  const s2 = last3[2].scores?.[projectId];
  if (s0 == null || s1 == null || s2 == null) return false;
  return s1 < s0 && s2 < s1;
}

// Returns the set of project IDs that are currently decaying.
export function getDecayingProjects(history, projectIds) {
  return projectIds.filter((id) => isDecaying(history, id));
}

// Returns score delta between the last two history entries for a project. null if unavailable.
export function getScoreDelta(history, projectId) {
  if (!history || history.length < 2) return null;
  const prev = history[history.length - 2].scores?.[projectId];
  const curr = history[history.length - 1].scores?.[projectId];
  if (prev == null || curr == null) return null;
  return curr - prev;
}

// Returns true if forecast variance is high (std dev > 8 across last 3 deltas).
// High variance → show "→72?" instead of "→72".
export function isForecastHighVariance(history, projectId) {
  if (!history || history.length < 4) return false;
  const recent = history.slice(-4).map((h) => h.scores?.[projectId]).filter((v) => v != null);
  if (recent.length < 4) return false;
  const deltas = recent.slice(1).map((v, i) => v - recent[i]);
  const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const variance = deltas.reduce((s, d) => s + Math.pow(d - mean, 2), 0) / deltas.length;
  return Math.sqrt(variance) > 8;
}

// ── Forecast accuracy tracking ────────────────────────────────────────────────
const FORECAST_LOG_KEY = "vshub_forecast_log";
const MAX_FORECAST_LOG = 200;

// Call after a new snapshot lands. Records whether prior forecasts were correct.
// prevForecasts: { projectId: predictedScore } from the previous session's forecastScores()
export function recordForecastOutcomes(prevForecasts, newHistory) {
  if (!prevForecasts || !newHistory || newHistory.length < 1) return;
  const actual = newHistory[newHistory.length - 1].scores || {};
  const prev   = newHistory.length >= 2 ? (newHistory[newHistory.length - 2].scores || {}) : {};
  try {
    const log = JSON.parse(localStorage.getItem(FORECAST_LOG_KEY) || "[]");
    const ts = Date.now();
    for (const [id, predicted] of Object.entries(prevForecasts)) {
      const actualScore = actual[id];
      const prevScore   = prev[id];
      if (actualScore == null || prevScore == null) continue;
      const predictedDir = predicted > prevScore ? 1 : predicted < prevScore ? -1 : 0;
      const actualDir    = actualScore > prevScore ? 1 : actualScore < prevScore ? -1 : 0;
      log.push({ ts, projectId: id, predicted, actual: actualScore, prevScore, correct: predictedDir === actualDir });
    }
    if (log.length > MAX_FORECAST_LOG) log.splice(0, log.length - MAX_FORECAST_LOG);
    localStorage.setItem(FORECAST_LOG_KEY, JSON.stringify(log));
  } catch {}
}

// Returns { accuracy: 0–100 (%), total: N, correct: N } for a project. null if insufficient data.
export function getForecastAccuracy(projectId) {
  try {
    const log = JSON.parse(localStorage.getItem(FORECAST_LOG_KEY) || "[]");
    const entries = log.filter((e) => e.projectId === projectId);
    if (entries.length < 3) return null;
    const correct = entries.filter((e) => e.correct).length;
    return { accuracy: Math.round((correct / entries.length) * 100), total: entries.length, correct };
  } catch {
    return null;
  }
}

// Returns overall forecast accuracy across all projects.
export function getOverallForecastAccuracy() {
  try {
    const log = JSON.parse(localStorage.getItem(FORECAST_LOG_KEY) || "[]");
    if (log.length < 5) return null;
    const correct = log.filter((e) => e.correct).length;
    return { accuracy: Math.round((correct / log.length) * 100), total: log.length, correct };
  } catch {
    return null;
  }
}
