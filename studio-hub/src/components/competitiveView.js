// src/components/competitiveView.js
// #24 Competitive GitHub Tracker — star/fork tracking for competitor repos.

const COMPETITORS_KEY = "vshub_competitors";
const BASELINE_KEY    = "vshub_competitor_baseline";

export function loadCompetitorList() {
  try { return JSON.parse(localStorage.getItem(COMPETITORS_KEY) || "[]"); } catch { return []; }
}

export function saveCompetitorList(repos) {
  try { localStorage.setItem(COMPETITORS_KEY, JSON.stringify(repos)); } catch {}
}

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

  if (repos.length === 0) {
    return `
      <div style="padding:24px 28px; max-width:900px; margin:0 auto;">
        ${headerHtml}
        ${editorHtml}
        <p style="color:var(--muted); font-size:13px;">No competitor repos configured yet. Add some above to get started.</p>
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

  return `
    <div style="padding:24px 28px; max-width:900px; margin:0 auto;">
      ${headerHtml}
      ${editorHtml}
      ${tableHtml}
    </div>`;
}
