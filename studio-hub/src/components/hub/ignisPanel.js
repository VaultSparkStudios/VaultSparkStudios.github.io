function scoreColor(score) {
  if (score == null) return "var(--muted)";
  if (score >= 70) return "var(--green)";
  if (score >= 45) return "var(--gold)";
  return "var(--red)";
}

export function renderIgnisPanel(ignisCore, portfolioFreshness = {}) {
  if (!ignisCore?.projectScores?.length) return "";

  const studioHubRow = ignisCore.projectScores.find((row) => /studio hub/i.test(row.project));
  const tracked = ignisCore.projectScores.filter((row) => Number.isFinite(row.ignisScore));
  const untracked = ignisCore.projectScores.filter((row) => !Number.isFinite(row.ignisScore));
  const topTracked = [...tracked].sort((a, b) => b.ignisScore - a.ignisScore).slice(0, 5);
  const freshness = portfolioFreshness["portfolio/IGNIS_CORE.md"];
  const ageLabel = freshness?.daysOld == null ? "" : freshness.daysOld === 0 ? "updated today" : `${freshness.daysOld}d old`;
  const ageColor = freshness?.daysOld > 14 ? "var(--gold)" : "var(--muted)";

  return `
    <div class="panel" style="margin-bottom:24px; border-color:rgba(255,201,116,0.22);">
      <div class="panel-header">
        <span class="panel-title">IGNIS INTELLIGENCE</span>
        <span style="font-size:11px; color:${ageColor};">${ignisCore.phase || "phase unknown"}${ageLabel ? ` · ${ageLabel}` : ""}</span>
      </div>
      <div class="panel-body" style="display:grid; grid-template-columns:1.15fr 0.85fr; gap:14px;">
        <div style="min-width:0;">
          ${studioHubRow ? `
            <div style="padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06); margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                <span style="font-size:11px; color:var(--muted); letter-spacing:0.06em; text-transform:uppercase;">Studio Hub</span>
                <span style="font-size:13px; font-weight:800; color:${scoreColor(studioHubRow.ignisScore)};">${studioHubRow.ignisScore ?? "—"}</span>
                <span style="font-size:10px; font-weight:700; color:${scoreColor(studioHubRow.ignisScore)}; border:1px solid ${scoreColor(studioHubRow.ignisScore)}40; border-radius:999px; padding:1px 6px;">${studioHubRow.grade || "UNTRACKED"}</span>
              </div>
              ${studioHubRow.note ? `<div style="font-size:11px; color:var(--muted); line-height:1.5;">${studioHubRow.note}</div>` : ""}
            </div>
          ` : ""}
          <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">Top tracked projects</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${topTracked.map((row) => `
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding:7px 10px; border-radius:7px; background:rgba(255,255,255,0.02);">
                <div style="min-width:0;">
                  <div style="font-size:12px; font-weight:600; color:var(--text);">${row.project}</div>
                  ${row.note ? `<div style="font-size:10px; color:var(--muted); margin-top:2px; line-height:1.45;">${row.note}</div>` : ""}
                </div>
                <div style="text-align:right; flex-shrink:0;">
                  <div style="font-size:13px; font-weight:800; color:${scoreColor(row.ignisScore)};">${row.ignisScore}</div>
                  <div style="font-size:10px; color:var(--muted);">${row.grade}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
        <div style="min-width:0;">
          <div style="display:flex; gap:8px; margin-bottom:10px;">
            <div style="flex:1; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06); text-align:center;">
              <div style="font-size:20px; font-weight:800; color:var(--cyan);">${tracked.length}</div>
              <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em;">Tracked</div>
            </div>
            <div style="flex:1; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06); text-align:center;">
              <div style="font-size:20px; font-weight:800; color:${untracked.length ? "var(--gold)" : "var(--green)"};">${untracked.length}</div>
              <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em;">Untracked</div>
            </div>
          </div>
          <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">Needs IGNIS coverage</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${untracked.slice(0, 6).map((row) => `
              <div style="padding:7px 10px; border-radius:7px; background:rgba(255,201,116,0.06); border:1px solid rgba(255,201,116,0.18);">
                <div style="font-size:12px; font-weight:600; color:var(--text);">${row.project}</div>
                ${row.note ? `<div style="font-size:10px; color:var(--muted); margin-top:2px; line-height:1.45;">${row.note}</div>` : ""}
              </div>
            `).join("") || `<div style="padding:7px 10px; border-radius:7px; background:rgba(110,231,183,0.06); border:1px solid rgba(110,231,183,0.18); font-size:11px; color:var(--green);">No untracked projects in current IGNIS table.</div>`}
          </div>
        </div>
      </div>
    </div>
  `;
}
