// Project Health Scoring System
// Each project scores 0–130 across five pillars.
// Adding new scoring signals: add to the relevant pillar function below.

// ── Score weights (read from localStorage settings) ───────────────────────────
// Default weights match pillar maxes so un-weighted total = raw sum.
// User can adjust via Settings → Score Weights.
let _wCache = null;
let _wCacheRaw = "";

let _scoreCache = new Map();
export function clearScoringCache() { _scoreCache.clear(); }

function getWeights() {
  try {
    const raw = localStorage.getItem("vshub_settings") || "{}";
    if (raw === _wCacheRaw && _wCache) return _wCache;
    _wCacheRaw = raw;
    const s = JSON.parse(raw);
    const w = s.weights;
    if (w && typeof w === "object") {
      const clamped = {
        dev:       w.dev       != null ? Math.max(0, Number(w.dev))       : 30,
        engage:    w.engage    != null ? Math.max(0, Number(w.engage))    : 25,
        momentum:  w.momentum  != null ? Math.max(0, Number(w.momentum))  : 25,
        risk:      w.risk      != null ? Math.max(0, Number(w.risk))      : 20,
        community: w.community != null ? Math.max(0, Number(w.community)) : 25,
      };
      const total = clamped.dev + clamped.engage + clamped.momentum + clamped.risk + clamped.community;
      _wCache = total >= 1 ? clamped : { dev: 30, engage: 25, momentum: 25, risk: 20, community: 25 };
    } else {
      _wCache = { dev: 30, engage: 25, momentum: 25, risk: 20, community: 25 };
    }
    return _wCache;
  } catch {}
  return { dev: 30, engage: 25, momentum: 25, risk: 20, community: 25 };
}

export function invalidateWeightsCache() { _wCache = null; _wCacheRaw = ""; _scoreCache.clear(); }

// ── Pillar 1: Development Health (0–30) ─────────────────────────────────────
function scoreDevelopment(repoData) {
  if (!repoData) return { score: 0, signals: ["No GitHub data"] };
  let score = 0;
  const signals = [];
  const runs = repoData.ciRuns || [];
  const commits = repoData.commits || [];

  // CI status (13 pts, was 15)
  if (runs.length > 0) {
    const latest = runs[0];
    if (latest.conclusion === "success") { score += 13; signals.push("CI passing"); }
    else if (latest.status === "in_progress") { score += 7; signals.push("CI running"); }
    else if (latest.conclusion === "failure") { signals.push("CI failing"); }
    else { score += 4; signals.push("CI unknown"); }
  } else {
    score += 4; signals.push("No CI configured");
  }

  // Lint/security CI workflow detection (+2, NEW)
  const lintSecRun = runs.find((r) => /lint|eslint|security|codeql|snyk|audit/i.test(r.name || ""));
  if (lintSecRun) {
    if (lintSecRun.conclusion === "success") { score += 2; signals.push("Lint/security passing"); }
    else if (lintSecRun.conclusion === "failure") { signals.push("Lint/security failing"); }
  }

  // Code coverage signal — detects test/coverage CI workflows
  const testRun = runs.find((r) => /test|coverage|jest|vitest|mocha|pytest|spec/i.test(r.name || ""));
  if (testRun) {
    if (testRun.conclusion === "success") { score += 3; signals.push("Tests passing"); }
    else if (testRun.conclusion === "failure") { signals.push("Tests failing"); }
    else if (testRun.status === "in_progress") { score += 1; signals.push("Tests running"); }
  }

  // Commit recency (13 pts, was 15)
  if (commits.length > 0) {
    const latest = commits[0];
    const ageMs = Date.now() - new Date(latest.date).getTime();
    const ageDays = ageMs / 86400000;
    if (ageDays < 1)       { score += 13; signals.push("Committed today"); }
    else if (ageDays < 7)  { score += 10; signals.push("Committed this week"); }
    else if (ageDays < 30) { score += 6;  signals.push("Committed this month"); }
    else                   { score += 2;  signals.push("No recent commits"); }
  }

  // Production deployment signal (+2, NEW)
  const deployments = repoData.deployments || [];
  if (deployments.length > 0) {
    const now = Date.now();
    const prodDeploy = deployments.find((d) =>
      /prod|production/i.test(d.environment || "") && d.createdAt &&
      (now - new Date(d.createdAt).getTime()) / 86400000 < 30
    );
    const stagingDeploy = deployments.find((d) =>
      /stag|preview|dev/i.test(d.environment || "") && d.createdAt &&
      (now - new Date(d.createdAt).getTime()) / 86400000 < 30
    );
    if (prodDeploy) { score += 2; signals.push("Prod deployment active"); }
    else if (stagingDeploy) { score += 1; signals.push("Staging only"); }
  }

  // Dependency freshness — flag if no dep-related commit in 90 days
  if (commits.length > 5) {
    const depCommit = commits.find((c) => /^(chore|build|deps?|bump|update.*dep|renovate|dependabot)/i.test(c.message || "")
      || /package(-lock)?\.json/i.test(c.message || ""));
    const depAgeDays = depCommit ? (Date.now() - new Date(depCommit.date).getTime()) / 86400000 : null;
    if (depAgeDays === null) {
      score -= 1; signals.push("No dep updates detected");
    } else if (depAgeDays > 90) {
      score -= 2; signals.push(`Deps last updated ${Math.round(depAgeDays)}d ago`);
    }
  }

  return { score: Math.min(score, 30), signals };
}

