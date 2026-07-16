/**
 * push-subscribe.js — S211 Wave 1
 * Wires the vault-member portal's push toggle (#toggle-push / #push-status-msg)
 * and any [data-push-subscribe] containers on other pages (e.g. /changelog/).
 * Predicate-loaded by ambient-loader on /vault-member/ and push-capable browsers only.
 */
(function () {
  'use strict';

  var PUSH_ENDPOINT = '/v/push-subscribe';
  var CONFIG_URL = '/api/push-config.json';
  var _config = null;

  function urlBase64ToUint8Array(b64) {
    var padding = '='.repeat((4 - b64.length % 4) % 4);
    var base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function emitUx(name) {
    try {
      var body = JSON.stringify({ route: location.pathname || '/', ux: name });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  function getConfig() {
    if (_config) return Promise.resolve(_config);
    return fetch(CONFIG_URL).then(function (r) {
      if (!r.ok) return Promise.reject('config-unavailable');
      return r.json();
    }).then(function (c) { _config = c; return c; });
  }

  function ensureSW() {
    return navigator.serviceWorker.register('/sw.js').then(function () {
      return navigator.serviceWorker.ready;
    });
  }

  function getSubscription() {
    return ensureSW().then(function (reg) {
      return reg.pushManager.getSubscription();
    });
  }

  function subscribe(publicKey) {
    return ensureSW().then(function (reg) {
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }).then(function (sub) {
      // S213 W3a: include game interest context so dispatch can segment by game.
      // lastGame and route are low-cardinality safe values; never PII.
      var lastGame = null;
      try { lastGame = localStorage.getItem('vs_last_game') || null; } catch (_) {}
      var payload = Object.assign({}, sub.toJSON(), {
        route: (location.pathname || '/').slice(0, 80),
        lastGame: lastGame,
      });
      return fetch(PUSH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (r) {
        if (!r.ok) throw new Error('store-failed');
        emitUx('push:subscribed');
        return sub;
      });
    });
  }

  function doUnsubscribe(sub) {
    var endpoint = sub.endpoint;
    return sub.unsubscribe().then(function () {
      return fetch(PUSH_ENDPOINT, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: endpoint }),
      });
    }).then(function () { emitUx('push:unsubscribed'); });
  }

  // --- Portal toggle (vault-member/index.html built-in UI) ---
  function wirePortalToggle(config) {
    var toggle = document.getElementById('toggle-push');
    var statusMsg = document.getElementById('push-status-msg');
    var toggleWrap = document.getElementById('push-toggle-wrap');
    if (!toggle) return;

    function setStatus(text) { if (statusMsg) statusMsg.textContent = text; }
    function setLocked(locked) {
      toggle.disabled = locked;
      if (toggleWrap) toggleWrap.style.opacity = locked ? '0.6' : '1';
    }

    if (Notification.permission === 'denied') {
      setStatus('Push notifications are blocked. Enable them in browser settings to subscribe.');
      return;
    }

    getSubscription().then(function (sub) {
      setLocked(false);
      toggle.checked = !!sub;
      setStatus(sub
        ? "Push notifications are active — you'll be alerted on new Vault drops."
        : 'Enable to get instant alerts when classified files drop or a SPARKED signal fires.');

      toggle.addEventListener('change', function () {
        setLocked(true);
        if (toggle.checked) {
          subscribe(config.publicKey).then(function () {
            setLocked(false);
            setStatus("Push notifications are active — you'll be alerted on new Vault drops.");
          }).catch(function () {
            toggle.checked = false;
            setLocked(false);
            setStatus(Notification.permission === 'denied'
              ? 'Permission denied. Enable notifications in browser settings.'
              : 'Subscription failed — please try again.');
            emitUx('push:error');
          });
        } else {
          getSubscription().then(function (s) { return s ? doUnsubscribe(s) : null; })
            .then(function () {
              setLocked(false);
              setStatus('Push notifications disabled.');
            }).catch(function () {
              toggle.checked = true;
              setLocked(false);
              setStatus('Could not unsubscribe — please try again.');
            });
        }
      });
    }).catch(function () {
      setStatus('Push notifications unavailable in this browser.');
    });
  }

  // --- Standalone containers ([data-push-subscribe]) ---
  function wireContainers(config) {
    var containers = document.querySelectorAll('[data-push-subscribe]');
    if (!containers.length) return;

    if (!document.getElementById('vs-push-subscribe-styles')) {
      var s = document.createElement('style');
      s.id = 'vs-push-subscribe-styles';
      s.textContent =
        '.vs-push-btn{display:inline-flex;align-items:center;gap:.5rem;padding:.55rem 1.2rem;min-height:44px;border-radius:999px;border:1px solid rgba(31,162,255,.4);background:rgba(31,162,255,.08);color:#7fc3ff;font-weight:700;font-size:.85rem;cursor:pointer;font-family:inherit;transition:background .18s,transform .18s;}' +
        '.vs-push-btn:hover:not(:disabled){background:rgba(31,162,255,.14);transform:translateY(-1px);}' +
        '.vs-push-btn:disabled{opacity:.5;cursor:default;}' +
        '.vs-push-btn--active{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.3);color:#4ade80;}' +
        '.vs-push-hint{font-size:.78rem;color:var(--muted,#a8b4d0);margin:.4rem 0 0;line-height:1.5;}';
      document.head.appendChild(s);
    }

    getSubscription().then(function (sub) {
      var subscribed = !!sub;
      Array.prototype.forEach.call(containers, function (c) { renderContainer(c, subscribed, config); });
      emitUx('push:prompt_shown');
    }).catch(function () {
      Array.prototype.forEach.call(containers, function (c) { c.style.display = 'none'; });
    });
  }

  // S229: personalized push hint copy based on last-visited game.
  var GAME_LABELS = {
    'vaultspark-forge': 'Forge',
    'call-of-doodie': 'Call of Doodie',
    'vaultspark-football-gm': 'Franchise Architect',
    'mindframe': 'Mindframe',
    'solara': 'Solara',
    'vaultfront': 'Vaultfront',
    'the-exodus': 'The Exodus',
    'cod': 'Call of Doodie',
    'fgm': 'Franchise Architect',
    'forge': 'Forge',
  };

  function getPersonalizedHint(topGame) {
    var lastGame = null;
    try { lastGame = localStorage.getItem('vs_last_game') || null; } catch (_) {}
    var game = topGame || lastGame;
    var label = game && GAME_LABELS[game];
    return label
      ? 'Get notified when ' + label + ' gets an update.'
      : 'Get notified when something new ships from the Vault.';
  }

  function renderContainer(container, subscribed, config, topGame) {
    container.innerHTML = '';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vs-push-btn' + (subscribed ? ' vs-push-btn--active' : '');
    btn.textContent = subscribed ? '🔔 Subscribed' : '🔔 Enable push notifications';
    container.appendChild(btn);

    if (!subscribed) {
      var hint = document.createElement('p');
      hint.className = 'vs-push-hint';
      hint.textContent = getPersonalizedHint(topGame);
      container.appendChild(hint);
    }

    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = 'Working…';
      if (subscribed) {
        getSubscription().then(function (s) { return s ? doUnsubscribe(s) : null; })
          .then(function () { subscribed = false; renderContainer(container, false, config); })
          .catch(function () { btn.disabled = false; btn.textContent = '🔔 Subscribed'; emitUx('push:error'); });
      } else {
        if (Notification.permission === 'denied') {
          btn.disabled = false;
          btn.textContent = 'Permission denied — check browser settings';
          return;
        }
        subscribe(config.publicKey)
          .then(function () { subscribed = true; renderContainer(container, true, config); })
          .catch(function () {
            btn.disabled = false;
            btn.textContent = '🔔 Enable push notifications';
            emitUx('push:error');
          });
      }
    });
  }

  // S229: post-quiz contextual push prompt. After quiz:complete fires, inject
  // a push subscribe card below the quiz result. Gate: not already subscribed,
  // not already shown this session (vs_push_quiz_prompt localStorage key).
  function wireQuizPrompt(config) {
    try { if (sessionStorage.getItem('vs_push_quiz_shown')) return; } catch (_) {}
    document.addEventListener('vs:quiz-complete', function (ev) {
      var topGame = (ev.detail && ev.detail.topGame) || null;
      getSubscription().then(function (sub) {
        if (sub) return; // already subscribed
        try { if (sessionStorage.getItem('vs_push_quiz_shown')) return; } catch (_) {}
        try { sessionStorage.setItem('vs_push_quiz_shown', '1'); } catch (_) {}

        // Find the quiz result container and append after it.
        var result = document.querySelector('.vs-quiz__result');
        if (!result) return;
        var wrap = document.createElement('div');
        wrap.setAttribute('data-push-subscribe', '');
        wrap.style.marginTop = '1.2rem';
        result.parentNode.insertBefore(wrap, result.nextSibling);
        renderContainer(wrap, false, config, topGame);
        emitUx('push:prompt_shown');
      }).catch(function () {});
    }, { once: true });
  }

  function boot() {
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
      var msg = document.getElementById('push-status-msg');
      if (msg) msg.textContent = 'Push notifications are not supported in this browser.';
      return;
    }

    getConfig().then(function (config) {
      if (!config || !config.publicKey) return;
      wirePortalToggle(config);
      wireContainers(config);
      wireQuizPrompt(config);
    }).catch(function () {
      var msg = document.getElementById('push-status-msg');
      if (msg) msg.textContent = 'Push notifications temporarily unavailable.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
