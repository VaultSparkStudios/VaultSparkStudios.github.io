// desk-wire.js — The Desk wire strip (site-wide, inside <header class="site-header">).
//
// The label is EVIDENCE-BOUND: "Live on The Desk" with a pulsing dot is only
// used when /api/news-desk-freshness.json measures the cadence as daily;
// otherwise the strip says "Latest · The Desk" with a still dot. Both strings
// fit the fixed label box, so the claim changes without any geometry changing.
//
// The slot is SERVER-RENDERED by scripts/propagate-nav.mjs buildNav() as a
// fixed-height (36px) strip with a working fallback link to /news/, and its
// height is reserved in both the critical shell and assets/style.css. This
// script only swaps TEXT inside boxes whose geometry never changes:
//   · the label box has a fixed flex-basis, so "The Desk" -> "Live on The Desk"
//     cannot move the headline;
//   · the headline box is flex:1 with ellipsis, so a longer/shorter headline
//     cannot move the "Read" affordance.
// Result: zero layout shift by construction, and the strip still works without JS.
//
// Loaded by an assets/ambient-loader.js predicate (idle), never on portals,
// /news/<date>/ article pages, [data-no-strip] pages or where the strip is hidden.
// DOM writes are textContent/setAttribute only (Trusted Types safe).
(function () {
  'use strict';

  var FEED_URL = '/api/news-desk.json';
  var FRESHNESS_URL = '/api/news-desk-freshness.json';
  var MAX_HEADLINE = 110;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  // Both labels are measured to fit the fixed 9.5rem (152px) label box at
  // 1366px in the real font stack AND in a serif fallback, so swapping one for
  // the other cannot clip or move a box. style.css also gives the label an
  // ellipsis as a last resort.
  var LIVE_LABEL = 'Live on The Desk';
  var LATEST_LABEL = 'Latest · The Desk';

  /** Collapse whitespace and truncate at a word boundary with an ellipsis. */
  function truncateHeadline(text, max) {
    var limit = Number.isFinite(max) && max > 1 ? Math.floor(max) : MAX_HEADLINE;
    var clean = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (clean.length <= limit) return clean;
    var cut = clean.slice(0, limit - 1);
    // Already on a word boundary when the next character is whitespace.
    if (!/\s/.test(clean.charAt(limit - 1))) {
      var space = cut.lastIndexOf(' ');
      // Only back off when it keeps most of the budget; otherwise a single very
      // long token would collapse to almost nothing.
      if (space >= Math.floor(limit * 0.6)) cut = cut.slice(0, space);
    }
    return cut.replace(/[\s,;:.—–-]+$/, '') + '…';
  }

  /** A story link must be a same-origin Desk path — never protocol-relative or absolute. */
  function isDeskHref(href) {
    return typeof href === 'string' && /^\/news\/[A-Za-z0-9._~\/-]*$/.test(href) && href.indexOf('//') === -1 && href.indexOf('..') === -1;
  }

  /**
   * Pure: pick the newest publishable card from /api/news-desk.json.
   * Returns null unless the feed is live and at least one card is well-formed,
   * in which case the server-rendered fallback simply stays in place.
   */
  function selectLatest(feed, max) {
    if (!feed || feed.state !== 'live' || !Array.isArray(feed.cards)) return null;
    var best = null;
    var bestIndex = -1;
    for (var i = 0; i < feed.cards.length; i++) {
      var card = feed.cards[i];
      if (!card || !isDeskHref(card.href)) continue;
      if (typeof card.headline !== 'string' || !card.headline.trim()) continue;
      var date = DATE_RE.test(card.date || '') ? card.date : '';
      // Newest date wins; ties (and undated cards) keep feed order.
      if (!best || (date && (!best.date || date > best.date))) {
        best = { href: card.href, date: date, full: card.headline.replace(/\s+/g, ' ').trim() };
        bestIndex = i;
      }
    }
    if (!best) return null;
    return {
      href: best.href,
      date: best.date,
      index: bestIndex,
      fullHeadline: best.full,
      headline: truncateHeadline(best.full, max)
    };
  }

  /**
   * Pure: what the strip is allowed to CLAIM, from the measured freshness feed.
   *
   * "Live" with a pulsing dot is a cadence claim, and the only evidence for it
   * is /api/news-desk-freshness.json, whose `state` is derived from the corpus
   * ('daily' | 'periodic' | 'paused'). The strip used to say "Live" and pulse
   * whenever a headline loaded — which would have pulsed over a days-old
   * edition while the homepage module said the cadence was periodic. Anything
   * that is not measured-daily is "Latest", with a still dot. A missing or
   * unreadable feed is not evidence of daily, so it also reads "Latest".
   */
  function deskWireLabel(freshness) {
    var state = freshness && typeof freshness.state === 'string' ? freshness.state : '';
    if (state === 'daily') return { label: LIVE_LABEL, state: 'live', pulse: true };
    return { label: LATEST_LABEL, state: 'latest', pulse: false };
  }

  var api = {
    selectLatest: selectLatest,
    deskWireLabel: deskWireLabel,
    truncateHeadline: truncateHeadline,
    isDeskHref: isDeskHref,
    MAX_HEADLINE: MAX_HEADLINE,
    LIVE_LABEL: LIVE_LABEL,
    LATEST_LABEL: LATEST_LABEL
  };

  // Node (unit tests) — expose the pure functions and never touch a DOM.
  if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = api;
    return;
  }
  if (typeof document === 'undefined') return;

  function mount() {
    var root = document.querySelector('.site-header [data-desk-wire]');
    if (!root) return;
    var mounted = root.getAttribute('data-desk-wire-state');
    if (mounted === 'live' || mounted === 'latest') return;
    var link = root.querySelector('[data-desk-wire-link]');
    var label = root.querySelector('[data-desk-wire-label]');
    var headline = root.querySelector('[data-desk-wire-headline]');
    if (!link || !label || !headline || typeof fetch !== 'function') return;

    var readJson = function (url) {
      return fetch(url, { credentials: 'same-origin' })
        .then(function (res) { return res && res.ok ? res.json() : null; })
        .catch(function () { return null; });
    };

    // The freshness feed is small and fetched alongside the headline feed. It
    // only ever downgrades the claim, so a failure costs nothing but a pulse.
    Promise.all([readJson(FEED_URL), readJson(FRESHNESS_URL)])
      .then(function (both) {
        var item = selectLatest(both[0]);
        if (!item) return;
        var badge = deskWireLabel(both[1]);
        link.setAttribute('href', item.href);
        link.setAttribute('title', item.fullHeadline);
        label.textContent = badge.label;
        headline.textContent = item.headline;
        if (item.date) link.setAttribute('data-desk-wire-date', item.date);
        root.setAttribute('data-desk-wire-state', badge.state);
      })
      .catch(function () { /* honest fallback: the static link to /news/ stays */ });
  }

  window.VSDeskWire = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
