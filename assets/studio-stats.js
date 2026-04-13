// studio-stats.js — VaultSpark Studios homepage stat helpers
// Runs as a deferred external script to stay CSP-compliant (no inline hash needed).

(function () {
  // Days since launch
  var el = document.getElementById('days-since-launch');
  if (el) {
    var launchDateUtc = Date.UTC(2026, 2, 4); // March 4, 2026
    var today = new Date();
    var todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    var days = Math.max(1, Math.floor((todayUtc - launchDateUtc) / 86400000));
    el.textContent = days.toLocaleString('en-US');
  }
})();