// ── Pillar 2: Engagement (0–25) ──────────────────────────────────────────────
function scoreEngagement(project, sbData, socialData, repoData) {
  let score = 0;
  const signals = [];

  // ── Game sessions (rebalanced: 10 + 3 + 2 beta = 15 max game path) ──
  if (project.supabaseGameSlug && sbData?.sessions) {
    const sessions = sbData.sessions[project.supabaseGameSlug];
    if (sessions) {
      if (sessions.week >= 100)      { score += 10; signals.push(`${sessions.week} sessions this week`); }
      else if (sessions.week >= 20)  { score += 7;  signals.push(`${sessions.week} sessions this week`); }
      else if (sessions.week >= 5)   { score += 4;  signals.push(`${sessions.week} sessions this week`); }
      else if (sessions.week >= 1)   { score += 2;  signals.push(`${sessions.week} sessions this week`); }
      else                           { signals.push("No sessions this week"); }

      // Historical momentum (3, was 5)
      if (sessions.total >= 500)     { score += 3; signals.push(`${sessions.total} total sessions`); }
      else if (sessions.total >= 100){ score += 2; signals.push(`${sessions.total} total sessions`); }
      else if (sessions.total >= 10) { score += 1; signals.push(`${sessions.total} total sessions`); }
    }

    // Beta key adoption (+2, NEW)
    const betaKeys = sbData?.betaKeys?.[project.supabaseGameSlug];
    if (betaKeys && betaKeys.total > 0) {
      const adoptionPct = Math.round((betaKeys.claimed / betaKeys.total) * 100);
      if (betaKeys.claimed / betaKeys.total >= 0.5) { score += 2; signals.push(`Beta adoption ${adoptionPct}%`); }
      else if (betaKeys.claimed / betaKeys.total >= 0.25) { score += 1; signals.push(`Beta adoption ${adoptionPct}%`); }
    }
  }

  // ── Non-game projects (rebalanced: max ~20 from type-specific path) ──
  if (!project.supabaseGameSlug) {
    if (project.deployedUrl) { score += 3; signals.push("Deployed and live"); }

    const stars = repoData?.repo?.stars || 0;
    if (stars >= 100)     { score += 5; signals.push(`${stars} stars`); }
    else if (stars >= 20) { score += 3; signals.push(`${stars} stars`); }
    else if (stars >= 5)  { score += 2; signals.push(`${stars} stars`); }

    const forks = repoData?.repo?.forks || 0;
    if (forks >= 10) { score += 2; signals.push(`${forks} forks`); }

    if (repoData?.latestRelease) {
      const releaseAgeMs = Date.now() - new Date(repoData.latestRelease.publishedAt).getTime();
      if (releaseAgeMs / 86400000 < 30) { score += 2; signals.push("Recent release"); }
    }

    // Context file freshness
    const commits = repoData?.commits || [];
    const contextRecent = commits.some((c) => {
      const ageDays = (Date.now() - new Date(c.date).getTime()) / 86400000;
      return ageDays < 30 && (c.message || "").toLowerCase().includes("context");
    });
    if (contextRecent) { score += 2; signals.push("Context files updated recently"); }

    // Contributor count
    const recentAuthors = new Set(commits.slice(0, 30).map((c) => c.author).filter(Boolean));
    if (recentAuthors.size >= 3) { score += 3; signals.push(`${recentAuthors.size} contributors`); }
    else if (recentAuthors.size >= 2) { score += 2; signals.push(`${recentAuthors.size} contributors`); }

    // Recent deployment
    const deployments = repoData?.deployments || [];
    if (deployments.length > 0) {
      const latestDeploy = deployments[0];
      const deployAgeDays = latestDeploy?.createdAt
        ? (Date.now() - new Date(latestDeploy.createdAt).getTime()) / 86400000
        : Infinity;
      if (deployAgeDays < 14) { score += 3; signals.push("Deployed in last 14 days"); }
    }
  }

  // ── Shared signals (ALL project types) ──────────────────────────────────

  // YouTube content recency (+3) — expanded from infra-only to all types
  if (socialData?.youtube) {
    const videos = socialData.youtube.latestVideos || [];
    const now = Date.now();
    const recentVideo = videos.find((v) => v.publishedAt && (now - new Date(v.publishedAt).getTime()) / 86400000 < 30);
    const oldVideo = videos.find((v) => v.publishedAt && (now - new Date(v.publishedAt).getTime()) / 86400000 < 90);
    if (recentVideo) { score += 3; signals.push("Recent YouTube content"); }
    else if (oldVideo) { score += 1; signals.push("YouTube content this quarter"); }
  }

  // Reddit community activity (+3)
  if (socialData?.reddit) {
    const activeUsers = socialData.reddit.activeUsers || 0;
    if (activeUsers >= 5) { score += 2; signals.push(`${activeUsers} active Reddit users`); }
    const posts = socialData.reddit.latestPosts || [];
    const trendingPost = posts.find((p) => (p.score || 0) >= 10);
    if (trendingPost) { score += 1; signals.push("Reddit post trending"); }
  }

  // Bluesky traction (+2)
  if (socialData?.bluesky) {
    const followers = socialData.bluesky.followers || 0;
    if (followers >= 50) { score += 1; signals.push(`${followers} Bluesky followers`); }
    const posts = socialData.bluesky.latestPosts || [];
    const engagedPost = posts.find((p) => (p.likes || 0) >= 5);
    if (engagedPost) { score += 1; signals.push("Bluesky engagement"); }
  }

  // Gumroad sales signal (+2)
  if (socialData?.gumroad) {
    const products = socialData.gumroad.products || [];
    const totalSales = products.reduce((sum, p) => sum + (p.sales || 0), 0);
    if (totalSales >= 10) { score += 2; signals.push(`${totalSales} Gumroad sales`); }
    else if (totalSales >= 1) { score += 1; signals.push(`${totalSales} Gumroad sales`); }
  }

  return { score: Math.min(score, 25), signals };
}

