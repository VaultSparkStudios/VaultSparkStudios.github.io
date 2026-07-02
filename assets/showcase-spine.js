/* showcase-spine.js — S147 showcase-spine
 *
 * Hydrates the homepage Studio Spine section from existing public feeds.
 * Three live cards in one strip, one CTA into the full Oracle.
 *
 *   - Latest Pulse  → /api/public-intelligence.json → .pulse.now[0]
 *                     (falls back to ecosystem.listingMetadata.tagline)
 *   - Studio Signal → /api/status-proof.json → public-status proof payload
 *                     (falls back to /api/public-intelligence.json portfolio counts)
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
    } else if (pi && pi.ecosystem && pi.ecosystem.listingMetadata && pi.ecosystem.listingMetadata.tagline) {
      safeText(pulseEl, pi.ecosystem.listingMetadata.tagline);
    }
    if (pi && pi.portfolio) {
      if (activeEl && typeof pi.portfolio.sparked === 'number') activeEl.textContent = String(pi.portfolio.sparked);
      if (pulsesEl && typeof pi.portfolio.forge === 'number') pulsesEl.textContent = String(pi.portfolio.forge);
    }
    if (pi && pi.ecosystem && pi.ecosystem.listingMetadata) {
      var meta = pi.ecosystem.listingMetadata;
      // Prefer concise summary; fall back to canonicalSummary truncated.
      var line = meta.tagline || meta.canonicalSummary || '';
      if (line.length > 180) line = line.slice(0, 177).replace(/\s+\S*$/, '') + '…';
      safeText(oracleEl, line || 'The Oracle is still synthesising today\'s read.');
    }
  }).catch(function(){
    safeText(pulseEl,  'Latest dispatch is available in the Signal Log when the feed is unreachable.');
    safeText(oracleEl, 'Open the Oracle for the full ecosystem forecast.');
  });
  safeFetch('/api/status-proof.json').then(function(proof){
    var publicStatus = proof && proof.proofs && proof.proofs['public-status'] && proof.proofs['public-status'].data;
    var studio = publicStatus && publicStatus.studio;
    if (studio) {
      if (activeEl && typeof studio.sparked === 'number') activeEl.textContent = String(studio.sparked);
      if (pulsesEl && typeof studio.forge === 'number') pulsesEl.textContent = String(studio.forge);
    }
    if (proofEl && proof.summary) {
      var fresh = typeof proof.summary.fresh === 'number' ? proof.summary.fresh : null;
      var feeds = typeof proof.summary.feeds === 'number' ? proof.summary.feeds : null;
      var trust = typeof proof.summary.trustScore === 'number' ? proof.summary.trustScore : null;
      var oldest = proof.summary.worstStale || null;
      var seedRisk = Array.isArray(proof.summary.seedRisk) ? proof.summary.seedRisk : [];
      var parts = [];
      if (fresh !== null && feeds !== null) parts.push(fresh + '/' + feeds + ' proofs fresh');
      if (trust !== null) parts.push('trust ' + trust + '%');
      if (oldest && oldest.key && typeof oldest.ageSeconds === 'number') {
        var ageHours = Math.max(0, Math.round(oldest.ageSeconds / 3600));
        parts.push('oldest ' + oldest.key + ' ' + ageHours + 'h');
      }
      if (seedRisk.length) {
        parts.push(seedRisk.length + ' seed-risk');
      } else {
        parts.push('no seed-risk');
      }
      proofEl.textContent = parts.length ? ('Proof: ' + parts.join(' · ')) : 'Proof: status manifest live';
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
