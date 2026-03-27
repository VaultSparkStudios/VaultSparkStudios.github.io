import { PROJECTS, SOCIAL_ACCOUNTS } from "../data/studioRegistry.js";
import { scoreProject, scoreStudio } from "../utils/projectScoring.js";
import { forecastScores, getDecayingProjects, isForecastHighVariance } from "../utils/scoreForecast.js";
import { getFetchError } from "../data/githubAdapter.js";
import { timeAgo, fmt, ciStatus, daysSince, commitVelocity } from "../utils/helpers.js";
import { scorePotential, scoreMomentumIndex, potentialLabel, momentumLabel } from "../utils/proprietaryScores.js";
import {
  renderAlerts,
  renderAlertHistoryPanel,
  renderSnoozePanel,
  getSnoozedAlertCount,
  pushAlertHistory as _pushAlertHistory,
  snoozeAlert as _snoozeAlert,
} from "./hub/alertPanel.js";
import { deltaBadge, computeHotStreak } from "./hub/hubHelpers.js";
import { loadAnnotations, loadGoals, loadSprint, loadPinned } from "./hub/hubStorage.js";
import { renderMorningBrief, getVisitDiff, renderFounderFocusMode } from "./hub/morningBrief.js";
import { getCompetitorAlerts } from "./competitiveView.js";
import { renderVitals } from "./hub/vitalsStrip.js";
import { renderLeaderboard } from "./hub/leaderboard.js";
import { renderSocialSummary } from "./hub/socialSummary.js";
import { renderSprintPanel } from "./hub/sprintPanel.js";
import { renderScoreLedger, getLedgerEntries } from "./hub/scoreLedger.js";
import { renderStudioHealthTimeline } from "./hub/healthTimeline.js";
import { renderStudioBrainPanel, renderBrainHistoryPanel } from "./hub/brainPanel.js";
import { renderAgentIntelligencePanel } from "./hub/agentIntelligence.js";

// Re-export for backwards compatibility (clientApp.js imports these from here)
export { _pushAlertHistory as pushAlertHistory, _snoozeAlert as snoozeAlert };

function stalenessColor(days) {
  if (days < 7)  return "var(--green)";
  if (days < 30) return "var(--gold)";
  return "var(--red)";
}


function scoreBar(score, max, color, label = "", signal = "", tooltip = "") {
  const pct = Math.round((score / max) * 100);
  return `
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:1px;" ${tooltip ? `title="${tooltip}"` : ""}>
      ${label ? `<span style="font-size:11px; color:var(--muted); min-width:54px; flex-shrink:0; text-transform:uppercase; letter-spacing:0.05em; cursor:help;" title="${tooltip}">${label}</span>` : ""}
      <div style="flex:1; height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden;">
        <div style="width:${pct}%; height:100%; background:${color}; border-radius:2px;"></div>
      </div>
      <span style="font-size:10px; color:var(--muted); min-width:28px; text-align:right; flex-shrink:0;">${score}/${max}</span>
    </div>
    ${signal ? `<div style="font-size:10px; color:var(--muted); padding-left:${label ? "62px" : "0"}; margin-bottom:5px; opacity:0.8;">${signal}</div>` : ""}
  `;
}


// ── Score rationale ("why not A") ────────────────────────────────────────────
function scoreRationale(scoring) {
  if (scoring.total >= 90) return null;
  // Read weights to scale thresholds proportionally
  let w = { dev: 30, engage: 25, momentum: 25, risk: 20 };
  try { const s = JSON.parse(localStorage.getItem("vshub_settings") || "{}"); if (s.weights) w = { ...w, ...s.weights }; } catch {}
  const needed = [];

  const devGap = 30 - scoring.pillars.development.score;
  const devImpact = (devGap / 30) * w.dev; // weighted points lost
  if (devImpact >= 8) {
    const sig = (scoring.pillars.development.signals || [])[0] || "";
    if (sig.toLowerCase().includes("fail")) needed.push("fix CI build");
    else if (sig.toLowerCase().includes("no recent") || sig.toLowerCase().includes("no commit")) needed.push("push commits");
    else if (devImpact >= 12) needed.push("improve dev health");
  }

  const momGap = 25 - scoring.pillars.momentum.score;
  const momImpact = (momGap / 25) * w.momentum;
  if (momImpact >= 11) needed.push("ship a release");

  const riskGap = 20 - scoring.pillars.risk.score;
  const riskImpact = (riskGap / 20) * w.risk;
  if (riskImpact >= 6) needed.push("close issues");

  const engGap = 25 - scoring.pillars.engagement.score;
  const engImpact = (engGap / 25) * w.engage;
  if (engImpact >= 14 && needed.length === 0) needed.push("drive engagement");

  return needed.length ? `Needs: ${needed.slice(0, 2).join(", ")}` : null;
}

// ── Quick win suggestion ──────────────────────────────────────────────────────
function quickWin(scoring, repoData) {
  const candidates = [];
  // Dev pillar
  const devScore = scoring.pillars.development.score;
  if (repoData?.ciRuns?.[0]?.conclusion === "failure") candidates.push({ action: "Fix CI build", pts: 15, pillar: "Dev" });
  else if (devScore < 20 && (repoData?.commits?.[0] ? ((Date.now() - new Date(repoData.commits[0].date).getTime()) / 86400000) > 7 : true)) candidates.push({ action: "Push commits", pts: 8, pillar: "Dev" });
  // Momentum pillar
  const momScore = scoring.pillars.momentum.score;
  if (!repoData?.latestRelease || (Date.now() - new Date(repoData.latestRelease.publishedAt).getTime()) > 90 * 86400000) {
    if (!repoData?.prs?.length) candidates.push({ action: "Ship a release", pts: 10, pillar: "Momt" });
  }
  if (!repoData?.prs?.length && momScore < 20) candidates.push({ action: "Open a PR", pts: 5, pillar: "Momt" });
  // Risk pillar
  const riskScore = scoring.pillars.risk.score;
  if (riskScore < 15 && (repoData?.repo?.openIssues || 0) > 5) candidates.push({ action: "Close issues", pts: 3, pillar: "Risk" });
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.pts - a.pts);
  const best = candidates[0];
  return `→ ${best.action} <span style="color:var(--green); font-size:9px; font-weight:700;">+${best.pts} ${best.pillar}</span>`;
}

// ── All-time score extremes ───────────────────────────────────────────────────
function getAllTimeScores(projectId, scoreHistory) {
  const vals = scoreHistory.map((h) => h.scores?.[projectId]).filter((v) => v != null);
  if (!vals.length) return null;
  return { high: Math.max(...vals), low: Math.min(...vals) };
}

// ── Time to grade A estimator ─────────────────────────────────────────────────
function estimateSessionsToA(projectId, scoreHistory, currentScore) {
  if (currentScore >= 90) return null;
  const recent = scoreHistory.slice(-4).map((h) => h.scores?.[projectId]).filter((v) => v != null);
  if (recent.length < 2) return null;
  const deltas = recent.slice(1).map((v, i) => v - recent[i]);
  const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  if (avg <= 0) return null;
  return Math.ceil((90 - currentScore) / avg);
}

// ── Score sparkline (SVG inline chart) ───────────────────────────────────────
function scoreSparkline(projectId, scoreHistory) {
  const points = scoreHistory
    .map((h) => h.scores?.[projectId])
    .filter((v) => v !== undefined && v !== null);
  if (points.length < 2) return "";
  const W = 56, H = 18;
  const min = Math.min(...points);
  const max = Math.max(...points, min + 1);
  const xs  = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys  = points.map((v) => H - ((v - min) / (max - min)) * H);
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const lastY = ys[ys.length - 1];
  const trend = points[points.length - 1] > points[0] ? "var(--green)"
    : points[points.length - 1] < points[0] ? "var(--red)" : "var(--muted)";
  return `<svg width="${W}" height="${H}" style="display:inline-block; vertical-align:middle; overflow:visible;"
    title="Score history: ${points.join(" → ")}">
    <polyline points="${pts}" fill="none" stroke="${trend}" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
    <circle cx="${W}" cy="${lastY.toFixed(1)}" r="2" fill="${trend}"/>
  </svg>`;
}

// ── Portfolio Sparkline ───────────────────────────────────────────────────────
function portfolioSparkline(scoreHistory) {
  const points = scoreHistory.map((h) => {
    const vals = PROJECTS.map((p) => h.scores?.[p.id]).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  }).filter((v) => v != null);
  if (points.length < 2) return "";
  const W = 80, H = 24;
  const min = Math.min(...points);
  const max = Math.max(...points, min + 1);
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((v) => H - ((v - min) / (max - min)) * H);
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const trend = points[points.length - 1] > points[0] ? "var(--green)" : points[points.length - 1] < points[0] ? "var(--red)" : "var(--muted)";
  const lastY = ys[ys.length - 1];
  return `<svg width="${W}" height="${H}" style="display:block; overflow:visible;" title="Portfolio avg history: ${points.join(" → ")}">
    <polyline points="${pts}" fill="none" stroke="${trend}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
    <circle cx="${W}" cy="${lastY.toFixed(1)}" r="2.5" fill="${trend}"/>
  </svg>`;
}



// ── Portfolio Health Score Gauge (SIL) ───────────────────────────────────────
// Composite studio-health metric: avg grade, CI rate, SIL coverage, OS compliance.
function renderPortfolioHealthGauge(allScores, ghData, studioOps = {}) {
  const { portfolioFreshness = {}, agentRequests = [], studioBrain = null } = studioOps;

  // Sub-metric 1: % projects scoring A (≥75)
  const gradeACount = allScores.filter(({ scoring }) => scoring.total >= 75).length;
  const gradeARate  = allScores.length ? Math.round((gradeACount / allScores.length) * 100) : 0;

  // Sub-metric 2: CI pass rate
  const reposWithCI    = Object.values(ghData).filter((d) => d?.ciRuns?.length > 0).length;
  const passingBuilds  = Object.values(ghData).filter((d) => d?.ciRuns?.[0]?.conclusion === "success").length;
  const ciRate         = reposWithCI > 0 ? Math.round((passingBuilds / reposWithCI) * 100) : null;

  // Sub-metric 3: SIL / compliance coverage (% projects with governance bonus signals)
  const silCount = allScores.filter(({ scoring }) =>
    scoring.pillars.risk.signals.some((s) => /SIL|Studio OS/i.test(s))
  ).length;
  const silRate = allScores.length ? Math.round((silCount / allScores.length) * 100) : 0;

  // Sub-metric 4: Agent ops health (freshness)
  const freshnessList = Object.values(portfolioFreshness).filter(Boolean);
  const agentOpsRate  = freshnessList.length
    ? Math.round((freshnessList.filter((f) => f.daysOld <= 14).length / freshnessList.length) * 100)
    : null;

  // Composite health: weighted average of available sub-metrics
  const available = [
    { label: "Projects A+",  pct: gradeARate,  weight: 0.35, color: "var(--green)" },
    { label: "CI passing",   pct: ciRate,       weight: 0.30, color: "var(--blue)" },
    { label: "SIL coverage", pct: silRate,      weight: 0.20, color: "#c084fc" },
    { label: "Agent ops",    pct: agentOpsRate, weight: 0.15, color: "var(--gold)" },
  ].filter((m) => m.pct !== null);

  const totalWeight = available.reduce((s, m) => s + m.weight, 0);
  const composite = totalWeight > 0
    ? Math.round(available.reduce((s, m) => s + m.pct * m.weight, 0) / totalWeight)
    : 0;

  const gaugeColor = composite >= 80 ? "var(--green)" : composite >= 60 ? "var(--gold)" : "var(--red)";

  // SVG arc gauge (180° semi-circle)
  const R = 42, CX = 56, CY = 52;
  const startAngle = Math.PI;
  const sweep = (composite / 100) * Math.PI;
  const endAngle = startAngle + sweep;
  const x1 = CX + R * Math.cos(startAngle), y1 = CY + R * Math.sin(startAngle);
  const x2 = CX + R * Math.cos(endAngle),   y2 = CY + R * Math.sin(endAngle);
  const largeArc = sweep > Math.PI ? 1 : 0;

  const gaugeSvg = `
    <svg width="112" height="60" viewBox="0 0 112 60" style="display:block; overflow:visible;">
      <path d="M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}"
            fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="8" stroke-linecap="round"/>
      ${composite > 0 ? `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"
            fill="none" stroke="${gaugeColor}" stroke-width="8" stroke-linecap="round" opacity="0.9"/>` : ""}
      <text x="${CX}" y="${CY - 2}" text-anchor="middle" font-size="18" font-weight="800"
            fill="${gaugeColor}" font-family="monospace">${composite}%</text>
      <text x="${CX}" y="${CY + 10}" text-anchor="middle" font-size="9" fill="var(--muted)"
            font-family="monospace" letter-spacing="0.06em">HEALTH</text>
    </svg>`;

  return `
    <div class="panel" style="margin-bottom:20px;">
      <div class="panel-header">
        <span class="panel-title">PORTFOLIO HEALTH</span>
        <span style="font-size:10px; color:var(--muted);">${allScores.length} projects · composite</span>
      </div>
      <div class="panel-body" style="display:flex; align-items:center; gap:24px; flex-wrap:wrap;">
        <div style="flex-shrink:0;">${gaugeSvg}</div>
        <div style="flex:1; min-width:180px;">
          ${available.map(({ label, pct, color }) => `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:7px;">
              <span style="font-size:11px; color:var(--muted); min-width:90px; flex-shrink:0;">${label}</span>
              <div style="flex:1; height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden;">
                <div style="width:${pct}%; height:100%; background:${color}; border-radius:2px;"></div>
              </div>
              <span style="font-size:11px; font-weight:700; color:${color}; min-width:32px; text-align:right;">${pct}%</span>
            </div>
          `).join("")}
          ${agentRequests.length > 0 ? `<div style="font-size:10px; color:var(--gold); margin-top:4px;">${agentRequests.length} pending agent request${agentRequests.length > 1 ? "s" : ""}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}

