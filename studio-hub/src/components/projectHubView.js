import { scoreProject } from "../utils/projectScoring.js";
import { timeAgo, fmt, escapeHtml } from "../utils/helpers.js";
import { scorePotential, scoreMomentumIndex, potentialLabel, momentumLabel } from "../utils/proprietaryScores.js";

const LOCAL_PATHS_KEY = "vshub_local_paths";
function loadLocalPaths() { try { return JSON.parse(localStorage.getItem(LOCAL_PATHS_KEY) || "{}"); } catch { return {}; } }

const ACTION_QUEUE_KEY  = "vshub_action_queue";
const CHECKLIST_KEY     = "vshub_checklist";
const ROADMAP_KEY       = "vshub_roadmap";

function loadChecklist() { try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || "{}"); } catch { return {}; } }
function loadRoadmap() {
  try {
    const raw = JSON.parse(localStorage.getItem(ROADMAP_KEY) || "{}");
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

function loadActionQueue() {
  try { return JSON.parse(localStorage.getItem(ACTION_QUEUE_KEY) || "{}"); } catch { return {}; }
}

function renderVsCodeSection(project) {
  const paths = loadLocalPaths();
  const localPath = paths[project.id] || "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">OPEN IN EDITOR</span>
      </div>
      <div class="hub-section-body">
        ${localPath ? `
          <a href="vscode://file/${encodeURI(localPath)}"
            style="display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:7px 14px;
                   background:rgba(105,179,255,0.1); border:1px solid rgba(105,179,255,0.25); border-radius:8px;
                   color:var(--blue); cursor:pointer; text-decoration:none; margin-bottom:10px;"
            onclick="event.stopPropagation()">
            ⎆ Open in VS Code
          </a>
          <br>
        ` : ""}
        <div style="display:flex; gap:8px; align-items:center;">
          <input id="local-path-input-${project.id}" type="text"
            value="${localPath.replace(/"/g, "&quot;")}"
            placeholder="/Users/you/projects/${project.id}"
            style="flex:1; background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:8px;
                   color:var(--text); font:inherit; font-size:12px; padding:8px 12px; outline:none;" />
          <button id="local-path-save-${project.id}" data-project-id="${project.id}"
            style="font-size:12px; padding:8px 14px; background:rgba(105,179,255,0.1); border:1px solid rgba(105,179,255,0.25);
                   border-radius:8px; color:var(--blue); cursor:pointer; white-space:nowrap;">Save path</button>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:5px;">
          Set your local repo folder path to enable VS Code deep-link. Windows: <code style="font-size:10px;">C:/Users/you/projects/name</code>
        </div>
      </div>
    </div>
  `;
}

function renderGitHubSection(project, repoData) {
  if (!repoData) {
    return `
      <div class="hub-section">
        <div class="hub-section-header">
          <span class="hub-section-title">GITHUB</span>
        </div>
        <div class="hub-section-body">
          <div class="empty-state">
            No GitHub data. ${project.githubRepo
              ? "Configure a GitHub token to access this repo."
              : "No GitHub repo linked for this project."}
          </div>
          ${project.githubRepo ? `
            <div style="text-align:center; margin-top:8px;">
              <a href="https://github.com/${project.githubRepo}" target="_blank" rel="noopener"
                 style="color:var(--blue); font-size:12px;">
                Open on GitHub ↗
              </a>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }

  const { repo, commits, issues, prs, ciRuns, latestRelease } = repoData;

  const ciLatest = ciRuns?.[0];
  const ciClass = !ciLatest ? "unknown"
    : ciLatest.status === "in_progress" ? "running"
    : ciLatest.conclusion === "success" ? "passing"
    : ciLatest.conclusion === "failure" ? "failing"
    : "unknown";
  const ciLabel = !ciLatest ? "No CI"
    : ciLatest.status === "in_progress" ? "Running"
    : ciLatest.conclusion === "success" ? "Passing"
    : ciLatest.conclusion === "failure" ? "Failed"
    : ciLatest.conclusion || "Unknown";

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">GITHUB</span>
        <span class="hub-section-badge">
          <a href="https://github.com/${project.githubRepo}" target="_blank" rel="noopener"
             style="color:inherit;">${project.githubRepo} ↗</a>
        </span>
      </div>
      <div class="hub-section-body">
        <div class="two-col" style="gap:16px; margin-bottom:16px;">
          <div>
            <div class="data-row"><span class="label">Branch</span><span class="value">${repo?.defaultBranch || "main"}</span></div>
            <div class="data-row"><span class="label">Open Issues</span><span class="value">${fmt(repo?.openIssues)}</span></div>
            <div class="data-row"><span class="label">Open PRs</span><span class="value">${fmt(prs?.length)}</span></div>
            <div class="data-row"><span class="label">Stars</span><span class="value">${fmt(repo?.stars)}</span></div>
            <div class="data-row"><span class="label">Language</span><span class="value">${repo?.language || "—"}</span></div>
            <div class="data-row">
              <span class="label">CI Status</span>
              <span class="value"><span class="ci-badge ${ciClass}">${ciLabel}</span></span>
            </div>
            ${latestRelease ? `
              <div class="data-row">
                <span class="label">Latest Release</span>
                <span class="value">
                  <a href="${latestRelease.url}" target="_blank" rel="noopener" style="color:var(--blue);">
                    ${latestRelease.tag}
                  </a>
                  · ${timeAgo(latestRelease.publishedAt)}
                </span>
              </div>
            ` : ""}
          </div>

          <div>
            <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">Recent CI Runs</div>
            ${(ciRuns || []).length === 0
              ? `<div class="empty-state" style="padding:12px 0;">No CI runs found.</div>`
              : ciRuns.map((r) => {
                  const cls = r.status === "in_progress" ? "running"
                    : r.conclusion === "success" ? "passing"
                    : r.conclusion === "failure" ? "failing"
                    : "unknown";
                  return `
                    <div class="commit-item" style="margin-bottom:6px;">
                      <div class="commit-message" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span class="ci-badge ${cls}" style="font-size:10px;">${r.conclusion || r.status}</span>
                        ${r.name}
                        ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener"
                          style="font-size:10px; color:var(--blue); text-decoration:none; margin-left:auto; flex-shrink:0;"
                          title="View run on GitHub">View ↗</a>` : ""}
                      </div>
                      <div class="commit-meta">${timeAgo(r.triggeredAt)}</div>
                    </div>
                  `;
                }).join("")
            }
          </div>
        </div>

        <div style="margin-bottom:16px;">${renderCommitHeatmap(commits)}</div>

        <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">Recent Commits</div>
        <input id="commit-search-${project.id}" type="text" placeholder="Search commits…"
          style="width:100%; background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:8px;
                 color:var(--text); font:inherit; font-size:12px; padding:7px 12px; outline:none; margin-bottom:10px;
                 box-sizing:border-box;"
          value="" />
        <div id="commit-list-${project.id}" class="commit-list">
          ${(commits || []).length === 0
            ? `<div class="empty-state" style="padding:8px 0;">No commits found.</div>`
            : commits.map((c) => `
                <div class="commit-item" data-commit-date="${c.date}">
                  <div class="commit-message">${escapeHtml(c.message)}</div>
                  <div class="commit-meta">
                    <span class="commit-sha">${c.sha}</span>
                    · ${escapeHtml(c.author)}
                    · ${timeAgo(c.date)}
                  </div>
                </div>
              `).join("")
          }
        </div>

        ${(issues || []).length > 0 ? `
          <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin:16px 0 8px;">Open Issues</div>
          <div class="issue-list">
            ${issues.slice(0, 8).map((i) => `
              <div class="issue-item">
                <span class="issue-number">#${i.number}</span>
                <span class="issue-title">
                  <a href="${i.url}" target="_blank" rel="noopener" style="color:var(--text);">${i.title}</a>
                </span>
                <span style="color:var(--muted); font-size:11px;">${timeAgo(i.createdAt)}</span>
              </div>
            `).join("")}
          </div>
          ${renderIssueAgeDistribution(issues)}
        ` : ""}
      </div>
    </div>
  `;
}

function renderVaultSection(project, sbData) {
  if (!project.supabaseGameSlug) return "";

  const sessions = sbData?.sessions?.[project.supabaseGameSlug];
  const betaKeys = sbData?.betaKeys?.[project.supabaseGameSlug];

  if (!sbData) {
    return `
      <div class="hub-section">
        <div class="hub-section-header"><span class="hub-section-title">VAULT MEMBER ENGAGEMENT</span></div>
        <div class="hub-section-body">
          <div class="empty-state">No Supabase data. Configure supabase anon key to see live member engagement.</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">VAULT MEMBER ENGAGEMENT</span>
        <span class="hub-section-badge">${project.supabaseGameSlug}</span>
      </div>
      <div class="hub-section-body">
        <div class="three-col" style="gap:12px; margin-bottom:16px;">
          <div class="vital-card">
            <div class="vital-label">Sessions (7d)</div>
            <div class="vital-value cyan">${fmt(sessions?.week)}</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Sessions (Total)</div>
            <div class="vital-value">${fmt(sessions?.total)}</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Beta Keys Left</div>
            <div class="vital-value ${betaKeys?.available === 0 ? "red" : "green"}">${fmt(betaKeys?.available ?? "—")}</div>
          </div>
        </div>
        ${betaKeys ? `
          <div class="data-row"><span class="label">Total Keys</span><span class="value">${fmt(betaKeys.total)}</span></div>
          <div class="data-row"><span class="label">Claimed</span><span class="value">${fmt(betaKeys.claimed)}</span></div>
          <div class="data-row"><span class="label">Available</span><span class="value">${fmt(betaKeys.available)}</span></div>
        ` : `<div class="empty-state">No beta keys configured for this game.</div>`}
      </div>
    </div>
  `;
}

// ── Action Queue ─────────────────────────────────────────────────────────────
function renderActionQueue(project) {
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
                  <span style="flex:1; line-height:1.4;">${item.text}</span>
                  <button data-aq-delete="${project.id}" data-aq-id="${item.id}"
                    style="flex-shrink:0; background:none; border:none; color:var(--muted); cursor:pointer; font-size:12px; padding:2px 4px; line-height:1;">✕</button>
                </li>
              `).join("")}
            </ol>`
        }
        <div style="display:flex; gap:8px;">
          <input id="action-queue-input-${project.id}" type="text" placeholder="Add action item…"
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

// ── Commit Heatmap ─────────────────────────────────────────────────────────────
function renderCommitHeatmap(commits) {
  const buckets  = new Array(14).fill(0);
  const now      = Date.now();
  const dayMs    = 86400000;
  for (const c of (commits || [])) {
    const days = Math.floor((now - new Date(c.date).getTime()) / dayMs);
    if (days < 14) buckets[13 - days]++;
  }
  const maxVal = Math.max(...buckets, 1);
  const dayLabels = ["14d","13d","12d","11d","10d","9d","8d","7d","6d","5d","4d","3d","2d","1d"];
  return `
    <div>
      <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">
        Commit Activity — Last 14 Days <span style="font-size:9px; font-weight:400; color:var(--muted); margin-left:4px;">(click bar to filter)</span>
      </div>
      <div id="commit-heatmap" style="display:flex; gap:3px; align-items:flex-end; height:32px;">
        ${buckets.map((n, i) => {
          const daysAgo = 13 - i; // bar i = daysAgo days ago
          const h  = n === 0 ? 4 : Math.max(6, Math.round((n / maxVal) * 32));
          const op = n === 0 ? 0.1 : 0.25 + (n / maxVal) * 0.75;
          return `<div
            title="${n} commit${n !== 1 ? "s" : ""} ${dayLabels[i]} ago${n > 0 ? " — click to filter" : ""}"
            data-heatmap-day="${daysAgo}"
            style="flex:1; height:${h}px; background:var(--cyan); opacity:${op};
                   border-radius:2px; align-self:flex-end; cursor:${n > 0 ? "pointer" : "default"};
                   transition:opacity 0.1s, outline 0.1s;"
            ${n > 0 ? `onmouseover="this.style.opacity='1'; this.style.outline='1px solid var(--cyan)'"
                       onmouseout="this.style.opacity='${op}'; this.style.outline=''"` : ""}
          ></div>`;
        }).join("")}
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:3px;">
        <span style="font-size:9px; color:var(--muted);">14d ago</span>
        <span id="heatmap-filter-label" style="font-size:9px; color:var(--cyan);"></span>
        <span style="font-size:9px; color:var(--muted);">today</span>
      </div>
    </div>
  `;
}

// ── Contributors (last 30 days) ────────────────────────────────────────────────
function renderContributorsSection(repoData) {
  const allCommits = repoData?.commits;
  if (!allCommits?.length) return "";
  const cutoff = Date.now() - 30 * 86400000;
  const recent = allCommits.filter((c) => new Date(c.date).getTime() >= cutoff);
  const commits = recent.length > 0 ? recent : allCommits; // fall back to all if none in 30d
  const label = recent.length > 0 ? "CONTRIBUTORS · LAST 30 DAYS" : "CONTRIBUTORS";
  const counts = {};
  for (const c of commits) {
    const author = c.author || "Unknown";
    counts[author] = (counts[author] || 0) + 1;
  }
  const topContribs = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!topContribs.length) return "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">${label}</span>
      </div>
      <div class="hub-section-body">
        ${topContribs.map(([author, count], i) => `
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span style="font-size:11px; color:var(--muted); min-width:14px;">${i + 1}.</span>
            <span style="font-size:12px; color:var(--text); flex:1;">${escapeHtml(author)}</span>
            <div style="width:60px; height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden;">
              <div style="width:${Math.round((count / topContribs[0][1]) * 100)}%; height:100%; background:var(--cyan); border-radius:2px;"></div>
            </div>
            <span style="font-size:11px; color:var(--muted); min-width:24px; text-align:right;">${count}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Language breakdown ─────────────────────────────────────────────────────────
