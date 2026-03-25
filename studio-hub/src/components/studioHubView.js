import { PROJECTS, SOCIAL_ACCOUNTS } from "../data/studioRegistry.js";
import { scoreProject, scoreStudio, getGrade } from "../utils/projectScoring.js";

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function ciStatus(runs) {
  if (!runs?.length) return { cls: "unknown", label: "No CI" };
  const r = runs[0];
  if (r.status === "in_progress") return { cls: "running", label: "Running" };
  if (r.conclusion === "success") return { cls: "passing", label: "Passing" };
  if (r.conclusion === "failure") return { cls: "failing", label: "Failed" };
  return { cls: "unknown", label: r.conclusion || "Unknown" };
}

function scoreBar(score, max, color) {
  const pct = Math.round((score / max) * 100);
  return `
    <div style="display:flex; align-items:center; gap:8px;">
      <div style="flex:1; height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden;">
        <div style="width:${pct}%; height:100%; background:${color}; border-radius:2px;"></div>
      </div>
      <span style="font-size:10px; color:var(--muted); min-width:28px; text-align:right;">${score}/${max}</span>
    </div>
  `;
}

// ── Studio Vitals ─────────────────────────────────────────────────────────────
function renderVitals(ghData, sbData, socialData, studioScore) {
  const totalIssues = Object.values(ghData).reduce((s, d) => s + (d?.repo?.openIssues || 0), 0);
  const failingBuilds = Object.values(ghData).filter((d) => d?.ciRuns?.[0]?.conclusion === "failure").length;
  const activeProjects = PROJECTS.filter((p) => p.status !== "archived").length;
  const memberCount = sbData?.members?.total ?? null;
  const totalSessions = sbData?.sessions
    ? Object.values(sbData.sessions).reduce((s, v) => s + (v.week || 0), 0)
    : null;
  const ytSubs = socialData?.youtube?.subscribers ?? null;

  const vitals = [
    {
      label: "Studio Score",
      value: studioScore.average ? `${studioScore.average}` : "—",
      sub: studioScore.grade !== "—" ? `Grade ${studioScore.grade}` : "Calculating…",
      cls: studioScore.gradeColor ? "" : "muted",
      style: `color:${studioScore.gradeColor || "var(--muted)"}`,
    },
    { label: "Active Projects", value: String(activeProjects), sub: `${PROJECTS.length} total`, cls: "gold" },
    { label: "Vault Members", value: fmt(memberCount), sub: memberCount ? `+${sbData?.members?.newThisWeek || 0} this week` : "Configure Supabase", cls: "cyan" },
    { label: "Game Sessions (7d)", value: fmt(totalSessions), sub: "Across all games", cls: "blue" },
    { label: "YouTube Subscribers", value: fmt(ytSubs), sub: ytSubs ? `${fmt(socialData?.youtube?.videoCount)} videos` : "Configure API key", cls: "text" },
    { label: "Open Issues", value: fmt(totalIssues), sub: failingBuilds > 0 ? `${failingBuilds} failing build${failingBuilds > 1 ? "s" : ""}` : "All builds healthy", cls: failingBuilds > 0 ? "red" : totalIssues > 20 ? "gold" : "green" },
  ];

  return `
    <div class="vitals-strip">
      ${vitals.map((v) => `
        <div class="vital-card">
          <div class="vital-label">${v.label}</div>
          <div class="vital-value ${v.cls}" ${v.style ? `style="${v.style}"` : ""}>${v.value}</div>
          <div class="vital-sub">${v.sub}</div>
        </div>
      `).join("")}
    </div>
  `;
}