// ── First-run Onboarding Banner ───────────────────────────────────────────────
function renderOnboardingBanner(ghData, settings) {
  const anyData = Object.values(ghData).some((v) => v !== null);
  if (anyData) return "";
  return `
    <div style="
      background:rgba(122,231,199,0.07); border:1px solid rgba(122,231,199,0.25);
      border-radius:12px; padding:20px 24px; margin-bottom:20px;
      display:flex; align-items:flex-start; gap:16px;
    ">
      <div style="font-size:28px; line-height:1;">⚡</div>
      <div style="flex:1;">
        <div style="font-size:14px; font-weight:700; color:var(--cyan); margin-bottom:6px;">Welcome to VaultSpark Studio Hub</div>
        <div style="font-size:13px; color:var(--text); line-height:1.6; margin-bottom:12px;">
          Add your GitHub token to unlock live project data. YouTube and Gumroad keys are optional.
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="open-hub-btn" data-view="settings" style="font-size:12px; color:var(--cyan); border-color:var(--cyan);">→ Open Settings</button>
          <button id="onboarding-modal-btn" style="font-size:12px; padding:6px 14px; background:none; border:1px solid var(--border); border-radius:6px; color:var(--muted); cursor:pointer;">? Setup Guide</button>
        </div>
      </div>
    </div>
  `;
}

// ── "What Changed Since Last Visit" Banner (#10) ─────────────────────────────
function renderVisitDiffPanel(scoreHistory, prevLastOpened) {
  if (!prevLastOpened) return "";
  const diffs = getVisitDiff(scoreHistory, prevLastOpened);
  if (!diffs.length) return "";

  const elapsed = Date.now() - Number(prevLastOpened);
  const hours = Math.round(elapsed / 3600000);
  const timeStr = hours < 1 ? "< 1 hour ago" : hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;

  const gainers  = diffs.filter((d) => d.delta > 0);
  const droppers = diffs.filter((d) => d.delta < 0);

  return `
    <div style="background:rgba(105,179,255,0.04); border:1px solid rgba(105,179,255,0.18);
                border-radius:12px; padding:14px 18px; margin-bottom:16px;">
      <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
                  color:var(--blue); margin-bottom:10px; display:flex; align-items:center; gap:10px;">
        SINCE YOUR LAST VISIT
        <span style="font-size:10px; font-weight:400; color:var(--muted); text-transform:none; letter-spacing:0;">${timeStr}</span>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${gainers.map((d) => `
          <div style="display:flex; align-items:center; gap:5px; background:rgba(106,227,178,0.08);
                      border:1px solid rgba(106,227,178,0.18); border-radius:8px; padding:4px 10px;">
            <span style="font-size:12px; font-weight:600; color:var(--text);">${d.project.name}</span>
            <span style="font-size:12px; color:var(--green); font-weight:700;">+${d.delta}</span>
            <span style="font-size:11px; color:var(--muted);">${d.prev}→${d.curr}</span>
          </div>`).join("")}
        ${droppers.map((d) => `
          <div style="display:flex; align-items:center; gap:5px; background:rgba(248,113,113,0.06);
                      border:1px solid rgba(248,113,113,0.18); border-radius:8px; padding:4px 10px;">
            <span style="font-size:12px; font-weight:600; color:var(--text);">${d.project.name}</span>
            <span style="font-size:12px; color:var(--red); font-weight:700;">${d.delta}</span>
            <span style="font-size:11px; color:var(--muted);">${d.prev}→${d.curr}</span>
          </div>`).join("")}
      </div>
    </div>
  `;
}

