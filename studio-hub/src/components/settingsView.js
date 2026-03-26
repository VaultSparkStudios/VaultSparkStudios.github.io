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
  const stored = loadStoredCredentials();
  const settings = loadSettings();
  const passwordSet = !!stored.hubPasswordHash;

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
              <input type="password" id="setting-github-token" value="${stored.githubToken || ""}" placeholder="ghp_..." autocomplete="off" style="${inputStyle}" />
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
              <label style="${labelStyle}">GA4 OAuth Client ID</label>
              <input type="password" id="setting-ga-client-id" value="${stored.gaClientId || ""}" placeholder="123456789-abc.apps.googleusercontent.com" autocomplete="off" style="${inputStyle}" />
              <div style="${hintStyle}">
                Create at <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" style="color:var(--blue);">console.cloud.google.com ↗</a>
                → APIs &amp; Services → Credentials → OAuth 2.0 Web Client.
                Enable the "Google Analytics Data API". Add your studio-hub URL as an authorised JS origin.
              </div>
            </div>

            <div>
              <label style="${labelStyle}">GA4 Property ID</label>
              <input type="text" id="setting-ga-property-id" value="${stored.gaPropertyId || ""}" placeholder="123456789" autocomplete="off" style="${inputStyle}" />
              <div style="${hintStyle}">
                Found in GA4 → Admin → Property → Property details. Numbers only (e.g. 123456789).
              </div>
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
              <label style="${labelStyle}">Show Score Bars on Project Cards</label>
              <select id="setting-show-scores" style="${selectStyle}">
                <option value="true" ${settings.showScores !== false ? "selected" : ""}>Enabled (default)</option>
                <option value="false" ${settings.showScores === false ? "selected" : ""}>Disabled</option>
              </select>
            </div>

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

        <!-- Save row -->
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn-primary" id="save-settings-btn">Save &amp; Apply</button>
          <button class="btn-primary" id="clear-all-btn" style="background:rgba(248,113,113,0.1); border-color:rgba(248,113,113,0.25); color:var(--red);">Clear All Data</button>
          <span id="settings-status" style="font-size:12px; color:var(--muted);"></span>
        </div>

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
              { name: "Gumroad", ok: null, note: "Public products only" },
              { name: "Google Analytics 4 (GA4)", ok: !!(stored.gaClientId && stored.gaPropertyId), note: (stored.gaClientId && stored.gaPropertyId) ? "Client ID + Property ID configured" : "Add Client ID + Property ID above" },
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
