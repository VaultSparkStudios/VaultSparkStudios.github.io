// Supabase REST adapter (read-only with anon key, admin writes proxied through hub API)
// The anon key is safe to use in the browser — it only exposes data that Supabase RLS allows publicly.

const CACHE_PREFIX = "vshub_sb_";

function cacheKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

function readCache(key, ttlMs) {
  try {
    const raw = sessionStorage.getItem(cacheKey(key));
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
    sessionStorage.setItem(cacheKey(key), JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

async function sbFetch(supabaseUrl, anonKey, path) {
  if (!supabaseUrl || !anonKey) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchMemberStats(supabaseUrl, anonKey, ttlMs = 300000) {
  const key = "member_stats";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const [members, recent] = await Promise.all([
    sbFetch(supabaseUrl, anonKey, "vault_members?select=id,points,created_at,prefs"),
    sbFetch(supabaseUrl, anonKey, "vault_members?select=created_at&order=created_at.desc&limit=30"),
  ]);

  if (!members) return null;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const data = {
    total: members.length,
    newThisWeek: members.filter((m) => new Date(m.created_at).getTime() > sevenDaysAgo).length,
    newThisMonth: members.filter((m) => new Date(m.created_at).getTime() > thirtyDaysAgo).length,
    recentJoins: (recent || []).slice(0, 10).map((m) => m.created_at),
  };

  writeCache(key, data);
  return data;
}

export async function fetchGameSessions(supabaseUrl, anonKey, ttlMs = 300000) {
  const key = "game_sessions";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const rows = await sbFetch(supabaseUrl, anonKey, "game_sessions?select=game_slug,created_at");
  if (!rows) return null;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const bySlug = {};
  for (const row of rows) {
    if (!bySlug[row.game_slug]) bySlug[row.game_slug] = { total: 0, week: 0 };
    bySlug[row.game_slug].total++;
    if (new Date(row.created_at).getTime() > sevenDaysAgo) bySlug[row.game_slug].week++;
  }

  writeCache(key, bySlug);
  return bySlug;
}

export async function fetchStudioPulse(supabaseUrl, anonKey, ttlMs = 60000) {
  const key = "studio_pulse";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const rows = await sbFetch(supabaseUrl, anonKey, "studio_pulse?select=*&order=created_at.desc&limit=20");
  if (!rows) return [];

  writeCache(key, rows);
  return rows;
}

export async function fetchChallenges(supabaseUrl, anonKey, ttlMs = 300000) {
  const key = "challenges";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const rows = await sbFetch(supabaseUrl, anonKey, "challenges?select=*&active=eq.true");
  if (!rows) return [];

  writeCache(key, rows);
  return rows;
}

export async function fetchBetaKeyInventory(supabaseUrl, anonKey, ttlMs = 300000) {
  const key = "beta_keys";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const rows = await sbFetch(supabaseUrl, anonKey, "beta_keys?select=game_slug,claimed");
  if (!rows) return {};

  const bySlug = {};
  for (const row of rows) {
    if (!bySlug[row.game_slug]) bySlug[row.game_slug] = { total: 0, claimed: 0, available: 0 };
    bySlug[row.game_slug].total++;
    if (row.claimed) bySlug[row.game_slug].claimed++;
    else bySlug[row.game_slug].available++;
  }

  writeCache(key, bySlug);
  return bySlug;
}

export async function fetchPointEconomy(supabaseUrl, anonKey, ttlMs = 300000) {
  const key = "point_economy";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const rows = await sbFetch(supabaseUrl, anonKey, "point_events?select=reason,points,created_at");
  if (!rows) return null;

  const byReason = {};
  let total = 0;
  for (const row of rows) {
    if (!byReason[row.reason]) byReason[row.reason] = 0;
    byReason[row.reason] += row.points;
    total += row.points;
  }

  const data = { total, byReason };
  writeCache(key, data);
  return data;
}

export async function fetchInvestorRequestCount(supabaseUrl, anonKey, ttlMs = 60000) {
  const key = "investor_req_count";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  // Calls the get_investor_request_count() security definer RPC (anon-safe — returns counts only)
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_investor_request_count`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!res.ok) return { pending: 0, total: 0 };
    const data = await res.json();
    writeCache(key, data);
    return data;
  } catch {
    return { pending: 0, total: 0 };
  }
}

// Revenue data: count of VaultSparked subscribers
export async function fetchRevenue(supabaseUrl, anonKey, ttlMs = 300000) {
  const key = "revenue";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/vault_members?select=id&is_vaultsparked=eq.true`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Prefer: "count=exact",
      },
    });
    if (!res.ok) {
      const data = { vaultSparkedCount: 0 };
      writeCache(key, data);
      return data;
    }
    const contentRange = res.headers.get("Content-Range");
    let count = 0;
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) count = parseInt(match[1], 10);
    } else {
      const rows = await res.json();
      count = Array.isArray(rows) ? rows.length : 0;
    }
    const data = { vaultSparkedCount: count };
    writeCache(key, data);
    return data;
  } catch {
    return { vaultSparkedCount: 0 };
  }
}

