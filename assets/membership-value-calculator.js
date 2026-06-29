/* membership-value-calculator.js v2 — S236 enhanced with tier recommendation,
   value trajectory chart, and personalized CTAs for /membership-value/. */
(function () {
  'use strict';

  var PERK_GROUPS = [
    {
      tier: 'free', label: 'Free tier perks', color: '#34d399',
      note: 'Always included at zero cost',
      perks: [
        { id: 'rank',        label: 'Vault Rank + leaderboard',        value: 3 },
        { id: 'challenges',  label: 'Weekly challenges + daily login',  value: 3 },
        { id: 'community',   label: 'Discord community access',         value: 2 },
        { id: 'archive-ltd', label: 'Classified Archive (limited)',      value: 3 },
        { id: 'vault-wall',  label: 'Vault Wall recognition + profile', value: 2 },
        { id: 'referral',    label: 'Referral XP rewards',              value: 1 },
      ]
    },
    {
      tier: 'sparked', label: '⚡ VaultSparked unlocks', color: '#ffc400',
      note: '$4.99/mo — grandfather-locked',
      perks: [
        { id: 'ignis',       label: 'Ask IGNIS access (monthly quota)', value: 7  },
        { id: 'archive-all', label: 'Full Classified Archive',          value: 4  },
        { id: 'beta',        label: 'Beta first-wave access',           value: 8  },
        { id: 'xp-bonus',    label: '500 monthly Vault Points bonus',   value: 3  },
        { id: 'ach-spkd',    label: 'Exclusive Sparked achievements',   value: 3  },
        { id: 'streak',      label: '2× streak multiplier',             value: 3  },
        { id: 'disc-spkd',   label: '⚡ Sparked Discord role',          value: 6  },
        { id: 'theme-spkd',  label: 'Blue VaultSparked profile theme',  value: 3  },
        { id: 'grandfather', label: 'Grandfather pricing lock (forever)', value: 10 },
      ]
    },
    {
      tier: 'eternal', label: '◆ Eternal upgrades', color: '#a855f7',
      note: '$29.99/mo — studio-level access',
      perks: [
        { id: 'ignis-unlim', label: 'Unlimited Ask IGNIS',                  value: 18 },
        { id: 'dispatch',    label: 'Eternal Dispatch quarterly brief',      value: 5  },
        { id: 'vaulted-48h', label: '48h early Vaulted project reveals',     value: 4  },
        { id: 'splash',      label: 'Named on game splash screens',          value: 4  },
        { id: 'credits',     label: 'Studio credits — permanent',            value: 3  },
        { id: 'cross-prod',  label: 'Cross-product Eternal access',          value: 13 },
        { id: 'etrn-beta',   label: 'Eternal beta builds + private channel', value: 13 },
        { id: 'etrn-role',   label: '◆ Eternal Discord role + 1,000 XP',    value: 7  },
      ]
    }
  ];

  var TIERS = [
    { id: 'free',    name: 'Vault Member',        price: 0,     color: '#34d399', soft: 'rgba(52,211,153,0.10)'  },
    { id: 'sparked', name: 'VaultSparked',         price: 4.99,  color: '#ffc400', soft: 'rgba(255,196,0,0.10)'   },
    { id: 'eternal', name: 'VaultSparked Eternal', price: 29.99, color: '#a855f7', soft: 'rgba(168,85,247,0.10)'  },
  ];

  var DEFAULT_CHECKED = ['rank','challenges','community','archive-ltd','vault-wall','referral','ignis','beta','archive-all','grandfather'];

  function money(n) { return '$' + Number(n || 0).toFixed(2).replace(/\.00$/, ''); }

  function emit(event) {
    try {
      var body = JSON.stringify({ route: location.pathname || '/', ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  function recommendTier(total, hasEternal) {
    if (hasEternal || total >= 50) return TIERS[2];
    if (total >= 14) return TIERS[1];
    return TIERS[0];
  }

  function buildProfile(ids) {
    var h = function(id) { return ids.indexOf(id) !== -1; };
    if (h('ignis-unlim') || h('credits') || h('cross-prod')) return 'Studio-level access is your match';
    if (h('beta') && h('ignis') && h('archive-all'))         return 'Power member — full Sparked stack';
    if (h('beta') && h('ignis'))                             return 'Early access + AI studio intelligence';
    if (h('beta') && h('archive-all'))                       return 'Early access + lore deep-dive';
    if (h('disc-spkd') && h('ach-spkd'))                     return 'Community-first — identity and achievement';
    if (h('ignis'))                                          return 'AI-forward — IGNIS access is your anchor';
    if (h('beta'))                                           return 'Early-access seeker';
    if (h('grandfather'))                                    return 'Long-term thinker — grandfather lock is the smart play';
    return 'Community member';
  }

  function buildChart(selectedTotal) {
    var W = 480, H = 100, M = 12;
    var sparkedVal = Math.max(selectedTotal, 34);
    var eternalVal = Math.max(selectedTotal + 60, 95);
    var maxY = eternalVal * M;
    var sy = function(v) { return H - 4 - Math.round((v / maxY) * (H - 14)); };
    var sx = function(m) { return Math.round((m / (M - 1)) * (W - 48)) + 24; };

    function poly(vals, col, dashed) {
      var pts = vals.map(function(v, i) { return sx(i) + ',' + sy(v); }).join(' ');
      return '<polyline points="' + pts + '" fill="none" stroke="' + col +
        '" stroke-width="' + (dashed ? '1.5' : '2.2') + '"' +
        (dashed ? ' stroke-dasharray="5,4" opacity="0.40"' : ' opacity="0.88"') +
        ' stroke-linecap="round" stroke-linejoin="round"/>';
    }

    var spkdC = [], spkdV = [], etrnC = [], etrnV = [];
    for (var m = 0; m < M; m++) {
      spkdC.push(TIERS[1].price * (m + 1));
      spkdV.push(sparkedVal  * (m + 1));
      etrnC.push(TIERS[2].price * (m + 1));
      etrnV.push(eternalVal  * (m + 1));
    }

    var labels = [0, 2, 5, 8, 11].map(function(m) {
      return '<text x="' + sx(m) + '" y="' + (H + 14) + '" text-anchor="middle" font-size="9" fill="#6272a0">M' + (m + 1) + '</text>';
    }).join('');

    return '<svg viewBox="0 0 ' + W + ' ' + (H + 22) + '" xmlns="http://www.w3.org/2000/svg" ' +
      'class="mvc-chart-svg" role="img" aria-label="12-month cumulative value vs cost chart">' +
      poly(spkdC, TIERS[1].color, true)  + poly(spkdV, TIERS[1].color, false) +
      poly(etrnC, TIERS[2].color, true)  + poly(etrnV, TIERS[2].color, false) +
      labels + '</svg>';
  }

  function render(root, tiers) {
    var sparked = (tiers || []).find(function (t) { return t.id === 'sparked'; }) || {};
    var price = Number(sparked.price && sparked.price.monthly) || 4.99;

    root.innerHTML = [
      '<div class="mvc-head">',
        '<div>',
          '<p class="mvc-eyebrow">Personal value calculator</p>',
          '<h3>Pick what you would actually use.</h3>',
          '<p>Check the perks that match your play style — the tier recommendation updates live.</p>',
        '</div>',
        '<div class="mvc-total-block" aria-live="polite">',
          '<div id="mvc-total" class="mvc-total-val">$0</div>',
          '<small>estimated monthly value</small>',
          '<div id="mvc-ratio" class="mvc-vs-cost">0x vs cost</div>',
        '</div>',
      '</div>',

      /* Tier comparison bars */
      '<div class="mvc-tier-bars">',
        TIERS.map(function(t) {
          return '<div class="mvc-tier-bar-row">' +
            '<div class="mvc-tbar-meta">' +
              '<span class="mvc-tbar-name" style="color:' + t.color + '">' + t.name + '</span>' +
              '<span class="mvc-tbar-price">' + (t.price === 0 ? 'Free' : money(t.price) + '/mo') + '</span>' +
            '</div>' +
            '<div class="mvc-tbar-track"><div class="mvc-tbar-fill" id="mvc-fill-' + t.id + '" style="background:' + t.color + ';width:0%"></div></div>' +
            '<div id="mvc-tratio-' + t.id + '" class="mvc-tbar-ratio" style="color:' + t.color + '">—</div>' +
          '</div>';
        }).join('') +
      '</div>',

      /* Perk groups */
      '<div class="mvc-perk-groups">',
        PERK_GROUPS.map(function(g) {
          return '<div class="mvc-perk-group">' +
            '<div class="mvc-group-header">' +
              '<span class="mvc-group-name" style="color:' + g.color + '">' + g.label + '</span>' +
              '<span class="mvc-group-note">' + g.note + '</span>' +
            '</div>' +
            '<div class="mvc-grid">' +
              g.perks.map(function(p) {
                var ck = DEFAULT_CHECKED.indexOf(p.id) !== -1;
                return '<label class="mvc-option" data-pid="' + p.id + '">' +
                  '<input type="checkbox" value="' + p.value + '" data-ptier="' + g.tier + '"' + (ck ? ' checked' : '') + '>' +
                  '<span>' + p.label + '</span><strong>' + money(p.value) + '</strong>' +
                '</label>';
              }).join('') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>',

      /* 12-month value trajectory chart */
      '<div class="mvc-trajectory">' +
        '<div class="mvc-traj-header">' +
          '<span class="mvc-traj-title">12-month value vs. cost</span>' +
          '<div class="mvc-traj-legend">' +
            '<span class="mvc-leg-solid" style="background:#ffc400"></span><span class="mvc-leg-text">Sparked value</span>' +
            '<span class="mvc-leg-solid" style="background:#a855f7"></span><span class="mvc-leg-text">Eternal value</span>' +
            '<span class="mvc-leg-dash"></span><span class="mvc-leg-text mvc-leg-dim">cost lines</span>' +
          '</div>' +
        '</div>' +
        '<div id="mvc-chart"></div>' +
      '</div>',

      /* Live recommendation */
      '<div id="mvc-rec" class="mvc-recommendation" aria-live="polite">' +
        '<div id="mvc-rec-chip" class="mvc-rec-chip"></div>' +
        '<div id="mvc-rec-profile" class="mvc-rec-profile"></div>' +
        '<a id="mvc-rec-cta" class="button mvc-rec-btn" href="/vault-member/#register">Join Free →</a>' +
      '</div>',
    ].join('');

    function update() {
      var total = 0, hasEternal = false, ids = [];
      root.querySelectorAll('input[type="checkbox"]').forEach(function(box) {
        if (box.checked) {
          total += Number(box.value) || 0;
          var lbl = box.closest('label');
          if (lbl) ids.push(lbl.dataset.pid);
          if (box.dataset.ptier === 'eternal') hasEternal = true;
        }
      });

      root.querySelector('#mvc-total').textContent = money(total);
      var r = price > 0 ? (total / price) : 0;
      root.querySelector('#mvc-ratio').textContent = r.toFixed(1).replace(/\.0$/, '') + 'x vs ' + money(price) + '/mo';

      /* Tier comparison bars: width relative to selected total */
      TIERS.forEach(function(t) {
        var fill = root.querySelector('#mvc-fill-' + t.id);
        var ratioEl = root.querySelector('#mvc-tratio-' + t.id);
        if (!fill || !ratioEl) return;
        var pct = total > 0 ? Math.min(Math.round((total / Math.max(total * 1.25, 1)) * 100), 100) : 0;
        fill.style.width = pct + '%';
        ratioEl.textContent = t.price === 0
          ? (total > 0 ? '∞' : '0') + 'x'
          : (total / t.price).toFixed(1).replace(/\.0$/, '') + 'x value';
      });

      /* Chart */
      var chart = root.querySelector('#mvc-chart');
      if (chart) chart.innerHTML = buildChart(total);

      /* Recommendation */
      var rec = recommendTier(total, hasEternal);
      var profile = buildProfile(ids);
      var chip = root.querySelector('#mvc-rec-chip');
      var profEl = root.querySelector('#mvc-rec-profile');
      var cta = root.querySelector('#mvc-rec-cta');
      if (chip) {
        chip.textContent = 'Recommended: ' + rec.name;
        chip.style.background = rec.soft;
        chip.style.border = '1px solid ' + rec.color;
        chip.style.color = rec.color;
      }
      if (profEl) profEl.textContent = profile;
      if (cta) {
        if (rec.id === 'sparked') {
          cta.textContent = 'Get Sparked — ' + money(price) + '/mo →';
          cta.href = '/vaultsparked/';
        } else if (rec.id === 'eternal') {
          cta.textContent = 'Go Eternal →';
          cta.href = '/vaultsparked/';
        } else {
          cta.textContent = 'Join Free →';
          cta.href = '/vault-member/#register';
        }
      }

      emit('value-calc:compute');
    }

    root.addEventListener('change', update);
    update();
  }

  function init() {
    var root = document.querySelector('[data-membership-value-calculator]');
    if (!root) return;
    fetch('/api/membership-tiers.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { render(root, d && d.tiers); })
      .catch(function () { render(root, []); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
