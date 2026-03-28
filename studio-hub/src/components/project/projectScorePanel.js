import { scoreProject } from "../../utils/projectScoring.js";
import { timeAgo, escapeHtml } from "../../utils/helpers.js";
import { scorePotential, scoreMomentumIndex, potentialLabel, momentumLabel } from "../../utils/proprietaryScores.js";
import { getForecastAccuracy } from "../../utils/scoreForecast.js";

export function renderScorePillarChart(project, repoData, sbData, socialData, scoreHistory = []) {
  const scoring = scoreProject(project, repoData, sbData, socialData);

  // Per-pillar trend: compare current scores to previous snapshot's pillars
  const prevPillars = (() => {
    for (let i = scoreHistory.length - 1; i >= 0; i--) {
      const p = scoreHistory[i]?.pillars?.[project.id];
      if (p) return p;
    }
    return null;
  })();
  function pillarTrend(key, currentScore) {
    if (!prevPillars) return "";
    const prev = prevPillars[key];
    if (prev == null) return "";
    const delta = currentScore - prev;
    if (delta > 0) return ` <span style="color:var(--green); font-size:10px; font-weight:700;">\u2191${delta}</span>`;
    if (delta < 0) return ` <span style="color:var(--red); font-size:10px; font-weight:700;">\u2193${Math.abs(delta)}</span>`;
    return ` <span style="color:var(--muted); font-size:10px;">\u2192</span>`;
  }

  const pillars = [
    { key: "development", trendKey: "dev",       label: "Dev",       max: 30,                       color: "#69b3ff" },
    { key: "engagement",  trendKey: "engage",    label: "Engage",    max: 25,                       color: "#7ae7c7" },
    { key: "momentum",    trendKey: "momentum",  label: "Momentum",  max: 25,                       color: "#ffc874" },
    { key: "risk",        trendKey: "risk",      label: "Risk",      max: scoring.pillars.risk.max, color: "#6ae3b2" },
    { key: "community",   trendKey: "community", label: "Community", max: 25,                       color: "#c084fc" },
  ];
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">SCORE PILLARS</span>
        <span class="hub-section-badge" style="color:${scoring.gradeColor};">${scoring.total}/130 \u00b7 ${scoring.grade}</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${pillars.map(({ key, trendKey, label, max, color }) => {
            const p = scoring.pillars[key];
            const pct = Math.round((p.score / max) * 100);
            return `
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <span style="font-size:11px; font-weight:700; color:${color};">${label}</span>
                  <span style="font-size:11px; color:${color};">${p.score}<span style="color:var(--muted);">/${max}</span>
                    <span style="font-size:10px; color:var(--muted); margin-left:4px;">${pct}%</span>
                    ${pillarTrend(trendKey, p.score)}
                  </span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden;">
                  <div style="width:${pct}%; height:100%; background:${color}; border-radius:3px;"></div>
                </div>
                ${p.signals.length > 0 ? `
                  <div style="font-size:10px; color:var(--muted); margin-top:3px; line-height:1.4;">
                    ${p.signals.slice(0, 3).join(" \u00b7 ")}${p.signals.length > 3 ? ` <span style="color:var(--muted);">+${p.signals.length - 3} more</span>` : ""}
                  </div>
                ` : ""}
              </div>
            `;
          }).join("")}
        </div>
        <button data-score-explain="${escapeHtml(project.id)}"
          style="margin-top:12px; font-size:11px; padding:6px 12px; background:rgba(255,255,255,0.04);
                 border:1px solid var(--border); border-radius:8px; color:var(--muted); cursor:pointer; width:100%;">
          View full score explanation \u2192
        </button>
      </div>
    </div>
  `;
}

export function renderForecastAccuracy(project) {
  const acc = getForecastAccuracy(project.id);
  if (!acc) return ""; // need 3+ predictions
  const color = acc.accuracy >= 70 ? "var(--green)" : acc.accuracy >= 50 ? "var(--gold)" : "var(--red)";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">FORECAST ACCURACY</span>
        <span class="hub-section-badge" style="color:${color};">${acc.accuracy}%</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:8px;">
          <div style="font-size:28px; font-weight:800; color:${color}; line-height:1;">${acc.accuracy}%</div>
          <div>
            <div style="font-size:12px; font-weight:700; color:var(--text);">Direction accuracy</div>
            <div style="font-size:11px; color:var(--muted);">${acc.correct} correct of ${acc.total} score predictions</div>
          </div>
        </div>
        <div style="height:5px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden;">
          <div style="width:${acc.accuracy}%; height:100%; background:${color}; border-radius:3px;"></div>
        </div>
        <div style="font-size:10px; color:var(--muted); margin-top:5px; line-height:1.5;">
          Tracks whether forecasted score direction (\u2191/\u2193) matched actual movement between snapshots.${acc.total < 10 ? ` Accuracy improves with more data (${acc.total}/10).` : ""}
        </div>
      </div>
    </div>
  `;
}

