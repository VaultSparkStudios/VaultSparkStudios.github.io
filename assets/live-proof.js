(function () {
  'use strict';

  if (!window.VSPublic) return;

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

  function renderRankDistribution(rankRows) {
    var counts = {};
    (rankRows || []).forEach(function (row) {
      var rank = row.rank_title || 'Spark Initiate';
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

  Promise.all([
    window.VSPublic.from('vault_members').select('id').count().get(),
    window.VSPublic.from('vault_members').select('id').eq('subscription_status', 'active').count().get(),
    window.VSPublic.from('challenge_submissions').select('id').count().get(),
    window.VSPublic.from('vault_members').select('rank_title').get()
  ]).then(function (results) {
    var members = results[0].count || 0;
    var sparked = results[1].count || 0;
    var challenges = results[2].count || 0;
    var rankRows = results[3].data || [];

    ['proof-members', 'stat-members', 'vs-proof-members'].forEach(function (id) {
      setText(id, formatCount(members));
    });
    ['proof-sparked', 'stat-sparked', 'vs-proof-sparked'].forEach(function (id) {
      setText(id, formatCount(sparked));
    });
    ['proof-challenges', 'stat-challenges', 'vs-proof-challenges'].forEach(function (id) {
      setText(id, formatCount(challenges));
    });

    renderRankDistribution(rankRows);
  }).catch(function () {});
})();
