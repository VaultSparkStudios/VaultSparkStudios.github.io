import { getHubRuntimeConfig } from "./config/runtimeConfig.js";
import { PROJECTS, getProjectById, validateRegistry } from "./data/studioRegistry.js";
import { scoreProject, getGrade, invalidateWeightsCache, clearScoringCache } from "./utils/projectScoring.js";
import { fmt, daysSince, commitVelocity, debounce, safeGetJSON, safeSetJSON } from "./utils/helpers.js";
import { fetchAllProjectContextFiles, fetchRepoLanguages, fetchRepoBranches, fetchRepoTodoCount, fetchDependencyAlerts, fetchProjectTickets, submitProjectTicket, submitRenameTicket, submitInitiateTicket, fetchStudioOsCompliance, fetchAgentRequests, submitAgentRequest, fetchRepoTraffic } from "./data/githubAdapter.js";
import { fetchAllSupabaseData } from "./data/supabaseAdapter.js";
import { fetchAllSocialFeeds } from "./data/socialFeedsAdapter.js";
import { renderNavigation } from "./components/navigation.js";
import { renderStudioHubView, pushAlertHistory, snoozeAlert, claimChallengeXP, clearNotifications } from "./components/studioHubView.js";
import { grantXP, grantDailyBonus as claimDailyBonus, grantStreakMilestone, getLoginStreak } from "./utils/studioXP.js";
import { dismissNotification } from "./utils/achievements.js";
import { renderPortfolioTimelineView } from "./components/portfolioTimelineView.js";
import { renderProjectHubView } from "./components/projectHubView.js";
import { renderVaultAdminView } from "./components/vaultAdminView.js";
import { renderSocialView } from "./components/socialView.js";
import { renderCompareView } from "./components/compareView.js";
import { renderSettingsView, saveCredentials, saveSettings, loadSettings, loadStoredCredentials } from "./components/settingsView.js";
import { renderGate, isUnlocked, attemptUnlock, setHubPassword, clearHubPassword } from "./components/privacyGate.js";
import { renderVirtualOfficeView } from "./components/virtualOfficeView.js";
import { renderAmbientView } from "./components/ambientView.js";
import { renderHeatmapView } from "./components/heatmapView.js";
import { renderTicketingView } from "./components/ticketingView.js";
import { renderAgentCommandsView } from "./components/agentCommandsView.js";
import { renderAgentsView } from "./components/agentsView.js";
import { renderCompetitiveView, loadCompetitorList, saveCompetitorList, loadDismissedCompetitors, saveDismissedCompetitors } from "./components/competitiveView.js";
import { renderAnalyticsView } from "./components/analyticsView.js";
import { renderAiCopilotView, sendCopilotMessage, clearCopilotHistory, getCopilotMessages } from "./components/aiCopilotView.js";
import { renderPrReviewView } from "./components/prReviewView.js";
import { renderPhaseTrackerView } from "./components/phaseTrackerView.js";
import { mountCommandPalette, unmountCommandPalette, isPaletteOpen } from "./components/commandPalette.js";
import { downloadJSON, downloadCSV, downloadScoreHistoryCSV } from "./utils/exportHelpers.js";
import { generateScoreRSSFeed } from "./utils/rssFeed.js";
import { generateStandup, generateWeeklyDigest } from "./utils/digestHelpers.js";
import { loadScoreHistory, pushScoreHistory, storeSessionStartScores, scorePrevFromHistory } from "./utils/scoreHistory.js";
import { pushToGist, pullFromGist } from "./engine/gistSync.js";
import { createSyncEngine } from "./engine/syncEngine.js";
import { fetchPageSpeedData, fetchSiteProbe, mergeProbeWithFallback } from "./data/websiteAnalytics.js";
import { discoverCompetitors } from "./data/competitorDiscovery.js";
import { bindSettingsEvents }   from "./events/settingsEvents.js";
import { bindProjectHubEvents } from "./events/projectHubEvents.js";
import { bindHeatmapEvents }    from "./events/heatmapEvents.js";
import { bindCompareEvents }    from "./events/compareEvents.js";
import { bindTicketingEvents }  from "./events/ticketingEvents.js";
import { initGlobalSearch, openSearch, closeSearch } from "./components/globalSearch.js";
import { showOnboardingModal, showScoreModal } from "./components/hub/hubModals.js";
import { initToastContainer, showToast } from "./components/toastManager.js";
import { memoRender, clearMemoCache, cleanupEvents, patchDOM } from "./engine/renderEngine.js";
import { initIDB, migrateFromLocalStorage } from "./engine/idb.js";
import { startSession, endSession, trackView, trackFeature } from "./utils/sessionTelemetry.js";

// ── Config ────────────────────────────────────────────────────────────────────
const config = getHubRuntimeConfig();

// Global handler for error-fallback reload button (inline onclick blocked by CSP)
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-hub-reload]")) location.reload();
}, true);

// ── Debug mode ────────────────────────────────────────────────────────────────
const DEBUG = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
function dbg(...args) { if (DEBUG) console.log("[HUB]", ...args); }

// ── Registry validation ───────────────────────────────────────────────────────
validateRegistry();

// Score history helpers imported from utils/scoreHistory.js

function clearSessionCache() {
  Object.keys(sessionStorage).filter((k) => k.startsWith("vshub_")).forEach((k) => sessionStorage.removeItem(k));
}

// ── UI state helpers ──────────────────────────────────────────────────────────
const UI_KEY = "vshub_ui";
function loadUiState() { return safeGetJSON(UI_KEY, {}); }
function saveUiState(ui) { safeSetJSON(UI_KEY, ui); }

// ── Hub Activity Log ──────────────────────────────────────────────────────────
const ACTIVITY_KEY = "vshub_activity";
const MAX_ACTIVITY = 50;

function logActivity(event, detail = "") {
  const log = safeGetJSON(ACTIVITY_KEY, []);
  log.push({ ts: Date.now(), event, detail });
  if (log.length > MAX_ACTIVITY) log.splice(0, log.length - MAX_ACTIVITY);
  safeSetJSON(ACTIVITY_KEY, log);
}

function loadActivity() { return safeGetJSON(ACTIVITY_KEY, []); }

// ── State ─────────────────────────────────────────────────────────────────────
const appSettings = loadSettings();
const uiState     = loadUiState();

const _prevLastOpened = uiState.lastOpened || null;
// Update last opened on mount
try { saveUiState({ ...uiState, lastOpened: Date.now() }); } catch {}

