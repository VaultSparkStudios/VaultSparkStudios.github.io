// Studio XP & Level Progression System
// Tracks cumulative XP from achievements, actions, and daily engagement.
// Persisted in localStorage.

import { safeGetJSON, safeSetJSON, MS_PER_DAY } from "./helpers.js";

const XP_KEY = "vshub_studio_xp";

// ── Level Definitions ────────────────────────────────────────────────────────
// Each level has: threshold (cumulative XP), name, title, color
export const LEVELS = [
  { level: 1,  xp: 0,     name: "Spark Initiate",     title: "Newcomer",        color: "#95a3b7" },
  { level: 2,  xp: 100,   name: "Code Kindler",       title: "Apprentice",      color: "#cd7f32" },
  { level: 3,  xp: 300,   name: "Vault Runner",       title: "Runner",          color: "#cd7f32" },
  { level: 4,  xp: 600,   name: "Circuit Breaker",    title: "Builder",         color: "#c0c0c0" },
  { level: 5,  xp: 1000,  name: "Forge Adept",        title: "Adept",           color: "#c0c0c0" },
  { level: 6,  xp: 1500,  name: "Pipeline Warden",    title: "Warden",          color: "#69b3ff" },
  { level: 7,  xp: 2200,  name: "Forge Guard",        title: "Guard",           color: "#69b3ff" },
  { level: 8,  xp: 3000,  name: "Architect",          title: "Architect",       color: "#7ae7c7" },
  { level: 9,  xp: 4000,  name: "Vault Keeper",       title: "Keeper",          color: "#ffd700" },
  { level: 10, xp: 5500,  name: "Studio Commander",   title: "Commander",       color: "#ffd700" },
  { level: 11, xp: 7500,  name: "The Sparked",        title: "Sparked",         color: "#c084fc" },
  { level: 12, xp: 10000, name: "Vault Sovereign",    title: "Sovereign",       color: "#c084fc" },
  { level: 13, xp: 15000, name: "Legendary Founder",  title: "Legend",          color: "#b9f2ff" },
];

// ── Storage ──────────────────────────────────────────────────────────────────
const DEFAULT_XP = { totalXP: 0, xpLog: [], dailyBonus: null, weeklyBonus: null };

function loadXPData() {
  const data = safeGetJSON(XP_KEY, null);
  return data || { ...DEFAULT_XP };
}

function saveXPData(data) {
  if (data.xpLog.length > 200) data.xpLog = data.xpLog.slice(-200);
  safeSetJSON(XP_KEY, data);
}

// ── XP Granting ──────────────────────────────────────────────────────────────
export function grantXP(amount, source) {
  const data = loadXPData();
  data.totalXP += amount;
  data.xpLog.push({ source, amount, ts: Date.now() });
  saveXPData(data);
  return data.totalXP;
}

// Grant daily login bonus (once per calendar day)
export function grantDailyBonus() {
  const data = loadXPData();
  const today = new Date().toISOString().slice(0, 10);
  if (data.dailyBonus === today) return 0;
  data.dailyBonus = today;
  const bonus = 15;
  data.totalXP += bonus;
  data.xpLog.push({ source: "Daily login bonus", amount: bonus, ts: Date.now() });
  saveXPData(data);
  return bonus;
}

// Check if daily bonus is available but not yet claimed
export function isDailyBonusAvailable() {
  const data = loadXPData();
  const today = new Date().toISOString().slice(0, 10);
  return data.dailyBonus !== today;
}

// Grant streak milestone bonus (called when streak reaches milestones)
export function grantStreakMilestone(streak) {
  const data = loadXPData();
  const milestoneKey = `streak_${streak}`;
  if (data.xpLog.some(e => e.source === milestoneKey)) return 0;
  let bonus = 0;
  if (streak === 7)  bonus = 50;
  else if (streak === 14) bonus = 100;
  else if (streak === 30) bonus = 200;
  else if (streak === 60) bonus = 400;
  else if (streak === 100) bonus = 750;
  if (bonus === 0) return 0;
  data.totalXP += bonus;
  data.xpLog.push({ source: milestoneKey, amount: bonus, ts: Date.now() });
  saveXPData(data);
  return bonus;
}

