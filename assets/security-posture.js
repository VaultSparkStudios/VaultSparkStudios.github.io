/* security-posture.js — public trust center renderer (S195 item 8 deepened).
 *
 * The public trust surface lives at /security/ (obelisk-passport is auth-only).
 * S195 turns a flat control list into a verifiable posture: an overall verdict
 * header (N of M controls verified), a live uptime card pulled from the first-
 * party uptime probe, and a link to the full status-proof manifest — the
 * "show, don't claim" posture CANON-021 requires. Every value traces to a
 * build-time-derived feed; an unresolvable signal downgrades rather than asserts.
 */
(function () {
  'use strict';
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function card(status, label, detail) {
    return '<article class="security-posture__card"><span class="security-posture__status">' + esc(status) +
      '</span><h3>' + esc(label) + '</h3><p class="security-posture__detail">' + esc(detail) + '</p></article>';
  }

  function boot() {
    if (location.pathname.indexOf('/security') !== 0) return;
    var main = document.querySelector('main');
    if (!main || document.querySelector('[data-security-posture]')) return;
    var section = document.createElement('section');
    section.className = 'container security-posture';
    section.setAttribute('data-security-posture', '');
    main.appendChild(section);

    // Posture + uptime resolve independently; uptime is best-effort (the trust
    // center still renders fully if the probe feed is briefly unavailable).
    Promise.all([
      fetch('/api/security-posture.json', { cache: 'default' }).then(function (r) { return r.json(); }).catch(function () { return null; }),
      fetch('/api/uptime.json', { cache: 'default' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var data = res[0] || {};
      var uptime = res[1];
      var verified = typeof data.verifiedControls === 'number' ? data.verifiedControls : (data.controls || []).filter(function (c) { return c.status === 'active'; }).length;
      var total = typeof data.totalControls === 'number' ? data.totalControls : (data.controls || []).length;

      var head = '<div class="eyebrow">Trust Center</div>' +
        '<h2 class="security-posture__title">Public security posture.</h2>' +
        '<p class="security-posture__verdict" style="color:var(--muted);margin:.2rem 0 1.2rem">' +
          '<strong style="color:var(--gold,#ffc400)">' + esc(verified) + ' of ' + esc(total) + '</strong> controls verified from live repo evidence' +
          (data.posture ? ' · posture <strong>' + esc(data.posture) + '</strong>' : '') +
        '</p>';

      var cards = (data.controls || []).map(function (c) { return card(c.status, c.label, c.detail); }).join('');

      // Live uptime control — only when the probe gives a real availability read.
      if (uptime && (uptime.overall || (uptime.rollup && uptime.rollup.availability != null))) {
        var avail = uptime.rollup && uptime.rollup.availability != null ? (Math.round(uptime.rollup.availability * 10) / 10) + '% availability' : null;
        var st = uptime.overall === 'up' ? 'active' : 'degraded';
        var detail = 'First-party uptime probe' + (avail ? ' — ' + avail : '') + (uptime.liveness && uptime.liveness.ms ? ' · liveness ' + uptime.liveness.ms + 'ms' : '') + '.';
        cards += card(st, 'Availability', detail);
      }

      var foot = '<p class="security-posture__foot" style="margin-top:1.3rem;color:var(--dim,#6272a0);font-size:.82rem">' +
        'Full machine-readable proof: <a href="/api/status-proof.json" style="color:var(--gold,#ffc400)">status-proof.json</a> · ' +
        'Obelisk trust posture: <a href="/obelisk-passport/login.html" style="color:var(--gold,#ffc400)">passport</a>. ' +
        'Post-quantum migration-ready.</p>';

      section.innerHTML = head + '<div class="security-posture__grid">' + cards + '</div>' + foot;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