const state = {
  activeView:         "studio-hub",
  adminTab:           "members",
  analyticsTab:       "overview",
  projectTab:         "games",
  syncStatus:         "idle",
  syncError:          null,
  settings:           appSettings,
  focusMode:          false,
  projectFilter:      "",
  phaseTrackerFilter: "all",
  ticketingTab:         "listing",
  renameSubmitting:     false,
  renameSuccess:        null,
  renameError:          null,
  initiateSubmitting:   false,
  initiateSuccess:      null,
  initiateError:        null,
  sidebarCollapsed:   uiState.sidebarCollapsed || false,
  theme:              uiState.theme || "dark",
  mobileNavOpen:      false,

  ghData:             {},
  ghActivity:         [],
  sbData:             null,
  socialData:         null,
  contextFiles:       {},
  contextFilesLoading: new Set(),
  projectExtendedData: {},
  projectExtendedLoading: new Set(),
  beaconData:         null,
  rateLimitInfo:      null,
  scoreHistory:       loadScoreHistory(),
  scorePrev:          {},
  syncMeta:           null,
  tagFilter:          "",
  alertCount:         0,
  syncErrors:         {},
  heatmapSortKey:     null,
  heatmapSortAsc:     false,
  heatmapHiddenCols:  new Set(),
  beaconSessionStarts: {},
  timelineTypeFilter:    "all",
  timelineProjectFilter: "",
  timelineMode:          "feed",
  activityProjectFilter: "",
  pwaInstallPrompt:   null,
  tickets:            [],
  ticketsLoading:     false,
  ticketSubmitting:   false,
  ticketSuccess:      null,
  ticketError:        null,
  compactCards:       false,
  navProjectSearch:   "",
  changelogFilter:    "",
  bulkTagMode:        false,
  floorSearch:        "",
  floorSort:          "score",

  studioBrain:           null,
  ignisCore:             null,
  agentRequests:         [],
  portfolioFreshness:    {},
  portfolioFiles:        {},
  agentRunHistory:       {},

  supabaseAnonKey: config.supabaseAnonKey,
  prevLastOpened: _prevLastOpened,
  alertHistoryFilter: "",
  recentlyVisited: getRecentProjects(),

  competitorData:      null,
  competitorLoading:   false,
  competitorFetchedAt: null,
  competitorEditing:   false,
  discoveredCompetitors: null,
  discoveryLoading:      false,
  discoveryFetchedAt:    null,
  dismissedCompetitors:  loadDismissedCompetitors(),

  websitePsi:          null,
  websiteProbe:        null,
  websiteLoading:      false,
  websiteTraffic:      null,

  lastSyncTimestamp:   null,
  timeTravelIndex:     null,
};
// Seed scorePrev from history on first load; store session-start scores for accurate delta badges
storeSessionStartScores(state.scoreHistory);
state.scorePrev = scorePrevFromHistory(state.scoreHistory);

// ── Accent color ──────────────────────────────────────────────────────────────
function applyAccent(color) {
  if (color && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color)) {
    document.documentElement.style.setProperty("--cyan", color);
  }
}
applyAccent(appSettings.accent);
initToastContainer();

// ── Theme ─────────────────────────────────────────────────────────────────────
const ALL_THEMES = ["theme-light", "theme-midnight", "theme-terminal", "theme-slate", "theme-dusk", "theme-steel", "theme-ember"];
function applyTheme(theme) {
  document.body.classList.remove(...ALL_THEMES);
  if (theme && theme !== "dark") document.body.classList.add(`theme-${theme}`);
}
applyTheme(state.theme);

// ── Density ───────────────────────────────────────────────────────────────────
function applyDensity(density) {
  document.body.classList.remove("density-compact", "density-spacious");
  if (density === "compact") document.body.classList.add("density-compact");
  else if (density === "spacious") document.body.classList.add("density-spacious");
}
applyDensity(appSettings.density);

// ── Session timeout ───────────────────────────────────────────────────────────
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
const LAST_ACTIVITY_KEY  = "vshub_last_activity";
function touchActivity() {
  try { sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch {}
}
function checkSessionTimeout() {
  if (!isUnlocked()) return;
  const last = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
  if (Date.now() - last > SESSION_TIMEOUT_MS && !document.getElementById("session-timeout-overlay")) {
    const el = document.createElement("div");
    el.id = "session-timeout-overlay";
    el.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:500;
                  display:flex; align-items:center; justify-content:center;">
        <div style="background:var(--panel); border:1px solid var(--border); border-radius:var(--radius);
                    padding:28px 32px; text-align:center; max-width:360px; box-shadow:0 24px 80px rgba(0,0,0,0.5);">
          <div style="font-size:14px; font-weight:700; color:var(--gold); margin-bottom:8px;">Still here?</div>
          <div style="font-size:12px; color:var(--muted); margin-bottom:20px; line-height:1.6;">
            The hub has been idle for 8+ hours. Your session is still active — click to continue.
          </div>
          <button id="session-timeout-continue" style="font-size:13px; padding:10px 24px;
            background:rgba(122,231,199,0.1); border:1px solid rgba(122,231,199,0.25);
            border-radius:8px; color:var(--cyan); cursor:pointer; font:inherit;">Continue →</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    document.getElementById("session-timeout-continue")?.addEventListener("click", () => {
      el.remove();
      touchActivity();
    });
  }
}
setInterval(checkSessionTimeout, 60000); // check every minute
["keydown", "mousedown", "pointerdown", "touchstart"].forEach((ev) =>
  document.addEventListener(ev, touchActivity, { passive: true })
);
touchActivity(); // mark activity on page load

// ── Sidebar ───────────────────────────────────────────────────────────────────
function applySidebar(collapsed) {
  const shell = document.querySelector(".shell");
  if (shell) shell.classList.toggle("sidebar-collapsed", collapsed);
}

