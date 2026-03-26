import { PROJECTS } from "../data/studioRegistry.js";
import { timeAgo, escapeHtml } from "../utils/helpers.js";

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
  const { tickets = [], ticketsLoading = false, ticketSubmitting = false, ticketSuccess = null, ticketError = null } = state;

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

      <div style="display:grid; grid-template-columns:minmax(280px,380px) 1fr; gap:24px; align-items:start;
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
  `;
}
