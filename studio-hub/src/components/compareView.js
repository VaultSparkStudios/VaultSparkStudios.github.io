import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject, getGrade } from "../utils/projectScoring.js";
import { timeAgo, fmt } from "../utils/helpers.js";

const COMPARE_KEY = "vshub_compare";

function loadCompareState() {
  try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || "{}"); } catch { return {}; }
}

function saveCompareState(state) {
  try { localStorage.setItem(COMPARE_KEY, JSON.stringify(state)); } catch {}
}

const COL_COLORS = ["#69b3ff", "#7ae7c7", "#ffc874"];

function renderProjectColumn(project, ghData, sbData, socialData, colColor) {
  if (!project) {
    return `
      <div style="flex:1; min-width:180px; background:var(--panel-2); border:1px solid var(--border); border-radius:var(--radius); padding:24px; text-align:center; color:var(--muted); font-size:13px;">
        Select a project
      </div>
    `;
  }

  const repoData = project.githubRepo ? (ghData[project.githubRepo] || null) : null;
  const scoring  = scoreProject(project, repoData, sbData, socialData);
  const lastCommit = repoData?.commits?.[0];
  const sessions = sbData?.sessions?.[project.supabaseGameSlug];

  const weekMs = 7 * 86400000;
  const now = Date.now();
  let commitsThisWeek = 0, commitsLastWeek = 0;
  for (const c of (repoData?.commits || [])) {
    const age = now - new Date(c.date).getTime();
    if (age < weekMs) commitsThisWeek++;
    else if (age < 2 * weekMs) commitsLastWeek++;
  }

  const rows = [
    { label: "Score",        value: `${scoring.total}/130`, color: scoring.gradeColor },
    { label: "Grade",        value: scoring.grade, color: scoring.gradeColor },
    { label: "Status",       value: project.statusLabel },
    { label: "Type",         value: project.type },
    { label: "CI",           value: repoData?.ciRuns?.[0]?.conclusion || "—" },
    { label: "Open Issues",  value: fmt(repoData?.repo?.openIssues) },
    { label: "Open PRs",     value: fmt(repoData?.prs?.length) },
    { label: "Last Commit",  value: timeAgo(lastCommit?.date) },
    { label: "Commits / wk", value: String(commitsThisWeek) },
    { label: "Commits / prev wk", value: String(commitsLastWeek) },
    { label: "Stars",        value: fmt(repoData?.repo?.stars) },
    { label: "Language",     value: repoData?.repo?.language || "—" },
    { label: "Latest Release", value: repoData?.latestRelease?.tag || "—" },
    { label: "Sessions (7d)", value: fmt(sessions?.week) },
    ...(project.deployedUrl ? [{ label: "Live URL", value: "Yes", color: "var(--green)" }] : []),
  ];

  const pillars = [
    { label: "Dev",    score: scoring.pillars.development.score, max: 30 },
    { label: "Engage", score: scoring.pillars.engagement.score,  max: 25 },
    { label: "Momt",   score: scoring.pillars.momentum.score,    max: 25 },
    { label: "Risk",   score: scoring.pillars.risk.score,        max: 20 },
  ];

  return `
    <div style="flex:1; min-width:180px;">
      <div style="background:var(--panel); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden;">
        <!-- Project header -->
        <div style="background:var(--panel-2); padding:18px 20px; border-bottom:1px solid var(--border);">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
            <div style="width:10px; height:10px; border-radius:50%; background:${project.color}; flex-shrink:0;"></div>
            <div style="font-size:15px; font-weight:700; color:var(--text);">${project.name}</div>
          </div>
          <div style="font-size:11px; color:var(--muted);">${project.description?.slice(0, 60) || ""}${(project.description?.length || 0) > 60 ? "…" : ""}</div>
        </div>

        <!-- Score -->
        <div style="padding:16px 20px; border-bottom:1px solid var(--border); text-align:center;">
          <div style="font-size:40px; font-weight:800; color:${colColor}; line-height:1;">${scoring.total}</div>
          <div style="font-size:18px; font-weight:700; color:${colColor};">${scoring.grade}</div>
        </div>

        <!-- Pillars -->
        <div style="padding:14px 20px; border-bottom:1px solid var(--border);">
          ${pillars.map((p) => {
            const pct = Math.round((p.score / p.max) * 100);
            return `
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                <span style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; min-width:42px;">${p.label}</span>
                <div style="flex:1; height:4px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden;">
                  <div style="width:${pct}%; height:100%; background:${colColor}; border-radius:2px;"></div>
                </div>
                <span style="font-size:10px; color:var(--muted); min-width:28px; text-align:right;">${p.score}/${p.max}</span>
              </div>
            `;
          }).join("")}
        </div>

        <!-- Data rows -->
        <div style="padding:8px 0;">
          ${rows.map((r) => `
            <div style="display:flex; justify-content:space-between; align-items:center;
                        padding:7px 20px; border-bottom:1px solid rgba(255,255,255,0.03); font-size:12px;">
              <span style="color:var(--muted);">${r.label}</span>
              <span style="font-weight:600; color:${r.color || "var(--text)"};">${r.value}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderRadarChart(projects, scorings) {
  const active = projects.filter(Boolean);
  if (active.length < 2) return "";
  const cx = 120, cy = 120, r = 90;
  const axes = [
    { label: "Dev",     max: 30 },
    { label: "Engage",  max: 25 },
    { label: "Momt",    max: 25 },
    { label: "Risk",    max: 20 },
  ];
  const angles = [Math.PI * 1.5, 0, Math.PI * 0.5, Math.PI];
  function pt(idx, val, max) {
    const dist = (val / max) * r;
    return { x: cx + Math.cos(angles[idx]) * dist, y: cy + Math.sin(angles[idx]) * dist };
  }
  function labelPt(idx) {
    const dist = r + 16;
    return { x: cx + Math.cos(angles[idx]) * dist, y: cy + Math.sin(angles[idx]) * dist };
  }
  const gridRings = [0.25, 0.5, 0.75, 1].map((pct) => {
    const pts = axes.map((_, i) => {
      const d = r * pct;
      return `${(cx + Math.cos(angles[i]) * d).toFixed(1)},${(cy + Math.sin(angles[i]) * d).toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
  }).join("");
  const axisLines = axes.map((_, i) => {
    const end = { x: cx + Math.cos(angles[i]) * r, y: cy + Math.sin(angles[i]) * r };
    return `<line x1="${cx}" y1="${cy}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  }).join("");
  const axisLabels = axes.map((ax, i) => {
    const lp = labelPt(i);
    const anchor = i === 1 ? "start" : i === 3 ? "end" : "middle";
    return `<text x="${lp.x.toFixed(1)}" y="${lp.y.toFixed(1)}" fill="rgba(255,255,255,0.4)" font-size="11" font-family="inherit" text-anchor="${anchor}" dominant-baseline="middle">${ax.label}</text>`;
  }).join("");

  const pillarKeys = ["development", "engagement", "momentum", "risk"];
  const polygons = projects.map((proj, ci) => {
    if (!proj) return "";
    const sc = scorings[ci];
    const polyPts = axes.map((ax, i) => {
      const val = sc.pillars[pillarKeys[i]].score;
      const p = pt(i, val, ax.max);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ");
    const fillColors = ["rgba(105,179,255,0.15)", "rgba(122,231,199,0.15)", "rgba(255,200,116,0.15)"];
    return `<polygon points="${polyPts}" fill="${fillColors[ci]}" stroke="${COL_COLORS[ci]}" stroke-width="1.5" stroke-linejoin="round"/>`;
  }).join("");

  return `
    <div style="margin-top:16px; padding:16px 20px; background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:10px;">
      <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Radar Chart</div>
      <div style="display:flex; justify-content:center; align-items:center; gap:24px; flex-wrap:wrap;">
        <svg width="240" height="240" style="overflow:visible;">
          ${gridRings}
          ${axisLines}
          ${polygons}
          ${axisLabels}
        </svg>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${projects.map((proj, ci) => !proj ? "" : `
            <div style="display:flex; align-items:center; gap:8px; font-size:12px;">
              <div style="width:14px; height:3px; background:${COL_COLORS[ci]}; border-radius:2px;"></div>
              <span style="color:var(--text);">${proj.name}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderScoreTrajectory(projects, scorings, scoreHistory) {
  const active = projects.filter(Boolean);
  if (active.length < 1 || scoreHistory.length < 2) return "";

  // Build per-project series with timestamps
  const seriesData = projects.map((proj) => {
    if (!proj) return null;
    const points = [];
    for (const h of scoreHistory) {
      const val = h.scores?.[proj.id];
      if (val != null) points.push({ value: val, ts: h.ts });
    }
    return points.length >= 1 ? points : null;
  });

  // Need at least one project with 2+ data points
  if (seriesData.filter((s) => s && s.length >= 2).length < 1) return "";

  // Chart dimensions — padded for axis labels
  const PAD_L = 36, PAD_R = 12, PAD_T = 8, PAD_B = 24;
  const W = 600, H = 180;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const minY = 0, maxY = 130;

  // Collect all timestamps across all series for a shared x-axis
  const allTs = [];
  for (const s of seriesData) {
    if (!s) continue;
    for (const pt of s) if (!allTs.includes(pt.ts)) allTs.push(pt.ts);
  }
  allTs.sort((a, b) => a - b);
  const tsMin = allTs[0], tsMax = allTs[allTs.length - 1];
  const tsRange = tsMax - tsMin || 1;

  function xPos(ts) { return PAD_L + ((ts - tsMin) / tsRange) * plotW; }
  function yPos(v)  { return PAD_T + plotH - ((v - minY) / (maxY - minY)) * plotH; }

  function fmtDate(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  // Grid lines (horizontal at every 26 pts: 0, 26, 52, 78, 104, 130)
  const yTicks = [0, 26, 52, 78, 104, 130];
  const gridLines = yTicks.map((v) => {
    const y = yPos(v);
    return `<line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
      <text x="${PAD_L - 6}" y="${(y + 3).toFixed(1)}" fill="rgba(255,255,255,0.25)" font-size="9" text-anchor="end" font-family="inherit">${v}</text>`;
  }).join("");

  // X-axis date labels (show up to 6 evenly spaced)
  const labelCount = Math.min(allTs.length, 6);
  const xLabels = [];
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (allTs.length - 1));
    const ts = allTs[idx];
    const x = xPos(ts);
    xLabels.push(`<text x="${x.toFixed(1)}" y="${(H - 2).toFixed(1)}" fill="rgba(255,255,255,0.25)" font-size="9" text-anchor="middle" font-family="inherit">${fmtDate(ts)}</text>`);
  }

  // Render lines + dots per project
  const linesSvg = projects.map((proj, ci) => {
    const pts = seriesData[ci];
    if (!pts || pts.length < 2) return "";
    const color = proj.color || COL_COLORS[ci];
    const polyPts = pts.map((pt) => `${xPos(pt.ts).toFixed(1)},${yPos(pt.value).toFixed(1)}`).join(" ");
    const dots = pts.map((pt, i) => {
      const cx = xPos(pt.ts).toFixed(1);
      const cy = yPos(pt.value).toFixed(1);
      const isLast = i === pts.length - 1;
      const dateStr = new Date(pt.ts).toLocaleDateString();
      return `<circle cx="${cx}" cy="${cy}" r="${isLast ? 4 : 3}" fill="${isLast ? "#fff" : color}" stroke="${isLast ? color : "none"}" stroke-width="${isLast ? 2 : 0}" opacity="${isLast ? 1 : 0.7}"><title>${proj.name}: ${pt.value}/130 — ${dateStr}</title></circle>`;
    }).join("");
    return `<g>
      <polyline points="${polyPts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
      ${dots}
    </g>`;
  }).join("");

  // Legend
  const legend = projects.map((proj, ci) => {
    const pts = seriesData[ci];
    if (!proj || !pts || pts.length < 1) return "";
    const color = proj.color || COL_COLORS[ci];
    const latest = pts[pts.length - 1].value;
    return `
      <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--muted);">
        <div style="width:20px; height:3px; background:${color}; border-radius:2px;"></div>
        <span style="color:${color}; font-weight:600;">${proj.name}</span>
        <span>— latest ${latest}/130</span>
      </div>
    `;
  }).join("");

  return `
    <div style="margin-top:16px; margin-bottom:4px; padding:16px 20px; background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:10px;">
      <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:12px;">Score History Trajectory</div>
      <div style="overflow-x:auto;">
        <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="display:block; min-width:320px;">
          ${gridLines}
          ${xLabels.join("")}
          ${linesSvg}
        </svg>
      </div>
      <div style="display:flex; gap:16px; flex-wrap:wrap; margin-top:10px;">
        ${legend}
      </div>
    </div>
  `;
}

export function renderCompareView(state) {
  const { ghData = {}, sbData = null, socialData = null, scoreHistory = [] } = state;
  const saved = loadCompareState();
  const idA = saved.a || "";
  const idB = saved.b || "";
  const idC = saved.c || "";
  const projA = PROJECTS.find((p) => p.id === idA) || null;
  const projB = PROJECTS.find((p) => p.id === idB) || null;
  const projC = PROJECTS.find((p) => p.id === idC) || null;
  const projects = [projA, projB, projC];

  const makeOptions = (selectedId) => PROJECTS.map((p) =>
    `<option value="${p.id}" ${p.id === selectedId ? "selected" : ""}>${p.name}</option>`
  ).join("");

  const selectStyle = `
    background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:8px;
    color:var(--text); font:inherit; font-size:13px; padding:8px 12px; cursor:pointer; flex:1; min-width:0;
  `;

  const scorings = projects.map((proj) => {
    if (!proj) return null;
    return scoreProject(proj, ghData[proj.githubRepo] || null, sbData, socialData);
  });

  const activeProjects = projects.filter(Boolean);
  const hasEnough = activeProjects.length >= 2;

  // Pillar strength 3-way analysis
  const pillarDefs = [
    { key: "development", label: "Dev",      max: 30 },
    { key: "engagement",  label: "Engage",   max: 25 },
    { key: "momentum",    label: "Momentum", max: 25 },
    { key: "risk",        label: "Risk",     max: 20 },
  ];

  return `
    <div class="main-panel">
      <div class="view-header">
        <div class="view-title">Project Comparison</div>
        <div class="view-subtitle">Compare up to three projects side by side.</div>
      </div>

      <!-- Selectors -->
      <div style="display:flex; gap:10px; margin-bottom:24px; align-items:center; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:140px;">
          <div style="width:10px; height:10px; border-radius:50%; background:${COL_COLORS[0]}; flex-shrink:0;"></div>
          <select id="compare-select-a" style="${selectStyle}">
            <option value="">Project A…</option>
            ${makeOptions(idA)}
          </select>
        </div>
        <button id="compare-swap-btn" title="Rotate A→B→C"
          style="font-size:14px; padding:8px 12px; background:none; border:1px solid var(--border);
                 border-radius:8px; color:var(--muted); cursor:pointer; flex-shrink:0; transition:all 0.1s;"
          onmouseover="this.style.color='var(--cyan)';this.style.borderColor='var(--cyan)'"
          onmouseout="this.style.color='var(--muted)';this.style.borderColor='var(--border)'">⇌</button>
        <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:140px;">
          <div style="width:10px; height:10px; border-radius:50%; background:${COL_COLORS[1]}; flex-shrink:0;"></div>
          <select id="compare-select-b" style="${selectStyle}">
            <option value="">Project B…</option>
            ${makeOptions(idB)}
          </select>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:140px;">
          <div style="width:10px; height:10px; border-radius:50%; background:${COL_COLORS[2]}; flex-shrink:0;"></div>
          <select id="compare-select-c" style="${selectStyle}">
            <option value="">Project C (optional)…</option>
            ${makeOptions(idC)}
          </select>
        </div>
      </div>

      <!-- Comparison columns -->
      <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
        ${renderProjectColumn(projA, ghData, sbData, socialData, COL_COLORS[0])}
        ${renderProjectColumn(projB, ghData, sbData, socialData, COL_COLORS[1])}
        ${projC || !idC ? renderProjectColumn(projC, ghData, sbData, socialData, COL_COLORS[2]) : ""}
      </div>

      ${renderScoreTrajectory(projects, scorings, scoreHistory)}

      ${!hasEnough ? "" : `
        <div style="margin-top:20px; padding:16px 20px; background:rgba(122,231,199,0.04);
                    border:1px solid rgba(122,231,199,0.15); border-radius:10px;">

          <!-- Winner banner -->
          ${(() => {
            const sorted = activeProjects
              .map((p, i) => ({ p, sc: scorings[projects.indexOf(p)], color: COL_COLORS[projects.indexOf(p)] }))
              .sort((a, b) => b.sc.total - a.sc.total);
            const leader = sorted[0];
            const gap = leader.sc.total - sorted[1].sc.total;
            return `
              <div style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--text);">
                ${gap === 0
                  ? `<span style="color:var(--muted);">Tied — ${leader.sc.total} pts</span>`
                  : `<span style="color:${leader.color}; font-weight:700;">${leader.p.name}</span>
                     <span style="color:var(--muted);"> leads by </span>
                     <span style="color:${leader.color}; font-weight:700;">${gap} pts</span>`
                }
              </div>
            `;
          })()}

          <!-- Pillar strength breakdown -->
          <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;">Pillar Strengths</div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${pillarDefs.map(({ key, label, max }) => {
              const scores = projects.map((p, ci) => p && scorings[ci] ? { val: scorings[ci].pillars[key].score, proj: p, color: COL_COLORS[ci] } : null).filter(Boolean);
              const maxVal = Math.max(...scores.map((s) => s.val));
              return `
                <div>
                  <div style="font-size:10px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.06em;">${label}</div>
                  ${scores.map(({ val, proj, color }) => `
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                      <span style="font-size:11px; min-width:72px; color:${val === maxVal ? "var(--text)" : "var(--muted)"}; font-weight:${val === maxVal ? "700" : "400"}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${proj.name.slice(0, 10)}</span>
                      <div style="flex:1; height:5px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                        <div style="width:${Math.round((val / max) * 100)}%; height:100%; background:${val === maxVal ? color : color + "66"}; border-radius:3px;"></div>
                      </div>
                      <span style="font-size:10px; color:var(--muted); min-width:30px; text-align:right;">${val}/${max}</span>
                    </div>
                  `).join("")}
                </div>
              `;
            }).join("")}
          </div>

          ${renderRadarChart(projects, scorings)}
        </div>
      `}

    </div>
  `;
}
