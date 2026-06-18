/* smart-trial-offer.js — S206 audit item #7 (smart-trial-offer L1)
   High-intent conversion nudge: shown ONCE to visitors who have demonstrated
   deep interest (3+ visits OR 5+ minutes on current page).

   Triggers:
     A) vs_visit_count >= 3 (returning multi-session visitor)
     B) 5 minutes of continuous presence on any page

   Panel: bottom-anchored, dismissable, links to /join/?promo=TRIAL50.
   Gate: vs_trial_offered (set on first show — never shows again).
   RUM: funnel:trial_offer_shown · funnel:trial_offer_clicked · funnel:trial_offer_dismissed

   Honest-dark: skips for signed-in members and already-shown gate.
   No Stripe code validation on the client — promo is a URL param. */
(function () {
  'use strict';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, String(v)); } catch (_) {} }

  function emitUx(event) {
    try {
      var route = location.pathname || '/';
      var body = JSON.stringify({ route: route, ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  // Gates
  if (document.body && document.body.hasAttribute('data-vs-signed-in')) return;
  if (lsGet('vs_trial_offered')) return;

  var PANEL_ID = 'vs-trial-offer-panel';
  // S207 (trial-offer-promo-acknowledgment): the discount applies to the PAID
  // VaultSparked tier, whose checkout (with full promo_code plumbing) lives at
  // /vaultsparked/ — NOT the free /join/ page. /vaultsparked/ now auto-reads the
  // ?promo= param into the checkout promo field, and create-checkout validates it
  // server-side (an unknown code surfaces an honest "not found or expired" toast).
  var OFFER_URL = '/vaultsparked/?promo=TRIAL50';
  var SESSION_MIN = 5; // minutes of current-page presence

  function ensureStyles() {
    if (document.getElementById('vs-to-css')) return;
    var s = document.createElement('style');
    s.id = 'vs-to-css';
    s.textContent =
      '#vs-trial-offer-panel{' +
        'position:fixed;bottom:0;left:0;right:0;z-index:10100;' +
        'padding:.9rem 1.2rem;' +
        'background:var(--surface,#141820);' +
        'border-top:2px solid var(--gold,#ffc400);' +
        'display:flex;align-items:center;gap:1rem;flex-wrap:wrap;' +
        'box-shadow:0 -4px 24px rgba(0,0,0,.45);' +
        'animation:vs-to-slide .35s ease;}' +
      '@keyframes vs-to-slide{from{transform:translateY(100%)}to{transform:none}}' +
      '#vs-trial-offer-panel .vs-to-body{flex:1;min-width:0;}' +
      '#vs-trial-offer-panel .vs-to-label{' +
        'font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;' +
        'color:var(--gold,#ffc400);margin-bottom:.2rem;}' +
      '#vs-trial-offer-panel .vs-to-message{' +
        'font-size:.95rem;color:var(--text,#e8eaf0);line-height:1.35;margin:0;}' +
      '#vs-trial-offer-panel .vs-to-cta{' +
        'display:inline-flex;align-items:center;gap:.4rem;' +
        'padding:.45rem 1.1rem;border-radius:6px;' +
        'background:var(--gold,#ffc400);color:#1a1205;' +
        'font-weight:700;font-size:.88rem;text-decoration:none;white-space:nowrap;' +
        'transition:opacity .15s;}' +
      '#vs-trial-offer-panel .vs-to-cta:hover{opacity:.85;}' +
      '#vs-trial-offer-panel .vs-to-close{' +
        'background:none;border:none;cursor:pointer;padding:.3rem .5rem;' +
        'color:var(--muted,#6b7280);font-size:1.2rem;line-height:1;' +
        'flex-shrink:0;}';
    (document.head || document.body).appendChild(s);
  }

  function show() {
    if (document.getElementById(PANEL_ID)) return;
    if (lsGet('vs_trial_offered')) return; // double-check race

    ensureStyles();

    var panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'Special membership offer');

    var body = document.createElement('div');
    body.className = 'vs-to-body';

    var label = document.createElement('div');
    label.className = 'vs-to-label';
    label.textContent = '⚡ Limited Offer';

    var msg = document.createElement('p');
    msg.className = 'vs-to-message';
    msg.textContent = 'Your first month, half price — 24h only. Join the Vault and unlock the full studio.';

    body.appendChild(label);
    body.appendChild(msg);

    var cta = document.createElement('a');
    cta.className = 'vs-to-cta';
    cta.href = OFFER_URL;
    cta.textContent = 'Claim 50% off';
    cta.addEventListener('click', function () {
      emitUx('funnel:trial_offer_clicked');
      lsSet('vs_trial_offered', Date.now());
    });

    var close = document.createElement('button');
    close.className = 'vs-to-close';
    close.setAttribute('aria-label', 'Dismiss offer');
    close.textContent = '✕';
    close.addEventListener('click', function () {
      emitUx('funnel:trial_offer_dismissed');
      lsSet('vs_trial_offered', Date.now());
      panel.remove();
    });

    panel.appendChild(body);
    panel.appendChild(cta);
    panel.appendChild(close);
    document.body.appendChild(panel);

    lsSet('vs_trial_offered', Date.now());
    emitUx('funnel:trial_offer_shown');
  }

  function tryShow() {
    // Signal A: returning visitor (3+ prior visits)
    var visitCount = parseInt(lsGet('vs_visit_count') || '0', 10);
    if (visitCount >= 3) {
      show();
      return;
    }

    // Signal B: 5+ minutes on current page (first-visit high-dwell)
    var startTs = Date.now();
    var timer = setInterval(function () {
      if (lsGet('vs_trial_offered')) { clearInterval(timer); return; }
      if ((Date.now() - startTs) >= SESSION_MIN * 60 * 1000) {
        clearInterval(timer);
        show();
      }
    }, 15000); // check every 15s — light polling
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryShow);
  } else {
    tryShow();
  }
}());