// Grant weekly bonus for consistent engagement (once per week)
export function grantWeeklyBonus(scoreHistory) {
  const data = loadXPData();
  const weekNum = getWeekNumber();
  if (data.weeklyBonus === weekNum) return 0;
  // Only grant if there are at least 2 history entries (shows consistent use)
  if (scoreHistory.length < 2) return 0;
  data.weeklyBonus = weekNum;
  const bonus = 50;
  data.totalXP += bonus;
  data.xpLog.push({ source: "Weekly consistency bonus", amount: bonus, ts: Date.now() });
  saveXPData(data);
  return bonus;
}

function getWeekNumber() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-W${Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7)}`;
}

// Sync XP from achievement unlocks (called when achievements evaluate)
export function syncAchievementXP(achievementUnlocked) {
  const data = loadXPData();
  // Check if these achievements are already logged
  for (const ach of achievementUnlocked) {
    const alreadyLogged = data.xpLog.some(e => e.source === `Achievement: ${ach.name}`);
    if (!alreadyLogged) {
      data.totalXP += ach.xp;
      data.xpLog.push({ source: `Achievement: ${ach.name}`, amount: ach.xp, ts: Date.now() });
    }
  }
  saveXPData(data);
  return data.totalXP;
}

// Grant XP for score improvements across session
export function grantScoreImprovementXP(allScores, scorePrev) {
  if (!scorePrev || !Object.keys(scorePrev).length) return 0;
  const data = loadXPData();
  const sessionKey = `session_score_${new Date().toISOString().slice(0, 10)}`;
  if (data.xpLog.some(e => e.source === sessionKey)) return 0; // already granted today

  let totalImprovement = 0;
  for (const s of allScores) {
    const prev = scorePrev[s.project.id];
    if (prev == null) continue;
    const delta = s.scoring.total - prev;
    if (delta > 0) totalImprovement += delta;
  }

  if (totalImprovement <= 0) return 0;

  // 2 XP per point of improvement, capped at 100
  const xp = Math.min(100, totalImprovement * 2);
  data.totalXP += xp;
  data.xpLog.push({ source: sessionKey, amount: xp, ts: Date.now() });
  saveXPData(data);
  return xp;
}

// ── Level Calculation ────────────────────────────────────────────────────────
export function getLevel(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xp) current = lvl;
    else break;
  }
  // Find next level
  const nextIdx = LEVELS.indexOf(current) + 1;
  const next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null;
  const xpInLevel = xp - current.xp;
  const xpForNext = next ? next.xp - current.xp : 0;
  const progress = next ? Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) : 100;

  return {
    ...current,
    totalXP: xp,
    xpInLevel,
    xpForNext,
    nextLevel: next,
    progress,
    isMaxLevel: !next,
  };
}

// ── State Getters ────────────────────────────────────────────────────────────
export function getXPState() {
  const data = loadXPData();
  const level = getLevel(data.totalXP);
  return {
    ...level,
    recentXP: data.xpLog.slice(-10).reverse(),
    dailyClaimed: data.dailyBonus === new Date().toISOString().slice(0, 10),
  };
}

export function getXPLog() {
  return loadXPData().xpLog.slice(-50).reverse();
}

// Compute daily login streak from daily bonus entries in XP log
export function getLoginStreak() {
  const data = loadXPData();
  const bonusDays = new Set();
  for (const entry of data.xpLog) {
    if (entry.source === "Daily login bonus") {
      bonusDays.add(new Date(entry.ts).toISOString().slice(0, 10));
    }
  }
  if (!bonusDays.size) return 0;
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 200; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (bonusDays.has(d.toISOString().slice(0, 10))) streak++;
    else break;
  }
  return streak;
}