// ── Privacy gate ──────────────────────────────────────────────────────────────
function mountGate() {
  const gateEl = document.createElement("div");
  gateEl.innerHTML = renderGate();
  document.body.appendChild(gateEl.firstElementChild);

  const input   = document.getElementById("gate-password-input");
  const btn     = document.getElementById("gate-submit-btn");
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

// ── Dynamic favicon — reflects studio average score color ────────────────────
function updateFavicon() {
  try {
    const avg = state._studioAvg || 0;
    const color = avg >= 105 ? "#7ae7c7" : avg >= 80 ? "#69b3ff" : avg >= 56 ? "#ffc874" : avg >= 31 ? "#ff9478" : "#f87171";
    const canvas = document.createElement("canvas");
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext("2d");
    ctx.beginPath(); ctx.arc(16, 16, 14, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = "#060b12"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(avg > 0 ? String(avg) : "?", 16, 17);
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = canvas.toDataURL("image/png");
  } catch { /* canvas not supported */ }
}

// ── Render ────────────────────────────────────────────────────────────────────
let _lastRenderedView = null;

function render() {
  const app = document.getElementById("app");
  if (!app) return;

  try {
    _renderInner(app);
    // Track view changes for session telemetry
    if (state.activeView !== _lastRenderedView) trackView(state.activeView);
    // Compute studio avg for favicon
    const _allScored = PROJECTS.map((p) => scoreProject(p, state.ghData[p.githubRepo] || null, state.sbData, state.socialData));
    state._studioAvg = _allScored.length ? Math.round(_allScored.reduce((s, x) => s + x.total, 0) / _allScored.length) : 0;
    updateFavicon();
  } catch (err) {
    console.error("[HUB] render crash:", err);
    // Show the error on screen so the user isn't stuck on a blank page
    app.innerHTML = `
      <div style="padding:40px; font-family:monospace; color:#f87171; max-width:720px; margin:0 auto;">
        <h2 style="color:#f2f6fb;">Studio Hub — Render Error</h2>
        <pre style="white-space:pre-wrap; background:rgba(255,255,255,0.05); padding:16px; border-radius:8px; font-size:13px;">${
          (err?.stack || err?.message || String(err)).replace(/</g, "&lt;")
        }</pre>
        <p style="color:#95a3b7; font-size:13px; margin-top:16px;">Check the browser console (F12) for full details.</p>
        <button data-hub-reload style="margin-top:12px; padding:8px 20px; background:rgba(122,231,199,0.15);
          border:1px solid rgba(122,231,199,0.3); border-radius:8px; color:#7ae7c7; cursor:pointer; font-size:13px;">Reload</button>
      </div>`;
  }
}

function _renderInner(app) {
  // Clean up tracked event listeners from previous render cycle
  cleanupEvents();

  // Ambient mode gets a full-screen overlay — no shell chrome
  if (state.activeView === "ambient") {
    app.innerHTML = renderAmbientView(state);
    _lastRenderedView = "ambient";
    bindEvents();
    return;
  }

  const collapsedClass = state.sidebarCollapsed ? " sidebar-collapsed" : "";
  const mobileClass    = state.mobileNavOpen    ? " mobile-nav-open"   : "";

  // Use memoized render for the active view content
  const activeViewHtml = memoRender(state.activeView, () => renderActiveView(), state);

  // If only the view content changed (not the shell), try incremental patch
  const mainPanel = app.querySelector(".main-panel");
  if (_lastRenderedView === state.activeView && mainPanel && state.activeView !== "ambient") {
    patchDOM(mainPanel, activeViewHtml);
    // Inject mobile nav button if missing
    if (!app.querySelector("#mobile-nav-btn") && mainPanel) {
      const mobileBtn = document.createElement("button");
      mobileBtn.id = "mobile-nav-btn";
      mobileBtn.title = "Open navigation";
      mobileBtn.textContent = "☰ Menu";
      mainPanel.insertBefore(mobileBtn, mainPanel.firstChild);
    }
  } else {
    // Full render needed (view switch or first render)
    app.innerHTML = `
      <div class="shell${collapsedClass}${mobileClass}">
        <div class="mobile-overlay" id="mobile-overlay"></div>
        ${renderNavigation(state)}
        ${activeViewHtml}
      </div>
    `;
    // Inject mobile nav button as first child of main-panel (DOM insertion — no regex fragility)
    const newMainPanel = app.querySelector(".main-panel");
    if (newMainPanel) newMainPanel.classList.add("view-enter");
    if (newMainPanel) {
      const mobileBtn = document.createElement("button");
      mobileBtn.id = "mobile-nav-btn";
      mobileBtn.title = "Open navigation";
      mobileBtn.textContent = "☰ Menu";
      newMainPanel.insertBefore(mobileBtn, newMainPanel.firstChild);
    }
  }

  _lastRenderedView = state.activeView;

  // Visual syncing state — dim main panel while sync runs
  // Skip dimming on settings view to avoid locking the user out of the UI
  const currentPanel = app.querySelector(".main-panel");
  if (currentPanel) {
    if (state.syncStatus === "syncing" && state.activeView !== "settings") {
      currentPanel.style.opacity = "0.6";
      currentPanel.style.pointerEvents = "none";
      currentPanel.style.transition = "opacity 0.2s";
    } else {
      currentPanel.style.opacity = "1";
      currentPanel.style.pointerEvents = "auto";
      currentPanel.style.transition = "opacity 0.2s";
    }
  }
  bindEvents();
  // Re-apply theme/density/sidebar classes (innerHTML wipes them on full render)
  applyTheme(state.theme);
  applyDensity(state.settings.density);
  // Re-apply keyboard focus after DOM rebuild
  if (_kbFocusIndex >= 0) {
    const cards = [...document.querySelectorAll(".project-card[data-project-index]")];
    if (cards[_kbFocusIndex]) cards[_kbFocusIndex].classList.add("kb-focused");
  }
}

function renderActiveView() {
  const { activeView } = state;
  if (activeView === "studio-hub")     return renderStudioHubView(state);
  if (activeView === "virtual-office") return renderVirtualOfficeView(state);
  if (activeView === "social")         return renderSocialView(state);
  if (activeView === "vault-admin")    return renderVaultAdminView(state);
  if (activeView === "settings")       return renderSettingsView(state);
  if (activeView === "compare")        return renderCompareView(state);
  if (activeView === "heatmap")        return renderHeatmapView(state);
  if (activeView === "timeline")       return renderPortfolioTimelineView(state);
  if (activeView === "ticketing")       return renderTicketingView(state);
  if (activeView === "agent-commands")  return renderAgentCommandsView();
  if (activeView === "agents")          return renderAgentsView(state.agentRequests, state.agentRunHistory);
  if (activeView === "competitive")     return renderCompetitiveView(state);
  if (activeView === "analytics")       return renderAnalyticsView(state);
  if (activeView === "ai-copilot")      return renderAiCopilotView(state);
  if (activeView === "pr-review")       return renderPrReviewView(state);
  if (activeView === "phase-tracker")   return renderPhaseTrackerView(state);
  if (activeView.startsWith("project:")) {
    const project = getProjectById(activeView.slice("project:".length));
    return project
      ? renderProjectHubView(project, state)
      : `<div class="main-panel"><div class="empty-state">Project not found.</div></div>`;
  }
  return `<div class="main-panel"><div class="empty-state">View not found.</div></div>`;
}

// ── Command palette action handler ────────────────────────────────────────────
function handlePaletteAction(actionId) {
  if (actionId.startsWith("view:")) {
    state.activeView = actionId.slice("view:".length);
    render();
  } else if (actionId === "action:refresh") {
    clearSessionCache();
    syncAll();
  } else if (actionId === "action:focus") {
    state.focusMode = !state.focusMode;
    render();
  } else if (actionId === "action:snapshot") {
    pushScoreHistory(state.ghData, state.sbData, state.socialData);
    state.scoreHistory = loadScoreHistory();
    state.scorePrev    = scorePrevFromHistory(state.scoreHistory);
    logActivity("manual_snapshot", "");
    trackFeature("manual-snapshot");
    render();
  } else if (actionId === "action:clear-cache") {
    clearSessionCache();
    logActivity("clear_cache", "");
    trackFeature("clear-cache");
    syncAll();
  } else if (actionId === "action:digest") {
    generateWeeklyDigest(state, logActivity);
  } else if (actionId === "action:standup") {
    generateStandup(state, logActivity);
  }
}

// ── Keyboard cheatsheet ───────────────────────────────────────────────────────
function toggleCheatsheet() {
  const existing = document.getElementById("kb-cheatsheet");
  if (existing) { existing.remove(); return; }
  const el = document.createElement("div");
  el.id = "kb-cheatsheet";
  el.innerHTML = `
    <div style="
      position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:200;
      display:flex; align-items:center; justify-content:center;
    " id="kb-cheatsheet-backdrop">
      <div style="
        background:var(--panel); border:1px solid var(--border); border-radius:var(--radius);
        padding:28px 32px; min-width:320px; max-width:480px;
        box-shadow:0 24px 80px rgba(0,0,0,0.5);
      ">
        <div style="font-size:14px; font-weight:700; color:var(--silver); margin-bottom:18px; letter-spacing:0.04em;">
          KEYBOARD SHORTCUTS
        </div>
        ${[
          ["⌘K",    "Global search"],
          ["/",     "Open command palette"],
          ["j / k", "Navigate project cards"],
          ["Enter / E", "Open / expand focused project"],
          ["n",     "Enter sidebar nav focus mode"],
          ["↑ / ↓", "Navigate nav items (nav mode)"],
          ["E",     "Expand selected nav item (nav mode)"],
          ["r",     "Refresh data"],
          ["?",     "Toggle this cheatsheet"],
          ["Esc",   "Exit nav mode / close overlay"],
          ["1–8",   "Jump to view (Hub→Settings)"],
        ].map(([key, desc]) => `
          <div style="display:flex; align-items:center; gap:16px; padding:7px 0; border-bottom:1px solid var(--border);">
            <kbd style="font-family:monospace; font-size:12px; font-weight:700; color:var(--cyan);
                        background:rgba(122,231,199,0.1); border:1px solid rgba(122,231,199,0.25);
                        border-radius:5px; padding:3px 8px; min-width:48px; text-align:center;">${key}</kbd>
            <span style="font-size:13px; color:var(--text);">${desc}</span>
          </div>
        `).join("")}
        <div style="margin-top:14px; font-size:11px; color:var(--muted); text-align:center;">Press ? or click outside to close</div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById("kb-cheatsheet-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "kb-cheatsheet-backdrop") el.remove();
  });
}

// ── Keyboard navigation (j/k/r) ───────────────────────────────────────────────
let _kbFocusIndex = -1;
let _kbNavMode = false;     // #16: sidebar nav focus mode
let _kbNavIndex = -1;       // #16: focused sidebar nav item index

function getNavCards() {
  return [...document.querySelectorAll(".project-card[data-project-index]")];
}

function kbMoveFocus(delta) {
  const cards = getNavCards();
  if (!cards.length) return;
  const prev = document.querySelector(".project-card.kb-focused");
  if (prev) prev.classList.remove("kb-focused");
  _kbFocusIndex = Math.max(0, Math.min(cards.length - 1, _kbFocusIndex + delta));
  cards[_kbFocusIndex].classList.add("kb-focused");
  cards[_kbFocusIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// #16 — Nav focus mode: keyboard control of sidebar nav items
function getNavItems() {
  return [...document.querySelectorAll(".nav-item[data-view]")];
}

function kbNavMoveItem(delta) {
  const items = getNavItems();
  if (!items.length) return;
  const prev = document.querySelector(".nav-item.kb-nav-focused");
  if (prev) prev.classList.remove("kb-nav-focused");
  _kbNavIndex = Math.max(0, Math.min(items.length - 1, _kbNavIndex + delta));
  items[_kbNavIndex].classList.add("kb-nav-focused");
  items[_kbNavIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function kbNavEnter() {
  const focused = document.querySelector(".nav-item.kb-nav-focused");
  if (!focused?.dataset.view) return;
  _kbNavMode = false;
  document.querySelector(".nav-item.kb-nav-focused")?.classList.remove("kb-nav-focused");
  navigate(focused.dataset.view);
}

function kbNavExit() {
  _kbNavMode = false;
  _kbNavIndex = -1;
  document.querySelector(".nav-item.kb-nav-focused")?.classList.remove("kb-nav-focused");
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  const inInput = ["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName);

  // Cmd+K / Ctrl+K — global search
  if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    const modal = document.getElementById("global-search-modal");
    if (modal?.style.display !== "none" && modal?.style.display) { closeSearch(); return; }
    const allScores = PROJECTS.map((p) => ({
      project: p,
      scoring: scoreProject(p, state.ghData?.[p.githubRepo] || null, state.sbData, state.socialData),
    }));
    const creds = loadStoredCredentials();
    openSearch({ PROJECTS, allScores, ghData: state.ghData || {}, navigate, claudeApiKey: config.claudeApiKey || creds.claudeApiKey || "" });
    return;
  }

  // "/" opens command palette
  if (e.key === "/" && !inInput) {
    e.preventDefault();
    if (isPaletteOpen()) { unmountCommandPalette(); return; }
    mountCommandPalette(handlePaletteAction, getRecentProjects());
    return;
  }

  if (e.key === "?" && !inInput) {
    e.preventDefault();
    toggleCheatsheet();
    return;
  }

  if (e.key === "Escape") {
    const cs = document.getElementById("kb-cheatsheet");
    if (cs) { cs.remove(); return; }
    const gsModal = document.getElementById("global-search-modal");
    if (gsModal?.style.display !== "none" && gsModal?.style.display) { closeSearch(); return; }
    if (isPaletteOpen()) { unmountCommandPalette(); return; }
    if (_kbNavMode) { kbNavExit(); return; }
    if (state.mobileNavOpen) { state.mobileNavOpen = false; render(); return; }
    if (state.activeView === "ambient") { state.activeView = "studio-hub"; render(); return; }
  }

  if (inInput) return;

  // #16 — Nav focus mode: n enters, arrow keys navigate, Enter/E confirm, Escape exits
  if (e.key === "n" && !_kbNavMode) {
    e.preventDefault();
    _kbNavMode = true;
    _kbNavIndex = Math.max(0, getNavItems().findIndex((el) => el.classList.contains("active")));
    kbNavMoveItem(0);
    return;
  }
  if (_kbNavMode) {
    if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); kbNavMoveItem(1); return; }
    if (e.key === "ArrowUp"   || e.key === "k") { e.preventDefault(); kbNavMoveItem(-1); return; }
    if (e.key === "Enter" || e.key === "e" || e.key === "E") { e.preventDefault(); kbNavEnter(); return; }
    return; // eat all other keys in nav mode
  }

  // j/k — navigate project cards
  if (e.key === "j") { e.preventDefault(); kbMoveFocus(1); return; }
  if (e.key === "k") { e.preventDefault(); kbMoveFocus(-1); return; }

  // Enter / E — navigate to focused project card (E = "expand" into project hub)
  if (e.key === "Enter" || e.key === "e" || e.key === "E") {
    const focused = document.querySelector(".project-card.kb-focused");
    if (focused?.dataset.view) {
      navigate(focused.dataset.view);
    }
    return;
  }

  // r — refresh
  if (e.key === "r") {
    e.preventDefault();
    clearSessionCache();
    syncAll();
    return;
  }

  // 1–8 — jump to views
  const viewShortcuts = {
    "1": "studio-hub", "2": "virtual-office", "3": "ambient",
    "4": "compare", "5": "heatmap", "6": "timeline",
    "7": "social", "8": "settings",
  };
  if (viewShortcuts[e.key]) {
    e.preventDefault();
    const target = viewShortcuts[e.key];
    if (state.activeView !== target) { state.activeView = target; _kbFocusIndex = -1; render(); }
    return;
  }
});

// Re-render when a Brain flag is acknowledged (mark resolved button)
window.addEventListener("brain-flag-resolved", () => render());

window.addEventListener("popstate", (e) => {
  const decoded = parseStateHash(window.location.hash.slice(1));
  const view = e.state?.view || decoded.view || "studio-hub";
  state.activeView    = view;
  state.projectFilter = decoded.q   ?? state.projectFilter;
  state.tagFilter     = decoded.tag ?? state.tagFilter;
  _kbFocusIndex = -1;
  render();
  if (view.startsWith("project:")) {
    const pid = view.slice("project:".length);
    loadContextForProject(pid);
    loadExtendedDataForProject(pid);
    loadTickets(); // needed for pipeline strip in Studio Ops section
  }
  if (view === "ticketing") loadTickets();
  if (view === "competitive" && !state.competitorLoading) loadCompetitorData();
});

// ── Lazy context file loader ──────────────────────────────────────────────────
async function loadContextForProject(projectId) {
  const project = PROJECTS.find((p) => p.id === projectId);
  if (!project?.githubRepo) return;
  if (state.contextFiles[projectId] !== undefined) return; // already loaded
  if (state.contextFilesLoading.has(projectId)) return;    // already loading

  state.contextFilesLoading.add(projectId);
  // No render here — caller already rendered; loading state shows on next user interaction

  const credentials = loadStoredCredentials();
  const token = config.githubToken || credentials.githubToken || "";

  try {
    const [ctxResult, compliance] = await Promise.all([
      fetchAllProjectContextFiles([project], token, config.githubCacheTtlMs),
      fetchStudioOsCompliance(project.githubRepo, token, config.githubCacheTtlMs),
    ]);
    Object.assign(state.contextFiles, ctxResult);
    if (state.contextFiles[projectId] && compliance) {
      state.contextFiles[projectId].studioOsCompliance = compliance;
    } else if (compliance) {
      state.contextFiles[projectId] = { studioOsCompliance: compliance };
    }
  } catch {
    // Mark as loaded (empty) so we don't retry in a loop
    state.contextFiles[projectId] = null;
  }

  state.contextFilesLoading.delete(projectId);
  if (state.activeView === `project:${projectId}`) render();
}

// ── Lazy extended data loader (languages, branches, todo count) ───────────────
async function loadExtendedDataForProject(projectId) {
  const project = PROJECTS.find((p) => p.id === projectId);
  if (!project?.githubRepo) return;
  if (state.projectExtendedData[projectId] !== undefined) return; // already loaded
  if (state.projectExtendedLoading.has(projectId)) return;       // already loading

  state.projectExtendedLoading.add(projectId);

  const credentials = loadStoredCredentials();
  const token = config.githubToken || credentials.githubToken || "";
  const repoPath = project.githubRepo;

  try {
    const [languages, branches, todoCount, depAlerts] = await Promise.all([
      fetchRepoLanguages(repoPath, token),
      fetchRepoBranches(repoPath, token),
      fetchRepoTodoCount(repoPath, token),
      fetchDependencyAlerts(repoPath, token),
    ]);
    state.projectExtendedData[projectId] = { languages, branches, todoCount, depAlerts };
    // Inject into ghData so scoring picks it up immediately
    if (state.ghData[repoPath]) {
      if (todoCount > 0) state.ghData[repoPath].todoCount = todoCount;
      if (depAlerts) state.ghData[repoPath].depAlerts = depAlerts;
      clearScoringCache();
    }
  } catch {
    state.projectExtendedData[projectId] = null;
  }

  state.projectExtendedLoading.delete(projectId);
  if (state.activeView === `project:${projectId}`) render();
}

// ── Ticket loader ─────────────────────────────────────────────────────────────
async function loadTickets() {
  if (state.ticketsLoading) return;
  state.ticketsLoading = true;
  if (state.activeView === "ticketing") render();
  const credentials = loadStoredCredentials();
  const token = config.githubToken || credentials.githubToken || "";
  try {
    state.tickets = await fetchProjectTickets(token);
  } catch {
    state.tickets = [];
  }
  state.ticketsLoading = false;
  if (state.activeView === "ticketing") render();
}

// ── Competitor data loader ─────────────────────────────────────────────────────
async function loadCompetitorData() {
  if (state.competitorLoading) return;
  const repos = loadCompetitorList();
  if (!repos.length) return;
  state.competitorLoading = true;
  if (state.activeView === "competitive") render();
  const token = config.githubToken || loadStoredCredentials().githubToken || "";
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const results = await Promise.allSettled(
    repos.map((r) => fetch(`https://api.github.com/repos/${r}`, { headers })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`${res.status}`)))
      .then((d) => ({
        full_name: d.full_name,
        stars:     d.stargazers_count,
        forks:     d.forks_count,
        language:  d.language,
        pushedAt:  d.pushed_at,
      }))
      .catch((err) => ({ full_name: r, stars: null, forks: null, language: null, pushedAt: null, error: err.message }))
    )
  );

  const data = results.map((r) => r.status === "fulfilled" ? r.value : { full_name: "?", error: "fetch failed" });

  // Set session baseline on first load
  let baseline = {};
  try { baseline = JSON.parse(sessionStorage.getItem("vshub_competitor_baseline") || "{}"); } catch {}
  for (const d of data) {
    if (d.stars != null && baseline[d.full_name] == null) baseline[d.full_name] = d.stars;
  }
  try { sessionStorage.setItem("vshub_competitor_baseline", JSON.stringify(baseline)); } catch {}

  state.competitorData      = data;
  state.competitorLoading   = false;
  state.competitorFetchedAt = Date.now();
  if (state.activeView === "competitive") render();
}

