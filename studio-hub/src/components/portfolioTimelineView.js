// Portfolio Timeline View
// Feed: chronological event stream across all projects.
// Gantt: 90-day activity bars per project with release markers.

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject } from "../utils/projectScoring.js";

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Gantt view ────────────────────────────────────────────────────────────────
function renderGanttView(state) {
  const { ghData = {}, sbData = null, socialData = null } = state;
  const now        = Date.now();
  const WINDOW_MS  = 90 * 86400000;
  const windowStart = now - WINDOW_MS;

  // Month tick marks along the 90-day axis
  const ticks = [];
  const d = new Date(windowStart);
  d.setDate(1);
  while (d.getTime() < now) {
    ticks.push({ ts: d.getTime(), label: d.toLocaleDateString("en-US", { month: "short" }) });
    d.setMonth(d.getMonth() + 1);
  }

  function barColor(score) {
    if (score >= 80) return "var(--green)";
    if (score >= 60) return "var(--gold)";
    return "var(--red)";
  }

  const rows = PROJECTS.map((p) => {
    const repoData = ghData[p.githubRepo] || null;
    const scoring  = scoreProject(p, repoData, sbData, socialData);
    const commits  = (repoData?.commits || [])
      .map((c) => new Date(c.date).getTime())
      .filter((t) => t >= windowStart && t <= now);

    let bar = null;
    if (commits.length) {
      const earliest = Math.min(...commits);
      const latest   = Math.max(...commits);
      const left  = ((earliest - windowStart) / WINDOW_MS) * 100;
      const right = ((latest  - windowStart) / WINDOW_MS) * 100;
      bar = { left: Math.max(0, left), width: Math.max(1, Math.min(100 - Math.max(0, left), right - left)) };
    }

    let release = null;
    if (repoData?.latestRelease) {
      const rt = new Date(repoData.latestRelease.publishedAt).getTime();
      if (rt >= windowStart && rt <= now) {
        release = { left: ((rt - windowStart) / WINDOW_MS) * 100, tag: repoData.latestRelease.tag };
      }
    }

    return `
      <div style="display:flex; align-items:center; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
        <div style="width:130px; flex-shrink:0; padding-right:12px; overflow:hidden;">
          <div style="font-size:11px; font-weight:700; color:${p.color}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.name}">${p.name}</div>
          <div style="font-size:10px; color:var(--muted);">${scoring.total}/100 · ${scoring.grade}</div>
        </div>
        <div style="flex:1; position:relative; height:18px; background:rgba(255,255,255,0.03); border-radius:3px;">
          ${bar ? `
            <div style="position:absolute; left:${bar.left.toFixed(1)}%; width:${bar.width.toFixed(1)}%; height:100%;
                        background:${barColor(scoring.total)}; border-radius:3px; opacity:0.7;"></div>
          ` : `
            <span style="position:absolute; inset:0; display:flex; align-items:center; padding-left:8px; font-size:9px; color:var(--muted);">No recent activity</span>
          `}
          ${release ? `
            <div title="Release ${release.tag}" style="position:absolute; left:calc(${release.left.toFixed(1)}% - 1px); top:-4px; bottom:-4px;
                        width:2px; background:var(--blue); border-radius:1px; z-index:1;"></div>
          ` : ""}
        </div>
        ${release ? `
          <div style="width:60px; flex-shrink:0; padding-left:6px; font-size:9px; color:var(--blue); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${release.tag}">${release.tag}</div>
        ` : `<div style="width:60px; flex-shrink:0;"></div>`}
      </div>
    `;
  }).join("");

  const tickMarks = ticks.map((t) => {
    const left = ((t.ts - windowStart) / WINDOW_MS) * 100;
    return `<div style="position:absolute; left:${left.toFixed(1)}%; font-size:9px; color:var(--muted); transform:translateX(-50%); pointer-events:none;">${t.label}</div>`;
  }).join("");

  return `
    <div class="panel" style="padding:0; overflow:hidden;">
      <div style="padding:14px 20px 10px; border-bottom:1px solid var(--border);">
        <div style="display:flex; align-items:center;">
          <div style="width:130px; flex-shrink:0; font-size:9px; font-weight:700; color:var(--muted); letter-spacing:0.08em; text-transform:uppercase;">Project</div>
          <div style="flex:1; position:relative; height:16px;">${tickMarks}</div>
          <div style="width:60px; flex-shrink:0; font-size:9px; color:var(--muted); padding-left:6px; text-transform:uppercase; letter-spacing:0.06em;">Release</div>
        </div>
      </div>
      <div style="padding:0 20px;">${rows}</div>
      <div style="padding:10px 20px; border-top:1px solid var(--border); font-size:10px; color:var(--muted); display:flex; gap:16px; align-items:center;">
        Last 90 days.
        <span><span style="display:inline-block; width:8px; height:3px; background:var(--blue); border-radius:1px; margin-right:4px; vertical-align:middle;"></span>Release marker</span>
        <span><span style="display:inline-block; width:8px; height:8px; background:var(--green); border-radius:2px; opacity:0.7; margin-right:4px; vertical-align:middle;"></span>≥80</span>
        <span><span style="display:inline-block; width:8px; height:8px; background:var(--gold); border-radius:2px; opacity:0.7; margin-right:4px; vertical-align:middle;"></span>60–79</span>
        <span><span style="display:inline-block; width:8px; height:8px; background:var(--red); border-radius:2px; opacity:0.7; margin-right:4px; vertical-align:middle;"></span>&lt;60</span>
      </div>
    </div>
  `;
}

