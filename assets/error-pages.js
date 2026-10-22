(function () {
  'use strict';

  var searchForm = document.getElementById('err-search');
  if (searchForm) {
    searchForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var query = document.getElementById('err-q');
      var value = query ? query.value.trim() : '';
      if (value) window.location.href = '/search/?q=' + encodeURIComponent(value);
    });
  }

  if (document.body.classList.contains('offline-page')) {
    var label = document.getElementById('offline-net-label');
    var status = document.getElementById('offline-net-status');
    var probe = null;
    var reloadTimer = null;
    var generation = 0;

    function setStatus(text, online) {
      if (label) label.textContent = text;
      if (status) status.setAttribute('data-net', online ? 'online' : 'offline');
    }

    function apply() {
      var online = typeof navigator !== 'undefined' && 'onLine' in navigator
        ? navigator.onLine
        : false;
      if (!online) {
        generation += 1;
        if (probe) probe.abort();
        probe = null;
        clearTimeout(reloadTimer);
        reloadTimer = null;
        setStatus('Waiting for signal', false);
        return;
      }
      if (probe || reloadTimer !== null) return;

      // An online adapter does not prove the requested site is reachable.
      // A page HEAD is non-navigation, bypassing the worker's page fallback;
      // no-store also prevents an HTTP-cache hit from claiming recovery.
      var current = ++generation;
      var controller = new AbortController();
      probe = controller;
      var timeout = setTimeout(function () { controller.abort(); }, 5000);
      var target = window.location.pathname === '/offline.html' ? '/' : window.location.href;
      setStatus('Checking the signal', false);
      fetch(target, { method: 'HEAD', cache: 'no-store', redirect: 'error', signal: controller.signal })
        .then(function (response) {
          if (current !== generation || controller.signal.aborted) return;
          if (!response.ok) {
            setStatus('Waiting for signal', false);
            return;
          }
          setStatus('Signal restored — reopening the vault', true);
          reloadTimer = setTimeout(function () {
            if (current !== generation || !navigator.onLine) return;
            if (window.location.pathname === '/offline.html') window.location.replace('/');
            else window.location.reload();
          }, 900);
        })
        .catch(function () {
          if (current === generation) setStatus('Waiting for signal', false);
        })
        .finally(function () {
          clearTimeout(timeout);
          if (probe === controller) probe = null;
        });
    }

    window.addEventListener('online', apply);
    window.addEventListener('offline', apply);
    apply();
  }
})();
