// Gamification Panel — renders XP bar, achievements, challenges, and vault membership
// into the main Studio Hub dashboard.

import { ACHIEVEMENTS, TIER_STYLES, getUnlockedAchievements, getAchievementStats, getNewNotifications, getAchievementProgress } from "../../utils/achievements.js";
import { getXPState, getXPLog, getLoginStreak, isDailyBonusAvailable } from "../../utils/studioXP.js";
import { getChallengeStats } from "../../utils/challenges.js";
import { fmt, renderEmptyState } from "../../utils/helpers.js";

// ── Daily Bonus Card ────────────────────────────────────────────────────────
function renderDailyBonusCard(streak) {
  const available = isDailyBonusAvailable();
  if (!available) {
    return `
      <div style="padding:0 20px 14px;">
        <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px;
                    background:rgba(106,227,178,0.06); border:1px solid rgba(106,227,178,0.15);">
          <span style="font-size:18px;">☀️</span>
          <div style="flex:1;">
            <div style="font-size:12px; font-weight:700; color:var(--green);">Daily Bonus Claimed</div>
            <div style="font-size:10px; color:var(--muted);">+15 XP · Come back tomorrow for another${streak > 1 ? ` · ${streak}-day streak!` : ""}</div>
          </div>
          <span style="font-size:10px; color:var(--green); font-weight:700;">✓</span>
        </div>
      </div>`;
  }
  return `
    <div style="padding:0 20px 14px;">
      <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px;
                  background:rgba(255,215,0,0.08); border:1px solid rgba(255,215,0,0.25);
                  animation:pulse 2s ease-in-out infinite;">
        <span style="font-size:18px;">☀️</span>
        <div style="flex:1;">
          <div style="font-size:12px; font-weight:700; color:var(--gold);">Daily Login Bonus</div>
          <div style="font-size:10px; color:var(--muted);">Claim your +15 XP for checking in today${streak > 0 ? ` · ${streak + 1}-day streak!` : ""}</div>
        </div>
        <button id="claim-daily-bonus-btn"
          style="font-size:11px; font-weight:800; padding:6px 14px; border-radius:8px;
                 background:rgba(255,215,0,0.2); border:1px solid rgba(255,215,0,0.4);
                 color:var(--gold); cursor:pointer; white-space:nowrap;
                 transition:all 0.15s;">
          Claim +15 XP
        </button>
      </div>
    </div>`;
}

// ── Next Trophy Teaser ──────────────────────────────────────────────────────
function renderNextTrophyTeaser() {
  const unlocked = getUnlockedAchievements();
  const locked = ACHIEVEMENTS.filter(a => !unlocked[a.id]);
  if (!locked.length) {
    return `
      <div style="padding:0 20px 14px;">
        <div style="display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:8px;
                    background:rgba(185,242,255,0.06); border:1px solid rgba(185,242,255,0.15);">
          <span style="font-size:14px;">🏆</span>
          <span style="font-size:11px; color:var(--cyan); font-weight:600;">All ${ACHIEVEMENTS.length} trophies unlocked — legendary status!</span>
        </div>
      </div>`;
  }
  // Pick the closest to unlocking (by tier: bronze first, then silver, etc.)
  const tierOrder = ["bronze", "silver", "gold", "diamond"];
  locked.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
  const next = locked[0];
  const tier = TIER_STYLES[next.tier];
  return `
    <div style="padding:0 20px 14px;">
      <div style="display:flex; align-items:center; gap:10px; padding:8px 14px; border-radius:8px;
                  background:${tier.bg}; border:1px solid ${tier.border};">
        <span style="font-size:16px; filter:grayscale(0.5) brightness(0.7);">${next.icon}</span>
        <div style="flex:1; min-width:0;">
          <div style="font-size:10px; color:var(--muted); letter-spacing:0.06em;">NEXT TROPHY</div>
          <div style="font-size:12px; font-weight:700; color:${tier.color}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${next.name}</div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:10px; font-weight:800; color:var(--gold);">${next.xp} XP</div>
          <div style="font-size:9px; color:${tier.color};">${tier.label}</div>
        </div>
      </div>
    </div>`;
}

