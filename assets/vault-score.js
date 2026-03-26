// VaultSpark Score SDK v1
// Include this on any game page to enable vault leaderboard score submission.
//
// Usage:
//   window.VaultScore.submit('call-of-doodie', 42500)
//   window.VaultScore.submit('gridiron-gm', 18, { wins: 18, season: 1 })
//
// Returns a Promise resolving to:
//   { ok: true, rank: 4, xp_awarded: 50, high_score: 42500, is_new_best: true }
//   { ok: false, reason: 'not_signed_in' }
//
// XP is automatically awarded at score milestones: 1k, 5k, 10k, 50k, 100k.
// Only high scores are stored — lower scores than the current best are ignored.

(function () {
  var SB  = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  var KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';

  function getSession() {
    try {
      var raw = localStorage.getItem('sb-fjnpzjjyhnpmunfoycrp-auth-token')
             || localStorage.getItem('supabase.auth.token');
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var session = parsed.currentSession || parsed;
      if (session && session.access_token && session.user) return session;
      return null;
    } catch (_) { return null; }
  }

  window.VaultScore = {
    /**
     * Submit a game score to the vault leaderboard.
     * @param {string} gameSlug  - e.g. 'call-of-doodie', 'gridiron-gm', 'vaultspark-football-gm'
     * @param {number} score     - numeric score (integer)
     * @param {object} [meta]    - optional metadata (season, mode, etc.)
     * @returns {Promise<object>}
     */
    submit: function (gameSlug, score, meta) {
      var session = getSession();
      if (!session) return Promise.resolve({ ok: false, reason: 'not_signed_in' });
      return fetch(SB + '/rest/v1/rpc/submit_game_score', {
        method:  'POST',
        headers: {
          'apikey':        KEY,
          'Authorization': 'Bearer ' + session.access_token,
          'Content-Type':  'application/json',
          'Accept':        'application/json',
        },
        body: JSON.stringify({
          p_game_slug: gameSlug,
          p_score:     Math.floor(score),
          p_metadata:  meta || {},
        }),
      })
        .then(function (r) { return r.ok ? r.json() : { ok: false, reason: 'server_error' }; })
        .catch(function () { return { ok: false, reason: 'network_error' }; });
    },

    /**
     * Fetch the top scores for a game (public, no auth needed).
     * @param {string} gameSlug
     * @param {number} [limit=25]
     * @returns {Promise<Array>}
     */
    getLeaderboard: function (gameSlug, limit) {
      var n = limit || 25;
      return fetch(
        SB + '/rest/v1/game_scores?select=user_id,score,vault_members(username,rank_title)' +
        '&game_slug=eq.' + encodeURIComponent(gameSlug) +
        '&order=score.desc&limit=' + n,
        { headers: { apikey: KEY, Accept: 'application/json' } }
      )
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
    },
  };
})();
