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
    window.addEventListener('online', function () {
      window.location.reload();
    });
  }
})();
