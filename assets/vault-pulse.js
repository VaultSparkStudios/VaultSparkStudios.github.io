/**
 * VaultSpark — Live Vault Pulse (v2).
 *
 * Rotating ticker of REAL recent vault-member activity. Events are pulled from
 * Supabase (vault_members, challenge_submissions, game_sessions) with true
 * timestamps (timeAgo uses the actual DB created_at). No fabricated events,
 * no synthetic time. If the event pool is empty, the block hides itself.
 *
 * Anonymization: usernames are never rendered. All events are public-safe.
 * Refresh: pool re-fetches every 2 minutes; rotation ticks every 6-10s.
 * Mount point: [data-vault-pulse].
 */
(function () {
  'use strict';

  var ROTATE_MIN = 6000;
  var ROTATE_MAX = 10000;
  var REFRESH_INTERVAL = 120000;   // 2 min
  var MAX_VISIBLE = 6;
  var POOL_LIMIT = 30;

  var GAME_NAMES = {
    'call-of-doodie': 'Call of Doodie',
    'gridiron-gm': 'Gridiron GM',
    'franchise-architect': 'Franchise Architect',
    'vaultfront': 'VaultFront',
    'solara': 'Solara',
    'mindframe': 'MindFrame',
    'the-exodus': 'The Exodus'
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function timeAgo(iso) {
    var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 45)     return 'just now';
    if (diff < 3600)   return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400)  return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return Math.floor(diff / 604800) + 'w ago';
  }

  function injectStyle() {
    if (document.getElementById('vs-pulse-style')) return;
    var sty = document.createElement('style');
    sty.id = 'vs-pulse-style';
    sty.textContent = [
      '.vp-ticker{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.45rem;}',
      '.vp-row{display:flex;align-items:center;gap:0.65rem;padding:0.55rem 0.85rem;',
      '  border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);',
      '  font-size:0.86rem;animation:vp-slide-in 0.4s ease;}',
      '.vp-row.vp-row--new{background:rgba(255,196,0,0.05);border-color:rgba(255,196,0,0.12);}',
      '.vp-icon{flex-shrink:0;font-size:1rem;line-height:1;}',
      '.vp-text{flex:1;color:var(--text);line-height:1.35;}',
      '.vp-when{font-size:0.72rem;color:var(--dim);white-space:nowrap;flex-shrink:0;}',
      '.vp-foot{font-size:0.72rem;color:var(--dim);margin-top:0.75rem;line-height:1.5;}',
      '.vp-foot a{color:var(--gold);}',
      '@keyframes vp-slide-in{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:none;}}',
      '@media(prefers-reduced-motion:reduce){.vp-row{animation:none;}}'
    ].join('\n');
    document.head.appendChild(sty);
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function buildEventRow(ev) {
    var li = document.createElement('li');
    li.className = 'vp-row vp-row--new';

    var icon = document.createElement('span');
    icon.className = 'vp-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = ev.icon;

    var text = document.createElement('span');
    text.className = 'vp-text';
    if (ev.textPrefix) text.appendChild(document.createTextNode(ev.textPrefix));
    if (ev.strongText) {
      var strong = document.createElement('strong');
      strong.style.color = 'var(--text)';
      strong.textContent = ev.strongText;
      text.appendChild(strong);
    }
    if (ev.textSuffix) text.appendChild(document.createTextNode(ev.textSuffix));
    if (!ev.textPrefix && !ev.strongText && !ev.textSuffix) text.textContent = ev.text || '';

    var when = document.createElement('span');
    when.className = 'vp-when';
    when.textContent = timeAgo(ev.ts);

    li.appendChild(icon);
    li.appendChild(text);
    li.appendChild(when);
    return li;
  }

  function fetchRealEvents() {
    if (!window.VSPublic) return Promise.resolve([]);
    return Promise.allSettled([
      window.VSPublic.from('public_leaderboard').select('created_at').order('created_at', false).limit(POOL_LIMIT).get(),
      window.VSPublic.from('challenge_submissions').select('created_at').order('created_at', false).limit(POOL_LIMIT).get(),
      window.VSPublic.from('game_sessions').select('game_slug,played_at').order('played_at', false).limit(POOL_LIMIT).get()
    ]).then(function (results) {
      var events = [];

      ((results[0].value && results[0].value.data) || []).forEach(function (r) {
        events.push({ icon: '⚡', strongText: 'A new member', textSuffix: ' joined the vault', ts: r.created_at });
      });
      ((results[1].value && results[1].value.data) || []).forEach(function (r) {
        events.push({ icon: '🔥', strongText: 'A challenge', textSuffix: ' was completed', ts: r.created_at });
      });
      ((results[2].value && results[2].value.data) || []).forEach(function (r) {
        var name = GAME_NAMES[r.game_slug] || r.game_slug || 'a VaultSpark title';
        events.push({ icon: '🛡', textPrefix: 'Someone played ', strongText: name, ts: r.played_at });
      });

      // Sort newest first by actual timestamp
      events.sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
      return events;
    }).catch(function () { return []; });
  }

  function mount(root) {
    injectStyle();

    var ul = document.createElement('ul');
    ul.className = 'vp-ticker';
    ul.setAttribute('role', 'log');
    ul.setAttribute('aria-live', 'polite');
    ul.setAttribute('aria-label', 'Recent vault activity');
    root.appendChild(ul);

    var foot = document.createElement('p');
    foot.className = 'vp-foot';
    foot.appendChild(document.createTextNode('Recent member activity — anonymized, pulled live from the vault. '));
    var footLink = document.createElement('a');
    footLink.href = '/community/#wall';
    footLink.textContent = 'View Vault Wall →';
    foot.appendChild(footLink);
    root.appendChild(foot);

    var pool = [];        // all available real events
    var cursor = 0;       // rotation cursor through the pool (oldest-to-newest)
    var timer = null;

    function refreshPool() {
      return fetchRealEvents().then(function (events) {
        if (!events.length) {
          // Nothing real to show — hide the whole block.
          var section = root.closest('section');
          if (section) section.style.display = 'none';
          return false;
        }
        pool = events;
        return true;
      });
    }

    function renderInitial() {
      // Seed ticker with the N most recent real events, newest on top.
      var initial = pool.slice(0, MAX_VISIBLE);
      initial.reverse().forEach(function (ev, idx) {
        setTimeout(function () {
          var li = buildEventRow(ev);
          ul.insertBefore(li, ul.firstChild);
          setTimeout(function () { li.classList.remove('vp-row--new'); }, 3000);
          while (ul.children.length > MAX_VISIBLE) ul.removeChild(ul.lastChild);
        }, idx * 400);
      });
      cursor = initial.length;
    }

    function rotateNext() {
      if (!pool.length) return;
      // Cycle through the real event pool. When we reach the end, wrap — but
      // refresh the pool every REFRESH_INTERVAL so we pick up new rows.
      if (cursor >= pool.length) cursor = 0;
      var ev = pool[cursor++];
      var li = buildEventRow(ev);
      ul.insertBefore(li, ul.firstChild);
      setTimeout(function () { li.classList.remove('vp-row--new'); }, 3000);
      while (ul.children.length > MAX_VISIBLE) ul.removeChild(ul.lastChild);
    }

    function schedule() {
      timer = setTimeout(function () {
        rotateNext();
        schedule();
      }, rand(ROTATE_MIN, ROTATE_MAX));
    }

    refreshPool().then(function (ok) {
      if (!ok) return;
      renderInitial();
      schedule();
      setInterval(refreshPool, REFRESH_INTERVAL);
    });
  }

  function init() {
    var roots = document.querySelectorAll('[data-vault-pulse]');
    if (!roots.length) return;
    roots.forEach(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
