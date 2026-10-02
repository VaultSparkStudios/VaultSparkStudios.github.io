// portal-init.js — extracted from vault-member/index.html inline scripts
// Runs after portal-core.js, portal-auth.js, portal-dashboard.js, portal-features.js,
// portal-challenges.js, portal-settings.js are loaded.

// ── Offline / graceful degradation ───────────────────────────────────────────
(function () {
  var banner = document.getElementById('offline-banner');
  function syncOffline() {
    if (!navigator.onLine) {
      if (banner) banner.style.display = '';
      document.body.style.paddingTop = banner ? banner.offsetHeight + 'px' : '36px';
    } else {
      if (banner) banner.style.display = 'none';
      document.body.style.paddingTop = '';
    }
  }
  window.addEventListener('offline', syncOffline);
  window.addEventListener('online',  syncOffline);
  syncOffline();
})();

// ── Vault Initiation ─────────────────────────────────────────────────────────
// The onboarding checklist now lives in portal-loop.js as the single Vault
// Initiation quest. (The old checklist polled an "id" field the member
// object never had, so it never rendered.)

// ── Portal tour (on demand from "Take the tour"; never automatic) ──────────
(function() {
  'use strict';

  var TOUR_KEY = 'vs_onboarding_done';

  var STEPS = [
    {
      icon: '⚡',
      title: 'Welcome to the Vault',
      body: 'You\'re in. This is your Vault Member portal — the hub for your rank, challenges, achievements, and everything VaultSpark. <strong>The more you engage, the higher you rise.</strong>',
      next: 'Next →',
    },
    {
      icon: '🏆',
      title: 'Your Vault Rank',
      body: 'You start as a <strong>Spark Initiate</strong>. Complete challenges, play games, and earn Vault Points to climb through 9 ranks — all the way to <strong>The Sparked</strong>.<br><br>Your rank is permanent and carries across every VaultSpark title.',
      next: 'Got it →',
    },
    {
      icon: '🎯',
      title: 'Your First Challenge',
      body: 'Head to the <strong>Challenges tab</strong> to pick up your first vault challenge. Completing challenges is the fastest way to earn points and unlock exclusive achievements.<br><br>New challenges drop every week.',
      next: 'Enter the Vault',
    },
  ];

  var current = 0;
  var overlay = document.getElementById('vs-tour-overlay');
  var icon    = document.getElementById('vs-tour-icon');
  var title   = document.getElementById('vs-tour-title');
  var body    = document.getElementById('vs-tour-body');
  var pips    = document.querySelectorAll('.vs-tour-pip');
  var nextBtn = document.getElementById('vs-tour-next');
  var skipBtn = document.getElementById('vs-tour-skip');

  function renderStep(idx) {
    var s = STEPS[idx];
    icon.textContent  = s.icon;
    title.textContent = s.title;
    body.innerHTML    = s.body;
    nextBtn.textContent = s.next;
    pips.forEach(function(p, i) { p.classList.toggle('active', i === idx); });
  }

  function closeTour() {
    overlay.classList.remove('open');
    try { localStorage.setItem(TOUR_KEY, '1'); } catch(e) {}
  }

  if (!nextBtn || !skipBtn || !overlay) return;

  nextBtn.addEventListener('click', function() {
    if (current < STEPS.length - 1) {
      current++;
      renderStep(current);
    } else {
      closeTour();
    }
  });

  skipBtn.addEventListener('click', closeTour);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeTour(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && overlay.classList.contains('open')) closeTour(); });

  // Vault Initiation owns the first session, so the tour no longer opens by
  // itself (it used to fire on day one). It is offered from the quest panel.
  window.openPortalTour = function () {
    current = 0;
    renderStep(0);
    overlay.classList.add('open');
    if (nextBtn && typeof nextBtn.focus === 'function') setTimeout(function () { nextBtn.focus(); }, 30);
  };
})();
