// Agent Intelligence Panel — extracted from studioHubView.js (Sprint O decomposition)
// Renders the latest portfolio file outputs (Weekly Digest, Debt Report, Revenue Signals).

export function renderAgentIntelligencePanel(portfolioFiles, portfolioFreshness) {
  const FILES = [
    { path: "portfolio/WEEKLY_DIGEST.md",   label: "Weekly Digest",   icon: "📊", color: "#69b3ff" },
    { path: "portfolio/DEBT_REPORT.md",     label: "Debt Report",     icon: "🔧", color: "#fb923c" },
    { path: "portfolio/REVENUE_SIGNALS.md", label: "Revenue Signals", icon: "💰", color: "#34d399" },
  ];
  const anyFile = FILES.some(f => portfolioFiles[f.path]);
  if (!anyFile) return "";

  return `
    <div class="panel" style="margin-bottom:24px; border-color:rgba(105,179,255,0.2);">
      <div class="panel-header">
        <span class="panel-title">AGENT INTELLIGENCE</span>
        <span style="font-size:11px; color:var(--muted);">latest portfolio outputs</span>
      </div>
      <div class="panel-body" style="padding:12px 16px; display:flex; flex-direction:column; gap:8px;">
        ${FILES.map(({ path, label, icon, color }) => {
          const file = portfolioFiles[path];
          const freshness = portfolioFreshness[path];
          const daysOld = freshness?.daysOld ?? null;
          const ageStr = daysOld === null ? "" : daysOld === 0 ? "today" : `${daysOld}d ago`;
          const ageColor = daysOld !== null && daysOld > 14 ? "var(--gold)" : "var(--muted)";
          if (!file) return `
            <div style="padding:8px 10px; background:var(--border); border-radius:6px; opacity:0.4;
                        font-size:11px; color:var(--muted);">${icon} ${label} — not yet generated</div>
          `;
          return `
            <details style="background:var(--border); border-radius:6px; overflow:hidden;">
              <summary style="cursor:pointer; list-style:none; display:flex; align-items:center; gap:8px;
                              padding:9px 12px; user-select:none;">
                <span style="font-size:13px;">${icon}</span>
                <span style="font-size:12px; font-weight:700; color:${color};">${label}</span>
                ${ageStr ? `<span style="font-size:10px; color:${ageColor}; margin-left:4px;">${ageStr}</span>` : ""}
                ${file.truncated ? `<span style="font-size:10px; color:var(--muted); margin-left:auto;">first 60 lines ▸</span>` : `<span style="margin-left:auto; font-size:10px; color:var(--muted);">▸</span>`}
              </summary>
              <div style="padding:12px 14px; border-top:1px solid rgba(255,255,255,0.06);">
                <pre style="margin:0; font-size:11px; color:var(--text); line-height:1.6; white-space:pre-wrap;
                            word-break:break-word; font-family:monospace; opacity:0.85;">${file.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                ${file.truncated ? `<div style="margin-top:8px; font-size:10px; color:var(--muted); font-style:italic;">— truncated — open studio-ops repo for full file</div>` : ""}
              </div>
            </details>
          `;
        }).join("")}
      </div>
    </div>
  `;
}
