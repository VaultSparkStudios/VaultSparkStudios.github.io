// VaultSpark Studios — First-Party Analytics
// Fires one insert into Supabase page_views per page load.
// No third-party scripts. No cookies. Respects DoNotTrack.
(function () {
  'use strict';

  // Skip admin / hub pages
  var path = location.pathname;
  if (
    path.startsWith('/studio-hub') ||
    path.startsWith('/investor-portal') ||
    path.startsWith('/404') ||
    path.startsWith('/offline')
  ) return;

  // Respect DoNotTrack
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  // Respect cookie consent — never track on decline; defer on first visit
  var consentVal;
  try { consentVal = localStorage.getItem('vs_cookie_consent'); } catch (e) {}
  if (consentVal === 'declined') return;

  var SB_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  var SB_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';

  // Session ID — persists for the browser tab session only
  function getSessionId() {
    try {
      var sid = sessionStorage.getItem('vs_sid');
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('vs_sid', sid);
      }
      return sid;
    } catch (e) { return null; }
  }

  // Vault Member user_id from Supabase auth token (if logged in)
  function getUserId() {
    try {
      var raw = localStorage.getItem('sb-fjnpzjjyhnpmunfoycrp-auth-token')
             || localStorage.getItem('supabase.auth.token');
      if (!raw) return null;
      var p = JSON.parse(raw);
      var s = p.currentSession || p;
      return (s && s.user && s.user.id) ? s.user.id : null;
    } catch (e) { return null; }
  }

  // Clean referrer — strip our own domain
  function getReferrer() {
    try {
      var ref = document.referrer;
      if (!ref) return null;
      if (ref.indexOf('vaultsparkstudios.com') !== -1) return null;
      // Return just the hostname
      return new URL(ref).hostname;
    } catch (e) { return null; }
  }

  // S194: classify the referrer hostname into one bounded acquisition channel.
  // The one number a traffic-starved site never measured — which channel the
  // trickle arrives through. Domain-classified only; the hostname itself never
  // leaves the browser via this path (only the [a-z] bucket does).
  function classifySource(host) {
    if (!host) return 'direct';
    var h = String(host).toLowerCase();
    if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|brave|startpage)\./.test(h) || h.indexOf('search') !== -1) return 'search';
    if (/(^|\.)(twitter|x|t|facebook|fb|instagram|linkedin|reddit|youtube|youtu|tiktok|discord|mastodon|bsky|threads|news\.ycombinator|lobste)\./.test(h) || h === 't.co' || h === 'x.com') return 'social';
    return 'referral';
  }

  // Emit the acquisition channel to the /v/rum funnel rollup once per session.
  // Bounded `source:<bucket>` family (Worker prefixAllowlist, S194). Inherits the
  // consent + DoNotTrack gating above (only reachable from track()).
  function emitSourceOnce() {
    try {
      if (sessionStorage.getItem('vs_source_sent') === '1') return;
      sessionStorage.setItem('vs_source_sent', '1');
      var bucket = classifySource(getReferrer());
      var body = JSON.stringify({ route: location.pathname || '/', ux: 'source:' + bucket });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (e) {}
  }

  function track() {
    var payload = {
      page_path:  location.pathname,
      page_title: document.title || null,
      referrer:   getReferrer(),
      session_id: getSessionId(),
      user_id:    getUserId(),
    };

    emitSourceOnce();

    fetch(SB_URL + '/rest/v1/page_views', {
      method:    'POST',
      keepalive: true,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(payload),
    }).catch(function () {}); // silently fail — never break the page
  }

  function fireWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', track);
    } else {
      track();
    }
  }

  // First visit (no consent recorded yet) — wait for the vs:consent event
  if (!consentVal) {
    window.addEventListener('vs:consent', function handler(e) {
      window.removeEventListener('vs:consent', handler);
      if (e.detail && e.detail.analytics) fireWhenReady();
    });
    return;
  }

  // Returning visitor who previously accepted
  fireWhenReady();
})();
