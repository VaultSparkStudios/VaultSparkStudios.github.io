// src/engine/syncEngine.js
// Extracted from clientApp.js — data sync orchestration.
// Use createSyncEngine(ctx) to get { syncAll }.
//
// ctx shape: { state, config, render, clearSessionCache, logActivity,
//              loadContextForProject, loadExtendedDataForProject }

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject, clearScoringCache } from "../utils/projectScoring.js";
import { safeGetJSON } from "../utils/helpers.js";
import { showToast } from "../components/toastManager.js";
import {
  fetchAllRepos, fetchOrgActivity, fetchBeaconGist, getRateLimitInfo,
  clearFetchErrors, countCachedRepos,
  fetchStudioBrain, fetchAgentRequests, fetchPortfolioFreshness,
  fetchPortfolioFileContents, fetchAgentRunHistory, submitAgentRequest,
} from "../data/githubAdapter.js";
import { fetchAllSupabaseData } from "../data/supabaseAdapter.js";
import { fetchAllSocialFeeds } from "../data/socialFeedsAdapter.js";
import { pushAlertHistory } from "../components/studioHubView.js";
import { loadStoredCredentials } from "../components/settingsView.js";
import { forecastScores, recordForecastOutcomes } from "../utils/scoreForecast.js";
import { fetchTopPrescriptions } from "../utils/aiPrescriptions.js";
import { loadScoreHistory, pushScoreHistory, scorePrevFromHistory } from "../utils/scoreHistory.js";

