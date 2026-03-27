// Studio Brain Panel — extracted from studioHubView.js (Sprint O decomposition)
// Renders: Studio Brain inline viewer, Brain History timeline, diff highlights.

function _brainDiffHtml(currentRaw, prevSnapshot) {
  if (!currentRaw || !prevSnapshot) return "";
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const meaningful = l => l.trim().length > 0 && !l.startsWith("##") && !l.startsWith("---") && !l.startsWith("===");
  const currentLines = new Set(currentRaw.split("\n").filter(meaningful).map(l => l.trim()));
  const prevLines    = new Set(prevSnapshot.split("\n").filter(meaningful).map(l => l.trim()));
  const added   = [...currentLines].filter(l => !prevLines.has(l));
  const removed = [...prevLines].filter(l => !currentLines.has(l));
  if (added.length === 0 && removed.length === 0) {
    return `<div style="font-size:10px; color:var(--muted); margin-top:10px; opacity:0.6;">No changes vs previous snapshot.</div>`;
  }
  const rows = [
    ...added.slice(0, 8).map(l => `<div style="color:#6ae3b2; font-size:10px; line-height:1.5;"><span style="opacity:0.6; margin-right:4px;">+</span>${esc(l)}</div>`),
    ...removed.slice(0, 8).map(l => `<div style="color:#f87171; font-size:10px; line-height:1.5; text-decoration:line-through; opacity:0.7;"><span style="margin-right:4px;">−</span>${esc(l)}</div>`),
  ];
  const more = (added.length > 8 ? added.length - 8 : 0) + (removed.length > 8 ? removed.length - 8 : 0);
  return `
    <div style="margin-top:10px; padding:8px 10px; background:rgba(192,132,252,0.04);
                border:1px solid rgba(192,132,252,0.12); border-radius:6px;">
      <div style="font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">
        Changes vs archive — +${added.length} / −${removed.length}
      </div>
      ${rows.join("")}
      ${more > 0 ? `<div style="font-size:10px; color:var(--muted); margin-top:4px; opacity:0.6;">…${more} more lines changed</div>` : ""}
    </div>
  `;
}

export function renderStudioBrainPanel(studioBrain) {
  if (!studioBrain?.raw) return "";
  const date = studioBrain.raw.match(/## CURRENT — (\d{4}-\d{2}-\d{2})/)?.[1] || null;
  const lines = studioBrain.raw.split("\n");
  const currentIdx = lines.findIndex(l => l.startsWith("## CURRENT"));
  const preview = lines.slice(currentIdx >= 0 ? currentIdx : 0).join("\n");
  const prevSnapshot = studioBrain.archive?.[0]?.snapshot || null;
  const diffHtml = _brainDiffHtml(preview, prevSnapshot);
  return `
    <details style="margin-bottom:24px;">
      <summary style="cursor:pointer; list-style:none; display:flex; align-items:center; gap:10px;
                      padding:10px 16px; background:rgba(192,132,252,0.06); border:1px solid rgba(192,132,252,0.2);
                      border-radius:8px; user-select:none;">
        <span style="color:#c084fc; font-size:13px;">🧠</span>
        <span style="font-size:12px; font-weight:700; color:#c084fc; text-transform:uppercase; letter-spacing:0.06em;">Studio Brain</span>
        ${date ? `<span style="font-size:11px; color:var(--muted);">generated ${date}</span>` : ""}
        ${prevSnapshot ? `<span style="font-size:10px; color:var(--muted); background:rgba(192,132,252,0.08); border:1px solid rgba(192,132,252,0.2); border-radius:6px; padding:1px 7px;">diff ✦</span>` : ""}
        <span style="margin-left:auto; font-size:11px; color:var(--muted);">▸ expand</span>
      </summary>
      <div style="margin-top:4px; padding:14px 16px; background:rgba(192,132,252,0.04);
                  border:1px solid rgba(192,132,252,0.15); border-top:none; border-radius:0 0 8px 8px;">
        <pre style="margin:0; font-size:11px; color:var(--text); line-height:1.6; white-space:pre-wrap;
                    word-break:break-word; font-family:monospace; opacity:0.9;">${preview.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        ${diffHtml}
      </div>
    </details>
  `;
}

export function renderBrainHistoryPanel(studioBrain) {
  if (!studioBrain?.archive?.length) return "";
  const entries = studioBrain.archive.slice(0, 7);
  return `
    <details style="margin-bottom:24px;">
      <summary style="cursor:pointer; list-style:none; display:flex; align-items:center; gap:10px;
                      padding:10px 16px; background:rgba(192,132,252,0.04); border:1px solid rgba(192,132,252,0.12);
                      border-radius:8px; user-select:none;">
        <span style="color:#c084fc; font-size:13px;">🗂</span>
        <span style="font-size:12px; font-weight:700; color:#c084fc; text-transform:uppercase; letter-spacing:0.06em;">Brain History</span>
        <span style="font-size:11px; color:var(--muted);">${entries.length} snapshot${entries.length !== 1 ? "s" : ""}</span>
        <span style="margin-left:auto; font-size:11px; color:var(--muted);">▸ expand</span>
      </summary>
      <div style="margin-top:4px; border:1px solid rgba(192,132,252,0.12); border-top:none;
                  border-radius:0 0 8px 8px; overflow:hidden;">
        ${entries.map((entry, i) => `
          <details style="border-top:${i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none"};">
            <summary style="cursor:pointer; list-style:none; display:flex; align-items:center; gap:8px;
                            padding:8px 16px; background:rgba(192,132,252,0.03); user-select:none;">
              <span style="font-size:11px; font-weight:700; color:var(--text);">${entry.date}</span>
              ${entry.summary ? `<span style="font-size:11px; color:var(--muted); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${entry.summary}</span>` : ""}
              <span style="font-size:10px; color:var(--muted);">▸</span>
            </summary>
            <div style="padding:12px 16px; background:rgba(192,132,252,0.02);">
              <pre style="margin:0; font-size:10px; color:var(--text); line-height:1.5; white-space:pre-wrap;
                          word-break:break-word; font-family:monospace; opacity:0.8;">${entry.snapshot.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
            </div>
          </details>
        `).join("")}
      </div>
    </details>
  `;
}
