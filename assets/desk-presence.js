/**
 * Privacy-minimized reader presence and engaged-time measurement for The Desk.
 * A tab-random id lives only in memory. The Worker hashes it before a 90-second
 * presence key and never writes it into the durable engagement aggregate.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-desk-engagement]');
  if (!root) return;
  var slug = root.getAttribute('data-desk-engagement') || '';
  if (!slug) return;
  var endpoint = '/v/desk-presence';
  var presence = root.querySelector('[data-reader-presence]');
  var engaged = root.querySelector('[data-engaged-time]');
  var note = root.querySelector('[data-engagement-note]');
  var bytes = new Uint8Array(16);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
  else for (var b = 0; b < bytes.length; b++) bytes[b] = Math.floor(Math.random() * 256);
  var session = Array.prototype.map.call(bytes, function (n) { return n.toString(16).padStart(2, '0'); }).join('');
  var activeMs = 0;
  // S317 — idle is the complement of engaged: hidden or blurred time in the
  // same session. It is accumulated separately and NEVER added to activeMs, so
  // "reading time" keeps meaning exactly what D-S315.3 says it means. Only a
  // coarse BAND is ever transmitted (see idleBand below) — a per-session
  // wall-clock duration beside engaged seconds is a far richer behavioural
  // fingerprint than one bounded scalar, for a number no editorial question
  // needs at that precision.
  var idleMs = 0;
  var lastTick = performance.now();
  var summarySent = false;

  function isReading() { return document.visibilityState === 'visible' && (!document.hasFocus || document.hasFocus()); }
  function tick() {
    var now = performance.now();
    var delta = Math.max(0, Math.min(now - lastTick, 2000));
    if (isReading()) activeMs += delta; else idleMs += delta;
    lastTick = now;
  }

  // Same four bands the feed declares. Kept in lockstep with
  // scripts/lib/news-audience.mjs idleBucket().
  function idleBand(seconds) {
    if (seconds < 30) return 'under30';
    if (seconds < 120) return '30to119';
    if (seconds < 600) return '120to599';
    return '600plus';
  }
  setInterval(tick, 1000);

  function post(kind, body) {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ kind: kind, slug: slug, session: session }, body || {})),
      keepalive: kind === 'summary',
    });
  }

  function renderPresence(data) {
    if (!presence) return;
    if (!data || data.state !== 'observed') { presence.textContent = 'Unavailable'; return; }
    if (data.activeBand === 'none') presence.textContent = 'Quiet right now';
    else if (data.activeBand === 'one-or-two') presence.textContent = 'A reader or two';
    else if (typeof data.activeReaders === 'number') presence.textContent = data.activeReaders + ' readers';
    else presence.textContent = 'Readers are here';
  }

  function refreshPresence() {
    if (!isReading()) return;
    post('presence').then(function () {
      return fetch(endpoint + '?slug=' + encodeURIComponent(slug), { cache: 'no-store' });
    }).then(function (response) { return response.ok ? response.json() : null; })
      .then(renderPresence).catch(function () { renderPresence(null); });
  }

  function renderAggregate(feed) {
    // S317: the durable aggregates are server-rendered from the committed feed.
    // Re-fetching and overwriting them client-side would reintroduce the layout
    // shift SSR removed, and would let a cached client feed disagree with the
    // gate-checked HTML. Live presence below is still client-owned.
    if (root.getAttribute('data-ssr') === '1') return;
    var rows = feed && Array.isArray(feed.stories) ? feed.stories : [];
    var row = rows.find(function (item) { return item.slug === slug; });
    if (!row || row.state !== 'sufficient') {
      if (engaged) engaged.textContent = 'Building a sample';
      return;
    }
    var seconds = Number(row.averageEngagedSeconds) || 0;
    var label = seconds >= 60 ? Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's avg' : seconds + 's avg';
    if (engaged) engaged.textContent = label;
    if (note) note.textContent = row.observations + ' completed, visible-and-focused reading observations · ' + row.windowDays + '-day window. Exact live counts are withheld below three.';
  }

  function sendSummary() {
    if (summarySent) return;
    tick();
    var seconds = Math.round(activeMs / 1000);
    if (seconds < 1) return;
    summarySent = true;
    var idleSeconds = Math.min(Math.round(idleMs / 1000), 1800);
    var body = JSON.stringify({
      kind: 'summary', slug: slug, session: session,
      engagedSeconds: seconds,
      idleBand: idleBand(idleSeconds),
    });
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    else post('summary', { engagedSeconds: seconds, idleBand: idleBand(idleSeconds) }).catch(function () {});
  }

  fetch('/api/news-desk-engagement.json').then(function (response) { return response.ok ? response.json() : null; })
    .then(renderAggregate).catch(function () { renderAggregate(null); });
  refreshPresence();
  setInterval(refreshPresence, 30000);
  window.addEventListener('pagehide', sendSummary);
}());
