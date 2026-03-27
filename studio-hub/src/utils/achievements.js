// Achievement / Trophy System
// Evaluates studio and project state to unlock achievements.
// Unlocked achievements persist in localStorage.

import { safeGetJSON, safeSetJSON } from "./helpers.js";

const STORAGE_KEY = "vshub_achievements";
const NOTIF_KEY = "vshub_achievement_notifications";

// ── Achievement Definitions ──────────────────────────────────────────────────
// Each achievement has: id, name, description, icon, tier (bronze/silver/gold/diamond), xp reward
export const ACHIEVEMENTS = [
  // ── First Steps ──
  { id: "first_blood",        name: "First Blood",           desc: "Fix your first CI failure",                    icon: "🩸", tier: "bronze",  xp: 50,  category: "milestones" },
  { id: "hello_world",        name: "Hello World",           desc: "Get your first project to grade C or above",   icon: "👋", tier: "bronze",  xp: 30,  category: "milestones" },
  { id: "up_and_running",     name: "Up & Running",          desc: "Have all projects with CI passing",            icon: "✅", tier: "silver",  xp: 100, category: "milestones" },
  { id: "first_release",      name: "Ship It!",              desc: "Ship your first release on any project",       icon: "🚀", tier: "bronze",  xp: 50,  category: "milestones" },

  // ── Grade Achievements ──
  { id: "grade_b",            name: "Getting Serious",       desc: "Reach grade B on any project",                 icon: "📈", tier: "bronze",  xp: 40,  category: "grades" },
  { id: "grade_a",            name: "A-Player",              desc: "Reach grade A on any project",                 icon: "⭐", tier: "silver",  xp: 80,  category: "grades" },
  { id: "grade_a_plus",       name: "Overachiever",          desc: "Reach grade A+ on any project",                icon: "💎", tier: "gold",    xp: 150, category: "grades" },
  { id: "s_tier",             name: "S-Tier Unlocked",       desc: "Reach the legendary S-tier grade",             icon: "👑", tier: "diamond", xp: 300, category: "grades" },
  { id: "all_passing",        name: "Clean Sweep",           desc: "All projects graded C+ or above",              icon: "🧹", tier: "gold",    xp: 200, category: "grades" },
  { id: "all_a",              name: "Perfect Portfolio",      desc: "All projects graded A or above",              icon: "🏆", tier: "diamond", xp: 500, category: "grades" },

  // ── Streak Achievements ──
  { id: "streak_3",           name: "Warming Up",            desc: "3-day commit streak on any project",           icon: "🔥", tier: "bronze",  xp: 30,  category: "streaks" },
  { id: "streak_7",           name: "On Fire",               desc: "7-day commit streak on any project",           icon: "🔥", tier: "silver",  xp: 80,  category: "streaks" },
  { id: "streak_14",          name: "Unstoppable",           desc: "14-day commit streak on any project",          icon: "🔥", tier: "gold",    xp: 150, category: "streaks" },
  { id: "streak_30",          name: "Machine Mode",          desc: "30-day commit streak on any project",          icon: "🤖", tier: "diamond", xp: 300, category: "streaks" },

  // ── Portfolio Achievements ──
  { id: "portfolio_5",        name: "Empire Builder",        desc: "Manage 5+ active projects",                    icon: "🏗️", tier: "bronze",  xp: 50,  category: "portfolio" },
  { id: "portfolio_10",       name: "Studio Mogul",          desc: "Manage 10+ active projects",                   icon: "🏰", tier: "silver",  xp: 100, category: "portfolio" },
  { id: "score_improve_10",   name: "Glow Up",              desc: "Improve a project's score by 10+ in one session", icon: "✨", tier: "silver",  xp: 80,  category: "portfolio" },
  { id: "score_improve_25",   name: "Metamorphosis",        desc: "Improve a project's score by 25+ in one session", icon: "🦋", tier: "gold",    xp: 200, category: "portfolio" },
  { id: "studio_avg_50",      name: "Above Average",        desc: "Studio average score reaches 50",               icon: "📊", tier: "bronze",  xp: 60,  category: "portfolio" },
  { id: "studio_avg_75",      name: "Elite Studio",         desc: "Studio average score reaches 75",               icon: "🎯", tier: "gold",    xp: 250, category: "portfolio" },

  // ── Engagement Achievements ──
  { id: "vault_10",           name: "Gathering Sparks",     desc: "Reach 10 Vault Members",                        icon: "⚡", tier: "bronze",  xp: 50,  category: "community" },
  { id: "vault_50",           name: "The Vault Grows",      desc: "Reach 50 Vault Members",                        icon: "🏛️", tier: "silver",  xp: 120, category: "community" },
  { id: "vault_100",          name: "Vault Sovereign",      desc: "Reach 100 Vault Members",                       icon: "👁️", tier: "gold",    xp: 250, category: "community" },
  { id: "vault_500",          name: "Legion",               desc: "Reach 500 Vault Members",                       icon: "⚔️", tier: "diamond", xp: 500, category: "community" },
  { id: "sessions_100",       name: "Player Magnet",        desc: "100 total game sessions across all games",      icon: "🎮", tier: "bronze",  xp: 60,  category: "community" },
  { id: "sessions_1000",      name: "Arcade Empire",        desc: "1,000 total game sessions",                     icon: "🕹️", tier: "gold",    xp: 200, category: "community" },
  { id: "yt_100",             name: "Content Creator",      desc: "Reach 100 YouTube subscribers",                 icon: "📺", tier: "silver",  xp: 80,  category: "community" },

  // ── Governance Achievements ──
  { id: "studio_os_first",    name: "By The Book",          desc: "First project achieves Studio OS compliance",   icon: "📖", tier: "bronze",  xp: 40,  category: "governance" },
  { id: "studio_os_all",      name: "Full Compliance",      desc: "All projects achieve Studio OS compliance",     icon: "🛡️", tier: "gold",    xp: 200, category: "governance" },
  { id: "governance_bonus",   name: "Bonus Unlocked",       desc: "Earn the governance bonus on any project",      icon: "🔓", tier: "silver",  xp: 100, category: "governance" },

  // ── Special / Hidden ──
  { id: "night_owl",          name: "Night Owl",            desc: "Use the hub between midnight and 5 AM",         icon: "🦉", tier: "bronze",  xp: 20,  category: "special" },
  { id: "comeback",           name: "The Comeback",         desc: "Bring a project from F grade back to B+",       icon: "🔄", tier: "gold",    xp: 200, category: "special" },
  { id: "zero_issues",        name: "Issue Zero",           desc: "Get a project to zero open issues",             icon: "🎯", tier: "silver",  xp: 80,  category: "special" },
  { id: "sprint_complete",    name: "Sprint Champion",      desc: "Complete a sprint goal",                        icon: "🏅", tier: "silver",  xp: 100, category: "special" },
];

