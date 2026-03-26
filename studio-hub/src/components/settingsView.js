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

export function renderSettingsView(state) {
  const { ghData = {}, sbData = null, socialData = null, settings: stateSettings = {} } = state;
  const stored = loadStoredCredentials();
  const settings = loadSettings();
  const passwordSet = !!stored.hubPasswordHash;

  let activityLog = [];
  try { activityLog = JSON.parse(localStorage.getItem("vshub_activity") || "[]"); } catch {}

  let presets = [];
  try { presets = JSON.parse(localStorage.getItem("vshub_filter_presets") || "[]"); } catch {}

  const accentOptions = [
    { label: "Cyan (default)", value: "#7ae7c7" },
    { label: "Blue", value: "#69b3ff" },
    { label: "Gold", value: "#ffc874" },
    { label: "Purple", value: "#c084fc" },
    { label: "Ember", value: "#ff9478" },
    { label: "Green", value: "#6ae3b2" },
  ];

  const sortOptions = [
    { label: "Health Score (default)", value: "score" },
    { label: "Name A–Z", value: "name" },
    { label: "Status", value: "status" },
    { label: "Type", value: "type" },
    { label: "Recent Activity", value: "activity" },
  ];

  const refreshOptions = [
    { label: "5 minutes", value: "300000" },
    { label: "10 minutes", value: "600000" },
    { label: "30 minutes", value: "1800000" },
    { label: "1 hour", value: "3600000" },
    { label: "Manual only", value: "0" },
  ];

  const inputStyle = `width:100%; background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:8px; color:var(--text); font:inherit; font-size:13px; padding:10px 12px;`;
  const selectStyle = `${inputStyle} cursor:pointer;`;
  const labelStyle = `display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:6px; letter-spacing:0.06em; text-transform:uppercase;`;
  const hintStyle = `font-size:11px; color:var(--muted); margin-top:5px; line-height:1.5;`;

  return `
    <div class="main-panel">
      <div class="view-header">
        <div class="view-title">Settings</div>
        <div class="view-subtitle">Credentials, customization, and hub configuration.</div>
      </div>

      <div style="display:flex; flex-direction:column; gap:20px; max-width:640px;">

        <!-- API Credentials -->
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
              <div style="${hintStyle}">
                Read-only fine-grained PAT from <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener" style="color:var(--blue);">github.com/settings/tokens ↗</a>.
                Required for private repos. Public repos work without it.
              </div>
            </div>

            <div>
              <label style="${labelStyle}">YouTube Data API v3 Key</label>
              <input type="password" id="setting-youtube-key" value="${stored.youtubeApiKey || ""}" placeholder="AIza..." autocomplete="off" style="${inputStyle}" />
              <div style="${hintStyle}">
                Free 10,000 units/day. Create at <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" style="color:var(--blue);">console.cloud.google.com ↗</a> → YouTube Data API v3.
              </div>
            </div>

            <div>
              <label style="${labelStyle}">Gumroad Access Token</label>
              <input type="password" id="setting-gumroad-token" value="${stored.gumroadToken || ""}" placeholder="Gumroad API token…" autocomplete="off" style="${inputStyle}" />
              <div style="${hintStyle}">
                Optional. Required for full product + sales data. Get from Gumroad Settings → Advanced → Access Tokens.
              </div>
            </div>

            <div>
              <label style="${labelStyle}">Active Session Beacon — GitHub Gist ID</label>
              <input type="text" id="setting-beacon-gist" value="${stored.beaconGistId || ""}" placeholder="e.g. abc123def456…" autocomplete="off" style="${inputStyle}" />
              <div style="${hintStyle}">
                Optional. Create a GitHub Gist with a JSON file, then configure Claude Code hooks to write active session data to it.
                See <code style="font-size:10px; color:var(--cyan);">AGENTS.md → Active Session Beacon</code> for hook setup instructions.
              </div>
            </div>

            <div>
              <label style="${labelStyle}">Supabase Anon Key <span style="font-size:10px; color:var(--muted); font-weight:400;">(optional override)</span></label>
              <input type="password" id="setting-supabase-anon-key" value="${stored.supabaseAnonKey || ""}" placeholder="eyJhbGc…" autocomplete="off" style="${inputStyle}" />
              <div style="${hintStyle}">
                Override the pre-configured studio anon key. Leave blank to use the default. Find in Supabase → Settings → API.
              </div>
            </div>

            <div style="background:rgba(122,231,199,0.06); border:1px solid rgba(122,231,199,0.15); border-radius:10px; padding:14px 16px;">
              <div style="font-size:12px; font-weight:700; color:var(--cyan); margin-bottom:6px;">Pre-configured</div>
              <div style="font-size:12px; color:var(--muted); line-height:1.8;">
                <div>✓ Supabase — shared studio anon key active (override above)</div>
                <div>✓ Reddit — public API, no auth needed</div>
                <div>✓ Bluesky — AT Protocol, no auth needed</div>
              </div>
            </div>

          </div>
        </div>

        <!-- Privacy -->
        <div class="panel">
          <div class="panel-header"><span class="panel-title">PRIVACY & ACCESS</span></div>
          <div class="panel-body" style="display:flex; flex-direction:column; gap:18px;">

            <div>
              <label style="${labelStyle}">Hub Password ${passwordSet ? `<span style="color:var(--green); font-size:10px; margin-left:6px;">● SET</span>` : `<span style="color:var(--muted); font-size:10px; margin-left:6px;">○ NOT SET</span>`}</label>
              <input type="password" id="setting-hub-password" placeholder="${passwordSet ? "Enter new password to change" : "Set a password to lock the hub"}" autocomplete="new-password" style="${inputStyle}" />
              <div style="${hintStyle}">
                Locks the hub behind a password prompt. Stored as a SHA-256 hash in your browser only.
                ${passwordSet ? `<br><button id="clear-password-btn" style="color:var(--red); font-size:11px; font-weight:600; margin-top:4px; cursor:pointer; background:none; border:none; padding:0;">Remove password →</button>` : ""}
              </div>
            </div>

          </div>
        </div>

        <!-- Appearance -->
        <div class="panel">
          <div class="panel-header"><span class="panel-title">APPEARANCE</span></div>
          <div class="panel-body" style="display:flex; flex-direction:column; gap:18px;">

            <div>
              <label style="${labelStyle}">Accent Color</label>
              <select id="setting-accent" style="${selectStyle}">
                ${accentOptions.map((o) => `<option value="${o.value}" ${(settings.accent || "#7ae7c7") === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
              </select>
            </div>

            <div>
              <label style="${labelStyle}">Theme</label>
              <select id="setting-theme" style="${selectStyle}">
                <option value="dark" ${(settings.theme || "dark") === "dark" ? "selected" : ""}>Dark (default)</option>
                <option value="light" ${settings.theme === "light" ? "selected" : ""}>Light</option>
              </select>
            </div>

            <div>
              <label style="${labelStyle}">Show Score Bars on Project Cards</label>
              <select id="setting-show-scores" style="${selectStyle}">
                <option value="true" ${settings.showScores !== false ? "selected" : ""}>Enabled (default)</option>
                <option value="false" ${settings.showScores === false ? "selected" : ""}>Disabled</option>
              </select>
            </div>

          </div>
        </div>

        <!-- Score Weights -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">SCORE WEIGHTS</span>
            <span style="font-size:11px; color:var(--muted);">Adjust pillar importance</span>
          </div>
          <div class="panel-body" style="display:flex; flex-direction:column; gap:16px;">
            <div style="${hintStyle} margin-bottom:4px;">
              Controls how each pillar contributes to the final score. Defaults: Dev=30, Engage=25, Momentum=25, Risk=20 (sums to 100).
            </div>
            ${[
              { id: "setting-weight-dev",      label: "Development",  key: "dev",      def: 30, color: "#69b3ff" },
              { id: "setting-weight-engage",   label: "Engagement",   key: "engage",   def: 25, color: "#7ae7c7" },
              { id: "setting-weight-momentum", label: "Momentum",     key: "momentum", def: 25, color: "#ffc874" },
              { id: "setting-weight-risk",     label: "Risk",         key: "risk",     def: 20, color: "#6ae3b2" },
            ].map(({ id, label, key, def, color }) => {
              const val = settings.weights?.[key] ?? def;
              const wTotal = (settings.weights?.dev ?? 30) + (settings.weights?.engage ?? 25) + (settings.weights?.momentum ?? 25) + (settings.weights?.risk ?? 20);
              const pct = wTotal > 0 ? Math.round((val / wTotal) * 100) : 0;
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
            }).join("")}
            <!-- Weight total indicator -->
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px;
                        background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:7px;">
              <span style="font-size:11px; color:var(--muted);">Total weight sum</span>
              <span id="weight-total-display" style="font-size:12px; font-weight:700; color:var(--cyan);">
                ${(settings.weights?.dev ?? 30) + (settings.weights?.engage ?? 25) + (settings.weights?.momentum ?? 25) + (settings.weights?.risk ?? 20)}
              </span>
            </div>

            <!-- Score weight preview -->
            <div id="weight-preview-panel" style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:7px; padding:10px 12px; margin-top:4px;">
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

            <!-- Weight presets -->
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

        <!-- Notification Preferences -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">NOTIFICATION PREFERENCES</span>
          </div>
          <div class="panel-body">
            <div style="font-size:11px; color:var(--muted); margin-bottom:12px;">
              Choose which alerts trigger browser notifications (requires permission).
            </div>
            ${[
              { key: "notif_ci_fail",    label: "CI failures" },
              { key: "notif_score_drop", label: "Score drops (>10 pts)" },
              { key: "notif_pr_stale",   label: "Stale PRs (3+ days)" },
              { key: "notif_dormant",    label: "Project dormant (60+ days)" },
            ].map(({ key, label }) => `
              <label style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer; font-size:13px; color:var(--text);">
                <input type="checkbox" id="${key}" ${settings[key] !== false ? "checked" : ""}
                  style="width:16px; height:16px; cursor:pointer; accent-color:var(--cyan);" />
                ${label}
              </label>
            `).join("")}
            <button id="save-notif-prefs" style="margin-top:8px; font-size:12px; padding:7px 16px;
              background:rgba(99,179,237,0.1); border:1px solid rgba(99,179,237,0.25); border-radius:8px;
              color:var(--cyan); cursor:pointer;">Save preferences</button>
          </div>
        </div>

        <!-- Data -->
        <div class="panel">
          <div class="panel-header"><span class="panel-title">DATA & REFRESH</span></div>
          <div class="panel-body" style="display:flex; flex-direction:column; gap:18px;">

            <div>
              <label style="${labelStyle}">Project Sort Order</label>
              <select id="setting-sort" style="${selectStyle}">
                ${sortOptions.map((o) => `<option value="${o.value}" ${(settings.sort || "score") === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
              </select>
            </div>

            <div>
              <label style="${labelStyle}">Auto-Refresh Interval</label>
              <select id="setting-refresh" style="${selectStyle}">
                ${refreshOptions.map((o) => `<option value="${o.value}" ${String(settings.refreshMs ?? "300000") === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
              </select>
            </div>

          </div>
        </div>

        <!-- Alert Thresholds -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">ALERT THRESHOLDS</span>
            <span style="font-size:11px; color:var(--muted);">Customize when alerts fire</span>
          </div>
          <div class="panel-body" style="display:flex; flex-direction:column; gap:14px;">
            <div style="${hintStyle} margin-bottom:4px;">Adjust when cross-project alerts are triggered. Lower = more sensitive, higher = quieter.</div>
            ${[
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
            }).join("")}
          </div>
        </div>

        <!-- Saved Filter Presets -->
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

        <!-- Save row -->
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn-primary" id="save-settings-btn">Save &amp; Apply</button>
          <button class="btn-primary" id="clear-all-btn" style="background:rgba(248,113,113,0.1); border-color:rgba(248,113,113,0.25); color:var(--red);">Clear All Data</button>
          <span id="settings-status" style="font-size:12px; color:var(--muted);"></span>
        </div>

        <!-- Export -->
        <div class="panel">
          <div class="panel-header"><span class="panel-title">EXPORT</span></div>
          <div class="panel-body" style="display:flex; flex-direction:column; gap:12px;">
            <div style="${hintStyle}">Download a snapshot of current project scores and metadata.</div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn-primary" id="export-json-btn">Download JSON</button>
              <button class="btn-primary" id="export-csv-btn" style="background:rgba(105,179,255,0.1); border-color:rgba(105,179,255,0.25); color:var(--blue);">Download CSV</button>
              <input type="file" id="import-json-file" accept=".json" style="display:none;" />
              <button class="btn-primary" id="import-json-btn" style="background:rgba(122,231,199,0.06); border-color:rgba(122,231,199,0.2); color:var(--muted);" title="Import a previously exported hub-export.json to restore score history and settings">Import JSON</button>
            </div>
            <span id="export-status" style="font-size:11px; color:var(--muted);"></span>
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

        <!-- Security / Access Log -->
        ${(() => {
          let accessLog = [];
          try { accessLog = JSON.parse(localStorage.getItem("vshub_access_log") || "[]"); } catch {}
          if (!accessLog.length) return "";
          const recent = [...accessLog].reverse().slice(0, 20);
          const failCount = accessLog.filter((e) => e.type === "unlock_fail").length;
          return `
            <div class="panel">
              <div class="panel-header">
                <span class="panel-title">ACCESS LOG</span>
                <span style="font-size:11px; color:${failCount > 0 ? "var(--red)" : "var(--muted)"};">
                  ${failCount > 0 ? `${failCount} failed attempt${failCount > 1 ? "s" : ""}` : "No failed attempts"}
                </span>
              </div>
              <div class="panel-body" style="padding:0; max-height:180px; overflow-y:auto;">
                ${recent.map((e) => `
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
          `;
        })()}

        <!-- Platform Status -->
        <div class="panel">
          <div class="panel-header"><span class="panel-title">INTEGRATION STATUS</span></div>
          <div class="panel-body">
            ${[
              { name: "GitHub (public repos)", ok: true, note: "Live" },
              { name: "GitHub (private repos)", ok: !!stored.githubToken, note: stored.githubToken ? "Token configured" : "Add token above" },
              { name: "Supabase", ok: true, note: "Anon key active" },
              { name: "Reddit", ok: true, note: "Public API" },
              { name: "Bluesky", ok: true, note: "AT Protocol" },
              { name: "YouTube", ok: !!stored.youtubeApiKey, note: stored.youtubeApiKey ? "Key configured" : "Add key above" },
              { name: "Gumroad", ok: !!stored.gumroadToken, note: stored.gumroadToken ? "Token configured — full sales data" : "Add token above for sales data" },
              { name: "X / Instagram / TikTok / Meta", ok: false, note: "API access pending" },
              { name: "Discord", ok: false, note: "Bot required — VPS deployment" },
              { name: "Pinterest / Suno / Sora", ok: false, note: "No public API" },
            ].map((r) => `
              <div class="data-row">
                <span class="label" style="color:${r.ok === true ? "var(--green)" : r.ok === null ? "var(--blue)" : "var(--muted)"};">
                  ${r.ok === true ? "✓" : r.ok === null ? "~" : "○"} ${r.name}
                </span>
                <span style="font-size:11px; color:${r.ok === false ? "var(--muted)" : "var(--text)"};">${r.note}</span>
              </div>
            `).join("")}
          </div>
        </div>

      </div>
    </div>
  `;
}
