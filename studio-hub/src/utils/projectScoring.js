// Project Health Scoring System
// Each project scores 0–100 across four pillars.
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
        dev:      w.dev      != null ? Math.max(0, Number(w.dev))      : 30,
        engage:   w.engage   != null ? Math.max(0, Number(w.engage))   : 25,
        momentum: w.momentum != null ? Math.max(0, Number(w.momentum)) : 25,
        risk:     w.risk     != null ? Math.max(0, Number(w.risk))     : 20,
      };
      const total = clamped.dev + clamped.engage + clamped.momentum + clamped.risk;
      _wCache = total >= 1 ? clamped : { dev: 30, engage: 25, momentum: 25, risk: 20 };
    } else {
      _wCache = { dev: 30, engage: 25, momentum: 25, risk: 20 };
    }
    return _wCache;
  } catch {}
  return { dev: 30, engage: 25, momentum: 25, risk: 20 };
}

export function invalidateWeightsCache() { _wCache = null; _wCacheRaw = ""; _scoreCache.clear(); }

// ── Pillar 1: Development Health (0–30) ─────────────────────────────────────
function scoreDevelopment(repoData) {
  if (!repoData) return { score: 0, signals: ["No GitHub data"] };
  let score = 0;
  const signals = [];
  const runs = repoData.ciRuns || [];
  const commits = repoData.commits || [];

  // CI status
  if (runs.length > 0) {
    const latest = runs[0];
    if (latest.conclusion === "success") { score += 15; signals.push("CI passing"); }
    else if (latest.status === "in_progress") { score += 8; signals.push("CI running"); }
    else if (latest.conclusion === "failure") { signals.push("CI failing"); }
    else { score += 5; signals.push("CI unknown"); }
  } else {
    score += 5; signals.push("No CI configured");
  }

  // Code coverage signal (#4) — detects test/coverage CI workflows
  const testRun = runs.find((r) => /test|coverage|jest|vitest|mocha|pytest|spec/i.test(r.name || ""));
  if (testRun) {
    if (testRun.conclusion === "success") { score += 3; signals.push("Tests passing"); }
    else if (testRun.conclusion === "failure") { signals.push("Tests failing"); }
    else if (testRun.status === "in_progress") { score += 1; signals.push("Tests running"); }
  }

  // Commit recency — computed early so depFreshness can reuse it
  if (commits.length > 0) {
    const latest = commits[0];
    const ageMs = Date.now() - new Date(latest.date).getTime();
    const ageDays = ageMs / 86400000;
    if (ageDays < 1)       { score += 15; signals.push("Committed today"); }
    else if (ageDays < 7)  { score += 12; signals.push("Committed this week"); }
    else if (ageDays < 30) { score += 7;  signals.push("Committed this month"); }
    else                   { score += 2;  signals.push("No recent commits"); }
  }

  // Dependency freshness (#3) — flag if no dep-related commit in 90 days
  // Heuristic: commit message starts with chore/build/deps/bump/renovate keywords.
  // Only penalizes active projects (has commits, not trivially small).
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

  // Game sessions
  if (project.supabaseGameSlug && sbData?.sessions) {
    const sessions = sbData.sessions[project.supabaseGameSlug];
    if (sessions) {
      if (sessions.week >= 100)      { score += 15; signals.push(`${sessions.week} sessions this week`); }
      else if (sessions.week >= 20)  { score += 10; signals.push(`${sessions.week} sessions this week`); }
      else if (sessions.week >= 5)   { score += 6;  signals.push(`${sessions.week} sessions this week`); }
      else if (sessions.week >= 1)   { score += 3;  signals.push(`${sessions.week} sessions this week`); }
      else                           { signals.push("No sessions this week"); }

      // Historical momentum
      if (sessions.total >= 500)     { score += 5; signals.push(`${sessions.total} total sessions`); }
      else if (sessions.total >= 100){ score += 3; signals.push(`${sessions.total} total sessions`); }
      else if (sessions.total >= 10) { score += 1; signals.push(`${sessions.total} total sessions`); }
    }
  }

  // YouTube views (for any project with YouTube data)
  if (socialData?.youtube && (project.type === "infrastructure" || project.id === "website")) {
    const subs = socialData.youtube.subscribers || 0;
    if (subs >= 10000) { score += 5; signals.push(`${subs.toLocaleString()} YouTube subscribers`); }
    else if (subs >= 1000) { score += 3; signals.push(`${subs.toLocaleString()} YouTube subscribers`); }
    else if (subs >= 100) { score += 1; }
  }

  // Non-game projects: deployed URL baseline + repo signals + non-game-specific signals
  if (!project.supabaseGameSlug) {
    if (project.deployedUrl) { score += 5; signals.push("Deployed and live"); }

    const stars = repoData?.repo?.stars || 0;
    if (stars >= 100)     { score += 8; signals.push(`${stars} stars`); }
    else if (stars >= 20) { score += 5; signals.push(`${stars} stars`); }
    else if (stars >= 5)  { score += 3; signals.push(`${stars} stars`); }

    const forks = repoData?.repo?.forks || 0;
    if (forks >= 10) { score += 4; signals.push(`${forks} forks`); }

    if (repoData?.latestRelease) {
      const releaseAgeMs = Date.now() - new Date(repoData.latestRelease.publishedAt).getTime();
      if (releaseAgeMs / 86400000 < 30) { score += 3; signals.push("Recent release"); }
    }

    // Non-game path: context file freshness (commits to context/ dir in last 30d)
    const commits = repoData?.commits || [];
    const contextRecent = commits.some((c) => {
      const ageDays = (Date.now() - new Date(c.date).getTime()) / 86400000;
      return ageDays < 30 && (c.message || "").toLowerCase().includes("context");
    });
    if (contextRecent) { score += 3; signals.push("Context files updated recently"); }

    // Contributor count signal (uses commits as proxy — unique authors in last 30 commits)
    const recentAuthors = new Set(commits.slice(0, 30).map((c) => c.author).filter(Boolean));
    if (recentAuthors.size >= 3) { score += 5; signals.push(`${recentAuthors.size} contributors`); }
    else if (recentAuthors.size >= 2) { score += 3; signals.push(`${recentAuthors.size} contributors`); }

    // Recent deployment signal (last CI deployment run < 14d)
    const deployments = repoData?.deployments || [];
    if (deployments.length > 0) {
      const latestDeploy = deployments[0];
      const deployAgeDays = latestDeploy?.createdAt
        ? (Date.now() - new Date(latestDeploy.createdAt).getTime()) / 86400000
        : Infinity;
      if (deployAgeDays < 14) { score += 5; signals.push("Deployed in last 14 days"); }
    }
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
      // > 30 days → 0 weight
    }
    const weightedPRs = freshCount + agingCount * 0.5;
    if (weightedPRs >= 3)    { score += 8; signals.push(`${prCount} open PR${prCount > 1 ? "s" : ""}`); }
    else if (weightedPRs >= 1) { score += 5; signals.push(`${prCount} open PR${prCount > 1 ? "s" : ""}`); }
    else if (weightedPRs > 0)  { score += 3; signals.push(`${prCount} open PR${prCount > 1 ? "s" : ""}`); }
  }

  // Latest release
  if (repoData?.latestRelease) {
    const ageMs = Date.now() - new Date(repoData.latestRelease.publishedAt).getTime();
    const ageDays = ageMs / 86400000;
    if (ageDays < 7)       { score += 10; signals.push(`Released ${repoData.latestRelease.tag} this week`); }
    else if (ageDays < 30) { score += 7;  signals.push(`Released ${repoData.latestRelease.tag} this month`); }
    else if (ageDays < 90) { score += 4;  signals.push(`Released ${repoData.latestRelease.tag}`); }
    else                   { score += 1;  signals.push("Old release"); }
  }

  // Status bonuses
  if (project.status === "live")               { score += 7; signals.push("Live"); }
  else if (project.status === "client-beta")   { score += 5; signals.push("Client beta"); }
  else if (project.status === "playable-prototype") { score += 4; signals.push("Playable prototype"); }
  else if (project.status === "in-development"){ score += 2; signals.push("In development"); }

  // ── PR review lag (#2) ───────────────────────────────────────────────────────
  // Non-draft PRs open >7d with no recent commit activity suggest review bottleneck.
  const now2 = Date.now();
  const laggedPRs = prs.filter((pr) => !pr.draft && (now2 - new Date(pr.createdAt).getTime()) > 7 * 86400000);
  if (laggedPRs.length >= 2) {
    score = Math.max(0, score - 3); signals.push(`${laggedPRs.length} PRs awaiting review`);
  } else if (laggedPRs.length === 1) {
    score = Math.max(0, score - 1); signals.push("PR awaiting review");
  }

  // ── Weighted momentum decay (#1) ────────────────────────────────────────────
  // A velocity burst followed by silence decays momentum more aggressively
  // than a consistently slow project. This surfaces "burst then stall" patterns.
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

  // Failing CI is a risk signal
  const runs = repoData?.ciRuns || [];
  if (runs.length > 0 && runs[0].conclusion === "failure") {
    score -= 8; signals.push("CI failing");
  }

  // Stale repo (no commits in 30+ days without being "live")
  const commits = repoData?.commits || [];
  if (commits.length > 0) {
    const ageDays = (Date.now() - new Date(commits[0].date).getTime()) / 86400000;
    if (ageDays > 60) { score -= 4; signals.push("Inactive 60+ days"); }
    else if (ageDays > 30) { score -= 2; signals.push("Inactive 30+ days"); }
  }

  // Overdue milestones
  const milestones = repoData?.milestones || [];
  const overdue = milestones.filter((m) => m.dueOn && new Date(m.dueOn).getTime() < Date.now() && m.state === "open");
  if (overdue.length > 0) { score -= 3; signals.push(`${overdue.length} overdue milestone${overdue.length > 1 ? "s" : ""}`); }

  // Stale open PRs (non-draft, older than 30 days) are a risk signal
  const stalePRs = (repoData?.prs || []).filter(pr => {
    if (pr.draft) return false;
    const ageDays = (Date.now() - new Date(pr.createdAt).getTime()) / 86400000;
    return ageDays > 30;
  });
  if (stalePRs.length > 0) { score -= 2; signals.push(`${stalePRs.length} stale PR${stalePRs.length > 1 ? "s" : ""}`); }

  // TODO/FIXME debt (injected lazily from code search when project hub is opened)
  const todoCount = repoData?.todoCount ?? 0;
  if (todoCount > 20) { score -= 2; signals.push(`${todoCount} TODOs/FIXMEs`); }

  const baseScore = Math.max(score, 0);
  if (baseScore >= 18) signals.push("Low risk");
  else if (baseScore >= 13) signals.push("Medium risk");
  else signals.push("High risk");

  // ── Governance bonus (0–5) — Studio OS compliance, SIL, CDR ─────────────────
  let governance = 0;
  if (compliance) {
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
  } else if (project?.studioOsApplied === false) {
    score -= 2; signals.push("No Studio OS");
  }

  return { score: Math.min(baseScore + governance, 25), base: baseScore, governance, signals };
}