// Tier styling
export const TIER_STYLES = {
  bronze:  { color: "#cd7f32", bg: "rgba(205,127,50,0.12)",  border: "rgba(205,127,50,0.3)",  label: "Bronze" },
  silver:  { color: "#c0c0c0", bg: "rgba(192,192,192,0.12)", border: "rgba(192,192,192,0.3)", label: "Silver" },
  gold:    { color: "#ffd700", bg: "rgba(255,215,0,0.12)",   border: "rgba(255,215,0,0.3)",   label: "Gold" },
  diamond: { color: "#b9f2ff", bg: "rgba(185,242,255,0.12)", border: "rgba(185,242,255,0.3)", label: "Diamond" },
};

// ── Storage ──────────────────────────────────────────────────────────────────
function loadUnlocked() { return safeGetJSON(STORAGE_KEY, {}); }
function saveUnlocked(data) { safeSetJSON(STORAGE_KEY, data); }

function loadNotifications() {
  try { return JSON.parse(sessionStorage.getItem(NOTIF_KEY) || "[]"); } catch { return []; }
}

function saveNotifications(list) {
  sessionStorage.setItem(NOTIF_KEY, JSON.stringify(list));
}

export function getUnlockedAchievements() {
  return loadUnlocked();
}

export function getNewNotifications() {
  return loadNotifications();
}

export function clearNotifications() {
  saveNotifications([]);
}

