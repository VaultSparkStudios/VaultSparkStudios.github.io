// VaultSpark Studios — Shared Game Page Utilities
// Patch toggles, FAQ accordions, and shared Supabase constants
// Used by: call-of-doodie, gridiron-gm, vaultspark-football-gm
(function (window) {
  'use strict';

  // Toggle patch notes visibility
  window.vsTogglePatch = function (btn) {
    var el = btn.nextElementSibling;
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  // Toggle FAQ accordion — shows/hides answer + flips +/− icon
  window.vsToggleFaq = function (btn) {
    var el = btn.nextElementSibling;
    if (!el) return;
    var isOpen = el.style.display !== 'none';
    el.style.display = isOpen ? 'none' : 'block';
    var icon = btn.querySelector('span');
    if (icon) icon.textContent = isOpen ? '+' : '\u2212';
  };

  // Shared Supabase constants — avoids duplicating credentials across game pages
  window.VSGame = {
    SB_URL: 'https://fjnpzjjyhnpmunfoycrp.supabase.co',
    SB_KEY: 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij',
    headers: function () {
      return {
        apikey: this.SB_KEY,
        Authorization: 'Bearer ' + this.SB_KEY,
      };
    },
    getSession: function () {
      try {
        var raw = localStorage.getItem('sb-fjnpzjjyhnpmunfoycrp-auth-token')
               || localStorage.getItem('supabase.auth.token');
        if (!raw) return null;
        var p = JSON.parse(raw);
        var s = p.currentSession || p;
        return (s && s.access_token && s.user) ? s : null;
      } catch (e) { return null; }
    },
  };

}(window));
