// Score Explainability Engine
// Generates actionable "why" breakdowns per project: which signals caused point
// losses, what the max recovery is, and specific fix suggestions.

import { scoreProject, getGrade } from "./projectScoring.js";

/**
 * Returns a detailed breakdown of why a project scored what it did,
 * with actionable recovery suggestions ranked by impact.
 *
 * @param {object} project  - Project registry entry
 * @param {object} repoData - GitHub data (or null)
 * @param {object} sbData   - Supabase data (or null)
 * @param {object} socialData - Social feeds data (or null)
 * @param {object|null} compliance - Studio OS compliance (or null)
 * @returns {{ total, grade, pillarBreakdowns, losses, recoveryPlan, summaryText }}
 */
export function explainScore(project, repoData, sbData, socialData, compliance = null) {
  const scoring = scoreProject(project, repoData, sbData, socialData, compliance);
  const losses = [];

  // ── Development pillar losses ────────────────────────────────────────────
  const dev = scoring.pillars.development;
  const devLost = dev.max - dev.score;
  if (devLost > 0) {
    const signals = dev.signals || [];
    if (signals.some((s) => /failing/i.test(s))) {
      losses.push({ pillar: "Development", points: Math.min(devLost, 15), action: "Fix the failing CI build", signal: "CI failing", priority: 1 });
    }
    if (signals.some((s) => /no recent|no commit|this month/i.test(s))) {
      losses.push({ pillar: "Development", points: Math.min(devLost, 12), action: "Push new commits (commit recency bonus)", signal: signals.find((s) => /commit/i.test(s)) || "Stale commits", priority: 2 });
    }
    if (signals.some((s) => /dep/i.test(s) && /ago|detected/i.test(s))) {
      losses.push({ pillar: "Development", points: Math.min(devLost, 3), action: "Update dependencies (run dep update)", signal: signals.find((s) => /dep/i.test(s)), priority: 5 });
    }
    if (signals.some((s) => /tests? failing/i.test(s))) {
      losses.push({ pillar: "Development", points: Math.min(devLost, 3), action: "Fix failing test suite", signal: "Tests failing", priority: 1 });
    }
    if (signals.some((s) => /no ci/i.test(s))) {
      losses.push({ pillar: "Development", points: Math.min(devLost, 10), action: "Add a CI/CD pipeline (GitHub Actions)", signal: "No CI configured", priority: 3 });
    }
  }

  // ── Engagement pillar losses ─────────────────────────────────────────────
  const eng = scoring.pillars.engagement;
  const engLost = eng.max - eng.score;
  if (engLost > 0) {
    const signals = eng.signals || [];
    if (signals.some((s) => /no sessions/i.test(s))) {
      losses.push({ pillar: "Engagement", points: Math.min(engLost, 15), action: "Drive player sessions this week", signal: "No game sessions", priority: 3 });
    }
    if (!signals.some((s) => /stars/i.test(s)) && !project.supabaseGameSlug) {
      losses.push({ pillar: "Engagement", points: Math.min(engLost, 8), action: "Grow GitHub stars (share project, improve README)", signal: "Low star count", priority: 4 });
    }
    if (!signals.some((s) => /deployed/i.test(s)) && !project.supabaseGameSlug && project.deployedUrl === null) {
      losses.push({ pillar: "Engagement", points: Math.min(engLost, 5), action: "Deploy the project (add deployedUrl)", signal: "Not deployed", priority: 3 });
    }
  }

  // ── Momentum pillar losses ──────────────────────────────────────────────
  const mom = scoring.pillars.momentum;
  const momLost = mom.max - mom.score;
  if (momLost > 0) {
    const signals = mom.signals || [];
    if (!signals.some((s) => /released/i.test(s)) || signals.some((s) => /old release/i.test(s))) {
      losses.push({ pillar: "Momentum", points: Math.min(momLost, 10), action: "Ship a new release (tag + publish)", signal: "No recent release", priority: 2 });
    }
    if (signals.some((s) => /stall|cooling/i.test(s))) {
      losses.push({ pillar: "Momentum", points: Math.min(momLost, 5), action: "Resume commits to break the stall pattern", signal: signals.find((s) => /stall|cool/i.test(s)), priority: 2 });
    }
    if (signals.some((s) => /awaiting review/i.test(s))) {
      losses.push({ pillar: "Momentum", points: Math.min(momLost, 3), action: "Review and merge open PRs", signal: signals.find((s) => /review/i.test(s)), priority: 3 });
    }
  }

  // ── Risk pillar losses ──────────────────────────────────────────────────
  const risk = scoring.pillars.risk;
  const riskLost = (risk.max || 20) - risk.score;
  if (riskLost > 0) {
    const signals = risk.signals || [];
    if (signals.some((s) => /open issues/i.test(s))) {
      const match = signals.find((s) => /\d+ open issues/i.test(s));
      const count = match ? parseInt(match) : 0;
      losses.push({ pillar: "Risk", points: Math.min(riskLost, count > 30 ? 10 : count > 15 ? 6 : 3), action: `Close or triage open issues (${count} open)`, signal: match, priority: 2 });
    }
    if (signals.some((s) => /ci failing/i.test(s))) {
      losses.push({ pillar: "Risk", points: Math.min(riskLost, 8), action: "Fix CI (also penalizes Development)", signal: "CI failing (risk)", priority: 1 });
    }
    if (signals.some((s) => /inactive/i.test(s))) {
      losses.push({ pillar: "Risk", points: Math.min(riskLost, 4), action: "Push a commit to show activity", signal: signals.find((s) => /inactive/i.test(s)), priority: 3 });
    }
    if (signals.some((s) => /overdue/i.test(s))) {
      losses.push({ pillar: "Risk", points: Math.min(riskLost, 3), action: "Close or reschedule overdue milestones", signal: signals.find((s) => /overdue/i.test(s)), priority: 3 });
    }
    if (signals.some((s) => /stale PR/i.test(s))) {
      losses.push({ pillar: "Risk", points: Math.min(riskLost, 2), action: "Close or merge stale PRs (>30 days old)", signal: signals.find((s) => /stale PR/i.test(s)), priority: 4 });
    }
    if (signals.some((s) => /TODO/i.test(s))) {
      losses.push({ pillar: "Risk", points: Math.min(riskLost, 2), action: "Reduce TODO/FIXME count below 20", signal: signals.find((s) => /TODO/i.test(s)), priority: 5 });
    }
    if (signals.some((s) => /critical issue/i.test(s))) {
      losses.push({ pillar: "Risk", points: Math.min(riskLost, 2), action: "Resolve critical/urgent labeled issues", signal: "Critical issue open", priority: 1 });
    }
    if (signals.some((s) => /aging.*14/i.test(s))) {
      losses.push({ pillar: "Risk", points: Math.min(riskLost, 1), action: "Address aging PRs (14-30 days old)", signal: signals.find((s) => /aging/i.test(s)), priority: 4 });
    }
    if (signals.some((s) => /dep vulnerabilit|dep alert/i.test(s))) {
      losses.push({ pillar: "Risk", points: Math.min(riskLost, 3), action: "Resolve Dependabot vulnerability alerts", signal: signals.find((s) => /dep vulnerabilit|dep alert/i.test(s)), priority: 2 });
    }
  }

  // ── Community pillar losses ─────────────────────────────────────────────
  const comm = scoring.pillars.community;
  const commLost = comm.max - comm.score;
  if (commLost > 0) {
    const signals = comm.signals || [];
    if (!signals.some((s) => /social followers/i.test(s)) || signals.some((s) => /^(?:20|[12]?\d) total/i.test(s))) {
      losses.push({ pillar: "Community", points: Math.min(commLost, 5), action: "Grow social following across platforms", signal: "Low social following", priority: 4 });
    }
    if (signals.some((s) => /no new members/i.test(s)) || !signals.some((s) => /members/i.test(s))) {
      losses.push({ pillar: "Community", points: Math.min(commLost, 5), action: "Drive member signups to the Vault", signal: "No member growth", priority: 3 });
    }
    if (!signals.some((s) => /social post/i.test(s) || /active social posting/i.test(s))) {
      losses.push({ pillar: "Community", points: Math.min(commLost, 4), action: "Post content on social channels (YouTube, Reddit, Bluesky)", signal: "No recent social posts", priority: 3 });
    }
    if (!signals.some((s) => /gumroad/i.test(s) || /product sales/i.test(s))) {
      losses.push({ pillar: "Community", points: Math.min(commLost, 3), action: "List and sell products on Gumroad", signal: "No Gumroad sales", priority: 5 });
    }
    if (!signals.some((s) => /engagement/i.test(s))) {
      losses.push({ pillar: "Community", points: Math.min(commLost, 4), action: "Boost social engagement (likes, comments, shares)", signal: "Low social engagement", priority: 4 });
    }
  }

  // ── Deduplicate (CI failing appears in both Dev and Risk) ──────────────
  const seen = new Set();
  const uniqueLosses = losses.filter((l) => {
    const key = l.action;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Sort by priority (1=highest) then by points recovered ──────────────
  uniqueLosses.sort((a, b) => a.priority - b.priority || b.points - a.points);

  // ── Recovery plan: top 3 actions with estimated point recovery ─────────
  const recoveryPlan = uniqueLosses.slice(0, 5).map((l) => ({
    action: l.action,
    estimatedRecovery: `+${l.points} pts`,
    pillar: l.pillar,
    signal: l.signal,
  }));

  const totalRecoverable = uniqueLosses.reduce((s, l) => s + l.points, 0);
  const potentialScore = Math.min(130, scoring.total + totalRecoverable);
  const potentialGrade = getGrade(potentialScore);

  // ── Summary text ───────────────────────────────────────────────────────
  let summaryText;
  if (scoring.total >= 90) {
    summaryText = "Excellent health. Minor optimizations possible.";
  } else if (uniqueLosses.length === 0) {
    summaryText = "Score is capped by available data signals.";
  } else {
    const top = uniqueLosses[0];
    summaryText = `Biggest opportunity: ${top.action} (+${top.points} pts in ${top.pillar}).`;
  }

  return {
    total: scoring.total,
    grade: scoring.grade,
    gradeColor: scoring.gradeColor,
    potentialScore,
    potentialGrade: potentialGrade.grade,
    pillarBreakdowns: [
      { name: "Development", score: dev.score, max: dev.max, lost: devLost, signals: dev.signals },
      { name: "Engagement", score: eng.score, max: eng.max, lost: engLost, signals: eng.signals },
      { name: "Momentum", score: mom.score, max: mom.max, lost: momLost, signals: mom.signals },
      { name: "Risk", score: risk.score, max: risk.max || 20, lost: Math.max(0, riskLost), signals: risk.signals },
      { name: "Community", score: comm.score, max: comm.max, lost: commLost, signals: comm.signals },
    ],
    losses: uniqueLosses,
    recoveryPlan,
    summaryText,
  };
}

/**
 * Renders an HTML panel for the score explainability view.
 * Designed to be injected into projectHubView or studioHubView.
 */
export function renderScoreExplainerPanel(explanation) {
  const { total, grade, gradeColor, potentialScore, potentialGrade, pillarBreakdowns, recoveryPlan, summaryText } = explanation;

  const pillarRows = pillarBreakdowns.map((p) => `
    <div style="display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid var(--border);">
      <span style="font-size:11px; color:var(--muted); min-width:80px; text-transform:uppercase; letter-spacing:0.04em;">${p.name}</span>
      <div style="flex:1; height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden;">
        <div style="width:${Math.round((p.score / p.max) * 100)}%; height:100%; background:${p.lost > 5 ? 'var(--red)' : p.lost > 2 ? 'var(--gold)' : 'var(--green)'}; border-radius:2px;"></div>
      </div>
      <span style="font-size:10px; color:var(--muted); min-width:40px; text-align:right;">${p.score}/${p.max}</span>
      ${p.lost > 0 ? `<span style="font-size:10px; color:var(--red);">-${p.lost}</span>` : `<span style="font-size:10px; color:var(--green);">full</span>`}
    </div>
  `).join("");

  const recoveryRows = recoveryPlan.map((r, i) => `
    <div style="display:flex; align-items:flex-start; gap:10px; padding:7px 0; ${i < recoveryPlan.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}">
      <span style="font-size:11px; font-weight:700; color:var(--green); min-width:50px;">${r.estimatedRecovery}</span>
      <div style="flex:1;">
        <div style="font-size:12px; color:var(--text);">${r.action}</div>
        <div style="font-size:10px; color:var(--muted); margin-top:2px;">${r.pillar} &middot; ${r.signal || ''}</div>
      </div>
    </div>
  `).join("");

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <span class="hub-section-title">SCORE EXPLAINER</span>
        <span style="font-size:11px; color:var(--muted);">Why ${grade}? What would make it ${potentialGrade}?</span>
      </div>
      <div class="hub-section-body">
        <div style="display:flex; gap:16px; margin-bottom:14px; align-items:center;">
          <div style="text-align:center;">
            <div style="font-size:28px; font-weight:800; color:${gradeColor};">${total}</div>
            <div style="font-size:11px; color:var(--muted);">Current</div>
          </div>
          <div style="font-size:18px; color:var(--muted);">→</div>
          <div style="text-align:center;">
            <div style="font-size:28px; font-weight:800; color:var(--green);">${potentialScore}</div>
            <div style="font-size:11px; color:var(--muted);">Potential (${potentialGrade})</div>
          </div>
        </div>
        <div style="font-size:12px; color:var(--text); margin-bottom:14px; padding:8px 12px; background:rgba(122,231,199,0.06); border-radius:8px; border-left:3px solid var(--cyan);">
          ${summaryText}
        </div>
        <div style="margin-bottom:14px;">
          <div style="font-size:11px; font-weight:700; color:var(--silver); margin-bottom:6px; letter-spacing:0.04em;">PILLAR BREAKDOWN</div>
          ${pillarRows}
        </div>
        ${recoveryPlan.length ? `
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--silver); margin-bottom:6px; letter-spacing:0.04em;">RECOVERY PLAN</div>
            ${recoveryRows}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