export function dismissNotification(achievementId) {
  const notifs = loadNotifications();
  saveNotifications(notifs.filter(n => n.id !== achievementId));
}

// ── Evaluation Engine ────────────────────────────────────────────────────────
// Called each render to check for newly unlocked achievements.
// Returns array of newly unlocked achievement IDs.
export function evaluateAchievements(allScores, ghData, sbData, socialData, scoreHistory, scorePrev, studioScore) {
  const unlocked = loadUnlocked();
  const newlyUnlocked = [];

  function unlock(id) {
    if (unlocked[id]) return;
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return;
    unlocked[id] = { ts: Date.now(), xp: def.xp };
    newlyUnlocked.push(def);
  }

  // Gather data
  const totals = allScores.map(s => s.scoring.total);
  const memberCount = sbData?.members?.total || 0;
  const totalSessions = sbData?.sessions
    ? Object.values(sbData.sessions).reduce((s, v) => s + (v.total || 0), 0) : 0;
  const ytSubs = socialData?.youtube?.subscribers || 0;
  const activeProjects = allScores.filter(s => s.project.status !== "archived").length;

  // Grade achievements
  if (totals.some(t => t >= 35)) unlock("hello_world");
  if (totals.some(t => t >= 55)) unlock("grade_b");
  if (totals.some(t => t >= 75)) unlock("grade_a");
  if (totals.some(t => t >= 85)) unlock("grade_a_plus");
  if (totals.some(t => t >= 100)) unlock("s_tier");
  if (totals.length > 0 && totals.every(t => t >= 45)) unlock("all_passing");
  if (totals.length > 0 && totals.every(t => t >= 75)) unlock("all_a");

  // CI achievements
  const allCIPassing = Object.values(ghData).filter(d => d?.ciRuns?.length > 0).every(d => d.ciRuns[0].conclusion === "success");
  // Check if a previously failing CI is now passing (first_blood)
  if (scoreHistory.length >= 2) {
    const prevSnapshot = scoreHistory[scoreHistory.length - 2];
    for (const s of allScores) {
      const repo = s.project.githubRepo;
      const currCI = ghData[repo]?.ciRuns?.[0]?.conclusion;
      const prevCI = prevSnapshot.ci?.[s.project.id];
      if (prevCI === "failure" && currCI === "success") unlock("first_blood");
    }
  }
  if (allCIPassing && Object.values(ghData).some(d => d?.ciRuns?.length > 0)) unlock("up_and_running");

  // Release
  if (Object.values(ghData).some(d => d?.latestRelease)) unlock("first_release");

  // Streak achievements
  for (const d of Object.values(ghData)) {
    if (!d?.commits?.length) continue;
    const todayDay = Math.floor(Date.now() / 86400000);
    const commitDays = new Set(d.commits.map(c => Math.floor(new Date(c.date).getTime() / 86400000)));
    let streak = 0;
    for (let day = todayDay; day >= todayDay - 90; day--) {
      if (commitDays.has(day)) streak++;
      else if (streak > 0) break;
    }
    if (streak >= 3) unlock("streak_3");
    if (streak >= 7) unlock("streak_7");
    if (streak >= 14) unlock("streak_14");
    if (streak >= 30) unlock("streak_30");
  }

  // Portfolio size
  if (activeProjects >= 5) unlock("portfolio_5");
  if (activeProjects >= 10) unlock("portfolio_10");

  // Score improvement in session
  if (scorePrev && Object.keys(scorePrev).length) {
    for (const s of allScores) {
      const prev = scorePrev[s.project.id];
      if (prev == null) continue;
      const delta = s.scoring.total - prev;
      if (delta >= 10) unlock("score_improve_10");
      if (delta >= 25) unlock("score_improve_25");
    }
  }

  // Studio average
  if (studioScore.average >= 50) unlock("studio_avg_50");
  if (studioScore.average >= 75) unlock("studio_avg_75");

  // Vault Members
  if (memberCount >= 10) unlock("vault_10");
  if (memberCount >= 50) unlock("vault_50");
  if (memberCount >= 100) unlock("vault_100");
  if (memberCount >= 500) unlock("vault_500");

  // Sessions
  if (totalSessions >= 100) unlock("sessions_100");
  if (totalSessions >= 1000) unlock("sessions_1000");

  // YouTube
  if (ytSubs >= 100) unlock("yt_100");

  // Governance
  const hasGovBonus = allScores.some(s => s.scoring.pillars.risk.signals.some(sig => /Studio OS/i.test(sig)));
  const allGov = allScores.every(s => s.scoring.pillars.risk.signals.some(sig => /Studio OS/i.test(sig)));
  if (hasGovBonus) unlock("studio_os_first");
  if (allGov && allScores.length > 0) unlock("studio_os_all");
  if (allScores.some(s => s.scoring.pillars.risk.signals.some(sig => /governance/i.test(sig) || /\+\d.*bonus/i.test(sig)))) unlock("governance_bonus");

  // Zero issues
  for (const d of Object.values(ghData)) {
    if (d?.repo && d.repo.openIssues === 0) unlock("zero_issues");
  }

  // Night owl
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) unlock("night_owl");

  // Sprint complete — checked externally via unlockSprintComplete()
  // Comeback — checked via scoreHistory
  if (scoreHistory.length >= 3) {
    for (const s of allScores) {
      const id = s.project.id;
      const history = scoreHistory.map(h => h.scores?.[id]).filter(v => v != null);
      if (history.length >= 3) {
        const hadF = history.some(v => v < 25);
        if (hadF && s.scoring.total >= 65) unlock("comeback");
      }
    }
  }

  // Persist + notify
  if (newlyUnlocked.length > 0) {
    saveUnlocked(unlocked);
    const notifs = loadNotifications();
    for (const a of newlyUnlocked) {
      notifs.push({ id: a.id, name: a.name, icon: a.icon, tier: a.tier, xp: a.xp, ts: Date.now() });
    }
    saveNotifications(notifs);
  }

  return newlyUnlocked;
}

