// Session Telemetry — VaultSpark Studio Hub
// Tracks view navigation, feature usage, and session duration in IndexedDB.
// All data stays local (no external calls). Surfaced in Analytics Hub → Telemetry tab.

import { idbGetGeneral, idbSetGeneral, isIDBReady } from "../engine/idb.js";

const TELEMETRY_KEY = "session_telemetry";
const SESSION_KEY = "session_log";
const MAX_EVENTS = 2000;
const MAX_SESSIONS = 200;

let _sessionStart = Date.now();
let _buffer = [];
let _flushTimer = null;

// ── Event tracking ───────────────────────────────────────────────────────────

/**
 * Records a telemetry event (view navigation, feature click, etc.)
 * Events are buffered and flushed to IDB periodically.
 */
export function trackEvent(category, action, label = "") {
  _buffer.push({
    ts: Date.now(),
    category,  // "view", "feature", "action"
    action,    // "navigate", "click", "sync", etc.
    label,     // "studio-hub", "ai-copilot", "export-csv", etc.
  });

  // Auto-flush every 10 events or 30 seconds
  if (_buffer.length >= 10) {
    flushEvents();
  } else if (!_flushTimer) {
    _flushTimer = setTimeout(flushEvents, 30000);
  }
}

/**
 * Convenience: track a view navigation.
 */
export function trackView(viewName) {
  trackEvent("view", "navigate", viewName);
}

/**
 * Convenience: track a feature interaction.
 */
export function trackFeature(featureName) {
  trackEvent("feature", "click", featureName);
}

// ── Flush to IndexedDB ───────────────────────────────────────────────────────

async function flushEvents() {
  if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
  if (!_buffer.length || !isIDBReady()) return;

  const toFlush = _buffer.splice(0);
  const existing = (await idbGetGeneral(TELEMETRY_KEY)) || [];
  const merged = existing.concat(toFlush);

  // Trim to max
  if (merged.length > MAX_EVENTS) {
    merged.splice(0, merged.length - MAX_EVENTS);
  }

  await idbSetGeneral(TELEMETRY_KEY, merged);
}

// ── Session lifecycle ────────────────────────────────────────────────────────

/**
 * Call on app boot to mark session start.
 */
export function startSession() {
  _sessionStart = Date.now();
  trackEvent("session", "start", "");
}

/**
 * Call on page unload or session timeout to record session duration.
 */
export async function endSession() {
  const duration = Math.round((Date.now() - _sessionStart) / 1000);
  trackEvent("session", "end", `${duration}s`);
  await flushEvents();

  if (!isIDBReady()) return;
  const sessions = (await idbGetGeneral(SESSION_KEY)) || [];
  sessions.push({
    start: _sessionStart,
    end: Date.now(),
    durationSeconds: duration,
  });
  if (sessions.length > MAX_SESSIONS) sessions.splice(0, sessions.length - MAX_SESSIONS);
  await idbSetGeneral(SESSION_KEY, sessions);
}

// ── Read telemetry for analytics ─────────────────────────────────────────────

/**
 * Returns all stored telemetry events.
 */
export async function getTelemetryEvents() {
  if (!isIDBReady()) return [];
  return (await idbGetGeneral(TELEMETRY_KEY)) || [];
}

/**
 * Returns all stored session records.
 */
export async function getSessionLog() {
  if (!isIDBReady()) return [];
  return (await idbGetGeneral(SESSION_KEY)) || [];
}

/**
 * Computes summary stats from telemetry data.
 */
export async function getTelemetrySummary() {
  const events = await getTelemetryEvents();
  const sessions = await getSessionLog();

  // View frequency
  const viewCounts = {};
  const featureCounts = {};
  for (const e of events) {
    if (e.category === "view" && e.label) {
      viewCounts[e.label] = (viewCounts[e.label] || 0) + 1;
    }
    if (e.category === "feature" && e.label) {
      featureCounts[e.label] = (featureCounts[e.label] || 0) + 1;
    }
  }

  // Sort by frequency
  const topViews = Object.entries(viewCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  const topFeatures = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  // Session stats
  const durations = sessions.map((s) => s.durationSeconds).filter((d) => d > 0);
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const totalSessions = sessions.length;

  // Recent activity (last 7 days)
  const weekAgo = Date.now() - 7 * 86400000;
  const recentSessions = sessions.filter((s) => s.start > weekAgo).length;
  const recentEvents = events.filter((e) => e.ts > weekAgo).length;

  return {
    totalEvents: events.length,
    totalSessions,
    avgDurationSeconds: avgDuration,
    recentSessions,
    recentEvents,
    topViews,
    topFeatures,
  };
}
