// VaultSpark Studio Hub — Service Worker
// Caches the app shell for offline / fast-reload access.
// Static asset list is kept minimal — API data is never cached here.

const CACHE_VERSION = "vshub-sw-v27";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./src/styles/hub.css",
  "./src/clientApp.js",
  "./src/config/runtimeConfig.js",
  "./src/data/githubAdapter.js",
  "./src/data/socialFeedsAdapter.js",
  "./src/data/studioRegistry.js",
  "./src/data/supabaseAdapter.js",
  "./src/utils/projectScoring.js",
  "./src/utils/proprietaryScores.js",
  "./src/utils/scoreForecast.js",
  "./src/utils/helpers.js",
  "./src/components/ambientView.js",
  "./src/components/heatmapView.js",
  "./src/components/portfolioTimelineView.js",
  "./src/components/commandPalette.js",
  "./src/components/compareView.js",
  "./src/components/navigation.js",
  "./src/components/privacyGate.js",
  "./src/components/projectHubView.js",
  "./src/components/settingsView.js",
  "./src/components/socialView.js",
  "./src/components/studioHubView.js",
  "./src/components/ticketingView.js",
  "./src/components/vaultAdminView.js",
  "./src/components/virtualOfficeView.js",
  "./src/components/hub/agentIntelligence.js",
  "./src/components/hub/hubModals.js",
  "./src/components/hub/alertPanel.js",
  "./src/components/hub/brainPanel.js",
  "./src/components/hub/healthTimeline.js",
  "./src/components/hub/hubHelpers.js",
  "./src/components/hub/hubStorage.js",
  "./src/components/hub/leaderboard.js",
  "./src/components/hub/morningBrief.js",
  "./src/components/hub/scoreLedger.js",
  "./src/components/hub/socialSummary.js",
  "./src/components/hub/sprintPanel.js",
  "./src/components/hub/vitalsStrip.js",
  "./src/components/hub/gamificationPanel.js",
  "./src/components/project/projectScorePanel.js",
  "./src/components/project/projectGoals.js",
  "./src/components/project/projectRoadmap.js",
  "./src/components/project/projectNotes.js",
  "./src/components/project/projectActionQueue.js",
  "./src/utils/achievements.js",
  "./src/utils/studioXP.js",
  "./src/utils/challenges.js",
  "./src/utils/aiPrescriptions.js",
  "./src/utils/scoreHistory.js",
  "./src/components/globalSearch.js",
  "./src/engine/gistSync.js",
  "./src/engine/syncEngine.js",
  "./src/components/competitiveView.js",
  "./src/components/analyticsView.js",
  "./src/components/agentsView.js",
  "./src/components/agentCommandsView.js",
  "./src/components/aiCopilotView.js",
  "./src/components/prReviewView.js",
  "./src/data/websiteAnalytics.js",
  "./src/data/competitorDiscovery.js",
  "./src/utils/digestHelpers.js",
  "./src/components/toastManager.js",
  "./src/events/settingsEvents.js",
  "./src/events/projectHubEvents.js",
  "./src/events/heatmapEvents.js",
  "./src/events/compareEvents.js",
  "./src/events/ticketingEvents.js",
  "./src/utils/exportHelpers.js",
  "./src/utils/rssFeed.js",
  "./src/utils/scoreExplainer.js",
  "./src/utils/predictiveAlerts.js",
  "./src/engine/idb.js",
  "./src/engine/renderEngine.js",
  "./src/boot-error-handler.js",
  "./src/sw-register.js",
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        // If any file fails to cache, log but don't block install
        console.warn("[SW] Pre-cache failed for some files:", err);
      })
    )
  );
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML/JS, fall back to cache on failure
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