// ── Pillar 3: Momentum (0–25) ────────────────────────────────────────────────
function scoreMomentum(repoData, project) {
  let score = 0;
  const signals = [];

  // Active PRs (shows ongoing work) — weighted by age
  const prs = repoData?.prs || [];
  const prCount = prs.length;
  if (prCount > 0) {
    const now = Date.now();
    let freshCount = 0;
    let agingCount = 0;
    for (const pr of prs) {
      const ageMs = pr.createdAt ? now - new Date(pr.createdAt).getTime() : 0;
      const ageDays = ageMs / 86400000;
      if (ageDays <= 7)       { freshCount += 1; }
      else if (ageDays <= 30) { agingCount += 1; }
    }
    const weightedPRs = freshCount + agingCount * 0.5;
    if (weightedPRs >= 3)    { score += 8; signals.push(`${prCount} open PR${prCount > 1 ? "s" : ""}`); }
    else if (weightedPRs >= 1) { score += 5; signals.push(`${prCount} open PR${prCount > 1 ? "s" : ""}`); }
    else if (weightedPRs > 0)  { score += 3; signals.push(`${prCount} open PR${prCount > 1 ? "s" : ""}`); }
  }

  // Latest release (7, was 10)
  if (repoData?.latestRelease) {
    const ageMs = Date.now() - new Date(repoData.latestRelease.publishedAt).getTime();
    const ageDays = ageMs / 86400000;
    if (ageDays < 7)       { score += 7; signals.push(`Released ${repoData.latestRelease.tag} this week`); }
    else if (ageDays < 30) { score += 5; signals.push(`Released ${repoData.latestRelease.tag} this month`); }
    else if (ageDays < 90) { score += 3; signals.push(`Released ${repoData.latestRelease.tag}`); }
    else                   { score += 1; signals.push("Old release"); }
  }

  // Status bonuses (5, was 7)
  if (project.status === "live")               { score += 5; signals.push("Live"); }
  else if (project.status === "client-beta")   { score += 4; signals.push("Client beta"); }
  else if (project.status === "playable-prototype") { score += 3; signals.push("Playable prototype"); }
  else if (project.status === "in-development"){ score += 2; signals.push("In development"); }

  // PR classification (+2, NEW) — bugfix vs feature vs mixed
  if (prCount > 0) {
    const bugPRs = prs.filter((pr) => /fix|bug|patch|hotfix/i.test(pr.title || "")).length;
    const featPRs = prs.filter((pr) => /feat|feature|add|implement/i.test(pr.title || "")).length;
    if (bugPRs > 0 && featPRs > 0) { score += 2; signals.push("Balanced PR mix (bug+feature)"); }
    else if (bugPRs > 0)           { score += 1; signals.push("Bug-focused PRs"); }
    else if (featPRs > 0)          { score += 1; signals.push("Feature-focused PRs"); }
  }

  // Milestone progress (+3, NEW) — uses milestones[].progress
  const milestones = repoData?.milestones || [];
  const activeMilestone = milestones.find((m) => m.state === "open" && m.progress != null);
  if (activeMilestone) {
    if (activeMilestone.progress >= 75) { score += 3; signals.push(`Milestone "${activeMilestone.title}" at ${activeMilestone.progress}%`); }
    else if (activeMilestone.progress >= 50) { score += 2; signals.push(`Milestone "${activeMilestone.title}" at ${activeMilestone.progress}%`); }
    else if (activeMilestone.progress >= 25) { score += 1; signals.push(`Milestone "${activeMilestone.title}" at ${activeMilestone.progress}%`); }
  }

  // ── PR review lag ───────────────────────────────────────────────────────
  const now2 = Date.now();
  const laggedPRs = prs.filter((pr) => !pr.draft && (now2 - new Date(pr.createdAt).getTime()) > 7 * 86400000);
  if (laggedPRs.length >= 2) {
    score = Math.max(0, score - 3); signals.push(`${laggedPRs.length} PRs awaiting review`);
  } else if (laggedPRs.length === 1) {
    score = Math.max(0, score - 1); signals.push("PR awaiting review");
  }

  // ── Weighted momentum decay ────────────────────────────────────────────
  const allCommits = repoData?.commits || [];
  if (allCommits.length > 0) {
    const now = Date.now();
    const last7d  = allCommits.filter((c) => (now - new Date(c.date).getTime()) < 7 * 86400000).length;
    const prev14d = allCommits.filter((c) => {
      const ms = now - new Date(c.date).getTime();
      return ms >= 7 * 86400000 && ms < 21 * 86400000;
    }).length;
    if (last7d === 0 && prev14d >= 5) {
      score = Math.max(0, score - 5); signals.push("Stall after burst");
    } else if (last7d === 0 && prev14d >= 3) {
      score = Math.max(0, score - 3); signals.push("Momentum cooling");
    }
  }

  return { score: Math.min(score, 25), signals };
}

