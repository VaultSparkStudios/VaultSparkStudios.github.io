// src/components/competitiveView.js
// #24 Competitive GitHub Tracker — star/fork tracking for competitor repos.

import { safeGetJSON, safeSetJSON, renderEmptyState } from "../utils/helpers.js";

const COMPETITORS_KEY = "vshub_competitors";
const BASELINE_KEY    = "vshub_competitor_baseline";
const DISMISSED_KEY   = "vshub_dismissed_competitors";

export function loadDismissedCompetitors() { return safeGetJSON(DISMISSED_KEY, []); }
export function saveDismissedCompetitors(list) { safeSetJSON(DISMISSED_KEY, list); }
export function loadCompetitorList() { return safeGetJSON(COMPETITORS_KEY, []); }
export function saveCompetitorList(repos) { safeSetJSON(COMPETITORS_KEY, repos); }

function getBaseline() {
  try { return JSON.parse(sessionStorage.getItem(BASELINE_KEY) || "{}"); } catch { return {}; }
}

function setBaseline(data) {
  try { sessionStorage.setItem(BASELINE_KEY, JSON.stringify(data)); } catch {}
}

function deltaArrow(diff) {
  if (diff == null) return `<span style="color:var(--muted)">—</span>`;
  if (diff > 0)  return `<span style="color:var(--green)">+${diff.toLocaleString()}</span>`;
  if (diff < 0)  return `<span style="color:var(--red)">${diff.toLocaleString()}</span>`;
  return `<span style="color:var(--muted)">0</span>`;
}

