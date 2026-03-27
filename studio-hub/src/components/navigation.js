import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject, getGrade } from "../utils/projectScoring.js";

export function renderNavigation(state) {
  const {
    activeView, syncStatus = "idle", sidebarCollapsed = false, theme = "dark",
    alertCount = 0, syncMeta = null, settings = {}, ghData = {},
    sbData = null, socialData = null, navProjectSearch = "",
  } = state;
  const refreshMs = settings?.refreshMs ?? 300000;
  const nextSyncMs = syncMeta && refreshMs > 0 ? Math.max(0, (syncMeta.gh + refreshMs) - Date.now()) : null;
  const nextSyncMin = nextSyncMs !== null ? Math.ceil(nextSyncMs / 60000) : null;

  const syncDotClass = syncStatus === "syncing" ? "stale" : (syncStatus === "error" || syncStatus === "degraded") ? "offline" : syncStatus === "idle" ? "stale" : "";
  const syncLabel = syncStatus === "syncing" ? "Syncing..." : syncStatus === "error" ? "Offline" : syncStatus === "degraded" ? "Degraded" : syncStatus === "idle" ? "Ready" : "Live";

  const showScoreBadge = settings.navScoreBadge !== false;
  const search = navProjectSearch.toLowerCase().trim();

  // Pre-compute scores for all projects (uses scoring cache — fast)
  const scoreMap = {};
  if (showScoreBadge) {
    for (const p of PROJECTS) {
      try {
        const rd = ghData[p.githubRepo] || null;
        const sc = scoreProject(p, rd, sbData, socialData);
        scoreMap[p.id] = sc;
      } catch { /* skip */ }
    }
  }

  // Pinned projects
  let pinnedIds = [];
  try { pinnedIds = JSON.parse(localStorage.getItem("vshub_pinned") || "[]"); } catch {}

  const games     = PROJECTS.filter((p) => p.type === "game");
  const tools     = PROJECTS.filter((p) => p.type === "tool");
  const infra     = PROJECTS.filter((p) => p.type === "infrastructure");
  const platforms = PROJECTS.filter((p) => p.type === "platform" || p.type === "app");

  const pinned = pinnedIds.map((id) => PROJECTS.find((p) => p.id === id)).filter(Boolean);

  function scoreBadgeHtml(projectId) {
    if (!showScoreBadge || sidebarCollapsed) return "";
    const sc = scoreMap[projectId];
    if (!sc) return "";
    const g = sc.grade || "";
    const cls = g.startsWith("A") ? "grade-A" : g === "B" || g === "B+" ? "grade-B" : g === "C" || g === "C+" ? "grade-C" : "grade-DF";
    return `<span class="nav-score-badge ${cls}">${sc.total}</span>`;
  }

  function navItem(viewId, label, badge = "") {
    const active = activeView === viewId;
    return `
      <div class="nav-item ${active ? "active" : ""}" data-view="${viewId}" title="${sidebarCollapsed ? label : ""}"
           tabindex="0" role="button" aria-label="${label}${badge ? ` (${badge} alerts)` : ""}">
        <span class="nav-dot"></span>
        <span class="nav-item-label">${label}</span>
        ${badge ? `<span class="nav-badge">${badge}</span>` : ""}
      </div>
    `;
  }

  function projectNavItem(project, isPinned = false) {
    const viewId = `project:${project.id}`;
    const active = activeView === viewId;
    const d = ghData[project.githubRepo];
    const ci = d?.ciRuns?.[0];
    const ciDotColor = !ci ? null
      : ci.conclusion === "success" ? "#6ee7b7"
      : ci.conclusion === "failure" ? "#f87171"
      : ci.status === "in_progress" ? "#ffc874"
      : null;
    const typeIcon = { game: "🎮", tool: "🔧", platform: "🌐", infrastructure: "🏗", app: "🌐" }[project.type] || "";
    const sc = scoreMap[project.id];
    const pinIcon = isPinned && !sidebarCollapsed ? `<span class="nav-pinned-icon">★</span>` : "";
    return `
      <div class="nav-item ${active ? "active" : ""}" data-view="${viewId}"
           data-project-id="${project.id}" data-project-name="${project.name}"
           style="padding-left:${sidebarCollapsed ? "10px" : "32px"}; font-size:12px; justify-content:${sidebarCollapsed ? "center" : ""};"
           title="${sidebarCollapsed ? project.name : ""}"
           tabindex="0" role="button" aria-label="${project.name}${ciDotColor ? ` CI ${ci?.conclusion || ci?.status}` : ""}">
        <span class="nav-dot" style="background:${project.color}; opacity:0.7;"></span>
        <span class="nav-item-label">${typeIcon ? `<span style="font-size:10px; margin-right:3px;">${typeIcon}</span>` : ""}${project.name}</span>
        ${ciDotColor && !sidebarCollapsed ? `<span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:${ciDotColor}; flex-shrink:0; margin-left:4px; box-shadow:0 0 3px ${ciDotColor}60;" title="${ci?.conclusion || ci?.status || ""}"></span>` : ""}
        ${pinIcon}
        ${scoreBadgeHtml(project.id)}
      </div>
    `;
  }

  function projectGroup(label, projects, icon = "") {
    if (projects.length === 0) return "";
    const filtered = search ? projects.filter((p) => p.name.toLowerCase().includes(search)) : projects;
    if (filtered.length === 0) return "";
    // Sort by score descending within group if score badge is visible
    const sorted = showScoreBadge
      ? [...filtered].sort((a, b) => (scoreMap[b.id]?.total ?? 0) - (scoreMap[a.id]?.total ?? 0))
      : filtered;
    return `
      <details class="nav-section nav-project-group" open>
        <summary class="nav-section-label" style="cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between; user-select:none;">
          <span>${icon ? `<span style="font-size:10px; margin-right:5px; opacity:0.7;">${icon}</span>` : ""}${label}</span>
          <span class="nav-collapse-arrow" style="font-size:9px; color:var(--muted); transition:transform 0.15s;">▼</span>
        </summary>
        ${sorted.map((p) => projectNavItem(p)).join("")}
      </details>
    `;
  }

  const recentlyVisited = state.recentlyVisited;

  // Theme toggle label — show name, icon changes based on dark vs light
  const isDarkVariant = theme !== "light";
  const themeIcons = { dark: "◐", light: "☀", midnight: "◉", terminal: "▶", slate: "◈", dusk: "✦", steel: "⬡", ember: "◆" };
  const themeLabels = { dark: "Dark", light: "Light", midnight: "Midnight", terminal: "Terminal", slate: "Slate", dusk: "Dusk", steel: "Steel", ember: "Ember" };

  // Filtered pinned (by search)
  const visiblePinned = search ? pinned.filter((p) => p.name.toLowerCase().includes(search)) : pinned;

  return `
    <nav class="sidebar" aria-label="Sidebar navigation">
      <div class="sidebar-logo" style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:6px;">
          <div>
            <div class="logo-name">VaultSpark</div>
            <div class="logo-sub">Studio Hub</div>
          </div>
          ${alertCount > 0 ? `<span class="sidebar-alert-badge" style="background:var(--red); color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:10px; line-height:1;">${alertCount}</span>` : ""}
        </div>
        <button id="sidebar-toggle-btn" title="${sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}">
          ${sidebarCollapsed ? "→" : "←"}
        </button>
      </div>

      <!-- CORE VIEWS -->
      <div class="nav-section">
        ${navItem("studio-hub",     "Studio Hub", alertCount > 0 ? String(alertCount) : "")}
        ${navItem("virtual-office", "Studio Floor")}
        ${navItem("heatmap",        "Heatmap")}
        ${navItem("timeline",       "Timeline")}
        ${navItem("compare",        "Compare")}
        ${navItem("social",         "Social Accounts")}
        ${navItem("vault-admin",    "Vault Admin")}
        ${navItem("ticketing",      "Ticketing")}
        ${navItem("ambient",        "Ambient Mode")}
      </div>

      <!-- AGENTS -->
      <div class="nav-section">
        ${!sidebarCollapsed ? `<div class="nav-section-label" style="font-size:9px; letter-spacing:0.1em;">AGENTS</div>` : ""}
        ${navItem("agent-commands", "Agent Commands")}
        ${navItem("agents",         "Studio Agents")}
      </div>

      <!-- SETTINGS -->
      <div class="nav-section">
        ${navItem("settings", "Settings")}
      </div>

      <!-- RECENTLY VISITED -->
      ${recentlyVisited?.length > 0 ? `
        <div class="nav-section">
          ${!sidebarCollapsed ? `<div class="nav-section-label" style="font-size:9px; letter-spacing:0.1em;">RECENT</div>` : ""}
          ${recentlyVisited.slice(0, 4).map((id) => {
            const p = PROJECTS.find((p) => p.id === id);
            if (!p) return "";
            const viewId = `project:${p.id}`;
            return `<div class="nav-item ${activeView === viewId ? "active" : ""}" data-view="${viewId}"
              data-project-id="${p.id}" data-project-name="${p.name}"
              style="padding-left:${sidebarCollapsed ? "10px" : "20px"}; font-size:11px;"
              title="${p.name}" tabindex="0" role="button" aria-label="${p.name}">
              <span class="nav-dot" style="background:${p.color}; opacity:0.6;"></span>
              <span class="nav-item-label" style="opacity:0.75;">${p.name}</span>
              ${scoreBadgeHtml(p.id)}
            </div>`;
          }).join("")}
        </div>
      ` : ""}

      <!-- PROJECT SEARCH -->
      ${!sidebarCollapsed ? `
        <div class="nav-search-wrap">
          <span class="nav-search-icon">⌕</span>
          <input type="text" id="nav-project-search" class="nav-search"
            placeholder="Filter projects…" value="${state.navProjectSearch || ""}"
            autocomplete="off" aria-label="Filter projects" />
        </div>
      ` : ""}

      <!-- PINNED PROJECTS -->
      ${visiblePinned.length > 0 ? `
        <details class="nav-section nav-project-group" open>
          <summary class="nav-section-label" style="cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between; user-select:none;">
            <span>${sidebarCollapsed ? "" : `<span style="font-size:10px; margin-right:5px; opacity:0.7;">★</span>`}Pinned</span>
            <span class="nav-collapse-arrow" style="font-size:9px; color:var(--muted);">▼</span>
          </summary>
          ${visiblePinned.map((p) => projectNavItem(p, true)).join("")}
        </details>
      ` : ""}

      <!-- PROJECT GROUPS -->
      ${projectGroup("Games",          games,     "🎮")}
      ${projectGroup("Tools",          tools,     "🔧")}
      ${projectGroup("Platforms",      platforms, "🌐")}
      ${projectGroup("Infrastructure", infra,     "🏗")}

      <!-- BOTTOM STATUS -->
      <div class="sidebar-bottom" style="display:flex; flex-direction:column; gap:10px;">
        <div class="sync-status">
          <span class="sync-dot ${syncDotClass}"></span>
          <span>${syncLabel}${nextSyncMin !== null && syncStatus !== "syncing" && !sidebarCollapsed ? `<span style="font-size:10px; color:var(--muted); margin-left:4px;">(${nextSyncMin}m)</span>` : ""}</span>
        </div>
        <button id="theme-toggle-btn" title="Toggle light/dark — full themes in Settings"
          style="font-size:11px; color:var(--muted); background:none; border:1px solid var(--border);
                 border-radius:6px; padding:5px 8px; cursor:pointer; width:100%; text-align:left;
                 display:flex; align-items:center; gap:6px;">
          <span>${themeIcons[theme] || "◐"}</span>
          <span>${themeLabels[theme] || theme}</span>
        </button>
      </div>
      <div style="position:sticky; bottom:0; left:0; right:0; height:24px; background:linear-gradient(to top, var(--bg), transparent); pointer-events:none; margin-top:-24px;"></div>
    </nav>
  `;
}
