/* you-asked-shipped.js — close the feedback loop in public (S195 item 4).
 *
 * The studio already records feedback themes AND the commits that resolved them
 * in api/ship-receipts.json (each receipt carries feedbackSignals + the commits
 * shipped for that theme). This surface simply draws the line a visitor never
 * sees: "you asked (N signals) → we shipped (these changes)". It turns the
 * changelog from a list of changes into proof the studio listens.
 *
 * Public-safe: receipts carry no raw feedback text, only aggregate counts +
 * commit summaries. Honest-dark: renders nothing if no themed receipt has a
 * feedback signal. DOM built node-by-node (Trusted-Types-safe, no innerHTML).
 */
(function () {
  'use strict';

  function ago(ts) {
    var t = Date.parse(ts);
    if (!t) return '';
    var s = (Date.now() - t) / 1000;
    if (s < 86400) return 'today';
    var d = Math.round(s / 86400);
    if (d < 14) return d + 'd ago';
    if (d < 60) return Math.round(d / 7) + 'w ago';
    return Math.round(d / 30) + 'mo ago';
  }

  function ensureStyles() {
    if (document.getElementById('vs-yas-style')) return;
    var s = document.createElement('style');
    s.id = 'vs-yas-style';
    s.textContent =
      '.vs-yas{margin:2.5rem 0;padding:1.4rem;border:1px solid var(--line,rgba(255,255,255,.08));border-radius:18px;background:linear-gradient(135deg,rgba(255,196,0,.05),rgba(126,201,255,.03))}' +
      '.vs-yas__eyebrow{font-size:.7rem;text-transform:uppercase;letter-spacing:.09em;color:var(--gold,#ffc400);font-weight:700}' +
      '.vs-yas__title{font-family:Georgia,serif;font-size:1.4rem;margin:.3rem 0 1rem}' +
      '.vs-yas__row{display:flex;align-items:flex-start;gap:.8rem;padding:.75rem 0;border-top:1px solid var(--line,rgba(255,255,255,.06))}' +
      '.vs-yas__ask{flex:0 0 auto;min-width:120px}' +
      '.vs-yas__ask-k{display:block;font-size:.72rem;color:var(--dim,#6272a0);text-transform:uppercase;letter-spacing:.06em}' +
      '.vs-yas__theme{font-weight:700;color:var(--text,#eef2ff)}' +
      '.vs-yas__signals{font-size:.78rem;color:var(--muted,#a8b4d0)}' +
      '.vs-yas__arrow{flex:0 0 auto;color:var(--gold,#ffc400);align-self:center;font-weight:700}' +
      '.vs-yas__ships{flex:1 1 auto;min-width:0}' +
      '.vs-yas__ship{font-size:.86rem;color:var(--muted,#a8b4d0);line-height:1.5}' +
      '.vs-yas__ship-when{color:var(--dim,#6272a0);font-size:.76rem}';
    document.head.appendChild(s);
  }

  function row(rec) {
    var r = document.createElement('div');
    r.className = 'vs-yas__row';

    var ask = document.createElement('div');
    ask.className = 'vs-yas__ask';
    var ak = document.createElement('span');
    ak.className = 'vs-yas__ask-k';
    ak.textContent = 'You asked';
    var theme = document.createElement('div');
    theme.className = 'vs-yas__theme';
    theme.textContent = rec.label || rec.theme || 'Feedback';
    var sig = document.createElement('div');
    sig.className = 'vs-yas__signals';
    var n = rec.feedbackSignals || 0;
    sig.textContent = n + (n === 1 ? ' signal' : ' signals');
    ask.appendChild(ak);
    ask.appendChild(theme);
    ask.appendChild(sig);

    var arrow = document.createElement('div');
    arrow.className = 'vs-yas__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';

    var ships = document.createElement('div');
    ships.className = 'vs-yas__ships';
    (rec.shippedCommits || []).slice(0, 3).forEach(function (c) {
      var s = document.createElement('div');
      s.className = 'vs-yas__ship';
      s.appendChild(document.createTextNode('✦ ' + (c.summary || 'shipped') + ' '));
      var when = ago(c.ts);
      if (when) {
        var w = document.createElement('span');
        w.className = 'vs-yas__ship-when';
        w.textContent = '· ' + when;
        s.appendChild(w);
      }
      ships.appendChild(s);
    });

    r.appendChild(ask);
    r.appendChild(arrow);
    r.appendChild(ships);
    return r;
  }

  function mount(root) {
    // S277: the box is SSR'd at build time (build-you-asked-shipped.mjs) so it is
    // present at first paint — zero CLS. When that box exists this script is a no-op;
    // the fetch/inject path below stays only as the honest-dark fallback for a mount
    // that shipped without SSR (e.g. a new consumer page).
    if (root.querySelector('[data-yas-ssr]')) return;
    ensureStyles();
    fetch('/api/ship-receipts.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var recs = ((data && data.receipts) || []).filter(function (rec) {
          return (rec.feedbackSignals || 0) > 0 && (rec.shippedCommits || []).length > 0;
        });
        // Most-asked first; cap at the strongest 5 loops.
        recs.sort(function (a, b) { return (b.feedbackSignals || 0) - (a.feedbackSignals || 0); });
        recs = recs.slice(0, 5);
        if (!recs.length) {
          if (root.parentNode && !root.hasAttribute('data-yas-keep')) root.parentNode.removeChild(root);
          return;
        }
        var box = document.createElement('section');
        box.className = 'vs-yas';
        var eb = document.createElement('div');
        eb.className = 'vs-yas__eyebrow';
        eb.textContent = 'Closed loops';
        var title = document.createElement('h2');
        title.className = 'vs-yas__title';
        title.textContent = 'You asked → we shipped.';
        box.appendChild(eb);
        box.appendChild(title);
        recs.forEach(function (rec) { box.appendChild(row(rec)); });
        root.appendChild(box);
      })
      .catch(function () {
        if (root.parentNode && !root.hasAttribute('data-yas-keep')) root.parentNode.removeChild(root);
      });
  }

  function boot() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-you-asked-shipped]'));
    roots.forEach(mount);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
