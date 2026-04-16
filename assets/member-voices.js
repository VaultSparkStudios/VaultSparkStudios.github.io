/*
 * member-voices.js — Testimonials + outcomes module for /membership/.
 *
 * Loads curated opt-in member quotes from data/member-voices.json and renders
 * them into any element with [data-member-voices]. Honest empty state when
 * no quotes exist — the page never fabricates members or outcomes.
 *
 * Also renders:
 *   [data-member-outcomes]     — avg-time-in-vault / member count / sparked count / challenges
 *   [data-rank-distribution]   — small rank-distribution bar from VSPublic
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

  function fmtInt(n) {
    n = Number(n);
    if (!isFinite(n) || n < 0) return '—';
    return n.toLocaleString();
  }

  function pluralize(n, word) {
    n = Number(n);
    if (!isFinite(n) || n === 1) return n + ' ' + word;
    return n + ' ' + word + 's';
  }

  function renderVoices(root, voices) {
    if (!root) return;
    if (!Array.isArray(voices) || voices.length === 0) {
      root.innerHTML = [
        '<div class="mv-empty" role="status">',
        '  <span class="mv-empty-eyebrow">Genesis voices — coming online</span>',
        '  <p class="mv-empty-body">No public member quotes yet. Members can opt in from their portal settings. Be one of the first voices in the vault.</p>',
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
    try {
      var res = await fetch(VOICES_URL, { cache: 'no-cache' });
      if (!res.ok) return [];
      var data = await res.json();
      return Array.isArray(data.voices) ? data.voices : [];
    } catch (e) {
      return [];
    }
  }

  async function renderOutcomes(root) {
    if (!root) return;
    var stats = { members: null, sparked: null, challenges: null, achievements: null };
    try {
      if (window.VSPublic && typeof window.VSPublic.getMemberCounts === 'function') {
        var counts = await window.VSPublic.getMemberCounts();
        if (counts) {
          stats.members = counts.members;
          stats.sparked = counts.sparked;
          stats.challenges = counts.challenges;
          stats.achievements = counts.achievements;
        }
      }
    } catch (e) { /* silent — honest fallback below */ }

    var items = [
      { label: 'Vault Members',       value: stats.members },
      { label: 'VaultSparked',        value: stats.sparked },
      { label: 'Challenges Complete', value: stats.challenges },
      { label: 'Achievements Earned', value: stats.achievements }
    ];
    var hasAny = items.some(function (i) { return i.value != null; });

    if (!hasAny) {
      root.innerHTML = [
        '<div class="mv-outcomes-empty">',
        '  <p>Live member outcomes come online once the public intelligence feed resolves. If this panel stays empty, the feed is temporarily offline — nothing is faked.</p>',
        '</div>'
      ].join('\n');
      root.setAttribute('data-state', 'empty');
      return;
    }

    var cells = items.map(function (i) {
      return [
        '<div class="portal-stat">',
        '  <span class="portal-stat-value">' + (i.value == null ? '—' : fmtInt(i.value)) + '</span>',
        '  <span class="portal-stat-label">' + esc(i.label) + '</span>',
        '</div>'
      ].join('');
    }).join('');
    root.innerHTML = '<div class="mv-outcomes-grid portal-grid-4">' + cells + '</div>';
    root.setAttribute('data-state', 'ready');
  }

  async function renderRankDistribution(root) {
    if (!root) return;
    try {
      if (window.VSPublic && typeof window.VSPublic.getRankDistribution === 'function') {
        var dist = await window.VSPublic.getRankDistribution();
        if (Array.isArray(dist) && dist.length) {
          var total = dist.reduce(function (a, b) { return a + (b.count || 0); }, 0);
          if (total > 0) {
            var segs = dist.map(function (d) {
              var pct = (d.count / total) * 100;
              if (pct < 0.5) return '';
              return '<span class="mv-rank-seg" style="width:' + pct.toFixed(2) + '%;background:' + (d.color || 'var(--portal-accent)') + ';" title="' + esc(d.rank || '') + ': ' + pluralize(d.count, 'member') + '"></span>';
            }).join('');
            root.innerHTML = [
              '<div class="mv-rank-dist" role="img" aria-label="Rank distribution across the vault">' + segs + '</div>',
              '<p class="mv-rank-caption">Distribution across ' + pluralize(total, 'Vault Member') + '.</p>'
            ].join('');
            root.setAttribute('data-state', 'ready');
            return;
          }
        }
      }
    } catch (e) { /* silent */ }
    root.innerHTML = '<p class="mv-rank-caption">Live rank distribution resolves after public intelligence loads.</p>';
    root.setAttribute('data-state', 'empty');
  }

  async function init() {
    var voicesRoot = document.querySelector('[data-member-voices]');
    var outcomesRoot = document.querySelector('[data-member-outcomes]');
    var rankRoot = document.querySelector('[data-rank-distribution]');

    if (voicesRoot) {
      var voices = await loadVoices();
      renderVoices(voicesRoot, voices);
    }
    if (outcomesRoot) renderOutcomes(outcomesRoot);
    if (rankRoot) renderRankDistribution(rankRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
