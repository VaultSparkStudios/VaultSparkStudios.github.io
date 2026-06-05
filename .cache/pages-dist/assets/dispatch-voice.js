/**
 * dispatch-voice.js — Web Speech API TTS for Vault Dispatches.
 *
 * Adds a 🔊 button to each dispatch card. Click reads the dispatch aloud
 * using the browser's native speech synthesis (no API cost). Tries to pick
 * a deep, masculine voice when one is available. Highlights the active
 * sentence as it speaks. Respects prefers-reduced-motion (no auto-play,
 * no glow).
 *
 * Mounting points (any/all):
 *  - .disp-card  (Vault Dispatches archive page)
 *  - #vault-narrative-slot .narrative-body  (homepage slot)
 *  - [data-vs-voice-dispatch]  (manual opt-in)
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!('SpeechSynthesisUtterance' in window)) return;

  var STYLE_ID = 'vs-dispatch-voice-styles';
  var CSS = [
    '.vs-voice-btn{display:inline-flex;align-items:center;gap:0.35rem;background:none;border:1px solid rgba(255,255,255,0.14);',
    'color:var(--muted,#9ca3af);font-size:0.78rem;font-weight:600;letter-spacing:0.04em;padding:0.3rem 0.7rem;',
    'border-radius:999px;cursor:pointer;transition:color 0.2s ease,border-color 0.2s ease,background 0.2s ease;',
    'margin-left:0.6rem;}',
    '.vs-voice-btn:hover,.vs-voice-btn:focus-visible{color:var(--gold,#FFC400);border-color:rgba(255,196,0,0.4);outline:none;}',
    '.vs-voice-btn[aria-pressed="true"]{color:var(--gold,#FFC400);border-color:var(--gold,#FFC400);background:rgba(255,196,0,0.08);}',
    '.vs-voice-btn svg{width:14px;height:14px;}',
    '.vs-voice-sentence{transition:color 0.25s ease,text-shadow 0.25s ease;}',
    '.vs-voice-sentence.is-active{color:#FFC400;text-shadow:0 0 12px rgba(255,196,0,0.35);}',
    '@media (prefers-reduced-motion: reduce){.vs-voice-sentence{transition:none;}}',
  ].join('');

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // Pick a "vault-y" voice — prefer deeper-sounding masculine en-US/en-GB voices
  // when the OS provides them. Falls back to the default voice.
  function pickVoice(voices) {
    if (!voices || !voices.length) return null;
    var en = voices.filter(function (v) { return /^en/i.test(v.lang); });
    var preferred = [
      /Daniel/i, /Alex/i, /Fred/i, /Aaron/i,           // macOS
      /Microsoft (Guy|Davis|Aria|Christopher)/i,        // Windows neural
      /Google US English/i, /Google UK English Male/i,  // Chrome OS / Android
    ];
    for (var i = 0; i < preferred.length; i++) {
      var hit = en.find(function (v) { return preferred[i].test(v.name); });
      if (hit) return hit;
    }
    // Generic male hint
    var male = en.find(function (v) { return /male/i.test(v.name) && !/female/i.test(v.name); });
    if (male) return male;
    return en[0] || voices[0];
  }

  function splitSentences(text) {
    if ('Segmenter' in Intl) {
      try {
        var seg = new Intl.Segmenter(undefined, { granularity: 'sentence' });
        return Array.from(seg.segment(text)).map(function (s) { return s.segment.trim(); }).filter(Boolean);
      } catch (_) {}
    }
    return text.split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function wrapSentences(el) {
    if (el.dataset.vsVoiceWrapped === '1') return splitSentences(el.textContent);
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    var sentences = splitSentences(text);
    el.innerHTML = '';
    sentences.forEach(function (s, i) {
      var span = document.createElement('span');
      span.className = 'vs-voice-sentence';
      span.dataset.vsIdx = String(i);
      span.textContent = s;
      el.appendChild(span);
      if (i < sentences.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.dataset.vsVoiceWrapped = '1';
    return sentences;
  }

  function buildButton() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vs-voice-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Read this dispatch aloud');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
        '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
        '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' +
      '</svg>' +
      '<span>Listen</span>';
    return btn;
  }

  var current = null; // { utterance, btn, bodyEl }

  function stop() {
    try { window.speechSynthesis.cancel(); } catch (_) {}
    if (current) {
      current.btn.setAttribute('aria-pressed', 'false');
      current.btn.querySelector('span').textContent = 'Listen';
      current.bodyEl.querySelectorAll('.vs-voice-sentence.is-active').forEach(function (s) {
        s.classList.remove('is-active');
      });
      current = null;
    }
  }

  function speak(bodyEl, btn) {
    if (current && current.bodyEl === bodyEl) { stop(); return; }
    stop();
    var sentences = wrapSentences(bodyEl);
    if (!sentences.length) return;
    var text = sentences.join(' ');
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 0.85;
    u.volume = 1.0;
    var voice = pickVoice(window.speechSynthesis.getVoices());
    if (voice) u.voice = voice;

    var idx = 0;
    var spans = bodyEl.querySelectorAll('.vs-voice-sentence');
    function highlight(i) {
      spans.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
    }
    highlight(0);

    // Track sentence boundaries via word boundary events (cumulative char count).
    var offsets = [];
    var run = 0;
    sentences.forEach(function (s) { run += s.length + 1; offsets.push(run); });
    u.onboundary = function (e) {
      if (e.name !== 'word' && e.name !== 'sentence') return;
      var c = e.charIndex || 0;
      while (idx < offsets.length - 1 && c >= offsets[idx]) idx++;
      highlight(idx);
    };
    u.onend = stop;
    u.onerror = stop;

    btn.setAttribute('aria-pressed', 'true');
    btn.querySelector('span').textContent = 'Stop';
    current = { utterance: u, btn: btn, bodyEl: bodyEl };
    try { window.speechSynthesis.speak(u); } catch (_) { stop(); }
  }

  function mount(card) {
    if (card.dataset.vsVoiceMounted === '1') return;
    var body = card.querySelector('.disp-card__body, .narrative-body, [data-voice-body]');
    if (!body) return;
    var meta = card.querySelector('.disp-card__meta, .narrative-meta, [data-voice-meta]') || body;
    var btn = buildButton();
    btn.addEventListener('click', function () { speak(body, btn); });
    meta.appendChild(btn);
    card.dataset.vsVoiceMounted = '1';
  }

  function scan() {
    document.querySelectorAll('.disp-card, [data-vs-voice-dispatch], #vault-narrative-slot .narrative-card').forEach(mount);
  }

  function init() {
    injectStyles();
    scan();
    // Re-scan when dispatches list hydrates async.
    var list = document.getElementById('disp-list');
    if (list && 'MutationObserver' in window) {
      var mo = new MutationObserver(scan);
      mo.observe(list, { childList: true, subtree: false });
    }
    // Some browsers populate voices async — re-pick on voiceschanged.
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', function () {
        if (current) {
          var u = current.utterance;
          var v = pickVoice(window.speechSynthesis.getVoices());
          if (v) u.voice = v;
        }
      });
    }
    // Stop on page navigation / hide.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
    });
    window.addEventListener('beforeunload', stop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
