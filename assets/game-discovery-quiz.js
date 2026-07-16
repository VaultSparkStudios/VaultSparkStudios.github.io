/**
 * game-discovery-quiz.js — S211 Wave 6
 * 3-question quiz on /games/ that routes visitors to the best-fit game.
 * Self-mounts on [data-game-discovery-quiz] containers.
 */
(function () {
  'use strict';

  var QUESTIONS = [
    {
      text: 'What kind of session do you want right now?',
      opts: [
        { label: 'Quick chaos — I want to jump in and laugh',      scores: { cod: 3, fgm: 0, forge: 0 } },
        { label: 'Deep strategy — decisions that matter',           scores: { cod: 0, fgm: 3, forge: 0 } },
        { label: 'Preview what\'s coming — curious about the Forge', scores: { cod: 0, fgm: 0, forge: 3 } },
      ],
    },
    {
      text: 'How do you like your games?',
      opts: [
        { label: 'Fast and funny, easy to pick up',                 scores: { cod: 2, fgm: 1, forge: 0 } },
        { label: 'Deep systems, long-term mastery',                  scores: { cod: 0, fgm: 3, forge: 1 } },
        { label: 'Fresh concepts, I\'m here early',                  scores: { cod: 1, fgm: 1, forge: 3 } },
      ],
    },
    {
      text: 'What matters most right now?',
      opts: [
        { label: 'Play immediately, no setup',                       scores: { cod: 3, fgm: 1, forge: 0 } },
        { label: 'Numbers, builds, and long-run strategy',           scores: { cod: 0, fgm: 3, forge: 1 } },
        { label: 'Being an early supporter of what\'s in progress',  scores: { cod: 1, fgm: 1, forge: 3 } },
      ],
    },
  ];

  var RESULTS = {
    cod: {
      label: 'Call of Doodie',
      tagline: 'Fast, funny, and free — browser action, zero install.',
      url: '/games/call-of-doodie/',
      cta: 'Play now →',
      genre: 'action',
      filter: 'sparked',
    },
    fgm: {
      label: 'Franchise Architect',
      tagline: 'Build your dynasty, manage every decision, own the season.',
      url: '/games/vaultspark-football-gm/',
      cta: 'Play now →',
      genre: 'sports',
      filter: 'sparked',
    },
    forge: {
      label: 'The Forge',
      tagline: 'Four worlds in progress — strategy, survival, roguelite, puzzle. Watch them build.',
      url: null,
      cta: 'See what\'s coming →',
      genre: null,
      filter: 'forge',
    },
  };

  function emitUx(name) {
    try {
      var body = JSON.stringify({ route: location.pathname || '/', ux: name });
      if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
    } catch (_) {}
  }

  function triggerFilter(filterVal) {
    var btn = document.querySelector('.filter-btn[data-filter="' + filterVal + '"]');
    if (btn) btn.click();
    var catalog = document.getElementById('catalog');
    if (catalog) catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function mount(container) {
    if (!container || container.dataset.quizMounted) return;
    container.dataset.quizMounted = 'true';

    var answers = [];
    var scores = { cod: 0, fgm: 0, forge: 0 };

    // Inject styles once
    if (!document.getElementById('vs-quiz-styles')) {
      var s = document.createElement('style');
      s.id = 'vs-quiz-styles';
      s.textContent =
        '.vs-quiz{padding:1.6rem 0;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}' +
        '.vs-quiz__eyebrow{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--gold,#ffc400);margin-bottom:.7rem}' +
        '.vs-quiz__question{font-size:1.1rem;font-weight:600;margin-bottom:1rem;line-height:1.4}' +
        '.vs-quiz__opts{display:flex;flex-direction:column;gap:.55rem}' +
        '.vs-quiz__opt{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:.75rem 1.1rem;text-align:left;color:var(--text,#eef2ff);font:inherit;font-size:.92rem;cursor:pointer;transition:background .15s,border-color .15s;line-height:1.45}' +
        '.vs-quiz__opt:hover{background:rgba(255,196,0,.07);border-color:rgba(255,196,0,.3)}' +
        '.vs-quiz__progress{display:flex;gap:.35rem;margin-bottom:1.1rem}' +
        '.vs-quiz__dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.15);transition:background .2s}' +
        '.vs-quiz__dot--done{background:var(--gold,#ffc400)}' +
        '.vs-quiz__dot--active{background:rgba(255,196,0,.45)}' +
        '.vs-quiz__result{border:1px solid rgba(255,196,0,.25);border-radius:16px;padding:1.3rem 1.5rem;background:rgba(255,196,0,.05)}' +
        '.vs-quiz__result-label{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--gold,#ffc400);margin-bottom:.35rem}' +
        '.vs-quiz__result-title{font-size:1.35rem;font-weight:700;margin-bottom:.4rem}' +
        '.vs-quiz__result-tagline{font-size:.92rem;color:var(--muted,#a8b4d0);margin-bottom:1rem;line-height:1.6}' +
        '.vs-quiz__result-actions{display:flex;gap:.7rem;flex-wrap:wrap;align-items:center}' +
        '.vs-quiz__cta{display:inline-flex;align-items:center;padding:.6rem 1.3rem;min-height:44px;border-radius:999px;background:var(--gold,#ffc400);color:#07080f;font-weight:800;font-size:.88rem;text-decoration:none;transition:opacity .15s}' +
        '.vs-quiz__cta:hover{opacity:.88}' +
        '.vs-quiz__retry{background:none;border:1px solid rgba(255,255,255,.12);border-radius:999px;color:var(--muted,#a8b4d0);font:inherit;font-size:.82rem;cursor:pointer;padding:.5rem .95rem;min-height:44px;display:inline-flex;align-items:center}' +
        '.vs-quiz__retry:hover{border-color:rgba(255,255,255,.26);color:var(--text,#eef2ff)}' +
        '@media(min-width:640px){.vs-quiz__opts{flex-direction:row;flex-wrap:wrap}.vs-quiz__opt{flex:1;min-width:200px}}';
      document.head.appendChild(s);
    }

    function renderQuestion(qIdx) {
      container.innerHTML = '';
      var q = QUESTIONS[qIdx];

      var eyebrow = document.createElement('div');
      eyebrow.className = 'vs-quiz__eyebrow';
      eyebrow.textContent = 'Find your game';
      container.appendChild(eyebrow);

      var progress = document.createElement('div');
      progress.className = 'vs-quiz__progress';
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-label', 'Question ' + (qIdx + 1) + ' of ' + QUESTIONS.length);
      QUESTIONS.forEach(function (_, i) {
        var dot = document.createElement('span');
        dot.className = 'vs-quiz__dot' +
          (i < qIdx ? ' vs-quiz__dot--done' : i === qIdx ? ' vs-quiz__dot--active' : '');
        progress.appendChild(dot);
      });
      container.appendChild(progress);

      var qEl = document.createElement('div');
      qEl.className = 'vs-quiz__question';
      qEl.textContent = q.text;
      container.appendChild(qEl);

      var opts = document.createElement('div');
      opts.className = 'vs-quiz__opts';
      q.opts.forEach(function (opt, oi) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vs-quiz__opt';
        btn.textContent = opt.label;
        btn.addEventListener('click', function () {
          answers.push(oi);
          Object.keys(opt.scores).forEach(function (k) { scores[k] += opt.scores[k]; });
          emitUx('quiz:answer');
          if (qIdx + 1 < QUESTIONS.length) {
            renderQuestion(qIdx + 1);
          } else {
            renderResult();
          }
        });
        opts.appendChild(btn);
      });
      container.appendChild(opts);
    }

    function renderResult() {
      var winner = Object.keys(scores).reduce(function (best, k) {
        return scores[k] > scores[best] ? k : best;
      }, 'cod');
      var result = RESULTS[winner];

      container.innerHTML = '';

      var wrap = document.createElement('div');
      wrap.className = 'vs-quiz__result';

      var rlabel = document.createElement('div');
      rlabel.className = 'vs-quiz__result-label';
      rlabel.textContent = 'Your match';
      wrap.appendChild(rlabel);

      var title = document.createElement('div');
      title.className = 'vs-quiz__result-title';
      title.textContent = result.label;
      wrap.appendChild(title);

      var tagline = document.createElement('div');
      tagline.className = 'vs-quiz__result-tagline';
      tagline.textContent = result.tagline;
      wrap.appendChild(tagline);

      var actions = document.createElement('div');
      actions.className = 'vs-quiz__result-actions';

      if (result.url) {
        var cta = document.createElement('a');
        cta.href = result.url;
        cta.className = 'vs-quiz__cta';
        cta.textContent = result.cta;
        actions.appendChild(cta);
      }

      // Scroll + filter catalog to the matching games
      var catalogBtn = document.createElement('button');
      catalogBtn.type = 'button';
      catalogBtn.className = result.url ? 'vs-quiz__retry' : 'vs-quiz__cta';
      catalogBtn.textContent = result.url ? 'Browse the catalog →' : result.cta;
      catalogBtn.addEventListener('click', function () {
        emitUx('quiz:catalog_scroll');
        triggerFilter(result.filter);
      });
      actions.appendChild(catalogBtn);

      var retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'vs-quiz__retry';
      retry.textContent = 'Start over';
      retry.addEventListener('click', function () {
        answers = []; scores = { cod: 0, fgm: 0, forge: 0 };
        emitUx('quiz:restart');
        renderQuestion(0);
      });
      actions.appendChild(retry);

      wrap.appendChild(actions);
      container.appendChild(wrap);

      emitUx('quiz:complete');
      // S229: broadcast quiz completion so push-subscribe.js can show a contextual prompt.
      try { document.dispatchEvent(new CustomEvent('vs:quiz-complete', { detail: { topGame: winner } })); } catch (_) {}
    }

    // S212: personalization — pre-select first-question option based on last game.
    // Reads vs_last_game set by ambient-loader on game page visits.
    var lastGame = null;
    try { lastGame = localStorage.getItem('vs_last_game'); } catch (_) {}
    var personalized = lastGame && scores[lastGame] === 0 &&
      QUESTIONS[0].opts.some(function (o) { return o.scores[lastGame] === Math.max.apply(null, Object.values(o.scores)); });

    emitUx('quiz:shown');
    if (personalized) { emitUx('quiz:personalized'); }

    function renderQuestionPersonalized(qIdx) {
      renderQuestion(qIdx);
      if (qIdx === 0 && personalized) {
        // After render, highlight the pre-matched option and add 'Based on your last game' label.
        var optBtns = container.querySelectorAll('.vs-quiz__opt');
        var matchIdx = -1;
        QUESTIONS[0].opts.forEach(function (o, i) {
          if (o.scores[lastGame] === Math.max.apply(null, Object.values(o.scores))) matchIdx = i;
        });
        if (matchIdx >= 0 && optBtns[matchIdx]) {
          optBtns[matchIdx].classList.add('vs-quiz__opt--preselected');
          var hint = document.createElement('div');
          hint.className = 'vs-quiz__personalized-hint';
          hint.textContent = 'Based on your last session';
          container.insertBefore(hint, container.querySelector('.vs-quiz__opts'));
        }
      }
    }

    // Add personalized styles to the injected sheet.
    var styleEl = document.getElementById('vs-quiz-styles');
    if (styleEl && personalized) {
      styleEl.textContent +=
        '.vs-quiz__opt--preselected{border-color:rgba(255,196,0,.45)!important;background:rgba(255,196,0,.06)!important}' +
        '.vs-quiz__personalized-hint{font-size:.75rem;color:var(--gold,#ffc400);margin-bottom:.55rem;opacity:.8}';
    }

    if (personalized) {
      renderQuestionPersonalized(0);
    } else {
      renderQuestion(0);
    }
  }

  function boot() {
    document.querySelectorAll('[data-game-discovery-quiz]').forEach(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
