// returning-visitor-digest.js (S178 · returning-visitor-digest)
//
// The studio's whole posture is momentum, yet a returning visitor gets the same
// cold homepage as a first-timer — no evidence anything moved since they were
// last here. This renders a small, dismissible "since your last visit, N things
// shipped" strip seeded from the public Forge Ledger (api/commit-map.json) and a
// localStorage last-visit timestamp. Cost-neutral (localStorage + already-static
// JSON; no per-user studio cost), public-safe (the ledger is already public),
// and honest (only shows when ≥2 real ships landed since the prior visit).
//
// DOM API only — Trusted Types soak is active sitewide.
(function () {
  'use strict';
  var LAST_VISIT = 'vs_last_visit_ts';
  var VISIT_COUNT = 'vs_visit_count';
  var SESSION_MARK = 'vs_rv_digest_session';
  var MIN_SHIPS = 2;

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (_) {} }
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (_) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (_) {} }

  // Once per browser session — reloads within a session don't reset the baseline.
  if (ssGet(SESSION_MARK)) return;
  ssSet(SESSION_MARK, '1');

  var prevTs = lsGet(LAST_VISIT);
  var visitCount = parseInt(lsGet(VISIT_COUNT) || '0', 10);
  var now = Date.now();

  // First-ever eligible visit: set the baseline and show nothing — there's no
  // "since last time" to honor yet.
  if (!prevTs) { lsSet(LAST_VISIT, String(now)); lsSet(VISIT_COUNT, '1'); return; }
  var prev = parseInt(prevTs, 10);
  // Advance the baseline to this visit regardless of whether we render.
  lsSet(LAST_VISIT, String(now));
  lsSet(VISIT_COUNT, String(visitCount + 1));

  if (!(visitCount > 1) || !prev) return;

  fetch('/api/commit-map.json', { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !Array.isArray(d.entries)) return;
      var since = d.entries.filter(function (e) {
        var t = e && e.ts ? Date.parse(e.ts) : NaN;
        return isFinite(t) && t > prev;
      });
      if (since.length < MIN_SHIPS) return;
      render(since.length, since[0]);
    })
    .catch(function () {});

  function render(count, latest) {
    // The homepage already has a quiet inline returning-signal strip. Do not
    // duplicate it with a floating notification there.
    if ((location.pathname || '/') === '/') return;
    if (window.VSAttention && window.VSAttention.claim && !window.VSAttention.claim('returning-digest')) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:18px', 'transform:translateX(-50%)',
      'z-index:60', 'max-width:min(92vw,520px)', 'display:flex', 'align-items:center', 'gap:.7rem',
      'padding:.6rem .9rem', 'border-radius:12px',
      'background:rgba(18,18,22,0.92)', 'border:1px solid rgba(255,255,255,0.10)',
      'box-shadow:0 8px 30px rgba(0,0,0,0.35)', 'backdrop-filter:blur(8px)',
      'font:500 .86rem/1.35 system-ui,-apple-system,Segoe UI,sans-serif', 'color:#f4f4f6',
      reduce ? '' : 'opacity:0', reduce ? '' : 'transition:opacity .32s ease'
    ].filter(Boolean).join(';');

    var dot = document.createElement('span');
    dot.style.cssText = 'flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:#3ecf8e;box-shadow:0 0 8px #3ecf8e;';
    bar.appendChild(dot);

    var msg = document.createElement('span');
    msg.style.cssText = 'flex:1 1 auto;';
    msg.appendChild(document.createTextNode('Since your last visit: '));
    var strong = document.createElement('strong');
    strong.textContent = count + ' thing' + (count === 1 ? '' : 's') + ' shipped';
    msg.appendChild(strong);
    bar.appendChild(msg);

    var link = document.createElement('a');
    link.href = '/studio-pulse/';
    link.textContent = 'See what';
    link.style.cssText = 'flex:0 0 auto;color:#9b8cff;text-decoration:none;font-weight:600;white-space:nowrap;';
    bar.appendChild(link);

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.style.cssText = 'flex:0 0 auto;background:none;border:none;color:#9aa;font-size:1.15rem;line-height:1;cursor:pointer;padding:0 .15rem;';
    close.addEventListener('click', function () { remove(); });
    bar.appendChild(close);

    function remove() {
      if (reduce) { if (bar.parentNode) bar.parentNode.removeChild(bar); return; }
      bar.style.opacity = '0';
      setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 320);
    }

    (document.body || document.documentElement).appendChild(bar);
    if (!reduce) requestAnimationFrame(function () { bar.style.opacity = '1'; });
    // Auto-retire after 12s so it never lingers as clutter.
    setTimeout(remove, 12000);
  }

})();