export function createSyncEngine(ctx) {
  const { state, config, render, clearSessionCache, logActivity, loadContextForProject, loadExtendedDataForProject } = ctx;

  let _prevCiStates = {};
  let refreshTimer = null;

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("sync_timeout")), ms)),
    ]);
  }

  // ── GitHub Platform Status check (#8) ────────────────────────────────────────
  // Fire-and-forget on each sync — updates state.githubStatusAlert.
  function checkGithubStatus() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    fetch("https://api.githubstatus.com/v2/status.json", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        clearTimeout(timeout);
        const indicator = data?.status?.indicator;
        const desc = data?.status?.description || "";
        state.githubStatusAlert = indicator && indicator !== "none"
          ? `${indicator.toUpperCase()}: ${desc}`
          : null;
        render();
      })
      .catch(() => { clearTimeout(timeout); }); // Never block sync on this
  }

  // ── Discord webhook push notification (#13) ───────────────────────────────────
  async function sendDiscordAlert(message, webhookUrl) {
    if (!webhookUrl || !message) return;
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: message,
          username: "VaultSpark Hub",
          embeds: [{ description: message, color: 0xf87171 }],
        }),
      });
    } catch {}
  }

  async function checkCiNotifications(ghData) {
    if (!("Notification" in window)) return;
    for (const p of PROJECTS) {
      const d = ghData[p.githubRepo];
      const curr = d?.ciRuns?.[0]?.conclusion;
      const prev = _prevCiStates[p.id];
      if (curr === "failure" && prev !== "failure" && prev !== undefined) {
        if (Notification.permission === "granted") {
          new Notification(`CI Failed: ${p.name}`, {
            body: `Build failing on ${d.ciRuns[0].name}`,
            tag: `ci-${p.id}`,
          });
        } else if (Notification.permission !== "denied") {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            new Notification(`CI Failed: ${p.name}`, {
              body: `Build failing on ${d.ciRuns[0].name}`,
              tag: `ci-${p.id}`,
            });
          }
        }
      }
      if (curr !== undefined) _prevCiStates[p.id] = curr;
    }
  }

  async function syncAll() {
    // Rate limit pre-flight: hard stop at < 10%; throttle auto-refresh at < 500 remaining
    if (state.rateLimitInfo && state.rateLimitInfo.remaining != null && state.rateLimitInfo.limit != null) {
      const rem = state.rateLimitInfo.remaining;
      const pct = (rem / state.rateLimitInfo.limit) * 100;
      if (pct < 10) {
        state.syncError = `GitHub rate limit low: ${rem.toLocaleString()}/${state.rateLimitInfo.limit.toLocaleString()} remaining. Sync skipped to preserve quota.`;
        state.syncStatus = "degraded";
        showToast(`Rate limit low (${rem} remaining) — sync skipped.`, "warning", 8000);
        render();
        return;
      }
      state.rateLimitLow = rem < 500; // flag for UI badge + throttled refresh
    }

    state.syncStatus = "syncing";
    state.syncError  = null;
    render();

    // GitHub platform status check — non-blocking
    checkGithubStatus();

    const syncStartTime = Date.now();
    const repoPaths    = PROJECTS.filter((p) => p.githubRepo).map((p) => p.githubRepo);
    const credentials  = loadStoredCredentials();
    const beaconGistId = credentials.beaconGistId || "";
    // Snapshot cache status before fetch so we can report hits vs fresh fetches
    const preSyncCache = countCachedRepos(repoPaths, config.githubCacheTtlMs);
    const tGh = Date.now();
    clearFetchErrors();

    let ghRepos, ghActivity, sbData, socialData, beaconData;
    const sourceErrors = {};
    try {
      const results = await withTimeout(
        Promise.allSettled([
          fetchAllRepos(repoPaths, config.githubToken, config.githubCacheTtlMs),
          fetchOrgActivity("VaultSparkStudios", config.githubToken, config.githubCacheTtlMs),
          fetchAllSupabaseData(config.supabaseUrl, config.supabaseAnonKey, config.githubCacheTtlMs),
          fetchAllSocialFeeds(config.youtubeApiKey, config.socialCacheTtlMs, config.gumroadToken),
          fetchBeaconGist(beaconGistId, config.githubToken),
        ]),
        45000
      );
      [ghRepos, ghActivity, sbData, socialData, beaconData] = results.map((r, i) => {
        if (r.status === "rejected") {
          const labels = ["github", "github_activity", "supabase", "social", "beacon"];
          sourceErrors[labels[i]] = r.reason?.message || "failed";
          return i === 0 ? {} : null; // ghRepos needs to be object fallback
        }
        return r.value;
      });
    } catch (err) {
      state.syncStatus = "error";
      state.syncError  = err?.message === "sync_timeout" ? "Sync timed out after 45s — check network or GitHub API status." : `Sync failed: ${err?.message || "unknown error"}`;
      showToast(state.syncError, "error");
      render();
      return;
    }

    // Detect partial failure: token configured but all repos returned null
    const hasToken = !!config.githubToken;
    const anyRepoLoaded = Object.values(ghRepos || {}).some((v) => v !== null);
    if (hasToken && repoPaths.length > 0 && !anyRepoLoaded && !sourceErrors.github) {
      state.syncError = "GitHub data failed to load — token may be invalid or rate limited.";
      showToast(state.syncError, "warning");
    }
    state.syncErrors = sourceErrors;
    const sourceErrorCount = Object.keys(sourceErrors).length;

    // Save current social counts as "prev" for next sync delta calculation
    try {
      if (state.socialData) {
        const prev = {};
        if (state.socialData.youtube?.subscribers != null) prev.ytSubs = state.socialData.youtube.subscribers;
        if (state.socialData.reddit?.subscribers != null) prev.rdSubs = state.socialData.reddit.subscribers;
        if (state.socialData.bluesky?.followers != null) prev.bkFollowers = state.socialData.bluesky.followers;
        if (Object.keys(prev).length) localStorage.setItem("vshub_social_prev", JSON.stringify({ ts: Date.now(), ...prev }));
      }
    } catch {}

    state.ghData      = ghRepos;
    clearScoringCache(); // invalidate per-sync scoring cache when data changes
    if (!sessionStorage.getItem("vshub_star_baseline")) {
      const baseline = {};
      for (const [repo, d] of Object.entries(ghRepos)) {
        if (d?.repo) baseline[repo] = { stars: d.repo.stars, forks: d.repo.forks };
      }
      try { sessionStorage.setItem("vshub_star_baseline", JSON.stringify(baseline)); } catch {}
    }
    checkCiNotifications(ghRepos);
    state.ghActivity  = ghActivity;
    state.sbData      = sbData;
    state.socialData  = socialData;
    try { localStorage.setItem("vshub_social_fetched_at", String(Date.now())); } catch {}
    state.beaconData  = beaconData;
    // Track beacon session start times for duration display
    if (beaconData?.active) {
      for (const s of beaconData.active) {
        const key = `${s.project}:${s.agent || "claude"}`;
        if (!state.beaconSessionStarts[key]) {
          state.beaconSessionStarts[key] = Date.now();
        }
      }
      // Remove keys for sessions no longer active
      const activeKeys = new Set(beaconData.active.map((s) => `${s.project}:${s.agent || "claude"}`));
      for (const k of Object.keys(state.beaconSessionStarts)) {
        if (!activeKeys.has(k)) delete state.beaconSessionStarts[k];
      }
    }
    // Reset context file cache so lazy loader re-fetches on next project hub visit
    state.contextFiles        = {};
    state.contextFilesLoading = new Set();
    state.rateLimitInfo = getRateLimitInfo();
    const hasMeaningfulError = sourceErrorCount > 0 || !!state.syncError;
    state.syncStatus = hasMeaningfulError ? "degraded" : "live";
    if (sourceErrorCount > 0 && !state.syncError) {
      const failedSources = Object.keys(sourceErrors).join(", ");
      state.syncError = `Partial sync: ${failedSources} failed. Other sources loaded.`;
    }
    state.lastSyncTimestamp = Date.now();
    state.syncMeta      = { gh: tGh, sb: tGh, social: tGh, cachedRepos: preSyncCache.cached, freshRepos: preSyncCache.fresh, totalRepos: repoPaths.length };

    // Push new snapshot and update score state (guarded: only auto-push if 8h+ since last)
    const lastEntry = state.scoreHistory[state.scoreHistory.length - 1];
    const hoursSinceLast = lastEntry ? (Date.now() - lastEntry.ts) / 3600000 : Infinity;
    if (hoursSinceLast >= 8) {
      // Record forecast outcomes before pushing new snapshot (compare prev predictions to current actuals)
      const prevForecasts = forecastScores(state.scoreHistory);
      state.scoreHistory = pushScoreHistory(ghRepos, sbData, socialData);
      recordForecastOutcomes(prevForecasts, state.scoreHistory);
      logActivity("auto_snapshot", `${hoursSinceLast.toFixed(1)}h since last`);
    } else {
      // Still reload history in case it changed externally
      state.scoreHistory = loadScoreHistory();
    }
    state.scorePrev    = scorePrevFromHistory(state.scoreHistory);

    logActivity("sync", state.syncError ? "degraded" : "ok");
    const syncMs = Date.now() - syncStartTime;
    logActivity("sync_timing", `Sync complete in ${syncMs}ms (${syncMs < 2000 ? "mostly cached" : "fresh fetch"})`);
    try { window._hubBroadcastSync?.(); } catch {}

    // Studio Ops integration — fetch in background (non-blocking, best-effort)
    if (config.githubToken) {
      Promise.allSettled([
        fetchStudioBrain(config.githubToken, 300000),
        fetchAgentRequests(config.githubToken, 120000),
        fetchPortfolioFreshness(config.githubToken, 300000),
        fetchPortfolioFileContents(config.githubToken, 600000),
        fetchAgentRunHistory(config.githubToken, 300000),
      ]).then(([brain, requests, freshness, files, runHistory]) => {
        if (brain.status === "fulfilled")      state.studioBrain      = brain.value;
        if (requests.status === "fulfilled")   state.agentRequests    = requests.value || [];
        if (freshness.status === "fulfilled")  state.portfolioFreshness = freshness.value || {};
        if (files.status === "fulfilled")      state.portfolioFiles   = files.value || {};
        if (runHistory.status === "fulfilled") state.agentRunHistory  = runHistory.value || {};
        render();
      });
    }

    // Push active alerts to persistent alert history + compute alertCount for nav badge
    try {
      const allScoresForHistory = PROJECTS.map((p) => ({
        project: p,
        scoring: scoreProject(p, ghRepos[p.githubRepo] || null, sbData, socialData),
      }));
      const alertsForHistory = [];
      const ciFailingSet = new Set();
      for (const p of PROJECTS) {
        const d = ghRepos[p.githubRepo];
        if (!d) continue;
        if (d.ciRuns?.[0]?.conclusion === "failure") { alertsForHistory.push({ type: "error", msg: `${p.name}: CI build failing` }); ciFailingSet.add(p.id); }
        const staleDays = d.commits?.[0] ? Math.floor((Date.now() - new Date(d.commits[0].date).getTime()) / 86400000) : null;
        if (staleDays != null && staleDays >= 14) alertsForHistory.push({ type: staleDays >= 30 ? "warning" : "info", msg: `${p.name}: No commits in ${staleDays}d` });
        if ((d.prs || []).some((pr) => !pr.draft && Math.floor((Date.now() - new Date(pr.createdAt).getTime()) / 86400000) >= 3)) {
          alertsForHistory.push({ type: "warning", msg: `${p.name}: PR(s) open 3+ days` });
        }
      }
      for (const { project, scoring } of allScoresForHistory) {
        if (scoring.total <= 35 && ghRepos[project.githubRepo] && !ciFailingSet.has(project.id)) alertsForHistory.push({ type: "warning", msg: `${project.name}: Health score ${scoring.total}` });
      }
      if (alertsForHistory.length) pushAlertHistory(alertsForHistory);

      // Compute active (non-snoozed) alert count for nav badge
      let snoozed = safeGetJSON("vshub_alert_snooze", {});
      const now = Date.now();
      state.alertCount = alertsForHistory.filter((a) => !snoozed[a.msg] || snoozed[a.msg] < now).length;

      // Discord push notifications (#13) — send critical alerts to webhook (max once/day per alert)
      const discordWebhookUrl = credentials.discordWebhookUrl || "";
      if (discordWebhookUrl) {
        const criticals = alertsForHistory.filter((a) => a.type === "error");
        for (const alert of criticals.slice(0, 3)) { // Cap at 3 per sync
          const dedupeKey = `vshub_discord_sent_${btoa(alert.msg).slice(0, 20)}`;
          const lastSent = Number(sessionStorage.getItem(dedupeKey) || 0);
          if (Date.now() - lastSent > 3600000) { // At most once/hour per alert
            sessionStorage.setItem(dedupeKey, String(Date.now()));
            sendDiscordAlert(`🚨 **VaultSpark Hub Alert**\n${alert.msg}`, discordWebhookUrl).catch(() => {});
          }
        }
      }
    } catch {}

    render();

    // Re-trigger context and extended data load if currently viewing a project hub
    if (state.activeView.startsWith("project:")) {
      const pid = state.activeView.slice("project:".length);
      loadContextForProject(pid);
      loadExtendedDataForProject(pid);
    }

    // Eagerly fetch todoCount for live/beta projects so Risk pillar has data
    // without requiring a manual project hub visit. Fire-and-forget (no await).
    const eagerTodoProjects = PROJECTS.filter((p) =>
      p.githubRepo && ["live", "client-beta"].includes(p.status) &&
      state.projectExtendedData[p.id] === undefined
    );
    for (const p of eagerTodoProjects) {
      loadExtendedDataForProject(p.id);
    }

    // AI prescriptions — fetch for lowest-scoring projects (fire-and-forget, cache 12h) (#21)
    const claudeApiKey = loadStoredCredentials().claudeApiKey;
    if (claudeApiKey) {
      const allScoresForAI = PROJECTS.map((p) => ({
        project: p,
        scoring: scoreProject(p, ghRepos[p.githubRepo] || null, sbData, socialData),
      }));
      fetchTopPrescriptions(PROJECTS, allScoresForAI, ghRepos, claudeApiKey, 3)
        .then(() => {
          // Re-render only if project hub view is active (so prescriptions appear immediately)
          if (state.activeView.startsWith("project:")) render();
        })
        .catch(() => {});
    }

    // Bidirectional trigger — auto-create agent-request if score dropped below grade boundary
    if (config.githubToken) {
      try {
        const TRIGGER_THRESHOLD = 55; // grade B boundary
        const prevScores = state.scorePrev || {};
        const newHistory = state.scoreHistory;
        const latestScores = newHistory[newHistory.length - 1]?.scores || {};
        for (const p of PROJECTS) {
          const prev = prevScores[p.id];
          const curr = latestScores[p.id];
          if (prev == null || curr == null) continue;
          // Crossed below threshold this session
          if (prev >= TRIGGER_THRESHOLD && curr < TRIGGER_THRESHOLD) {
            const triggerKey = `vshub_triggered_${p.id}`;
            const lastTriggered = Number(sessionStorage.getItem(triggerKey) || 0);
            if (Date.now() - lastTriggered > 24 * 3600000) { // max once/day per project
              sessionStorage.setItem(triggerKey, String(Date.now()));
              submitAgentRequest(p.id, `Auto-trigger: ${p.name} score dropped to ${curr} (below B threshold). Review and improve score.`, config.githubToken)
                .catch(() => {}); // fire-and-forget
              logActivity("bidirectional_trigger", `${p.name} score ${prev}→${curr}`);
            }
          }
        }
      } catch {}
    }

    // Schedule next refresh — throttle to 30min when rate limit is low
    const configuredRefreshMs = state.settings.refreshMs ?? 300000;
    const refreshMs = state.rateLimitLow && configuredRefreshMs < 1800000 ? 1800000 : configuredRefreshMs;
    if (refreshTimer) clearTimeout(refreshTimer);
    if (refreshMs > 0) {
      refreshTimer = setTimeout(() => { clearSessionCache(); syncAll(); }, refreshMs);
    }
  }

  return { syncAll };
}