// ── "What Changed This Session" Diff Banner ───────────────────────────────────
function renderSessionDiffBanner(allScores, scorePrev, scoreHistory) {
  if (!scorePrev || !Object.keys(scorePrev).length) return "";
  if (scoreHistory.length < 2) return "";

  const changes = allScores
    .map(({ project, scoring }) => {
      const prev = scorePrev[project.id];
      if (prev == null) return null;
      const delta = scoring.total - prev;
      if (Math.abs(delta) < 3) return null; // ignore noise
      return { project, curr: scoring.total, prev, delta, grade: scoring.grade, gradeColor: scoring.gradeColor };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  if (!changes.length) return "";

  const gainers  = changes.filter((c) => c.delta > 0);
  const droppers = changes.filter((c) => c.delta < 0);

  return `
    <div style="
      background:rgba(105,179,255,0.05); border:1px solid rgba(105,179,255,0.2);
      border-radius:12px; padding:14px 18px; margin-bottom:20px;
    ">
      <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--blue); margin-bottom:10px;">
        WHAT CHANGED THIS SESSION
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${gainers.map((c) => `
          <div style="display:flex; align-items:center; gap:5px; background:rgba(106,227,178,0.1); border:1px solid rgba(106,227,178,0.2); border-radius:8px; padding:4px 10px;">
            <span style="font-size:12px; font-weight:600; color:var(--text);">${c.project.name}</span>
            <span style="font-size:12px; color:var(--green); font-weight:700;">+${c.delta}</span>
            <span style="font-size:11px; color:var(--muted);">${c.prev}→${c.curr}</span>
          </div>
        `).join("")}
        ${droppers.map((c) => `
          <div style="display:flex; align-items:center; gap:5px; background:rgba(248,113,113,0.07); border:1px solid rgba(248,113,113,0.2); border-radius:8px; padding:4px 10px;">
            <span style="font-size:12px; font-weight:600; color:var(--text);">${c.project.name}</span>
            <span style="font-size:12px; color:var(--red); font-weight:700;">${c.delta}</span>
            <span style="font-size:11px; color:var(--muted);">${c.prev}→${c.curr}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Offline Banner ────────────────────────────────────────────────────────────
function renderOfflineBanner() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return `
      <div style="background:rgba(248,113,113,0.10); border:1px solid rgba(248,113,113,0.3);
        border-radius:10px; padding:10px 16px; margin-bottom:16px; font-size:12px; color:#f87171;
        display:flex; align-items:center; gap:10px;">
        <span>⚠</span> <span>You appear to be offline. Hub data may be stale — reconnect to refresh.</span>
      </div>
    `;
  }
  return "";
}

// ── Score confidence sigma (based on recent history variance) ─────────────────
function getForecastSigma(projectId, scoreHistory) {
  const scores = scoreHistory.slice(-6).map((h) => h.scores?.[projectId]).filter((v) => v != null);
  if (scores.length < 3) return null;
  const deltas = scores.slice(1).map((v, i) => v - scores[i]);
  const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const variance = deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / deltas.length;
  return Math.max(1, Math.round(Math.sqrt(variance)));
}

// ── GitHub Platform Status Banner (#8) ────────────────────────────────────────
function renderGithubStatusBanner(githubStatusAlert) {
  if (!githubStatusAlert) return "";
  return `
    <div style="background:rgba(255,200,116,0.08); border:1px solid rgba(255,200,116,0.3);
                border-radius:10px; padding:10px 16px; margin-bottom:12px;
                display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <span style="color:var(--gold); font-weight:800; font-size:13px; flex-shrink:0;">⚠ GITHUB STATUS</span>
      <span style="color:var(--text); font-size:13px; flex:1;">${githubStatusAlert}</span>
      <a href="https://www.githubstatus.com/" target="_blank" rel="noopener"
         style="color:var(--muted); font-size:11px; flex-shrink:0;">githubstatus.com →</a>
    </div>`;
}

// ── Sync Error Banner ─────────────────────────────────────────────────────────
function renderSyncErrorBanner(syncStatus, syncError) {
  if (!syncError) return "";
  const isHard = syncStatus === "error";
  const bg     = isHard ? "rgba(248,113,113,0.10)" : "rgba(255,200,116,0.08)";
  const border = isHard ? "rgba(248,113,113,0.35)" : "rgba(255,200,116,0.3)";
  const color  = isHard ? "#f87171" : "var(--gold)";
  const icon   = isHard ? "⚠ SYNC FAILED" : "⚠ SYNC DEGRADED";
  return `
    <div style="
      background:${bg}; border:1px solid ${border}; border-radius:10px;
      padding:11px 18px; margin-bottom:16px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;
    ">
      <span style="color:${color}; font-weight:800; font-size:13px; flex-shrink:0;">${icon}</span>
      <span style="color:var(--text); font-size:13px; flex:1;">${syncError}</span>
      <span style="color:var(--muted); font-size:11px; flex-shrink:0;">Check Settings → GitHub token</span>
    </div>
  `;
}

// ── CI Critical Banner ────────────────────────────────────────────────────────
function renderCriticalBanner(ghData) {
  const failing = PROJECTS.filter((p) => ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "failure");
  if (!failing.length) return "";
  return `
    <div style="
      background:rgba(248,113,113,0.10); border:1px solid rgba(248,113,113,0.35);
      border-radius:10px; padding:11px 18px; margin-bottom:16px;
      display:flex; align-items:center; gap:12px; flex-wrap:wrap;
    ">
      <span style="color:#f87171; font-weight:800; font-size:13px; flex-shrink:0;">⚠ CI FAILING</span>
      <span style="color:var(--text); font-size:13px; flex:1;">${failing.map((p) => p.name).join(", ")}</span>
      <span style="color:var(--muted); font-size:11px; flex-shrink:0;">Open project hub for details</span>
    </div>
  `;
}

// ── Hub Self-Monitor ──────────────────────────────────────────────────────────
function renderHubSelfMonitor(syncMeta) {
  if (!syncMeta) return "";
  const sources = [
    { label: "GitHub",   ts: syncMeta.gh },
    { label: "Supabase", ts: syncMeta.sb },
    { label: "Social",   ts: syncMeta.social },
  ];
  const cacheNote = (syncMeta.totalRepos > 0)
    ? (syncMeta.cachedRepos > 0
        ? `<span style="font-size:11px; color:var(--muted);" title="${syncMeta.cachedRepos} repos served from cache · ${syncMeta.freshRepos} fetched fresh">${syncMeta.cachedRepos}/${syncMeta.totalRepos} cached</span>`
        : `<span style="font-size:11px; color:var(--muted);">all ${syncMeta.totalRepos} fresh</span>`)
    : "";
  return `
    <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px; align-items:center;">
      ${sources.map((s) => {
        if (!s.ts) return `<span style="font-size:11px; color:var(--muted);">${s.label}: —</span>`;
        const mins  = Math.floor((Date.now() - s.ts) / 60000);
        const color = mins > 30 ? "var(--red)" : mins > 10 ? "var(--gold)" : "var(--muted)";
        const label = mins < 1 ? "just now" : `${mins}m ago`;
        return `<span style="font-size:11px; color:${color};">${s.label}: ${label}</span>`;
      }).join("")}
      ${cacheNote}
    </div>
  `;
}

// ── Refresh Cost Estimator ────────────────────────────────────────────────────
function renderRefreshCostBadge() {
  const projCount = PROJECTS.filter((p) => p.githubRepo).length;
  const apiCalls  = projCount * 7 + 3; // 7 per repo (repo+commits+issues+prs+runs+release+deployments) + org events + context files + beacon
  return `<span style="font-size:11px; color:var(--muted); white-space:nowrap;">~${apiCalls} calls/sync</span>`;
}

// ── Rate Limit Badge ──────────────────────────────────────────────────────────
function renderRateLimitBadge(rateLimitInfo) {
  const { remaining, limit } = rateLimitInfo || {};
  if (remaining === null || remaining === undefined) return "";
  const color = remaining < 100 ? "var(--red)" : remaining < 500 ? "var(--gold)" : "var(--muted)";
  return `<span style="font-size:11px; color:${color}; white-space:nowrap;">API ${fmt(remaining)}/${fmt(limit ?? 5000)}</span>`;
}


// ── Commit Heatmap (7-day strip) ──────────────────────────────────────────────
function commitHeatmap(commits) {
  const buckets = new Array(7).fill(0);
  const now = Date.now();
  for (const c of (commits || [])) {
    const days = Math.floor((now - new Date(c.date).getTime()) / 86400000);
    if (days < 7) buckets[6 - days]++;
  }
  const max = Math.max(...buckets, 1);
  return `
    <div style="display:flex; gap:2px; align-items:flex-end; height:16px;" title="Commit activity — last 7 days">
      ${buckets.map((n, i) => {
        const h   = Math.round((n / max) * 16);
        const op  = n === 0 ? 0.12 : 0.3 + (n / max) * 0.7;
        const day = ["7d","6d","5d","4d","3d","2d","1d"][i];
        return `<div title="${n} commit${n !== 1 ? "s" : ""} ${day} ago" style="
          width:6px; height:${Math.max(h, 2)}px; background:var(--cyan);
          opacity:${op}; border-radius:1px; align-self:flex-end;
        "></div>`;
      }).join("")}
    </div>
  `;
}

// ── Project Card ──────────────────────────────────────────────────────────────
function renderProjectCard(project, ghData, sbData, socialData, settings, scorePrev, scoreHistory, scoreForecasts, decayingIds, focusMode, cardIndex, rankMap = {}, fetchErrors = {}, contextFiles = {}, compactCards = false, bulkTagMode = false) {
  const repoData   = ghData[project.githubRepo] || null;
  const scoring    = scoreProject(project, repoData, sbData, socialData);
  const ci         = ciStatus(repoData?.ciRuns);
  const lastCommit = repoData?.commits?.[0];
  const sessions   = sbData?.sessions?.[project.supabaseGameSlug];
  const showScores = settings?.showScores !== false;
  const prevScore  = scorePrev?.[project.id] ?? null;
  const forecast   = scoreForecasts?.[project.id];
  const forecastUncertain = forecast !== undefined ? isForecastHighVariance(scoreHistory, project.id) : false;
  const isDecay    = decayingIds?.includes(project.id);
  const sprint     = loadSprint();
  const isSprint   = sprint?.projectId === project.id;
  const goals      = loadGoals();
  const _goalRaw   = goals[project.id] || null;
  const goalGrade  = typeof _goalRaw === "string" ? _goalRaw : (_goalRaw?.grade || null);
  const allTime    = getAllTimeScores(project.id, scoreHistory);
  const velocity   = commitVelocity(repoData?.commits);
  const prevCi  = scoreHistory.length >= 2 ? (scoreHistory[scoreHistory.length - 2].ci?.[project.id] ?? null) : null;
  const currCi  = repoData?.ciRuns?.[0]?.conclusion ?? null;
  const sessionsToA = showScores ? estimateSessionsToA(project.id, scoreHistory, scoring.total) : null;
  const hotStreak  = computeHotStreak(repoData?.commits);
  const rationale  = showScores ? scoreRationale(scoring) : null;
  const rank       = rankMap[project.id] ?? null;
  const fetchError = !repoData ? (fetchErrors[project.githubRepo] || null) : null;
  const statusJson    = contextFiles[project.id]?.statusJson || null;
  const externalPhase = statusJson?.phase || statusJson?.current_phase || statusJson?.stage || null;
  const starBaseline = (() => { try { return JSON.parse(sessionStorage.getItem("vshub_star_baseline") || "{}"); } catch { return {}; } })();
  const baseStars = starBaseline[project.githubRepo]?.stars ?? null;
  const starDelta = baseStars !== null && repoData?.repo?.stars != null ? repoData.repo.stars - baseStars : null;

  // Issue trend
  const prevIssues = scoreHistory.length >= 2 ? (scoreHistory[scoreHistory.length - 2].issues?.[project.id] ?? null) : null;
  const currIssues = repoData?.repo?.openIssues ?? null;
  const issueTrend = (prevIssues !== null && currIssues !== null && prevIssues !== currIssues)
    ? (currIssues > prevIssues
        ? `<span style="color:var(--red); font-size:10px; font-weight:700;">↑</span>`
        : `<span style="color:var(--green); font-size:10px; font-weight:700;">↓</span>`)
    : "";

  // Pin state
  const isPinned = loadPinned().has(project.id);
  const annotation = loadAnnotations()[project.id] || "";

  // Staleness
  const commitDays = lastCommit ? daysSince(lastCommit.date) : Infinity;
  const staleColor = stalenessColor(commitDays);
  const isStale    = commitDays > 14;
  const isDormant  = commitDays > 60;

  // Focus mode: skip project if it's healthy (no alerts)
  if (focusMode) {
    const hasCiFail = repoData?.ciRuns?.[0]?.conclusion === "failure";
    const hasLowScore = scoring.total <= 45;
    const hasStale = commitDays > 14;
    if (!hasCiFail && !hasLowScore && !hasStale) return "";
  }

  if (compactCards) {
    return `
      <div class="project-card" style="--project-color:${project.color}; padding:10px 14px; display:flex; align-items:center; gap:12px; min-height:0;"
           data-view="project:${project.id}" data-project-index="${cardIndex ?? ""}">
        ${bulkTagMode ? `<input type="checkbox" data-bulk-project-id="${project.id}" onclick="event.stopPropagation()" style="flex-shrink:0; accent-color:var(--cyan);" />` : ""}
        <div style="width:8px; height:8px; border-radius:50%; background:${project.color}; flex-shrink:0;"></div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:13px; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${project.name}</div>
          <div style="font-size:11px; color:var(--muted);">${project.statusLabel}</div>
        </div>
        <div style="font-size:18px; font-weight:800; color:${scoring.gradeColor}; flex-shrink:0;">${scoring.total}</div>
        <div style="font-size:13px; font-weight:700; color:${scoring.gradeColor}; flex-shrink:0;">${scoring.grade}</div>
      </div>
    `;
  }

  return `
    <div class="project-card" style="--project-color:${project.color}${isDecay ? "; outline:1px solid rgba(248,113,113,0.3);" : ""}${isSprint ? "; outline:2px solid rgba(122,231,199,0.4);" : ""}${isDormant ? "; opacity:0.55; filter:saturate(0.4);" : ""}"
         data-view="project:${project.id}" data-project-index="${cardIndex ?? ""}">

      ${isSprint ? `<div style="background:rgba(122,231,199,0.07); margin:-14px -14px 10px; padding:4px 14px;
        border-bottom:1px solid rgba(122,231,199,0.15); font-size:10px; font-weight:700; color:var(--cyan);
        letter-spacing:0.06em; display:flex; align-items:center; gap:6px;">
        ⚡ SPRINT FOCUS${sprint.goal ? ` — ${sprint.goal.slice(0,40)}` : ""}
      </div>` : ""}

      <div class="project-card-header">
        ${bulkTagMode ? `<input type="checkbox" data-bulk-project-id="${project.id}" onclick="event.stopPropagation()" style="flex-shrink:0; margin-right:4px; accent-color:var(--cyan);" />` : ""}
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="project-card-name" style="flex:1; min-width:0;">${project.name}</div>
            <button data-pin-project="${project.id}" title="${isPinned ? "Unpin" : "Pin"} project"
              style="background:none; border:none; cursor:pointer; padding:2px; font-size:13px; line-height:1;
                     color:${isPinned ? "var(--gold)" : "rgba(255,255,255,0.2)"}; flex-shrink:0;
                     transition:color 0.15s;"
            >📌</button>
          </div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:4px; flex-wrap:wrap;">
            <span class="project-status-pill ${project.status}" style="margin:0;">${project.statusLabel}</span>
            <span class="project-card-type ${project.type}">${project.type}</span>
            ${externalPhase ? `<span style="font-size:9px; padding:2px 5px; border-radius:4px; background:rgba(122,231,199,0.08); color:var(--cyan); font-weight:700; letter-spacing:0.04em; border:1px solid rgba(122,231,199,0.2);" title="Phase from PROJECT_STATUS.json">${externalPhase.toUpperCase()}</span>` : ""}
            ${isDecay ? `<span style="font-size:9px; color:var(--red); font-weight:700; letter-spacing:0.05em;">↓ DECLINING</span>` : ""}
            ${isDormant ? `<span style="font-size:9px; color:var(--muted); font-weight:700; letter-spacing:0.05em; padding:1px 4px; background:rgba(255,255,255,0.05); border-radius:3px;">DORMANT</span>` : ""}
            ${hotStreak >= 3 ? `<span style="font-size:9px; color:var(--gold); font-weight:700; letter-spacing:0.04em;" title="${hotStreak} consecutive days with commits">🔥${hotStreak}d</span>` : ""}
            ${goalGrade ? `<span style="font-size:9px; padding:2px 5px; border-radius:4px; background:rgba(105,179,255,0.1); color:var(--blue); font-weight:700; letter-spacing:0.04em;" title="Target grade: ${goalGrade}">↗${goalGrade}</span>` : ""}
          </div>
        </div>
        ${showScores ? `
          <div style="text-align:center; flex-shrink:0;">
            <div style="font-size:22px; font-weight:800; color:${scoring.gradeColor}; line-height:1;"
              title="A+ ≥85 · A ≥75 · B+ ≥65 · B ≥55 · C+ ≥45 · C ≥35 · D ≥25 · F <25"
            >
              ${scoring.total}${deltaBadge(scoring.total, prevScore)}
            </div>
            <div style="font-size:11px; font-weight:700; color:${scoring.gradeColor};"
              title="A+: ≥85 · A: ≥75 · B+: ≥65 · B: ≥55 · C+: ≥45 · C: ≥35 · D: ≥25 · F: <25"
            >${scoring.grade}</div>
            ${forecast !== undefined ? `<div style="font-size:10px; color:var(--muted);" title="${forecastUncertain ? "High variance — forecast uncertain" : "Forecasted next score"}">→ ${forecast}${forecastUncertain ? "?" : ""}</div>` : ""}
            ${(() => {
              const sigma = getForecastSigma(project.id, scoreHistory);
              return sigma !== null ? `<div style="font-size:9px; color:var(--muted); margin-top:1px; font-variant-numeric:tabular-nums;" title="Score confidence range — ±${sigma} pts based on recent history variance">±${sigma}</div>` : "";
            })()}
            <div style="margin-top:3px;">${scoreSparkline(project.id, scoreHistory)}</div>
            ${allTime ? `<div style="font-size:9px; color:var(--muted); margin-top:2px;" title="All-time high/low">H:${allTime.high} L:${allTime.low}</div>` : ""}
            ${sessionsToA ? `<div style="font-size:9px; color:var(--blue); margin-top:1px;" title="Estimated sessions to reach grade A at current trend">~${sessionsToA}s→A</div>` : ""}
            ${rank !== null ? `<div style="font-size:9px; color:var(--muted); margin-top:1px;" title="Rank in portfolio">#${rank}/${PROJECTS.length}</div>` : ""}
            ${(() => {
              const pot = scorePotential(project, repoData, socialData, scoreHistory);
              const mom = scoreMomentumIndex(project, repoData, scoreHistory);
              const pl = potentialLabel(pot);
              const ml = momentumLabel(mom);
              return `
                <div style="display:flex; gap:4px; justify-content:center; margin-top:4px; flex-wrap:wrap;">
                  <span style="font-size:9px; color:${pl.color}; font-weight:700; padding:1px 5px; border-radius:4px; background:${pl.color}18; border:1px solid ${pl.color}30; white-space:nowrap;"
                    title="Potential Score ${pot}/100 — measures upside: score trajectory, community traction, market readiness, dev acceleration">${pl.label} ${pot}</span>
                  <span style="font-size:9px; color:${ml.color}; font-weight:700; padding:1px 5px; border-radius:4px; background:${ml.color}18; border:1px solid ${ml.color}30; white-space:nowrap;"
                    title="Momentum Index ${mom}/100 — measures current velocity: commit speed, CI streak, PR activity, release recency">${ml.label} ${mom}</span>
                </div>
              `;
            })()}
            ${(() => {
              const lastC = repoData?.commits?.[0];
              if (!lastC) return "";
              const days = daysSince(lastC.date);
              if (days < 5 || days > 13 || scoring.total <= 20) return "";
              return `<div style="font-size:10px; color:var(--muted); margin-top:2px; opacity:0.7;">⏳ stale in ${14 - Math.floor(days)}d if no commits</div>`;
            })()}
            <button data-score-explain="${project.id}" title="Explain this score"
              style="font-size:9px; color:rgba(255,255,255,0.3); background:none; border:none; cursor:pointer; padding:1px 4px; margin-top:2px; transition:color 0.1s;"
              onmouseover="this.style.color='var(--cyan)'" onmouseout="this.style.color='rgba(255,255,255,0.3)'"
            >Why?</button>
          </div>
        ` : ""}
      </div>

      ${showScores ? `
        <div style="margin:12px 0 4px;">
          ${scoreBar(scoring.pillars.development.score, 30, "#69b3ff", "Dev",    scoring.pillars.development.signals[0] || "", "Development (0–30): CI status + commit recency. CI passing=+15, commit today=+15.")}
          ${scoreBar(scoring.pillars.engagement.score,  25, "#7ae7c7", "Engage", scoring.pillars.engagement.signals[0]  || "", "Engagement (0–25): game sessions this week, social reach, deployed status.")}
          ${scoreBar(scoring.pillars.momentum.score,    25, "#ffc874", "Momt",   scoring.pillars.momentum.signals[0]    || "", "Momentum (0–25): open PRs (+8), recent release (+10), project status bonus.")}
          ${scoreBar(scoring.pillars.risk.score,        20, "#6ae3b2", "Risk",   scoring.pillars.risk.signals[0]        || "", "Risk (0–20): starts at 20, deducted for open issues, CI failures, inactivity. Higher = healthier.")}
        </div>
        ${rationale ? `<div style="font-size:10px; color:var(--muted); margin-bottom:6px; padding:3px 6px; background:rgba(255,255,255,0.03); border-radius:4px; border-left:2px solid rgba(255,200,116,0.3); opacity:0.9; font-style:italic;">${rationale}<a data-view="settings" style="font-size:10px; color:var(--cyan); opacity:0.7; text-decoration:none; margin-left:4px; cursor:pointer;">→ weights</a></div>` : ""}
        ${showScores && repoData ? (() => {
          const win = quickWin(scoring, repoData);
          return win ? `<div style="font-size:10px; color:var(--cyan); margin-bottom:6px; padding:3px 6px; background:rgba(122,231,199,0.06); border-radius:4px; border-left:2px solid rgba(122,231,199,0.25);">${win}</div>` : "";
        })() : ""}
        <div style="margin-bottom:8px;">${commitHeatmap(repoData?.commits)}</div>
      ` : ""}

      <div class="project-card-rows">
        ${repoData ? `
          <div class="project-card-row">
            <span class="row-label">CI</span>
            <span class="row-value" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span class="ci-badge ${ci.cls}">${ci.label}</span>
              ${(() => {
                const staleMs = repoData?.commits?.[0] ? (Date.now() - new Date(repoData.commits[0].date).getTime()) : null;
                const staleDays = staleMs !== null ? Math.floor(staleMs / 86400000) : null;
                return staleDays === null ? ""
                  : staleDays >= 60 ? `<span style="font-size:9px; font-weight:800; letter-spacing:0.05em; padding:2px 6px; border-radius:4px; background:rgba(248,113,113,0.18); color:var(--red); border:1px solid rgba(248,113,113,0.3);">DORMANT</span>`
                  : staleDays >= 50 ? `<span style="font-size:9px; font-weight:800; letter-spacing:0.05em; padding:2px 6px; border-radius:4px; background:rgba(255,200,116,0.15); color:var(--gold); border:1px solid rgba(255,200,116,0.25);">STALE ${staleDays}d <span style="color:var(--red); opacity:0.7;">${60 - staleDays}d→💀</span></span>`
                  : staleDays >= 14 ? `<span style="font-size:9px; font-weight:800; letter-spacing:0.05em; padding:2px 6px; border-radius:4px; background:rgba(255,200,116,0.15); color:var(--gold); border:1px solid rgba(255,200,116,0.25);">STALE ${staleDays}d</span>`
                  : "";
              })()}
            </span>
          </div>
          <div class="project-card-row">
            <span class="row-label">Issues</span>
            <span class="row-value">${fmt(repoData.repo?.openIssues)}${issueTrend} open · ${fmt(repoData.prs?.length)} PRs</span>
          </div>
          ${(() => {
            const issues = repoData.issues || [];
            if (!issues.length) return "";
            const labelCounts = {};
            for (const issue of issues) {
              for (const label of (issue.labels || [])) {
                const normalized = label.toLowerCase();
                const key = normalized.includes("bug") ? "bug"
                  : normalized.includes("feature") || normalized.includes("enhancement") || normalized.includes("feat") ? "feature"
                  : normalized.includes("docs") || normalized.includes("documentation") ? "docs"
                  : null;
                if (key) labelCounts[key] = (labelCounts[key] || 0) + 1;
              }
            }
            const parts = [];
            if (labelCounts.bug)     parts.push(`<span style="color:#f87171;">${labelCounts.bug} bug${labelCounts.bug > 1 ? "s" : ""}</span>`);
            if (labelCounts.feature) parts.push(`<span style="color:#69b3ff;">${labelCounts.feature} feature${labelCounts.feature > 1 ? "s" : ""}</span>`);
            if (labelCounts.docs)    parts.push(`<span style="color:var(--muted);">${labelCounts.docs} docs</span>`);
            if (!parts.length) return "";
            return `<div class="project-card-row"><span class="row-label">Labels</span><span class="row-value" style="font-size:10px;">${parts.join(" · ")}</span></div>`;
          })()}
          <div class="project-card-row">
            <span class="row-label">Stars / Forks</span>
            <span class="row-value">${fmt(repoData.repo?.stars)} ★ · ${fmt(repoData.repo?.forks)} forks${starDelta !== null && starDelta !== 0 ? ` <span style="font-size:10px; font-weight:700; color:${starDelta > 0 ? "var(--gold)" : "var(--red)"}; white-space:nowrap;">★ ${starDelta > 0 ? "+" : ""}${starDelta}</span>` : ""}</span>
          </div>
          <div class="project-card-row" title="Commits: this week vs last week">
            <span class="row-label">Velocity</span>
            <span class="row-value">
              ${velocity.thisWeek} this wk
              ${velocity.thisWeek > velocity.lastWeek
                ? `<span style="color:var(--green); font-size:10px; font-weight:700;"> ↑</span>`
                : velocity.thisWeek < velocity.lastWeek
                  ? `<span style="color:var(--red); font-size:10px; font-weight:700;"> ↓</span>`
                  : ""}
              <span style="color:var(--muted); font-size:10px;"> (${velocity.lastWeek} last)</span>
            </span>
          </div>
          ${lastCommit ? `
            <div class="project-card-row">
              <span class="row-label">Last Push</span>
              <span class="row-value" style="color:${staleColor};">
                ${timeAgo(lastCommit.date)}${isStale ? " ⚠" : ""} — ${lastCommit.message.slice(0, 36)}${lastCommit.message.length > 36 ? "…" : ""}
              </span>
            </div>
          ` : `
            <div class="project-card-row">
              <span class="row-label">Last Push</span>
              <span class="row-value" style="color:var(--red);">No commits</span>
            </div>
          `}
          ${repoData.latestRelease ? `
            <div class="project-card-row">
              <span class="row-label">Release</span>
              <span class="row-value" style="color:var(--blue);">${repoData.latestRelease.tag} · ${timeAgo(repoData.latestRelease.publishedAt)}</span>
            </div>
          ` : ""}
          ${repoData.deployments?.length ? `
            <div class="project-card-row">
              <span class="row-label">Deployed</span>
              <span class="row-value" style="color:var(--green);">
                ${timeAgo(repoData.deployments[0].createdAt)}
                <span style="font-size:10px; color:var(--muted); margin-left:4px;">${repoData.deployments[0].environment || ""}</span>
              </span>
            </div>
          ` : ""}
          ${repoData?.milestones?.length ? (() => {
            const m = repoData.milestones.find((ms) => ms.openIssues > 0) || repoData.milestones[0];
            if (!m) return "";
            const overdue = m.dueOn && Date.now() > new Date(m.dueOn).getTime();
            return `
              <div class="project-card-row">
                <span class="row-label">Milestone</span>
                <span class="row-value" style="color:${overdue ? "var(--red)" : "var(--muted)"};">
                  ${m.title.slice(0, 24)}${m.title.length > 24 ? "…" : ""} · ${m.progress}%
                  ${overdue ? `<span style="font-size:9px; color:var(--red); font-weight:700; margin-left:3px;">OVERDUE</span>` : ""}
                </span>
              </div>
            `;
          })() : ""}
        ` : `
          <div class="project-card-row">
            <span style="font-size:11px; color:var(--muted);">
              ${fetchError === "no_token" ? "No GitHub token — add in Settings" :
                fetchError === "token_invalid" ? "⚠ Token invalid — check Settings" :
                fetchError === "not_found" ? "Repo not found — check registry" :
                fetchError === "rate_limited" ? "⚠ API rate limited" :
                fetchError === "api_error" ? "GitHub API error" :
                project.githubRepo ? "No data — add GitHub token in Settings" : "No GitHub repo linked"}
            </span>
          </div>
        `}
        ${sessions ? `
          <div class="project-card-row">
            <span class="row-label">Sessions</span>
            <span class="row-value" style="color:var(--cyan);">${fmt(sessions.week)} this week · ${fmt(sessions.total)} total</span>
          </div>
        ` : ""}
        ${(prevScore !== null && scoring.total !== prevScore) || (prevCi !== null && currCi !== null && prevCi !== currCi) ? `
          <div class="project-card-row" title="Changes since last score snapshot">
            <span class="row-label">Δ Since sync</span>
            <span class="row-value" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              ${prevScore !== null && scoring.total !== prevScore ? `
                <span style="color:${scoring.total > prevScore ? "var(--green)" : "var(--red)"}; font-size:11px; font-weight:700;">
                  Score ${prevScore}→${scoring.total} (${scoring.total > prevScore ? "+" : ""}${scoring.total - prevScore})
                </span>
              ` : ""}
              ${prevCi !== null && currCi !== null && prevCi !== currCi ? `
                <span style="font-size:11px; color:${currCi === "success" ? "var(--green)" : currCi === "failure" ? "var(--red)" : "var(--muted)"}; font-weight:700;">
                  CI: ${prevCi}→${currCi}
                </span>
              ` : ""}
            </span>
          </div>
        ` : ""}
      </div>

      ${annotation ? `
        <div style="font-size:11px; color:var(--gold); margin-top:6px; padding:5px 8px;
                    background:rgba(255,200,116,0.06); border-radius:6px; border-left:2px solid rgba(255,200,116,0.3);
                    line-height:1.4; word-break:break-word;">
          ✎ ${annotation.length > 80 ? annotation.slice(0, 80) + "…" : annotation}
        </div>
      ` : ""}

      <div class="project-card-footer">
        ${project.deployedUrl
          ? `<a href="${project.deployedUrl}" target="_blank" rel="noopener" style="font-size:11px; color:var(--green);">↗ Live</a>`
          : `<span style="font-size:11px; color:var(--muted);">${project.description.slice(0, 36)}…</span>`
        }
        <div style="display:flex; gap:4px; align-items:center;">
          ${project.githubRepo ? `<a href="https://github.com/${project.githubRepo}" target="_blank" rel="noopener"
            title="Open GitHub repo" onclick="event.stopPropagation()"
            style="font-size:11px; color:var(--muted); padding:3px 7px; border:1px solid var(--border); border-radius:5px;
                   text-decoration:none; transition:color 0.1s; line-height:1.2; flex-shrink:0;"
            onmouseover="this.style.color='var(--cyan)'" onmouseout="this.style.color='var(--muted)'">GH</a>` : ""}
          ${project.deployedUrl ? `<a href="${project.deployedUrl}" target="_blank" rel="noopener"
            title="Open live app" onclick="event.stopPropagation()"
            style="font-size:11px; color:var(--muted); padding:3px 7px; border:1px solid var(--border); border-radius:5px;
                   text-decoration:none; transition:color 0.1s; line-height:1.2; flex-shrink:0;"
            onmouseover="this.style.color='var(--green)'" onmouseout="this.style.color='var(--muted)'">↗</a>` : ""}
          <button class="open-hub-btn" data-view="project:${project.id}">Hub →</button>
        </div>
      </div>
    </div>
  `;
}

