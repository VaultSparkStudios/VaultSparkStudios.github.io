/* social-dashboard-public.js — public Social Dashboard bridge. */
(function () {
  'use strict';
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function boot() {
    var root = document.querySelector('[data-social-dashboard-public]');
    if (!root && location.pathname.indexOf('/social') === 0) {
      root = document.createElement('section');
      root.className = 'social-section';
      root.setAttribute('data-social-dashboard-public', '');
      var main = document.querySelector('main');
      if (main) main.appendChild(root);
    }
    if (!root) return;
    fetch('/api/social-dashboard-public.json', { cache: 'default' }).then(function (r) { return r.json(); }).then(function (data) {
      root.innerHTML = '<div class="container"><div class="eyebrow">Social Dashboard</div><h2 class="social-live-title">Every channel has a job.</h2><p class="social-live-copy">' + esc(data.campaignFocus) + '</p><div class="social-live-grid">' + (data.channels || []).map(function (ch) {
        return '<a class="social-live-card" href="' + esc(ch.href) + '" target="_blank" rel="noreferrer me"><span class="social-live-label">' + esc(ch.label) + '</span><strong class="social-live-role">' + esc(ch.role) + '</strong><p class="social-live-cadence">' + esc(ch.cadence) + '</p><em class="social-live-next">' + esc(ch.nextAction) + ' →</em></a>';
      }).join('') + '</div></div>';
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