// ── Competitor auto-discovery ─────────────────────────────────────────────────
async function runCompetitorDiscovery() {
  if (state.discoveryLoading) return;
  state.discoveryLoading = true;
  if (state.activeView === "competitive") render();

  const token = config.githubToken || loadStoredCredentials().githubToken || "";
  const dismissed = new Set(state.dismissedCompetitors);
  const manual = new Set(loadCompetitorList());

  try {
    const result = await discoverCompetitors(state.ghData, token, dismissed, manual);
    state.discoveredCompetitors = result.discovered;
    state.discoveryFetchedAt = Date.now();
  } catch {
    state.discoveredCompetitors = [];
  }
  state.discoveryLoading = false;
  if (state.activeView === "competitive") render();
}

// ── Browser Notifications — see engine/syncEngine.js (checkCiNotifications) ───

// ── Modal wrappers (implementations in hub/hubModals.js) ──────────────────────
const _modalCtx = () => ({ state, render, getProjectById, scoreProject });
const _showOnboardingModal = () => showOnboardingModal(_modalCtx());
const _showScoreModal = (projectId) => showScoreModal(projectId, _modalCtx());


// ── Recent projects tracker ────────────────────────────────────────────────────
const RECENT_PROJECTS_KEY = "vshub_recent";
function getRecentProjects() {
  try { return JSON.parse(sessionStorage.getItem(RECENT_PROJECTS_KEY) || "[]"); } catch { return []; }
}
function addRecentProject(projectId) {
  try {
    const recent = getRecentProjects().filter((id) => id !== projectId);
    recent.unshift(projectId);
    sessionStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recent.slice(0, 5)));
    state.recentlyVisited = getRecentProjects();
  } catch {}
}

