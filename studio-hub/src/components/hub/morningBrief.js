import { PROJECTS } from "../../data/studioRegistry.js";
import { daysSince, safeGetJSON, safeSetJSON } from "../../utils/helpers.js";
import { getDecayingProjects } from "../../utils/scoreForecast.js";
import { computeHotStreak } from "./hubHelpers.js";
import { analyzeRunway } from "../../utils/runwayLoader.js";

// ── Snapshot diff: "What changed since last visit" ────────────────────────────
// Returns an array of { project, prev, curr, delta } for projects whose scores
// changed meaningfully since the snapshot closest to prevLastOpened timestamp.
export function getVisitDiff(scoreHistory, prevLastOpened) {
  if (!scoreHistory || scoreHistory.length < 2 || !prevLastOpened) return [];
  // Find the snapshot taken closest to (but before) prevLastOpened
  const visitTs = Number(prevLastOpened);
  let baseline = scoreHistory[0];
  for (const entry of scoreHistory) {
    if (entry.ts <= visitTs) baseline = entry;
    else break;
  }
  const current = scoreHistory[scoreHistory.length - 1];
  if (baseline === current) return [];
  const diffs = [];
  for (const p of PROJECTS) {
    const prev = baseline.scores?.[p.id];
    const curr = current.scores?.[p.id];
    if (prev == null || curr == null) continue;
    const delta = curr - prev;
    if (Math.abs(delta) >= 3) diffs.push({ project: p, prev, curr, delta });
  }
  return diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

// ── Score anomaly explainer: surface which signal caused a drop ───────────────
// Returns array of { project, delta, signal } for projects with notable drops
// between the last two history snapshots.
export function getScoreAnomalies(scoreHistory, ghData) {
  if (!scoreHistory || scoreHistory.length < 2) return [];
  const h1 = scoreHistory[scoreHistory.length - 2];
  const h2 = scoreHistory[scoreHistory.length - 1];
  const anomalies = [];

  for (const p of PROJECTS) {
    const prev = h1.scores?.[p.id];
    const curr = h2.scores?.[p.id];
    if (prev == null || curr == null) continue;
    const delta = curr - prev;
    if (delta >= -4) continue; // only flag meaningful drops

    const repoData = ghData[p.githubRepo] || {};
    const signals = [];

    // CI changed?
    const prevCI = h1.ci?.[p.id];
    const currCI = h2.ci?.[p.id];
    if (prevCI === "success" && currCI === "failure") signals.push("CI started failing");
    else if (prevCI !== "failure" && currCI === "failure") signals.push("CI failure");

    // Issue spike?
    const prevIssues = h1.issues?.[p.id];
    const currIssues = h2.issues?.[p.id];
    if (prevIssues != null && currIssues != null && currIssues - prevIssues >= 3) {
      signals.push(`+${currIssues - prevIssues} open issues`);
    }

    // Staleness?
    const commits = repoData?.commits || [];
    if (commits.length > 0) {
      const ageDays = (Date.now() - new Date(commits[0].date).getTime()) / 86400000;
      if (ageDays > 30) signals.push(`no commits in ${Math.round(ageDays)}d`);
    }

    if (!signals.length) signals.push("signal unclear — check project hub");
    anomalies.push({ project: p, delta, signal: signals.slice(0, 2).join(", ") });
  }
  return anomalies;
}

// ── Burnout Risk Index (#5) ───────────────────────────────────────────────────
// Detects the "surge → silence" pattern: high velocity in the prior 14–28d window
// followed by 0 commits in the last 7 days. Returns array of { project, burstCount }.
export function getBurnoutRiskProjects(ghData) {
  const at_risk = [];
  const now = Date.now();
  for (const p of PROJECTS) {
    const commits = ghData[p.githubRepo]?.commits || [];
    if (commits.length < 3) continue;
    const last7d  = commits.filter((c) => (now - new Date(c.date).getTime()) < 7 * 86400000).length;
    const prev21d = commits.filter((c) => {
      const ms = now - new Date(c.date).getTime();
      return ms >= 7 * 86400000 && ms < 28 * 86400000;
    }).length;
    if (last7d === 0 && prev21d >= 7) {
      at_risk.push({ project: p, burstCount: prev21d });
    }
  }
  return at_risk;
}

// Keys resolved Brain flags by flag content hash to avoid re-surfacing acknowledged items.
const BRAIN_RESOLVED_KEY = "vshub_brain_resolved";
function loadResolvedFlags() { return new Set(safeGetJSON(BRAIN_RESOLVED_KEY, [])); }
function resolveFlag(key) {
  const s = loadResolvedFlags();
  s.add(key);
  safeSetJSON(BRAIN_RESOLVED_KEY, [...s].slice(-50));
}
// Called by clientApp event delegation — exposed on window for inline onclick
window._resolveBrainFlag = (key) => {
  resolveFlag(key);
  // Re-render morning brief by dispatching a lightweight custom event
  window.dispatchEvent(new CustomEvent("brain-flag-resolved"));
};

// ── Founder Focus Mode (#14) ──────────────────────────────────────────────────
// Studio-wide "what do I do right now?" — top 3 urgent actions.
export function renderFounderFocusMode(ghData, allScores, scoreHistory) {
  const actions = [];

  // CI failures — highest urgency
  for (const { project, scoring } of allScores) {
    const repoData = ghData[project.githubRepo];
    if (repoData?.ciRuns?.[0]?.conclusion === "failure") {
      actions.push({ icon: "⚠", color: "var(--red)", urgency: 10,
        text: `Fix CI on ${project.name}`,
        sub: `Build failing — ${scoring.grade} · score ${scoring.total}` });
    }
  }

  // Score drops between last two snapshots
  if (scoreHistory.length >= 2) {
    const prev = scoreHistory[scoreHistory.length - 2].scores || {};
    const curr = scoreHistory[scoreHistory.length - 1].scores || {};
    for (const { project, scoring } of allScores) {
      const delta = (curr[project.id] ?? 0) - (prev[project.id] ?? 0);
      if (delta <= -8) {
        actions.push({ icon: "↓", color: "var(--red)", urgency: 8,
          text: `${project.name} dropped ${delta} pts`,
          sub: `Now ${scoring.total} (${scoring.grade}) — investigate in project hub` });
      }
    }
  }

  // Overdue milestones
  for (const { project } of allScores) {
    const repoData = ghData[project.githubRepo];
    const overdue = (repoData?.milestones || []).filter((m) =>
      m.dueOn && new Date(m.dueOn).getTime() < Date.now() && m.state === "open"
    );
    if (overdue.length) {
      actions.push({ icon: "⏰", color: "var(--gold)", urgency: 6,
        text: `${project.name}: ${overdue.length} overdue milestone${overdue.length > 1 ? "s" : ""}`,
        sub: overdue.map((m) => m.title).slice(0, 2).join(", ") });
    }
  }

  // Lowest-scoring project that's below B grade and has data
  const sorted = [...allScores].sort((a, b) => a.scoring.total - b.scoring.total);
  const lowest = sorted.find(({ project, scoring }) => scoring.total < 55 && ghData[project.githubRepo]);
  if (lowest) {
    const topSignal = lowest.scoring.pillars.development.signals[0] || lowest.scoring.pillars.risk.signals[0] || "";
    actions.push({ icon: "↗", color: "var(--cyan)", urgency: 4,
      text: `${lowest.project.name}: ${lowest.scoring.total} pts — can improve`,
      sub: topSignal || "Open project hub for actions" });
  }

  actions.sort((a, b) => b.urgency - a.urgency);
  const top = actions.slice(0, 3);

  if (!top.length) {
    return `
      <div class="panel" style="margin-bottom:20px;">
        <div class="panel-header">
          <span class="panel-title">FOCUS NOW</span>
        </div>
        <div class="panel-body" style="padding:10px 0;">
          <span style="color:var(--green); font-size:13px;">✓ Nothing critical — studio is healthy</span>
        </div>
      </div>`;
  }

  return `
    <div class="panel" style="margin-bottom:20px; border-color:rgba(248,113,113,0.2);">
      <div class="panel-header">
        <span class="panel-title">FOCUS NOW — TOP ${top.length}</span>
        <span style="font-size:10px; color:var(--muted);">What needs you first</span>
      </div>
      <div class="panel-body" style="display:flex; flex-direction:column; gap:6px;">
        ${top.map((a, i) => `
          <div style="display:flex; align-items:flex-start; gap:10px; padding:8px 0;
                      border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="color:var(--muted); font-size:11px; font-weight:800; flex-shrink:0;
                         min-width:14px; text-align:center; padding-top:1px;">${i + 1}</span>
            <span style="color:${a.color}; font-size:13px; flex-shrink:0; width:16px; text-align:center;">${a.icon}</span>
            <div style="flex:1;">
              <div style="font-size:13px; color:var(--text); font-weight:600;">${a.text}</div>
              ${a.sub ? `<div style="font-size:11px; color:var(--muted); margin-top:2px;">${a.sub}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    </div>`;
}

export function renderMorningBrief(ghData, sbData, allScores, scoreHistory, beaconData, beaconSessionStarts = {}, studioBrain = null, portfolioFreshness = {}, agentRunHistory = {}, prevLastOpened = null, competitorAlerts = []) {
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

  // Score anomaly explainer — surface which signal caused each notable drop
  const anomalies = getScoreAnomalies(scoreHistory, ghData);
  for (const { project, delta, signal } of anomalies) {
    lines.push({
      priority: 1,
      icon: "↓",
      color: "var(--red)",
      text: `${project.name}: score dropped ${delta} — ${signal}`,
    });
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

  // Automated workflow failures (studio-ops workflows)
  for (const [wfName, run] of Object.entries(agentRunHistory)) {
    if (run?.conclusion === "failure") {
      lines.push({ priority: 1, icon: "⚠", color: "var(--red)", text: `Workflow failing: ${wfName}` });
    }
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

  // Burnout risk (#5) — velocity surge followed by silence
  const burnoutRisk = getBurnoutRiskProjects(ghData);
  for (const { project, burstCount } of burnoutRisk) {
    lines.push({ priority: 2, icon: "🔴", color: "var(--gold)", text: `${project.name}: burnout signal — ${burstCount} commits last 3wk, none this week` });
  }

  // Cross-project signal propagation (#23) — detect studio-wide infrastructure issues
  const ciFailingProjects = PROJECTS.filter((p) => ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "failure");
  if (ciFailingProjects.length >= 3) {
    lines.push({
      priority: 1, icon: "⚡", color: "var(--red)",
      text: `Studio infrastructure alert — ${ciFailingProjects.length} projects failing CI simultaneously: ${ciFailingProjects.slice(0, 3).map((p) => p.name).join(", ")}${ciFailingProjects.length > 3 ? ` +${ciFailingProjects.length - 3} more` : ""}`,
    });
  }
  const silentProjects = PROJECTS.filter((p) => {
    const commits = ghData[p.githubRepo]?.commits || [];
    if (!commits.length) return false;
    return (Date.now() - new Date(commits[0].date).getTime()) > 14 * 86400000;
  });
  if (silentProjects.length >= 4) {
    lines.push({
      priority: 3, icon: "⏸", color: "var(--gold)",
      text: `Bandwidth warning — ${silentProjects.length} projects inactive 14d+: possible team capacity constraint`,
    });
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

  // Competitor watchlist alerts (#11) — repos gaining >50 stars this session
  for (const { repo, delta } of competitorAlerts) {
    lines.push({ priority: 2, icon: "📈", color: "var(--gold)",
      text: `Competitor surge: ${repo} +${delta} stars this session` });
  }

  // Runway auto-loader: check per-project task boards for thin Now queues
  for (const p of PROJECTS) {
    const taskBoard = ghData?.[p.githubRepo]?.contextFiles?.taskBoard || "";
    if (!taskBoard) continue;
    const runway = analyzeRunway(taskBoard);
    if (!runway.runwayOk) {
      const silCount = runway.suggestions.filter((s) => /\[SIL\]/i.test(s.task)).length;
      const detail = silCount > 0 ? ` (${silCount} [SIL] items ready to promote)` : "";
      lines.push({
        priority: 1,
        icon: "⛔",
        color: "var(--gold)",
        text: `${p.name}: low runway — Now queue has ${runway.nowCount} task${runway.nowCount !== 1 ? "s" : ""}${detail}`,
      });
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
