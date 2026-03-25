import { getHubRuntimeConfig } from "./config/runtimeConfig.js";
import { PROJECTS, getProjectById } from "./data/studioRegistry.js";
import { fetchAllRepos, fetchOrgActivity } from "./data/githubAdapter.js";
import { fetchAllSupabaseData } from "./data/supabaseAdapter.js";
import { fetchAllSocialFeeds } from "./data/socialFeedsAdapter.js";
import { renderNavigation } from "./components/navigation.js";
import { renderStudioHubView } from "./components/studioHubView.js";
import { renderProjectHubView } from "./components/projectHubView.js";
import { renderVaultAdminView } from "./components/vaultAdminView.js";
import { renderSocialView } from "./components/socialView.js";
import { renderSettingsView, saveCredentials, loadStoredCredentials } from "./components/settingsView.js";

// ── Config & cache helpers ─────────────────────────────────────────────────
const config = getHubRuntimeConfig();

function clearSessionCache() {
  const keys = Object.keys(sessionStorage).filter((k) => k.startsWith("vshub_"));
  keys.forEach((k) => sessionStorage.removeItem(k));
}

const state = {
  activeView: "studio-hub",
  adminTab: "members",
  syncStatus: "idle",

  // Integration data (populated async)
  ghData: {},       // { "owner/repo": repoData }
  ghActivity: [],   // org-level event feed
  sbData: null,     // supabase aggregated data
  socialData: null, // social feeds data

  // Config passthrough for views
  supabaseAnonKey: config.supabaseAnonKey,
};

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById("app");
  if (!app) return;

  const nav = renderNavigation(state);
  const main = renderActiveView();

  app.innerHTML = `<div class="shell">${nav}${main}</div>`;
  bindEvents();
}

function renderActiveView() {
  const { activeView } = state;

  if (activeView === "studio-hub") return renderStudioHubView(state);
  if (activeView === "social") return renderSocialView(state);
  if (activeView === "vault-admin") return renderVaultAdminView(state);
  if (activeView === "settings") return renderSettingsView(state);

  if (activeView.startsWith("project:")) {
    const projectId = activeView.slice("project:".length);
    const project = getProjectById(projectId);
    if (project) return renderProjectHubView(project, state);
    return `<div class="main-panel"><div class="empty-state">Project not found.</div></div>`;
  }

  return `<div class="main-panel"><div class="empty-state">View not found.</div></div>`;
}

// ── Event Binding ──────────────────────────────────────────────────────────
function bindEvents() {
  // Nav and project card navigation
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

  // Vault admin tabs
  document.querySelectorAll("[data-admin-tab]").forEach((el) => {
    el.addEventListener("click", () => {
      const tab = el.getAttribute("data-admin-tab");
      if (tab && tab !== state.adminTab) {
        state.adminTab = tab;
        render();
      }
    });
  });

  // Settings — save credentials
  const saveBtn = document.getElementById("save-settings-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const githubToken = document.getElementById("setting-github-token")?.value?.trim() || "";
      const youtubeApiKey = document.getElementById("setting-youtube-key")?.value?.trim() || "";
      saveCredentials({ githubToken, youtubeApiKey });
      const statusEl = document.getElementById("settings-status");
      if (statusEl) statusEl.textContent = "Saved — reloading data…";
      // Clear caches and re-sync with new credentials
      clearSessionCache();
      Object.assign(config, getHubRuntimeConfig());
      state.supabaseAnonKey = config.supabaseAnonKey;
      syncAll();
    });
  }

  // Settings — clear all
  const clearBtn = document.getElementById("clear-settings-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem("vshub_credentials");
      clearSessionCache();
      const statusEl = document.getElementById("settings-status");
      if (statusEl) statusEl.textContent = "Cleared.";
      render();
    });
  }

  // Studio Pulse publish
  const publishBtn = document.getElementById("publish-pulse-btn");
  if (publishBtn) {
    publishBtn.addEventListener("click", async () => {
      const text = document.getElementById("pulse-text")?.value?.trim();
      const type = document.getElementById("pulse-type")?.value || "info";
      if (!text) return;

      publishBtn.disabled = true;
      const statusEl = document.getElementById("pulse-status");
      if (statusEl) statusEl.textContent = "Publishing...";

      try {
        // Pulse publishing requires the service role key proxied through the API backend.
        // For now, show a message directing to the Supabase dashboard.
        await new Promise((r) => setTimeout(r, 500));
        if (statusEl) statusEl.textContent = "Connect API backend to enable publishing.";
        publishBtn.disabled = false;
      } catch {
        if (statusEl) statusEl.textContent = "Failed to publish.";
        publishBtn.disabled = false;
      }
    });
  }
}

// ── Data Sync ──────────────────────────────────────────────────────────────
async function syncAll() {
  state.syncStatus = "syncing";
  render();

  const repoPaths = PROJECTS
    .filter((p) => p.githubRepo)
    .map((p) => p.githubRepo);

  const [ghRepos, ghActivity, sbData, socialData] = await Promise.all([
    fetchAllRepos(repoPaths, config.githubToken, config.githubCacheTtlMs),
    fetchOrgActivity("VaultSparkStudios", config.githubToken, config.githubCacheTtlMs),
    fetchAllSupabaseData(config.supabaseUrl, config.supabaseAnonKey, config.githubCacheTtlMs),
    fetchAllSocialFeeds(config.youtubeApiKey, config.socialCacheTtlMs),
  ]);

  state.ghData = ghRepos;
  state.ghActivity = ghActivity;
  state.sbData = sbData;
  state.socialData = socialData;
  state.syncStatus = "live";

  render();
}

// ── Boot ───────────────────────────────────────────────────────────────────
render();
syncAll();