// ── URL state encoding (#9 URL state handoff) ─────────────────────────────────
function buildStateHash(view, extraParams = {}) {
  const p = new URLSearchParams({ view });
  if (extraParams.q)   p.set("q",   extraParams.q);
  if (extraParams.tag) p.set("tag", extraParams.tag);
  return p.toString();
}

function parseStateHash(raw) {
  try {
    // Support legacy format: plain encoded view string (e.g. "studio-hub")
    if (!raw.includes("=")) return { view: decodeURIComponent(raw) };
    const p = new URLSearchParams(raw);
    return {
      view: p.get("view") || "studio-hub",
      q:    p.get("q")    || "",
      tag:  p.get("tag")  || "",
    };
  } catch { return { view: "studio-hub" }; }
}

function pushViewHash(view) {
  const extra = {};
  if (state.projectFilter) extra.q   = state.projectFilter;
  if (state.tagFilter)     extra.tag = state.tagFilter;
  const hash = buildStateHash(view, extra);
  try { history.pushState({ view, hash }, "", "#" + hash); } catch {}
}

// ── Navigate helper ───────────────────────────────────────────────────────────
function navigate(view) {
  // Clear memo cache for previous view to free memory on view switch
  if (state.activeView !== view) clearMemoCache(state.activeView);
  state.activeView = view;
  _kbFocusIndex = -1;
  pushViewHash(view);
  render();
  if (view === "competitive" && !state.competitorLoading) loadCompetitorData();
}

// ── Project Tags ──────────────────────────────────────────────────────────────
const TAGS_KEY = "vshub_tags";
function loadTags() { try { return JSON.parse(localStorage.getItem(TAGS_KEY) || "{}"); } catch { return {}; } }
function saveTags(t) { try { localStorage.setItem(TAGS_KEY, JSON.stringify(t)); } catch {} }
function getProjectTags(projectId) { return loadTags()[projectId] || []; }

// ── Saved Filter Presets ──────────────────────────────────────────────────────
const PRESETS_KEY = "vshub_filter_presets";
function loadPresets() { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]"); } catch { return []; } }
function savePresets(p) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); } catch {} }

// ── Event binding ─────────────────────────────────────────────────────────────
function buildEventCtx() {
  return {
    state, render, config, syncAll, logActivity, navigate,
    loadStoredCredentials, saveCredentials, saveSettings, loadSettings,
    setHubPassword, clearHubPassword,
    invalidateWeightsCache, clearSessionCache,
    scoreProject, PROJECTS,
    downloadJSON, downloadCSV, downloadScoreHistoryCSV, generateScoreRSSFeed,
    generateWeeklyDigest, generateStandup,
    loadScoreHistory, scorePrevFromHistory,
    applyAccent, applyTheme, applyDensity, getHubRuntimeConfig,
    loadTickets, submitProjectTicket, submitRenameTicket, submitInitiateTicket,
    commitVelocity, daysSince,
  };
}

