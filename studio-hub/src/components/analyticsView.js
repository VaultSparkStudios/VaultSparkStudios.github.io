// Site Analytics View
// Tabs: Overview · Traffic · Members · Vault Tiers · VaultSparked · Journal · Site Health

// ── Module state ─────────────────────────────────────────────────────────────
let _activeTab = "overview";
let _renderCallback = null;

export function setAnalyticsRenderCallback(fn) { _renderCallback = fn; }

function rerender() { if (_renderCallback) _renderCallback(); }

// ── Constants ─────────────────────────────────────────────────────────────────
const TIER_NAMES = [
  'Spark Initiate', 'Vault Runner', 'Forge Guard', 'Vault Keeper',
  'Ember Warden', 'Signal Breaker', 'Vault Sentinel', 'The Sparked', 'VaultSparked'
];
const TIER_COLORS = [
  'var(--muted)', 'var(--cyan)', 'var(--blue)', 'var(--green)',
  'var(--gold)', 'var(--purple)', 'var(--red)', '#f87171', 'var(--gold)'
];
const TIER_PTS = ['0', '100', '500', '1,000', '2,500', '5,000', '7,500', '10,000', '15,000+'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function pct(part, total) {
  if (!total || total === 0) return "0.0%";
  return ((part / total) * 100).toFixed(1) + "%";
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function sparkline(points, color = "var(--cyan)", W = 300, H = 60) {
  if (!points || points.length === 0) {
    return `<p style="color:var(--muted);font-size:.85rem;padding:.5rem 0;">No data yet — views will appear once pages are visited.</p>`;
  }
  const vals = points.map(p => (typeof p === "object" && p !== null) ? (p.views ?? 0) : Number(p));
  const max = Math.max(...vals, 1);
  const step = W / Math.max(vals.length - 1, 1);
  const pts = vals.map((v, i) => `${(i * step).toFixed(1)},${(H - (v / max) * (H - 4)).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:${H}px;">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
  </svg>`;
}

function bars(items, valKey, labelKey, color = "var(--cyan)", showPct = false, total = 0) {
  if (!items || items.length === 0) {
    return `<p style="color:var(--muted);font-size:.85rem;">No data available.</p>`;
  }
  const maxVal = Math.max(...items.map(i => Number(i[valKey]) || 0), 1);
  return items.map(item => {
    const val = Number(item[valKey]) || 0;
    const label = item[labelKey] ?? "—";
    const barW = ((val / maxVal) * 100).toFixed(1);
    const suffix = showPct && total ? ` (${pct(val, total)})` : "";
    return `<div style="margin-bottom:.5rem;">
      <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:2px;">
        <span style="color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70%;">${label}</span>
        <span style="color:var(--muted);">${fmt(val)}${suffix}</span>
      </div>
      <div style="background:var(--surface2);border-radius:3px;height:6px;">
        <div style="width:${barW}%;height:6px;background:${color};border-radius:3px;"></div>
      </div>
    </div>`;
  }).join("");
}

function vitalsStrip(cards, cols = 3) {
  const cardHtml = cards.map(c => {
    const color = c.color || "var(--cyan)";
    const sub = c.sub ? `<div style="font-size:.75rem;color:var(--muted);margin-top:.15rem;">${c.sub}</div>` : "";
    return `<div class="vital-card" style="background:var(--surface1);border:1px solid var(--border);border-radius:8px;padding:.85rem 1rem;">
      <div style="font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem;">${c.label}</div>
      <div style="font-size:1.5rem;font-weight:700;color:${color};">${c.value}</div>
      ${sub}
    </div>`;
  }).join("");
  return `<div class="vitals-strip" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:.75rem;margin-bottom:1.25rem;">${cardHtml}</div>`;
}

function tabBar(tabs) {
  return `<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-bottom:1.25rem;border-bottom:1px solid var(--border);padding-bottom:.5rem;">
    ${tabs.map(t => {
      const active = t.id === _activeTab;
      return `<button data-analytics-tab="${t.id}" style="
        padding:.35rem .85rem;border-radius:6px 6px 0 0;border:1px solid ${active ? "var(--border)" : "transparent"};
        border-bottom:none;background:${active ? "var(--surface1)" : "transparent"};
        color:${active ? "var(--fg)" : "var(--muted)"};cursor:pointer;font-size:.85rem;font-weight:${active ? "600" : "400"};
        transition:color .15s,background .15s;">${t.label}</button>`;
    }).join("")}
  </div>`;
}

function panel(title, body) {
  return `<div class="panel" style="background:var(--surface1);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:1rem;">
    <div class="panel-header" style="padding:.65rem 1rem;border-bottom:1px solid var(--border);font-size:.85rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;">${title}</div>
    <div class="panel-body" style="padding:1rem;">${body}</div>
  </div>`;
}

function twoCol(left, right) {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">${left}${right}</div>`;
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function renderOverview(state) {
  const pv = state.sbData?.pageViews ?? {};
  const ma = state.sbData?.memberAnalytics ?? {};
  const jv = state.sbData?.journalViews ?? {};
  const sess = state.sbData?.sessions ?? {};

  const views30 = pv.views30 ?? 0;
  const sessions30 = sess.sessions30 ?? pv.sessions30 ?? 0;
  const loggedIn30 = pv.loggedIn30 ?? 0;
  const totalMembers = ma.total ?? 0;
  const vsCount = ma.vsCount ?? 0;
  const gameSessions7 = sess.gameSessions7 ?? 0;

  const vitals = vitalsStrip([
    { label: "Views 30d",          value: fmt(views30),      color: "var(--cyan)" },
    { label: "Sessions 30d",       value: fmt(sessions30),   color: "var(--blue)" },
    { label: "Logged-in Views 30d",value: fmt(loggedIn30),   color: "var(--green)" },
    { label: "Total Members",      value: fmt(totalMembers), color: "var(--gold)" },
    { label: "VaultSparked",       value: fmt(vsCount),      color: "var(--purple)", sub: pct(vsCount, totalMembers) + " of members" },
    { label: "Game Sessions 7d",   value: fmt(gameSessions7),color: "var(--red)" },
  ], 3);

  const daily = pv.daily ?? [];
  const topPages = (pv.topPages ?? []).slice(0, 8);
  const topPagesHtml = bars(topPages, "views", "page", "var(--cyan)", true, pv.totalViews ?? 0);

  const cohorts = ma.cohorts ?? [];
  const cohortHtml = bars(cohorts, "count", "month", "var(--blue)", false, 0);

  const tierDist = ma.tierDist ?? [];
  const tierDistHtml = bars(tierDist, "count", "tier", "var(--gold)", true, totalMembers);

  const trafficPanel = panel("Daily Traffic — Last 30 Days",
    sparkline(daily.slice(-30), "var(--cyan)", 600, 70)
  );
  const topPagesPanel = panel("Top Pages", topPagesHtml);
  const cohortPanel = panel("Member Cohorts (Monthly)", cohortHtml);
  const tierPanel = panel("Tier Distribution", tierDistHtml);

  return vitals +
    `<div style="margin-bottom:1rem;">${trafficPanel}</div>` +
    twoCol(topPagesPanel, cohortPanel) +
    twoCol(`<div></div>`, tierPanel);
}

// ── Tab: Traffic ──────────────────────────────────────────────────────────────
function renderTraffic(state) {
  const pv = state.sbData?.pageViews ?? {};

  const totalViews = pv.totalViews ?? 0;
  const views30 = pv.views30 ?? 0;
  const views7 = pv.views7 ?? 0;
  const loggedIn30 = pv.loggedIn30 ?? 0;
  const anon30 = views30 - loggedIn30;
  const pagesPerSession = pv.pagesPerSession ?? 0;

  const vitals = vitalsStrip([
    { label: "Total Views",         value: fmt(totalViews),    color: "var(--cyan)" },
    { label: "Views 30d",           value: fmt(views30),       color: "var(--cyan)" },
    { label: "Views 7d",            value: fmt(views7),        color: "var(--blue)" },
    { label: "Logged-in 30d",       value: fmt(loggedIn30),    color: "var(--green)" },
    { label: "Anonymous 30d",       value: fmt(anon30),        color: "var(--muted)" },
    { label: "Pages / Session",     value: pagesPerSession ? pagesPerSession.toFixed(1) : "—", color: "var(--gold)" },
  ], 3);

  const daily = pv.daily ?? [];
  const sparkPanel = panel("Daily Traffic — All Time",
    sparkline(daily, "var(--cyan)", 600, 80)
  );

  const topPages = (pv.topPages ?? []).slice(0, 10);
  const referrers = (pv.referrers ?? []).slice(0, 10);
  const topPagesHtml = bars(topPages, "views", "page", "var(--cyan)", true, totalViews);
  const referrersHtml = bars(referrers, "views", "source", "var(--blue)", true, views30);

  const allPages = pv.topPages ?? [];
  const tableRows = allPages.map(p => {
    const li = p.loggedIn ?? 0;
    const an = (p.views ?? 0) - li;
    return `<tr>
      <td style="padding:.4rem .5rem;color:var(--fg);font-size:.8rem;">${p.page ?? "—"}</td>
      <td style="padding:.4rem .5rem;color:var(--cyan);text-align:right;">${fmt(p.views)}</td>
      <td style="padding:.4rem .5rem;color:var(--muted);text-align:right;">${pct(p.views, totalViews)}</td>
      <td style="padding:.4rem .5rem;color:var(--green);text-align:right;">${fmt(li)}</td>
      <td style="padding:.4rem .5rem;color:var(--muted);text-align:right;">${fmt(an)}</td>
    </tr>`;
  }).join("");

  const tableHtml = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);">Page</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);">Views</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);">%Total</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);">Logged-In</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);">Anon</th>
      </tr></thead>
      <tbody>${tableRows || `<tr><td colspan="5" style="padding:.75rem;color:var(--muted);text-align:center;">No page data available.</td></tr>`}</tbody>
    </table>
  </div>`;

  return vitals +
    `<div style="margin-bottom:1rem;">${sparkPanel}</div>` +
    twoCol(panel("Top Pages", topPagesHtml), panel("Top Referrers", referrersHtml)) +
    panel("Page Detail", tableHtml);
}

// ── Tab: Members ──────────────────────────────────────────────────────────────
function renderMembers(state) {
  const ma = state.sbData?.memberAnalytics ?? {};
  const pv = state.sbData?.pageViews ?? {};

  const total = ma.total ?? 0;
  const signups7 = ma.signups7 ?? 0;
  const signups30 = ma.signups30 ?? 0;
  const avgPoints = ma.avgPoints ?? 0;
  const vsCount = ma.vsCount ?? 0;
  const totalViews = pv.totalViews ?? 0;
  const convRate = total > 0 ? pct(vsCount, total) : "0.0%";

  const vitals = vitalsStrip([
    { label: "Total Members",    value: fmt(total),         color: "var(--cyan)" },
    { label: "Signups 7d",       value: fmt(signups7),      color: "var(--green)" },
    { label: "Signups 30d",      value: fmt(signups30),     color: "var(--blue)" },
    { label: "Avg Points",       value: fmt(avgPoints),     color: "var(--gold)" },
    { label: "VaultSparked",     value: fmt(vsCount),       color: "var(--purple)" },
    { label: "VS+ Conv. Rate",   value: convRate,           color: "var(--gold)" },
  ], 3);

  const cohorts = ma.cohorts ?? [];
  const ptsDist = ma.ptsDist ?? [];
  const cohortHtml = bars(cohorts, "count", "month", "var(--blue)", false, 0);
  const ptsHtml = bars(ptsDist, "count", "range", "var(--gold)", true, total);

  const topMembers = (ma.topMembers ?? []).slice(0, 10);
  const memberRows = topMembers.map((m, i) => {
    const pts = m.points ?? 0;
    const tierIdx = getTierIndex(pts);
    const tierName = TIER_NAMES[tierIdx] ?? "—";
    const tierColor = TIER_COLORS[tierIdx] ?? "var(--muted)";
    const vsTag = m.isVS ? `<span style="background:var(--gold);color:#000;border-radius:4px;padding:1px 6px;font-size:.7rem;font-weight:700;margin-left:.4rem;">VS+</span>` : "";
    return `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:.4rem .5rem;color:var(--muted);font-size:.8rem;">${i + 1}</td>
      <td style="padding:.4rem .5rem;color:var(--fg);font-size:.8rem;">${m.username ?? "—"}${vsTag}</td>
      <td style="padding:.4rem .5rem;color:var(--gold);text-align:right;font-size:.8rem;">${fmt(pts)}</td>
      <td style="padding:.4rem .5rem;font-size:.8rem;"><span style="color:${tierColor};">${tierName}</span></td>
    </tr>`;
  }).join("");

  const membersTable = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);">#</th>
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);">Username</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);">Points</th>
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);">Rank</th>
      </tr></thead>
      <tbody>${memberRows || `<tr><td colspan="4" style="padding:.75rem;color:var(--muted);text-align:center;">No member data available.</td></tr>`}</tbody>
    </table>
  </div>`;

  const economyItems = ma.economy ?? [];
  const economyHtml = bars(economyItems, "total", "action", "var(--cyan)", false, 0);

  return vitals +
    twoCol(panel("Monthly Cohorts", cohortHtml), panel("Points Distribution", ptsHtml)) +
    panel("Top 10 Members", membersTable) +
    panel("Point Economy (All-Time Totals by Action)", economyHtml);
}

