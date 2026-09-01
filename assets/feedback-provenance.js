/**
 * feedback-provenance.js (S163 audit #3 · feedback-ship-provenance)
 *
 * Renders the "shipped in the areas you flagged" strip in /changelog/#requests from
 * api/feedback-provenance.json (built by scripts/build-feedback-provenance.mjs).
 * Joins the Forge ledger to feedback themes so the loop is evidence-backed, not
 * just hand-curated. Silent if the data is absent or empty — no empty-state noise.
 *
 * Public-safe: the JSON it reads is built from public commit subjects only.
 */
(function () {
  'use strict';
  var mount = document.getElementById('fbProvenance');
  if (!mount) return;

  var TONE = {
    sparked: '#ffc400', fix: '#5ad1a0', perf: '#5ab0ff',
    forge: '#a8b4d0', muted: '#6272a0'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function shortWhen(ts) {
    if (!ts) return '';
    try {
      var d = new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) { return ''; }
  }

  function render(data) {
    var themes = (data && data.themes) || [];
    if (!themes.length) return; // stay silent

    var cards = themes.map(function (t) {
      var moves = t.commits.map(function (c) {
        var accent = TONE[c.tone] || TONE.forge;
        var when = shortWhen(c.ts);
        return '<li style="display:flex;gap:.6rem;align-items:baseline;padding:.3rem 0;">' +
          '<span style="flex:0 0 auto;font-size:.66rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:' + accent + ';min-width:64px;">' + esc(c.move) + '</span>' +
          '<span style="flex:1;color:var(--text,#eef2ff);font-size:.9rem;line-height:1.4;">' + esc(c.summary) +
          (when ? ' <span style="color:var(--dim,#6272a0);font-size:.78rem;">· ' + esc(when) + '</span>' : '') +
          '</span></li>';
      }).join('');
      return '<div style="border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.02);padding:1rem 1.1rem;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem;">' +
          '<span style="font-size:.74rem;letter-spacing:.07em;text-transform:uppercase;color:var(--muted,#a8b4d0);font-weight:700;">' + esc(t.label) + '</span>' +
          '<span style="font-size:.74rem;color:var(--dim,#6272a0);">' + t.count + ' move' + (t.count === 1 ? '' : 's') + '</span>' +
        '</div>' +
        '<ul style="list-style:none;margin:0;padding:0;">' + moves + '</ul>' +
      '</div>';
    }).join('');

    var sampled = data && data.decisionSampler && data.decisionSampler.qualifiedThemes || [];
    var samplerLine = sampled.length
      ? '<p style="color:var(--muted,#a8b4d0);margin:1rem 0 0;font-size:.84rem;">Decision-moment signals above the privacy threshold: ' + sampled.map(function (item) { return esc(item.choice) + ' (' + item.count + ')'; }).join(' · ') + '.</p>'
      : '';
    mount.innerHTML =
      '<div class="container">' +
        '<h2 style="font-size:clamp(1.5rem,3vw,2.1rem);margin-bottom:.4rem;">Shipped in the areas you flagged</h2>' +
        '<p style="color:var(--muted,#a8b4d0);max-width:62ch;margin:0 0 1.4rem;font-size:.98rem;">' +
          'Your feedback maps to parts of the studio. Here are the recent forge moves in each — pulled straight from the build history, not a marketing list. It’s what shipped where you spoke, not a per-request promise.' +
        '</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;">' + cards + '</div>' + samplerLine +
      '</div>';
    mount.style.display = '';
  }

  fetch('/api/feedback-provenance.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) { if (data) render(data); })
    .catch(function () { /* silent — surface is additive */ });
})();