// ── Pillar 4: Risk (0–20 base) + Governance bonus (0–5) = 0–25 ──────────────
function scoreRisk(repoData, compliance, project) {
  let score = 20; // start at max, subtract for risks
  const signals = [];

  const openIssues = repoData?.repo?.openIssues || 0;
  if (openIssues > 30)       { score -= 10; signals.push(`${openIssues} open issues`); }
  else if (openIssues > 15)  { score -= 6;  signals.push(`${openIssues} open issues`); }
  else if (openIssues > 5)   { score -= 3;  signals.push(`${openIssues} open issues`); }
  else if (openIssues > 0)   { score -= 1;  signals.push(`${openIssues} open issues`); }

  // Issue label severity (NEW) — detect critical/urgent/blocker labels
  const issues = repoData?.issues || [];
  const criticalIssue = issues.find((iss) =>
    (iss.labels || []).some((lbl) => /critical|urgent|blocker|p0|security/i.test(typeof lbl === "string" ? lbl : lbl.name || ""))
  );
  if (criticalIssue) { score -= 2; signals.push("Critical issue open"); }

  // Failing CI is a risk signal
  const runs = repoData?.ciRuns || [];
  if (runs.length > 0 && runs[0].conclusion === "failure") {
    score -= 8; signals.push("CI failing");
  }

  // Stale repo (no commits in 30+ days)
  const commits = repoData?.commits || [];
  if (commits.length > 0) {
    const ageDays = (Date.now() - new Date(commits[0].date).getTime()) / 86400000;
    if (ageDays > 60) { score -= 4; signals.push("Inactive 60+ days"); }
    else if (ageDays > 30) { score -= 2; signals.push("Inactive 30+ days"); }
  }

  // Overdue milestones (refined: severity by overdue duration)
  const milestones = repoData?.milestones || [];
  const overdue = milestones.filter((m) => m.dueOn && new Date(m.dueOn).getTime() < Date.now() && m.state === "open");
  if (overdue.length > 0) {
    let msPenalty = 0;
    for (const m of overdue) {
      const overdueDays = (Date.now() - new Date(m.dueOn).getTime()) / 86400000;
      msPenalty += overdueDays > 30 ? 3 : 2;
    }
    score -= Math.min(msPenalty, 6);
    signals.push(`${overdue.length} overdue milestone${overdue.length > 1 ? "s" : ""}`);
  }

  // Stale open PRs (non-draft, older than 30 days) are a risk signal
  const prs = repoData?.prs || [];
  const stalePRs = prs.filter(pr => {
    if (pr.draft) return false;
    const ageDays = (Date.now() - new Date(pr.createdAt).getTime()) / 86400000;
    return ageDays > 30;
  });
  if (stalePRs.length > 0) { score -= 2; signals.push(`${stalePRs.length} stale PR${stalePRs.length > 1 ? "s" : ""}`); }

  // Aging PR warning (NEW tier: 14-30d, 3+ PRs)
  const agingPRs = prs.filter(pr => {
    if (pr.draft) return false;
    const ageDays = (Date.now() - new Date(pr.createdAt).getTime()) / 86400000;
    return ageDays > 14 && ageDays <= 30;
  });
  if (agingPRs.length >= 3) { score -= 1; signals.push(`${agingPRs.length} PRs aging (14-30d)`); }

  // TODO/FIXME debt
  const todoCount = repoData?.todoCount ?? 0;
  if (todoCount > 20) { score -= 2; signals.push(`${todoCount} TODOs/FIXMEs`); }

  // Dependency vulnerability alerts (Dependabot)
  const depAlerts = repoData?.depAlerts;
  if (depAlerts && depAlerts.total > 0) {
    if (depAlerts.critical > 0)      { score -= 3; signals.push(`${depAlerts.critical} critical dep vulnerabilit${depAlerts.critical > 1 ? "ies" : "y"}`); }
    else if (depAlerts.high > 0)     { score -= 2; signals.push(`${depAlerts.high} high-severity dep alert${depAlerts.high > 1 ? "s" : ""}`); }
    else if (depAlerts.medium > 0)   { score -= 1; signals.push(`${depAlerts.medium} medium dep alert${depAlerts.medium > 1 ? "s" : ""}`); }
    if (depAlerts.total > 10)        { score -= 1; signals.push(`${depAlerts.total} total dep alerts`); }
  }

  // No Studio OS penalty applied BEFORE baseScore lock (was previously lost after)
  if (!compliance && project?.studioOsApplied === false) {
    score -= 2; signals.push("No Studio OS");
  }

  const baseScore = Math.max(score, 0);
  if (baseScore >= 18) signals.push("Low risk");
  else if (baseScore >= 13) signals.push("Medium risk");
  else signals.push("High risk");

  // ── Governance bonus (0–5) — Studio OS compliance, SIL, CDR ─────────────────
  let governance = 0;
  if (compliance && compliance.total > 0) {
    const ratio = compliance.score / compliance.total;
    if (ratio >= 1.0)      { governance += 3; signals.push("Studio OS compliant ✓"); }
    else if (ratio >= 0.7) { governance += 1; signals.push(`Studio OS ${compliance.score}/${compliance.total}`); }
    else                   { signals.push(`Studio OS incomplete (${compliance.score}/${compliance.total})`); }

    if (compliance.silFresh) {
      governance += 1;
      const silLabel = compliance.silScore != null ? `SIL ${compliance.silScore}/50` : "SIL active";
      if (compliance.silScore != null && compliance.silScore >= 40) signals.push(`${silLabel} ✓`);
      else signals.push(silLabel);
    }
    if (compliance.cdrActive) { governance += 1; signals.push("CDR active"); }
  }

  return { score: Math.min(baseScore + governance, 25), base: baseScore, governance, signals };
}

