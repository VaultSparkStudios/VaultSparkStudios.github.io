// Shared formatting and UI helpers — used across multiple view components.

export const MS_PER_DAY = 86400000;

// ── Safe localStorage wrappers ──────────────────────────────────────────────
export function safeGetJSON(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

export function safeSetJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* quota exceeded — silently fail */ }
}

// ── Unified score → color / grade ───────────────────────────────────────────
export function scoreColor(v) {
  if (v == null) return "var(--muted)";
  if (v >= 80) return "var(--green)";
  if (v >= 60) return "var(--cyan)";
  if (v >= 40) return "var(--yellow)";
  return "var(--red)";
}

export function scoreGrade(v) {
  if (v == null) return "\u2014";
  if (v >= 90) return "A+";
  if (v >= 80) return "A";
  if (v >= 70) return "B+";
  if (v >= 60) return "B";
  if (v >= 50) return "C+";
  if (v >= 40) return "C";
  if (v >= 25) return "D";
  return "F";
}

// ── Skeleton loader placeholders ────────────────────────────────────────────
export function renderSkeleton(type = "generic") {
  const line = '<div class="skeleton skeleton-line"></div>';
  const block = '<div class="skeleton skeleton-block"></div>';
  if (type === "dashboard") return `<div style="padding:20px;">${block.repeat(3)}${line.repeat(5)}</div>`;
  if (type === "project")   return `<div style="padding:20px;"><div class="skeleton skeleton-block" style="height:120px;"></div>${line.repeat(8)}</div>`;
  return `<div style="padding:20px;">${line.repeat(4)}</div>`;
}

// ── Rich empty state card ───────────────────────────────────────────────────
export function renderEmptyState(icon, title, description, actionLabel = "", actionView = "") {
  return `
    <div class="empty-state" style="text-align:center; padding:32px 20px;">
      <div style="font-size:40px; margin-bottom:12px; opacity:0.8;">${icon}</div>
      <div style="font-size:15px; font-weight:700; color:var(--text); margin-bottom:6px;">${title}</div>
      <div style="font-size:12px; color:var(--muted); max-width:320px; margin:0 auto 12px;">${description}</div>
      ${actionLabel && actionView ? `<button class="empty-state-action" data-navigate="${actionView}" style="
        font-size:12px; padding:6px 14px; border-radius:6px; cursor:pointer;
        background:rgba(122,231,199,0.12); color:var(--cyan); border:1px solid rgba(122,231,199,0.25);
        transition:all 0.15s;
      ">${actionLabel}</button>` : ""}
    </div>`;
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export function ciStatus(runs) {
  if (!runs?.length) return { cls: "unknown", label: "No CI" };
  const r = runs[0];
  if (r.status === "in_progress") return { cls: "running",  label: "Running" };
  if (r.conclusion === "success")  return { cls: "passing",  label: "Passing" };
  if (r.conclusion === "failure")  return { cls: "failing",  label: "Failed" };
  return { cls: "unknown", label: r.conclusion || "Unknown" };
}

export function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function commitVelocity(commits) {
  const now = Date.now(), weekMs = 7 * 86400000;
  let thisWeek = 0, lastWeek = 0;
  for (const c of (commits || [])) {
    const age = now - new Date(c.date).getTime();
    if (age < weekMs) thisWeek++;
    else if (age < 2 * weekMs) lastWeek++;
  }
  return { thisWeek, lastWeek };
}

// ── Schema versioning / storage migration ─────────────────────────────────────
// Usage: migrateStorage("vshub_settings", [
//   { version: 2, up: (data) => { data.newField = "default"; return data; } }
// ])
// Reads the stored object, applies any migrations with version > stored._schemaVersion,
// writes back the updated data and version, returns the final data.
export function migrateStorage(key, migrations = []) {
  try {
    const raw = localStorage.getItem(key);
    let data = raw ? JSON.parse(raw) : {};
    const currentVersion = data._schemaVersion || 0;
    const pending = migrations
      .filter((m) => m.version > currentVersion)
      .sort((a, b) => a.version - b.version);
    if (!pending.length) return data;
    for (const m of pending) {
      data = m.up(data) || data;
      data._schemaVersion = m.version;
    }
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  } catch {
    return {};
  }
}
