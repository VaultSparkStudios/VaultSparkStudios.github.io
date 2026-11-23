/*
 * member-voices.js — Testimonials + outcomes module for /membership/.
 *
 * Loads curated opt-in member quotes from data/member-voices.json and renders
 * them into any element with [data-member-voices]. Honest empty state when
 * no quotes exist — the page never fabricates members or outcomes.
 *
 * Also renders:
 *   [data-member-outcomes]     — existing anonymous public aggregate reads; unknown achievements stay —
 *   [data-rank-distribution]   — returned public leaderboard points, ranked by VSMembership
 *
 * Loads defer-style after DOMContentLoaded. Idempotent — safe to re-run.
 */

(function () {
  'use strict';

  var VOICES_URL = '/data/member-voices.json';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderVoices(root, voices) {
    if (!root) return;
    if (voices === null) {
      root.innerHTML = '<p class="mv-empty-body" role="status">Public member quotes are unavailable right now. Try reloading this page.</p>';
      root.setAttribute('data-state', 'unavailable');
      return;
    }
    if (!Array.isArray(voices) || voices.length === 0) {
      root.innerHTML = [
        '<div class="mv-empty" role="status">',
        '  <span class="mv-empty-eyebrow">Genesis voices — coming online</span>',
        '  <p class="mv-empty-body">No public member quotes are published here yet.</p>',
        '  <a class="button-secondary" href="/vault-member/#settings">Open Portal Settings</a>',
        '</div>'
      ].join('\n');
      root.setAttribute('data-state', 'empty');
      return;
    }
    var cards = voices.map(function (v) {
      var quote = esc(v.quote || '');
      var name = esc(v.name || 'Vault Member');
      var rank = esc(v.rank || '');
      var since = esc(v.memberSince || '');
      var game = esc(v.game || '');
      var metaParts = [];
      if (rank) metaParts.push('<span class="mv-meta-rank">' + rank + '</span>');
      if (since) metaParts.push('<span class="mv-meta-since">Member since ' + since + '</span>');
      if (game) metaParts.push('<span class="mv-meta-game">' + game + '</span>');
      return [
        '<figure class="mv-card portal-card portal-card--tight">',
        '  <blockquote class="mv-quote">' + quote + '</blockquote>',
        '  <figcaption class="mv-caption">',
        '    <strong class="mv-name">' + name + '</strong>',
        '    <span class="mv-meta">' + metaParts.join(' · ') + '</span>',
        '  </figcaption>',
        '</figure>'
      ].join('\n');
    }).join('\n');
    root.innerHTML = '<div class="mv-grid">' + cards + '</div>';
    root.setAttribute('data-state', 'ready');
  }

  async function loadVoices() {
    var timer;
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    try {
      return await Promise.race([
        fetch(VOICES_URL, { cache: 'no-cache', signal: controller ? controller.signal : undefined }).then(function (res) {
          if (!res.ok) throw new Error('quotes_unavailable');
          return res.json();
        }).then(function (data) {
          if (!data || !Array.isArray(data.voices)) throw new Error('quotes_unavailable');
          return data.voices;
        }),
        new Promise(function (_, reject) { timer = setTimeout(function () {
          if (controller) controller.abort();
          reject(new Error('quotes_timeout'));
        }, 8000); })
      ]);
    } catch (e) {
      return null;
    } finally { clearTimeout(timer); }
  }

  function metricRead(promise) {
    var timer;
    return Promise.race([Promise.resolve(promise), new Promise(function (resolve) {
      timer = setTimeout(function () { resolve(null); }, 8000);
    })]).catch(function () { return null; }).finally(function () { clearTimeout(timer); });
  }

  function loadMetrics() {
    if (!window.VSPublic || typeof window.VSPublic.from !== 'function') return Promise.resolve([]);
    try {
      return Promise.all([
        metricRead(window.VSPublic.from('public_leaderboard').select('id').count().get()),
        metricRead(window.VSPublic.from('public_leaderboard').select('id').eq('is_sparked', true).count().get()),
        metricRead(window.VSPublic.from('challenge_submissions').select('id').count().get()),
        metricRead(window.VSPublic.from('public_leaderboard').select('points').get())
      ]);
    } catch (_) { return Promise.resolve([]); }
  }

  function countValue(result) {
    return result && !result.error && Number.isSafeInteger(result.count) && result.count >= 0 ? result.count : null;
  }

  function renderOutcomes(root, results) {
    if (!root) return;
    var items = [
      { label: 'Vault Members', value: countValue(results[0]) },
      { label: 'VaultSparked', value: countValue(results[1]) },
      { label: 'Challenge submissions', value: countValue(results[2]) },
      { label: 'Achievements Earned', value: null }
    ];
    if (!items.some(function (item) { return item.value !== null; })) {
      root.innerHTML = '<p class="mv-empty-body" role="status">Member outcome metrics are unavailable right now. Try reloading this page.</p>';
      root.setAttribute('data-state', 'unavailable');
      return;
    }
    root.innerHTML = '<div class="mv-outcomes-grid portal-grid-4">' + items.map(function (item) {
      return '<div class="portal-stat"><span class="portal-stat-value">' + (item.value === null ? '—' : item.value.toLocaleString()) + '</span><span class="portal-stat-label">' + item.label + '</span></div>';
    }).join('') + '</div><p class="mv-rank-caption">Counts cover public leaderboard members and challenge submissions. Unavailable metrics are shown as —.</p>';
    root.setAttribute('data-state', 'ready');
  }

  async function renderRankDistribution(root, results) {
    if (!root) return;
    var rows = results[3] && !results[3].error && Array.isArray(results[3].data) ? results[3].data : null;
    var unavailable = function () {
      root.innerHTML = '<p class="mv-rank-caption" role="status">Member rank distribution is unavailable right now. Try reloading this page.</p>';
      root.setAttribute('data-state', 'unavailable');
    };
    if (!rows || rows.some(function (row) { return !row || typeof row.points !== 'number' || !Number.isFinite(row.points) || row.points < 0; })) { unavailable(); return; }
    if (!rows.length) {
      root.innerHTML = '<p class="mv-rank-caption">No public leaderboard records are available for a rank distribution.</p>';
      root.setAttribute('data-state', 'empty');
      return;
    }
    try {
      var authority = await metricRead(window.VSMembership ? Promise.resolve(window.VSMembership) : import('/assets/membership-access.js').then(function () { return window.VSMembership; }));
      if (!authority || !authority.config || !Array.isArray(authority.config.ranks) || !Array.isArray(authority.config.rankThresholds) || authority.config.ranks.length !== authority.config.rankThresholds.length || !authority.config.ranks.length || typeof authority.getRankIndex !== 'function') { unavailable(); return; }
      var counts = authority.config.ranks.map(function () { return 0; });
      for (var i = 0; i < rows.length; i++) {
        var index = authority.getRankIndex(rows[i].points);
        if (!Number.isSafeInteger(index) || index < 0 || index >= counts.length) { unavailable(); return; }
        counts[index]++;
      }
      var total = rows.length;
      root.innerHTML = '<div class="mv-rank-dist" role="img" aria-label="Rank distribution of returned public leaderboard records">' + authority.config.ranks.map(function (rank, index) {
        if (!counts[index]) return '';
        return '<span class="mv-rank-seg" style="width:' + (counts[index] / total * 100).toFixed(2) + '%;background:var(--gold,#d4af37);" title="' + esc(rank.label) + ': ' + counts[index] + '"></span>';
      }).join('') + '</div><p class="mv-rank-caption">Rank distribution for ' + total.toLocaleString() + ' returned public leaderboard records.</p><ul class="mv-rank-caption">' + authority.config.ranks.map(function (rank,index) { return counts[index] ? '<li>' + esc(rank.label) + ': ' + counts[index] + '</li>' : ''; }).join('') + '</ul>';
      root.setAttribute('data-state', 'ready');
    } catch (_) { unavailable(); }
  }


  async function init() {
    var voicesRoot = document.querySelector('[data-member-voices]');
    var outcomesRoot = document.querySelector('[data-member-outcomes]');
    var rankRoot = document.querySelector('[data-rank-distribution]');

    // Existing public aggregate/points reads run independently of curated quotes.
    if (outcomesRoot || rankRoot) {
      var metrics = loadMetrics();
      if (outcomesRoot) metrics.then(function (results) { renderOutcomes(outcomesRoot, results); });
      if (rankRoot) metrics.then(function (results) { renderRankDistribution(rankRoot, results); });
    }
    if (voicesRoot) {
      var voices = await loadVoices();
      renderVoices(voicesRoot, voices);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