function bindEvents() {
  // ── Navigation ──────────────────────────────────────────────────────────────
  function handleNavClick(el) {
    const view = el.getAttribute("data-view");
    if (view && view !== state.activeView) {
      state.activeView = view;
      _kbFocusIndex = -1;
      pushViewHash(view);
      if (view.startsWith("project:")) {
        logActivity("project_open", view.slice("project:".length));
        trackFeature("project-open");
        addRecentProject(view.slice("project:".length));
      }
      render();
      if (view.startsWith("project:")) {
        const pid = view.slice("project:".length);
        loadContextForProject(pid);
        loadExtendedDataForProject(pid);
      }
      if (view === "ticketing") loadTickets();
    }
  }
  // Delegated: [data-view] and .empty-state-action[data-navigate] via app container
  document.getElementById("app")?.addEventListener("click", (e) => {
    const navEl = e.target.closest("[data-view]");
    if (navEl) { e.stopPropagation(); handleNavClick(navEl); return; }
    const emptyBtn = e.target.closest(".empty-state-action[data-navigate]");
    if (emptyBtn) { const view = emptyBtn.dataset.navigate; if (view) { state.activeView = view; pushViewHash(view); render(); } }
    const phaseFilterBtn = e.target.closest("[data-phase-filter]");
    if (phaseFilterBtn) { state.phaseTrackerFilter = phaseFilterBtn.dataset.phaseFilter || "all"; render(); return; }
    const ticketingTabBtn = e.target.closest("[data-ticketing-tab]");
    if (ticketingTabBtn) { state.ticketingTab = ticketingTabBtn.dataset.ticketingTab || "listing"; state.renameSuccess = null; state.renameError = null; state.initiateSuccess = null; state.initiateError = null; render(); return; }
  });
  document.getElementById("app")?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const navEl = e.target.closest("[data-view]");
    if (navEl) { e.preventDefault(); handleNavClick(navEl); return; }
    const emptyBtn = e.target.closest(".empty-state-action[data-navigate]");
    if (emptyBtn) { e.preventDefault(); const view = emptyBtn.dataset.navigate; if (view) { state.activeView = view; pushViewHash(view); render(); } }
  });

  // ── Website analytics loader (reusable for refresh) ─────────────────────────
  function loadWebsiteAnalytics() {
    state.websiteLoading = true;
    state.websiteError = null;
    render();
    Promise.all([
      fetchPageSpeedData(config.pagespeedApiKey).catch(() => null),
      fetchSiteProbe().catch(() => null),
      fetchRepoTraffic("VaultSparkStudios/VaultSparkStudios.github.io", config.githubToken).catch(() => null),
    ]).then(([psi, probe, traffic]) => {
      state.websitePsi = psi;
      state.websiteProbe = mergeProbeWithFallback(probe, psi);
      state.websiteTraffic = traffic;
      state.websiteLoading = false;
      if (!psi && !probe) state.websiteError = "Both PageSpeed and site probe failed. Check network or API key.";
      render();
    });
  }

  // ── Core controls ───────────────────────────────────────────────────────────
  document.getElementById("sidebar-toggle-btn")?.addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    saveUiState({ ...loadUiState(), sidebarCollapsed: state.sidebarCollapsed });
    render();
  });
  document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    saveUiState({ ...loadUiState(), theme: state.theme });
    saveSettings({ ...loadSettings(), theme: state.theme });
    applyTheme(state.theme);
    render();
  });
  document.getElementById("nav-project-search")?.addEventListener("input", (e) => {
    state.navProjectSearch = e.target.value;
    // Filter project nav items without full re-render
    const search = (e.target.value || "").toLowerCase().trim();
    document.querySelectorAll(".nav-item[data-project-id]").forEach((item) => {
      const name = (item.dataset.projectName || "").toLowerCase();
      item.style.display = (!search || name.includes(search)) ? "" : "none";
    });
    document.querySelectorAll(".nav-project-group").forEach((group) => {
      const anyVisible = [...group.querySelectorAll(".nav-item[data-project-id]")]
        .some((i) => i.style.display !== "none");
      group.style.display = (!search || anyVisible) ? "" : "none";
    });
  });
  document.getElementById("mobile-nav-btn")?.addEventListener("click", () => {
    state.mobileNavOpen = !state.mobileNavOpen;
    render();
  });
  document.getElementById("mobile-overlay")?.addEventListener("click", () => {
    state.mobileNavOpen = false;
    render();
  });
  // Delegated tab handlers — project/admin tabs via main panel
  document.querySelector(".main-panel")?.addEventListener("click", (e) => {
    const projTab = e.target.closest("[data-project-tab]");
    if (projTab) { const tab = projTab.getAttribute("data-project-tab"); if (tab && tab !== state.projectTab) { state.projectTab = tab; render(); } return; }
    const adminTab = e.target.closest("[data-admin-tab]");
    if (adminTab) { const tab = adminTab.getAttribute("data-admin-tab"); if (tab && tab !== state.adminTab) { state.adminTab = tab; render(); } return; }
    // Website analytics refresh button
    if (e.target.closest("#website-analytics-refresh")) {
      e.preventDefault();
      // Clear cache so we get fresh data
      try { sessionStorage.removeItem("vshub_webanalytics_pagespeed_all"); sessionStorage.removeItem("vshub_webanalytics_site_probe"); } catch {}
      state.websitePsi = null;
      state.websiteProbe = null;
      state.websiteTraffic = null;
      loadWebsiteAnalytics();
      return;
    }
    // Analytics tab switching (delegated — survives re-render)
    const analyticsTab = e.target.closest("[data-analytics-tab]");
    if (analyticsTab) {
      const tab = analyticsTab.getAttribute("data-analytics-tab");
      if (tab && tab !== state.analyticsTab) {
        state.analyticsTab = tab;
        if (tab === "website" && !state.websitePsi && !state.websiteLoading) {
          loadWebsiteAnalytics();
        } else {
          render();
        }
      }
    }
  });
  document.getElementById("focus-mode-btn")?.addEventListener("click", () => {
    state.focusMode = !state.focusMode;
    render();
  });
  document.getElementById("toggle-compact-cards")?.addEventListener("click", () => {
    state.compactCards = !state.compactCards;
    render();
  });
  document.querySelectorAll("[data-pin-project]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const projectId = btn.dataset.pinProject;
      try {
        const pinned = new Set(JSON.parse(localStorage.getItem("vshub_pinned") || "[]"));
        if (pinned.has(projectId)) pinned.delete(projectId);
        else pinned.add(projectId);
        localStorage.setItem("vshub_pinned", JSON.stringify([...pinned]));
        render();
      } catch {}
    });
  });

  // Per-project cache invalidation
  document.getElementById("refresh-project-btn")?.addEventListener("click", () => {
    const btn = document.getElementById("refresh-project-btn");
    const repoPath = btn?.dataset.refreshProject;
    if (!repoPath) return;
    const repoKey = repoPath.replace(/\//g, "_");
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("vshub_") && k.includes(repoKey))
      .forEach((k) => sessionStorage.removeItem(k));
    sessionStorage.removeItem(`vshub_gh_${repoPath}`);
    syncAll();
  });

  // Project filter + alert history search
  document.getElementById("project-filter-input")?.addEventListener("input", debounce((e) => {
    state.projectFilter = e.target.value.toLowerCase().trim();
    pushViewHash(state.activeView);
    render();
  }, 150));
  document.getElementById("alert-history-search")?.addEventListener("input", (e) => {
    state.alertHistoryFilter = e.target.value;
    render();
  });

  // ── Agent dispatch ──────────────────────────────────────────────────────────
  document.querySelectorAll("[data-action='dispatch-agent']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const agentId   = btn.dataset.agentId;
      const agentName = btn.dataset.agentName;
      const phrase    = btn.dataset.phrase;
      const token     = config.githubToken;
      if (!token) { alert("GitHub token not configured — go to Settings to add it."); return; }
      btn.disabled = true;
      btn.textContent = "Submitting…";
      const result = await submitAgentRequest(agentId, agentName, phrase, token);
      if (result.ok) {
        btn.textContent = `✓ #${result.number} created`;
        btn.style.color = "var(--green)";
        state.agentRequests = await fetchAgentRequests(token, 0).catch(() => state.agentRequests);
        render();
      } else {
        btn.textContent = "Failed — retry";
        btn.disabled = false;
        btn.style.color = "var(--red)";
        console.error("Agent dispatch failed:", result.error);
      }
    });
  });

  // ── Alert snooze / unsnooze ─────────────────────────────────────────────────
  document.getElementById("unsnooze-all-btn")?.addEventListener("click", () => {
    localStorage.removeItem("vshub_alert_snooze");
    render();
  });
  document.querySelectorAll("[data-unsnooze]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const msg = btn.dataset.unsnooze;
      try {
        const s = JSON.parse(localStorage.getItem("vshub_alert_snooze") || "{}");
        delete s[msg];
        localStorage.setItem("vshub_alert_snooze", JSON.stringify(s));
        render();
      } catch {}
    });
  });
  document.querySelectorAll("[data-snooze-alert]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const msg = btn.dataset.snoozeAlert;
      const dur = Number(btn.dataset.snoozeDuration) || 86400000;
      snoozeAlert(msg, dur);
      render();
    });
  });
  document.getElementById("snooze-all-alerts-btn")?.addEventListener("click", () => {
    document.querySelectorAll("[data-snooze-alert]").forEach((btn) => {
      const msg = btn.dataset.snoozeAlert;
      const dur = Number(btn.dataset.snoozeDuration) || 86400000;
      if (msg) snoozeAlert(msg, dur);
    });
    render();
  });

  // ── Gamification events ──────────────────────────────────────────────────────
  document.querySelectorAll("[data-claim-challenge]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.claimChallenge;
      const type = btn.dataset.challengeType;
      const xp = claimChallengeXP(id, type);
      if (xp > 0) {
        grantXP(xp, `Challenge: ${id}`);
        showToast(`Challenge completed! +${xp} XP`, "success", 4000);
      }
      // Preserve scroll position across re-render
      const panel = document.querySelector(".main-panel");
      const scrollY = panel ? panel.scrollTop : window.scrollY;
      render();
      const panelAfter = document.querySelector(".main-panel");
      if (panelAfter) panelAfter.scrollTop = scrollY;
      else window.scrollTo(0, scrollY);
    });
  });
  // ── Daily bonus claim ──
  const dailyBonusBtn = document.getElementById("claim-daily-bonus-btn");
  if (dailyBonusBtn) {
    dailyBonusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const xp = claimDailyBonus();
      if (xp > 0) {
        showToast(`Daily bonus claimed! +${xp} XP`, "success", 3000);
        // Check for streak milestone
        const streak = getLoginStreak();
        const milestoneXP = grantStreakMilestone(streak);
        if (milestoneXP > 0) {
          setTimeout(() => showToast(`Streak milestone! ${streak}-day streak — +${milestoneXP} XP bonus!`, "success", 5000), 1500);
        }
      }
      const panel = document.querySelector(".main-panel");
      const scrollY = panel ? panel.scrollTop : window.scrollY;
      render();
      const panelAfter = document.querySelector(".main-panel");
      if (panelAfter) panelAfter.scrollTop = scrollY;
      else window.scrollTo(0, scrollY);
    });
  }

  document.querySelectorAll("[data-achievement-dismiss]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissNotification(el.dataset.achievementDismiss);
      el.remove();
    });
  });

  // ── Timeline / floor / changelog filters ────────────────────────────────────
  document.querySelectorAll("[data-timeline-mode]").forEach((btn) => {
    btn.addEventListener("click", () => { state.timelineMode = btn.dataset.timelineMode; render(); });
  });
  document.querySelectorAll("[data-timeline-type]").forEach((btn) => {
    btn.addEventListener("click", () => { state.timelineTypeFilter = btn.dataset.timelineType; render(); });
  });
  document.getElementById("timeline-project-filter")?.addEventListener("change", (e) => {
    state.timelineProjectFilter = e.target.value; render();
  });
  document.getElementById("time-travel-slider")?.addEventListener("input", (e) => {
    state.timeTravelIndex = Number(e.target.value); render();
  });
  document.getElementById("activity-project-filter")?.addEventListener("change", (e) => {
    state.activityProjectFilter = e.target.value; render();
  });
  document.getElementById("changelog-filter")?.addEventListener("input", (e) => {
    state.changelogFilter = e.target.value; render();
  });
  const floorSearchEl = document.getElementById("floor-search-input");
  if (floorSearchEl) floorSearchEl.addEventListener("input", (e) => { state.floorSearch = e.target.value; render(); });
  const floorSortEl = document.getElementById("floor-sort-select");
  if (floorSortEl) floorSortEl.addEventListener("change", (e) => { state.floorSort = e.target.value; render(); });

  // ── Tag filter pills + bulk tag ─────────────────────────────────────────────
  document.querySelectorAll("[data-tag-filter]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tag = btn.dataset.tagFilter;
      state.tagFilter = state.tagFilter === tag ? "" : tag;
      pushViewHash(state.activeView);
      render();
    });
  });
  document.getElementById("bulk-tag-mode-btn")?.addEventListener("click", (e) => {
    e.stopPropagation(); state.bulkTagMode = !state.bulkTagMode; render();
  });
  document.getElementById("bulk-tag-done-btn")?.addEventListener("click", (e) => {
    e.stopPropagation(); state.bulkTagMode = false; render();
  });
  document.getElementById("bulk-tag-add-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const input = document.getElementById("bulk-tag-input");
    const tag = input?.value?.trim();
    if (!tag) return;
    const checked = [...document.querySelectorAll("[data-bulk-project-id]:checked")].map((cb) => cb.dataset.bulkProjectId);
    if (!checked.length) return;
    try {
      const tags = JSON.parse(localStorage.getItem("vshub_tags") || "{}");
      for (const id of checked) {
        if (!tags[id]) tags[id] = [];
        if (!tags[id].includes(tag)) tags[id].push(tag);
      }
      localStorage.setItem("vshub_tags", JSON.stringify(tags));
    } catch {}
    render();
  });
  document.getElementById("bulk-tag-remove-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const input = document.getElementById("bulk-tag-input");
    const tag = input?.value?.trim();
    if (!tag) return;
    const checked = [...document.querySelectorAll("[data-bulk-project-id]:checked")].map((cb) => cb.dataset.bulkProjectId);
    if (!checked.length) return;
    try {
      const tags = JSON.parse(localStorage.getItem("vshub_tags") || "{}");
      for (const id of checked) {
        if (tags[id]) tags[id] = tags[id].filter((t) => t !== tag);
      }
      localStorage.setItem("vshub_tags", JSON.stringify(tags));
    } catch {}
    render();
  });

  // ── Misc ────────────────────────────────────────────────────────────────────
  document.getElementById("ambient-fullscreen-btn")?.addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  });
  document.getElementById("onboarding-modal-btn")?.addEventListener("click", _showOnboardingModal);
  document.querySelectorAll("[data-score-explain]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); _showScoreModal(btn.dataset.scoreExplain); });
  });

  // ── Competitive tracker ─────────────────────────────────────────────────────
  document.getElementById("competitor-edit-btn")?.addEventListener("click", () => {
    state.competitorEditing = !state.competitorEditing;
    render();
  });
  document.getElementById("competitor-cancel-btn")?.addEventListener("click", () => {
    state.competitorEditing = false;
    render();
  });
  document.getElementById("competitor-save-btn")?.addEventListener("click", () => {
    const input = document.getElementById("competitor-list-input");
    const repos = (input?.value || "").split(/[\n,]+/).map((r) => r.trim()).filter((r) => /^[\w.-]+\/[\w.-]+$/.test(r));
    saveCompetitorList(repos);
    state.competitorEditing = false;
    state.competitorData    = null; // force re-fetch
    render();
    loadCompetitorData();
  });
  document.getElementById("competitor-refresh-btn")?.addEventListener("click", () => {
    state.competitorData = null;
    loadCompetitorData();
  });
  document.getElementById("competitor-discover-btn")?.addEventListener("click", () => {
    runCompetitorDiscovery();
  });
  document.querySelectorAll("[data-track-repo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const repo = btn.dataset.trackRepo;
      if (!repo) return;
      const list = loadCompetitorList();
      if (!list.includes(repo)) {
        list.push(repo);
        saveCompetitorList(list);
      }
      // Remove from discovered
      if (state.discoveredCompetitors) {
        state.discoveredCompetitors = state.discoveredCompetitors.filter((r) => r.full_name !== repo);
      }
      state.competitorData = null; // force re-fetch tracked list
      render();
      loadCompetitorData();
    });
  });
  document.querySelectorAll("[data-dismiss-repo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const repo = btn.dataset.dismissRepo;
      if (!repo) return;
      if (!state.dismissedCompetitors.includes(repo)) {
        state.dismissedCompetitors.push(repo);
        saveDismissedCompetitors(state.dismissedCompetitors);
      }
      if (state.discoveredCompetitors) {
        state.discoveredCompetitors = state.discoveredCompetitors.filter((r) => r.full_name !== repo);
      }
      render();
    });
  });

  // ── AI Copilot ──────────────────────────────────────────────────────────────
  async function copilotSend(text) {
    render();
    // Stream callback: update a live assistant bubble as tokens arrive
    let streamEl = null;
    await sendCopilotMessage(text, state, (partial) => {
      if (!streamEl) {
        const msgBox = document.getElementById("copilot-messages");
        if (!msgBox) return;
        // Remove typing indicator and append stream bubble
        msgBox.querySelectorAll(".copilot-typing").forEach((t) => t.closest(".copilot-msg")?.remove());
        streamEl = document.createElement("div");
        streamEl.className = "copilot-msg copilot-msg-assistant";
        streamEl.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;margin-bottom:16px;";
        streamEl.innerHTML = `<div style="max-width:85%;padding:12px 16px;border-radius:12px;font-size:13px;line-height:1.6;background:var(--panel);color:var(--text);border:1px solid var(--border);white-space:pre-wrap;word-break:break-word;"></div>`;
        msgBox.appendChild(streamEl);
      }
      const bubble = streamEl.querySelector("div");
      if (bubble) bubble.textContent = partial;
      const msgBox = document.getElementById("copilot-messages");
      if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
    });
    render();
    const msgBox = document.getElementById("copilot-messages");
    if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
  }
  document.getElementById("copilot-send-btn")?.addEventListener("click", async () => {
    const input = document.getElementById("copilot-input");
    const text = input?.value?.trim();
    if (!text) return;
    input.value = "";
    await copilotSend(text);
  });
  document.getElementById("copilot-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("copilot-send-btn")?.click();
    }
  });
  document.getElementById("copilot-clear-btn")?.addEventListener("click", () => {
    clearCopilotHistory();
    render();
  });
  document.querySelectorAll("[data-copilot-quick]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.copilotQuick);
      const questions = [
        "Which project needs the most attention right now?",
        "What are the top 3 actions to raise our studio average?",
        "Which projects are at risk of a grade drop?",
        "Summarize the studio health in 3 bullet points",
        "What should I ship this week for maximum impact?",
        "Compare our game projects vs tool projects",
      ];
      const text = questions[idx];
      if (!text) return;
      await copilotSend(text);
    });
  });

  // ── Delegate to view-specific modules ──────────────────────────────────────
  const ctx = buildEventCtx();
  bindSettingsEvents(ctx);
  bindProjectHubEvents(ctx);
  bindHeatmapEvents(ctx);
  bindCompareEvents(ctx);
  bindTicketingEvents(ctx);
}

