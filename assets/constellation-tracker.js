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
  var PROGRESS_KEY = 'vs_cst_progress'; // S207: { id: maxStepReached } high-water marks
  var COMPASS_DISMISSED_KEY = 'vs_cst_compass_dismissed';

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

  function nearestIncomplete(constellations, visited, unlocked, current) {
    if (visited.length < 2) return null;
    var candidates = constellations.filter(function (c) { return unlocked.indexOf(c.id) === -1; }).map(function (c) {
      var reach = sequenceReach(c, visited);
      var pages = c.pages.map(normPath);
      var next = pages[reach] || null;
      var currentAffinity = pages.indexOf(current) >= 0 ? 1 : 0;
      return { constellation: c, reach: reach, next: next, score: reach * 10 + currentAffinity };
    }).filter(function (candidate) { return candidate.reach > 0 && candidate.next && candidate.next !== current; });
    candidates.sort(function (a, b) { return b.score - a.score || a.constellation.id.localeCompare(b.constellation.id); });
    return candidates[0] || null;
  }

  function sendCompass(outcome) {
    try { navigator.sendBeacon('/v/rum', JSON.stringify({ ux: 'constellation:compass:' + outcome, route: currentPath(), ts: Date.now() })); } catch (_) {}
  }

  function showCompass(candidate) {
    var dismissed = [];
    try { dismissed = JSON.parse(localStorage.getItem(COMPASS_DISMISSED_KEY) || '[]'); } catch (_) {}
    if (dismissed.indexOf(candidate.constellation.id) >= 0 || document.querySelector('[data-constellation-compass]')) return;
    ensureToastStyles();
    var style = document.getElementById('vs-cst-style');
    style.textContent +=
      '.vs-cst-compass{position:fixed;left:1rem;bottom:1rem;z-index:9998;width:min(340px,calc(100vw - 2rem));padding:1rem;border:1px solid rgba(255,196,0,.34);border-radius:18px;background:rgba(10,12,24,.96);box-shadow:0 14px 48px rgba(0,0,0,.48);color:#f8fafc}' +
      '.vs-cst-compass__top{display:flex;gap:.7rem;align-items:start}.vs-cst-compass__badge{font-size:1.45rem}.vs-cst-compass__label{display:block;color:#ffc400;font-size:.64rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}' +
      '.vs-cst-compass h2{font:800 1rem/1.3 Georgia,serif;margin:.22rem 2rem .35rem 0}.vs-cst-compass p{font:400 .78rem/1.55 system-ui;color:#a8b4d0;margin:.25rem 0 .8rem}.vs-cst-compass a{display:inline-flex;min-height:44px;align-items:center;padding:.55rem .85rem;border-radius:999px;background:#ffc400;color:#171103;font:800 .78rem/1 system-ui;text-decoration:none}' +
      '.vs-cst-compass button{position:absolute;right:.55rem;top:.5rem;min-width:44px;min-height:44px;border:0;background:transparent;color:#a8b4d0;font-size:1.2rem;cursor:pointer}@media(max-width:430px){.vs-cst-compass{left:.75rem;bottom:.75rem;width:calc(100vw - 1.5rem)}}';
    var root = document.createElement('aside'); root.className = 'vs-cst-compass'; root.dataset.constellationCompass = candidate.constellation.id; root.setAttribute('aria-label', 'Resume constellation: ' + candidate.constellation.name);
    var close = document.createElement('button'); close.type = 'button'; close.setAttribute('aria-label', 'Dismiss resume compass'); close.textContent = '×';
    var top = document.createElement('div'); top.className = 'vs-cst-compass__top';
    var badge = document.createElement('span'); badge.className = 'vs-cst-compass__badge'; badge.textContent = candidate.constellation.badge;
    var body = document.createElement('div'); var label = document.createElement('span'); label.className = 'vs-cst-compass__label'; label.textContent = candidate.reach + ' of ' + candidate.constellation.pages.length + ' signals found';
    var title = document.createElement('h2'); title.textContent = 'Resume ' + candidate.constellation.name;
    var copy = document.createElement('p'); copy.textContent = 'Next: ' + candidate.next.replace(/^\/|\/$/g, '').replace(/-/g, ' ') + '. ' + candidate.constellation.flavor;
    var link = document.createElement('a'); link.href = candidate.next; link.textContent = 'Follow the next signal';
    link.addEventListener('click', function () { sendCompass('followed'); });
    close.addEventListener('click', function () { dismissed.push(candidate.constellation.id); try { localStorage.setItem(COMPASS_DISMISSED_KEY, JSON.stringify(dismissed)); } catch (_) {} sendCompass('dismissed'); root.remove(); });
    body.append(label, title, copy, link); top.append(badge, body); root.append(close, top); document.body.appendChild(root); sendCompass('shown');
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

  // S207 (constellation-sequence-analytics): emit per-step progress so we can
  // see WHERE visitors drop off in each sequence, not just who completes it.
  // High-water-marked in localStorage so a step fires at most once per visitor.
  function readProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch (_) { return {}; }
  }
  function saveProgress(obj) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(obj)); } catch (_) {}
  }
  function emitProgress(id, step) {
    try {
      // suffix stays within the Worker constellation prefix charset/length budget.
      var suffix = ('progress:' + id + ':' + step).slice(0, 36);
      navigator.sendBeacon('/v/rum', JSON.stringify({
        ux: 'constellation:' + suffix,
        route: currentPath(),
        ts: Date.now(),
      }));
    } catch (_) {}
  }

  // How many sequence steps (in order) the visitor has reached for a constellation.
  function sequenceReach(constellation, visited) {
    var required = constellation.pages.map(normPath);
    var idx = 0;
    for (var i = 0; i < visited.length && idx < required.length; i++) {
      if (visited[i] === required[idx]) idx++;
    }
    return idx;
  }

  function trackProgress(constellations, visited, unlocked) {
    var progress = readProgress();
    var changed = false;
    constellations.forEach(function (c) {
      if (unlocked.indexOf(c.id) !== -1) return; // completed → unlock event covers it
      var reach = sequenceReach(c, visited);
      var prev = progress[c.id] || 0;
      // Emit for each newly-reached intermediate step (1..reach, below completion).
      if (reach > prev && reach > 0 && reach < c.pages.length) {
        for (var step = prev + 1; step <= reach; step++) {
          emitProgress(c.id, step);
        }
        progress[c.id] = reach;
        changed = true;
      }
    });
    if (changed) saveProgress(progress);
  }

  function boot() {
    var path = currentPath();
    var visited = recordVisit(path);
    var unlocked = readUnlocked();

    fetch('/data/constellations.json', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (constellations) {
        if (!Array.isArray(constellations)) return;
        // Emit per-step progress before checking completions (drop-off telemetry).
        trackProgress(constellations, visited, unlocked);
        var newOnes = checkConstellations(constellations, visited, unlocked);
        if (!newOnes.length) {
          var candidate = nearestIncomplete(constellations, visited, unlocked, path);
          if (candidate) showCompass(candidate);
          return;
        }
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