// ── Streak Milestones ───────────────────────────────────────────────────────
function renderStreakMilestones(streak) {
  if (streak < 2) return "";
  const milestones = [
    { days: 7,   xp: 50,  label: "Week Warrior",     icon: "🔥" },
    { days: 14,  xp: 100, label: "Two-Week Titan",    icon: "⚡" },
    { days: 30,  xp: 200, label: "Monthly Machine",   icon: "🏆" },
    { days: 60,  xp: 400, label: "Iron Discipline",   icon: "💎" },
    { days: 100, xp: 750, label: "Centurion",         icon: "👑" },
  ];
  // Find the next milestone
  const next = milestones.find(m => streak < m.days);
  if (!next) return `
    <div style="padding:0 20px 14px;">
      <div style="padding:8px 14px; border-radius:8px; background:rgba(185,242,255,0.06); border:1px solid rgba(185,242,255,0.15);">
        <div style="font-size:11px; color:var(--cyan); font-weight:700;">👑 ${streak}-day streak! All milestones reached!</div>
      </div>
    </div>`;
  const progress = Math.round((streak / next.days) * 100);
  return `
    <div style="padding:0 20px 14px;">
      <div style="padding:10px 14px; border-radius:8px; background:rgba(255,200,116,0.05); border:1px solid rgba(255,200,116,0.12);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
          <span style="font-size:11px; color:var(--gold); font-weight:700;">${next.icon} Streak: ${streak}/${next.days} days to ${next.label}</span>
          <span style="font-size:10px; color:var(--gold); font-weight:600;">+${next.xp} XP</span>
        </div>
        <div style="height:5px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden;">
          <div style="width:${progress}%; height:100%; background:var(--gold); border-radius:3px; transition:width 0.4s;"></div>
        </div>
      </div>
    </div>`;
}

// ── XP & Level Bar ───────────────────────────────────────────────────────────
export function renderXPBar() {
  const xp = getXPState();
  const stats = getAchievementStats();
  const challenges = getChallengeStats();

  const barColor = xp.color || "var(--cyan)";
  const nextName = xp.nextLevel ? xp.nextLevel.name : "MAX";
  const xpNeeded = xp.nextLevel ? `${fmt(xp.xpForNext - xp.xpInLevel)} XP to next` : "Max level reached";
  const streak = getLoginStreak();

  return `
    <div class="panel" style="margin-bottom:24px; overflow:hidden;">
      <div style="padding:18px 20px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="
            width:44px; height:44px; border-radius:50%;
            background:${barColor}18; border:2px solid ${barColor};
            display:flex; align-items:center; justify-content:center;
            font-size:18px; font-weight:800; color:${barColor};
          ">${xp.level}</div>
          <div>
            <div style="font-size:14px; font-weight:700; color:var(--text);">${xp.name}</div>
            <div style="font-size:11px; color:var(--muted);">${xp.title} · Level ${xp.level}${xp.isMaxLevel ? " (MAX)" : ""}</div>
          </div>
        </div>
        <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
          <div style="text-align:center;">
            <div style="font-size:18px; font-weight:800; color:var(--gold);">${fmt(xp.totalXP)}</div>
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em;">Total XP</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:18px; font-weight:800; color:var(--cyan);">${stats.unlockedCount}/${stats.total}</div>
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em;">Trophies</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:18px; font-weight:800; color:var(--green);">${challenges.dailyDone + challenges.weeklyDone}/${challenges.dailyTotal + challenges.weeklyTotal}</div>
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em;">Challenges</div>
          </div>
          ${streak > 0 ? `
          <div style="text-align:center;">
            <div style="font-size:18px; font-weight:800; color:${streak >= 7 ? "var(--red)" : streak >= 3 ? "var(--gold)" : "var(--muted)"};">\uD83D\uDD25 ${streak}</div>
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em;">Streak</div>
          </div>` : ""}
        </div>
      </div>
      ${!xp.isMaxLevel ? `
        <div style="padding:0 20px 16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <span style="font-size:10px; color:var(--muted);">Level ${xp.level} → ${xp.nextLevel.level} ${nextName}</span>
            <span style="font-size:10px; color:${barColor}; font-weight:700;">${xp.progress}% · ${xpNeeded}</span>
          </div>
          <div style="height:8px; background:rgba(255,255,255,0.07); border-radius:4px; overflow:hidden;">
            <div style="
              width:${xp.progress}%; height:100%; border-radius:4px;
              background:linear-gradient(90deg, ${barColor}, ${barColor}cc);
              transition:width 0.6s ease;
            "></div>
          </div>
        </div>
      ` : `
        <div style="padding:0 20px 16px;">
          <div style="height:8px; background:linear-gradient(90deg, #c084fc, #b9f2ff, #ffd700); border-radius:4px; opacity:0.8;"></div>
        </div>
      `}
      ${renderDailyBonusCard(streak)}
      ${renderNextTrophyTeaser()}
      ${renderStreakMilestones(streak)}
    </div>
  `;
}

