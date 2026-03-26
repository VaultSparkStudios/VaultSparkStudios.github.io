import { PROJECTS } from "../../data/studioRegistry.js";
import { scoreProject } from "../../utils/projectScoring.js";
import { forecastScores } from "../../utils/scoreForecast.js";
import { deltaBadge } from "./hubHelpers.js";

export function renderLeaderboard(ghData, sbData, socialData, scorePrev, scoreHistory) {
  const scoreForecasts = forecastScores(scoreHistory);
  const scored = PROJECTS.map((p) => ({
    project: p,
    scoring: scoreProject(p, ghData[p.githubRepo] || null, sbData, socialData),
  })).sort((a, b) => b.scoring.total - a.scoring.total);

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">PROJECT LEADERBOARD</span>
        <span style="font-size:11px; color:var(--muted);">Ranked by health score</span>
      </div>
      <div class="panel-body" style="padding:0;">
        ${scored.map((item, i) => {
          const forecast = scoreForecasts[item.project.id];
          return `
            <div data-view="project:${item.project.id}" style="
              display:flex; align-items:center; gap:14px;
              padding:11px 20px; border-bottom:1px solid var(--border);
              cursor:pointer; transition:background 0.12s;
            " onmouseover="this.style.background='rgba(122,231,199,0.04)'" onmouseout="this.style.background=''">
              <div style="font-size:13px; font-weight:700; color:var(--muted); min-width:20px; text-align:center;">${i + 1}</div>
              <div style="width:8px; height:8px; border-radius:50%; background:${item.project.color}; flex-shrink:0;"></div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:600; color:var(--text);">${item.project.name}</div>
                <div style="font-size:11px; color:var(--muted);">${item.scoring.pillars.development.signals[0] || "—"}</div>
              </div>
              <div style="display:flex; gap:16px; align-items:center;">
                <div style="width:80px; height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden;">
                  <div style="width:${item.scoring.total}%; height:100%; background:${item.scoring.gradeColor}; border-radius:2px;"></div>
                </div>
                <div style="min-width:48px; text-align:right; display:flex; align-items:center; justify-content:flex-end; gap:2px;">
                  <span style="font-size:14px; font-weight:700; color:${item.scoring.gradeColor};">${item.scoring.total}</span>
                  ${deltaBadge(item.scoring.total, scorePrev?.[item.project.id] ?? null)}
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
