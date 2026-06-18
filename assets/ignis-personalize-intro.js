/* ignis-personalize-intro.js — S206 audit item #1 (adaptive-oracle-intro)
   Personalizes the /ignis/ Ask IGNIS intro for returning visitors with a
   query history (localStorage vs_ignis_history set by ignis-answer-engine.js).

   If ≥1 history entry: animated crossfade of the h2 headline + context p to a
   "welcome back / continue your research" variant; pre-fills the query input
   with the last query so one tap restarts their session.

   Predicate-loaded on /ignis/ only by ambient-loader.js.
   RUM: emitUx('oracle:personalized_intro_shown') in Worker RUM_UX_EVENTS. */
(function () {
  'use strict';

  if (!(location.pathname || '/').startsWith('/ignis')) return;

  var STORAGE_KEY = 'vs_ignis_history';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }

  var rawHist;
  try { rawHist = JSON.parse(lsGet(STORAGE_KEY) || '[]'); } catch (_) { rawHist = []; }

  if (!Array.isArray(rawHist) || rawHist.length === 0) return;

  var lastEntry = rawHist[0];
  var lastQuery = typeof lastEntry === 'object' && typeof lastEntry.query === 'string'
    ? lastEntry.query.trim() : '';
  if (!lastQuery) return;

  var topicDisplay = lastQuery.length > 44 ? lastQuery.slice(0, 44) + '…' : lastQuery;

  function emitUx(event) {
    try {
      var body = JSON.stringify({ route: '/ignis/', ux: event });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
      }
    } catch (_) {}
  }

  function crossfade(el, update) {
    el.style.transition = 'opacity .22s';
    el.style.opacity = '0';
    setTimeout(function () {
      update(el);
      el.style.opacity = '1';
    }, 240);
  }

  function applyPersonalization(oracleDiv) {
    var container = oracleDiv.parentElement;
    if (!container) return;

    var h2 = container.querySelector('h2');
    var p = container.querySelector('p');
    var input = oracleDiv.querySelector('input[name="q"]');

    if (!h2 && !input) return;

    if (h2) {
      var span = h2.querySelector('span');
      crossfade(h2, function (el) {
        el.childNodes[0] && (el.childNodes[0].nodeValue = 'Continue your research ');
        if (!span && el.textContent.indexOf('\xb7') === -1) {
          el.textContent = 'Continue your research';
        }
      });
    }

    if (p) {
      crossfade(p, function (el) {
        el.textContent =
          'Welcome back. Last time you asked: “' + topicDisplay + '” — ' +
          'hit Ask to continue, or start a new question.';
      });
    }

    if (input && !input.value) {
      setTimeout(function () { input.value = lastQuery; }, 280);
    }

    emitUx('oracle:personalized_intro_shown');
  }

  function tryApply() {
    var oracleDiv = document.querySelector('[data-vault-oracle]');
    if (!oracleDiv) return;

    var input = oracleDiv.querySelector('input[name="q"]');
    if (input) {
      applyPersonalization(oracleDiv);
      return;
    }

    var obs = new MutationObserver(function () {
      if (oracleDiv.querySelector('input[name="q"]')) {
        obs.disconnect();
        applyPersonalization(oracleDiv);
      }
    });
    obs.observe(oracleDiv, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryApply);
  } else {
    tryApply();
  }
}());
