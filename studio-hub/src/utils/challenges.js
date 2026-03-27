// Daily & Weekly Challenge System
// Auto-generates challenges based on current project state.
// Challenges refresh daily (daily) and weekly (weekly).
// Completed challenges award XP.

const CHALLENGE_KEY = "vshub_active_challenges";

// ── Challenge Templates ──────────────────────────────────────────────────────
const DAILY_TEMPLATES = [
  {
    id: "fix_ci",
    name: "CI Medic",
    desc: "Fix a failing CI build",
    icon: "🔧",
    xp: 40,
    condition: (ghData) => Object.values(ghData).some(d => d?.ciRuns?.[0]?.conclusion === "failure"),
    check: (ghData) => Object.values(ghData).filter(d => d?.ciRuns?.[0]?.conclusion === "failure").length === 0,
  },
  {
    id: "close_issues",
    name: "Issue Crusher",
    desc: "Close 2 or more issues today",
    icon: "🎯",
    xp: 30,
    condition: () => true,
    check: (_ghData, _sbData, _socialData, challengeState) => (challengeState?.issuesClosed || 0) >= 2,
  },
  {
    id: "push_commits",
    name: "Code Pusher",
    desc: "Push commits to at least 2 projects",
    icon: "⚡",
    xp: 25,
    condition: () => true,
    check: (ghData) => {
      const today = new Date().toISOString().slice(0, 10);
      let count = 0;
      for (const d of Object.values(ghData)) {
        if (d?.commits?.some(c => c.date?.slice(0, 10) === today)) count++;
      }
      return count >= 2;
    },
  },
  {
    id: "improve_score",
    name: "Score Booster",
    desc: "Improve any project score by 5+",
    icon: "📈",
    xp: 35,
    condition: () => true,
    check: (_ghData, _sbData, _socialData, challengeState) => (challengeState?.maxImprovement || 0) >= 5,
  },
  {
    id: "review_pr",
    name: "PR Patrol",
    desc: "Merge or close an open PR",
    icon: "🔀",
    xp: 25,
    condition: (ghData) => Object.values(ghData).some(d => d?.prs?.length > 0),
    check: (_ghData, _sbData, _socialData, challengeState) => (challengeState?.prsMerged || 0) >= 1,
  },
  {
    id: "daily_checkin",
    name: "Daily Check-In",
    desc: "Open the Studio Hub and review your projects",
    icon: "☀️",
    xp: 10,
    condition: () => true,
    check: () => true, // Always completes on load
  },
];

const WEEKLY_TEMPLATES = [
  {
    id: "weekly_streak",
    name: "Week Warrior",
    desc: "Maintain a 7-day commit streak on any project",
    icon: "🔥",
    xp: 80,
    condition: () => true,
    check: (ghData) => {
      for (const d of Object.values(ghData)) {
        if (!d?.commits?.length) continue;
        const todayDay = Math.floor(Date.now() / 86400000);
        const commitDays = new Set(d.commits.map(c => Math.floor(new Date(c.date).getTime() / 86400000)));
        let streak = 0;
        for (let day = todayDay; day >= todayDay - 90; day--) {
          if (commitDays.has(day)) streak++;
          else if (streak > 0) break;
        }
        if (streak >= 7) return true;
      }
      return false;
    },
  },
  {
    id: "weekly_all_ci",
    name: "Green Across the Board",
    desc: "Get all projects CI passing this week",
    icon: "✅",
    xp: 60,
    condition: (ghData) => Object.values(ghData).some(d => d?.ciRuns?.length > 0),
    check: (ghData) => {
      const withCI = Object.values(ghData).filter(d => d?.ciRuns?.length > 0);
      return withCI.length > 0 && withCI.every(d => d.ciRuns[0].conclusion === "success");
    },
  },
  {
    id: "weekly_release",
    name: "Ship Week",
    desc: "Ship a release on any project this week",
    icon: "🚀",
    xp: 70,
    condition: () => true,
    check: (ghData) => {
      const weekAgo = Date.now() - 7 * 86400000;
      return Object.values(ghData).some(d => {
        const rel = d?.latestRelease;
        return rel && new Date(rel.publishedAt).getTime() > weekAgo;
      });
    },
  },
  {
    id: "weekly_score_avg",
    name: "Portfolio Uplift",
    desc: "Raise your studio average score by 3+",
    icon: "📊",
    xp: 60,
    condition: () => true,
    check: (_ghData, _sbData, _socialData, challengeState) => (challengeState?.avgImprovement || 0) >= 3,
  },
  {
    id: "weekly_vault_growth",
    name: "Community Builder",
    desc: "Gain 2+ new Vault Members this week",
    icon: "🏛️",
    xp: 50,
    condition: (_ghData, sbData) => (sbData?.members?.total || 0) > 0,
    check: (_ghData, sbData) => (sbData?.members?.newThisWeek || 0) >= 2,
  },
];

