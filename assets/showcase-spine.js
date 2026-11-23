/* showcase-spine.js — S147 showcase-spine
 *
 * Hydrates the homepage studio snapshot from public feeds.
 * Portfolio counts come only from public-intelligence.json.
 * A public pulse is shown only when pulse.now includes an entry.
 * status-proof.json supplies recorded proof freshness and its recording time;
 * it never overwrites the portfolio counts or claims a current trust score.
 * The overview card points readers to the public studio overview.
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
  var proofEl    = root.querySelector('[data-spine-proof]');
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
    } else {
      safeText(pulseEl, 'No recent public dispatch is recorded here. Read the Signal Log.');
    }
    if (pi && pi.portfolio) {
      if (activeEl && typeof pi.portfolio.sparked === 'number') activeEl.textContent = String(pi.portfolio.sparked);
      if (pulsesEl && typeof pi.portfolio.forge === 'number') pulsesEl.textContent = String(pi.portfolio.forge);
    }
    safeText(oracleEl, 'Read the public studio overview and recorded status.');
  }).catch(function(){
    safeText(pulseEl,  'Latest dispatch is available in the Signal Log when the feed is unreachable.');
    safeText(oracleEl, 'Read the public studio overview and recorded status.');
  });
  safeFetch('/api/status-proof.json').then(function(proof){
    if (proofEl && proof && proof.summary) {
      var fresh = typeof proof.summary.fresh === 'number' ? proof.summary.fresh : null;
      var feeds = typeof proof.summary.feeds === 'number' ? proof.summary.feeds : null;
      var recordedAt = typeof proof.generatedAt === 'string' && Number.isFinite(Date.parse(proof.generatedAt)) ? new Date(proof.generatedAt).toISOString() : null;
      var oldest = proof.summary.worstStale || null;
      var seedRisk = Array.isArray(proof.summary.seedRisk) ? proof.summary.seedRisk : [];
      var parts = [];
      if (fresh !== null && feeds !== null) parts.push(fresh + '/' + feeds + ' proofs recorded fresh');
      parts.push(recordedAt ? 'recorded ' + recordedAt : 'recording timestamp unavailable');
      if (oldest && oldest.key && typeof oldest.ageSeconds === 'number') {
        var ageHours = Math.max(0, Math.round(oldest.ageSeconds / 3600));
        parts.push('oldest ' + oldest.key + ' ' + ageHours + 'h at recording');
      }
      if (seedRisk.length) {
        parts.push(seedRisk.length + ' seed-risk');
      } else {
        parts.push('no seed-risk');
      }
      proofEl.textContent = 'Proof snapshot: ' + parts.join(' · ');
    }
  }).catch(function(){
    safeText(proofEl, 'Proof: status manifest unavailable');
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
