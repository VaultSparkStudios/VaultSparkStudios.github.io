// Ambient Mode — full-screen project tiles for secondary monitor display.
// Shows project name, grade, score, CI status, trend, and status pill.
// Auto-refreshes on the hub's normal interval. No interaction required.

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject } from "../utils/projectScoring.js";

function getTrend(projectId, scoreHistory) {
  if (!scoreHistory || scoreHistory.length < 2) return null;
  const prev = scoreHistory[scoreHistory.length - 2].scores?.[projectId];
  const curr = scoreHistory[scoreHistory.length - 1].scores?.[projectId];
  if (prev == null || curr == null) return null;
  return curr - prev;
}

export function renderAmbientView(state) {
  const { ghData = {}, sbData = null, socialData = null, scoreHistory = [] } = state;

  const scored = PROJECTS.map((p) => {
    const repoData = ghData[p.githubRepo] || null;
    const scoring  = scoreProject(p, repoData, sbData, socialData);
    const ci = repoData?.ciRuns?.[0];
    const ciOk = !ci ? null : ci.conclusion === "success" ? true : ci.conclusion === "failure" ? false : null;
    const trend = getTrend(p.id, scoreHistory);
    return { project: p, scoring, ciOk, trend };
  }).sort((a, b) => b.scoring.total - a.scoring.total);

  return `
    <div style="
      position:fixed; inset:0; background:#080e18; z-index:100;
      display:grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      grid-auto-rows: 1fr;
      gap:2px; padding:2px; padding-bottom:32px; overflow:hidden;
    " id="ambient-view">

      ${scored.map(({ project, scoring, ciOk, trend }) => `
        <div data-view="project:${project.id}" style="
          background:${scoring.gradeColor}12;
          border:1px solid ${scoring.gradeColor}30;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          cursor:pointer; transition:background 0.2s; padding:16px;
          position:relative; overflow:hidden;
        "
        onmouseover="this.style.background='${scoring.gradeColor}22'"
        onmouseout="this.style.background='${scoring.gradeColor}12'"
        >
          <div style="
            position:absolute; top:0; left:0; right:0; height:3px;
            background:${project.color};
          "></div>

          <!-- CI dot + type pill -->
          <div style="position:absolute; top:10px; left:10px; display:flex; align-items:center; gap:5px;">
            ${ciOk !== null ? `
              <div style="width:7px; height:7px; border-radius:50%;
                background:${ciOk ? "#6ee7b7" : "#f87171"};
                box-shadow:0 0 4px ${ciOk ? "#6ee7b7" : "#f87171"}60;"
                title="${ciOk ? "CI passing" : "CI failing"}"></div>
            ` : ""}
            <span style="font-size:9px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;
                         color:rgba(255,255,255,0.2);">${project.type}</span>
          </div>

          <!-- Trend arrow -->
          ${trend !== null ? `
            <div style="position:absolute; top:10px; right:10px; font-size:clamp(12px,1.5vw,16px); font-weight:900;
              color:${trend > 0 ? "#6ee7b7" : trend < 0 ? "#f87171" : "rgba(255,255,255,0.2)"};"
              title="Score change: ${trend > 0 ? "+" : ""}${trend}">
              ${trend > 0 ? "↑" : trend < 0 ? "↓" : "—"}${Math.abs(trend) > 0 ? `<span style="font-size:0.7em;">${Math.abs(trend)}</span>` : ""}
            </div>
          ` : ""}

          <div style="
            font-size:clamp(11px, 1.8vw, 14px); font-weight:600;
            color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:0.08em;
            text-align:center; margin-bottom:10px; line-height:1.2;
          ">${project.name}</div>
          <div style="
            font-size:clamp(36px, 5vw, 64px); font-weight:900;
            color:${scoring.gradeColor}; line-height:1;
          ">${scoring.grade}</div>
          <div style="
            font-size:clamp(14px, 2vw, 20px); font-weight:700;
            color:${scoring.gradeColor}; opacity:0.7; margin-top:6px;
          ">${scoring.total}</div>

          <!-- Status pill -->
          <div style="margin-top:8px; font-size:9px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;
                      padding:2px 7px; border-radius:10px; background:rgba(255,255,255,0.05);
                      color:rgba(255,255,255,0.25);">${project.statusLabel}</div>
        </div>
      `).join("")}

      <div style="
        display:flex; align-items:center; justify-content:space-between;
        padding:8px 16px; background:#080e18; border-top:1px solid rgba(255,255,255,0.05);
        font-size:11px; color:rgba(255,255,255,0.25);
        position:fixed; bottom:0; left:0; right:0; z-index:101;
      ">
        <span>VaultSpark Studio Hub — Ambient Mode · ${scored.length} projects</span>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:10px;">● CI pass: ${scored.filter((s) => s.ciOk === true).length} &nbsp; ✗ CI fail: ${scored.filter((s) => s.ciOk === false).length}</span>
          <button id="ambient-fullscreen-btn" style="
            font-size:11px; color:rgba(255,255,255,0.3); background:none;
            border:1px solid rgba(255,255,255,0.1); border-radius:5px;
            padding:3px 10px; cursor:pointer;
          ">⛶ Fullscreen</button>
          <button data-view="studio-hub" style="
            font-size:11px; color:rgba(255,255,255,0.3); background:none;
            border:1px solid rgba(255,255,255,0.1); border-radius:5px;
            padding:3px 10px; cursor:pointer;
          ">Exit ×</button>
        </div>
      </div>
    </div>
  `;
}
