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

// Fetch all studio Supabase data in parallel.
export async function fetchAllSupabaseData(supabaseUrl, anonKey, ttlMs = 300000) {
  if (!supabaseUrl || !anonKey) return null;
  const [members, sessions, pulse, challenges, betaKeys, economy, investorRequests] = await Promise.all([
    fetchMemberStats(supabaseUrl, anonKey, ttlMs),
    fetchGameSessions(supabaseUrl, anonKey, ttlMs),
    fetchStudioPulse(supabaseUrl, anonKey, 60000),
    fetchChallenges(supabaseUrl, anonKey, ttlMs),
    fetchBetaKeyInventory(supabaseUrl, anonKey, ttlMs),
    fetchPointEconomy(supabaseUrl, anonKey, ttlMs),
    fetchInvestorRequestCount(supabaseUrl, anonKey, 60000),
  ]);
  return { members, sessions, pulse, challenges, betaKeys, economy, investorRequests };
}
