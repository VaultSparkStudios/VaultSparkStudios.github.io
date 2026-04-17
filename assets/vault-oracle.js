/**
 * VaultSpark — Vault Oracle (Ask IGNIS chat widget).
 *
 * Self-mounting on any page containing `<div data-vault-oracle>`.
 * Optional attributes:
 *   data-vault-oracle-context="…"  — prepended to the system prompt as page context
 *   data-vault-oracle-mode="full"  — full-height surface (default: "panel")
 *
 * Calls the Supabase ask-ignis edge function. Honest empty / error states.
 * Self-injects scoped CSS once. CSP-clean (no inline scripts/styles).
 */
(function () {
  'use strict';

  var FN_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/ask-ignis';
  var STYLE_INJECTED = false;

  var STYLE = [
    '.vs-oracle{display:flex;flex-direction:column;gap:0.85rem;background:rgba(13,16,28,0.88);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:1.1rem 1.2rem 1rem;color:var(--text);max-width:680px;margin:1.5rem auto;box-shadow:0 18px 48px rgba(0,0,0,0.35);}',
    'body.light-mode .vs-oracle{background:rgba(255,253,247,0.96);border-color:rgba(20,28,52,0.12);box-shadow:0 18px 48px rgba(20,28,52,0.08);}',
    '.vs-oracle__head{display:flex;align-items:center;gap:0.6rem;font-family:Georgia,serif;letter-spacing:0.06em;text-transform:uppercase;font-size:0.78rem;color:var(--gold,#d4af37);}',
    '.vs-oracle__head:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--gold,#d4af37);box-shadow:0 0 14px var(--gold,#d4af37);animation:vs-oracle-pulse 2.6s ease-in-out infinite;}',
    '@keyframes vs-oracle-pulse{0%,100%{opacity:0.55;}50%{opacity:1;}}',
    '@media (prefers-reduced-motion: reduce){.vs-oracle__head:before{animation:none;}}',
    '.vs-oracle__log{display:flex;flex-direction:column;gap:0.55rem;max-height:320px;overflow-y:auto;padding:0.2rem 0.1rem;}',
    '.vs-oracle__msg{padding:0.62rem 0.85rem;border-radius:12px;line-height:1.45;font-size:0.92rem;}',
    '.vs-oracle__msg--user{align-self:flex-end;background:rgba(126,201,255,0.12);border:1px solid rgba(126,201,255,0.22);max-width:86%;}',
    '.vs-oracle__msg--ignis{align-self:flex-start;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.22);max-width:92%;font-family:Georgia,serif;}',
    '.vs-oracle__msg--err{align-self:flex-start;background:rgba(255,80,80,0.08);border:1px solid rgba(255,80,80,0.25);font-size:0.85rem;color:#ffb4b4;}',
    '.vs-oracle__form{display:flex;gap:0.5rem;}',
    '.vs-oracle__input{flex:1;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12);color:var(--text);border-radius:10px;padding:0.6rem 0.8rem;font:inherit;font-size:0.92rem;}',
    'body.light-mode .vs-oracle__input{background:rgba(20,28,52,0.04);border-color:rgba(20,28,52,0.16);}',
    '.vs-oracle__input:focus{outline:none;border-color:var(--gold,#d4af37);box-shadow:0 0 0 2px rgba(212,175,55,0.18);}',
    '.vs-oracle__send{background:var(--gold,#d4af37);color:#0c0d12;border:none;border-radius:10px;padding:0 1.05rem;font:inherit;font-weight:600;cursor:pointer;transition:transform 120ms ease,box-shadow 120ms ease;}',
    '.vs-oracle__send:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(212,175,55,0.28);}',
    '.vs-oracle__send:disabled{opacity:0.55;cursor:wait;}',
    '.vs-oracle__hint{font-size:0.72rem;color:var(--dim,#8b96a8);margin-top:0.1rem;}',
    '.vs-oracle__pill{display:inline-flex;align-items:center;gap:0.35rem;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.32);color:var(--gold,#d4af37);padding:0.42rem 0.78rem;border-radius:999px;font-size:0.78rem;font-family:Georgia,serif;letter-spacing:0.04em;cursor:pointer;text-decoration:none;transition:transform 120ms ease;}',
    '.vs-oracle__pill:hover{transform:translateY(-1px);}'
  ].join('\n');

  function injectStyle() {
    if (STYLE_INJECTED) return;
    STYLE_INJECTED = true;
    var s = document.createElement('style');
    s.setAttribute('data-vault-oracle-style', '1');
    s.appendChild(document.createTextNode(STYLE));
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function append(log, text, kind) {
    var div = document.createElement('div');
    div.className = 'vs-oracle__msg vs-oracle__msg--' + kind;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function ask(message, contextHint) {
    return fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, context: contextHint || undefined }),
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || ('IGNIS unreachable (' + res.status + ')'));
        return body;
      });
    });
  }

  function mount(host) {
    if (host.dataset.vsOracleMounted === '1') return;
    host.dataset.vsOracleMounted = '1';
    injectStyle();

    var ctx = host.getAttribute('data-vault-oracle-context') || '';

    var wrap = document.createElement('div');
    wrap.className = 'vs-oracle';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Ask IGNIS, the Vault Oracle');

    var head = document.createElement('div');
    head.className = 'vs-oracle__head';
    head.textContent = 'IGNIS · vault oracle';
    wrap.appendChild(head);

    var log = document.createElement('div');
    log.className = 'vs-oracle__log';
    log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-atomic', 'false');
    wrap.appendChild(log);

    append(log, 'I watch the vault. Ask me what is sparked, what is in the forge, or what you should play next.', 'ignis');

    var form = document.createElement('form');
    form.className = 'vs-oracle__form';
    form.setAttribute('autocomplete', 'off');

    var input = document.createElement('input');
    input.className = 'vs-oracle__input';
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', 'Ask IGNIS…');
    input.setAttribute('maxlength', '800');
    input.setAttribute('aria-label', 'Your question for IGNIS');
    form.appendChild(input);

    var send = document.createElement('button');
    send.className = 'vs-oracle__send';
    send.setAttribute('type', 'submit');
    send.textContent = 'Ask';
    form.appendChild(send);

    wrap.appendChild(form);

    var hint = document.createElement('div');
    hint.className = 'vs-oracle__hint';
    hint.textContent = 'IGNIS reads the live vault snapshot. No conversation is stored.';
    wrap.appendChild(hint);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var msg = (input.value || '').trim();
      if (!msg) return;
      append(log, msg, 'user');
      input.value = '';
      send.disabled = true;
      var pending = append(log, '…', 'ignis');
      ask(msg, ctx).then(function (body) {
        pending.textContent = body.reply || '(no reply)';
        if (window.gtag) window.gtag('event', 'ignis_ask', { value: 1, cached: body.cached ? 1 : 0 });
      }).catch(function (err) {
        pending.remove();
        append(log, err.message || 'IGNIS is unreachable. Try again in a moment.', 'err');
      }).finally(function () {
        send.disabled = false;
        input.focus();
      });
    });

    host.appendChild(wrap);
  }

  function init() {
    document.querySelectorAll('[data-vault-oracle]').forEach(mount);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VSOracle = { mount: mount };
})();
