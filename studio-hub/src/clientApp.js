import { getHubRuntimeConfig } from "./config/runtimeConfig.js";
import { PROJECTS, getProjectById } from "./data/studioRegistry.js";
import { scoreProject, getGrade, invalidateWeightsCache, clearScoringCache } from "./utils/projectScoring.js";
import { fmt, daysSince, commitVelocity, debounce } from "./utils/helpers.js";
import { fetchAllRepos, fetchOrgActivity, fetchAllProjectContextFiles, fetchBeaconGist, getRateLimitInfo, getFetchError, clearFetchErrors, fetchRepoLanguages, fetchRepoBranches, fetchRepoTodoCount, countCachedRepos, fetchProjectTickets, submitProjectTicket, fetchStudioOsCompliance, fetchStudioBrain, fetchAgentRequests, fetchPortfolioFreshness, fetchPortfolioFileContents, fetchAgentRunHistory, submitAgentRequest } from "./data/githubAdapter.js";
import { fetchAllSupabaseData } from "./data/supabaseAdapter.js";
import { fetchAllSocialFeeds } from "./data/socialFeedsAdapter.js";
import { renderNavigation } from "./components/navigation.js";
import { renderStudioHubView, pushAlertHistory, snoozeAlert } from "./components/studioHubView.js";
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
import { mountCommandPalette, unmountCommandPalette, isPaletteOpen } from "./components/commandPalette.js";
import { validateRegistry } from "./data/studioRegistry.js";
import { downloadJSON, downloadCSV } from "./utils/exportHelpers.js";
import { generateStandup, generateWeeklyDigest } from "./utils/digestHelpers.js";
import { forecastScores, recordForecastOutcomes } from "./utils/scoreForecast.js";
import { bindSettingsEvents }   from "./events/settingsEvents.js";
import { bindProjectHubEvents } from "./events/projectHubEvents.js";
import { bindHeatmapEvents }    from "./events/heatmapEvents.js";
import { bindCompareEvents }    from "./events/compareEvents.js";
import { bindTicketingEvents }  from "./events/ticketingEvents.js";

// ── Config ────────────────────────────────────────────────────────────────────
const config = getHubRuntimeConfig();

// ── Debug mode ────────────────────────────────────────────────────────────────
const DEBUG = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
function dbg(...args) { if (DEBUG) console.log("[HUB]", ...args); }

// ── Registry validation ───────────────────────────────────────────────────────
validateRegistry();

// ── Score history helpers ─────────────────────────────────────────────────────
const SCORE_HISTORY_KEY = "vshub_score_history";
const MAX_HISTORY       = 52; // ~1yr of weekly snapshots

