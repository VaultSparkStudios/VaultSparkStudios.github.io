// returning-signal-strip.js (S210 #2 · returning-visitor-signal-strip)
//
// "What sparked since your last visit" — a slim, dismissible strip on the
// homepage for visitors with vs_visit_count ≥ 2. Reads api/changelog-narrative.json
// (voice-driven byWeek entries, already public), filters to entries newer than
// vs_last_visit_ts, and renders 1-2 headlines + CTA to /changelog/.
//
// Additive: the existing returning-visitor-digest.js shows a ship COUNT; this
// shows the editorial NARRATIVE — the two coexist without duplication.
// Cost-neutral: static JSON already served, localStorage only.
// DOM API only — Trusted Types compatible.
(function () {
  'use strict';
  var LAST_VISIT = 'vs_last_visit_ts';
  var VISIT_COUNT = 'vs_visit_count';
  var SESSION_MARK = 'vs_signal_strip_session';
  var FEED_URL = '/api/changelog-narrative.json';
  var MAX_SHOWN = 2;

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (_) { return null; } }
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (_) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (_) {} }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function emitUx(e) { try { var b = new XMLHttpRequest(); b.open('POST', '/v/rum', true); b.setRequestHeader('Content-Type', 'application/json'); b.send(JSON.stringify({ n: e, ts: Date.now() })); } catch (_) {} }

  // Only show once per browser session.
  if (ssGet(SESSION_MARK)) return;

  // Require homepage.
  var path = (window.location.pathname || '/').replace(/\/?$/, '/');
  if (path !== '/') return;

  var visitCount = parseInt(lsGet(VISIT_COUNT) || '0', 10);
  if (visitCount < 2) return;

  var prevTs = parseInt(lsGet(LAST_VISIT) || '0', 10);
  if (!prevTs) return;

  ssSet(SESSION_MARK, '1');

  function ensureStyles() {
    if (document.getElementById('vs-signal-strip-styles')) return;
    var s = document.createElement('style');
    s.id = 'vs-signal-strip-styles';
    s.textContent = [
      '.vs-signal-strip{display:flex;align-items:flex-start;gap:12px;padding:10px 16px;',
      'background:rgba(255,215,0,.06);border-bottom:1px solid rgba(255,215,0,.15);',
      'font-size:13px;line-height:1.5;position:relative}',
      '.vs-signal-strip__label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;',
      'color:#ffd700;white-space:nowrap;padding-top:2px;flex-shrink:0}',
      '.vs-signal-strip__entries{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}',
      '.vs-signal-strip__entry{color:var(--vs-text,#e8e8e8);overflow:hidden;',
      'text-overflow:ellipsis;white-space:nowrap}',
      '.vs-signal-strip__entry .badge{font-size:11px;margin-right:4px}',
      '.vs-signal-strip__cta{color:#ffd700;text-decoration:none;white-space:nowrap;',
      'flex-shrink:0;padding-top:2px;font-size:12px}',
      '.vs-signal-strip__cta:hover{text-decoration:underline}',
      '.vs-signal-strip__dismiss{position:absolute;top:6px;right:8px;background:none;',
      'border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:14px;padding:2px 4px;',
      'line-height:1}',
      '.vs-signal-strip__dismiss:hover{color:#fff}',
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function render(entries) {
    ensureStyles();
    var wrap = document.createElement('div');
    wrap.className = 'vs-signal-strip';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-label', 'New since your last visit');

    var label = document.createElement('span');
    label.className = 'vs-signal-strip__label';
    label.textContent = 'New:';
    wrap.appendChild(label);

    var list = document.createElement('div');
    list.className = 'vs-signal-strip__entries';
    entries.slice(0, MAX_SHOWN).forEach(function (e) {
      var row = document.createElement('div');
      row.className = 'vs-signal-strip__entry';
      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = e.badge || '⚡';
      row.appendChild(badge);
      var text = document.createTextNode(esc(e.sentence || ''));
      row.appendChild(text);
      list.appendChild(row);
    });
    wrap.appendChild(list);

    var cta = document.createElement('a');
    cta.className = 'vs-signal-strip__cta';
    cta.href = '/changelog/';
    cta.textContent = 'View all →';
    cta.addEventListener('click', function () { emitUx('strip:changelog_click'); });
    wrap.appendChild(cta);

    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'vs-signal-strip__dismiss';
    dismiss.setAttribute('aria-label', 'Dismiss');
    dismiss.textContent = '×';
    dismiss.addEventListener('click', function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      emitUx('strip:dismissed');
    });
    wrap.appendChild(dismiss);

    // Insert after the first <header> or as first child of <main>.
    var header = document.querySelector('body > header, body > .site-header');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(wrap, header.nextSibling);
    } else {
      var main = document.querySelector('main') || document.body;
      main.insertBefore(wrap, main.firstChild);
    }
    emitUx('strip:signal_shown');
  }

  function flattenEntries(data) {
    var byWeek = (data && data.byWeek) || {};
    var all = [];
    Object.keys(byWeek).forEach(function (w) {
      var entries = byWeek[w];
      if (Array.isArray(entries)) all = all.concat(entries);
    });
    // Filter to entries newer than last visit; sort newest-first.
    return all.filter(function (e) {
      var t = e && e.ts ? new Date(e.ts).getTime() : 0;
      return t > prevTs;
    }).sort(function (a, b) {
      return new Date(b.ts).getTime() - new Date(a.ts).getTime();
    });
  }

  // Idle-load the feed.
  function load() {
    fetch(FEED_URL, { cache: 'default' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var fresh = flattenEntries(data);
        if (fresh.length >= 1) render(fresh);
      })
      .catch(function () { /* honest-dark: show nothing on failure */ });
  }

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(load, { timeout: 4000 });
  } else {
    setTimeout(load, 1500);
  }
}());
