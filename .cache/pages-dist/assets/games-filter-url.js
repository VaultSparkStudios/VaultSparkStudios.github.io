(function () {
  'use strict';

  var VALID_STATUS = ['all', 'sparked', 'forge', 'vaulted'];

  function readParam(name) {
    try {
      var params = new URLSearchParams(window.location.search);
      var v = (params.get(name) || '').toLowerCase();
      return v;
    } catch (_) { return ''; }
  }

  function writeParam(name, value) {
    try {
      var url = new URL(window.location.href);
      if (!value || value === 'all') url.searchParams.delete(name);
      else url.searchParams.set(name, value);
      window.history.replaceState({}, '', url.toString());
    } catch (_) {}
  }

  function init() {
    var filterBtns = document.querySelectorAll('.filter-bar .filter-btn');
    if (!filterBtns.length) return;

    // Hydrate from URL on load
    var desired = readParam('status');
    if (VALID_STATUS.indexOf(desired) > -1 && desired !== 'all') {
      filterBtns.forEach(function (btn) {
        if (btn.dataset.filter === desired) {
          setTimeout(function () { btn.click(); }, 0);
        }
      });
    }

    // Write URL when filter clicked
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        writeParam('status', btn.dataset.filter);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
