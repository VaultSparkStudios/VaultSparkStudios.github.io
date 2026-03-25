import { SOCIAL_ACCOUNTS } from "../data/studioRegistry.js";

function fmt(n) {
  if (n === null || n === undefined) return null;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function renderAccountPanel(account, socialData) {
  let liveSection = "";

  if (account.id === "youtube" && socialData?.youtube) {
    const d = socialData.youtube;
    liveSection = `
      <div class="two-col" style="gap:12px; margin-bottom:16px;">
        <div class="vital-card"><div class="vital-label">Subscribers</div><div class="vital-value cyan">${fmt(d.subscribers)}</div></div>
        <div class="vital-card"><div class="vital-label">Total Views</div><div class="vital-value">${fmt(d.totalViews)}</div></div>
        <div class="vital-card"><div class="vital-label">Videos</div><div class="vital-value">${fmt(d.videoCount)}</div></div>
      </div>
      ${d.latestVideos?.length > 0 ? `
        <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;">Latest Videos</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${d.latestVideos.map((v) => `
            <div class="commit-item">
              <div class="commit-message">
                <a href="${v.url}" target="_blank" rel="noopener" style="color:var(--text);">${v.title}</a>
              </div>
              <div class="commit-meta">${timeAgo(v.publishedAt)}</div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    `;
  } else if (account.id === "reddit-community" && socialData?.reddit) {
    const d = socialData.reddit;
    liveSection = `
      <div class="two-col" style="gap:12px; margin-bottom:16px;">
        <div class="vital-card"><div class="vital-label">Members</div><div class="vital-value cyan">${fmt(d.subscribers)}</div></div>
        <div class="vital-card"><div class="vital-label">Online Now</div><div class="vital-value green">${fmt(d.activeUsers)}</div></div>
      </div>
      ${d.latestPosts?.length > 0 ? `
        <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;">Latest Posts</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${d.latestPosts.map((p) => `
            <div class="commit-item">
              <div class="commit-message">
                <a href="${p.url}" target="_blank" rel="noopener" style="color:var(--text);">${p.title}</a>
              </div>
              <div class="commit-meta">u/${p.author} · ${p.score} pts · ${p.comments} comments · ${timeAgo(p.createdAt)}</div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    `;
  } else if (account.id === "bluesky" && socialData?.bluesky) {
    const d = socialData.bluesky;
    liveSection = `
      <div class="two-col" style="gap:12px; margin-bottom:16px;">
        <div class="vital-card"><div class="vital-label">Followers</div><div class="vital-value cyan">${fmt(d.followers)}</div></div>
        <div class="vital-card"><div class="vital-label">Posts</div><div class="vital-value">${fmt(d.posts)}</div></div>
      </div>
      ${d.latestPosts?.length > 0 ? `
        <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;">Latest Posts</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${d.latestPosts.map((p) => `
            <div class="commit-item">
              <div class="commit-message" style="white-space:normal;">${p.text.slice(0, 120)}${p.text.length > 120 ? "…" : ""}</div>
              <div class="commit-meta">${timeAgo(p.createdAt)} · ${fmt(p.likes)} likes · ${fmt(p.reposts)} reposts</div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    `;
  } else if (account.id === "gumroad" && socialData?.gumroad) {
    const d = socialData.gumroad;
    liveSection = `
      ${d.products?.length > 0 ? `
        <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;">Products</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${d.products.map((p) => `
            <div class="data-row">
              <span class="label"><a href="${p.url}" target="_blank" rel="noopener" style="color:var(--text);">${p.name}</a></span>
              <span class="value">${p.price} · ${fmt(p.sales)} sales</span>
            </div>
          `).join("")}
        </div>
      ` : `<div class="empty-state">Configure Gumroad API token for product data.</div>`}
    `;
  } else if (account.apiSupport === "limited") {
    liveSection = `
      <div class="alert-item warning">
        Full API access pending for ${account.platform}. Add credentials to unlock live data.
        <a href="${account.url}" target="_blank" rel="noopener" style="margin-left:8px; color:var(--gold);">Open Profile ↗</a>
      </div>
    `;
  } else {
    liveSection = `
      <div class="stub-card">
        <div class="stub-card-msg">${account.platform} has no public API. This is a profile link only.</div>
        <a href="${account.url}" target="_blank" rel="noopener" style="color:var(--blue); font-size:12px; font-weight:600;">Open ${account.handle} ↗</a>
      </div>
    `;
  }

  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="hub-section-title" style="color:${account.color}">${account.platform}</span>
          <span class="hub-section-badge">${account.handle}</span>
          <span class="social-api-badge ${account.apiSupport}">${account.apiSupport}</span>
        </div>
        <a href="${account.url}" target="_blank" rel="noopener" style="font-size:11px; color:var(--blue);">Open ↗</a>
      </div>
      <div class="hub-section-body">${liveSection}</div>
    </div>
  `;
}

export function renderSocialView(state) {
  const { socialData = null } = state;

  const fullAccounts = SOCIAL_ACCOUNTS.filter((a) => a.apiSupport === "full");
  const limitedAccounts = SOCIAL_ACCOUNTS.filter((a) => a.apiSupport === "limited");
  const stubAccounts = SOCIAL_ACCOUNTS.filter((a) => a.apiSupport === "stub");

  return `
    <div class="main-panel">
      <div class="view-header">
        <div class="view-title">Social Accounts</div>
        <div class="view-subtitle">${SOCIAL_ACCOUNTS.length} accounts across ${new Set(SOCIAL_ACCOUNTS.map((a) => a.platform)).size} platforms.</div>
      </div>

      <div class="hub-sections">
        ${fullAccounts.length > 0 ? `
          <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--green); margin-bottom:4px;">
            Live Data
          </div>
          ${fullAccounts.map((a) => renderAccountPanel(a, socialData)).join("")}
        ` : ""}

        ${limitedAccounts.length > 0 ? `
          <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--gold); margin:12px 0 4px;">
            API Access Pending
          </div>
          ${limitedAccounts.map((a) => renderAccountPanel(a, socialData)).join("")}
        ` : ""}

        ${stubAccounts.length > 0 ? `
          <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin:12px 0 4px;">
            Profile Links
          </div>
          ${stubAccounts.map((a) => renderAccountPanel(a, socialData)).join("")}
        ` : ""}
      </div>
    </div>
  `;
}
