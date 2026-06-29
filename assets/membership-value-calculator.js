/* membership-value-calculator.js — public value picker for /membership-value/. */
(function () {
  'use strict';

  var DEFAULT_PERKS = [
    { id: 'premium-access', label: 'Premium access across every game', value: 10, checked: true },
    { id: 'xp-boost', label: '2x XP progression and monthly bonus', value: 7, checked: true },
    { id: 'community', label: 'Discord role, challenges, and member identity', value: 6, checked: true },
    { id: 'discounts', label: 'Studio discounts and member-only drops', value: 5, checked: true },
    { id: 'archive', label: 'Archive access and early first-wave builds', value: 8, checked: true },
    { id: 'grandfather', label: 'Grandfather-locked early member pricing', value: 12, checked: false }
  ];

  function money(n) {
    return '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
  }

  function emit(event) {
    try {
      var body = JSON.stringify({ route: location.pathname || '/', ux: event });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  function render(root, tiers) {
    var sparked = (tiers || []).find(function (t) { return t.id === 'sparked'; }) || {};
    var price = Number(sparked.price && sparked.price.monthly) || 4.99;
    root.innerHTML = [
      '<div class="mvc-head">',
        '<div>',
          '<p class="mvc-eyebrow">Personal value calculator</p>',
          '<h3>Pick what you would actually use.</h3>',
          '<p>These are not promises of resale value. They are comparable monthly equivalents so a visitor can test whether Sparked makes sense for their own play style.</p>',
        '</div>',
        '<div class="mvc-total" aria-live="polite">',
          '<span id="mvc-total-value">$0</span>',
          '<small>estimated monthly value</small>',
        '</div>',
      '</div>',
      '<div class="mvc-grid" id="mvc-options"></div>',
      '<div class="mvc-result">',
        '<div><strong id="mvc-ratio">0x</strong><span> value vs ' + money(price) + '/mo</span></div>',
        '<a class="button" href="/vault-member/#register">Start Free</a>',
      '</div>'
    ].join('');

    var options = root.querySelector('#mvc-options');
    DEFAULT_PERKS.forEach(function (perk) {
      var label = document.createElement('label');
      label.className = 'mvc-option';
      label.innerHTML = '<input type="checkbox" value="' + perk.value + '"' + (perk.checked ? ' checked' : '') + '> <span>' + perk.label + '</span><strong>' + money(perk.value) + '</strong>';
      options.appendChild(label);
    });

    function update() {
      var total = 0;
      root.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
        if (box.checked) total += Number(box.value) || 0;
      });
      root.querySelector('#mvc-total-value').textContent = money(total);
      root.querySelector('#mvc-ratio').textContent = (total / price).toFixed(1).replace(/\.0$/, '') + 'x';
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
