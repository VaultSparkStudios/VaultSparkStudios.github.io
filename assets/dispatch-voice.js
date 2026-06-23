/**
 * dispatch-voice.js — Web Speech API TTS for Vault Dispatches.
 *
 * Adds a 🔊 button to each dispatch card. Click reads the dispatch aloud
 * using the browser's native speech synthesis (no API cost). S219: each
 * dispatch is voiced by a distinct VaultSpark PERSONA — a different speech
 * voice + pitch/rate + a short spoken intro (Forge Engineer · Signal Analyst ·
 * Vault Herald · Archivist · a gravelly Classified Channel for classified
 * records). Persona is chosen by a stable hash so a given dispatch always
 * sounds the same. Highlights the active sentence as it speaks. The intro is a
 * fixed public-safe phrase; only the already-sanitized public dispatch body is
 * ever read — no sensitive data is added or spoken. Respects
 * prefers-reduced-motion (no auto-play, no glow).
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
    // Persona tag — each voice has its own tint so the personality reads visually.
    '.vs-voice-persona{display:inline-flex;align-items:center;margin-left:0.5rem;font-size:0.68rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--dim,#6272a0);opacity:0.85;}',
    '.vs-voice-persona[data-vs-persona="forge"]{color:#ff9478;}',
    '.vs-voice-persona[data-vs-persona="signal"]{color:#7cc8ff;}',
    '.vs-voice-persona[data-vs-persona="herald"]{color:#ffc400;}',
    '.vs-voice-persona[data-vs-persona="archivist"]{color:#c4bcff;}',
    '.vs-voice-persona[data-vs-persona="classified"]{color:#f6c945;}',
  ].join('');

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ── Personas (S219 dispatch-voices) ────────────────────────────────────────
  // Each dispatch is read by a distinct VaultSpark "voice" — a different speech
  // voice + pitch/rate + a short spoken intro that gives it personality. The
  // intro is a fixed, public-safe phrase (the dispatch body is already the
  // sanitized public feed — no sensitive data is ever added or read).
  var PERSONAS = [
    { id: 'forge',     label: 'Forge Engineer', intro: 'From the forge floor.',     rate: 0.95, pitch: 0.82, prefs: [/Daniel/i, /Microsoft (Guy|Davis)/i, /Google UK English Male/i, /Fred/i] },
    { id: 'signal',    label: 'Signal Analyst', intro: 'Signal intercepted.',       rate: 1.02, pitch: 1.05, prefs: [/Microsoft (Aria|Jenny)/i, /Samantha/i, /Google US English/i, /female/i] },
    { id: 'herald',    label: 'Vault Herald',   intro: 'Vault transmission.',       rate: 0.9,  pitch: 0.95, prefs: [/Alex/i, /Microsoft (Christopher|Eric)/i, /Google UK English/i] },
    { id: 'archivist', label: 'The Archivist',  intro: 'From the vault archives.',  rate: 0.92, pitch: 0.88, prefs: [/Aaron/i, /Microsoft (Guy|Tony)/i, /Fred/i] },
  ];
  // Classified dispatches get a gravelly, secretive read.
  var CLASSIFIED_PERSONA = { id: 'classified', label: 'Classified Channel', intro: 'Classified vault record. Clearance noted.', rate: 0.86, pitch: 0.76, prefs: [/Daniel/i, /Microsoft (Davis|Guy)/i, /Fred/i] };

  // Stable hash → persona index, so a given dispatch always gets the same voice
  // (consistent personality) but the feed as a whole varies across personas.
  function hashStr(s) {
    var h = 0; s = String(s || '');
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }

  function personaFor(card, key) {
    if (card && card.classList && card.classList.contains('disp-card--classified')) return CLASSIFIED_PERSONA;
    return PERSONAS[hashStr(key) % PERSONAS.length];
  }

  // Pick a real voice for a persona: try its prefs, then give each persona a
  // DISTINCT fallback by rotating through available en voices by persona index —
  // so personas sound different even on systems with only generic voices.
  function pickVoiceForPersona(voices, persona, personaIdx) {
    if (!voices || !voices.length) return null;
    var en = voices.filter(function (v) { return /^en/i.test(v.lang); });
    var pool = en.length ? en : voices;
    var prefs = (persona && persona.prefs) || [];
    for (var i = 0; i < prefs.length; i++) {
      var hit = pool.find(function (v) { return prefs[i].test(v.name); });
      if (hit) return hit;
    }
    // Distinct fallback: rotate so persona 0,1,2,3 map to different voices.
    return pool[(personaIdx || 0) % pool.length] || pool[0];
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

  function speak(bodyEl, btn, persona, personaIdx) {
    if (current && current.bodyEl === bodyEl) { stop(); return; }
    stop();
    var sentences = wrapSentences(bodyEl);
    if (!sentences.length) return;
    var body = sentences.join(' ');
    // Persona intro is spoken (for personality) but NOT part of the visible /
    // highlighted text — sentence offsets are shifted past it.
    var intro = (persona && persona.intro) ? persona.intro + ' ' : '';
    var u = new SpeechSynthesisUtterance(intro + body);
    u.rate = (persona && persona.rate) || 0.95;
    u.pitch = (persona && persona.pitch) || 0.85;
    u.volume = 1.0;
    var voice = pickVoiceForPersona(window.speechSynthesis.getVoices(), persona, personaIdx);
    if (voice) u.voice = voice;

    var idx = 0;
    var spans = bodyEl.querySelectorAll('.vs-voice-sentence');
    function highlight(i) {
      spans.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
    }
    highlight(0);

    // Track sentence boundaries via word boundary events (cumulative char count),
    // shifted by the spoken intro length so highlight stays aligned to the body.
    var offsets = [];
    var run = intro.length;
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
    current = { utterance: u, btn: btn, bodyEl: bodyEl, persona: persona, personaIdx: personaIdx };
    try { window.speechSynthesis.speak(u); } catch (_) { stop(); }
  }

  function mount(card) {
    if (card.dataset.vsVoiceMounted === '1') return;
    var body = card.querySelector('.disp-card__body, .narrative-body, [data-voice-body]');
    if (!body) return;
    var meta = card.querySelector('.disp-card__meta, .narrative-meta, [data-voice-meta]') || body;
    var dateEl = card.querySelector('.disp-card__date, .narrative-meta');
    var key = (dateEl ? dateEl.textContent : '') + '|' + (body.textContent || '').slice(0, 48);
    var persona = personaFor(card, key);
    var personaIdx = persona === CLASSIFIED_PERSONA ? PERSONAS.length : PERSONAS.indexOf(persona);
    var btn = buildButton();
    btn.title = 'Read aloud — voiced by the ' + persona.label;
    btn.setAttribute('data-vs-persona', persona.id);
    btn.addEventListener('click', function () { speak(body, btn, persona, personaIdx); });
    meta.appendChild(btn);
    // Surface the persona so the personality is visible, not just audible.
    var tag = document.createElement('span');
    tag.className = 'vs-voice-persona';
    tag.setAttribute('data-vs-persona', persona.id);
    tag.textContent = '🎙 ' + persona.label;
    meta.appendChild(tag);
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
          var v = pickVoiceForPersona(window.speechSynthesis.getVoices(), current.persona, current.personaIdx);
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
