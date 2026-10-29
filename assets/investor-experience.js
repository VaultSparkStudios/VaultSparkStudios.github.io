/* Investor presentation only. Authorization and private data stay with the
 * existing investor gate, scoped queries and signed-document RPC. */
(function () {
  'use strict';
  function init() {
    var select = document.getElementById('investor-theme');
    if (select && window.VSTheme) {
      select.value = VSTheme.get();
      select.addEventListener('change', function () { VSTheme.set(select.value); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.addEventListener('investor:ready', async function () {
    var target = document.getElementById('investor-public-signal');
    if (!target) return;
    try {
      var response = await fetch('/api/changelog-narrative.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      var feed = await response.json();
      var entries = (Array.isArray(feed.entries) ? feed.entries : []).filter(function (e) {
        return e && e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date || '');
      }).sort(function (a,b) { return b.date.localeCompare(a.date); });
      var entry = entries[0];
      if (!entry) throw new Error('unpublished');
      target.textContent = entry.title;
      document.getElementById('investor-public-signal-date').textContent = 'Public update · ' + entry.date;
    } catch (_) {
      target.textContent = 'Open the public changelog for the studio record.';
      document.getElementById('investor-public-signal-date').textContent = 'Publication date unavailable';
    }
  });
})();