// ── Achievement Notification Toast ───────────────────────────────────────────
export function renderAchievementToasts() {
  const notifs = getNewNotifications();
  if (!notifs.length) return "";

  return `
    <div id="achievement-toasts" style="
      position:fixed; top:20px; right:20px; z-index:9999;
      display:flex; flex-direction:column; gap:10px;
      pointer-events:none;
    ">
      ${notifs.map(n => {
        const tier = TIER_STYLES[n.tier] || TIER_STYLES.bronze;
        return `
          <div class="achievement-toast" data-achievement-dismiss="${n.id}" style="
            pointer-events:auto; cursor:pointer;
            background:var(--panel); border:2px solid ${tier.border};
            border-radius:14px; padding:14px 18px; min-width:280px;
            box-shadow:0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${tier.color}22;
            display:flex; align-items:center; gap:12px;
            animation:achievementSlideIn 0.5s ease-out, achievementGlow 2s ease-in-out infinite;
          ">
            <div style="font-size:28px; line-height:1;">${n.icon}</div>
            <div style="flex:1;">
              <div style="font-size:10px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:${tier.color}; margin-bottom:2px;">
                ${tier.label} Trophy Unlocked!
              </div>
              <div style="font-size:14px; font-weight:700; color:var(--text);">${n.name}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:14px; font-weight:800; color:var(--gold);">+${n.xp}</div>
              <div style="font-size:9px; color:var(--muted);">XP</div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ── Trophy Showcase ──────────────────────────────────────────────────────────
export function renderTrophyShowcase(progressContext = {}) {
  const unlocked = getUnlockedAchievements();
  const stats = getAchievementStats();

  const categories = [
    { id: "milestones",  label: "Milestones" },
    { id: "grades",      label: "Grades" },
    { id: "streaks",     label: "Streaks" },
    { id: "portfolio",   label: "Portfolio" },
    { id: "community",   label: "Community" },
    { id: "governance",  label: "Governance" },
    { id: "special",     label: "Special" },
  ];

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">TROPHY ROOM</span>
        <span style="font-size:11px; color:var(--muted);">${stats.unlockedCount}/${stats.total} unlocked (${stats.pct}%)</span>
      </div>
      <div class="panel-body">
        <div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap;">
          ${Object.entries(stats.byTier).map(([tier, count]) => {
            const s = TIER_STYLES[tier];
            return `
              <div style="display:flex; align-items:center; gap:4px; padding:3px 8px; border-radius:6px;
                          background:${s.bg}; border:1px solid ${s.border};">
                <span style="font-size:11px; font-weight:700; color:${s.color};">${count}</span>
                <span style="font-size:10px; color:${s.color}; opacity:0.8;">${s.label}</span>
              </div>
            `;
          }).join("")}
        </div>

        <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; border-bottom:1px solid var(--border); padding-bottom:10px;">
          ${categories.map(cat => {
            const catAch = ACHIEVEMENTS.filter(a => a.category === cat.id);
            const catUnlocked = catAch.filter(a => unlocked[a.id]).length;
            return `<span style="font-size:10px; color:${catUnlocked === catAch.length ? "var(--green)" : "var(--muted)"}; font-weight:600; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.04);" title="${catUnlocked}/${catAch.length} ${cat.label}">${cat.label} ${catUnlocked}/${catAch.length}</span>`;
          }).join("")}
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:8px;">
          ${ACHIEVEMENTS.map(a => {
            const isUnlocked = !!unlocked[a.id];
            const tier = TIER_STYLES[a.tier];
            const ts = unlocked[a.id]?.ts;
            const dateStr = ts ? new Date(ts).toLocaleDateString() : "";
            return `
              <div style="
                display:flex; align-items:center; gap:10px;
                padding:10px 12px; border-radius:10px;
                background:${isUnlocked ? tier.bg : "rgba(255,255,255,0.02)"};
                border:1px solid ${isUnlocked ? tier.border : "rgba(255,255,255,0.06)"};
                opacity:${isUnlocked ? 1 : 0.4};
                transition:opacity 0.2s;
              " title="${a.desc}${dateStr ? ` · Unlocked ${dateStr}` : ""}">
                <div style="font-size:22px; line-height:1; ${isUnlocked ? "" : "filter:grayscale(1) brightness(0.5);"}">${a.icon}</div>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:12px; font-weight:700; color:${isUnlocked ? tier.color : "var(--muted)"}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.name}</div>
                  <div style="font-size:10px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.desc}</div>
                  ${(() => {
                    if (isUnlocked) return "";
                    const prog = getAchievementProgress(a.id, progressContext);
                    if (!prog) return "";
                    const pct = Math.min(100, Math.round((prog.current / prog.target) * 100));
                    return `<div style="margin-top:4px; display:flex; align-items:center; gap:6px;">
                      <div style="flex:1; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                        <div style="width:${pct}%; height:100%; background:${tier.color}; border-radius:2px; transition:width 0.4s;"></div>
                      </div>
                      <span style="font-size:9px; color:var(--muted); white-space:nowrap;">${prog.current}/${prog.target}</span>
                    </div>`;
                  })()}
                </div>
                <div style="text-align:right; flex-shrink:0;">
                  <div style="font-size:10px; font-weight:800; color:${isUnlocked ? "var(--gold)" : "var(--muted)"};">${a.xp} XP</div>
                  <div style="font-size:9px; color:${tier.color}; font-weight:600;">${tier.label}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Challenge Panel ──────────────────────────────────────────────────────────
export function renderChallengePanel(activeChallenges) {
  if (!activeChallenges) return "";
  const { daily = [], weekly = [] } = activeChallenges;

  function renderChallenge(ch, type) {
    const done = ch.completed;
    const claimed = ch.claimed;
    return `
      <div style="
        display:flex; align-items:center; gap:10px;
        padding:10px 14px; border-radius:10px;
        background:${done ? "rgba(106,227,178,0.06)" : "rgba(255,255,255,0.03)"};
        border:1px solid ${done ? "rgba(106,227,178,0.2)" : "rgba(255,255,255,0.06)"};
        ${claimed ? "opacity:0.5;" : ""}
      ">
        <div style="font-size:20px; line-height:1;">${ch.icon}</div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:12px; font-weight:700; color:${done ? "var(--green)" : "var(--text)"};">${ch.name}</span>
            <span style="font-size:9px; padding:1px 5px; border-radius:4px; font-weight:700; letter-spacing:0.05em;
                         background:${type === "weekly" ? "rgba(105,179,255,0.12)" : "rgba(255,200,116,0.12)"};
                         color:${type === "weekly" ? "var(--blue)" : "var(--gold)"};">${type === "weekly" ? "WEEKLY" : "DAILY"}</span>
          </div>
          <div style="font-size:11px; color:var(--muted);">${ch.desc}</div>
        </div>
        <div style="text-align:center; flex-shrink:0;">
          ${done && !claimed ? `
            <button data-claim-challenge="${ch.id}" data-challenge-type="${type}"
              style="font-size:10px; font-weight:800; padding:4px 10px; border-radius:6px;
                     background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.35);
                     color:var(--gold); cursor:pointer; white-space:nowrap;">
              Claim +${ch.xp} XP
            </button>
          ` : done ? `
            <span style="font-size:10px; color:var(--green); font-weight:700;">Claimed ✓</span>
          ` : `
            <span style="font-size:11px; font-weight:800; color:var(--muted);">${ch.xp} XP</span>
          `}
        </div>
      </div>
    `;
  }

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">ACTIVE CHALLENGES</span>
        <span style="font-size:11px; color:var(--muted);">Complete for XP rewards</span>
      </div>
      <div class="panel-body" style="display:flex; flex-direction:column; gap:8px;">
        ${daily.map(ch => renderChallenge(ch, "daily")).join("")}
        ${weekly.map(ch => renderChallenge(ch, "weekly")).join("")}
        ${daily.length === 0 && weekly.length === 0 ? renderEmptyState("\uD83C\uDFAF", "No Active Challenges", "Challenges refresh daily and weekly — check back tomorrow for new goals and XP rewards!") : ""}
      </div>
    </div>
  `;
}

// ── Vault Membership Integration Panel ───────────────────────────────────────
export function renderVaultMembershipPanel(sbData) {
  const members = sbData?.members;
  if (!members) return "";

  const tiers = [
    { name: "Spark Initiate", rank: 0, icon: "⚡", color: "#95a3b7", desc: "New member" },
    { name: "Vault Runner",   rank: 1, icon: "🏃", color: "#cd7f32", desc: "Active participant" },
    { name: "Forge Guard",    rank: 2, icon: "🛡️", color: "#c0c0c0", desc: "Trusted contributor" },
    { name: "Vault Keeper",   rank: 3, icon: "🔑", color: "#ffd700", desc: "Core member" },
    { name: "The Sparked",    rank: 4, icon: "👑", color: "#b9f2ff", desc: "Legendary status" },
  ];

  // Calculate growth metrics
  const growthRate = members.total > 0 && members.newThisWeek > 0
    ? Math.round((members.newThisWeek / members.total) * 100) : 0;
  const monthlyRate = members.total > 0 && members.newThisMonth > 0
    ? Math.round((members.newThisMonth / members.total) * 100) : 0;

  // Growth sparkline from recent joins
  const recentJoins = members.recentJoins || [];
  const joinsByDay = {};
  for (const ts of recentJoins) {
    const day = new Date(ts).toISOString().slice(0, 10);
    joinsByDay[day] = (joinsByDay[day] || 0) + 1;
  }
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    last7Days.push(joinsByDay[d] || 0);
  }
  const maxJoins = Math.max(...last7Days, 1);

  // Points economy summary
  const economy = sbData?.economy;
  const totalPoints = economy?.total || 0;
  const avgPerMember = members.total > 0 ? Math.round(totalPoints / members.total) : 0;

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">VAULT MEMBERSHIP</span>
        <span style="font-size:11px; color:var(--muted);">
          <a href="https://vaultsparkstudios.com" target="_blank" rel="noopener" style="color:var(--cyan); text-decoration:none;">vaultsparkstudios.com</a>
        </span>
      </div>
      <div class="panel-body">
        <div style="display:flex; gap:16px; margin-bottom:18px; flex-wrap:wrap;">
          <div style="flex:1; min-width:140px; text-align:center; padding:14px; background:rgba(122,231,199,0.05); border-radius:12px; border:1px solid rgba(122,231,199,0.15);">
            <div style="font-size:28px; font-weight:800; color:var(--cyan); line-height:1;">${fmt(members.total)}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:4px; text-transform:uppercase; letter-spacing:0.06em;">Total Members</div>
          </div>
          <div style="flex:1; min-width:140px; text-align:center; padding:14px; background:rgba(106,227,178,0.05); border-radius:12px; border:1px solid rgba(106,227,178,0.15);">
            <div style="font-size:28px; font-weight:800; color:var(--green); line-height:1;">+${members.newThisWeek || 0}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:4px; text-transform:uppercase; letter-spacing:0.06em;">This Week</div>
            ${growthRate > 0 ? `<div style="font-size:10px; color:var(--green); margin-top:2px;">${growthRate}% growth</div>` : ""}
          </div>
          <div style="flex:1; min-width:140px; text-align:center; padding:14px; background:rgba(105,179,255,0.05); border-radius:12px; border:1px solid rgba(105,179,255,0.15);">
            <div style="font-size:28px; font-weight:800; color:var(--blue); line-height:1;">+${members.newThisMonth || 0}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:4px; text-transform:uppercase; letter-spacing:0.06em;">This Month</div>
            ${monthlyRate > 0 ? `<div style="font-size:10px; color:var(--blue); margin-top:2px;">${monthlyRate}% growth</div>` : ""}
          </div>
        </div>

        <div style="margin-bottom:18px;">
          <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">7-Day Join Activity</div>
          <div style="display:flex; align-items:flex-end; gap:4px; height:32px;">
            ${last7Days.map((n, i) => {
              const h = Math.round((n / maxJoins) * 32);
              const dayLabel = ["7d","6d","5d","4d","3d","2d","1d"][i];
              return `<div title="${n} join${n !== 1 ? "s" : ""} ${dayLabel} ago" style="
                flex:1; height:${Math.max(h, 3)}px;
                background:${n > 0 ? "var(--cyan)" : "rgba(255,255,255,0.07)"};
                border-radius:3px; opacity:${n > 0 ? 0.5 + (n / maxJoins) * 0.5 : 0.3};
                transition:height 0.3s ease;
              "></div>`;
            }).join("")}
          </div>
        </div>

        <div style="margin-bottom:18px;">
          <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;">Membership Tiers</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${tiers.map(t => `
              <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px;
                          background:${t.color}08; border:1px solid ${t.color}20;">
                <span style="font-size:18px; line-height:1;">${t.icon}</span>
                <div style="flex:1;">
                  <div style="font-size:12px; font-weight:700; color:${t.color};">${t.name}</div>
                  <div style="font-size:10px; color:var(--muted);">${t.desc}</div>
                </div>
                <div style="font-size:9px; padding:2px 6px; border-radius:4px; background:${t.color}15; color:${t.color}; font-weight:700;">
                  Rank ${t.rank}
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        ${economy ? `
          <div>
            <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">Points Economy</div>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <div style="padding:8px 14px; background:rgba(255,215,0,0.06); border:1px solid rgba(255,215,0,0.15); border-radius:8px;">
                <div style="font-size:16px; font-weight:800; color:var(--gold);">${fmt(totalPoints)}</div>
                <div style="font-size:10px; color:var(--muted);">Total Awarded</div>
              </div>
              <div style="padding:8px 14px; background:rgba(192,132,252,0.06); border:1px solid rgba(192,132,252,0.15); border-radius:8px;">
                <div style="font-size:16px; font-weight:800; color:var(--purple);">${fmt(avgPerMember)}</div>
                <div style="font-size:10px; color:var(--muted);">Avg per Member</div>
              </div>
            </div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

// ── XP Activity Feed ─────────────────────────────────────────────────────────
export function renderXPActivityFeed() {
  const log = getXPLog();
  if (!log.length) return "";

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">XP ACTIVITY</span>
        <span style="font-size:11px; color:var(--muted);">Recent XP gains</span>
      </div>
      <div class="panel-body" style="max-height:200px; overflow-y:auto;">
        ${log.slice(0, 15).map(entry => {
          const timeStr = new Date(entry.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="font-size:12px; color:var(--text); flex:1;">${entry.source}</span>
              <span style="font-size:12px; font-weight:800; color:var(--gold); margin:0 12px;">+${entry.amount} XP</span>
              <span style="font-size:10px; color:var(--muted); white-space:nowrap;">${timeStr}</span>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}