// Analytics: game sessions (last 30 days) + member growth (last 8 weeks)
export async function fetchAnalytics(supabaseUrl, anonKey, ttlMs = 300000) {
  const key = "analytics";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString();

    const [sessionRows, memberRows] = await Promise.all([
      sbFetch(supabaseUrl, anonKey, `game_sessions?select=game,created_at&created_at=gte.${thirtyDaysAgo}`),
      sbFetch(supabaseUrl, anonKey, `vault_members?select=created_at&created_at=gte.${eightWeeksAgo}&order=created_at.asc`),
    ]);

    // Group members by week
    const weekGroups = {};
    let runningTotal = 0;
    (memberRows || []).forEach((m) => {
      const d = new Date(m.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key2 = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weekGroups[key2] = (weekGroups[key2] || 0) + 1;
    });

    const memberGrowth = Object.entries(weekGroups).map(([week, new_members]) => {
      runningTotal += new_members;
      return { week, new_members, total: runningTotal };
    });

    const data = { sessions: sessionRows || [], memberGrowth };
    writeCache(key, data);
    return data;
  } catch {
    return { sessions: [], memberGrowth: [] };
  }
}


// First-party page analytics from page_views table
export async function fetchPageViews(supabaseUrl, anonKey, ttlMs = 120000) {
  const key = "page_views";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();

  const [allRows, recent30, recent7] = await Promise.all([
    sbFetch(supabaseUrl, anonKey, "page_views?select=page_path,session_id,user_id,referrer&limit=10000"),
    sbFetch(supabaseUrl, anonKey, "page_views?select=page_path,page_title,session_id,user_id,referrer,viewed_at&viewed_at=gte." + thirtyDaysAgo + "&order=viewed_at.asc&limit=10000"),
    sbFetch(supabaseUrl, anonKey, "page_views?select=page_path,session_id&viewed_at=gte." + sevenDaysAgo + "&limit=5000"),
  ]);

  if (!allRows) return null;

  const totalViews     = allRows.length;
  const uniqueSessions = new Set(allRows.map((r) => r.session_id).filter(Boolean)).size;
  const loggedInViews  = allRows.filter((r) => r.user_id).length;

  const rows30   = recent30 || [];
  const views30  = rows30.length;
  const sessions30 = new Set(rows30.map((r) => r.session_id).filter(Boolean)).size;
  const loggedIn30 = rows30.filter((r) => r.user_id).length;

  const rows7    = recent7 || [];
  const views7   = rows7.length;
  const sessions7 = new Set(rows7.map((r) => r.session_id).filter(Boolean)).size;

  const pageCount = {}, pageTitle = {}, pageUsers = {};
  for (const r of rows30) {
    pageCount[r.page_path] = (pageCount[r.page_path] || 0) + 1;
    if (r.page_title && !pageTitle[r.page_path]) pageTitle[r.page_path] = r.page_title;
    if (r.user_id) pageUsers[r.page_path] = (pageUsers[r.page_path] || 0) + 1;
  }
  const topPages = Object.entries(pageCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 20)
    .map(([p, v]) => ({ path: p, title: pageTitle[p] || p, views: v, loggedIn: pageUsers[p] || 0 }));

  const dailyMap = {};
  for (const r of rows30) { const day = r.viewed_at.slice(0, 10); dailyMap[day] = (dailyMap[day] || 0) + 1; }
  const daily = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    daily.push({ date: d, views: dailyMap[d] || 0 });
  }

  const refCount = {};
  for (const r of rows30) { if (!r.referrer) continue; refCount[r.referrer] = (refCount[r.referrer] || 0) + 1; }
  const topReferrers = Object.entries(refCount).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([referrer, count]) => ({ referrer, count }));

  const data = { totalViews, uniqueSessions, loggedInViews, views30, sessions30, loggedIn30, views7, sessions7, topPages, daily, topReferrers };
  writeCache(key, data);
  return data;
}

