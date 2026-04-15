(function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function timeAgo(iso) {
    var diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderShips(container, items) {
    if (!container || !items || !items.length) return;
    container.innerHTML = items.map(function (item) {
      return '<li>' + esc(item) + '</li>';
    }).join('');
  }

  function renderActivityFeed() {
    if (!window.VSPublic) return;
    var section = document.getElementById('vault-signal-section');
    var feed = document.getElementById('vault-signal-feed');
    if (!section || !feed) return;

    var gameNames = {
      'call-of-doodie': 'Call of Doodie',
      'gridiron-gm': 'Gridiron GM',
      'vaultspark-football-gm': 'VaultSpark Football GM'
    };

    Promise.allSettled([
      window.VSPublic.from('vault_members').select('username,rank_title,created_at').order('created_at', false).limit(6).get(),
      window.VSPublic.from('challenge_submissions').select('user_id,created_at').order('created_at', false).limit(5).get(),
      window.VSPublic.from('game_sessions').select('game_slug,played_at').order('played_at', false).limit(5).get()
    ]).then(function (results) {
      var events = [];

      (results[0].value && results[0].value.data || []).forEach(function (member) {
        events.push({ type: 'join', title: '<strong style="color:var(--text);">' + esc(member.username) + '</strong> joined · ' + esc(member.rank_title || 'Spark Initiate'), ts: member.created_at });
      });
      (results[1].value && results[1].value.data || []).forEach(function (item) {
        events.push({ type: 'challenge', title: 'A vault member <strong style="color:var(--text);">completed a challenge</strong>', ts: item.created_at });
      });
      (results[2].value && results[2].value.data || []).forEach(function (item) {
        events.push({ type: 'game', title: 'Someone played <strong style="color:var(--text);">' + esc(gameNames[item.game_slug] || item.game_slug) + '</strong>', ts: item.played_at });
      });

      if (!events.length) {
        section.style.display = 'none';
        return;
      }

      var dotColors = { join: 'var(--gold)', challenge: 'var(--blue)', game: 'var(--green)' };
      feed.innerHTML = events.sort(function (a, b) {
        return new Date(b.ts) - new Date(a.ts);
      }).slice(0, 9).map(function (event) {
        return '<div style="display:flex;align-items:center;gap:0.7rem;padding:0.65rem 0.9rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;">' +
          '<span style="width:6px;height:6px;border-radius:50%;background:' + dotColors[event.type] + ';flex-shrink:0;"></span>' +
          '<span style="font-size:0.82rem;color:var(--muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + event.title + '</span>' +
          '<span style="font-size:0.73rem;color:var(--dim);white-space:nowrap;flex-shrink:0;">' + timeAgo(event.ts) + '</span>' +
        '</div>';
      }).join('');
    }).catch(function () {
      section.style.display = 'none';
    });
  }

  function initKitForms() {
    if (window.VaultKit) {
      window.VaultKit.wireForm('dispatch-form', 'dispatch-success');
      window.VaultKit.wireForm('footer-email-form', 'footer-success');
    }
  }

  function initActiveNav() {
    var path = window.location.pathname;
    document.querySelectorAll('.nav-center a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === '/' && path === '/') link.classList.add('active');
      else if (href !== '/' && path.indexOf(href) === 0) link.classList.add('active');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initKitForms();
    initActiveNav();
    renderActivityFeed();

    if (!window.VSPublicIntel) return;
    window.VSPublicIntel.get().then(function (intel) {
      if (!intel) return;
      setText('intel-session', 'Session ' + intel.project.currentSession);
      setText('intel-focus', intel.project.currentFocus);
      setText('intel-next', intel.project.nextMilestone);
      setText('intel-ignis', String(intel.project.ignis.score).toLocaleString('en-US') + ' · ' + intel.project.ignis.grade);
      renderShips(document.getElementById('intel-shipped-list'), intel.pulse.shipped.slice(0, 3));
      var blockerList = document.getElementById('intel-blockers-list');
      if (blockerList) {
        blockerList.innerHTML = (intel.project.blockers || []).slice(0, 3).map(function (item) {
          return '<li>' + esc(item) + '</li>';
        }).join('');
      }
    });
  });
})();
