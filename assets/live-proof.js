(function () {
  'use strict';

  if (!window.VSPublic) return;

  // Reuse the existing generated membership authority; no alternate rank scale.
  var membershipReady = window.VSMembership
    ? Promise.resolve(window.VSMembership)
    : import('/assets/membership-access.js').then(function () { return window.VSMembership; });
  membershipReady = membershipReady.then(function (authority) {
    if (!authority || !authority.config || !Array.isArray(authority.config.ranks) ||
        !Array.isArray(authority.config.rankThresholds) || typeof authority.getRankIndex !== 'function' ||
        authority.config.ranks.length !== authority.config.rankThresholds.length || !authority.config.ranks.length) {
      throw new Error('rank_authority_unavailable');
    }
    return authority;
  });
  // Missing authority suppresses enhancement; it never substitutes a guessed scale.
  membershipReady.catch(function () {});

  var RANK_CONFIG = [
    { title: 'Spark Initiate', color: '#94a3b8' },
    { title: 'Vault Runner', color: '#60a5fa' },
    { title: 'Rift Scout', color: '#34d399' },
    { title: 'Vault Guard', color: '#a78bfa' },
    { title: 'Vault Breacher', color: '#f97316' },
    { title: 'Void Operative', color: '#f43f5e' },
    { title: 'Vault Keeper', color: '#fbbf24' },
    { title: 'Forge Master', color: '#ff7a00' },
    { title: 'The Sparked', color: '#FFC400' }
  ];

  function formatCount(value) {
    if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
    return String(value);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function pointsToRankTitle(points) {
    var authority = window.VSMembership;
    return authority.config.ranks[authority.getRankIndex(points)].label;
  }

  function renderRankDistribution(rankRows) {
    RANK_CONFIG = window.VSMembership.config.ranks.map(function (rank, i) {
      return { title: rank.label, color: RANK_CONFIG[i] && RANK_CONFIG[i].color || '#94a3b8' };
    });
    var counts = {};
    (rankRows || []).forEach(function (row) {
      var rank = pointsToRankTitle(row.points);
      counts[rank] = (counts[rank] || 0) + 1;
    });

    var total = Object.keys(counts).reduce(function (sum, key) { return sum + counts[key]; }, 0);
    if (!total) return;

    var bar = document.getElementById('proof-rank-bar');
    var legend = document.getElementById('proof-rank-legend');

    if (bar) {
      bar.innerHTML = RANK_CONFIG.map(function (rank) {
        var pct = ((counts[rank.title] || 0) / total) * 100;
        if (pct < 0.5) return '';
        return '<div style="background:' + rank.color + ';flex:' + pct + ';min-width:3px" title="' + rank.title + ': ' + Math.round(pct) + '%"></div>';
      }).join('');
    }

    if (legend) {
      legend.innerHTML = RANK_CONFIG.filter(function (rank) {
        return counts[rank.title] > 0;
      }).map(function (rank) {
        return '<span style="display:flex;align-items:center;gap:0.3rem;font-size:0.67rem;color:var(--dim);">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:' + rank.color + ';flex-shrink:0;"></span>' +
          rank.title.split(' ').slice(-1)[0] +
          '</span>';
      }).join('');
    }
  }

  function renderFromIntel(intel) {
    if (!intel) return;
    var stats = intel.stats || {};
    var portfolio = intel.portfolio || {};
    // Use public-intelligence.json as the source of truth whenever Supabase REST is unavailable.
    // These stats are public-safe aggregates — no per-user data.
    if (stats.sessionsCompleted) setText('proof-sessions', formatCount(stats.sessionsCompleted));
    if (portfolio.sparked != null) {
      ['proof-sparked', 'stat-sparked', 'vs-proof-sparked'].forEach(function (id) {
        setText(id, formatCount(portfolio.sparked));
      });
    }
  }

  Promise.all([
    window.VSPublic.from('public_leaderboard').select('id').count().get(),
    window.VSPublic.from('public_leaderboard').select('id').eq('is_sparked', true).count().get(),
    window.VSPublic.from('challenge_submissions').select('id').count().get(),
    window.VSPublic.from('public_leaderboard').select('points').get()
  ]).then(function (results) {
    var anyOk = results.some(function (r) { return r && !r.error; });
    if (!anyOk) throw new Error('rest_unavailable');

    var members = (results[0] && results[0].count) || 0;
    var sparked = (results[1] && results[1].count) || 0;
    var challenges = (results[2] && results[2].count) || 0;
    var rankRows = (results[3] && results[3].data) || [];

    if (members) {
      ['proof-members', 'stat-members', 'vs-proof-members'].forEach(function (id) {
        setText(id, formatCount(members));
      });
    }
    if (sparked) {
      ['proof-sparked', 'stat-sparked', 'vs-proof-sparked'].forEach(function (id) {
        setText(id, formatCount(sparked));
      });
    }
    if (challenges) {
      ['proof-challenges', 'stat-challenges', 'vs-proof-challenges'].forEach(function (id) {
        setText(id, formatCount(challenges));
      });
    }

    membershipReady.then(function () { renderRankDistribution(rankRows); }).catch(function () {});
  }).catch(function () {
    // REST unavailable — fall back to public intelligence snapshot for public-safe aggregates.
    if (window.VSPublicIntel) window.VSPublicIntel.get().then(renderFromIntel).catch(function () {});
  });

  // Always populate build-session count from the public intelligence snapshot (not in Supabase).
  if (window.VSPublicIntel) {
    window.VSPublicIntel.get().then(function (intel) {
      var sessions = intel && intel.stats && intel.stats.sessionsCompleted;
      if (sessions) setText('proof-sessions', formatCount(sessions));
    }).catch(function () {});
  }
})();
