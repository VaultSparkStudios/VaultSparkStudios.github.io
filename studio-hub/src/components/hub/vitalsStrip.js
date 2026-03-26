import { PROJECTS } from "../../data/studioRegistry.js";
import { fmt } from "../../utils/helpers.js";

export function renderVitals(ghData, sbData, socialData, studioScore, beaconData, studioOps = {}) {
  const totalIssues   = Object.values(ghData).reduce((s, d) => s + (d?.repo?.openIssues || 0), 0);
  const failingBuilds = Object.values(ghData).filter((d) => d?.ciRuns?.[0]?.conclusion === "failure").length;
  const reposWithCI   = Object.values(ghData).filter((d) => d?.ciRuns?.length > 0).length;
  const passingBuilds = Object.values(ghData).filter((d) => d?.ciRuns?.[0]?.conclusion === "success").length;
  const ciPassRate    = reposWithCI > 0 ? Math.round((passingBuilds / reposWithCI) * 100) : null;
  const totalOpenPRs  = Object.values(ghData).reduce((s, d) => s + (d?.prs?.length || 0), 0);
  const activeProjects  = PROJECTS.filter((p) => p.status !== "archived").length;
  const memberCount     = sbData?.members?.total ?? null;
  const totalSessions   = sbData?.sessions ? Object.values(sbData.sessions).reduce((s, v) => s + (v.week || 0), 0) : null;
  const ytSubs          = socialData?.youtube?.subscribers ?? null;
  const activeSessions  = beaconData?.active?.length ?? 0;

  const vitals = [
    {
      label: "Studio Score",
      value: studioScore.average ? `${studioScore.average}` : "—",
      sub: studioScore.grade !== "—" ? `Grade ${studioScore.grade}` : "Calculating…",
      cls: "", style: `color:${studioScore.gradeColor || "var(--muted)"}`,
    },
    { label: "Active Projects", value: String(activeProjects), sub: `${PROJECTS.length} total`, cls: "gold" },
    { label: "Vault Members",   value: fmt(memberCount),  sub: memberCount ? `+${sbData?.members?.newThisWeek || 0} this week` : "Configure Supabase", cls: "cyan" },
    { label: "Game Sessions 7d", value: fmt(totalSessions), sub: "Across all games", cls: "blue" },
    { label: "YouTube Subs",    value: fmt(ytSubs), sub: ytSubs ? `${fmt(socialData?.youtube?.videoCount)} videos` : "Configure API key", cls: "text" },
    {
      label: "Open Issues",
      value: fmt(totalIssues),
      sub: failingBuilds > 0 ? `${failingBuilds} failing build${failingBuilds > 1 ? "s" : ""}` : "All builds healthy",
      cls: failingBuilds > 0 ? "red" : totalIssues > 20 ? "gold" : "green",
    },
    {
      label: "CI Pass Rate",
      value: ciPassRate !== null ? `${ciPassRate}%` : "—",
      sub: ciPassRate !== null ? `${passingBuilds}/${reposWithCI} repos` : "No CI data",
      cls: ciPassRate === null ? "text" : ciPassRate >= 80 ? "green" : ciPassRate >= 50 ? "gold" : "red",
    },
    {
      label: "Open PRs",
      value: fmt(totalOpenPRs),
      sub: totalOpenPRs === 0 ? "No open PRs" : `Across ${Object.values(ghData).filter((d) => d?.prs?.length > 0).length} repos`,
      cls: totalOpenPRs > 10 ? "gold" : totalOpenPRs > 0 ? "blue" : "green",
    },
  ];

  if (activeSessions > 0) {
    vitals.push({ label: "Active Sessions", value: String(activeSessions), sub: "Claude Code live", cls: "cyan" });
  }

  // Agent Ops scorecard — only show when Studio Ops data is available
  const { portfolioFreshness = {}, agentRequests = [], studioBrain = null } = studioOps;
  const freshnessList = Object.values(portfolioFreshness).filter(Boolean);
  if (freshnessList.length > 0) {
    const freshCount   = freshnessList.filter(f => f.daysOld <= 14).length;
    const totalCount   = freshnessList.length;
    const brainDays    = portfolioFreshness["portfolio/STUDIO_BRAIN.md"]?.daysOld ?? null;
    const backlog      = agentRequests.length;
    const brainStatus  = brainDays === null ? "–" : brainDays === 0 ? "today" : `${brainDays}d ago`;
    const opsColor     = freshCount === totalCount && backlog === 0 ? "var(--green)"
                       : freshCount >= totalCount * 0.7 ? "var(--gold)"
                       : "var(--red)";
    vitals.push({
      label:  "Agent Ops",
      value:  `${freshCount}/${totalCount}`,
      sub:    `files fresh · brain ${brainStatus}${backlog > 0 ? ` · ${backlog} pending` : ""}`,
      cls:    "",
      style:  `color:${opsColor}`,
    });
  }

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