// Rich member analytics: tier breakdown, cohorts, VaultSparked
export async function fetchMemberAnalytics(supabaseUrl, anonKey, ttlMs = 300000) {
  const key = "member_analytics";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const [members, vaultsparked, pointEvents] = await Promise.all([
    sbFetch(supabaseUrl, anonKey, "vault_members?select=id,username,points,rank,is_vaultsparked,created_at&order=created_at.asc&limit=5000"),
    sbFetch(supabaseUrl, anonKey, "vault_members?select=id,username,points,rank,created_at&is_vaultsparked=eq.true&order=points.desc&limit=100"),
    sbFetch(supabaseUrl, anonKey, "point_events?select=reason,points,created_at&order=created_at.desc&limit=2000"),
  ]);

  if (!members) return null;

  const now = Date.now();
  const tierNames = ['Spark Initiate','Vault Runner','Forge Guard','Vault Keeper','Ember Warden','Signal Breaker','Vault Sentinel','The Sparked','VaultSparked'];
  const tierCounts = Array(9).fill(0);
  for (const m of members) { const r = Math.min(Math.max(Number(m.rank) || 0, 0), 8); tierCounts[r]++; }
  const tierBreakdown = tierNames.map((name, i) => ({ name, rank: i, count: tierCounts[i] }));

  const buckets = [
    {label:'0–99',min:0,max:99},{label:'100–499',min:100,max:499},{label:'500–999',min:500,max:999},
    {label:'1K–2.4K',min:1000,max:2499},{label:'2.5K–4.9K',min:2500,max:4999},
    {label:'5K–9.9K',min:5000,max:9999},{label:'10K+',min:10000,max:Infinity},
  ];
  const pointsBuckets = buckets.map((b) => ({ label: b.label, count: members.filter((m) => m.points >= b.min && m.points <= b.max).length }));

  const cohortMap = {};
  for (const m of members) {
    const d = new Date(m.created_at);
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    cohortMap[k] = (cohortMap[k] || 0) + 1;
  }
  const cohort = Object.entries(cohortMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
    .map(([month, count]) => ({ month, count }));

  const topMembers = [...members].sort((a, b) => b.points - a.points).slice(0, 10)
    .map((m) => ({ username: m.username, points: m.points, rank: m.rank, is_vaultsparked: m.is_vaultsparked }));

  const vsCount   = members.filter((m) => m.is_vaultsparked).length;
  const vsList    = (vaultsparked || []).map((m) => ({ username: m.username, points: m.points, rank: m.rank, joinedAgo: Math.floor((now - new Date(m.created_at).getTime()) / 86400000) }));

  const eventTotals = {};
  for (const e of (pointEvents || [])) { eventTotals[e.reason] = (eventTotals[e.reason] || 0) + e.points; }
  const topEvents = Object.entries(eventTotals).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([reason, pts]) => ({ reason, pts }));

  const avgPoints = members.length ? Math.round(members.reduce((s, m) => s + (m.points || 0), 0) / members.length) : 0;
  const signups7  = members.filter((m) => new Date(m.created_at).getTime() > now - 7*86400000).length;
  const signups30 = members.filter((m) => new Date(m.created_at).getTime() > now - 30*86400000).length;

  const data = { total: members.length, vsCount, signups7, signups30, avgPoints, tierBreakdown, pointsBuckets, cohort, topMembers, vsList, topEvents };
  writeCache(key, data);
  return data;
}