// ── Project Card ──────────────────────────────────────────────────────────────
function renderProjectCard(project, ghData, sbData, socialData, settings) {
  const repoData = ghData[project.githubRepo] || null;
  const scoring = scoreProject(project, repoData, sbData, socialData);
  const ci = ciStatus(repoData?.ciRuns);
  const lastCommit = repoData?.commits?.[0];
  const sessions = sbData?.sessions?.[project.supabaseGameSlug];

  const showScores = settings?.showScores !== false;

  return `
    <div class="project-card" style="--project-color:${project.color}" data-view="project:${project.id}">

      <div class="project-card-header">
        <div>
          <div class="project-card-name">${project.name}</div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
            <span class="project-status-pill ${project.status}" style="margin:0;">${project.statusLabel}</span>
            <span class="project-card-type ${project.type}">${project.type}</span>
          </div>
        </div>
        ${showScores ? `
          <div style="text-align:center; flex-shrink:0;">
            <div style="font-size:22px; font-weight:800; color:${scoring.gradeColor}; line-height:1;">${scoring.total}</div>
            <div style="font-size:11px; font-weight:700; color:${scoring.gradeColor};">${scoring.grade}</div>
          </div>
        ` : ""}
      </div>

      ${showScores ? `
        <div style="margin:12px 0; display:flex; flex-direction:column; gap:5px;">
          ${scoreBar(scoring.pillars.development.score, 30, "#69b3ff")}
          ${scoreBar(scoring.pillars.engagement.score, 25, "#7ae7c7")}
          ${scoreBar(scoring.pillars.momentum.score, 25, "#ffc874")}
          ${scoreBar(scoring.pillars.risk.score, 20, "#6ae3b2")}
        </div>
      ` : ""}

      <div class="project-card-rows">
        ${repoData ? `
          <div class="project-card-row">
            <span class="row-label">CI</span>
            <span class="row-value"><span class="ci-badge ${ci.cls}">${ci.label}</span></span>
          </div>
          <div class="project-card-row">
            <span class="row-label">Issues</span>
            <span class="row-value">${fmt(repoData.repo?.openIssues)} open · ${fmt(repoData.prs?.length)} PRs</span>
          </div>
          ${lastCommit ? `
            <div class="project-card-row">
              <span class="row-label">Last Push</span>
              <span class="row-value">${timeAgo(lastCommit.date)} — ${lastCommit.message.slice(0, 40)}${lastCommit.message.length > 40 ? "…" : ""}</span>
            </div>
          ` : ""}
          ${repoData.latestRelease ? `
            <div class="project-card-row">
              <span class="row-label">Release</span>
              <span class="row-value" style="color:var(--blue);">${repoData.latestRelease.tag} · ${timeAgo(repoData.latestRelease.publishedAt)}</span>
            </div>
          ` : ""}
        ` : `
          <div class="project-card-row">
            <span style="font-size:11px; color:var(--muted);">No GitHub data — add token in Settings</span>
          </div>
        `}
        ${sessions ? `
          <div class="project-card-row">
            <span class="row-label">Sessions</span>
            <span class="row-value" style="color:var(--cyan);">${fmt(sessions.week)} this week · ${fmt(sessions.total)} total</span>
          </div>
        ` : ""}
      </div>

      <div class="project-card-footer">
        ${project.deployedUrl
          ? `<a href="${project.deployedUrl}" target="_blank" rel="noopener" style="font-size:11px; color:var(--green);">↗ Live</a>`
          : `<span style="font-size:11px; color:var(--muted);">${project.description.slice(0, 36)}…</span>`
        }
        <button class="open-hub-btn" data-view="project:${project.id}">Open Hub →</button>
      </div>
    </div>
  `;
}