// ── Project Section (tabbed) ──────────────────────────────────────────────────
function renderProjectSection(ghData, sbData, socialData, settings, activeTab, scorePrev, scoreHistory, focusMode, projectFilter, tagFilter = "", contextFiles = {}, compactCards = false, bulkTagMode = false) {
  const games     = PROJECTS.filter((p) => p.type === "game");
  const tools     = PROJECTS.filter((p) => p.type === "tool");
  const platforms = PROJECTS.filter((p) => p.type === "platform" || p.type === "app");
  const infra     = PROJECTS.filter((p) => p.type === "infrastructure");
  const dormant   = PROJECTS.filter((p) => {
    const d = ghData[p.githubRepo];
    const last = d?.commits?.[0];
    return last ? daysSince(last.date) > 60 : false;
  });

  const tabs = [
    { id: "games",     label: `Games (${games.length})`,         projects: games },
    { id: "tools",     label: `Tools (${tools.length})`,         projects: tools },
    ...(platforms.length ? [{ id: "platforms", label: `Platforms (${platforms.length})`, projects: platforms }] : []),
    { id: "infra",     label: `Infrastructure (${infra.length})`, projects: infra },
    ...(dormant.length ? [{ id: "dormant", label: `Dormant (${dormant.length})`, projects: dormant }] : []),
  ];

  // Compute rank map: rank each project by score across all projects
  const rankMap = {};
  const allRanked = PROJECTS.map((p) => ({
    id: p.id,
    score: scoreProject(p, ghData[p.githubRepo] || null, sbData, socialData).total,
  })).sort((a, b) => b.score - a.score);
  allRanked.forEach(({ id }, i) => { rankMap[id] = i + 1; });

  // Collect fetch errors
  const fetchErrors = {};
  for (const p of PROJECTS) {
    if (p.githubRepo) {
      const err = getFetchError(p.githubRepo);
      if (err) fetchErrors[p.githubRepo] = err;
    }
  }

  // Collect all tags for tag filter UI
  let allTagsMap = {};
  try { allTagsMap = JSON.parse(localStorage.getItem("vshub_tags") || "{}"); } catch {}
  const allTags = [...new Set(Object.values(allTagsMap).flat())].sort();

  const filterTerm = (projectFilter || "").toLowerCase().trim();
  const current = tabs.find((t) => t.id === activeTab) || tabs[0];
  let tabProjects = filterTerm
    ? PROJECTS.filter((p) =>
        p.name.toLowerCase().includes(filterTerm) ||
        p.type.toLowerCase().includes(filterTerm) ||
        p.status.toLowerCase().includes(filterTerm) ||
        p.description?.toLowerCase().includes(filterTerm))
    : current.projects;
  // Apply tag filter
  if (tagFilter) {
    tabProjects = tabProjects.filter((p) => (allTagsMap[p.id] || []).includes(tagFilter));
  }
  const sorted  = [...tabProjects].sort((a, b) => {
    const sa  = scoreProject(a, ghData[a.githubRepo] || null, sbData, socialData).total;
    const sb2 = scoreProject(b, ghData[b.githubRepo] || null, sbData, socialData).total;
    return sb2 - sa;
  });

  const scoreForecasts = forecastScores(scoreHistory);
  const decayingIds    = getDecayingProjects(scoreHistory, PROJECTS.map((p) => p.id));
  const pinnedSet      = loadPinned();

  const cards = sorted.map((p, i) =>
    renderProjectCard(p, ghData, sbData, socialData, settings, scorePrev, scoreHistory, scoreForecasts, decayingIds, focusMode, i, rankMap, fetchErrors, contextFiles, compactCards, bulkTagMode)
  ).join("");

  const visibleCount = sorted.filter((p) => {
    if (!focusMode) return true;
    const d = ghData[p.githubRepo];
    const sc = scoreProject(p, d || null, sbData, socialData);
    return d?.ciRuns?.[0]?.conclusion === "failure" || sc.total <= 45 || daysSince(d?.commits?.[0]?.date) > 14;
  }).length;

  const pinnedInTab = filterTerm ? [] : sorted.filter((p) => pinnedSet.has(p.id));

  // Pinned row — only show when not filtering
  const pinnedRow = pinnedInTab.length > 0 ? `
    <div style="margin-bottom:18px;">
      <div style="font-size:10px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase;
                  color:var(--gold); margin-bottom:10px; display:flex; align-items:center; gap:8px;">
        <span>📌 Pinned</span>
        <span style="flex:1; height:1px; background:rgba(255,200,116,0.2); display:inline-block;"></span>
      </div>
      <div class="project-grid">
        ${pinnedInTab.map((p) => renderProjectCard(p, ghData, sbData, socialData, settings, scorePrev, scoreHistory, scoreForecasts, decayingIds, false, null, rankMap, fetchErrors, contextFiles, compactCards, bulkTagMode)).join("")}
      </div>
    </div>
  ` : "";

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header" style="padding-bottom:0; border-bottom:none; flex-wrap:wrap; gap:8px;">
        <span class="panel-title">PROJECTS</span>
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; flex:1; justify-content:flex-end;">
          <input id="project-filter-input" type="text" placeholder="Filter projects…"
            value="${(projectFilter || "").replace(/"/g, "&quot;")}"
            style="font-size:12px; padding:5px 10px; border-radius:6px; border:1px solid var(--border);
                   background:rgba(12,19,31,0.6); color:var(--text); outline:none; width:160px;"
          />
          <button id="focus-mode-btn" style="
            font-size:11px; padding:5px 10px; border-radius:6px; cursor:pointer;
            background:${focusMode ? "rgba(255,200,116,0.15)" : "transparent"};
            border:1px solid ${focusMode ? "rgba(255,200,116,0.4)" : "var(--border)"};
            color:${focusMode ? "var(--gold)" : "var(--muted)"};
            transition:all 0.15s; white-space:nowrap;
          ">⚡ Focus${focusMode ? ` (${visibleCount})` : ""}</button>
          <button id="toggle-compact-cards" style="font-size:11px; padding:5px 10px; border-radius:6px; cursor:pointer;
            background:${compactCards ? "rgba(122,231,199,0.1)" : "none"};
            border:1px solid ${compactCards ? "var(--cyan)" : "var(--border)"};
            color:${compactCards ? "var(--cyan)" : "var(--muted)"}; white-space:nowrap;">⊟ Compact</button>
          ${!filterTerm ? `<div style="display:flex; gap:2px;">
            ${tabs.map((t) => `
              <button class="admin-tab ${t.id === current.id ? "active" : ""}"
                data-project-tab="${t.id}" style="font-size:12px; padding:7px 12px;">
                ${t.label}
              </button>
            `).join("")}
          </div>` : `<span style="font-size:11px; color:var(--cyan);">${sorted.length} result${sorted.length !== 1 ? "s" : ""}</span>`}
        </div>
      </div>
      ${allTags.length ? `
        <div style="display:flex; flex-wrap:wrap; gap:5px; align-items:center; padding:0 18px 12px; border-bottom:1px solid var(--border);">
          <span style="font-size:10px; color:var(--muted); font-weight:700; letter-spacing:0.05em; text-transform:uppercase; flex-shrink:0;">Tags</span>
          ${(() => {
            const tagCounts = {};
            for (const [pid, tags] of Object.entries(allTagsMap)) {
              for (const t of tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
            }
            return allTags.map((tag) => `
              <button data-tag-filter="${tag}" style="
                font-size:10px; padding:2px 8px; border-radius:12px; cursor:pointer;
                background:${tagFilter === tag ? "rgba(122,231,199,0.12)" : "transparent"};
                border:1px solid ${tagFilter === tag ? "rgba(122,231,199,0.35)" : "rgba(255,255,255,0.1)"};
                color:${tagFilter === tag ? "var(--cyan)" : "var(--muted)"};
                transition:all 0.12s; line-height:1.4;">${tag} <span style="opacity:0.6;">(${tagCounts[tag] || 0})</span></button>
            `).join("");
          })()}
          ${tagFilter ? `<button data-tag-filter="" style="font-size:10px; color:var(--muted); background:none; border:none; cursor:pointer; padding:2px 4px;">✕ clear</button>` : ""}
          <button id="bulk-tag-mode-btn" style="
            font-size:10px; padding:2px 8px; border-radius:12px; cursor:pointer; margin-left:4px;
            background:${bulkTagMode ? "rgba(122,231,199,0.12)" : "transparent"};
            border:1px solid ${bulkTagMode ? "rgba(122,231,199,0.35)" : "rgba(255,255,255,0.1)"};
            color:${bulkTagMode ? "var(--cyan)" : "var(--muted)"}; transition:all 0.12s; line-height:1.4;">
            ☑ Bulk Tags${bulkTagMode ? " (on)" : ""}
          </button>
        </div>
      ` : `
        <div style="display:flex; flex-wrap:wrap; gap:5px; align-items:center; padding:0 18px 12px; border-bottom:1px solid var(--border);">
          <button id="bulk-tag-mode-btn" style="
            font-size:10px; padding:2px 8px; border-radius:12px; cursor:pointer;
            background:${bulkTagMode ? "rgba(122,231,199,0.12)" : "transparent"};
            border:1px solid ${bulkTagMode ? "rgba(122,231,199,0.35)" : "rgba(255,255,255,0.1)"};
            color:${bulkTagMode ? "var(--cyan)" : "var(--muted)"}; transition:all 0.12s; line-height:1.4;">
            ☑ Bulk Tags${bulkTagMode ? " (on)" : ""}
          </button>
        </div>
      `}
      <div style="padding:18px;">
        ${tagFilter ? `<div style="font-size:11px; color:var(--cyan); margin-bottom:12px; padding:4px 8px; background:rgba(122,231,199,0.06); border-radius:6px; display:inline-block;">Filtered by tag: <strong>${tagFilter}</strong> · ${sorted.length} project${sorted.length !== 1 ? "s" : ""}</div>` : ""}
        ${pinnedRow}
        ${focusMode && visibleCount === 0
          ? `<div class="empty-state">Focus mode: all ${current.projects.length} projects in this tab look healthy.</div>`
          : sorted.length === 0 ? `<div class="empty-state">No projects match tag "${tagFilter}".</div>`
          : `<div class="project-grid">${cards}</div>`
        }
      </div>
    </div>
    ${bulkTagMode ? `
      <div id="bulk-tag-bar" style="
        position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:center;
        background:var(--panel); border:1px solid rgba(122,231,199,0.3); border-radius:12px;
        padding:10px 16px; box-shadow:0 8px 32px rgba(0,0,0,0.5); z-index:1000;
        min-width:320px; max-width:90vw;">
        <input id="bulk-tag-input" type="text" placeholder="Tag name…"
          style="font-size:12px; padding:5px 10px; border-radius:6px; border:1px solid var(--border);
                 background:rgba(12,19,31,0.8); color:var(--text); outline:none; width:130px;" />
        <button id="bulk-tag-add-btn" style="font-size:11px; padding:5px 12px; border-radius:6px; cursor:pointer;
          background:rgba(122,231,199,0.12); border:1px solid rgba(122,231,199,0.3); color:var(--cyan);">+ Add tag</button>
        <button id="bulk-tag-remove-btn" style="font-size:11px; padding:5px 12px; border-radius:6px; cursor:pointer;
          background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.25); color:var(--red);">− Remove tag</button>
        <button id="bulk-tag-done-btn" style="font-size:11px; padding:5px 12px; border-radius:6px; cursor:pointer;
          background:none; border:1px solid var(--border); color:var(--muted);">Done</button>
      </div>
    ` : ""}
  `;
}


// ── Changelog Feed ────────────────────────────────────────────────────────────
function renderChangelogFeed(ghData, changelogFilter = "") {
  const releases = [];
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (d?.latestRelease) {
      releases.push({ project: p, ...d.latestRelease });
    }
  }
  releases.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const q = changelogFilter.trim().toLowerCase();
  const filtered = q ? releases.filter((r) => r.project.name.toLowerCase().includes(q) || r.tag.toLowerCase().includes(q)) : releases;
  const recent = filtered.filter((r) => daysSince(r.publishedAt) < 90).slice(0, 8);

  const feedHtml = !recent.length
    ? `<div class="empty-state">No releases yet — will appear as GitHub releases are published.</div>`
    : `
    <div class="activity-feed">
      ${recent.map((r) => `
        <div class="activity-item">
          <div class="activity-icon" style="background:rgba(105,179,255,0.12); color:var(--blue); font-size:9px; font-weight:800;">TAG</div>
          <div class="activity-body">
            <div class="activity-message">
              <a href="${r.url}" target="_blank" rel="noopener" style="color:var(--blue);">${r.project.name} ${r.tag}</a>
              ${r.name && r.name !== r.tag ? ` — ${r.name}` : ""}
            </div>
            <div class="activity-meta">${timeAgo(r.publishedAt)}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  return `
    <div>
      <input id="changelog-filter" type="text" placeholder="Filter by project or tag…"
        value="${changelogFilter.replace(/"/g, "&quot;")}"
        style="width:100%; box-sizing:border-box; background:rgba(255,255,255,0.04); border:1px solid var(--border);
               border-radius:8px; color:var(--text); font:inherit; font-size:12px; padding:7px 10px;
               outline:none; margin-bottom:10px;" />
      ${feedHtml}
    </div>
  `;
}

// ── Week in Review ────────────────────────────────────────────────────────────
function renderWeekInReview(ghData, sbData, scoreHistory) {
  const weekMs     = 7 * 86400000;
  const since      = Date.now() - weekMs;

  let commitCount  = 0;
  let activeRepos  = 0;
  let newReleases  = 0;
  let failingCI    = 0;

  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (!d) continue;
    const weekCommits = (d.commits || []).filter((c) => new Date(c.date).getTime() > since);
    if (weekCommits.length > 0) { commitCount += weekCommits.length; activeRepos++; }
    if (d.latestRelease && new Date(d.latestRelease.publishedAt).getTime() > since) newReleases++;
    if (d.ciRuns?.[0]?.conclusion === "failure") failingCI++;
  }

  const totalSessions = sbData?.sessions
    ? Object.values(sbData.sessions).reduce((s, v) => s + (v.week || 0), 0) : null;

  // Score change over the week (between oldest and newest history entry)
  let scoreChange = null;
  if (scoreHistory.length >= 2) {
    const h1 = scoreHistory[scoreHistory.length - 2].scores || {};
    const h2 = scoreHistory[scoreHistory.length - 1].scores || {};
    const ids = PROJECTS.map((p) => p.id).filter((id) => h1[id] != null && h2[id] != null);
    if (ids.length) {
      const avg1 = ids.reduce((s, id) => s + h1[id], 0) / ids.length;
      const avg2 = ids.reduce((s, id) => s + h2[id], 0) / ids.length;
      scoreChange = Math.round(avg2 - avg1);
    }
  }

  const stats = [
    { label: "Commits",   value: commitCount || "—",   sub: `${activeRepos} repos active`, color: "var(--cyan)" },
    { label: "Releases",  value: newReleases || "—",   sub: "shipped this week",            color: "var(--blue)" },
    { label: "Sessions",  value: fmt(totalSessions),   sub: "game sessions (7d)",            color: "var(--green)" },
    { label: "CI Issues", value: failingCI || "✓",    sub: failingCI ? "builds failing" : "all healthy", color: failingCI ? "var(--red)" : "var(--green)" },
    ...(scoreChange !== null ? [{ label: "Avg Score", value: (scoreChange >= 0 ? "+" : "") + scoreChange, sub: "vs last session", color: scoreChange >= 0 ? "var(--green)" : "var(--red)" }] : []),
  ];

  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:10px;">
      ${stats.map((s) => `
        <div style="background:var(--panel-2); border:1px solid var(--border); border-radius:8px; padding:10px 12px; text-align:center;">
          <div style="font-size:18px; font-weight:800; color:${s.color};">${s.value}</div>
          <div style="font-size:11px; font-weight:700; color:var(--text); margin:2px 0;">${s.label}</div>
          <div style="font-size:10px; color:var(--muted);">${s.sub}</div>
        </div>
      `).join("")}
    </div>
  `;
}




