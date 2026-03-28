import { SOCIAL_ACCOUNTS } from "../data/studioRegistry.js";
import { fmt, timeAgo, escapeHtml, safeGetJSON } from "../utils/helpers.js";

const PLATFORM_ERROR_MESSAGES = {
  no_key:   "No API key configured — add one in Settings to enable live data.",
  no_token: "No access token configured — add one in Settings to enable live data.",
};

function renderAccountPanel(account, socialData, prevSocial = null, fetchedAt = null, platformErrors = {}) {
  // Map account id → error key for platforms that need credentials
  const platformKey = account.id === "youtube" ? "youtube" : account.id === "gumroad" ? "gumroad" : null;
  const errCode = platformKey ? platformErrors[platformKey] : null;
  let liveSection = "";

  if (account.id === "youtube" && socialData?.youtube) {
    const d = socialData.youtube;
    const avgViews = d.videoCount > 0 && d.totalViews ? Math.round(d.totalViews / d.videoCount) : null;
    const bestVideo = (d.latestVideos ?? []).reduce((best, v) => (!best || (v.viewCount || 0) > (best.viewCount || 0)) ? v : best, null);
    const ytPrevSubs = prevSocial?.ytSubs;
    const ytDelta = ytPrevSubs != null && d.subscribers != null ? d.subscribers - ytPrevSubs : null;
    liveSection = `
      <div class="two-col" style="gap:12px; margin-bottom:16px;">
        <div class="vital-card"><div class="vital-label">Subscribers</div><div class="vital-value cyan">${fmt(d.subscribers)}</div></div>
        <div class="vital-card"><div class="vital-label">Total Views</div><div class="vital-value">${fmt(d.totalViews)}</div></div>
        <div class="vital-card"><div class="vital-label">Videos</div><div class="vital-value">${fmt(d.videoCount)}</div></div>
        ${avgViews ? `<div class="vital-card"><div class="vital-label">Avg Views/Video</div><div class="vital-value">${fmt(avgViews)}</div></div>` : ""}
        ${ytDelta !== null && ytDelta !== 0 ? `<div class="vital-card"><div class="vital-label">Subscriber Δ</div><div class="vital-value ${ytDelta > 0 ? "green" : "red"}">${ytDelta > 0 ? "+" : ""}${ytDelta}</div></div>` : ""}
      </div>
      ${bestVideo ? `
        <div style="margin-bottom:12px; padding:10px 12px; background:${account.color}0F; border:1px solid ${account.color}26; border-radius:8px;">
          <div style="font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${account.color}; margin-bottom:4px;">Top Recent Video</div>
          <a href="${bestVideo.url}" target="_blank" rel="noopener" style="font-size:13px; color:var(--text); font-weight:500; display:block; line-height:1.4;">${escapeHtml(bestVideo.title)}</a>
          <div style="font-size:11px; color:var(--muted); margin-top:3px;">${timeAgo(bestVideo.publishedAt)}${bestVideo.viewCount ? ` · ${fmt(bestVideo.viewCount)} views` : ""}</div>
        </div>
      ` : ""}
      ${d.latestVideos?.length > 0 ? `
        <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;">Latest Videos</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${d.latestVideos.map((v) => `
            <div class="commit-item">
              <div class="commit-message">
                <a href="${v.url}" target="_blank" rel="noopener" style="color:var(--text);">${escapeHtml(v.title)}</a>
              </div>
              <div class="commit-meta">${timeAgo(v.publishedAt)}${v.viewCount ? ` · ${fmt(v.viewCount)} views` : ""}</div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    `;
  } else if (account.id === "reddit-community" && socialData?.reddit) {
    const d = socialData.reddit;
    const posts = d.latestPosts || [];
    const topPost = posts.reduce((best, p) => (!best || p.score > best.score) ? p : best, null);
    const engagementRate = d.subscribers > 0 ? ((d.activeUsers / d.subscribers) * 100).toFixed(2) : null;
    const rdPrev = prevSocial?.rdSubs;
    const rdDelta = rdPrev != null && d.subscribers != null ? d.subscribers - rdPrev : null;
    liveSection = `
      <div class="two-col" style="gap:12px; margin-bottom:16px;">
        <div class="vital-card"><div class="vital-label">Members</div><div class="vital-value cyan">${fmt(d.subscribers)}</div></div>
        <div class="vital-card"><div class="vital-label">Online Now</div><div class="vital-value green">${fmt(d.activeUsers)}</div></div>
        ${engagementRate ? `<div class="vital-card"><div class="vital-label">Engagement Rate</div><div class="vital-value">${engagementRate}%</div></div>` : ""}
        ${rdDelta !== null && rdDelta !== 0 ? `<div class="vital-card"><div class="vital-label">Member Δ</div><div class="vital-value ${rdDelta > 0 ? "green" : "red"}">${rdDelta > 0 ? "+" : ""}${rdDelta}</div></div>` : ""}
      </div>
      ${topPost ? `
        <div style="margin-bottom:12px; padding:10px 12px; background:${account.color}0F; border:1px solid ${account.color}26; border-radius:8px;">
          <div style="font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${account.color}; margin-bottom:4px;">Trending Post</div>
          <a href="${topPost.url}" target="_blank" rel="noopener" style="font-size:13px; color:var(--text); font-weight:500; display:block; line-height:1.4;">${escapeHtml(topPost.title)}</a>
          <div style="font-size:11px; color:var(--muted); margin-top:3px;">
            ${topPost.score} pts · ${topPost.comments} comments · ${topPost.upvoteRatio ? `${Math.round(topPost.upvoteRatio * 100)}% upvoted · ` : ""}${timeAgo(topPost.createdAt)}
          </div>
        </div>
      ` : ""}
      ${posts.length > 0 ? `
        <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;">Latest Posts</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${posts.map((p) => `
            <div class="commit-item">
              <div class="commit-message">
                <a href="${p.url}" target="_blank" rel="noopener" style="color:var(--text);">${escapeHtml(p.title)}</a>
              </div>
              <div class="commit-meta">u/${p.author} · ${p.score} pts · ${p.comments} comments${p.upvoteRatio ? ` · ${Math.round(p.upvoteRatio * 100)}% upvoted` : ""} · ${timeAgo(p.createdAt)}</div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    `;
  } else if (account.id === "bluesky" && socialData?.bluesky) {
    const d = socialData.bluesky;
    const bkPrev = prevSocial?.bkFollowers;
    const bkDelta = bkPrev != null && d.followers != null ? d.followers - bkPrev : null;
    liveSection = `
      <div class="two-col" style="gap:12px; margin-bottom:16px;">
        <div class="vital-card"><div class="vital-label">Followers</div><div class="vital-value cyan">${fmt(d.followers)}</div></div>
        <div class="vital-card"><div class="vital-label">Posts</div><div class="vital-value">${fmt(d.posts)}</div></div>
        ${bkDelta !== null && bkDelta !== 0 ? `<div class="vital-card"><div class="vital-label">Follower Δ</div><div class="vital-value ${bkDelta > 0 ? "green" : "red"}">${bkDelta > 0 ? "+" : ""}${bkDelta}</div></div>` : ""}
      </div>
      ${d.latestPosts?.length > 0 ? `
        <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;">Latest Posts</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${d.latestPosts.map((p) => `
            <div class="commit-item">
              <div class="commit-message" style="white-space:normal;">${escapeHtml(p.text.slice(0, 120))}${p.text.length > 120 ? "…" : ""}</div>
              <div class="commit-meta">${timeAgo(p.createdAt)} · ${fmt(p.likes)} likes · ${fmt(p.reposts)} reposts</div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    `;
  } else if (account.id === "gumroad" && socialData?.gumroad) {
    const d = socialData.gumroad;
    const products = d.products || [];
    const totalRevenue = products.reduce((sum, p) => {
      const price = parseFloat(String(p.price).replace(/[^0-9.]/g, "")) || 0;
      return sum + price * (p.sales || 0);
    }, 0);
    liveSection = `
      ${products.length > 0 ? `
        ${totalRevenue > 0 ? `
          <div class="two-col" style="gap:12px; margin-bottom:16px;">
            <div class="vital-card"><div class="vital-label">Est. Total Revenue</div><div class="vital-value cyan">$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div></div>
            <div class="vital-card"><div class="vital-label">Products</div><div class="vital-value">${products.length}</div></div>
          </div>
        ` : ""}
        <div style="font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:var(--muted); margin-bottom:10px;">Products</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${products.map((p) => {
            const price = parseFloat(String(p.price).replace(/[^0-9.]/g, "")) || 0;
            const rev = price * (p.sales || 0);
            return `
            <div class="data-row">
              <span class="label"><a href="${p.url}" target="_blank" rel="noopener" style="color:var(--text);">${p.name}</a></span>
              <span class="value">${p.price} · ${fmt(p.sales)} sales${rev > 0 ? ` · $${rev.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : ""}</span>
            </div>
          `}).join("")}
        </div>
      ` : `<div class="empty-state">Configure Gumroad API token for product data.</div>`}
    `;
  } else if (errCode) {
    // Has API support but credentials missing — show actionable hint
    const msg = PLATFORM_ERROR_MESSAGES[errCode] || "Data unavailable.";
    liveSection = `
      <div class="alert-item warning" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <span>${msg}</span>
        <a href="${account.url}" target="_blank" rel="noopener noreferrer" style="color:var(--gold); white-space:nowrap;">Open Profile ↗</a>
      </div>
    `;
  } else if (account.apiSupport === "limited") {
    liveSection = `
      <div class="alert-item warning">
        Full API access pending for ${account.platform}. Add credentials to unlock live data.
        <a href="${account.url}" target="_blank" rel="noopener noreferrer" style="margin-left:8px; color:var(--gold);">Open Profile ↗</a>
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

  if (fetchedAt && liveSection) {
    liveSection += `<div style="font-size:10px; color:var(--muted); opacity:0.6; margin-top:12px; text-align:right;">Updated ${timeAgo(new Date(fetchedAt).toISOString())}</div>`;
  }

  return `
    <div class="hub-section" style="border-left:3px solid ${account.color}30;">
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
  const platformErrors = socialData?._errors || {};
  let prevSocial = safeGetJSON("vshub_social_prev", null);
  const socialFetchedAt = (() => { try { return parseInt(localStorage.getItem("vshub_social_fetched_at") || "0") || null; } catch { return null; } })();

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
          ${fullAccounts.map((a) => renderAccountPanel(a, socialData, prevSocial, socialFetchedAt, platformErrors)).join("")}
        ` : ""}

        ${limitedAccounts.length > 0 ? `
          <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--gold); margin:12px 0 4px;">
            API Access Pending
          </div>
          ${limitedAccounts.map((a) => renderAccountPanel(a, socialData, prevSocial, socialFetchedAt, platformErrors)).join("")}
        ` : ""}

        ${stubAccounts.length > 0 ? `
          <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); margin:12px 0 4px;">
            Profile Links
          </div>
          ${stubAccounts.map((a) => renderAccountPanel(a, socialData, prevSocial, socialFetchedAt, platformErrors)).join("")}
        ` : ""}
      </div>
    </div>
  `;
}