// ── Tab: Vault Tiers ──────────────────────────────────────────────────────────
function renderVaultTiers(state) {
  const ma = state.sbData?.memberAnalytics ?? {};
  const total = ma.total ?? 0;
  const tierCounts = ma.tierCounts ?? {};

  const tierBarsHtml = TIER_NAMES.map((name, i) => {
    const count = tierCounts[i] ?? 0;
    const share = pct(count, total);
    const barW = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
    const color = TIER_COLORS[i];
    return `<div style="margin-bottom:.65rem;">
      <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:2px;">
        <span style="color:${color};font-weight:600;">${name}</span>
        <span style="color:var(--muted);">${fmt(count)} <span style="color:var(--muted);font-size:.75rem;">(${share})</span></span>
      </div>
      <div style="background:var(--surface2);border-radius:3px;height:8px;">
        <div style="width:${barW}%;height:8px;background:${color};border-radius:3px;"></div>
      </div>
    </div>`;
  }).join("");

  const tableRows = TIER_NAMES.map((name, i) => {
    const count = tierCounts[i] ?? 0;
    const color = TIER_COLORS[i];
    return `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:.4rem .5rem;"><span style="color:${color};font-weight:600;font-size:.82rem;">${name}</span></td>
      <td style="padding:.4rem .5rem;color:var(--muted);font-size:.82rem;">${TIER_PTS[i]}</td>
      <td style="padding:.4rem .5rem;color:var(--fg);text-align:right;font-size:.82rem;">${fmt(count)}</td>
      <td style="padding:.4rem .5rem;color:var(--muted);text-align:right;font-size:.82rem;">${pct(count, total)}</td>
    </tr>`;
  }).join("");

  const tableHtml = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Tier</th>
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Min Points</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);font-size:.8rem;">Count</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);font-size:.8rem;">Share</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>`;

  const ptsDist = ma.ptsDist ?? [];
  const ptsHtml = bars(ptsDist, "count", "range", "var(--gold)", true, total);

  return twoCol(
    panel("Tier Progress Bars", tierBarsHtml),
    panel("Tier Table", tableHtml)
  ) + panel("Points Distribution", ptsHtml);
}

// ── Tab: VaultSparked ─────────────────────────────────────────────────────────
function renderVaultSparked(state) {
  const ma = state.sbData?.memberAnalytics ?? {};
  const total = ma.total ?? 0;
  const vsCount = ma.vsCount ?? 0;
  const avgPts = ma.avgPoints ?? 0;
  const vsAvgPts = ma.vsAvgPoints ?? 0;
  const convRate = total > 0 ? pct(vsCount, total) : "0.0%";
  const mrr = (vsCount * 4.99).toFixed(2);
  const arr = (vsCount * 4.99 * 12).toFixed(2);
  const revPerMember = total > 0 ? ((vsCount * 4.99) / total).toFixed(2) : "0.00";

  const vitals = vitalsStrip([
    { label: "VaultSparked Members", value: fmt(vsCount),           color: "var(--gold)" },
    { label: "Conv. Rate",           value: convRate,               color: "var(--purple)" },
    { label: "MRR",                  value: `$${mrr}`,              color: "var(--green)", sub: "$4.99 × VS+ count" },
    { label: "ARR",                  value: `$${arr}`,              color: "var(--green)", sub: "MRR × 12" },
    { label: "Rev / Member",         value: `$${revPerMember}`,     color: "var(--cyan)", sub: "MRR ÷ total members" },
    { label: "Avg Pts (VS+ vs All)", value: `${fmt(vsAvgPts)} / ${fmt(avgPts)}`, color: "var(--gold)" },
  ], 3);

  const vsMembers = (ma.vsMembers ?? []).slice(0, 20);
  const vsRows = vsMembers.map((m, i) => {
    const pts = m.points ?? 0;
    const tierIdx = getTierIndex(pts);
    const tierName = TIER_NAMES[tierIdx] ?? "—";
    const tierColor = TIER_COLORS[tierIdx] ?? "var(--muted)";
    const joinedAgo = m.joinedAt ? Math.floor((Date.now() - new Date(m.joinedAt).getTime()) / 86400000) : "—";
    return `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:.4rem .5rem;color:var(--muted);font-size:.8rem;">${i + 1}</td>
      <td style="padding:.4rem .5rem;color:var(--gold);font-size:.8rem;font-weight:600;">${m.username ?? "—"}</td>
      <td style="padding:.4rem .5rem;color:var(--fg);text-align:right;font-size:.8rem;">${fmt(pts)}</td>
      <td style="padding:.4rem .5rem;font-size:.8rem;"><span style="color:${tierColor};">${tierName}</span></td>
      <td style="padding:.4rem .5rem;color:var(--muted);text-align:right;font-size:.8rem;">${typeof joinedAgo === "number" ? joinedAgo + "d ago" : joinedAgo}</td>
    </tr>`;
  }).join("");

  const vsTable = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">#</th>
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Username</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);font-size:.8rem;">Points</th>
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Rank</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);font-size:.8rem;">Joined</th>
      </tr></thead>
      <tbody>${vsRows || `<tr><td colspan="5" style="padding:.75rem;color:var(--muted);text-align:center;">No VaultSparked members yet.</td></tr>`}</tbody>
    </table>
  </div>`;

  return vitals + panel("VaultSparked Members", vsTable);
}

