import { safeGetJSON } from "../../utils/helpers.js";

const ROADMAP_KEY = "vshub_roadmap";

function loadRoadmap() {
  try {
    const raw = safeGetJSON(ROADMAP_KEY, {});
    // Migrate: convert string items (or objects missing id) to { id, text } objects
    for (const projectId of Object.keys(raw)) {
      const board = raw[projectId];
      if (!board || typeof board !== "object") continue;
      for (const col of ["todo", "doing", "done"]) {
        if (!Array.isArray(board[col])) board[col] = [];
        board[col] = board[col].map((item) => {
          if (typeof item === "string") return { id: `rm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, text: item };
          if (!item.id) return { ...item, id: `rm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}` };
          return item;
        });
      }
    }
    return raw;
  } catch { return {}; }
}

export function renderLocalMilestoneBoard(project) {
  const all = loadRoadmap();
  const board = all[project.id] || { todo: [], doing: [], done: [] };
  const cols = [
    { key: "todo",  label: "To Do",       color: "var(--muted)" },
    { key: "doing", label: "In Progress",  color: "var(--gold)" },
    { key: "done",  label: "Done",         color: "var(--green)" },
  ];

  return `
    <div class="hub-section" role="region" aria-label="Roadmap Board">
      <div class="hub-section-header">
        <span class="hub-section-title">ROADMAP BOARD</span>
        <span style="font-size:11px; color:var(--muted);">Stored locally</span>
      </div>
      <div class="hub-section-body">
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:12px;">
          ${cols.map((col) => `
            <div style="background:var(--panel-2); border:1px solid var(--border); border-radius:8px; padding:10px;">
              <div style="font-size:10px; font-weight:800; letter-spacing:0.07em; text-transform:uppercase;
                          color:${col.color}; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <span>${col.label}</span>
                <span style="color:var(--muted);">${(board[col.key] || []).length}</span>
              </div>
              <div id="roadmap-col-${project.id}-${col.key}" style="min-height:40px; display:flex; flex-direction:column; gap:4px;"
                ondragover="event.preventDefault(); event.currentTarget.style.background='rgba(122,231,199,0.06)';"
                ondragleave="event.currentTarget.style.background='';"
                ondrop="event.preventDefault(); event.currentTarget.style.background=''; const d=JSON.parse(event.dataTransfer.getData('text/plain')); if(d.fromCol!=='${col.key}'){const btn=document.createElement('button');btn.dataset.roadmapMove=d.projectId;btn.dataset.roadmapFrom=d.fromCol;btn.dataset.roadmapTo='${col.key}';btn.dataset.roadmapId=d.fromId;btn.style.display='none';document.body.appendChild(btn);btn.click();btn.remove();}">
                ${(board[col.key] || []).map((rawItem) => {
                  const itemText = typeof rawItem === "string" ? rawItem : (rawItem.text || "");
                  const itemId   = typeof rawItem === "object" ? (rawItem.id || "") : "";
                  const movedAt = typeof rawItem === "object" ? rawItem.movedAt : null;
                  const overdue = col.key === "doing" && movedAt && (Date.now() - movedAt) > 7 * 86400000;
                  const daysSince = movedAt ? Math.floor((Date.now() - movedAt) / 86400000) : null;
                  return `
                  <div draggable="true"
                    data-roadmap-drag-id="${project.id}"
                    data-roadmap-drag-from="${col.key}"
                    data-roadmap-item-id="${itemId}"
                    ondragstart="event.dataTransfer.setData('text/plain', JSON.stringify({projectId:'${project.id}',fromCol:'${col.key}',fromId:'${itemId}'})); event.currentTarget.style.opacity='0.4';"
                    ondragend="event.currentTarget.style.opacity='1';"
                    style="background:rgba(255,255,255,0.04); border:1px solid ${overdue ? "rgba(255,200,116,0.3)" : "var(--border)"}; border-radius:5px;
                               padding:6px 8px; font-size:11px; color:var(--text); line-height:1.3;
                               display:flex; align-items:flex-start; gap:6px; cursor:grab;">
                    <span style="flex:1;">${itemText}${overdue ? ` <span style="font-size:9px; color:var(--gold);" title="${daysSince}d in progress">\u26A0 ${daysSince}d</span>` : daysSince ? ` <span style="font-size:9px; color:var(--muted);">${daysSince}d</span>` : ""}</span>
                    <div style="display:flex; gap:2px; flex-shrink:0;">
                      ${col.key !== "doing" ? `<button data-roadmap-move="${project.id}" data-roadmap-from="${col.key}" data-roadmap-to="${col.key === "todo" ? "doing" : col.key === "doing" ? "done" : "doing"}" data-roadmap-id="${itemId}"
                        style="font-size:9px; padding:2px 5px; background:none; border:1px solid var(--border); border-radius:3px; color:var(--muted); cursor:pointer;" title="${col.key === "todo" ? "Start" : "Reopen"}"
                        aria-label="${col.key === "todo" ? "Move to In Progress" : "Reopen item"}">
                        ${col.key === "todo" ? "\u25B6" : "\u21A9"}
                      </button>` : `<button data-roadmap-move="${project.id}" data-roadmap-from="doing" data-roadmap-to="done" data-roadmap-id="${itemId}"
                        style="font-size:9px; padding:2px 5px; background:none; border:1px solid var(--border); border-radius:3px; color:var(--green); cursor:pointer;" title="Complete"
                        aria-label="Mark as done">\u2713
                      </button>`}
                      <button data-roadmap-delete="${project.id}" data-roadmap-col="${col.key}" data-roadmap-id="${itemId}"
                        style="font-size:9px; padding:2px 4px; background:none; border:none; color:var(--muted); cursor:pointer;"
                        aria-label="Delete roadmap item">\u2715</button>
                    </div>
                  </div>
                `; }).join("")}
              </div>
            </div>
          `).join("")}
        </div>
        <div style="display:flex; gap:8px;">
          <input id="roadmap-new-${project.id}" type="text" placeholder="Add roadmap item\u2026"
            aria-label="New roadmap item text"
            style="flex:1; background:rgba(12,19,31,0.8); border:1px solid var(--border);
                   border-radius:8px; color:var(--text); font:inherit; font-size:12px;
                   padding:7px 12px; outline:none;" />
          <button id="roadmap-add-${project.id}" data-project-id="${project.id}"
            aria-label="Add roadmap item"
            style="font-size:12px; padding:7px 14px; background:rgba(122,231,199,0.1);
                   border:1px solid rgba(122,231,199,0.25); border-radius:8px; color:var(--cyan); cursor:pointer; white-space:nowrap;">+ Add</button>
        </div>
      </div>
    </div>
  `;
}