export function renderScoreCalibration(project, repoData, sbData, socialData) {
  const scoring = scoreProject(project, repoData, sbData, socialData);
  if (scoring.total >= 80) return ""; // No calibration needed for A projects

  const tips = [];
  const { development: dev, engagement: eng, momentum: mom, risk } = scoring.pillars;

  // Development tips
  if (dev.score < 15) tips.push({ gain: 15, tip: "Fix CI \u2014 a passing build is worth up to +15 Dev points" });
  else if (dev.score < 27) tips.push({ gain: 12, tip: "Commit today \u2014 recent commits add up to +12 Dev points" });

  // Momentum tips
  if (mom.score < 5) tips.push({ gain: 8, tip: "Open a PR \u2014 shows active work in progress (+8 Momentum)" });
  if (mom.score < 10 && !repoData?.latestRelease) tips.push({ gain: 10, tip: "Cut a release \u2014 first release this month is worth +10 Momentum" });
  if (project.status === "in-development" && mom.score < 7) tips.push({ gain: 3, tip: "Update project status (e.g. 'playable-prototype') for a status bonus" });

  // Risk tips
  const issues = repoData?.repo?.openIssues || 0;
  if (issues > 15) tips.push({ gain: 6, tip: `Close some issues \u2014 ${issues} open issues cost up to -10 Risk points` });

  // Engagement tips
  if (eng.score < 5 && project.supabaseGameSlug) tips.push({ gain: 10, tip: "Drive 5+ game sessions this week for +6 Engagement points" });
  if (eng.score < 5 && !project.supabaseGameSlug && !project.deployedUrl) tips.push({ gain: 5, tip: "Deploy the project \u2014 a live URL adds +5 Engagement points" });

  if (!tips.length) return "";
  tips.sort((a, b) => b.gain - a.gain);

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">SCORE CALIBRATION</span>
        <span class="hub-section-badge" style="color:${scoring.gradeColor};">${scoring.total}/130 \u00b7 ${scoring.grade}</span>
      </div>
      <div class="hub-section-body">
        <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
          To move from ${scoring.grade} toward the next grade, try:
        </div>
        ${tips.slice(0, 5).map((t) => `
          <div style="display:flex; align-items:flex-start; gap:10px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="font-size:11px; font-weight:700; color:var(--green); min-width:36px; flex-shrink:0;">+${t.gain}</span>
            <span style="font-size:13px; color:var(--text); line-height:1.4;">${t.tip}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderScoreHistoryLineChart(project, scoreHistory) {
  const points = scoreHistory
    .map((h) => ({ ts: h.ts, score: h.scores?.[project.id] }))
    .filter((p) => p.score != null);
  if (points.length < 2) return "";

  const W = 500, H = 80;
  const scores = points.map((p) => p.score);
  const minS = Math.max(0, Math.min(...scores) - 5);
  const maxS = Math.min(100, Math.max(...scores) + 5);
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - ((p.score - minS) / (maxS - minS)) * (H - 8) - 4);
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const latest = scores[scores.length - 1];
  const oldest = scores[0];
  const trend = latest > oldest ? "var(--green)" : latest < oldest ? "var(--red)" : "var(--muted)";
  const gradeLines = [{ y: 90, label: "A" }, { y: 80, label: "B" }, { y: 70, label: "C" }];

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">SCORE HISTORY</span>
        <span class="hub-section-badge" style="color:${trend};">${oldest} \u2192 ${latest} (${points.length} snapshots)</span>
      </div>
      <div class="hub-section-body">
        <svg width="${W}" height="${H}" style="width:100%; overflow:visible; display:block; margin-bottom:8px;">
          ${gradeLines.map(({ y, label }) => {
            const cy = H - ((y - minS) / (maxS - minS)) * (H - 8) - 4;
            if (cy < 0 || cy > H) return "";
            return `<line x1="0" y1="${cy.toFixed(1)}" x2="${W}" y2="${cy.toFixed(1)}"
              stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4,4"/>
            <text x="2" y="${(cy - 3).toFixed(1)}" font-size="9" fill="rgba(149,163,183,0.4)">${label}</text>`;
          }).join("")}
          <polyline points="${pts}" fill="none" stroke="${trend}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
          ${points.map((p, i) => `
            <circle cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="3.5" fill="${trend}" opacity="0.8">
              <title>Score: ${p.score} \u2014 ${new Date(p.ts).toLocaleDateString()}</title>
            </circle>
          `).join("")}
        </svg>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted);">
          <span>${new Date(points[0].ts).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span>
          <span>${new Date(points[points.length - 1].ts).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderScoreChangelog(project, scoreHistory) {
  const points = scoreHistory
    .map((h) => ({ ts: h.ts, score: h.scores?.[project.id] }))
    .filter((p) => p.score != null);
  if (points.length < 2) return "";

  // Build changelog entries (newest first, max 12)
  const entries = [];
  for (let i = points.length - 1; i >= 1 && entries.length < 12; i--) {
    const curr = points[i];
    const prev = points[i - 1];
    const delta = curr.score - prev.score;
    entries.push({ ts: curr.ts, score: curr.score, delta });
  }

  const fmt = (d) => d > 0 ? `+${d}` : `${d}`;
  const col = (d) => d > 0 ? "var(--green)" : d < 0 ? "var(--red)" : "var(--muted)";

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">SCORE CHANGELOG</span>
        <span class="hub-section-badge" style="color:var(--muted);">Last ${entries.length} snapshots</span>
      </div>
      <div class="hub-section-body" style="padding:0;">
        <div style="max-height:220px; overflow-y:auto;">
          ${entries.map((e, i) => `
            <div style="display:flex; align-items:center; gap:12px; padding:7px 16px;
                        border-bottom:1px solid rgba(255,255,255,0.04); font-size:12px;
                        ${i === 0 ? "background:rgba(122,231,199,0.03);" : ""}">
              <span style="color:var(--muted); white-space:nowrap; font-size:10px; min-width:80px;">
                ${new Date(e.ts).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
              </span>
              <span style="font-weight:700; color:var(--text); min-width:28px;">${e.score}</span>
              <span style="font-weight:700; font-size:11px; color:${col(e.delta)}; min-width:32px;">
                ${e.delta === 0 ? "\u2500" : fmt(e.delta)}
              </span>
              <div style="flex:1; height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                <div style="height:100%; width:${e.score}%; background:${col(e.delta)}; border-radius:2px; opacity:0.6; transition:width 0.3s;"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

export function renderProprietaryScoresSection(project, repoData, socialData, scoreHistory) {
  const pot = scorePotential(project, repoData, socialData, scoreHistory);
  const mom = scoreMomentumIndex(project, repoData, scoreHistory);
  const pl = potentialLabel(pot);
  const ml = momentumLabel(mom);

  // ── Breakaway Index (0-100) -- how close to separating from the pack ──
  const scoring = scoreProject(project, repoData, null, socialData);
  const scoreVals = (scoreHistory || []).map((h) => h.scores?.[project.id]).filter((v) => v != null);
  let breakawayScore = 0;
  if (scoreVals.length >= 2) {
    const recentDelta = scoreVals[scoreVals.length - 1] - scoreVals[Math.max(0, scoreVals.length - 3)];
    breakawayScore += Math.min(40, Math.max(0, recentDelta * 8));
  }
  if (scoring.total >= 80) breakawayScore += 30;
  else if (scoring.total >= 60) breakawayScore += 15;
  if (pot >= 70) breakawayScore += 15;
  if (mom >= 60) breakawayScore += 15;
  breakawayScore = Math.min(100, breakawayScore);
  const bkColor = breakawayScore >= 75 ? "#7ae7c7" : breakawayScore >= 50 ? "#69b3ff" : breakawayScore >= 30 ? "#ffc874" : "#64748b";
  const bkLabel = breakawayScore >= 75 ? "BREAKOUT" : breakawayScore >= 50 ? "RISING" : breakawayScore >= 30 ? "STEADY" : "DORMANT";

  // ── Sustainability Rating (0-100) -- long-term viability ──
  let sustainability = 50;
  const ciPassing = repoData?.ciRuns?.[0]?.conclusion === "success";
  if (ciPassing) sustainability += 15;
  const vel = (() => { const now = Date.now(), wk = 7 * 86400000; let tw = 0; for (const c of (repoData?.commits || [])) { if (now - new Date(c.date).getTime() < wk) tw++; } return tw; })();
  if (vel >= 3) sustainability += 10;
  else if (vel >= 1) sustainability += 5;
  if (project.deployedUrl) sustainability += 10;
  if (project.studioOsApplied) sustainability += 5;
  const openIssues = repoData?.repo?.openIssues ?? 0;
  if (openIssues === 0) sustainability += 10;
  else if (openIssues < 5) sustainability += 5;
  else sustainability -= 5;
  sustainability = Math.min(100, Math.max(0, sustainability));
  const susColor = sustainability >= 75 ? "#7ae7c7" : sustainability >= 50 ? "#69b3ff" : sustainability >= 30 ? "#ffc874" : "#64748b";
  const susLabel = sustainability >= 75 ? "STRONG" : sustainability >= 50 ? "HEALTHY" : sustainability >= 30 ? "AT RISK" : "CRITICAL";

  // ── Code Tempo (0-100) -- rhythm and consistency of development ──
  const commits = repoData?.commits || [];
  const now = Date.now();
  const dayBuckets = new Array(14).fill(0);
  for (const c of commits) {
    const dayIdx = Math.floor((now - new Date(c.date).getTime()) / 86400000);
    if (dayIdx >= 0 && dayIdx < 14) dayBuckets[dayIdx]++;
  }
  const activeDays = dayBuckets.filter((d) => d > 0).length;
  let codeTempo = Math.min(50, (activeDays / 14) * 70);
  const consistency = activeDays >= 2 ? (1 - (Math.max(...dayBuckets) - Math.min(...dayBuckets.filter((d) => d > 0))) / Math.max(1, Math.max(...dayBuckets))) : 0;
  codeTempo += consistency * 30;
  codeTempo += Math.min(20, vel * 4);
  codeTempo = Math.round(Math.min(100, Math.max(0, codeTempo)));
  const ctColor = codeTempo >= 70 ? "#7ae7c7" : codeTempo >= 45 ? "#69b3ff" : codeTempo >= 20 ? "#ffc874" : "#64748b";
  const ctLabel = codeTempo >= 70 ? "IN FLOW" : codeTempo >= 45 ? "ACTIVE" : codeTempo >= 20 ? "SPORADIC" : "SILENT";

  // ── Risk Exposure (0-100, lower = better) -- vulnerability surface ──
  let riskExposure = 0;
  if (openIssues > 10) riskExposure += 25;
  else if (openIssues > 5) riskExposure += 12;
  const stalePRs = (repoData?.prs || []).filter((pr) => (now - new Date(pr.createdAt).getTime()) > 14 * 86400000).length;
  riskExposure += Math.min(20, stalePRs * 7);
  if (!ciPassing) riskExposure += 20;
  if (!repoData?.ciRuns?.length) riskExposure += 15;
  const lastCommitAge = commits[0] ? (now - new Date(commits[0].date).getTime()) / 86400000 : Infinity;
  if (lastCommitAge > 30) riskExposure += 20;
  else if (lastCommitAge > 14) riskExposure += 10;
  riskExposure = Math.min(100, riskExposure);
  const reColor = riskExposure <= 20 ? "#7ae7c7" : riskExposure <= 45 ? "#69b3ff" : riskExposure <= 70 ? "#ffc874" : "#f87171";
  const reLabel = riskExposure <= 20 ? "LOW" : riskExposure <= 45 ? "MODERATE" : riskExposure <= 70 ? "ELEVATED" : "HIGH";

  function scoreCard(title, score, label, color, description) {
    return `<div style="padding:12px; border-radius:10px; background:${color}0d; border:1px solid ${color}28;">
      <div style="font-size:10px; font-weight:700; color:var(--muted); letter-spacing:0.07em; margin-bottom:6px;">${title}</div>
      <div style="font-size:28px; font-weight:800; color:${color}; line-height:1;">${score}</div>
      <div style="font-size:11px; font-weight:700; color:${color}; margin-top:2px;">${label}</div>
      <div style="font-size:10px; color:var(--muted); margin-top:6px; line-height:1.4;">${description}</div>
    </div>`;
  }

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">PROPRIETARY SCORES</span>
        <span class="hub-section-badge" style="color:var(--muted); font-size:10px;">VaultSpark Intelligence</span>
      </div>
      <div class="hub-section-body">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          ${scoreCard("POTENTIAL", pot, pl.label, pl.color, "Upside trajectory: score trend, community traction, market readiness, dev acceleration")}
          ${scoreCard("MOMENTUM INDEX", mom, ml.label, ml.color, "Current velocity: commit speed, CI streak, PR activity, release recency, issue resolution")}
          ${scoreCard("BREAKAWAY INDEX", breakawayScore, bkLabel, bkColor, "Separation potential: score acceleration + absolute health + upside trajectory combined")}
          ${scoreCard("SUSTAINABILITY", sustainability, susLabel, susColor, "Long-term viability: CI health, commit cadence, deployment status, issue hygiene")}
          ${scoreCard("CODE TEMPO", codeTempo, ctLabel, ctColor, "Development rhythm: commit consistency over 14 days, daily spread, velocity trend")}
          ${scoreCard("RISK EXPOSURE", riskExposure, reLabel, reColor, "Vulnerability surface: stale PRs, open issues, CI failures, development gaps (lower = better)")}
        </div>
      </div>
    </div>
  `;
}

export function renderAdvancedProjectStats(project, repoData, scoreHistory) {
  const commits = repoData?.commits || [];
  const prs = repoData?.prs || [];
  const issues = repoData?.repo?.openIssues ?? 0;
  const ciRuns = repoData?.ciRuns || [];
  const now = Date.now();

  // ── Commit velocity trend (2-week view) ──
  const weekMs = 7 * 86400000;
  let thisWeek = 0, lastWeek = 0, twoWeeksAgo = 0;
  for (const c of commits) {
    const age = now - new Date(c.date).getTime();
    if (age < weekMs) thisWeek++;
    else if (age < 2 * weekMs) lastWeek++;
    else if (age < 3 * weekMs) twoWeeksAgo++;
  }
  const velTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);
  const velLabel = velTrend > 10 ? "Accelerating" : velTrend < -10 ? "Decelerating" : "Stable";
  const velColor = velTrend > 10 ? "var(--green)" : velTrend < -10 ? "var(--red)" : "var(--cyan)";

  // ── CI success streak ──
  let ciStreak = 0;
  for (const r of ciRuns) {
    if (r.conclusion === "success") ciStreak++;
    else break;
  }
  const ciStreakLabel = ciStreak >= 10 ? "Excellent" : ciStreak >= 5 ? "Good" : ciStreak >= 1 ? "Building" : "None";

  // ── PR turnaround ──
  const prAges = prs.filter((pr) => !pr.draft).map((pr) => (now - new Date(pr.createdAt).getTime()) / 86400000);
  const avgPRAge = prAges.length > 0 ? (prAges.reduce((a, b) => a + b, 0) / prAges.length).toFixed(1) : null;
  const oldestPR = prAges.length > 0 ? Math.round(Math.max(...prAges)) : null;

  // ── Score consistency (sigma of last 10 snapshots) ──
  const scoreVals = (scoreHistory || []).slice(-10).map((h) => h.scores?.[project.id]).filter((v) => v != null);
  let scoreVolatility = null;
  if (scoreVals.length >= 3) {
    const mean = scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length;
    const variance = scoreVals.reduce((s, v) => s + (v - mean) ** 2, 0) / scoreVals.length;
    scoreVolatility = Math.sqrt(variance).toFixed(1);
  }

  // ── Commit message quality signal ──
  const conventionalCommits = commits.filter((c) => /^(feat|fix|chore|docs|style|refactor|test|ci|build)\b/i.test(c.message || "")).length;
  const conventionalPct = commits.length > 0 ? Math.round((conventionalCommits / commits.length) * 100) : 0;

  // ── Issue velocity ──
  const fixCommits = commits.filter((c) => /\b(fix|close|resolve|closes|fixes)\b/i.test(c.message || "")).length;
  const issueRatio = (issues + fixCommits) > 0 ? Math.round((fixCommits / (issues + fixCommits)) * 100) : 0;

  // ── Release maturity ──
  const rel = repoData?.latestRelease;
  const relAge = rel?.publishedAt ? Math.round((now - new Date(rel.publishedAt).getTime()) / 86400000) : null;
  const relFreshness = relAge != null ? (relAge <= 7 ? "Fresh" : relAge <= 30 ? "Recent" : relAge <= 90 ? "Aging" : "Stale") : "None";
  const relColor = relAge != null ? (relAge <= 7 ? "var(--green)" : relAge <= 30 ? "var(--cyan)" : relAge <= 90 ? "var(--yellow)" : "var(--red)") : "var(--muted)";

  function kvRow(k, v, color = "var(--cyan)") {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      <span style="font-size:11px;color:var(--muted);">${k}</span>
      <span style="font-size:12px;font-weight:600;color:${color};">${v}</span>
    </div>`;
  }

  function statBox(label, value, sub = "") {
    return `<div style="flex:1;min-width:100px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:10px;">
      <div style="font-size:9px;color:var(--muted);margin-bottom:3px;letter-spacing:0.07em;">${label}</div>
      <div style="font-size:20px;font-weight:800;color:var(--cyan);">${value}</div>
      ${sub ? `<div style="font-size:10px;color:var(--muted);">${sub}</div>` : ""}
    </div>`;
  }

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">ADVANCED STATS</span>
        <span class="hub-section-badge" style="color:var(--muted); font-size:10px;">Deep Diagnostics</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
          ${statBox("COMMITS/WK", thisWeek, `<span style="color:${velColor}">${velTrend > 0 ? "+" : ""}${velTrend}% ${velLabel}</span>`)}
          ${statBox("CI STREAK", ciStreak + "x", ciStreakLabel)}
          ${statBox("SCORE VOL.", scoreVolatility ?? "\u2014", scoreVolatility ? "\u03c3 (lower = stable)" : "need 3+ snapshots")}
          ${statBox("CONV. COMMITS", conventionalPct + "%", conventionalCommits + " of " + commits.length)}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div>
            <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">VELOCITY & CADENCE</div>
            ${kvRow("This Week", thisWeek + " commits", velColor)}
            ${kvRow("Last Week", lastWeek + " commits")}
            ${kvRow("2 Weeks Ago", twoWeeksAgo + " commits")}
            ${kvRow("WoW Change", (velTrend > 0 ? "+" : "") + velTrend + "%", velColor)}
            ${kvRow("Velocity Trend", velLabel, velColor)}
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">ISSUE & PR HEALTH</div>
            ${kvRow("Open Issues", String(issues), issues > 10 ? "var(--red)" : issues > 5 ? "var(--yellow)" : "var(--green)")}
            ${kvRow("Issue Resolution Signal", issueRatio + "%")}
            ${kvRow("Fix Commits", String(fixCommits))}
            ${kvRow("Avg PR Age", avgPRAge ? avgPRAge + "d" : "\u2014", avgPRAge && avgPRAge > 7 ? "var(--yellow)" : "var(--cyan)")}
            ${kvRow("Oldest PR", oldestPR ? oldestPR + "d" : "\u2014", oldestPR && oldestPR > 14 ? "var(--red)" : "var(--cyan)")}
          </div>
        </div>
        <div style="margin-top:14px;">
          <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">RELEASE & DEPLOYMENT</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${statBox("RELEASE STATUS", relFreshness, rel ? `${rel.tag} \u00b7 ${relAge}d ago` : "No releases")}
            ${statBox("CI COVERAGE", ciRuns.length > 0 ? "Active" : "None", ciRuns.length + " runs tracked")}
            ${statBox("DEPLOY URL", project.deployedUrl ? "Live" : "\u2014", project.deployedUrl ? `<span style="font-size:9px;word-break:break-all;">${(project.deployedUrl || "").replace(/https?:\/\//, "")}</span>` : "Not deployed")}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderHealthPrescription(project, repoData, sbData, socialData) {
  const scoring = scoreProject(project, repoData, sbData, socialData);
  if (scoring.total >= 85) return ""; // Already healthy
  const { development: dev, engagement: eng, momentum: mom, risk } = scoring.pillars;
  const rx = [];

  if (dev.score < 10) rx.push({ icon: "\u2699", color: "var(--red)",  text: "Add a CI workflow \u2014 no CI costs up to 15 Development points." });
  else if (dev.score < 22 && dev.signals.some((s) => s.toLowerCase().includes("fail")))
    rx.push({ icon: "\u2699", color: "var(--red)",  text: "Fix the failing CI build \u2014 a passing build adds up to +15 Dev points." });
  else if (dev.score < 22)
    rx.push({ icon: "\u2328", color: "var(--gold)", text: "Push a commit this week \u2014 recent commits are worth up to +12 Dev points." });

  if (mom.score < 8 && !repoData?.latestRelease)
    rx.push({ icon: "\uD83D\uDE80", color: "var(--blue)", text: "Cut a release \u2014 publishing a GitHub release adds +10 Momentum points." });
  else if (mom.score < 12 && !(repoData?.prs?.length))
    rx.push({ icon: "\u21CC", color: "var(--blue)", text: "Open a pull request \u2014 active PRs signal ongoing work (+8 Momentum)." });

  const openIssues = repoData?.repo?.openIssues || 0;
  if (risk.score < 12 && openIssues > 10)
    rx.push({ icon: "\u2713", color: "var(--green)", text: `Close some of the ${openIssues} open issues \u2014 each excess issue costs Risk points.` });

  if (eng.score < 5 && !project.deployedUrl && !project.supabaseGameSlug)
    rx.push({ icon: "\u2197", color: "var(--cyan)", text: "Deploy the project \u2014 a live URL adds +5 Engagement points." });
  else if (eng.score < 5 && project.supabaseGameSlug)
    rx.push({ icon: "\u25B6", color: "var(--cyan)", text: "Drive 5+ game sessions this week for +6 Engagement points." });

  if (!rx.length) return "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">HEALTH PRESCRIPTION</span>
        <span class="hub-section-badge" style="color:${scoring.gradeColor};">${scoring.total}/130 \u00b7 ${scoring.grade}</span>
      </div>
      <div class="hub-section-body">
        <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
          Top actions to improve this project's score:
        </div>
        ${rx.slice(0, 4).map((r) => `
          <div style="display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="color:${r.color}; font-size:14px; flex-shrink:0; width:20px; text-align:center;">${r.icon}</span>
            <span style="font-size:13px; color:var(--text); line-height:1.4;">${r.text}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderLaunchReadiness(project, repoData, sbData, socialData) {
  if (project.status === "live" || project.status === "archived") return "";
  const scoring = scoreProject(project, repoData, sbData, socialData);
  const now = Date.now();
  const commits = repoData?.commits || [];
  const lastCommitDays = commits.length ? (now - new Date(commits[0].date).getTime()) / 86400000 : Infinity;
  const openIssues = repoData?.repo?.openIssues ?? null;
  const overdueMilestones = (repoData?.milestones || []).filter((m) => m.dueOn && new Date(m.dueOn) < now && m.state === "open");
  const hasRelease = !!(repoData?.latestRelease || repoData?.deployments?.length);
  const ciPassing = repoData?.ciRuns?.[0]?.conclusion === "success";

  const criteria = [
    { label: "Health score \u2265 85 (A+)", ok: scoring.total >= 85, note: `Current: ${scoring.total}` },
    { label: "CI passing",             ok: ciPassing,           note: ciPassing ? "" : "Fix CI before launch" },
    { label: "Open issues < 10",       ok: openIssues !== null && openIssues < 10, note: openIssues !== null ? `${openIssues} open` : "No data" },
    { label: "No overdue milestones",  ok: overdueMilestones.length === 0, note: overdueMilestones.length ? `${overdueMilestones.length} overdue` : "" },
    { label: "Has release or deployment", ok: hasRelease,       note: hasRelease ? "" : "Tag a release or deploy" },
    { label: "Active development (< 7d)", ok: lastCommitDays < 7, note: lastCommitDays < Infinity ? `Last: ${Math.round(lastCommitDays)}d ago` : "No commits" },
  ];

  const passCount = criteria.filter((c) => c.ok).length;
  const pct = Math.round((passCount / criteria.length) * 100);
  const barColor = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--gold)" : "var(--red)";

  return `
    <div class="hub-section" style="margin-bottom:20px;">
      <div class="hub-section-header">
        <span class="hub-section-title">LAUNCH READINESS</span>
        <span style="font-size:11px; font-weight:700; color:${barColor};">${pct}% \u2014 ${passCount}/${criteria.length} criteria</span>
      </div>
      <div class="hub-section-body">
        <div style="height:4px; background:var(--border); border-radius:2px; margin-bottom:12px;">
          <div style="height:100%; width:${pct}%; background:${barColor}; border-radius:2px; transition:width 0.3s;"></div>
        </div>
        ${criteria.map((c) => `
          <div style="display:flex; align-items:center; gap:10px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
            <span style="font-size:13px; color:${c.ok ? "var(--green)" : "var(--red)"}; flex-shrink:0;">${c.ok ? "\u2713" : "\u2717"}</span>
            <span style="font-size:12px; color:${c.ok ? "var(--text)" : "var(--muted)"}; flex:1;">${c.label}</span>
            ${c.note && !c.ok ? `<span style="font-size:10px; color:var(--muted);">${c.note}</span>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderProjectDoctor(project, repoData, sbData, socialData) {
  const scoring = scoreProject(project, repoData, sbData, socialData);
  if (scoring.total >= 95) return ""; // already excellent
  const actions = [];

  // Dev pillar gap
  const devGap  = 30 - scoring.pillars.development.score;
  const devSigs = scoring.pillars.development.signals || [];
  if (devSigs.some((s) => s.toLowerCase().includes("fail"))) {
    actions.push({ pts: 12, pillar: "Dev", label: "Fix CI build", detail: "CI passing adds +15 Dev pts" });
  } else if (devGap >= 10 && devSigs.some((s) => s.toLowerCase().includes("no recent") || s.toLowerCase().includes("no commit"))) {
    actions.push({ pts: 8, pillar: "Dev", label: "Push commits", detail: "Any commit this week adds +12 Dev pts" });
  } else if (devGap >= 8) {
    actions.push({ pts: 5, pillar: "Dev", label: "Improve CI or commit cadence", detail: `Dev at ${scoring.pillars.development.score}/30` });
  }

  // Momentum pillar gap
  const momGap   = 25 - scoring.pillars.momentum.score;
  const momSigs  = scoring.pillars.momentum.signals || [];
  const hasRelease = momSigs.some((s) => s.includes("Released") || s.includes("this week") || s.includes("this month"));
  if (!hasRelease && momGap >= 10) {
    actions.push({ pts: 10, pillar: "Momentum", label: "Ship a release", detail: "Release this month adds +7 Momentum pts; this week +10" });
  }
  if (!repoData?.prs?.length && momGap >= 6) {
    actions.push({ pts: 5, pillar: "Momentum", label: "Open a PR", detail: "Active PRs add +5 Momentum pts" });
  }

  // Risk pillar gap
  const riskGap   = 20 - scoring.pillars.risk.base;
  const openIssues = repoData?.repo?.openIssues || 0;
  if (riskGap >= 6 && openIssues > 5) {
    actions.push({ pts: Math.min(10, riskGap), pillar: "Risk", label: `Close ${Math.min(10, openIssues)} issues`, detail: `${openIssues} open now; reducing to <6 removes \u22123 Risk penalty` });
  }
  const stalePRs = (repoData?.prs || []).filter((pr) => !pr.draft && (Date.now() - new Date(pr.createdAt).getTime()) / 86400000 > 30);
  if (stalePRs.length) {
    actions.push({ pts: 2, pillar: "Risk", label: `Merge/close ${stalePRs.length} stale PR${stalePRs.length > 1 ? "s" : ""}`, detail: "Stale PRs (>30 days) cost \u22122 Risk pts" });
  }

  // Engagement pillar gap
  const engGap = 25 - scoring.pillars.engagement.score;
  if (engGap >= 12 && !project.deployedUrl) {
    actions.push({ pts: 5, pillar: "Engagement", label: "Deploy the project", detail: "Live deployed URL adds +5 Engagement pts" });
  }
  if (engGap >= 8 && !project.supabaseGameSlug) {
    actions.push({ pts: 3, pillar: "Engagement", label: "Update context files", detail: "Recent context commits add +3 Engagement pts" });
  }

  // Studio OS governance gap
  const govGap = 5 - (scoring.pillars.risk.governance || 0);
  if (govGap >= 2) {
    actions.push({ pts: govGap, pillar: "Governance", label: "Complete Studio OS compliance", detail: "Full compliance + SIL fresh + CDR active = +5 bonus pts" });
  }

  if (!actions.length) return "";
  actions.sort((a, b) => b.pts - a.pts);
  const top5 = actions.slice(0, 5);
  const totalPossible = top5.reduce((s, a) => s + a.pts, 0);

  const pillarColors = { Dev: "var(--blue)", Momentum: "var(--cyan)", Risk: "var(--green)", Engagement: "var(--gold)", Governance: "#c084fc" };

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">PROJECT DOCTOR</span>
        <span class="hub-section-badge" style="color:var(--green);">+${totalPossible} pts possible</span>
      </div>
      <div class="hub-section-body">
        <div style="font-size:11px; color:var(--muted); margin-bottom:12px;">
          Ranked actions to close the gap to grade A (90+). Currently ${scoring.total}/130.
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${top5.map((a, i) => `
            <div style="display:flex; align-items:flex-start; gap:12px; padding:10px 12px;
                        background:${pillarColors[a.pillar]}0a; border:1px solid ${pillarColors[a.pillar]}1e;
                        border-radius:8px;">
              <div style="font-size:13px; font-weight:800; color:var(--muted); min-width:18px; text-align:center;
                          opacity:0.5;">${i + 1}</div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-bottom:2px;">${a.label}</div>
                <div style="font-size:11px; color:var(--muted);">${a.detail}</div>
              </div>
              <div style="text-align:right; flex-shrink:0;">
                <div style="font-size:13px; font-weight:800; color:${pillarColors[a.pillar]};">+${a.pts}</div>
                <div style="font-size:9px; color:var(--muted); text-transform:uppercase; letter-spacing:0.04em;">${a.pillar}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

export function renderIssueTrendChart(project, scoreHistory) {
  const points = scoreHistory
    .map((h) => h.issues?.[project.id])
    .filter((v) => v !== null && v !== undefined);
  if (points.length < 2) return "";

  const W = 280, H = 48;
  const min = Math.min(...points);
  const max = Math.max(...points, min + 1);
  const xs  = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys  = points.map((v) => H - ((v - min) / (max - min)) * (H - 6) - 3);
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const trend = points[points.length - 1] > points[0] ? "var(--red)"
    : points[points.length - 1] < points[0] ? "var(--green)" : "var(--muted)";
  const latest = points[points.length - 1];
  const oldest = points[0];
  const delta  = latest - oldest;

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">ISSUE TREND</span>
        <span class="hub-section-badge" style="color:${trend};">
          ${delta > 0 ? "+" : ""}${delta} over ${points.length} snapshots
        </span>
      </div>
      <div class="hub-section-body">
        <svg width="${W}" height="${H}" style="width:100%; max-width:${W}px; overflow:visible;"
             title="Issue count history: ${points.join(" \u2192 ")}">
          <polyline points="${pts}" fill="none" stroke="${trend}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
          ${points.map((v, i) => `
            <circle cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="3" fill="${trend}" opacity="0.7">
              <title>${v} open issue${v !== 1 ? "s" : ""}</title>
            </circle>
          `).join("")}
        </svg>
        <div style="display:flex; justify-content:space-between; margin-top:4px;">
          <span style="font-size:10px; color:var(--muted);">oldest (${oldest})</span>
          <span style="font-size:10px; color:${trend}; font-weight:700;">latest (${latest})</span>
        </div>
      </div>
    </div>
  `;
}

export function renderIssueSignalCorrelation(project, repoData) {
  const issues = repoData?.issues;
  if (!issues || issues.length === 0) return "";

  // Classify each issue into a score pillar based on label/title keywords
  const pillars = {
    Dev:        { keywords: ["bug", "fix", "error", "crash", "broken", "fail", "refactor", "perf", "security", "vuln", "test", "ci", "build", "deploy"], color: "var(--blue)", issues: [] },
    Engagement: { keywords: ["ux", "ui", "design", "onboard", "feedback", "feature", "request", "social", "content", "doc", "readme", "tutorial"], color: "var(--cyan)", issues: [] },
    Momentum:   { keywords: ["release", "launch", "milestone", "roadmap", "deadline", "sprint", "epic", "plan", "schedul"], color: "var(--gold)", issues: [] },
    Risk:       { keywords: ["security", "auth", "cve", "vuln", "access", "secret", "leak", "compliance", "license", "legal"], color: "#f87171", issues: [] },
    Community:  { keywords: ["community", "social", "follower", "subscriber", "audience", "discord", "reddit", "youtube", "gumroad", "member"], color: "#c084fc", issues: [] },
  };

  const unclassified = [];
  for (const issue of issues) {
    const text = `${issue.title} ${(issue.labels || []).join(" ")}`.toLowerCase();
    let matched = false;
    for (const [name, pillar] of Object.entries(pillars)) {
      if (pillar.keywords.some((kw) => text.includes(kw))) {
        pillar.issues.push(issue);
        matched = true;
        break;
      }
    }
    if (!matched) unclassified.push(issue);
  }

  const total = issues.length;

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">ISSUE SIGNAL CORRELATION</span>
        <span class="hub-section-badge" style="color:var(--muted);">${total} open issue${total !== 1 ? "s" : ""} mapped</span>
      </div>
      <div class="hub-section-body">
        <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:12px;">
          ${Object.entries(pillars).map(([name, pillar]) => {
            const count = pillar.issues.length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return `
              <div style="padding:10px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span style="font-size:10px; font-weight:700; color:${pillar.color}; letter-spacing:0.06em;">${name.toUpperCase()}</span>
                  <span style="font-size:13px; font-weight:800; color:${count > 0 ? pillar.color : "var(--muted)"};">${count}</span>
                </div>
                <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                  <div style="height:100%; width:${pct}%; background:${pillar.color}; border-radius:2px; opacity:0.7;"></div>
                </div>
                ${count > 0 ? `
                  <div style="font-size:10px; color:var(--muted); margin-top:6px; line-height:1.6;">
                    ${pillar.issues.slice(0, 2).map((i) => `<div title="#${i.number}">\u00b7 ${i.title.length > 38 ? i.title.slice(0, 38) + "\u2026" : i.title}</div>`).join("")}
                    ${count > 2 ? `<div style="color:var(--muted);">+ ${count - 2} more</div>` : ""}
                  </div>
                ` : ""}
              </div>
            `;
          }).join("")}
        </div>
        ${unclassified.length > 0 ? `
          <div style="font-size:10px; color:var(--muted); padding-top:8px; border-top:1px solid var(--border);">
            ${unclassified.length} issue${unclassified.length !== 1 ? "s" : ""} unclassified (no matching label/keyword)
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

export function renderRevenueAttribution(project, gumroadSales, repoData) {
  if (!gumroadSales) return "";

  // Filter sales to this project's product name (fuzzy -- includes project name)
  const slug = project.name.toLowerCase().replace(/\s+/g, "");
  const relevant = gumroadSales.filter((s) =>
    s.productName?.toLowerCase().replace(/\s+/g, "").includes(slug) ||
    slug.includes(s.productName?.toLowerCase().replace(/\s+/g, "") || "____")
  );

  // Aggregate by day
  const byDay = {};
  for (const sale of (relevant.length ? relevant : gumroadSales)) {
    const day = (sale.createdAt || "").slice(0, 10);
    if (!day) continue;
    byDay[day] = (byDay[day] || 0) + sale.price;
  }

  const days = Object.keys(byDay).sort();
  if (!days.length) return "";

  const total = Object.values(byDay).reduce((s, v) => s + v, 0);
  const releaseTag = repoData?.latestRelease?.tag || null;
  const releaseDate = repoData?.latestRelease?.publishedAt?.slice(0, 10) || null;
  const maxVal = Math.max(...Object.values(byDay), 1);

  const bars = days.map((d) => {
    const val = byDay[d] || 0;
    const pct = Math.round((val / maxVal) * 100);
    const isRelease = d === releaseDate;
    return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; min-width:0;"
                 title="${d}: $${val.toFixed(2)}${isRelease ? ` \u00b7 Release ${releaseTag}` : ""}">
      ${isRelease ? `<div style="width:2px; height:4px; background:var(--gold); border-radius:1px; flex-shrink:0;"></div>` : `<div style="height:4px;"></div>`}
      <div style="width:100%; height:${Math.max(2, pct)}%; background:${isRelease ? "var(--gold)" : "rgba(122,231,199,0.5)"}; border-radius:2px 2px 0 0; min-height:2px;"></div>
    </div>`;
  }).join("");

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">REVENUE ATTRIBUTION</span>
        <span class="hub-section-badge" style="color:var(--green);">$${total.toFixed(2)} / 30d</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; align-items:flex-end; gap:2px; height:60px; padding-bottom:4px; border-bottom:1px solid var(--border);">
          ${bars}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted); margin-top:4px;">
          <span>${days[0]}</span>
          ${releaseDate ? `<span style="color:var(--gold);">\u25B2 ${releaseTag || "release"}</span>` : ""}
          <span>${days[days.length - 1]}</span>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:8px;">${relevant.length ? `${relevant.length} sale${relevant.length !== 1 ? "s" : ""} matched to this project` : `${gumroadSales.length} total sales (all products \u2014 project match unavailable)`}</div>
      </div>
    </div>
  `;
}