function loadScoreHistory() {
  try {
    const raw = localStorage.getItem(SCORE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function pushScoreHistory(ghData, sbData, socialData) {
  try {
    const scores = {}, ci = {}, issues = {};
    for (const p of PROJECTS) {
      const repoData = ghData[p.githubRepo] || null;
      if (repoData !== null || sbData !== null) {
        scores[p.id] = scoreProject(p, repoData, sbData, socialData).total;
        ci[p.id]     = repoData?.ciRuns?.[0]?.conclusion || null;
        issues[p.id] = repoData?.repo?.openIssues ?? null;
      }
    }
    const history = loadScoreHistory();
    history.push({ ts: Date.now(), scores, ci, issues });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(history));
    return history;
  } catch { return []; }
}

// scorePrev = scores at session start (stored in sessionStorage) for accurate session-delta badges
const SESSION_START_KEY = "vshub_session_start_scores";
function storeSessionStartScores(history) {
  if (!history.length) return;
  try {
    if (!sessionStorage.getItem(SESSION_START_KEY)) {
      const latest = history[history.length - 1].scores || {};
      sessionStorage.setItem(SESSION_START_KEY, JSON.stringify(latest));
    }
  } catch {}
}
function scorePrevFromHistory(history) {
  // Prefer session-start scores so delta badges reflect true session progress
  try {
    const stored = sessionStorage.getItem(SESSION_START_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  if (history.length < 2) return {};
  return history[history.length - 2].scores || {};
}

function clearSessionCache() {
  Object.keys(sessionStorage).filter((k) => k.startsWith("vshub_")).forEach((k) => sessionStorage.removeItem(k));
}

// ── UI state helpers ──────────────────────────────────────────────────────────
const UI_KEY = "vshub_ui";
function loadUiState() {
  try { return JSON.parse(localStorage.getItem(UI_KEY) || "{}"); } catch { return {}; }
}
function saveUiState(ui) {
  try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch {}
}

// ── Hub Activity Log ──────────────────────────────────────────────────────────
const ACTIVITY_KEY = "vshub_activity";
const MAX_ACTIVITY = 50;

function logActivity(event, detail = "") {
  try {
    const log = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    log.push({ ts: Date.now(), event, detail });
    if (log.length > MAX_ACTIVITY) log.splice(0, log.length - MAX_ACTIVITY);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log));
  } catch {}
}

function loadActivity() {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]"); } catch { return []; }
}

// ── State ─────────────────────────────────────────────────────────────────────
const appSettings = loadSettings();
const uiState     = loadUiState();

const _prevLastOpened = uiState.lastOpened || null;
// Update last opened on mount
try { saveUiState({ ...uiState, lastOpened: Date.now() }); } catch {}

const state = {
  activeView:         "studio-hub",
  adminTab:           "members",
  projectTab:         "games",
  syncStatus:         "idle",
  syncError:          null,
  settings:           appSettings,
  focusMode:          false,
  projectFilter:      "",
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
  activityProjectFilter: "",
  pwaInstallPrompt:   null,
  tickets:            [],
  ticketsLoading:     false,
  ticketSubmitting:   false,
  ticketSuccess:      null,
  ticketError:        null,
  compactCards:       false,
  changelogFilter:    "",
  bulkTagMode:        false,
  floorSearch:        "",
  floorSort:          "score",

  studioBrain:           null,
  agentRequests:         [],
  portfolioFreshness:    {},
  portfolioFiles:        {},
  agentRunHistory:       {},

  supabaseAnonKey: config.supabaseAnonKey,
  prevLastOpened: _prevLastOpened,
  alertHistoryFilter: "",
  recentlyVisited: getRecentProjects(),
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

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.body.classList.toggle("theme-light", theme === "light");
}
// Auto-detect system theme on first visit (no stored preference)
if (!appSettings.theme && typeof window.matchMedia === "function") {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  state.theme = prefersDark ? "dark" : "light";
}
applyTheme(state.theme);

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

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById("app");
  if (!app) return;

  // Ambient mode gets a full-screen overlay — no shell chrome
  if (state.activeView === "ambient") {
    app.innerHTML = renderAmbientView(state);
    bindEvents();
    return;
  }

  const collapsedClass = state.sidebarCollapsed ? " sidebar-collapsed" : "";
  const mobileClass    = state.mobileNavOpen    ? " mobile-nav-open"   : "";
  const activeViewHtml = renderActiveView();
  app.innerHTML = `
    <div class="shell${collapsedClass}${mobileClass}">
      <div class="mobile-overlay" id="mobile-overlay"></div>
      ${renderNavigation(state)}
      ${activeViewHtml}
    </div>
  `;
  // Inject mobile nav button as first child of main-panel (DOM insertion — no regex fragility)
  const mainPanel = app.querySelector(".main-panel");
  if (mainPanel) {
    const mobileBtn = document.createElement("button");
    mobileBtn.id = "mobile-nav-btn";
    mobileBtn.title = "Open navigation";
    mobileBtn.textContent = "☰ Menu";
    mainPanel.insertBefore(mobileBtn, mainPanel.firstChild);
  }
  // Visual syncing state — dim main panel while sync runs
  if (state.syncStatus === "syncing" && mainPanel) {
    mainPanel.style.opacity = "0.6";
    mainPanel.style.pointerEvents = "none";
    mainPanel.style.transition = "opacity 0.2s";
  }
  bindEvents();
  // Re-apply theme/sidebar classes (innerHTML wipes them)
  applyTheme(state.theme);
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
    render();
  } else if (actionId === "action:clear-cache") {
    clearSessionCache();
    logActivity("clear_cache", "");
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
          ["/",     "Open command palette"],
          ["j / k", "Navigate project cards"],
          ["Enter", "Open focused project"],
          ["r",     "Refresh data"],
          ["?",     "Toggle this cheatsheet"],
          ["Esc",   "Close palette / ambient mode"],
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

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  const inInput = ["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName);

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
    if (isPaletteOpen()) { unmountCommandPalette(); return; }
    if (state.mobileNavOpen) { state.mobileNavOpen = false; render(); return; }
    if (state.activeView === "ambient") { state.activeView = "studio-hub"; render(); return; }
  }

  if (inInput) return;

  // j/k — navigate project cards
  if (e.key === "j") { e.preventDefault(); kbMoveFocus(1); return; }
  if (e.key === "k") { e.preventDefault(); kbMoveFocus(-1); return; }

  // Enter — navigate to focused project card
  if (e.key === "Enter") {
    const focused = document.querySelector(".project-card.kb-focused");
    if (focused?.dataset.view) {
      state.activeView = focused.dataset.view;
      render();
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
  const view = e.state?.view || "studio-hub";
  state.activeView = view;
  _kbFocusIndex = -1;
  render();
  if (view.startsWith("project:")) {
    const pid = view.slice("project:".length);
    loadContextForProject(pid);
    loadExtendedDataForProject(pid);
    loadTickets(); // needed for pipeline strip in Studio Ops section
  }
  if (view === "ticketing") loadTickets();
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
    const [languages, branches, todoCount] = await Promise.all([
      fetchRepoLanguages(repoPath, token),
      fetchRepoBranches(repoPath, token),
      fetchRepoTodoCount(repoPath, token),
    ]);
    state.projectExtendedData[projectId] = { languages, branches, todoCount };
    // Inject todoCount into ghData so scoreRisk() picks it up immediately
    if (state.ghData[repoPath] && todoCount > 0) {
      state.ghData[repoPath].todoCount = todoCount;
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

// ── Browser Notifications ─────────────────────────────────────────────────────
let _prevCiStates = {};

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

// ── Onboarding Modal ──────────────────────────────────────────────────────────
function showOnboardingModal() {
  const existing = document.getElementById("onboarding-modal");
  if (existing) { existing.remove(); return; }
  const el = document.createElement("div");
  el.id = "onboarding-modal";
  el.innerHTML = `
    <div style="position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:200;
                display:flex; align-items:center; justify-content:center;" id="onboarding-modal-backdrop">
      <div style="background:var(--panel); border:1px solid var(--border); border-radius:var(--radius);
                  padding:28px 32px; width:min(560px, 92vw); box-shadow:0 24px 80px rgba(0,0,0,0.5); max-height:80vh; overflow-y:auto;">
        <div style="font-size:15px; font-weight:800; color:var(--cyan); margin-bottom:6px; letter-spacing:0.03em;">Setup Guide</div>
        <div style="font-size:12px; color:var(--muted); margin-bottom:20px;">Get live data in 3 steps.</div>
        ${[
          {
            step: "1", title: "GitHub Token (required)",
            body: `Create a read-only fine-grained PAT at <strong>github.com/settings/tokens</strong>. Select your VaultSpark org, grant read access to: Repositories (metadata, code, commits, pull requests, actions). Paste it in Settings → API Credentials.`,
            color: "var(--cyan)",
          },
          {
            step: "2", title: "YouTube API Key (optional)",
            body: `Visit <strong>console.cloud.google.com</strong>, create a project, enable YouTube Data API v3, and create an API key. Free quota: 10,000 units/day. Paste it in Settings → API Credentials.`,
            color: "var(--blue)",
          },
          {
            step: "3", title: "Gumroad Token (optional)",
            body: `Go to <strong>Gumroad → Settings → Advanced → Access Tokens</strong>. Create a token with read access. Paste it in Settings → API Credentials for product + revenue data.`,
            color: "var(--gold)",
          },
        ].map(({ step, title, body, color }) => `
          <div style="display:flex; gap:14px; margin-bottom:20px;">
            <div style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.06);
                        border:1px solid ${color}; display:flex; align-items:center; justify-content:center;
                        font-size:13px; font-weight:800; color:${color}; flex-shrink:0;">${step}</div>
            <div>
              <div style="font-size:13px; font-weight:700; color:var(--text); margin-bottom:4px;">${title}</div>
              <div style="font-size:12px; color:var(--muted); line-height:1.6;">${body}</div>
            </div>
          </div>
        `).join("")}
        <div style="padding:12px 14px; background:rgba(122,231,199,0.06); border:1px solid rgba(122,231,199,0.15); border-radius:8px; margin-bottom:16px;">
          <div style="font-size:11px; font-weight:700; color:var(--cyan); margin-bottom:4px;">Pre-configured (no setup needed)</div>
          <div style="font-size:11px; color:var(--muted); line-height:1.7;">
            ✓ Supabase — studio analytics<br>
            ✓ Reddit — public API, no auth<br>
            ✓ Bluesky — AT Protocol, no auth
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="onboarding-go-settings-btn" style="font-size:12px; padding:8px 16px; background:rgba(122,231,199,0.1);
                  border:1px solid rgba(122,231,199,0.25); border-radius:8px; color:var(--cyan); cursor:pointer; flex:1;">
            → Open Settings
          </button>
          <button id="onboarding-modal-close" style="font-size:12px; padding:8px 14px; border:1px solid var(--border);
                  border-radius:8px; color:var(--muted); background:none; cursor:pointer;">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById("onboarding-modal-close")?.addEventListener("click", () => el.remove());
  document.getElementById("onboarding-modal-backdrop")?.addEventListener("click", (e) => { if (e.target.id === "onboarding-modal-backdrop") el.remove(); });
  document.getElementById("onboarding-go-settings-btn")?.addEventListener("click", () => {
    el.remove();
    state.activeView = "settings";
    render();
  });
}

// ── Score Explanation Modal ───────────────────────────────────────────────────
function showScoreModal(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;
  const repoData   = state.ghData[project.githubRepo] || null;
  const compliance = state.contextFiles?.[project.id]?.studioOsCompliance || null;
  const scoring    = scoreProject(project, repoData, state.sbData, state.socialData, compliance);
  const riskMax    = scoring.pillars.risk.max;
  const pillars    = [
    { key: "development", label: "Development",  max: 30,      color: "#69b3ff" },
    { key: "engagement",  label: "Engagement",   max: 25,      color: "#7ae7c7" },
    { key: "momentum",    label: "Momentum",     max: 25,      color: "#ffc874" },
    { key: "risk",        label: "Risk",         max: riskMax, color: "#6ae3b2" },
  ];
  const el = document.createElement("div");
  el.id = "score-modal";
  el.innerHTML = `
    <div style="position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:200;
                display:flex; align-items:center; justify-content:center;" id="score-modal-backdrop">
      <div style="background:var(--panel); border:1px solid var(--border); border-radius:var(--radius);
                  padding:24px; width:min(480px, 92vw); box-shadow:0 24px 80px rgba(0,0,0,0.5);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <div>
            <div style="font-size:14px; font-weight:700; color:var(--text);">${project.name}</div>
            <div style="font-size:11px; color:var(--muted);">Score explanation</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:32px; font-weight:800; color:${scoring.gradeColor}; line-height:1;">${scoring.total}</div>
            <div style="font-size:14px; font-weight:700; color:${scoring.gradeColor};">${scoring.grade}</div>
          </div>
        </div>
        <div style="height:4px; background:rgba(255,255,255,0.07); border-radius:2px; margin-bottom:20px; overflow:hidden;">
          <div style="width:${scoring.total}%; height:100%; background:${scoring.gradeColor}; border-radius:2px;"></div>
        </div>
        ${pillars.map(({ key, label, max, color }) => {
          const p = scoring.pillars[key];
          const pct = Math.round((p.score / max) * 100);
          return `
            <div style="margin-bottom:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <span style="font-size:12px; font-weight:700; color:${color};">${label}</span>
                <span style="font-size:12px; font-weight:700; color:${color};">${p.score}/${max}</span>
              </div>
              <div style="height:5px; background:rgba(255,255,255,0.07); border-radius:3px; overflow:hidden; margin-bottom:5px;">
                <div style="width:${pct}%; height:100%; background:${color}; border-radius:3px;"></div>
              </div>
              <div style="font-size:11px; color:var(--muted); line-height:1.5;">
                ${p.signals.length ? p.signals.join(" · ") : "No signals"}
              </div>
            </div>
          `;
        }).join("")}
        <!-- Grade threshold reference -->
        <div style="margin-top:12px; padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px;">
          <div style="font-size:10px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:7px;">Grade Thresholds</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${[
              { grade: "A+", min: 85, color: "#6ae3b2" },
              { grade: "A",  min: 75, color: "#6ae3b2" },
              { grade: "B+", min: 65, color: "#69b3ff" },
              { grade: "B",  min: 55, color: "#69b3ff" },
              { grade: "C+", min: 45, color: "#ffc874" },
              { grade: "C",  min: 35, color: "#ffc874" },
              { grade: "D",  min: 25, color: "#ff9478" },
              { grade: "F",  min: 0,  color: "#f87171" },
            ].map((g) => `
              <span title="${g.min}–${g.min === 85 ? 100 : g.min + 9}${g.min === 0 ? "–24" : ""}" style="
                font-size:11px; font-weight:700; padding:2px 7px; border-radius:5px;
                color:${g.color}; background:${g.color}18; border:1px solid ${g.color}30;
                ${scoring.grade === g.grade ? "box-shadow:0 0 0 1px " + g.color + "60;" : ""}
              ">${g.grade} ≥${g.min}</span>
            `).join("")}
          </div>
        </div>
        <button id="score-modal-close" style="width:100%; margin-top:10px; font-size:12px; padding:9px;
          background:none; border:1px solid var(--border); border-radius:8px; color:var(--muted); cursor:pointer;">
          Close
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById("score-modal-close")?.addEventListener("click", () => el.remove());
  document.getElementById("score-modal-backdrop")?.addEventListener("click", (e) => { if (e.target.id === "score-modal-backdrop") el.remove(); });
}


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

// ── Navigate helper ───────────────────────────────────────────────────────────
function navigate(view) {
  state.activeView = view;
  _kbFocusIndex = -1;
  try { history.pushState({ view }, "", "#" + encodeURIComponent(view)); } catch {}
  render();
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
    downloadJSON, downloadCSV,
    generateWeeklyDigest, generateStandup,
    loadScoreHistory, scorePrevFromHistory,
    applyAccent, applyTheme, getHubRuntimeConfig,
    loadTickets, submitProjectTicket,
    commitVelocity, daysSince,
  };
}

function bindEvents() {
  // ── Navigation ──────────────────────────────────────────────────────────────
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const view = el.getAttribute("data-view");
      if (view && view !== state.activeView) {
        state.activeView = view;
        _kbFocusIndex = -1;
        try { history.pushState({ view }, "", "#" + encodeURIComponent(view)); } catch {}
        if (view.startsWith("project:")) {
          logActivity("project_open", view.slice("project:".length));
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
    });
  });

  // ── Core controls ───────────────────────────────────────────────────────────
  document.getElementById("sidebar-toggle-btn")?.addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    saveUiState({ ...loadUiState(), sidebarCollapsed: state.sidebarCollapsed });
    render();
  });
  document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    saveUiState({ ...loadUiState(), theme: state.theme });
    applyTheme(state.theme);
    render();
  });
  document.getElementById("mobile-nav-btn")?.addEventListener("click", () => {
    state.mobileNavOpen = !state.mobileNavOpen;
    render();
  });
  document.getElementById("mobile-overlay")?.addEventListener("click", () => {
    state.mobileNavOpen = false;
    render();
  });
  document.querySelectorAll("[data-project-tab]").forEach((el) => {
    el.addEventListener("click", () => {
      const tab = el.getAttribute("data-project-tab");
      if (tab && tab !== state.projectTab) { state.projectTab = tab; render(); }
    });
  });
  document.querySelectorAll("[data-admin-tab]").forEach((el) => {
    el.addEventListener("click", () => {
      const tab = el.getAttribute("data-admin-tab");
      if (tab && tab !== state.adminTab) { state.adminTab = tab; render(); }
    });
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

  // ── Timeline / floor / changelog filters ────────────────────────────────────
  document.querySelectorAll("[data-timeline-type]").forEach((btn) => {
    btn.addEventListener("click", () => { state.timelineTypeFilter = btn.dataset.timelineType; render(); });
  });
  document.getElementById("timeline-project-filter")?.addEventListener("change", (e) => {
    state.timelineProjectFilter = e.target.value; render();
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
  document.getElementById("onboarding-modal-btn")?.addEventListener("click", showOnboardingModal);
  document.querySelectorAll("[data-score-explain]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); showScoreModal(btn.dataset.scoreExplain); });
  });

  // ── Delegate to view-specific modules ──────────────────────────────────────
  const ctx = buildEventCtx();
  bindSettingsEvents(ctx);
  bindProjectHubEvents(ctx);
  bindHeatmapEvents(ctx);
  bindCompareEvents(ctx);
  bindTicketingEvents(ctx);
}

// ── Data sync ─────────────────────────────────────────────────────────────────
let refreshTimer = null;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("sync_timeout")), ms)),
  ]);
}

