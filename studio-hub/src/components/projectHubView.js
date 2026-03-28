import { scoreProject } from "../utils/projectScoring.js";
import { timeAgo, fmt, escapeHtml, renderSkeleton, renderEmptyState, safeGetJSON, safeSetJSON } from "../utils/helpers.js";
import { scorePotential, scoreMomentumIndex, potentialLabel, momentumLabel } from "../utils/proprietaryScores.js";
import { getForecastAccuracy } from "../utils/scoreForecast.js";
import { getCachedPrescription, getCachedDevlogDraft } from "../utils/aiPrescriptions.js";
import { explainScore, renderScoreExplainerPanel } from "../utils/scoreExplainer.js";

const LOCAL_PATHS_KEY = "vshub_local_paths";
function loadLocalPaths() { return safeGetJSON(LOCAL_PATHS_KEY, {}); }

const ACTION_QUEUE_KEY  = "vshub_action_queue";
const CHECKLIST_KEY     = "vshub_checklist";
const ROADMAP_KEY       = "vshub_roadmap";

function loadChecklist() { return safeGetJSON(CHECKLIST_KEY, {}); }
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

function loadActionQueue() { return safeGetJSON(ACTION_QUEUE_KEY, {}); }

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
          ${project.githubRepo
            ? renderEmptyState("\uD83D\uDD11", "No GitHub Data", "Configure a GitHub token in Settings to unlock repo insights, CI status, and score breakdowns.", "Open Settings", "settings")
            : renderEmptyState("\uD83D\uDD17", "No Repo Linked", "This project has no GitHub repository configured.")}
          ${project.githubRepo ? `
            <div style="text-align:center; margin-top:8px;">
              <a href="https://github.com/${project.githubRepo}" target="_blank" rel="noopener"
                 style="color:var(--blue); font-size:12px;">
                Open on GitHub \u2197
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
                  <span style="flex:1; line-height:1.4;">${escapeHtml(item.text)}</span>
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
                ${escapeHtml(t)}
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
                               text-decoration:${item.done ? "line-through" : "none"}; line-height:1.4;">${escapeHtml(item.text)}</span>
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

// ── Score Changelog ────────────────────────────────────────────────────────────
function renderScoreChangelog(project, scoreHistory) {
  const points = scoreHistory
    .map((h) => ({ ts: h.ts, score: h.scores?.[project.id] }))
    .filter((p) => p.score != null);
  if (points.length < 2) return "";

  // Build changelog entries (newest first, max 12)
  const entries = [];
  for (let i = points.length - 1; i >= 1 && entries.length < 12; i--) {
    const curr = points[i];
    const prev = points[i - 1];
    const delta = curr.score - prev.score;
    entries.push({ ts: curr.ts, score: curr.score, delta });
  }

  const fmt = (d) => d > 0 ? `+${d}` : `${d}`;
  const col = (d) => d > 0 ? "var(--green)" : d < 0 ? "var(--red)" : "var(--muted)";

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">SCORE CHANGELOG</span>
        <span class="hub-section-badge" style="color:var(--muted);">Last ${entries.length} snapshots</span>
      </div>
      <div class="hub-section-body" style="padding:0;">
        <div style="max-height:220px; overflow-y:auto;">
          ${entries.map((e, i) => `
            <div style="display:flex; align-items:center; gap:12px; padding:7px 16px;
                        border-bottom:1px solid rgba(255,255,255,0.04); font-size:12px;
                        ${i === 0 ? "background:rgba(122,231,199,0.03);" : ""}">
              <span style="color:var(--muted); white-space:nowrap; font-size:10px; min-width:80px;">
                ${new Date(e.ts).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
              </span>
              <span style="font-weight:700; color:var(--text); min-width:28px;">${e.score}</span>
              <span style="font-weight:700; font-size:11px; color:${col(e.delta)}; min-width:32px;">
                ${e.delta === 0 ? "─" : fmt(e.delta)}
              </span>
              <div style="flex:1; height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                <div style="height:100%; width:${e.score}%; background:${col(e.delta)}; border-radius:2px; opacity:0.6; transition:width 0.3s;"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Issue Signal Correlation ──────────────────────────────────────────────────
function renderIssueSignalCorrelation(project, repoData) {
  const issues = repoData?.issues;
  if (!issues || issues.length === 0) return "";

  // Classify each issue into a score pillar based on label/title keywords
  const pillars = {
    Dev:        { keywords: ["bug", "fix", "error", "crash", "broken", "fail", "refactor", "perf", "security", "vuln", "test", "ci", "build", "deploy"], color: "var(--blue)", issues: [] },
    Engagement: { keywords: ["ux", "ui", "design", "onboard", "feedback", "feature", "request", "social", "content", "doc", "readme", "tutorial"], color: "var(--cyan)", issues: [] },
    Momentum:   { keywords: ["release", "launch", "milestone", "roadmap", "deadline", "sprint", "epic", "plan", "schedul"], color: "var(--gold)", issues: [] },
    Risk:       { keywords: ["security", "auth", "cve", "vuln", "access", "secret", "leak", "compliance", "license", "legal"], color: "#f87171", issues: [] },
  };

  const unclassified = [];
  for (const issue of issues) {
    const text = `${issue.title} ${(issue.labels || []).join(" ")}`.toLowerCase();
    let matched = false;
    for (const [name, pillar] of Object.entries(pillars)) {
      if (pillar.keywords.some((kw) => text.includes(kw))) {
        pillar.issues.push(issue);
        matched = true;
        break;
      }
    }
    if (!matched) unclassified.push(issue);
  }

  const total = issues.length;

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">ISSUE SIGNAL CORRELATION</span>
        <span class="hub-section-badge" style="color:var(--muted);">${total} open issue${total !== 1 ? "s" : ""} mapped</span>
      </div>
      <div class="hub-section-body">
        <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:12px;">
          ${Object.entries(pillars).map(([name, pillar]) => {
            const count = pillar.issues.length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return `
              <div style="padding:10px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span style="font-size:10px; font-weight:700; color:${pillar.color}; letter-spacing:0.06em;">${name.toUpperCase()}</span>
                  <span style="font-size:13px; font-weight:800; color:${count > 0 ? pillar.color : "var(--muted)"};">${count}</span>
                </div>
                <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                  <div style="height:100%; width:${pct}%; background:${pillar.color}; border-radius:2px; opacity:0.7;"></div>
                </div>
                ${count > 0 ? `
                  <div style="font-size:10px; color:var(--muted); margin-top:6px; line-height:1.6;">
                    ${pillar.issues.slice(0, 2).map((i) => `<div title="#${i.number}">· ${i.title.length > 38 ? i.title.slice(0, 38) + "…" : i.title}</div>`).join("")}
                    ${count > 2 ? `<div style="color:var(--muted);">+ ${count - 2} more</div>` : ""}
                  </div>
                ` : ""}
              </div>
            `;
          }).join("")}
        </div>
        ${unclassified.length > 0 ? `
          <div style="font-size:10px; color:var(--muted); padding-top:8px; border-top:1px solid var(--border);">
            ${unclassified.length} issue${unclassified.length !== 1 ? "s" : ""} unclassified (no matching label/keyword)
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function renderScorePillarChart(project, repoData, sbData, socialData, scoreHistory = []) {
  const scoring = scoreProject(project, repoData, sbData, socialData);

  // Per-pillar trend: compare current scores to previous snapshot's pillars
  const prevPillars = (() => {
    for (let i = scoreHistory.length - 1; i >= 0; i--) {
      const p = scoreHistory[i]?.pillars?.[project.id];
      if (p) return p;
    }
    return null;
  })();
  function pillarTrend(key, currentScore) {
    if (!prevPillars) return "";
    const prev = prevPillars[key];
    if (prev == null) return "";
    const delta = currentScore - prev;
    if (delta > 0) return ` <span style="color:var(--green); font-size:10px; font-weight:700;">↑${delta}</span>`;
    if (delta < 0) return ` <span style="color:var(--red); font-size:10px; font-weight:700;">↓${Math.abs(delta)}</span>`;
    return ` <span style="color:var(--muted); font-size:10px;">→</span>`;
  }

  const pillars = [
    { key: "development", trendKey: "dev",      label: "Dev",      max: 30,                       color: "#69b3ff" },
    { key: "engagement",  trendKey: "engage",    label: "Engage",   max: 25,                       color: "#7ae7c7" },
    { key: "momentum",    trendKey: "momentum",  label: "Momentum", max: 25,                       color: "#ffc874" },
    { key: "risk",        trendKey: "risk",      label: "Risk",     max: scoring.pillars.risk.max, color: "#6ae3b2" },
  ];
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">SCORE PILLARS</span>
        <span class="hub-section-badge" style="color:${scoring.gradeColor};">${scoring.total}/100 · ${scoring.grade}</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${pillars.map(({ key, trendKey, label, max, color }) => {
            const p = scoring.pillars[key];
            const pct = Math.round((p.score / max) * 100);
            return `
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <span style="font-size:11px; font-weight:700; color:${color};">${label}</span>
                  <span style="font-size:11px; color:${color};">${p.score}<span style="color:var(--muted);">/${max}</span>
                    <span style="font-size:10px; color:var(--muted); margin-left:4px;">${pct}%</span>
                    ${pillarTrend(trendKey, p.score)}
                  </span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden;">
                  <div style="width:${pct}%; height:100%; background:${color}; border-radius:3px;"></div>
                </div>
                ${p.signals.length > 0 ? `
                  <div style="font-size:10px; color:var(--muted); margin-top:3px; line-height:1.4;">
                    ${p.signals.slice(0, 3).join(" · ")}${p.signals.length > 3 ? ` <span style="color:var(--muted);">+${p.signals.length - 3} more</span>` : ""}
                  </div>
                ` : ""}
              </div>
            `;
          }).join("")}
        </div>
        <button data-score-explain="${escapeHtml(project.id)}"
          style="margin-top:12px; font-size:11px; padding:6px 12px; background:rgba(255,255,255,0.04);
                 border:1px solid var(--border); border-radius:8px; color:var(--muted); cursor:pointer; width:100%;">
          View full score explanation →
        </button>
      </div>
    </div>
  `;
}

function renderForecastAccuracy(project) {
  const acc = getForecastAccuracy(project.id);
  if (!acc) return ""; // need 3+ predictions
  const color = acc.accuracy >= 70 ? "var(--green)" : acc.accuracy >= 50 ? "var(--gold)" : "var(--red)";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">FORECAST ACCURACY</span>
        <span class="hub-section-badge" style="color:${color};">${acc.accuracy}%</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:8px;">
          <div style="font-size:28px; font-weight:800; color:${color}; line-height:1;">${acc.accuracy}%</div>
          <div>
            <div style="font-size:12px; font-weight:700; color:var(--text);">Direction accuracy</div>
            <div style="font-size:11px; color:var(--muted);">${acc.correct} correct of ${acc.total} score predictions</div>
          </div>
        </div>
        <div style="height:5px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden;">
          <div style="width:${acc.accuracy}%; height:100%; background:${color}; border-radius:3px;"></div>
        </div>
        <div style="font-size:10px; color:var(--muted); margin-top:5px; line-height:1.5;">
          Tracks whether forecasted score direction (↑/↓) matched actual movement between snapshots.${acc.total < 10 ? ` Accuracy improves with more data (${acc.total}/10).` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderProprietaryScoresSection(project, repoData, socialData, scoreHistory) {
  const pot = scorePotential(project, repoData, socialData, scoreHistory);
  const mom = scoreMomentumIndex(project, repoData, scoreHistory);
  const pl = potentialLabel(pot);
  const ml = momentumLabel(mom);

  // ── Breakaway Index (0–100) — how close to separating from the pack ──
  const scoring = scoreProject(project, repoData, null, socialData);
  const scoreVals = (scoreHistory || []).map((h) => h.scores?.[project.id]).filter((v) => v != null);
  let breakawayScore = 0;
  if (scoreVals.length >= 2) {
    const recentDelta = scoreVals[scoreVals.length - 1] - scoreVals[Math.max(0, scoreVals.length - 3)];
    breakawayScore += Math.min(40, Math.max(0, recentDelta * 8));
  }
  if (scoring.total >= 80) breakawayScore += 30;
  else if (scoring.total >= 60) breakawayScore += 15;
  if (pot >= 70) breakawayScore += 15;
  if (mom >= 60) breakawayScore += 15;
  breakawayScore = Math.min(100, breakawayScore);
  const bkColor = breakawayScore >= 75 ? "#7ae7c7" : breakawayScore >= 50 ? "#69b3ff" : breakawayScore >= 30 ? "#ffc874" : "#64748b";
  const bkLabel = breakawayScore >= 75 ? "BREAKOUT" : breakawayScore >= 50 ? "RISING" : breakawayScore >= 30 ? "STEADY" : "DORMANT";

  // ── Sustainability Rating (0–100) — long-term viability ──
  let sustainability = 50;
  const ciPassing = repoData?.ciRuns?.[0]?.conclusion === "success";
  if (ciPassing) sustainability += 15;
  const vel = (() => { const now = Date.now(), wk = 7 * 86400000; let tw = 0; for (const c of (repoData?.commits || [])) { if (now - new Date(c.date).getTime() < wk) tw++; } return tw; })();
  if (vel >= 3) sustainability += 10;
  else if (vel >= 1) sustainability += 5;
  if (project.deployedUrl) sustainability += 10;
  if (project.studioOsApplied) sustainability += 5;
  const openIssues = repoData?.repo?.openIssues ?? 0;
  if (openIssues === 0) sustainability += 10;
  else if (openIssues < 5) sustainability += 5;
  else sustainability -= 5;
  sustainability = Math.min(100, Math.max(0, sustainability));
  const susColor = sustainability >= 75 ? "#7ae7c7" : sustainability >= 50 ? "#69b3ff" : sustainability >= 30 ? "#ffc874" : "#64748b";
  const susLabel = sustainability >= 75 ? "STRONG" : sustainability >= 50 ? "HEALTHY" : sustainability >= 30 ? "AT RISK" : "CRITICAL";

  // ── Code Tempo (0–100) — rhythm and consistency of development ──
  const commits = repoData?.commits || [];
  const now = Date.now();
  const dayBuckets = new Array(14).fill(0);
  for (const c of commits) {
    const dayIdx = Math.floor((now - new Date(c.date).getTime()) / 86400000);
    if (dayIdx >= 0 && dayIdx < 14) dayBuckets[dayIdx]++;
  }
  const activeDays = dayBuckets.filter((d) => d > 0).length;
  let codeTempo = Math.min(50, (activeDays / 14) * 70);
  const consistency = activeDays >= 2 ? (1 - (Math.max(...dayBuckets) - Math.min(...dayBuckets.filter((d) => d > 0))) / Math.max(1, Math.max(...dayBuckets))) : 0;
  codeTempo += consistency * 30;
  codeTempo += Math.min(20, vel * 4);
  codeTempo = Math.round(Math.min(100, Math.max(0, codeTempo)));
  const ctColor = codeTempo >= 70 ? "#7ae7c7" : codeTempo >= 45 ? "#69b3ff" : codeTempo >= 20 ? "#ffc874" : "#64748b";
  const ctLabel = codeTempo >= 70 ? "IN FLOW" : codeTempo >= 45 ? "ACTIVE" : codeTempo >= 20 ? "SPORADIC" : "SILENT";

  // ── Risk Exposure (0–100, lower = better) — vulnerability surface ──
  let riskExposure = 0;
  if (openIssues > 10) riskExposure += 25;
  else if (openIssues > 5) riskExposure += 12;
  const stalePRs = (repoData?.prs || []).filter((pr) => (now - new Date(pr.createdAt).getTime()) > 14 * 86400000).length;
  riskExposure += Math.min(20, stalePRs * 7);
  if (!ciPassing) riskExposure += 20;
  if (!repoData?.ciRuns?.length) riskExposure += 15;
  const lastCommitAge = commits[0] ? (now - new Date(commits[0].date).getTime()) / 86400000 : Infinity;
  if (lastCommitAge > 30) riskExposure += 20;
  else if (lastCommitAge > 14) riskExposure += 10;
  riskExposure = Math.min(100, riskExposure);
  const reColor = riskExposure <= 20 ? "#7ae7c7" : riskExposure <= 45 ? "#69b3ff" : riskExposure <= 70 ? "#ffc874" : "#f87171";
  const reLabel = riskExposure <= 20 ? "LOW" : riskExposure <= 45 ? "MODERATE" : riskExposure <= 70 ? "ELEVATED" : "HIGH";

  function scoreCard(title, score, label, color, description) {
    return `<div style="padding:12px; border-radius:10px; background:${color}0d; border:1px solid ${color}28;">
      <div style="font-size:10px; font-weight:700; color:var(--muted); letter-spacing:0.07em; margin-bottom:6px;">${title}</div>
      <div style="font-size:28px; font-weight:800; color:${color}; line-height:1;">${score}</div>
      <div style="font-size:11px; font-weight:700; color:${color}; margin-top:2px;">${label}</div>
      <div style="font-size:10px; color:var(--muted); margin-top:6px; line-height:1.4;">${description}</div>
    </div>`;
  }

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">PROPRIETARY SCORES</span>
        <span class="hub-section-badge" style="color:var(--muted); font-size:10px;">VaultSpark Intelligence</span>
      </div>
      <div class="hub-section-body">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          ${scoreCard("POTENTIAL", pot, pl.label, pl.color, "Upside trajectory: score trend, community traction, market readiness, dev acceleration")}
          ${scoreCard("MOMENTUM INDEX", mom, ml.label, ml.color, "Current velocity: commit speed, CI streak, PR activity, release recency, issue resolution")}
          ${scoreCard("BREAKAWAY INDEX", breakawayScore, bkLabel, bkColor, "Separation potential: score acceleration + absolute health + upside trajectory combined")}
          ${scoreCard("SUSTAINABILITY", sustainability, susLabel, susColor, "Long-term viability: CI health, commit cadence, deployment status, issue hygiene")}
          ${scoreCard("CODE TEMPO", codeTempo, ctLabel, ctColor, "Development rhythm: commit consistency over 14 days, daily spread, velocity trend")}
          ${scoreCard("RISK EXPOSURE", riskExposure, reLabel, reColor, "Vulnerability surface: stale PRs, open issues, CI failures, development gaps (lower = better)")}
        </div>
      </div>
    </div>
  `;
}

// ── Advanced Project Stats ─────────────────────────────────────────────────────
function renderAdvancedProjectStats(project, repoData, scoreHistory) {
  const commits = repoData?.commits || [];
  const prs = repoData?.prs || [];
  const issues = repoData?.repo?.openIssues ?? 0;
  const ciRuns = repoData?.ciRuns || [];
  const now = Date.now();

  // ── Commit velocity trend (2-week view) ──
  const weekMs = 7 * 86400000;
  let thisWeek = 0, lastWeek = 0, twoWeeksAgo = 0;
  for (const c of commits) {
    const age = now - new Date(c.date).getTime();
    if (age < weekMs) thisWeek++;
    else if (age < 2 * weekMs) lastWeek++;
    else if (age < 3 * weekMs) twoWeeksAgo++;
  }
  const velTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);
  const velLabel = velTrend > 10 ? "Accelerating" : velTrend < -10 ? "Decelerating" : "Stable";
  const velColor = velTrend > 10 ? "var(--green)" : velTrend < -10 ? "var(--red)" : "var(--cyan)";

  // ── CI success streak ──
  let ciStreak = 0;
  for (const r of ciRuns) {
    if (r.conclusion === "success") ciStreak++;
    else break;
  }
  const ciStreakLabel = ciStreak >= 10 ? "Excellent" : ciStreak >= 5 ? "Good" : ciStreak >= 1 ? "Building" : "None";

  // ── PR turnaround ──
  const prAges = prs.filter((pr) => !pr.draft).map((pr) => (now - new Date(pr.createdAt).getTime()) / 86400000);
  const avgPRAge = prAges.length > 0 ? (prAges.reduce((a, b) => a + b, 0) / prAges.length).toFixed(1) : null;
  const oldestPR = prAges.length > 0 ? Math.round(Math.max(...prAges)) : null;

  // ── Score consistency (σ of last 10 snapshots) ──
  const scoreVals = (scoreHistory || []).slice(-10).map((h) => h.scores?.[project.id]).filter((v) => v != null);
  let scoreVolatility = null;
  if (scoreVals.length >= 3) {
    const mean = scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length;
    const variance = scoreVals.reduce((s, v) => s + (v - mean) ** 2, 0) / scoreVals.length;
    scoreVolatility = Math.sqrt(variance).toFixed(1);
  }

  // ── Commit message quality signal ──
  const conventionalCommits = commits.filter((c) => /^(feat|fix|chore|docs|style|refactor|test|ci|build)\b/i.test(c.message || "")).length;
  const conventionalPct = commits.length > 0 ? Math.round((conventionalCommits / commits.length) * 100) : 0;

  // ── Issue velocity ──
  const fixCommits = commits.filter((c) => /\b(fix|close|resolve|closes|fixes)\b/i.test(c.message || "")).length;
  const issueRatio = (issues + fixCommits) > 0 ? Math.round((fixCommits / (issues + fixCommits)) * 100) : 0;

  // ── Release maturity ──
  const rel = repoData?.latestRelease;
  const relAge = rel?.publishedAt ? Math.round((now - new Date(rel.publishedAt).getTime()) / 86400000) : null;
  const relFreshness = relAge != null ? (relAge <= 7 ? "Fresh" : relAge <= 30 ? "Recent" : relAge <= 90 ? "Aging" : "Stale") : "None";
  const relColor = relAge != null ? (relAge <= 7 ? "var(--green)" : relAge <= 30 ? "var(--cyan)" : relAge <= 90 ? "var(--yellow)" : "var(--red)") : "var(--muted)";

  function kvRow(k, v, color = "var(--cyan)") {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      <span style="font-size:11px;color:var(--muted);">${k}</span>
      <span style="font-size:12px;font-weight:600;color:${color};">${v}</span>
    </div>`;
  }

  function statBox(label, value, sub = "") {
    return `<div style="flex:1;min-width:100px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:10px;">
      <div style="font-size:9px;color:var(--muted);margin-bottom:3px;letter-spacing:0.07em;">${label}</div>
      <div style="font-size:20px;font-weight:800;color:var(--cyan);">${value}</div>
      ${sub ? `<div style="font-size:10px;color:var(--muted);">${sub}</div>` : ""}
    </div>`;
  }

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">ADVANCED STATS</span>
        <span class="hub-section-badge" style="color:var(--muted); font-size:10px;">Deep Diagnostics</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
          ${statBox("COMMITS/WK", thisWeek, `<span style="color:${velColor}">${velTrend > 0 ? "+" : ""}${velTrend}% ${velLabel}</span>`)}
          ${statBox("CI STREAK", ciStreak + "x", ciStreakLabel)}
          ${statBox("SCORE VOL.", scoreVolatility ?? "—", scoreVolatility ? "σ (lower = stable)" : "need 3+ snapshots")}
          ${statBox("CONV. COMMITS", conventionalPct + "%", conventionalCommits + " of " + commits.length)}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div>
            <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">VELOCITY & CADENCE</div>
            ${kvRow("This Week", thisWeek + " commits", velColor)}
            ${kvRow("Last Week", lastWeek + " commits")}
            ${kvRow("2 Weeks Ago", twoWeeksAgo + " commits")}
            ${kvRow("WoW Change", (velTrend > 0 ? "+" : "") + velTrend + "%", velColor)}
            ${kvRow("Velocity Trend", velLabel, velColor)}
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">ISSUE & PR HEALTH</div>
            ${kvRow("Open Issues", String(issues), issues > 10 ? "var(--red)" : issues > 5 ? "var(--yellow)" : "var(--green)")}
            ${kvRow("Issue Resolution Signal", issueRatio + "%")}
            ${kvRow("Fix Commits", String(fixCommits))}
            ${kvRow("Avg PR Age", avgPRAge ? avgPRAge + "d" : "—", avgPRAge && avgPRAge > 7 ? "var(--yellow)" : "var(--cyan)")}
            ${kvRow("Oldest PR", oldestPR ? oldestPR + "d" : "—", oldestPR && oldestPR > 14 ? "var(--red)" : "var(--cyan)")}
          </div>
        </div>
        <div style="margin-top:14px;">
          <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">RELEASE & DEPLOYMENT</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${statBox("RELEASE STATUS", relFreshness, rel ? `${rel.tag} · ${relAge}d ago` : "No releases")}
            ${statBox("CI COVERAGE", ciRuns.length > 0 ? "Active" : "None", ciRuns.length + " runs tracked")}
            ${statBox("DEPLOY URL", project.deployedUrl ? "Live" : "—", project.deployedUrl ? `<span style="font-size:9px;word-break:break-all;">${(project.deployedUrl || "").replace(/https?:\/\//, "")}</span>` : "Not deployed")}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── AI Prescription (#21) ─────────────────────────────────────────────────────
// Renders the cached Claude AI recommendation for this project.
// Fetch is triggered from clientApp.js after sync; this only reads the cache.
function renderAiPrescription(project) {
  const text = getCachedPrescription(project.id);
  if (!text) return "";
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">AI PRESCRIPTION</span>
        <span class="hub-section-badge" style="color:#c084fc; font-size:10px;">claude haiku · cached 12h</span>
      </div>
      <div class="hub-section-body">
        <div style="padding:12px 14px; background:rgba(192,132,252,0.05); border:1px solid rgba(192,132,252,0.15);
                    border-radius:8px; font-size:13px; color:var(--text); line-height:1.65;">
          ${escapeHtml(text)}
        </div>
        <button id="refresh-ai-prescription-${project.id}"
          data-project-id="${project.id}"
          style="margin-top:8px; font-size:11px; padding:4px 10px; background:rgba(192,132,252,0.08);
                 border:1px solid rgba(192,132,252,0.2); border-radius:6px; color:#c084fc; cursor:pointer;">
          ↺ Refresh
        </button>
      </div>
    </div>
  `;
}

// ── Automated Devlog Draft (#22) ─────────────────────────────────────────────
function renderDevlogDraftPanel(project) {
  const text = getCachedDevlogDraft(project.id);
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">DEVLOG DRAFT</span>
        <span class="hub-section-badge" style="color:var(--gold); font-size:10px;">claude haiku · 24h cache</span>
      </div>
      <div class="hub-section-body">
        ${text ? `
          <div id="devlog-draft-text-${escapeHtml(project.id)}"
               style="padding:12px 14px; background:rgba(255,200,116,0.05); border:1px solid rgba(255,200,116,0.15);
                      border-radius:8px; font-size:13px; color:var(--text); line-height:1.65; margin-bottom:8px;">
            ${escapeHtml(text)}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button id="copy-devlog-btn-${escapeHtml(project.id)}"
              data-project-id="${escapeHtml(project.id)}"
              style="font-size:11px; padding:4px 10px; background:rgba(255,200,116,0.08);
                     border:1px solid rgba(255,200,116,0.2); border-radius:6px; color:var(--gold); cursor:pointer;">
              ⎘ Copy
            </button>
            <button id="refresh-devlog-btn-${escapeHtml(project.id)}"
              data-project-id="${escapeHtml(project.id)}"
              style="font-size:11px; padding:4px 10px; background:rgba(255,255,255,0.04);
                     border:1px solid var(--border); border-radius:6px; color:var(--muted); cursor:pointer;">
              ↺ Regenerate
            </button>
          </div>
        ` : `
          <div style="font-size:12px; color:var(--muted); margin-bottom:10px; line-height:1.5;">
            Generate a weekly devlog entry from recent commit activity using Claude.
          </div>
          <button id="generate-devlog-btn-${escapeHtml(project.id)}"
            data-project-id="${escapeHtml(project.id)}"
            style="font-size:12px; padding:7px 14px; background:rgba(255,200,116,0.08);
                   border:1px solid rgba(255,200,116,0.25); border-radius:8px; color:var(--gold); cursor:pointer;">
            ✎ Generate Devlog Draft
          </button>
        `}
      </div>
    </div>
  `;
}

// ── Launch Readiness Checklist (#13) ─────────────────────────────────────────
// Shows only for non-live, non-archived projects. Evaluates launch criteria
// derived directly from the scoring model and GitHub signals.
function renderLaunchReadiness(project, repoData, sbData, socialData) {
  if (project.status === "live" || project.status === "archived") return "";
  const scoring = scoreProject(project, repoData, sbData, socialData);
  const now = Date.now();
  const commits = repoData?.commits || [];
  const lastCommitDays = commits.length ? (now - new Date(commits[0].date).getTime()) / 86400000 : Infinity;
  const openIssues = repoData?.repo?.openIssues ?? null;
  const overdueMilestones = (repoData?.milestones || []).filter((m) => m.dueOn && new Date(m.dueOn) < now && m.state === "open");
  const hasRelease = !!(repoData?.latestRelease || repoData?.deployments?.length);
  const ciPassing = repoData?.ciRuns?.[0]?.conclusion === "success";

  const criteria = [
    { label: "Health score ≥ 85 (A+)", ok: scoring.total >= 85, note: `Current: ${scoring.total}` },
    { label: "CI passing",             ok: ciPassing,           note: ciPassing ? "" : "Fix CI before launch" },
    { label: "Open issues < 10",       ok: openIssues !== null && openIssues < 10, note: openIssues !== null ? `${openIssues} open` : "No data" },
    { label: "No overdue milestones",  ok: overdueMilestones.length === 0, note: overdueMilestones.length ? `${overdueMilestones.length} overdue` : "" },
    { label: "Has release or deployment", ok: hasRelease,       note: hasRelease ? "" : "Tag a release or deploy" },
    { label: "Active development (< 7d)", ok: lastCommitDays < 7, note: lastCommitDays < Infinity ? `Last: ${Math.round(lastCommitDays)}d ago` : "No commits" },
  ];

  const passCount = criteria.filter((c) => c.ok).length;
  const pct = Math.round((passCount / criteria.length) * 100);
  const barColor = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--gold)" : "var(--red)";

  return `
    <div class="hub-section" style="margin-bottom:20px;">
      <div class="hub-section-header">
        <span class="hub-section-title">LAUNCH READINESS</span>
        <span style="font-size:11px; font-weight:700; color:${barColor};">${pct}% — ${passCount}/${criteria.length} criteria</span>
      </div>
      <div class="hub-section-body">
        <div style="height:4px; background:var(--border); border-radius:2px; margin-bottom:12px;">
          <div style="height:100%; width:${pct}%; background:${barColor}; border-radius:2px; transition:width 0.3s;"></div>
        </div>
        ${criteria.map((c) => `
          <div style="display:flex; align-items:center; gap:10px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
            <span style="font-size:13px; color:${c.ok ? "var(--green)" : "var(--red)"}; flex-shrink:0;">${c.ok ? "✓" : "✗"}</span>
            <span style="font-size:12px; color:${c.ok ? "var(--text)" : "var(--muted)"}; flex:1;">${c.label}</span>
            ${c.note && !c.ok ? `<span style="font-size:10px; color:var(--muted);">${c.note}</span>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Project Doctor (#12) ──────────────────────────────────────────────────────
// Generates a ranked, deterministic action list from the scoring model:
// "Do X to gain ~N pts in [pillar]" — ordered by weighted point gain.
function renderProjectDoctor(project, repoData, sbData, socialData) {
  const scoring = scoreProject(project, repoData, sbData, socialData);
  if (scoring.total >= 95) return ""; // already excellent
  const actions = [];

  // Dev pillar gap
  const devGap  = 30 - scoring.pillars.development.score;
  const devSigs = scoring.pillars.development.signals || [];
  if (devSigs.some((s) => s.toLowerCase().includes("fail"))) {
    actions.push({ pts: 12, pillar: "Dev", label: "Fix CI build", detail: "CI passing adds +15 Dev pts" });
  } else if (devGap >= 10 && devSigs.some((s) => s.toLowerCase().includes("no recent") || s.toLowerCase().includes("no commit"))) {
    actions.push({ pts: 8, pillar: "Dev", label: "Push commits", detail: "Any commit this week adds +12 Dev pts" });
  } else if (devGap >= 8) {
    actions.push({ pts: 5, pillar: "Dev", label: "Improve CI or commit cadence", detail: `Dev at ${scoring.pillars.development.score}/30` });
  }

  // Momentum pillar gap
  const momGap   = 25 - scoring.pillars.momentum.score;
  const momSigs  = scoring.pillars.momentum.signals || [];
  const hasRelease = momSigs.some((s) => s.includes("Released") || s.includes("this week") || s.includes("this month"));
  if (!hasRelease && momGap >= 10) {
    actions.push({ pts: 10, pillar: "Momentum", label: "Ship a release", detail: "Release this month adds +7 Momentum pts; this week +10" });
  }
  if (!repoData?.prs?.length && momGap >= 6) {
    actions.push({ pts: 5, pillar: "Momentum", label: "Open a PR", detail: "Active PRs add +5 Momentum pts" });
  }

  // Risk pillar gap
  const riskGap   = 20 - scoring.pillars.risk.base;
  const openIssues = repoData?.repo?.openIssues || 0;
  if (riskGap >= 6 && openIssues > 5) {
    actions.push({ pts: Math.min(10, riskGap), pillar: "Risk", label: `Close ${Math.min(10, openIssues)} issues`, detail: `${openIssues} open now; reducing to <6 removes −3 Risk penalty` });
  }
  const stalePRs = (repoData?.prs || []).filter((pr) => !pr.draft && (Date.now() - new Date(pr.createdAt).getTime()) / 86400000 > 30);
  if (stalePRs.length) {
    actions.push({ pts: 2, pillar: "Risk", label: `Merge/close ${stalePRs.length} stale PR${stalePRs.length > 1 ? "s" : ""}`, detail: "Stale PRs (>30 days) cost −2 Risk pts" });
  }

  // Engagement pillar gap
  const engGap = 25 - scoring.pillars.engagement.score;
  if (engGap >= 12 && !project.deployedUrl) {
    actions.push({ pts: 5, pillar: "Engagement", label: "Deploy the project", detail: "Live deployed URL adds +5 Engagement pts" });
  }
  if (engGap >= 8 && !project.supabaseGameSlug) {
    actions.push({ pts: 3, pillar: "Engagement", label: "Update context files", detail: "Recent context commits add +3 Engagement pts" });
  }

  // Studio OS governance gap
  const govGap = 5 - (scoring.pillars.risk.governance || 0);
  if (govGap >= 2) {
    actions.push({ pts: govGap, pillar: "Governance", label: "Complete Studio OS compliance", detail: "Full compliance + SIL fresh + CDR active = +5 bonus pts" });
  }

  if (!actions.length) return "";
  actions.sort((a, b) => b.pts - a.pts);
  const top5 = actions.slice(0, 5);
  const totalPossible = top5.reduce((s, a) => s + a.pts, 0);

  const pillarColors = { Dev: "var(--blue)", Momentum: "var(--cyan)", Risk: "var(--green)", Engagement: "var(--gold)", Governance: "#c084fc" };

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">PROJECT DOCTOR</span>
        <span class="hub-section-badge" style="color:var(--green);">+${totalPossible} pts possible</span>
      </div>
      <div class="hub-section-body">
        <div style="font-size:11px; color:var(--muted); margin-bottom:12px;">
          Ranked actions to close the gap to grade A (90+). Currently ${scoring.total}/100.
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${top5.map((a, i) => `
            <div style="display:flex; align-items:flex-start; gap:12px; padding:10px 12px;
                        background:${pillarColors[a.pillar]}0a; border:1px solid ${pillarColors[a.pillar]}1e;
                        border-radius:8px;">
              <div style="font-size:13px; font-weight:800; color:var(--muted); min-width:18px; text-align:center;
                          opacity:0.5;">${i + 1}</div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-bottom:2px;">${a.label}</div>
                <div style="font-size:11px; color:var(--muted);">${a.detail}</div>
              </div>
              <div style="text-align:right; flex-shrink:0;">
                <div style="font-size:13px; font-weight:800; color:${pillarColors[a.pillar]};">+${a.pts}</div>
                <div style="font-size:9px; color:var(--muted); text-transform:uppercase; letter-spacing:0.04em;">${a.pillar}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderRevenueAttribution(project, gumroadSales, repoData) {
  if (!gumroadSales) return "";

  // Filter sales to this project's product name (fuzzy — includes project name)
  const slug = project.name.toLowerCase().replace(/\s+/g, "");
  const relevant = gumroadSales.filter((s) =>
    s.productName?.toLowerCase().replace(/\s+/g, "").includes(slug) ||
    slug.includes(s.productName?.toLowerCase().replace(/\s+/g, "") || "____")
  );

  // Aggregate by day
  const byDay = {};
  for (const sale of (relevant.length ? relevant : gumroadSales)) {
    const day = (sale.createdAt || "").slice(0, 10);
    if (!day) continue;
    byDay[day] = (byDay[day] || 0) + sale.price;
  }

  const days = Object.keys(byDay).sort();
  if (!days.length) return "";

  const total = Object.values(byDay).reduce((s, v) => s + v, 0);
  const releaseTag = repoData?.latestRelease?.tag || null;
  const releaseDate = repoData?.latestRelease?.publishedAt?.slice(0, 10) || null;
  const maxVal = Math.max(...Object.values(byDay), 1);

  const bars = days.map((d) => {
    const val = byDay[d] || 0;
    const pct = Math.round((val / maxVal) * 100);
    const isRelease = d === releaseDate;
    return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; min-width:0;"
                 title="${d}: $${val.toFixed(2)}${isRelease ? ` · Release ${releaseTag}` : ""}">
      ${isRelease ? `<div style="width:2px; height:4px; background:var(--gold); border-radius:1px; flex-shrink:0;"></div>` : `<div style="height:4px;"></div>`}
      <div style="width:100%; height:${Math.max(2, pct)}%; background:${isRelease ? "var(--gold)" : "rgba(122,231,199,0.5)"}; border-radius:2px 2px 0 0; min-height:2px;"></div>
    </div>`;
  }).join("");

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">REVENUE ATTRIBUTION</span>
        <span class="hub-section-badge" style="color:var(--green);">$${total.toFixed(2)} / 30d</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; align-items:flex-end; gap:2px; height:60px; padding-bottom:4px; border-bottom:1px solid var(--border);">
          ${bars}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted); margin-top:4px;">
          <span>${days[0]}</span>
          ${releaseDate ? `<span style="color:var(--gold);">▲ ${releaseTag || "release"}</span>` : ""}
          <span>${days[days.length - 1]}</span>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:8px;">${relevant.length ? `${relevant.length} sale${relevant.length !== 1 ? "s" : ""} matched to this project` : `${gumroadSales.length} total sales (all products — project match unavailable)`}</div>
      </div>
    </div>
  `;
}

export function renderProjectHubView(project, state) {
  const { ghData = {}, sbData = null, socialData = null, contextFiles = {}, scoreHistory = [], contextFilesLoading = new Set(), projectExtendedData = {}, projectExtendedLoading = new Set(), tickets = [] } = state;
  const gumroadSales = socialData?.gumroadSales || null;
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
        ${renderScorePillarChart(project, repoData, sbData, socialData, scoreHistory)}
        ${renderScoreExplainerPanel(explainScore(project, repoData, sbData, socialData))}
        ${renderLaunchReadiness(project, repoData, sbData, socialData)}
        ${renderProjectDoctor(project, repoData, sbData, socialData)}
        ${renderAiPrescription(project)}
        ${renderDevlogDraftPanel(project)}
        ${renderForecastAccuracy(project)}
        ${renderProprietaryScoresSection(project, repoData, socialData, scoreHistory)}
        ${renderAdvancedProjectStats(project, repoData, scoreHistory)}
        ${renderHealthPrescription(project, repoData, sbData, socialData)}
        ${renderActionQueue(project)}
        ${renderGoalSection(project, scoreHistory)}
        ${renderActionItemTracker(project)}
        ${renderLocalMilestoneBoard(project)}
        ${renderNotesSection(project)}
        ${renderAnnotationSection(project)}
        ${renderTagsSection(project)}
        ${renderRevenueAttribution(project, gumroadSales, repoData)}
        ${renderScoreHistoryLineChart(project, scoreHistory)}
        ${renderScoreChangelog(project, scoreHistory)}
        ${renderScoreCalibration(project, repoData, sbData, socialData)}
        ${renderIssueTrendChart(project, scoreHistory)}
        ${renderIssueSignalCorrelation(project, repoData)}
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
