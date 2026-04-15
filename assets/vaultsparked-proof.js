(function () {
  'use strict';

  if (!window.VSPublic) return;

  function formatCount(value) {
    if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
    return String(value);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  Promise.all([
    window.VSPublic.from('vault_members').select('id').count().get(),
    window.VSPublic.from('vault_members').select('id').eq('subscription_status', 'active').count().get(),
    window.VSPublic.from('challenge_submissions').select('id').count().get()
  ]).then(function (results) {
    var members = results[0].count || 0;
    var sparked = results[1].count || 0;
    var challenges = results[2].count || 0;

    setText('vs-proof-members', formatCount(members));
    setText('vs-proof-sparked', formatCount(sparked));
    setText('vs-proof-challenges', formatCount(challenges));
  }).catch(function () {});
})();
