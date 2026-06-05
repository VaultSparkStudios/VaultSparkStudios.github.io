import { SOCIAL_ACCOUNTS } from "../../data/studioRegistry.js";
import { fmt } from "../../utils/helpers.js";

export function renderSocialSummary(socialData) {
  const rows = [];
  if (socialData?.youtube) { const d = socialData.youtube; rows.push({ platform: "YouTube", handle: "@VaultSparkStudios", stat: `${fmt(d.subscribers)} subscribers`, color: "#ff4444" }); }
  if (socialData?.reddit)  { const d = socialData.reddit;  rows.push({ platform: "Reddit",  handle: "r/VaultSparkStudios", stat: `${fmt(d.subscribers)} members · ${fmt(d.activeUsers)} online`, color: "#ff6314" }); }
  if (socialData?.bluesky) { const d = socialData.bluesky; rows.push({ platform: "Bluesky", handle: "@vaultsparkstudios.bsky.social", stat: `${fmt(d.followers)} followers · ${fmt(d.posts)} posts`, color: "#0085ff" }); }
  const stubs = SOCIAL_ACCOUNTS.filter((a) => !["youtube","reddit-community","bluesky","github"].includes(a.id)).filter((a) => !rows.find((r) => r.handle === a.handle));
  return `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">SOCIAL PRESENCE</span>
        <button class="open-hub-btn" data-view="social" style="font-size:11px;">View All →</button>
      </div>
      <div class="panel-body">
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:10px;">
          ${rows.map((r) => `
            <div style="background:var(--panel-2); border:1px solid var(--border); border-radius:10px; padding:12px 14px;">
              <div style="font-size:12px; font-weight:700; color:${r.color}; margin-bottom:3px;">${r.platform}</div>
              <div style="font-size:11px; color:var(--muted); margin-bottom:6px;">${r.handle}</div>
              <div style="font-size:13px; font-weight:600; color:var(--text);">${r.stat}</div>
            </div>
          `).join("")}
          ${stubs.slice(0, 6).map((a) => `
            <a href="${a.url}" target="_blank" rel="noopener" style="background:var(--panel-2); border:1px solid var(--border); border-radius:10px; padding:12px 14px; display:block; transition:border-color 0.15s;">
              <div style="font-size:12px; font-weight:700; color:${a.color}; margin-bottom:3px;">${a.platform}</div>
              <div style="font-size:11px; color:var(--muted);">${a.handle}</div>
              <div style="font-size:11px; color:var(--blue); margin-top:4px;">Open ↗</div>
            </a>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}
