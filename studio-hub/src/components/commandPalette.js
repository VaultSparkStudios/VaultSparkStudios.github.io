// Command Palette — triggered by the "/" key anywhere in the hub.
// Mounted as a separate DOM overlay so it survives render cycles.
// Provides project search + hub commands with full keyboard navigation.

import { PROJECTS } from "../data/studioRegistry.js";

const PALETTE_ID = "vs-cmd-palette";

const COMMANDS = [
  { id: "view:studio-hub",     label: "Go to Studio Hub",       icon: "⌂", group: "Views",   desc: "Portfolio overview & scores" },
  { id: "view:virtual-office", label: "Go to Studio Floor",     icon: "⊞", group: "Views",   desc: "All projects in a grid layout" },
  { id: "view:ambient",        label: "Ambient Mode",            icon: "◉", group: "Views",   desc: "Minimal live score display" },
  { id: "view:heatmap",        label: "Go to Heatmap",          icon: "▦", group: "Views",   desc: "Cross-project metrics table" },
  { id: "view:timeline",       label: "Go to Timeline",         icon: "◈", group: "Views",   desc: "Recent activity across all projects" },
  { id: "view:compare",        label: "Go to Compare",          icon: "⇌", group: "Views",   desc: "Side-by-side project comparison" },
  { id: "view:social",         label: "Go to Social Accounts",  icon: "⊕", group: "Views",   desc: "YouTube, Reddit, Bluesky, Gumroad" },
  { id: "view:vault-admin",    label: "Go to Vault Admin",      icon: "⊗", group: "Views",   desc: "Admin controls & data management" },
  { id: "view:settings",       label: "Go to Settings",         icon: "⚙", group: "Views",   desc: "Scoring weights & thresholds" },
  { id: "action:refresh",      label: "Refresh all data",       icon: "↺", group: "Actions", desc: "Re-fetch GitHub, Supabase & social data" },
  { id: "action:focus",        label: "Toggle Focus Mode",      icon: "⚡", group: "Actions", desc: "Hide lower-scoring projects" },
  { id: "action:snapshot",     label: "Snapshot scores now",    icon: "◎", group: "Actions", desc: "Save current scores to history" },
  { id: "action:clear-cache",  label: "Clear all cache",        icon: "✕", group: "Actions", desc: "Remove all cached hub data" },
  { id: "action:digest",       label: "Generate weekly digest", icon: "✎", group: "Actions", desc: "Weekly summary of activity & scores" },
  { id: "action:standup",      label: "Generate standup",       icon: "≡", group: "Actions", desc: "Plain-text standup for today" },
];

function buildItems(query, recentIds = []) {
  const q = query.trim().toLowerCase();

  const recent = !q && recentIds.length
    ? recentIds
        .map((id) => PROJECTS.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({ id: `view:project:${p.id}`, label: p.name, icon: "◷", group: "Recent", color: p.color }))
    : [];

  const projects = PROJECTS
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.id.includes(q))
    .map((p) => ({ id: `view:project:${p.id}`, label: p.name, icon: "●", group: "Projects", color: p.color }));

  const commands = COMMANDS
    .filter((c) => !q || c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));

  return [...recent, ...projects, ...commands];
}

export function mountCommandPalette(onAction, recentProjectIds = []) {
  if (document.getElementById(PALETTE_ID)) return;

  const overlay = document.createElement("div");
  overlay.id = PALETTE_ID;
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(4,8,16,0.75); backdrop-filter:blur(4px);
    z-index:9999; display:flex; align-items:flex-start; justify-content:center;
    padding-top:15vh;
  `;

  overlay.innerHTML = `
    <div style="
      width:min(540px, 92vw); background:#0c131f;
      border:1px solid rgba(122,231,199,0.25); border-radius:14px;
      box-shadow:0 24px 64px rgba(0,0,0,0.7); overflow:hidden;
    ">
      <div style="padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.07); display:flex; align-items:center; gap:10px;">
        <span style="color:var(--muted); font-size:15px;">⌕</span>
        <input id="vs-cmd-input" type="text" placeholder="Search projects, go to view, run command…"
          autocomplete="off" spellcheck="false"
          style="flex:1; background:none; border:none; outline:none; color:var(--text);
                 font:inherit; font-size:14px; caret-color:var(--cyan);"
        />
        <kbd style="font-size:10px; color:var(--muted); background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:2px 6px;">esc</kbd>
      </div>
      <div id="vs-cmd-results" style="max-height:360px; overflow-y:auto; padding:6px 0;"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input    = document.getElementById("vs-cmd-input");
  const results  = document.getElementById("vs-cmd-results");
  let selected   = 0;
  let items      = [];

  function renderResults(query) {
    items = buildItems(query, recentProjectIds);
    selected = 0;

    if (!items.length) {
      results.innerHTML = `<div style="padding:14px 18px; font-size:13px; color:var(--muted);">No results</div>`;
      return;
    }

    let lastGroup = null;
    results.innerHTML = items.map((item, i) => {
      const groupHeader = item.group !== lastGroup
        ? `<div style="font-size:10px; font-weight:700; color:var(--muted); letter-spacing:0.08em; text-transform:uppercase; padding:8px 18px 4px;">${item.group}</div>`
        : "";
      lastGroup = item.group;
      return `
        ${groupHeader}
        <div class="vs-cmd-item" data-index="${i}" style="
          display:flex; align-items:center; gap:10px;
          padding:9px 18px; cursor:pointer; transition:background 0.1s;
          ${i === 0 ? "background:rgba(122,231,199,0.08);" : ""}
        ">
          <span style="color:${item.color || "var(--muted)"}; font-size:13px; flex-shrink:0;">${item.icon}</span>
          <div>
            <div style="font-size:13px; color:var(--text);">${item.label}</div>
            ${item.desc ? `<div style="font-size:11px; color:var(--muted); margin-top:1px;">${item.desc}</div>` : ""}
          </div>
        </div>
      `;
    }).join("");

    // Bind hover
    results.querySelectorAll(".vs-cmd-item").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        selected = Number(el.dataset.index);
        highlight();
      });
      el.addEventListener("click", () => {
        selected = Number(el.dataset.index);
        execute();
      });
    });
  }

  function highlight() {
    results.querySelectorAll(".vs-cmd-item").forEach((el, i) => {
      el.style.background = i === selected ? "rgba(122,231,199,0.08)" : "";
    });
    const active = results.querySelector(`[data-index="${selected}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }

  function execute() {
    const item = items[selected];
    if (!item) return;
    unmountCommandPalette();
    onAction(item.id);
  }

  function close() { unmountCommandPalette(); }

  input.addEventListener("input", () => renderResults(input.value));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); selected = Math.min(selected + 1, items.length - 1); highlight(); }
    if (e.key === "ArrowUp")   { e.preventDefault(); selected = Math.max(selected - 1, 0); highlight(); }
    if (e.key === "Enter")     { e.preventDefault(); execute(); }
  });

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  renderResults("");
  requestAnimationFrame(() => input.focus());
}

export function unmountCommandPalette() {
  document.getElementById(PALETTE_ID)?.remove();
}

export function isPaletteOpen() {
  return !!document.getElementById(PALETTE_ID);
}
