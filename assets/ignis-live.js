(function () {
  'use strict';

  var TIERS = [
    { max: 20000, name: 'Vaulted', color: '#94a3b8' },
    { max: 60000, name: 'Forge',   color: '#f59e0b' },
    { max: 85000, name: 'Sparked', color: '#fbbf24' },
    { max: 100000, name: 'Ignited', color: '#FF7A00' }
  ];

  function tierFor(score) {
    for (var i = 0; i < TIERS.length; i++) {
      if (score <= TIERS[i].max) return TIERS[i];
    }
    return TIERS[TIERS.length - 1];
  }

  function fmt(n) {
    return Number(n).toLocaleString('en-US');
  }

  function hydrate() {
    var scoreEl = document.getElementById('ignis-live-score');
    var tierEl  = document.getElementById('ignis-live-tier');
    var barEl   = document.getElementById('ignis-live-bar');
    if (!scoreEl || !window.VSPublicIntel) return;

    window.VSPublicIntel.get().then(function (payload) {
      var ignis = payload && payload.project && payload.project.ignis;
      if (!ignis) {
        scoreEl.textContent = '—';
        if (tierEl) tierEl.textContent = 'Signal unavailable';
        return;
      }
      var score = Number(ignis.score) || 0;
      var tier  = tierFor(score);
      scoreEl.textContent = fmt(score);
      scoreEl.style.color = tier.color;
      if (tierEl) {
        tierEl.textContent = (ignis.grade || tier.name) + ' tier';
        tierEl.style.color = tier.color;
      }
      if (barEl) {
        var pct = Math.min(100, Math.max(0, (score / 100000) * 100));
        barEl.style.width = pct + '%';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }
})();