export function renderPortfolioTimelineView(state) {
  const { ghData = {}, scoreHistory = [], ghActivity = [], timelineTypeFilter = "all", timelineProjectFilter = "", timelineMode = "feed" } = state;

  const events = [];

  // Commits from each project (last 30)
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (!d) continue;
    for (const c of (d.commits || []).slice(0, 20)) {
      events.push({
        ts: new Date(c.date).getTime(),
        type: "commit",
        project: p,
        icon: "●",
        iconColor: p.color,
        title: c.message.slice(0, 72) + (c.message.length > 72 ? "…" : ""),
        meta: `${c.author} · ${timeAgo(c.date)}`,
        detail: null,
      });
    }

    // Latest release
    if (d.latestRelease) {
      events.push({
        ts: new Date(d.latestRelease.publishedAt).getTime(),
        type: "release",
        project: p,
        icon: "▲",
        iconColor: "var(--blue)",
        title: `Released ${d.latestRelease.tag}${d.latestRelease.name && d.latestRelease.name !== d.latestRelease.tag ? ` — ${d.latestRelease.name}` : ""}`,
        meta: timeAgo(d.latestRelease.publishedAt),
        url: d.latestRelease.url,
      });
    }

    // CI events (latest run)
    const latestRun = d.ciRuns?.[0];
    if (latestRun?.triggeredAt) {
      const isFail = latestRun.conclusion === "failure";
      const isPass = latestRun.conclusion === "success";
      if (isFail || isPass) {
        events.push({
          ts: new Date(latestRun.triggeredAt).getTime(),
          type: isFail ? "ci-fail" : "ci-pass",
          project: p,
          icon: isFail ? "✗" : "✓",
          iconColor: isFail ? "var(--red)" : "var(--green)",
          title: `CI ${isFail ? "failed" : "passed"} — ${latestRun.name}`,
          meta: timeAgo(latestRun.triggeredAt),
          detail: null,
        });
      }
    }
  }

  // Score snapshots (from history)
  for (let i = 1; i < scoreHistory.length; i++) {
    const h = scoreHistory[i];
    const prev = scoreHistory[i - 1];
    const movers = [];
    for (const p of PROJECTS) {
      const curr = h.scores?.[p.id];
      const prevScore = prev.scores?.[p.id];
      if (curr != null && prevScore != null) {
        const delta = curr - prevScore;
        if (Math.abs(delta) >= 5) movers.push({ name: p.name, delta });
      }
    }
    if (movers.length) {
      const gains = movers.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta);
      const drops = movers.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta);
      const parts = [
        ...gains.slice(0, 3).map((m) => `↑ ${m.name} +${m.delta}`),
        ...drops.slice(0, 3).map((m) => `↓ ${m.name} ${m.delta}`),
      ];
      events.push({
        ts: h.ts,
        type: "snapshot",
        project: null,
        icon: "◎",
        iconColor: "var(--muted)",
        title: `Score snapshot — ${parts.join(" · ")}`,
        meta: timeAgo(new Date(h.ts).toISOString()),
        detail: null,
      });
    }
  }

  // Alert history
  let alertHistory = [];
  try { alertHistory = JSON.parse(localStorage.getItem("vshub_alert_history") || "[]"); } catch {}
  for (const a of alertHistory.slice(-40)) {
    const color = a.type === "error" ? "var(--red)" : a.type === "warning" ? "var(--gold)" : "var(--muted)";
    events.push({
      ts: a.ts,
      type: "alert",
      project: null,
      icon: "⚠",
      iconColor: color,
      title: a.msg,
      meta: timeAgo(new Date(a.ts).toISOString()),
      detail: null,
    });
  }

  // Filter and sort
  let filtered = events;
  if (timelineTypeFilter !== "all") filtered = filtered.filter((e) => e.type === timelineTypeFilter || (timelineTypeFilter === "ci" && (e.type === "ci-fail" || e.type === "ci-pass")));
  if (timelineProjectFilter) filtered = filtered.filter((e) => !e.project || e.project.id === timelineProjectFilter);
  filtered.sort((a, b) => b.ts - a.ts);
  const shown = filtered.slice(0, 120);

  // Group by date
  let lastDateLabel = null;

  const rows = shown.map((e) => {
    const dateLabel = new Date(e.ts).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    const isNewDay = dateLabel !== lastDateLabel;
    lastDateLabel = dateLabel;

    const typeLabel = {
      "commit":   "COMMIT",
      "release":  "RELEASE",
      "ci-fail":  "CI FAIL",
      "ci-pass":  "CI PASS",
      "snapshot": "SNAPSHOT",
      "alert":    "ALERT",
    }[e.type] || "EVENT";

    const typeBg = {
      "commit":   "rgba(255,255,255,0.05)",
      "release":  "rgba(105,179,255,0.12)",
      "ci-fail":  "rgba(248,113,113,0.12)",
      "ci-pass":  "rgba(110,231,183,0.10)",
      "snapshot": "rgba(255,255,255,0.04)",
      "alert":    "rgba(255,200,116,0.08)",
    }[e.type] || "transparent";

    return `
      ${isNewDay ? `
        <div style="padding:16px 20px 6px; position:sticky; top:0; background:var(--bg); z-index:1;
                    font-size:10px; font-weight:800; color:var(--muted); letter-spacing:0.1em; text-transform:uppercase;
                    border-bottom:1px solid var(--border);">
          ${dateLabel}
        </div>
      ` : ""}
      <div style="display:flex; align-items:flex-start; gap:12px; padding:9px 20px;
                  border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.1s;
                  ${e.project ? "cursor:pointer;" : ""}"
           ${e.project ? `data-view="project:${e.project.id}"` : ""}
           onmouseover="this.style.background='rgba(255,255,255,0.03)'"
           onmouseout="this.style.background=''">
        <div style="width:7px; height:7px; border-radius:50%; background:${e.iconColor};
                    flex-shrink:0; margin-top:4px; box-shadow:0 0 4px ${e.iconColor};"></div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px; flex-wrap:wrap;">
            ${e.project ? `
              <div style="width:5px; height:5px; border-radius:50%; background:${e.project.color}; flex-shrink:0;"></div>
              <span style="font-size:10px; color:${e.project.color}; font-weight:700;">${e.project.name}</span>
            ` : ""}
            <span style="font-size:9px; font-weight:700; padding:1px 5px; border-radius:3px;
                         background:${typeBg}; color:${e.iconColor}; letter-spacing:0.05em;">${typeLabel}</span>
          </div>
          <div style="font-size:12px; color:var(--text); line-height:1.4; word-break:break-word;">
            ${e.url ? `<a href="${e.url}" target="_blank" rel="noopener" style="color:inherit;" onclick="event.stopPropagation()">${e.title}</a>` : e.title}
          </div>
          <div style="font-size:10px; color:var(--muted); margin-top:2px;">${e.meta}</div>
        </div>
        <div style="font-size:10px; color:rgba(149,163,183,0.4); flex-shrink:0; white-space:nowrap;">
          ${new Date(e.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    `;
  }).join("");

  const modeBtn = (mode, label) => `
    <button data-timeline-mode="${mode}"
      style="font-size:11px; padding:4px 12px; border-radius:6px; cursor:pointer; border:1px solid var(--border);
             background:${timelineMode === mode ? "rgba(122,231,199,0.12)" : "none"};
             color:${timelineMode === mode ? "var(--cyan)" : "var(--muted)"}; transition:all 0.1s;">${label}</button>
  `;

  return `
    <div class="main-panel">
      <div class="view-header">
        <div>
          <div class="view-title">Portfolio Timeline</div>
          <div class="view-subtitle">${timelineMode === "gantt" ? "90-day activity bars with release markers" : "All events across all projects — commits, releases, CI, score changes, alerts"}</div>
        </div>
        <div style="display:flex; gap:4px;">
          ${modeBtn("feed", "Feed")}
          ${modeBtn("gantt", "Gantt")}
        </div>
      </div>

      ${timelineMode === "gantt" ? renderGanttView(state) : `
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:16px;">
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            ${["all","commit","release","ci","snapshot","alert"].map((t) => `
              <button data-timeline-type="${t}"
                style="font-size:11px; padding:4px 10px; border-radius:6px; cursor:pointer; border:1px solid var(--border);
                       background:${timelineTypeFilter === t || (t === "ci" && (timelineTypeFilter === "ci-fail" || timelineTypeFilter === "ci-pass")) ? "rgba(122,231,199,0.12)" : "none"};
                       color:${timelineTypeFilter === t ? "var(--cyan)" : "var(--muted)"};
                       transition:all 0.1s;"
                onmouseover="this.style.color='var(--cyan)'" onmouseout="this.style.color='${timelineTypeFilter === t ? "var(--cyan)" : "var(--muted)"}'">
                ${t === "all" ? "All" : t === "ci" ? "CI" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            `).join("")}
          </div>
          <select id="timeline-project-filter"
            style="font-size:11px; padding:4px 8px; border-radius:6px; border:1px solid var(--border);
                   background:rgba(12,19,31,0.8); color:var(--text); cursor:pointer; outline:none;">
            <option value="">All projects</option>
            ${PROJECTS.map((p) => `<option value="${p.id}" ${timelineProjectFilter === p.id ? "selected" : ""}>${p.name}</option>`).join("")}
          </select>
          <span style="font-size:11px; color:var(--muted); margin-left:auto;">${shown.length} events</span>
        </div>

        <div class="panel" style="padding:0; overflow:hidden;">
          ${shown.length === 0
            ? `<div class="empty-state" style="padding:40px;">No events yet — sync data to populate the timeline.</div>`
            : rows
          }
        </div>
      `}
    </div>
  `;
}
