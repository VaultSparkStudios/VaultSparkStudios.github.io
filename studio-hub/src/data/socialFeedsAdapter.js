// Social feeds adapter
// "full" = live data available now
// "limited" = API restricted/paid — returns null, UI shows stub card with link
// "stub" = no API — returns null, UI shows profile link card only

const CACHE_PREFIX = "vshub_social_";

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
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=VaultSparkStudios&key=${apiKey}`
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const channel = searchData.items?.[0];
    if (!channel) return null;

    const channelId = channel.id;

    // Fetch latest videos
    const videosRes = await fetch(
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
      latestVideos: (videosData?.items || []).map((v) => ({
        id: v.id?.videoId,
        title: v.snippet?.title,
        publishedAt: v.snippet?.publishedAt,
        thumbnail: v.snippet?.thumbnails?.default?.url,
        url: `https://www.youtube.com/watch?v=${v.id?.videoId}`,
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
      fetch("https://www.reddit.com/r/VaultSparkStudios/about.json", {
        headers: { "User-Agent": "VaultSparkStudioHub/1.0" },
      }),
      fetch("https://www.reddit.com/r/VaultSparkStudios/new.json?limit=5", {
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
    const profileRes = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`
    );
    if (!profileRes.ok) return null;
    const profile = await profileRes.json();

    const feedRes = await fetch(
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
// Uses public Gumroad profile page scraping (no API key required for public products).
// For full sales data, a Gumroad API access token is needed.
export async function fetchGumroadProducts(ttlMs = 600000) {
  const key = "gumroad";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  // Gumroad public API: lists products for a user (no auth for public products)
  try {
    const res = await fetch("https://api.gumroad.com/v2/products", {
      headers: { "Content-Type": "application/json" },
    });
    // Without an access token this returns 401 — fall back gracefully
    if (!res.ok) return { profileUrl: "https://vaultsparkstudios.gumroad.com/", products: [] };
    const data = await res.json();
    const result = {
      profileUrl: "https://vaultsparkstudios.gumroad.com/",
      products: (data.products || []).map((p) => ({
        name: p.name,
        price: p.formatted_price,
        sales: p.sales_count,
        url: p.short_url,
      })),
    };
    writeCache(key, result);
    return result;
  } catch {
    return { profileUrl: "https://vaultsparkstudios.gumroad.com/", products: [] };
  }
}

// Fetch all live social feeds in parallel.
export async function fetchAllSocialFeeds(youtubeApiKey = "", ttlMs = 600000) {
  const [youtube, reddit, bluesky, gumroad] = await Promise.all([
    fetchYouTubeStats(youtubeApiKey, ttlMs),
    fetchRedditStats(ttlMs),
    fetchBlueskyStats(ttlMs),
    fetchGumroadProducts(ttlMs),
  ]);
  return { youtube, reddit, bluesky, gumroad };
}
