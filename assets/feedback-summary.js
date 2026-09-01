/**
 * feedback-summary.js (S163 audit #9 · feedback-sentiment-cron)
 *
 * Renders the sentiment trend + top-3 un-addressed asks in the /changelog/#requests insights block
 * from /api/feedback-summary.json (written by the studio-ops sentiment cron).
 * Silent until the cron produces data — no empty-state noise.
 *
 * Public-safe: reads counts + curator hints only, never raw member feedback.
 */
(function () {
  'use strict';
  var mount = document.getElementById('insights-open-asks');
  if (!mount) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function trendLine(trend) {
    if (!trend || !trend.length) return '';
    var latest = trend[trend.length - 1];
    var total = (latest.positive || 0) + (latest.neutral || 0) + (latest.negative || 0);
    if (!total) return '';
    var posPct = Math.round((latest.positive || 0) / total * 100);
    return '<p style="color:var(--muted,#a8b4d0);font-size:0.92rem;margin:0 0 1rem;">' +
      'Latest week (' + esc(latest.week) + '): <strong style="color:var(--gold,#ffc400);">' + posPct + '%</strong> positive across ' + total + ' signals.</p>';
  }

  function render(data) {
    var trend = (data && data.sentimentTrend) || [];
    var open = (data && data.topUnaddressed) || [];
    if (!trend.length && !open.length) return; // silent

    var asks = open.slice(0, 3).map(function (a) {
      return '<li style="display:flex;justify-content:space-between;gap:1rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.06);">' +
        '<span style="color:var(--text,#eef2ff);">' + esc(a.theme) + (a.hint ? ' <span style="color:var(--dim,#6272a0);font-size:0.85rem;">— ' + esc(a.hint) + '</span>' : '') + '</span>' +
        '<span style="color:var(--muted,#a8b4d0);font-variant-numeric:tabular-nums;">' + (a.count || 0) + '</span>' +
      '</li>';
    }).join('');

    mount.innerHTML =
      '<h2 style="font-size:clamp(1.4rem,3vw,2rem);margin:0 0 0.4rem;">What we haven’t shipped yet</h2>' +
      '<p style="color:var(--muted,#a8b4d0);max-width:60ch;margin:0 0 1rem;font-size:0.95rem;">The honest other half of the loop — the asks still open, ranked by how often they come up.</p>' +
      trendLine(trend) +
      (asks ? '<ul style="list-style:none;margin:0;padding:0;">' + asks + '</ul>' : '');
    mount.style.display = '';
  }

  fetch('/api/feedback-summary.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d) render(d); })
    .catch(function () { /* silent — additive surface */ });
})();
