/* membership-unlock.js — S190 progressive membership unlock.
   Reads three localStorage signals to determine which stage a visitor is at,
   then sets body[data-vs-unlock-stage] so CSS can show stage-matched content.

   Stages:
   1 — cold visitor → standard page, no additions
   2 — returning (3+ visits) → rank preview hint
   3 — proof-engaged (clicked "See the proof" link) → achievement teaser
   4 — dispatch subscriber → community welcome override

   Honest: only fires on /membership/. Never fabricates membership state.
   TT-safe: body.dataset write + no untrusted HTML (all markup is static in HTML).
   CSP-safe: deferred external script; CSS injected via createElement. */
(function () {
  'use strict';

  if (!window.location.pathname.startsWith('/membership')) return;

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (_) { return null; } }

  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: '/membership/', ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  var visitCount = parseInt(lsGet('vs_visit_count') || '0', 10);
  var proofSeen = lsGet('vs_proof_seen') === '1';
  var dispatchSub = lsGet('vs_dispatch_sub') === '1';
  var isMember = document.body && document.body.hasAttribute('data-vs-signed-in');

  if (isMember) return;

  var stage = 1;
  if (dispatchSub) {
    stage = 4;
  } else if (proofSeen) {
    stage = 3;
  } else if (visitCount >= 3) {
    stage = 2;
  }

  if (stage <= 1) return;

  document.body.dataset.vsUnlockStage = String(stage);

  // Inject scoped CSS now that we know a callout will show.
  // All .vs-unlock-callout blocks are hidden by default (inline style on element).
  // We reveal exactly one by matching body[data-vs-unlock-stage].
  if (!document.getElementById('vs-unlock-style')) {
    var s = document.createElement('style');
    s.id = 'vs-unlock-style';
    s.textContent = [
      'body[data-vs-unlock-stage="2"] .vs-unlock-callout[data-stage="2"],',
      'body[data-vs-unlock-stage="3"] .vs-unlock-callout[data-stage="3"],',
      'body[data-vs-unlock-stage="4"] .vs-unlock-callout[data-stage="4"]',
      '{display:block!important}',
      '.vs-unlock-callout{margin:1.4rem auto 0;max-width:560px;padding:.7rem 1rem .7rem 1.1rem;',
      'border-left:3px solid var(--gold,#ffc400);border-radius:0 10px 10px 0;',
      'background:rgba(255,196,0,.06);font-size:.85rem;line-height:1.6;color:var(--muted,#9aa3b2)}',
      '.vs-unlock-callout strong{color:var(--gold,#ffc400);font-weight:600}',
      '.vs-unlock-callout a{color:var(--gold,#ffc400);text-decoration:underline;text-decoration-color:rgba(255,196,0,.4)}'
    ].join('');
    document.head.appendChild(s);
  }

  // Dynamic emit: checker parses 'membership-unlock:stage-' + stage as a
  // prefix covering all three allowlisted entries in RUM_UX_EVENTS.
  emitUx('membership-unlock:stage-' + stage);
})();