// Journal views: per-article read counts
export async function fetchJournalViews(supabaseUrl, anonKey, ttlMs = 300000) {
  const key = "journal_views";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [allTime, recent] = await Promise.all([
    sbFetch(supabaseUrl, anonKey, "journal_views?select=post_slug"),
    sbFetch(supabaseUrl, anonKey, `journal_views?select=post_slug,viewed_at&viewed_at=gte.${thirtyDaysAgo}`),
  ]);

  if (!allTime) return null;

  // Aggregate by slug
  const bySlug = {};
  for (const row of allTime) {
    bySlug[row.post_slug] = (bySlug[row.post_slug] || 0) + 1;
  }
  const recentBySlug = {};
  for (const row of (recent || [])) {
    recentBySlug[row.post_slug] = (recentBySlug[row.post_slug] || 0) + 1;
  }

  const data = {
    total: allTime.length,
    recent30d: (recent || []).length,
    bySlug,
    recentBySlug,
    topArticles: Object.entries(bySlug)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([slug, views]) => ({ slug, views, recent: recentBySlug[slug] || 0 })),
  };

  writeCache(key, data);
  return data;
}

// Fan art submissions
export async function fetchFanArt(supabaseUrl, anonKey, ttlMs = 300000) {
  const key = "fan_art";
  const cached = readCache(key, ttlMs);
  if (cached) return cached;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await sbFetch(supabaseUrl, anonKey, "fan_art_submissions?select=id,status,submitted_at&order=submitted_at.desc&limit=200");
  if (!rows) return null;

  const data = {
    total: rows.length,
    approved: rows.filter((r) => r.status === "approved").length,
    pending: rows.filter((r) => r.status === "pending" || !r.status).length,
    newThisWeek: rows.filter((r) => new Date(r.submitted_at).getTime() > new Date(sevenDaysAgo).getTime()).length,
  };

  writeCache(key, data);
  return data;
}

// Fetch all studio Supabase data in parallel.
export async function fetchAllSupabaseData(supabaseUrl, anonKey, ttlMs = 300000) {
  if (!supabaseUrl || !anonKey) return null;
  const [members, sessions, pulse, challenges, betaKeys, economy, investorRequests, revenue, analytics, pageViews, memberAnalytics, journalViews, fanArt] = await Promise.all([
    fetchMemberStats(supabaseUrl, anonKey, ttlMs),
    fetchGameSessions(supabaseUrl, anonKey, ttlMs),
    fetchStudioPulse(supabaseUrl, anonKey, 60000),
    fetchChallenges(supabaseUrl, anonKey, ttlMs),
    fetchBetaKeyInventory(supabaseUrl, anonKey, ttlMs),
    fetchPointEconomy(supabaseUrl, anonKey, ttlMs),
    fetchInvestorRequestCount(supabaseUrl, anonKey, 60000),
    fetchRevenue(supabaseUrl, anonKey, ttlMs),
    fetchAnalytics(supabaseUrl, anonKey, ttlMs),
    fetchJournalViews(supabaseUrl, anonKey, ttlMs),
    fetchFanArt(supabaseUrl, anonKey, ttlMs),
  ]);
  return { members, sessions, pulse, challenges, betaKeys, economy, investorRequests, revenue, analytics, pageViews, memberAnalytics, journalViews, fanArt };
}
