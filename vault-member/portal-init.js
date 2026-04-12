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

// ── Complete Your Vault — onboarding checklist ────────────────────────────────
(function () {
  if (localStorage.getItem('vs_cvault_dismissed')) return;

  var attempts = 0;
  var poll = setInterval(function () {
    if (++attempts > 60) { clearInterval(poll); return; }
    if (typeof _currentMember === 'undefined' || !_currentMember || !_currentMember.id) return;
    clearInterval(poll);
    run(_currentMember);
  }, 500);

  function run(member) {
    Promise.all([
      VSSupabase.from('challenge_submissions').select('id', { count: 'exact', head: true }).eq('user_id', member.id),
      VSSupabase.from('game_sessions').select('id', { count: 'exact', head: true }).eq('user_id', member.id),
    ]).then(function (results) {
      render(member, results[0].count || 0, results[1].count || 0);
    }).catch(function () {
      render(member, 0, 0);
    });
  }

  function render(member, challengeCount, gameCount) {
    var steps = [
      { icon: '🔓', label: 'Join the Vault',       done: true,                                                           cta: null },
      { icon: '⚡', label: 'Set your avatar',       done: !!(member.avatar_id && member.avatar_id !== 'spark'),           cta: { text: 'Set Avatar',      tab: 'settings'   } },
      { icon: '✍️', label: 'Write your bio',        done: !!(member.bio && member.bio.trim().length > 5),                cta: { text: 'Add Bio',         tab: 'settings'   } },
      { icon: '🎯', label: 'Complete a challenge',  done: challengeCount > 0,                                             cta: { text: 'View Challenges', tab: 'challenges' } },
      { icon: '🎮', label: 'Play a connected game', done: gameCount > 0,                                                  cta: { text: 'Play Games',      href: '/games/'   } },
    ];

    var doneCount = steps.filter(function (s) { return s.done; }).length;
    document.getElementById('cvault-bar').style.width = Math.round((doneCount / steps.length) * 100) + '%';

    if (doneCount === steps.length) {
      document.getElementById('cvault-done').style.display = '';
    } else {
      var el = document.getElementById('cvault-steps');
      steps.forEach(function (step) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:0.7rem;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04);';

        var check = document.createElement('span');
        check.style.cssText = 'width:17px;height:17px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.62rem;font-weight:800;'
          + (step.done
            ? 'background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.3);'
            : 'background:transparent;border:1px solid rgba(255,255,255,0.12);');
        check.textContent = step.done ? '\u2713' : '';

        var lbl = document.createElement('span');
        lbl.style.cssText = 'flex:1;font-size:0.86rem;' + (step.done ? 'color:var(--dim);text-decoration:line-through;' : 'color:var(--text);');
        lbl.textContent = step.icon + '\u00a0' + step.label;

        row.appendChild(check);
        row.appendChild(lbl);

        if (!step.done && step.cta) {
          var btn = document.createElement('a');
          btn.style.cssText = 'font-size:0.73rem;font-weight:700;color:var(--gold);text-decoration:none;white-space:nowrap;flex-shrink:0;';
          btn.textContent = step.cta.text + ' \u2192';
          if (step.cta.href) {
            btn.href = step.cta.href;
          } else {
            btn.href = '#';
            (function (tab) {
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                if (typeof switchDashTab === 'function') switchDashTab(tab);
              });
            })(step.cta.tab);
          }
          row.appendChild(btn);
        }

        el.appendChild(row);
      });
    }

    document.getElementById('cvault-panel').style.display = '';
  }
})();

// ── Onboarding tour (first-time logged-in members only) ───────────────────────
(function() {
  'use strict';

  var TOUR_KEY = 'vs_onboarding_done';
  var AUTH_KEY = 'sb-fjnpzjjyhnpmunfoycrp-auth-token';

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

  function isLoggedIn() {
    try {
      var raw = localStorage.getItem(AUTH_KEY) || localStorage.getItem('supabase.auth.token');
      if (!raw) return false;
      var p = JSON.parse(raw);
      var s = p.currentSession || p;
      return !!(s && s.user && s.user.id);
    } catch(e) { return false; }
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
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeTour(); });

  function maybeShowTour() {
    try { if (localStorage.getItem(TOUR_KEY)) return; } catch(e) { return; }
    if (!isLoggedIn()) return;
    renderStep(0);
    overlay.classList.add('open');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(maybeShowTour, 1200); });
  } else {
    setTimeout(maybeShowTour, 1200);
  }
})();
