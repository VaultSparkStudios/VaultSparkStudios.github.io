const LS_KEY = "vshub_credentials";

export function loadStoredCredentials() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCredentials(creds) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(creds));
  } catch {}
}

export function renderSettingsView(state) {
  const stored = loadStoredCredentials();

  return `
    <div class="main-panel">
      <div class="view-header">
        <div class="view-title">Settings</div>
        <div class="view-subtitle">API credentials stored locally in your browser. Never sent to any server.</div>
      </div>

      <div class="panel" style="max-width:600px;">
        <div class="panel-header">
          <span class="panel-title">INTEGRATION CREDENTIALS</span>
        </div>
        <div class="panel-body">
          <form id="settings-form" style="display:flex; flex-direction:column; gap:20px;">

            <div>
              <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:6px; letter-spacing:0.06em; text-transform:uppercase;">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                id="setting-github-token"
                value="${stored.githubToken || ""}"
                placeholder="ghp_..."
                autocomplete="off"
                style="width:100%; background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:8px; color:var(--text); font:inherit; font-size:13px; padding:10px 12px;"
              />
              <div style="font-size:11px; color:var(--muted); margin-top:5px;">
                Read-only PAT from
                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" style="color:var(--blue);">github.com/settings/tokens ↗</a>.
                Required for private repos. Public repos work without it.
              </div>
            </div>

            <div>
              <label style="display:block; font-size:12px; font-weight:700; color:var(--muted); margin-bottom:6px; letter-spacing:0.06em; text-transform:uppercase;">
                YouTube Data API v3 Key
              </label>
              <input
                type="password"
                id="setting-youtube-key"
                value="${stored.youtubeApiKey || ""}"
                placeholder="AIza..."
                autocomplete="off"
                style="width:100%; background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:8px; color:var(--text); font:inherit; font-size:13px; padding:10px 12px;"
              />
              <div style="font-size:11px; color:var(--muted); margin-top:5px;">
                Free quota: 10,000 units/day. Create at
                <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" style="color:var(--blue);">console.cloud.google.com ↗</a>
                → YouTube Data API v3.
              </div>
            </div>

            <div style="background:rgba(122,231,199,0.06); border:1px solid rgba(122,231,199,0.15); border-radius:10px; padding:14px 16px;">
              <div style="font-size:12px; font-weight:700; color:var(--cyan); margin-bottom:6px;">Already configured</div>
              <div style="font-size:12px; color:var(--muted); line-height:1.6;">
                <div>✓ Supabase — anon key baked in (shared studio instance)</div>
                <div>✓ Reddit — no auth required (public API)</div>
                <div>✓ Bluesky — no auth required (AT Protocol)</div>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:12px;">
              <button type="submit" class="btn-primary" id="save-settings-btn">
                Save &amp; Reload Data
              </button>
              <button type="button" class="btn-primary" id="clear-settings-btn"
                style="background:rgba(248,113,113,0.1); border-color:rgba(248,113,113,0.25); color:var(--red);">
                Clear All
              </button>
              <span id="settings-status" style="font-size:12px; color:var(--muted);"></span>
            </div>

          </form>
        </div>
      </div>

      <div class="panel" style="max-width:600px; margin-top:20px;">
        <div class="panel-header"><span class="panel-title">PLATFORM STATUS</span></div>
        <div class="panel-body">
          ${[
            { name: "GitHub (public repos)", status: "live", note: "No token needed" },
            { name: "GitHub (private repos)", status: stored.githubToken ? "live" : "needs-token", note: stored.githubToken ? "Token configured" : "Add token above" },
            { name: "Supabase (member data)", status: "live", note: "Anon key active" },
            { name: "Reddit", status: "live", note: "Public API" },
            { name: "Bluesky", status: "live", note: "AT Protocol" },
            { name: "YouTube", status: stored.youtubeApiKey ? "live" : "needs-token", note: stored.youtubeApiKey ? "Key configured" : "Add key above" },
            { name: "Gumroad", status: "partial", note: "Public products only — add API token for sales data" },
            { name: "X / Instagram / TikTok / Meta", status: "pending", note: "API access pending — profile links shown" },
            { name: "Discord", status: "pending", note: "Bot required — planned for VPS deployment" },
            { name: "Pinterest / Suno / Sora", status: "stub", note: "No public API" },
          ].map((row) => {
            const color = row.status === "live" ? "var(--green)"
              : row.status === "partial" ? "var(--blue)"
              : row.status === "needs-token" ? "var(--gold)"
              : row.status === "pending" ? "var(--gold)"
              : "var(--muted)";
            const dot = row.status === "live" ? "✓"
              : row.status === "partial" ? "~"
              : "○";
            return `
              <div class="data-row">
                <span class="label" style="color:${color}; font-weight:600;">${dot} ${row.name}</span>
                <span style="font-size:11px; color:var(--muted);">${row.note}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}
