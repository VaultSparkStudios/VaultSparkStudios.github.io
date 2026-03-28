import { escapeHtml } from "../../utils/helpers.js";

const ACTION_QUEUE_KEY = "vshub_action_queue";

export function renderActionQueue(project) {
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(ACTION_QUEUE_KEY) || "{}"); } catch {}
  const current = raw[project.id];
  // Migrate: if string, convert to array
  let items = [];
  if (typeof current === "string" && current.trim()) {
    items = [{ id: Date.now().toString(36), text: current.trim() }];
    // Save migrated format
    try { raw[project.id] = items; localStorage.setItem(ACTION_QUEUE_KEY, JSON.stringify(raw)); } catch {}
  } else if (Array.isArray(current)) {
    items = current;
  }
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">ACTION QUEUE</span>
        <span class="hub-section-badge" style="${items.length > 0 ? "" : "color:var(--muted);"}">${items.length} item${items.length !== 1 ? "s" : ""}</span>
      </div>
      <div class="hub-section-body">
        ${items.length === 0
          ? `<div class="empty-state" style="padding:6px 0;">No queued actions.</div>`
          : `<ol style="margin:0 0 10px; padding-left:20px; display:flex; flex-direction:column; gap:4px;">
              ${items.map((item, idx) => `
                <li style="font-size:13px; color:var(--text); padding:4px 0; display:flex; align-items:flex-start; gap:8px; list-style:none; padding-left:0; margin-left:0;">
                  <span style="color:var(--cyan); font-size:11px; font-weight:700; min-width:18px; flex-shrink:0; margin-top:1px;">${idx + 1}.</span>
                  <span style="flex:1; line-height:1.4;">${escapeHtml(item.text)}</span>
                  <button data-aq-delete="${project.id}" data-aq-id="${item.id}"
                    style="flex-shrink:0; background:none; border:none; color:var(--muted); cursor:pointer; font-size:12px; padding:2px 4px; line-height:1;">\u2715</button>
                </li>
              `).join("")}
            </ol>`
        }
        <div style="display:flex; gap:8px;">
          <input id="action-queue-input-${project.id}" type="text" placeholder="Add action item\u2026"
            style="flex:1; background:rgba(12,19,31,0.8); border:1px solid var(--border);
                   border-radius:8px; color:var(--text); font:inherit; font-size:13px;
                   padding:9px 12px; outline:none;" />
          <button id="action-queue-add-${project.id}" data-project-id="${project.id}"
            style="font-size:12px; padding:9px 14px; background:rgba(122,231,199,0.1);
                   border:1px solid rgba(122,231,199,0.25); border-radius:8px; color:var(--cyan);
                   cursor:pointer; white-space:nowrap;">Add</button>
        </div>
      </div>
    </div>
  `;
}
