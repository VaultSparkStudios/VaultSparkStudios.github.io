// ─────────────────────────────────────────────
// Phase Tracker View
// Pipeline view showing every project's current development phase.
// ─────────────────────────────────────────────

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject } from "../utils/projectScoring.js";
import { daysSince } from "../utils/helpers.js";

// ── Phase definitions ─────────────────────────────────────────────────────────
export const PHASE_DEFS = {
  'concept':          { label: 'Concept',           color: '#94a3b8', group: 'pre-build' },
  'design':           { label: 'Design',             color: '#a78bfa', group: 'pre-build' },
  'writing':          { label: 'Writing',            color: '#c084fc', group: 'pre-build' },
  'pre-dev':          { label: 'Pre-Dev',            color: '#69b3ff', group: 'dev' },
  'backend-dev':      { label: 'Backend Dev',        color: '#60a5fa', group: 'dev' },
  'frontend-dev':     { label: 'Frontend Dev',       color: '#38bdf8', group: 'dev' },
  'full-stack-dev':   { label: 'Full-Stack Dev',     color: '#22d3ee', group: 'dev' },
  'integration':      { label: 'Integration',        color: '#4ade80', group: 'dev' },
  'alpha':            { label: 'Alpha',              color: '#fbbf24', group: 'qa' },
  'testing':          { label: 'Testing',            color: '#ffc874', group: 'qa' },
  'pre-launch':       { label: 'Pre-Launch',         color: '#e879f9', group: 'launch' },
  'pre-publication':  { label: 'Pre-Publication',    color: '#d946ef', group: 'launch' },
  'live-internal':    { label: 'Live · Internal',    color: '#6ae3b2', group: 'live' },
  'live-beta':        { label: 'Live · Beta',        color: '#34d399', group: 'live' },
  'live-production':  { label: 'Live',               color: '#10b981', group: 'live' },
  'maintenance':      { label: 'Maintenance',        color: '#7ae7c7', group: 'live' },
  'paused':           { label: 'Paused',             color: '#64748b', group: 'inactive' },
  'archived':         { label: 'Archived',           color: '#475569', group: 'inactive' },
};

const PHASE_ORDER = [
  'concept', 'design', 'writing', 'pre-dev',
  'backend-dev', 'frontend-dev', 'full-stack-dev', 'integration',
  'alpha', 'testing', 'pre-launch', 'pre-publication',
  'live-internal', 'live-beta', 'live-production', 'maintenance',
  'paused', 'archived',
];

const GROUPS = {
  'pre-build': { label: 'PRE-BUILD',   accent: 'rgba(167,139,250,0.6)' },
  'dev':       { label: 'DEVELOPMENT', accent: 'rgba(34,211,238,0.6)' },
  'qa':        { label: 'TESTING / QA',accent: 'rgba(255,200,116,0.6)' },
  'launch':    { label: 'LAUNCH',      accent: 'rgba(232,121,249,0.6)' },
  'live':      { label: 'LIVE',        accent: 'rgba(16,185,129,0.6)' },
  'inactive':  { label: 'THE VAULT',   accent: 'rgba(100,116,139,0.4)' },
};

const TYPE_ICONS = { game: '🎮', tool: '🔧', platform: '🌐', infrastructure: '🏗', app: '🌐' };

