(function () {
  'use strict';

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

  function appendText(parent, tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text == null ? '' : String(text);
    parent.appendChild(node);
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function buildShell(root, max) {
    clear(root);
    var head = document.createElement('div');
    head.className = 'tm-head';
    appendText(head, 'span', 'eyebrow', 'Studio Time Machine');
    appendText(head, 'h2', '', 'Scrub the build history.');
    appendText(head, 'p', '', 'Move through the vault by session, then jump to the moment that matters.');
    root.appendChild(head);

    var controls = document.createElement('div');
    controls.className = 'tm-controls';
    var older = appendText(controls, 'button', 'tm-step', 'Older');
    older.type = 'button';
    older.setAttribute('data-tm-step', '-1');
    var range = document.createElement('input');
    range.className = 'tm-range';
    range.type = 'range';
    range.min = '0';
    range.max = String(max);
    range.value = '0';
    range.setAttribute('aria-label', 'Choose changelog session');
    controls.appendChild(range);
    var newer = appendText(controls, 'button', 'tm-step', 'Newer');
    newer.type = 'button';
    newer.setAttribute('data-tm-step', '1');
    root.appendChild(controls);

    var readout = document.createElement('div');
    readout.className = 'tm-readout';
    readout.setAttribute('aria-live', 'polite');
    root.appendChild(readout);

    var jumps = document.createElement('div');
    jumps.className = 'tm-jumps';
    jumps.setAttribute('aria-label', 'Changelog shortcuts');
    root.appendChild(jumps);
    return { range: range, readout: readout, jumps: jumps };
  }

  function init() {
    var root = document.querySelector('[data-time-machine]');
    var phases = Array.from(document.querySelectorAll('.cl-timeline .cl-phase')).map(phaseData);
    if (!root || phases.length < 2) return;

    var shell = buildShell(root, phases.length - 1);
    phases.slice(0, 8).forEach(function (phase) {
      var chip = appendText(shell.jumps, 'button', 'tm-chip', phase.num);
      chip.type = 'button';
      chip.setAttribute('data-tm-jump', String(phase.index));
    });

    function select(index, shouldScroll) {
      var next = Math.max(0, Math.min(phases.length - 1, Number(index) || 0));
      shell.range.value = String(next);

      phases.forEach(function (phase) {
        phase.article.toggleAttribute('data-tm-active', phase.index === next);
      });

      var phase = phases[next];
      clear(shell.readout);
      appendText(shell.readout, 'strong', '', phase.num);
      appendText(shell.readout, 'span', '', phase.date);
      appendText(shell.readout, 'p', '', phase.title);
      appendText(shell.readout, 'small', '', phase.count + ' shipped ' + (phase.count === 1 ? 'move' : 'moves'));

      root.querySelectorAll('.tm-chip').forEach(function (chip) {
        chip.toggleAttribute('aria-current', Number(chip.getAttribute('data-tm-jump')) === next);
      });

      if (shouldScroll) {
        phase.article.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    shell.range.addEventListener('input', function () { select(shell.range.value, false); });
    shell.range.addEventListener('change', function () { select(shell.range.value, true); });
    root.addEventListener('click', function (event) {
      var step = event.target.closest('[data-tm-step]');
      var jump = event.target.closest('[data-tm-jump]');
      if (step) select(Number(shell.range.value) + Number(step.getAttribute('data-tm-step')), true);
      if (jump) select(Number(jump.getAttribute('data-tm-jump')), true);
    });

    select(0, false);
  }

  function reinit() {
    var root = document.querySelector('[data-time-machine]');
    if (root) clear(root);
    init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  document.addEventListener('vs:changelog-live-rendered', reinit);
})();