// External unlock for sprint completion
export function unlockSprintComplete() {
  const unlocked = loadUnlocked();
  if (unlocked.sprint_complete) return;
  const def = ACHIEVEMENTS.find(a => a.id === "sprint_complete");
  unlocked.sprint_complete = { ts: Date.now(), xp: def.xp };
  saveUnlocked(unlocked);
  const notifs = loadNotifications();
  notifs.push({ id: def.id, name: def.name, icon: def.icon, tier: def.tier, xp: def.xp, ts: Date.now() });
  saveNotifications(notifs);
}

// ── Stats ────────────────────────────────────────────────────────────────────
// Returns { current, target } for achievements with measurable progress
export function getAchievementProgress(id, context = {}) {
  const { allScores = [], memberCount = 0, totalSessions = 0, ytSubs = 0, activeProjects = 0 } = context;
  const totals = allScores.map(s => s.scoring?.total ?? 0);
  const gradeACount = totals.filter(t => t >= 75).length;
  const passingCount = totals.filter(t => t >= 45).length;
  const map = {
    all_a:          { current: gradeACount,      target: totals.length || 1 },
    all_passing:    { current: passingCount,      target: totals.length || 1 },
    portfolio_5:    { current: activeProjects,     target: 5 },
    portfolio_10:   { current: activeProjects,     target: 10 },
    vault_10:       { current: memberCount,        target: 10 },
    vault_50:       { current: memberCount,        target: 50 },
    vault_100:      { current: memberCount,        target: 100 },
    vault_500:      { current: memberCount,        target: 500 },
    sessions_100:   { current: totalSessions,      target: 100 },
    sessions_1000:  { current: totalSessions,      target: 1000 },
    yt_100:         { current: ytSubs,             target: 100 },
  };
  return map[id] || null;
}

export function getAchievementStats() {
  const unlocked = loadUnlocked();
  const unlockedCount = Object.keys(unlocked).length;
  const totalXP = Object.values(unlocked).reduce((s, v) => s + (v.xp || 0), 0);
  const total = ACHIEVEMENTS.length;
  const byTier = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
  for (const id of Object.keys(unlocked)) {
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (def) byTier[def.tier]++;
  }
  return { unlockedCount, total, totalXP, byTier, pct: total > 0 ? Math.round((unlockedCount / total) * 100) : 0 };
}
