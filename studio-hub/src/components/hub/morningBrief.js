import { PROJECTS } from "../../data/studioRegistry.js";
import { daysSince } from "../../utils/helpers.js";
import { getDecayingProjects } from "../../utils/scoreForecast.js";
import { computeHotStreak } from "./hubHelpers.js";

// Keys resolved Brain flags by flag content hash to avoid re-surfacing acknowledged items.
const BRAIN_RESOLVED_KEY = "vshub_brain_resolved";
function loadResolvedFlags() {
  try { return new Set(JSON.parse(localStorage.getItem(BRAIN_RESOLVED_KEY) || "[]")); } catch { return new Set(); }
}
function resolveFlag(key) {
  const s = loadResolvedFlags();
  s.add(key);
  // Cap at 50 entries to avoid unbounded growth
  const arr = [...s].slice(-50);
  try { localStorage.setItem(BRAIN_RESOLVED_KEY, JSON.stringify(arr)); } catch {}
}
// Called by clientApp event delegation — exposed on window for inline onclick
window._resolveBrainFlag = (key) => {
  resolveFlag(key);
  // Re-render morning brief by dispatching a lightweight custom event
  window.dispatchEvent(new CustomEvent("brain-flag-resolved"));
};

export function renderMorningBrief(ghData, sbData, allScores, scoreHistory, beaconData, beaconSessionStarts = {}, studioBrain = null, portfolioFreshness = {}) {
  const lines = [];
  const resolved = loadResolvedFlags();

  // Studio Brain priority flags (studio-level, highest priority)
  if (studioBrain?.flags?.length) {
    for (const flag of studioBrain.flags) {
      const flagKey = `${flag.type}:${flag.text}`;
      if (resolved.has(flagKey)) continue; // skip acknowledged flags
      const iconMap = { CONFLICT: "⚡", GAP: "○", STALE: "⏸", PENDING: "↻" };
      const colorMap = { CONFLICT: "#f87171", GAP: "#c084fc", STALE: "var(--gold)", PENDING: "var(--muted)" };
      lines.push({
        priority: -1,
        icon: iconMap[flag.type] || "●",
        color: colorMap[flag.type] || "#c084fc",
        text: `[Studio] ${flag.text}`,
        studio: true,
        flagKey,
      });
    }
  }

  // Portfolio freshness warnings (stale agent outputs)
  const PORTFOLIO_LABELS = {
    "portfolio/WEEKLY_DIGEST.md":   "Weekly Digest",
    "portfolio/DEBT_REPORT.md":     "Debt Report",
    "portfolio/REVENUE_SIGNALS.md": "Revenue Signals",
    "portfolio/COMMUNITY_PULSE.md": "Community Pulse",
    "portfolio/CONTENT_PIPELINE.md":"Content Pipeline",
    "portfolio/STUDIO_BRAIN.md":    "Studio Brain",
  };
  for (const [filePath, label] of Object.entries(PORTFOLIO_LABELS)) {
    const info = portfolioFreshness[filePath];
    if (info && info.daysOld > 14) {
      lines.push({
        priority: 2,
        icon: "⏸",
        color: "var(--gold)",
        text: `${label} not updated in ${info.daysOld} days — agent may need to run`,
        studio: true,
      });
    }
  }

  // Active sessions
  const activeSessions = beaconData?.active || [];
  for (const s of activeSessions) {
    const p = PROJECTS.find((p) => p.id === s.project);
    const key = `${s.project}:${s.agent || "claude"}`;
    const startTs = beaconSessionStarts[key];
    const durationMin = startTs ? Math.floor((Date.now() - startTs) / 60000) : null;
    const durStr = durationMin !== null ? ` · ${durationMin}m` : "";
    lines.push({ priority: 0, icon: "●", color: "var(--cyan)",  text: `Active session: ${p?.name || s.project} (${s.agent || "claude-code"}${durStr})` });
  }

  // CI failures
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (d?.ciRuns?.[0]?.conclusion === "failure") {
      lines.push({ priority: 1, icon: "⚠", color: "var(--red)",  text: `${p.name}: CI build failing` });
    }
  }

  // Score decays
  const decaying = getDecayingProjects(scoreHistory, PROJECTS.map((p) => p.id));
  for (const id of decaying) {
    const p = PROJECTS.find((p) => p.id === id);
    lines.push({ priority: 2, icon: "↓", color: "var(--red)", text: `${p?.name}: score declining 3 sessions in a row` });
  }

  // Low health scores
  for (const { project, scoring } of allScores) {
    if (scoring.total <= 24 && ghData[project.githubRepo]) {
      lines.push({ priority: 2, icon: "⚡", color: "#ff9478", text: `${project.name}: health score ${scoring.total} (${scoring.grade}) — critical` });
    }
  }

  // Stale repos
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    const last = d?.commits?.[0];
    if (last) {
      const days = Math.floor(daysSince(last.date));
      if (days >= 30) lines.push({ priority: 3, icon: "⏸", color: "var(--gold)", text: `${p.name}: no commits in ${days} days` });
    }
  }

  // Score gains (positive signals)
  if (scoreHistory.length >= 2) {
    const prev = scoreHistory[scoreHistory.length - 2].scores || {};
    const curr = scoreHistory[scoreHistory.length - 1].scores || {};
    for (const p of PROJECTS) {
      const delta = (curr[p.id] ?? 0) - (prev[p.id] ?? 0);
      if (delta >= 8) lines.push({ priority: 4, icon: "↑", color: "var(--green)", text: `${p.name}: up +${delta} since last session` });
    }
  }

  // Hot streaks (positive)
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (!d) continue;
    const streak = computeHotStreak(d.commits);
    if (streak >= 5) lines.push({ priority: 4, icon: "🔥", color: "var(--gold)", text: `${p.name}: ${streak}-day commit streak` });
  }

  // New releases this week
  const weekMs = 7 * 86400000;
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (d?.latestRelease && Date.now() - new Date(d.latestRelease.publishedAt).getTime() < weekMs) {
      lines.push({ priority: 4, icon: "🚀", color: "var(--blue)", text: `${p.name}: released ${d.latestRelease.tag} this week` });
    }
  }

  if (!lines.length) {
    lines.push({ priority: 5, icon: "✓", color: "var(--green)", text: "All systems nominal — nothing needs your attention" });
  }

  lines.sort((a, b) => a.priority - b.priority);
  const shown = lines.slice(0, 6);

  return `
    <div class="panel" style="margin-bottom:24px; border-color:rgba(122,231,199,0.2);">
      <div class="panel-header">
        <span class="panel-title">WHAT NEEDS YOU TODAY</span>
        <span style="font-size:11px; color:var(--muted);">${new Date().toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}</span>
      </div>
      <div class="panel-body" style="display:flex; flex-direction:column; gap:6px;">
        ${shown.map((l) => `
          <div style="display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="color:${l.color}; font-size:13px; flex-shrink:0; width:16px; text-align:center;">${l.icon}</span>
            <span style="font-size:13px; color:var(--text); flex:1;">${l.text}</span>
            ${l.flagKey ? `<button onclick="window._resolveBrainFlag(${JSON.stringify(l.flagKey)})"
              style="font-size:9px; color:var(--muted); background:transparent; border:1px solid var(--border);
                     border-radius:6px; padding:1px 6px; cursor:pointer; flex-shrink:0; opacity:0.6;"
              title="Mark as resolved — won't show again">✓ resolved</button>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}
