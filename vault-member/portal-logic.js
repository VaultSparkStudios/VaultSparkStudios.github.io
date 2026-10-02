/*
 * portal-logic.js: pure, DOM-free decisions for the Vault Member portal.
 *
 * Everything here is a function of its arguments so it can be unit tested in
 * Node (tests/portal-logic.unit.spec.mjs) and reused by portal-loop.js in the
 * browser. No network, no storage, no globals beyond the export below.
 */
(function (root) {
  'use strict';

  // Canonical 9-rank ladder (assets/membership-access.js CONFIG.rankThresholds).
  var RANK_THRESHOLDS = [0, 250, 1000, 3000, 7500, 15000, 30000, 60000, 100000];

  function rankIndexFor(points, thresholds) {
    var list = Array.isArray(thresholds) && thresholds.length ? thresholds : RANK_THRESHOLDS;
    var value = Number(points) || 0;
    var idx = 0;
    for (var i = 0; i < list.length; i += 1) if (value >= list[i]) idx = i;
    return idx;
  }

  function toTime(value) {
    if (value == null || value === '') return NaN;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    return Date.parse(value);
  }

  // ── RPC availability ───────────────────────────────────────────────────
  // True when PostgREST says the function does not exist (not deployed yet),
  // so callers can fall back to the previous behaviour instead of failing.
  function isMissingRpc(error) {
    if (!error) return false;
    var code = String(error.code || '');
    var status = Number(error.status || (error.context && error.context.status) || 0);
    var msg = String(error.message || error.details || '');
    return code === 'PGRST202' || code === '42883' || status === 404
      || /could not find the function/i.test(msg)
      || /function .* does not exist/i.test(msg);
  }

  // ── Vault Initiation quest ─────────────────────────────────────────────
  // One quest, five steps. `state` carries booleans the portal already knows.
  function initiationSteps(state) {
    var s = state || {};
    var steps = [
      { key: 'identity', icon: '⚡', label: 'Make it yours: set an avatar or a bio',
        done: !!(s.avatarSet || s.bioSet), cta: { text: 'Open settings', tab: 'settings' } },
      { key: 'discord', icon: '💬', label: 'Link your Discord',
        done: !!s.discordLinked, cta: { text: 'Link Discord', tab: 'settings', anchor: 'discord-status-area' } },
      { key: 'challenge', icon: '🎯', label: 'Complete your first challenge',
        done: !!s.challengeDone, cta: { text: 'View challenges', tab: 'challenges' } },
      { key: 'social', icon: '👥', label: 'Follow a member or visit the Vault Wall',
        done: !!(s.followed || s.wallVisited), cta: { text: 'Visit the Vault Wall', href: '/community/#wall', mark: 'wall' } },
      { key: 'explore', icon: '🎮', label: 'Refer a friend or explore a game',
        done: !!(s.referred || s.gameExplored), cta: { text: 'Explore games', href: '/games/', mark: 'game' } },
    ];
    var doneCount = steps.filter(function (step) { return step.done; }).length;
    return {
      steps: steps,
      doneCount: doneCount,
      total: steps.length,
      percent: Math.round((doneCount / steps.length) * 100),
      complete: doneCount === steps.length,
      next: steps.find(function (step) { return !step.done; }) || null,
    };
  }

  // A member is "fresh" for the first three days unless the quest is done.
  function isFreshInitiate(member, now) {
    if (!member) return false;
    var prefs = member.prefs || {};
    if (prefs.initiation_done) return false;
    var created = toTime(member.createdAt || member.created_at);
    if (!isFinite(created)) return false;
    var t = isFinite(toTime(now)) ? toTime(now) : Date.now();
    return t - created < 3 * 86400000;
  }

  // ── Since your last visit ──────────────────────────────────────────────
  function sinceLastVisit(input) {
    var o = input || {};
    var lastSeen = toTime(o.lastSeen);
    var result = { items: [], hasChanges: false, pointsEarned: 0 };
    if (!isFinite(lastSeen)) return result;

    var events = (Array.isArray(o.events) ? o.events : []).filter(function (e) {
      return e && toTime(e.created_at) > lastSeen && Number(e.points) > 0;
    });
    var earned = events.reduce(function (sum, e) { return sum + Number(e.points || 0); }, 0);
    if (earned > 0) {
      result.pointsEarned = earned;
      result.items.push({ key: 'points', icon: '⚡',
        text: '+' + earned.toLocaleString('en-US') + ' Vault Points from ' + events.length + (events.length === 1 ? ' action' : ' actions') });
    }

    var kudos = (Array.isArray(o.kudos) ? o.kudos : []).filter(function (k) { return k && toTime(k.created_at) > lastSeen; });
    if (kudos.length) {
      var from = kudos[0].from_username ? ' (latest from @' + String(kudos[0].from_username) + ')' : '';
      result.items.push({ key: 'kudos', icon: '🙌',
        text: kudos.length + (kudos.length === 1 ? ' kudos received' : ' kudos received') + from });
    }

    var files = (Array.isArray(o.files) ? o.files : []).filter(function (f) { return f && toTime(f.published_at) > lastSeen; });
    if (files.length) {
      var open = files.filter(function (f) { return !f.locked; }).length;
      result.items.push({ key: 'files', icon: '📁',
        text: files.length + (files.length === 1 ? ' new classified file' : ' new classified files')
          + (open === files.length ? ' ready to read' : open > 0 ? ' (' + open + ' open to you)' : ' (locked for now)'),
        tab: 'archive' });
    }

    if (o.prevPoints != null && isFinite(Number(o.prevPoints))) {
      var names = Array.isArray(o.rankNames) ? o.rankNames : null;
      var before = rankIndexFor(o.prevPoints, o.thresholds);
      var after = rankIndexFor(o.points, o.thresholds);
      if (after > before) {
        result.items.push({ key: 'rank', icon: '🏆',
          text: 'Ranked up to ' + (names && names[after] ? names[after] : 'rank ' + (after + 1)) });
      }
    }

    result.hasChanges = result.items.length > 0;
    return result;
  }

  // ── Season standings view model ────────────────────────────────────────
  function standingsView(rows, limit) {
    var list = Array.isArray(rows) ? rows.filter(Boolean) : [];
    var top = list.slice(0, limit || 10);
    var me = list.find(function (r) { return r.is_me; }) || null;
    return {
      top: top,
      me: me,
      meInTop: !!(me && top.indexOf(me) !== -1),
      position: me ? Number(me.position) : null,
      seasonXp: me ? Number(me.season_xp || 0) : null,
    };
  }

  // What the results card should say once the season is over.
  function seasonResult(opts) {
    var o = opts || {};
    var live = o.liveMe;
    if (live && Number(live.position) > 0) {
      return { source: 'standings', position: Number(live.position), seasonXp: Number(live.season_xp || 0) };
    }
    var snap = o.snapshot;
    if (snap && Number(snap.position) > 0) {
      return { source: 'snapshot', position: Number(snap.position), seasonXp: Number(snap.season_xp || 0), at: snap.at || null };
    }
    var xp = Number(o.seasonXp);
    if (isFinite(xp) && xp > 0) return { source: 'xp', position: null, seasonXp: xp };
    return { source: 'none', position: null, seasonXp: 0 };
  }

  // ── Billing response contract (create-checkout) ────────────────────────
  function classifyCheckoutResponse(status, body) {
    var b = body && typeof body === 'object' ? body : {};
    var code = String(b.code || b.error || '');
    if (b.url && (!status || status < 400)) return { kind: 'redirect', url: b.url };
    // `code` is the contract; every body also carries a human `error` string,
    // so `code` must win over `error` when both are present.
    if (code === 'already_subscribed') {
      return { kind: 'already_subscribed', message: 'You already have this membership.' };
    }
    if (code === 'plan_change_via_billing' || (status === 409 && b.portal === true)) {
      return { kind: 'plan_change_via_billing', message: 'Switch plans in billing — your new plan replaces the old one.' };
    }
    if (code === 'annual_not_offered') {
      return { kind: 'annual_not_offered', message: 'Monthly plans only for now.' };
    }
    if (code === 'invalid_promo_code') return { kind: 'invalid_promo', message: '' };
    if (code === 'gift_unavailable' || status === 410) return { kind: 'gift_unavailable', message: '' };
    return { kind: 'error', message: 'Checkout is unavailable right now. Please try again in a moment.' };
  }

  // ── Your Games (data/game-registry.json) ───────────────────────────────
  // Descriptions follow the registry when it carries one, else D-S368.3 and
  // each game page's own description.
  var GAME_COPY = {
    'call-of-doodie': 'Comedy-first top-down roguelite shooter',
    'franchise-architect': 'Browser NFL franchise sim',
    'gridiron-gm': 'Football general manager sim',
    'mindframe': 'Live metacognition platform',
    'solara': 'Browser roguelite RPG with a shared world',
    'the-exodus': 'Engine-building card game for 2–4 players',
    'voidfall': 'Nine-book cosmic-horror saga',
    'vaultspark-forge': 'Crafting-and-building world',
    'vaultfront': 'Browser real-time strategy game of territorial control',
  };

  function safePlayUrl(game) {
    return game && typeof game.playUrl === 'string' && /^https:\/\//.test(game.playUrl) ? game.playUrl : null;
  }

  function gameStatus(game) {
    var status = String((game && game.status) || '').toLowerCase();
    if (status === 'sparked') return { key: 'sparked', label: 'Sparked', order: 0 };
    if (status === 'forge') {
      return safePlayUrl(game)
        ? { key: 'beta', label: 'Playable Beta', order: 1 }
        : { key: 'forge', label: 'In the Forge', order: 2 };
    }
    if (status === 'vaulted') return { key: 'vaulted', label: 'Vaulted', order: 3 };
    return null; // sealed or unknown: never shown, never counted
  }

  function buildGameList(registry) {
    var games = registry && registry.games && typeof registry.games === 'object' ? registry.games : {};
    return Object.keys(games).map(function (slug) {
      var g = games[slug] || {};
      var st = gameStatus(g);
      if (!st) return null;
      return {
        slug: slug,
        name: g.name || slug,
        status: st,
        description: g.description || g.tagline || g.summary || GAME_COPY[slug] || '',
        playUrl: safePlayUrl(g),
        page: '/games/' + slug + '/',
        navOrder: Number(g.navOrder) || 99,
      };
    }).filter(Boolean).sort(function (a, b) {
      return a.status.order - b.status.order || a.navOrder - b.navOrder || a.name.localeCompare(b.name);
    });
  }

  // ── Referral link (canonical, matches assets/invite-page.js) ───────────
  function referralLink(username) {
    return 'https://vaultsparkstudios.com/vault-member/?ref=' + encodeURIComponent(String(username || ''));
  }

  // Strip markup to a short plain-text excerpt (lore teaser cards).
  function textExcerpt(html, max) {
    var text = String(html || '')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ').trim();
    var limit = max || 200;
    if (text.length <= limit) return text;
    var cut = text.slice(0, limit);
    var space = cut.lastIndexOf(' ');
    return (space > limit * 0.6 ? cut.slice(0, space) : cut).replace(/[,.;:\s]+$/, '') + '…';
  }

  var api = {
    RANK_THRESHOLDS: RANK_THRESHOLDS,
    rankIndexFor: rankIndexFor,
    isMissingRpc: isMissingRpc,
    initiationSteps: initiationSteps,
    isFreshInitiate: isFreshInitiate,
    sinceLastVisit: sinceLastVisit,
    standingsView: standingsView,
    seasonResult: seasonResult,
    classifyCheckoutResponse: classifyCheckoutResponse,
    gameStatus: gameStatus,
    buildGameList: buildGameList,
    referralLink: referralLink,
    textExcerpt: textExcerpt,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VSPortalLogic = api;
})(typeof window !== 'undefined' ? window : null);