function timeAgoShort(dateStr) {
  if (!dateStr) return "—";
  const ms = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(ms / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30)  return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

// Returns alert objects for repos that gained > ALERT_THRESHOLD stars this session.
const STAR_ALERT_THRESHOLD = 50;
export function getCompetitorAlerts(competitorData) {
  if (!competitorData || !competitorData.length) return [];
  const baseline = getBaseline();
  const alerts = [];
  for (const repo of competitorData) {
    if (repo.error || repo.stars == null) continue;
    const baseStars = baseline[repo.full_name];
    if (baseStars == null) continue;
    const delta = repo.stars - baseStars;
    if (delta >= STAR_ALERT_THRESHOLD) {
      alerts.push({ repo: repo.full_name, delta, stars: repo.stars });
    }
  }
  return alerts;
}

export function renderCompetitiveView(state) {
  const { competitorData = null, competitorLoading = false } = state;
  const repos = loadCompetitorList();
  const baseline = getBaseline();

  const headerHtml = `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap;">
      <h2 style="margin:0; font-size:18px;">Competitive Tracker</h2>
      <span style="font-size:11px; color:var(--muted); margin-left:auto;">
        Stars &amp; forks updated on each view — session delta shown
      </span>
      <button class="btn-secondary" id="competitor-discover-btn" style="font-size:11px; padding:4px 10px;${state.discoveryLoading ? " opacity:0.5; pointer-events:none;" : ""}">
        ${state.discoveryLoading ? "Discovering..." : "Discover"}
      </button>
      <button class="btn-secondary" id="competitor-edit-btn" style="font-size:11px; padding:4px 10px;">
        ${repos.length ? "Edit List" : "Add Repos"}
      </button>
    </div>`;

  // Config panel (shown when list is empty OR edit button clicked — toggled via state.competitorEditing)
  const showEditor = state.competitorEditing || repos.length === 0;
  const editorHtml = showEditor ? `
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:16px; margin-bottom:20px;">
      <p style="margin:0 0 10px; font-size:12px; color:var(--muted);">
        Enter one <code>owner/repo</code> per line (e.g. <code>vercel/next.js</code>). GitHub token required for best rate limits.
      </p>
      <textarea id="competitor-list-input" rows="6" style="width:100%; box-sizing:border-box; background:var(--bg); border:1px solid var(--border); color:var(--text); padding:8px; border-radius:4px; font-family:monospace; font-size:12px; resize:vertical;"
        placeholder="owner/repo&#10;owner/repo">${repos.join("\n")}</textarea>
      <div style="margin-top:8px; display:flex; gap:8px;">
        <button class="btn-primary" id="competitor-save-btn" style="font-size:12px;">Save &amp; Fetch</button>
        ${repos.length ? `<button class="btn-secondary" id="competitor-cancel-btn" style="font-size:12px;">Cancel</button>` : ""}
      </div>
    </div>` : "";

  if (repos.length === 0 && !state.discoveredCompetitors?.length) {
    return `
      <div style="padding:24px 28px; max-width:900px; margin:0 auto;">
        ${headerHtml}
        ${editorHtml}
        ${renderEmptyState("\uD83D\uDD0D", "No Competitors Tracked", "Click Discover above to auto-find competitors from your project profiles, or add repos manually.")}
      </div>`;
  }

  let tableHtml = "";
  if (competitorLoading) {
    tableHtml = `<p style="color:var(--muted); font-size:13px; padding:20px 0;">Loading competitor data…</p>`;
  } else if (!competitorData || competitorData.length === 0) {
    tableHtml = `<p style="color:var(--muted); font-size:13px; padding:20px 0;">No data loaded yet — data fetches automatically when you open this view.</p>`;
  } else {
    // Sort by stars desc
    const sorted = [...competitorData].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));

    const rows = sorted.map((repo) => {
      const starDelta = baseline[repo.full_name] != null ? repo.stars - baseline[repo.full_name] : null;
      const statusDot = repo.error
        ? `<span title="${repo.error}" style="color:var(--red)">⚠</span>`
        : `<span style="color:var(--green)">●</span>`;

      return `
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:10px 12px; white-space:nowrap;">
            ${statusDot}
            <a href="https://github.com/${repo.full_name}" target="_blank" rel="noopener"
               style="color:var(--cyan); text-decoration:none; margin-left:6px; font-weight:500;">
              ${repo.full_name}
            </a>
          </td>
          <td style="padding:10px 12px; text-align:right; font-variant-numeric:tabular-nums;">
            ${repo.error ? "—" : (repo.stars ?? "—").toLocaleString()}
          </td>
          <td style="padding:10px 12px; text-align:right; font-variant-numeric:tabular-nums; font-size:12px;">
            ${repo.error ? "—" : deltaArrow(starDelta)}
          </td>
          <td style="padding:10px 12px; text-align:right; font-variant-numeric:tabular-nums;">
            ${repo.error ? "—" : (repo.forks ?? "—").toLocaleString()}
          </td>
          <td style="padding:10px 12px; color:var(--muted); font-size:12px;">
            ${repo.language || "—"}
          </td>
          <td style="padding:10px 12px; color:var(--muted); font-size:12px; white-space:nowrap;">
            ${timeAgoShort(repo.pushedAt)}
          </td>
        </tr>`;
    }).join("");

    tableHtml = `
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="border-bottom:2px solid var(--border); text-align:left; color:var(--muted); font-size:11px; letter-spacing:0.05em; text-transform:uppercase;">
              <th style="padding:8px 12px; font-weight:500;">Repository</th>
              <th style="padding:8px 12px; text-align:right; font-weight:500;">Stars</th>
              <th style="padding:8px 12px; text-align:right; font-weight:500;">Δ Session</th>
              <th style="padding:8px 12px; text-align:right; font-weight:500;">Forks</th>
              <th style="padding:8px 12px; font-weight:500;">Language</th>
              <th style="padding:8px 12px; font-weight:500;">Last Push</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="font-size:11px; color:var(--muted); margin-top:10px;">
        Last fetched: ${state.competitorFetchedAt ? new Date(state.competitorFetchedAt).toLocaleTimeString() : "—"}
        &nbsp;·&nbsp;
        <button class="btn-secondary" id="competitor-refresh-btn" style="font-size:11px; padding:3px 8px;">Refresh</button>
      </p>`;
  }

  // ── Discovered competitors section ──
  const discovered = state.discoveredCompetitors || [];
  let discoveryHtml = "";

  if (discovered.length > 0) {
    const discRows = discovered.map((repo) => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:10px 12px; white-space:nowrap;">
          <a href="https://github.com/${repo.full_name}" target="_blank" rel="noopener"
             style="color:var(--cyan); text-decoration:none; font-weight:500;">
            ${repo.full_name}
          </a>
          ${repo.description ? `<div style="font-size:10px; color:var(--muted); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${repo.description}</div>` : ""}
        </td>
        <td style="padding:10px 12px; text-align:right; font-variant-numeric:tabular-nums;">
          ${(repo.stars ?? 0).toLocaleString()}
        </td>
        <td style="padding:10px 12px; text-align:right; font-variant-numeric:tabular-nums;">
          ${(repo.forks ?? 0).toLocaleString()}
        </td>
        <td style="padding:10px 12px; color:var(--muted); font-size:12px;">
          ${repo.language || "—"}
        </td>
        <td style="padding:10px 12px; color:var(--muted); font-size:11px;">
          ${(repo.matchedProjects || []).join(", ") || "—"}
        </td>
        <td style="padding:10px 12px; white-space:nowrap;">
          <button data-track-repo="${repo.full_name}" class="btn-primary" style="font-size:10px; padding:3px 8px; margin-right:4px;">+ Track</button>
          <button data-dismiss-repo="${repo.full_name}" class="btn-secondary" style="font-size:10px; padding:3px 8px;">Dismiss</button>
        </td>
      </tr>`).join("");

    discoveryHtml = `
      <div style="margin-top:28px; border-top:1px solid var(--border); padding-top:20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
          <h3 style="margin:0; font-size:15px; font-weight:700;">Suggested Competitors</h3>
          <span style="font-size:10px; background:rgba(255,255,255,0.08); border:1px solid var(--border); border-radius:10px; padding:2px 8px; color:var(--muted);">
            ${discovered.length} found
          </span>
        </div>
        <div style="font-size:11px; color:var(--muted); margin-bottom:12px;">
          Auto-discovered from your project profiles via GitHub Search. Click <strong>+ Track</strong> to add to your tracked list.
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="border-bottom:2px solid var(--border); text-align:left; color:var(--muted); font-size:11px; letter-spacing:0.05em; text-transform:uppercase;">
                <th style="padding:8px 12px; font-weight:500;">Repository</th>
                <th style="padding:8px 12px; text-align:right; font-weight:500;">Stars</th>
                <th style="padding:8px 12px; text-align:right; font-weight:500;">Forks</th>
                <th style="padding:8px 12px; font-weight:500;">Language</th>
                <th style="padding:8px 12px; font-weight:500;">Matched To</th>
                <th style="padding:8px 12px; font-weight:500;">Actions</th>
              </tr>
            </thead>
            <tbody>${discRows}</tbody>
          </table>
        </div>
        <p style="font-size:10px; color:var(--muted); margin-top:10px;">
          ${state.discoveryFetchedAt ? `Last discovered: ${new Date(state.discoveryFetchedAt).toLocaleTimeString()}` : ""}
        </p>
      </div>`;
  } else if (state.discoveryLoading) {
    discoveryHtml = `
      <div style="margin-top:28px; border-top:1px solid var(--border); padding-top:20px; text-align:center;">
        <div style="font-size:13px; color:var(--muted); padding:20px 0;">Searching GitHub for competitors based on your project profiles...</div>
      </div>`;
  }

  return `
    <div style="padding:24px 28px; max-width:1000px; margin:0 auto;">
      ${headerHtml}
      ${editorHtml}
      ${tableHtml}
      ${discoveryHtml}
    </div>`;
}