// ── Project Section (tabbed) ──────────────────────────────────────────────────
function renderProjectSection(ghData, sbData, socialData, settings, activeTab) {
  const games = PROJECTS.filter((p) => p.type === "game");
  const tools = PROJECTS.filter((p) => p.type === "tool");
  const infra = PROJECTS.filter((p) => p.type === "infrastructure");

  const tabs = [
    { id: "games", label: `Games (${games.length})`, projects: games },
    { id: "tools", label: `Tools (${tools.length})`, projects: tools },
    { id: "infra", label: `Infrastructure (${infra.length})`, projects: infra },
  ];

  const current = tabs.find((t) => t.id === activeTab) || tabs[0];

  // Sort projects by score descending
  const sorted = [...current.projects].sort((a, b) => {
    const sa = scoreProject(a, ghData[a.githubRepo] || null, sbData, socialData).total;
    const sb2 = scoreProject(b, ghData[b.githubRepo] || null, sbData, socialData).total;
    return sb2 - sa;
  });

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header" style="padding-bottom:0; border-bottom:none;">
        <span class="panel-title">PROJECTS</span>
        <div style="display:flex; gap:2px;">
          ${tabs.map((t) => `
            <button class="admin-tab ${t.id === current.id ? "active" : ""}"
              data-project-tab="${t.id}"
              style="font-size:12px; padding:7px 12px;">
              ${t.label}
            </button>
          `).join("")}
        </div>
      </div>
      <div style="padding:18px;">
        <div class="project-grid">
          ${sorted.map((p) => renderProjectCard(p, ghData, sbData, socialData, settings)).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Score Leaderboard ─────────────────────────────────────────────────────────
function renderLeaderboard(ghData, sbData, socialData) {
  const scored = PROJECTS.map((p) => ({
    project: p,
    scoring: scoreProject(p, ghData[p.githubRepo] || null, sbData, socialData),
  })).sort((a, b) => b.scoring.total - a.scoring.total);

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">PROJECT LEADERBOARD</span>
        <span style="font-size:11px; color:var(--muted);">Ranked by health score</span>
      </div>
      <div class="panel-body" style="padding:0;">
        ${scored.map((item, i) => `
          <div data-view="project:${item.project.id}" style="
            display:flex; align-items:center; gap:14px;
            padding:11px 20px; border-bottom:1px solid var(--border);
            cursor:pointer; transition:background 0.12s;
          " onmouseover="this.style.background='rgba(122,231,199,0.04)'" onmouseout="this.style.background=''">
            <div style="font-size:13px; font-weight:700; color:var(--muted); min-width:20px; text-align:center;">${i + 1}</div>
            <div style="width:8px; height:8px; border-radius:50%; background:${item.project.color}; flex-shrink:0;"></div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:13px; font-weight:600; color:var(--text);">${item.project.name}</div>
              <div style="font-size:11px; color:var(--muted);">
                ${item.scoring.pillars.development.signals.slice(0, 1).join("") || "—"}
              </div>
            </div>
            <div style="display:flex; gap:20px; align-items:center;">
              <div style="width:80px; height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden;">
                <div style="width:${item.scoring.total}%; height:100%; background:${item.scoring.gradeColor}; border-radius:2px;"></div>
              </div>
              <div style="min-width:32px; text-align:right;">
                <span style="font-size:14px; font-weight:700; color:${item.scoring.gradeColor};">${item.scoring.total}</span>
              </div>
              <div style="min-width:28px; text-align:center;">
                <span style="font-size:12px; font-weight:800; color:${item.scoring.gradeColor};">${item.scoring.grade}</span>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Activity Feed ─────────────────────────────────────────────────────────────
function renderActivityFeed(ghActivity, sbPulse) {
  const items = [];
  for (const e of (ghActivity || []).slice(0, 20)) {
    items.push({
      icon: "GH",
      iconColor: "rgba(122,231,199,0.15)",
      message: `[${e.repo?.split("/")[1] || e.repo}] ${e.summary}`,
      meta: `${e.actor} · ${timeAgo(e.createdAt)}`,
      ts: new Date(e.createdAt).getTime(),
    });
  }
  for (const p of (sbPulse || []).slice(0, 10)) {
    items.push({
      icon: "VS",
      iconColor: "rgba(105,179,255,0.15)",
      message: p.message,
      meta: `Studio Pulse · ${timeAgo(p.created_at)}`,
      ts: new Date(p.created_at).getTime(),
    });
  }
  items.sort((a, b) => b.ts - a.ts);
  const shown = items.slice(0, 25);

  if (shown.length === 0) {
    return `<div class="empty-state">No activity yet — add a GitHub token to see live repo events.</div>`;
  }

  return `
    <div class="activity-feed">
      ${shown.map((item) => `
        <div class="activity-item">
          <div class="activity-icon" style="background:${item.iconColor}">${item.icon}</div>
          <div class="activity-body">
            <div class="activity-message">${item.message}</div>
            <div class="activity-meta">${item.meta}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// ── Alerts ────────────────────────────────────────────────────────────────────
function renderAlerts(ghData, sbData) {
  const alerts = [];
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (!d) continue;
    if (d.ciRuns?.[0]?.conclusion === "failure") {
      alerts.push({ type: "error", msg: `${p.name}: CI build failing on "${d.ciRuns[0].name}"` });
    }
    if ((d.repo?.openIssues || 0) > 20) {
      alerts.push({ type: "warning", msg: `${p.name}: ${d.repo.openIssues} open issues` });
    }
  }
  if ((sbData?.betaKeys)) {
    for (const [slug, inv] of Object.entries(sbData.betaKeys)) {
      if (inv.available === 0 && inv.total > 0) {
        alerts.push({ type: "warning", msg: `Beta keys exhausted for ${slug}` });
      }
    }
  }
  if (alerts.length === 0) return `<div class="empty-state">No alerts — all systems nominal.</div>`;
  return `
    <div class="alerts-list">
      ${alerts.map((a) => `<div class="alert-item ${a.type}">${a.msg}</div>`).join("")}
    </div>
  `;
}

// ── Social Summary (bottom) ───────────────────────────────────────────────────
function renderSocialSummary(socialData) {
  const rows = [];

  if (socialData?.youtube) {
    const d = socialData.youtube;
    rows.push({ platform: "YouTube", handle: "@VaultSparkStudios", stat: `${fmt(d.subscribers)} subscribers`, color: "#ff4444" });
  }
  if (socialData?.reddit) {
    const d = socialData.reddit;
    rows.push({ platform: "Reddit", handle: "r/VaultSparkStudios", stat: `${fmt(d.subscribers)} members · ${fmt(d.activeUsers)} online`, color: "#ff6314" });
  }
  if (socialData?.bluesky) {
    const d = socialData.bluesky;
    rows.push({ platform: "Bluesky", handle: "@vaultsparkstudios.bsky.social", stat: `${fmt(d.followers)} followers · ${fmt(d.posts)} posts`, color: "#0085ff" });
  }

  const stubs = SOCIAL_ACCOUNTS.filter((a) =>
    !["youtube", "reddit-community", "bluesky", "github"].includes(a.id)
  ).filter((a) => !rows.find((r) => r.handle === a.handle));

  return `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">SOCIAL PRESENCE</span>
        <button class="open-hub-btn" data-view="social" style="font-size:11px;">View All →</button>
      </div>
      <div class="panel-body">
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:10px;">
          ${rows.map((r) => `
            <div style="background:var(--panel-2); border:1px solid var(--border); border-radius:10px; padding:12px 14px;">
              <div style="font-size:12px; font-weight:700; color:${r.color}; margin-bottom:3px;">${r.platform}</div>
              <div style="font-size:11px; color:var(--muted); margin-bottom:6px;">${r.handle}</div>
              <div style="font-size:13px; font-weight:600; color:var(--text);">${r.stat}</div>
            </div>
          `).join("")}
          ${stubs.slice(0, 6).map((a) => `
            <a href="${a.url}" target="_blank" rel="noopener" style="
              background:var(--panel-2); border:1px solid var(--border); border-radius:10px;
              padding:12px 14px; display:block; transition:border-color 0.15s;
            ">
              <div style="font-size:12px; font-weight:700; color:${a.color}; margin-bottom:3px;">${a.platform}</div>
              <div style="font-size:11px; color:var(--muted);">${a.handle}</div>
              <div style="font-size:11px; color:var(--blue); margin-top:4px;">Open ↗</div>
            </a>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Main export ───────────────────────────────────────────────────────────────
export function renderStudioHubView(state) {
  const { ghData = {}, ghActivity = [], sbData = null, socialData = null, settings = {}, projectTab = "games" } = state;

  const studioScore = scoreStudio(PROJECTS, ghData, sbData, socialData);

  return `
    <div class="main-panel">
      <div class="view-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div>
          <div class="view-title">VaultSpark Studio Hub</div>
          <div class="view-subtitle">Internal command center — ${PROJECTS.length} projects · ${SOCIAL_ACCOUNTS.length} social accounts</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="
            background:var(--panel); border:1px solid var(--border); border-radius:10px;
            padding:10px 16px; text-align:center;
          ">
            <div style="font-size:28px; font-weight:800; color:${studioScore.gradeColor}; line-height:1;">${studioScore.average || "—"}</div>
            <div style="font-size:11px; color:var(--muted);">Studio Score</div>
          </div>
          <div style="
            background:var(--panel); border:1px solid var(--border); border-radius:10px;
            padding:10px 16px; text-align:center;
          ">
            <div style="font-size:28px; font-weight:800; color:${studioScore.gradeColor}; line-height:1;">${studioScore.grade}</div>
            <div style="font-size:11px; color:var(--muted);">Grade</div>
          </div>
        </div>
      </div>

      ${renderVitals(ghData, sbData, socialData, studioScore)}

      <div class="two-col" style="margin-bottom:24px; align-items:start;">
        <div class="panel">
          <div class="panel-header"><span class="panel-title">CROSS-PROJECT ALERTS</span></div>
          <div class="panel-body">${renderAlerts(ghData, sbData)}</div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">STUDIO ACTIVITY</span>
            <span style="font-size:11px; color:var(--muted);">GitHub + Vault Pulse</span>
          </div>
          <div class="panel-body" style="max-height:260px; overflow-y:auto;">
            ${renderActivityFeed(ghActivity, sbData?.pulse)}
          </div>
        </div>
      </div>

      ${renderLeaderboard(ghData, sbData, socialData)}

      ${renderProjectSection(ghData, sbData, socialData, settings, projectTab)}

      ${renderSocialSummary(socialData)}
    </div>
  `;
}