// ── Grade mapping ─────────────────────────────────────────────────────────────
// Max score is 105 when full governance bonus is achieved (S-tier)
export function getGrade(score) {
  if (score >= 100) return { grade: "S",  color: "#c084fc" }; // governance-unlocked tier
  if (score >= 85)  return { grade: "A+", color: "#6ae3b2" };
  if (score >= 75)  return { grade: "A",  color: "#6ae3b2" };
  if (score >= 65)  return { grade: "B+", color: "#69b3ff" };
  if (score >= 55)  return { grade: "B",  color: "#69b3ff" };
  if (score >= 45)  return { grade: "C+", color: "#ffc874" };
  if (score >= 35)  return { grade: "C",  color: "#ffc874" };
  if (score >= 25)  return { grade: "D",  color: "#ff9478" };
  return               { grade: "F",  color: "#f87171" };
}

// ── Main scoring function ─────────────────────────────────────────────────────
// compliance: optional Studio OS compliance object { score, total, silFresh, cdrActive }
// When compliance is passed, Risk pillar gains governance bonus (up to +5),
// allowing total to reach 105 and unlocking S-tier grade.
export function scoreProject(project, repoData, sbData, socialData, compliance = null) {
  const _cacheKey = `${project.id}_${compliance ? "g" : "n"}`;
  if (_scoreCache.has(_cacheKey)) return _scoreCache.get(_cacheKey);

  const dev        = scoreDevelopment(repoData);
  const engagement = scoreEngagement(project, sbData, socialData, repoData);
  const momentum   = scoreMomentum(repoData, project);
  const risk       = scoreRisk(repoData, compliance, project);

  const w = getWeights();
  // Risk normalizes against 20 (base max); governance bonus pushes contribution above 20
  const total = Math.min(105, Math.round(
    (dev.score / 30)        * w.dev +
    (engagement.score / 25) * w.engage +
    (momentum.score / 25)   * w.momentum +
    (risk.score / 20)       * w.risk
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
