// Settings view event handlers — extracted from clientApp.js
import { scoreColor } from "../utils/helpers.js";
import { showToast } from "../components/toastManager.js";

export function bindSettingsEvents(ctx) {
  const {
    state, render, config, syncAll, logActivity,
    loadStoredCredentials, saveCredentials, saveSettings, loadSettings,
    setHubPassword, clearHubPassword,
    invalidateWeightsCache, clearSessionCache,
    scoreProject, PROJECTS,
    downloadJSON, downloadCSV, downloadScoreHistoryCSV,
    generateWeeklyDigest, generateStandup,
    loadScoreHistory, scorePrevFromHistory,
    applyAccent, applyTheme, applyDensity, getHubRuntimeConfig,
  } = ctx;

  // Settings — remove password
  document.getElementById("clear-password-btn")?.addEventListener("click", async () => {
    await clearHubPassword();
    render();
  });

  // Settings — clear all
  document.getElementById("clear-all-btn")?.addEventListener("click", () => {
    if (!confirm("Clear all credentials and settings?")) return;
    [
      "vshub_credentials", "vshub_settings", "vshub_score_history", "vshub_action_queue",
      "vshub_pinned", "vshub_annotations", "vshub_tags", "vshub_filter_presets",
      "vshub_activity", "vshub_compare", "vshub_goals", "vshub_sprint",
      "vshub_alert_history", "vshub_alert_snooze", "vshub_notes", "vshub_hub_notes",
      "vshub_checklist", "vshub_roadmap",
    ].forEach((k) => localStorage.removeItem(k));
    clearSessionCache();
    Object.assign(state.settings, {});
    state.scoreHistory = [];
    state.scorePrev    = {};
    applyAccent("#7ae7c7");
    render();
  });

  // GitHub token test
  document.getElementById("test-github-token-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("test-github-token-btn");
    const statusEl = document.getElementById("github-token-test-status");
    const tokenInput = document.getElementById("setting-github-token");
    const token = tokenInput?.value?.trim() || config.githubToken;
    if (!token) { if (statusEl) statusEl.textContent = "No token to test."; return; }
    if (btn) btn.disabled = true;
    if (statusEl) { statusEl.textContent = "Testing…"; statusEl.style.color = "var(--muted)"; }
    try {
      const res = await fetch("https://api.github.com/rate_limit", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (res.ok) {
        const data = await res.json();
        const rem = data.rate?.remaining ?? "?";
        const lim = data.rate?.limit ?? "?";
        let loginStr = "";
        try {
          const userRes = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
          });
          if (userRes.ok) {
            const ud = await userRes.json();
            if (ud.login) loginStr = `as @${ud.login} · `;
          }
        } catch {}
        if (statusEl) {
          statusEl.textContent = `✓ Authenticated ${loginStr}${Number(rem).toLocaleString()} / ${Number(lim).toLocaleString()} remaining`;
          statusEl.style.color = "var(--green)";
        }
      } else if (res.status === 401) {
        if (statusEl) { statusEl.textContent = "✗ Invalid token (401 Unauthorized)"; statusEl.style.color = "var(--red)"; }
      } else {
        if (statusEl) { statusEl.textContent = `✗ Error ${res.status}`; statusEl.style.color = "var(--red)"; }
      }
    } catch {
      if (statusEl) { statusEl.textContent = "✗ Network error"; statusEl.style.color = "var(--red)"; }
    }
    if (btn) btn.disabled = false;
  });

  // Studio Pulse publish stub
  document.getElementById("publish-pulse-btn")?.addEventListener("click", async () => {
    const text     = document.getElementById("pulse-text")?.value?.trim();
    const btn      = document.getElementById("publish-pulse-btn");
    const statusEl = document.getElementById("pulse-status");
    if (!text || !btn) return;
    btn.disabled = true;
    if (statusEl) statusEl.textContent = "Publishing…";
    await new Promise((r) => setTimeout(r, 400));
    if (statusEl) statusEl.textContent = "API backend required to publish. Coming in VPS deployment.";
    btn.disabled = false;
  });

  // Export — JSON
  document.getElementById("export-json-btn")?.addEventListener("click", () => {
    downloadJSON(state);
    const s = document.getElementById("export-status");
    if (s) { s.textContent = "JSON downloaded."; setTimeout(() => { s.textContent = ""; }, 2500); }
  });

  // Export — CSV
  document.getElementById("export-csv-btn")?.addEventListener("click", () => {
    downloadCSV(state);
  });

  document.getElementById("export-score-history-csv-btn")?.addEventListener("click", () => {
    downloadScoreHistoryCSV(state);
    const s = document.getElementById("export-status");
    if (s) { s.textContent = "CSV downloaded."; setTimeout(() => { s.textContent = ""; }, 2500); }
  });

  // Import JSON
  document.getElementById("import-json-btn")?.addEventListener("click", () => {
    document.getElementById("import-json-file")?.click();
  });
  document.getElementById("import-json-file")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data.scoreHistory) && data.scoreHistory.length) {
          localStorage.setItem("vshub_score_history", JSON.stringify(data.scoreHistory));
          state.scoreHistory = data.scoreHistory;
          state.scorePrev = scorePrevFromHistory(data.scoreHistory);
        }
        const statusEl = document.getElementById("export-status");
        if (statusEl) { statusEl.textContent = `✓ Imported ${data.scoreHistory?.length || 0} history snapshots`; statusEl.style.color = "var(--green)"; }
        render();
      } catch {
        const statusEl = document.getElementById("export-status");
        if (statusEl) { statusEl.textContent = "✗ Invalid JSON file"; statusEl.style.color = "var(--red)"; }
      }
    };
    reader.readAsText(file);
  });

  // Export — JSON (hub header quick button)
  document.getElementById("export-snapshot-btn")?.addEventListener("click", () => downloadJSON(state));

  // Export score history JSON
  document.getElementById("export-score-history-btn")?.addEventListener("click", () => {
    try {
      const raw = localStorage.getItem("vshub_score_history") || "[]";
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `score-history-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  });

  // Export full hub state
  document.getElementById("export-hub-state-btn")?.addEventListener("click", () => {
    try {
      const dump = {};
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("vshub_")) dump[k] = localStorage.getItem(k);
      }
      dump._exportedAt = new Date().toISOString();
      dump._version = "1";
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hub-state-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const s = document.getElementById("hub-state-status");
      if (s) { s.textContent = `✓ Hub state exported (${Object.keys(dump).length - 2} keys)`; s.style.color = "var(--green)"; }
    } catch {}
  });

  // Import full hub state
  document.getElementById("import-hub-state-btn")?.addEventListener("click", () => {
    document.getElementById("import-hub-state-file")?.click();
  });
  document.getElementById("import-hub-state-file")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dump = JSON.parse(ev.target.result);
        let count = 0;
        for (const [k, v] of Object.entries(dump)) {
          if (k.startsWith("vshub_") && typeof v === "string") {
            localStorage.setItem(k, v);
            count++;
          }
        }
        state.scoreHistory = loadScoreHistory();
        state.scorePrev = scorePrevFromHistory(state.scoreHistory);
        const s = document.getElementById("hub-state-status");
        if (s) { s.textContent = `✓ Restored ${count} hub state keys`; s.style.color = "var(--green)"; }
        render();
      } catch {
        const s = document.getElementById("hub-state-status");
        if (s) { s.textContent = "✗ Invalid hub state file"; s.style.color = "var(--red)"; }
      }
    };
    reader.readAsText(file);
  });

  // ── Gist Cloud Sync — push (#8) ──────────────────────────────────────────
  document.getElementById("gist-push-btn")?.addEventListener("click", async () => {
    const statusEl = document.getElementById("gist-sync-status");
    const creds = loadStoredCredentials();
    const token = creds.githubToken;
    const gistId = document.getElementById("setting-cloud-sync-gist")?.value?.trim() || creds.cloudSyncGistId;
    if (!token || !gistId) {
      if (statusEl) { statusEl.textContent = "Set GitHub token + Cloud Sync Gist ID first"; statusEl.style.color = "var(--red)"; }
      return;
    }
    if (statusEl) { statusEl.textContent = "Pushing…"; statusEl.style.color = "var(--muted)"; }
    const result = await window._vshubGistPush?.(token, gistId);
    if (result?.ok) {
      if (statusEl) { statusEl.textContent = "✓ Pushed to Gist"; statusEl.style.color = "var(--green)"; }
      logActivity("gist_push", gistId);
    } else {
      if (statusEl) { statusEl.textContent = `✗ ${result?.error || "Push failed"}`; statusEl.style.color = "var(--red)"; }
    }
    setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 4000);
  });

  // ── Gist Cloud Sync — pull (#8) ──────────────────────────────────────────
  document.getElementById("gist-pull-btn")?.addEventListener("click", async () => {
    const statusEl = document.getElementById("gist-sync-status");
    const creds = loadStoredCredentials();
    const token = creds.githubToken;
    const gistId = document.getElementById("setting-cloud-sync-gist")?.value?.trim() || creds.cloudSyncGistId;
    if (!token || !gistId) {
      if (statusEl) { statusEl.textContent = "Set GitHub token + Cloud Sync Gist ID first"; statusEl.style.color = "var(--red)"; }
      return;
    }
    if (!confirm("Pull from Gist? This will overwrite local score history and notes with the Gist backup.")) return;
    if (statusEl) { statusEl.textContent = "Pulling…"; statusEl.style.color = "var(--muted)"; }
    const result = await window._vshubGistPull?.(token, gistId);
    if (result?.ok) {
      state.scoreHistory = loadScoreHistory();
      state.scorePrev = scorePrevFromHistory(state.scoreHistory);
      const syncDate = result.syncedAt ? new Date(Number(result.syncedAt)).toLocaleDateString() : "unknown date";
      if (statusEl) { statusEl.textContent = `✓ Restored ${result.restored} keys (synced ${syncDate})`; statusEl.style.color = "var(--green)"; }
      logActivity("gist_pull", gistId);
      render();
    } else {
      if (statusEl) { statusEl.textContent = `✗ ${result?.error || "Pull failed"}`; statusEl.style.color = "var(--red)"; }
    }
    setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 5000);
  });

  // Reset score weights
  document.getElementById("reset-weights-btn")?.addEventListener("click", () => {
    const defaults = { dev: 30, engage: 25, momentum: 25, risk: 20, community: 25 };
    for (const [key, val] of Object.entries(defaults)) {
      const el = document.getElementById(`setting-weight-${key}`);
      const disp = document.getElementById(`setting-weight-${key}-display`);
      if (el) el.value = val;
      if (disp) disp.textContent = val;
    }
    const totalEl = document.getElementById("weight-total-display");
    if (totalEl) { totalEl.textContent = 125; totalEl.style.color = "var(--green)"; }
  });

  // Score weight live preview
  function updateWeightPreview() {
    const dev       = Number(document.getElementById("setting-weight-dev")?.value       ?? 30);
    const engage    = Number(document.getElementById("setting-weight-engage")?.value    ?? 25);
    const momentum  = Number(document.getElementById("setting-weight-momentum")?.value  ?? 25);
    const risk      = Number(document.getElementById("setting-weight-risk")?.value      ?? 20);
    const community = Number(document.getElementById("setting-weight-community")?.value ?? 25);
    const total = dev + engage + momentum + risk + community;
    if (total === 0) return;
    let sum = 0, count = 0;
    for (const p of PROJECTS) {
      const rd = state.ghData[p.githubRepo] || null;
      const sc = scoreProject(p, rd, state.sbData, state.socialData);
      const preview = Math.round(
        (sc.pillars.development.score / 30) * dev +
        (sc.pillars.engagement.score  / 25) * engage +
        (sc.pillars.momentum.score    / 25) * momentum +
        (sc.pillars.risk.score        / 20) * risk +
        ((sc.pillars.community?.score || 0) / 25) * community
      );
      const el = document.getElementById(`preview-score-${p.id}`);
      if (el) {
        const pct = total > 0 ? (preview / total) * 100 : 0;
        const color = scoreColor(pct);
        el.textContent = preview;
        el.style.color = color;
      }
      sum += preview; count++;
    }
    const avgEl = document.getElementById("preview-avg-score");
    if (avgEl && count > 0) avgEl.textContent = Math.round(sum / count);
  }
  ["setting-weight-dev","setting-weight-engage","setting-weight-momentum","setting-weight-risk","setting-weight-community"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateWeightPreview);
  });
  if (state.activeView === "settings") updateWeightPreview();

  // Score weight presets
  document.querySelectorAll("[data-weight-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      try {
        const [dev, engage, momentum, risk, community = 25] = JSON.parse(btn.dataset.weightPreset);
        const keys = [["dev", dev], ["engage", engage], ["momentum", momentum], ["risk", risk], ["community", community]];
        for (const [key, val] of keys) {
          const el = document.getElementById(`setting-weight-${key}`);
          const disp = document.getElementById(`setting-weight-${key}-display`);
          if (el) el.value = val;
          if (disp) disp.textContent = val;
        }
        const total = dev + engage + momentum + risk + community;
        const totalEl = document.getElementById("weight-total-display");
        if (totalEl) { totalEl.textContent = total; totalEl.style.color = total === 125 ? "var(--green)" : "var(--cyan)"; }
      } catch {}
    });
  });

  // Standup generator
  document.getElementById("standup-btn")?.addEventListener("click", () => generateStandup(state, logActivity));

  // TODO search load
  document.getElementById("load-todos-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("load-todos-btn");
    const container = document.getElementById("todos-container");
    if (!btn || !container) return;
    btn.disabled = true;
    btn.textContent = "Searching…";
    try {
      const { fetchTodoSearch } = await import("../data/githubAdapter.js");
      const todos = await fetchTodoSearch("VaultSparkStudios", config.githubToken);
      container.innerHTML = todos.length === 0
        ? `<div class="empty-state">No TODO/FIXME found.</div>`
        : todos.map((t) => `
          <div style="display:flex; align-items:flex-start; gap:10px; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
            <span style="color:var(--gold); min-width:80px; flex-shrink:0; font-family:monospace;">${t.repo}</span>
            <a href="${t.url}" target="_blank" rel="noopener" style="color:var(--blue); word-break:break-all;">${t.path}</a>
          </div>
        `).join("");
    } catch {
      container.innerHTML = `<div class="empty-state">Search failed. Check token rate limits.</div>`;
    }
    btn.disabled = false;
    btn.textContent = "Refresh";
  });

  // Notification preferences save
  document.getElementById("save-notif-prefs")?.addEventListener("click", () => {
    const notif_ci_fail    = document.getElementById("notif_ci_fail")?.checked !== false;
    const notif_score_drop = document.getElementById("notif_score_drop")?.checked !== false;
    const notif_pr_stale   = document.getElementById("notif_pr_stale")?.checked !== false;
    const notif_dormant    = document.getElementById("notif_dormant")?.checked !== false;
    saveSettings({ ...loadSettings(), notif_ci_fail, notif_score_drop, notif_pr_stale, notif_dormant });
    const btn = document.getElementById("save-notif-prefs");
    if (btn) { btn.textContent = "Saved ✓"; setTimeout(() => { btn.textContent = "Save preferences"; }, 2000); }
    logActivity("notif_prefs_save", "");
  });

  // Clear activity log
  document.getElementById("clear-activity-btn")?.addEventListener("click", () => {
    localStorage.removeItem("vshub_activity");
    render();
  });

  // Weekly digest button
  document.getElementById("weekly-digest-btn")?.addEventListener("click", () => generateWeeklyDigest(state, logActivity));

  // PWA install button
  document.getElementById("pwa-install-btn")?.addEventListener("click", () => {
    if (state.pwaInstallPrompt) {
      state.pwaInstallPrompt.prompt();
      state.pwaInstallPrompt.userChoice.then(() => { state.pwaInstallPrompt = null; render(); }).catch(() => {});
    }
  });

  // ── Settings search ────────────────────────────────────────────────────────
  function applySettingsSearch(query) {
    const q = query.toLowerCase().trim();
    const tabsBar  = document.getElementById("settings-tabs-bar");
    const sections = document.querySelectorAll(".settings-section");
    if (!q) {
      // Restore tab-controlled visibility
      if (tabsBar) tabsBar.style.display = "";
      sections.forEach((s) => {
        s.style.removeProperty("display");
        s.querySelectorAll(".panel").forEach((p) => p.style.removeProperty("display"));
      });
      return;
    }
    // Hide tabs, show all sections with matching panels
    if (tabsBar) tabsBar.style.display = "none";
    sections.forEach((s) => {
      let any = false;
      s.querySelectorAll(".panel").forEach((p) => {
        const visible = p.textContent.toLowerCase().includes(q);
        p.style.display = visible ? "" : "none";
        if (visible) any = true;
      });
      s.style.display = any ? "flex" : "none";
    });
  }

  document.getElementById("settings-search")?.addEventListener("input", (e) => {
    applySettingsSearch(e.target.value);
  });

  // ── Settings tabs ──────────────────────────────────────────────────────────
  document.querySelectorAll("[data-settings-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      // Clear any active search when switching tabs
      const searchEl = document.getElementById("settings-search");
      if (searchEl?.value) { searchEl.value = ""; applySettingsSearch(""); }
      document.querySelectorAll(".settings-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".settings-section").forEach((s) => s.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`settings-section-${tab.dataset.settingsTab}`)?.classList.add("active");
    });
  });

  // ── Theme swatches — apply immediately ────────────────────────────────────
  document.querySelectorAll("[data-theme-select]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.themeSelect;
      state.theme = theme;
      applyTheme(theme);
      document.querySelectorAll(".theme-swatch").forEach((s) => s.classList.remove("active-theme"));
      btn.classList.add("active-theme");
      saveSettings({ ...loadSettings(), theme });
      Object.assign(state.settings, { theme });
    });
  });

  // ── Accent swatches — apply immediately ───────────────────────────────────
  document.querySelectorAll("[data-accent-select]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const accent = btn.dataset.accentSelect;
      applyAccent(accent);
      document.querySelectorAll(".accent-swatch").forEach((s) => s.classList.remove("active-accent"));
      btn.classList.add("active-accent");
      document.getElementById("accent-custom-picker") && (document.getElementById("accent-custom-picker").value = accent);
      saveSettings({ ...loadSettings(), accent });
      Object.assign(state.settings, { accent });
    });
  });

  // Custom color picker
  document.getElementById("accent-custom-picker")?.addEventListener("input", (e) => {
    const accent = e.target.value;
    applyAccent(accent);
    document.querySelectorAll(".accent-swatch").forEach((s) => s.classList.remove("active-accent"));
    saveSettings({ ...loadSettings(), accent });
    Object.assign(state.settings, { accent });
  });

  // ── Density — apply immediately ───────────────────────────────────────────
  document.querySelectorAll("[data-density-select]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const density = btn.dataset.densitySelect;
      applyDensity(density);
      document.querySelectorAll("[data-density-select]").forEach((b) => b.classList.remove("active-density"));
      btn.classList.add("active-density");
      saveSettings({ ...loadSettings(), density });
      Object.assign(state.settings, { density });
    });
  });

  // ── Save features ─────────────────────────────────────────────────────────
  document.getElementById("save-features-btn")?.addEventListener("click", () => {
    const featureKeys = [
      "feat-morning-brief", "feat-vitals-strip", "feat-score-ledger", "feat-leaderboard",
      "feat-social-summary", "feat-agent-panel", "feat-sprint-panel",
      "feat-show-scores", "feat-show-forecast", "feat-show-delta", "feat-show-ci",
      "feat-compact-default", "feat-nav-score-badge", "feat-nav-sort-score",
      "feat-reduce-motion", "feat-auto-dark",
    ];
    const featureMap = {
      "feat-morning-brief":   "showMorningBrief",
      "feat-vitals-strip":    "showVitalsStrip",
      "feat-score-ledger":    "showScoreLedger",
      "feat-leaderboard":     "showLeaderboard",
      "feat-social-summary":  "showSocialSummary",
      "feat-agent-panel":     "showAgentPanel",
      "feat-sprint-panel":    "showSprintPanel",
      "feat-show-scores":     "showScores",
      "feat-show-forecast":   "showForecast",
      "feat-show-delta":      "showScoreDelta",
      "feat-show-ci":         "showCiBadge",
      "feat-compact-default": "defaultCompactCards",
      "feat-nav-score-badge": "navScoreBadge",
      "feat-nav-sort-score":  "navSortByScore",
      "feat-reduce-motion":   "reduceMotion",
      "feat-auto-dark":       "autoDark",
    };
    const updates = {};
    for (const id of featureKeys) {
      const el = document.getElementById(id);
      if (el) updates[featureMap[id]] = el.checked;
    }
    saveSettings({ ...loadSettings(), ...updates });
    Object.assign(state.settings, updates);
    // Apply reduce-motion immediately
    document.body.classList.toggle("reduce-motion", updates.reduceMotion === true);
    const s = document.getElementById("features-status");
    if (s) { s.textContent = "Saved ✓"; s.style.color = "var(--green)"; setTimeout(() => { s.textContent = ""; }, 2500); }
    logActivity("features_save", "");
    render();
  });

  // ── Save project settings ─────────────────────────────────────────────────
  document.getElementById("save-projects-btn")?.addEventListener("click", () => {
    const sort       = document.getElementById("setting-sort")?.value || "score";
    const defaultTab = document.getElementById("setting-default-tab")?.value || "games";
    saveSettings({ ...loadSettings(), sort, defaultTab });
    Object.assign(state.settings, { sort, defaultTab });
    const s = document.getElementById("projects-status");
    if (s) { s.textContent = "Saved ✓"; s.style.color = "var(--green)"; setTimeout(() => { s.textContent = ""; }, 2500); }
    logActivity("projects_save", "");
  });

  // ── Save scoring weights (duplicate of main save for this tab) ────────────
  document.getElementById("save-settings-btn-scoring")?.addEventListener("click", async () => {
    const weights = {
      dev:       Number(document.getElementById("setting-weight-dev")?.value       ?? 30),
      engage:    Number(document.getElementById("setting-weight-engage")?.value    ?? 25),
      momentum:  Number(document.getElementById("setting-weight-momentum")?.value  ?? 25),
      risk:      Number(document.getElementById("setting-weight-risk")?.value      ?? 20),
      community: Number(document.getElementById("setting-weight-community")?.value ?? 25),
    };
    saveSettings({ ...loadSettings(), weights });
    invalidateWeightsCache();
    Object.assign(state.settings, { weights });
    const s = document.getElementById("scoring-status");
    if (s) { s.textContent = "Saved ✓"; s.style.color = "var(--green)"; setTimeout(() => { s.textContent = ""; }, 2500); }
    logActivity("scoring_save", "");
    render();
  });

  // ── Save alert thresholds ─────────────────────────────────────────────────
  document.getElementById("save-alerts-btn")?.addEventListener("click", () => {
    const alertThresholds = {
      issues:    Number(document.getElementById("setting-thresh-issues")?.value     ?? 20),
      staleWarn: Number(document.getElementById("setting-thresh-stale-warn")?.value ?? 14),
      staleErr:  Number(document.getElementById("setting-thresh-stale-err")?.value  ?? 30),
      scoreCrit: Number(document.getElementById("setting-thresh-score-crit")?.value ?? 24),
      scoreWarn: Number(document.getElementById("setting-thresh-score-warn")?.value ?? 35),
      prAge:     Number(document.getElementById("setting-thresh-pr-age")?.value     ?? 3),
    };
    // Also save notification prefs
    const notif_ci_fail    = document.getElementById("notif_ci_fail")?.checked !== false;
    const notif_score_drop = document.getElementById("notif_score_drop")?.checked !== false;
    const notif_pr_stale   = document.getElementById("notif_pr_stale")?.checked !== false;
    const notif_dormant    = document.getElementById("notif_dormant")?.checked !== false;
    saveSettings({ ...loadSettings(), alertThresholds, notif_ci_fail, notif_score_drop, notif_pr_stale, notif_dormant });
    Object.assign(state.settings, { alertThresholds });
    const s = document.getElementById("alerts-status");
    if (s) { s.textContent = "Saved ✓"; s.style.color = "var(--green)"; setTimeout(() => { s.textContent = ""; }, 2500); }
    logActivity("alerts_save", "");
  });

  // ── Save data/sync settings ───────────────────────────────────────────────
  document.getElementById("save-data-btn")?.addEventListener("click", () => {
    const refreshMs = Number(document.getElementById("setting-refresh")?.value ?? 300000);
    saveSettings({ ...loadSettings(), refreshMs });
    Object.assign(state.settings, { refreshMs });
    const s = document.getElementById("data-status");
    if (s) { s.textContent = "Saved ✓"; s.style.color = "var(--green)"; setTimeout(() => { s.textContent = ""; }, 2500); }
  });

  // ── Save credentials ──────────────────────────────────────────────────────
  document.getElementById("save-credentials-btn")?.addEventListener("click", async () => {
    const githubToken     = document.getElementById("setting-github-token")?.value?.trim() || "";
    const youtubeApiKey   = document.getElementById("setting-youtube-key")?.value?.trim() || "";
    const gumroadToken    = document.getElementById("setting-gumroad-token")?.value?.trim() || "";
    const beaconGistId    = document.getElementById("setting-beacon-gist")?.value?.trim() || "";
    const supabaseAnonKey = document.getElementById("setting-supabase-anon-key")?.value?.trim() || "";
    const claudeApiKey      = document.getElementById("setting-claude-api-key")?.value?.trim() || "";
    const cloudSyncGistId   = document.getElementById("setting-cloud-sync-gist")?.value?.trim() || "";
    const discordWebhookUrl = document.getElementById("setting-discord-webhook")?.value?.trim() || "";
    const existing = loadStoredCredentials();
    saveCredentials({ ...existing, githubToken, youtubeApiKey, gumroadToken, beaconGistId, claudeApiKey, cloudSyncGistId, discordWebhookUrl, ...(supabaseAnonKey ? { supabaseAnonKey } : {}) });
    clearSessionCache();
    Object.assign(config, getHubRuntimeConfig());
    state.supabaseAnonKey = config.supabaseAnonKey;
    const s = document.getElementById("credentials-status");
    if (s) { s.textContent = "Saved — reloading data…"; s.style.color = "var(--green)"; }
    logActivity("credentials_save", "");
    showToast("Credentials saved — reloading data.", "success", 3000);
    syncAll();
  });

  // ── Save security / password ──────────────────────────────────────────────
  document.getElementById("save-security-btn")?.addEventListener("click", async () => {
    const hubPassword = document.getElementById("setting-hub-password")?.value?.trim() || "";
    if (hubPassword) await setHubPassword(hubPassword);
    const s = document.getElementById("security-status");
    if (s) { s.textContent = hubPassword ? "Password updated ✓" : "No changes."; s.style.color = "var(--green)"; setTimeout(() => { s.textContent = ""; }, 2500); }
    logActivity("security_save", "");
    render();
  });

  // ── Main "Save & Apply" (Appearance tab — also saves everything) ───────────
  document.getElementById("save-settings-btn")?.addEventListener("click", async () => {
    const githubToken     = document.getElementById("setting-github-token")?.value?.trim() || "";
    const youtubeApiKey   = document.getElementById("setting-youtube-key")?.value?.trim() || "";
    const gumroadToken    = document.getElementById("setting-gumroad-token")?.value?.trim() || "";
    const beaconGistId    = document.getElementById("setting-beacon-gist")?.value?.trim() || "";
    const supabaseAnonKey = document.getElementById("setting-supabase-anon-key")?.value?.trim() || "";
    const hubPassword   = document.getElementById("setting-hub-password")?.value?.trim() || "";
    const accent        = document.querySelector(".accent-swatch.active-accent")?.dataset.accentSelect
                          || document.getElementById("accent-custom-picker")?.value
                          || loadSettings().accent || "#7ae7c7";
    const theme         = document.querySelector(".theme-swatch.active-theme")?.dataset.themeSelect
                          || loadSettings().theme || "dark";
    const density       = document.querySelector("[data-density-select].active-density")?.dataset.densitySelect
                          || loadSettings().density || "comfortable";
    const showScores    = document.getElementById("setting-show-scores")?.value !== "false";
    const sort          = document.getElementById("setting-sort")?.value || "score";
    const refreshMs     = Number(document.getElementById("setting-refresh")?.value ?? 300000);
    const weights = {
      dev:       Number(document.getElementById("setting-weight-dev")?.value       ?? 30),
      engage:    Number(document.getElementById("setting-weight-engage")?.value    ?? 25),
      momentum:  Number(document.getElementById("setting-weight-momentum")?.value  ?? 25),
      risk:      Number(document.getElementById("setting-weight-risk")?.value      ?? 20),
      community: Number(document.getElementById("setting-weight-community")?.value ?? 25),
    };
    const alertThresholds = {
      issues:    Number(document.getElementById("setting-thresh-issues")?.value     ?? 20),
      staleWarn: Number(document.getElementById("setting-thresh-stale-warn")?.value ?? 14),
      staleErr:  Number(document.getElementById("setting-thresh-stale-err")?.value  ?? 30),
      scoreCrit: Number(document.getElementById("setting-thresh-score-crit")?.value ?? 24),
      scoreWarn: Number(document.getElementById("setting-thresh-score-warn")?.value ?? 35),
      prAge:     Number(document.getElementById("setting-thresh-pr-age")?.value     ?? 3),
    };
    const existing = loadStoredCredentials();
    saveCredentials({ ...existing, githubToken, youtubeApiKey, gumroadToken, beaconGistId, ...(supabaseAnonKey ? { supabaseAnonKey } : {}) });
    if (hubPassword) await setHubPassword(hubPassword);
    const newSettings = { accent, theme, density, showScores, sort, refreshMs, weights, alertThresholds };
    saveSettings({ ...loadSettings(), ...newSettings });
    invalidateWeightsCache();
    Object.assign(state.settings, newSettings);
    applyAccent(accent);
    applyTheme(theme);
    applyDensity(density);
    state.theme = theme;
    clearSessionCache();
    Object.assign(config, getHubRuntimeConfig());
    state.supabaseAnonKey = config.supabaseAnonKey;
    const statusEl = document.getElementById("settings-status");
    if (statusEl) { statusEl.textContent = "Saved — reloading data…"; statusEl.style.color = "var(--green)"; }
    logActivity("settings_save", "");
    syncAll();
  });
}
