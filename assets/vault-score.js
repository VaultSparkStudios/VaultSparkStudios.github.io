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
  var RANKS = [
    { min: 100000, name: 'The Sparked' },
    { min: 60000,  name: 'Forge Master' },
    { min: 30000,  name: 'Vault Keeper' },
    { min: 15000,  name: 'Void Operative' },
    { min: 7500,   name: 'Vault Breacher' },
    { min: 3000,   name: 'Vault Guard' },
    { min: 1000,   name: 'Rift Scout' },
    { min: 250,    name: 'Vault Runner' },
    { min: 0,      name: 'Spark Initiate' },
  ];

  function getRankTitle(points) {
    var pts = Number(points) || 0;
    for (var i = 0; i < RANKS.length; i++) {
      if (pts >= RANKS[i].min) return RANKS[i].name;
    }
    return 'Spark Initiate';
  }

  var OFFLINE_KEY = 'vs_score_queue';

  function getSession() {
    var keys = ['sb-fjnpzjjyhnpmunfoycrp-auth-token', 'supabase.auth.token'];
    for (var k = 0; k < keys.length; k++) {
      try {
        var raw = localStorage.getItem(keys[k]);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        var candidates = [parsed.currentSession, parsed.session, parsed];
        if (Array.isArray(parsed)) candidates = candidates.concat(parsed);
        for (var c = 0; c < candidates.length; c++) {
          var s = candidates[c];
          if (s && s.access_token && s.user && s.user.id) return s;
        }
      } catch (_) {}
    }
    return null;
  }

  function queueOffline(gameSlug, score, meta) {
    try {
      var q = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
      q.push({ gameSlug: gameSlug, score: score, meta: meta || {}, ts: Date.now() });
      if (q.length > 20) q = q.slice(-20);
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(q));
    } catch (_) {}
  }

  function flushOfflineQueue() {
    var session = getSession();
    if (!session) return;
    var q;
    try { q = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); } catch (_) { return; }
    if (!q.length) return;
    localStorage.removeItem(OFFLINE_KEY);
    q.forEach(function (entry) {
      window.VaultScore.submit(entry.gameSlug, entry.score, entry.meta).catch(function () {
        queueOffline(entry.gameSlug, entry.score, entry.meta);
      });
    });
  }

  // Flush on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', flushOfflineQueue);
  } else {
    setTimeout(flushOfflineQueue, 0);
  }

  window.VaultScore = {
    getSession: getSession,
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
      // Use VSSupabase SDK if present, otherwise REST
      if (window.VSSupabase && typeof window.VSSupabase.rpc === 'function') {
        return window.VSSupabase.rpc('submit_game_score', {
          p_game_slug: gameSlug, p_score: Math.floor(score), p_metadata: meta || {}
        }).then(function (r) {
          if (r.error) throw r.error;
          return r.data;
        }).catch(function () { queueOffline(gameSlug, score, meta); return { ok: false, reason: 'queued_offline' }; });
      }
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
        .catch(function () { queueOffline(gameSlug, score, meta); return { ok: false, reason: 'queued_offline' }; });
    },

    /**
     * Fetch the signed-in member's profile (username, points, plan_key).
     * @returns {Promise<{username, points, plan_key, achievements}|null>}
     */
    getMemberProfile: function () {
      var session = getSession();
      if (!session) return Promise.resolve(null);
      return fetch(
        SB + '/rest/v1/vault_members?select=username,points,plan_key,achievements&id=eq.' +
        encodeURIComponent(session.user.id),
        { headers: { apikey: KEY, Authorization: 'Bearer ' + session.access_token, Accept: 'application/json' } }
      )
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) { return (Array.isArray(rows) && rows[0]) ? rows[0] : null; })
        .catch(function () { return null; });
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
        SB + '/rest/v1/game_scores?select=user_id,score,vault_members(username,points)' +
        '&game_slug=eq.' + encodeURIComponent(gameSlug) +
        '&order=score.desc&limit=' + n,
        { headers: { apikey: KEY, Accept: 'application/json' } }
      )
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          return Array.isArray(rows) ? rows.map(function (row) {
            var member = row.vault_members || {};
            return {
              user_id: row.user_id,
              score: row.score,
              vault_members: {
                username: member.username || 'Anonymous',
                points: member.points || 0,
                rank_title: getRankTitle(member.points),
              },
            };
          }) : [];
        })
        .catch(function () { return []; });
    },

    /**
     * Fetch the signed-in user's personal best score for a game.
     * @param {string} gameSlug
     * @returns {Promise<{score: number}|null>}
     */
    getMyScore: function (gameSlug) {
      var session = getSession();
      if (!session) return Promise.resolve(null);
      return fetch(
        SB + '/rest/v1/game_scores?select=score&game_slug=eq.' + encodeURIComponent(gameSlug) +
        '&user_id=eq.' + encodeURIComponent(session.user.id) +
        '&order=score.desc&limit=1',
        { headers: { apikey: KEY, Authorization: 'Bearer ' + session.access_token, Accept: 'application/json' } }
      )
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) { return (Array.isArray(rows) && rows[0]) ? rows[0] : null; })
        .catch(function () { return null; });
    },
  };
})();
