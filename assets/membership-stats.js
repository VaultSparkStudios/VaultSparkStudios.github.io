// membership-stats.js — live community stats for /membership/
// Runs as a deferred external script to stay CSP-compliant.
// Requires /assets/supabase-public.js to be listed first (also defer) so VSPublic is set.

(function () {
  if (!window.VSPublic) return;

  VSPublic.from('vault_members').select('id', { count: 'exact', head: true }).then(function (r) {
    var n = r.count || 0;
    ['proof-members', 'stat-members'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;
    });
  });

  VSPublic.from('vault_members').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active').then(function (r) {
    var n = r.count || 0;
    ['proof-sparked', 'stat-sparked'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = n;
    });
  });

  VSPublic.from('vault_challenges').select('id', { count: 'exact', head: true }).eq('completed', true).then(function (r) {
    var n = r.count || 0;
    var el = document.getElementById('stat-challenges');
    if (el) el.textContent = n;
  });
})();