export function renderPhaseTrackerView(state) {
  const {
    ghData = {}, sbData = null, socialData = null,
    scoreHistory = [], settings = {},
    phaseTrackerFilter = 'all',
  } = state;
  const showScores = settings.showScores !== false;

  // ── Filter projects by type ───────────────────────────────────────────────
  const TYPE_MAP = { all: null, games: 'game', tools: 'tool', platforms: 'platform', infrastructure: 'infrastructure' };
  const typeFilter = TYPE_MAP[phaseTrackerFilter] ?? null;
  const projects = typeFilter ? PROJECTS.filter(p => p.type === typeFilter) : PROJECTS;

  // ── Group projects by phase ───────────────────────────────────────────────
  const byPhase = {};
  for (const p of projects) {
    const phase = p.developmentPhase || 'unknown';
    if (!byPhase[phase]) byPhase[phase] = [];
    byPhase[phase].push(p);
  }

  // ── Summary counts per group ──────────────────────────────────────────────
  const groupCounts = {};
  for (const [phase, ps] of Object.entries(byPhase)) {
    const g = PHASE_DEFS[phase]?.group || 'unknown';
    groupCounts[g] = (groupCounts[g] || 0) + ps.length;
  }

  const summaryParts = [
    groupCounts['pre-build'] ? `<span style="color:#a78bfa;">${groupCounts['pre-build']} pre-build</span>` : '',
    groupCounts['dev']       ? `<span style="color:#22d3ee;">${groupCounts['dev']} in dev</span>` : '',
    groupCounts['qa']        ? `<span style="color:#ffc874;">${groupCounts['qa']} in QA</span>` : '',
    groupCounts['launch']    ? `<span style="color:#e879f9;">${groupCounts['launch']} pre-launch</span>` : '',
    groupCounts['live']      ? `<span style="color:#10b981;">${groupCounts['live']} live</span>` : '',
    groupCounts['inactive']  ? `<span style="color:var(--muted);">${groupCounts['inactive']} inactive</span>` : '',
  ].filter(Boolean).join('<span style="color:rgba(255,255,255,0.15); margin:0 6px;">·</span>');

  // ── Filter tabs ───────────────────────────────────────────────────────────
  function filterTab(id, label, count) {
    const active = phaseTrackerFilter === id;
    const n = id === 'all' ? PROJECTS.length : PROJECTS.filter(p => p.type === TYPE_MAP[id]).length;
    return `
      <button data-phase-filter="${id}" style="
        display: inline-flex; align-items: center; gap: 5px;
        padding: 5px 13px; border-radius: 20px; cursor: pointer;
        border: 1px solid ${active ? 'rgba(122,231,199,0.35)' : 'rgba(255,255,255,0.07)'};
        background: ${active ? 'rgba(122,231,199,0.08)' : 'transparent'};
        color: ${active ? 'var(--cyan)' : 'var(--muted)'};
        font-size: 12px; font-weight: ${active ? '700' : '500'};
        transition: all 0.12s; white-space: nowrap;
      ">
        ${label}
        <span style="font-size:10px; opacity:0.7; font-weight:600;">${n}</span>
      </button>
    `;
  }

  // ── Project chip ──────────────────────────────────────────────────────────
  function projectChip(p) {
    const rd = ghData[p.githubRepo] || null;
    const lastCommit = rd?.commits?.[0]?.date;
    const days = lastCommit ? daysSince(lastCommit) : null;
    const age = days === null ? null : days === 0 ? 'today' : days === 1 ? '1d' : `${days}d`;

    let score = null;
    if (showScores) {
      try { score = scoreProject(p, rd, sbData, socialData); } catch {}
    }

    const ageColor = days === null ? 'var(--muted)' : days > 30 ? '#f87171' : days > 14 ? '#ffc874' : 'var(--muted)';
    const icon = TYPE_ICONS[p.type] || '';

    return `
      <div class="phase-chip" data-view="project:${p.id}" role="button" tabindex="0"
           aria-label="${p.name}" title="${p.name}${age ? ` · last commit ${age} ago` : ''}">
        <div style="display:flex; align-items:center; gap:5px; min-width:0;">
          <div style="width:3px; height:32px; background:${p.color || '#94a3b8'}; border-radius:2px; flex-shrink:0;"></div>
          <div style="min-width:0; flex:1;">
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="font-size:11px; font-weight:700; color:var(--text);
                           white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
                           max-width:120px;">${p.name}</span>
              ${score ? `<span style="font-size:10px; font-weight:800; color:${score.gradeColor}; flex-shrink:0;">${score.total}</span>` : ''}
            </div>
            <div style="display:flex; align-items:center; gap:4px; margin-top:1px;">
              <span style="font-size:9px; color:var(--muted);">${icon} ${p.type}</span>
              ${age ? `<span style="font-size:9px; color:${ageColor}; opacity:0.75;">· ${age}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Phase row ─────────────────────────────────────────────────────────────
  function phaseRow(phaseKey) {
    const ps = byPhase[phaseKey];
    if (!ps?.length) return '';
    const def = PHASE_DEFS[phaseKey] || { label: phaseKey, color: '#94a3b8' };
    const cssClass = phaseKey;

    return `
      <div style="display:flex; align-items:flex-start; gap:16px; padding:10px 0;
                  border-bottom:1px solid rgba(255,255,255,0.03);">
        <div style="width:140px; flex-shrink:0; padding-top:6px;">
          <span class="phase-badge ${cssClass}">${def.label}</span>
          <div style="font-size:10px; color:var(--muted); margin-top:4px; padding-left:2px;">
            ${ps.length} project${ps.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; flex:1; padding-top:2px;">
          ${ps.map(p => projectChip(p)).join('')}
        </div>
      </div>
    `;
  }

  // ── Group section ─────────────────────────────────────────────────────────
  function groupSection(groupKey) {
    const phasesInGroup = PHASE_ORDER.filter(ph => PHASE_DEFS[ph]?.group === groupKey && byPhase[ph]?.length);
    if (!phasesInGroup.length) return '';
    const g = GROUPS[groupKey];
    const count = phasesInGroup.reduce((sum, ph) => sum + (byPhase[ph]?.length || 0), 0);

    return `
      <div style="margin-bottom:4px;">
        <div style="display:flex; align-items:center; gap:10px; padding:20px 0 8px;">
          <div style="width:3px; height:14px; background:${g.accent}; border-radius:2px; flex-shrink:0;"></div>
          <span style="font-size:10px; font-weight:800; letter-spacing:0.12em;
                       color:${g.accent};">${g.label}</span>
          <span style="font-size:11px; color:var(--muted); font-weight:600;">${count}</span>
          <div style="flex:1; height:1px; background:rgba(255,255,255,0.04);"></div>
        </div>
        ${phasesInGroup.map(ph => phaseRow(ph)).join('')}
      </div>
    `;
  }

  const GROUP_ORDER = ['pre-build', 'dev', 'qa', 'launch', 'live', 'inactive'];

  return `
    <div class="main-panel" style="padding:24px 28px; max-width:1100px;">

      <!-- Header -->
      <div style="display:flex; align-items:baseline; gap:14px; margin-bottom:6px; flex-wrap:wrap;">
        <h1 style="font-size:20px; font-weight:800; color:var(--text);
                   letter-spacing:-0.02em; margin:0;">Phase Tracker</h1>
        <span style="font-size:13px; color:var(--muted);">${projects.length} projects</span>
      </div>

      <!-- Summary strip -->
      <div style="font-size:12px; color:var(--muted); margin-bottom:20px; display:flex; gap:0; flex-wrap:wrap; align-items:center;">
        ${summaryParts || '<span style="color:var(--muted);">No phases set</span>'}
      </div>

      <!-- Filter tabs -->
      <div style="display:flex; gap:6px; margin-bottom:28px; flex-wrap:wrap;">
        ${filterTab('all', 'All')}
        ${filterTab('games', 'Games')}
        ${filterTab('tools', 'Tools')}
        ${filterTab('platforms', 'Platforms')}
        ${filterTab('infrastructure', 'Infrastructure')}
      </div>

      <!-- Pipeline -->
      ${projects.length > 0
        ? GROUP_ORDER.map(g => groupSection(g)).join('')
        : `<div style="color:var(--muted); font-size:13px; padding:40px 0;
                      text-align:center;">No projects match this filter.</div>`
      }

      <!-- Legend -->
      <div style="margin-top:32px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.05);">
        <div style="font-size:10px; font-weight:700; letter-spacing:0.1em;
                    color:var(--muted); margin-bottom:12px; opacity:0.7;">PHASE LEGEND</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${PHASE_ORDER.map(ph => {
            const def = PHASE_DEFS[ph];
            return `<span class="phase-badge ${ph}" style="opacity:0.85;">${def.label}</span>`;
          }).join('')}
        </div>
      </div>

    </div>
  `;
}
