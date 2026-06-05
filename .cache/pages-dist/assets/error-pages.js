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

    function setStatus(text, online) {
      if (label) label.textContent = text;
      if (status) status.setAttribute('data-net', online ? 'online' : 'offline');
    }

    function apply() {
      var online = typeof navigator !== 'undefined' && 'onLine' in navigator
        ? navigator.onLine
        : false;
      if (online) {
        setStatus('Signal restored — reopening the vault', true);
        setTimeout(function () { window.location.reload(); }, 900);
      } else {
        setStatus('Waiting for signal', false);
      }
    }

    window.addEventListener('online', apply);
    window.addEventListener('offline', apply);
    apply();
  }
})();
