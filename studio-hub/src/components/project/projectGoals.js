import { escapeHtml, safeGetJSON } from "../../utils/helpers.js";

const CHECKLIST_KEY = "vshub_checklist";

function loadChecklist() { return safeGetJSON(CHECKLIST_KEY, {}); }

export function renderGoalSection(project, scoreHistory) {
  const GOALS_KEY = "vshub_goals";
  let goals = {};
  try { goals = JSON.parse(localStorage.getItem(GOALS_KEY) || "{}"); } catch {}
  const raw = goals[project.id] || null;
  const current = typeof raw === "string" ? raw : (raw?.grade || "");
  const deadline = typeof raw === "object" && raw ? (raw.deadline || "") : "";
  const grades = ["A", "B", "C"];
  const pts = scoreHistory.map((h) => h.scores?.[project.id]).filter((v) => v != null);
  const currentScore = pts[pts.length - 1] ?? null;
  const target = current === "A" ? 90 : current === "B" ? 80 : current === "C" ? 70 : null;
  const gap = target !== null && currentScore !== null ? Math.max(0, target - currentScore) : null;
  let daysLeft = null, isOverdue = false;
  if (deadline) {
    const diff = new Date(deadline).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
    daysLeft = Math.round(diff / 86400000);
    isOverdue = daysLeft < 0;
  }
  return `
    <div class="hub-section" role="region" aria-label="Goal Tracker">
      <div class="hub-section-header">
        <span class="hub-section-title">GOAL</span>
        <span style="font-size:11px; color:var(--muted);">Target grade for this project</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:${gap !== null ? "10px" : "0"};">
          ${grades.map((g) => `
            <button id="goal-set-${project.id}-${g}" data-project-id="${project.id}" data-goal="${g}"
              style="font-size:13px; font-weight:700; padding:7px 14px; border-radius:8px; cursor:pointer; transition:all 0.1s;
                     background:${current === g ? "rgba(105,179,255,0.2)" : "transparent"};
                     border:1.5px solid ${current === g ? "var(--blue)" : "var(--border)"};
                     color:${current === g ? "var(--blue)" : "var(--muted)"};">
              Grade ${g}
            </button>
          `).join("")}
          ${current ? `<button id="goal-clear-${project.id}" data-project-id="${project.id}"
            style="font-size:11px; padding:7px 10px; border-radius:8px; cursor:pointer;
                   background:none; border:1px solid var(--border); color:var(--muted);">Clear</button>` : ""}
        </div>
        ${gap !== null && currentScore !== null ? `
          <div style="display:flex; align-items:center; gap:10px; margin-top:4px;">
            <div style="flex:1; height:6px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden;">
              <div style="width:${Math.min(100, (currentScore / target) * 100).toFixed(1)}%; height:100%;
                           background:var(--blue); border-radius:3px; transition:width 0.4s;"></div>
            </div>
            <span style="font-size:11px; color:var(--blue); font-weight:700; white-space:nowrap;">
              ${currentScore}/${target} ${gap === 0 ? "\u2713 Achieved!" : `(${gap} pts to go)`}
            </span>
          </div>
        ` : ""}
        <div style="display:flex; align-items:center; gap:8px; margin-top:10px;">
          <span style="font-size:11px; color:var(--muted);">Deadline:</span>
          <input type="date" id="goal-deadline-${project.id}" value="${deadline}"
            style="background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:6px;
                   color:var(--text); font:inherit; font-size:12px; padding:4px 8px; outline:none; cursor:pointer;" />
          ${daysLeft !== null ? `
            <span style="font-size:11px; font-weight:700; color:${isOverdue ? "var(--red)" : daysLeft <= 7 ? "var(--gold)" : "var(--cyan)"};">
              ${isOverdue ? `OVERDUE ${Math.abs(daysLeft)}d` : `${daysLeft}d left`}
            </span>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}

export function renderActionItemTracker(project) {
  const all = loadChecklist();
  const rawItems = all[project.id] || [];
  // Ensure all items have stable IDs (migration)
  let needsWrite = false;
  const items = rawItems.map((item, idx) => {
    if (!item.id) {
      needsWrite = true;
      return { ...item, id: `${Date.now().toString(36)}_${idx}_${Math.random().toString(36).slice(2,6)}` };
    }
    return item;
  });
  if (needsWrite) {
    try {
      const updated = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || "{}");
      updated[project.id] = items;
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(updated));
    } catch {}
  }
  const done = items.filter((i) => i.done).length;
  return `
    <div class="hub-section" role="region" aria-label="Action Items">
      <div class="hub-section-header">
        <span class="hub-section-title">ACTION ITEMS</span>
        <span class="hub-section-badge" style="${done === items.length && items.length > 0 ? "color:var(--green);" : ""}">
          ${done}/${items.length} done
        </span>
      </div>
      <div class="hub-section-body">
        <div id="checklist-items-${project.id}">
          ${items.length === 0
            ? `<div class="empty-state" style="padding:8px 0;">No action items yet.</div>`
            : items.map((item) => `
                <div style="display:flex; align-items:flex-start; gap:10px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                  <button data-checklist-toggle="${project.id}" data-checklist-id="${item.id}"
                    style="flex-shrink:0; width:18px; height:18px; border-radius:4px; cursor:pointer;
                           background:${item.done ? "rgba(110,231,183,0.2)" : "transparent"};
                           border:1.5px solid ${item.done ? "var(--green)" : "var(--border)"};
                           color:var(--green); font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; transition:all 0.1s;"
                  >${item.done ? "\u2713" : ""}</button>
                  <span style="flex:1; font-size:13px; color:${item.done ? "var(--muted)" : "var(--text)"};
                               text-decoration:${item.done ? "line-through" : "none"}; line-height:1.4;">${escapeHtml(item.text)}</span>
                  <button data-checklist-delete="${project.id}" data-checklist-id="${item.id}"
                    aria-label="Delete item"
                    style="flex-shrink:0; background:none; border:none; color:var(--muted); cursor:pointer; font-size:13px; padding:2px 4px;">\u2715</button>
                </div>
              `).join("")
          }
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <input id="checklist-new-${project.id}" type="text" placeholder="Add action item\u2026"
            aria-label="Add checklist item"
            style="flex:1; background:rgba(12,19,31,0.8); border:1px solid var(--border);
                   border-radius:8px; color:var(--text); font:inherit; font-size:13px;
                   padding:8px 12px; outline:none;" />
          <button id="checklist-add-${project.id}" data-project-id="${project.id}"
            aria-label="Add checklist item"
            style="font-size:12px; padding:8px 14px; background:rgba(122,231,199,0.1);
                   border:1px solid rgba(122,231,199,0.25); border-radius:8px; color:var(--cyan); cursor:pointer; white-space:nowrap;">Add</button>
        </div>
      </div>
    </div>
  `;
}