// ── Pillar 5: Community (0–25) — studio-wide audience & social health ────────
function scoreCommunity(sbData, socialData) {
  let score = 0;
  const signals = [];

  // Member growth (+5) — uses sbData.members
  const members = sbData?.members;
  if (members) {
    if (members.newThisWeek >= 10)      { score += 5; signals.push(`${members.newThisWeek} new members this week`); }
    else if (members.newThisWeek >= 3)  { score += 3; signals.push(`${members.newThisWeek} new members this week`); }
    else if (members.newThisMonth >= 5) { score += 2; signals.push(`${members.newThisMonth} new members this month`); }
    else if (members.newThisMonth >= 1) { score += 1; signals.push(`${members.newThisMonth} new members this month`); }
    else { signals.push("No new members"); }
  }

  // Point economy health (+4) — uses sbData.economy
  const economy = sbData?.economy;
  if (economy) {
    if (economy.total >= 1000) { score += 4; signals.push(`Active point economy (${economy.total.toLocaleString()} pts)`); }
    else if (economy.total >= 100) { score += 2; signals.push(`Point economy (${economy.total} pts)`); }
    else if (economy.total >= 1) { score += 1; signals.push(`Point economy (${economy.total} pts)`); }
  }

  // Social following aggregate (+5)
  const ytSubs = socialData?.youtube?.subscribers || 0;
  const rdSubs = socialData?.reddit?.subscribers || 0;
  const bsSubs = socialData?.bluesky?.followers || 0;
  const totalFollowers = ytSubs + rdSubs + bsSubs;
  if (totalFollowers >= 500) { score += 5; signals.push(`${totalFollowers.toLocaleString()} total social followers`); }
  else if (totalFollowers >= 100) { score += 3; signals.push(`${totalFollowers} total social followers`); }
  else if (totalFollowers >= 20) { score += 1; signals.push(`${totalFollowers} total social followers`); }

  // Social content velocity (+4) — posts/videos in last 14d
  const now = Date.now();
  const fourteenDays = 14 * 86400000;
  let recentPosts = 0;
  const ytVideos = socialData?.youtube?.latestVideos || [];
  recentPosts += ytVideos.filter((v) => v.publishedAt && (now - new Date(v.publishedAt).getTime()) < fourteenDays).length;
  const rdPosts = socialData?.reddit?.latestPosts || [];
  recentPosts += rdPosts.filter((p) => p.createdAt && (now - new Date(p.createdAt).getTime()) < fourteenDays).length;
  const bsPosts = socialData?.bluesky?.latestPosts || [];
  recentPosts += bsPosts.filter((p) => p.createdAt && (now - new Date(p.createdAt).getTime()) < fourteenDays).length;
  if (recentPosts >= 5)      { score += 4; signals.push(`Active social posting (${recentPosts} in 14d)`); }
  else if (recentPosts >= 2) { score += 2; signals.push(`${recentPosts} social posts in 14d`); }
  else if (recentPosts >= 1) { score += 1; signals.push("1 social post in 14d"); }

  // Social engagement quality (+4)
  let totalEngagement = 0;
  for (const p of rdPosts) { totalEngagement += (p.score || 0) + (p.comments || 0); }
  for (const p of bsPosts) { totalEngagement += (p.likes || 0) + (p.reposts || 0); }
  if (totalEngagement >= 50)      { score += 4; signals.push("High social engagement"); }
  else if (totalEngagement >= 20) { score += 2; signals.push("Moderate social engagement"); }
  else if (totalEngagement >= 5)  { score += 1; signals.push("Some social engagement"); }

  // Revenue signal (+3) — Gumroad sales
  if (socialData?.gumroad) {
    const products = socialData.gumroad.products || [];
    const totalSales = products.reduce((sum, p) => sum + (p.sales || 0), 0);
    if (totalSales >= 50)     { score += 3; signals.push(`Strong product sales (${totalSales})`); }
    else if (totalSales >= 10){ score += 2; signals.push(`${totalSales} Gumroad sales`); }
    else if (totalSales >= 1) { score += 1; signals.push(`${totalSales} Gumroad sales`); }
  }

  return { score: Math.min(score, 25), signals };
}

