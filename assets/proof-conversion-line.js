/* proof-conversion-line.js — S186 proof-to-conversion bridge.
   The studio publishes its own SRE/field proof (api/status-proof.json). This
   surfaces ONE earned, falsifiable trust microline at the exact moment of the
   signup decision, sourced live from the deployed feed.

   Honest-dark contract: render a signal ONLY when its underlying proof is fresh
   and confirmed. Never fabricate confidence — a stale or low-trust feed renders
   nothing. Cost-neutral (static CDN fetch, cached). Mounts on [data-vs-proof-cta]. */
(function () {
  'use strict';

  var PROOF_URL = '/api/status-proof.json';

  // TT-safe: this module writes no untrusted HTML. The microline is built with
  // textContent + DOM nodes only, so no Trusted-Types policy is required.

  // S188: the microline shipped blind. Beacon impressions + clicks through the
  // same /v/rum allowlisted transport as the rest of the funnel (names only, no
  // PII). The Worker's RUM_UX_EVENTS must list proof-line:{shown,click} or the
  // beacon is silently dropped — the new check-rum-allowlist gate enforces that.
  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: location.pathname || '/', ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_e) {}
  }

  function fmtPct(n) {
    var v = Math.round(Math.abs(Number(n)));
    return isFinite(v) ? v : null;
  }

  // Build the honest signal list from fresh+confirmed proofs only.
  function signalsFrom(proof) {
    var out = [];
    var proofs = (proof && proof.proofs) || {};

    // Confirmed field win — only when fresh and actually confirmed.
    var fw = proofs['field-win'];
    if (fw && fw.present && !fw.stale && fw.data && fw.data.hasConfirmed && fw.data.topWin) {
      var d = fmtPct(fw.data.topWin.lcpDeltaPct);
      if (d != null && fw.data.topWin.verdict === 'improved') {
        out.push(d + '% faster page loads than last quarter');
      }
    }

    // Measured uptime — only when fresh and genuinely high.
    var up = proofs.uptime;
    if (up && up.present && !up.stale && up.data && up.data.rollup) {
      var pct = fmtPct(up.data.rollup.upPct);
      if (pct != null && pct >= 99) {
        out.push(pct + '% measured uptime');
      }
    }

    return out;
  }

  function render(root, signals) {
    if (!signals.length) return; // honest-dark: nothing proven fresh → no line
    var line = document.createElement('p');
    line.className = 'vs-proof-line';
    var dot = document.createElement('span');
    dot.className = 'vs-proof-line__dot';
    dot.setAttribute('aria-hidden', 'true');
    line.appendChild(dot);
    var txt = document.createElement('span');
    // "Backed by a studio measured at X · Y — verified, not claimed."
    txt.textContent = 'Backed by a studio measured at ' + signals.join(' · ') + ' — verified, not claimed.';
    line.appendChild(txt);
    var link = document.createElement('a');
    link.className = 'vs-proof-line__link';
    link.href = '/status/';
    link.textContent = 'See the proof';
    link.addEventListener('click', function () { emitUx('proof-line:click'); });
    line.appendChild(link);
    root.insertBefore(line, root.firstChild);
  }

  function styles() {
    if (document.getElementById('vs-proof-line-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-proof-line-style';
    s.textContent = '.vs-proof-line{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin:0 0 1rem;padding:.55rem .8rem;border:1px solid rgba(110,231,160,.22);border-radius:10px;background:rgba(110,231,160,.06);font-size:.82rem;line-height:1.5;color:var(--muted,#9aa3b2)}.vs-proof-line__dot{width:.5rem;height:.5rem;border-radius:50%;background:#6ee7a0;box-shadow:0 0 8px rgba(110,231,160,.7);flex:0 0 auto}.vs-proof-line__link{color:var(--gold,#ffc400);text-decoration:underline;text-decoration-color:rgba(255,196,0,.4);white-space:nowrap}';
    document.head.appendChild(s);
  }

  function boot() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-vs-proof-cta]'));
    if (!roots.length) return;
    fetch(PROOF_URL, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (proof) {
        if (!proof) return;
        var signals = signalsFrom(proof);
        if (!signals.length) return;
        styles();
        roots.forEach(function (root) { render(root, signals); });
        emitUx('proof-line:shown');
      })
      .catch(function () { /* feed unreachable → render nothing */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
