/* ignis-answer-engine.js — static Ask IGNIS retrieval with citations. */
(function () {
  'use strict';

  var INDEX_URL = '/data/ignis-search-index.json';
  var indexPromise = null;

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function tokens(q) {
    return String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (t) { return t.length > 2; });
  }

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(INDEX_URL, { cache: 'default' }).then(function (r) { return r.json(); }).catch(function () { return { documents: [] }; });
    }
    return indexPromise;
  }

  function answer(query, index) {
    var qTokens = tokens(query);
    if (!qTokens.length) return null;
    var scored = (index.documents || []).map(function (doc) {
      var hay = [doc.title, doc.summary, doc.body, doc.url].join(' ').toLowerCase();
      var score = qTokens.reduce(function (acc, t) { return acc + (hay.indexOf(t) !== -1 ? 1 : 0); }, 0);
      return { doc: doc, score: score };
    }).filter(function (row) { return row.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 4);
    if (!scored.length) return null;
    var top = scored[0].doc;
    return {
      text: top.summary || top.body || ('IGNIS found the strongest public match in ' + top.title + '.'),
      sources: scored.map(function (row) { return row.doc; })
    };
  }

  function ensureStyles() {
    if (document.getElementById('vs-ignis-answer-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-ignis-answer-style';
    s.textContent = '.vs-ask-ignis{margin:2rem 0;padding:1rem;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.035)}.vs-ask-ignis form{display:flex;gap:.6rem;flex-wrap:wrap}.vs-ask-ignis input{flex:1;min-width:220px;border:1px solid var(--line);background:rgba(0,0,0,.18);color:var(--text);border-radius:10px;padding:.8rem;font:inherit}.vs-ask-ignis button{border:0;border-radius:10px;padding:.8rem 1rem;background:linear-gradient(90deg,#ff7a00,#ffc400);font-weight:800;color:#10131f}.vs-ask-ignis__answer{margin-top:1rem;color:var(--muted);line-height:1.65}.vs-ask-ignis__sources{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.7rem}.vs-ask-ignis__sources a{font-size:.78rem;border:1px solid rgba(255,196,0,.25);border-radius:999px;padding:.3rem .65rem;color:var(--gold)}';
    document.head.appendChild(s);
  }

  function mount(root) {
    ensureStyles();
    root.innerHTML = '<div class="vs-ask-ignis"><form><input name="q" placeholder="Ask IGNIS about games, membership, security, feedback, or recent ships…" autocomplete="off"><button type="submit">Ask IGNIS</button></form><div class="vs-ask-ignis__answer" aria-live="polite"></div></div>';
    var form = root.querySelector('form');
    var out = root.querySelector('.vs-ask-ignis__answer');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var q = form.q.value.trim();
      if (!q) return;
      out.textContent = 'Reading public studio memory…';
      loadIndex().then(function (idx) {
        var result = answer(q, idx);
        if (!result) {
          out.innerHTML = 'IGNIS did not find a strong public match yet. Try "membership", "latest ships", "security", "Oracle", or a game name.';
          return;
        }
        out.innerHTML = '<strong>IGNIS read:</strong> ' + esc(result.text) + '<div class="vs-ask-ignis__sources">' + result.sources.map(function (src) {
          return '<a href="' + esc(src.url || '/') + '">' + esc(src.title || src.url || 'source') + '</a>';
        }).join('') + '</div>';
      });
    });
  }

  function boot() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-ask-ignis]'));
    if (!roots.length && (location.pathname.indexOf('/search') === 0 || location.pathname.indexOf('/oracle') === 0)) {
      var main = document.querySelector('main');
      if (main) {
        var wrap = document.createElement('section');
        wrap.className = 'container';
        wrap.id = 'ask-ignis';
        wrap.setAttribute('data-ask-ignis', '');
        main.insertBefore(wrap, main.firstElementChild ? main.firstElementChild.nextSibling : null);
        roots.push(wrap);
      }
    }
    roots.forEach(mount);
  }

  var INSIGHTS_URL = '/api/oracle-insights.json';
  var insightsPromise = null;
  function loadInsights() {
    if (!insightsPromise) {
      insightsPromise = fetch(INSIGHTS_URL, { cache: 'default' }).then(function (r) { return r.json(); }).catch(function () { return { clusters: [] }; });
    }
    return insightsPromise;
  }

  function findCluster(hints, query) {
    var q = String(query || '').toLowerCase();
    var clusters = hints.clusters || [];
    var best = null, bestScore = 0;
    for (var i = 0; i < clusters.length; i++) {
      var c = clusters[i];
      var tokens = c.tokens || [];
      var score = tokens.filter(function (t) { return q.indexOf(t) !== -1; }).length;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return bestScore > 0 ? best : (clusters[0] || null);
  }

  function showHint(el, hint) {
    if (el.querySelector('.vs-ignis-proactive')) return;
    var wrap = document.createElement('div');
    wrap.className = 'vs-ignis-proactive';
    wrap.style.cssText = 'margin-top:.65rem;padding:.5rem .75rem;border-radius:10px;background:rgba(155,140,255,0.07);border:1px solid rgba(155,140,255,0.18);font-size:.8rem;color:#c4bcff;display:flex;align-items:center;gap:.5rem;';
    var label = document.createElement('span');
    label.style.cssText = 'flex:0 0 auto;font-weight:700;color:#9b8cff;';
    label.textContent = 'IGNIS:';
    wrap.appendChild(label);
    if (hint && hint.topDocs && hint.topDocs.length) {
      var doc = hint.topDocs[0];
      var link = document.createElement('a');
      link.href = esc(doc.url || '/');
      link.textContent = doc.title || 'Related page';
      link.style.cssText = 'color:#c4bcff;text-decoration:underline;text-decoration-color:rgba(155,140,255,0.4);flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      wrap.appendChild(link);
    } else {
      var msg = document.createElement('span');
      msg.textContent = 'Ask me about this project';
      msg.style.cssText = 'flex:1 1 auto;';
      wrap.appendChild(msg);
    }
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss IGNIS hint');
    close.textContent = '×';
    close.style.cssText = 'flex:0 0 auto;background:none;border:none;color:#9b8cff;font-size:1rem;cursor:pointer;padding:0;line-height:1;';
    close.addEventListener('click', function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); });
    wrap.appendChild(close);
    el.appendChild(wrap);
  }

  function watchHints() {
    if (!('IntersectionObserver' in window)) return;
    var timers = new WeakMap();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          if (!timers.has(el)) {
            var tid = setTimeout(function () {
              timers.delete(el);
              var hintQuery = el.dataset.ignisHint || '';
              loadInsights().then(function (insights) {
                var cluster = findCluster(insights, hintQuery);
                showHint(el, cluster);
              });
            }, 20000);
            timers.set(el, tid);
          }
        } else {
          if (timers.has(el)) { clearTimeout(timers.get(el)); timers.delete(el); }
        }
      });
    }, { threshold: 0.4 });

    function scanAndObserve() {
      var hinted = Array.prototype.slice.call(document.querySelectorAll('[data-ignis-hint]'));
      hinted.forEach(function (el) { observer.observe(el); });
    }

    scanAndObserve();
    // Re-scan after dynamic cards render (oracle page async)
    setTimeout(scanAndObserve, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Proactive hints — oracle and search pages only.
  (function () {
    var path = location.pathname;
    if (path.indexOf('/oracle') === 0 || path.indexOf('/search') === 0) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchHints);
      else watchHints();
    }
  }());

  window.VSIgnisAnswer = { loadIndex: loadIndex, answer: answer, loadInsights: loadInsights };
})();
