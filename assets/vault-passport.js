/* vault-passport.js — S206 audit item #11 (vault-passport L1)
   Member identity card at /vault-member/passport/.
   Fetches rank + tenure + achievements from Supabase, renders the card,
   wires clipboard/Web Share share button.
   RUM: passport:viewed · passport:shared
   Predicate: page is /vault-member/passport/ (loaded by the page, not ambient-loader). */
(function () {
  'use strict';

  var RANKS = [
    { name: 'Spark Initiate', min: 0,      max: 249,      icon: '🌱' },
    { name: 'Vault Runner',   min: 250,    max: 999,      icon: '⚡' },
    { name: 'Rift Scout',     min: 1000,   max: 2999,     icon: '🔦' },
    { name: 'Vault Guard',    min: 3000,   max: 7499,     icon: '🛡️' },
    { name: 'Vault Breacher', min: 7500,   max: 14999,    icon: '⚔️' },
    { name: 'Void Operative', min: 15000,  max: 29999,    icon: '🕳️' },
    { name: 'Vault Keeper',   min: 30000,  max: 59999,    icon: '🏰' },
    { name: 'Forge Master',   min: 60000,  max: 99999,    icon: '🔥' },
    { name: 'The Sparked',    min: 100000, max: Infinity, icon: '✨' },
  ];

  var ACH_MAP = {
    joined:     { icon: '🔓', name: 'Vault Opened' },
    subscribed: { icon: '📡', name: 'Signal Received' },
    visit_game: { icon: '🎮', name: 'Into The Game' },
  };

  function getRank(pts) {
    return RANKS.find(function (r) { return pts >= r.min && pts <= r.max; }) || RANKS[0];
  }

  function formatDate(iso) {
    try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (_) { return iso ? iso.slice(0, 10) : '—'; }
  }

  function daysAgo(iso) {
    if (!iso) return '—';
    var diff = Date.now() - new Date(iso).getTime();
    var days = Math.floor(diff / 86400000);
    if (days < 1) return 'Joined today';
    if (days === 1) return '1 day';
    if (days < 30) return days + ' days';
    var months = Math.floor(days / 30);
    if (months < 12) return months + ' month' + (months > 1 ? 's' : '');
    var years = Math.floor(months / 12);
    return years + ' year' + (years > 1 ? 's' : '');
  }

  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: '/vault-member/passport/', ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  function render(member) {
    var pts = member.points || 0;
    var rank = getRank(pts);

    document.getElementById('vp-rank-badge').textContent = rank.icon;
    document.getElementById('vp-rank-name').textContent = rank.name;
    document.getElementById('vp-points').textContent = pts.toLocaleString() + ' Vault Points';
    document.getElementById('vp-member-since').textContent = formatDate(member.createdAt);
    document.getElementById('vp-tenure').textContent = daysAgo(member.createdAt);

    var achWrap = document.getElementById('vp-achievements');
    var achs = Array.isArray(member.achievements) ? member.achievements : [];
    achs.slice(0, 5).forEach(function (id) {
      var def = ACH_MAP[id];
      if (!def) return;
      var chip = document.createElement('span');
      chip.className = 'vp-badge';
      chip.title = def.name;
      chip.textContent = def.icon + ' ' + def.name;
      achWrap.appendChild(chip);
    });

    document.getElementById('vp-loading').hidden = true;
    document.getElementById('vp-card-wrap').hidden = false;
    emitUx('passport:viewed');
  }

  function wireShare() {
    var btn = document.getElementById('vp-share-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var url = location.href;
      if (navigator.share) {
        navigator.share({ title: 'My Vault Passport', url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          var copied = document.getElementById('vp-copied');
          if (copied) { copied.hidden = false; setTimeout(function () { copied.hidden = true; }, 2000); }
        });
      }
      emitUx('passport:shared');
    });
  }

  function waitForSupabase(cb) {
    if (window.VSSupabase) { cb(window.VSSupabase); return; }
    var attempts = 0;
    var t = setInterval(function () {
      attempts++;
      if (window.VSSupabase) { clearInterval(t); cb(window.VSSupabase); }
      else if (attempts > 75) { clearInterval(t); } // 6s timeout
    }, 80);
  }

  function init() {
    wireShare();
    waitForSupabase(function (db) {
      db.auth.getSession().then(function (res) {
        var session = res && res.data && res.data.session;
        if (!session) {
          document.getElementById('vp-loading').hidden = true;
          var gate = document.getElementById('vp-auth-gate');
          if (gate) gate.hidden = false;
          return;
        }
        db.from('vault_members')
          .select('points, created_at, achievements, username')
          .eq('id', session.user.id)
          .single()
          .then(function (r) {
            if (!r || !r.data) {
              var el = document.getElementById('vp-loading');
              if (el) el.textContent = 'Unable to load passport data.';
              return;
            }
            render({
              points: r.data.points || 0,
              createdAt: r.data.created_at,
              achievements: r.data.achievements || [],
              username: r.data.username || (session.user.email || ''),
            });
          });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
