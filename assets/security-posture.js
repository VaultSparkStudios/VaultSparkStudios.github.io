/* security-posture.js — public trust center renderer. */
(function () {
  'use strict';
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function boot() {
    if (location.pathname.indexOf('/security') !== 0) return;
    var main = document.querySelector('main');
    if (!main || document.querySelector('[data-security-posture]')) return;
    var section = document.createElement('section');
    section.className = 'container security-posture';
    section.setAttribute('data-security-posture', '');
    main.appendChild(section);
    fetch('/api/security-posture.json', { cache: 'default' }).then(function (r) { return r.json(); }).then(function (data) {
      section.innerHTML = '<div class="eyebrow">Trust Center</div><h2 class="security-posture__title">Public security posture.</h2><div class="security-posture__grid">' + (data.controls || []).map(function (c) {
        return '<article class="security-posture__card"><span class="security-posture__status">' + esc(c.status) + '</span><h3>' + esc(c.label) + '</h3><p class="security-posture__detail">' + esc(c.detail) + '</p></article>';
      }).join('') + '</div>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
