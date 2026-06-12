/* proof-card.js — S190 standalone VaultSpark Studios proof embed.
   Embeds a ~240px trust card anywhere: press kits, Discord descriptions,
   third-party pages. Reads live data from the deployed status proof feed.
   No dependencies. Self-contained styles. prefers-color-scheme aware.

   Embed:  <script src="https://vaultsparkstudios.com/assets/proof-card.js" defer></script>
   Mounts on [data-vs-proof-card], or auto-inserts at the current <script> tag.

   beacon: proof-card:embed (allowlisted in Worker RUM_UX_EVENTS). */
(function () {
  'use strict';

  var BASE = 'https://vaultsparkstudios.com';
  var FEED = BASE + '/api/status-proof.json';

  function fmtPct(n) { var v = Math.round(Math.abs(Number(n))); return isFinite(v) ? v + '%' : null; }
  function n(v) { var x = Number(v); return isFinite(x) ? x : null; }

  function injectStyles() {
    if (document.getElementById('vs-proof-card-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-proof-card-style';
    // Dark-first; light variant via media query. 240px wide, minimal.
    s.textContent = '.vs-proof-card{all:initial;display:block;width:240px;border-radius:12px;overflow:hidden;background:#0d111c;border:1px solid rgba(255,196,0,.22);font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;color:#9aa3b2}' +
      '.vs-proof-card__header{padding:10px 14px 6px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:8px}' +
      '.vs-proof-card__dot{width:7px;height:7px;border-radius:50%;background:#6ee7a0;box-shadow:0 0 6px rgba(110,231,160,.6);flex:0 0 auto}' +
      '.vs-proof-card__brand{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#ffc400}' +
      '.vs-proof-card__grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.07)}' +
      '.vs-proof-card__stat{background:#0d111c;padding:8px 12px}' +
      '.vs-proof-card__val{font-size:18px;font-weight:700;color:#ffc400;line-height:1.1}' +
      '.vs-proof-card__key{font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:#606880;margin-top:2px}' +
      '.vs-proof-card__footer{padding:8px 14px;font-size:10px;color:#606880}' +
      '.vs-proof-card__footer a{color:rgba(255,196,0,.6);text-decoration:none}' +
      '.vs-proof-card__footer a:hover{color:#ffc400}' +
      '@media(prefers-color-scheme:light){.vs-proof-card{background:#f8f9fc;border-color:rgba(180,130,0,.3);color:#4a5068}' +
      '.vs-proof-card__brand{color:#b48200}.vs-proof-card__dot{background:#10b981}' +
      '.vs-proof-card__grid{background:rgba(0,0,0,.06)}.vs-proof-card__stat{background:#f8f9fc}' +
      '.vs-proof-card__val{color:#b48200}.vs-proof-card__key{color:#9aa3b2}' +
      '.vs-proof-card__footer{color:#9aa3b2}.vs-proof-card__footer a{color:#b48200}}';
    document.head.appendChild(s);
  }

  function render(mount, proof) {
    var proofs = (proof && proof.proofs) || {};
    var fw = proofs['field-win'];
    var up = proofs.uptime;
    var intel = (proof && proof.intelligence) || {};
    var sessions = n(intel.sessionsCompleted);
    var trust = proof && proof.trustScore != null ? Math.round(Number(proof.trustScore)) : null;

    // LCP delta from confirmed field win
    var lcpVal = '—';
    if (fw && fw.present && !fw.stale && fw.data && fw.data.hasConfirmed && fw.data.topWin) {
      var d = fmtPct(fw.data.topWin.lcpDeltaPct);
      if (d && fw.data.topWin.verdict === 'improved') lcpVal = d + ' faster';
    }

    // Uptime %
    var upVal = '—';
    if (up && up.present && !up.stale && up.data && up.data.rollup) {
      var u = fmtPct(up.data.rollup.upPct);
      if (u) upVal = u;
    }

    var sessionsVal = sessions != null ? sessions + '' : '—';
    var trustVal = trust != null ? trust + '/100' : '—';

    // Build card DOM (TT-safe: textContent only, no innerHTML with user data)
    var card = document.createElement('div');
    card.className = 'vs-proof-card';
    card.setAttribute('role', 'complementary');
    card.setAttribute('aria-label', 'VaultSpark Studios — live performance proof');

    var header = document.createElement('div');
    header.className = 'vs-proof-card__header';
    var dot = document.createElement('div');
    dot.className = 'vs-proof-card__dot';
    dot.setAttribute('aria-hidden', 'true');
    var brand = document.createElement('span');
    brand.className = 'vs-proof-card__brand';
    brand.textContent = 'VaultSpark Studios';
    header.appendChild(dot);
    header.appendChild(brand);
    card.appendChild(header);

    var grid = document.createElement('div');
    grid.className = 'vs-proof-card__grid';
    var stats = [
      { val: upVal, key: 'Measured uptime' },
      { val: lcpVal, key: 'Page speed gain' },
      { val: sessionsVal, key: 'Build sessions' },
      { val: trustVal, key: 'Trust score' },
    ];
    stats.forEach(function (s) {
      var cell = document.createElement('div');
      cell.className = 'vs-proof-card__stat';
      var val = document.createElement('div');
      val.className = 'vs-proof-card__val';
      val.textContent = s.val;
      var key = document.createElement('div');
      key.className = 'vs-proof-card__key';
      key.textContent = s.key;
      cell.appendChild(val);
      cell.appendChild(key);
      grid.appendChild(cell);
    });
    card.appendChild(grid);

    var footer = document.createElement('div');
    footer.className = 'vs-proof-card__footer';
    var link = document.createElement('a');
    link.href = BASE + '/status/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'See the full proof at vaultsparkstudios.com →';
    footer.appendChild(link);
    card.appendChild(footer);

    mount.innerHTML = '';
    mount.appendChild(card);
    injectStyles();
  }

  // Uses absolute URL so the beacon works from third-party pages (external embed).
  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: document.location.pathname || '/', ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon(BASE + '/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  function boot() {
    // Find explicit mount points, or fall back to the <script> tag's parent
    var mounts = Array.prototype.slice.call(document.querySelectorAll('[data-vs-proof-card]'));
    if (!mounts.length) {
      // Locate this script and insert before it
      var scripts = document.getElementsByTagName('script');
      var thisScript = null;
      for (var i = scripts.length - 1; i >= 0; i--) {
        if ((scripts[i].src || '').includes('proof-card.js')) { thisScript = scripts[i]; break; }
      }
      var div = document.createElement('div');
      div.setAttribute('data-vs-proof-card', '');
      if (thisScript && thisScript.parentNode) {
        thisScript.parentNode.insertBefore(div, thisScript);
      } else {
        document.body.appendChild(div);
      }
      mounts = [div];
    }

    fetch(FEED, { cache: 'default', mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (proof) {
        if (!proof) return;
        mounts.forEach(function (m) { render(m, proof); });
        emitUx('proof-card:embed');
      })
      .catch(function () { /* unreachable → card never renders */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else { boot(); }
})();
