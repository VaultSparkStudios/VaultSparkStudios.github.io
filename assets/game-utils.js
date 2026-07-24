// VaultSpark Studios — Shared Game Page Utilities
// Patch toggles, FAQ accordions, and shared Supabase constants
// Used by: call-of-doodie, gridiron-gm, franchise-architect
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
      return window.VSSignedInState && window.VSSignedInState.getDataSessionCached
        ? window.VSSignedInState.getDataSessionCached() : null;
    },
    ready: function () {
      if (window.VSSignedInState && window.VSSignedInState.getDataSession) {
        return window.VSSignedInState.getDataSession();
      }
      return new Promise(function (resolve) {
        var settled = false;
        var timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          document.removeEventListener('vs:session-ready', onReady);
          resolve(null);
        }, 10000);
        function onReady() {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          document.removeEventListener('vs:session-ready', onReady);
          if (window.VSSignedInState && window.VSSignedInState.getDataSession) {
            window.VSSignedInState.getDataSession().then(resolve).catch(function () { resolve(null); });
          } else {
            resolve(null);
          }
        }
        document.addEventListener('vs:session-ready', onReady);
      });
    },
  };

}(window));
