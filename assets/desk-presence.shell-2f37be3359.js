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
  var lastTick = performance.now();
  var summarySent = false;

  function isReading() { return document.visibilityState === 'visible' && (!document.hasFocus || document.hasFocus()); }
  function tick() {
    var now = performance.now();
    if (isReading()) activeMs += Math.max(0, Math.min(now - lastTick, 2000));
    lastTick = now;
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
    var body = JSON.stringify({ kind: 'summary', slug: slug, session: session, engagedSeconds: seconds });
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    else post('summary', { engagedSeconds: seconds }).catch(function () {});
  }

  fetch('/api/news-desk-engagement.json').then(function (response) { return response.ok ? response.json() : null; })
    .then(renderAggregate).catch(function () { renderAggregate(null); });
  refreshPresence();
  setInterval(refreshPresence, 30000);
  window.addEventListener('pagehide', sendSummary);
}());
