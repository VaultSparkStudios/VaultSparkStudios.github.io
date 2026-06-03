import { escapeHtml } from "../../utils/helpers.js";

export function renderNotesSection(project) {
  let notes = {};
  try { notes = JSON.parse(localStorage.getItem("vshub_notes") || "{}"); } catch {}
  const current = notes[project.id] || "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">NOTES</span>
        <span style="font-size:11px; color:var(--muted);">Multi-line scratchpad \u00b7 stored locally</span>
      </div>
      <div class="hub-section-body">
        <textarea
          id="notes-input-${project.id}"
          rows="4"
          placeholder="Freeform notes about this project \u2014 context, ideas, decisions, anything\u2026"
          style="width:100%; box-sizing:border-box; background:rgba(12,19,31,0.8); border:1px solid var(--border);
                 border-radius:8px; color:var(--text); font:inherit; font-size:13px;
                 padding:10px 12px; outline:none; resize:vertical; line-height:1.5;"
        >${current.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
        <div style="display:flex; gap:8px; margin-top:8px; align-items:center;">
          <button id="notes-save-${project.id}" data-project-id="${project.id}"
            style="font-size:12px; padding:7px 14px; background:rgba(122,231,199,0.1);
                   border:1px solid rgba(122,231,199,0.25); border-radius:8px; color:var(--cyan); cursor:pointer;">
            Save
          </button>
          ${current ? `<button id="notes-clear-${project.id}" data-project-id="${project.id}"
            style="font-size:12px; padding:7px 12px; background:none; border:1px solid var(--border);
                   border-radius:8px; color:var(--muted); cursor:pointer;">Clear</button>` : ""}
          <span id="notes-status-${project.id}" style="font-size:11px; color:var(--muted);"></span>
        </div>
      </div>
    </div>
  `;
}

export function renderAnnotationSection(project) {
  const ANNOTATION_KEY = "vshub_annotations";
  let annotations = {};
  try { annotations = JSON.parse(localStorage.getItem(ANNOTATION_KEY) || "{}"); } catch {}
  const current = annotations[project.id] || "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">FOUNDER NOTE</span>
        <span style="font-size:11px; color:var(--muted);">Shown on project card</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; gap:8px; align-items:flex-start;">
          <textarea
            id="annotation-input-${project.id}"
            rows="2"
            placeholder="Add a note about this project's current situation, priority, or next big goal\u2026"
            style="flex:1; background:rgba(12,19,31,0.8); border:1px solid var(--border);
                   border-radius:8px; color:var(--text); font:inherit; font-size:13px;
                   padding:9px 12px; outline:none; resize:vertical; line-height:1.5;"
          >${current.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button
              id="annotation-save-${project.id}"
              data-project-id="${project.id}"
              style="font-size:12px; padding:9px 14px; background:rgba(122,231,199,0.1);
                     border:1px solid rgba(122,231,199,0.25); border-radius:8px; color:var(--cyan);
                     cursor:pointer; white-space:nowrap;">Save</button>
            ${current ? `<button id="annotation-clear-${project.id}" data-project-id="${project.id}"
              style="font-size:12px; padding:9px 12px; background:none; border:1px solid var(--border);
                     border-radius:8px; color:var(--muted); cursor:pointer;">\u2715</button>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderTagsSection(project) {
  let _tags = {};
  try { _tags = JSON.parse(localStorage.getItem("vshub_tags") || "{}"); } catch {}
  const currentTags = _tags[project.id] || [];
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">TAGS</span>
        <span style="font-size:11px; color:var(--muted);">Comma-separated</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; gap:8px; align-items:center; margin-bottom:${currentTags.length ? "10px" : "0"};">
          <input id="tag-input-${project.id}" type="text"
            value="${currentTags.join(", ").replace(/"/g, "&quot;")}"
            placeholder="e.g. monetized, featured, paused"
            style="flex:1; background:rgba(12,19,31,0.8); border:1px solid var(--border);
                   border-radius:8px; color:var(--text); font:inherit; font-size:13px;
                   padding:9px 12px; outline:none;" />
          <button id="tag-save-${project.id}" data-project-id="${project.id}"
            style="font-size:12px; padding:9px 14px; background:rgba(122,231,199,0.1);
                   border:1px solid rgba(122,231,199,0.25); border-radius:8px; color:var(--cyan); cursor:pointer;">
            Save
          </button>
        </div>
        ${currentTags.length ? `
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${currentTags.map((t) => `
              <span style="font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px;
                           background:rgba(122,231,199,0.1); color:var(--cyan); border:1px solid rgba(122,231,199,0.2);">
                ${escapeHtml(t)}
              </span>
            `).join("")}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}
