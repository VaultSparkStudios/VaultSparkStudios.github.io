import { PROJECTS } from "../../data/studioRegistry.js";
import { scoreProject } from "../../utils/projectScoring.js";
import { forecastScores } from "../../utils/scoreForecast.js";
import { deltaBadge, computeHotStreak } from "./hubHelpers.js";

function rankMedal(i) {
  if (i === 0) return `<span style="font-size:15px; line-height:1;" title="1st Place">🥇</span>`;
  if (i === 1) return `<span style="font-size:15px; line-height:1;" title="2nd Place">🥈</span>`;
  if (i === 2) return `<span style="font-size:15px; line-height:1;" title="3rd Place">🥉</span>`;
  return `<span style="font-size:13px; font-weight:700; color:var(--muted);">${i + 1}</span>`;
}

export function renderLeaderboard(ghData, sbData, socialData, scorePrev, scoreHistory) {
  const scoreForecasts = forecastScores(scoreHistory);
  const scored = PROJECTS.map((p) => ({
    project: p,
    scoring: scoreProject(p, ghData[p.githubRepo] || null, sbData, socialData),
    streak: computeHotStreak(ghData[p.githubRepo]?.commits),
  })).sort((a, b) => b.scoring.total - a.scoring.total);

  // Detect biggest mover
  let biggestMover = null;
  if (scorePrev && Object.keys(scorePrev).length) {
    let maxDelta = 0;
    for (const item of scored) {
      const prev = scorePrev[item.project.id];
      if (prev != null) {
        const delta = item.scoring.total - prev;
        if (delta > maxDelta) { maxDelta = delta; biggestMover = item.project.id; }
      }
    }
    if (maxDelta < 5) biggestMover = null;
  }

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">PROJECT LEADERBOARD</span>
        <span style="font-size:11px; color:var(--muted);">Ranked by health score</span>
      </div>
      <div class="panel-body" style="padding:0;">
        ${scored.map((item, i) => {
          const forecast = scoreForecasts[item.project.id];
          const prevScore = scorePrev?.[item.project.id] ?? null;
          const isMover = item.project.id === biggestMover;
          return `
            <div data-view="project:${item.project.id}" style="
              display:flex; align-items:center; gap:14px;
              padding:11px 20px; border-bottom:1px solid var(--border);
              cursor:pointer; transition:background 0.12s;
              ${isMover ? "background:rgba(106,227,178,0.04);" : ""}
            " onmouseover="this.style.background='rgba(122,231,199,0.04)'" onmouseout="this.style.background='${isMover ? "rgba(106,227,178,0.04)" : ""}'">
              <div style="min-width:24px; text-align:center;">${rankMedal(i)}</div>
              <div style="width:8px; height:8px; border-radius:50%; background:${item.project.color}; flex-shrink:0;"></div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:13px; font-weight:600; color:var(--text);">${item.project.name}</span>
                  ${item.streak >= 3 ? `<span style="font-size:10px; color:var(--gold);" title="${item.streak}-day streak">🔥${item.streak}d</span>` : ""}
                  ${isMover ? `<span style="font-size:9px; padding:1px 5px; border-radius:4px; background:rgba(106,227,178,0.15); color:var(--green); font-weight:800; letter-spacing:0.04em;">RISING</span>` : ""}
                </div>
                <div style="font-size:11px; color:var(--muted);">${item.scoring.pillars.development.signals[0] || "—"}</div>
              </div>
              <div style="display:flex; gap:16px; align-items:center;">
                <div style="width:80px; height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden;">
                  <div style="width:${item.scoring.total}%; height:100%; background:${item.scoring.gradeColor}; border-radius:2px;"></div>
                </div>
                <div style="min-width:48px; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:2px;">
                  <span style="font-size:14px; font-weight:700; color:${item.scoring.gradeColor};">${item.scoring.total}</span>
                  ${deltaBadge(item.scoring.total, prevScore)}
                </div>
                ${forecast !== undefined ? `
  <div style="font-size:11px; font-weight:700; min-width:36px; text-align:right;
              color:${forecast > item.scoring.total ? "var(--green)" : forecast < item.scoring.total ? "var(--red)" : "var(--muted)"};">
    →${forecast}
  </div>
` : ""}
                <div style="min-width:28px; text-align:center;">
                  <span style="font-size:12px; font-weight:800; color:${item.scoring.gradeColor};">${item.scoring.grade}</span>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}
