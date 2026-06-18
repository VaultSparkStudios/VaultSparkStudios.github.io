/* studio-now.js — the "Studio Now" strip (S195 item 3).
 *
 * Every feed on the site is a snapshot frozen at deploy; this is the one surface
 * that reads as ALIVE. It joins three already-published public feeds —
 * founder-presence (is the founder in the forge right now), ship-receipts (what
 * shipped most recently), heartbeat (this week's cadence) — into a single
 * honest line. No new endpoint, no per-user cost (CANON-029).
 *
 * Honest-dark contract: if nothing resolves, the strip removes itself rather
 * than fabricate aliveness. DOM is built node-by-node (no innerHTML) so it is
 * Trusted-Types-safe without a named policy.
 */
(function () {
  'use strict';

  function getJSON(url) {
    return fetch(url, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function ago(ts) {
    var t = Date.parse(ts);
    if (!t) return '';
    var s = (Date.now() - t) / 1000;
    if (s < 90) return 'just now';
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago';
    return Math.round(s / 86400) + 'd ago';
  }

  function ensureStyles() {
    if (document.getElementById('vs-studio-now-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-studio-now-style';
    s.textContent =
      '.vs-studio-now{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;margin:1.1rem auto 0;padding:.6rem .9rem;border:1px solid var(--line,rgba(255,255,255,.08));border-radius:999px;background:rgba(255,255,255,.035);font-size:.82rem;color:var(--muted,#a8b4d0);max-width:max-content}' +
      '.vs-studio-now__dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto;background:#6272a0}' +
      '.vs-studio-now[data-live="true"] .vs-studio-now__dot{background:var(--gold,#ffc400);box-shadow:0 0 0 0 rgba(255,196,0,.55);animation:vs-studio-now-pulse 2.4s ease-out infinite}' +
      '.vs-studio-now__seg{display:inline-flex;align-items:center;gap:.4rem;white-space:nowrap}' +
      '.vs-studio-now__sep{opacity:.4}' +
      '.vs-studio-now__k{color:var(--text,#eef2ff);font-weight:600}' +
      '@keyframes vs-studio-now-pulse{0%{box-shadow:0 0 0 0 rgba(255,196,0,.5)}70%{box-shadow:0 0 0 7px rgba(255,196,0,0)}100%{box-shadow:0 0 0 0 rgba(255,196,0,0)}}' +
      '@media (prefers-reduced-motion: reduce){.vs-studio-now[data-live="true"] .vs-studio-now__dot{animation:none}}';
    document.head.appendChild(s);
  }

  function seg(label, value) {
    var el = document.createElement('span');
    el.className = 'vs-studio-now__seg';
    if (label) {
      var k = document.createElement('span');
      k.className = 'vs-studio-now__k';
      k.textContent = label;
      el.appendChild(k);
    }
    if (value) {
      el.appendChild(document.createTextNode((label ? ' ' : '') + value));
    }
    return el;
  }

  function sep() {
    var s = document.createElement('span');
    s.className = 'vs-studio-now__sep';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = '·';
    return s;
  }

  function mount(root) {
    ensureStyles();
    Promise.all([
      getJSON('/api/founder-presence.json'),
      getJSON('/api/ship-receipts.json'),
      getJSON('/api/heartbeat.json'),
      getJSON('/api/vault-momentum.json'),
    ]).then(function (res) {
      var pres = res[0] || {};
      var receipts = res[1] || {};
      var hb = res[2] || {};
      var momentum = res[3] || {};

      // Most recent shipped commit across all themed receipts.
      var lastCommit = null, lastTs = 0;
      (receipts.receipts || []).forEach(function (rec) {
        (rec.shippedCommits || []).forEach(function (c) {
          var t = Date.parse(c.ts) || 0;
          if (t > lastTs) { lastTs = t; lastCommit = c; }
        });
      });

      // This week's cadence for the website itself.
      var site = (hb.projects || []).filter(function (p) { return p.slug === 'website'; })[0] || null;
      var pulses7d = site && typeof site.pulses7d === 'number' ? site.pulses7d : null;

      var live = !!pres.live;
      // Honest-dark: with no presence, no ship, and no cadence, say nothing.
      if (!live && !lastCommit && pulses7d == null) {
        if (root.parentNode && !root.hasAttribute('data-studio-now-keep')) root.parentNode.removeChild(root);
        return;
      }

      var strip = document.createElement('div');
      strip.className = 'vs-studio-now';
      strip.setAttribute('data-live', live ? 'true' : 'false');
      strip.setAttribute('role', 'status');
      strip.setAttribute('aria-label', 'Current studio activity');

      var dot = document.createElement('span');
      dot.className = 'vs-studio-now__dot';
      strip.appendChild(dot);

      var presText = live
        ? ('In the forge' + (pres.label ? ' · ' + pres.label : (pres.project ? ' · ' + pres.project : '')))
        : 'Studio resting';
      strip.appendChild(seg(null, presText));

      if (lastCommit) {
        strip.appendChild(sep());
        var when = ago(lastCommit.ts);
        strip.appendChild(seg('Last shipped', when ? when : ''));
      }
      if (pulses7d != null) {
        strip.appendChild(sep());
        strip.appendChild(seg(String(pulses7d), pulses7d === 1 ? 'ship this week' : 'ships this week'));
      }

      // S205 #11: vault momentum chip — SOUL-voice label from precomputed score
      if (momentum.label && !momentum.honestDark) {
        strip.appendChild(sep());
        var mSeg = seg('Forge', momentum.label);
        mSeg.setAttribute('title', 'Vault momentum score: ' + (momentum.score || 0) + '/100');
        if (momentum.label === 'SPARKED') mSeg.style.color = 'var(--gold,#ffc400)';
        else if (momentum.label === 'FORGING') mSeg.style.color = 'var(--text,#eef2ff)';
        strip.appendChild(mSeg);
      }

      root.appendChild(strip);
    });
  }

  function boot() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-studio-now]'));
    roots.forEach(mount);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
