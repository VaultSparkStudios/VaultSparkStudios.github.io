// Social feeds adapter
// "full" = live data available now
// "limited" = API restricted/paid — returns null, UI shows stub card with link
// "stub" = no API — returns null, UI shows profile link card only

const CACHE_PREFIX = "vshub_social_";

// Retry-with-backoff for social fetches (matches ghFetch pattern)
async function socialFetch(url, options = {}, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
      } finally {
        clearTimeout(tid);
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function readCache(key, ttlMs) {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ttlMs) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

// ── YouTube ─────────────────────────────────────────────────────────────────
// Requires YouTube Data API v3 key (free quota: 10,000 units/day).
// Channel handle: @VaultSparkStudios
export async function fetchYouTubeStats(apiKey, ttlMs = 600000) {
  if (!apiKey) return null;
  const key = "youtube";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    // First resolve channel ID from handle
    const searchRes = await socialFetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=VaultSparkStudios&key=${apiKey}`
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const channel = searchData.items?.[0];
    if (!channel) return null;

    const channelId = channel.id;

    // Fetch latest videos
    const videosRes = await socialFetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=5&order=date&type=video&key=${apiKey}`
    );
    const videosData = videosRes.ok ? await videosRes.json() : null;

    const data = {
      channelId,
      name: channel.snippet?.title,
      description: channel.snippet?.description,
      subscribers: Number(channel.statistics?.subscriberCount || 0),
      totalViews: Number(channel.statistics?.viewCount || 0),
      videoCount: Number(channel.statistics?.videoCount || 0),
      latestVideos: (videosData?.items || [])
        .filter((v) => v.id?.videoId)
        .map((v) => ({
          id: v.id.videoId,
          title: v.snippet?.title,
          publishedAt: v.snippet?.publishedAt,
          thumbnail: v.snippet?.thumbnails?.default?.url,
          url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
        })),
    };

    writeCache(key, data);
    return data;
  } catch {
    return null;
  }
}

// ── Reddit ───────────────────────────────────────────────────────────────────
// Uses Reddit's public JSON API — no auth required for public subreddits.
export async function fetchRedditStats(ttlMs = 600000) {
  const key = "reddit";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    const [subRes, postsRes] = await Promise.all([
      socialFetch("https://www.reddit.com/r/VaultSparkStudios/about.json", {
        headers: { "User-Agent": "VaultSparkStudioHub/1.0" },
      }),
      socialFetch("https://www.reddit.com/r/VaultSparkStudios/new.json?limit=5", {
        headers: { "User-Agent": "VaultSparkStudioHub/1.0" },
      }),
    ]);

    const subData = subRes.ok ? await subRes.json() : null;
    const postsData = postsRes.ok ? await postsRes.json() : null;

    const data = {
      subscribers: subData?.data?.subscribers || 0,
      activeUsers: subData?.data?.active_user_count || 0,
      title: subData?.data?.title || "r/VaultSparkStudios",
      latestPosts: (postsData?.data?.children || []).map((p) => ({
        title: p.data.title,
        author: p.data.author,
        score: p.data.score,
        comments: p.data.num_comments,
        createdAt: new Date(p.data.created_utc * 1000).toISOString(),
        url: `https://reddit.com${p.data.permalink}`,
      })),
    };

    writeCache(key, data);
    return data;
  } catch {
    return null;
  }
}

// ── Bluesky ──────────────────────────────────────────────────────────────────
// Uses the public AT Protocol API — no auth required for public profiles.
export async function fetchBlueskyStats(ttlMs = 600000) {
  const key = "bluesky";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    const handle = "vaultsparkstudios.bsky.social";
    const profileRes = await socialFetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`
    );
    if (!profileRes.ok) return null;
    const profile = await profileRes.json();

    const feedRes = await socialFetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${handle}&limit=5`
    );
    const feedData = feedRes.ok ? await feedRes.json() : null;

    const data = {
      handle: profile.handle,
      displayName: profile.displayName,
      followers: profile.followersCount || 0,
      following: profile.followsCount || 0,
      posts: profile.postsCount || 0,
      latestPosts: (feedData?.feed || []).slice(0, 5).map((item) => ({
        text: item.post?.record?.text || "",
        createdAt: item.post?.record?.createdAt || "",
        likes: item.post?.likeCount || 0,
        reposts: item.post?.repostCount || 0,
        url: `https://bsky.app/profile/${handle}/post/${item.post?.uri?.split("/").pop()}`,
      })),
    };

    writeCache(key, data);
    return data;
  } catch {
    return null;
  }
}

