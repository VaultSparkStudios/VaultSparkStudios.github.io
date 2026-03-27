// Project hub view event handlers — extracted from clientApp.js

import { fetchPrescription, invalidatePrescriptionFor, fetchDevlogDraft, invalidateDevlogDraft } from "../utils/aiPrescriptions.js";
import { scoreProject } from "../utils/projectScoring.js";

const TAGS_KEY    = "vshub_tags";
const PRESETS_KEY = "vshub_filter_presets";

function loadTags()     { try { return JSON.parse(localStorage.getItem(TAGS_KEY)    || "{}"); } catch { return {}; } }
function saveTags(t)    { try { localStorage.setItem(TAGS_KEY, JSON.stringify(t));           } catch {} }
function loadPresets()  { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]"); } catch { return []; } }
function savePresets(p) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(p));         } catch {} }

export function bindProjectHubEvents(ctx) {
  const { state, render, logActivity, PROJECTS } = ctx;

  // ── Action queue — add ──────────────────────────────────────────────────────
  document.querySelectorAll("[id^='action-queue-add-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      const input = document.getElementById(`action-queue-input-${projectId}`);
      const text = input?.value?.trim();
      if (!text) return;
      try {
        const queue = JSON.parse(localStorage.getItem("vshub_action_queue") || "{}");
        const existing = queue[projectId];
        let items = Array.isArray(existing) ? existing : (typeof existing === "string" && existing ? [{ id: Date.now().toString(36), text: existing }] : []);
        items.push({ id: (Date.now() + Math.random()).toString(36).replace(".", ""), text });
        queue[projectId] = items;
        localStorage.setItem("vshub_action_queue", JSON.stringify(queue));
        if (input) input.value = "";
        render();
      } catch {}
    });
  });
  document.querySelectorAll("[id^='action-queue-input-']").forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const projectId = input.id.replace("action-queue-input-", "");
      const text = input.value.trim();
      if (!text) return;
      try {
        const queue = JSON.parse(localStorage.getItem("vshub_action_queue") || "{}");
        const existing = queue[projectId];
        let items = Array.isArray(existing) ? existing : (typeof existing === "string" && existing ? [{ id: Date.now().toString(36), text: existing }] : []);
        items.push({ id: (Date.now() + Math.random()).toString(36).replace(".", ""), text });
        queue[projectId] = items;
        localStorage.setItem("vshub_action_queue", JSON.stringify(queue));
        input.value = "";
        render();
      } catch {}
    });
  });

  // ── Action queue — delete ───────────────────────────────────────────────────
  document.querySelectorAll("[data-aq-delete]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const projectId = btn.dataset.aqDelete;
      const itemId = btn.dataset.aqId;
      try {
        const queue = JSON.parse(localStorage.getItem("vshub_action_queue") || "{}");
        if (Array.isArray(queue[projectId])) {
          queue[projectId] = queue[projectId].filter((it) => it.id !== itemId);
          localStorage.setItem("vshub_action_queue", JSON.stringify(queue));
          render();
        }
      } catch {}
    });
  });

  // ── VS Code local path save ─────────────────────────────────────────────────
  document.querySelectorAll("[id^='local-path-save-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      const input = document.getElementById(`local-path-input-${projectId}`);
      if (!input) return;
      try {
        const paths = JSON.parse(localStorage.getItem("vshub_local_paths") || "{}");
        paths[projectId] = input.value.trim();
        if (!paths[projectId]) delete paths[projectId];
        localStorage.setItem("vshub_local_paths", JSON.stringify(paths));
        btn.textContent = "Saved ✓";
        setTimeout(() => { btn.textContent = "Save path"; render(); }, 1500);
      } catch {}
    });
  });

  // ── Annotations ─────────────────────────────────────────────────────────────
  document.querySelectorAll("[id^='annotation-save-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      const input = document.getElementById(`annotation-input-${projectId}`);
      if (!input) return;
      try {
        const annotations = JSON.parse(localStorage.getItem("vshub_annotations") || "{}");
        annotations[projectId] = input.value.trim();
        localStorage.setItem("vshub_annotations", JSON.stringify(annotations));
        btn.textContent = "Saved ✓";
        setTimeout(() => { btn.textContent = "Save"; }, 1500);
      } catch {}
    });
  });
  document.querySelectorAll("[id^='annotation-clear-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      try {
        const annotations = JSON.parse(localStorage.getItem("vshub_annotations") || "{}");
        delete annotations[projectId];
        localStorage.setItem("vshub_annotations", JSON.stringify(annotations));
        render();
      } catch {}
    });
  });

  // ── Goal tracking ───────────────────────────────────────────────────────────
  document.querySelectorAll("[id^='goal-set-']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pid = btn.dataset.projectId;
      const g   = btn.dataset.goal;
      try {
        const goals = JSON.parse(localStorage.getItem("vshub_goals") || "{}");
        const existing = goals[pid];
        const dl = typeof existing === "object" && existing ? (existing.deadline || "") : "";
        goals[pid] = { grade: g, deadline: dl };
        localStorage.setItem("vshub_goals", JSON.stringify(goals));
        render();
      } catch {}
    });
  });
  document.querySelectorAll("[id^='goal-clear-']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pid = btn.id.replace("goal-clear-", "");
      try {
        const goals = JSON.parse(localStorage.getItem("vshub_goals") || "{}");
        delete goals[pid];
        localStorage.setItem("vshub_goals", JSON.stringify(goals));
        render();
      } catch {}
    });
  });
  document.querySelectorAll("[id^='goal-deadline-']").forEach((inp) => {
    inp.addEventListener("change", () => {
      const pid = inp.id.replace("goal-deadline-", "");
      try {
        const goals = JSON.parse(localStorage.getItem("vshub_goals") || "{}");
        const existing = goals[pid];
        const grade = typeof existing === "string" ? existing : (typeof existing === "object" && existing ? (existing.grade || "") : "");
        goals[pid] = { grade, deadline: inp.value };
        localStorage.setItem("vshub_goals", JSON.stringify(goals));
      } catch {}
    });
  });

  // ── Sprint mode ─────────────────────────────────────────────────────────────
  document.getElementById("set-sprint-btn")?.addEventListener("click", () => {
    const projectId = document.getElementById("sprint-project-select")?.value;
    const goal      = document.getElementById("sprint-goal-input")?.value?.trim() || "";
    if (!projectId) return;
    try { localStorage.setItem("vshub_sprint", JSON.stringify({ projectId, goal })); } catch {}
    logActivity("sprint_set", projectId);
    render();
  });
  document.getElementById("clear-sprint-btn")?.addEventListener("click", () => {
    try { localStorage.removeItem("vshub_sprint"); } catch {}
    render();
  });

  // ── Checklist ───────────────────────────────────────────────────────────────
  document.querySelectorAll("[id^='checklist-add-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      const input = document.getElementById(`checklist-new-${projectId}`);
      const text = input?.value?.trim();
      if (!text) return;
      try {
        const all = JSON.parse(localStorage.getItem("vshub_checklist") || "{}");
        if (!all[projectId]) all[projectId] = [];
        all[projectId].push({ id: (Date.now() + Math.random()).toString(36).replace(".", ""), text, done: false });
        localStorage.setItem("vshub_checklist", JSON.stringify(all));
        if (input) input.value = "";
        render();
      } catch {}
    });
  });
  document.querySelectorAll("[id^='checklist-new-']").forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const projectId = input.id.replace("checklist-new-", "");
      const text = input.value.trim();
      if (!text) return;
      try {
        const all = JSON.parse(localStorage.getItem("vshub_checklist") || "{}");
        if (!all[projectId]) all[projectId] = [];
        all[projectId].push({ id: (Date.now() + Math.random()).toString(36).replace(".", ""), text, done: false });
        localStorage.setItem("vshub_checklist", JSON.stringify(all));
        input.value = "";
        render();
      } catch {}
    });
  });
  document.querySelectorAll("[data-checklist-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const projectId = btn.dataset.checklistToggle;
      const itemId = btn.dataset.checklistId;
      try {
        const all = JSON.parse(localStorage.getItem("vshub_checklist") || "{}");
        const idx = (all[projectId] || []).findIndex((it) => it.id === itemId);
        if (idx !== -1) {
          all[projectId][idx].done = !all[projectId][idx].done;
          localStorage.setItem("vshub_checklist", JSON.stringify(all));
          render();
        }
      } catch {}
    });
  });
  document.querySelectorAll("[data-checklist-delete]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const projectId = btn.dataset.checklistDelete;
      const itemId = btn.dataset.checklistId;
      try {
        const all = JSON.parse(localStorage.getItem("vshub_checklist") || "{}");
        if (all[projectId]) {
          all[projectId] = all[projectId].filter((it) => it.id !== itemId);
          localStorage.setItem("vshub_checklist", JSON.stringify(all));
          render();
        }
      } catch {}
    });
  });

  // ── Roadmap board ────────────────────────────────────────────────────────────
  function makeRoadmapId() {
    return `rm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }
  document.querySelectorAll("[id^='roadmap-add-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      const input = document.getElementById(`roadmap-new-${projectId}`);
      const text = input?.value?.trim();
      if (!text) return;
      try {
        const all = JSON.parse(localStorage.getItem("vshub_roadmap") || "{}");
        if (!all[projectId]) all[projectId] = { todo: [], doing: [], done: [] };
        all[projectId].todo.push({ id: makeRoadmapId(), text });
        localStorage.setItem("vshub_roadmap", JSON.stringify(all));
        if (input) input.value = "";
        render();
      } catch {}
    });
  });
  document.querySelectorAll("[id^='roadmap-new-']").forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const projectId = input.id.replace("roadmap-new-", "");
      const text = input.value.trim();
      if (!text) return;
      try {
        const all = JSON.parse(localStorage.getItem("vshub_roadmap") || "{}");
        if (!all[projectId]) all[projectId] = { todo: [], doing: [], done: [] };
        all[projectId].todo.push({ id: makeRoadmapId(), text });
        localStorage.setItem("vshub_roadmap", JSON.stringify(all));
        input.value = "";
        render();
      } catch {}
    });
  });
  document.querySelectorAll("[data-roadmap-move]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const projectId = btn.dataset.roadmapMove;
      const from = btn.dataset.roadmapFrom;
      const to   = btn.dataset.roadmapTo;
      const itemId = btn.dataset.roadmapId;
      try {
        const all = JSON.parse(localStorage.getItem("vshub_roadmap") || "{}");
        const board = all[projectId];
        if (!board) return;
        const itemIdx = board[from].findIndex((it) => (typeof it === "object" ? it.id : null) === itemId);
        if (itemIdx === -1) return;
        const [rawItem] = board[from].splice(itemIdx, 1);
        const text = typeof rawItem === "string" ? rawItem : (rawItem.text || "");
        const existingId = typeof rawItem === "object" && rawItem.id ? rawItem.id : makeRoadmapId();
        const item = to === "doing"
          ? { id: existingId, text, movedAt: Date.now() }
          : { id: existingId, text };
        board[to].push(item);
        localStorage.setItem("vshub_roadmap", JSON.stringify(all));
        render();
      } catch {}
    });
  });
  document.querySelectorAll("[data-roadmap-delete]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const projectId = btn.dataset.roadmapDelete;
      const col = btn.dataset.roadmapCol;
      const itemId = btn.dataset.roadmapId;
      try {
        const all = JSON.parse(localStorage.getItem("vshub_roadmap") || "{}");
        if (all[projectId]?.[col]) {
          all[projectId][col] = all[projectId][col].filter(
            (it) => (typeof it === "object" ? it.id : null) !== itemId
          );
        }
        localStorage.setItem("vshub_roadmap", JSON.stringify(all));
        render();
      } catch {}
    });
  });

  // ── Tag save ────────────────────────────────────────────────────────────────
  document.querySelectorAll("[id^='tag-save-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      const input = document.getElementById(`tag-input-${projectId}`);
      if (!input) return;
      const tags = input.value.split(",").map((t) => t.trim()).filter(Boolean);
      const all = loadTags();
      all[projectId] = tags;
      saveTags(all);
      btn.textContent = "Saved ✓";
      setTimeout(() => { btn.textContent = "Save"; }, 1500);
    });
  });

  // ── Filter presets ──────────────────────────────────────────────────────────
  document.getElementById("save-preset-btn")?.addEventListener("click", () => {
    const name = prompt("Preset name:");
    if (!name) return;
    const presets = loadPresets();
    presets.push({ name, filter: state.projectFilter, tab: state.projectTab, focusMode: state.focusMode });
    savePresets(presets);
    render();
  });
  document.querySelectorAll("[data-apply-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      try {
        const preset = JSON.parse(btn.dataset.applyPreset);
        state.projectFilter = preset.filter || "";
        state.projectTab    = preset.tab || "games";
        state.focusMode     = preset.focusMode || false;
        render();
      } catch {}
    });
  });
  document.querySelectorAll("[data-delete-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.deletePreset);
      const presets = loadPresets();
      presets.splice(idx, 1);
      savePresets(presets);
      render();
    });
  });

  // ── Hub session notes ───────────────────────────────────────────────────────
  document.getElementById("hub-notes-save-btn")?.addEventListener("click", () => {
    const today = new Date().toISOString().slice(0, 10);
    const textarea = document.getElementById("hub-session-notes-input");
    if (!textarea) return;
    try {
      const notes = JSON.parse(localStorage.getItem("vshub_hub_notes") || "{}");
      notes[today] = textarea.value;
      localStorage.setItem("vshub_hub_notes", JSON.stringify(notes));
      const status = document.getElementById("hub-notes-save-status");
      if (status) { status.textContent = "Saved ✓"; setTimeout(() => { status.textContent = ""; }, 1500); }
    } catch {}
  });
  document.getElementById("hub-session-notes-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      document.getElementById("hub-notes-save-btn")?.click();
    }
  });

  // ── Project notes ───────────────────────────────────────────────────────────
  document.querySelectorAll("[id^='notes-save-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      const textarea = document.getElementById(`notes-input-${projectId}`);
      if (!textarea) return;
      try {
        const notes = JSON.parse(localStorage.getItem("vshub_notes") || "{}");
        notes[projectId] = textarea.value;
        localStorage.setItem("vshub_notes", JSON.stringify(notes));
        btn.textContent = "Saved ✓";
        setTimeout(() => { btn.textContent = "Save"; }, 1500);
      } catch {}
    });
  });
  document.querySelectorAll("[id^='notes-clear-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      try {
        const notes = JSON.parse(localStorage.getItem("vshub_notes") || "{}");
        delete notes[projectId];
        localStorage.setItem("vshub_notes", JSON.stringify(notes));
        render();
      } catch {}
    });
  });

  // ── Best Action Today dismiss ───────────────────────────────────────────────
  document.getElementById("dismiss-best-action-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    try { sessionStorage.setItem("vshub_best_action_dismissed", "1"); } catch {}
    render();
  });

  // ── Copy release notes ──────────────────────────────────────────────────────
  document.querySelectorAll("[id^='copy-release-notes-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const projectId = btn.dataset.projectId;
      const pre = document.getElementById(`release-notes-pre-${projectId}`);
      if (pre) {
        navigator.clipboard.writeText(pre.textContent).catch(() => {});
        btn.textContent = "Copied ✓";
        setTimeout(() => { btn.textContent = "Copy draft"; }, 2000);
      }
    });
  });

  // ── Commit search ───────────────────────────────────────────────────────────
  document.querySelectorAll("[id^='commit-search-']").forEach((input) => {
    const projectId = input.id.replace("commit-search-", "");
    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      const project = PROJECTS.find((p) => p.id === projectId);
      const repoData = project?.githubRepo ? (state.ghData[project.githubRepo] || null) : null;
      const commits = repoData?.commits || [];
      const filtered = query ? commits.filter((c) => (c.message || "").toLowerCase().includes(query)) : commits;
      const container = document.getElementById(`commit-list-${projectId}`);
      if (!container) return;
      if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:8px 0;">No commits match &ldquo;${input.value.replace(/</g, "&lt;").replace(/>/g, "&gt;")}&rdquo;.</div>`;
      } else {
        container.innerHTML = filtered.map((c) => `
          <div class="commit-item" data-commit-date="${c.date}">
            <div class="commit-message">${(c.message || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            <div class="commit-meta">
              <span class="commit-sha">${c.sha || ""}</span>
              · ${(c.author || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
              · ${c.date ? new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
            </div>
          </div>
        `).join("");
      }
    });
  });

  // ── Commit heatmap day drill-down ───────────────────────────────────────────
  document.querySelectorAll("[data-heatmap-day]").forEach((bar) => {
    bar.addEventListener("click", (e) => {
      e.stopPropagation();
      const daysAgo = Number(bar.dataset.heatmapDay);
      const commitList = document.querySelector(".commit-list");
      const label = document.getElementById("heatmap-filter-label");
      if (!commitList) return;

      const activeBar = document.querySelector("[data-heatmap-day].heatmap-active");
      const isSameDay = activeBar && Number(activeBar.dataset.heatmapDay) === daysAgo;

      document.querySelectorAll("[data-heatmap-day]").forEach((b) => {
        b.classList.remove("heatmap-active");
        b.style.outline = "";
      });

      if (isSameDay) {
        commitList.querySelectorAll(".commit-item").forEach((el) => { el.style.display = ""; });
        if (label) label.textContent = "";
        return;
      }

      bar.classList.add("heatmap-active");
      bar.style.outline = "2px solid var(--cyan)";
      const now = Date.now();
      const dayStart = now - (daysAgo + 1) * 86400000;
      const dayEnd   = now - daysAgo * 86400000;
      let shown = 0;
      commitList.querySelectorAll(".commit-item").forEach((item) => {
        const dateAttr = item.dataset.commitDate;
        if (dateAttr) {
          const ts = new Date(dateAttr).getTime();
          const visible = ts >= dayStart && ts < dayEnd;
          item.style.display = visible ? "" : "none";
          if (visible) shown++;
        } else {
          item.style.display = "";
        }
      });
      if (label) label.textContent = shown > 0 ? `Showing ${shown} commit${shown !== 1 ? "s" : ""} — click again to clear` : `No commits ${daysAgo === 0 ? "today" : `${daysAgo}d ago`}`;
    });
  });

  // ── Devlog Draft generate/refresh/copy ───────────────────────────────────────
  async function _generateDevlog(btn, projectId, forceRefresh) {
    const project = PROJECTS.find((p) => p.id === projectId);
    if (!project) return;
    const claudeApiKey = ctx.loadStoredCredentials().claudeApiKey;
    if (!claudeApiKey) {
      btn.textContent = "No API key — add in Settings";
      btn.disabled = true;
      setTimeout(() => { btn.textContent = forceRefresh ? "↺ Regenerate" : "✎ Generate Devlog Draft"; btn.disabled = false; }, 2500);
      return;
    }
    btn.textContent = "Generating…";
    btn.disabled = true;
    try {
      if (forceRefresh) invalidateDevlogDraft(projectId);
      const repoData = state.ghData?.[project.githubRepo] || null;
      await fetchDevlogDraft(project, repoData, claudeApiKey);
      render();
    } catch {
      btn.textContent = "Error";
      btn.disabled = false;
      setTimeout(() => { btn.textContent = forceRefresh ? "↺ Regenerate" : "✎ Generate Devlog Draft"; btn.disabled = false; }, 2000);
    }
  }

  document.querySelectorAll("[id^='generate-devlog-btn-']").forEach((btn) => {
    btn.addEventListener("click", () => _generateDevlog(btn, btn.dataset.projectId, false));
  });
  document.querySelectorAll("[id^='refresh-devlog-btn-']").forEach((btn) => {
    btn.addEventListener("click", () => _generateDevlog(btn, btn.dataset.projectId, true));
  });
  document.querySelectorAll("[id^='copy-devlog-btn-']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const textEl = document.getElementById(`devlog-draft-text-${btn.dataset.projectId}`);
      if (textEl) {
        navigator.clipboard.writeText(textEl.textContent.trim()).then(() => {
          btn.textContent = "✓ Copied";
          setTimeout(() => { btn.textContent = "⎘ Copy"; }, 1500);
        }).catch(() => {});
      }
    });
  });

  // ── AI Prescription refresh ──────────────────────────────────────────────────
  document.querySelectorAll("[id^='refresh-ai-prescription-']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const projectId = btn.dataset.projectId;
      const project = PROJECTS.find((p) => p.id === projectId);
      if (!project) return;
      const claudeApiKey = ctx.loadStoredCredentials().claudeApiKey;
      if (!claudeApiKey) {
        btn.textContent = "No API key";
        setTimeout(() => { btn.textContent = "↺ Refresh"; }, 2000);
        return;
      }
      btn.textContent = "Fetching…";
      btn.disabled = true;
      try {
        invalidatePrescriptionFor(projectId);
        const repoData = state.ghData?.[project.githubRepo] || null;
        const scoring  = scoreProject(project, repoData, state.sbData, state.socialData);
        await fetchPrescription(project, scoring, repoData, claudeApiKey);
        render();
      } catch {
        btn.textContent = "Error";
        btn.disabled = false;
        setTimeout(() => { btn.textContent = "↺ Refresh"; }, 2000);
      }
    });
  });
}
