/* constellation-tracker.js — S205 #15
 *
 * Constellation Challenges: hidden page-sequence badges that reward
 * visitors who follow curated discovery journeys across the vault.
 * 5 constellations drawn from data/constellations.json; each is a
 * 3-page sequence. Completion is tracked in localStorage, unlock toast
 * shown once per constellation, RUM event emitted (cost-neutral).
 *
 * Data lives in data/constellations.json (not bundled) so new constellations
 * can ship without a code deploy. Each constellation: id, name, badge, flavor, pages[].
 *
 * Trusted-Types-safe: DOM built node-by-node; no innerHTML with user data.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'vs_cst_visited';   // visited page list (last 50)
  var UNLOCKED_KEY = 'vs_cst_unlocked'; // set of unlocked constellation ids

  function normPath(p) {
    // Normalise to /path/ form so /studio and /studio/ both match.
    return ('/' + p.replace(/^\/+|\/+$/g, '') + '/').replace(/\/\//g, '/');
  }

  function currentPath() { return normPath(location.pathname); }

  function readUnlocked() {
    try { return JSON.parse(localStorage.getItem(UNLOCKED_KEY) || '[]'); } catch (_) { return []; }
  }

  function saveUnlocked(arr) {
    try { localStorage.setItem(UNLOCKED_KEY, JSON.stringify(arr)); } catch (_) {}
  }

  function readVisited() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) { return []; }
  }

  function recordVisit(path) {
    var list = readVisited();
    // Deduplicate consecutive identical pages; cap at 50.
    if (list[list.length - 1] !== path) list.push(path);
    if (list.length > 50) list = list.slice(-50);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
    return list;
  }

  function checkConstellations(constellations, visited, unlocked) {
    var newlyUnlocked = [];
    constellations.forEach(function (c) {
      if (unlocked.indexOf(c.id) !== -1) return; // already earned
      var required = c.pages.map(normPath);
      // Sequence must appear in order (not necessarily consecutive).
      var idx = 0;
      for (var i = 0; i < visited.length && idx < required.length; i++) {
        if (visited[i] === required[idx]) idx++;
      }
      if (idx === required.length) newlyUnlocked.push(c);
    });
    return newlyUnlocked;
  }

  function ensureToastStyles() {
    if (document.getElementById('vs-cst-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-cst-style';
    s.textContent =
      '.vs-cst-toast{position:fixed;bottom:1.4rem;right:1.4rem;z-index:9999;' +
      'max-width:320px;padding:1rem 1.2rem;border-radius:18px;' +
      'background:rgba(10,12,24,0.97);border:1px solid rgba(255,196,0,.4);' +
      'box-shadow:0 8px 40px rgba(0,0,0,.7);' +
      'animation:vs-cst-slide-in .38s cubic-bezier(.22,.68,0,1.2) both}' +
      '.vs-cst-toast__badge{font-size:2rem;line-height:1;display:block;margin-bottom:.4rem}' +
      '.vs-cst-toast__label{font-size:.65rem;font-weight:900;letter-spacing:.13em;' +
      'text-transform:uppercase;color:rgba(255,196,0,.7);display:block;margin-bottom:.1rem}' +
      '.vs-cst-toast__name{font-size:1.05rem;font-weight:800;color:#ffc400;display:block;' +
      'font-family:Georgia,serif;margin-bottom:.35rem}' +
      '.vs-cst-toast__flavor{font-size:.78rem;color:#a8b4d0;line-height:1.55}' +
      '@keyframes vs-cst-slide-in{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:none}}' +
      '@media(prefers-reduced-motion:reduce){.vs-cst-toast{animation:none}}';
    document.head.appendChild(s);
  }

  function showToast(constellation) {
    ensureToastStyles();
    var toast = document.createElement('div');
    toast.className = 'vs-cst-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-label', 'Constellation unlocked: ' + constellation.name);

    var badge = document.createElement('span');
    badge.className = 'vs-cst-toast__badge';
    badge.textContent = constellation.badge;
    toast.appendChild(badge);

    var label = document.createElement('span');
    label.className = 'vs-cst-toast__label';
    label.textContent = 'Constellation Unlocked';
    toast.appendChild(label);

    var name = document.createElement('span');
    name.className = 'vs-cst-toast__name';
    name.textContent = constellation.name;
    toast.appendChild(name);

    var flavor = document.createElement('span');
    flavor.className = 'vs-cst-toast__flavor';
    flavor.textContent = constellation.flavor;
    toast.appendChild(flavor);

    document.body.appendChild(toast);

    // Auto-dismiss after 6s.
    setTimeout(function () {
      toast.style.transition = 'opacity .3s';
      toast.style.opacity = '0';
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
    }, 6000);
  }

  function emitRum(id) {
    try {
      navigator.sendBeacon('/v/rum', JSON.stringify({
        ux: 'constellation:unlock:' + id.slice(0, 24),
        route: currentPath(),
        ts: Date.now(),
      }));
    } catch (_) {}
  }

  function boot() {
    var path = currentPath();
    var visited = recordVisit(path);
    var unlocked = readUnlocked();

    fetch('/data/constellations.json', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (constellations) {
        if (!Array.isArray(constellations)) return;
        var newOnes = checkConstellations(constellations, visited, unlocked);
        if (!newOnes.length) return;
        var ids = unlocked.concat(newOnes.map(function (c) { return c.id; }));
        saveUnlocked(ids);
        newOnes.forEach(function (c, i) {
          // Stagger multiple unlocks (rare but possible on first load).
          setTimeout(function () { showToast(c); emitRum(c.id); }, i * 700);
        });
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