// ── Gumroad ──────────────────────────────────────────────────────────────────
// With an access token: returns full product + sales data.
// Without a token: returns 401, falls back to profile link only.
export async function fetchGumroadProducts(accessToken = "", ttlMs = 600000) {
  const key = "gumroad";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const fallback = { profileUrl: "https://vaultsparkstudios.gumroad.com/", products: [], hasToken: !!accessToken };

  if (!accessToken) return fallback;

  try {
    const res = await fetch(`https://api.gumroad.com/v2/products?access_token=${accessToken}`);
    if (!res.ok) return fallback;
    const data = await res.json();
    if (!data.success) return fallback;
    const result = {
      profileUrl: "https://vaultsparkstudios.gumroad.com/",
      hasToken: true,
      products: (data.products || []).map((p) => ({
        name: p.name,
        price: p.formatted_price || "Free",
        sales: p.sales_count ?? 0,
        url: p.short_url || p.url,
        published: p.published,
      })),
    };
    writeCache(key, result);
    return result;
  } catch {
    return fallback;
  }
}

// Fetch recent Gumroad sales (last 30 days) for revenue charting.
export async function fetchGumroadSales(accessToken = "", ttlMs = 600000) {
  if (!accessToken) return null;
  const key = "gumroad_sales";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    const after = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const res = await fetch(`https://api.gumroad.com/v2/sales?access_token=${accessToken}&after=${after}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    const sales = (json.sales || []).map((s) => ({
      id: s.id,
      productName: s.product_name,
      price: Number(s.price || 0) / 100,  // cents to dollars
      createdAt: s.created_at,
    }));
    writeCache(key, sales);
    return sales;
  } catch {
    return null;
  }
}

// ── Social data normalizer ────────────────────────────────────────────────────
// Maps each platform's raw data to a consistent shape for views to consume.
// Returns { platform, count, label, secondaryStat, url }
export function normalizeSocialData(platform, data) {
  if (!data) return { platform, count: null, label: "—", secondaryStat: "—", url: null }

  switch (platform) {
    case "youtube":
      return {
        platform,
        count: data.subscribers ?? null,
        label: "subscribers",
        secondaryStat: "total views: " + (data.totalViews ?? "—"),
        url: data.channelId ? `https://www.youtube.com/channel/${data.channelId}` : "https://youtube.com/@VaultSparkStudios",
      }
    case "reddit":
      return {
        platform,
        count: data.subscribers ?? null,
        label: "members",
        secondaryStat: "online: " + (data.activeUsers ?? "—"),
        url: "https://reddit.com/r/VaultSparkStudios",
      }
    case "bluesky":
      return {
        platform,
        count: data.followers ?? null,
        label: "followers",
        secondaryStat: "posts: " + (data.posts ?? "—"),
        url: data.handle ? `https://bsky.app/profile/${data.handle}` : "https://bsky.app/profile/vaultsparkstudios.bsky.social",
      }
    case "gumroad": {
      const totalSales   = (data.products || []).reduce((s, p) => s + (p.sales || 0), 0)
      const totalRevenue = null // revenue requires gumroadSales endpoint, not available here
      return {
        platform,
        count: totalSales,
        label: "sales",
        secondaryStat: totalRevenue != null ? `revenue: $${totalRevenue}` : "revenue: see sales tab",
        url: data.profileUrl || "https://vaultsparkstudios.gumroad.com/",
      }
    }
    default:
      return { platform, count: null, label: "—", secondaryStat: "—", url: null }
  }
}

// Fetch all live social feeds in parallel.
// Returns { youtube, reddit, bluesky, gumroad, gumroadSales, _errors }
// _errors maps platform name → error message when a fetch fails.
export async function fetchAllSocialFeeds(youtubeApiKey = "", ttlMs = 600000, gumroadToken = "") {
  const _errors = {};
  const safe = async (label, fn) => {
    try { return await fn(); }
    catch (err) { _errors[label] = err?.message || "fetch failed"; return null; }
  };

  const [youtube, reddit, bluesky, gumroad, gumroadSales] = await Promise.all([
    safe("youtube",      () => fetchYouTubeStats(youtubeApiKey, ttlMs)),
    safe("reddit",       () => fetchRedditStats(ttlMs)),
    safe("bluesky",      () => fetchBlueskyStats(ttlMs)),
    safe("gumroad",      () => fetchGumroadProducts(gumroadToken, ttlMs)),
    safe("gumroadSales", () => fetchGumroadSales(gumroadToken, ttlMs)),
  ]);

  if (!youtubeApiKey && !_errors.youtube) _errors.youtube = "no_key";
  if (!gumroadToken  && !_errors.gumroad) _errors.gumroad = "no_token";

  return { youtube, reddit, bluesky, gumroad, gumroadSales, _errors };
}
