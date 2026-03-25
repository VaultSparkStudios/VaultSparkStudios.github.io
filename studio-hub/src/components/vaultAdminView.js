function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function renderMembersTab(sbData) {
  if (!sbData?.members) {
    return `
      <div class="empty-state" style="padding:40px;">
        No member data — configure the Supabase anon key to load live Vault Member stats.
      </div>
    `;
  }

  const { members, economy } = sbData;

  const tiers = [
    { name: "Spark Initiate", rank: 0 },
    { name: "Vault Runner", rank: 1 },
    { name: "Forge Guard", rank: 2 },
    { name: "Vault Keeper", rank: 3 },
    { name: "The Sparked", rank: 4 },
  ];

  return `
    <div style="display:flex; flex-direction:column; gap:24px;">
      <div>
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Member Overview</div>
        <div class="vitals-strip" style="grid-template-columns:repeat(3,1fr);">
          <div class="vital-card">
            <div class="vital-label">Total Members</div>
            <div class="vital-value cyan">${fmt(members.total)}</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Joined This Week</div>
            <div class="vital-value blue">${fmt(members.newThisWeek)}</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Joined This Month</div>
            <div class="vital-value">${fmt(members.newThisMonth)}</div>
          </div>
        </div>
      </div>

      ${economy ? `
        <div>
          <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Points Economy</div>
          <div class="panel">
            <div class="panel-body">
              <div class="data-row">
                <span class="label">Total Points Awarded</span>
                <span class="value" style="color:var(--gold)">${fmt(economy.total)}</span>
              </div>
              ${Object.entries(economy.byReason || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([reason, pts]) => `
                  <div class="data-row">
                    <span class="label">${reason}</span>
                    <span class="value">${fmt(pts)} pts</span>
                  </div>
                `).join("")}
            </div>
          </div>
        </div>
      ` : ""}

      ${members.recentJoins?.length > 0 ? `
        <div>
          <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Recent Joins</div>
          <div class="panel">
            <div class="panel-body">
              ${members.recentJoins.map((ts) => `
                <div class="data-row">
                  <span class="label">New Member</span>
                  <span class="value">${timeAgo(ts)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

function renderPulseTab(sbData, state) {
  const pulse = sbData?.pulse || [];
  const supabaseConfigured = !!state.supabaseAnonKey;

  return `
    <div style="display:flex; flex-direction:column; gap:24px;">
      <div>
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Compose Studio Pulse</div>
        ${!supabaseConfigured ? `
          <div class="alert-item warning" style="margin-bottom:16px;">
            Supabase anon key not configured — publishing is unavailable.
          </div>
        ` : ""}
        <div class="pulse-composer">
          <textarea id="pulse-text" placeholder="Write a studio update, announcement, or alert..."></textarea>
          <div class="pulse-composer-row">
            <select class="pulse-type-select" id="pulse-type">
              <option value="info">Info</option>
              <option value="announcement">Announcement</option>
              <option value="milestone">Milestone</option>
              <option value="alert">Alert</option>
            </select>
            <button class="btn-primary" id="publish-pulse-btn" ${!supabaseConfigured ? "disabled" : ""}>
              Publish to Vault Members
            </button>
            <span id="pulse-status" style="font-size:12px; color:var(--muted);"></span>
          </div>
        </div>
      </div>

      <div>
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Recent Pulse Entries</div>
        ${pulse.length === 0
          ? `<div class="empty-state">No pulse entries yet.</div>`
          : `
            <div class="panel">
              <div class="panel-body">
                ${pulse.map((p) => `
                  <div class="data-row" style="align-items:flex-start; gap:12px;">
                    <span class="label" style="min-width:80px;">
                      <span style="
                        display:inline-block; padding:2px 7px; border-radius:20px; font-size:10px; font-weight:700;
                        background:${p.type === "alert" ? "rgba(248,113,113,0.15)" : p.type === "milestone" ? "rgba(255,200,116,0.15)" : "rgba(105,179,255,0.15)"};
                        color:${p.type === "alert" ? "var(--red)" : p.type === "milestone" ? "var(--gold)" : "var(--blue)"};
                      ">${p.type || "info"}</span>
                    </span>
                    <span class="value" style="flex:1; text-align:left;">${p.message}</span>
                    <span style="color:var(--muted); font-size:11px; white-space:nowrap;">${timeAgo(p.created_at)}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `
        }
      </div>
    </div>
  `;
}

function renderChallengesTab(sbData) {
  const challenges = sbData?.challenges || [];

  return `
    <div style="display:flex; flex-direction:column; gap:24px;">
      <div>
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Active Challenges</div>
        ${challenges.length === 0
          ? `<div class="empty-state">No active challenges.</div>`
          : `
            <div class="panel">
              <div class="panel-body">
                ${challenges.map((c) => `
                  <div class="data-row" style="align-items:flex-start;">
                    <span style="flex:1;">
                      <div style="font-size:13px; font-weight:600; color:var(--text); margin-bottom:3px;">${c.title}</div>
                      <div style="font-size:11px; color:var(--muted);">${c.description || ""}</div>
                      <div style="font-size:11px; color:var(--muted); margin-top:2px;">${c.challenge_type} · ${c.action_key || ""}</div>
                    </span>
                    <span style="color:var(--gold); font-weight:700; font-size:13px; white-space:nowrap;">${c.points} pts</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `
        }
      </div>
    </div>
  `;
}

function renderInvestorRequestsTab(sbData) {
  const inv = sbData?.investorRequests;

  if (!inv) {
    return `
      <div class="empty-state" style="padding:40px;">
        Investor request data unavailable — configure the Supabase anon key to load counts.
      </div>
    `;
  }

  const pending = inv.pending ?? 0;
  const total = inv.total ?? 0;

  return `
    <div style="display:flex; flex-direction:column; gap:24px;">
      <div>
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Investor Requests Overview</div>
        <div class="vitals-strip" style="grid-template-columns:repeat(2,1fr);">
          <div class="vital-card">
            <div class="vital-label">Pending Review</div>
            <div class="vital-value ${pending > 0 ? "red" : "cyan"}">${fmt(pending)}</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Total Submitted</div>
            <div class="vital-value">${fmt(total)}</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-body">
          ${pending > 0 ? `
            <div class="alert-item warning" style="margin-bottom:12px;">
              ${pending} investor request${pending === 1 ? "" : "s"} awaiting review.
            </div>
          ` : `
            <div class="data-row">
              <span class="label">Status</span>
              <span class="value" style="color:var(--green);">All requests reviewed</span>
            </div>
          `}
          <div class="data-row">
            <span class="label">Review &amp; manage requests</span>
            <span class="value">
              <a href="https://vaultsparkstudios.github.io/vault-member/" target="_blank"
                 style="color:var(--blue); text-decoration:none; font-size:12px;">
                Open Vault Command →
              </a>
            </span>
          </div>
          <div style="font-size:11px; color:var(--muted); margin-top:8px; line-height:1.55;">
            Full investor request details, questionnaire answers, and approve/reject actions are in the Vault Command admin panel under the Investor Requests tab.
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderBetaKeysTab(sbData) {
  const betaKeys = sbData?.betaKeys || {};
  const entries = Object.entries(betaKeys);

  return `
    <div style="display:flex; flex-direction:column; gap:24px;">
      <div>
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Beta Key Inventory</div>
        ${entries.length === 0
          ? `<div class="empty-state">No beta keys configured.</div>`
          : `
            <div class="panel">
              <div class="panel-body">
                <div class="data-row" style="font-weight:700; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:0.06em;">
                  <span class="label">Game</span>
                  <span style="display:flex; gap:24px;">
                    <span>Total</span>
                    <span>Claimed</span>
                    <span style="min-width:60px; text-align:right;">Available</span>
                  </span>
                </div>
                ${entries.map(([slug, inv]) => `
                  <div class="data-row">
                    <span class="label">${slug}</span>
                    <span style="display:flex; gap:24px;">
                      <span class="value">${fmt(inv.total)}</span>
                      <span class="value">${fmt(inv.claimed)}</span>
                      <span class="value" style="min-width:60px; text-align:right; color:${inv.available === 0 ? "var(--red)" : "var(--green)"};">
                        ${fmt(inv.available)}
                      </span>
                    </span>
                  </div>
                `).join("")}
              </div>
            </div>
          `
        }
      </div>
    </div>
  `;
}

export function renderVaultAdminView(state) {
  const { sbData = null, adminTab = "members" } = state;
  const invPending = sbData?.investorRequests?.pending ?? 0;
  const tabs = [
    { id: "members", label: "Members" },
    { id: "pulse", label: "Studio Pulse" },
    { id: "challenges", label: "Challenges" },
    { id: "beta-keys", label: "Beta Keys" },
    { id: "investor-requests", label: `Investor Requests${invPending > 0 ? ` (${invPending})` : ""}` },
  ];

  const tabContent = {
    members: () => renderMembersTab(sbData),
    pulse: () => renderPulseTab(sbData, state),
    challenges: () => renderChallengesTab(sbData),
    "beta-keys": () => renderBetaKeysTab(sbData),
    "investor-requests": () => renderInvestorRequestsTab(sbData),
  };

  return `
    <div class="main-panel">
      <div class="view-header">
        <div class="view-title">Vault Admin</div>
        <div class="view-subtitle">Manage Vault Members, Studio Pulse, challenges, and beta keys.</div>
      </div>

      <div class="admin-tabs">
        ${tabs.map((t) => `
          <div class="admin-tab ${adminTab === t.id ? "active" : ""}" data-admin-tab="${t.id}">
            ${t.label}
          </div>
        `).join("")}
      </div>

      <div class="admin-tab-content active">
        ${(tabContent[adminTab] || tabContent.members)()}
      </div>
    </div>
  `;
}
