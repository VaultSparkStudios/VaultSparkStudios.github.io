// analyticsView.js — VaultSpark Analytics Hub
// Replaces Google Analytics. 10 proprietary composite scores across game, web, GitHub, studio dimensions.

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject, getGrade } from "../utils/projectScoring.js";
import { fmt, timeAgo, daysSince, ciStatus, scoreColor, scoreGrade } from "../utils/helpers.js";
import { forecastScores, getOverallForecastAccuracy, monteCarloForecast } from "../utils/scoreForecast.js";
import { deltaBadge } from "./hub/hubHelpers.js";
import { getScoreAnomalies } from "./hub/morningBrief.js";
import { computeWebsiteHealthScore, SITE_PAGES, SITE_URL } from "../data/websiteAnalytics.js";

// ── SVG helpers ───────────────────────────────────────────────────────────────
function sparkline(values, { w = 200, h = 44, color = "var(--cyan)", fill = true } = {}) {
  const clean = (values || []).filter((v) => v != null);
  if (clean.length < 2) return `<span style="color:var(--muted);font-size:10px;">not enough data</span>`;
  const mn = Math.min(...clean);
  const mx = Math.max(...clean);
  const range = mx - mn || 1;
  const pts = clean.map((v, i) => {
    const x = (i / (clean.length - 1)) * (w - 6) + 3;
    const y = h - 4 - ((v - mn) / range) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = pts.split(" ").pop().split(",");
  const lx = parseFloat(last[0]);
  const ly = parseFloat(last[1]);
  const fillPoly = fill ? `<polygon points="3,${h} ${pts} ${lx},${h}" fill="${color}" opacity="0.12"/>` : "";
  return `<svg width="${w}" height="${h}" style="display:block;overflow:visible" aria-hidden="true">
    ${fillPoly}
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx}" cy="${ly}" r="2.5" fill="${color}"/>
  </svg>`;
}

function miniBar(value, max, color = "var(--cyan)", h = 6) {
  const pct = Math.round(Math.min(100, Math.max(0, (value / (max || 1)) * 100)));
  return `<div style="height:${h}px;background:var(--border);border-radius:3px;overflow:hidden;flex:1;">
    <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.4s;"></div>
  </div>`;
}

// ── Score tile ────────────────────────────────────────────────────────────────
function scoreTile(label, value, { sub = "", note = "" } = {}) {
  const pct   = value == null ? 0 : Math.round(Math.min(100, value));
  const disp  = value == null ? "—" : Math.round(value);
  const color = scoreColor(value);
  const grade = scoreGrade(value);
  return `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;
                min-width:110px;flex:1;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:4px;">
      <div style="position:absolute;bottom:0;left:0;width:${pct}%;height:3px;background:${color};border-radius:0;"></div>
      <div style="font-size:9px;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">${label}</div>
      <div style="display:flex;align-items:baseline;gap:7px;">
        <span style="font-size:28px;font-weight:900;color:${color};line-height:1;font-variant-numeric:tabular-nums;">${disp}</span>
        <span style="font-size:13px;font-weight:700;color:${color};opacity:0.7;">${grade}</span>
      </div>
      ${sub  ? `<div style="font-size:10px;color:var(--muted);">${sub}</div>` : ""}
      ${note ? `<div style="font-size:9px;color:var(--muted);opacity:0.65;font-style:italic;">${note}</div>` : ""}
    </div>`;
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function section(title, icon, content) {
  return `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px 22px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border);">
        <span style="font-size:16px;">${icon}</span>
        <span style="font-size:14px;font-weight:700;color:var(--text);">${title}</span>
      </div>
      ${content}
    </div>`;
}

function kv(k, v, accent = "var(--cyan)") {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
    <span style="font-size:11px;color:var(--muted);">${k}</span>
    <span style="font-size:12px;font-weight:600;color:${accent};">${v}</span>
  </div>`;
}

function statCard(label, value, sub = "") {
  return `<div style="flex:1;min-width:110px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">
    <div style="font-size:9px;color:var(--muted);margin-bottom:4px;letter-spacing:0.08em;">${label}</div>
    <div style="font-size:24px;font-weight:900;color:var(--cyan);">${value}</div>
    ${sub ? `<div style="font-size:10px;color:var(--muted);">${sub}</div>` : ""}
  </div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// 10 PROPRIETARY COMPOSITE SCORES
// ════════════════════════════════════════════════════════════════════════════

// 1. Studio Vitality Index (SVI 0–100) — overall operational health
function computeSVI(ghData, sbData, scoreHistory, alertCount) {
  let score = 0;
  const active = PROJECTS.filter((p) => p.status !== "archived");
  const oneWeekAgo = Date.now() - 7 * 86400000;

  // CI pass rate (0–25)
  const withCI  = active.filter((p) => ghData[p.githubRepo]?.ciRuns?.length > 0);
  const passing = withCI.filter((p) => ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "success");
  const ciPassRate = withCI.length > 0 ? passing.length / withCI.length : 0;
  score += ciPassRate * 25;

  // Weekly commits across portfolio (0–20)
  let totalWeekCommits = 0;
  for (const p of active) {
    const commits = ghData[p.githubRepo]?.commits || [];
    totalWeekCommits += commits.filter((c) => new Date(c.date).getTime() > oneWeekAgo).length;
  }
  const commitScore = Math.min(20, (totalWeekCommits / Math.max(1, active.length)) * 4);
  score += commitScore;

  // Member growth (0–15)
  const mem = sbData?.members;
  if (mem?.total > 0) {
    score += Math.min(15, ((mem.newThisWeek || 0) / mem.total) * 500);
  } else if (mem) {
    score += 5;
  }

  // Score trend (0–20)
  if (scoreHistory.length >= 3) {
    const recent = scoreHistory.slice(-3).map((snap) => {
      const vals = Object.values(snap.scores || {}).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    const d1 = recent[2] - recent[1];
    const d2 = recent[1] - recent[0];
    if (d1 > 0 && d2 > 0) score += 20;
    else if (d1 > 0)       score += 14;
    else if (d1 >= 0)      score += 8;
    else                   score += 2;
  } else {
    score += 10;
  }

  // Alert density (0–20)
  score += Math.max(0, 20 - Math.min(20, (alertCount || 0) * 4));

  const svi = Math.round(Math.min(100, Math.max(0, score)));

  let trend = "→";
  if (scoreHistory.length >= 2) {
    const avg = (snap) => {
      const vals = Object.values(snap.scores || {}).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    const diff = avg(scoreHistory[scoreHistory.length - 1]) - avg(scoreHistory[scoreHistory.length - 2]);
    trend = diff > 0.5 ? "↑" : diff < -0.5 ? "↓" : "→";
  }

  return { svi, trend, ciPassRate: Math.round(ciPassRate * 100), totalWeekCommits };
}

// 2. Portfolio Balance Score (PBS 0–100) — score distribution evenness
function computePBS(allScores) {
  const vals = allScores.map((s) => s.total).filter((v) => v != null && v >= 0);
  if (vals.length < 2) return { pbs: null, cv: null, lowestProject: null, highestProject: null };

  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const stdDev = Math.sqrt(vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / vals.length);
  const cv = mean > 0 ? stdDev / mean : 1;

  let pbs;
  if (cv < 0.10)      pbs = 95;
  else if (cv < 0.15) pbs = 85;
  else if (cv < 0.20) pbs = 75;
  else if (cv < 0.25) pbs = 62;
  else if (cv < 0.35) pbs = 48;
  else if (cv < 0.50) pbs = 30;
  else                pbs = 15;

  if (vals.every((v) => v >= 35)) pbs = Math.min(100, pbs + 10);

  const sorted = [...allScores].sort((a, b) => a.total - b.total);
  return {
    pbs: Math.round(pbs),
    cv: cv.toFixed(2),
    lowestProject: sorted[0]?.name,
    lowestScore:   sorted[0]?.total,
    highestProject: sorted[sorted.length - 1]?.name,
    highestScore:   sorted[sorted.length - 1]?.total,
    mean: Math.round(mean),
    stdDev: Math.round(stdDev),
  };
}

// 3. Release Cadence Rating (RCR 0–100) — shipping consistency
function computeRCR(ghData) {
  const active = PROJECTS.filter((p) => p.status !== "archived" && p.githubRepo);
  let pts = 0;
  let activeReleasers = 0;
  let daysSinceAny = Infinity;
  const recentReleasers = [];

  for (const p of active) {
    const rel = ghData[p.githubRepo]?.latestRelease;
    if (!rel?.publishedAt) continue;
    const age = daysSince(rel.publishedAt);
    daysSinceAny = Math.min(daysSinceAny, age);
    if (age <= 7)       { pts += 3; activeReleasers++; recentReleasers.push(p.name); }
    else if (age <= 30) { pts += 2; activeReleasers++; recentReleasers.push(p.name); }
    else if (age <= 90) { pts += 1; }
  }

  if (pts === 0) return { rcr: 5, activeReleasers: 0, daysSinceAnyRelease: null, recentReleasers: [] };

  let rcr = (pts / Math.max(1, active.length * 3)) * 80;
  if (activeReleasers >= 3) rcr += 20;
  else if (activeReleasers >= 2) rcr += 10;
  if (daysSinceAny > 90) rcr = Math.max(0, rcr - 30);

  return {
    rcr: Math.round(Math.min(100, rcr)),
    activeReleasers,
    daysSinceAnyRelease: daysSinceAny === Infinity ? null : Math.round(daysSinceAny),
    recentReleasers,
  };
}

// 4. CI Reliability Score (CRS 0–100) — CI infrastructure health
function computeCRS(ghData, scoreHistory) {
  const active  = PROJECTS.filter((p) => p.status !== "archived" && p.githubRepo);
  const withCI  = active.filter((p) => ghData[p.githubRepo]?.ciRuns?.length > 0);
  const passing = withCI.filter((p) => ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "success");
  const failing = withCI.filter((p) => ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "failure");

  const passRate = withCI.length > 0 ? passing.length / withCI.length : 0;
  const coverage = active.length > 0 ? withCI.length / active.length : 0;
  let score = passRate * 40 + coverage * 30;

  // Trend bonus
  if (scoreHistory.length >= 3) {
    const rates = scoreHistory.slice(-3).map((snap) => {
      const ciVals = Object.values(snap.ci || {}).filter((v) => v != null);
      return ciVals.length > 0 ? ciVals.filter((v) => v === "success").length / ciVals.length : null;
    }).filter((v) => v != null);
    if (rates.length >= 2) {
      const d = rates[rates.length - 1] - rates[rates.length - 2];
      if (d > 0.05) score += 20;
      else if (d >= -0.05) score += 10;
    }
  }

  // Green streak bonus
  let streakBonus = 0;
  for (const p of withCI) {
    const runs = ghData[p.githubRepo]?.ciRuns || [];
    if (runs.length >= 2 && runs.every((r) => r.conclusion === "success")) streakBonus++;
  }
  score += Math.min(10, streakBonus * 2);

  return {
    crs: Math.round(Math.min(100, Math.max(0, score))),
    passRate: Math.round(passRate * 100),
    ciCoverage: Math.round(coverage * 100),
    failingRepos: failing.map((p) => p.name),
    passingCount: passing.length,
    totalWithCI:  withCI.length,
    totalActive:  active.length,
  };
}

// 5. Community Reach Score (CRS2 0–100) — cross-platform social footprint
function computeCRS2(socialData) {
  if (!socialData) return { crs2: 0, totalReach: 0, breakdown: {}, ytSubs: null, rdSubs: null, bskyFollowers: null, gmSalesCount: 0 };
  let score = 0;
  const breakdown = {};

  const yt = socialData.youtube;
  if (yt?.subscribers != null) {
    const subs = yt.subscribers;
    const ytPts = subs >= 100000 ? 30 : subs >= 10000 ? 20 : subs >= 1000 ? 12 : subs >= 100 ? 5 : 1;
    score += ytPts;
    breakdown.YouTube = ytPts;
  }

  const rd = socialData.reddit;
  if (rd?.subscribers != null) {
    const rdPts = rd.subscribers >= 5000 ? 20 : rd.subscribers >= 1000 ? 15 : rd.subscribers >= 500 ? 10 : rd.subscribers >= 100 ? 5 : 1;
    score += rdPts;
    breakdown.Reddit = rdPts;
  }

  const bsky = socialData.bluesky;
  if (bsky?.followers != null) {
    const bsPts = bsky.followers >= 1000 ? 15 : bsky.followers >= 500 ? 12 : bsky.followers >= 200 ? 7 : bsky.followers >= 50 ? 3 : 1;
    score += bsPts;
    breakdown.Bluesky = bsPts;
  }

  const gmSales = socialData.gumroadSales;
  if (socialData.gumroad?.hasToken) {
    const cnt = gmSales?.length || 0;
    const gmPts = cnt >= 500 ? 20 : cnt >= 200 ? 15 : cnt >= 50 ? 10 : cnt >= 10 ? 5 : cnt > 0 ? 2 : 0;
    score += gmPts;
    breakdown.Gumroad = gmPts;
  }

  // Content freshness (0–15)
  let fresh = 0;
  const latestVid  = yt?.latestVideos?.[0]?.publishedAt;
  const latestPost = bsky?.latestPosts?.[0]?.createdAt || rd?.latestPosts?.[0]?.createdAt;
  if (latestVid  && daysSince(latestVid)  <= 7)  fresh += 8;
  else if (latestVid  && daysSince(latestVid)  <= 30) fresh += 4;
  if (latestPost && daysSince(latestPost) <= 7)  fresh += 7;
  else if (latestPost && daysSince(latestPost) <= 30) fresh += 3;
  score += fresh;
  breakdown.Freshness = fresh;

  const totalReach = (yt?.subscribers || 0) + (rd?.subscribers || 0) + (bsky?.followers || 0);
  return {
    crs2: Math.round(Math.min(100, Math.max(0, score))),
    totalReach,
    breakdown,
    ytSubs:       yt?.subscribers ?? null,
    rdSubs:       rd?.subscribers ?? null,
    bskyFollowers: bsky?.followers ?? null,
    gmSalesCount: gmSales?.length || 0,
  };
}

// 6. Developer Throughput Index (DTI 0–100) — development velocity
function computeDTI(ghData) {
  const active = PROJECTS.filter((p) => p.status !== "archived" && p.githubRepo);
  const oneWeekAgo  = Date.now() - 7  * 86400000;
  const twoWeeksAgo = Date.now() - 14 * 86400000;

  let weeklyCommits = 0;
  let activeDev     = 0;
  let freshPRs      = 0;
  let deployedInPeriod = 0;

  for (const p of active) {
    const rd = ghData[p.githubRepo];
    if (!rd) continue;
    const wk = (rd.commits || []).filter((c) => new Date(c.date).getTime() > oneWeekAgo).length;
    weeklyCommits += wk;
    if (wk > 0) activeDev++;
    freshPRs += (rd.prs || []).filter((pr) => !pr.draft && new Date(pr.createdAt).getTime() > oneWeekAgo).length;
    if ((rd.deployments || []).some((d) => new Date(d.createdAt).getTime() > twoWeeksAgo)) deployedInPeriod++;
  }

  const n = Math.max(1, active.length);
  let score = 0;
  score += Math.min(40, (weeklyCommits / n) * 8);  // avg commits/project * 8, capped 40
  score += Math.min(25, freshPRs * 5);
  score += (deployedInPeriod / n) * 20;
  score += (activeDev / n) * 15;

  return {
    dti: Math.round(Math.min(100, Math.max(0, score))),
    weeklyCommits,
    activeDev,
    freshPRs,
    deployedInPeriod,
    totalActive: active.length,
  };
}

// 7. Studio OS Compliance Rate (SOCR 0–100)
function computeSOCR() {
  const active = PROJECTS.filter((p) => p.status !== "archived");
  if (active.length === 0) return { socr: 0, compliant: 0, total: 0, nonCompliant: [] };

  let wTotal = 0;
  let wCompliant = 0;
  const nonCompliant = [];

  for (const p of active) {
    const w = (p.status === "live" || p.status === "client-beta") ? 2 : 1;
    wTotal += w;
    if (p.studioOsApplied) wCompliant += w;
    else nonCompliant.push(p);
  }

  return {
    socr: Math.round((wCompliant / wTotal) * 100),
    compliant: active.filter((p) => p.studioOsApplied).length,
    total: active.length,
    nonCompliant,
  };
}

// 8. Engagement Concentration Index (ECI 0–100) — player engagement spread (inverted HHI)
function computeECI(sbData) {
  const sessions = sbData?.sessions;
  if (!sessions) return { eci: null, topGame: null, topGameShare: null, gamesWithSessions: 0, totalSessions: 0 };

  const entries = Object.entries(sessions).filter(([, v]) => (v?.week || 0) > 0);
  const total   = entries.reduce((s, [, v]) => s + (v.week || 0), 0);
  if (total === 0 || entries.length === 0) return { eci: null, topGame: null, topGameShare: null, gamesWithSessions: 0, totalSessions: 0 };
  if (entries.length === 1) {
    const proj = PROJECTS.find((p) => p.supabaseGameSlug === entries[0][0]);
    return { eci: 20, topGame: proj?.name || entries[0][0], topGameShare: 100, gamesWithSessions: 1, totalSessions: total };
  }

  const shares = entries.map(([slug, v]) => ({ slug, share: v.week / total, week: v.week }));
  const hhi    = shares.reduce((s, e) => s + Math.pow(e.share, 2), 0);
  const eci    = Math.round((1 - hhi) * 100);
  const top    = shares.sort((a, b) => b.share - a.share)[0];
  const topProj = PROJECTS.find((p) => p.supabaseGameSlug === top.slug);

  return { eci, topGame: topProj?.name || top.slug, topGameShare: Math.round(top.share * 100), gamesWithSessions: entries.length, totalSessions: total, shares };
}

// 9. Forecast Confidence Rating (FCR 0–100)
function computeFCR() {
  const acc = getOverallForecastAccuracy();
  if (!acc || acc.total < 5) return { fcr: null, total: acc?.total || 0, correct: acc?.correct || 0 };
  return { fcr: Math.round(acc.rate * 100), total: acc.total, correct: acc.correct };
}

// 10. Agent Activity Score (AAS 0–100)
function computeAAS(beaconData, agentRequests, agentRunHistory, portfolioFreshness) {
  let score = 0;

  // Active beacon sessions (0–40)
  const activeSessions = beaconData?.active?.length || 0;
  score += Math.min(40, activeSessions * 20);

  // Request queue (0–20) — healthy if 1–5
  const pending = (agentRequests || []).length;
  if (pending >= 1 && pending <= 5) score += 20;
  else if (pending > 5 && pending <= 10) score += 10;
  else if (pending > 10) score += 5;

  // File freshness (0–25)
  const freshEntries = Object.values(portfolioFreshness || {});
  if (freshEntries.length > 0) {
    const fresh = freshEntries.filter((e) => (e.daysOld || 0) <= 14).length;
    score += (fresh / freshEntries.length) * 25;
  }

  // Run history (0–15)
  score += Math.min(15, Object.keys(agentRunHistory || {}).length * 3);

  const freshFileRatio = (() => {
    const entries = Object.values(portfolioFreshness || {});
    if (!entries.length) return null;
    return Math.round((entries.filter((e) => (e.daysOld || 0) <= 14).length / entries.length) * 100);
  })();

  return {
    aas: Math.round(Math.min(100, Math.max(0, score))),
    activeSessions,
    pendingRequests: pending,
    freshFileRatio,
    runHistoryProjects: Object.keys(agentRunHistory || {}).length,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// RENDER SECTIONS
// ════════════════════════════════════════════════════════════════════════════

function renderCockpit(computed) {
  const { svi, pbs, rcr, crs, crs2, dti, socr, eci, fcr, aas } = computed;
  return `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;color:var(--muted);letter-spacing:0.1em;margin-bottom:10px;font-weight:600;">ANALYTICS COCKPIT — 10 PROPRIETARY RATINGS</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${scoreTile("Studio Vitality",   svi.svi,   { sub: `Trend ${svi.trend}`,                          note: "Overall operational health" })}
        ${scoreTile("Portfolio Balance", pbs.pbs,   { sub: pbs.pbs ? `CV ${pbs.cv}` : "insufficient data", note: "Score distribution evenness" })}
        ${scoreTile("Release Cadence",   rcr.rcr,   { sub: `${rcr.activeReleasers} shipped last 30d`,      note: "Shipping consistency" })}
        ${scoreTile("CI Reliability",    crs.crs,   { sub: `${crs.passRate}% pass · ${crs.ciCoverage}% coverage`, note: "CI infrastructure health" })}
        ${scoreTile("Community Reach",   crs2.crs2, { sub: fmt(crs2.totalReach) + " total reach",          note: "Cross-platform social footprint" })}
        ${scoreTile("Dev Throughput",    dti.dti,   { sub: `${dti.weeklyCommits} commits/wk`,              note: "Development velocity" })}
        ${scoreTile("Studio OS Comply",  socr.socr, { sub: `${socr.compliant}/${socr.total} projects`,     note: "Operational maturity" })}
        ${scoreTile("Engage Spread",     eci.eci,   { sub: eci.gamesWithSessions ? `${eci.gamesWithSessions} active games` : "no session data", note: "Player engagement distribution" })}
        ${scoreTile("Forecast Conf.",    fcr.fcr,   { sub: fcr.fcr != null ? `${fcr.correct}/${fcr.total} correct` : `${fcr.total}/5 needed`, note: "Prediction accuracy" })}
        ${scoreTile("Agent Activity",    aas.aas,   { sub: `${aas.activeSessions} live · ${aas.pendingRequests} queued`, note: "AI agent utilization" })}
      </div>
    </div>`;
}

// ─ 1. Studio Vitality ────────────────────────────────────────────────────────
function renderVitality(svi, scoreHistory) {
  const histVals = scoreHistory.slice(-14).map((snap) => {
    const vals = Object.values(snap.scores || {}).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  });
  const trendLabel = svi.trend === "↑" ? "Improving" : svi.trend === "↓" ? "Declining" : "Stable";
  const trendColor = svi.trend === "↑" ? "var(--green)" : svi.trend === "↓" ? "var(--red)" : "var(--cyan)";

  return section("Studio Vitality Index", "🏛", `
    <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
      <div>
        <div style="font-size:64px;font-weight:900;color:${scoreColor(svi.svi)};line-height:1;">${svi.svi}</div>
        <div style="font-size:13px;color:${trendColor};font-weight:700;margin-top:4px;">${svi.trend} ${trendLabel}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px;">${scoreGrade(svi.svi)} grade out of 100</div>
      </div>
      <div style="flex:1;min-width:180px;">
        ${kv("CI Pass Rate", svi.ciPassRate + "%", svi.ciPassRate >= 80 ? "var(--green)" : svi.ciPassRate >= 50 ? "var(--yellow)" : "var(--red)")}
        ${kv("Portfolio Commits This Week", String(svi.totalWeekCommits))}
        ${kv("Score History Depth", scoreHistory.length + " snapshots")}
      </div>
      <div style="flex:1;min-width:220px;">
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px;">Portfolio Avg Score — Last 14 Snapshots</div>
        ${sparkline(histVals, { w: 260, h: 52, color: scoreColor(svi.svi) })}
      </div>
    </div>`);
}

// ─ 2. Project Leaderboard + Portfolio Balance ─────────────────────────────────
function renderLeaderboard(allScores, scorePrev, pbs) {
  const sorted = [...allScores].sort((a, b) => b.total - a.total);
  const rows = sorted.map((s, i) => {
    const proj = PROJECTS.find((p) => p.id === s.id);
    if (!proj) return "";
    const prev = scorePrev[s.id];
    const gradeInfo = getGrade(s.total);
    const barPct = Math.round(Math.min(100, (s.total / 105) * 100));
    const typeIcon = { game: "🎮", tool: "🔧", platform: "🌐", infrastructure: "🏗", app: "🌐" }[proj.type] || "";
    const dev  = s.pillars?.development?.score ?? "—";
    const eng  = s.pillars?.engagement?.score  ?? "—";
    const mom  = s.pillars?.momentum?.score    ?? "—";
    const risk = s.pillars?.risk?.score        ?? "—";
    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;" data-view="project:${proj.id}">
        <td style="padding:7px 8px;font-size:11px;color:var(--muted);width:22px;">${i + 1}</td>
        <td style="padding:7px 8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${proj.color};flex-shrink:0;"></span>
            <span style="font-size:12px;font-weight:600;">${typeIcon} ${proj.name}</span>
          </div>
        </td>
        <td style="padding:7px 8px;width:140px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden;">
              <div style="height:100%;width:${barPct}%;background:${proj.color};border-radius:3px;"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${proj.color};min-width:26px;text-align:right;">${s.total}</span>
          </div>
        </td>
        <td style="padding:7px 8px;font-size:11px;font-weight:700;color:${gradeInfo.color};width:30px;">${gradeInfo.grade}</td>
        <td style="padding:7px 8px;width:56px;">${deltaBadge(s.total, prev)}</td>
        <td style="padding:7px 8px;font-size:10px;color:var(--muted);">
          D:${dev} E:${eng} M:${mom} R:${risk}
        </td>
      </tr>`;
  }).join("");

  const pbsColor = scoreColor(pbs.pbs);
  return section("Project Leaderboard + Portfolio Balance", "🏆", `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="flex:1;min-width:150px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:9px;color:var(--muted);margin-bottom:4px;letter-spacing:0.08em;">PORTFOLIO BALANCE SCORE</div>
        <div style="font-size:28px;font-weight:900;color:${pbsColor};">${pbs.pbs ?? "—"}</div>
        ${pbs.pbs != null ? `
          <div style="font-size:10px;color:var(--muted);margin-top:4px;">CV: ${pbs.cv} · σ: ${pbs.stdDev} pts</div>
          <div style="font-size:10px;margin-top:4px;">
            <span style="color:var(--green);">↑ ${pbs.highestProject} (${pbs.highestScore})</span>
            <span style="margin:0 4px;color:var(--muted);">vs</span>
            <span style="color:var(--red);">↓ ${pbs.lowestProject} (${pbs.lowestScore})</span>
          </div>` : "<div style='font-size:10px;color:var(--muted);'>Insufficient data</div>"}
      </div>
      <div style="flex:1;min-width:150px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:9px;color:var(--muted);margin-bottom:4px;letter-spacing:0.08em;">PORTFOLIO AVERAGE</div>
        <div style="font-size:28px;font-weight:900;color:var(--cyan);">${pbs.mean ?? "—"}</div>
        <div style="font-size:10px;color:var(--muted);">${allScores.length} projects · max 105</div>
      </div>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;letter-spacing:0.06em;">#</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;letter-spacing:0.06em;">PROJECT</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;letter-spacing:0.06em;">SCORE</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;letter-spacing:0.06em;">GRD</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;letter-spacing:0.06em;">DELTA</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;letter-spacing:0.06em;">PILLARS D/E/M/R</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`);
}

// ─ 3. CI & Developer Throughput ──────────────────────────────────────────────
function renderCI(crs, dti, ghData) {
  const active = PROJECTS.filter((p) => p.status !== "archived" && p.githubRepo);
  const oneWeekAgo = Date.now() - 7 * 86400000;

  const failingCallout = crs.failingRepos.length > 0 ? `
    <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);border-radius:8px;padding:12px 14px;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:6px;">⚠ ${crs.failingRepos.length} repo${crs.failingRepos.length > 1 ? "s" : ""} failing CI</div>
      ${crs.failingRepos.map((n) => `<div style="font-size:11px;color:var(--red);opacity:0.8;margin-top:3px;">· ${n}</div>`).join("")}
    </div>` : "";

  const ciRows = active.map((p) => {
    const rd   = ghData[p.githubRepo];
    const ci   = ciStatus(rd?.ciRuns);
    const last = rd?.ciRuns?.[0];
    const wkCommits = (rd?.commits || []).filter((c) => new Date(c.date).getTime() > oneWeekAgo).length;
    const streak = (() => {
      let s = 0;
      for (const r of rd?.ciRuns || []) {
        if (r.conclusion === "success") s++; else break;
      }
      return s;
    })();
    const dotColor = ci.cls === "passing" ? "var(--green)" : ci.cls === "failing" ? "var(--red)" : ci.cls === "running" ? "var(--yellow)" : "var(--muted)";
    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding:6px 8px;">
          <div style="display:flex;align-items:center;gap:5px;">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${p.color};"></span>
            <span style="font-size:11px;">${p.name}</span>
          </div>
        </td>
        <td style="padding:6px 8px;">
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid ${dotColor}40;background:rgba(255,255,255,0.04);">
            <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${dotColor};"></span>
            ${ci.label}
          </span>
        </td>
        <td style="padding:6px 8px;font-size:11px;color:var(--muted);">${streak > 0 ? streak + "✓" : "—"}</td>
        <td style="padding:6px 8px;font-size:11px;color:var(--muted);">${last ? timeAgo(last.triggeredAt) : "—"}</td>
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:${wkCommits > 0 ? "var(--cyan)" : "var(--muted)"};">${wkCommits}</td>
        <td style="padding:6px 8px;font-size:11px;color:var(--muted);">${rd?.repo?.openIssues ?? "—"}</td>
      </tr>`;
  }).join("");

  return section("CI Reliability + Developer Throughput", "🔬", `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      ${statCard("CI PASS RATE",      crs.passRate + "%",          `${crs.passingCount}/${crs.totalWithCI} repos`)}
      ${statCard("CI COVERAGE",       crs.ciCoverage + "%",        `${crs.totalWithCI}/${crs.totalActive} active repos`)}
      ${statCard("WEEKLY COMMITS",    String(dti.weeklyCommits),   `${dti.activeDev} active projects`)}
      ${statCard("DEPLOYMENTS (14d)", String(dti.deployedInPeriod), `${dti.freshPRs} fresh PRs open`)}
    </div>
    ${failingCallout}
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:1px solid var(--border);">
          <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">PROJECT</th>
          <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">CI STATUS</th>
          <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">STREAK</th>
          <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">LAST RUN</th>
          <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">WK COMMITS</th>
          <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">ISSUES</th>
        </tr></thead>
        <tbody>${ciRows}</tbody>
      </table>
    </div>`);
}

// ─ 4. Release Cadence + PR Pipeline ──────────────────────────────────────────
function renderRelease(rcr, ghData) {
  const active = PROJECTS.filter((p) => p.status !== "archived" && p.githubRepo);
  const now = Date.now();
  const ninetyAgo = now - 90 * 86400000;

  const releases = active.flatMap((p) => {
    const rel = ghData[p.githubRepo]?.latestRelease;
    if (!rel?.publishedAt) return [];
    const ts = new Date(rel.publishedAt).getTime();
    if (ts < ninetyAgo) return [];
    return [{ project: p, rel, age: Math.round((now - ts) / 86400000) }];
  }).sort((a, b) => a.age - b.age);

  const allPRs = active.flatMap((p) => {
    const rd = ghData[p.githubRepo];
    return (rd?.prs || []).map((pr) => ({
      project: p, pr,
      age: Math.round((now - new Date(pr.createdAt).getTime()) / 86400000),
    }));
  }).sort((a, b) => b.age - a.age);

  const releaseRows = releases.map(({ project, rel, age }) => {
    const ageColor = age <= 7 ? "var(--green)" : age <= 30 ? "var(--cyan)" : "var(--yellow)";
    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding:6px 8px;">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${project.color};margin-right:5px;"></span>
          <span style="font-size:11px;font-weight:600;">${project.name}</span>
        </td>
        <td style="padding:6px 8px;font-size:11px;font-family:monospace;color:var(--cyan);">${rel.tag}</td>
        <td style="padding:6px 8px;font-size:11px;color:${ageColor};">${age}d ago</td>
        <td style="padding:6px 8px;">
          <a href="${rel.url}" target="_blank" rel="noopener" style="font-size:10px;color:var(--cyan);text-decoration:none;opacity:0.7;">↗ GitHub</a>
        </td>
      </tr>`;
  }).join("");

  const prRows = allPRs.slice(0, 15).map(({ project, pr, age }) => {
    const ageColor = age <= 3 ? "var(--green)" : age <= 7 ? "var(--cyan)" : age <= 14 ? "var(--yellow)" : "var(--red)";
    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding:5px 8px;">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${project.color};margin-right:4px;"></span>
          <span style="font-size:10px;">${project.name}</span>
        </td>
        <td style="padding:5px 8px;font-size:10px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${pr.title}</td>
        <td style="padding:5px 8px;font-size:10px;color:${ageColor};">${age}d</td>
        <td style="padding:5px 8px;font-size:9px;color:var(--muted);">${pr.draft ? "Draft" : "Open"}</td>
        <td style="padding:5px 8px;font-size:10px;color:var(--muted);">${pr.author}</td>
      </tr>`;
  }).join("");

  return section("Release Cadence + PR Pipeline", "🚀", `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      ${statCard("RELEASE CADENCE", String(rcr.rcr), `${rcr.activeReleasers} shipped last 30d`)}
      ${statCard("LAST RELEASE",    rcr.daysSinceAnyRelease != null ? rcr.daysSinceAnyRelease + "d" : "—", "days since any release")}
      ${statCard("OPEN PRs",        String(allPRs.length), `${allPRs.filter((e) => e.pr.draft).length} drafts · ${allPRs.filter((e) => !e.pr.draft && e.age > 7).length} stale`)}
    </div>
    ${releases.length > 0 ? `
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">RECENT RELEASES — LAST 90 DAYS</div>
      <div style="overflow-x:auto;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">PROJECT</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">TAG</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">AGE</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">LINK</th>
          </tr></thead>
          <tbody>${releaseRows}</tbody>
        </table>
      </div>` : `<div style="font-size:11px;color:var(--muted);margin-bottom:16px;">No releases in the last 90 days.</div>`}
    ${allPRs.length > 0 ? `
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">PR PIPELINE (oldest first)</div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">PROJECT</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">TITLE</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">AGE</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">STATE</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">AUTHOR</th>
          </tr></thead>
          <tbody>${prRows}</tbody>
        </table>
      </div>` : ""}
  `);
}

// ─ 5. Member & Game Engagement ────────────────────────────────────────────────
function renderEngagement(eci, sbData) {
  const sessions = sbData?.sessions || {};
  const members  = sbData?.members;
  const betaKeys = sbData?.betaKeys || {};
  const economy  = sbData?.economy;
  const gameProjects = PROJECTS.filter((p) => p.supabaseGameSlug);
  const totalWeek = Object.values(sessions).reduce((a, v) => a + (v?.week || 0), 0);

  const sessionBar = totalWeek > 0 ? `
    <div style="margin-bottom:16px;">
      <div style="font-size:10px;color:var(--muted);margin-bottom:6px;font-weight:600;letter-spacing:0.06em;">SESSION SHARE — THIS WEEK</div>
      <div style="display:flex;height:20px;border-radius:6px;overflow:hidden;gap:1px;">
        ${gameProjects.map((p) => {
          const w = sessions[p.supabaseGameSlug]?.week || 0;
          if (w === 0) return "";
          const pct = Math.round((w / totalWeek) * 100);
          return `<div style="background:${p.color};flex:${pct};display:flex;align-items:center;justify-content:center;min-width:28px;" title="${p.name}: ${pct}% (${w} sessions)">
            <span style="font-size:9px;color:#000;font-weight:700;opacity:0.8;">${pct}%</span>
          </div>`;
        }).join("")}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
        ${gameProjects.filter((p) => sessions[p.supabaseGameSlug]?.week > 0).map((p) => `
          <span style="font-size:9px;color:var(--muted);display:flex;align-items:center;gap:3px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${p.color};"></span>
            ${p.name}
          </span>`).join("")}
      </div>
    </div>` : "";

  const sessionRows = gameProjects.map((p) => {
    const s    = sessions[p.supabaseGameSlug];
    const keys = betaKeys[p.supabaseGameSlug];
    const wk   = s?.week ?? null;
    const wkColor = wk == null ? "var(--muted)" : wk >= 100 ? "var(--green)" : wk >= 20 ? "var(--cyan)" : wk >= 5 ? "var(--yellow)" : "var(--muted)";
    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding:6px 8px;">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${p.color};margin-right:5px;"></span>
          <span style="font-size:11px;font-weight:600;">${p.name}</span>
        </td>
        <td style="padding:6px 8px;font-size:13px;font-weight:700;color:${wkColor};">${wk ?? "—"}</td>
        <td style="padding:6px 8px;font-size:11px;color:var(--muted);">${s?.total != null ? fmt(s.total) : "—"}</td>
        <td style="padding:6px 8px;font-size:10px;color:${keys?.available != null && keys.available <= 5 ? "var(--red)" : "var(--muted)"};">
          ${keys ? `${keys.available}/${keys.total} avail` : "—"}
        </td>
      </tr>`;
  }).join("");

  const economyRows = economy?.byReason
    ? Object.entries(economy.byReason).sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([r, t]) => kv(r, fmt(t) + " pts")).join("")
    : "";

  return section("Member & Game Engagement", "🎮", `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="flex:1;min-width:130px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:9px;color:var(--muted);margin-bottom:4px;letter-spacing:0.08em;">ENGAGE SPREAD (ECI)</div>
        <div style="font-size:28px;font-weight:900;color:${scoreColor(eci.eci)};">${eci.eci ?? "—"}</div>
        ${eci.eci != null ? `<div style="font-size:10px;color:var(--muted);">${eci.gamesWithSessions} games · top: ${eci.topGame} (${eci.topGameShare}%)</div>` : `<div style="font-size:10px;color:var(--muted);">no session data yet</div>`}
      </div>
      ${statCard("TOTAL MEMBERS",   members?.total != null ? fmt(members.total) : "—",  members ? `+${members.newThisWeek ?? "?"} this week` : "not connected")}
      ${statCard("WEEKLY SESSIONS", totalWeek > 0 ? fmt(totalWeek) : "—", `${gameProjects.length} tracked games`)}
    </div>
    ${sessionBar}
    ${gameProjects.length > 0 ? `
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">GAME SESSION BREAKDOWN</div>
      <div style="overflow-x:auto;margin-bottom:${economyRows ? "16px" : "0"};">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">GAME</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">THIS WEEK</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">TOTAL</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">BETA KEYS</th>
          </tr></thead>
          <tbody>${sessionRows}</tbody>
        </table>
      </div>` : ""}
    ${economyRows ? `
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">POINT ECONOMY — TOP SOURCES</div>
      <div style="background:rgba(255,255,255,0.02);border-radius:8px;padding:10px 14px;">
        ${economyRows}
        ${economy?.total != null ? kv("Total Points Issued", fmt(economy.total) + " pts", "var(--green)") : ""}
      </div>` : ""}
  `);
}

// ─ 6. Social Reach & Revenue ──────────────────────────────────────────────────
function renderSocial(crs2, socialData) {
  if (!socialData) {
    return section("Social Reach & Revenue", "📡", `
      <div style="font-size:12px;color:var(--muted);">Social data not loaded. Configure API keys in Settings → Credentials.</div>`);
  }

  const yt    = socialData.youtube;
  const rd    = socialData.reddit;
  const bsky  = socialData.bluesky;
  const gm    = socialData.gumroad;
  const gmSales = socialData.gumroadSales;

  function platform(icon, name, primary, pLabel, secondary, sLabel, recent = "") {
    return `
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:14px;flex:1;min-width:170px;">
        <div style="font-size:11px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
          <span>${icon}</span><span>${name}</span>
        </div>
        <div style="display:flex;gap:14px;margin-bottom:8px;">
          <div>
            <div style="font-size:22px;font-weight:800;color:var(--cyan);">${primary != null ? fmt(primary) : "—"}</div>
            <div style="font-size:9px;color:var(--muted);">${pLabel}</div>
          </div>
          ${secondary != null ? `<div>
            <div style="font-size:16px;font-weight:700;color:var(--text);">${fmt(secondary)}</div>
            <div style="font-size:9px;color:var(--muted);">${sLabel}</div>
          </div>` : ""}
        </div>
        ${recent}
      </div>`;
  }

  function recentList(items) {
    if (!items?.length) return "";
    return items.slice(0, 3).map((item) => `
      <div style="font-size:10px;color:var(--muted);padding:3px 0;border-top:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;gap:8px;">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.text || item.title || "—"}</span>
        <span style="flex-shrink:0;">${item.date || ""}</span>
      </div>`).join("");
  }

  const ytRecent = yt?.latestVideos?.slice(0, 3).map((v) => `
    <div style="font-size:10px;color:var(--muted);padding:3px 0;border-top:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;gap:8px;">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v.title}</span>
      <span style="flex-shrink:0;">${timeAgo(v.publishedAt)}</span>
    </div>`).join("") || "";

  const bskyRecent = bsky?.latestPosts?.slice(0, 3).map((p) => `
    <div style="font-size:10px;color:var(--muted);padding:3px 0;border-top:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;gap:8px;">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(p.text || "").substring(0, 55)}…</span>
      <span style="flex-shrink:0;">${timeAgo(p.createdAt)}</span>
    </div>`).join("") || "";

  const rdRecent = rd?.latestPosts?.slice(0, 3).map((p) => `
    <div style="font-size:10px;color:var(--muted);padding:3px 0;border-top:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;gap:8px;">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.title}</span>
      <span style="flex-shrink:0;">↑${p.score}</span>
    </div>`).join("") || "";

  const salesTable = gmSales?.length > 0 ? `
    <div style="font-size:10px;color:var(--muted);margin-top:14px;margin-bottom:6px;font-weight:600;letter-spacing:0.06em;">RECENT SALES</div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:1px solid var(--border);">
          <th style="padding:4px 8px;font-size:9px;color:var(--muted);text-align:left;">PRODUCT</th>
          <th style="padding:4px 8px;font-size:9px;color:var(--muted);text-align:left;">PRICE</th>
          <th style="padding:4px 8px;font-size:9px;color:var(--muted);text-align:left;">DATE</th>
        </tr></thead>
        <tbody>
          ${gmSales.slice(0, 10).map((s) => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:4px 8px;font-size:10px;">${s.productName}</td>
              <td style="padding:4px 8px;font-size:10px;color:var(--green);">$${s.price}</td>
              <td style="padding:4px 8px;font-size:10px;color:var(--muted);">${timeAgo(s.createdAt)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>` : "";

  return section("Social Reach & Revenue", "📡", `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="flex:1;min-width:130px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:9px;color:var(--muted);margin-bottom:4px;letter-spacing:0.08em;">COMMUNITY REACH SCORE</div>
        <div style="font-size:28px;font-weight:900;color:${scoreColor(crs2.crs2)};">${crs2.crs2}</div>
        <div style="font-size:10px;color:var(--muted);">${fmt(crs2.totalReach)} total reach</div>
      </div>
      <div style="flex:2;min-width:200px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:9px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">SCORE BREAKDOWN</div>
        ${Object.entries(crs2.breakdown || {}).map(([plat, pts]) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
            <span style="font-size:10px;color:var(--muted);min-width:68px;">${plat}</span>
            ${miniBar(pts, 30, "var(--cyan)")}
            <span style="font-size:10px;font-weight:600;color:var(--cyan);min-width:22px;text-align:right;">${pts}</span>
          </div>`).join("")}
      </div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      ${yt   ? platform("▶", "YouTube",  yt.subscribers,  "subscribers", yt.totalViews, "total views", ytRecent)   : ""}
      ${rd   ? platform("◉", "Reddit",   rd.subscribers,  "members",     rd.activeUsers,"online now",   rdRecent)   : ""}
      ${bsky ? platform("☁", "Bluesky",  bsky.followers,  "followers",   bsky.posts,    "posts",        bskyRecent) : ""}
      ${gm   ? platform("💰", "Gumroad", gmSales?.length || 0, "total sales", gm.products?.filter((p) => p.published).length || 0, "active products") : ""}
    </div>
    ${salesTable}
  `);
}

// ─ 7. Score History & Forecast ────────────────────────────────────────────────
function renderForecast(fcr, scoreHistory, ghData, scorePrev) {
  if (scoreHistory.length < 2) {
    return section("Score History & Forecast", "📈", `
      <div style="font-size:12px;color:var(--muted);">Not enough history yet. The hub records a snapshot each session — come back after a few more sessions.</div>`);
  }

  const forecasts  = forecastScores(scoreHistory);
  const monte      = monteCarloForecast(scoreHistory, 200);
  const anomalies  = getScoreAnomalies(scoreHistory, ghData);

  // Multi-line score history SVG
  const chartW = 520;
  const chartH = 130;
  const snaps  = scoreHistory.slice(-20);
  const snapCount = snaps.length;
  const allVals = snaps.flatMap((s) => Object.values(s.scores || {}).filter((v) => v != null));
  const minV = Math.min(...allVals, 0);
  const maxV = Math.max(...allVals, 60);
  const range = maxV - minV || 1;

  const chartProjects = PROJECTS.filter((p) => snaps.some((s) => s.scores?.[p.id] != null)).slice(0, 12);
  const gridLines = [20, 40, 60, 80].map((v) => {
    const y = chartH - 10 - ((v - minV) / range) * (chartH - 20);
    return `<line x1="10" y1="${y.toFixed(1)}" x2="${chartW - 10}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      <text x="7" y="${(y + 3).toFixed(1)}" font-size="8" fill="rgba(255,255,255,0.25)" text-anchor="end">${v}</text>`;
  }).join("");

  const svgLines = chartProjects.map((p) => {
    const pts = snaps.map((snap, i) => {
      const v = snap.scores?.[p.id];
      if (v == null) return null;
      const x = (i / (snapCount - 1)) * (chartW - 20) + 10;
      const y = chartH - 10 - ((v - minV) / range) * (chartH - 20);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).filter(Boolean);
    return pts.length >= 2 ? `<polyline points="${pts.join(" ")}" fill="none" stroke="${p.color}" stroke-width="1.5" opacity="0.75" stroke-linecap="round" stroke-linejoin="round"/>` : "";
  }).join("");

  const legend = chartProjects.map((p) => `
    <span style="display:inline-flex;align-items:center;gap:4px;font-size:9px;color:var(--muted);margin-right:8px;margin-bottom:4px;">
      <span style="display:inline-block;width:12px;height:2px;background:${p.color};"></span>${p.name}
    </span>`).join("");

  const anomalyCallout = anomalies.length > 0 ? `
    <div style="background:rgba(251,191,36,0.07);border:1px solid rgba(251,191,36,0.25);border-radius:8px;padding:12px 14px;margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;color:var(--yellow);margin-bottom:6px;">SCORE ANOMALIES DETECTED</div>
      ${anomalies.slice(0, 5).map((a) => `<div style="font-size:10px;color:var(--yellow);opacity:0.85;margin-top:3px;">· ${a.project?.name || "?"} dropped ${Math.abs(a.delta)} pts — ${a.signal}</div>`).join("")}
    </div>` : "";

  const forecastRows = PROJECTS
    .filter((p) => forecasts[p.id] != null)
    .slice(0, 14)
    .map((p) => {
      const current = scoreHistory[scoreHistory.length - 1]?.scores?.[p.id];
      const next    = forecasts[p.id];
      if (current == null) return "";
      const diff      = Math.round(next - current);
      const diffColor = diff > 0 ? "var(--green)" : diff < 0 ? "var(--red)" : "var(--muted)";
      const mc        = monte[p.id];
      const highVar   = mc && (mc.high - mc.low) > 10;
      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
          <td style="padding:5px 8px;font-size:11px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${p.color};margin-right:5px;"></span>${p.name}
          </td>
          <td style="padding:5px 8px;font-size:12px;font-weight:700;">${current}</td>
          <td style="padding:5px 8px;font-size:12px;font-weight:700;color:${scoreColor(Math.round(next))};">${Math.round(next)}${highVar ? `<sup style="font-size:8px;color:var(--muted);">?</sup>` : ""}</td>
          <td style="padding:5px 8px;font-size:11px;font-weight:700;color:${diffColor};">${diff > 0 ? "+" : ""}${diff}</td>
          ${mc ? `<td style="padding:5px 8px;font-size:10px;color:var(--muted);">${Math.round(mc.low)}–${Math.round(mc.high)}</td>` : "<td></td>"}
        </tr>`;
    }).join("");

  return section("Score History & Forecast", "📈", `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="flex:1;min-width:140px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:9px;color:var(--muted);margin-bottom:4px;letter-spacing:0.08em;">FORECAST CONFIDENCE RATING</div>
        <div style="font-size:28px;font-weight:900;color:${scoreColor(fcr.fcr)};">${fcr.fcr ?? "—"}</div>
        ${fcr.fcr != null ? `<div style="font-size:10px;color:var(--muted);">${fcr.correct}/${fcr.total} correct predictions</div>` : `<div style="font-size:10px;color:var(--muted);">${fcr.total}/5 predictions logged</div>`}
      </div>
      ${statCard("HISTORY DEPTH", String(scoreHistory.length), "score snapshots recorded")}
      ${statCard("ANOMALIES", String(anomalies.length), "score drops ≥4pts detected")}
    </div>
    ${anomalyCallout}
    <div style="margin-bottom:6px;overflow-x:auto;">
      <svg width="${chartW}" height="${chartH}" style="display:block;overflow:visible;max-width:100%;" aria-label="Score history chart">
        ${gridLines}
        ${svgLines}
      </svg>
    </div>
    <div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${legend}</div>
    ${forecastRows ? `
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">NEXT-SESSION FORECAST (MONTE CARLO — ${monte ? Object.keys(monte).length : 0} simulations)</div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">PROJECT</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">CURRENT</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">FORECAST</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">DELTA</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">MC RANGE</th>
          </tr></thead>
          <tbody>${forecastRows}</tbody>
        </table>
      </div>` : ""}
  `);
}

// ─ 8. Studio OS & Governance ──────────────────────────────────────────────────
function renderGovernance(socr, portfolioFreshness) {
  const active     = PROJECTS.filter((p) => p.status !== "archived");
  const liveOrBeta = active.filter((p) => p.status === "live" || p.status === "client-beta");

  const grid = active.map((p) => {
    const urgent = (p.status === "live" || p.status === "client-beta") && !p.studioOsApplied;
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-size:12px;color:${p.studioOsApplied ? "var(--green)" : "var(--red)"};">${p.studioOsApplied ? "✓" : "✗"}</span>
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${p.color};flex-shrink:0;"></span>
        <span style="font-size:11px;${urgent ? "color:var(--red);font-weight:600;" : ""}">${p.name}</span>
        ${urgent
          ? `<span style="font-size:9px;color:var(--red);background:rgba(248,113,113,0.1);padding:1px 5px;border-radius:3px;margin-left:auto;">LIVE — NOT COMPLIANT</span>`
          : `<span style="font-size:9px;color:var(--muted);margin-left:auto;">${p.status}</span>`}
      </div>`;
  }).join("");

  const freshRows = Object.entries(portfolioFreshness || {})
    .sort((a, b) => (b[1]?.daysOld || 0) - (a[1]?.daysOld || 0))
    .slice(0, 12)
    .map(([path, meta]) => {
      const age  = meta?.daysOld || 0;
      const ac   = age > 30 ? "var(--red)" : age > 14 ? "var(--yellow)" : "var(--green)";
      const file = path.split(/[/\\]/).pop() || path;
      return kv(file, `${age}d`, ac);
    }).join("");

  return section("Studio OS & Governance", "🏛", `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="flex:1;min-width:140px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:9px;color:var(--muted);margin-bottom:4px;letter-spacing:0.08em;">STUDIO OS COMPLIANCE RATE</div>
        <div style="font-size:28px;font-weight:900;color:${scoreColor(socr.socr)};">${socr.socr}%</div>
        <div style="font-size:10px;color:var(--muted);">${socr.compliant}/${socr.total} projects compliant</div>
      </div>
      <div style="flex:1;min-width:140px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:9px;color:var(--muted);margin-bottom:4px;letter-spacing:0.08em;">LIVE / BETA COMPLIANCE</div>
        <div style="font-size:28px;font-weight:900;color:${liveOrBeta.filter((p) => p.studioOsApplied).length === liveOrBeta.length ? "var(--green)" : "var(--red)"};">
          ${liveOrBeta.filter((p) => p.studioOsApplied).length}/${liveOrBeta.length}
        </div>
        <div style="font-size:10px;color:var(--muted);">live + client-beta projects</div>
      </div>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <div style="flex:1;min-width:220px;">
        <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">COMPLIANCE STATUS</div>
        ${grid}
      </div>
      ${freshRows ? `
        <div style="flex:1;min-width:200px;">
          <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">PORTFOLIO FILE AGE</div>
          <div style="background:rgba(255,255,255,0.02);border-radius:8px;padding:10px 14px;">${freshRows}</div>
        </div>` : ""}
    </div>
  `);
}

// ─ 9. GitHub & Competitive Intelligence ──────────────────────────────────────
function renderGitHub(ghData, competitorData) {
  const active = PROJECTS.filter((p) => p.githubRepo);
  const oneWeekAgo = Date.now() - 7 * 86400000;

  // Portfolio GitHub aggregate stats
  let totalStars = 0;
  let totalForks = 0;
  let totalOpenIssues = 0;
  let totalCommitsWk  = 0;
  for (const p of active) {
    const rd = ghData[p.githubRepo];
    if (!rd?.repo) continue;
    totalStars      += rd.repo.stars || 0;
    totalForks      += rd.repo.forks || 0;
    totalOpenIssues += rd.repo.openIssues || 0;
    totalCommitsWk  += (rd.commits || []).filter((c) => new Date(c.date).getTime() > oneWeekAgo).length;
  }

  // Top repos by stars
  const byStars = active
    .map((p) => ({ p, stars: ghData[p.githubRepo]?.repo?.stars || 0, forks: ghData[p.githubRepo]?.repo?.forks || 0 }))
    .sort((a, b) => b.stars - a.stars)
    .filter((e) => e.stars > 0)
    .slice(0, 8);

  const starRows = byStars.map(({ p, stars, forks }) => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
      <td style="padding:5px 8px;">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${p.color};margin-right:5px;"></span>
        <span style="font-size:11px;">${p.name}</span>
      </td>
      <td style="padding:5px 8px;font-size:11px;font-weight:700;color:var(--yellow);">★ ${stars}</td>
      <td style="padding:5px 8px;font-size:11px;color:var(--muted);">⑂ ${forks}</td>
      <td style="padding:5px 8px;font-size:10px;color:var(--muted);">${ghData[p.githubRepo]?.repo?.language || "—"}</td>
    </tr>`).join("");

  const competitorRows = (competitorData || []).slice(0, 10).map((c) => {
    const staleDays = c.pushedAt ? Math.round((Date.now() - new Date(c.pushedAt).getTime()) / 86400000) : null;
    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding:5px 8px;font-size:11px;font-family:monospace;color:var(--cyan);">${c.full_name}</td>
        <td style="padding:5px 8px;font-size:11px;font-weight:700;color:var(--yellow);">${c.stars != null ? "★ " + fmt(c.stars) : "—"}</td>
        <td style="padding:5px 8px;font-size:11px;color:var(--muted);">${c.forks != null ? "⑂ " + fmt(c.forks) : "—"}</td>
        <td style="padding:5px 8px;font-size:10px;color:var(--muted);">${c.language || "—"}</td>
        <td style="padding:5px 8px;font-size:10px;color:var(--muted);">${staleDays != null ? staleDays + "d" : "—"}</td>
      </tr>`;
  }).join("");

  return section("GitHub & Competitive Intelligence", "⑂", `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      ${statCard("TOTAL STARS",     fmt(totalStars),      `across ${active.length} repos`)}
      ${statCard("TOTAL FORKS",     fmt(totalForks),      "")}
      ${statCard("OPEN ISSUES",     String(totalOpenIssues), "portfolio-wide")}
      ${statCard("COMMITS (7d)",    String(totalCommitsWk),  "all repos")}
    </div>
    ${starRows ? `
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">TOP REPOS BY STARS</div>
      <div style="overflow-x:auto;margin-bottom:${competitorRows ? "20px" : "0"};">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">REPO</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">STARS</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">FORKS</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">LANG</th>
          </tr></thead>
          <tbody>${starRows}</tbody>
        </table>
      </div>` : ""}
    ${competitorRows ? `
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">COMPETITOR REPOS</div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">REPO</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">STARS</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">FORKS</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">LANG</th>
            <th style="padding:5px 8px;font-size:9px;color:var(--muted);text-align:left;">LAST PUSH</th>
          </tr></thead>
          <tbody>${competitorRows}</tbody>
        </table>
      </div>` : `<div style="font-size:11px;color:var(--muted);">No competitor repos tracked. Add them in the Competitive view.</div>`}
  `);
}

// ─ 10. Agent Activity & Ops ───────────────────────────────────────────────────
function renderAgentOps(aas, beaconData, agentRequests, agentRunHistory, studioBrain) {
  const activeSessions = beaconData?.active || [];
  const requests       = agentRequests || [];
  const runHistory     = agentRunHistory || {};

  const sessionCards = activeSessions.map((s) => {
    const proj = PROJECTS.find((p) => p.id === s.project);
    const duration = s.since ? Math.round((Date.now() - new Date(s.since).getTime()) / 60000) : null;
    return `
      <div style="background:rgba(110,231,183,0.08);border:1px solid rgba(110,231,183,0.3);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:16px;">◉</span>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--green);">${proj?.name || s.project}</div>
          <div style="font-size:10px;color:var(--muted);">${s.agent} · ${duration != null ? duration + "m active" : "active"}</div>
        </div>
        ${proj ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${proj.color};margin-left:auto;"></span>` : ""}
      </div>`;
  }).join("");

  const requestList = requests.slice(0, 8).map((r) => `
    <div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      <div style="font-size:11px;font-weight:600;">${r.projectId || r.project || "—"}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px;">${r.message || r.request || "—"}</div>
    </div>`).join("");

  const runRows = Object.entries(runHistory).slice(0, 8).map(([projectId, history]) => {
    const proj = PROJECTS.find((p) => p.id === projectId);
    const runs = Array.isArray(history) ? history : [];
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-size:11px;">${proj?.name || projectId}</span>
        <span style="font-size:10px;color:var(--muted);">${runs.length} run${runs.length !== 1 ? "s" : ""}</span>
      </div>`;
  }).join("");

  return section("Agent Activity & Ops", "🤖", `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="flex:1;min-width:130px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:12px;">
        <div style="font-size:9px;color:var(--muted);margin-bottom:4px;letter-spacing:0.08em;">AGENT ACTIVITY SCORE</div>
        <div style="font-size:28px;font-weight:900;color:${scoreColor(aas.aas)};">${aas.aas}</div>
        <div style="font-size:10px;color:var(--muted);">${aas.activeSessions} live · ${aas.pendingRequests} queued</div>
      </div>
      ${statCard("FILE FRESHNESS", aas.freshFileRatio != null ? aas.freshFileRatio + "%" : "—", "portfolio files ≤14d old")}
      ${statCard("RUN HISTORY",    String(aas.runHistoryProjects), "projects with logged runs")}
    </div>
    ${activeSessions.length > 0 ? `
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">LIVE AGENT SESSIONS</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">${sessionCards}</div>
    ` : `<div style="font-size:11px;color:var(--muted);margin-bottom:16px;">No active agent sessions.</div>`}
    ${requestList ? `
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">AGENT REQUEST QUEUE</div>
      <div style="background:rgba(255,255,255,0.02);border-radius:8px;padding:10px 14px;margin-bottom:14px;">${requestList}</div>
    ` : ""}
    ${runRows ? `
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:0.06em;">RUN HISTORY BY PROJECT</div>
      <div style="background:rgba(255,255,255,0.02);border-radius:8px;padding:10px 14px;">${runRows}</div>
    ` : ""}
    ${studioBrain ? `
      <div style="font-size:10px;color:var(--muted);margin-top:14px;margin-bottom:6px;font-weight:600;letter-spacing:0.06em;">STUDIO BRAIN</div>
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(110,231,183,0.15);border-radius:8px;padding:10px 14px;font-size:10px;color:var(--muted);">
        Active · ${typeof studioBrain === "object" ? Object.keys(studioBrain).length + " fields loaded" : "loaded"}
      </div>
    ` : ""}
  `);
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════

// ── Advanced Stats section ─────────────────────────────────────────────────
function renderAdvancedStats(ghData, sbData, socialData, scoreHistory, allScores) {
  const active = PROJECTS.filter((p) => p.status !== "archived" && p.githubRepo);
  const now = Date.now();
  const oneWeekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;
  const thirtyDaysAgo = now - 30 * 86400000;

  // ── Code churn: commits this week vs last week ──
  let thisWeekCommits = 0, lastWeekCommits = 0;
  for (const p of active) {
    const commits = ghData[p.githubRepo]?.commits || [];
    for (const c of commits) {
      const t = new Date(c.date).getTime();
      if (t > oneWeekAgo) thisWeekCommits++;
      else if (t > twoWeeksAgo) lastWeekCommits++;
    }
  }
  const churnDelta = lastWeekCommits > 0 ? Math.round(((thisWeekCommits - lastWeekCommits) / lastWeekCommits) * 100) : 0;
  const churnLabel = churnDelta > 0 ? `+${churnDelta}%` : `${churnDelta}%`;
  const churnColor = churnDelta > 10 ? "var(--green)" : churnDelta < -10 ? "var(--red)" : "var(--cyan)";

  // ── PR merge velocity ──
  let totalPRs = 0, mergedPRs = 0, totalPRAgeHours = 0, oldestPRDays = 0;
  for (const p of active) {
    const prs = ghData[p.githubRepo]?.prs || [];
    for (const pr of prs) {
      totalPRs++;
      const ageMs = now - new Date(pr.createdAt).getTime();
      const ageDays = ageMs / 86400000;
      totalPRAgeHours += ageMs / 3600000;
      if (ageDays > oldestPRDays) oldestPRDays = ageDays;
    }
  }
  const avgPRAgeHours = totalPRs > 0 ? Math.round(totalPRAgeHours / totalPRs) : 0;
  const avgPRAgeDays = (avgPRAgeHours / 24).toFixed(1);

  // ── Issue resolution rate ──
  let totalOpen = 0, totalClosed = 0;
  for (const p of active) {
    const rd = ghData[p.githubRepo];
    totalOpen += rd?.repo?.openIssues || 0;
    // Estimate closed from total commits with "fix" or "close" keywords
    const fixCommits = (rd?.commits || []).filter((c) =>
      /\b(fix|close|resolve|closes|fixes)\b/i.test(c.message)
    ).length;
    totalClosed += fixCommits;
  }
  const issueResolutionRate = (totalOpen + totalClosed) > 0
    ? Math.round((totalClosed / (totalOpen + totalClosed)) * 100) : 0;

  // ── Repo health distribution ──
  const healthBuckets = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const s of allScores) {
    if (s.total >= 80) healthBuckets.excellent++;
    else if (s.total >= 60) healthBuckets.good++;
    else if (s.total >= 40) healthBuckets.fair++;
    else healthBuckets.poor++;
  }
  const totalProj = allScores.length || 1;

  // ── Commit pattern (weekday distribution) ──
  const dayBuckets = [0, 0, 0, 0, 0, 0, 0]; // Sun–Sat
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const p of active) {
    for (const c of (ghData[p.githubRepo]?.commits || [])) {
      const d = new Date(c.date);
      dayBuckets[d.getDay()]++;
    }
  }
  const maxDay = Math.max(...dayBuckets, 1);
  const peakDay = dayLabels[dayBuckets.indexOf(Math.max(...dayBuckets))];

  // ── Social growth rates ──
  let socialGrowthCards = "";
  const prevSocial = (() => { try { return JSON.parse(localStorage.getItem("vshub_social_prev") || "{}"); } catch { return {}; } })();
  if (socialData?.youtube?.subscribers != null) {
    const delta = prevSocial.ytSubs ? socialData.youtube.subscribers - prevSocial.ytSubs : 0;
    const pct = prevSocial.ytSubs > 0 ? ((delta / prevSocial.ytSubs) * 100).toFixed(1) : "—";
    socialGrowthCards += statCard("YOUTUBE SUBS", fmt(socialData.youtube.subscribers), delta !== 0 ? `${delta > 0 ? "+" : ""}${delta} (${pct}%)` : "no prior data");
  }
  if (socialData?.reddit?.subscribers != null) {
    const delta = prevSocial.rdSubs ? socialData.reddit.subscribers - prevSocial.rdSubs : 0;
    const pct = prevSocial.rdSubs > 0 ? ((delta / prevSocial.rdSubs) * 100).toFixed(1) : "—";
    socialGrowthCards += statCard("REDDIT MEMBERS", fmt(socialData.reddit.subscribers), delta !== 0 ? `${delta > 0 ? "+" : ""}${delta} (${pct}%)` : "no prior data");
  }
  if (socialData?.bluesky?.followers != null) {
    const delta = prevSocial.bkFollowers ? socialData.bluesky.followers - prevSocial.bkFollowers : 0;
    const pct = prevSocial.bkFollowers > 0 ? ((delta / prevSocial.bkFollowers) * 100).toFixed(1) : "—";
    socialGrowthCards += statCard("BLUESKY FOLLOWERS", fmt(socialData.bluesky.followers), delta !== 0 ? `${delta > 0 ? "+" : ""}${delta} (${pct}%)` : "no prior data");
  }
  if (sbData?.members?.total != null) {
    socialGrowthCards += statCard("VAULT MEMBERS", fmt(sbData.members.total), `+${sbData.members.newThisWeek || 0} this week`);
  }

  // ── Stars + forks aggregate ──
  let totalStars = 0, totalForks = 0, totalWatchers = 0;
  for (const p of active) {
    const repo = ghData[p.githubRepo]?.repo;
    if (repo) {
      totalStars += repo.stars || 0;
      totalForks += repo.forks || 0;
      totalWatchers += repo.watchers || 0;
    }
  }

  // ── Score volatility (σ across snapshots) ──
  let scoreVolatility = "—";
  if (scoreHistory.length >= 3) {
    const avgs = scoreHistory.slice(-10).map((snap) => {
      const vals = Object.values(snap.scores || {}).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }).filter((v) => v != null);
    if (avgs.length >= 3) {
      const mean = avgs.reduce((a, b) => a + b, 0) / avgs.length;
      const variance = avgs.reduce((s, v) => s + (v - mean) ** 2, 0) / avgs.length;
      scoreVolatility = Math.sqrt(variance).toFixed(1);
    }
  }

  // ── Deployment frequency ──
  let deploys30d = 0;
  for (const p of active) {
    const deps = ghData[p.githubRepo]?.deployments || [];
    deploys30d += deps.filter((d) => new Date(d.createdAt).getTime() > thirtyDaysAgo).length;
  }

  // ── Release freshness ──
  let releasesTotal = 0, freshReleases = 0;
  for (const p of active) {
    const rel = ghData[p.githubRepo]?.latestRelease;
    if (rel) {
      releasesTotal++;
      if (new Date(rel.publishedAt).getTime() > thirtyDaysAgo) freshReleases++;
    }
  }

  return `
    ${section("Code Velocity + Churn Analysis", "📊", `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        ${statCard("THIS WEEK", thisWeekCommits + " commits", `vs ${lastWeekCommits} last week`)}
        ${statCard("WEEK-OVER-WEEK", churnLabel, `<span style="color:${churnColor}">${churnDelta > 0 ? "acceleration" : churnDelta < 0 ? "deceleration" : "stable"}</span>`)}
        ${statCard("AVG PR AGE", avgPRAgeDays + "d", `${totalPRs} open PRs`)}
        ${statCard("OLDEST PR", Math.round(oldestPRDays) + " days", totalPRs > 0 ? "review needed" : "none open")}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${statCard("DEPLOYS (30d)", String(deploys30d), `across ${active.length} projects`)}
        ${statCard("FRESH RELEASES", `${freshReleases}/${releasesTotal}`, "shipped in last 30d")}
        ${statCard("FIX COMMITS", String(totalClosed), `${issueResolutionRate}% resolution signal`)}
        ${statCard("SCORE VOLATILITY", scoreVolatility + " σ", "portfolio avg std dev")}
      </div>
    `)}

    ${section("Commit Pattern Analysis", "🗓", `
      <div style="margin-bottom:12px;">
        <div style="font-size:10px;color:var(--muted);margin-bottom:8px;">Commits by Day of Week · Peak day: <span style="color:var(--cyan);font-weight:700;">${peakDay}</span></div>
        <div style="display:flex;gap:8px;align-items:flex-end;height:80px;">
          ${dayBuckets.map((count, i) => {
            const h = Math.round((count / maxDay) * 70);
            const isMax = count === Math.max(...dayBuckets);
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
              <span style="font-size:9px;color:var(--muted);">${count}</span>
              <div style="width:100%;height:${h}px;background:${isMax ? "var(--cyan)" : "rgba(255,255,255,0.1)"};border-radius:4px 4px 0 0;transition:height 0.3s;"></div>
              <span style="font-size:9px;color:var(--muted);">${dayLabels[i]}</span>
            </div>`;
          }).join("")}
        </div>
      </div>
    `)}

    ${section("Repo Health Distribution", "🏥", `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        ${statCard("EXCELLENT (80+)", String(healthBuckets.excellent), `${Math.round(healthBuckets.excellent / totalProj * 100)}% of portfolio`)}
        ${statCard("GOOD (60–79)", String(healthBuckets.good), `${Math.round(healthBuckets.good / totalProj * 100)}% of portfolio`)}
        ${statCard("FAIR (40–59)", String(healthBuckets.fair), `${Math.round(healthBuckets.fair / totalProj * 100)}% of portfolio`)}
        ${statCard("POOR (<40)", String(healthBuckets.poor), `${Math.round(healthBuckets.poor / totalProj * 100)}% of portfolio`)}
      </div>
      <div style="display:flex;height:18px;border-radius:6px;overflow:hidden;">
        ${healthBuckets.excellent > 0 ? `<div style="flex:${healthBuckets.excellent};background:var(--green);" title="${healthBuckets.excellent} excellent"></div>` : ""}
        ${healthBuckets.good > 0 ? `<div style="flex:${healthBuckets.good};background:var(--cyan);" title="${healthBuckets.good} good"></div>` : ""}
        ${healthBuckets.fair > 0 ? `<div style="flex:${healthBuckets.fair};background:var(--yellow);" title="${healthBuckets.fair} fair"></div>` : ""}
        ${healthBuckets.poor > 0 ? `<div style="flex:${healthBuckets.poor};background:var(--red);" title="${healthBuckets.poor} poor"></div>` : ""}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:9px;color:var(--muted);">
        <span>Excellent</span><span>Good</span><span>Fair</span><span>Poor</span>
      </div>
    `)}

    ${socialGrowthCards ? section("Growth & Audience Metrics", "📈", `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
        ${socialGrowthCards}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${statCard("TOTAL STARS", fmt(totalStars), "across all repos")}
        ${statCard("TOTAL FORKS", fmt(totalForks), "across all repos")}
        ${statCard("OPEN ISSUES", fmt(totalOpen), `${active.length} repos tracked`)}
      </div>
    `) : section("Growth & Audience Metrics", "📈", `
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${statCard("TOTAL STARS", fmt(totalStars), "across all repos")}
        ${statCard("TOTAL FORKS", fmt(totalForks), "across all repos")}
        ${statCard("OPEN ISSUES", fmt(totalOpen), `${active.length} repos tracked`)}
      </div>
    `)}
  `;
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBSITE ANALYTICS TAB
// ══════════════════════════════════════════════════════════════════════════════

function cwvGrade(metric, value) {
  if (value == null) return { label: "—", color: "var(--muted)" };
  const thresholds = {
    lcp:  [2500, 4000],
    fid:  [100, 300],
    cls:  [0.1, 0.25],
    inp:  [200, 500],
    fcp:  [1800, 3000],
    tbt:  [200, 600],
    si:   [3400, 5800],
    tti:  [3800, 7300],
  };
  const t = thresholds[metric];
  if (!t) return { label: String(Math.round(value)), color: "var(--cyan)" };
  if (value <= t[0]) return { label: "Good", color: "var(--green)" };
  if (value <= t[1]) return { label: "Needs Work", color: "var(--yellow)" };
  return { label: "Poor", color: "var(--red)" };
}

function fmtMs(ms) {
  if (ms == null) return "—";
  return ms >= 1000 ? (ms / 1000).toFixed(1) + "s" : Math.round(ms) + "ms";
}

function lighthouseGauge(label, score, size = 64) {
  if (score == null) return "";
  const color = score >= 90 ? "var(--green)" : score >= 50 ? "var(--yellow)" : "var(--red)";
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return `
    <div style="text-align:center;min-width:${size + 20}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;margin:0 auto;">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="4"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="4"
          stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
          transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dasharray 0.6s;"/>
        <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" fill="${color}" font-size="16" font-weight="900">${score}</text>
      </svg>
      <div style="font-size:9px;color:var(--muted);margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${label}</div>
    </div>`;
}

function seoCheckRow(label, passed) {
  const icon = passed ? "pass" : "fail";
  const color = passed ? "var(--green)" : "var(--red)";
  const symbol = passed ? "\u2713" : "\u2717";
  return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
    <span style="color:${color};font-weight:700;font-size:13px;width:16px;text-align:center;">${symbol}</span>
    <span style="font-size:11px;color:var(--text);flex:1;">${label}</span>
    <span style="font-size:9px;color:${color};font-weight:600;text-transform:uppercase;">${icon}</span>
  </div>`;
}

function renderWebsiteAnalytics(psiData, probeData, loading, ghData) {
  if (loading) {
    return `
      <div style="text-align:center;padding:60px 20px;">
        <div style="font-size:32px;margin-bottom:16px;animation:pulse 1.5s infinite;">🌐</div>
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:8px;">Analyzing ${SITE_URL}</div>
        <div style="font-size:11px;color:var(--muted);">Running PageSpeed Insights + SEO probe across ${SITE_PAGES.length} pages...</div>
        <div style="margin-top:20px;width:200px;height:3px;background:var(--border);border-radius:2px;overflow:hidden;display:inline-block;">
          <div style="width:60%;height:100%;background:var(--cyan);border-radius:2px;animation:loading-bar 2s ease-in-out infinite;"></div>
        </div>
      </div>
      <style>@keyframes loading-bar{0%{transform:translateX(-100%)}50%{transform:translateX(60%)}100%{transform:translateX(200%)}}</style>`;
  }

  if (!psiData && !probeData) {
    return `
      <div style="text-align:center;padding:60px 20px;">
        <div style="font-size:32px;margin-bottom:16px;">🌐</div>
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:8px;">Website Analytics</div>
        <div style="font-size:11px;color:var(--muted);max-width:400px;margin:0 auto;">
          Click this tab to start analyzing <strong>${SITE_URL}</strong>.<br>
          Uses Google PageSpeed Insights API + direct page probing to deliver Lighthouse scores, Core Web Vitals, SEO audit, and security analysis.
        </div>
      </div>`;
  }

  // Compute overall health score
  const health = computeWebsiteHealthScore(psiData, probeData);

  // ── Website repo deployment data ──
  const websiteRepo = "VaultSparkStudios/VaultSparkStudios.github.io";
  const rd = ghData[websiteRepo] || {};
  const deployments = rd.deployments || [];
  const commits = rd.commits || [];
  const ciRuns = rd.ciRuns || [];
  const recentDeploys = deployments.filter((d) => Date.now() - new Date(d.createdAt).getTime() < 30 * 86400000).length;
  const lastCommitDate = commits[0]?.date || null;
  const lastDeployDate = deployments[0]?.createdAt || null;
  const ciStatus = ciRuns[0]?.conclusion === "success" ? "Passing" : ciRuns[0]?.conclusion || "Unknown";
  const ciColor = ciStatus === "Passing" ? "var(--green)" : ciStatus === "failure" ? "var(--red)" : "var(--muted)";

  // ── Site-wide averages from PSI ──
  const pagesWithScores = (psiData?.pages || []).filter((p) => p.scores);
  const avg = (key) => {
    const vals = pagesWithScores.map((p) => p.scores[key]).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  const avgPerf = avg("performance");
  const avgA11y = avg("accessibility");
  const avgSEO  = avg("seo");
  const avgBP   = avg("bestPractices");

  // ── Aggregated opportunities ──
  const allOpps = [];
  for (const page of (psiData?.pages || [])) {
    for (const opp of (page.opportunities || [])) {
      allOpps.push({ ...opp, page: page.page });
    }
  }
  allOpps.sort((a, b) => (b.savings || 0) - (a.savings || 0));
  const topOpps = allOpps.slice(0, 10);

  // ── SEO checks from probe ──
  const homePage = (probeData?.pages || []).find((p) => p.path === "/");

  // ── Security headers ──
  const secHeaders = probeData?.securityHeaders || {};
  const secHeaderCount = Object.values(secHeaders).filter(Boolean).length;
  const secHeaderTotal = Object.keys(secHeaders).length || 8;
  const secScore = Math.round((secHeaderCount / secHeaderTotal) * 100);

  return `
    ${section("Website Health Score", "🌐", `
      <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
        <div style="text-align:center;">
          ${lighthouseGauge("HEALTH", health.score, 80)}
        </div>
        <div style="flex:1;min-width:200px;">
          <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">Score Breakdown</div>
          ${health.breakdown.performance != null ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:10px;color:var(--muted);width:90px;">Performance</span>
            ${miniBar(health.breakdown.performance, 30, "var(--cyan)")}
            <span style="font-size:10px;font-weight:600;color:var(--cyan);width:28px;text-align:right;">${health.breakdown.performance}/30</span>
          </div>` : ""}
          ${health.breakdown.seo != null ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:10px;color:var(--muted);width:90px;">SEO</span>
            ${miniBar(health.breakdown.seo, 25, "var(--green)")}
            <span style="font-size:10px;font-weight:600;color:var(--green);width:28px;text-align:right;">${health.breakdown.seo}/25</span>
          </div>` : ""}
          ${health.breakdown.accessibility != null ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:10px;color:var(--muted);width:90px;">Accessibility</span>
            ${miniBar(health.breakdown.accessibility, 20, "var(--yellow)")}
            <span style="font-size:10px;font-weight:600;color:var(--yellow);width:28px;text-align:right;">${health.breakdown.accessibility}/20</span>
          </div>` : ""}
          ${health.breakdown.bestPractices != null ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:10px;color:var(--muted);width:90px;">Best Practices</span>
            ${miniBar(health.breakdown.bestPractices, 10, "#a78bfa")}
            <span style="font-size:10px;font-weight:600;color:#a78bfa;width:28px;text-align:right;">${health.breakdown.bestPractices}/10</span>
          </div>` : ""}
          ${health.breakdown.infrastructure != null ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:10px;color:var(--muted);width:90px;">Infrastructure</span>
            ${miniBar(health.breakdown.infrastructure, 15, "#fb923c")}
            <span style="font-size:10px;font-weight:600;color:#fb923c;width:28px;text-align:right;">${health.breakdown.infrastructure}/15</span>
          </div>` : ""}
        </div>
      </div>
      <div style="margin-top:14px;font-size:10px;color:var(--muted);">
        Analyzed ${pagesWithScores.length} page${pagesWithScores.length !== 1 ? "s" : ""} · Mobile strategy
        ${psiData?.fetchedAt ? ` · Last run ${new Date(psiData.fetchedAt).toLocaleTimeString()}` : ""}
      </div>
    `)}

    ${section("Lighthouse Scores (Site Average)", "💡", `
      <div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;padding:12px 0;">
        ${lighthouseGauge("Performance", avgPerf)}
        ${lighthouseGauge("Accessibility", avgA11y)}
        ${lighthouseGauge("SEO", avgSEO)}
        ${lighthouseGauge("Best Practices", avgBP)}
      </div>
    `)}

    ${section("Core Web Vitals", "⚡", `
      ${pagesWithScores.length > 0 ? pagesWithScores.map((p) => {
        const c = p.cwv || {};
        return `
          <div style="margin-bottom:16px;">
            <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:8px;">${p.page} <span style="color:var(--muted);font-weight:400;">${p.path}</span></div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              ${[
                ["LCP", "lcp", c.lcp],
                ["FCP", "fcp", c.fcp],
                ["TBT", "tbt", c.tbt],
                ["CLS", "cls", c.cls],
                ["SI", "si", c.si],
                ["TTI", "tti", c.tti],
              ].map(([label, key, val]) => {
                const g = cwvGrade(key, val);
                const display = key === "cls" ? (val != null ? val.toFixed(3) : "—") : fmtMs(val);
                return `<div style="flex:1;min-width:80px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:8px 10px;">
                  <div style="font-size:9px;color:var(--muted);letter-spacing:0.06em;margin-bottom:2px;">${label}</div>
                  <div style="font-size:18px;font-weight:900;color:${g.color};">${display}</div>
                  <div style="font-size:9px;color:${g.color};font-weight:600;">${g.label}</div>
                </div>`;
              }).join("")}
            </div>
            ${p.fieldData?.overallCategory ? `<div style="margin-top:6px;font-size:10px;color:var(--muted);">CrUX field data: <span style="color:${p.fieldData.overallCategory === "FAST" ? "var(--green)" : p.fieldData.overallCategory === "AVERAGE" ? "var(--yellow)" : "var(--red)"};font-weight:600;">${p.fieldData.overallCategory}</span></div>` : ""}
          </div>`;
      }).join("") : '<div style="font-size:11px;color:var(--muted);">No PageSpeed data available</div>'}
    `)}

    ${section("Page-by-Page Lighthouse Breakdown", "📄", `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);">
              <th style="text-align:left;padding:8px 6px;color:var(--muted);font-size:10px;font-weight:600;">PAGE</th>
              <th style="text-align:center;padding:8px 6px;color:var(--muted);font-size:10px;">PERF</th>
              <th style="text-align:center;padding:8px 6px;color:var(--muted);font-size:10px;">A11Y</th>
              <th style="text-align:center;padding:8px 6px;color:var(--muted);font-size:10px;">SEO</th>
              <th style="text-align:center;padding:8px 6px;color:var(--muted);font-size:10px;">BP</th>
              <th style="text-align:center;padding:8px 6px;color:var(--muted);font-size:10px;">LCP</th>
              <th style="text-align:center;padding:8px 6px;color:var(--muted);font-size:10px;">CLS</th>
            </tr>
          </thead>
          <tbody>
            ${(psiData?.pages || []).map((p) => {
              if (p.error) return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                <td style="padding:6px;">${p.page}</td>
                <td colspan="6" style="padding:6px;color:var(--red);font-size:10px;">${p.error}</td>
              </tr>`;
              const s = p.scores || {};
              const sc = (v) => `<span style="color:${scoreColor(v)};font-weight:700;">${v ?? "—"}</span>`;
              const lcpG = cwvGrade("lcp", p.cwv?.lcp);
              const clsG = cwvGrade("cls", p.cwv?.cls);
              return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                <td style="padding:6px;font-weight:600;color:var(--text);">${p.page}<br><span style="font-size:9px;color:var(--muted);font-weight:400;">${p.path}</span></td>
                <td style="padding:6px;text-align:center;">${sc(s.performance)}</td>
                <td style="padding:6px;text-align:center;">${sc(s.accessibility)}</td>
                <td style="padding:6px;text-align:center;">${sc(s.seo)}</td>
                <td style="padding:6px;text-align:center;">${sc(s.bestPractices)}</td>
                <td style="padding:6px;text-align:center;color:${lcpG.color};font-weight:600;">${fmtMs(p.cwv?.lcp)}</td>
                <td style="padding:6px;text-align:center;color:${clsG.color};font-weight:600;">${p.cwv?.cls != null ? p.cwv.cls.toFixed(3) : "—"}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `)}

    ${section("SEO Audit", "🔍", `
      ${homePage ? `
        <div style="display:flex;gap:20px;flex-wrap:wrap;">
          <div style="flex:1;min-width:220px;">
            <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:10px;">On-Page SEO Checks</div>
            ${seoCheckRow("Page title exists", !!homePage.title)}
            ${seoCheckRow("Meta description", !!homePage.description)}
            ${seoCheckRow("Open Graph title", !!homePage.og?.title)}
            ${seoCheckRow("Open Graph image", !!homePage.og?.image)}
            ${seoCheckRow("Open Graph description", !!homePage.og?.description)}
            ${seoCheckRow("Twitter card meta", !!homePage.twitter?.card)}
            ${seoCheckRow("Viewport meta tag", !!homePage.viewport)}
            ${seoCheckRow("Canonical link", !!homePage.canonical)}
            ${seoCheckRow("Structured data (JSON-LD)", !!homePage.hasStructuredData)}
            ${seoCheckRow("Favicon declared", !!homePage.favicon)}
            ${seoCheckRow("HTML lang attribute", !!homePage.hasLang)}
            ${seoCheckRow("Charset declared", !!homePage.hasCharset)}
          </div>
          <div style="flex:1;min-width:220px;">
            <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:10px;">Site Infrastructure</div>
            ${seoCheckRow("robots.txt exists", !!probeData?.robotsTxt?.exists)}
            ${seoCheckRow("robots.txt has sitemap ref", !!probeData?.robotsTxt?.hasSitemap)}
            ${seoCheckRow("sitemap.xml exists", !!probeData?.sitemap?.exists)}
            ${probeData?.sitemap?.exists ? `<div style="font-size:10px;color:var(--muted);padding:4px 0 4px 24px;">${probeData.sitemap.urlCount} URLs · ${probeData.sitemap.hasLastmod ? "has lastmod" : "no lastmod"}</div>` : ""}
            ${seoCheckRow("HTTPS enabled", !!probeData?.https)}
            <div style="margin-top:12px;font-size:11px;font-weight:700;color:var(--text);margin-bottom:10px;">Content Structure (Homepage)</div>
            ${kv("Title", homePage.title ? `"${homePage.title.slice(0, 50)}"` : "Missing")}
            ${kv("H1 tags", String(homePage.headings?.h1 || 0), homePage.headings?.h1 === 1 ? "var(--green)" : "var(--yellow)")}
            ${kv("H2 tags", String(homePage.headings?.h2 || 0))}
            ${kv("Images", `${homePage.images?.total || 0} total, ${homePage.images?.withAlt || 0} with alt`)}
            ${kv("Internal links", String(homePage.links?.internal || 0))}
            ${kv("External links", String(homePage.links?.external || 0))}
            ${kv("Page size", homePage.htmlSize ? (homePage.htmlSize / 1024).toFixed(0) + " KB" : "—")}
          </div>
        </div>
      ` : '<div style="font-size:11px;color:var(--muted);">No probe data available</div>'}
    `)}

    ${probeData?.pages?.length > 1 ? section("Page Meta Tags Audit", "🏷", `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);">
              <th style="text-align:left;padding:6px;color:var(--muted);font-weight:600;">PAGE</th>
              <th style="text-align:center;padding:6px;color:var(--muted);">TITLE</th>
              <th style="text-align:center;padding:6px;color:var(--muted);">DESC</th>
              <th style="text-align:center;padding:6px;color:var(--muted);">OG</th>
              <th style="text-align:center;padding:6px;color:var(--muted);">JSON-LD</th>
              <th style="text-align:center;padding:6px;color:var(--muted);">H1</th>
              <th style="text-align:center;padding:6px;color:var(--muted);">ALT IMG</th>
            </tr>
          </thead>
          <tbody>
            ${probeData.pages.filter((p) => !p.error).map((p) => {
              const check = (v) => v ? '<span style="color:var(--green);">\u2713</span>' : '<span style="color:var(--red);">\u2717</span>';
              const imgPct = p.images?.total > 0 ? Math.round((p.images.withAlt / p.images.total) * 100) + "%" : "—";
              return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                <td style="padding:6px;font-weight:600;">${p.label}<br><span style="color:var(--muted);font-weight:400;">${p.path}</span></td>
                <td style="text-align:center;padding:6px;">${check(p.title)}</td>
                <td style="text-align:center;padding:6px;">${check(p.description)}</td>
                <td style="text-align:center;padding:6px;">${check(p.og?.title && p.og?.image)}</td>
                <td style="text-align:center;padding:6px;">${check(p.hasStructuredData)}</td>
                <td style="text-align:center;padding:6px;color:${p.headings?.h1 === 1 ? "var(--green)" : "var(--yellow)"};">${p.headings?.h1 ?? "—"}</td>
                <td style="text-align:center;padding:6px;">${imgPct}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `) : ""}

    ${section("Security Headers", "🛡", `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px;">
        <div>
          <span style="font-size:28px;font-weight:900;color:${secScore >= 75 ? "var(--green)" : secScore >= 50 ? "var(--yellow)" : "var(--red)"};">${secScore}</span>
          <span style="font-size:11px;color:var(--muted);margin-left:4px;">/100</span>
        </div>
        <div style="flex:1;">
          ${miniBar(secHeaderCount, secHeaderTotal, secScore >= 75 ? "var(--green)" : secScore >= 50 ? "var(--yellow)" : "var(--red)", 8)}
          <div style="font-size:10px;color:var(--muted);margin-top:4px;">${secHeaderCount}/${secHeaderTotal} security headers present</div>
        </div>
      </div>
      <div>
        ${Object.entries(secHeaders).map(([h, v]) => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="color:${v ? "var(--green)" : "var(--red)"};font-weight:700;font-size:13px;width:16px;text-align:center;">${v ? "\u2713" : "\u2717"}</span>
            <span style="font-size:11px;color:var(--text);flex:1;font-family:monospace;">${h}</span>
            <span style="font-size:9px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v ? v.slice(0, 60) : "missing"}</span>
          </div>
        `).join("")}
      </div>
    `)}

    ${section("Deployment & CI", "🚀", `
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${statCard("DEPLOYS (30d)", String(recentDeploys), "to GitHub Pages")}
        ${statCard("LAST COMMIT", lastCommitDate ? new Date(lastCommitDate).toLocaleDateString() : "—", "")}
        ${statCard("LAST DEPLOY", lastDeployDate ? new Date(lastDeployDate).toLocaleDateString() : "—", "")}
        ${statCard("CI STATUS", ciStatus, `<span style="color:${ciColor};">${ciRuns[0]?.name || "deploy-pages"}</span>`)}
      </div>
      ${commits.length > 0 ? `
        <div style="margin-top:14px;font-size:11px;font-weight:700;color:var(--text);margin-bottom:8px;">Recent Commits</div>
        ${commits.slice(0, 5).map((c) => `
          <div style="display:flex;gap:8px;align-items:baseline;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <span style="font-size:9px;color:var(--muted);min-width:70px;">${new Date(c.date).toLocaleDateString()}</span>
            <span style="font-size:10px;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.message}</span>
          </div>
        `).join("")}
      ` : ""}
    `)}

    ${topOpps.length > 0 ? section("Top Optimization Opportunities", "🎯", `
      <div style="font-size:10px;color:var(--muted);margin-bottom:10px;">Sorted by estimated time savings (from Lighthouse)</div>
      ${topOpps.map((o) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="font-size:10px;color:var(--muted);min-width:70px;">${o.page}</span>
          <span style="font-size:11px;color:var(--text);flex:1;">${o.title}</span>
          ${o.savings ? `<span style="font-size:10px;font-weight:700;color:var(--yellow);">-${fmtMs(o.savings)}</span>` : ""}
        </div>
      `).join("")}
    `) : ""}
  `;
}

// ── Analytics tab bar helper ──────────────────────────────────────────────────
function analyticsTabBar(activeTab) {
  const tabs = [
    { id: "overview",     label: "Overview" },
    { id: "portfolio",    label: "Portfolio" },
    { id: "development",  label: "Development" },
    { id: "engagement",   label: "Engagement" },
    { id: "intelligence", label: "Intelligence" },
    { id: "website",      label: "Website" },
    { id: "advanced",     label: "Advanced" },
  ];
  return `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:12px;">
      ${tabs.map((t) => `
        <div data-analytics-tab="${t.id}" style="
          padding:7px 16px;font-size:12px;font-weight:600;border-radius:6px;cursor:pointer;
          transition:all 0.15s;letter-spacing:0.02em;
          ${activeTab === t.id
            ? "background:var(--cyan);color:#000;"
            : "background:rgba(255,255,255,0.05);color:var(--muted);border:1px solid var(--border);"
          }" tabindex="0" role="tab" aria-selected="${activeTab === t.id}">${t.label}</div>
      `).join("")}
    </div>`;
}

export function renderAnalyticsView(state) {
  const {
    ghData = {}, sbData = null, socialData = null, beaconData = null,
    scoreHistory = [], scorePrev = {}, alertCount = 0,
    agentRequests = [], agentRunHistory = {}, portfolioFreshness = {},
    studioBrain = null, competitorData = null, syncMeta = null,
    analyticsTab = "overview",
    websitePsi = null, websiteProbe = null, websiteLoading = false,
  } = state;

  // Compute all project scores (uses existing cache — fast)
  const allScores = PROJECTS.map((p) => {
    const rd = ghData[p.githubRepo] || null;
    try {
      const sc = scoreProject(p, rd, sbData, socialData);
      return { ...sc, id: p.id, name: p.name };
    } catch {
      return { total: 0, pillars: {}, id: p.id, name: p.name };
    }
  });

  // Compute all 10 proprietary scores
  const svi  = computeSVI(ghData, sbData, scoreHistory, alertCount);
  const pbs  = computePBS(allScores);
  const rcr  = computeRCR(ghData);
  const crs  = computeCRS(ghData, scoreHistory);
  const crs2 = computeCRS2(socialData);
  const dti  = computeDTI(ghData);
  const socr = computeSOCR();
  const eci  = computeECI(sbData);
  const fcr  = computeFCR();
  const aas  = computeAAS(beaconData, agentRequests, agentRunHistory, portfolioFreshness);

  const lastSync = syncMeta?.gh ? `Last synced ${timeAgo(new Date(syncMeta.gh).toISOString())}` : "Not synced yet";

  // Tab-specific content
  const tabContent = {
    overview: () => `
      ${renderCockpit({ svi, pbs, rcr, crs, crs2, dti, socr, eci, fcr, aas })}
      ${renderVitality(svi, scoreHistory)}
      ${renderLeaderboard(allScores, scorePrev, pbs)}`,
    portfolio: () => `
      ${renderLeaderboard(allScores, scorePrev, pbs)}
      ${renderForecast(fcr, scoreHistory, ghData, scorePrev)}
      ${renderGovernance(socr, portfolioFreshness)}`,
    development: () => `
      ${renderCI(crs, dti, ghData)}
      ${renderRelease(rcr, ghData)}
      ${renderGitHub(ghData, competitorData)}`,
    engagement: () => `
      ${renderEngagement(eci, sbData)}
      ${renderSocial(crs2, socialData)}`,
    intelligence: () => `
      ${renderForecast(fcr, scoreHistory, ghData, scorePrev)}
      ${renderGovernance(socr, portfolioFreshness)}
      ${renderAgentOps(aas, beaconData, agentRequests, agentRunHistory, studioBrain)}`,
    website: () => renderWebsiteAnalytics(websitePsi, websiteProbe, websiteLoading, ghData),
    advanced: () => renderAdvancedStats(ghData, sbData, socialData, scoreHistory, allScores),
  };

  return `
    <div class="main-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px;">
        <div>
          <h1 style="font-size:22px;font-weight:900;margin:0;letter-spacing:-0.02em;">Analytics Hub</h1>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">${lastSync} · ${PROJECTS.length} projects · all data sources aggregated</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span style="font-size:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--muted);">
            Studio Vitality ${svi.svi}/100 ${svi.trend}
          </span>
          <span style="font-size:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--muted);">
            ${PROJECTS.filter((p) => p.status === "live").length} live · ${PROJECTS.filter((p) => p.status === "client-beta").length} beta
          </span>
        </div>
      </div>

      ${analyticsTabBar(analyticsTab)}
      ${(tabContent[analyticsTab] || tabContent.overview)()}
    </div>`;
}
