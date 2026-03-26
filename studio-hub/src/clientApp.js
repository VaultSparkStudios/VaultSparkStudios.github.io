import { getHubRuntimeConfig } from "./config/runtimeConfig.js";
import { PROJECTS, getProjectById } from "./data/studioRegistry.js";
import { fetchAllRepos, fetchOrgActivity } from "./data/githubAdapter.js";
import { fetchAllSupabaseData } from "./data/supabaseAdapter.js";
import { fetchAllSocialFeeds } from "./data/socialFeedsAdapter.js";
import { renderNavigation } from "./components/navigation.js";
import { renderStudioHubView } from "./components/studioHubView.js";
import { renderProjectHubView } from "./components/projectHubView.js";
import { renderVaultAdminView, initMemberSearch } from "./components/vaultAdminView.js";
import { renderSocialView } from "./components/socialView.js";
import { renderSettingsView, saveCredentials, saveSettings, loadSettings, loadStoredCredentials } from "./components/settingsView.js";
import { renderAnalyticsView, bindAnalyticsEvents, setAnalyticsRenderCallback } from "./components/analyticsView.js";
import { renderGate, isUnlocked, attemptUnlock, setHubPassword, clearHubPassword, isPasswordSet } from "./components/privacyGate.js";

// ── Config ────────────────────────────────────────────────────────────────────
const config = getHubRuntimeConfig();

function clearSessionCache() {
  Object.keys(sessionStorage).filter((k) => k.startsWith("vshub_")).forEach((k) => sessionStorage.removeItem(k));
}

// ── State ─────────────────────────────────────────────────────────────────────
const appSettings = loadSettings();

const state = {
  activeView: "studio-hub",
  adminTab: "members",
  projectTab: "games",
  syncStatus: "idle",
  settings: appSettings,

  ghData: {},
  ghActivity: [],
  sbData: null,
  socialData: null,

  supabaseAnonKey: config.supabaseAnonKey,
};

// ── Accent color ──────────────────────────────────────────────────────────────
function applyAccent(color) {
  if (color) document.documentElement.style.setProperty("--cyan", color);
}
applyAccent(appSettings.accent);

