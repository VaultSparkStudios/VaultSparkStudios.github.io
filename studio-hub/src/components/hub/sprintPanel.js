import { PROJECTS } from "../../data/studioRegistry.js";
import { loadSprint, loadGoals } from "./hubStorage.js";

export function renderSprintPanel(allScores = []) {
  const sprint = loadSprint();
  const sprintProject = sprint ? PROJECTS.find((p) => p.id === sprint.projectId) : null;

  // Sprint completion check
  let sprintComplete = false;
  let sprintScore = null;
  let goalGrade = null;
  if (sprintProject) {
    sprintScore = allScores.find((s) => s.project.id === sprintProject.id)?.scoring;
    const goals = loadGoals();
    const goalRaw = goals[sprintProject.id];
    goalGrade = typeof goalRaw === "string" ? goalRaw : goalRaw?.grade || null;
    if (goalGrade && sprintScore) {
      const gradeOrder = ["F", "D", "C", "C+", "B", "B+", "A", "A+"];
      sprintComplete = gradeOrder.indexOf(sprintScore.grade) >= gradeOrder.indexOf(goalGrade);
    }
  }

  // Checklist progress
  const checklist = (() => { try { return JSON.parse(localStorage.getItem("vshub_checklist") || "{}"); } catch { return {}; } })();
  const checklistItems = sprintProject ? (checklist[sprintProject.id] || []) : [];
  const doneCount = checklistItems.filter((i) => i.done).length;

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">SPRINT FOCUS</span>
        <span style="font-size:11px; color:var(--muted);">Designate a project for this week</span>
      </div>
      <div class="panel-body">
        ${sprintProject ? `
          ${sprintComplete ? `
            <div style="background:rgba(106,227,178,0.1); border:1px solid rgba(106,227,178,0.3); border-radius:8px; padding:8px 14px; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px;">🎉</span>
              <div>
                <div style="font-size:12px; font-weight:700; color:var(--green);">Sprint Goal Reached!</div>
                <div style="font-size:11px; color:var(--muted);">${sprintProject.name} hit ${sprintScore.grade} — goal was ${goalGrade}</div>
              </div>
              <button id="clear-sprint-btn" style="margin-left:auto; font-size:11px; padding:4px 10px; background:none; border:1px solid var(--border); border-radius:6px; color:var(--muted); cursor:pointer;">Clear Sprint</button>
            </div>
          ` : ""}
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; padding:10px 14px;
                      background:rgba(122,231,199,0.06); border:1px solid rgba(122,231,199,0.2); border-radius:8px;">
            <div style="width:10px; height:10px; border-radius:50%; background:${sprintProject.color}; flex-shrink:0;"></div>
            <div style="flex:1;">
              <div style="font-size:13px; font-weight:700; color:var(--cyan);">${sprintProject.name}</div>
              ${sprint.goal ? `<div style="font-size:11px; color:var(--muted); margin-top:2px;">${sprint.goal}</div>` : ""}
              ${checklistItems.length ? `<div style="font-size:10px; color:var(--muted); margin-top:3px;">Checklist: ${doneCount}/${checklistItems.length} done (${Math.round(doneCount / checklistItems.length * 100)}%)</div>` : ""}
            </div>
            ${!sprintComplete ? `<button id="clear-sprint-btn" style="font-size:11px; padding:5px 10px; background:none; border:1px solid var(--border);
                    border-radius:6px; color:var(--muted); cursor:pointer;">Clear</button>` : ""}
          </div>
        ` : `<div style="font-size:12px; color:var(--muted); margin-bottom:12px;">No sprint project set.</div>`}
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <select id="sprint-project-select"
            style="flex:1; min-width:150px; background:rgba(12,19,31,0.8); border:1px solid var(--border);
                   border-radius:8px; color:var(--text); font:inherit; font-size:12px; padding:7px 10px; outline:none;">
            <option value="">— Select project —</option>
            ${PROJECTS.map((p) => `<option value="${p.id}" ${sprint?.projectId === p.id ? "selected" : ""}>${p.name}</option>`).join("")}
          </select>
          <input id="sprint-goal-input" type="text" placeholder="Sprint goal (optional)"
            value="${(sprint?.goal || "").replace(/"/g, "&quot;")}"
            style="flex:2; min-width:160px; background:rgba(12,19,31,0.8); border:1px solid var(--border);
                   border-radius:8px; color:var(--text); font:inherit; font-size:12px; padding:7px 10px; outline:none;" />
          <button id="set-sprint-btn" style="font-size:12px; padding:7px 14px; background:rgba(122,231,199,0.1);
                  border:1px solid rgba(122,231,199,0.25); border-radius:8px; color:var(--cyan); cursor:pointer; white-space:nowrap;">
            Set Sprint →
          </button>
        </div>
      </div>
    </div>
  `;
}