// ── Storage ──────────────────────────────────────────────────────────────────
function loadChallenges() {
  try { return JSON.parse(localStorage.getItem(CHALLENGE_KEY) || "null"); } catch { return null; }
}

function saveChallenges(data) {
  localStorage.setItem(CHALLENGE_KEY, JSON.stringify(data));
}

// ── Challenge Generation ─────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }
function weekStr() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-W${Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7)}`;
}

// Seed-based pseudo-random for deterministic daily picks
function seededRandom(seed) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff;
  };
}

function pickChallenges(templates, count, seed, ghData, sbData) {
  const applicable = templates.filter(t => t.condition(ghData, sbData));
  if (applicable.length === 0) return [];
  const rng = seededRandom(seed);
  const shuffled = [...applicable].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ── Main API ─────────────────────────────────────────────────────────────────
export function getActiveChallenges(ghData, sbData, socialData, _scorePrev, _studioScore) {
  const stored = loadChallenges();
  const today = todayStr();
  const week = weekStr();
  const dateSeed = parseInt(today.replace(/-/g, ""), 10);
  const weekSeed = parseInt(week.replace(/\D/g, ""), 10);

  let needsSave = false;

  // Initialize or refresh daily challenges
  let daily = stored?.daily || {};
  if (daily.date !== today) {
    const picks = pickChallenges(DAILY_TEMPLATES, 3, dateSeed, ghData, sbData);
    daily = {
      date: today,
      challenges: picks.map(t => ({
        id: t.id, name: t.name, desc: t.desc, icon: t.icon,
        xp: t.xp, completed: false, claimed: false,
      })),
    };
    needsSave = true;
  }

  // Initialize or refresh weekly challenges
  let weekly = stored?.weekly || {};
  if (weekly.week !== week) {
    const picks = pickChallenges(WEEKLY_TEMPLATES, 2, weekSeed, ghData, sbData);
    weekly = {
      week,
      challenges: picks.map(t => ({
        id: t.id, name: t.name, desc: t.desc, icon: t.icon,
        xp: t.xp, completed: false, claimed: false,
      })),
    };
    needsSave = true;
  }

  // Build challenge state for evaluation
  const challengeState = {};

  // Check completion for daily challenges
  for (const ch of daily.challenges) {
    if (ch.completed) continue;
    const template = DAILY_TEMPLATES.find(t => t.id === ch.id);
    if (template && template.check(ghData, sbData, socialData, challengeState)) {
      ch.completed = true;
      needsSave = true;
    }
  }

  // Check completion for weekly challenges
  for (const ch of weekly.challenges) {
    if (ch.completed) continue;
    const template = WEEKLY_TEMPLATES.find(t => t.id === ch.id);
    if (template && template.check(ghData, sbData, socialData, challengeState)) {
      ch.completed = true;
      needsSave = true;
    }
  }

  if (needsSave) {
    saveChallenges({ daily, weekly });
  }

  return { daily: daily.challenges, weekly: weekly.challenges };
}

// Update challenge state with external data (called from hub view)
export function updateChallengeProgress(key, value) {
  const stored = loadChallenges();
  if (!stored) return;
  if (!stored.state) stored.state = {};
  stored.state[key] = value;
  saveChallenges(stored);
}

// Claim XP from completed challenge
export function claimChallengeXP(challengeId, type) {
  const stored = loadChallenges();
  if (!stored) return 0;
  const pool = type === "weekly" ? stored.weekly : stored.daily;
  const ch = pool?.challenges?.find(c => c.id === challengeId);
  if (!ch || !ch.completed || ch.claimed) return 0;
  ch.claimed = true;
  saveChallenges(stored);
  return ch.xp;
}

// Get all completed-but-unclaimed challenges
export function getUnclaimedRewards() {
  const stored = loadChallenges();
  if (!stored) return [];
  const unclaimed = [];
  for (const ch of (stored.daily?.challenges || [])) {
    if (ch.completed && !ch.claimed) unclaimed.push({ ...ch, type: "daily" });
  }
  for (const ch of (stored.weekly?.challenges || [])) {
    if (ch.completed && !ch.claimed) unclaimed.push({ ...ch, type: "weekly" });
  }
  return unclaimed;
}

// Get challenge stats
export function getChallengeStats() {
  const stored = loadChallenges();
  if (!stored) return { dailyDone: 0, dailyTotal: 0, weeklyDone: 0, weeklyTotal: 0 };
  const dailyDone = (stored.daily?.challenges || []).filter(c => c.completed).length;
  const weeklyDone = (stored.weekly?.challenges || []).filter(c => c.completed).length;
  return {
    dailyDone,
    dailyTotal: (stored.daily?.challenges || []).length,
    weeklyDone,
    weeklyTotal: (stored.weekly?.challenges || []).length,
  };
}
