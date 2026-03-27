import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject } from "../utils/projectScoring.js";

const LS_KEY = "vshub_credentials";
const SETTINGS_KEY = "vshub_settings";

export function loadStoredCredentials() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveCredentials(creds) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(creds));
  } catch {}
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

// ── Theme definitions (for swatches) ─────────────────────────────────────────
const THEMES = [
  { id: "dark",     label: "Dark",     desc: "Navy / Cyan",    bg: "#040810", panel: "#0c131f", text: "#f2f6fb", accent: "#7ae7c7", bars: ["#7ae7c7","#69b3ff","#ffc874"] },
  { id: "midnight", label: "Midnight", desc: "OLED Black",     bg: "#000000", panel: "#0a0a0a", text: "#ffffff", accent: "#a78bfa", bars: ["#a78bfa","#818cf8","#ffffff"] },
  { id: "slate",    label: "Slate",    desc: "Steel Blue",     bg: "#0d1826", panel: "#0e1a2e", text: "#c8d8f0", accent: "#60a5fa", bars: ["#60a5fa","#93c5fd","#c8d8f0"] },
  { id: "dusk",     label: "Dusk",     desc: "Violet Night",   bg: "#0d091a", panel: "#160f28", text: "#e8deff", accent: "#c084fc", bars: ["#c084fc","#a78bfa","#e8deff"] },
  { id: "steel",    label: "Steel",    desc: "Charcoal",       bg: "#0f1319", panel: "#101622", text: "#c8d0e0", accent: "#94a3b8", bars: ["#94a3b8","#7dd3fc","#c8d0e0"] },
  { id: "ember",    label: "Ember",    desc: "Warm Amber",     bg: "#120a06", panel: "#180e08", text: "#f5e0d0", accent: "#fb923c", bars: ["#fb923c","#fbbf24","#f5e0d0"] },
  { id: "terminal", label: "Terminal", desc: "CRT Green",      bg: "#0a0f0a", panel: "#000c00", text: "#00e040", accent: "#00ff46", bars: ["#00ff46","#00ccff","#ccff00"] },
  { id: "light",    label: "Light",    desc: "Clean White",    bg: "#f0f4fb", panel: "#ffffff", text: "#0f1a2e", accent: "#7ae7c7", bars: ["#7ae7c7","#69b3ff","#0f1a2e"] },
];

const ACCENT_COLORS = [
  { label: "Cyan",    value: "#7ae7c7" },
  { label: "Blue",    value: "#69b3ff" },
  { label: "Purple",  value: "#c084fc" },
  { label: "Ember",   value: "#ff9478" },
  { label: "Gold",    value: "#ffc874" },
  { label: "Green",   value: "#6ae3b2" },
  { label: "Rose",    value: "#fb7185" },
  { label: "Sky",     value: "#38bdf8" },
  { label: "Lime",    value: "#a3e635" },
  { label: "Silver",  value: "#dce7ff" },
];

