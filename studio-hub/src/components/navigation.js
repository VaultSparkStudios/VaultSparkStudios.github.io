import { PROJECTS } from "../data/studioRegistry.js";

export function renderNavigation(state) {
  const { activeView, syncStatus = "idle" } = state;

  const syncDotClass = syncStatus === "syncing" ? "stale" : syncStatus === "error" ? "offline" : "";
  const syncLabel = syncStatus === "syncing" ? "Syncing..." : syncStatus === "error" ? "Offline" : "Live";

  const games = PROJECTS.filter((p) => p.type === "game");
  const tools = PROJECTS.filter((p) => p.type === "tool");
  const infra = PROJECTS.filter((p) => p.type === "infrastructure");

  function navItem(viewId, label, badge = "") {
    const active = activeView === viewId;
    return `
      <div class="nav-item ${active ? "active" : ""}" data-view="${viewId}">
        <span class="nav-dot"></span>
        ${label}
        ${badge ? `<span class="nav-badge">${badge}</span>` : ""}
      </div>
    `;
  }

  function projectNavItem(project) {
    const viewId = `project:${project.id}`;
    const active = activeView === viewId;
    return `
      <div class="nav-item ${active ? "active" : ""}" data-view="${viewId}" style="padding-left:32px; font-size:12px;">
        <span class="nav-dot" style="background:${project.color}; opacity:0.7;"></span>
        ${project.name}
      </div>
    `;
  }

  return `
    <nav class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-name">VaultSpark Studios</div>
        <div class="logo-sub">Studio Hub</div>
      </div>

      <div class="nav-section">
        ${navItem("studio-hub", "Studio Hub")}
        ${navItem("analytics", "Site Analytics")}
        ${navItem("social", "Social Accounts")}
        ${navItem("vault-admin", "Vault Admin")}
        ${navItem("settings", "Settings")}
      </div>

      <div class="nav-section">
        <div class="nav-section-label">Games</div>
        ${games.map(projectNavItem).join("")}
      </div>

      <div class="nav-section">
        <div class="nav-section-label">Tools</div>
        ${tools.map(projectNavItem).join("")}
      </div>

      <div class="nav-section">
        <div class="nav-section-label">Infrastructure</div>
        ${infra.map(projectNavItem).join("")}
      </div>

      <div class="sidebar-bottom">
        <div class="sync-status">
          <span class="sync-dot ${syncDotClass}"></span>
          ${syncLabel}
        </div>
      </div>
    </nav>
  `;
}
