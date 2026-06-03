/**
 * IGNIS Health Canary — internal diagnostic for the ask-ignis edge function.
 * Runs two probes on load:
 *   1. Anonymous probe → expects 403 membership_required (proves function live + gate works).
 *   2. Authenticated probe (if a stored Supabase session is present) → expects 200 ok + access payload.
 *
 * Reports green/yellow/red inline so "Ask IGNIS not working" becomes a 10-second diagnosis.
 */
(function () {
  'use strict';

  var FN_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/ask-ignis';
  var SUPABASE_ANON = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  var SESSION_KEYS = ['sb-fjnpzjjyhnpmunfoycrp-auth-token', 'supabase.auth.token'];

  function getStoredSession() {
    var raw = null;
    try {
      for (var i = 0; i < SESSION_KEYS.length; i++) {
        raw = localStorage.getItem(SESSION_KEYS[i]);
        if (raw) break;
      }
      if (!raw) {
        for (var j = 0; j < localStorage.length; j++) {
          var key = localStorage.key(j);
          if (key && key.indexOf('supabase') !== -1 && key.indexOf('auth-token') !== -1) {
            raw = localStorage.getItem(key);
            if (raw) break;
          }
        }
      }
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var candidates = [];
      if (parsed && typeof parsed === 'object') {
        if (parsed.currentSession) candidates.push(parsed.currentSession);
        if (parsed.session) candidates.push(parsed.session);
        candidates.push(parsed);
      }
      for (var k = 0; k < candidates.length; k++) {
        var s = candidates[k];
        if (s && s.access_token && s.user && s.user.id) return s;
      }
    } catch (_) { /* noop */ }
    return null;
  }

  function probe(token) {
    var t0 = performance.now();
    return fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + (token || SUPABASE_ANON),
      },
      body: JSON.stringify({ probe: true }),
    }).then(function (res) {
      var elapsed = Math.round(performance.now() - t0);
      return res.json().then(function (body) {
        return { status: res.status, body: body, elapsedMs: elapsed };
      }).catch(function () {
        return { status: res.status, body: null, elapsedMs: elapsed };
      });
    }).catch(function (err) {
      return { status: 0, body: null, elapsedMs: Math.round(performance.now() - t0), error: String(err) };
    });
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function row(state, label, detail, meta) {
    var el = document.createElement('div');
    el.className = 'ih-row';
    el.innerHTML =
      '<div class="ih-dot ' + esc(state) + '"></div>' +
      '<div><div class="ih-label">' + esc(label) + '</div>' +
      (detail ? '<div class="ih-detail">' + esc(detail) + '</div>' : '') +
      '</div>' +
      '<div class="ih-meta">' + esc(meta || '') + '</div>';
    return el;
  }

  function render(results) {
    var host = document.getElementById('ih-results');
    host.innerHTML = '';
    results.forEach(function (r) { host.appendChild(row(r.state, r.label, r.detail, r.meta)); });
  }

  function run() {
    var results = [];
    var session = getStoredSession();

    probe(null).then(function (anon) {
      if (anon.status === 0) {
        results.push({ state: 'err', label: 'Anonymous probe', detail: 'Network error — function unreachable. ' + (anon.error || ''), meta: anon.elapsedMs + 'ms' });
      } else if (anon.status === 403 && anon.body && anon.body.code === 'membership_required') {
        results.push({ state: 'ok', label: 'Anonymous probe', detail: '403 membership_required (gate working)', meta: anon.elapsedMs + 'ms' });
      } else if (anon.status === 503) {
        results.push({ state: 'err', label: 'Anonymous probe', detail: '503 IGNIS unavailable — ANTHROPIC_API_KEY missing from Supabase secrets.', meta: anon.elapsedMs + 'ms' });
      } else if (anon.status === 429) {
        results.push({ state: 'warn', label: 'Anonymous probe', detail: '429 rate limited — IP bucket full; retry in 60s.', meta: anon.elapsedMs + 'ms' });
      } else {
        results.push({ state: 'warn', label: 'Anonymous probe', detail: 'Unexpected ' + anon.status + ' — body: ' + JSON.stringify(anon.body || {}).slice(0, 200), meta: anon.elapsedMs + 'ms' });
      }
      render(results);

      if (!session) {
        results.push({ state: 'warn', label: 'Authenticated probe', detail: 'No Vault Member session in localStorage — sign in at /vault-member/ to run the auth probe.', meta: '—' });
        render(results);
        return;
      }

      return probe(session.access_token).then(function (auth) {
        if (auth.status === 200 && auth.body && auth.body.ok) {
          var a = auth.body.access || {};
          var tier = a.isPro ? 'Eternal (unlimited)' : a.isSparked ? 'Sparked' : a.planKey || 'unknown';
          var quota = a.unlimited ? 'unlimited' : (a.monthlyUsed + '/' + a.monthlyLimit + ' used · ' + a.monthlyRemaining + ' left');
          results.push({ state: 'ok', label: 'Authenticated probe', detail: 'tier: ' + tier + ' · quota: ' + quota, meta: auth.elapsedMs + 'ms' });
        } else if (auth.status === 403 && auth.body && auth.body.code === 'membership_required') {
          results.push({ state: 'warn', label: 'Authenticated probe', detail: 'Signed in but not Sparked — widget will render locked state (expected).', meta: auth.elapsedMs + 'ms' });
        } else {
          results.push({ state: 'err', label: 'Authenticated probe', detail: 'Unexpected ' + auth.status + ' — body: ' + JSON.stringify(auth.body || {}).slice(0, 200), meta: auth.elapsedMs + 'ms' });
        }
        render(results);
      });
    });
  }

  function bind() {
    var btn = document.getElementById('ih-rerun');
    if (btn) {
      btn.addEventListener('click', function () {
        var host = document.getElementById('ih-results');
        host.innerHTML = '';
        host.appendChild(row('', 'Re-running probes…', '', '—'));
        run();
      });
    }
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
