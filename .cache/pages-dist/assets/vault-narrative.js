/**
 * vault-narrative — render the daily AI dispatch above the proof rail.
 *
 * Reads /api/vault-narrative.json (refreshed daily by the cron in
 * .github/workflows/vault-narrative.yml). Renders into #vault-narrative-slot
 * with a soft fade-in. Self-hides if the JSON is missing or stale (>72h old).
 *
 * No spend on the client side — the dispatch is pre-generated.
 */
(function () {
  'use strict';

  var URL = '/api/vault-narrative.json';
  var SLOT_ID = 'vault-narrative-slot';
  var STALE_HOURS = 72;

  var STYLE = [
    '.vs-narrative{display:block;padding:1.4rem 1.5rem;margin:1.2rem 0 1.6rem;background:linear-gradient(135deg,rgba(212,175,55,0.05),rgba(126,201,255,0.03));border:1px solid rgba(212,175,55,0.2);border-radius:14px;font-family:Georgia,serif;line-height:1.55;color:var(--text);position:relative;}',
    '.vs-narrative:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--gold,#d4af37),transparent);border-radius:14px 0 0 14px;}',
    '.vs-narrative__eyebrow{font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold,#d4af37);margin-bottom:0.45rem;display:flex;align-items:center;gap:0.45rem;}',
    '.vs-narrative__eyebrow:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--gold,#d4af37);box-shadow:0 0 10px var(--gold,#d4af37);}',
    '.vs-narrative__body{font-size:1.02rem;color:var(--text);}',
    '.vs-narrative__meta{margin-top:0.5rem;font-size:0.72rem;color:var(--text-muted,#889);font-style:italic;}',
    'body.light-mode .vs-narrative{background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(126,201,255,0.04));}',
    '@media (max-width: 600px){.vs-narrative{padding:1.1rem 1.2rem;}.vs-narrative__body{font-size:0.95rem;}}',
  ].join('\n');

  function injectStyle() {
    if (document.getElementById('vs-narrative-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-narrative-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function escape(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var t = Date.parse(iso);
    if (!t) return '';
    var hours = Math.floor((Date.now() - t) / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  }

  async function load() {
    var slot = document.getElementById(SLOT_ID);
    if (!slot) return;
    try {
      var res = await fetch(URL, { cache: 'default' });
      if (!res.ok) return;
      var data = await res.json();
      if (!data || !data.dispatch) return;
      var ageHours = data.generatedAt ? (Date.now() - Date.parse(data.generatedAt)) / 3600000 : 999;
      if (ageHours > STALE_HOURS) return;

      injectStyle();
      slot.innerHTML = [
        '<div class="vs-narrative" role="region" aria-label="Studio dispatch">',
          '<div class="vs-narrative__eyebrow">Studio dispatch</div>',
          '<div class="vs-narrative__body">', escape(data.dispatch), '</div>',
          '<div class="vs-narrative__meta">Refreshed ', escape(timeAgo(data.generatedAt)), '</div>',
        '</div>',
      ].join('');
    } catch (err) {
      // Soft-fail.
    }
  }

  if (document.readyState !== 'loading') load();
  else document.addEventListener('DOMContentLoaded', load);
})();
