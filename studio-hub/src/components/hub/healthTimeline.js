// Studio Health Timeline — extracted from studioHubView.js (Sprint O decomposition)
// 30-day composite chart: avg score / workflow health / SIL coverage / agent compliance

import { getLedgerEntries } from "./scoreLedger.js";

export function renderStudioHealthTimeline() {
  const entries = getLedgerEntries();
  if (entries.length < 2) return "";

  const W = 500, H = 80;
  const labeled = entries.map((e) => ({
    ts: e.ts,
    avgScore:        e.avgScore        ?? null,
    wfHealthy:       typeof e.wfHealthy === "boolean" ? (e.wfHealthy ? 100 : 0) : (e.wfHealthy ?? null),
    silFresh:        e.silFresh        != null ? Math.min(100, e.silFresh * 10) : null,
    agentCompliance: e.agentCompliance ?? null,
  }));

  const series = [
    { key: "avgScore",        label: "Avg Score",    color: "var(--cyan)",  dash: "" },
    { key: "wfHealthy",       label: "WF Health",    color: "var(--green)", dash: "4,3" },
    { key: "silFresh",        label: "SIL Coverage", color: "#c084fc",      dash: "2,4" },
    { key: "agentCompliance", label: "Agent Perf",   color: "var(--gold)",  dash: "6,2" },
  ];

  function makePath(key, color, dash) {
    const pts = labeled.map((e, i) => {
      const v = e[key];
      if (v == null) return null;
      const x = (i / (labeled.length - 1)) * W;
      const y = H - (Math.max(0, Math.min(100, v)) / 100) * (H - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).filter(Boolean);
    if (pts.length < 2) return "";
    return `<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" opacity="0.8"
      ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
  }

  const latest = labeled[labeled.length - 1];

  return `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <span class="panel-title">STUDIO HEALTH TIMELINE</span>
        <span style="font-size:11px; color:var(--muted);">${entries.length}-day rolling · daily snapshots</span>
      </div>
      <div class="panel-body">
        <svg width="${W}" height="${H}" style="width:100%; display:block; overflow:visible; margin-bottom:8px;">
          ${[75, 50, 25].map((y) => {
            const cy = H - (y / 100) * (H - 8) - 4;
            return `<line x1="0" y1="${cy.toFixed(1)}" x2="${W}" y2="${cy.toFixed(1)}"
              stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="4,4"/>
            <text x="2" y="${(cy - 3).toFixed(1)}" font-size="9" fill="rgba(149,163,183,0.35)">${y}</text>`;
          }).join("")}
          ${series.map((s) => makePath(s.key, s.color, s.dash)).join("")}
        </svg>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--muted); margin-bottom:10px;">
          <span>${new Date(entries[0].ts).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span>
          <span>${new Date(entries[entries.length - 1].ts).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</span>
        </div>
        <div style="display:flex; gap:16px; flex-wrap:wrap;">
          ${series.map((s) => {
            const val = latest[s.key];
            if (val == null) return "";
            const display = s.key === "wfHealthy" ? (val >= 50 ? "Healthy" : "Failing") : `${Math.round(val)}`;
            return `<div style="display:flex; align-items:center; gap:5px; font-size:11px;">
              <svg width="20" height="8" style="flex-shrink:0; overflow:visible;">
                <line x1="0" y1="4" x2="20" y2="4" stroke="${s.color}" stroke-width="2"
                  ${s.dash ? `stroke-dasharray="${s.dash}"` : ""}/>
              </svg>
              <span style="color:var(--muted);">${s.label}</span>
              <span style="font-weight:700; color:${s.color};">${display}${s.key !== "wfHealthy" ? (s.key === "avgScore" ? "" : "%") : ""}</span>
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>
  `;
}