async function syncAll() {
  // Rate limit pre-flight: hard stop at < 10%; throttle auto-refresh at < 500 remaining
  if (state.rateLimitInfo && state.rateLimitInfo.remaining != null && state.rateLimitInfo.limit != null) {
    const rem = state.rateLimitInfo.remaining;
    const pct = (rem / state.rateLimitInfo.limit) * 100;
    if (pct < 10) {
      state.syncError = `GitHub rate limit low: ${rem.toLocaleString()}/${state.rateLimitInfo.limit.toLocaleString()} remaining. Sync skipped to preserve quota.`;
      state.syncStatus = "degraded";
      render();
      return;
    }
    state.rateLimitLow = rem < 500; // flag for UI badge + throttled refresh
  }

  state.syncStatus = "syncing";
  state.syncError  = null;
  render();

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
    render();
    return;
  }

  // Detect partial failure: token configured but all repos returned null
  const hasToken = !!config.githubToken;
  const anyRepoLoaded = Object.values(ghRepos || {}).some((v) => v !== null);
  if (hasToken && repoPaths.length > 0 && !anyRepoLoaded && !sourceErrors.github) {
    state.syncError = "GitHub data failed to load — token may be invalid or rate limited.";
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
    let snoozed = {};
    try { snoozed = JSON.parse(localStorage.getItem("vshub_alert_snooze") || "{}"); } catch {}
    const now = Date.now();
    state.alertCount = alertsForHistory.filter((a) => !snoozed[a.msg] || snoozed[a.msg] < now).length;
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
// Restore view from URL hash on load
const hashView = decodeURIComponent(window.location.hash.slice(1));
if (hashView) state.activeView = hashView;

if (!isUnlocked()) {
  render();
  mountGate();
} else {
  render();
  syncAll();
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