// ── Heatmap Panel ─────────────────────────────────────────────────────────────
function renderHeatmapPanel(ghData, sbData, socialData, scoreHistory) {
  const metrics = ["Score", "CI", "Issues", "Commits 7d", "PRs"];
  const rows = PROJECTS.map((p) => {
    const d = ghData[p.githubRepo];
    const scoring = scoreProject(p, d || null, sbData, socialData);
    const ci = d?.ciRuns?.[0];
    const ciOk = !ci ? null : (ci.conclusion === "success" ? true : ci.conclusion === "failure" ? false : null);
    const issues = d?.repo?.openIssues ?? null;
    const commits7d = commitVelocity(d?.commits).thisWeek;
    const prs = d?.prs?.length ?? null;
    return { p, scoring, ciOk, issues, commits7d, prs };
  });

  function heatCell(value, label, colorFn) {
    const { bg, text } = colorFn(value);
    return `<td style="padding:6px 10px; text-align:center; background:${bg}; border:1px solid rgba(255,255,255,0.04);">
      <span style="font-size:11px; font-weight:700; color:${text};">${label}</span>
    </td>`;
  }

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">HEATMAP</span>
        <span style="font-size:11px; color:var(--muted);">All projects × key metrics</span>
      </div>
      <div class="panel-body" style="overflow-x:auto; padding:0;">
        <table style="width:100%; border-collapse:collapse; min-width:520px;">
          <thead>
            <tr style="border-bottom:2px solid var(--border);">
              <th style="text-align:left; padding:8px 14px; font-size:10px; font-weight:700;
                         letter-spacing:0.08em; color:var(--muted); white-space:nowrap;">PROJECT</th>
              ${metrics.map((m) => `<th style="text-align:center; padding:8px 10px; font-size:10px; font-weight:700;
                letter-spacing:0.08em; color:var(--muted); white-space:nowrap;">${m}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(({ p, scoring, ciOk, issues, commits7d, prs }) => `
              <tr data-view="project:${p.id}" style="cursor:pointer; transition:filter 0.1s;"
                  onmouseover="this.style.filter='brightness(1.15)'"
                  onmouseout="this.style.filter=''">
                <td style="padding:6px 14px; border-bottom:1px solid rgba(255,255,255,0.04); white-space:nowrap;">
                  <div style="display:flex; align-items:center; gap:7px;">
                    <div style="width:7px; height:7px; border-radius:50%; background:${p.color};"></div>
                    <span style="font-size:12px; font-weight:600; color:var(--text);">${p.name}</span>
                  </div>
                </td>
                ${heatCell(scoring.total, scoring.total, (v) => ({
                  bg: v >= 80 ? "rgba(110,231,183,0.12)" : v >= 60 ? "rgba(255,200,116,0.10)" : "rgba(248,113,113,0.10)",
                  text: scoring.gradeColor,
                }))}
                ${heatCell(ciOk, ciOk === null ? "—" : ciOk ? "✓" : "✗", (v) => ({
                  bg: v === null ? "transparent" : v ? "rgba(110,231,183,0.10)" : "rgba(248,113,113,0.12)",
                  text: v === null ? "var(--muted)" : v ? "var(--green)" : "var(--red)",
                }))}
                ${heatCell(issues, issues ?? "—", (v) => ({
                  bg: v === null ? "transparent" : v > 20 ? "rgba(248,113,113,0.12)" : v > 8 ? "rgba(255,200,116,0.10)" : "rgba(110,231,183,0.08)",
                  text: v === null ? "var(--muted)" : v > 20 ? "var(--red)" : v > 8 ? "var(--gold)" : "var(--green)",
                }))}
                ${heatCell(commits7d, commits7d ?? "—", (v) => ({
                  bg: v === 0 ? "rgba(248,113,113,0.08)" : v >= 3 ? "rgba(110,231,183,0.12)" : "rgba(255,200,116,0.08)",
                  text: v === 0 ? "var(--muted)" : v >= 3 ? "var(--green)" : "var(--gold)",
                }))}
                ${heatCell(prs, prs ?? "—", (v) => ({
                  bg: v > 3 ? "rgba(255,200,116,0.10)" : "transparent",
                  text: v > 3 ? "var(--gold)" : "var(--muted)",
                }))}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Activity Feed ─────────────────────────────────────────────────────────────
function renderActivityFeed(ghActivity, sbPulse, projectFilter = "") {
  const filteredActivity = projectFilter
    ? (ghActivity || []).filter((e) => {
        const repoName = (e.repo || "").split("/")[1] || "";
        const proj = PROJECTS.find((p) => p.id === projectFilter);
        return proj ? e.repo === proj.githubRepo : repoName.toLowerCase().includes(projectFilter.toLowerCase());
      })
    : (ghActivity || []);
  const items = [];
  for (const e of filteredActivity.slice(0, 20)) {
    items.push({
      icon: "GH", iconColor: "rgba(122,231,199,0.15)",
      message: `[${e.repo?.split("/")[1] || e.repo}] ${e.summary}`,
      meta: `${e.actor} · ${timeAgo(e.createdAt)}`,
      ts: new Date(e.createdAt).getTime(),
    });
  }
  for (const p of (sbPulse || []).slice(0, 10)) {
    items.push({
      icon: "VS", iconColor: "rgba(105,179,255,0.15)",
      message: p.message, meta: `Studio Pulse · ${timeAgo(p.created_at)}`,
      ts: new Date(p.created_at).getTime(),
    });
  }
  items.sort((a, b) => b.ts - a.ts);
  const shown = items.slice(0, 25);
  if (!shown.length) return `<div class="empty-state">No activity yet — add a GitHub token to see live repo events.</div>`;
  return `
    <div class="activity-feed">
      ${shown.map((item) => `
        <div class="activity-item">
          <div class="activity-icon" style="background:${item.iconColor}">${item.icon}</div>
          <div class="activity-body">
            <div class="activity-message">${item.message}</div>
            <div class="activity-meta">${item.meta}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}


// ── Velocity Chart (14-day commit frequency, all repos) ───────────────────────
function renderVelocityChart(ghData) {
  const buckets = new Array(14).fill(0);
  const now = Date.now();
  for (const p of PROJECTS) {
    for (const c of (ghData[p.githubRepo]?.commits || [])) {
      const days = Math.floor((now - new Date(c.date).getTime()) / 86400000);
      if (days < 14) buckets[13 - days]++;
    }
  }
  const maxVal = Math.max(...buckets, 1);
  const dayLabels = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * 86400000);
    return d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1);
  });

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">COMMIT VELOCITY</span>
        <span style="font-size:11px; color:var(--muted);">All projects · last 14 days</span>
      </div>
      <div class="panel-body">
        <div style="display:flex; gap:3px; align-items:flex-end; height:48px;">
          ${buckets.map((n, i) => {
            const h  = n === 0 ? 4 : Math.max(6, Math.round((n / maxVal) * 48));
            const op = n === 0 ? 0.12 : 0.25 + (n / maxVal) * 0.75;
            return `<div title="${n} commit${n !== 1 ? "s" : ""} · ${dayLabels[i]}"
              style="flex:1; height:${h}px; background:var(--cyan); opacity:${op};
                     border-radius:2px 2px 0 0; align-self:flex-end; cursor:default;"></div>`;
          }).join("")}
        </div>
        <div style="display:flex; gap:3px; margin-top:4px;">
          ${dayLabels.map((d, i) => `
            <div style="flex:1; text-align:center; font-size:9px; color:var(--muted);
                        opacity:${i === 13 ? "1" : "0.5"};">${d}</div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Stale Issues (open > 30 days, cross-project) ──────────────────────────────
function renderStaleIssues(ghData) {
  const staleIssues = [];
  const cutoff = Date.now() - 30 * 86400000;
  for (const p of PROJECTS) {
    for (const issue of (ghData[p.githubRepo]?.issues || [])) {
      if (new Date(issue.createdAt).getTime() < cutoff) {
        const ageDays = Math.floor((Date.now() - new Date(issue.createdAt).getTime()) / 86400000);
        staleIssues.push({ project: p, issue, ageDays });
      }
    }
  }
  staleIssues.sort((a, b) => b.ageDays - a.ageDays);

  if (!staleIssues.length) return "";

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">STALE ISSUES</span>
        <span style="font-size:11px; color:var(--muted);">Open > 30 days · ${staleIssues.length} found</span>
      </div>
      <div class="panel-body" style="padding:0; max-height:280px; overflow-y:auto;">
        ${staleIssues.slice(0, 15).map((s) => `
          <div style="display:flex; align-items:center; gap:12px; padding:10px 18px;
                      border-bottom:1px solid var(--border); font-size:12px;">
            <div style="width:7px; height:7px; border-radius:50%; background:${s.project.color}; flex-shrink:0;"></div>
            <span style="color:var(--muted); flex-shrink:0; min-width:80px;">${s.project.name}</span>
            <a href="${s.issue.url}" target="_blank" rel="noopener"
               style="flex:1; color:var(--text); min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              #${s.issue.number} ${s.issue.title}
            </a>
            <span style="color:var(--red); font-size:11px; font-weight:700; flex-shrink:0;">${s.ageDays}d</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Score History Overlay (top 5 projects) ────────────────────────────────────
function renderScoreHistoryOverlay(scoreHistory) {
  if (scoreHistory.length < 2) return "";
  const topProjects = [...PROJECTS]
    .filter((p) => scoreHistory[scoreHistory.length - 1].scores?.[p.id] != null)
    .sort((a, b) => (scoreHistory[scoreHistory.length - 1].scores[b.id] || 0) - (scoreHistory[scoreHistory.length - 1].scores[a.id] || 0))
    .slice(0, 5);

  const W = 400, H = 80;
  const lines = topProjects.map((p) => {
    const pts = scoreHistory
      .map((h, i) => {
        const score = h.scores?.[p.id];
        if (score == null) return null;
        const x = (i / (scoreHistory.length - 1)) * W;
        const y = H - (score / 100) * H;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .filter(Boolean);
    if (pts.length < 2) return "";
    return `<polyline points="${pts.join(" ")}" fill="none" stroke="${p.color}"
      stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">
      <title>${p.name}</title>
    </polyline>`;
  }).join("");

  const legend = topProjects.map((p) => `
    <div style="display:flex; align-items:center; gap:5px;">
      <div style="width:10px; height:2px; background:${p.color}; border-radius:1px;"></div>
      <span style="font-size:10px; color:var(--muted);">${p.name}</span>
    </div>
  `).join("");

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">SCORE HISTORY</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:11px; color:var(--muted);">Top ${topProjects.length} projects</span>
          <button id="export-score-history-btn" style="font-size:10px; padding:2px 8px; border:1px solid var(--border); border-radius:5px; background:none; color:var(--muted); cursor:pointer;">Export JSON</button>
        </div>
      </div>
      <div class="panel-body">
        <svg width="${W}" height="${H}" style="width:100%; overflow:visible; display:block; margin-bottom:10px;">
          <!-- Grid lines -->
          ${[25, 50, 75].map((y) => {
            const cy = H - (y / 100) * H;
            return `<line x1="0" y1="${cy}" x2="${W}" y2="${cy}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
                    <text x="2" y="${cy - 2}" font-size="8" fill="rgba(149,163,183,0.5)">${y}</text>`;
          }).join("")}
          ${lines}
        </svg>
        <div style="display:flex; flex-wrap:wrap; gap:12px;">${legend}</div>
      </div>
    </div>
  `;
}

// ── Cross-project TODO Aggregator ─────────────────────────────────────────────
function renderTodoAggregator() {
  const org = PROJECTS.length ? PROJECTS[0].githubRepo.split("/")[0] : null;
  const ghLink = org ? `<a href="https://github.com/issues?q=is%3Aissue+is%3Aopen+user%3A${org}" target="_blank" rel="noopener" style="font-size:12px; color:var(--cyan); text-decoration:none;">→ View all open issues on GitHub</a>` : "";
  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">TODO / FIXME TRACKER</span>
        <span style="font-size:11px; color:var(--muted);">GitHub Code Search</span>
      </div>
      <div class="panel-body">
        <button id="load-todos-btn" class="btn-primary" style="margin-bottom:12px;">Search Codebase</button>
        <div id="todos-container">
          <div class="empty-state">Click to search for TODO and FIXME comments across all repos.</div>
        </div>
        ${ghLink ? `<div style="margin-top:12px;">${ghLink}</div>` : ""}
      </div>
    </div>
  `;
}

// ── Open PR Queue (cross-project) ─────────────────────────────────────────────
function renderOpenPRQueue(ghData) {
  const allPRs = [];
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (!d?.prs?.length) continue;
    for (const pr of d.prs) {
      allPRs.push({ project: p, pr, ageDays: Math.floor(daysSince(pr.createdAt)) });
    }
  }
  if (!allPRs.length) return "";
  allPRs.sort((a, b) => b.ageDays - a.ageDays);

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">OPEN PR QUEUE</span>
        <span style="font-size:11px; color:var(--muted);">${allPRs.length} open · sorted by age</span>
      </div>
      <div class="panel-body" style="padding:0; max-height:320px; overflow-y:auto;">
        ${allPRs.slice(0, 25).map(({ project, pr, ageDays }) => `
          <div style="display:flex; align-items:center; gap:12px; padding:10px 18px;
                      border-bottom:1px solid var(--border); font-size:12px;">
            <div style="width:7px; height:7px; border-radius:50%; background:${project.color}; flex-shrink:0;"></div>
            <span style="color:var(--muted); flex-shrink:0; min-width:90px; overflow:hidden;
                         text-overflow:ellipsis; white-space:nowrap;" title="${project.name}">${project.name}</span>
            ${pr.draft ? `<span style="font-size:9px; padding:1px 5px; border-radius:3px;
              background:rgba(255,255,255,0.06); color:var(--muted); flex-shrink:0; letter-spacing:0.04em;">DRAFT</span>` : ""}
            <a href="${pr.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()"
               style="flex:1; color:var(--text); min-width:0; overflow:hidden; text-overflow:ellipsis;
                      white-space:nowrap; text-decoration:none; transition:color 0.1s;"
               onmouseover="this.style.color='var(--cyan)'" onmouseout="this.style.color='var(--text)'">
              <span style="color:var(--muted); margin-right:4px;">#${pr.number}</span>${pr.title}
            </a>
            <span style="font-size:11px; font-weight:700; flex-shrink:0; white-space:nowrap;
                         color:${ageDays >= 7 ? "var(--red)" : ageDays >= 3 ? "var(--gold)" : "var(--muted)"};">
              ${ageDays}d
            </span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Best Action Today ──────────────────────────────────────────────────────────
function renderBestActionDirective(ghData, sbData, allScores, scoreHistory) {
  // Dismiss button: hidden for rest of session when dismissed
  try { if (sessionStorage.getItem("vshub_best_action_dismissed") === "1") return ""; } catch {}
  const candidates = [];
  const decayingIds = getDecayingProjects(scoreHistory, PROJECTS.map((p) => p.id));

  // CI failures — highest urgency
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (d?.ciRuns?.[0]?.conclusion === "failure") {
      candidates.push({
        priority: 100,
        project: p,
        action: "Fix CI build",
        detail: `${p.name} build is failing — ${d.ciRuns[0].name || "CI workflow"}`,
        color: "var(--red)",
        icon: "⚠",
        url: d.ciRuns[0].url || `https://github.com/${p.githubRepo}/actions`,
      });
    }
  }

  // Critical health score
  if (allScores) {
    for (const { project, scoring } of allScores) {
      if (scoring.total <= 24 && ghData[project.githubRepo]) {
        const rationale = scoreRationale(scoring);
        candidates.push({
          priority: 88,
          project,
          action: "Rescue critical project",
          detail: `${project.name} is grade ${scoring.grade} (${scoring.total}/100)${rationale ? " — " + rationale : ""}`,
          color: "var(--red)",
          icon: "⚡",
          url: `https://github.com/${project.githubRepo}`,
        });
      }
    }
  }

  // Old ready-to-merge PRs
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (!d?.prs?.length) continue;
    const ready = d.prs.filter((pr) => !pr.draft && daysSince(pr.createdAt) >= 3);
    if (ready.length) {
      const oldest = ready.reduce((a, b) => daysSince(a.createdAt) > daysSince(b.createdAt) ? a : b);
      const age = Math.floor(daysSince(oldest.createdAt));
      candidates.push({
        priority: 82,
        project: p,
        action: "Review & merge PR",
        detail: `${p.name}: #${oldest.number} "${oldest.title.slice(0, 45)}" open ${age}d`,
        color: "var(--gold)",
        icon: "↑",
        url: oldest.url,
      });
    }
  }

  // Score declining 3 sessions in a row
  for (const id of decayingIds) {
    const p = PROJECTS.find((q) => q.id === id);
    if (!p || !ghData[p.githubRepo]) continue;
    candidates.push({
      priority: 76,
      project: p,
      action: "Revive declining project",
      detail: `${p.name} score has dropped 3 sessions in a row — ship something today`,
      color: "var(--gold)",
      icon: "↓",
      url: `https://github.com/${p.githubRepo}`,
    });
  }

  // Stale project approaching dormant threshold
  for (const p of PROJECTS) {
    if (p.status === "archived") continue;
    const d = ghData[p.githubRepo];
    const last = d?.commits?.[0];
    if (!last) continue;
    const days = Math.floor(daysSince(last.date));
    if (days >= 10 && days < 30) {
      candidates.push({
        priority: 58 + Math.min(17, days - 10),
        project: p,
        action: "Resume development",
        detail: `${p.name}: no commits in ${days} days — push something to keep momentum`,
        color: "var(--blue)",
        icon: "⏸",
        url: `https://github.com/${p.githubRepo}`,
      });
    }
  }

  // Studio OS not applied — flag non-compliant active projects
  for (const p of PROJECTS) {
    if (p.status === "archived") continue;
    if (p.studioOsApplied !== false) continue;
    if (!ghData[p.githubRepo]) continue;
    candidates.push({
      priority: 72,
      project: p,
      action: "Apply Studio OS",
      detail: `${p.name} — no Studio OS files detected. Add AGENTS.md + context/ for agent continuity`,
      color: "var(--gold)",
      icon: "○",
      url: `https://github.com/${p.githubRepo}/tree/main`,
    });
  }

  if (!candidates.length) {
    return `
      <div class="panel" style="margin-bottom:24px; border-color:rgba(110,231,183,0.2);">
        <div class="panel-header">
          <span class="panel-title">BEST ACTION TODAY</span>
        </div>
        <div class="panel-body">
          <div style="font-size:13px; color:var(--green); display:flex; align-items:center; gap:10px;">
            <span style="font-size:18px;">✓</span>
            <span>Nothing urgent — pick any in-progress feature and ship it.</span>
          </div>
        </div>
      </div>
    `;
  }

  candidates.sort((a, b) => b.priority - a.priority);
  const best = candidates[0];
  const borderColor = best.priority >= 90 ? "rgba(248,113,113,0.4)"
                    : best.priority >= 75 ? "rgba(255,200,116,0.35)"
                    : "rgba(105,179,255,0.28)";

  return `
    <div class="panel" style="margin-bottom:24px; border-color:${borderColor};">
      <div class="panel-header">
        <span class="panel-title">BEST ACTION TODAY</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:11px; color:var(--muted);">${candidates.length} candidate${candidates.length !== 1 ? "s" : ""} evaluated</span>
          <button id="dismiss-best-action-btn" title="Dismiss until next sync"
            style="font-size:11px; padding:2px 8px; background:none; border:1px solid var(--border); border-radius:5px; color:var(--muted); cursor:pointer;">✕</button>
        </div>
      </div>
      <div class="panel-body">
        <div style="display:flex; align-items:center; gap:14px; padding:8px 0;">
          <div style="font-size:26px; flex-shrink:0; width:36px; text-align:center; color:${best.color};">${best.icon}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:15px; font-weight:800; color:${best.color}; margin-bottom:4px;">${best.action}</div>
            <div style="font-size:13px; color:var(--text); line-height:1.4;">${best.detail}</div>
          </div>
          <div style="display:flex; gap:8px; flex-shrink:0; align-items:center;">
            <div style="width:8px; height:8px; border-radius:50%; background:${best.project.color};"></div>
            <span style="font-size:11px; color:var(--muted); white-space:nowrap;">${best.project.name}</span>
            <a href="${best.url}" target="_blank" rel="noopener"
               style="font-size:11px; color:var(--cyan); padding:5px 10px; border:1px solid rgba(122,231,199,0.25);
                      border-radius:6px; text-decoration:none; white-space:nowrap; transition:background 0.15s;"
               onmouseover="this.style.background='rgba(122,231,199,0.08)'"
               onmouseout="this.style.background='transparent'">
              Open →
            </a>
          </div>
        </div>
        ${candidates.length > 1 ? `
          <div style="border-top:1px solid var(--border); padding-top:10px; margin-top:8px;">
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px; font-weight:700;">Also worth doing</div>
            ${candidates.slice(1, 3).map((c) => `
              <div style="display:flex; align-items:center; gap:8px; padding:3px 0; font-size:11px; color:var(--muted);">
                <span style="flex-shrink:0; width:14px; text-align:center;">${c.icon}</span>
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${(c.detail.length > 72 ? c.detail.slice(0, 72) + "…" : c.detail)}
                </span>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

// ── Gumroad Revenue Chart (30-day) ────────────────────────────────────────────
function renderRevenueChart(gumroadSales) {
  if (!gumroadSales?.length) return "";
  // Group by week (last 4 weeks)
  const weeks = [0, 0, 0, 0];
  const now = Date.now();
  for (const s of gumroadSales) {
    const ageDays = (now - new Date(s.createdAt).getTime()) / 86400000;
    const weekIdx = Math.min(3, Math.floor(ageDays / 7));
    weeks[3 - weekIdx] += s.price;
  }
  const maxRev = Math.max(...weeks, 1);
  const total = weeks.reduce((a, b) => a + b, 0);
  const labels = ["3w ago", "2w ago", "last wk", "this wk"];

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">GUMROAD REVENUE</span>
        <span style="font-size:11px; color:var(--muted);">$${total.toFixed(0)} last 30 days</span>
      </div>
      <div class="panel-body">
        <div style="display:flex; gap:8px; align-items:flex-end; height:56px; margin-bottom:6px;">
          ${weeks.map((w, i) => {
            const h = w === 0 ? 4 : Math.max(8, Math.round((w / maxRev) * 56));
            return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; align-self:flex-end;">
              <div title="$${w.toFixed(2)}" style="width:100%; height:${h}px; background:var(--green);
                   opacity:${0.4 + (w / maxRev) * 0.6}; border-radius:3px 3px 0 0;"></div>
            </div>`;
          }).join("")}
        </div>
        <div style="display:flex; gap:8px;">
          ${labels.map((l) => `<div style="flex:1; text-align:center; font-size:10px; color:var(--muted);">${l}</div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Path to Grade A ───────────────────────────────────────────────────────────
function renderPathToGradeA(ghData, sbData, socialData) {
  const targets = PROJECTS
    .map((p) => ({ project: p, scoring: scoreProject(p, ghData[p.githubRepo] || null, sbData, socialData) }))
    .filter(({ scoring }) => scoring.total < 90)
    .sort((a, b) => b.scoring.total - a.scoring.total)
    .slice(0, 8);

  if (!targets.length) return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header"><span class="panel-title">PATH TO GRADE A</span></div>
      <div class="panel-body"><div class="empty-state">All projects are Grade A — outstanding!</div></div>
    </div>
  `;

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">PATH TO GRADE A</span>
        <span style="font-size:11px; color:var(--muted);">What each project needs to reach 90+</span>
      </div>
      <div class="panel-body" style="padding:0;">
        ${targets.map(({ project, scoring }) => {
          const gap = 90 - scoring.total;
          const pillars = [
            { key: "development", label: "Dev",    max: 30, color: "#69b3ff" },
            { key: "engagement",  label: "Engage", max: 25, color: "#7ae7c7" },
            { key: "momentum",    label: "Momt",   max: 25, color: "#ffc874" },
            { key: "risk",        label: "Risk",   max: 20, color: "#6ae3b2" },
          ];
          const gaps = pillars
            .map((pl) => ({ ...pl, score: scoring.pillars[pl.key].score, gap: pl.max - scoring.pillars[pl.key].score }))
            .filter((pl) => pl.gap > 0)
            .sort((a, b) => b.gap - a.gap);
          const topGap = gaps[0];
          return `
            <div data-view="project:${project.id}" style="padding:12px 18px; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.1s;"
                 onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                <div style="width:8px; height:8px; border-radius:50%; background:${project.color}; flex-shrink:0;"></div>
                <span style="font-size:13px; font-weight:600; color:var(--text); flex:1;">${project.name}</span>
                <span style="font-size:12px; font-weight:700; color:${scoring.gradeColor};">${scoring.total}</span>
                <span style="font-size:11px; color:var(--muted);">needs +${gap}</span>
                <span style="font-size:11px; font-weight:700; color:${scoring.gradeColor};">${scoring.grade}</span>
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${gaps.map((pl) => `
                  <div style="display:flex; align-items:center; gap:4px; padding:2px 7px; border-radius:4px;
                               background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                    <span style="font-size:9px; color:${pl.color}; font-weight:700;">${pl.label}</span>
                    <span style="font-size:10px; color:var(--text);">${pl.score}/${pl.max}</span>
                    <span style="font-size:9px; color:var(--red);">-${pl.gap}</span>
                  </div>
                `).join("")}
              </div>
              ${topGap ? `<div style="font-size:11px; color:var(--muted); margin-top:5px; font-style:italic;">Focus: +${topGap.gap} pts in ${topGap.label} (currently ${topGap.score}/${topGap.max})</div>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// ── Session Notes Panel ──────────────────────────────────────────────────────
const HUB_NOTES_KEY = "vshub_hub_notes";
function renderSessionNotesPanel() {
  const today = new Date().toISOString().slice(0, 10);
  let notes = {};
  try { notes = JSON.parse(localStorage.getItem(HUB_NOTES_KEY) || "{}"); } catch {}
  const todayText = notes[today] || "";
  const recentDays = Object.keys(notes).sort().reverse().slice(0, 5).filter((d) => d !== today);
  return `
    <div class="panel" style="margin-bottom:24px; border-color:rgba(122,231,199,0.15);">
      <div class="panel-header">
        <span class="panel-title">SESSION NOTES</span>
        <span style="font-size:11px; color:var(--muted);">${today}</span>
      </div>
      <div class="panel-body">
        <textarea id="hub-session-notes-input"
          placeholder="What are you working on today? Notes persist per day…"
          style="width:100%; min-height:60px; background:rgba(12,19,31,0.8); border:1px solid var(--border);
                 border-radius:8px; color:var(--text); font:inherit; font-size:13px; padding:10px 12px;
                 resize:vertical; line-height:1.5; box-sizing:border-box; outline:none;"
        >${todayText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
        <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
          <button id="hub-notes-save-btn"
            style="font-size:11px; padding:5px 12px; background:rgba(122,231,199,0.1); border:1px solid rgba(122,231,199,0.25);
                   border-radius:6px; color:var(--cyan); cursor:pointer;">Save</button>
          <span id="hub-notes-save-status" style="font-size:11px; color:var(--muted);"></span>
        </div>
        ${recentDays.length ? `
          <div style="margin-top:10px; border-top:1px solid var(--border); padding-top:10px;">
            <div style="font-size:10px; color:var(--muted); font-weight:700; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:6px;">Previous</div>
            ${recentDays.map((d) => `
              <div style="display:flex; gap:8px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                <span style="font-size:11px; color:var(--muted); flex-shrink:0; min-width:80px;">${d}</span>
                <span style="font-size:11px; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${(notes[d] || "").slice(0, 80)}</span>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

// ── Goals Dashboard ───────────────────────────────────────────────────────────
function renderGoalsDashboard(ghData, sbData, socialData, scoreHistory) {
  let goals = {};
  try { goals = JSON.parse(localStorage.getItem("vshub_goals") || "{}"); } catch {}
  const projectsWithGoals = PROJECTS.filter((p) => goals[p.id]);
  if (!projectsWithGoals.length) return "";

  const rows = projectsWithGoals.map((p) => {
    const scoring = scoreProject(p, ghData[p.githubRepo] || null, sbData, socialData);
    const _gr = goals[p.id];
    const targetGrade = typeof _gr === "string" ? _gr : (_gr?.grade || "");
    const targetScore = { "A+": 85, "A": 75, "B+": 65, "B": 55, "C+": 45, "C": 35 }[targetGrade] ?? 75;
    const gap = Math.max(0, targetScore - scoring.total);
    const rationale = scoreRationale(scoring);
    const onTrack = scoring.total >= targetScore;
    return { p, scoring, targetGrade, gap, rationale, onTrack };
  });

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">GOALS DASHBOARD</span>
        <span style="font-size:11px; color:var(--muted);">${projectsWithGoals.length} project${projectsWithGoals.length !== 1 ? "s" : ""} tracked</span>
      </div>
      <div class="panel-body" style="padding:0;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid var(--border);">
              <th style="text-align:left; padding:8px 16px; font-size:10px; font-weight:700; letter-spacing:0.07em; color:var(--muted); text-transform:uppercase;">Project</th>
              <th style="text-align:center; padding:8px 10px; font-size:10px; font-weight:700; letter-spacing:0.07em; color:var(--muted); text-transform:uppercase;">Now</th>
              <th style="text-align:center; padding:8px 10px; font-size:10px; font-weight:700; letter-spacing:0.07em; color:var(--muted); text-transform:uppercase;">Target</th>
              <th style="text-align:center; padding:8px 10px; font-size:10px; font-weight:700; letter-spacing:0.07em; color:var(--muted); text-transform:uppercase;">Gap</th>
              <th style="text-align:left; padding:8px 16px; font-size:10px; font-weight:700; letter-spacing:0.07em; color:var(--muted); text-transform:uppercase;">Top Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(({ p, scoring, targetGrade, gap, rationale, onTrack }) => `
              <tr data-view="project:${p.id}" style="cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.1s;"
                  onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">
                <td style="padding:10px 16px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:7px; height:7px; border-radius:50%; background:${p.color}; flex-shrink:0;"></div>
                    <span style="font-size:12px; font-weight:600; color:var(--text);">${p.name}</span>
                  </div>
                </td>
                <td style="text-align:center; padding:10px;">
                  <span style="font-size:13px; font-weight:700; color:${scoring.gradeColor};">${scoring.grade}</span>
                  <span style="font-size:10px; color:var(--muted); margin-left:3px;">${scoring.total}</span>
                </td>
                <td style="text-align:center; padding:10px;">
                  <span style="font-size:12px; font-weight:700; color:var(--blue);">${targetGrade}</span>
                </td>
                <td style="text-align:center; padding:10px;">
                  ${onTrack
                    ? `<span style="font-size:11px; font-weight:700; color:var(--green);">✓ On track</span>`
                    : `<span style="font-size:12px; font-weight:700; color:var(--gold);">+${gap} pts</span>`}
                </td>
                <td style="padding:10px 16px; font-size:11px; color:var(--muted);">
                  ${rationale || (onTrack ? "Keep momentum going" : "—")}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Score Ledger, Health Timeline, Brain Panel, Agent Intelligence ─────────────
// All extracted to hub/ submodules in Sprint O (#18 decomposition).
// See: hub/scoreLedger.js, hub/healthTimeline.js, hub/brainPanel.js, hub/agentIntelligence.js

// ── Main export ───────────────────────────────────────────────────────────────
export function renderStudioHubView(state) {
  const {
    ghData = {}, ghActivity = [], sbData = null, socialData = null,
    settings = {}, projectTab = "games",
    scorePrev = {}, scoreHistory = [], rateLimitInfo = null,
    syncMeta = null, beaconData = null, focusMode = false,
    syncError = null, syncStatus = "idle", projectFilter = "",
    tagFilter = "", pwaInstallPrompt = null, contextFiles = {},
    activityProjectFilter = "", beaconSessionStarts = {},
    prevLastOpened = null, alertHistoryFilter = "",
    compactCards = false, changelogFilter = "",
    bulkTagMode = false,
    studioBrain = null, portfolioFreshness = {},
    portfolioFiles = {}, agentRequests = [],
    agentRunHistory = {},
    githubStatusAlert = null,
    competitorData = null,
  } = state;
  const gumroadSales = socialData?.gumroadSales || null;

  const studioScore = scoreStudio(PROJECTS, ghData, sbData, socialData);
  const allScores   = PROJECTS.map((p) => ({ project: p, scoring: scoreProject(p, ghData[p.githubRepo] || null, sbData, socialData) }));

  // Portfolio week-over-week trend
  const prevStudioAvg = (() => {
    if (scoreHistory.length < 2) return null;
    const prev = scoreHistory[scoreHistory.length - 2].scores || {};
    const vals = PROJECTS.map((p) => prev[p.id]).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  })();
  const studioDelta = prevStudioAvg !== null && studioScore.average ? studioScore.average - prevStudioAvg : null;

  return `
    <div class="main-panel">
      ${syncStatus === "syncing" ? `
  <style>
    @keyframes vshub-sync-pulse {
      0%,100% { opacity:1; } 50% { opacity:0.55; }
    }
    .syncing-panel-title { animation: vshub-sync-pulse 1.4s ease-in-out infinite; }
  </style>
  <div style="display:flex; align-items:center; gap:8px; padding:8px 16px; background:rgba(122,231,199,0.06);
              border:1px solid rgba(122,231,199,0.2); border-radius:8px; margin-bottom:12px;
              font-size:12px; color:var(--cyan);">
    <span style="animation:vshub-sync-pulse 1s ease infinite;">⟳</span>
    <span>Syncing data across all projects…</span>
  </div>
` : ""}
      <div class="view-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div>
          <div class="view-title">VaultSpark Studio Hub</div>
          <div class="view-subtitle" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <span>${PROJECTS.length} projects · ${SOCIAL_ACCOUNTS.length} social accounts</span>
            ${renderRateLimitBadge(rateLimitInfo)}
            ${renderRefreshCostBadge()}
          </div>
          ${prevLastOpened ? `<div style="font-size:11px; color:var(--muted); margin-top:2px;">Last opened: ${timeAgo(new Date(prevLastOpened).toISOString())}</div>` : ""}
        </div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <button class="open-hub-btn" data-view="virtual-office" style="font-size:11px;">⊞ Studio Floor</button>
          <button class="open-hub-btn" data-view="ambient"        style="font-size:11px;">◉ Ambient</button>
          <button class="open-hub-btn" data-view="compare"        style="font-size:11px;">⇌ Compare</button>
          <button class="open-hub-btn" id="standup-btn"           style="font-size:11px;">✎ Standup</button>
          <button class="open-hub-btn" id="weekly-digest-btn"     style="font-size:11px;">◈ Digest</button>
          <button class="open-hub-btn" id="export-snapshot-btn"   style="font-size:11px;">↓ Export</button>
          ${pwaInstallPrompt ? `<button class="open-hub-btn" id="pwa-install-btn" style="font-size:11px; color:var(--cyan); border-color:var(--cyan);">⊕ Install App</button>` : ""}
          <div style="background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:10px 16px; text-align:center;">
            <div style="display:flex; align-items:baseline; gap:6px; justify-content:center;">
              <div style="font-size:28px; font-weight:800; color:${studioScore.gradeColor}; line-height:1;">${studioScore.average || "—"}</div>
              ${studioDelta !== null && studioDelta !== 0 ? `<div style="font-size:12px; font-weight:700; color:${studioDelta > 0 ? "var(--green)" : "var(--red)"};">${studioDelta > 0 ? "+" : ""}${studioDelta}</div>` : ""}
            </div>
            <div style="font-size:11px; color:var(--muted);">Studio Score</div>
          </div>
          <div style="background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:10px 16px; text-align:center;"
               title="S ≥100 · A+ ≥85 · A ≥75 · B+ ≥65 · B ≥55 · C+ ≥45 · C ≥35 · D ≥25 · F <25&#10;S-tier requires full Studio OS governance bonus.">
            <div style="font-size:28px; font-weight:800; color:${studioScore.gradeColor}; line-height:1;">${studioScore.grade}</div>
            <div style="font-size:11px; color:var(--muted);">Grade <span style="cursor:help; opacity:0.4; font-size:10px;">ⓘ</span></div>
          </div>
          ${scoreHistory.length >= 2 ? `
          <div style="background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:10px 16px; text-align:center;">
            ${portfolioSparkline(scoreHistory)}
            <div style="font-size:11px; color:var(--muted); margin-top:4px;">Trend</div>
          </div>
          ` : ""}
        </div>
      </div>

      ${renderScoreLedger(studioScore, agentRunHistory, agentRequests, studioBrain)}
      ${renderOfflineBanner()}
      ${renderGithubStatusBanner(githubStatusAlert)}
      ${renderHubSelfMonitor(syncMeta)}
      ${renderSyncErrorBanner(syncStatus, syncError)}
      ${renderOnboardingBanner(ghData, settings)}
      ${renderFounderFocusMode(ghData, allScores, scoreHistory)}
      ${renderSessionDiffBanner(allScores, scorePrev, scoreHistory)}
      ${renderSessionNotesPanel()}
      ${renderBestActionDirective(ghData, sbData, allScores, scoreHistory)}
      ${renderVisitDiffPanel(scoreHistory, prevLastOpened)}
      ${(() => {
        const competitorAlerts = getCompetitorAlerts(competitorData);
        return renderMorningBrief(ghData, sbData, allScores, scoreHistory, beaconData, beaconSessionStarts, studioBrain, portfolioFreshness, agentRunHistory, prevLastOpened, competitorAlerts);
      })()}
      ${renderStudioBrainPanel(studioBrain)}
      ${renderBrainHistoryPanel(studioBrain)}
      ${renderAgentIntelligencePanel(portfolioFiles, portfolioFreshness)}
      ${renderCriticalBanner(ghData)}
      ${renderVitals(ghData, sbData, socialData, studioScore, beaconData, { portfolioFreshness, agentRequests, studioBrain })}
      ${renderPortfolioHealthGauge(allScores, ghData, { portfolioFreshness, agentRequests, studioBrain })}

      <div class="two-col" style="margin-bottom:24px; align-items:start;">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title${syncStatus === "syncing" ? " syncing-panel-title" : ""}">CROSS-PROJECT ALERTS</span>
            <div style="display:flex; align-items:center; gap:8px;">
              ${(() => { const sc = getSnoozedAlertCount(); return sc > 0 ? `<span style="font-size:11px; color:var(--muted);">${sc} snoozed</span>` : ""; })()}
              <button id="snooze-all-alerts-btn" style="font-size:10px; padding:2px 8px; border:1px solid var(--border); border-radius:5px; background:none; color:var(--muted); cursor:pointer;">Snooze all 24h</button>
            </div>
          </div>
          <div class="panel-body">${renderAlerts(ghData, sbData, allScores, scoreHistory)}</div>
        </div>
        <div class="panel">
          <div class="panel-header" style="flex-wrap:wrap; gap:6px;">
            <span class="panel-title">STUDIO ACTIVITY</span>
            <select id="activity-project-filter"
              style="font-size:11px; padding:3px 6px; border-radius:5px; border:1px solid var(--border);
                     background:rgba(12,19,31,0.8); color:var(--text); cursor:pointer; outline:none;">
              <option value="">All projects</option>
              ${PROJECTS.map((p) => `<option value="${p.id}" ${activityProjectFilter === p.id ? "selected" : ""}>${p.name}</option>`).join("")}
            </select>
          </div>
          <div class="panel-body" style="max-height:260px; overflow-y:auto;">
            ${renderActivityFeed(ghActivity, sbData?.pulse, activityProjectFilter)}
          </div>
        </div>
      </div>

      <div class="two-col" style="margin-bottom:24px; align-items:start;">
        <div class="panel">
          <div class="panel-header"><span class="panel-title">WEEK IN REVIEW</span></div>
          <div class="panel-body">${renderWeekInReview(ghData, sbData, scoreHistory)}</div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">CHANGELOG</span>
            <span style="font-size:11px; color:var(--muted);">Last 90 days</span>
          </div>
          <div class="panel-body" style="max-height:220px; overflow-y:auto;">
            ${renderChangelogFeed(ghData, changelogFilter)}
          </div>
        </div>
      </div>

      ${renderLeaderboard(ghData, sbData, socialData, scorePrev, scoreHistory)}
      ${renderGoalsDashboard(ghData, sbData, socialData, scoreHistory)}
      ${renderPathToGradeA(ghData, sbData, socialData)}
      ${renderSprintPanel(allScores)}
      ${renderVelocityChart(ghData)}
      ${renderStudioHealthTimeline()}
      ${renderScoreHistoryOverlay(scoreHistory)}
      ${renderHeatmapPanel(ghData, sbData, socialData, scoreHistory)}
      ${renderStaleIssues(ghData)}
      ${renderOpenPRQueue(ghData)}
      ${renderTodoAggregator()}
      ${renderAlertHistoryPanel(alertHistoryFilter)}
      ${renderSnoozePanel()}
      ${gumroadSales?.length ? renderRevenueChart(gumroadSales) : ""}
      ${renderProjectSection(ghData, sbData, socialData, settings, projectTab, scorePrev, scoreHistory, focusMode, projectFilter, tagFilter, contextFiles, compactCards, bulkTagMode)}
      ${renderSocialSummary(socialData)}
    </div>
  `;
}
