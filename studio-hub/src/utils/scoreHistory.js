// Score history helpers — persistent snapshot management for project health scores.
// Extracted from clientApp.js to keep snapshot logic co-located.

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject } from "./projectScoring.js";

const SCORE_HISTORY_KEY  = "vshub_score_history";
export const MAX_HISTORY = 52; // ~1yr of weekly snapshots
export const SESSION_START_KEY = "vshub_session_start_scores";

export function loadScoreHistory() {
  try {
    const raw = localStorage.getItem(SCORE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function pushScoreHistory(ghData, sbData, socialData) {
  try {
    const scores = {}, ci = {}, issues = {}, pillars = {};
    for (const p of PROJECTS) {
      const repoData = ghData[p.githubRepo] || null;
      if (repoData !== null || sbData !== null) {
        const sc = scoreProject(p, repoData, sbData, socialData);
        scores[p.id]  = sc.total;
        ci[p.id]      = repoData?.ciRuns?.[0]?.conclusion || null;
        issues[p.id]  = repoData?.repo?.openIssues ?? null;
        pillars[p.id] = {
          dev:      sc.pillars.development.score,
          engage:   sc.pillars.engagement.score,
          momentum: sc.pillars.momentum.score,
          risk:     sc.pillars.risk.score,
        };
      }
    }
    const history = loadScoreHistory();
    history.push({ ts: Date.now(), scores, ci, issues, pillars });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(history));
    return history;
  } catch { return []; }
}

// Store session-start scores on first call (once per browser session) for accurate delta badges.
export function storeSessionStartScores(history) {
  if (!history.length) return;
  try {
    if (!sessionStorage.getItem(SESSION_START_KEY)) {
      const latest = history[history.length - 1].scores || {};
      sessionStorage.setItem(SESSION_START_KEY, JSON.stringify(latest));
    }
  } catch {}
}

// Prefer session-start scores so delta badges reflect true session progress.
export function scorePrevFromHistory(history) {
  try {
    const stored = sessionStorage.getItem(SESSION_START_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  if (history.length < 2) return {};
  return history[history.length - 2].scores || {};
}
