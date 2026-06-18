/* membership-social-proof.js — S206 audit item #3 (vault-momentum-social-proof)
   Vault Momentum social proof strip on /membership/.
   Predicate-loaded on /membership/ by ambient-loader.js.
   Fetches api/vault-momentum.json (same pattern as studio-now.js:77).
   Honest-dark when honestDark:true, API unavailable, or all signals zero.
   RUM: emitUx('membership:momentum_strip_shown') — listed in Worker RUM_UX_EVENTS. */
(function () {
  'use strict';

  if (!(location.pathname || '/').startsWith('/membership')) return;
  if (document.body && document.body.hasAttribute('data-vs-signed-in')) return;

  var STRIP_ID = 'vs-momentum-strip';
  var API = '/api/vault-momentum.json';

  function getJSON(url, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.responseType = 'json';
    x.onload = function () {
      if (x.status >= 200 && x.status < 300) cb(null, x.response);
      else cb(new Error('HTTP ' + x.status));
    };
    x.onerror = function () { cb(new Error('network')); };
    x.send();
  }

  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: '/membership/', ux: event });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
      }
    } catch (_) {}
  }

  function ensureStyles() {
    if (document.getElementById('vs-msp-css')) return;
    var s = document.createElement('style');
    s.id = 'vs-msp-css';
    s.textContent =
      '.vs-momentum-strip{' +
        'display:flex;justify-content:center;align-items:center;gap:1.75rem;flex-wrap:wrap;' +
        'padding:.8rem 1.5rem;margin:1.5rem auto 0;max-width:44rem;' +
        'background:linear-gradient(135deg,rgba(255,193,7,.07),rgba(255,193,7,.03));' +
        'border:1px solid rgba(255,193,7,.18);border-radius:8px;}' +
      '.vs-msp-stat{display:flex;flex-direction:column;align-items:center;gap:.15rem;}' +
      '.vs-msp-value{font-size:1.15rem;font-weight:700;color:var(--primary,#ffc107);line-height:1.1;}' +
      '.vs-msp-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--dim,#888);}' +
      '.vs-msp-badge{' +
        'display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .8rem;' +
        'background:rgba(255,193,7,.12);border:1px solid rgba(255,193,7,.28);border-radius:4px;' +
        'font-size:.78rem;letter-spacing:.1em;font-weight:600;color:var(--primary,#ffc107);}' +
      '.vs-msp-divider{width:1px;height:2rem;background:rgba(255,193,7,.18);flex-shrink:0;}';
    (document.head || document.body).appendChild(s);
  }

  function render(data) {
    var el = document.getElementById(STRIP_ID);
    if (!el) return;
    if (!data || data.honestDark) return;

    var score = typeof data.score === 'number' ? data.score : null;
    var label = typeof data.label === 'string' ? data.label : null;
    var climbers = data.signals && typeof data.signals.rankClimbers === 'number'
      ? data.signals.rankClimbers : null;

    if (score == null && climbers == null) return;

    ensureStyles();

    var frag = document.createDocumentFragment();

    if (label) {
      var badge = document.createElement('div');
      badge.className = 'vs-msp-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = '⚡ ' + label;
      frag.appendChild(badge);
    }

    if (climbers != null) {
      if (label) {
        var d1 = document.createElement('div');
        d1.className = 'vs-msp-divider';
        d1.setAttribute('aria-hidden', 'true');
        frag.appendChild(d1);
      }
      var s1 = document.createElement('div');
      s1.className = 'vs-msp-stat';
      var v1 = document.createElement('span');
      v1.className = 'vs-msp-value';
      v1.textContent = climbers;
      var l1 = document.createElement('span');
      l1.className = 'vs-msp-label';
      l1.textContent = 'ranks climbed this week';
      s1.appendChild(v1);
      s1.appendChild(l1);
      frag.appendChild(s1);
    }

    if (score != null) {
      var d2 = document.createElement('div');
      d2.className = 'vs-msp-divider';
      d2.setAttribute('aria-hidden', 'true');
      frag.appendChild(d2);
      var s2 = document.createElement('div');
      s2.className = 'vs-msp-stat';
      var v2 = document.createElement('span');
      v2.className = 'vs-msp-value';
      v2.textContent = score + '/100';
      var l2 = document.createElement('span');
      l2.className = 'vs-msp-label';
      l2.textContent = 'studio momentum';
      s2.appendChild(v2);
      s2.appendChild(l2);
      frag.appendChild(s2);
    }

    el.appendChild(frag);
    el.setAttribute('aria-label',
      'Live studio signals: ' + (label || 'active') +
      (climbers != null ? ', ' + climbers + ' ranks climbed this week' : '') +
      (score != null ? ', studio momentum ' + score + '/100' : ''));
    emitUx('membership:momentum_strip_shown');
  }

  function init() {
    getJSON(API, function (err, data) {
      if (!err) render(data);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