function renderLanguagesSection(languages) {
  if (!languages || typeof languages !== "object") return "";
  const entries = Object.entries(languages);
  if (!entries.length) return "";
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return "";
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  // Language colour palette (common langs; fallback to muted)
  const LANG_COLORS = {
    JavaScript: "#f7df1e", TypeScript: "#3178c6", HTML: "#e34c26",
    CSS: "#563d7c", Python: "#3572a5", Rust: "#dea584",
    Go: "#00add8", "C#": "#178600", "C++": "#f34b7d",
    Shell: "#89e051", Lua: "#000080", GDScript: "#355570",
  };
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">LANGUAGES</span>
        <span class="hub-section-badge">${sorted.length} detected</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; height:6px; border-radius:4px; overflow:hidden; margin-bottom:10px; gap:1px;">
          ${sorted.slice(0, 8).map(([lang, bytes]) => `
            <div style="flex:${bytes}; background:${LANG_COLORS[lang] || "var(--muted)"}; opacity:0.85;"
                 title="${escapeHtml(lang)}: ${Math.round(bytes / total * 100)}%"></div>
          `).join("")}
        </div>
        ${sorted.slice(0, 6).map(([lang, bytes]) => {
          const pct = Math.round(bytes / total * 100);
          const color = LANG_COLORS[lang] || "var(--muted)";
          return `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">
              <div style="width:8px; height:8px; border-radius:50%; background:${color}; flex-shrink:0;"></div>
              <span style="font-size:12px; color:var(--text); flex:1;">${escapeHtml(lang)}</span>
              <span style="font-size:11px; color:var(--muted);">${pct}%</span>
            </div>
          `;
        }).join("")}
        ${sorted.length > 6 ? `<div style="font-size:11px; color:var(--muted); margin-top:4px;">+${sorted.length - 6} more</div>` : ""}
      </div>
    </div>
  `;
}

// ── Branch list ────────────────────────────────────────────────────────────────
function renderBranchesSection(branches) {
  if (!Array.isArray(branches) || !branches.length) return "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">BRANCHES</span>
        <span class="hub-section-badge">${branches.length} active</span>
      </div>
      <div class="hub-section-body">
        ${branches.map((b) => `
          <div style="display:flex; align-items:center; gap:8px; padding:4px 0;
                      border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="font-size:11px; color:${b.protected ? "var(--gold)" : "var(--muted)"};">${b.protected ? "🔒" : "⎇"}</span>
            <span style="font-size:12px; color:var(--text); font-family:monospace;">${escapeHtml(b.name)}</span>
            ${b.protected ? `<span style="font-size:10px; color:var(--gold); margin-left:auto;">protected</span>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Dependency Snapshot ────────────────────────────────────────────────────────
function renderDependenciesSection(project, contextFiles) {
  const ctx = contextFiles?.[project.id];
  if (!ctx) return "";

  // Check for package.json raw content
  const pkgRaw = ctx.packageJson;
  if (!pkgRaw) return "";

  let pkg;
  try { pkg = typeof pkgRaw === "string" ? JSON.parse(pkgRaw) : pkgRaw; } catch { return ""; }

  const depsObj = pkg?.dependencies;
  if (!depsObj || typeof depsObj !== "object") return "";

  const deps = Object.entries(depsObj).slice(0, 5);
  if (!deps.length) return "";

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">DEPENDENCIES</span>
        <span class="hub-section-badge">${Object.keys(depsObj).length} total</span>
      </div>
      <div class="hub-section-body">
        ${deps.map(([name, ver]) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="font-size:12px; color:var(--text);">${escapeHtml(name)}</span>
            <span style="font-size:11px; color:var(--muted);">${escapeHtml(ver)}</span>
          </div>
        `).join("")}
        ${Object.keys(depsObj).length > 5 ? `<div style="font-size:11px; color:var(--muted); margin-top:6px;">+${Object.keys(depsObj).length - 5} more</div>` : ""}
      </div>
    </div>
  `;
}

// ── PR Status Board ────────────────────────────────────────────────────────────
function renderPRSection(project, repoData) {
  const prs = repoData?.prs;
  if (!prs?.length) return "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">PULL REQUESTS</span>
        <span class="hub-section-badge">${prs.length} open</span>
      </div>
      <div class="hub-section-body">
        ${prs.map((pr) => {
          const ageDays = Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / 86400000);
          const ageStyle = ageDays > 7 ? `color:var(--red); font-weight:700;` : `color:var(--muted);`;
          return `
          <div style="display:flex; align-items:flex-start; gap:12px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="flex-shrink:0; min-width:40px; text-align:right;">
              <span style="font-size:12px; color:var(--blue); font-weight:700;">#${pr.number}</span>
              ${pr.draft ? `<div style="font-size:9px; color:var(--muted); font-weight:700; letter-spacing:0.04em; margin-top:2px;">DRAFT</div>` : ""}
            </div>
            <div style="flex:1; min-width:0;">
              <a href="${pr.url}" target="_blank" rel="noopener"
                 style="font-size:13px; color:var(--text); font-weight:500; display:block; line-height:1.3; text-decoration:none;">
                ${pr.title}
              </a>
              <div style="font-size:11px; color:var(--muted); margin-top:3px;">
                ${pr.author} · opened ${timeAgo(pr.createdAt)} <span style="${ageStyle}">${ageDays > 7 ? `⏰ ${ageDays}d` : ""}</span>
              </div>
            </div>
          </div>
        `}).join("")}
      </div>
    </div>
  `;
}

