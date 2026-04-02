import { PROJECTS } from "../data/studioRegistry.js";
import { timeAgo, escapeHtml } from "../utils/helpers.js";

const CHANGE_TYPES = [
  { value: "rename",  label: "Rename only — name/slug changes, same identity" },
  { value: "rebrand", label: "Rebrand only — new identity, same slug" },
  { value: "both",    label: "Full rename + rebrand — new name, slug, and identity" },
  { value: "repo",    label: "Repo URL change only — no brand change" },
];

const STATUSES = [
  { value: "in-development",      label: "In Development" },
  { value: "playable-prototype",  label: "Playable Prototype" },
  { value: "client-beta",         label: "Client Beta" },
  { value: "live",                label: "Live" },
  { value: "on-hold",             label: "On Hold" },
  { value: "concept",             label: "Concept" },
];

const TYPES = [
  { value: "game",           label: "Game" },
  { value: "tool",           label: "Tool" },
  { value: "platform",       label: "Platform / App" },
  { value: "infrastructure", label: "Infrastructure" },
];

function parseTicketFields(body = "") {
  // Try human-readable markdown fields first
  const get = (label) => {
    const match = body.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
    return match ? match[1].trim() : null;
  };
  // Fall back to machine-readable YAML block (<!-- agent-ticket ... -->)
  const yamlBlock = body.match(/<!--\s*agent-ticket\n([\s\S]*?)-->/);
  const getYaml = (key) => {
    if (!yamlBlock) return null;
    const m = yamlBlock[1].match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?`, "m"));
    return m ? m[1].trim() : null;
  };
  const osRaw = getYaml("studio_os_compliant");
  return {
    repo:             get("GitHub Repo")   || getYaml("github_repo"),
    type:             get("Type")          || getYaml("type"),
    status:           get("Status")        || getYaml("status"),
    description:      get("Description")   || getYaml("description"),
    deployedUrl:      get("Deployed URL")  || getYaml("deployed_url"),
    studioOsCompliant: osRaw === "true" || osRaw === true,
  };
}

function isAgentSubmitted(body = "") {
  const yamlBlock = body.match(/<!--\s*agent-ticket\n([\s\S]*?)-->/);
  if (!yamlBlock) return false;
  return /submitted_by:\s*"?agent"?/.test(yamlBlock[1]);
}

function isAlreadyListed(body = "") {
  const fields = parseTicketFields(body);
  if (!fields.repo) return false;
  return PROJECTS.some((p) => p.githubRepo === fields.repo);
}

// Returns the pipeline stage for a project given all tickets.
// Stages: "concept" | "submitted" | "reviewing" | "in-hub" | "on-website"
export function getProjectPipelineStage(project, tickets = []) {
  const inHub = PROJECTS.some((p) => p.id === project.id || p.githubRepo === project.githubRepo);
  if (inHub && project.deployedUrl) return "on-website";
  if (inHub) return "in-hub";
  const ticket = tickets.find((t) => {
    const f = parseTicketFields(t.body);
    return f.repo === project.githubRepo;
  });
  if (!ticket) return "concept";
  if (ticket.state === "closed") return "in-hub";
  if (ticket.comments > 0) return "reviewing";
  return "submitted";
}

export const PIPELINE_STAGES = [
  { id: "concept",    label: "Concept" },
  { id: "submitted",  label: "Ticket Submitted" },
  { id: "reviewing",  label: "Under Review" },
  { id: "in-hub",     label: "In Hub" },
  { id: "on-website", label: "On Website" },
];
const STAGE_INDEX = Object.fromEntries(PIPELINE_STAGES.map((s, i) => [s.id, i]));

function renderPipelineBadge(stage) {
  const colors = { concept: "var(--muted)", submitted: "var(--gold)", reviewing: "#ffa94d", "in-hub": "var(--cyan)", "on-website": "var(--green)" };
  const color = colors[stage] || "var(--muted)";
  const label = PIPELINE_STAGES.find((s) => s.id === stage)?.label || stage;
  return `<span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px;
    background:transparent; color:${color}; border:1px solid ${color}; opacity:0.9;">${label}</span>`;
}

function renderPipelineStrip(currentStage) {
  const currentIdx = STAGE_INDEX[currentStage] ?? 0;
  return `
    <div style="display:flex; align-items:center; gap:0; margin:10px 0 4px; overflow-x:auto;">
      ${PIPELINE_STAGES.map((s, i) => {
        const done    = i < currentIdx;
        const active  = i === currentIdx;
        const colors  = { concept: "#888", submitted: "var(--gold)", reviewing: "#ffa94d", "in-hub": "var(--cyan)", "on-website": "var(--green)" };
        const color   = done || active ? (colors[s.id] || "var(--cyan)") : "rgba(255,255,255,0.15)";
        const dot     = `<div style="width:8px; height:8px; border-radius:50%; background:${color};
                            flex-shrink:0; ${active ? "box-shadow:0 0 6px " + color + "80;" : ""}"></div>`;
        const lbl     = `<span style="font-size:10px; white-space:nowrap; color:${active ? color : done ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)"};
                            font-weight:${active ? "700" : "400"};">${s.label}</span>`;
        const line    = i < PIPELINE_STAGES.length - 1
          ? `<div style="flex:1; min-width:12px; height:1px; background:${done ? color : "rgba(255,255,255,0.08)"}; margin:0 4px;"></div>`
          : "";
        return `<div style="display:flex; align-items:center; gap:4px;">${dot}${lbl}</div>${line}`;
      }).join("")}
    </div>
  `;
}

function renderPipelineOverview(tickets) {
  // Shows all non-hub projects with open tickets, plus hub projects as "in-hub"/"on-website"
  const ticketRows = tickets.map((t) => {
    const fields = parseTicketFields(t.body);
    if (!fields.repo) return null;
    const inHub = PROJECTS.some((p) => p.githubRepo === fields.repo);
    const stage = t.state === "closed" || inHub ? "in-hub"
      : t.comments > 0 ? "reviewing"
      : "submitted";
    const agent = isAgentSubmitted(t.body);
    return { repo: fields.repo, name: fields.repo.split("/")[1] || fields.repo, stage, ticket: t, agent };
  }).filter(Boolean);

  if (!ticketRows.length) return "";

  return `
    <div class="panel" style="margin-bottom:20px;">
      <div class="panel-header" style="display:flex; align-items:center; justify-content:space-between;">
        <span class="panel-title">LISTING PIPELINE</span>
        <span style="font-size:10px; color:var(--muted);">${ticketRows.length} project${ticketRows.length !== 1 ? "s" : ""}</span>
      </div>
      <div class="panel-body" style="padding:8px 0 4px;">
        ${ticketRows.map((row) => {
          const currentIdx = STAGE_INDEX[row.stage] ?? 0;
          return `
            <div style="display:flex; align-items:center; gap:12px; padding:8px 16px;
                        border-bottom:1px solid rgba(255,255,255,0.04); flex-wrap:wrap;">
              <div style="min-width:120px; flex:1;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:12px; font-weight:600; color:var(--text);">${escapeHtml(row.name)}</span>
                  ${row.agent ? `<span style="font-size:9px; font-weight:700; padding:1px 5px; border-radius:8px;
                    background:rgba(255,201,116,0.15); color:var(--gold); border:1px solid rgba(255,201,116,0.3);">AGENT</span>` : ""}
                </div>
                <div style="font-size:10px; color:var(--muted); font-family:monospace;">${escapeHtml(row.repo)}</div>
              </div>
              <div style="display:flex; align-items:center; gap:3px; flex:2; min-width:180px;">
                ${PIPELINE_STAGES.map((s, i) => {
                  const done   = i < currentIdx;
                  const active = i === currentIdx;
                  const colors = { concept: "#888", submitted: "var(--gold)", reviewing: "#ffa94d", "in-hub": "var(--cyan)", "on-website": "var(--green)" };
                  const color  = done || active ? (colors[s.id] || "var(--cyan)") : "rgba(255,255,255,0.1)";
                  const seg    = `<div title="${s.label}" style="flex:1; height:4px; border-radius:2px; background:${color};
                                    ${active ? "box-shadow:0 0 4px " + color + "80;" : ""}"></div>`;
                  return seg;
                }).join(`<div style="width:2px;"></div>`)}
              </div>
              <div style="flex-shrink:0;">
                ${renderPipelineBadge(row.stage)}
              </div>
              <a href="${row.ticket.url}" target="_blank" rel="noopener"
                 style="font-size:10px; color:var(--muted); text-decoration:none; flex-shrink:0;"
                 onmouseover="this.style.color='var(--cyan)'" onmouseout="this.style.color='var(--muted)'">
                #${row.ticket.id} ↗
              </a>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function statusBadge(state) {
  if (state === "open") {
    return `<span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px;
      background:rgba(110,231,183,0.15); color:var(--green); border:1px solid rgba(110,231,183,0.3);">OPEN</span>`;
  }
  return `<span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px;
    background:rgba(255,255,255,0.07); color:var(--muted); border:1px solid rgba(255,255,255,0.1);">CLOSED</span>`;
}

function renderTicketCard(ticket) {
  const fields    = parseTicketFields(ticket.body);
  const listed    = isAlreadyListed(ticket.body);
  const agent     = isAgentSubmitted(ticket.body);
  const daysOpen  = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 86400000);
  const typeIcon  = { game: "🎮", tool: "🔧", platform: "🌐", infrastructure: "🏗" }[fields.type] || "📋";

  return `
    <div style="background:var(--panel-2); border:1px solid var(--border); border-radius:10px;
                padding:14px 16px; display:flex; flex-direction:column; gap:8px;">

      <!-- Header row -->
      <div style="display:flex; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:3px;">
            <span style="font-size:13px; font-weight:700; color:var(--text);">${escapeHtml(ticket.title.replace(/^\[Project Listing\]\s*/i, ""))}</span>
            ${statusBadge(ticket.state)}
            ${listed ? `<span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px;
              background:rgba(105,179,255,0.15); color:var(--blue); border:1px solid rgba(105,179,255,0.3);">IN HUB</span>` : ""}
            ${agent ? `<span style="font-size:9px; font-weight:700; padding:2px 6px; border-radius:10px;
              background:rgba(255,201,116,0.15); color:var(--gold); border:1px solid rgba(255,201,116,0.3);">AGENT</span>` : ""}
          </div>
          <div style="font-size:11px; color:var(--muted);">
            #${ticket.id} · by <span style="color:var(--text);">@${escapeHtml(ticket.author)}</span>
            · opened ${timeAgo(ticket.createdAt)}
            ${ticket.updatedAt !== ticket.createdAt ? `· updated ${timeAgo(ticket.updatedAt)}` : ""}
          </div>
        </div>
        <a href="${ticket.url}" target="_blank" rel="noopener"
           style="font-size:11px; padding:5px 10px; background:none; border:1px solid var(--border);
                  border-radius:6px; color:var(--muted); cursor:pointer; text-decoration:none;
                  white-space:nowrap; flex-shrink:0; transition:all 0.15s;"
           onmouseover="this.style.color='var(--cyan)';this.style.borderColor='var(--cyan)'"
           onmouseout="this.style.color='var(--muted)';this.style.borderColor='var(--border)'">
          View on GitHub ↗
        </a>
      </div>

      <!-- Parsed fields -->
      ${fields.repo || fields.type || fields.description ? `
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${fields.repo ? `
            <span style="font-size:11px; font-family:monospace; background:rgba(255,255,255,0.05);
                         border:1px solid rgba(255,255,255,0.08); border-radius:5px; padding:2px 8px; color:var(--text);">
              ${escapeHtml(fields.repo)}
            </span>` : ""}
          ${fields.type ? `
            <span style="font-size:11px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
                         border-radius:5px; padding:2px 8px; color:var(--muted);">
              ${typeIcon} ${escapeHtml(fields.type)}
            </span>` : ""}
          ${fields.status ? `
            <span style="font-size:11px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
                         border-radius:5px; padding:2px 8px; color:var(--muted);">
              ${escapeHtml(fields.status)}
            </span>` : ""}
          ${fields.deployedUrl && fields.deployedUrl !== "N/A" ? `
            <a href="${escapeHtml(fields.deployedUrl)}" target="_blank" rel="noopener"
               style="font-size:11px; background:rgba(110,231,183,0.08); border:1px solid rgba(110,231,183,0.2);
                      border-radius:5px; padding:2px 8px; color:var(--green); text-decoration:none;">
              ↗ Live
            </a>` : ""}
          ${fields.studioOsCompliant ? `
            <span style="font-size:9px; font-weight:700; padding:2px 6px; border-radius:8px;
                         background:rgba(110,231,183,0.1); color:var(--green); border:1px solid rgba(110,231,183,0.25);">
              ✓ STUDIO OS
            </span>` : `
            <span style="font-size:9px; font-weight:700; padding:2px 6px; border-radius:8px;
                         background:rgba(255,201,116,0.1); color:var(--gold); border:1px solid rgba(255,201,116,0.25);"
                  title="Studio OS files not confirmed. Project must apply Studio OS before hub acceptance.">
              ⚠ NO STUDIO OS
            </span>`}
        </div>
      ` : ""}

      ${fields.description && fields.description !== "—" ? `
        <div style="font-size:12px; color:var(--muted); line-height:1.5;">
          ${escapeHtml(fields.description).slice(0, 160)}${fields.description.length > 160 ? "…" : ""}
        </div>
      ` : ""}

      <!-- Footer -->
      <div style="display:flex; align-items:center; gap:12px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
        ${ticket.comments > 0 ? `
          <span style="font-size:11px; color:var(--muted);">
            💬 ${ticket.comments} comment${ticket.comments !== 1 ? "s" : ""}
          </span>
        ` : `<span style="font-size:11px; color:var(--muted);">No comments yet</span>`}
        ${ticket.state === "open" && daysOpen > 3 ? `
          <span style="font-size:11px; color:var(--gold);">Pending ${daysOpen}d</span>
        ` : ""}
        ${ticket.state === "closed" && listed ? `
          <span style="font-size:11px; color:var(--green);">Added to Hub</span>
        ` : ""}
        ${ticket.state === "closed" && !listed ? `
          <span style="font-size:11px; color:var(--muted);">Closed (not added)</span>
        ` : ""}
      </div>
    </div>
  `;
}

export function renderTicketingView(state) {
  const {
    tickets = [], ticketsLoading = false, ticketSubmitting = false, ticketSuccess = null, ticketError = null,
    ticketingTab = "listing",
    renameSubmitting = false, renameSuccess = null, renameError = null,
    initiateSubmitting = false, initiateSuccess = null, initiateError = null,
  } = state;

  const openTickets   = tickets.filter((t) => t.state === "open");
  const closedTickets = tickets.filter((t) => t.state === "closed");

  const inputStyle = `
    width:100%; background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:8px;
    color:var(--text); font:inherit; font-size:12px; padding:8px 12px; outline:none; box-sizing:border-box;
    transition:border-color 0.15s;
  `;
  const labelStyle = `display:block; font-size:10px; font-weight:700; letter-spacing:0.07em;
    text-transform:uppercase; color:var(--muted); margin-bottom:5px;`;
  const fieldStyle = `margin-bottom:14px;`;

  return `
    <div class="main-panel">
      <div class="view-header">
        <div>
          <div class="view-title">Project Ticketing</div>
          <div class="view-subtitle">Submit a project for listing in the Studio Hub. Tickets become GitHub issues for review and feedback.</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button id="tickets-refresh-btn"
            style="font-size:11px; padding:6px 12px; background:rgba(122,231,199,0.06);
                   border:1px solid var(--border); border-radius:8px; color:var(--muted); cursor:pointer;">
            ${ticketsLoading ? "Loading…" : "↺ Refresh"}
          </button>
        </div>
      </div>

      <!-- Tab bar -->
      <div style="display:flex; gap:4px; margin-bottom:24px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:0;">
        ${[
          { id: "listing",  label: "Project Listing" },
          { id: "rename",   label: "Rename / Rebrand" },
          { id: "initiate", label: "Initiate Project" },
        ].map(({ id, label }) => {
          const active = ticketingTab === id;
          return `<button data-ticketing-tab="${id}" style="
            padding:8px 16px; font-size:12px; font-weight:${active ? "700" : "500"};
            color:${active ? "var(--cyan)" : "var(--muted)"};
            background:none; border:none; border-bottom:2px solid ${active ? "var(--cyan)" : "transparent"};
            cursor:pointer; transition:all 0.12s; margin-bottom:-1px; white-space:nowrap;
          ">${label}</button>`;
        }).join("")}
      </div>

      <!-- Listing tab -->
      <div style="display:${ticketingTab === "listing" ? "grid" : "none"}; grid-template-columns:minmax(280px,380px) 1fr; gap:24px; align-items:start;
                  @media(max-width:700px){grid-template-columns:1fr;}">

        <!-- ── Submission Form ── -->
        <div>
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">SUBMIT LISTING REQUEST</span>
            </div>
            <div class="panel-body">
              ${ticketSuccess ? `
                <div style="background:rgba(110,231,183,0.1); border:1px solid rgba(110,231,183,0.3);
                            border-radius:8px; padding:14px 16px; margin-bottom:16px;">
                  <div style="font-size:13px; font-weight:700; color:var(--green); margin-bottom:4px;">Ticket submitted!</div>
                  <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
                    Issue #${ticketSuccess.id} created. The Studio operator will review and add your project.
                  </div>
                  <a href="${ticketSuccess.url}" target="_blank" rel="noopener"
                     style="font-size:12px; color:var(--cyan); text-decoration:none;">View on GitHub →</a>
                </div>
              ` : ""}
              ${ticketError ? `
                <div style="background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3);
                            border-radius:8px; padding:12px 14px; margin-bottom:16px;">
                  <div style="font-size:12px; color:var(--red);">${escapeHtml(ticketError)}</div>
                </div>
              ` : ""}

              <form id="ticket-submit-form" onsubmit="return false;">
                <div style="${fieldStyle}">
                  <label style="${labelStyle}">Project Name *</label>
                  <input id="ticket-name" type="text" required placeholder="e.g. Dungeon Crawler Pro"
                    style="${inputStyle}" />
                </div>
                <div style="${fieldStyle}">
                  <label style="${labelStyle}">GitHub Repository *</label>
                  <input id="ticket-repo" type="text" required placeholder="VaultSparkStudios/repo-name"
                    style="${inputStyle}" />
                  <div style="font-size:10px; color:var(--muted); margin-top:4px;">Format: org/repo</div>
                </div>
                <div style="${fieldStyle}">
                  <label style="${labelStyle}">Project Type *</label>
                  <select id="ticket-type" style="${inputStyle} cursor:pointer;">
                    <option value="">— Select type —</option>
                    ${TYPES.map((t) => `<option value="${t.value}">${t.label}</option>`).join("")}
                  </select>
                </div>
                <div style="${fieldStyle}">
                  <label style="${labelStyle}">Current Status *</label>
                  <select id="ticket-status" style="${inputStyle} cursor:pointer;">
                    <option value="">— Select status —</option>
                    ${STATUSES.map((s) => `<option value="${s.value}">${s.label}</option>`).join("")}
                  </select>
                </div>
                <div style="${fieldStyle}">
                  <label style="${labelStyle}">Description *</label>
                  <textarea id="ticket-description" rows="3" required
                    placeholder="Brief description of the project and what it does…"
                    style="${inputStyle} resize:vertical; min-height:72px;"></textarea>
                </div>
                <div style="${fieldStyle}">
                  <label style="${labelStyle}">Deployed URL</label>
                  <input id="ticket-deployed-url" type="url" placeholder="https://…"
                    style="${inputStyle}" />
                </div>
                <div style="${fieldStyle}">
                  <label style="${labelStyle}">Supabase Game Slug</label>
                  <input id="ticket-supabase-slug" type="text" placeholder="e.g. dungeon-crawler-pro"
                    style="${inputStyle}" />
                  <div style="font-size:10px; color:var(--muted); margin-top:4px;">Only for games using Supabase session tracking</div>
                </div>
                <div style="${fieldStyle}">
                  <label style="${labelStyle}">Brand Color</label>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <input id="ticket-color-picker" type="color" value="#7ae7c7"
                      style="width:36px; height:36px; border:1px solid var(--border); border-radius:6px;
                             background:none; padding:2px; cursor:pointer;" />
                    <input id="ticket-color-hex" type="text" placeholder="#7ae7c7" maxlength="7"
                      style="${inputStyle} flex:1;" />
                  </div>
                </div>

                <!-- Studio OS Compliance Checklist -->
                <div style="margin-bottom:16px; padding:12px 14px; background:rgba(255,255,255,0.02);
                            border:1px solid var(--border); border-radius:8px;">
                  <div style="font-size:10px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase;
                              color:var(--gold); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                    Studio OS Compliance
                    <span style="font-size:9px; color:var(--muted); font-weight:400; text-transform:none; letter-spacing:0;">
                      (required for hub acceptance)
                    </span>
                  </div>
                  <div style="font-size:11px; color:var(--muted); margin-bottom:10px; line-height:1.5;">
                    Confirm the following files exist in the project repo. See
                    <code style="font-size:10px;">studio-ops/docs/STUDIO_HUB_ONBOARDING.md</code> for setup instructions.
                  </div>
                  <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
                    ${[
                      "AGENTS.md",
                      "context/PROJECT_BRIEF.md",
                      "context/SOUL.md",
                      "context/CURRENT_STATE.md",
                      "context/TASK_BOARD.md",
                      "context/LATEST_HANDOFF.md",
                      "prompts/start.md",
                      "prompts/closeout.md",
                    ].map((f, i) => `
                      <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" class="studio-os-check" data-file="${f}"
                          style="accent-color:var(--cyan); width:14px; height:14px; cursor:pointer;" />
                        <code style="font-size:11px; color:var(--text);">${f}</code>
                      </label>
                    `).join("")}
                  </div>
                  <div id="studio-os-status" style="font-size:11px; color:var(--muted);"></div>
                </div>

                <button id="ticket-submit-btn" type="submit"
                  style="width:100%; padding:10px; font-size:13px; font-weight:700;
                         background:rgba(122,231,199,0.12); border:1px solid rgba(122,231,199,0.3);
                         border-radius:8px; color:var(--cyan); cursor:pointer; transition:all 0.15s;
                         ${ticketSubmitting ? "opacity:0.6; pointer-events:none;" : ""}"
                  ${ticketSubmitting ? "disabled" : ""}>
                  ${ticketSubmitting ? "Submitting…" : "Submit Listing Request →"}
                </button>

                <div style="font-size:10px; color:var(--muted); margin-top:10px; line-height:1.5;">
                  Requires a GitHub token with <code style="font-size:9px;">repo</code> scope. Submits a GitHub issue to the Studio Hub repo for operator review.
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- ── Ticket Queue ── -->
        <div>
          <!-- Pipeline overview -->
          ${renderPipelineOverview(tickets)}

          <!-- Stats bar -->
          <div style="display:flex; gap:16px; margin-bottom:16px; flex-wrap:wrap;">
            <div style="background:var(--panel-2); border:1px solid var(--border); border-radius:8px;
                        padding:10px 16px; flex:1; min-width:80px; text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--green);">${openTickets.length}</div>
              <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em;">Pending</div>
            </div>
            <div style="background:var(--panel-2); border:1px solid var(--border); border-radius:8px;
                        padding:10px 16px; flex:1; min-width:80px; text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--muted);">${closedTickets.length}</div>
              <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em;">Closed</div>
            </div>
            <div style="background:var(--panel-2); border:1px solid var(--border); border-radius:8px;
                        padding:10px 16px; flex:1; min-width:80px; text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--blue);">${closedTickets.filter((t) => {
                const fields = parseTicketFields(t.body);
                return fields.repo && PROJECTS.some((p) => p.githubRepo === fields.repo);
              }).length}</div>
              <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em;">Added</div>
            </div>
          </div>

          ${ticketsLoading && !tickets.length ? `
            <div class="panel" style="padding:32px; text-align:center; color:var(--muted); font-size:13px;">
              <div style="width:8px; height:8px; border-radius:50%; background:var(--cyan); margin:0 auto 12px;
                          animation:pulse 1s infinite;"></div>
              Loading ticket queue…
            </div>
          ` : tickets.length === 0 ? `
            <div class="panel" style="padding:32px; text-align:center;">
              <div style="font-size:32px; margin-bottom:8px;">📋</div>
              <div style="font-size:13px; color:var(--muted);">No listing tickets yet.</div>
              <div style="font-size:12px; color:var(--muted); margin-top:4px;">Submit the first one using the form.</div>
            </div>
          ` : `
            ${openTickets.length ? `
              <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
                          color:var(--muted); margin-bottom:10px;">Pending Review (${openTickets.length})</div>
              <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
                ${openTickets.map(renderTicketCard).join("")}
              </div>
            ` : ""}
            ${closedTickets.length ? `
              <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
                          color:var(--muted); margin-bottom:10px;">Recently Closed (${closedTickets.length})</div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${closedTickets.map(renderTicketCard).join("")}
              </div>
            ` : ""}
          `}
        </div>
      </div>
    </div>

      <!-- Initiate Project tab -->
      ${ticketingTab === "initiate" ? (() => {
        const iStyle = `width:100%; background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:8px;
          color:var(--text); font:inherit; font-size:12px; padding:8px 12px; outline:none; box-sizing:border-box; transition:border-color 0.15s;`;
        const lStyle = `display:block; font-size:10px; font-weight:700; letter-spacing:0.07em;
          text-transform:uppercase; color:var(--muted); margin-bottom:5px;`;
        const fStyle = `margin-bottom:14px;`;

        return `
        <div style="display:grid; grid-template-columns:minmax(280px,400px) 1fr; gap:24px; align-items:start;">

          <!-- Form -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">INITIATE NEW PROJECT</span>
              <span style="font-size:9px; font-weight:700; padding:1px 6px; border-radius:8px;
                background:rgba(248,113,113,0.12); color:var(--red); border:1px solid rgba(248,113,113,0.25);
                letter-spacing:0.06em;">PRIVATE</span>
            </div>
            <div class="panel-body">
              <div style="font-size:11px; color:var(--muted); margin-bottom:16px; line-height:1.5;
                           background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.15);
                           border-radius:6px; padding:10px 12px;">
                All new projects start <strong style="color:var(--text);">private</strong>.
                No public info is shared until the Studio Owner explicitly approves visibility.
                This creates a tracked issue in <code style="font-size:10px;">vaultspark-studio-ops</code> only.
              </div>

              ${initiateSuccess ? `
                <div style="background:rgba(110,231,183,0.1); border:1px solid rgba(110,231,183,0.3);
                            border-radius:8px; padding:14px 16px; margin-bottom:16px;">
                  <div style="font-size:13px; font-weight:700; color:var(--green); margin-bottom:4px;">Initiation request submitted!</div>
                  <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
                    Issue #${initiateSuccess.id} created in <code style="font-size:11px;">vaultspark-studio-ops</code>.
                    Project stays private until Studio Owner approves.
                  </div>
                  <a href="${initiateSuccess.url}" target="_blank" rel="noopener"
                     style="font-size:12px; color:var(--cyan); text-decoration:none;">View on GitHub →</a>
                </div>
              ` : ""}
              ${initiateError ? `
                <div style="background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3);
                            border-radius:8px; padding:12px 14px; margin-bottom:16px;">
                  <div style="font-size:12px; color:var(--red);">${escapeHtml(initiateError)}</div>
                </div>
              ` : ""}

              <form id="initiate-submit-form" onsubmit="return false;">
                <div style="${fStyle}">
                  <label style="${lStyle}">Codename / Working Title *</label>
                  <input id="initiate-codename" type="text" required placeholder="e.g. Project Nova"
                    style="${iStyle}" />
                  <div style="font-size:10px; color:var(--muted); margin-top:3px;">Internal name only — not public until approved</div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
                  <div>
                    <label style="${lStyle}">Project Type *</label>
                    <select id="initiate-type" style="${iStyle} cursor:pointer;">
                      <option value="">— Select type —</option>
                      ${[
                        { value: "game",           label: "Game" },
                        { value: "tool",           label: "Tool" },
                        { value: "platform",       label: "Platform / App" },
                        { value: "infrastructure", label: "Infrastructure" },
                      ].map((t) => `<option value="${t.value}">${t.label}</option>`).join("")}
                    </select>
                  </div>
                  <div>
                    <label style="${lStyle}">Priority</label>
                    <select id="initiate-priority" style="${iStyle} cursor:pointer;">
                      <option value="low">Low</option>
                      <option value="medium" selected>Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div style="${fStyle}">
                  <label style="${lStyle}">Vault Status</label>
                  <select id="initiate-vault-status" style="${iStyle} cursor:pointer;">
                    <option value="forge" selected>FORGE — in development</option>
                    <option value="sparked">SPARKED — live / active</option>
                    <option value="vaulted">VAULTED — paused / shelved</option>
                  </select>
                </div>

                <div style="${fStyle}">
                  <label style="${lStyle}">Brief *</label>
                  <textarea id="initiate-brief" rows="3" required
                    placeholder="What is this project? What problem does it solve?"
                    style="${iStyle} resize:vertical; min-height:72px;"></textarea>
                </div>

                <div style="${fStyle}">
                  <label style="${lStyle}">Soul / Vision</label>
                  <textarea id="initiate-soul" rows="4"
                    placeholder="What is the core feeling, identity, or long-term vision? (optional — can be defined in first session)"
                    style="${iStyle} resize:vertical; min-height:88px;"></textarea>
                </div>

                <button id="initiate-submit-btn" type="submit"
                  style="width:100%; padding:10px; font-size:13px; font-weight:700;
                         background:rgba(251,146,60,0.1); border:1px solid rgba(251,146,60,0.3);
                         border-radius:8px; color:#fb923c; cursor:pointer; transition:all 0.15s;
                         ${initiateSubmitting ? "opacity:0.6; pointer-events:none;" : ""}"
                  ${initiateSubmitting ? "disabled" : ""}>
                  ${initiateSubmitting ? "Initiating…" : "Initiate Project →"}
                </button>

                <div style="font-size:10px; color:var(--muted); margin-top:10px; line-height:1.5;">
                  Creates a <strong>private</strong> GitHub issue in <code style="font-size:9px;">vaultspark-studio-ops</code>
                  with label <code style="font-size:9px;">project-initiation</code>.
                  Requires a token with <code style="font-size:9px;">repo</code> scope.
                </div>
              </form>
            </div>
          </div>

          <!-- Protocol overview -->
          <div>
            <div class="panel" style="margin-bottom:16px;">
              <div class="panel-header"><span class="panel-title">HOW IT WORKS</span></div>
              <div class="panel-body" style="font-size:12px; color:var(--muted); line-height:1.7;">
                <div style="margin-bottom:12px;">
                  All new projects begin in the <strong style="color:#fb923c;">FORGE</strong> — private, tracked,
                  and under Studio OS protocol from day one.
                  No public presence until the Studio Owner flips the switch.
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${[
                    ["1", "Submit",    "Form creates private issue in studio-ops with brief + soul"],
                    ["2", "Approve",   "Studio Owner reviews and labels as approved in GitHub"],
                    ["3", "Bootstrap", "Agent creates private repo + applies Studio OS template files"],
                    ["4", "Register",  "Added to PROJECT_REGISTRY.json and studioRegistry.js"],
                    ["5", "First Run", "Run start in new repo — project enters the protocol"],
                    ["6", "Go Live",   "Studio Owner approves public visibility when ready"],
                  ].map(([n, lbl, desc]) => `
                    <div style="display:flex; gap:10px; align-items:flex-start;">
                      <div style="width:18px; height:18px; border-radius:50%;
                                  background:rgba(251,146,60,0.15); border:1px solid rgba(251,146,60,0.3);
                                  color:#fb923c; font-size:10px; font-weight:800;
                                  display:flex; align-items:center; justify-content:center; flex-shrink:0;">${n}</div>
                      <div>
                        <div style="font-size:11px; font-weight:700; color:var(--text); margin-bottom:1px;">${lbl}</div>
                        <div style="font-size:11px; color:var(--muted);">${desc}</div>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-header"><span class="panel-title">PRIVACY PROTOCOL</span></div>
              <div class="panel-body" style="font-size:11px; color:var(--muted); line-height:1.7;">
                <div style="display:flex; flex-direction:column; gap:6px;">
                  ${[
                    "GitHub repo created as <strong style='color:var(--text);'>private</strong>",
                    "Issue created in studio-ops only (not public hub)",
                    "Not added to public studioRegistry until approved",
                    "No deployedUrl, no branding, no external links",
                    "Studio Owner controls visibility flag in PROJECT_REGISTRY.json",
                    "Branding protocol (CANON-006) applies only after public approval",
                  ].map((item) => `
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                      <span style="color:#fb923c; font-weight:800; flex-shrink:0;">·</span>
                      <span>${item}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>

        </div>
        `;
      })() : ""}

      <!-- Rename / Rebrand tab -->
      ${ticketingTab === "rename" ? (() => {
        const iStyle = `width:100%; background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:8px;
          color:var(--text); font:inherit; font-size:12px; padding:8px 12px; outline:none; box-sizing:border-box; transition:border-color 0.15s;`;
        const lStyle = `display:block; font-size:10px; font-weight:700; letter-spacing:0.07em;
          text-transform:uppercase; color:var(--muted); margin-bottom:5px;`;
        const fStyle = `margin-bottom:14px;`;

        return `
        <div style="display:grid; grid-template-columns:minmax(280px,400px) 1fr; gap:24px; align-items:start;">

          <!-- Form -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">RENAME / REBRAND REQUEST</span>
            </div>
            <div class="panel-body">
              ${renameSuccess ? `
                <div style="background:rgba(110,231,183,0.1); border:1px solid rgba(110,231,183,0.3);
                            border-radius:8px; padding:14px 16px; margin-bottom:16px;">
                  <div style="font-size:13px; font-weight:700; color:var(--green); margin-bottom:4px;">Request submitted!</div>
                  <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
                    Issue #${renameSuccess.id} created in <code style="font-size:11px;">vaultspark-studio-ops</code>.
                    The Studio Owner will review and approve before execution begins.
                  </div>
                  <a href="${renameSuccess.url}" target="_blank" rel="noopener"
                     style="font-size:12px; color:var(--cyan); text-decoration:none;">View on GitHub →</a>
                </div>
              ` : ""}
              ${renameError ? `
                <div style="background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3);
                            border-radius:8px; padding:12px 14px; margin-bottom:16px;">
                  <div style="font-size:12px; color:var(--red);">${escapeHtml(renameError)}</div>
                </div>
              ` : ""}

              <form id="rename-submit-form" onsubmit="return false;">
                <div style="${fStyle}">
                  <label style="${lStyle}">Change Type *</label>
                  <select id="rename-change-type" style="${iStyle} cursor:pointer;">
                    <option value="">— Select change type —</option>
                    ${CHANGE_TYPES.map((t) => `<option value="${t.value}">${t.label}</option>`).join("")}
                  </select>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
                  <div>
                    <label style="${lStyle}">Current Name *</label>
                    <input id="rename-current-name" type="text" required placeholder="e.g. StatsForge"
                      style="${iStyle}" />
                  </div>
                  <div>
                    <label style="${lStyle}">Current Slug</label>
                    <input id="rename-current-slug" type="text" placeholder="e.g. statsforge"
                      style="${iStyle}" />
                  </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
                  <div>
                    <label style="${lStyle}">Proposed New Name *</label>
                    <input id="rename-proposed-name" type="text" required placeholder="e.g. StatVault"
                      style="${iStyle}" />
                  </div>
                  <div>
                    <label style="${lStyle}">New Slug (optional)</label>
                    <input id="rename-proposed-slug" type="text" placeholder="e.g. statvault"
                      style="${iStyle}" />
                    <div style="font-size:10px; color:var(--muted); margin-top:3px;">Auto-derived if blank</div>
                  </div>
                </div>

                <div style="${fStyle}">
                  <label style="${lStyle}">GitHub Repo URL Changing?</label>
                  <select id="rename-repo-changing" style="${iStyle} cursor:pointer;">
                    <option value="no">No — same repo URL</option>
                    <option value="yes">Yes — repo will be renamed on GitHub</option>
                  </select>
                </div>

                <div style="${fStyle}">
                  <label style="${lStyle}">New Repo URL (if changing)</label>
                  <input id="rename-new-repo" type="text" placeholder="VaultSparkStudios/new-repo-name"
                    style="${iStyle}" />
                  <div style="font-size:10px; color:var(--muted); margin-top:3px;">Format: org/repo — leave blank if not changing</div>
                </div>

                <div style="${fStyle}">
                  <label style="${lStyle}">Reason *</label>
                  <textarea id="rename-reason" rows="4" required
                    placeholder="Why is this rename or rebrand happening? This goes into DECISIONS.md…"
                    style="${iStyle} resize:vertical; min-height:88px;"></textarea>
                </div>

                <button id="rename-submit-btn" type="submit"
                  style="width:100%; padding:10px; font-size:13px; font-weight:700;
                         background:rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.3);
                         border-radius:8px; color:#a78bfa; cursor:pointer; transition:all 0.15s;
                         ${renameSubmitting ? "opacity:0.6; pointer-events:none;" : ""}"
                  ${renameSubmitting ? "disabled" : ""}>
                  ${renameSubmitting ? "Submitting…" : "Submit Rename Request →"}
                </button>

                <div style="font-size:10px; color:var(--muted); margin-top:10px; line-height:1.5;">
                  Creates a GitHub issue in <code style="font-size:9px;">vaultspark-studio-ops</code>
                  with label <code style="font-size:9px;">rename-rebrand</code>.
                  Requires a token with <code style="font-size:9px;">repo</code> scope.
                </div>
              </form>
            </div>
          </div>

          <!-- Protocol overview -->
          <div>
            <div class="panel" style="margin-bottom:16px;">
              <div class="panel-header"><span class="panel-title">HOW IT WORKS</span></div>
              <div class="panel-body" style="font-size:12px; color:var(--muted); line-height:1.7;">
                <div style="margin-bottom:12px;">
                  Submitting this form creates a <strong style="color:var(--text);">tracked GitHub issue</strong>
                  in <code style="font-size:11px;">vaultspark-studio-ops</code> with a full execution checklist.
                  No changes are made until the Studio Owner approves.
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${[
                    ["1","Submit",  "Form creates issue with rename details + checklist"],
                    ["2","Review",  "Studio Owner reviews and approves in GitHub"],
                    ["3","Execute", "Agent runs through all 12 checklist items in order"],
                    ["4","Verify",  "Generated surfaces regenerated, CI confirmed green"],
                    ["5","Close",   "Issue closed with summary comment + commit SHAs"],
                  ].map(([n, lbl, desc]) => `
                    <div style="display:flex; gap:10px; align-items:flex-start;">
                      <div style="width:18px; height:18px; border-radius:50%;
                                  background:rgba(167,139,250,0.15); border:1px solid rgba(167,139,250,0.3);
                                  color:#a78bfa; font-size:10px; font-weight:800;
                                  display:flex; align-items:center; justify-content:center; flex-shrink:0;">${n}</div>
                      <div>
                        <div style="font-size:11px; font-weight:700; color:var(--text); margin-bottom:1px;">${lbl}</div>
                        <div style="font-size:11px; color:var(--muted);">${desc}</div>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-header"><span class="panel-title">12-SURFACE CHECKLIST</span></div>
              <div class="panel-body" style="padding:8px 0 4px;">
                ${[
                  "portfolio/PROJECT_REGISTRY.json",
                  "src/data/studioRegistry.js (Hub)",
                  "context/PROJECT_STATUS.json",
                  "context/PROJECT_BRIEF.md",
                  "context/PORTFOLIO_CARD.md",
                  "context/LATEST_HANDOFF.md",
                  "AGENTS.md + CLAUDE.md",
                  "Generated portfolio surfaces",
                  "context/DECISIONS.md",
                  "docs/CREATIVE_DIRECTION_RECORD.md",
                  "GitHub repo rename (if applicable)",
                  "CI verification",
                ].map((item, i) => `
                  <div style="display:flex; align-items:center; gap:10px; padding:7px 16px;
                              border-bottom:1px solid rgba(255,255,255,0.03); font-size:11px;">
                    <span style="font-size:10px; font-weight:700; color:rgba(167,139,250,0.5); min-width:16px; text-align:right;">${i + 1}</span>
                    <code style="color:var(--muted); font-size:11px;">${item}</code>
                  </div>
                `).join("")}
                <div style="padding:10px 16px; font-size:10px; color:var(--muted);">
                  Full protocol: <code style="font-size:10px;">docs/RENAME_PROTOCOL.md</code>
                </div>
              </div>
            </div>
          </div>

        </div>
        `;
      })() : ""}

  </div>
  `;
}
