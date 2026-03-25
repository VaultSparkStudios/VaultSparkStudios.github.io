// Project Health Scoring System
// Each project scores 0–100 across four pillars.
// Adding new scoring signals: add to the relevant pillar function below.

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

  // Commit recency
  if (commits.length > 0) {
    const latest = commits[0];
    const ageMs = Date.now() - new Date(latest.date).getTime();
    const ageDays = ageMs / 86400000;
    if (ageDays < 1)       { score += 15; signals.push("Committed today"); }
    else if (ageDays < 7)  { score += 12; signals.push("Committed this week"); }
    else if (ageDays < 30) { score += 7;  signals.push("Committed this month"); }
    else                   { score += 2;  signals.push("No recent commits"); }
  }

  return { score: Math.min(score, 30), signals };
}

// ── Pillar 2: Engagement (0–25) ──────────────────────────────────────────────
function scoreEngagement(project, sbData, socialData) {
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

  // Non-game projects get a baseline for being live/deployed
  if (!project.supabaseGameSlug && project.deployedUrl) {
    score += 5; signals.push("Deployed and live");
  }

  return { score: Math.min(score, 25), signals };
}

// ── Pillar 3: Momentum (0–25) ────────────────────────────────────────────────
function scoreMomentum(repoData, project) {
  let score = 0;
  const signals = [];

  // Active PRs (shows ongoing work)
  const prCount = repoData?.prs?.length || 0;
  if (prCount >= 3)      { score += 8; signals.push(`${prCount} open PRs`); }
  else if (prCount >= 1) { score += 5; signals.push(`${prCount} open PR${prCount > 1 ? "s" : ""}`); }

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

  return { score: Math.min(score, 25), signals };
}

// ── Pillar 4: Risk (0–20, higher = healthier) ────────────────────────────────
function scoreRisk(repoData) {
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

  if (score >= 18) signals.push("Low risk");
  else if (score >= 13) signals.push("Medium risk");
  else signals.push("High risk");

  return { score: Math.max(score, 0), signals };
}

// ── Grade mapping ─────────────────────────────────────────────────────────────
export function getGrade(score) {
  if (score >= 85) return { grade: "A+", color: "#6ae3b2" };
  if (score >= 75) return { grade: "A",  color: "#6ae3b2" };
  if (score >= 65) return { grade: "B+", color: "#69b3ff" };
  if (score >= 55) return { grade: "B",  color: "#69b3ff" };
  if (score >= 45) return { grade: "C+", color: "#ffc874" };
  if (score >= 35) return { grade: "C",  color: "#ffc874" };
  if (score >= 25) return { grade: "D",  color: "#ff9478" };
  return              { grade: "F",  color: "#f87171" };
}

// ── Main scoring function ─────────────────────────────────────────────────────
export function scoreProject(project, repoData, sbData, socialData) {
  const dev        = scoreDevelopment(repoData);
  const engagement = scoreEngagement(project, sbData, socialData);
  const momentum   = scoreMomentum(repoData, project);
  const risk       = scoreRisk(repoData);

  const total = dev.score + engagement.score + momentum.score + risk.score;
  const { grade, color } = getGrade(total);

  return {
    total,
    grade,
    gradeColor: color,
    pillars: {
      development: { score: dev.score, max: 30, signals: dev.signals },
      engagement:  { score: engagement.score, max: 25, signals: engagement.signals },
      momentum:    { score: momentum.score, max: 25, signals: momentum.signals },
      risk:        { score: risk.score, max: 20, signals: risk.signals },
    },
  };
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