// ── Tab: Journal ──────────────────────────────────────────────────────────────
function renderJournal(state) {
  const jv = state.sbData?.journalViews ?? {};

  const totalReads = jv.total ?? 0;
  const reads30 = jv.reads30 ?? 0;
  const articles = (jv.articles ?? []);
  const articleCount = articles.length;

  const vitals = vitalsStrip([
    { label: "Total Reads",     value: fmt(totalReads), color: "var(--cyan)" },
    { label: "Reads 30d",       value: fmt(reads30),    color: "var(--blue)" },
    { label: "Articles Tracked",value: fmt(articleCount),color: "var(--muted)" },
  ], 3);

  const maxViews = Math.max(...articles.map(a => a.views ?? 0), 1);
  const articleRows = articles.map(a => {
    const slug = (a.slug ?? "—").replace(/-/g, " ");
    const allTime = a.views ?? 0;
    const last30 = a.views30 ?? 0;
    const barW = ((allTime / maxViews) * 100).toFixed(1);
    return `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:.4rem .5rem;color:var(--fg);font-size:.8rem;text-transform:capitalize;">${slug}</td>
      <td style="padding:.4rem .5rem;color:var(--cyan);text-align:right;font-size:.8rem;">${fmt(allTime)}</td>
      <td style="padding:.4rem .5rem;color:var(--blue);text-align:right;font-size:.8rem;">${fmt(last30)}</td>
      <td style="padding:.4rem .5rem;min-width:120px;">
        <div style="background:var(--surface2);border-radius:3px;height:6px;">
          <div style="width:${barW}%;height:6px;background:var(--cyan);border-radius:3px;"></div>
        </div>
      </td>
    </tr>`;
  }).join("");

  const articleTable = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Article</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);font-size:.8rem;">All-Time Views</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);font-size:.8rem;">30d Views</th>
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Relative</th>
      </tr></thead>
      <tbody>${articleRows || `<tr><td colspan="4" style="padding:.75rem;color:var(--muted);text-align:center;">No journal data available.</td></tr>`}</tbody>
    </table>
  </div>`;

  return vitals + panel("Articles", articleTable);
}

// ── Tab: Site Health ──────────────────────────────────────────────────────────
function renderSiteHealth(state) {
  const gh = state.ghData ?? {};
  const workflows = gh.workflows ?? [];
  const repos = gh.repos ?? [];

  const ciRows = workflows.map(w => {
    const ok = w.status === "success" || w.conclusion === "success";
    const fail = w.status === "failure" || w.conclusion === "failure";
    const color = ok ? "var(--green)" : fail ? "var(--red)" : "var(--muted)";
    const icon = ok ? "✓" : fail ? "✗" : "·";
    return `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:.4rem .5rem;color:var(--fg);font-size:.8rem;">${w.repo ?? "—"}</td>
      <td style="padding:.4rem .5rem;text-align:center;">
        <span style="color:${color};font-weight:700;font-size:1rem;">${icon}</span>
      </td>
      <td style="padding:.4rem .5rem;color:var(--muted);font-size:.8rem;">${w.name ?? "—"}</td>
      <td style="padding:.4rem .5rem;color:var(--muted);font-size:.8rem;">${timeAgo(w.updatedAt ?? w.updated_at)}</td>
      <td style="padding:.4rem .5rem;font-size:.8rem;">
        ${w.url ? `<a href="${w.url}" target="_blank" style="color:var(--cyan);text-decoration:none;">View</a>` : "—"}
      </td>
    </tr>`;
  }).join("");

  const ciTable = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Repo</th>
        <th style="padding:.4rem .5rem;text-align:center;color:var(--muted);font-size:.8rem;">Status</th>
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Workflow</th>
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Updated</th>
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Link</th>
      </tr></thead>
      <tbody>${ciRows || `<tr><td colspan="5" style="padding:.75rem;color:var(--muted);text-align:center;">No CI data available.</td></tr>`}</tbody>
    </table>
  </div>`;

  const repoRows = repos.map(r => {
    return `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:.4rem .5rem;color:var(--fg);font-size:.8rem;">${r.name ?? "—"}</td>
      <td style="padding:.4rem .5rem;color:var(--red);text-align:right;font-size:.8rem;">${r.openIssues ?? r.open_issues_count ?? 0}</td>
      <td style="padding:.4rem .5rem;color:var(--gold);text-align:right;font-size:.8rem;">${r.openPRs ?? r.open_prs ?? 0}</td>
      <td style="padding:.4rem .5rem;color:var(--muted);font-size:.8rem;">${timeAgo(r.pushedAt ?? r.pushed_at)}</td>
    </tr>`;
  }).join("");

  const repoTable = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Repo</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);font-size:.8rem;">Open Issues</th>
        <th style="padding:.4rem .5rem;text-align:right;color:var(--muted);font-size:.8rem;">Open PRs</th>
        <th style="padding:.4rem .5rem;text-align:left;color:var(--muted);font-size:.8rem;">Last Commit</th>
      </tr></thead>
      <tbody>${repoRows || `<tr><td colspan="4" style="padding:.75rem;color:var(--muted);text-align:center;">No repo data available.</td></tr>`}</tbody>
    </table>
  </div>`;

  const links = [
    { label: "GitHub Actions",       url: "https://github.com/vaultsparkstudios?tab=repositories" },
    { label: "Supabase Dashboard",   url: "https://supabase.com/dashboard" },
    { label: "Google Search Console",url: "https://search.google.com/search-console" },
    { label: "Lighthouse",           url: "https://pagespeed.web.dev/" },
    { label: "Live Site",            url: "https://vaultsparkstudios.github.io" },
  ];

  const quickLinks = links.map(l =>
    `<a href="${l.url}" target="_blank" style="display:inline-block;padding:.4rem .85rem;border:1px solid var(--border);border-radius:6px;color:var(--cyan);font-size:.82rem;text-decoration:none;margin:.25rem;">${l.label}</a>`
  ).join("");

  return panel("CI Status", ciTable) +
    panel("Repo Health", repoTable) +
    panel("Quick Links", `<div style="display:flex;flex-wrap:wrap;gap:.25rem;">${quickLinks}</div>`);
}

// ── Tier index helper ─────────────────────────────────────────────────────────
function getTierIndex(points) {
  const thresholds = [0, 100, 500, 1000, 2500, 5000, 7500, 10000, 15000];
  let idx = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (points >= thresholds[i]) idx = i;
  }
  return idx;
}

// ── Main render ───────────────────────────────────────────────────────────────
export function renderAnalyticsView(state) {
  const tabs = [
    { id: "overview",     label: "Overview" },
    { id: "traffic",      label: "Traffic" },
    { id: "members",      label: "Members" },
    { id: "vault-tiers",  label: "Vault Tiers" },
    { id: "vaultsparked", label: "VaultSparked" },
    { id: "journal",      label: "Journal" },
    { id: "site-health",  label: "Site Health" },
  ];

  let content = "";
  if (_activeTab === "overview")     content = renderOverview(state);
  else if (_activeTab === "traffic")      content = renderTraffic(state);
  else if (_activeTab === "members")      content = renderMembers(state);
  else if (_activeTab === "vault-tiers")  content = renderVaultTiers(state);
  else if (_activeTab === "vaultsparked") content = renderVaultSparked(state);
  else if (_activeTab === "journal")      content = renderJournal(state);
  else if (_activeTab === "site-health")  content = renderSiteHealth(state);

  return `<div class="main-panel" style="padding:1.25rem;">
    <div class="view-header" style="margin-bottom:1.25rem;">
      <h1 style="margin:0 0 .2rem;font-size:1.4rem;font-weight:700;color:var(--fg);">Site Analytics</h1>
      <p style="margin:0;font-size:.85rem;color:var(--muted);">First-party traffic · Vault members · Tiers · Revenue · Health</p>
    </div>
    ${tabBar(tabs)}
    <div id="analytics-tab-content">${content}</div>
  </div>`;
}

// ── Event binding ─────────────────────────────────────────────────────────────
export function bindAnalyticsEvents(config) {
  const btns = document.querySelectorAll("[data-analytics-tab]");
  btns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      _activeTab = btn.getAttribute("data-analytics-tab");
      rerender();
    });
  });
}
