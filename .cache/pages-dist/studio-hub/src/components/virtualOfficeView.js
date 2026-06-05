// Virtual Office Floor Plan — alternative view
// Tactical floor plan layout. Each project is a "room" in its studio wing.
// Not the default view — accessed via navigation. War-room aesthetic.

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject, getGrade } from "../utils/projectScoring.js";
import { timeAgo, daysSince, scoreColor } from "../utils/helpers.js";

const VAULT_COLORS = {
  forge:   { bg: 'rgba(251,146,60,0.12)', color: '#fb923c', border: 'rgba(251,146,60,0.3)'  },
  sparked: { bg: 'rgba(122,231,199,0.12)', color: '#7ae7c7', border: 'rgba(122,231,199,0.3)' },
  vaulted: { bg: 'rgba(100,116,139,0.10)', color: '#64748b', border: 'rgba(100,116,139,0.2)' },
};
const VAULT_ICON = { forge: '⚒', sparked: '⚡', vaulted: '🏛' };

function computeFloorLR(project, repoData) {
  let pass = 0;
  if (repoData?.ciRuns?.[0]?.conclusion === 'success') pass++;
  if ((repoData?.repo?.openIssues ?? 99) < 10) pass++;
  if (repoData?.latestRelease || repoData?.deployments?.length > 0 || project.deployedUrl) pass++;
  const lastCmt = repoData?.commits?.[0];
  if (lastCmt && daysSince(lastCmt.date) < 7) pass++;
  if (project.status === 'live' || project.vaultStatus === 'sparked') pass++;
  return Math.round((pass / 5) * 100);
}

function ciDot(ciRuns) {
  if (!ciRuns?.length) return `<span style="color:var(--muted); font-size:10px;">— no CI</span>`;
  const r = ciRuns[0];
  if (r.status === "in_progress") return `<span style="color:var(--gold); font-size:10px;">● running</span>`;
  if (r.conclusion === "success")  return `<span style="color:var(--green); font-size:10px;">● pass</span>`;
  if (r.conclusion === "failure")  return `<span style="color:var(--red); font-size:10px;">● fail</span>`;
  return `<span style="color:var(--muted); font-size:10px;">● unknown</span>`;
}

function roomCard(project, repoData, sbData, socialData, beaconData) {
  const scoring    = scoreProject(project, repoData, sbData, socialData);
  const lastCommit = repoData?.commits?.[0];
  const commitDays = lastCommit ? daysSince(lastCommit.date) : Infinity;
  const staleGlow  = commitDays > 30 ? "rgba(248,113,113,0.08)" : commitDays > 14 ? "rgba(255,200,116,0.06)" : "transparent";

  // Active session beacon
  const activeSession = beaconData?.active?.find((s) => s.project === project.id);
  const beaconDot = activeSession
    ? `<span style="color:var(--cyan); font-size:10px; animation:pulse 2s infinite;">● live</span>`
    : "";

  const sessions  = sbData?.sessions?.[project.supabaseGameSlug];
  const vs        = project.vaultStatus || "forge";
  const vc        = VAULT_COLORS[vs] || VAULT_COLORS.forge;
  const lr        = computeFloorLR(project, repoData);
  const lrColor   = lr >= 80 ? "#4ade80" : lr >= 50 ? "#ffc874" : "#f87171";

  return `
    <div data-view="project:${project.id}" style="
      background:rgba(12,19,31,0.6); border:1px solid ${project.color}40;
      border-left:3px solid ${project.color}; border-radius:8px;
      padding:12px 14px; cursor:pointer; transition:all 0.15s;
      box-shadow: inset 0 0 12px ${staleGlow};
      min-width:0;
    "
    onmouseover="this.style.background='rgba(122,231,199,0.05)'; this.style.borderColor='${project.color}99'"
    onmouseout="this.style.background='rgba(12,19,31,0.6)'; this.style.borderColor='${project.color}40'"
    >
      <!-- Name + Score row -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
        <div style="font-size:12px; font-weight:700; color:var(--text); line-height:1.2; min-width:0; flex:1; margin-right:8px;">
          ${project.name}
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:16px; font-weight:800; color:${scoring.gradeColor}; line-height:1;">${scoring.total}</div>
          <div style="font-size:10px; font-weight:700; color:${scoring.gradeColor};">${scoring.grade}</div>
        </div>
      </div>

      <!-- Score bar -->
      <div style="height:3px; background:rgba(255,255,255,0.06); border-radius:2px; margin-bottom:8px; overflow:hidden;">
        <div style="width:${scoring.total}%; height:100%; background:${scoring.gradeColor}; border-radius:2px;"></div>
      </div>

      <!-- Vault status + Launch readiness row -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; gap:6px;">
        <span style="font-size:9px; font-weight:800; letter-spacing:0.07em; padding:2px 7px; border-radius:10px;
          background:${vc.bg}; color:${vc.color}; border:1px solid ${vc.border}; white-space:nowrap;"
          title="Vault Status: ${vs.toUpperCase()}">${VAULT_ICON[vs]} ${vs.toUpperCase()}</span>
        <div style="display:flex; align-items:center; gap:4px; flex:1;" title="Launch Readiness: ${lr}%">
          <div style="flex:1; height:3px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden; max-width:52px;">
            <div style="width:${lr}%; height:100%; background:${lrColor}; border-radius:2px;"></div>
          </div>
          <span style="font-size:9px; font-weight:700; color:${lrColor};">🚀${lr}%</span>
        </div>
      </div>

      <!-- CI + commit row -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:10px; color:var(--muted);">
          ${ciDot(repoData?.ciRuns)}
          ${beaconDot ? `&nbsp;${beaconDot}` : ""}
        </div>
        <div style="font-size:10px; color:${commitDays > 30 ? "var(--red)" : commitDays > 14 ? "var(--gold)" : "var(--muted)"};">
          ${lastCommit ? timeAgo(lastCommit.date) : "no commits"}
        </div>
      </div>

      ${sessions?.week ? `
        <div style="font-size:10px; color:var(--cyan); margin-top:4px;">${sessions.week} sessions/wk</div>
      ` : ""}
    </div>
  `;
}

