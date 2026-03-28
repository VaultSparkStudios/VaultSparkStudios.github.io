import { timeAgo, fmt, escapeHtml, renderEmptyState, safeGetJSON } from "../utils/helpers.js";
import { explainScore, renderScoreExplainerPanel } from "../utils/scoreExplainer.js";

// ── Extracted sub-components ─────────────────────────────────────────────────
import { renderScorePillarChart, renderForecastAccuracy, renderScoreCalibration, renderScoreHistoryLineChart, renderScoreChangelog, renderProprietaryScoresSection, renderAdvancedProjectStats, renderHealthPrescription, renderLaunchReadiness, renderProjectDoctor, renderIssueTrendChart, renderIssueSignalCorrelation, renderRevenueAttribution } from "./project/projectScorePanel.js";
import { renderGoalSection, renderActionItemTracker } from "./project/projectGoals.js";
import { renderLocalMilestoneBoard } from "./project/projectRoadmap.js";
import { renderNotesSection, renderAnnotationSection, renderTagsSection } from "./project/projectNotes.js";
import { renderActionQueue } from "./project/projectActionQueue.js";

const LOCAL_PATHS_KEY = "vshub_local_paths";
function loadLocalPaths() { return safeGetJSON(LOCAL_PATHS_KEY, {}); }



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

// ── Dependency Alerts Board ───────────────────────────────────────────────────
function renderDepAlertsSection(project, extData) {
  const alerts = extData?.depAlerts;
  const repoUrl = project.githubRepo
    ? `https://github.com/${project.githubRepo}/security/dependabot`
    : null;

  // Nothing loaded yet — skip entirely
  if (!alerts) return "";

  // Zero alerts — green "All clear" badge
  if (alerts.total === 0) {
    return `
      <div class="hub-section">
        <div class="hub-section-header">
          <span class="hub-section-title">DEPENDENCY ALERTS</span>
          <span class="hub-section-badge" style="background:rgba(122,231,199,0.12); color:#7ae7c7;">All clear</span>
        </div>
      </div>
    `;
  }

  const severities = [
    { key: "critical", label: "Critical", bg: "rgba(248,113,113,0.14)", border: "#f87171", color: "#f87171", icon: "🔴" },
    { key: "high",     label: "High",     bg: "rgba(251,146,60,0.12)",  border: "#fb923c", color: "#fb923c", icon: "🟠" },
    { key: "medium",   label: "Medium",   bg: "rgba(250,204,21,0.10)",  border: "#facc15", color: "#facc15", icon: "🟡" },
    { key: "low",      label: "Low",      bg: "rgba(148,163,184,0.08)", border: "var(--border)", color: "var(--muted)", icon: "⚪" },
  ];

  const cards = severities
    .filter(s => alerts[s.key] > 0)
    .map(s => `
      <a href="${repoUrl}" target="_blank" rel="noopener" style="
        text-decoration:none; flex:1; min-width:90px; padding:10px 12px;
        background:${s.bg}; border:1px solid ${s.border}; border-radius:10px;
        display:flex; flex-direction:column; align-items:center; gap:4px;
        transition:transform 0.12s, box-shadow 0.12s; cursor:pointer;
      " onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.25)';"
        onmouseleave="this.style.transform='';this.style.boxShadow='';">
        <span style="font-size:22px; font-weight:800; color:${s.color};">${alerts[s.key]}</span>
        <span style="font-size:10px; font-weight:700; letter-spacing:0.05em; color:${s.color}; text-transform:uppercase;">${s.label}</span>
      </a>
    `)
    .join("");

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">DEPENDENCY ALERTS</span>
        <span class="hub-section-badge" style="background:rgba(248,113,113,0.12); color:#f87171;">${alerts.total} open</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
          ${cards}
        </div>
        ${repoUrl ? `
          <a href="${repoUrl}" target="_blank" rel="noopener"
            style="display:inline-flex; align-items:center; gap:6px; font-size:11px;
                   color:var(--cyan); text-decoration:none; padding:4px 0;"
          >View on GitHub →</a>
        ` : ""}
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
        ${renderDepAlertsSection(project, extData)}
        ${renderReleaseNotesDraft(project, repoData)}
        ${renderDeploymentsSection(repoData)}
        ${renderVaultSection(project, sbData)}
      </div>
    </div>
  `;
}
