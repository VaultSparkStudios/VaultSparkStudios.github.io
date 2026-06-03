/*
 * seasons-rivals.js — Seasons countdown + nearest-rival callout (S83).
 *
 * Reads /data/seasons.json for the active season window. Renders:
 *   [data-season-countdown]  — live countdown to season end + season label
 *   [data-nearest-rival]     — "You're N points behind {rival}" callout
 *                              (only if VSPublic session + current-user
 *                              profile + leaderboard are available)
 *
 * Honest empty state when no active season is declared or no rival
 * can be computed. No fabricated rivals.
 */

(function () {
  'use strict';

  var SEASONS_URL = '/data/seasons.json';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function parseDate(s) {
    if (!s) return null;
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDuration(ms) {
    if (ms <= 0) return 'Season ended';
    var secs = Math.floor(ms / 1000);
    var days = Math.floor(secs / 86400);
    var hrs  = Math.floor((secs % 86400) / 3600);
    var mins = Math.floor((secs % 3600) / 60);
    if (days >= 2) return days + 'd ' + pad(hrs) + 'h';
    if (days >= 1) return days + 'd ' + pad(hrs) + 'h ' + pad(mins) + 'm';
    return pad(hrs) + 'h ' + pad(mins) + 'm';
  }

  function renderCountdown(root, season) {
    if (!root) return;
    if (!season || !season.active) {
      root.innerHTML = [
        '<div class="sc-inactive">',
        '  <span class="sc-eyebrow">Seasons</span>',
        '  <p class="sc-inactive-body">No active season. The next vault season launches when the studio ships its next season arc — we announce before it starts, we don\u2019t backdate.</p>',
        '</div>'
      ].join('\n');
      root.setAttribute('data-state', 'inactive');
      return;
    }
    var end = parseDate(season.endsAt);
    if (!end) {
      root.innerHTML = '<p class="sc-inactive-body">Season end date malformed.</p>';
      root.setAttribute('data-state', 'error');
      return;
    }
    var label = esc(season.label || 'Current Season');
    var tagline = esc(season.tagline || '');
    root.innerHTML = [
      '<div class="sc-card">',
      '  <span class="sc-eyebrow">' + label + '</span>',
      tagline ? '  <p class="sc-tagline">' + tagline + '</p>' : '',
      '  <div class="sc-count" data-sc-count aria-live="polite">—</div>',
      '  <p class="sc-ends">Ends ' + esc(end.toUTCString().replace(/ GMT$/, ' UTC')) + '</p>',
      '</div>'
    ].join('\n');
    root.setAttribute('data-state', 'active');

    var countEl = root.querySelector('[data-sc-count]');
    function tick() {
      var ms = end.getTime() - Date.now();
      countEl.textContent = fmtDuration(ms);
      if (ms <= 0) clearInterval(handle);
    }
    tick();
    var handle = setInterval(tick, 60 * 1000); // minute ticks are plenty
  }

  async function loadSeasons() {
    try {
      var res = await fetch(SEASONS_URL, { cache: 'no-cache' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function renderRival(root, me, leaderboard) {
    if (!root) return;
    if (!me || !Array.isArray(leaderboard) || leaderboard.length === 0) {
      root.innerHTML = [
        '<div class="sr-anon">',
        '  <p>Sign in to see your nearest rival. The vault ranks every member — you always have someone one rung up to chase.</p>',
        '  <a class="button-secondary" href="/vault-member/#login">Sign In</a>',
        '</div>'
      ].join('\n');
      root.setAttribute('data-state', 'anon');
      return;
    }
    var mePts = Number(me.vault_points || me.points || 0);
    // find leaderboard entry with smallest positive delta above me
    var rival = null;
    for (var i = 0; i < leaderboard.length; i++) {
      var row = leaderboard[i];
      var pts = Number(row.vault_points || row.points || 0);
      if (pts <= mePts) continue;
      if (!rival || pts < Number(rival.vault_points || rival.points || 0)) rival = row;
    }
    if (!rival) {
      root.innerHTML = [
        '<div class="sr-top">',
        '  <span class="sr-eyebrow">Top of the Vault</span>',
        '  <p>No rival above you. You\u2019re leading the vault. The studio will try harder to ship something that humbles you.</p>',
        '</div>'
      ].join('\n');
      root.setAttribute('data-state', 'top');
      return;
    }
    var rivalPts = Number(rival.vault_points || rival.points || 0);
    var delta = rivalPts - mePts;
    root.innerHTML = [
      '<div class="sr-card">',
      '  <span class="sr-eyebrow">Nearest Rival</span>',
      '  <p class="sr-body">You\u2019re <strong>' + delta.toLocaleString() + '</strong> points behind <strong>' + esc(rival.username || 'Vault Member') + '</strong>.</p>',
      '  <p class="sr-rank">' + esc(rival.rank_title || '') + '</p>',
      '</div>'
    ].join('\n');
    root.setAttribute('data-state', 'ready');
  }

  async function resolveUserAndBoard() {
    // Guarded: only attempts if VSPublic exposes the needed helpers.
    if (!window.VSPublic) return { me: null, board: [] };
    var me = null, board = [];
    try {
      if (typeof window.VSPublic.getCurrentMember === 'function') {
        me = await window.VSPublic.getCurrentMember();
      }
    } catch (e) { /* silent */ }
    try {
      if (typeof window.VSPublic.getLeaderboard === 'function') {
        board = await window.VSPublic.getLeaderboard({ limit: 50 }) || [];
      }
    } catch (e) { /* silent */ }
    return { me: me, board: board };
  }

  async function init() {
    var cdRoot = document.querySelector('[data-season-countdown]');
    var rivalRoot = document.querySelector('[data-nearest-rival]');

    if (cdRoot) {
      var seasons = await loadSeasons();
      var active = null;
      if (seasons && Array.isArray(seasons.seasons)) {
        active = seasons.seasons.find(function (s) { return s && s.active; }) || null;
      }
      renderCountdown(cdRoot, active);
    }

    if (rivalRoot) {
      var ctx = await resolveUserAndBoard();
      renderRival(rivalRoot, ctx.me, ctx.board);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