export function renderSettingsView(state) {
  const { ghData = {}, sbData = null, socialData = null, settings: stateSettings = {} } = state;
  const stored  = loadStoredCredentials();
  const settings = loadSettings();
  const passwordSet = !!stored.hubPasswordHash;

  let activityLog = [];
  try { activityLog = JSON.parse(localStorage.getItem("vshub_activity") || "[]"); } catch {}
  let presets = [];
  try { presets = JSON.parse(localStorage.getItem("vshub_filter_presets") || "[]"); } catch {}

  const currentTheme   = settings.theme   || "dark";
  const currentAccent  = settings.accent  || "#7ae7c7";
  const currentDensity = settings.density || "comfortable";
  const currentSort    = settings.sort    || "score";

  const inputStyle  = `width:100%; background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:8px; color:var(--text); font:inherit; font-size:13px; padding:10px 12px;`;
  const selectStyle = `${inputStyle} cursor:pointer;`;
  const labelStyle  = `display:block; font-size:11px; font-weight:700; color:var(--muted); margin-bottom:6px; letter-spacing:0.07em; text-transform:uppercase;`;
  const hintStyle   = `font-size:11px; color:var(--muted); margin-top:5px; line-height:1.5;`;
  const sectionLabel = `font-size:11px; font-weight:700; color:var(--muted); letter-spacing:0.08em; text-transform:uppercase; margin-bottom:10px;`;

  function toggle(id, label, desc, checked) {
    return `
      <div class="feature-toggle-row">
        <div class="feature-toggle-info">
          <div class="feature-toggle-label">${label}</div>
          ${desc ? `<div class="feature-toggle-desc">${desc}</div>` : ""}
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="${id}" ${checked ? "checked" : ""} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  }

  // ── Weight sliders ────────────────────────────────────────────────────────
  const weightSliders = [
    { id: "setting-weight-dev",      label: "Development",  key: "dev",      def: 30, color: "#69b3ff" },
    { id: "setting-weight-engage",   label: "Engagement",   key: "engage",   def: 25, color: "#7ae7c7" },
    { id: "setting-weight-momentum", label: "Momentum",     key: "momentum", def: 25, color: "#ffc874" },
    { id: "setting-weight-risk",     label: "Risk",         key: "risk",     def: 20, color: "#6ae3b2" },
  ].map(({ id, label, key, def, color }) => {
    const val  = settings.weights?.[key] ?? def;
    const wTotal = (settings.weights?.dev ?? 30) + (settings.weights?.engage ?? 25) + (settings.weights?.momentum ?? 25) + (settings.weights?.risk ?? 20);
    const pct  = wTotal > 0 ? Math.round((val / wTotal) * 100) : 0;
    return `
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <label style="${labelStyle} margin-bottom:0;">${label}</label>
          <span style="display:flex; align-items:center; gap:6px;">
            <span id="${id}-pct" style="font-size:10px; color:var(--muted); opacity:0.7;">${pct}%</span>
            <span id="${id}-display" style="font-size:12px; font-weight:700; color:${color};">${val}</span>
          </span>
        </div>
        <input type="range" id="${id}" min="0" max="50" value="${val}"
          style="width:100%; accent-color:${color};"
          oninput="document.getElementById('${id}-display').textContent=this.value; var t=+document.getElementById('setting-weight-dev').value + +document.getElementById('setting-weight-engage').value + +document.getElementById('setting-weight-momentum').value + +document.getElementById('setting-weight-risk').value; var el=document.getElementById('weight-total-display'); if(el){el.textContent=t; el.style.color=t===100?'var(--green)':t>0?'var(--cyan)':'var(--red)';} ['dev','engage','momentum','risk'].forEach(function(k){var v=+document.getElementById('setting-weight-'+k).value; var pe=document.getElementById('setting-weight-'+k+'-pct'); if(pe&&t>0)pe.textContent=Math.round(v/t*100)+'%';});" />
      </div>
    `;
  }).join("");

  // ── Alert threshold sliders ───────────────────────────────────────────────
  const thresholdSliders = [
    { id: "setting-thresh-issues",     label: "Open issues threshold",       key: "issues",      def: 20,  min: 1,   max: 100, hint: "Alert when open issues exceed this count." },
    { id: "setting-thresh-stale-warn", label: "Stale repo warning (days)",   key: "staleWarn",   def: 14,  min: 1,   max: 90,  hint: "Warn after this many days without commits." },
    { id: "setting-thresh-stale-err",  label: "Stale repo error (days)",     key: "staleErr",    def: 30,  min: 7,   max: 180, hint: "Error after this many days without commits." },
    { id: "setting-thresh-score-crit", label: "Critical score threshold",    key: "scoreCrit",   def: 24,  min: 0,   max: 50,  hint: "Score at or below this fires a Critical alert." },
    { id: "setting-thresh-score-warn", label: "Warning score threshold",     key: "scoreWarn",   def: 35,  min: 0,   max: 60,  hint: "Score at or below this fires a Warning alert." },
    { id: "setting-thresh-pr-age",     label: "PR age alert (days)",          key: "prAge",       def: 3,   min: 1,   max: 30,  hint: "Alert on non-draft PRs open longer than this." },
  ].map(({ id, label, key, def, min, max, hint }) => {
    const val = settings.alertThresholds?.[key] ?? def;
    return `
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <label style="${labelStyle} margin-bottom:0;">${label}</label>
          <span id="${id}-display" style="font-size:12px; font-weight:700; color:var(--cyan);">${val}</span>
        </div>
        <input type="range" id="${id}" min="${min}" max="${max}" value="${val}"
          style="width:100%; accent-color:var(--cyan);"
          oninput="document.getElementById('${id}-display').textContent=this.value" />
        <div style="${hintStyle}">${hint}</div>
      </div>
    `;
  }).join("");

  // ── Access log ────────────────────────────────────────────────────────────
  let accessLog = [];
  try { accessLog = JSON.parse(localStorage.getItem("vshub_access_log") || "[]"); } catch {}
  const failCount = accessLog.filter((e) => e.type === "unlock_fail").length;

  return `
    <div class="main-panel">
      <div class="view-header">
        <div class="view-title">Settings</div>
        <div class="view-subtitle">Visual modes, features, credentials, and hub configuration.</div>
      </div>

      <div style="max-width:740px;">

        <!-- TABS -->
        <div class="settings-tabs">
          <button class="settings-tab active" data-settings-tab="appearance">Appearance</button>
          <button class="settings-tab" data-settings-tab="features">Features</button>
          <button class="settings-tab" data-settings-tab="projects">Projects</button>
          <button class="settings-tab" data-settings-tab="scoring">Scoring</button>
          <button class="settings-tab" data-settings-tab="alerts">Alerts</button>
          <button class="settings-tab" data-settings-tab="data">Data & Sync</button>
          <button class="settings-tab" data-settings-tab="credentials">Credentials</button>
          <button class="settings-tab" data-settings-tab="security">Security</button>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- APPEARANCE TAB                                          -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div class="settings-section active" id="settings-section-appearance">

          <!-- Visual Mode -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">VISUAL MODE</span>
              <span style="font-size:11px; color:var(--muted);">Changes apply instantly</span>
            </div>
            <div class="panel-body">
              <div class="theme-grid">
                ${THEMES.map((t) => `
                  <div class="theme-swatch ${currentTheme === t.id ? "active-theme" : ""}" data-theme-select="${t.id}" title="${t.label} — ${t.desc}">
                    <div class="theme-swatch-preview" style="background:${t.bg};">
                      <div class="theme-swatch-bars">
                        ${t.bars.map((c) => `<div class="theme-swatch-bar" style="background:${c};"></div>`).join("")}
                      </div>
                      <div class="theme-swatch-dot-row">
                        <div class="theme-swatch-dot" style="background:${t.accent};"></div>
                        <div class="theme-swatch-line" style="background:${t.text};"></div>
                      </div>
                    </div>
                    <div class="theme-swatch-foot" style="background:${t.panel}; color:${t.text};">
                      ${t.label}
                      <div class="theme-swatch-desc">${t.desc}</div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <!-- Accent Color -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">ACCENT COLOR</span>
              <span style="font-size:11px; color:var(--muted);">Applied to active elements and highlights</span>
            </div>
            <div class="panel-body">
              <div class="accent-grid">
                ${ACCENT_COLORS.map((a) => `
                  <div class="accent-swatch ${currentAccent === a.value ? "active-accent" : ""}"
                    data-accent-select="${a.value}"
                    style="background:${a.value};"
                    title="${a.label}">
                  </div>
                `).join("")}
                <div style="margin-left:8px; display:flex; align-items:center; gap:6px;">
                  <input type="color" id="accent-custom-picker" value="${currentAccent}"
                    style="width:28px; height:28px; border:none; background:none; cursor:pointer; padding:0; border-radius:50%;"
                    title="Custom color" />
                  <span style="font-size:10px; color:var(--muted);">Custom</span>
                </div>
              </div>
            </div>
          </div>

          <!-- UI Density -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">UI DENSITY</span>
              <span style="font-size:11px; color:var(--muted);">Adjusts spacing and padding throughout</span>
            </div>
            <div class="panel-body">
              <div class="density-grid">
                ${[
                  { id: "compact",     label: "⊟ Compact",     desc: "Dense layout, minimal spacing" },
                  { id: "comfortable", label: "⊞ Comfortable",  desc: "Balanced — default" },
                  { id: "spacious",    label: "⊟ Spacious",     desc: "Generous padding, relaxed" },
                ].map(({ id, label, desc }) => `
                  <button class="density-btn ${currentDensity === id ? "active-density" : ""}"
                    data-density-select="${id}" title="${desc}">${label}
                    <div style="font-size:9px; opacity:0.6; margin-top:3px; font-weight:400;">${desc}</div>
                  </button>
                `).join("")}
              </div>
            </div>
          </div>

          <!-- Save -->
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-primary" id="save-settings-btn">Save &amp; Apply</button>
            <span id="settings-status" style="font-size:12px; color:var(--muted);"></span>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- FEATURES TAB                                            -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div class="settings-section" id="settings-section-features">

          <!-- Dashboard Panels -->
          <div class="panel">
            <div class="panel-header"><span class="panel-title">DASHBOARD PANELS</span></div>
            <div class="panel-body" style="padding-top:8px; padding-bottom:8px;">
              ${toggle("feat-morning-brief",  "Morning Brief",        "Priority flags, CI alerts, and portfolio trends panel", settings.showMorningBrief !== false)}
              ${toggle("feat-vitals-strip",   "Vitals Strip",         "KPI tiles: workflows, avg score, agent requests, SIL", settings.showVitalsStrip !== false)}
              ${toggle("feat-score-ledger",   "Score Ledger",         "Live score trends with 24h delta indicators", settings.showScoreLedger !== false)}
              ${toggle("feat-leaderboard",    "Leaderboard",          "Top 5 projects by health score with streaks", settings.showLeaderboard !== false)}
              ${toggle("feat-social-summary", "Social Summary",       "Platform reach summary row in studio hub", settings.showSocialSummary !== false)}
              ${toggle("feat-agent-panel",    "Agent Activity",       "Agent requests queue and recent runs widget", settings.showAgentPanel !== false)}
              ${toggle("feat-sprint-panel",   "Sprint Panel",         "Active sprint progress and completion banners", settings.showSprintPanel !== false)}
            </div>
          </div>

          <!-- Project Cards -->
          <div class="panel">
            <div class="panel-header"><span class="panel-title">PROJECT CARDS</span></div>
            <div class="panel-body" style="padding-top:8px; padding-bottom:8px;">
              ${toggle("feat-show-scores",    "Score Bars",           "Health score pillar bars on each project card", settings.showScores !== false)}
              ${toggle("feat-show-forecast",  "Forecast Direction",   "Score trajectory arrow (↑ improving / ↓ declining)", settings.showForecast !== false)}
              ${toggle("feat-show-delta",     "Score Delta Badge",    "Session-start score change badge (e.g. +3)", settings.showScoreDelta !== false)}
              ${toggle("feat-show-ci",        "CI Status Badge",      "Passing / failing CI badge on cards", settings.showCiBadge !== false)}
              ${toggle("feat-compact-default","Default Compact Mode", "Start in compact card view on load", settings.defaultCompactCards === true)}
            </div>
          </div>

          <!-- Navigation -->
          <div class="panel">
            <div class="panel-header"><span class="panel-title">SIDEBAR NAVIGATION</span></div>
            <div class="panel-body" style="padding-top:8px; padding-bottom:8px;">
              ${toggle("feat-nav-score-badge", "Health Score Badges",  "Show score number next to each project in sidebar", settings.navScoreBadge !== false)}
              ${toggle("feat-nav-sort-score",  "Sort Projects by Score","Sort projects by health score within each group", settings.navSortByScore !== false)}
            </div>
          </div>

          <!-- Behavior -->
          <div class="panel">
            <div class="panel-header"><span class="panel-title">BEHAVIOR</span></div>
            <div class="panel-body" style="padding-top:8px; padding-bottom:8px;">
              ${toggle("feat-reduce-motion",  "Reduce Animations",    "Minimize transitions and motion effects", settings.reduceMotion === true)}
              ${toggle("feat-auto-dark",      "Auto Dark Mode",        "Follow system dark/light preference on load", settings.autoDark !== false)}
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-primary" id="save-features-btn">Save Features</button>
            <span id="features-status" style="font-size:12px; color:var(--muted);"></span>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- PROJECTS TAB                                            -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div class="settings-section" id="settings-section-projects">

          <div class="panel">
            <div class="panel-header"><span class="panel-title">PROJECT DISPLAY</span></div>
            <div class="panel-body" style="display:flex; flex-direction:column; gap:18px;">

              <div>
                <label style="${labelStyle}">Default Sort Order</label>
                <select id="setting-sort" style="${selectStyle}">
                  ${[
                    { label: "Health Score (highest first)", value: "score" },
                    { label: "Name A–Z",                     value: "name" },
                    { label: "Status",                       value: "status" },
                    { label: "Type",                         value: "type" },
                    { label: "Recent Activity",              value: "activity" },
                  ].map((o) => `<option value="${o.value}" ${currentSort === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
                </select>
              </div>

              <div>
                <label style="${labelStyle}">Default Project Tab</label>
                <select id="setting-default-tab" style="${selectStyle}">
                  ${[
                    { label: "All Projects",  value: "all" },
                    { label: "Games",         value: "games" },
                    { label: "Tools",         value: "tools" },
                    { label: "Platforms",     value: "platforms" },
                    { label: "Infrastructure",value: "infrastructure" },
                  ].map((o) => `<option value="${o.value}" ${(settings.defaultTab || "games") === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
                </select>
              </div>

            </div>
          </div>

          <!-- Saved Views -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">SAVED VIEWS</span>
              <button id="save-preset-btn" class="open-hub-btn" style="font-size:11px;">+ Save current view</button>
            </div>
            <div class="panel-body">
              ${presets.length === 0
                ? `<div class="empty-state">No saved views yet. Navigate to the project grid, set a filter, then save it here.</div>`
                : presets.map((p, i) => `
                  <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="font-size:13px; color:var(--text); flex:1; font-weight:600;">${p.name}</span>
                    ${p.filter ? `<span style="font-size:11px; color:var(--muted);">filter: "${p.filter}"</span>` : ""}
                    ${p.focusMode ? `<span style="font-size:11px; color:var(--gold);">focus</span>` : ""}
                    <button data-apply-preset='${JSON.stringify(p)}' class="open-hub-btn" style="font-size:11px;">Apply</button>
                    <button data-delete-preset="${i}" style="font-size:11px; color:var(--red); background:none; border:none; cursor:pointer; padding:4px 6px;">✕</button>
                  </div>
                `).join("")
              }
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-primary" id="save-projects-btn">Save Project Settings</button>
            <span id="projects-status" style="font-size:12px; color:var(--muted);"></span>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- SCORING TAB                                             -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div class="settings-section" id="settings-section-scoring">

          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">PILLAR WEIGHTS</span>
              <span style="font-size:11px; color:var(--muted);">Drag to adjust importance</span>
            </div>
            <div class="panel-body" style="display:flex; flex-direction:column; gap:16px;">
              <div style="${hintStyle}">
                Controls how each pillar contributes to the final 0–100 score. Defaults: Dev=30, Engage=25, Momentum=25, Risk=20.
              </div>
              ${weightSliders}
              <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px;
                          background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:7px;">
                <span style="font-size:11px; color:var(--muted);">Total weight sum</span>
                <span id="weight-total-display" style="font-size:12px; font-weight:700; color:var(--cyan);">
                  ${(settings.weights?.dev ?? 30) + (settings.weights?.engage ?? 25) + (settings.weights?.momentum ?? 25) + (settings.weights?.risk ?? 20)}
                </span>
              </div>
              <!-- Live preview -->
              <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:7px; padding:10px 12px;">
                <div style="font-size:10px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;">Live score preview</div>
                <div id="weight-preview-scores" style="display:flex; flex-direction:column; gap:4px;">
                  ${PROJECTS.map((p) => {
                    try {
                      const rd = ghData[p.githubRepo] || null;
                      const sc = scoreProject(p, rd, sbData, socialData);
                      return `<div class="weight-preview-row" data-project-id="${p.id}" style="display:flex; justify-content:space-between; font-size:11px; color:var(--muted);">
                        <span>${p.name}</span>
                        <span id="preview-score-${p.id}" style="font-weight:700; color:${sc.gradeColor};">${sc.total}</span>
                      </div>`;
                    } catch { return ""; }
                  }).join("")}
                </div>
                <div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border); display:flex; justify-content:space-between; font-size:11px;">
                  <span style="color:var(--muted);">Portfolio avg</span>
                  <span id="preview-avg-score" style="font-weight:700; color:var(--cyan);">—</span>
                </div>
              </div>
              <!-- Presets -->
              <div>
                <div style="font-size:11px; color:var(--muted); margin-bottom:6px;">Quick presets</div>
                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                  ${[
                    { label: "Balanced",    values: [30, 25, 25, 20] },
                    { label: "Dev-heavy",   values: [50, 20, 20, 10] },
                    { label: "Engagement",  values: [20, 40, 25, 15] },
                    { label: "Momentum",    values: [20, 20, 45, 15] },
                    { label: "Risk-aware",  values: [25, 20, 20, 35] },
                  ].map(({ label, values }) => {
                    const encoded = JSON.stringify(values);
                    return `<button data-weight-preset="${encoded}"
                      style="font-size:11px; padding:4px 10px; border:1px solid var(--border); border-radius:6px;
                             background:none; color:var(--muted); cursor:pointer; transition:all 0.1s;"
                      onmouseover="this.style.borderColor='var(--cyan)';this.style.color='var(--cyan)'"
                      onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'"
                      title="Dev:${values[0]} Engage:${values[1]} Momentum:${values[2]} Risk:${values[3]}"
                    >${label}</button>`;
                  }).join("")}
                </div>
              </div>
              <button id="reset-weights-btn"
                style="font-size:11px; padding:6px 12px; border:1px solid var(--border); border-radius:7px;
                       color:var(--muted); background:none; cursor:pointer; align-self:flex-start;">
                Reset to defaults
              </button>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-primary" id="save-settings-btn-scoring">Save Weights</button>
            <span id="scoring-status" style="font-size:12px; color:var(--muted);"></span>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ALERTS TAB                                              -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div class="settings-section" id="settings-section-alerts">

          <div class="panel">
            <div class="panel-header"><span class="panel-title">NOTIFICATION PREFERENCES</span></div>
            <div class="panel-body">
              <div style="font-size:11px; color:var(--muted); margin-bottom:12px;">
                Choose which alerts trigger browser notifications (requires permission).
              </div>
              ${[
                { key: "notif_ci_fail",    label: "CI failures",              desc: "Any workflow run fails" },
                { key: "notif_score_drop", label: "Score drops (>10 pts)",    desc: "Project health falls sharply" },
                { key: "notif_pr_stale",   label: "Stale PRs (3+ days)",      desc: "Open PRs sitting too long" },
                { key: "notif_dormant",    label: "Project dormant (60+ days)", desc: "No commits for an extended period" },
              ].map(({ key, label, desc }) => `
                <div class="feature-toggle-row">
                  <div class="feature-toggle-info">
                    <div class="feature-toggle-label">${label}</div>
                    <div class="feature-toggle-desc">${desc}</div>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" id="${key}" ${settings[key] !== false ? "checked" : ""} />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              `).join("")}
              <button id="save-notif-prefs" style="margin-top:12px; font-size:12px; padding:7px 16px;
                background:rgba(99,179,237,0.1); border:1px solid rgba(99,179,237,0.25); border-radius:8px;
                color:var(--cyan); cursor:pointer;">Save notification preferences</button>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">ALERT THRESHOLDS</span>
              <span style="font-size:11px; color:var(--muted);">Lower = more sensitive</span>
            </div>
            <div class="panel-body" style="display:flex; flex-direction:column; gap:14px;">
              ${thresholdSliders}
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-primary" id="save-alerts-btn">Save Alert Settings</button>
            <span id="alerts-status" style="font-size:12px; color:var(--muted);"></span>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- DATA & SYNC TAB                                         -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div class="settings-section" id="settings-section-data">

          <div class="panel">
            <div class="panel-header"><span class="panel-title">SYNC SETTINGS</span></div>
            <div class="panel-body" style="display:flex; flex-direction:column; gap:18px;">
              <div>
                <label style="${labelStyle}">Auto-Refresh Interval</label>
                <select id="setting-refresh" style="${selectStyle}">
                  ${[
                    { label: "5 minutes", value: "300000" },
                    { label: "10 minutes", value: "600000" },
                    { label: "30 minutes", value: "1800000" },
                    { label: "1 hour", value: "3600000" },
                    { label: "Manual only", value: "0" },
                  ].map((o) => `<option value="${o.value}" ${String(settings.refreshMs ?? "300000") === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
                </select>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header"><span class="panel-title">EXPORT / IMPORT</span></div>
            <div class="panel-body" style="display:flex; flex-direction:column; gap:16px;">
              <div style="${hintStyle}">Download a snapshot of current project scores and metadata.</div>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn-primary" id="export-json-btn">Download JSON</button>
                <button class="btn-primary" id="export-csv-btn" style="background:rgba(105,179,255,0.1); border-color:rgba(105,179,255,0.25); color:var(--blue);">Download CSV</button>
                <input type="file" id="import-json-file" accept=".json" style="display:none;" />
                <button class="btn-primary" id="import-json-btn" style="background:rgba(122,231,199,0.06); border-color:rgba(122,231,199,0.2); color:var(--muted);">Import JSON</button>
              </div>
              <span id="export-status" style="font-size:11px; color:var(--muted);"></span>
              <div style="border-top:1px solid var(--border); padding-top:14px;">
                <div style="${hintStyle} margin-bottom:10px;">Full hub state backup — all localStorage keys. Use to migrate between devices.</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                  <button class="btn-primary" id="export-hub-state-btn" style="background:rgba(196,132,252,0.1); border-color:rgba(196,132,252,0.25); color:#c484fc;">Export Hub State</button>
                  <input type="file" id="import-hub-state-file" accept=".json" style="display:none;" />
                  <button class="btn-primary" id="import-hub-state-btn" style="background:rgba(196,132,252,0.06); border-color:rgba(196,132,252,0.2); color:var(--muted);">Import Hub State</button>
                </div>
                <span id="hub-state-status" style="font-size:11px; color:var(--muted); margin-top:6px; display:block;"></span>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header"><span class="panel-title">INTEGRATION STATUS</span></div>
            <div class="panel-body">
              ${[
                { name: "GitHub (public repos)",     ok: true,              note: "Live" },
                { name: "GitHub (private repos)",    ok: !!stored.githubToken, note: stored.githubToken ? "Token configured" : "Add token in Credentials tab" },
                { name: "Supabase",                  ok: true,              note: "Anon key active" },
                { name: "Reddit",                    ok: true,              note: "Public API" },
                { name: "Bluesky",                   ok: true,              note: "AT Protocol" },
                { name: "YouTube",                   ok: !!stored.youtubeApiKey, note: stored.youtubeApiKey ? "Key configured" : "Add key in Credentials tab" },
                { name: "Gumroad",                   ok: !!stored.gumroadToken, note: stored.gumroadToken ? "Token configured — full sales data" : "Add token in Credentials tab" },
                { name: "X / Instagram / TikTok",    ok: false,             note: "API access pending" },
                { name: "Discord",                   ok: false,             note: "Bot required — VPS deployment" },
              ].map((r) => `
                <div class="data-row">
                  <span class="label" style="color:${r.ok ? "var(--green)" : "var(--muted)"};">
                    ${r.ok ? "✓" : "○"} ${r.name}
                  </span>
                  <span style="font-size:11px; color:${r.ok ? "var(--text)" : "var(--muted)"};">${r.note}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-primary" id="save-data-btn">Save Sync Settings</button>
            <span id="data-status" style="font-size:12px; color:var(--muted);"></span>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- CREDENTIALS TAB                                         -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div class="settings-section" id="settings-section-credentials">

          <div class="panel">
            <div class="panel-header"><span class="panel-title">API CREDENTIALS</span></div>
            <div class="panel-body" style="display:flex; flex-direction:column; gap:18px;">

              <div>
                <label style="${labelStyle}">GitHub Personal Access Token</label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="password" id="setting-github-token" value="${stored.githubToken || ""}" placeholder="ghp_..." autocomplete="off" style="${inputStyle} flex:1;" />
                  <button id="test-github-token-btn" style="font-size:12px; padding:10px 14px; background:rgba(105,179,255,0.1); border:1px solid rgba(105,179,255,0.25); border-radius:8px; color:var(--blue); cursor:pointer; white-space:nowrap; flex-shrink:0;">Test</button>
                </div>
                <div id="github-token-test-status" style="${hintStyle}"></div>
                <div style="${hintStyle}">Read-only fine-grained PAT. Required for private repos and higher rate limits.</div>
              </div>

              <div>
                <label style="${labelStyle}">YouTube Data API v3 Key</label>
                <input type="password" id="setting-youtube-key" value="${stored.youtubeApiKey || ""}" placeholder="AIza..." autocomplete="off" style="${inputStyle}" />
                <div style="${hintStyle}">Free 10,000 units/day. Required for YouTube channel metrics.</div>
              </div>

              <div>
                <label style="${labelStyle}">Gumroad Access Token</label>
                <input type="password" id="setting-gumroad-token" value="${stored.gumroadToken || ""}" placeholder="Gumroad API token…" autocomplete="off" style="${inputStyle}" />
                <div style="${hintStyle}">Optional. Required for full product + sales data.</div>
              </div>

              <div>
                <label style="${labelStyle}">Active Session Beacon — GitHub Gist ID</label>
                <input type="text" id="setting-beacon-gist" value="${stored.beaconGistId || ""}" placeholder="e.g. abc123def456…" autocomplete="off" style="${inputStyle}" />
                <div style="${hintStyle}">Optional. Configure Claude Code hooks to write active session data to this Gist.</div>
              </div>

              <div>
                <label style="${labelStyle}">Supabase Anon Key <span style="font-size:10px; color:var(--muted); font-weight:400;">(optional override)</span></label>
                <input type="password" id="setting-supabase-anon-key" value="${stored.supabaseAnonKey || ""}" placeholder="eyJhbGc…" autocomplete="off" style="${inputStyle}" />
                <div style="${hintStyle}">Leave blank to use the default pre-configured studio anon key.</div>
              </div>

              <div style="background:rgba(122,231,199,0.06); border:1px solid rgba(122,231,199,0.15); border-radius:10px; padding:14px 16px;">
                <div style="font-size:12px; font-weight:700; color:var(--cyan); margin-bottom:6px;">Pre-configured</div>
                <div style="font-size:12px; color:var(--muted); line-height:1.8;">
                  <div>✓ Supabase — shared studio anon key active</div>
                  <div>✓ Reddit — public API, no auth needed</div>
                  <div>✓ Bluesky — AT Protocol, no auth needed</div>
                </div>
              </div>

            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-primary" id="save-credentials-btn">Save Credentials</button>
            <span id="credentials-status" style="font-size:12px; color:var(--muted);"></span>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- SECURITY TAB                                            -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <div class="settings-section" id="settings-section-security">

          <div class="panel">
            <div class="panel-header"><span class="panel-title">PRIVACY & ACCESS</span></div>
            <div class="panel-body" style="display:flex; flex-direction:column; gap:18px;">
              <div>
                <label style="${labelStyle}">Hub Password ${passwordSet ? `<span style="color:var(--green); font-size:10px; margin-left:6px;">● SET</span>` : `<span style="color:var(--muted); font-size:10px; margin-left:6px;">○ NOT SET</span>`}</label>
                <input type="password" id="setting-hub-password" placeholder="${passwordSet ? "Enter new password to change" : "Set a password to lock the hub"}" autocomplete="new-password" style="${inputStyle}" />
                <div style="${hintStyle}">
                  Stored as SHA-256 hash in your browser only. 5-attempt lockout active.
                  ${passwordSet ? `<br><button id="clear-password-btn" style="color:var(--red); font-size:11px; font-weight:600; margin-top:4px; cursor:pointer; background:none; border:none; padding:0;">Remove password →</button>` : ""}
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:12px;">
                <button class="btn-primary" id="save-security-btn">Save Password</button>
                <span id="security-status" style="font-size:12px; color:var(--muted);"></span>
              </div>
            </div>
          </div>

          <!-- Activity Log -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">ACTIVITY LOG</span>
              <span style="font-size:11px; color:var(--muted);">Last ${activityLog.length} events</span>
            </div>
            <div class="panel-body" style="padding:0; max-height:200px; overflow-y:auto;">
              ${activityLog.length === 0
                ? `<div class="empty-state">No activity yet.</div>`
                : [...activityLog].reverse().map((e) => `
                  <div style="display:flex; align-items:center; gap:12px; padding:8px 18px;
                              border-bottom:1px solid rgba(255,255,255,0.04); font-size:11px;">
                    <span style="color:var(--muted); white-space:nowrap;">${new Date(e.ts).toLocaleTimeString()}</span>
                    <span style="color:var(--cyan);">${e.event}</span>
                    ${e.detail ? `<span style="color:var(--text); flex:1;">${e.detail}</span>` : ""}
                  </div>
                `).join("")
              }
            </div>
            ${activityLog.length > 0 ? `
              <div style="padding:10px 18px;">
                <button id="clear-activity-btn" style="font-size:11px; color:var(--muted); border:1px solid var(--border);
                        border-radius:6px; padding:5px 10px; cursor:pointer; background:none;">Clear log</button>
              </div>
            ` : ""}
          </div>

          <!-- Access Log -->
          ${accessLog.length > 0 ? `
            <div class="panel">
              <div class="panel-header">
                <span class="panel-title">ACCESS LOG</span>
                <span style="font-size:11px; color:${failCount > 0 ? "var(--red)" : "var(--muted)"};">
                  ${failCount > 0 ? `${failCount} failed attempt${failCount > 1 ? "s" : ""}` : "No failed attempts"}
                </span>
              </div>
              <div class="panel-body" style="padding:0; max-height:180px; overflow-y:auto;">
                ${[...accessLog].reverse().slice(0, 20).map((e) => `
                  <div style="display:flex; align-items:center; gap:12px; padding:7px 18px;
                              border-bottom:1px solid rgba(255,255,255,0.04); font-size:11px;">
                    <span style="color:var(--muted); white-space:nowrap;">${new Date(e.ts).toLocaleString()}</span>
                    <span style="color:${e.type === "unlock_fail" ? "var(--red)" : "var(--green)"}; font-weight:700;">
                      ${e.type === "unlock_fail" ? "FAIL" : "OK"}
                    </span>
                    ${e.detail ? `<span style="color:var(--muted);">${e.detail}</span>` : ""}
                  </div>
                `).join("")}
              </div>
              <div style="padding:8px 18px;">
                <button onclick="localStorage.removeItem('vshub_access_log'); this.closest('.panel').remove();"
                  style="font-size:11px; color:var(--muted); border:1px solid var(--border);
                         border-radius:6px; padding:5px 10px; cursor:pointer; background:none;">Clear log</button>
              </div>
            </div>
          ` : ""}

          <!-- Danger Zone -->
          <div class="panel">
            <div class="panel-header"><span class="panel-title" style="color:var(--red);">DANGER ZONE</span></div>
            <div class="panel-body">
              <div style="${hintStyle} margin-bottom:12px;">Destructive actions — cannot be undone.</div>
              <button class="btn-primary" id="clear-all-btn" style="background:rgba(248,113,113,0.1); border-color:rgba(248,113,113,0.25); color:var(--red);">
                Clear All Data &amp; Credentials
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;
}
