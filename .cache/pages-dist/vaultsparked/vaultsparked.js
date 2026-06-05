/**
 * VaultSparked page — Genesis Vault Member live slot counter
 *
 * Queries Supabase for the count of non-studio genesis badge holders
 * and updates #genesis-slots-left with remaining public slots out of 100.
 *
 * Studio owner accounts are excluded from the 100-slot count (they hold
 * the badge permanently without consuming a public slot, per phase58 DB logic).
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  const ANON_KEY    = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  const BASE        = SUPABASE_URL + '/rest/v1';
  const TOTAL_SLOTS = 100;

  // Studio owner accounts — excluded from public slot count (phase58 migration)
  const STUDIO_IDS = [
    '36c3cbf3-c192-4540-8d0e-d65eefbcddce',
    'cb9b061f-ddcc-498a-a7bf-728c7c6f8340',
    'c5c1be48-e639-45f7-8b35-c28fb0d3be44',
    'e8a18737-4a56-460f-80d2-6f45c5272747'
  ];

  async function loadGenesisSlots() {
    var el = document.getElementById('genesis-slots-left');
    if (!el) return;

    try {
      // Step 1: resolve achievement UUID for genesis_vault_member
      var achRes = await fetch(
        BASE + '/achievements?slug=eq.genesis_vault_member&select=id&limit=1',
        { headers: { apikey: ANON_KEY, Accept: 'application/json' } }
      );
      if (!achRes.ok) return;
      var achievements = await achRes.json();
      if (!achievements.length) return;
      var achievementId = achievements[0].id;

      // Step 2: count public (non-studio) holders of this achievement
      var notIn = STUDIO_IDS.join(',');
      var countRes = await fetch(
        BASE + '/member_achievements?achievement_id=eq.' + achievementId
          + '&member_id=not.in.(' + notIn + ')&select=id',
        {
          headers: {
            apikey: ANON_KEY,
            Accept: 'application/json',
            Prefer: 'count=exact',
            Range: '0-0'
          }
        }
      );

      var range = countRes.headers.get('content-range') || '';
      var claimed = parseInt(range.split('/')[1] || '0', 10);
      var remaining = Math.max(0, TOTAL_SLOTS - claimed);

      if (remaining === 0) {
        el.innerHTML = '<strong style="color:#D62828;">All 100 spots claimed.</strong> This badge is no longer available.';
      } else if (remaining <= 10) {
        el.innerHTML = '<strong style="color:#FF7A00;">' + remaining + ' of 100</strong> public spots remaining — almost gone';
      } else {
        el.innerHTML = '<strong style="color:#FFC400;">' + remaining + ' of 100</strong> public spots remaining';
      }
    } catch (e) {
      // Silently fail — static text in the FAQ remains readable
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGenesisSlots);
  } else {
    loadGenesisSlots();
  }
})();
