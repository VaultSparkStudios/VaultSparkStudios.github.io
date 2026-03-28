// VaultSpark Proprietary Scores
// Two additional per-project scores that complement the 5-pillar health score.
//
// Potential Score (0–100):  upside trajectory — "what this project could become"
// Momentum Index  (0–100):  current velocity  — "how fast things are moving right now"

import { commitVelocity } from "./helpers.js";

// ── Potential Score (0–100) ───────────────────────────────────────────────────
// Measures upside: improving trajectory + community traction + market readiness.
// High potential ≠ high health — a low-health project can have high potential if trending up.
export function scorePotential(project, repoData, socialData, scoreHistory) {
  let score = 0;

  // 1. Score trajectory (0–30) — is health improving over recent sessions?
  const pts = (scoreHistory || []).map((h) => h.scores?.[project.id]).filter((v) => v != null);
  if (pts.length >= 3) {
    const d1 = pts[pts.length - 1] - pts[pts.length - 2];
    const d2 = pts[pts.length - 2] - pts[pts.length - 3];
    if (d1 > 0 && d2 > 0)      score += 30; // two consecutive gains
    else if (d1 > 0)            score += 20; // one gain
    else if (d1 === 0 && d2 >= 0) score += 10; // flat / recovering
    // declining = 0pts
  } else if (pts.length === 2) {
    const d1 = pts[1] - pts[0];
    if (d1 > 0)      score += 20;
    else if (d1 === 0) score += 10;
  } else {
    score += 10; // no history — neutral
  }

  // 2. Community traction (0–25) — stars + social proof
  const stars = repoData?.repo?.stars ?? 0;
  if      (stars >= 100) score += 25;
  else if (stars >= 50)  score += 18;
  else if (stars >= 20)  score += 12;
  else if (stars >= 5)   score += 7;

  // Social reach bonus — use studio-wide social data (no per-project mapping needed)
  if (socialData) {
    const subscribers = socialData.youtube?.subscribers ?? 0;
    const members     = socialData.reddit?.subscribers   ?? 0;
    const followers   = socialData.bluesky?.followers    ?? 0;
    if (subscribers > 1000 || members > 500 || followers > 200) score += 5;
  }

  // 3. Market readiness (0–25) — can growth happen?
  if (project.deployedUrl)                           score += 10;
  if (repoData?.latestRelease) {
    const relAge = (Date.now() - new Date(repoData.latestRelease.publishedAt).getTime()) / 86400000;
    if (relAge < 90) score += 10;
  }
  if ((repoData?.ciRuns || []).length > 0)           score += 5;

  // 4. Development acceleration (0–20) — commit velocity trend
  const vel = commitVelocity(repoData?.commits);
  if      (vel.thisWeek > vel.lastWeek && vel.thisWeek > 0) score += 20;
  else if (vel.thisWeek === vel.lastWeek && vel.thisWeek > 0) score += 12;
  else if (vel.thisWeek > 0)                                  score += 6;

  return Math.min(100, score);
}

// ── Momentum Index (0–100) ────────────────────────────────────────────────────
// Measures current velocity: commit speed, CI streak, PR activity, release recency.
// High momentum = things are moving fast right now.
export function scoreMomentumIndex(project, repoData, scoreHistory) {
  let score = 0;

  // 1. Commit velocity (0–30)
  const vel = commitVelocity(repoData?.commits);
  if      (vel.thisWeek >= 10) score += 30;
  else if (vel.thisWeek >= 5)  score += 22;
  else if (vel.thisWeek >= 3)  score += 15;
  else if (vel.thisWeek >= 1)  score += 8;

  // 2. CI green streak (0–20) — consecutive passing runs from most recent
  const runs = repoData?.ciRuns || [];
  let streak = 0;
  for (const run of runs) {
    if (run.conclusion === "success") streak++;
    else break;
  }
  if      (streak >= 5) score += 20;
  else if (streak >= 3) score += 14;
  else if (streak >= 1) score += 8;
  else if (runs.length > 0 && runs[0].conclusion === "failure") score += 0; // failing CI = no momentum pts

  // 3. PR activity (0–20) — fresh open PRs
  const prs = (repoData?.prs || []).filter((p) => !p.draft);
  const freshPRs = prs.filter((p) => {
    const ageDays = (Date.now() - new Date(p.createdAt).getTime()) / 86400000;
    return ageDays < 7;
  });
  if      (freshPRs.length >= 3) score += 20;
  else if (freshPRs.length >= 2) score += 14;
  else if (freshPRs.length >= 1) score += 8;
  else if (prs.length > 0)       score += 3; // has PRs, all stale

  // 4. Release recency (0–15)
  if (repoData?.latestRelease) {
    const relAge = (Date.now() - new Date(repoData.latestRelease.publishedAt).getTime()) / 86400000;
    if      (relAge < 7)  score += 15;
    else if (relAge < 30) score += 10;
    else if (relAge < 90) score += 5;
  }

  // 5. Issue velocity (0–15) — are issues being resolved?
  const prevIssues = (scoreHistory || []).length >= 2
    ? (scoreHistory[scoreHistory.length - 2].issues?.[project.id] ?? null)
    : null;
  const currIssues = repoData?.repo?.openIssues ?? null;
  if (currIssues === 0)                                           score += 12; // no issues = clean
  else if (prevIssues !== null && currIssues < prevIssues)        score += 15; // closing issues
  else if (prevIssues !== null && currIssues === prevIssues)      score += 7;  // steady
  else if (currIssues !== null && currIssues > 0 && prevIssues === null) score += 5; // no prev data

  return Math.min(100, score);
}

// ── Score label helpers ───────────────────────────────────────────────────────
export function potentialLabel(score) {
  if (score >= 80) return { label: "🚀 HIGH",   color: "#7ae7c7" };
  if (score >= 60) return { label: "📈 RISING", color: "#69b3ff" };
  if (score >= 40) return { label: "◎ MED",     color: "#ffc874" };
  return              { label: "◌ LOW",          color: "#64748b" };
}

export function momentumLabel(score) {
  if (score >= 75) return { label: "⚡ HOT",    color: "#ffc874" };
  if (score >= 50) return { label: "▶ ACTIVE",  color: "#69b3ff" };
  if (score >= 25) return { label: "◎ SLOW",    color: "#94a3b8" };
  return              { label: "◌ IDLE",         color: "#475569" };
}