// ── Grade mapping ─────────────────────────────────────────────────────────────
// Max score is 130 when full governance bonus is achieved (S-tier)
export function getGrade(score) {
  if (score >= 124) return { grade: "S",  color: "#c084fc" }; // governance-unlocked tier
  if (score >= 105) return { grade: "A+", color: "#6ae3b2" };
  if (score >= 93)  return { grade: "A",  color: "#6ae3b2" };
  if (score >= 80)  return { grade: "B+", color: "#69b3ff" };
  if (score >= 68)  return { grade: "B",  color: "#69b3ff" };
  if (score >= 56)  return { grade: "C+", color: "#ffc874" };
  if (score >= 43)  return { grade: "C",  color: "#ffc874" };
  if (score >= 31)  return { grade: "D",  color: "#ff9478" };
  return               { grade: "F",  color: "#f87171" };
}

// ── Main scoring function ─────────────────────────────────────────────────────
// compliance: optional Studio OS compliance object { score, total, silFresh, cdrActive }
// When compliance is passed, Risk pillar gains governance bonus (up to +5),
// allowing total to reach 130+ and unlocking S-tier grade.
export function scoreProject(project, repoData, sbData, socialData, compliance = null) {
  const _cacheKey = `${project.id}_${compliance ? "g" : "n"}`;
  if (_scoreCache.has(_cacheKey)) return _scoreCache.get(_cacheKey);

  const dev        = scoreDevelopment(repoData);
  const engagement = scoreEngagement(project, sbData, socialData, repoData);
  const momentum   = scoreMomentum(repoData, project);
  const risk       = scoreRisk(repoData, compliance, project);
  const community  = scoreCommunity(sbData, socialData);

  const w = getWeights();
  // Risk normalizes against 20 (base max); governance bonus pushes contribution above 20
  const total = Math.min(130, Math.round(
    (dev.score / 30)        * w.dev +
    (engagement.score / 25) * w.engage +
    (momentum.score / 25)   * w.momentum +
    (risk.score / 20)       * w.risk +
    (community.score / 25)  * w.community
  ));
  const { grade, color } = getGrade(total);

  const result = {
    total,
    grade,
    gradeColor: color,
    pillars: {
      development: { score: dev.score, max: 30, signals: dev.signals },
      engagement:  { score: engagement.score, max: 25, signals: engagement.signals },
      momentum:    { score: momentum.score, max: 25, signals: momentum.signals },
      risk:        { score: risk.score, max: risk.score > 20 ? 25 : 20, base: risk.base, governance: risk.governance, signals: risk.signals },
      community:   { score: community.score, max: 25, signals: community.signals },
    },
  };
  _scoreCache.set(_cacheKey, result);
  return result;
}

// ── Studio aggregate score ────────────────────────────────────────────────────
export function scoreStudio(projects, ghData, sbData, socialData) {
  const scores = projects.map((p) =>
    scoreProject(p, ghData[p.githubRepo] || null, sbData, socialData)
  );
  if (scores.length === 0) return { average: 0, grade: "—", gradeColor: "var(--muted)", scores: [] };
  const avg = Math.round(scores.reduce((s, sc) => s + sc.total, 0) / scores.length);
  const { grade, color } = getGrade(avg);
  return { average: avg, grade, gradeColor: color, scores };
}