// ── Data sync — wired via engine/syncEngine.js ────────────────────────────────
const { syncAll } = createSyncEngine({
  state,
  config,
  render,
  clearSessionCache,
  logActivity,
  loadContextForProject,
  loadExtendedDataForProject,
});

// ── Offline mode banner ──────────────────────────────────────────────────────
state.isOffline = !navigator.onLine;
function updateOfflineBanner() {
  state.isOffline = !navigator.onLine;
  let banner = document.getElementById("offline-banner");
  if (state.isOffline) {
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "offline-banner";
      banner.setAttribute("role", "alert");
      banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9998;background:#f87171;color:#fff;text-align:center;padding:6px 12px;font-size:12px;font-weight:600;letter-spacing:0.03em;";
      banner.textContent = "You are offline — showing cached data";
      document.body.prepend(banner);
    }
  } else if (banner) {
    banner.remove();
  }
}
window.addEventListener("online", () => { updateOfflineBanner(); render(); });
window.addEventListener("offline", updateOfflineBanner);
updateOfflineBanner();

// ── PWA install prompt ────────────────────────────────────────────────────────
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  state.pwaInstallPrompt = e;
  // Re-render only if already mounted to show the install button
  const app = document.getElementById("app");
  if (app && app.innerHTML.trim().length > 0) render();
});