// ── Toast notification ─────────────────────────────────────────────────────────
function showToast(message, type = "success") {
  const existing = document.getElementById("vshub-toast");
  if (existing) existing.remove();

  const colors = {
    success: { bg: "rgba(106,227,178,0.12)", border: "rgba(106,227,178,0.35)", text: "var(--green)" },
    error:   { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)", text: "var(--red)" },
  };
  const c = colors[type] || colors.success;

  const toast = document.createElement("div");
  toast.id = "vshub-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${c.bg}; border:1px solid ${c.border}; border-radius:10px;
    padding:12px 20px; font-size:13px; font-weight:600; color:${c.text};
    box-shadow:0 4px 24px rgba(0,0,0,0.4); display:flex; align-items:center; gap:8px;
    animation:vsToastIn 0.2s ease; pointer-events:none;
  `;
  toast.innerHTML = `<span style="font-size:15px;">${type === "error" ? "✕" : "✓"}</span> ${message}`;

  if (!document.getElementById("vshub-toast-style")) {
    const style = document.createElement("style");
    style.id = "vshub-toast-style";
    style.textContent = `@keyframes vsToastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @keyframes vsToastOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(8px)}}`;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "vsToastOut 0.2s ease forwards";
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

// ── Privacy gate ──────────────────────────────────────────────────────────────
function mountGate() {
  const gateEl = document.createElement("div");
  gateEl.innerHTML = renderGate();
  document.body.appendChild(gateEl.firstElementChild);

  const input = document.getElementById("gate-password-input");
  const btn = document.getElementById("gate-submit-btn");
  const errorEl = document.getElementById("gate-error");

  async function tryUnlock() {
    const password = input?.value || "";
    if (!password) return;
    const ok = await attemptUnlock(password);
    if (ok) {
      document.getElementById("privacy-gate")?.remove();
      render();
      syncAll();
    } else {
      if (errorEl) errorEl.textContent = "Incorrect password";
      if (input) { input.value = ""; input.focus(); }
    }
  }

  btn?.addEventListener("click", tryUnlock);
  input?.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = `<div class="shell">${renderNavigation(state)}${renderActiveView()}</div>`;
  bindEvents();
}

function renderActiveView() {
  const { activeView } = state;
  if (activeView === "studio-hub")  return renderStudioHubView(state);
  if (activeView === "analytics")   return renderAnalyticsView(state);
  if (activeView === "social")      return renderSocialView(state);
  if (activeView === "vault-admin") return renderVaultAdminView(state);
  if (activeView === "settings")    return renderSettingsView(state);
  if (activeView.startsWith("project:")) {
    const project = getProjectById(activeView.slice("project:".length));
    return project ? renderProjectHubView(project, state) : `<div class="main-panel"><div class="empty-state">Project not found.</div></div>`;
  }
  return `<div class="main-panel"><div class="empty-state">View not found.</div></div>`;
}

// ── Event binding ─────────────────────────────────────────────────────────────
function bindEvents() {
  // Navigation
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const view = el.getAttribute("data-view");
      if (view && view !== state.activeView) {
        state.activeView = view;
        render();
      }
    });
  });

  // Project type tabs
  document.querySelectorAll("[data-project-tab]").forEach((el) => {
    el.addEventListener("click", () => {
      const tab = el.getAttribute("data-project-tab");
      if (tab && tab !== state.projectTab) {
        state.projectTab = tab;
        render();
      }
    });
  });

  // Vault admin tabs
  document.querySelectorAll("[data-admin-tab]").forEach((el) => {
    el.addEventListener("click", () => {
      const tab = el.getAttribute("data-admin-tab");
      if (tab && tab !== state.adminTab) {
        state.adminTab = tab;
        render();
        if (tab === "member-search") {
          initMemberSearch(config.supabaseUrl, config.supabaseAnonKey);
        }
      }
    });
  });

  // If member-search tab is already active on render (e.g. state restored), init it
  if (state.adminTab === "member-search" && state.activeView === "vault-admin") {
    initMemberSearch(config.supabaseUrl, config.supabaseAnonKey);
  }

  // Settings — save
  document.getElementById("save-settings-btn")?.addEventListener("click", async () => {
    const githubToken    = document.getElementById("setting-github-token")?.value?.trim() || "";
    const youtubeApiKey  = document.getElementById("setting-youtube-key")?.value?.trim() || "";
    const gaClientId     = document.getElementById("setting-ga-client-id")?.value?.trim() || "";
    const gaPropertyId   = document.getElementById("setting-ga-property-id")?.value?.trim() || "";
    const hubPassword    = document.getElementById("setting-hub-password")?.value?.trim() || "";
    const accent         = document.getElementById("setting-accent")?.value || "#7ae7c7";
    const showScores     = document.getElementById("setting-show-scores")?.value !== "false";
    const sort           = document.getElementById("setting-sort")?.value || "score";
    const refreshMs      = Number(document.getElementById("setting-refresh")?.value ?? 300000);

    // Credentials
    const existing = loadStoredCredentials();
    saveCredentials({ ...existing, githubToken, youtubeApiKey, gaClientId, gaPropertyId });

    // Hub password
    if (hubPassword) await setHubPassword(hubPassword);

    // App settings
    const newSettings = { accent, showScores, sort, refreshMs };
    saveSettings(newSettings);
    Object.assign(state.settings, newSettings);
    applyAccent(accent);

    // Reset cache and resync
    clearSessionCache();
    Object.assign(config, getHubRuntimeConfig());
    state.supabaseAnonKey = config.supabaseAnonKey;

    const statusEl = document.getElementById("settings-status");
    if (statusEl) {
      statusEl.textContent = "";
    }

    // Show toast
    showToast("Settings saved");

    syncAll();
  });

  // Settings — remove password
  document.getElementById("clear-password-btn")?.addEventListener("click", async () => {
    await clearHubPassword();
    render();
  });

  // Settings — clear all
  document.getElementById("clear-all-btn")?.addEventListener("click", () => {
    if (!confirm("Clear all credentials and settings?")) return;
    localStorage.removeItem("vshub_credentials");
    localStorage.removeItem("vshub_settings");
    clearSessionCache();
    Object.assign(state.settings, {});
    applyAccent("#7ae7c7");
    render();
  });

  // Analytics tab switching + GA connect
  bindAnalyticsEvents(config);

  // Studio Pulse publish
  document.getElementById("publish-pulse-btn")?.addEventListener("click", async () => {
    const text = document.getElementById("pulse-text")?.value?.trim();
    if (!text) return;
    const btn = document.getElementById("publish-pulse-btn");
    const statusEl = document.getElementById("pulse-status");
    btn.disabled = true;
    if (statusEl) statusEl.textContent = "Publishing…";
    await new Promise((r) => setTimeout(r, 400));
    if (statusEl) statusEl.textContent = "API backend required to publish. Coming in VPS deployment.";
    btn.disabled = false;
  });
}

// ── Data sync ─────────────────────────────────────────────────────────────────
let refreshTimer = null;

async function syncAll() {
  state.syncStatus = "syncing";
  render();

  const repoPaths = PROJECTS.filter((p) => p.githubRepo).map((p) => p.githubRepo);

  const [ghRepos, ghActivity, sbData, socialData] = await Promise.all([
    fetchAllRepos(repoPaths, config.githubToken, config.githubCacheTtlMs),
    fetchOrgActivity("VaultSparkStudios", config.githubToken, config.githubCacheTtlMs),
    fetchAllSupabaseData(config.supabaseUrl, config.supabaseAnonKey, config.githubCacheTtlMs),
    fetchAllSocialFeeds(config.youtubeApiKey, config.socialCacheTtlMs),
  ]);

  state.ghData     = ghRepos;
  state.ghActivity = ghActivity;
  state.sbData     = sbData;
  state.socialData = socialData;
  state.syncStatus = "live";

  render();

  // Schedule next refresh
  const refreshMs = state.settings.refreshMs ?? 300000;
  if (refreshTimer) clearTimeout(refreshTimer);
  if (refreshMs > 0) {
    refreshTimer = setTimeout(() => {
      clearSessionCache();
      syncAll();
    }, refreshMs);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
// Allow analytics view to trigger a re-render when GA connects
setAnalyticsRenderCallback(render);

if (!isUnlocked()) {
  render(); // render shell behind gate
  mountGate();
} else {
  render();
  syncAll();
}
