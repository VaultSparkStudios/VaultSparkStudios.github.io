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
                      <div class="commit-message" style="display:flex; align-items:center; gap:6px;">
                        <span class="ci-badge ${cls}" style="font-size:10px;">${r.conclusion || r.status}</span>
                        ${r.name}
                      </div>
                      <div class="commit-meta">${timeAgo(r.triggeredAt)}</div>
                    </div>
                  `;
                }).join("")
            }
          </div>
        </div>

        <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">Recent Commits</div>
        <div class="commit-list">
          ${(commits || []).length === 0
            ? `<div class="empty-state" style="padding:8px 0;">No commits found.</div>`
            : commits.map((c) => `
                <div class="commit-item">
                  <div class="commit-message">${c.message}</div>
                  <div class="commit-meta">
                    <span class="commit-sha">${c.sha}</span>
                    · ${c.author}
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

export function renderProjectHubView(project, state) {
  const { ghData = {}, sbData = null } = state;
  const repoData = project.githubRepo ? (ghData[project.githubRepo] || null) : null;

  return `
    <div class="main-panel">
      <div class="view-header" style="display:flex; align-items:flex-start; justify-content:space-between;">
        <div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="view-title">${project.name}</div>
            <span class="project-status-pill ${project.status}" style="margin-bottom:0;">${project.statusLabel}</span>
          </div>
          <div class="view-subtitle">${project.description}</div>
        </div>
        <span class="project-card-type ${project.type}" style="flex-shrink:0;">${project.type}</span>
      </div>

      <div class="hub-sections">
        ${renderLinkSection(project)}
        ${renderGitHubSection(project, repoData)}
        ${renderVaultSection(project, sbData)}
      </div>
    </div>
  `;
}
