/*
 * portal-loop.js: the member return loop and consolidated dashboard surfaces.
 *
 *   - Vault Initiation (the one onboarding quest)
 *   - Since your last visit
 *   - Season 1 countdown strip, standings, and the post-season results card
 *   - Nearest rival beside the rank bar
 *   - Your Games (one list from data/game-registry.json)
 *   - Classified teaser (lore comes from get_classified_files, never the HTML)
 *   - One-tap panel feedback into the existing page_feedback sink
 *   - Vault Command, injected only after is_vault_admin() confirms
 *   - Investor nav link hidden for signed-in non-investors
 *
 * Every RPC is optional: a function that is not deployed yet degrades to the
 * previous behaviour or hides its widget. Nothing here throws into the page.
 * Pure decisions live in portal-logic.js (unit tested).
 */
(function () {
  'use strict';

  var L = window.VSPortalLogic;
  if (!L) return;

  // ── Small helpers ──────────────────────────────────────────────────────
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function $(id) { return document.getElementById(id); }
  function currentMember() {
    try { return typeof _currentMember !== 'undefined' ? _currentMember : null; } catch (_) { return null; }
  }
  function currentUid() { var m = currentMember(); return m && m._id ? m._id : null; }
  function sb() { return window.VSSupabase || null; }

  // Never throws: resolves { data, error, count } even when the client or the
  // function is missing. PostgREST builders are thenables, not Promises, so
  // they are wrapped before any .catch is attached.
  function rpc(name, args) {
    var client = sb();
    if (!client || typeof client.rpc !== 'function') return Promise.resolve({ error: { message: 'client unavailable' } });
    try {
      return Promise.resolve(client.rpc(name, args)).then(
        function (res) { return res || {}; },
        function (err) { return { error: err || { message: 'rpc failed' } }; }
      );
    } catch (err) { return Promise.resolve({ error: err }); }
  }
  function run(build) {
    var client = sb();
    if (!client) return Promise.resolve({ error: { message: 'client unavailable' } });
    try {
      return Promise.resolve(build(client)).then(
        function (res) { return res || {}; },
        function (err) { return { error: err || { message: 'query failed' } }; }
      );
    } catch (err) { return Promise.resolve({ error: err }); }
  }
  function goTab(tab, anchorId) {
    if (typeof switchDashTab === 'function') switchDashTab(tab);
    if (anchorId) {
      setTimeout(function () {
        var el = $(anchorId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 260);
    }
  }
  function toast(message, emoji) {
    if (typeof showToast === 'function') showToast(message, { emoji: emoji || '' });
  }
  function relTime(ts) {
    var t = typeof ts === 'number' ? ts : Date.parse(ts);
    if (!isFinite(t)) return '';
    var mins = Math.round((Date.now() - t) / 60000);
    if (mins < 60) return mins <= 1 ? 'a moment ago' : mins + ' minutes ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs === 1 ? 'an hour ago' : hrs + ' hours ago';
    var days = Math.round(hrs / 24);
    return days === 1 ? 'yesterday' : days + ' days ago';
  }
  function rankNames() {
    try { return (VS.RANKS || []).map(function (r) { return r.name; }); } catch (_) { return null; }
  }
  function rankThresholds() {
    try { return (VS.RANKS || []).map(function (r) { return r.min; }); } catch (_) { return L.RANK_THRESHOLDS; }
  }

  // ── Member prefs (vault_members.prefs jsonb), per-user local backup ────
  var Prefs = {
    _chain: Promise.resolve(),
    localKey: function (key) { return 'vs_pref_' + (currentUid() || 'anon') + '_' + key; },
    get: function (key) {
      var m = currentMember();
      if (m && m.prefs && m.prefs[key] !== undefined && m.prefs[key] !== null) return m.prefs[key];
      try {
        var raw = localStorage.getItem(this.localKey(key));
        return raw == null ? null : JSON.parse(raw);
      } catch (_) { return null; }
    },
    save: function (patch) {
      var m = currentMember();
      var uid = currentUid();
      if (!m || !uid || !patch) return Promise.resolve(false);
      m.prefs = Object.assign({}, m.prefs || {}, patch);
      var self = this;
      Object.keys(patch).forEach(function (key) {
        try { localStorage.setItem(self.localKey(key), JSON.stringify(patch[key])); } catch (_) {}
      });
      // Serialise writes so two surfaces saving at once never clobber each
      // other: every write sends the full merged object.
      this._chain = this._chain.then(function () {
        return run(function (c) {
          return c.from('vault_members').update({ prefs: m.prefs }).eq('id', uid);
        }).then(function (res) { return !res.error; });
      });
      return this._chain;
    },
  };

  // Shared, once-per-page data.
  var cache = {};
  function once(key, factory) {
    if (!cache[key]) cache[key] = factory();
    return cache[key];
  }
  function classifiedFiles() {
    return once('classified', function () {
      return rpc('get_classified_files').then(function (res) {
        return res.error || !Array.isArray(res.data) ? null : res.data;
      });
    });
  }
  function seasonFeed() {
    return once('seasons', function () {
      if (window.VSSeasons && typeof VSSeasons.loadSeasons === 'function') return VSSeasons.loadSeasons();
      return fetch('/data/seasons.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    });
  }

  // ── Vault Initiation ───────────────────────────────────────────────────
  function initiationLocal(mark) { return 'vs_initiation_' + mark + '_' + (currentUid() || 'anon'); }
  function hasLocal(key) { try { return !!localStorage.getItem(key); } catch (_) { return false; } }

  function loadInitiationState(member) {
    var uid = member._id;
    var count = function (build) {
      return run(build).then(function (res) { return res.error ? 0 : (res.count || 0); });
    };
    return Promise.all([
      count(function (c) { return c.from('challenge_completions').select('id', { count: 'exact', head: true }).eq('user_id', uid); }),
      count(function (c) { return c.from('member_follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', uid); }),
      count(function (c) { return c.from('point_events').select('id', { count: 'exact', head: true }).eq('user_id', uid).like('reason', 'referral%'); }),
      count(function (c) { return c.from('game_sessions').select('id', { count: 'exact', head: true }).eq('user_id', uid); }),
    ]).then(function (counts) {
      return {
        avatarSet: !!(member.avatar_id && member.avatar_id !== 'spark'),
        bioSet: !!(member.bio && member.bio.trim().length > 5),
        discordLinked: !!member.discord_id,
        challengeDone: counts[0] > 0,
        followed: counts[1] > 0,
        wallVisited: hasLocal(initiationLocal('wall')),
        referred: counts[2] > 0,
        gameExplored: counts[3] > 0 || hasLocal(initiationLocal('game'))
          || hasLocal('vs_visited_cod') || hasLocal('vs_visited_gm') || hasLocal('vs_visited_vsfgm'),
      };
    });
  }

  function renderInitiation(member) {
    var panel = $('vault-initiation');
    if (!panel) return;
    if (Prefs.get('initiation_done') || Prefs.get('initiation_dismissed')) { panel.hidden = true; return; }
    loadInitiationState(member).then(function (state) {
      var quest = L.initiationSteps(state);
      var bar = $('vi-bar');
      var count = $('vi-count');
      var list = $('vi-steps');
      var done = $('vi-done');
      if (bar) { bar.style.width = quest.percent + '%'; bar.parentElement.setAttribute('aria-valuenow', String(quest.percent)); }
      if (count) count.textContent = quest.doneCount + ' of ' + quest.total;

      if (quest.complete) {
        if (list) list.innerHTML = '';
        if (done) done.hidden = false;
        panel.classList.add('vi-complete');
        celebrate(panel);
        Prefs.save({ initiation_done: true, initiation_done_at: new Date().toISOString() });
      } else if (list) {
        list.innerHTML = quest.steps.map(function (step) {
          var cta = '';
          if (!step.done && step.cta) {
            cta = step.cta.href
              ? '<a class="vi-cta" href="' + esc(step.cta.href) + '" data-vi-mark="' + esc(step.cta.mark || '') + '">' + esc(step.cta.text) + ' <span aria-hidden="true">→</span></a>'
              : '<button type="button" class="vi-cta" data-vi-tab="' + esc(step.cta.tab) + '" data-vi-anchor="' + esc(step.cta.anchor || '') + '">' + esc(step.cta.text) + ' <span aria-hidden="true">→</span></button>';
          }
          return '<li class="vi-step' + (step.done ? ' is-done' : '') + (quest.next === step ? ' is-next' : '') + '">'
            + '<span class="vi-check" aria-hidden="true">' + (step.done ? '✓' : '') + '</span>'
            + '<span class="vi-label"><span aria-hidden="true">' + step.icon + '</span> ' + esc(step.label)
            + '<span class="vm-sr">' + (step.done ? ' (done)' : ' (to do)') + '</span></span>'
            + cta + '</li>';
        }).join('');
      }
      panel.hidden = false;
    });
  }

  function celebrate(panel) {
    if (!panel || panel.dataset.celebrated) return;
    panel.dataset.celebrated = '1';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || document.documentElement.dataset.motion === 'reduced') return;
    var burst = document.createElement('div');
    burst.className = 'vi-burst';
    burst.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 18; i += 1) {
      var p = document.createElement('span');
      var angle = (i / 18) * Math.PI * 2;
      p.style.setProperty('--dx', Math.round(Math.cos(angle) * (60 + (i % 3) * 22)) + 'px');
      p.style.setProperty('--dy', Math.round(Math.sin(angle) * (40 + (i % 4) * 14)) + 'px');
      burst.appendChild(p);
    }
    panel.appendChild(burst);
    setTimeout(function () { burst.remove(); }, 1600);
  }

  document.addEventListener('click', function (event) {
    var tabBtn = event.target.closest && event.target.closest('[data-vi-tab]');
    if (tabBtn) { goTab(tabBtn.dataset.viTab, tabBtn.dataset.viAnchor || null); return; }
    var markLink = event.target.closest && event.target.closest('[data-vi-mark]');
    if (markLink && markLink.dataset.viMark) {
      try { localStorage.setItem(initiationLocal(markLink.dataset.viMark), '1'); } catch (_) {}
    }
    if (event.target.closest && event.target.closest('#vi-dismiss')) {
      Prefs.save({ initiation_dismissed: true });
      var panel = $('vault-initiation');
      if (panel) panel.hidden = true;
    }
    if (event.target.closest && event.target.closest('#vi-tour')) {
      event.preventDefault();
      if (typeof window.openPortalTour === 'function') window.openPortalTour();
    }
    if (event.target.closest && event.target.closest('#slv-dismiss')) {
      var card = $('since-last-visit');
      if (card) card.hidden = true;
    }
  });

  // ── Since your last visit ──────────────────────────────────────────────
  var lastVisitDone = false;
  function renderSinceLastVisit(member) {
    if (lastVisitDone) return;
    lastVisitDone = true;
    var card = $('since-last-visit');
    var lastSeen = Prefs.get('last_seen');
    var prevPoints = Prefs.get('last_seen_points');
    var nowIso = new Date().toISOString();
    var stamp = function () { Prefs.save({ last_seen: nowIso, last_seen_points: member.points || 0 }); };
    if (!card || !lastSeen || !isFinite(Date.parse(lastSeen))) { stamp(); return; }

    Promise.all([
      run(function (c) {
        return c.from('point_events').select('label, points, created_at')
          .eq('user_id', member._id).gt('created_at', lastSeen)
          .order('created_at', { ascending: false }).limit(50);
      }),
      rpc('get_my_kudos_received'),
      classifiedFiles(),
    ]).then(function (out) {
      var diff = L.sinceLastVisit({
        lastSeen: lastSeen,
        events: out[0].error ? [] : out[0].data,
        kudos: out[1].error ? [] : out[1].data,
        files: out[2] || [],
        prevPoints: prevPoints,
        points: member.points,
        thresholds: rankThresholds(),
        rankNames: rankNames(),
      });
      if (diff.hasChanges) {
        var when = $('slv-when');
        if (when) when.textContent = relTime(lastSeen);
        var list = $('slv-items');
        if (list) {
          list.innerHTML = diff.items.map(function (item) {
            var body = '<span class="slv-icon" aria-hidden="true">' + item.icon + '</span><span>' + esc(item.text) + '</span>';
            return '<li>' + (item.tab
              ? '<button type="button" class="slv-item" data-vi-tab="' + esc(item.tab) + '">' + body + '</button>'
              : '<span class="slv-item">' + body + '</span>') + '</li>';
          }).join('');
        }
        card.hidden = false;
      }
      stamp();
    });
  }

  // ── Season strip, standings, results ───────────────────────────────────
  var stripTimer = null;
  function renderSeasonStrip(season, phase) {
    var strip = $('season-strip');
    if (!strip) return;
    if (!season || phase === 'none') { strip.hidden = true; return; }
    var label = $('season-strip-label');
    var count = $('season-strip-count');
    var cta = $('season-strip-cta');
    if (label) label.textContent = season.label || 'Current season';
    var end = VSSeasons.parseDate(season.endsAt || season.endedAt);
    var start = VSSeasons.parseDate(season.startedAt);
    function tick() {
      var now = Date.now();
      var p = VSSeasons.seasonPhase(season, now);
      if (p === 'active' && end) {
        count.textContent = 'Ends in ' + VSSeasons.fmtDuration(end.getTime() - now);
        strip.dataset.phase = 'active';
        if (cta) cta.textContent = 'Standings';
      } else if (p === 'upcoming' && start) {
        count.textContent = 'Starts in ' + VSSeasons.fmtDuration(start.getTime() - now);
        strip.dataset.phase = 'upcoming';
        if (cta) cta.textContent = 'Details';
      } else {
        count.textContent = 'Season has ended';
        strip.dataset.phase = 'ended';
        if (cta) cta.textContent = 'Your results';
        if (stripTimer) { clearInterval(stripTimer); stripTimer = null; }
      }
    }
    tick();
    if (stripTimer) clearInterval(stripTimer);
    if (phase !== 'ended') stripTimer = setInterval(tick, 60000);
    strip.hidden = false;
  }

  function participantNudge(member, season) {
    var el = $('ss-nudge');
    if (!el) return;
    var reward = VSSeasons.seasonReward(season, 'participant');
    if (!reward) { el.hidden = true; return; }
    run(function (c) {
      return c.from('challenge_completions').select('id', { count: 'exact', head: true })
        .eq('user_id', member._id).gte('completed_at', season.startedAt);
    }).then(function (res) {
      if (res.error) {
        el.innerHTML = '<span class="ss-nudge-icon" aria-hidden="true">🎯</span><span>Complete one challenge = <strong>+' + reward + ' Vault Points</strong> participant reward.</span>'
          + '<button type="button" class="vi-cta" data-vi-tab="challenges">Open challenges <span aria-hidden="true">→</span></button>';
      } else if ((res.count || 0) > 0) {
        el.classList.add('is-qualified');
        el.innerHTML = '<span class="ss-nudge-icon" aria-hidden="true">✓</span><span>You completed a challenge this season, so you qualify for the <strong>+' + reward + ' Vault Points</strong> participant reward.</span>';
      } else {
        el.innerHTML = '<span class="ss-nudge-icon" aria-hidden="true">🎯</span><span>Complete one challenge before the season ends = <strong>+' + reward + ' Vault Points</strong> participant reward.</span>'
          + '<button type="button" class="vi-cta" data-vi-tab="challenges">Open challenges <span aria-hidden="true">→</span></button>';
      }
      el.hidden = false;
    });
  }

  function standingRow(row) {
    var mine = row.is_me ? ' is-me' : '';
    var name = esc(row.username || 'Vault Member');
    return '<li class="ss-row' + mine + '">'
      + '<span class="ss-pos">#' + esc(row.position) + '</span>'
      + '<a class="ss-name" href="/member/?u=' + encodeURIComponent(row.username || '') + '">' + name + (row.is_me ? ' <span class="ss-you">You</span>' : '') + '</a>'
      + '<span class="ss-xp">' + Number(row.season_xp || 0).toLocaleString('en-US') + ' XP</span>'
      + '</li>';
  }

  function renderStandings(member, season, phase) {
    var panel = $('season-standings-panel');
    if (!panel) return;
    if (!season || phase === 'none' || phase === 'upcoming') { panel.hidden = true; return; }
    var title = $('ss-title');
    var meta = $('ss-meta');
    var you = $('ss-you');
    var list = $('ss-list');
    var results = $('ss-results');
    if (title) title.textContent = season.label || 'Season standings';

    rpc('get_season_standings', { p_limit: 100 }).then(function (res) {
      var rows = res.error || !Array.isArray(res.data) ? null : res.data;
      var view = rows ? L.standingsView(rows, 10) : null;

      if (phase === 'ended') {
        var snapshots = Prefs.get('season_results') || {};
        var outcome = L.seasonResult({
          liveMe: view && view.me,
          snapshot: snapshots[season.id],
          seasonXp: member.season_xp,
        });
        if (meta) meta.textContent = 'Final results';
        if (you) you.hidden = true;
        if (list) list.innerHTML = '';
        var nudge = $('ss-nudge'); if (nudge) nudge.hidden = true;
        if (results) {
          var headline = outcome.position
            ? 'You finished <strong>#' + outcome.position + '</strong> with <strong>' + outcome.seasonXp.toLocaleString('en-US') + ' season XP</strong>.'
            : outcome.seasonXp > 0
              ? 'You earned <strong>' + outcome.seasonXp.toLocaleString('en-US') + ' season XP</strong> this season.'
              : 'You did not earn season XP this time. The next season is a fresh start for everyone.';
          var note = outcome.source === 'snapshot' && outcome.at
            ? '<p class="ss-fine">Position from your last recorded standing (' + esc(new Date(outcome.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + ').</p>'
            : '';
          var rewards = Array.isArray(season.rewards) ? season.rewards : [];
          results.innerHTML = '<div class="ss-result-card">'
            + '<div class="ss-result-eyebrow">' + esc(season.label || 'Season') + ' · results</div>'
            + '<p class="ss-result-headline">' + headline + '</p>' + note
            + (rewards.length ? '<ul class="ss-rewards">' + rewards.map(function (r) {
                return '<li><span>' + esc(r.label) + '</span><strong>+' + Number(r.vaultPoints || 0).toLocaleString('en-US') + ' pts</strong></li>';
              }).join('') + '</ul>' : '')
            + '</div>'
            + '<div class="ss-next"><span class="ss-next-eyebrow">Season 2</span><span>Announced soon. We announce a season before it starts.</span></div>';
          results.hidden = false;
        }
        panel.hidden = false;
        return;
      }

      // Active season.
      var end = VSSeasons.parseDate(season.endsAt);
      if (meta && end) meta.textContent = 'Ends in ' + VSSeasons.fmtDuration(end.getTime() - Date.now());
      if (results) results.hidden = true;

      if (you) {
        var xp = view && view.me ? view.seasonXp : Number(member.season_xp || 0);
        var pos = view && view.me ? '#' + view.position : (rows ? (xp > 0 ? 'Outside the top 100' : 'Not ranked yet') : '—');
        you.innerHTML = '<div class="ss-you-pos"><span class="ss-you-label">Your position</span><strong>' + esc(pos) + '</strong></div>'
          + '<div class="ss-you-pos"><span class="ss-you-label">Season XP</span><strong>' + Number(xp || 0).toLocaleString('en-US') + '</strong></div>';
        you.hidden = false;
      }
      if (list) {
        if (view && view.top.length) {
          var html = view.top.map(standingRow).join('');
          if (view.me && !view.meInTop) html += '<li class="ss-gap" aria-hidden="true">···</li>' + standingRow(view.me);
          list.innerHTML = html;
        } else if (rows) {
          list.innerHTML = '<li class="ss-empty">No one has earned season XP yet. Complete a challenge to take the top spot.</li>';
        } else {
          list.innerHTML = '<li class="ss-empty">Live standings are being prepared. Your season XP above still counts.</li>';
        }
      }

      // Keep a snapshot so the results card can name a final position even
      // after the standings function stops returning the closed season.
      if (view && view.me && season.id) {
        var snaps = Object.assign({}, Prefs.get('season_results') || {});
        var prev = snaps[season.id];
        if (!prev || prev.position !== view.position || prev.season_xp !== view.seasonXp) {
          snaps[season.id] = { position: view.position, season_xp: view.seasonXp, at: new Date().toISOString() };
          Prefs.save({ season_results: snaps });
        }
      }
      participantNudge(member, season);
      panel.hidden = false;
    });
  }

  function renderSeason(member) {
    seasonFeed().then(function (feed) {
      if (!window.VSSeasons) return;
      var season = VSSeasons.pickSeason(feed);
      var phase = VSSeasons.seasonPhase(season, Date.now());
      renderSeasonStrip(season, phase);
      renderStandings(member, season, phase);
    });
  }

  // ── Nearest rival beside the rank bar ──────────────────────────────────
  function renderRival(member) {
    var el = $('nearest-rival');
    if (!el || !window.VSSeasons) return;
    run(function (c) {
      return c.from('public_leaderboard').select('username, points')
        .gt('points', member.points || 0).order('points', { ascending: true }).limit(5);
    }).then(function (res) {
      if (res.error || !Array.isArray(res.data)) { el.hidden = true; return; }
      var rival = VSSeasons.findNearestRival(member.points || 0, res.data, member.username);
      if (!rival) {
        el.innerHTML = '<span aria-hidden="true">👑</span> No one is above you on the Vault Wall.';
      } else {
        var gap = Number(rival.points) - Number(member.points || 0);
        el.innerHTML = '<span aria-hidden="true">🎯</span> <strong>' + gap.toLocaleString('en-US') + ' pts</strong> behind '
          + '<a href="/member/?u=' + encodeURIComponent(rival.username) + '">' + esc(rival.username) + '</a>'
          + ' <span class="vm-rival-hint">· your nearest rival</span>';
      }
      el.hidden = false;
    });
  }

  // ── Your Games ─────────────────────────────────────────────────────────
  function renderYourGames(planKey) {
    var el = $('your-games-content');
    if (!el) return;
    once('registry', function () {
      return fetch('/data/game-registry.json', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }).then(function (registry) {
      var games = registry ? L.buildGameList(registry) : [];
      if (!games.length) {
        el.innerHTML = '<p class="yg-empty">The game list is unavailable right now. <a href="/games/">Browse every game →</a></p>';
        return;
      }
      var isPro = planKey === 'vault_sparked_pro';
      var isSparked = isPro || planKey === 'vault_sparked';
      var perk = isPro
        ? 'VaultSparked Eternal is active: unlimited Ask IGNIS and the Eternal Dispatch ride on top.'
        : isSparked
          ? 'VaultSparked is active: Sparked archive files and beta keys ride on top.'
          : 'Paid tiers never lock a game. <a href="#upgrade">VaultSparked</a> adds member drops on top.';
      el.innerHTML = '<ul class="yg-list">' + games.map(function (g) {
        return '<li class="yg-row">'
          + '<div class="yg-main"><a class="yg-name" href="' + esc(g.page) + '">' + esc(g.name) + '</a>'
          + (g.description ? '<span class="yg-desc">' + esc(g.description) + '</span>' : '') + '</div>'
          + '<span class="yg-status yg-status--' + esc(g.status.key) + '">' + esc(g.status.label) + '</span>'
          + (g.playUrl ? '<a class="yg-play" href="' + esc(g.playUrl) + '" target="_blank" rel="noopener">Play free<span class="vm-sr"> ' + esc(g.name) + ' (opens in a new tab)</span></a>' : '')
          + '</li>';
      }).join('') + '</ul>'
        + '<p class="yg-note"><strong>Every VaultSpark game is free to play.</strong> ' + perk + '</p>';
    });
  }

  // ── Classified teaser (no lore in the HTML) ────────────────────────────
  function renderClassifiedTeaser() {
    var el = $('classified-teaser-content');
    if (!el) return;
    classifiedFiles().then(function (files) {
      if (!files) {
        el.innerHTML = '<p class="ct-locked">The archive is not answering right now. Your clearance is unchanged; try the Classified Archive tab in a moment.</p>';
        return;
      }
      var open = files.filter(function (f) { return !f.locked; })
        .sort(function (a, b) { return (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0); });
      var locked = files.length - open.length;
      if (!open.length) {
        el.innerHTML = '<div class="ct-card ct-card--locked"><div class="ct-tag">🔒 Sealed</div>'
          + '<p class="ct-body">' + (files.length
            ? files.length + (files.length === 1 ? ' classified file is' : ' classified files are') + ' waiting behind your clearance. Rank up to open the first one.'
            : 'No classified files are published yet. Members hear first when one drops.') + '</p></div>';
        return;
      }
      el.innerHTML = '<div class="ct-grid">' + open.slice(0, 2).map(function (f) {
        return '<article class="ct-card">'
          + '<div class="ct-tag">' + esc(f.classification || 'Classified') + '</div>'
          + '<h4 class="ct-title">' + esc(f.title) + '</h4>'
          + '<p class="ct-body">' + esc(L.textExcerpt(f.content_html, 190)) + '</p>'
          + '</article>';
      }).join('') + '</div>'
        + '<p class="ct-meta">' + open.length + ' open to you' + (locked > 0 ? ' · ' + locked + ' still sealed by rank or plan' : '') + '</p>';
    });
  }

  // ── One-tap panel feedback → page_feedback (existing sink) ─────────────
  var FEEDBACK_KEY = 'vs_panel_feedback_v1';
  function readVotes() { try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '{}') || {}; } catch (_) { return {}; } }
  function mountPanelFeedback() {
    var votes = readVotes();
    document.querySelectorAll('[data-panel-feedback]').forEach(function (panel) {
      if (panel.querySelector('.pf-row')) return;
      var key = panel.getAttribute('data-panel-feedback');
      var row = document.createElement('div');
      row.className = 'pf-row';
      if (votes[key]) {
        row.innerHTML = '<span class="pf-thanks">Thanks for the signal.</span>';
      } else {
        row.innerHTML = '<span class="pf-q" id="pf-q-' + esc(key) + '">Was this useful?</span>'
          + '<button type="button" class="pf-btn" data-pf="useful" aria-describedby="pf-q-' + esc(key) + '" aria-label="Yes, useful">👍</button>'
          + '<button type="button" class="pf-btn" data-pf="not_useful" aria-describedby="pf-q-' + esc(key) + '" aria-label="No, not useful">👎</button>';
      }
      row.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-pf]');
        if (!btn) return;
        row.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
        var reaction = btn.getAttribute('data-pf');
        run(function (c) {
          return c.from('page_feedback').insert([{ path: '/vault-member/#' + key, reaction: reaction }]);
        }).then(function (res) {
          if (res.error) {
            row.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
            return;
          }
          var all = readVotes(); all[key] = reaction;
          try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all)); } catch (_) {}
          row.innerHTML = '<span class="pf-thanks" role="status">Thanks for the signal.</span>';
        });
      });
      panel.appendChild(row);
    });
  }

  // ── Vault Command (admin) ──────────────────────────────────────────────
  // The markup lives at /vault-member/admin/vault-command.tpl, behind the
  // edge session gate for /vault-member/admin/, and is fetched only after the
  // server-side is_vault_admin() RPC confirms. View-source of the public
  // portal carries no admin controls. Admin data stays protected server-side.
  var commandMounted = null;
  function wireVaultCommand() {
    function on(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
    function call(name, args) { return function () { if (typeof window[name] === 'function') window[name].apply(window, args || []); }; }
    on('admin-pulse-btn', call('adminPostPulse'));
    on('admin-key-btn', call('adminPostBetaKey'));
    on('admin-file-btn', call('adminPostFile'));
    on('load-analytics-btn', call('loadChallengeAnalytics'));
    on('admin-csv-btn', call('exportMemberCSV'));
    on('admin-push-test-btn', call('adminTestPush'));
    on('fanart-pending-btn', call('loadFanArtQueue', ['pending']));
    on('fanart-approved-btn', call('loadFanArtQueue', ['approved']));
    on('fanart-rejected-btn', call('loadFanArtQueue', ['rejected']));
  }
  function mountVaultCommand() {
    if (commandMounted) return commandMounted;
    commandMounted = fetch('/vault-member/admin/vault-command.tpl', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html || html.indexOf('data-vault-command') === -1) return false;
        var pane = $('dash-pane-admin');
        if (!pane) {
          pane = document.createElement('div');
          pane.className = 'dash-pane';
          pane.id = 'dash-pane-admin';
          var anchor = $('dash-pane-seasonpass');
          if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(pane, anchor);
          else return false;
        }
        pane.innerHTML = html;
        var tabs = document.querySelector('.dash-tabs');
        if (tabs && !$('tab-dash-admin')) {
          var tab = document.createElement('button');
          tab.type = 'button';
          tab.className = 'dash-tab';
          tab.id = 'tab-dash-admin';
          tab.textContent = '⚡ Vault Command';
          tab.addEventListener('click', function () { if (typeof switchDashTab === 'function') switchDashTab('admin'); });
          tabs.appendChild(tab);
        }
        wireVaultCommand();
        return true;
      })
      .catch(function () { return false; });
    return commandMounted;
  }

  // ── Investor nav link: only investors (and the studio account) see it ──
  function syncInvestorLinks(member) {
    rpc('get_my_investor_profile').then(function (res) {
      var isInvestor = !res.error && res.data && !res.data.error;
      if (isInvestor) return;
      return rpc('is_vault_admin').then(function (admin) {
        if (!admin.error && admin.data === true) return;
        document.querySelectorAll('a.dropdown-link-investor, .site-footer a[href="/investor-portal/"]').forEach(function (a) {
          a.hidden = true;
          a.setAttribute('aria-hidden', 'true');
        });
      });
    });
  }

  // ── Entry point, called from showDashboard() (may run twice: cache, then fresh)
  var heavyTimer = null;
  var lightDone = false;
  function onDashboard(member) {
    if (!member || !member._id) return;
    renderRival(member);
    if (!lightDone) {
      lightDone = true;
      mountPanelFeedback();
      syncInvestorLinks(member);
    }
    // Heavy, write-bearing surfaces wait for the fresh member row so the
    // cached pre-render never stamps last_seen or renders stale progress.
    if (heavyTimer) clearTimeout(heavyTimer);
    heavyTimer = setTimeout(function () {
      var m = currentMember() || member;
      renderSinceLastVisit(m);
      renderInitiation(m);
      renderSeason(m);
      renderClassifiedTeaser();
    }, 1400);
  }

  window.VSPortalLoop = {
    prefs: Prefs,
    onDashboard: onDashboard,
    renderYourGames: renderYourGames,
    mountVaultCommand: mountVaultCommand,
    refreshInitiation: function () { var m = currentMember(); if (m) renderInitiation(m); },
    rpc: rpc,
  };
})();
