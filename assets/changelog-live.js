/**
 * VaultSpark - Changelog live feed.
 *
 * Renders public-safe consumerChangelog entries from public-intelligence.json
 * as `.cl-phase` articles prepended above the legacy hardcoded timeline. This
 * closes the gap between the last hardcoded session (S66) and what the studio
 * has actually shipped, using only public-safe copy authored in
 * scripts/generate-public-intelligence.mjs (CONSUMER_CHANGELOG).
 *
 * Sort order: newest first, so the feed reads top-to-bottom as a live log.
 */
(function () {
  'use strict';

  function parseDate(raw) {
    if (!raw) return 0;
    var d = new Date(String(raw).trim());
    if (!isNaN(d.getTime())) return d.getTime();
    var m = String(raw).match(/(\d{4})[-\/]?(\d{1,2})?/);
    if (m) return new Date(Number(m[1]), Number(m[2] || 1) - 1, 1).getTime();
    return 0;
  }

  function formatLabel(raw) {
    if (!raw) return '';
    var d = new Date(String(raw).trim());
    if (isNaN(d.getTime())) return String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    return String(raw).trim();
  }

  function textNode(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text == null ? '' : String(text);
    return node;
  }

  function renderEntry(entry) {
    var items = Array.isArray(entry.highlights) ? entry.highlights : [];
    var article = document.createElement('article');
    article.className = 'cl-phase cl-phase--live';
    article.setAttribute('data-reveal', 'fade-up');
    article.setAttribute('data-cl-live', '1');

    var dot = document.createElement('div');
    dot.className = 'cl-dot';
    dot.setAttribute('aria-hidden', 'true');
    article.appendChild(dot);

    var header = document.createElement('div');
    header.className = 'cl-phase-header';
    header.appendChild(textNode('span', 'cl-phase-num', 'Live'));
    header.appendChild(textNode('span', 'cl-phase-date', formatLabel(entry.date)));
    header.appendChild(textNode('div', 'cl-phase-title', entry.title || 'Vault update'));
    article.appendChild(header);

    var list = document.createElement('ul');
    list.className = 'cl-items';
    items.forEach(function (item) { list.appendChild(textNode('li', '', item)); });
    article.appendChild(list);
    return article;
  }

  function init() {
    var timeline = document.querySelector('.cl-timeline');
    if (!timeline || !window.VSPublicIntel) return;

    window.VSPublicIntel.get().then(function (intel) {
      var feed = intel && intel.consumerChangelog;
      if (!Array.isArray(feed) || !feed.length) return;

      // S275 (CLS root-fix): entries are rendered STATICALLY at build time
      // (scripts/build-changelog-live.mjs → cl-live markers), so first paint
      // is final layout. Only prepend entries genuinely newer than the newest
      // static one (a live-feed update between builds — normally zero).
      var newestStatic = '';
      var staticNodes = timeline.querySelectorAll('[data-cl-live]');
      for (var i = 0; i < staticNodes.length; i++) {
        var d = staticNodes[i].getAttribute('data-cl-date') || '';
        if (d > newestStatic) newestStatic = d;
      }
      var fresh = feed.filter(function (e) { return String(e.date || '') > newestStatic; });
      if (!fresh.length) {
        document.dispatchEvent(new CustomEvent('vs:changelog-live-rendered'));
        return;
      }
      var sorted = fresh.slice().sort(function (a, b) { return parseDate(b.date) - parseDate(a.date); });
      var fragment = document.createDocumentFragment();
      sorted.forEach(function (entry) { fragment.appendChild(renderEntry(entry)); });
      timeline.insertBefore(fragment, timeline.firstChild);
      document.dispatchEvent(new CustomEvent('vs:changelog-live-rendered'));
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();