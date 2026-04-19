(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function phaseData(article, index) {
    var num = article.querySelector('.cl-phase-num');
    var date = article.querySelector('.cl-phase-date');
    var title = article.querySelector('.cl-phase-title');
    var items = article.querySelectorAll('.cl-items li');
    return {
      index: index,
      article: article,
      num: num ? num.textContent.trim() : 'Phase ' + (index + 1),
      date: date ? date.textContent.trim() : '',
      title: title ? title.textContent.trim() : 'Vault update',
      count: items.length
    };
  }

  function init() {
    var root = document.querySelector('[data-time-machine]');
    var phases = Array.from(document.querySelectorAll('.cl-timeline .cl-phase')).map(phaseData);
    if (!root || phases.length < 2) return;

    root.innerHTML =
      '<div class="tm-head">' +
        '<span class="eyebrow">Studio Time Machine</span>' +
        '<h2>Scrub the build history.</h2>' +
        '<p>Move through the vault by session, then jump to the moment that matters.</p>' +
      '</div>' +
      '<div class="tm-controls">' +
        '<button class="tm-step" type="button" data-tm-step="-1">Older</button>' +
        '<input class="tm-range" type="range" min="0" max="' + (phases.length - 1) + '" value="0" aria-label="Choose changelog session">' +
        '<button class="tm-step" type="button" data-tm-step="1">Newer</button>' +
      '</div>' +
      '<div class="tm-readout" aria-live="polite"></div>' +
      '<div class="tm-jumps" aria-label="Changelog shortcuts"></div>';

    var range = root.querySelector('.tm-range');
    var readout = root.querySelector('.tm-readout');
    var jumps = root.querySelector('.tm-jumps');

    jumps.innerHTML = phases.slice(0, 8).map(function (phase) {
      return '<button type="button" class="tm-chip" data-tm-jump="' + phase.index + '">' + esc(phase.num) + '</button>';
    }).join('');

    function select(index, shouldScroll) {
      var next = Math.max(0, Math.min(phases.length - 1, Number(index) || 0));
      range.value = String(next);

      phases.forEach(function (phase) {
        phase.article.toggleAttribute('data-tm-active', phase.index === next);
      });

      var phase = phases[next];
      readout.innerHTML =
        '<strong>' + esc(phase.num) + '</strong>' +
        '<span>' + esc(phase.date) + '</span>' +
        '<p>' + esc(phase.title) + '</p>' +
        '<small>' + phase.count + ' shipped ' + (phase.count === 1 ? 'move' : 'moves') + '</small>';

      root.querySelectorAll('.tm-chip').forEach(function (chip) {
        chip.toggleAttribute('aria-current', Number(chip.getAttribute('data-tm-jump')) === next);
      });

      if (shouldScroll) {
        phase.article.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    range.addEventListener('input', function () { select(range.value, false); });
    range.addEventListener('change', function () { select(range.value, true); });
    root.addEventListener('click', function (event) {
      var step = event.target.closest('[data-tm-step]');
      var jump = event.target.closest('[data-tm-jump]');
      if (step) select(Number(range.value) + Number(step.getAttribute('data-tm-step')), true);
      if (jump) select(Number(jump.getAttribute('data-tm-jump')), true);
    });

    select(0, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
