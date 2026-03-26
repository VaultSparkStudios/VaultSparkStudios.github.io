// Google Analytics 4 Data API adapter
// Uses Google Identity Services (GIS) for OAuth 2.0 token — no service account required.
// The OAuth client_id is safe to embed (it's a public identifier, not a secret).
//
// Setup:
//   1. Create a project in Google Cloud Console
//   2. Enable "Google Analytics Data API"
//   3. Create OAuth 2.0 Web Client credentials
//      - Authorised JS origin: http://localhost + your studio-hub URL (or file://)
//   4. Add the client_id to Settings → GA4 OAuth Client ID
//   5. Add your GA4 Property ID to Settings → GA4 Property ID
//      (Find it: GA4 → Admin → Property → Property details)

const GA4_ENDPOINT = "https://analyticsdata.googleapis.com/v1beta/properties";
const GIS_SCRIPT_ID = "vshub_gis_script";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

let _tokenClient = null;
let _accessToken = null;
let _tokenExpiry = 0;
let _resolveToken = null;

// Load GIS script lazily
function loadGIS() {
  return new Promise((resolve, reject) => {
    if (typeof window.google?.accounts?.oauth2 !== "undefined") { resolve(); return; }
    if (document.getElementById(GIS_SCRIPT_ID)) {
      // Already loading — wait
      const check = setInterval(() => {
        if (typeof window.google?.accounts?.oauth2 !== "undefined") { clearInterval(check); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = GIS_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

// Request or reuse a valid access token
export async function getAccessToken(clientId) {
  if (!clientId) throw new Error("No GA4 OAuth Client ID configured. Add it in Settings.");

  // Reuse if still valid (with 60s buffer)
  if (_accessToken && Date.now() < _tokenExpiry - 60000) return _accessToken;

  await loadGIS();

  return new Promise((resolve, reject) => {
    _resolveToken = resolve;

    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) { reject(new Error(response.error)); return; }
        _accessToken = response.access_token;
        _tokenExpiry = Date.now() + (response.expires_in ?? 3600) * 1000;
        resolve(_accessToken);
      },
    });

    _tokenClient.requestAccessToken({ prompt: _accessToken ? "" : "consent" });
  });
}

export function revokeToken() {
  if (_accessToken) {
    window.google?.accounts?.oauth2?.revoke(_accessToken, () => {});
  }
  _accessToken = null;
  _tokenExpiry = 0;
  _tokenClient = null;
}

export function isConnected() {
  return !!_accessToken && Date.now() < _tokenExpiry - 60000;
}

// Run a GA4 Data API report
async function runReport(propertyId, clientId, body) {
  const token = await getAccessToken(clientId);
  const res = await fetch(`${GA4_ENDPOINT}/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `GA4 API error ${res.status}`);
  }
  return res.json();
}

// Fetch top pages by pageviews (last 30 days)
export async function fetchTopPages(propertyId, clientId, days = 30) {
  const data = await runReport(propertyId, clientId, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "sessions" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
    ],
    limit: 20,
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
  });

  return (data.rows || []).map((row) => ({
    path:    row.dimensionValues[0].value,
    title:   row.dimensionValues[1].value,
    views:   parseInt(row.metricValues[0].value, 10),
    sessions: parseInt(row.metricValues[1].value, 10),
    bounceRate: parseFloat(row.metricValues[2].value),
    avgDuration: parseFloat(row.metricValues[3].value),
  }));
}

// Fetch overall site vitals (last 30 days)
export async function fetchSiteVitals(propertyId, clientId) {
  const [vitals, daily] = await Promise.all([
    runReport(propertyId, clientId, {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "newUsers" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
    }),
    runReport(propertyId, clientId, {
      dateRanges: [{ startDate: "29daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
  ]);

  const m = vitals.rows?.[0]?.metricValues || [];
  const dailyData = (daily.rows || []).map((r) => ({
    date: r.dimensionValues[0].value,
    views: parseInt(r.metricValues[0].value, 10),
    sessions: parseInt(r.metricValues[1].value, 10),
  }));

  return {
    pageviews:   parseInt(m[0]?.value || "0", 10),
    sessions:    parseInt(m[1]?.value || "0", 10),
    users:       parseInt(m[2]?.value || "0", 10),
    newUsers:    parseInt(m[3]?.value || "0", 10),
    bounceRate:  parseFloat(m[4]?.value || "0"),
    avgDuration: parseFloat(m[5]?.value || "0"),
    daily: dailyData,
  };
}

// Fetch top traffic sources (channels)
export async function fetchTrafficSources(propertyId, clientId) {
  const data = await runReport(propertyId, clientId, {
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }],
    limit: 10,
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  return (data.rows || []).map((row) => ({
    channel: row.dimensionValues[0].value,
    sessions: parseInt(row.metricValues[0].value, 10),
    users: parseInt(row.metricValues[1].value, 10),
  }));
}
