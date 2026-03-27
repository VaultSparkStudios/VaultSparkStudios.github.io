// Score Ledger — extracted from studioHubView.js (Sprint O decomposition)
// KPI strip: Workflows / Avg Score / Agent Requests / SIL Active / Agent Perf
// Rolling 7-entry ledger with ↑/↓ trend deltas and sparklines.

const LEDGER_SNAPSHOT_KEY = "vshub_ledger_snapshot";
const LEDGER_MAX_ENTRIES  = 7;

export function getLedgerEntries() {
  try {
    const raw = localStorage.getItem(LEDGER_SNAPSHOT_KEY);
    if (!raw) return [];
    const snap = JSON.parse(raw);
    if (Array.isArray(snap.entries)) return snap.entries;
    if (snap.ts) return [snap]; // migrate single entry
    return [];
  } catch { return []; }
}

function getLedgerSnapshot() {
  const entries = getLedgerEntries();
  const sixHoursAgo = Date.now() - 6 * 3600000;
  return entries.filter((e) => e.ts && e.ts < sixHoursAgo)[0] || null;
}

function saveLedgerSnapshot(values) {
  try {
    const entries = getLedgerEntries();
    const last = entries[entries.length - 1];
    if (!last || Date.now() - (last.ts || 0) > 23 * 3600000) {
      entries.push({ ts: Date.now(), ...values });
      if (entries.length > LEDGER_MAX_ENTRIES) entries.splice(0, entries.length - LEDGER_MAX_ENTRIES);
      localStorage.setItem(LEDGER_SNAPSHOT_KEY, JSON.stringify({ entries }));
    }
  } catch {}
}

function ledgerDelta(current, prev) {
  if (prev == null || current == null || isNaN(current) || isNaN(prev)) return "";
  const d = current - prev;
  if (d === 0) return "";
  const color = d > 0 ? "var(--green)" : "var(--red)";
  return `<span style="font-size:9px; font-weight:700; color:${color}; margin-left:3px;">${d > 0 ? "↑" : "↓"}${Math.abs(d)}</span>`;
}

function ledgerSparkline(entries, key, color) {
  if (!entries || entries.length < 2) return "";
  const vals = entries.map((e) => e[key]).filter((v) => v != null);
  if (vals.length < 2) return "";
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 36, H = 12;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg width="${W}" height="${H}" style="display:block; margin:2px auto 0; overflow:visible;">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
  </svg>`;
}

export function renderScoreLedger(studioScore, agentRunHistory, agentRequests, studioBrain) {
  const workflowEntries = Object.entries(agentRunHistory);
  const wfTotal    = workflowEntries.length;
  const wfFailing  = workflowEntries.filter(([, r]) => r?.conclusion === "failure").length;
  const wfHealthy  = wfTotal - wfFailing;
  const wfColor    = wfFailing > 0 ? "var(--red)" : wfTotal > 0 ? "var(--green)" : "var(--muted)";
  const wfLabel    = wfTotal > 0 ? `${wfHealthy}/${wfTotal}` : "—";

  const openRequests = agentRequests?.length ?? 0;
  const reqColor  = openRequests > 0 ? "var(--gold)" : "var(--green)";

  let silLabel = "—";
  let silColor = "var(--muted)";
  let silFresh = null, silTotal = null;
  if (studioBrain?.raw) {
    const m = studioBrain.raw.match(/Active SIL \(14d\)\s*\|\s*([\d]+\s*\/\s*[\d]+)/);
    if (m) {
      silLabel = m[1].replace(/\s*/g, "");
      [silFresh, silTotal] = silLabel.split("/").map(Number);
      silColor = silFresh === silTotal ? "var(--green)" : silFresh >= silTotal / 2 ? "var(--gold)" : "var(--red)";
    }
  }

  const automatedAgents = workflowEntries.filter(([, r]) => r?.history?.length > 0);
  let agentCompliance = null;
  if (automatedAgents.length > 0) {
    const totalRuns   = automatedAgents.reduce((s, [, r]) => s + (r.history?.length || 0), 0);
    const successRuns = automatedAgents.reduce((s, [, r]) => s + (r.history || []).filter((h) => h.conclusion === "success").length, 0);
    agentCompliance = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : null;
  }

  const allEntries = getLedgerEntries();
  const snap = getLedgerSnapshot();
  const avgScore = studioScore.average || null;
  saveLedgerSnapshot({ wfHealthy, avgScore, openRequests, silFresh, agentCompliance });

  const metrics = [
    {
      label: "Workflows", value: wfLabel,
      sub: wfFailing > 0 ? `${wfFailing} failing` : "healthy",
      color: wfColor,
      delta: snap ? ledgerDelta(wfHealthy, snap.wfHealthy) : "",
      sparkline: ledgerSparkline(allEntries, "wfHealthy", wfColor),
    },
    {
      label: "Avg Score", value: avgScore || "—",
      sub: `Grade ${studioScore.grade}`,
      color: studioScore.gradeColor || "var(--muted)",
      delta: snap && avgScore != null ? ledgerDelta(avgScore, snap.avgScore) : "",
      sparkline: ledgerSparkline(allEntries, "avgScore", studioScore.gradeColor || "var(--cyan)"),
    },
    {
      label: "Agent Reqs", value: String(openRequests),
      sub: openRequests > 0 ? "pending" : "clear",
      color: reqColor,
      delta: snap ? ledgerDelta(openRequests, snap.openRequests) : "",
      sparkline: ledgerSparkline(allEntries, "openRequests", reqColor),
    },
    {
      label: "SIL Active", value: silLabel,
      sub: "14-day window",
      color: silColor,
      delta: snap?.silFresh != null ? ledgerDelta(silFresh, snap.silFresh) : "",
      sparkline: ledgerSparkline(allEntries, "silFresh", silColor),
    },
    ...(agentCompliance != null ? [{
      label: "Agent Perf",
      value: `${agentCompliance}%`,
      sub: "run compliance",
      color: agentCompliance >= 90 ? "var(--green)" : agentCompliance >= 70 ? "var(--gold)" : "var(--red)",
      delta: snap?.agentCompliance != null ? ledgerDelta(agentCompliance, snap.agentCompliance) : "",
      sparkline: ledgerSparkline(allEntries, "agentCompliance", agentCompliance >= 90 ? "var(--green)" : "var(--gold)"),
    }] : []),
  ];

  return `
    <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
      ${metrics.map(({ label, value, sub, color, delta, sparkline }) => `
        <div style="background:var(--panel); border:1px solid var(--border); border-radius:8px;
                    padding:8px 14px; min-width:90px; text-align:center; flex:1;">
          <div style="font-size:18px; font-weight:800; color:${color}; line-height:1.1;">${value}${delta}</div>
          <div style="font-size:10px; color:var(--muted); margin-top:1px; text-transform:uppercase; letter-spacing:0.04em;">${label}</div>
          <div style="font-size:10px; color:var(--muted); opacity:0.7;">${sub}</div>
          ${sparkline}
        </div>
      `).join("")}
    </div>
  `;
}
