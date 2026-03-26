// Shared formatting and UI helpers — used across multiple view components.

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
