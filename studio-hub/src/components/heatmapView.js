// Heatmap View — grid of all projects × key metrics, color-coded by health.
import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject, getGrade } from "../utils/projectScoring.js";
import { fmt, daysSince, commitVelocity } from "../utils/helpers.js";

function cell(value, label, colorFn) {
  const { bg, text } = colorFn(value);
  return `
    <td style="padding:7px 10px; text-align:center; background:${bg}; border:1px solid rgba(255,255,255,0.04); transition:filter 0.1s;">
      <span style="font-size:12px; font-weight:700; color:${text};">${label}</span>
    </td>
  `;
}

export function renderHeatmapView(state) {
  const { ghData = {}, sbData = null, socialData = null, scoreHistory = [], heatmapSortKey = null, heatmapSortAsc = false, heatmapHiddenCols = new Set() } = state;

  const metrics = [
    { key: "score",    label: "Score" },
    { key: "grade",    label: "Grade" },
    { key: "ci",       label: "CI" },
    { key: "issues",   label: "Issues" },
    { key: "prs",      label: "PRs" },
    { key: "velocity", label: "Commits/wk" },
    { key: "staleness",label: "Last Push" },
    { key: "sessions", label: "Sessions 7d" },
    { key: "stars",    label: "Stars" },
    { key: "forks",    label: "Forks" },
  ];

  const rows = PROJECTS.map((p) => {
    const d = ghData[p.githubRepo];
    const scoring = scoreProject(p, d || null, sbData, socialData);
    const ci = d?.ciRuns?.[0];
    const vel = commitVelocity(d?.commits);
    const stale = daysSince(d?.commits?.[0]?.date);
    const sessions = sbData?.sessions?.[p.supabaseGameSlug]?.week ?? null;
    return {
      p, scoring, d,
      ci: !ci ? null : ci.conclusion === "success" ? true : ci.conclusion === "failure" ? false : null,
      issues: d?.repo?.openIssues ?? null,
      prs: d?.prs?.length ?? null,
      velocity: d ? vel.thisWeek : null,
      stale,
      sessions,
      stars: d?.repo?.stars ?? null,
      forks: d?.repo?.forks ?? null,
    };
  });

  // Score sparklines from history for each project
  function sparkline(projectId) {
    const pts = scoreHistory.map((h) => h.scores?.[projectId]).filter((v) => v != null);
    if (pts.length < 2) return "";
    const trend = pts[pts.length - 1] > pts[0] ? "#6ee7b7" : pts[pts.length - 1] < pts[0] ? "#f87171" : "#64748b";
    const W = 48, H = 16;
    const min = Math.min(...pts), max = Math.max(...pts, min + 1);
    const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
    const ys = pts.map((v) => H - ((v - min) / (max - min)) * H);
    const polyPts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    return `<svg width="${W}" height="${H}" style="display:inline-block; vertical-align:middle; margin-left:4px; overflow:visible;">
      <polyline points="${polyPts}" fill="none" stroke="${trend}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
    </svg>`;
  }

  // Apply sort
  let sortedRows = [...rows];
  if (heatmapSortKey) {
    sortedRows.sort((a, b) => {
      let av = a[heatmapSortKey], bv = b[heatmapSortKey];
      // Special cases
      if (heatmapSortKey === "score") { av = a.scoring.total; bv = b.scoring.total; }
      if (heatmapSortKey === "grade") { av = a.scoring.total; bv = b.scoring.total; } // same as score
      if (heatmapSortKey === "ci") { av = a.ci === true ? 2 : a.ci === false ? 0 : 1; bv = b.ci === true ? 2 : b.ci === false ? 0 : 1; }
      if (av === null || av === undefined || av === Infinity) av = -Infinity;
      if (bv === null || bv === undefined || bv === Infinity) bv = -Infinity;
      return heatmapSortAsc ? (av > bv ? 1 : av < bv ? -1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
    });
  }

  const totalProjects = rows.length;
  const passingCI = rows.filter((r) => r.ci === true).length;
  const failingCI = rows.filter((r) => r.ci === false).length;
  const avgScore  = Math.round(rows.reduce((s, r) => s + r.scoring.total, 0) / totalProjects);

  const visibleMetrics = metrics.filter((m) => !heatmapHiddenCols.has(m.key));

  return `
    <div class="main-panel">
      <div class="view-header">
        <div>
          <div class="view-title">Project Heatmap</div>
          <div class="view-subtitle">${totalProjects} projects · ${passingCI} CI passing · ${failingCI} CI failing · avg score ${avgScore}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button id="heatmap-export-csv" style="font-size:11px; padding:5px 12px; background:rgba(110,231,183,0.1); border:1px solid rgba(110,231,183,0.25); border-radius:8px; color:var(--green); cursor:pointer;">↓ Export CSV</button>
        </div>
      </div>

      <div class="panel" style="margin-bottom:24px; overflow-x:auto;">
        <div class="panel-header">
          <span class="panel-title">ALL PROJECTS × METRICS</span>
          <span style="font-size:11px; color:var(--muted);">Green = healthy · Gold = warning · Red = critical</span>
        </div>
        <div style="padding:10px 14px 2px;">
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
            ${metrics.map((m) => `
              <button data-toggle-col="${m.key}"
                style="font-size:10px; padding:3px 8px; border-radius:6px; cursor:pointer; border:1px solid;
                       background:${heatmapHiddenCols.has(m.key) ? "transparent" : "rgba(99,179,237,0.12)"};
                       border-color:${heatmapHiddenCols.has(m.key) ? "rgba(255,255,255,0.12)" : "rgba(99,179,237,0.3)"};
                       color:${heatmapHiddenCols.has(m.key) ? "var(--muted)" : "var(--cyan)"}; transition:all 0.15s;">${m.label}</button>
            `).join("")}
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; min-width:700px;">
            <thead>
              <tr style="border-bottom:2px solid var(--border);">
                <th style="text-align:left; padding:10px 14px; font-size:10px; font-weight:700;
                           letter-spacing:0.08em; color:var(--muted); white-space:nowrap; min-width:140px;">PROJECT</th>
                ${visibleMetrics.map((m) => {
                  const isActive = heatmapSortKey === m.key;
                  const icon = isActive ? (heatmapSortAsc ? " ↑" : " ↓") : " ↕";
                  return `
                    <th data-sort-col="${m.key}" style="text-align:center; padding:8px 10px; font-size:10px; font-weight:700;
                       letter-spacing:0.08em; color:${isActive ? "var(--cyan)" : "var(--muted)"}; white-space:nowrap; cursor:pointer;
                       user-select:none; transition:color 0.1s;"
                       title="Sort by ${m.label}">${m.label}<span style="opacity:0.5;">${icon}</span></th>
                  `;
                }).join("")}
              </tr>
            </thead>
            <tbody>
              ${sortedRows.map(({ p, scoring, d, ci, issues, prs, velocity, stale, sessions, stars, forks }) => `
                <tr data-view="project:${p.id}" style="cursor:pointer; transition:filter 0.1s;"
                    onmouseover="this.style.filter='brightness(1.15)'"
                    onmouseout="this.style.filter=''">
                  <td style="padding:8px 14px; border-bottom:1px solid rgba(255,255,255,0.04); white-space:nowrap;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <div style="width:8px; height:8px; border-radius:50%; background:${p.color}; flex-shrink:0;"></div>
                      <span style="font-size:12px; font-weight:600; color:var(--text);">${p.name}</span>
                      ${sparkline(p.id)}
                    </div>
                    <div style="font-size:10px; color:var(--muted); margin-top:2px; padding-left:16px;">${p.type} · ${p.statusLabel}</div>
                  </td>
                  ${heatmapHiddenCols.has("score") ? "" : cell(scoring.total, scoring.total, (v) => ({
                    bg: v >= 80 ? "rgba(110,231,183,0.12)" : v >= 60 ? "rgba(255,200,116,0.10)" : "rgba(248,113,113,0.10)",
                    text: scoring.gradeColor,
                  }))}
                  ${heatmapHiddenCols.has("grade") ? "" : cell(scoring.grade, scoring.grade, () => ({ bg: "transparent", text: scoring.gradeColor }))}
                  ${heatmapHiddenCols.has("ci") ? "" : cell(ci, ci === null ? "—" : ci ? "PASS" : "FAIL", (v) => ({
                    bg: v === null ? "transparent" : v ? "rgba(110,231,183,0.10)" : "rgba(248,113,113,0.14)",
                    text: v === null ? "var(--muted)" : v ? "var(--green)" : "var(--red)",
                  }))}
                  ${heatmapHiddenCols.has("issues") ? "" : cell(issues, issues ?? "—", (v) => ({
                    bg: v === null ? "transparent" : v > 20 ? "rgba(248,113,113,0.14)" : v > 8 ? "rgba(255,200,116,0.10)" : "rgba(110,231,183,0.08)",
                    text: v === null ? "var(--muted)" : v > 20 ? "var(--red)" : v > 8 ? "var(--gold)" : "var(--green)",
                  }))}
                  ${heatmapHiddenCols.has("prs") ? "" : cell(prs, prs ?? "—", (v) => ({
                    bg: v > 3 ? "rgba(255,200,116,0.10)" : "transparent",
                    text: v > 3 ? "var(--gold)" : "var(--muted)",
                  }))}
                  ${heatmapHiddenCols.has("velocity") ? "" : cell(velocity, velocity ?? "—", (v) => ({
                    bg: v === null ? "transparent" : v >= 5 ? "rgba(110,231,183,0.12)" : v >= 2 ? "rgba(255,200,116,0.08)" : v === 0 ? "rgba(248,113,113,0.08)" : "transparent",
                    text: v === null ? "var(--muted)" : v >= 5 ? "var(--green)" : v >= 2 ? "var(--gold)" : v === 0 ? "var(--red)" : "var(--muted)",
                  }))}
                  ${heatmapHiddenCols.has("staleness") ? "" : cell(stale, stale === Infinity ? "—" : stale < 1 ? "today" : `${Math.floor(stale)}d`, (v) => ({
                    bg: v > 30 ? "rgba(248,113,113,0.10)" : v > 14 ? "rgba(255,200,116,0.08)" : v < 3 ? "rgba(110,231,183,0.10)" : "transparent",
                    text: v > 30 ? "var(--red)" : v > 14 ? "var(--gold)" : v < 3 ? "var(--green)" : "var(--muted)",
                  }))}
                  ${heatmapHiddenCols.has("sessions") ? "" : cell(sessions, sessions ?? "—", (v) => ({
                    bg: v > 100 ? "rgba(110,231,183,0.12)" : v > 10 ? "rgba(255,200,116,0.08)" : "transparent",
                    text: v > 100 ? "var(--green)" : v > 10 ? "var(--gold)" : "var(--muted)",
                  }))}
                  ${heatmapHiddenCols.has("stars") ? "" : cell(stars, fmt(stars), (v) => ({
                    bg: v > 50 ? "rgba(110,231,183,0.10)" : "transparent",
                    text: v > 50 ? "var(--cyan)" : "var(--muted)",
                  }))}
                  ${heatmapHiddenCols.has("forks") ? "" : cell(forks, fmt(forks), (v) => ({
                    bg: v > 10 ? "rgba(105,179,255,0.10)" : "transparent",
                    text: v > 10 ? "var(--blue)" : "var(--muted)",
                  }))}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
