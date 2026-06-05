import { PROJECTS } from "../../data/studioRegistry.js";
import { daysSince, commitVelocity, safeGetJSON, safeSetJSON } from "../../utils/helpers.js";
import { getDecayingProjects } from "../../utils/scoreForecast.js";

// ── localStorage usage ────────────────────────────────────────────────────────
function getLocalStorageBytes() {
  let n = 0;
  try {
    for (const k of Object.keys(localStorage)) n += (k.length + (localStorage.getItem(k)?.length || 0)) * 2;
  } catch {}
  return n;
}

// ── Alert snooze helpers ──────────────────────────────────────────────────────
export function getSnoozedAlertCount() {
  const s = safeGetJSON("vshub_alert_snooze", {});
  const now = Date.now();
  return Object.values(s).filter((exp) => exp > now).length;
}

const SNOOZE_KEY = "vshub_alert_snooze";
function loadSnoozed() { return safeGetJSON(SNOOZE_KEY, {}); }
function isAlertSnoozed(msg) { const s = loadSnoozed(); return !!(s[msg] && s[msg] > Date.now()); }
export function snoozeAlert(msg, durationMs) {
  try {
    const s = loadSnoozed();
    s[msg] = Date.now() + durationMs;
    // Prune expired entries
    for (const [k, exp] of Object.entries(s)) { if (exp <= Date.now()) delete s[k]; }
    safeSetJSON(SNOOZE_KEY, s);
  } catch {}
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export function renderAlerts(ghData, sbData, allScores, scoreHistory) {
  const settings = safeGetJSON("vshub_settings", {});
  const T = {
    issues:    settings.alertThresholds?.issues    ?? 20,
    staleWarn: settings.alertThresholds?.staleWarn ?? 14,
    staleErr:  settings.alertThresholds?.staleErr  ?? 30,
    scoreCrit: settings.alertThresholds?.scoreCrit ?? 24,
    scoreWarn: settings.alertThresholds?.scoreWarn ?? 35,
    prAge:     settings.alertThresholds?.prAge     ?? 3,
  };
  const alerts = [];
  const decayingIds = getDecayingProjects(scoreHistory, PROJECTS.map((p) => p.id));
  const PR_AGE_THRESHOLD = T.prAge;

  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (!d) continue;
    if (d.ciRuns?.[0]?.conclusion === "failure")
      alerts.push({ type: "error",   msg: `${p.name}: CI build failing on "${d.ciRuns[0].name}"` });
    if ((d.repo?.openIssues || 0) > T.issues)
      alerts.push({ type: "warning", msg: `${p.name}: ${d.repo.openIssues} open issues` });
    const last = d.commits?.[0];
    if (last) {
      const days = Math.floor(daysSince(last.date));
      if (days >= T.staleErr) alerts.push({ type: "warning", msg: `${p.name}: No commits in ${days} days` });
      else if (days >= T.staleWarn) alerts.push({ type: "info",  msg: `${p.name}: No commits in ${days} days` });
    }
    // PR age alerts — non-draft PRs open longer than threshold
    for (const pr of (d.prs || [])) {
      if (pr.draft) continue;
      const prDays = Math.floor(daysSince(pr.createdAt));
      if (prDays >= PR_AGE_THRESHOLD)
        alerts.push({ type: "warning", msg: `${p.name}: PR #${pr.number} "${pr.title.slice(0,40)}" open ${prDays}d` });
    }
  }

  if (allScores) {
    const ciFailingIds = new Set(PROJECTS.filter((p) => ghData[p.githubRepo]?.ciRuns?.[0]?.conclusion === "failure").map((p) => p.id));
    for (const { project, scoring } of allScores) {
      if (scoring.total <= T.scoreWarn && ghData[project.githubRepo] && !ciFailingIds.has(project.id))
        alerts.push({ type: scoring.total <= T.scoreCrit ? "error" : "warning", msg: `${project.name}: Health score ${scoring.total} (${scoring.grade})` });
    }
  }

  // Score anomaly — sudden drop > 10pts since last snapshot
  if (scoreHistory.length >= 2) {
    const prev = scoreHistory[scoreHistory.length - 2].scores || {};
    const curr = scoreHistory[scoreHistory.length - 1].scores || {};
    for (const p of PROJECTS) {
      const drop = (prev[p.id] ?? null) !== null && (curr[p.id] ?? null) !== null
        ? (prev[p.id] - curr[p.id]) : 0;
      if (drop >= 10) alerts.push({ type: "error", msg: `${p.name}: Score dropped ${drop} pts this session (${prev[p.id]} → ${curr[p.id]})` });
    }
  }

  // Issue spike — issues increased since last snapshot
  if (scoreHistory.length >= 2) {
    const prevIss = scoreHistory[scoreHistory.length - 2].issues || {};
    for (const p of PROJECTS) {
      const d = ghData[p.githubRepo];
      const curr = d?.repo?.openIssues ?? null;
      const prev2 = prevIss[p.id] ?? null;
      if (curr !== null && prev2 !== null && curr > prev2 + 2)
        alerts.push({ type: "info", msg: `${p.name}: Issues spiked +${curr - prev2} (${prev2} → ${curr} open)` });
    }
  }

  // Score regression — below 30-session rolling average
  if (scoreHistory.length >= 3) {
    const rollingScores = {};
    for (const h of scoreHistory) {
      for (const [id, score] of Object.entries(h.scores || {})) {
        if (!rollingScores[id]) rollingScores[id] = [];
        rollingScores[id].push(score);
      }
    }
    const curr = scoreHistory[scoreHistory.length - 1].scores || {};
    for (const p of PROJECTS) {
      const vals = rollingScores[p.id];
      if (!vals || vals.length < 3) continue;
      const avg = Math.round(vals.slice(0, -1).reduce((s, v) => s + v, 0) / (vals.length - 1));
      const latest = curr[p.id];
      if (latest != null && latest < avg - 8)
        alerts.push({ type: "warning", msg: `${p.name}: Score (${latest}) is ${avg - latest} below rolling average (${avg})` });
    }
  }

  for (const id of decayingIds) {
    const p = PROJECTS.find((p) => p.id === id);
    if (p) alerts.push({ type: "warning", msg: `${p.name}: Score declining 3 sessions in a row` });
  }

  if (sbData?.betaKeys) {
    for (const [slug, inv] of Object.entries(sbData.betaKeys)) {
      if (inv.available === 0 && inv.total > 0)
        alerts.push({ type: "warning", msg: `Beta keys exhausted for ${slug}` });
    }
  }

  // Abandoned project flag — no commits 14+ days AND score ≤35 AND not live/archived
  for (const p of PROJECTS) {
    if (p.status === "archived" || p.status === "live") continue;
    const d = ghData[p.githubRepo];
    if (!d) continue;
    const sc = allScores?.find((s) => s.project.id === p.id)?.scoring;
    if (!sc) continue;
    const days = Math.floor(daysSince(d.commits?.[0]?.date));
    if (days >= 14 && sc.total <= 35) {
      alerts.push({ type: "warning", msg: `${p.name}: may be abandoned — ${days}d inactive, score ${sc.total} (${sc.grade})` });
    }
  }

  // Momentum burst — positive signal for unusually active projects
  for (const p of PROJECTS) {
    const d = ghData[p.githubRepo];
    if (!d) continue;
    const v = commitVelocity(d.commits);
    if (v.thisWeek >= 5 && v.lastWeek <= 1)
      alerts.push({ type: "info", msg: `↑ ${p.name}: momentum burst — ${v.thisWeek} commits this week (was ${v.lastWeek} last week)` });
  }

  // Milestone overdue — roadmap "doing" items stuck 7+ days
  try {
    const roadmap = safeGetJSON("vshub_roadmap", {});
    for (const p of PROJECTS) {
      const board = roadmap[p.id];
      if (!board?.doing?.length) continue;
      for (const item of board.doing) {
        if (typeof item !== "object" || !item.movedAt) continue;
        const days = Math.floor((Date.now() - item.movedAt) / 86400000);
        if (days >= 7) alerts.push({ type: "warning", msg: `${p.name}: milestone "${(item.text || "").slice(0, 40)}" in progress ${days}d — may be blocked` });
      }
    }
  } catch {}

  const storageBytes = getLocalStorageBytes();
  const storageMb    = (storageBytes / (1024 * 1024)).toFixed(2);
  if (storageBytes > 4 * 1024 * 1024) {
    alerts.push({ type: "error",   msg: `localStorage nearly full: ${storageMb}MB used (limit ~5MB) — clear in Settings` });
  } else if (storageBytes > 2.5 * 1024 * 1024) {
    alerts.push({ type: "warning", msg: `localStorage at ${storageMb}MB — approaching ~5MB browser limit` });
  }

  if (!alerts.length) return `<div class="empty-state">No alerts — all systems nominal.</div>`;

  const seen = new Set();
  const deduped = alerts.filter((a) => { if (seen.has(a.msg)) return false; seen.add(a.msg); return true; });
  const visible = deduped.filter((a) => !isAlertSnoozed(a.msg));

  // ── Type-pattern deduplication (#25) ─────────────────────────────────────
  // When 3+ alerts share the same signal pattern across different projects,
  // collapse them into a single "N projects — [pattern]" summary entry.
  const PATTERNS = [
    { match: /CI build failing/,         label: "CI build failing" },
    { match: /Score declining/,          label: "Score declining 3 sessions" },
    { match: /No commits in \d+/,        label: "No commits (stale)" },
    { match: /may be abandoned/,         label: "May be abandoned" },
    { match: /PRs? awaiting review|PR #.* open \d+d/, label: "PR review lag" },
    { match: /Health score \d+ \(\w+\)/, label: "Low health score" },
  ];

  if (!visible.length) {
    const snoozeCount = deduped.length;
    return `<div class="empty-state">All ${snoozeCount} alert${snoozeCount !== 1 ? "s" : ""} snoozed.</div>`;
  }

  const snoozeBtn = (msg, label, dur) => `
    <button data-snooze-alert="${msg.replace(/"/g, "&quot;").replace(/'/g, "&#39;")}" data-snooze-duration="${dur}"
      style="font-size:9px; padding:2px 5px; border-radius:4px; cursor:pointer; flex-shrink:0;
             background:transparent; border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.35);
             white-space:nowrap; transition:all 0.1s; line-height:1.3;"
      onmouseover="this.style.borderColor='rgba(255,255,255,0.3)';this.style.color='rgba(255,255,255,0.7)'"
      onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.color='rgba(255,255,255,0.35)'"
      title="Snooze this alert for ${label}"
    >${label}</button>
  `;

  // Group alerts by project name prefix (e.g. "Call of Doodie: CI failing" → "Call of Doodie")
  function groupByProject(items) {
    const groups = new Map(); // projectKey → [alerts]
    for (const a of items) {
      const colonIdx = a.msg.indexOf(":");
      const key = colonIdx > 0 ? a.msg.slice(0, colonIdx).trim() : "__other__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }
    return groups;
  }

  function renderGroup(items) {
    const groups = groupByProject(items);
    return [...groups.entries()].map(([projectKey, groupAlerts]) => {
      // Summary (type-pattern collapsed) alert
      const sa = groupAlerts[0];
      if (groupAlerts.length === 1 && sa._summary) {
        return `
          <details class="alert-item ${sa.type}" style="padding:0;">
            <summary style="display:flex; align-items:center; gap:8px; justify-content:space-between; padding:6px 0; cursor:pointer; list-style:none;">
              <span style="flex:1; min-width:0; font-weight:700;">${sa.msg}</span>
              <span style="font-size:9px; color:var(--muted);">▾</span>
            </summary>
            ${sa._children.map((c) => `
              <div style="display:flex; align-items:center; gap:8px; justify-content:space-between; padding:4px 0 4px 12px; border-top:1px solid rgba(255,255,255,0.05); font-size:11px;">
                <span style="flex:1; min-width:0; color:var(--muted);">${c.msg}</span>
                <div style="display:flex; gap:3px; flex-shrink:0;">${snoozeBtn(c.msg, "24h", 86400000)}</div>
              </div>
            `).join("")}
          </details>
        `;
      }
      if (groupAlerts.length === 1) {
        const a = groupAlerts[0];
        return `
          <div class="alert-item ${a.type}" style="display:flex; align-items:center; gap:8px; justify-content:space-between;">
            <span style="flex:1; min-width:0;">${a.msg}</span>
            <div style="display:flex; gap:3px; flex-shrink:0; align-items:center;">
              ${snoozeBtn(a.msg, "24h", 86400000)}
              ${snoozeBtn(a.msg, "7d", 604800000)}
            </div>
          </div>
        `;
      }
      // Multiple alerts for same project — collapsible group
      const worstType = groupAlerts.some((a) => a.type === "error") ? "error" : groupAlerts.some((a) => a.type === "warning") ? "warning" : "info";
      return `
        <details class="alert-item ${worstType}" style="padding:0;">
          <summary style="display:flex; align-items:center; gap:8px; justify-content:space-between; padding:6px 0; cursor:pointer; list-style:none;">
            <span style="flex:1; min-width:0; font-weight:700;">${projectKey} <span style="font-weight:400; opacity:0.7;">— ${groupAlerts.length} alerts</span></span>
            <span style="font-size:9px; color:var(--muted);">▾</span>
          </summary>
          ${groupAlerts.map((a) => `
            <div style="display:flex; align-items:center; gap:8px; justify-content:space-between; padding:4px 0 4px 12px; border-top:1px solid rgba(255,255,255,0.05); font-size:11px;">
              <span style="flex:1; min-width:0; color:var(--muted);">${a.msg.slice(a.msg.indexOf(":") + 1).trim()}</span>
              <div style="display:flex; gap:3px; flex-shrink:0; align-items:center;">
                ${snoozeBtn(a.msg, "24h", 86400000)}
              </div>
            </div>
          `).join("")}
        </details>
      `;
    }).join("");
  }

  // Collapse patterns with 3+ matches into summary entries, leave rest as-is
  const collapsed = new Set();
  const summaryAlerts = [];
  for (const pat of PATTERNS) {
    const matches = visible.filter((a) => pat.match.test(a.msg));
    if (matches.length >= 3) {
      matches.forEach((a) => collapsed.add(a));
      const worstType = matches.some((a) => a.type === "error") ? "error" : "warning";
      summaryAlerts.push({
        type: worstType,
        msg: `${matches.length} projects — ${pat.label}`,
        _summary: true,
        _children: matches,
      });
    }
  }
  const finalAlerts = [
    ...summaryAlerts,
    ...visible.filter((a) => !collapsed.has(a)),
  ];

  const errors   = finalAlerts.filter((a) => a.type === "error");
  const warnings = finalAlerts.filter((a) => a.type === "warning");
  const infos    = finalAlerts.filter((a) => a.type === "info");

  return `
    <div class="alerts-list">
      ${errors.length ? `<div style="font-size:9px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--red); padding:4px 0 2px;">Critical</div>${renderGroup(errors)}` : ""}
      ${warnings.length ? `<div style="font-size:9px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--gold); padding:4px 0 2px; ${errors.length ? "margin-top:6px;" : ""}">Warnings</div>${renderGroup(warnings)}` : ""}
      ${infos.length ? `<div style="font-size:9px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); padding:4px 0 2px; ${(errors.length || warnings.length) ? "margin-top:6px;" : ""}">Info</div>${renderGroup(infos)}` : ""}
    </div>
  `;
}

// ── Alert History helpers ─────────────────────────────────────────────────────
export const ALERT_HISTORY_KEY = "vshub_alert_history";
function loadAlertHistory() { return safeGetJSON(ALERT_HISTORY_KEY, []); }
export function pushAlertHistory(alerts) {
  try {
    const existing = loadAlertHistory();
    const ts = Date.now();
    const DEDUP_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
    const recentMsgs = new Set(existing.filter((e) => ts - e.ts < DEDUP_WINDOW_MS).map((e) => e.msg));
    for (const a of alerts) {
      if (!recentMsgs.has(a.msg)) {
        existing.push({ ts, type: a.type, msg: a.msg });
        recentMsgs.add(a.msg); // prevent dupes within same batch
      }
    }
    if (existing.length > 100) existing.splice(0, existing.length - 100);
    localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(existing));
  } catch {}
}

// ── Alert History Panel ───────────────────────────────────────────────────────
export function renderAlertHistoryPanel(alertHistoryFilter = "") {
  const history = loadAlertHistory();
  if (!history.length) return "";
  const recent = history.slice(-20).reverse();
  const filtered = alertHistoryFilter
    ? recent.filter((e) => e.msg.toLowerCase().includes(alertHistoryFilter.toLowerCase()))
    : recent;
  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">ALERT HISTORY</span>
        <span style="font-size:11px; color:var(--muted);">Last ${recent.length} events</span>
      </div>
      <div style="padding:10px 14px 0; border-bottom:1px solid var(--border);">
        <input id="alert-history-search" type="search" placeholder="Filter alerts…"
          value="${alertHistoryFilter.replace(/"/g, '&quot;')}"
          style="width:100%; background:rgba(12,19,31,0.8); border:1px solid var(--border); border-radius:6px;
                 color:var(--text); font:inherit; font-size:12px; padding:6px 10px; outline:none; box-sizing:border-box;" />
      </div>
      <div class="panel-body" style="max-height:220px; overflow-y:auto; padding:0;">
        ${filtered.map((e) => {
          const color = e.type === "error" ? "var(--red)" : e.type === "warning" ? "var(--gold)" : "var(--muted)";
          const d = new Date(e.ts);
          const ts = d.toLocaleDateString("en-US", { month:"short", day:"numeric" }) + " " + d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
          return `
            <div style="display:flex; align-items:flex-start; gap:12px; padding:8px 16px; border-bottom:1px solid var(--border);">
              <span style="font-size:10px; color:${color}; font-weight:700; min-width:8px; flex-shrink:0;">●</span>
              <span style="flex:1; font-size:12px; color:var(--text); line-height:1.4;">${e.msg}</span>
              <span style="font-size:10px; color:var(--muted); flex-shrink:0; white-space:nowrap;">${ts}</span>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// ── Snooze Management Panel ───────────────────────────────────────────────────
export function renderSnoozePanel() {
  let snoozed = {};
  snoozed = safeGetJSON("vshub_alert_snooze", {});
  const now = Date.now();
  const active = Object.entries(snoozed).filter(([, exp]) => exp > now);
  if (!active.length) return "";

  // Build type map from alert history
  let typeMap = {};
  const hist = safeGetJSON("vshub_alert_history", []);
  for (const e of hist) typeMap[e.msg] = e.type;

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">SNOOZED ALERTS</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:11px; color:var(--muted);">${active.length} active</span>
          <button id="unsnooze-all-btn"
            style="font-size:10px; padding:2px 8px; border:1px solid var(--border); border-radius:5px;
                   background:none; color:var(--muted); cursor:pointer;">Clear all</button>
        </div>
      </div>
      <div class="panel-body" style="padding:0;">
        ${active.map(([msg, exp]) => {
          const mins = Math.round((exp - now) / 60000);
          const timeLeft = mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
          const type = typeMap[msg] || "info";
          const typeColor = type === "error" ? "var(--red)" : type === "warning" ? "var(--gold)" : "var(--muted)";
          return `
            <div style="display:flex; align-items:center; gap:10px; padding:8px 16px; border-bottom:1px solid var(--border);">
              <span style="font-size:9px; font-weight:700; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.05); color:${typeColor}; flex-shrink:0; letter-spacing:0.04em; text-transform:uppercase;">${type}</span>
              <span style="flex:1; font-size:12px; color:var(--muted); line-height:1.4; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${msg.replace(/"/g, "&quot;")}">${msg}</span>
              <span style="font-size:10px; color:var(--muted); flex-shrink:0;">${timeLeft}</span>
              <button data-unsnooze="${msg.replace(/"/g, "&quot;")}"
                style="font-size:10px; padding:2px 8px; border:1px solid var(--border); border-radius:5px;
                       background:none; color:var(--muted); cursor:pointer; flex-shrink:0;">×</button>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}
