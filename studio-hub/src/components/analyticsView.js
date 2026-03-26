// Site Analytics View
// Tabs: Overview · GA4 Traffic · Vault Metrics · Journal · Site Health

import { fetchTopPages, fetchSiteVitals, fetchTrafficSources, isConnected, revokeToken } from "../data/gaAdapter.js";
import { loadStoredCredentials } from "./settingsView.js";

// ── Module state ─────────────────────────────────────────────────────────────
let _gaState = {
  status: "idle",     // idle | connecting | connected | error
  error:  null,
  vitals: null,
  topPages: null,
  sources: null,
};

let _activeTab = "overview";
let _renderCallback = null;   // set by clientApp so we can re-render on GA connect

export function setAnalyticsRenderCallback(fn) { _renderCallback = fn; }

function rerender() { if (_renderCallback) _renderCallback(); }

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n, decimals = 0) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return typeof n === "number" ? n.toFixed(decimals) : String(n);
}

function fmtDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function fmtPct(decimal) {
  if (decimal === null || decimal === undefined) return "—";
  return (decimal * 100).toFixed(1) + "%";
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

function cleanPath(path) {
  return path === "/" ? "/ (Home)" : path.replace(/\/$/, "");
}

// ── SVG sparkline (views over 30 days) ──────────────────────────────────────
function sparkline(daily, color = "var(--cyan)") {
  if (!daily || daily.length < 2) return "";
  const vals = daily.map((d) => d.views);
  const max = Math.max(...vals, 1);
  const W = 280, H = 50, PAD = 2;
  const pts = vals.map((v, i) => {
    const x = PAD + (i / (vals.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - v / max) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pts.join(" ");
  // Area fill: close the path at the bottom
  const area = `M ${pts[0]} L ${pts.join(" L ")} L ${(PAD + W - PAD * 2).toFixed(1)},${H} L ${PAD},${H} Z`;

  return `
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block; overflow:visible;">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#spark-fill)"/>
      <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
  `;
}

// ── Horizontal bar chart ─────────────────────────────────────────────────────
function barChart(items, valueKey, labelKey, color = "var(--cyan)") {
  if (!items || !items.length) return `<div style="color:var(--muted);font-size:12px;padding:16px 0;">No data</div>`;
  const max = Math.max(...items.map((i) => i[valueKey]), 1);
  return items.map((item) => {
    const pct = (item[valueKey] / max) * 100;
    return `
      <div style="display:grid; grid-template-columns:180px 1fr 60px; align-items:center; gap:8px; margin-bottom:8px;">
        <div style="font-size:11px; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item[labelKey]}">
          ${item[labelKey]}
        </div>
        <div style="background:rgba(255,255,255,0.05); border-radius:3px; height:6px; overflow:hidden;">
          <div style="width:${pct.toFixed(1)}%; height:100%; background:${color}; border-radius:3px; transition:width 0.4s;"></div>
        </div>
        <div style="font-size:11px; font-weight:700; color:var(--muted); text-align:right;">${fmt(item[valueKey])}</div>
      </div>
    `;
  }).join("");
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
function tabBar(tabs) {
  return `
    <div style="display:flex; gap:4px; margin-bottom:24px; border-bottom:1px solid var(--border); padding-bottom:0;">
      ${tabs.map(([id, label]) => `
        <button type="button" data-analytics-tab="${id}" style="
          padding:8px 16px; border-radius:6px 6px 0 0;
          border:1px solid ${_activeTab === id ? "var(--border)" : "transparent"};
          border-bottom:${_activeTab === id ? "1px solid var(--bg)" : "none"};
          background:${_activeTab === id ? "var(--panel)" : "transparent"};
          color:${_activeTab === id ? "var(--cyan)" : "var(--muted)"};
          font-size:12px; font-weight:700; font-family:inherit; cursor:pointer;
          letter-spacing:0.04em; position:relative; bottom:-1px;
        ">${label}</button>
      `).join("")}
    </div>
  `;
}

// ── Overview tab ─────────────────────────────────────────────────────────────
function renderOverview(state) {
  const sb = state.sbData;
  const ga = _gaState;

  const members   = sb?.members;
  const sessions  = sb?.sessions;
  const journal   = sb?.journalViews;
  const fanArt    = sb?.fanArt;

  // Compute total game sessions (7d)
  let gameSessions7d = 0;
  if (sessions) Object.values(sessions).forEach((g) => { gameSessions7d += g.week || 0; });

  const vitals = [
    { label: "Vault Members",      value: fmt(members?.total),      sub: `+${members?.newThisWeek ?? 0} this week`,    color: "var(--cyan)"  },
    { label: "Game Sessions (7d)", value: fmt(gameSessions7d),      sub: "across all games",                           color: "var(--blue)"  },
    { label: "Journal Reads (30d)",value: fmt(journal?.recent30d),  sub: `${fmt(journal?.total)} all time`,            color: "var(--green)" },
    { label: "Fan Art Submitted",  value: fmt(fanArt?.total),       sub: `${fanArt?.pending ?? 0} pending review`,     color: "var(--gold)"  },
    ...(ga.vitals ? [
      { label: "Pageviews (30d)",  value: fmt(ga.vitals.pageviews), sub: `${fmt(ga.vitals.sessions)} sessions`,        color: "var(--cyan)"  },
      { label: "Unique Users (30d)",value: fmt(ga.vitals.users),    sub: `${fmt(ga.vitals.newUsers)} new`,             color: "var(--purple)"},
    ] : []),
  ];

  return `
    <div style="display:flex; flex-direction:column; gap:28px;">

      <div class="vitals-strip" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));">
        ${vitals.map((v) => `
          <div class="vital-card">
            <div class="vital-label">${v.label}</div>
            <div class="vital-value" style="color:${v.color};">${v.value}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">${v.sub}</div>
          </div>
        `).join("")}
      </div>

      ${ga.vitals?.daily?.length ? `
        <div class="panel">
          <div class="panel-header"><span class="panel-title">TRAFFIC — LAST 30 DAYS</span></div>
          <div class="panel-body">
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:8px;">
              <div>
                <div style="font-size:22px; font-weight:800; color:var(--cyan);">${fmt(ga.vitals.pageviews)}</div>
                <div style="font-size:11px; color:var(--muted);">pageviews</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px; color:var(--muted);">Bounce rate: ${fmtPct(ga.vitals.bounceRate)}</div>
                <div style="font-size:12px; color:var(--muted);">Avg duration: ${fmtDuration(ga.vitals.avgDuration)}</div>
              </div>
            </div>
            ${sparkline(ga.vitals.daily)}
          </div>
        </div>
      ` : `
        <div class="panel" style="border:1px dashed rgba(122,231,199,0.2);">
          <div class="panel-body" style="text-align:center; padding:28px;">
            <div style="font-size:28px; margin-bottom:12px;">📊</div>
            <div style="font-weight:700; color:var(--text); margin-bottom:6px;">Connect Google Analytics</div>
            <div style="font-size:12px; color:var(--muted); max-width:380px; margin:0 auto 16px; line-height:1.7;">
              Unlock pageviews, sessions, top pages, and traffic sources for vaultsparkstudios.com.
              Requires a GA4 Property ID and OAuth Client ID in Settings.
            </div>
            <button type="button" id="analytics-connect-btn" class="btn-primary">Connect Google Analytics</button>
          </div>
        </div>
      `}

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        ${journal?.topArticles?.length ? `
          <div class="panel">
            <div class="panel-header"><span class="panel-title">TOP JOURNAL ARTICLES</span></div>
            <div class="panel-body">
              ${barChart(journal.topArticles.slice(0, 8).map((a) => ({
                label: a.slug.replace(/-/g, " "),
                value: a.views,
                recent: a.recent,
              })), "value", "label", "var(--green)")}
            </div>
          </div>
        ` : ""}

        ${sessions ? `
          <div class="panel">
            <div class="panel-header"><span class="panel-title">GAME SESSIONS (7d)</span></div>
            <div class="panel-body">
              ${barChart(
                Object.entries(sessions)
                  .map(([slug, d]) => ({ label: slug.replace(/-/g, " "), value: d.week }))
                  .filter((x) => x.value > 0)
                  .sort((a, b) => b.value - a.value),
                "value", "label", "var(--blue)"
              )}
            </div>
          </div>
        ` : ""}
      </div>

    </div>
  `;
}

// ── GA4 Traffic tab ──────────────────────────────────────────────────────────
function renderGA4Tab() {
  const ga = _gaState;
  const creds = loadStoredCredentials();
  const hasClientId = !!creds.gaClientId;
  const hasPropertyId = !!creds.gaPropertyId;

  if (!hasClientId || !hasPropertyId) {
    return `
      <div class="panel" style="border:1px dashed rgba(122,231,199,0.2);">
        <div class="panel-body" style="text-align:center; padding:40px;">
          <div style="font-size:32px; margin-bottom:16px;">🔑</div>
          <div style="font-weight:700; font-size:15px; color:var(--text); margin-bottom:8px;">GA4 credentials not configured</div>
          <div style="font-size:12px; color:var(--muted); max-width:420px; margin:0 auto; line-height:1.8;">
            Go to <strong style="color:var(--cyan);">Settings → Google Analytics</strong> and add your
            GA4 Property ID and OAuth Client ID. Both are required to fetch traffic data.
          </div>
        </div>
      </div>
    `;
  }

  if (ga.status === "idle" || ga.status === "error") {
    return `
      <div style="display:flex; flex-direction:column; gap:20px;">
        ${ga.error ? `<div style="background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); border-radius:10px; padding:14px 16px; font-size:12px; color:var(--red);">⚠ ${ga.error}</div>` : ""}
        <div class="panel" style="border:1px dashed rgba(122,231,199,0.2);">
          <div class="panel-body" style="text-align:center; padding:40px;">
            <div style="font-size:32px; margin-bottom:16px;">📈</div>
            <div style="font-weight:700; font-size:15px; color:var(--text); margin-bottom:8px;">Google Analytics not connected</div>
            <div style="font-size:12px; color:var(--muted); max-width:400px; margin:0 auto 20px; line-height:1.7;">
              Click below to authenticate with Google. You'll see a popup to grant read access to your GA4 property.
              Your credentials never leave your browser.
            </div>
            <button type="button" id="analytics-connect-btn" class="btn-primary">Connect Google Analytics</button>
          </div>
        </div>
      </div>
    `;
  }

  if (ga.status === "connecting") {
    return `
      <div class="panel">
        <div class="panel-body" style="text-align:center; padding:40px; color:var(--muted); font-size:13px;">
          Waiting for Google authentication…
        </div>
      </div>
    `;
  }

  // Connected
  const { vitals, topPages, sources } = ga;
  return `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" id="analytics-refresh-btn" class="btn-secondary" style="font-size:11px; padding:6px 12px;">↻ Refresh</button>
        <button type="button" id="analytics-disconnect-btn" class="btn-secondary" style="font-size:11px; padding:6px 12px; color:var(--muted);">Disconnect</button>
      </div>

      ${vitals ? `
        <div class="vitals-strip" style="grid-template-columns:repeat(3,1fr);">
          <div class="vital-card">
            <div class="vital-label">Pageviews (30d)</div>
            <div class="vital-value cyan">${fmt(vitals.pageviews)}</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Sessions</div>
            <div class="vital-value blue">${fmt(vitals.sessions)}</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Users</div>
            <div class="vital-value">${fmt(vitals.users)}</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">New Users</div>
            <div class="vital-value">${fmt(vitals.newUsers)}</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Bounce Rate</div>
            <div class="vital-value" style="color:${(vitals.bounceRate || 0) > 0.7 ? "var(--red)" : "var(--green)"};">${fmtPct(vitals.bounceRate)}</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Avg Session</div>
            <div class="vital-value">${fmtDuration(vitals.avgDuration)}</div>
          </div>
        </div>

        ${vitals.daily?.length ? `
          <div class="panel">
            <div class="panel-header"><span class="panel-title">PAGEVIEWS — LAST 30 DAYS</span></div>
            <div class="panel-body">
              ${sparkline(vitals.daily)}
              <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted); margin-top:4px;">
                <span>${vitals.daily[0]?.date?.replace(/(\d{4})(\d{2})(\d{2})/, "$2/$3") || ""}</span>
                <span>${vitals.daily[vitals.daily.length - 1]?.date?.replace(/(\d{4})(\d{2})(\d{2})/, "$2/$3") || "Today"}</span>
              </div>
            </div>
          </div>
        ` : ""}
      ` : ""}

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        ${topPages?.length ? `
          <div class="panel">
            <div class="panel-header"><span class="panel-title">TOP PAGES (30d)</span></div>
            <div class="panel-body">
              ${barChart(topPages.slice(0, 10).map((p) => ({ label: cleanPath(p.path), value: p.views })), "value", "label")}
            </div>
          </div>
        ` : ""}

        ${sources?.length ? `
          <div class="panel">
            <div class="panel-header"><span class="panel-title">TRAFFIC SOURCES (30d)</span></div>
            <div class="panel-body">
              ${barChart(sources.map((s) => ({ label: s.channel, value: s.sessions })), "value", "label", "var(--blue)")}
            </div>
          </div>
        ` : ""}
      </div>

      ${topPages?.length ? `
        <div class="panel">
          <div class="panel-header"><span class="panel-title">PAGE DETAIL TABLE</span></div>
          <div class="panel-body" style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
              <thead>
                <tr style="color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid var(--border);">
                  <th style="text-align:left; padding:6px 8px; font-weight:700;">Page</th>
                  <th style="text-align:right; padding:6px 8px; font-weight:700;">Views</th>
                  <th style="text-align:right; padding:6px 8px; font-weight:700;">Sessions</th>
                  <th style="text-align:right; padding:6px 8px; font-weight:700;">Bounce</th>
                  <th style="text-align:right; padding:6px 8px; font-weight:700;">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                ${topPages.map((p, i) => `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.04); ${i % 2 ? "background:rgba(255,255,255,0.015);" : ""}">
                    <td style="padding:7px 8px; color:var(--text); max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.path}">${cleanPath(p.path)}</td>
                    <td style="padding:7px 8px; text-align:right; font-weight:700; color:var(--cyan);">${fmt(p.views)}</td>
                    <td style="padding:7px 8px; text-align:right; color:var(--muted);">${fmt(p.sessions)}</td>
                    <td style="padding:7px 8px; text-align:right; color:${(p.bounceRate || 0) > 0.7 ? "var(--red)" : "var(--muted)"};">${fmtPct(p.bounceRate)}</td>
                    <td style="padding:7px 8px; text-align:right; color:var(--muted);">${fmtDuration(p.avgDuration)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

// ── Vault Metrics tab ────────────────────────────────────────────────────────
function renderVaultMetrics(state) {
  const sb = state.sbData;
  if (!sb) return `<div class="empty-state">No Supabase data loaded yet.</div>`;

  const { members, analytics, economy } = sb;

  return `
    <div style="display:flex; flex-direction:column; gap:20px;">

      <!-- Member growth table -->
      ${analytics?.memberGrowth?.length ? `
        <div class="panel">
          <div class="panel-header"><span class="panel-title">MEMBER GROWTH — LAST 8 WEEKS</span></div>
          <div class="panel-body" style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
              <thead>
                <tr style="color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid var(--border);">
                  <th style="text-align:left; padding:6px 8px; font-weight:700;">Week</th>
                  <th style="text-align:right; padding:6px 8px; font-weight:700;">New Members</th>
                  <th style="text-align:right; padding:6px 8px; font-weight:700;">Running Total</th>
                  <th style="text-align:left; padding:6px 8px; font-weight:700;">Growth Bar</th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  const maxNew = Math.max(...analytics.memberGrowth.map((w) => w.new_members), 1);
                  return analytics.memberGrowth.map((w, i) => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04); ${i % 2 ? "background:rgba(255,255,255,0.015);" : ""}">
                      <td style="padding:7px 8px; color:var(--text);">${w.week}</td>
                      <td style="padding:7px 8px; text-align:right; font-weight:700; color:var(--cyan);">+${w.new_members}</td>
                      <td style="padding:7px 8px; text-align:right; color:var(--muted);">${w.total}</td>
                      <td style="padding:7px 8px; width:120px;">
                        <div style="background:rgba(122,231,199,0.1); border-radius:3px; height:6px;">
                          <div style="width:${((w.new_members / maxNew) * 100).toFixed(1)}%; height:100%; background:var(--cyan); border-radius:3px;"></div>
                        </div>
                      </td>
                    </tr>
                  `).join("");
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ` : ""}

      <!-- Points economy -->
      ${economy ? `
        <div class="panel">
          <div class="panel-header"><span class="panel-title">POINTS ECONOMY — TOP EARNING EVENTS</span></div>
          <div class="panel-body">
            <div style="font-size:22px; font-weight:800; color:var(--gold); margin-bottom:16px;">
              ${fmt(economy.total)} <span style="font-size:12px; font-weight:400; color:var(--muted);">total points awarded</span>
            </div>
            ${barChart(
              Object.entries(economy.byReason)
                .map(([reason, pts]) => ({ label: reason.replace(/_/g, " "), value: pts }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10),
              "value", "label", "var(--gold)"
            )}
          </div>
        </div>
      ` : ""}

    </div>
  `;
}

// ── Journal tab ──────────────────────────────────────────────────────────────
function renderJournalTab(state) {
  const journal = state.sbData?.journalViews;
  if (!journal) return `<div class="empty-state">No journal view data available.</div>`;

  return `
    <div style="display:flex; flex-direction:column; gap:20px;">
      <div class="vitals-strip" style="grid-template-columns:repeat(3,1fr);">
        <div class="vital-card">
          <div class="vital-label">Total Reads (all time)</div>
          <div class="vital-value cyan">${fmt(journal.total)}</div>
        </div>
        <div class="vital-card">
          <div class="vital-label">Reads (last 30d)</div>
          <div class="vital-value blue">${fmt(journal.recent30d)}</div>
        </div>
        <div class="vital-card">
          <div class="vital-label">Articles Tracked</div>
          <div class="vital-value">${Object.keys(journal.bySlug).length}</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><span class="panel-title">ARTICLE READ COUNTS</span></div>
        <div class="panel-body" style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:11px;">
            <thead>
              <tr style="color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid var(--border);">
                <th style="text-align:left; padding:6px 8px; font-weight:700;">Article</th>
                <th style="text-align:right; padding:6px 8px; font-weight:700;">All Time</th>
                <th style="text-align:right; padding:6px 8px; font-weight:700;">Last 30d</th>
                <th style="text-align:left; padding:6px 8px; font-weight:700;"></th>
              </tr>
            </thead>
            <tbody>
              ${journal.topArticles.map((a, i) => {
                const maxViews = journal.topArticles[0]?.views || 1;
                return `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.04); ${i % 2 ? "background:rgba(255,255,255,0.015);" : ""}">
                    <td style="padding:7px 8px; color:var(--text);">${a.slug.replace(/-/g, " ")}</td>
                    <td style="padding:7px 8px; text-align:right; font-weight:700; color:var(--green);">${fmt(a.views)}</td>
                    <td style="padding:7px 8px; text-align:right; color:var(--muted);">${fmt(a.recent)}</td>
                    <td style="padding:7px 8px; width:100px;">
                      <div style="background:rgba(34,197,94,0.1); border-radius:3px; height:5px;">
                        <div style="width:${((a.views / maxViews) * 100).toFixed(1)}%; height:100%; background:var(--green); border-radius:3px;"></div>
                      </div>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ── Site Health tab ──────────────────────────────────────────────────────────
function renderSiteHealth(state) {
  const ghData = state.ghData || {};

  // Collect all CI runs across repos
  const ciRows = Object.entries(ghData).flatMap(([repoPath, data]) => {
    if (!data?.runs?.length) return [];
    return data.runs.slice(0, 1).map((run) => ({
      repo: repoPath.replace("VaultSparkStudios/", ""),
      name: run.name || run.workflow_id || "CI",
      status: run.conclusion || run.status,
      updatedAt: run.updated_at || run.created_at,
      url: run.html_url,
    }));
  });

  const statusColor = (s) => s === "success" ? "var(--green)" : s === "failure" ? "var(--red)" : s === "in_progress" || s === "queued" ? "var(--gold)" : "var(--muted)";
  const statusIcon  = (s) => s === "success" ? "✓" : s === "failure" ? "✗" : s === "in_progress" ? "⟳" : "○";

  return `
    <div style="display:flex; flex-direction:column; gap:20px;">

      <div class="panel">
        <div class="panel-header"><span class="panel-title">CI / DEPLOY STATUS</span></div>
        <div class="panel-body">
          ${ciRows.length ? ciRows.map((r) => `
            <div class="data-row">
              <span style="color:${statusColor(r.status)}; font-weight:700; font-size:12px;">${statusIcon(r.status)} ${r.repo}</span>
              <span style="display:flex; align-items:center; gap:12px;">
                <span style="font-size:11px; color:var(--muted);">${r.name}</span>
                <span style="font-size:11px; color:var(--muted);">${timeAgo(r.updatedAt)}</span>
                ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" style="font-size:11px; color:var(--blue);">view ↗</a>` : ""}
              </span>
            </div>
          `).join("") : `<div style="color:var(--muted); font-size:12px; padding:8px 0;">No CI data — add a GitHub token in Settings.</div>`}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><span class="panel-title">REPOSITORY HEALTH</span></div>
        <div class="panel-body">
          ${Object.entries(ghData).length ? Object.entries(ghData).map(([repoPath, data]) => {
            if (!data) return "";
            const repoName = repoPath.replace("VaultSparkStudios/", "");
            const lastCommit = data.commits?.[0];
            return `
              <div class="data-row">
                <span style="font-size:12px; color:var(--text); font-weight:600;">${repoName}</span>
                <span style="display:flex; align-items:center; gap:12px;">
                  ${data.openIssues != null ? `<span style="font-size:11px; color:${data.openIssues > 10 ? "var(--red)" : "var(--muted)"};">${data.openIssues} issues</span>` : ""}
                  ${data.openPRs != null ? `<span style="font-size:11px; color:var(--muted);">${data.openPRs} PRs</span>` : ""}
                  ${lastCommit ? `<span style="font-size:11px; color:var(--muted);">${timeAgo(lastCommit.commit?.author?.date)}</span>` : ""}
                </span>
              </div>
            `;
          }).join("") : `<div style="color:var(--muted); font-size:12px; padding:8px 0;">Configure GitHub token in Settings to see repo data.</div>`}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><span class="panel-title">QUICK LINKS</span></div>
        <div class="panel-body" style="display:flex; flex-wrap:wrap; gap:8px;">
          ${[
            ["GitHub Actions", "https://github.com/VaultSparkStudios/VaultSparkStudios.github.io/actions"],
            ["Supabase Dashboard", "https://supabase.com/dashboard/project/fjnpzjjyhnpmunfoycrp"],
            ["GA4 Dashboard", "https://analytics.google.com/"],
            ["Google Search Console", "https://search.google.com/search-console"],
            ["Lighthouse Report", "https://pagespeed.web.dev/report?url=https://vaultsparkstudios.com"],
            ["Live Site", "https://vaultsparkstudios.com"],
          ].map(([label, url]) => `
            <a href="${url}" target="_blank" rel="noopener" style="
              display:inline-block; padding:6px 14px; border-radius:6px;
              border:1px solid var(--border); font-size:11px; font-weight:600;
              color:var(--muted); text-decoration:none; background:rgba(255,255,255,0.03);
            " onmouseover="this.style.color='var(--cyan)';this.style.borderColor='var(--cyan)'"
               onmouseout="this.style.color='var(--muted)';this.style.borderColor='var(--border)'">${label} ↗</a>
          `).join("")}
        </div>
      </div>

    </div>
  `;
}

// ── Main render ──────────────────────────────────────────────────────────────
export function renderAnalyticsView(state) {
  const tabs = [
    ["overview",      "Overview"],
    ["ga4",           "GA4 Traffic"],
    ["vault-metrics", "Vault Metrics"],
    ["journal",       "Journal"],
    ["site-health",   "Site Health"],
  ];

  let content = "";
  if (_activeTab === "overview")      content = renderOverview(state);
  else if (_activeTab === "ga4")      content = renderGA4Tab();
  else if (_activeTab === "vault-metrics") content = renderVaultMetrics(state);
  else if (_activeTab === "journal")  content = renderJournalTab(state);
  else if (_activeTab === "site-health") content = renderSiteHealth(state);

  return `
    <div class="main-panel">
      <div class="view-header">
        <div class="view-title">Site Analytics</div>
        <div class="view-subtitle">Traffic · Vault metrics · Journal reads · Site health</div>
      </div>
      ${tabBar(tabs)}
      ${content}
    </div>
  `;
}

// ── Tab switching & GA connect (called from clientApp bindEvents) ─────────────
export function bindAnalyticsEvents(config) {
  // Tab switching
  document.querySelectorAll("[data-analytics-tab]").forEach((el) => {
    el.addEventListener("click", () => {
      const tab = el.getAttribute("data-analytics-tab");
      if (tab && tab !== _activeTab) {
        _activeTab = tab;
        rerender();
      }
    });
  });

  // Connect button
  document.getElementById("analytics-connect-btn")?.addEventListener("click", () => {
    connectGA(config);
  });

  // Disconnect button
  document.getElementById("analytics-disconnect-btn")?.addEventListener("click", () => {
    revokeToken();
    _gaState = { status: "idle", error: null, vitals: null, topPages: null, sources: null };
    rerender();
  });

  // Refresh button
  document.getElementById("analytics-refresh-btn")?.addEventListener("click", () => {
    connectGA(config);
  });
}

async function connectGA(config) {
  const creds = loadStoredCredentials();
  const clientId = creds.gaClientId;
  const propertyId = creds.gaPropertyId;

  if (!clientId || !propertyId) {
    _gaState.error = "GA4 Client ID and Property ID are required. Configure them in Settings.";
    _gaState.status = "error";
    rerender();
    return;
  }

  _gaState.status = "connecting";
  _gaState.error  = null;
  rerender();

  try {
    const [vitals, topPages, sources] = await Promise.all([
      fetchSiteVitals(propertyId, clientId),
      fetchTopPages(propertyId, clientId, 30),
      fetchTrafficSources(propertyId, clientId),
    ]);
    _gaState = { status: "connected", error: null, vitals, topPages, sources };
  } catch (err) {
    _gaState.status = "error";
    _gaState.error  = err.message || "Failed to connect to Google Analytics.";
  }

  rerender();
}