window.addEventListener("appinstalled", () => {
  state.pwaInstallPrompt = null;
});

// ── Boot ──────────────────────────────────────────────────────────────────────
// Restore view + filter state from URL hash (#9 URL state handoff)
const _bootHash = parseStateHash(window.location.hash.slice(1));
if (_bootHash.view) state.activeView    = _bootHash.view;
if (_bootHash.q)    state.projectFilter = _bootHash.q;
if (_bootHash.tag)  state.tagFilter     = _bootHash.tag;

initGlobalSearch();

// Initialize IndexedDB and migrate large datasets from localStorage
initIDB().then(() => { migrateFromLocalStorage(); startSession(); }).catch(() => {});

// End session telemetry on page unload
window.addEventListener("pagehide", () => endSession());

if (!isUnlocked()) {
  // Mount the gate first — it's a full-screen overlay so it must show even
  // if render() fails (e.g. a view component throws during first paint).
  mountGate();
  try { render(); } catch (e) { console.error("[HUB] render() during gate boot:", e); }
} else {
  render();
  syncAll();
  if (state.activeView === "competitive") loadCompetitorData();
}

// ── Multi-tab awareness ───────────────────────────────────────────────────────
if (typeof BroadcastChannel !== "undefined") {
  const tabChannel = new BroadcastChannel("vshub_tabs")
  tabChannel.onmessage = (e) => {
    if (e.data?.type === "sync_complete") {
      // Another tab synced — reload our score history and re-render
      state.scoreHistory = loadScoreHistory()
      state.scorePrev = scorePrevFromHistory(state.scoreHistory)
      render()
      dbg("Multi-tab: received sync_complete from another tab")
    }
  }
  window._hubBroadcastSync = () => {
    try { tabChannel.postMessage({ type: "sync_complete", ts: Date.now() }) } catch {}
  }
}

// Gist Cloud Sync — implementation in engine/gistSync.js; re-exported here for external consumers.
export { pushToGist, pullFromGist };

// Expose on window so settings event handlers can call without import overhead
window._vshubGistPush = (token, gistId) => pushToGist(token, gistId);
window._vshubGistPull = (token, gistId) => pullFromGist(token, gistId);
