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

function renderRevenueTab(sbData) {
  const vaultSparkedCount = sbData?.revenue?.vaultSparkedCount ?? 0;
  const mrr = (vaultSparkedCount * 4.99).toFixed(2);
  const arr = (vaultSparkedCount * 4.99 * 12).toFixed(2);

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:2rem;">
      <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:1.25rem;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10B981;margin-bottom:0.5rem;">VaultSparked Subscribers</div>
        <div style="font-size:2rem;font-weight:700;color:var(--text);">${vaultSparkedCount.toLocaleString()}</div>
      </div>
      <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:1.25rem;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10B981;margin-bottom:0.5rem;">MRR</div>
        <div style="font-size:2rem;font-weight:700;color:var(--text);">$${Number(mrr).toLocaleString('en-US',{minimumFractionDigits:2})}</div>
        <div style="font-size:0.78rem;color:var(--muted);margin-top:0.25rem;">at $4.99/mo per subscriber</div>
      </div>
      <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:1.25rem;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10B981;margin-bottom:0.5rem;">ARR (Projected)</div>
        <div style="font-size:2rem;font-weight:700;color:var(--text);">$${Number(arr).toLocaleString('en-US',{minimumFractionDigits:2})}</div>
      </div>
    </div>
    <div style="background:rgba(10,13,22,0.7);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1.25rem;">
      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--dim);margin-bottom:1rem;">Revenue Notes</div>
      <ul style="color:var(--muted);font-size:0.88rem;line-height:1.7;padding-left:1.25rem;margin:0;">
        <li>VaultSparked: $4.99/month per subscriber</li>
        <li>Investor portal tier access may add revenue streams</li>
        <li>Game-specific premium features in development</li>
      </ul>
    </div>
  `;
}

function renderAnalyticsTab(sbData) {
  const sessions = sbData?.analytics?.sessions ?? [];
  const memberGrowth = sbData?.analytics?.memberGrowth ?? [];

  // Build a simple text-based session chart by game
  const gameSessionCounts = {};
  sessions.forEach(s => {
    gameSessionCounts[s.game] = (gameSessionCounts[s.game] || 0) + 1;
  });

  const totalSessions = sessions.length;
  const sessionRows = Object.entries(gameSessionCounts)
    .sort((a,b) => b[1]-a[1])
    .map(([game, count]) => {
      const pct = totalSessions ? Math.round((count/totalSessions)*100) : 0;
      return `
        <div style="margin-bottom:0.75rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem;">
            <span style="font-size:0.88rem;color:var(--text);font-weight:500;">${game}</span>
            <span style="font-size:0.82rem;color:var(--muted);">${count} sessions (${pct}%)</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#1FA2FF,#8B5CF6);border-radius:3px;transition:width 0.4s;"></div>
          </div>
        </div>
      `;
    }).join('');

  // Member growth table (last 8 weeks)
  const growthRows = memberGrowth.slice(0, 8).map(w => `
    <tr>
      <td style="padding:0.6rem 0.75rem;color:var(--muted);font-size:0.85rem;border-bottom:1px solid rgba(255,255,255,0.04);">${w.week}</td>
      <td style="padding:0.6rem 0.75rem;color:var(--text);font-weight:600;font-size:0.85rem;border-bottom:1px solid rgba(255,255,255,0.04);">+${w.new_members}</td>
      <td style="padding:0.6rem 0.75rem;color:var(--muted);font-size:0.85rem;border-bottom:1px solid rgba(255,255,255,0.04);">${w.total}</td>
    </tr>
  `).join('');

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
      <div style="background:rgba(10,13,22,0.7);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1.25rem;">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--dim);margin-bottom:1rem;">Game Sessions (30 days)</div>
        ${sessionRows || '<div style="color:var(--dim);font-size:0.85rem;">No session data yet.</div>'}
        <div style="font-size:0.78rem;color:var(--dim);margin-top:1rem;">Total: ${totalSessions} sessions</div>
      </div>
      <div style="background:rgba(10,13,22,0.7);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1.25rem;">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--dim);margin-bottom:1rem;">Member Growth (Weekly)</div>
        ${growthRows ? `<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--dim);padding:0 0.75rem 0.5rem;">Week</th><th style="text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--dim);padding:0 0.75rem 0.5rem;">New</th><th style="text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--dim);padding:0 0.75rem 0.5rem;">Total</th></tr></thead><tbody>${growthRows}</tbody></table>` : '<div style="color:var(--dim);font-size:0.85rem;">No growth data available.</div>'}
      </div>
    </div>
  `;
}

function renderMemberSearchTab() {
  return `
    <div style="margin-bottom:1.5rem;">
      <div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:1rem;">
        <input type="text" id="memberSearchInput" placeholder="Search by username…" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:var(--text);padding:0.65rem 0.9rem;font-size:0.92rem;font-family:inherit;outline:none;" />
        <button id="memberSearchBtn" style="background:rgba(31,162,255,0.08);border:1px solid rgba(31,162,255,0.2);color:#1FA2FF;padding:0.65rem 1.25rem;border-radius:8px;font-size:0.88rem;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;">Search</button>
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
        <button class="member-filter-btn active" data-filter="all" style="padding:0.3rem 0.75rem;border-radius:999px;font-size:0.78rem;font-weight:600;border:1px solid rgba(255,255,255,0.1);background:rgba(31,162,255,0.1);color:#1FA2FF;cursor:pointer;font-family:inherit;">All</button>
        <button class="member-filter-btn" data-filter="vaultsparked" style="padding:0.3rem 0.75rem;border-radius:999px;font-size:0.78rem;font-weight:600;border:1px solid rgba(255,255,255,0.1);background:transparent;color:var(--muted);cursor:pointer;font-family:inherit;">VaultSparked</button>
        <button class="member-filter-btn" data-filter="sparked" style="padding:0.3rem 0.75rem;border-radius:999px;font-size:0.78rem;font-weight:600;border:1px solid rgba(255,255,255,0.1);background:transparent;color:var(--muted);cursor:pointer;font-family:inherit;">The Sparked</button>
        <button class="member-filter-btn" data-filter="new" style="padding:0.3rem 0.75rem;border-radius:999px;font-size:0.78rem;font-weight:600;border:1px solid rgba(255,255,255,0.1);background:transparent;color:var(--muted);cursor:pointer;font-family:inherit;">New (7 days)</button>
      </div>
    </div>
    <div id="memberSearchResults" style="color:var(--dim);font-size:0.88rem;">Enter a username to search, or use the filters above to browse members.</div>
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
    { id: "revenue", label: "Revenue" },
    { id: "analytics", label: "Analytics" },
    { id: "member-search", label: "Member Search" },
  ];

  const tabContent = {
    members: () => renderMembersTab(sbData),
    pulse: () => renderPulseTab(sbData, state),
    challenges: () => renderChallengesTab(sbData),
    "beta-keys": () => renderBetaKeysTab(sbData),
    "investor-requests": () => renderInvestorRequestsTab(sbData),
    revenue: () => renderRevenueTab(sbData),
    analytics: () => renderAnalyticsTab(sbData),
    "member-search": () => renderMemberSearchTab(),
  };

  return `
    <div class="main-panel">
      <div class="view-header">
        <div class="view-title">Vault Admin</div>
        <div class="view-subtitle">Manage Vault Members, Studio Pulse, challenges, beta keys, revenue, and analytics.</div>
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

export async function initMemberSearch(supabaseUrl, anonKey) {
  if (!supabaseUrl || !anonKey) return;
  let allMembers = [];

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/vault_members?select=username,points,rank,created_at,is_vaultsparked&order=points.desc&limit=200`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (res.ok) allMembers = await res.json();
  } catch { return; }

  function renderResults(members) {
    const results = document.getElementById('memberSearchResults');
    if (!results) return;
    if (!members.length) {
      results.innerHTML = '<div style="color:var(--dim);padding:2rem 0;text-align:center;">No members found.</div>';
      return;
    }
    results.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
        <thead><tr>
          <th style="text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--dim);padding:0 0.75rem 0.65rem;border-bottom:1px solid rgba(31,162,255,0.1);">Username</th>
          <th style="text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--dim);padding:0 0.75rem 0.65rem;border-bottom:1px solid rgba(31,162,255,0.1);">Rank</th>
          <th style="text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--dim);padding:0 0.75rem 0.65rem;border-bottom:1px solid rgba(31,162,255,0.1);">Points</th>
          <th style="text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--dim);padding:0 0.75rem 0.65rem;border-bottom:1px solid rgba(31,162,255,0.1);">Joined</th>
          <th style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--dim);padding:0 0.75rem 0.65rem;border-bottom:1px solid rgba(31,162,255,0.1);">Tier</th>
        </tr></thead>
        <tbody>
          ${members.map(m => `
            <tr style="cursor:pointer;" onmouseover="this.style.background='rgba(31,162,255,0.03)'" onmouseout="this.style.background=''">
              <td style="padding:0.65rem 0.75rem;color:var(--text);font-weight:500;border-bottom:1px solid rgba(255,255,255,0.04);">
                <a href="/member/?u=${encodeURIComponent(m.username)}" target="_blank" style="color:var(--text);text-decoration:none;">${m.username}</a>
              </td>
              <td style="padding:0.65rem 0.75rem;color:var(--muted);border-bottom:1px solid rgba(255,255,255,0.04);">${m.rank || 'Spark Initiate'}</td>
              <td style="padding:0.65rem 0.75rem;color:var(--text);font-weight:600;border-bottom:1px solid rgba(255,255,255,0.04);">${(m.points||0).toLocaleString()}</td>
              <td style="padding:0.65rem 0.75rem;color:var(--dim);font-size:0.8rem;border-bottom:1px solid rgba(255,255,255,0.04);">${new Date(m.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
              <td style="padding:0.65rem 0.75rem;border-bottom:1px solid rgba(255,255,255,0.04);">${m.is_vaultsparked ? '<span style="font-size:0.72rem;font-weight:700;background:rgba(255,196,0,0.1);color:#FFC400;border:1px solid rgba(255,196,0,0.2);border-radius:4px;padding:0.1rem 0.4rem;">&#10024; Sparked</span>' : '<span style="font-size:0.72rem;color:var(--dim);">Free</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="font-size:0.78rem;color:var(--dim);margin-top:0.75rem;">Showing ${members.length} members</div>
    `;
  }

  renderResults(allMembers);

  const searchInput = document.getElementById('memberSearchInput');
  const searchBtn = document.getElementById('memberSearchBtn');
  const filterBtns = document.querySelectorAll('.member-filter-btn');

  let currentFilter = 'all';

  function applyFilter() {
    const query = searchInput?.value.toLowerCase().trim() || '';
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    let filtered = allMembers.filter(m => {
      if (query && !m.username.toLowerCase().includes(query)) return false;
      if (currentFilter === 'vaultsparked' && !m.is_vaultsparked) return false;
      if (currentFilter === 'sparked' && m.rank !== 'The Sparked') return false;
      if (currentFilter === 'new' && (now - new Date(m.created_at).getTime()) > oneWeek) return false;
      return true;
    });
    renderResults(filtered);
  }

  searchInput?.addEventListener('input', applyFilter);
  searchBtn?.addEventListener('click', applyFilter);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => { b.style.background='transparent'; b.style.color='var(--muted)'; b.classList.remove('active'); });
      btn.style.background='rgba(31,162,255,0.1)'; btn.style.color='#1FA2FF'; btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilter();
    });
  });
}