function wing(label, projects, ghData, sbData, socialData, beaconData) {
  if (!projects.length) return "";
  return `
    <div style="margin-bottom:24px;">
      <div style="
        font-size:10px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase;
        color:var(--muted); padding:8px 0 10px; border-bottom:1px solid var(--border);
        margin-bottom:14px; display:flex; align-items:center; gap:8px;
      ">
        <span style="width:20px; height:1px; background:var(--muted); display:inline-block;"></span>
        ${label}
        <span style="flex:1; height:1px; background:var(--border); display:inline-block;"></span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(190px, 1fr)); gap:10px;">
        ${projects.map((p) => roomCard(p, ghData[p.githubRepo] || null, sbData, socialData, beaconData)).join("")}
      </div>
    </div>
  `;
}

export function renderVirtualOfficeView(state) {
  const { ghData = {}, sbData = null, socialData = null, beaconData = null, floorSearch = "", floorSort = "score" } = state;

  const games     = PROJECTS.filter((p) => p.type === "game");
  const tools     = PROJECTS.filter((p) => p.type === "tool");
  const platforms = PROJECTS.filter((p) => p.type === "platform" || p.type === "app");
  const infra     = PROJECTS.filter((p) => p.type === "infrastructure");

  function filterAndSort(projects) {
    let list = projects;
    if (floorSearch.trim()) {
      const q = floorSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    if (floorSort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (floorSort === "score") {
      list = [...list].sort((a, b) => {
        const sa = scoreProject(a, ghData[a.githubRepo]||null, sbData, socialData).total;
        const sb = scoreProject(b, ghData[b.githubRepo]||null, sbData, socialData).total;
        return sb - sa;
      });
    } else if (floorSort === "staleness") {
      list = [...list].sort((a, b) => {
        const da = daysSince(ghData[a.githubRepo]?.commits?.[0]?.date);
        const db = daysSince(ghData[b.githubRepo]?.commits?.[0]?.date);
        return db - da;
      });
    } else if (floorSort === "ci") {
      const ciOrder = { failure: 0, in_progress: 1, success: 2, unknown: 3 };
      list = [...list].sort((a, b) => {
        const ca = ghData[a.githubRepo]?.ciRuns?.[0];
        const cb = ghData[b.githubRepo]?.ciRuns?.[0];
        const va = ca ? (ciOrder[ca.conclusion || ca.status] ?? 3) : 3;
        const vb = cb ? (ciOrder[cb.conclusion || cb.status] ?? 3) : 3;
        return va - vb;
      });
    }
    return list;
  }
  const filteredGames     = filterAndSort(games);
  const filteredTools     = filterAndSort(tools);
  const filteredPlatforms = filterAndSort(platforms);
  const filteredInfra     = filterAndSort(infra);

  const activeSessions = beaconData?.active || [];

  return `
    <div class="main-panel">
      <div class="view-header" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:20px;">
        <div>
          <div class="view-title">Studio Floor</div>
          <div class="view-subtitle">
            ${PROJECTS.length} projects across ${games.length} games · ${tools.length} tools · ${platforms.length ? `${platforms.length} platforms · ` : ""}${infra.length} infra
            ${activeSessions.length > 0 ? `&nbsp;·&nbsp;<span style="color:var(--cyan);">● ${activeSessions.length} active session${activeSessions.length > 1 ? "s" : ""}</span>` : ""}
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <input id="floor-search-input" type="text" placeholder="Search projects…" value="${floorSearch.replace(/"/g, '&quot;')}"
              style="font-size:12px; padding:5px 10px; background:var(--input-bg,rgba(255,255,255,0.04)); border:1px solid var(--border); border-radius:6px; color:var(--text); width:160px; outline:none;" />
            <select id="floor-sort-select" style="font-size:12px; padding:5px 8px; background:var(--panel); border:1px solid var(--border); border-radius:6px; color:var(--text); cursor:pointer;">
              <option value="score" ${floorSort==="score"?"selected":""}>Sort: Score</option>
              <option value="name" ${floorSort==="name"?"selected":""}>Sort: Name</option>
              <option value="staleness" ${floorSort==="staleness"?"selected":""}>Sort: Staleness</option>
              <option value="ci" ${floorSort==="ci"?"selected":""}>Sort: CI</option>
            </select>
          </div>
        </div>
        <button class="open-hub-btn" data-view="studio-hub">← Hub View</button>
      </div>

      <div style="
        background:rgba(8,14,24,0.5); border:1px solid var(--border); border-radius:12px;
        padding:24px; background-image:
          linear-gradient(rgba(122,231,199,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(122,231,199,0.02) 1px, transparent 1px);
        background-size: 32px 32px;
      ">
        ${wing("Games Wing", filteredGames, ghData, sbData, socialData, beaconData)}
        ${wing("Tools Wing", filteredTools, ghData, sbData, socialData, beaconData)}
        ${wing("Infrastructure", filteredInfra, ghData, sbData, socialData, beaconData)}
      </div>
    </div>
  `;
}
