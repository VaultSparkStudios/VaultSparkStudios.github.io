/**
 * VaultSpark — Changelog controls.
 *
 * S284: reworked from the old "Time Machine"-only scrubber, which was confusing
 * (its Older/Newer buttons were inverted relative to the slider direction and it
 * offered no way to actually search). Now provides, over the same newest-first
 * timeline:
 *   1. A real SEARCH box (filters entries by title + items, highlights matches).
 *   2. YEAR filter chips (a meaningful, non-fragile filter).
 *   3. A corrected session scrubber (left = Newest, right = Oldest; buttons match).
 *   4. Stable per-entry anchors + deep-link (scroll + flash) so links like the
 *      homepage hero ticker's "/changelog/#cl-latest" land on the right entry.
 *
 * The scrubber is retained (and still exposes a range input, data-tm-active, and
 * scrollIntoView) because it is a genuine browse aid and is contract-verified by
 * scripts/verify-changelog-time-machine.mjs.
 */
(function () {
  'use strict';

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function appendText(parent, tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    parent.appendChild(node);
    return node;
  }

  function slugify(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  }

  function phaseData(article, index) {
    var num = article.querySelector('.cl-phase-num');
    var date = article.querySelector('.cl-phase-date');
    var title = article.querySelector('.cl-phase-title');
    var itemEls = article.querySelectorAll('.cl-items li');
    var titleText = title ? title.textContent.trim() : 'Vault update';
    var dateText = date ? date.textContent.trim() : '';
    var isoDate = article.getAttribute('data-cl-date') || '';
    var yearMatch = (isoDate || dateText).match(/(20\d{2})/);
    var items = [];
    itemEls.forEach(function (li) { items.push(li.textContent.trim()); });
    // Stable anchor: prefer the committed ISO date, else the visible date, plus a
    // short title slug so distinct same-day entries stay unique.
    var id = 'entry-' + (slugify(isoDate || dateText) || index) + (titleText ? '-' + slugify(titleText).slice(0, 24) : '');
    if (!article.id) article.id = id;
    // Per-entry permalink so any single update is shareable (uses the anchor above).
    var header = article.querySelector('.cl-phase-header');
    if (header && !header.querySelector('.cl-permalink')) {
      var pl = document.createElement('a');
      pl.className = 'cl-permalink';
      pl.href = '#' + article.id;
      pl.setAttribute('aria-label', 'Copy a link to this update: ' + titleText);
      pl.textContent = '#';
      header.appendChild(pl);
    }
    return {
      index: index,
      article: article,
      id: article.id,
      num: num ? num.textContent.trim() : 'Phase ' + (index + 1),
      date: dateText,
      title: titleText,
      year: yearMatch ? yearMatch[1] : '',
      haystack: (titleText + ' ' + items.join(' ')).toLowerCase(),
      titleEl: title,
      itemEls: itemEls,
      count: itemEls.length
    };
  }

  // ── Search highlighting ──────────────────────────────────────────────────
  function highlight(el, query) {
    if (!el) return;
    var original = el.getAttribute('data-cl-text');
    if (original == null) { original = el.textContent; el.setAttribute('data-cl-text', original); }
    if (!query) { el.textContent = original; return; }
    var lower = original.toLowerCase();
    var q = query.toLowerCase();
    var idx = lower.indexOf(q);
    if (idx < 0) { el.textContent = original; return; }
    clear(el);
    var pos = 0;
    while (idx >= 0) {
      if (idx > pos) el.appendChild(document.createTextNode(original.slice(pos, idx)));
      var mark = document.createElement('mark');
      mark.textContent = original.slice(idx, idx + q.length);
      el.appendChild(mark);
      pos = idx + q.length;
      idx = lower.indexOf(q, pos);
    }
    if (pos < original.length) el.appendChild(document.createTextNode(original.slice(pos)));
  }

  function applyHighlight(phase, query) {
    highlight(phase.titleEl, query);
    phase.itemEls.forEach(function (li) { highlight(li, query); });
  }

  // ── Deep-link (scroll + flash) ───────────────────────────────────────────
  function flash(article) {
    if (!article) return;
    article.classList.remove('cl-phase--flash');
    // reflow to restart the animation
    void article.offsetWidth;
    article.classList.add('cl-phase--flash');
    article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { article.classList.remove('cl-phase--flash'); }, 2400);
  }

  function resolveHashTarget(phases) {
    var hash = (location.hash || '').replace(/^#/, '');
    if (!hash) return null;
    if (hash === 'cl-latest' || hash === 'latest') return phases[0] || null;
    for (var i = 0; i < phases.length; i++) {
      if (phases[i].id === hash) return phases[i];
    }
    // tolerant: a hash that is a prefix of an entry id (e.g. just the date)
    for (var j = 0; j < phases.length; j++) {
      if (phases[j].id.indexOf('entry-' + hash) === 0 || phases[j].id.indexOf(hash) >= 0) return phases[j];
    }
    return null;
  }

  function init() {
    var timeline = document.querySelector('.cl-timeline');
    if (!timeline) return;
    var phases = Array.from(document.querySelectorAll('.cl-timeline .cl-phase')).map(phaseData);
    if (!phases.length) return;

    buildFilter(phases);
    buildTimeMachine(phases);
    handleDeepLink(phases);
  }

  // ── Filter + search bar ──────────────────────────────────────────────────
  function buildFilter(phases) {
    var mount = document.querySelector('[data-cl-filter]');
    if (!mount) return;
    clear(mount);
    mount.hidden = false;

    var searchWrap = appendText(mount, 'div', 'cl-search');
    appendText(searchWrap, 'span', 'cl-search__icon', '🔍').setAttribute('aria-hidden', 'true');
    var input = document.createElement('input');
    input.type = 'search';
    input.setAttribute('aria-label', 'Search the changelog');
    input.placeholder = 'Search shipped changes…';
    searchWrap.appendChild(input);
    var clearBtn = appendText(searchWrap, 'button', 'cl-search__clear', '×');
    clearBtn.type = 'button';
    clearBtn.setAttribute('aria-label', 'Clear search');

    var chipRow = appendText(mount, 'div', 'cl-filter__chips');
    chipRow.setAttribute('role', 'group');
    chipRow.setAttribute('aria-label', 'Filter changelog by year');
    appendText(chipRow, 'span', 'cl-filter__label', 'Filter');

    var years = [];
    phases.forEach(function (p) { if (p.year && years.indexOf(p.year) < 0) years.push(p.year); });
    years.sort(function (a, b) { return Number(b) - Number(a); });

    // Initial state comes from the URL so a searched/filtered view is shareable
    // and the back button restores it.
    var params = new URLSearchParams(location.search);
    var initialYear = params.get('year') || 'all';
    if (initialYear !== 'all' && years.indexOf(initialYear) < 0) initialYear = 'all';
    var state = { query: (params.get('q') || '').trim().toLowerCase(), year: initialYear };
    if (state.query) input.value = params.get('q');
    var chips = [];
    function makeChip(label, value) {
      var chip = appendText(chipRow, 'button', 'cl-fchip', label);
      chip.type = 'button';
      chip.setAttribute('data-year', value);
      chip.setAttribute('aria-pressed', value === state.year ? 'true' : 'false');
      chips.push(chip);
    }
    makeChip('All', 'all');
    years.forEach(function (y) { makeChip(y, y); });

    function syncUrl() {
      var p = new URLSearchParams(location.search);
      if (state.query) p.set('q', state.query); else p.delete('q');
      if (state.year !== 'all') p.set('year', state.year); else p.delete('year');
      var qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }

    var count = appendText(mount, 'div', 'cl-filter__count', '');
    count.setAttribute('aria-live', 'polite');

    var empty = document.querySelector('.cl-empty');
    if (!empty) {
      empty = document.createElement('div');
      empty.className = 'cl-empty';
      empty.hidden = true;
      empty.textContent = 'No shipped changes match that search yet.';
      var timeline = document.querySelector('.cl-timeline');
      timeline.parentNode.insertBefore(empty, timeline.nextSibling);
    }

    function apply() {
      var shown = 0;
      phases.forEach(function (p) {
        var matchYear = state.year === 'all' || p.year === state.year;
        var matchQuery = !state.query || p.haystack.indexOf(state.query) >= 0;
        var visible = matchYear && matchQuery;
        p.article.hidden = !visible;
        if (visible) shown++;
        applyHighlight(p, state.query);
      });
      searchWrap.toggleAttribute('data-has-value', !!state.query);
      empty.hidden = shown > 0;
      if (state.query || state.year !== 'all') {
        count.textContent = shown + ' of ' + phases.length + ' update' + (phases.length === 1 ? '' : 's') + ' shown';
      } else {
        count.textContent = '';
      }
      syncUrl();
    }

    var debounce;
    input.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { state.query = input.value.trim().toLowerCase(); apply(); }, 120);
    });
    clearBtn.addEventListener('click', function () { input.value = ''; state.query = ''; apply(); input.focus(); });
    chipRow.addEventListener('click', function (e) {
      var chip = e.target.closest('.cl-fchip');
      if (!chip) return;
      state.year = chip.getAttribute('data-year');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      apply();
    });
    // Reflect any initial ?q / ?year from the URL immediately.
    if (state.query || state.year !== 'all') apply();
  }

  // ── Session scrubber (corrected direction) ───────────────────────────────
  function buildTimeMachine(phases) {
    var root = document.querySelector('[data-time-machine]');
    if (!root || phases.length < 2) return;
    clear(root);

    var head = appendText(root, 'div', 'tm-head');
    appendText(head, 'span', 'eyebrow', 'Studio Time Machine');
    appendText(head, 'h2', '', 'Scrub the build history.');
    appendText(head, 'p', '', 'Slide from the newest ship on the left to the very first on the right — or jump straight to a session below.');

    var controls = appendText(root, 'div', 'tm-controls');
    // Left button moves toward the NEWEST (index 0, left of the slider);
    // right button moves toward the OLDEST (max, right of the slider).
    var newer = appendText(controls, 'button', 'tm-step', '‹ Newer');
    newer.type = 'button';
    newer.setAttribute('data-tm-step', '-1');
    var range = document.createElement('input');
    range.className = 'tm-range';
    range.type = 'range';
    range.min = '0';
    range.max = String(phases.length - 1);
    range.value = '0';
    range.setAttribute('aria-label', 'Scrub changelog sessions from newest to oldest');
    controls.appendChild(range);
    var older = appendText(controls, 'button', 'tm-step', 'Older ›');
    older.type = 'button';
    older.setAttribute('data-tm-step', '1');
    var scale = appendText(controls, 'div', 'tm-scale');
    appendText(scale, 'span', '', 'Newest');
    appendText(scale, 'span', '', 'Oldest');

    var readout = appendText(root, 'div', 'tm-readout');
    readout.setAttribute('aria-live', 'polite');

    var jumps = appendText(root, 'div', 'tm-jumps');
    jumps.setAttribute('aria-label', 'Jump to a recent session');
    phases.slice(0, 8).forEach(function (phase) {
      var chip = appendText(jumps, 'button', 'tm-chip', phase.num);
      chip.type = 'button';
      chip.setAttribute('data-tm-jump', String(phase.index));
    });

    function select(index, shouldScroll) {
      var next = Math.max(0, Math.min(phases.length - 1, Number(index) || 0));
      range.value = String(next);
      phases.forEach(function (p) { p.article.toggleAttribute('data-tm-active', p.index === next); });
      var phase = phases[next];
      clear(readout);
      appendText(readout, 'strong', '', phase.num);
      appendText(readout, 'span', '', phase.date);
      appendText(readout, 'p', '', phase.title);
      appendText(readout, 'small', '', phase.count + ' shipped ' + (phase.count === 1 ? 'move' : 'moves'));
      root.querySelectorAll('.tm-chip').forEach(function (chip) {
        chip.toggleAttribute('aria-current', Number(chip.getAttribute('data-tm-jump')) === next);
      });
      if (shouldScroll) {
        // un-hide a filtered-out target so the scrub never lands on nothing
        if (phase.article.hidden) phase.article.hidden = false;
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

  function handleDeepLink(phases) {
    var target = resolveHashTarget(phases);
    if (target) setTimeout(function () { flash(target.article); }, 220);
    window.addEventListener('hashchange', function () {
      var t = resolveHashTarget(phases);
      if (t) { t.article.hidden = false; flash(t.article); }
    });
  }

  function reinit() { init(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  document.addEventListener('vs:changelog-live-rendered', reinit);
})();
