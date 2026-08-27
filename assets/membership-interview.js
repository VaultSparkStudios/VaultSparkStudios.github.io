/**
 * membership-interview — 3-turn AI tier-recommendation flow on /membership/.
 *
 * Calls supabase ask-ignis with `mode: "interview"`. Anonymous-friendly: the
 * interview bypasses the Sparked-only gate (capped under onboarding-interview
 * budget instead). On Anthropic outage / cap-breach, gracefully redirects to
 * the static fallback (/vaultsparked/).
 *
 * Mount target: <div id="mem-interview-mount" data-fallback="/vaultsparked/">.
 *
 * State machine (no framework):
 *   idle   → user clicks "Take 30-second interview"
 *   asking → 3 user turns, each with options + free-text fallback
 *   done   → final recommendation rendered with primary CTA link
 */
(function () {
  'use strict';

  var FN_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/ask-ignis';
  var SUPABASE_ANON = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  var MAX_TURNS = 3;
  var TIMEOUT_MS = 12000;

  var STYLE = [
    '.mem-interview-card{background:rgba(13,16,28,0.85);border:1px solid rgba(212,175,55,0.25);border-radius:18px;padding:1.4rem 1.5rem;color:var(--text);}',
    'body.light-mode .mem-interview-card{background:rgba(255,253,247,0.96);border-color:rgba(20,28,52,0.12);}',
    '.mem-interview-cta{display:inline-flex;align-items:center;gap:0.55rem;padding:0.7rem 1.2rem;background:linear-gradient(135deg,var(--gold,#d4af37),#b8961e);color:#000;border:none;border-radius:999px;font-family:Georgia,serif;font-size:0.95rem;cursor:pointer;min-height:44px;transition:transform 140ms ease,box-shadow 140ms ease;}',
    '.mem-interview-cta:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(212,175,55,0.4);}',
    '.mem-interview-cta:focus-visible{outline:2px solid var(--gold,#d4af37);outline-offset:2px;}',
    '.mem-interview-eyebrow{font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold,#d4af37);margin-bottom:0.5rem;}',
    '.mem-interview-prompt{font-family:Georgia,serif;font-size:1rem;line-height:1.55;margin:0 0 1rem;}',
    '.mem-interview-options{display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.8rem;}',
    '.mem-interview-option{padding:0.55rem 0.95rem;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);color:var(--text);border-radius:999px;font-size:0.86rem;cursor:pointer;min-height:44px;transition:background 140ms ease;}',
    '.mem-interview-option:hover{background:rgba(212,175,55,0.18);}',
    '.mem-interview-input{width:100%;padding:0.65rem 0.9rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--text);border-radius:10px;font-size:0.92rem;font-family:inherit;}',
    '.mem-interview-loading{font-style:italic;color:var(--text-muted,#889);padding:0.4rem 0;}',
    '.mem-interview-progress{display:flex;gap:0.3rem;margin-bottom:0.85rem;}',
    '.mem-interview-progress-step{height:3px;flex:1;background:rgba(255,255,255,0.08);border-radius:2px;}',
    '.mem-interview-progress-step.done{background:var(--gold,#d4af37);}',
    '.mem-interview-final-cta{display:inline-flex;align-items:center;gap:0.5rem;padding:0.75rem 1.3rem;background:var(--gold,#d4af37);color:#000;border:none;border-radius:999px;font-family:Georgia,serif;font-size:0.96rem;text-decoration:none;min-height:44px;}',
    '.mem-interview-fine{font-size:0.74rem;color:var(--text-muted,#889);margin-top:0.85rem;font-style:italic;}',
    '.mem-interview-skip{display:inline-flex;align-items:center;min-height:44px;margin-top:0.35rem;padding:0.35rem 0.2rem;font-size:0.78rem;color:var(--text-muted,#889);text-decoration:underline;}',
    '@media (prefers-reduced-motion: reduce){.mem-interview-cta:hover{transform:none;}}',
  ].join('\n');

  function injectStyle() {
    if (document.getElementById('mem-interview-style')) return;
    var s = document.createElement('style');
    s.id = 'mem-interview-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function escape(t) {
    return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Compatibility bearer is requested from the verified edge session only
  // when this feature needs it, and remains memory-only.
  async function getAuthBearer() {
    try {
      var session = window.VSSignedInState && window.VSSignedInState.getDataSession
        ? await window.VSSignedInState.getDataSession() : null;
      return session && session.access_token ? session.access_token : null;
    } catch (_) { return null; }
  }

  async function callInterview(history, turn) {
    var lastUser = history.length ? history[history.length - 1].content : 'Starting the interview.';
    var token = (await getAuthBearer()) || SUPABASE_ANON;
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    try {
      var res = await fetch(FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON,
          Authorization: 'Bearer ' + token,
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          message: lastUser,
          mode: 'interview',
          interviewTurn: turn,
          history: history.slice(-6),
        }),
      });
      var json = await res.json();
      if (!res.ok) {
        return { error: json.error || 'IGNIS unavailable.', code: json.code };
      }
      return { reply: json.reply, suggestions: json.suggestions || [] };
    } catch (err) {
      return { error: err && err.message === 'AbortError' ? 'IGNIS timed out.' : 'Network hiccup.' };
    } finally {
      clearTimeout(timer);
    }
  }

  // Detect the recommended tier from the final reply. Loose match — Claude was
  // instructed to start with "I recommend [TIER]." but we tolerate variation.
  function detectTier(reply) {
    var r = (reply || '').toLowerCase();
    if (r.indexOf('eternal') !== -1) return { name: 'Eternal', href: '/vaultsparked/?tier=eternal' };
    if (r.indexOf('sparked') !== -1) return { name: 'Sparked', href: '/vaultsparked/' };
    if (r.indexOf('free') !== -1) return { name: 'Free', href: '/vault-member/#register' };
    return null;
  }

  function saveIntent(tier, history, reply) {
    try {
      var answers = history.filter(function (item) { return item.role === 'user'; }).map(function (item) { return item.content; }).slice(-3);
      localStorage.setItem('vs_membership_intent', JSON.stringify({
        schemaVersion: '1.0',
        source: 'membership-interview',
        tier: tier && tier.name ? tier.name : 'Free',
        href: tier && tier.href ? tier.href : '/vault-member/#register',
        answers: answers,
        summary: String(reply || '').slice(0, 240),
        savedAt: new Date().toISOString()
      }));
      window.dispatchEvent(new CustomEvent('vs:membership-intent', { detail: { tier: tier && tier.name ? tier.name : 'Free' } }));
    } catch (_) {}
  }

  function renderProgress(card, turn) {
    var bar = '<div class="mem-interview-progress" aria-label="Interview progress">';
    for (var i = 0; i < MAX_TURNS; i++) {
      bar += '<div class="mem-interview-progress-step' + (i < turn ? ' done' : '') + '"></div>';
    }
    bar += '</div>';
    return bar;
  }

  function startInterview(mount, fallbackHref) {
    var card = document.createElement('div');
    card.className = 'mem-interview-card';
    mount.innerHTML = '';
    mount.appendChild(card);

    var history = [];
    var turn = 0;

    function renderQuestion(reply, suggestions) {
      var opts = (suggestions || []).slice(0, 3).map(function (s) {
        return '<button type="button" class="mem-interview-option" data-option="' + escape(s.label || s) + '">' + escape((s.label || s).replace(/ →$/, '')) + '</button>';
      }).join('');
      card.innerHTML = [
        renderProgress(card, turn),
        '<div class="mem-interview-eyebrow">Onboarding · turn ', (turn + 1), ' of ', MAX_TURNS, '</div>',
        '<p class="mem-interview-prompt">', escape(reply), '</p>',
        opts ? '<div class="mem-interview-options">' + opts + '</div>' : '',
        '<input class="mem-interview-input" type="text" maxlength="160" placeholder="Or type your own answer…" aria-label="Your answer" />',
        '<a class="mem-interview-skip" href="', escape(fallbackHref), '">Skip and see all tiers</a>',
      ].join('');
      var input = card.querySelector('.mem-interview-input');
      input.focus();
      card.addEventListener('click', function onClick(e) {
        var btn = e.target && e.target.closest && e.target.closest('.mem-interview-option');
        if (btn) submit(btn.dataset.option || btn.textContent);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && input.value.trim()) submit(input.value.trim());
      });
    }

    function renderFinal(reply) {
      var tier = detectTier(reply);
      saveIntent(tier, history, reply);
      var ctaHtml = tier
        ? '<a class="mem-interview-final-cta" href="' + escape(tier.href) + '" data-track-event="interview_recommendation_click" data-track-label="' + escape(tier.name) + '">Open ' + escape(tier.name) + ' →</a>'
        : '<a class="mem-interview-final-cta" href="' + escape(fallbackHref) + '">See all tiers →</a>';
      card.innerHTML = [
        renderProgress(card, MAX_TURNS),
        '<div class="mem-interview-eyebrow">Recommendation</div>',
        '<p class="mem-interview-prompt">', escape(reply), '</p>',
        ctaHtml,
        '<p class="mem-interview-fine">This is one read. Trust your own. <a href="', escape(fallbackHref), '" style="color:var(--text-muted,#889);">Compare every tier →</a></p>',
      ].join('');
    }

    function renderError(msg) {
      card.innerHTML = [
        '<div class="mem-interview-eyebrow">Interview unavailable</div>',
        '<p class="mem-interview-prompt">', escape(msg || 'IGNIS could not run the interview right now.'), '</p>',
        '<a class="mem-interview-final-cta" href="', escape(fallbackHref), '">See all tiers →</a>',
      ].join('');
    }

    function setLoading(label) {
      card.innerHTML = renderProgress(card, turn) + '<div class="mem-interview-loading">' + escape(label || 'IGNIS is thinking…') + '</div>';
    }

    async function submit(answer) {
      history.push({ role: 'user', content: String(answer).slice(0, 200) });
      setLoading();
      var result = await callInterview(history, turn);
      if (result.error) return renderError(result.error);
      history.push({ role: 'assistant', content: result.reply });
      turn += 1;
      if (turn >= MAX_TURNS) renderFinal(result.reply);
      else renderQuestion(result.reply, result.suggestions);
    }

    // Kick off turn 1 by asking IGNIS the opening question.
    setLoading('IGNIS is preparing the interview…');
    callInterview([], 0).then(function (result) {
      if (result.error) return renderError(result.error);
      history.push({ role: 'assistant', content: result.reply });
      renderQuestion(result.reply, result.suggestions);
    });
  }

  function renderEntry(mount, fallbackHref) {
    mount.innerHTML = [
      '<div class="mem-interview-card" role="region" aria-label="Membership interview">',
        '<div class="mem-interview-eyebrow">Try the Vault Oracle</div>',
        '<p class="mem-interview-prompt">Answer 3 quick questions and IGNIS will recommend the right tier for you. Takes about 30 seconds.</p>',
        '<button type="button" class="mem-interview-cta" data-action="start" data-track-event="interview_start_click">Start the interview →</button>',
        '<a class="mem-interview-skip" href="', escape(fallbackHref), '">Or browse all tiers →</a>',
      '</div>',
    ].join('');
    mount.querySelector('[data-action="start"]').addEventListener('click', function () {
      startInterview(mount, fallbackHref);
    });
  }

  function init() {
    var mount = document.getElementById('mem-interview-mount');
    if (!mount) return;
    var fallbackHref = mount.getAttribute('data-fallback') || '/vaultsparked/';
    injectStyle();
    renderEntry(mount, fallbackHref);
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
