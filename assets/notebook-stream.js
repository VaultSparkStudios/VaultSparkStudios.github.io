/**
 * VaultSpark — Founder Notebook stream.
 *
 * Pulls the most recent ~80 commits from the public website repo via GitHub API,
 * groups them by ISO-week, and renders as a journal stream. Mood inferred from the
 * conventional-commits prefix (feat/fix/chore/docs/etc.).
 *
 * Honest empty state on rate limit or fetch failure. CSP-clean.
 */
(function () {
  'use strict';

  var REPO = 'VaultSparkStudios/VaultSparkStudios.github.io';
  var API = 'https://api.github.com/repos/' + REPO + '/commits?per_page=80';
  var CACHE_KEY = 'vs_notebook_v1';
  var CACHE_TTL_MS = 10 * 60 * 1000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getIsoWeek(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return d.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
  }

  function moodFor(message) {
    var first = message.split('\n')[0].toLowerCase();
    if (/^feat[(:!]/.test(first)) return { cls: 'feat', label: 'Feature' };
    if (/^fix[(:!]/.test(first))  return { cls: 'fix',  label: 'Fix' };
    if (/^chore[(:!]/.test(first)) return { cls: 'meta', label: 'Chore' };
    if (/^docs[(:!]/.test(first))  return { cls: 'meta', label: 'Docs' };
    if (/\bship|\brelease|\blive|\bsparked|\bship/i.test(first)) return { cls: 'ship', label: 'Ship' };
    return { cls: 'meta', label: 'Note' };
  }

  function loadCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
      return parsed.data;
    } catch (_e) { return null; }
  }

  function saveCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data: data })); } catch (_e) {}
  }

  function render(commits) {
    var stream = document.getElementById('nb-stream');
    if (!stream) return;
    if (!commits || !commits.length) {
      stream.innerHTML = '<div class="nb-empty">The forge is between drops. New entries land within hours.</div>';
      return;
    }

    var byWeek = {};
    var weekOrder = [];
    commits.forEach(function (c) {
      var iso = c.commit && c.commit.author && c.commit.author.date;
      if (!iso) return;
      var d = new Date(iso);
      var key = getIsoWeek(d);
      if (!byWeek[key]) { byWeek[key] = { items: [], firstDate: d }; weekOrder.push(key); }
      byWeek[key].items.push({
        sha: c.sha,
        url: c.html_url,
        message: c.commit.message || '',
        date: d,
      });
    });

    var html = weekOrder.map(function (key) {
      var w = byWeek[key];
      var monthLabel = w.firstDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      var weekHtml = '<div class="nb-week">' + esc(monthLabel) + ' · week ' + esc(key.split('-W')[1]) + '</div>';
      var entries = w.items.map(function (item) {
        var msg = item.message.split('\n')[0].replace(/^\w+(\([^)]+\))?:\s*/, '');
        var mood = moodFor(item.message);
        var dateStr = item.date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        return '<article class="nb-entry">' +
          '<div class="nb-meta">' + esc(dateStr) + ' · <a href="' + esc(item.url) + '" target="_blank" rel="noopener">' + esc(item.sha.slice(0, 7)) + '</a></div>' +
          '<div class="nb-msg">' + esc(msg) + ' <span class="nb-mood nb-mood--' + mood.cls + '">' + esc(mood.label) + '</span></div>' +
          '</article>';
      }).join('');
      return weekHtml + entries;
    }).join('');

    stream.innerHTML = html;
  }

  var cached = loadCache();
  if (cached) render(cached);

  fetch(API, { headers: { 'Accept': 'application/vnd.github+json' }, cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('GitHub ' + res.status);
      return res.json();
    })
    .then(function (data) { saveCache(data); render(data); })
    .catch(function (err) {
      if (cached) return;
      var stream = document.getElementById('nb-stream');
      if (stream) stream.innerHTML = '<div class="nb-empty">Couldn\'t reach the forge ledger right now (' + esc(err.message) + '). Try again in a moment.</div>';
    });
})();
