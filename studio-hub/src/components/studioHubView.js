import { PROJECTS, SOCIAL_ACCOUNTS } from "../data/studioRegistry.js";

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function ciStatus(runs) {
  if (!runs || runs.length === 0) return { cls: "unknown", label: "No CI" };
  const latest = runs[0];
  if (latest.status === "in_progress") return { cls: "running", label: "Running" };
  if (latest.conclusion === "success") return { cls: "passing", label: "Passing" };
  if (latest.conclusion === "failure") return { cls: "failing", label: "Failed" };
  return { cls: "unknown", label: latest.conclusion || latest.status || "Unknown" };
}

function renderVitals(ghData, sbData) {
  const totalIssues = Object.values(ghData).reduce((sum, d) => {
    return sum + (d?.repo?.openIssues || 0);
  }, 0);

  const failingBuilds = Object.values(ghData).filter((d) => {
    const runs = d?.ciRuns || [];
    return runs.length > 0 && runs[0].conclusion === "failure";
  }).length;

  const memberCount = sbData?.members?.total ?? "—";
  const sessions7d = sbData?.sessions
    ? Object.values(sbData.sessions).reduce((s, v) => s + (v.week || 0), 0)
    : "—";

  const vitals = [
    { label: "Vault Members", value: fmt(memberCount), cls: "cyan" },
    { label: "Game Sessions (7d)", value: fmt(sessions7d), cls: "blue" },
    { label: "Open Issues", value: fmt(totalIssues), cls: totalIssues > 20 ? "red" : "text" },
    { label: "Failing Builds", value: fmt(failingBuilds), cls: failingBuilds > 0 ? "red" : "green" },
    { label: "Total Projects", value: String(PROJECTS.length), cls: "gold" },
    { label: "Social Accounts", value: String(SOCIAL_ACCOUNTS.length), cls: "blue" },
  ];

  return `
    <div class="vitals-strip">
      ${vitals.map((v) => `
        <div class="vital-card">
          <div class="vital-label">${v.label}</div>
          <div class="vital-value ${v.cls}">${v.value}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderProjectCard(project, ghData, sbData) {
  const data = ghData[project.githubRepo] || null;
  const ci = ciStatus(data?.ciRuns);
  const lastCommit = data?.commits?.[0];
  const sessions = sbData?.sessions?.[project.supabaseGameSlug];

  const ghRow = data
    ? `
      <div class="project-card-row">
        <span class="row-label">GitHub</span>
        <span class="row-value">
          ${data.repo?.openIssues ?? 0} issues · ${data.prs?.length ?? 0} PRs
          · <span class="ci-badge ${ci.cls}">${ci.label}</span>
        </span>
      </div>
      ${lastCommit ? `
        <div class="project-card-row">
          <span class="row-label">Last Push</span>
          <span class="row-value">${timeAgo(lastCommit.date)}</span>
        </div>
      ` : ""}
    `
    : `
      <div class="project-card-row">
        <span class="row-label">GitHub</span>
        <span class="row-value" style="color:var(--muted)">No data — check token</span>
      </div>
    `;

  const vaultRow = sessions
    ? `
      <div class="project-card-row">
        <span class="row-label">Sessions</span>
        <span class="row-value">${fmt(sessions.week)} this week · ${fmt(sessions.total)} total</span>
      </div>
    `
    : "";

  const deployedRow = project.deployedUrl
    ? `
      <div class="project-card-row">
        <span class="row-label">Live</span>
        <span class="row-value" style="color:var(--green)">↗ ${project.deployedUrl.replace("https://", "")}</span>
      </div>
    `
    : "";

  return `
    <div class="project-card" style="--project-color:${project.color}" data-view="project:${project.id}">
      <div class="project-card-header">
        <div class="project-card-name">${project.name}</div>
        <div class="project-card-type ${project.type}">${project.type}</div>
      </div>
      <div class="project-status-pill ${project.status}">${project.statusLabel}</div>
      <div class="project-card-rows">
        ${ghRow}
        ${vaultRow}
        ${deployedRow}
      </div>
      <div class="project-card-footer">
        <span style="font-size:11px; color:var(--muted);">${project.description}</span>
        <button class="open-hub-btn" data-view="project:${project.id}">Open Hub →</button>
      </div>
    </div>
  `;
}

function renderSocialCard(account, socialData) {
  let statHtml = "";

  if (account.id === "youtube" && socialData?.youtube) {
    const d = socialData.youtube;
    statHtml = `
      <div class="social-stat">${fmt(d.subscribers)}</div>
      <div class="social-stat-label">subscribers · ${fmt(d.totalViews)} views</div>
    `;
  } else if ((account.id === "reddit-community" || account.id === "reddit-user") && socialData?.reddit) {
    const d = socialData.reddit;
    statHtml = `
      <div class="social-stat">${fmt(d.subscribers)}</div>
      <div class="social-stat-label">members · ${fmt(d.activeUsers)} online</div>
    `;
  } else if (account.id === "bluesky" && socialData?.bluesky) {
    const d = socialData.bluesky;
    statHtml = `
      <div class="social-stat">${fmt(d.followers)}</div>
      <div class="social-stat-label">followers · ${fmt(d.posts)} posts</div>
    `;
  } else if (account.id === "gumroad" && socialData?.gumroad) {
    const d = socialData.gumroad;
    statHtml = `
      <div class="social-stat">${d.products?.length ?? 0}</div>
      <div class="social-stat-label">products listed</div>
    `;
  } else if (account.apiSupport === "limited") {
    statHtml = `<div class="stub-card-msg" style="font-size:11px; color:var(--gold);">API access pending</div>`;
  } else if (account.apiSupport === "stub") {
    statHtml = `<div class="stub-card-msg" style="font-size:11px; color:var(--muted);">No public API</div>`;
  }

  return `
    <div class="social-card">
      <div class="social-card-header">
        <span class="social-platform" style="color:${account.color}">${account.platform}</span>
        <span class="social-api-badge ${account.apiSupport}">${account.apiSupport}</span>
      </div>
      <div class="social-handle">${account.handle}</div>
      ${statHtml}
      <a href="${account.url}" target="_blank" rel="noopener" class="social-link-btn">Open ↗</a>
    </div>
  `;
}

function renderActivityFeed(ghActivity, sbPulse) {
  const items = [];

  for (const event of (ghActivity || []).slice(0, 15)) {
    items.push({
      icon: "GH",
      message: `[${event.repo?.split("/")[1] || event.repo}] ${event.summary}`,
      meta: `${event.actor} · ${timeAgo(event.createdAt)}`,
      ts: new Date(event.createdAt).getTime(),
    });
  }

  for (const pulse of (sbPulse || []).slice(0, 10)) {
    items.push({
      icon: "VS",
      message: pulse.message,
      meta: `Studio Pulse · ${timeAgo(pulse.created_at)}`,
      ts: new Date(pulse.created_at).getTime(),
    });
  }

  items.sort((a, b) => b.ts - a.ts);
  const shown = items.slice(0, 20);

  if (shown.length === 0) {
    return `<div class="empty-state">No recent activity — connect GitHub token to see live data.</div>`;
  }

  return `
    <div class="activity-feed">
      ${shown.map((item) => `
        <div class="activity-item">
          <div class="activity-icon">${item.icon}</div>
          <div class="activity-body">
            <div class="activity-message">${item.message}</div>
            <div class="activity-meta">${item.meta}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderAlerts(ghData) {
  const alerts = [];

  for (const project of PROJECTS) {
    const data = ghData[project.githubRepo];
    if (!data) continue;
    const runs = data.ciRuns || [];
    if (runs.length > 0 && runs[0].conclusion === "failure") {
      alerts.push({
        type: "error",
        message: `${project.name}: CI build failing on ${runs[0].name}`,
      });
    }
    if ((data.repo?.openIssues || 0) > 15) {
      alerts.push({
        type: "warning",
        message: `${project.name}: ${data.repo.openIssues} open issues`,
      });
    }
  }

  if (alerts.length === 0) {
    return `<div class="empty-state">No alerts — all systems nominal.</div>`;
  }

  return `
    <div class="alerts-list">
      ${alerts.map((a) => `
        <div class="alert-item ${a.type}">${a.message}</div>
      `).join("")}
    </div>
  `;
}

export function renderStudioHubView(state) {
  const { ghData = {}, ghActivity = [], sbData = null, socialData = null } = state;

  const games = PROJECTS.filter((p) => p.type === "game");
  const tools = PROJECTS.filter((p) => p.type === "tool");
  const infra = PROJECTS.filter((p) => p.type === "infrastructure");

  return `
    <div class="main-panel">
      <div class="view-header">
        <div class="view-title">VaultSpark Studio Hub</div>
        <div class="view-subtitle">All projects, platforms, and community data in one place.</div>
      </div>

      ${renderVitals(ghData, sbData)}

      <div class="two-col" style="margin-bottom:28px; align-items:start;">
        <div>
          <div class="panel" style="margin-bottom:20px;">
            <div class="panel-header">
              <span class="panel-title">CROSS-PROJECT ALERTS</span>
            </div>
            <div class="panel-body">
              ${renderAlerts(ghData)}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">SOCIAL ACCOUNTS</span>
            </div>
            <div class="panel-body">
              <div class="social-grid">
                ${SOCIAL_ACCOUNTS.map((a) => renderSocialCard(a, socialData)).join("")}
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">STUDIO ACTIVITY</span>
          </div>
          <div class="panel-body">
            ${renderActivityFeed(ghActivity, sbData?.pulse)}
          </div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:20px;">
        <div class="panel-header"><span class="panel-title">GAMES</span></div>
        <div class="panel-body" style="padding:18px;">
          <div class="project-grid">
            ${games.map((p) => renderProjectCard(p, ghData, sbData)).join("")}
          </div>
        </div>
      </div>

      <div class="two-col">
        <div class="panel">
          <div class="panel-header"><span class="panel-title">TOOLS</span></div>
          <div class="panel-body" style="padding:18px;">
            <div class="project-grid" style="grid-template-columns:1fr;">
              ${tools.map((p) => renderProjectCard(p, ghData, sbData)).join("")}
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><span class="panel-title">INFRASTRUCTURE</span></div>
          <div class="panel-body" style="padding:18px;">
            <div class="project-grid" style="grid-template-columns:1fr;">
              ${infra.map((p) => renderProjectCard(p, ghData, sbData)).join("")}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
