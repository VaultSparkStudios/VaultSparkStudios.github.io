/* showcase-spine.js — S147 showcase-spine
 *
 * Hydrates the homepage Studio Spine section from existing public feeds.
 * Three live cards in one strip, one CTA into the full Oracle.
 *
 *   - Latest Pulse  → /api/public-intelligence.json → .pulse.now[0]
 *                     (falls back to ecosystem.listingMetadata.tagline)
 *   - Studio Signal → /api/heartbeat.json           → count projects + 7d pulses
 *   - Oracle Read   → /api/public-intelligence.json → .ecosystem.listingMetadata.canonicalSummary
 *                     (or .stats summary if present)
 *
 * Micro-feedback (showcase-pulse-prompt) posts an anonymous {source:'spine',vote}
 * to /api/feedback when that endpoint is available; degrades to localStorage tally.
 *
 * No external deps. Idempotent. Safe to evaluate on pages without the spine
 * (early-return if [data-vs-spine] is absent).
 */
(function(){
  'use strict';
  if (typeof document === 'undefined') return;
  var root = document.querySelector('[data-vs-spine]');
  if (!root) return;

  var pulseEl    = root.querySelector('[data-spine-pulse]');
  var activeEl   = root.querySelector('[data-spine-active]');
  var pulsesEl   = root.querySelector('[data-spine-pulses]');
  var oracleEl   = root.querySelector('[data-spine-oracle]');
  var feedbackEl = root.querySelector('[data-spine-feedback]');

  function safeText(el, txt){ if (el && typeof txt === 'string' && txt.length) el.textContent = txt; }
  function safeFetch(url){
    return fetch(url, { credentials: 'omit', cache: 'default' })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(new Error(r.status)); });
  }

  // Card 1 + 3: public intelligence
  safeFetch('/api/public-intelligence.json').then(function(pi){
    if (pi && pi.pulse && Array.isArray(pi.pulse.now) && pi.pulse.now[0]) {
      safeText(pulseEl, pi.pulse.now[0]);
    } else if (pi && pi.ecosystem && pi.ecosystem.listingMetadata && pi.ecosystem.listingMetadata.tagline) {
      safeText(pulseEl, pi.ecosystem.listingMetadata.tagline);
    }
    if (pi && pi.ecosystem && pi.ecosystem.listingMetadata) {
      var meta = pi.ecosystem.listingMetadata;
      // Prefer concise summary; fall back to canonicalSummary truncated.
      var line = meta.tagline || meta.canonicalSummary || '';
      if (line.length > 180) line = line.slice(0, 177).replace(/\s+\S*$/, '') + '…';
      safeText(oracleEl, line || 'The Oracle is still synthesising today\'s read.');
    }
  }).catch(function(){
    safeText(pulseEl,  'Latest dispatch is loading — open the Signal Log for the full feed.');
    safeText(oracleEl, 'Open the Oracle for the full ecosystem forecast.');
  });

  // Card 2: heartbeat aggregate
  safeFetch('/api/heartbeat.json').then(function(hb){
    if (!hb || !Array.isArray(hb.projects)) return;
    var active = 0, pulses7d = 0;
    for (var i = 0; i < hb.projects.length; i++) {
      var p = hb.projects[i];
      if (p && p.tier === 'sparked') active++;
      if (p && typeof p.pulses7d === 'number') pulses7d += p.pulses7d;
    }
    if (activeEl) activeEl.textContent = String(active);
    if (pulsesEl) pulsesEl.textContent = String(pulses7d);
  }).catch(function(){
    if (activeEl) activeEl.textContent = '—';
    if (pulsesEl) pulsesEl.textContent = '—';
  });

  // Micro-feedback
  if (feedbackEl) {
    feedbackEl.addEventListener('click', function(ev){
      var btn = ev.target.closest('[data-spine-feedback-vote]');
      if (!btn) return;
      var vote = btn.getAttribute('data-spine-feedback-vote');
      var promptEl = feedbackEl.querySelector('[data-spine-feedback-prompt]');
      // Optimistic UI swap
      Array.prototype.forEach.call(feedbackEl.querySelectorAll('button'), function(b){ b.remove(); });
      if (promptEl) promptEl.textContent = vote === 'yes' ? 'Thanks — that closes the loop.' : 'Noted — Oracle is one click away.';
      // Anonymous beacon — degrades gracefully if endpoint absent
      try {
        var payload = JSON.stringify({ source: 'spine', vote: vote, ts: Date.now() });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/feedback', new Blob([payload], { type: 'application/json' }));
        } else {
          fetch('/api/feedback', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function(){});
        }
      } catch (e) { /* swallow */ }
      try {
        var key = 'vs_spine_feedback_v1';
        var prior = JSON.parse(localStorage.getItem(key) || '{}');
        prior[vote] = (prior[vote] || 0) + 1;
        localStorage.setItem(key, JSON.stringify(prior));
      } catch (e) { /* swallow */ }
      if (window.gtag) {
        try { window.gtag('event', 'spine_feedback', { vote: vote }); } catch (e) { /* swallow */ }
      }
    });
  }
})();