// ── Issue Age Distribution ────────────────────────────────────────────────────
function renderIssueAgeDistribution(issues) {
  if (!issues?.length) return "";
  const buckets = { "< 7d": 0, "7–30d": 0, "30–90d": 0, "> 90d": 0 };
  for (const i of issues) {
    const age = (Date.now() - new Date(i.createdAt).getTime()) / 86400000;
    if (age < 7) buckets["< 7d"]++;
    else if (age < 30) buckets["7–30d"]++;
    else if (age < 90) buckets["30–90d"]++;
    else buckets["> 90d"]++;
  }
  const max = Math.max(...Object.values(buckets), 1);
  const colors = { "< 7d": "var(--green)", "7–30d": "var(--cyan)", "30–90d": "var(--gold)", "> 90d": "var(--red)" };
  return `
    <div style="margin-top:14px;">
      <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">
        Issue Age Distribution
      </div>
      <div style="display:flex; gap:8px; align-items:flex-end; height:32px;">
        ${Object.entries(buckets).map(([label, n]) => {
          const h = n === 0 ? 4 : Math.max(6, Math.round((n / max) * 32));
          return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; align-self:flex-end;">
            <div title="${n} issue${n !== 1 ? "s" : ""} ${label}" style="width:100%; height:${h}px; background:${colors[label]};
                 opacity:${n === 0 ? 0.12 : 0.7}; border-radius:2px 2px 0 0;"></div>
          </div>`;
        }).join("")}
      </div>
      <div style="display:flex; gap:8px; margin-top:3px;">
        ${Object.entries(buckets).map(([label, n]) => `
          <div style="flex:1; text-align:center; font-size:9px; color:var(--muted);">${label}</div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Milestones ────────────────────────────────────────────────────────────────
function renderMilestonesSection(repoData) {
  const milestones = repoData?.milestones;
  if (!milestones?.length) return "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">MILESTONES</span>
        <span class="hub-section-badge">${milestones.length} open</span>
      </div>
      <div class="hub-section-body">
        ${milestones.map((m) => `
          <div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <a href="${m.url}" target="_blank" rel="noopener" style="font-size:13px; color:var(--text); font-weight:600;">${m.title}</a>
              <span style="font-size:11px; color:var(--muted);">${m.progress}%</span>
            </div>
            <div style="height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden; margin-bottom:4px;">
              <div style="width:${m.progress}%; height:100%; background:var(--cyan); border-radius:2px;"></div>
            </div>
            <div style="font-size:11px; color:var(--muted);">
              ${m.closedIssues} closed · ${m.openIssues} open
              ${m.dueOn ? ` · Due ${new Date(m.dueOn).toLocaleDateString("en-US", { month:"short", day:"numeric" })}` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Release Notes Draft ────────────────────────────────────────────────────────
function renderReleaseNotesDraft(project, repoData) {
  const commits = repoData?.commits;
  const release = repoData?.latestRelease;
  if (!commits?.length || !project.githubRepo) return "";

  const draftCommits = commits.slice(0, 10);
  const tagLine = release ? `Since ${release.tag}` : "Recent changes";
  const bullets = draftCommits.map((c) => `- ${c.message}`).join("\n");
  const draft = `## ${tagLine}\n\n${bullets}`;

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">RELEASE NOTES DRAFT</span>
        <span class="hub-section-badge">${draftCommits.length} commits</span>
      </div>
      <div class="hub-section-body">
        <pre id="release-notes-pre-${project.id}" style="
          background:var(--panel-2); border:1px solid var(--border); border-radius:8px;
          padding:12px 14px; font-size:11px; color:var(--text); line-height:1.6;
          max-height:200px; overflow-y:auto; white-space:pre-wrap; word-break:break-word;
          font-family:monospace; margin-bottom:10px;">${draft.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        <button id="copy-release-notes-${project.id}" data-project-id="${project.id}"
          style="font-size:12px; padding:7px 14px; background:rgba(122,231,199,0.1);
                 border:1px solid rgba(122,231,199,0.25); border-radius:8px; color:var(--cyan); cursor:pointer;">
          Copy draft
        </button>
      </div>
    </div>
  `;
}

// ── Project Tags ──────────────────────────────────────────────────────────────
function renderTagsSection(project) {
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
                ${t}
              </span>
            `).join("")}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

// ── Deployments ────────────────────────────────────────────────────────────────
function renderDeploymentsSection(repoData) {
  const deps = repoData?.deployments;
  if (!deps?.length) return "";
  return `
    <div class="hub-section">
      <div class="hub-section-header"><span class="hub-section-title">DEPLOYMENTS</span></div>
      <div class="hub-section-body">
        <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
          🚀 Last deployed: ${repoData.deployments?.[0]?.createdAt ? timeAgo(repoData.deployments[0].createdAt) : "—"}
        </div>
        ${deps.slice(0, 5).map((d) => `
          <div class="data-row">
            <span class="label" style="color:var(--blue);">${d.environment || "production"}</span>
            <span class="value">${d.sha || "—"} · ${timeAgo(d.createdAt)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Hub Listing Pipeline helpers (inlined to avoid cross-view imports) ─────────
const _HUB_PIPELINE_STAGES = [
  { id: "concept",    label: "Concept",          color: "#888" },
  { id: "submitted",  label: "Ticket Submitted",  color: "var(--gold)" },
  { id: "reviewing",  label: "Under Review",      color: "#ffa94d" },
  { id: "in-hub",     label: "In Hub",            color: "var(--cyan)" },
  { id: "on-website", label: "On Website",        color: "var(--green)" },
];
const _STAGE_IDX = Object.fromEntries(_HUB_PIPELINE_STAGES.map((s, i) => [s.id, i]));

function _getTicketForProject(project, tickets = []) {
  return tickets.find((t) => {
    const m = t.body?.match(/\*\*GitHub Repo:\*\*\s*(.+)/);
    const repo = m ? m[1].trim() : null;
    if (repo === project.githubRepo) return true;
    // also check YAML block
    const y = t.body?.match(/<!--\s*agent-ticket\n([\s\S]*?)-->/);
    if (y) {
      const ym = y[1].match(/^github_repo:\s*"?([^"\n]*)"?/m);
      return ym ? ym[1].trim() === project.githubRepo : false;
    }
    return false;
  });
}

function _getPipelineStage(project, tickets = []) {
  const ticket = _getTicketForProject(project, tickets);
  // Project is always "in hub" from its own Studio Ops perspective — check if also on website
  if (project.deployedUrl) return "on-website";
  if (!ticket) return "in-hub"; // already in hub (we're viewing it), just not on website
  if (ticket.state === "closed") return "in-hub";
  if (ticket.comments > 0) return "reviewing";
  return "submitted";
}

function renderHubListingPipeline(project, tickets = []) {
  const stage       = _getPipelineStage(project, tickets);
  const currentIdx  = _STAGE_IDX[stage] ?? 3; // default "in-hub"
  const ticket      = _getTicketForProject(project, tickets);

  return `
    <div style="margin-bottom:16px; padding:12px 14px; background:rgba(105,179,255,0.04);
                border:1px solid rgba(105,179,255,0.12); border-radius:8px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; gap:8px; flex-wrap:wrap;">
        <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted);">
          Hub Listing Pipeline
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          ${ticket ? `
            <a href="${ticket.url}" target="_blank" rel="noopener"
               style="font-size:10px; color:var(--muted); text-decoration:none; padding:2px 7px;
                      border:1px solid var(--border); border-radius:5px;"
               onmouseover="this.style.color='var(--cyan)'" onmouseout="this.style.color='var(--muted)'">
              Ticket #${ticket.id} ↗
            </a>
          ` : ""}
          <button data-action="submit-ticket" data-project-id="${project.id}"
            style="font-size:10px; padding:2px 8px; background:rgba(122,231,199,0.08);
                   border:1px solid rgba(122,231,199,0.2); border-radius:5px; color:var(--cyan); cursor:pointer;">
            ${ticket ? "View Ticket" : "Submit Ticket →"}
          </button>
        </div>
      </div>
      <!-- Stage bar -->
      <div style="display:flex; align-items:center; gap:4px;">
        ${_HUB_PIPELINE_STAGES.map((s, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          const color  = done || active ? s.color : "rgba(255,255,255,0.1)";
          const line   = i < _HUB_PIPELINE_STAGES.length - 1
            ? `<div style="flex:1; height:2px; border-radius:1px; background:${done ? s.color : "rgba(255,255,255,0.08)"};"></div>`
            : "";
          return `
            <div style="display:flex; flex-direction:column; align-items:center; gap:3px; flex-shrink:0;">
              <div style="width:8px; height:8px; border-radius:50%; background:${color};
                          ${active ? "box-shadow:0 0 6px " + color + "80;" : ""}"></div>
              <span style="font-size:9px; color:${active ? color : done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"};
                           font-weight:${active ? "700" : "400"}; white-space:nowrap;">
                ${s.label}
              </span>
            </div>
            ${line}
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// ── Studio OS required files for compliance panel ─────────────────────────────
const STUDIO_OS_FILES = [
  { key: "AGENTS.md",                           label: "AGENTS" },
  { key: "context/PROJECT_BRIEF.md",            label: "BRIEF" },
  { key: "context/SOUL.md",                    label: "SOUL" },
  { key: "context/BRAIN.md",                   label: "BRAIN" },
  { key: "context/CURRENT_STATE.md",           label: "STATE" },
  { key: "context/TASK_BOARD.md",              label: "TASKS" },
  { key: "context/LATEST_HANDOFF.md",          label: "HANDOFF" },
  { key: "context/DECISIONS.md",               label: "DECISIONS" },
  { key: "context/SELF_IMPROVEMENT_LOOP.md",   label: "SIL" },
  { key: "docs/CREATIVE_DIRECTION_RECORD.md",  label: "CDR" },
  { key: "prompts/start.md",                   label: "start" },
  { key: "prompts/closeout.md",                label: "closeout" },
  { key: "logs/WORK_LOG.md",                   label: "WORK_LOG" },
];

// ── Studio Ops Section ────────────────────────────────────────────────────────
function renderStudioOpsSection(project, contextFiles, tickets = [], isLoadingCtx = false) {
  const ctx = contextFiles?.[project.id];
  const { statusJson, currentState } = ctx || {};

  // Context files fetched by the hub (SOUL, BRAIN, etc.)
  const ctxFiles = [
    { key: "statusJson",   label: "PROJECT_STATUS" },
    { key: "currentState", label: "CURRENT_STATE" },
    { key: "decisions",    label: "DECISIONS" },
    { key: "taskBoard",    label: "TASK_BOARD" },
    { key: "brain",        label: "BRAIN" },
    { key: "soul",         label: "SOUL" },
  ];

  // Studio OS compliance from live compliance data or registry flag
  const compliance = ctx?.studioOsCompliance || null;
  const osFromRegistry = project.studioOsApplied === true;
  const osScore = compliance ? compliance.score : null;
  const osTotal = compliance ? compliance.total : STUDIO_OS_FILES.length;
  const osCompliant = compliance ? compliance.score >= compliance.total : osFromRegistry;
  const osColor = osCompliant ? "var(--green)" : (osScore !== null && osScore >= 6) ? "var(--gold)" : "var(--red)";
  const osLabel = osCompliant ? "Studio OS ✓" : osScore !== null ? `Studio OS ${osScore}/${osTotal}` : osFromRegistry ? "Studio OS ✓" : "Studio OS ✗";

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">STUDIO OPS</span>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span style="font-size:10px; font-weight:700; color:${osColor}; padding:1px 6px;
                       border:1px solid ${osColor}40; border-radius:8px;">${osLabel}</span>
          ${ctx ? ctxFiles.map((f) => {
            const present = !!ctx[f.key];
            const badge = present ? "✓" : "○";
            const color = present ? "var(--green)" : "var(--muted)";
            return `<span title="${f.label}" style="font-size:10px; color:${color}; font-weight:700; opacity:0.85;">${badge}${f.label.slice(0,4)}</span>`;
          }).join("") : ""}
          ${ctx?.fetchedAt ? `<span style="color:var(--muted); font-size:10px;">${timeAgo(new Date(ctx.fetchedAt).toISOString())}</span>` : ""}
        </div>
      </div>
      <div class="hub-section-body">
        ${renderHubListingPipeline(project, tickets)}

        ${/* Studio OS compliance panel */(() => {
          if (!compliance && !osFromRegistry) {
            return `
              <div style="margin-bottom:16px; padding:10px 12px; background:rgba(248,113,113,0.06);
                          border:1px solid rgba(248,113,113,0.2); border-radius:8px;">
                <div style="font-size:11px; font-weight:700; color:var(--red); margin-bottom:4px;">Studio OS not applied</div>
                <div style="font-size:11px; color:var(--muted); line-height:1.5;">
                  This project has not adopted the Studio OS memory system. AGENTS.md and context/ files are missing.
                  Follow <code style="font-size:10px;">studio-ops/docs/STUDIO_EXISTING_PROJECT_MIGRATION.md</code> to add them.
                </div>
              </div>`;
          }
          if (compliance && compliance.missing.length > 0) {
            return `
              <div style="margin-bottom:16px; padding:10px 12px; background:rgba(255,201,116,0.06);
                          border:1px solid rgba(255,201,116,0.2); border-radius:8px;">
                <div style="font-size:11px; font-weight:700; color:var(--gold); margin-bottom:6px;">
                  Studio OS — ${compliance.score}/${compliance.total} files present
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px;">
                  ${compliance.present.map((f) => `
                    <span style="font-size:10px; font-family:monospace; padding:1px 6px; border-radius:4px;
                                 background:rgba(110,231,183,0.08); color:var(--green); border:1px solid rgba(110,231,183,0.2);">
                      ✓ ${f}
                    </span>`).join("")}
                  ${compliance.missing.map((f) => `
                    <span style="font-size:10px; font-family:monospace; padding:1px 6px; border-radius:4px;
                                 background:rgba(255,201,116,0.06); color:var(--gold); border:1px solid rgba(255,201,116,0.2);">
                      ○ ${f}
                    </span>`).join("")}
                </div>
              </div>`;
          }
          return "";
        })()}

        ${isLoadingCtx ? `
          <div class="empty-state" style="display:flex; align-items:center; gap:8px; padding:12px 0;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--cyan); animation:pulse 1s infinite;"></span>
            <span style="font-size:12px; color:var(--muted);">Fetching context files…</span>
          </div>
        ` : ""}
        ${(() => {
          const projectTickets = tickets.filter((t) => {
            const m = t.body?.match(/\*\*GitHub Repo:\*\*\s*(.+)/);
            if (m && m[1].trim() === project.githubRepo) return true;
            const y = t.body?.match(/<!--\s*agent-ticket\n([\s\S]*?)-->/);
            if (y) {
              const ym = y[1].match(/^github_repo:\s*"?([^"\n]*)"?/m);
              return ym ? ym[1].trim() === project.githubRepo : false;
            }
            return false;
          });
          if (!projectTickets.length) return "";
          return `
            <div style="margin-bottom:16px;">
              <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">
                Listing Tickets (${projectTickets.length})
              </div>
              ${projectTickets.map((t) => {
                const isAgent = /submitted_by:\s*"?agent"?/.test(t.body?.match(/<!--\s*agent-ticket\n([\s\S]*?)-->/)?.[1] || "");
                const stateColor = t.state === "open" ? "var(--green)" : "rgba(255,255,255,0.3)";
                return `
                  <div style="display:flex; align-items:flex-start; gap:10px; padding:8px 10px;
                              background:rgba(255,255,255,0.02); border:1px solid var(--border);
                              border-radius:7px; margin-bottom:6px;">
                    <div style="flex:1; min-width:0;">
                      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:2px;">
                        <span style="font-size:12px; font-weight:600; color:var(--text);">
                          #${t.id} ${escapeHtml(t.title.replace(/^\[Project Listing\]\s*/i, ""))}
                        </span>
                        <span style="font-size:9px; padding:1px 5px; border-radius:8px; font-weight:700;
                                     color:${stateColor}; border:1px solid ${stateColor}; opacity:0.85;">
                          ${t.state.toUpperCase()}
                        </span>
                        ${isAgent ? `<span style="font-size:9px; font-weight:700; padding:1px 5px; border-radius:8px;
                          background:rgba(255,201,116,0.15); color:var(--gold); border:1px solid rgba(255,201,116,0.3);">AGENT</span>` : ""}
                      </div>
                      <div style="font-size:10px; color:var(--muted);">
                        Opened ${timeAgo(t.createdAt)}${t.comments > 0 ? ` · 💬 ${t.comments}` : ""}
                        ${t.updatedAt !== t.createdAt ? ` · updated ${timeAgo(t.updatedAt)}` : ""}
                      </div>
                    </div>
                    <a href="${t.url}" target="_blank" rel="noopener"
                       style="font-size:10px; color:var(--muted); text-decoration:none; flex-shrink:0; padding-top:2px;"
                       onmouseover="this.style.color='var(--cyan)'" onmouseout="this.style.color='var(--muted)'">↗</a>
                  </div>
                `;
              }).join("")}
            </div>
          `;
        })()}
        ${statusJson ? `
          <div style="margin-bottom:${currentState ? "16px" : "0"};">
            <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">PROJECT_STATUS.json</div>
            ${statusJson.status    ? `<div class="data-row"><span class="label">Status</span><span class="value">${statusJson.status}</span></div>` : ""}
            ${statusJson.phase     ? `<div class="data-row"><span class="label">Phase</span><span class="value">${statusJson.phase}</span></div>` : ""}
            ${statusJson.lastUpdated ? `<div class="data-row"><span class="label">Updated</span><span class="value">${statusJson.lastUpdated}</span></div>` : ""}
            ${statusJson.health    ? `<div class="data-row"><span class="label">Health</span><span class="value">${statusJson.health}</span></div>` : ""}
            ${Array.isArray(statusJson.blockers) && statusJson.blockers.length > 0 ? `
              <div class="data-row" style="align-items:flex-start;">
                <span class="label">Blockers</span>
                <span class="value" style="color:var(--red);">${statusJson.blockers.join(" · ")}</span>
              </div>
            ` : ""}
            ${statusJson.notes ? `
              <div style="margin-top:8px; font-size:12px; color:var(--muted); font-style:italic;">${statusJson.notes}</div>
            ` : ""}
          </div>
        ` : ""}
        ${currentState ? `
          <div>
            <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">CURRENT_STATE.md</div>
            <pre style="
              background:var(--panel-2); border:1px solid var(--border); border-radius:8px;
              padding:12px 14px; font-size:11px; color:var(--text); line-height:1.6;
              max-height:320px; overflow-y:auto; white-space:pre-wrap; word-break:break-word;
              font-family:var(--font-mono, monospace);
            ">${escapeHtml(currentState.trim())}</pre>
          </div>
        ` : ""}
        ${ctx?.decisions ? `
          <div style="margin-top:${currentState ? "16px" : "0"};">
            <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">DECISIONS.md</div>
            <pre style="
              background:var(--panel-2); border:1px solid var(--border); border-radius:8px;
              padding:12px 14px; font-size:11px; color:var(--text); line-height:1.6;
              max-height:240px; overflow-y:auto; white-space:pre-wrap; word-break:break-word;
              font-family:var(--font-mono, monospace);
            ">${escapeHtml(ctx.decisions.trim())}</pre>
          </div>
        ` : ""}
        ${ctx?.taskBoard ? (() => {
          const openTasks = ctx.taskBoard.split("\n")
            .filter((l) => /\[\s\]/.test(l))
            .map((l) => l.replace(/^.*?\[\s\]\s*/, "").trim())
            .filter(Boolean);
          if (!openTasks.length) return "";
          return `
            <div style="margin-top:16px;">
              <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">
                TASK_BOARD.md — Open Tasks (${openTasks.length})
              </div>
              ${openTasks.slice(0, 12).map((t) => `
                <div style="display:flex; align-items:flex-start; gap:8px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span style="color:var(--gold); flex-shrink:0; font-size:12px;">☐</span>
                  <span style="font-size:12px; color:var(--text); line-height:1.4;">${escapeHtml(t)}</span>
                </div>
              `).join("")}
              ${openTasks.length > 12 ? `<div style="font-size:11px; color:var(--muted); margin-top:6px;">+${openTasks.length - 12} more tasks</div>` : ""}
            </div>
          `;
        })() : ""}
        ${ctx?.brain ? `
          <details style="margin-top:16px;">
            <summary style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase;
                            color:var(--muted); cursor:pointer; user-select:none; padding:4px 0;">
              BRAIN.md ▸
            </summary>
            <pre style="
              background:var(--panel-2); border:1px solid var(--border); border-radius:8px;
              padding:12px 14px; font-size:11px; color:var(--text); line-height:1.6;
              max-height:320px; overflow-y:auto; white-space:pre-wrap; word-break:break-word;
              font-family:var(--font-mono, monospace); margin-top:8px;
            ">${escapeHtml(ctx.brain.trim())}</pre>
          </details>
        ` : ""}
        ${ctx?.soul ? `
          <details style="margin-top:8px;">
            <summary style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase;
                            color:var(--muted); cursor:pointer; user-select:none; padding:4px 0;">
              SOUL.md ▸
            </summary>
            <pre style="
              background:var(--panel-2); border:1px solid var(--border); border-radius:8px;
              padding:12px 14px; font-size:11px; color:var(--text); line-height:1.6;
              max-height:320px; overflow-y:auto; white-space:pre-wrap; word-break:break-word;
              font-family:var(--font-mono, monospace); margin-top:8px;
            ">${escapeHtml(ctx.soul.trim())}</pre>
          </details>
        ` : ""}
      </div>
    </div>
  `;
}

// ── Founder Annotation ────────────────────────────────────────────────────────
const ANNOTATION_KEY = "vshub_annotations";
function loadAnnotations() {
  try { return JSON.parse(localStorage.getItem(ANNOTATION_KEY) || "{}"); } catch { return {}; }
}

function renderAnnotationSection(project) {
  const current = loadAnnotations()[project.id] || "";
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
            placeholder="Add a note about this project's current situation, priority, or next big goal…"
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
                     border-radius:8px; color:var(--muted); cursor:pointer;">✕</button>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Score Calibration ─────────────────────────────────────────────────────────
function renderScoreCalibration(project, repoData, sbData, socialData) {
  const scoring = scoreProject(project, repoData, sbData, socialData);
  if (scoring.total >= 80) return ""; // No calibration needed for A projects

  const tips = [];
  const { development: dev, engagement: eng, momentum: mom, risk } = scoring.pillars;

  // Development tips
  if (dev.score < 15) tips.push({ gain: 15, tip: "Fix CI — a passing build is worth up to +15 Dev points" });
  else if (dev.score < 27) tips.push({ gain: 12, tip: "Commit today — recent commits add up to +12 Dev points" });

  // Momentum tips
  if (mom.score < 5) tips.push({ gain: 8, tip: "Open a PR — shows active work in progress (+8 Momentum)" });
  if (mom.score < 10 && !repoData?.latestRelease) tips.push({ gain: 10, tip: "Cut a release — first release this month is worth +10 Momentum" });
  if (project.status === "in-development" && mom.score < 7) tips.push({ gain: 3, tip: "Update project status (e.g. 'playable-prototype') for a status bonus" });

  // Risk tips
  const issues = repoData?.repo?.openIssues || 0;
  if (issues > 15) tips.push({ gain: 6, tip: `Close some issues — ${issues} open issues cost up to -10 Risk points` });

  // Engagement tips
  if (eng.score < 5 && project.supabaseGameSlug) tips.push({ gain: 10, tip: "Drive 5+ game sessions this week for +6 Engagement points" });
  if (eng.score < 5 && !project.supabaseGameSlug && !project.deployedUrl) tips.push({ gain: 5, tip: "Deploy the project — a live URL adds +5 Engagement points" });

  if (!tips.length) return "";
  tips.sort((a, b) => b.gain - a.gain);

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">SCORE CALIBRATION</span>
        <span class="hub-section-badge" style="color:${scoring.gradeColor};">${scoring.total}/100 · ${scoring.grade}</span>
      </div>
      <div class="hub-section-body">
        <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
          To move from ${scoring.grade} toward the next grade, try:
        </div>
        ${tips.slice(0, 5).map((t) => `
          <div style="display:flex; align-items:flex-start; gap:10px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="font-size:11px; font-weight:700; color:var(--green); min-width:36px; flex-shrink:0;">+${t.gain}</span>
            <span style="font-size:13px; color:var(--text); line-height:1.4;">${t.tip}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLinkSection(project) {
  const links = [];
  if (project.githubRepo) links.push({ label: "GitHub Repo", url: `https://github.com/${project.githubRepo}`, color: "var(--text)" });
  if (project.deployedUrl) links.push({ label: "Live App", url: project.deployedUrl, color: "var(--green)" });

  if (links.length === 0) return "";

  return `
    <div class="hub-section">
      <div class="hub-section-header"><span class="hub-section-title">LINKS</span></div>
      <div class="hub-section-body">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${links.map((l) => `
            <a href="${l.url}" target="_blank" rel="noopener"
               style="font-size:12px; font-weight:600; color:${l.color}; padding:7px 14px; border:1px solid var(--border); border-radius:8px; display:inline-flex; align-items:center; gap:4px;">
              ${l.label} ↗
            </a>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Issue Trend Chart ──────────────────────────────────────────────────────────
function renderIssueTrendChart(project, scoreHistory) {
  const points = scoreHistory
    .map((h) => h.issues?.[project.id])
    .filter((v) => v !== null && v !== undefined);
  if (points.length < 2) return "";

  const W = 280, H = 48;
  const min = Math.min(...points);
  const max = Math.max(...points, min + 1);
  const xs  = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys  = points.map((v) => H - ((v - min) / (max - min)) * (H - 6) - 3);
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const trend = points[points.length - 1] > points[0] ? "var(--red)"
    : points[points.length - 1] < points[0] ? "var(--green)" : "var(--muted)";
  const latest = points[points.length - 1];
  const oldest = points[0];
  const delta  = latest - oldest;

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">ISSUE TREND</span>
        <span class="hub-section-badge" style="color:${trend};">
          ${delta > 0 ? "+" : ""}${delta} over ${points.length} snapshots
        </span>
      </div>
      <div class="hub-section-body">
        <svg width="${W}" height="${H}" style="width:100%; max-width:${W}px; overflow:visible;"
             title="Issue count history: ${points.join(" → ")}">
          <polyline points="${pts}" fill="none" stroke="${trend}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
          ${points.map((v, i) => `
            <circle cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="3" fill="${trend}" opacity="0.7">
              <title>${v} open issue${v !== 1 ? "s" : ""}</title>
            </circle>
          `).join("")}
        </svg>
        <div style="display:flex; justify-content:space-between; margin-top:4px;">
          <span style="font-size:10px; color:var(--muted);">oldest (${oldest})</span>
          <span style="font-size:10px; color:${trend}; font-weight:700;">latest (${latest})</span>
        </div>
      </div>
    </div>
  `;
}

// ── Goal Tracker ──────────────────────────────────────────────────────────────
function renderGoalSection(project, scoreHistory) {
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
              ${currentScore}/${target} ${gap === 0 ? "✓ Achieved!" : `(${gap} pts to go)`}
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

// ── Action Item Tracker (per-project checklist) ───────────────────────────────
function renderActionItemTracker(project) {
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
                  >${item.done ? "✓" : ""}</button>
                  <span style="flex:1; font-size:13px; color:${item.done ? "var(--muted)" : "var(--text)"};
                               text-decoration:${item.done ? "line-through" : "none"}; line-height:1.4;">${item.text}</span>
                  <button data-checklist-delete="${project.id}" data-checklist-id="${item.id}"
                    aria-label="Delete item"
                    style="flex-shrink:0; background:none; border:none; color:var(--muted); cursor:pointer; font-size:13px; padding:2px 4px;">✕</button>
                </div>
              `).join("")
          }
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <input id="checklist-new-${project.id}" type="text" placeholder="Add action item…"
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

// ── Score History Line Chart ───────────────────────────────────────────────────
function renderScoreHistoryLineChart(project, scoreHistory) {
  const points = scoreHistory
    .map((h) => ({ ts: h.ts, score: h.scores?.[project.id] }))
    .filter((p) => p.score != null);
  if (points.length < 2) return "";

  const W = 500, H = 80;
  const scores = points.map((p) => p.score);
  const minS = Math.max(0, Math.min(...scores) - 5);
  const maxS = Math.min(100, Math.max(...scores) + 5);
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - ((p.score - minS) / (maxS - minS)) * (H - 8) - 4);
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const latest = scores[scores.length - 1];
  const oldest = scores[0];
  const trend = latest > oldest ? "var(--green)" : latest < oldest ? "var(--red)" : "var(--muted)";
  const gradeLines = [{ y: 90, label: "A" }, { y: 80, label: "B" }, { y: 70, label: "C" }];

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">SCORE HISTORY</span>
        <span class="hub-section-badge" style="color:${trend};">${oldest} → ${latest} (${points.length} snapshots)</span>
      </div>
      <div class="hub-section-body">
        <svg width="${W}" height="${H}" style="width:100%; overflow:visible; display:block; margin-bottom:8px;">
          ${gradeLines.map(({ y, label }) => {
            const cy = H - ((y - minS) / (maxS - minS)) * (H - 8) - 4;
            if (cy < 0 || cy > H) return "";
            return `<line x1="0" y1="${cy.toFixed(1)}" x2="${W}" y2="${cy.toFixed(1)}"
              stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4,4"/>
            <text x="2" y="${(cy - 3).toFixed(1)}" font-size="9" fill="rgba(149,163,183,0.4)">${label}</text>`;
          }).join("")}
          <polyline points="${pts}" fill="none" stroke="${trend}" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
          ${points.map((p, i) => `
            <circle cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="3.5" fill="${trend}" opacity="0.8">
              <title>Score: ${p.score} — ${new Date(p.ts).toLocaleDateString()}</title>
            </circle>
          `).join("")}
        </svg>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted);">
          <span>${new Date(points[0].ts).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span>
          <span>${new Date(points[points.length - 1].ts).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span>
        </div>
      </div>
    </div>
  `;
}

// ── Local Milestone/Roadmap Board ─────────────────────────────────────────────
function renderLocalMilestoneBoard(project) {
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
                    <span style="flex:1;">${itemText}${overdue ? ` <span style="font-size:9px; color:var(--gold);" title="${daysSince}d in progress">⚠ ${daysSince}d</span>` : daysSince ? ` <span style="font-size:9px; color:var(--muted);">${daysSince}d</span>` : ""}</span>
                    <div style="display:flex; gap:2px; flex-shrink:0;">
                      ${col.key !== "doing" ? `<button data-roadmap-move="${project.id}" data-roadmap-from="${col.key}" data-roadmap-to="${col.key === "todo" ? "doing" : col.key === "doing" ? "done" : "doing"}" data-roadmap-id="${itemId}"
                        style="font-size:9px; padding:2px 5px; background:none; border:1px solid var(--border); border-radius:3px; color:var(--muted); cursor:pointer;" title="${col.key === "todo" ? "Start" : "Reopen"}"
                        aria-label="${col.key === "todo" ? "Move to In Progress" : "Reopen item"}">
                        ${col.key === "todo" ? "▶" : "↩"}
                      </button>` : `<button data-roadmap-move="${project.id}" data-roadmap-from="doing" data-roadmap-to="done" data-roadmap-id="${itemId}"
                        style="font-size:9px; padding:2px 5px; background:none; border:1px solid var(--border); border-radius:3px; color:var(--green); cursor:pointer;" title="Complete"
                        aria-label="Mark as done">✓
                      </button>`}
                      <button data-roadmap-delete="${project.id}" data-roadmap-col="${col.key}" data-roadmap-id="${itemId}"
                        style="font-size:9px; padding:2px 4px; background:none; border:none; color:var(--muted); cursor:pointer;"
                        aria-label="Delete roadmap item">✕</button>
                    </div>
                  </div>
                `; }).join("")}
              </div>
            </div>
          `).join("")}
        </div>
        <div style="display:flex; gap:8px;">
          <input id="roadmap-new-${project.id}" type="text" placeholder="Add roadmap item…"
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

// ── Per-Project Notes ─────────────────────────────────────────────────────────
function renderNotesSection(project) {
  let notes = {};
  try { notes = JSON.parse(localStorage.getItem("vshub_notes") || "{}"); } catch {}
  const current = notes[project.id] || "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">NOTES</span>
        <span style="font-size:11px; color:var(--muted);">Multi-line scratchpad · stored locally</span>
      </div>
      <div class="hub-section-body">
        <textarea
          id="notes-input-${project.id}"
          rows="4"
          placeholder="Freeform notes about this project — context, ideas, decisions, anything…"
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

// ── Health Prescription ────────────────────────────────────────────────────────
function renderHealthPrescription(project, repoData, sbData, socialData) {
  const scoring = scoreProject(project, repoData, sbData, socialData);
  if (scoring.total >= 85) return ""; // Already healthy
  const { development: dev, engagement: eng, momentum: mom, risk } = scoring.pillars;
  const rx = [];

  if (dev.score < 10) rx.push({ icon: "⚙", color: "var(--red)",  text: "Add a CI workflow — no CI costs up to 15 Development points." });
  else if (dev.score < 22 && dev.signals.some((s) => s.toLowerCase().includes("fail")))
    rx.push({ icon: "⚙", color: "var(--red)",  text: "Fix the failing CI build — a passing build adds up to +15 Dev points." });
  else if (dev.score < 22)
    rx.push({ icon: "⌨", color: "var(--gold)", text: "Push a commit this week — recent commits are worth up to +12 Dev points." });

  if (mom.score < 8 && !repoData?.latestRelease)
    rx.push({ icon: "🚀", color: "var(--blue)", text: "Cut a release — publishing a GitHub release adds +10 Momentum points." });
  else if (mom.score < 12 && !(repoData?.prs?.length))
    rx.push({ icon: "⇌", color: "var(--blue)", text: "Open a pull request — active PRs signal ongoing work (+8 Momentum)." });

  const openIssues = repoData?.repo?.openIssues || 0;
  if (risk.score < 12 && openIssues > 10)
    rx.push({ icon: "✓", color: "var(--green)", text: `Close some of the ${openIssues} open issues — each excess issue costs Risk points.` });

  if (eng.score < 5 && !project.deployedUrl && !project.supabaseGameSlug)
    rx.push({ icon: "↗", color: "var(--cyan)", text: "Deploy the project — a live URL adds +5 Engagement points." });
  else if (eng.score < 5 && project.supabaseGameSlug)
    rx.push({ icon: "▶", color: "var(--cyan)", text: "Drive 5+ game sessions this week for +6 Engagement points." });

  if (!rx.length) return "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">HEALTH PRESCRIPTION</span>
        <span class="hub-section-badge" style="color:${scoring.gradeColor};">${scoring.total}/100 · ${scoring.grade}</span>
      </div>
      <div class="hub-section-body">
        <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
          Top actions to improve this project's score:
        </div>
        ${rx.slice(0, 4).map((r) => `
          <div style="display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="color:${r.color}; font-size:14px; flex-shrink:0; width:20px; text-align:center;">${r.icon}</span>
            <span style="font-size:13px; color:var(--text); line-height:1.4;">${r.text}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Vorn Agent Activity Panel ─────────────────────────────────────────────────
function renderVornAgentPanel(project, sbData) {
  if (project.id !== "vorn") return "";
  const pulse = sbData?.pulse || [];
  const agentEvents = pulse.filter((e) => e.source === "agent" || e.category === "agent" || (e.message || "").toLowerCase().includes("agent"));
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">VORN AGENT ACTIVITY</span>
        <span class="hub-section-badge" style="color:var(--blue);">Live from Supabase</span>
      </div>
      <div class="hub-section-body">
        ${!sbData
          ? `<div class="empty-state">Configure Supabase anon key to see agent activity.</div>`
          : agentEvents.length === 0
            ? `<div class="empty-state">No agent events found in Studio Pulse. Ensure agent actions are logged with source "agent".</div>`
            : agentEvents.slice(0, 15).map((e) => `
                <div style="display:flex; align-items:flex-start; gap:10px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                  <div style="width:28px; height:28px; border-radius:6px; background:rgba(167,139,250,0.12); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <span style="font-size:11px; font-weight:800; color:#a78bfa;">AG</span>
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div style="font-size:12px; color:var(--text); line-height:1.4;">${e.message || e.event || "Agent event"}</div>
                    <div style="font-size:10px; color:var(--muted); margin-top:2px;">${e.agent_id || e.actor || "agent"} · ${e.created_at ? timeAgo(e.created_at) : "—"}</div>
                  </div>
                </div>
              `).join("")
        }
      </div>
    </div>
  `;
}

function renderProprietaryScoresSection(project, repoData, socialData, scoreHistory) {
  const pot = scorePotential(project, repoData, socialData, scoreHistory);
  const mom = scoreMomentumIndex(project, repoData, scoreHistory);
  const pl = potentialLabel(pot);
  const ml = momentumLabel(mom);
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">PROPRIETARY SCORES</span>
        <span class="hub-section-badge" style="color:var(--muted); font-size:10px;">VaultSpark Intelligence</span>
      </div>
      <div class="hub-section-body">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div style="padding:12px; border-radius:10px; background:${pl.color}0d; border:1px solid ${pl.color}28;">
            <div style="font-size:10px; font-weight:700; color:var(--muted); letter-spacing:0.07em; margin-bottom:6px;">POTENTIAL</div>
            <div style="font-size:28px; font-weight:800; color:${pl.color}; line-height:1;">${pot}</div>
            <div style="font-size:11px; font-weight:700; color:${pl.color}; margin-top:2px;">${pl.label}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:6px; line-height:1.4;">
              Upside trajectory: score trend, community traction, market readiness, dev acceleration
            </div>
          </div>
          <div style="padding:12px; border-radius:10px; background:${ml.color}0d; border:1px solid ${ml.color}28;">
            <div style="font-size:10px; font-weight:700; color:var(--muted); letter-spacing:0.07em; margin-bottom:6px;">MOMENTUM INDEX</div>
            <div style="font-size:28px; font-weight:800; color:${ml.color}; line-height:1;">${mom}</div>
            <div style="font-size:11px; font-weight:700; color:${ml.color}; margin-top:2px;">${ml.label}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:6px; line-height:1.4;">
              Current velocity: commit speed, CI streak, PR activity, release recency, issue resolution
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderProjectHubView(project, state) {
  const { ghData = {}, sbData = null, socialData = null, contextFiles = {}, scoreHistory = [], contextFilesLoading = new Set(), projectExtendedData = {}, projectExtendedLoading = new Set(), tickets = [] } = state;
  const repoData = project.githubRepo ? (ghData[project.githubRepo] || null) : null;
  const isLoadingCtx = contextFilesLoading.has(project.id);
  const extData = projectExtendedData[project.id];
  const isLoadingExt = projectExtendedLoading.has(project.id);

  return `
    <div class="main-panel">
      <div class="view-header" style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div class="view-title">${project.name}</div>
            <span class="project-status-pill ${project.status}" style="margin-bottom:0;">${project.statusLabel}</span>
          </div>
          <div class="view-subtitle">${project.description}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          <span class="project-card-type ${project.type}">${project.type}</span>
          ${project.githubRepo ? `
            <button id="refresh-project-btn" data-refresh-project="${project.githubRepo}"
              style="font-size:11px; padding:6px 12px; background:rgba(122,231,199,0.06);
                     border:1px solid var(--border); border-radius:8px; color:var(--muted);
                     cursor:pointer; transition:all 0.15s; white-space:nowrap;"
              title="Clear cache and re-fetch data for this project only"
            >↺ Refresh</button>
          ` : ""}
        </div>
      </div>

      <div class="hub-sections">
        ${renderProprietaryScoresSection(project, repoData, socialData, scoreHistory)}
        ${renderHealthPrescription(project, repoData, sbData, socialData)}
        ${renderActionQueue(project)}
        ${renderGoalSection(project, scoreHistory)}
        ${renderActionItemTracker(project)}
        ${renderLocalMilestoneBoard(project)}
        ${renderNotesSection(project)}
        ${renderAnnotationSection(project)}
        ${renderTagsSection(project)}
        ${renderScoreHistoryLineChart(project, scoreHistory)}
        ${renderScoreCalibration(project, repoData, sbData, socialData)}
        ${renderIssueTrendChart(project, scoreHistory)}
        ${renderLinkSection(project)}
        ${renderStudioOpsSection(project, isLoadingCtx ? {} : contextFiles, tickets, isLoadingCtx)}
        ${renderVornAgentPanel(project, sbData)}
        ${renderVsCodeSection(project)}
        ${renderGitHubSection(project, repoData)}
        ${renderPRSection(project, repoData)}
        ${renderMilestonesSection(repoData)}
        ${renderContributorsSection(repoData)}
        ${isLoadingExt && !extData
          ? `<div class="hub-section"><div class="hub-section-header"><span class="hub-section-title">LANGUAGES &amp; BRANCHES</span><span class="hub-section-badge" style="color:var(--muted);"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--cyan);margin-right:4px;animation:pulse 1s infinite;"></span>Loading…</span></div></div>`
          : `${renderLanguagesSection(extData?.languages)}${renderBranchesSection(extData?.branches)}`
        }
        ${renderDependenciesSection(project, contextFiles)}
        ${renderReleaseNotesDraft(project, repoData)}
        ${renderDeploymentsSection(repoData)}
        ${renderVaultSection(project, sbData)}
      </div>
    </div>
  `;
}
