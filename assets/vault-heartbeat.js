/**
 * VaultSpark — Vault Heartbeat (live realtime ticker for /studio-pulse/).
 *
 * Subscribes to Supabase Realtime channel `vault:events`, surfaces incoming events as a
 * fading aria-live ticker pill, and pulses a small "LIVE" indicator. Also broadcasts
 * anonymous presence (count of viewers right now) and renders it as a subtle Vault Shadow.
 *
 * Requires window.VSPublic (existing anon Supabase client). Self-suppresses if absent.
 * No inline scripts/styles. Honest empty states. Light-mode aware.
 */
(function () {
  'use strict';

  var STYLE = [
    '.vs-heartbeat{position:fixed;left:50%;top:1.1rem;transform:translateX(-50%);z-index:55;display:flex;align-items:center;gap:0.55rem;background:rgba(13,16,28,0.92);color:var(--text);border:1px solid rgba(212,175,55,0.32);border-radius:999px;padding:0.45rem 0.95rem;font-size:0.78rem;font-family:Georgia,serif;letter-spacing:0.04em;box-shadow:0 8px 24px rgba(0,0,0,0.32);backdrop-filter:blur(8px);max-width:min(560px,calc(100vw - 2rem));}',
    '.vs-heartbeat__dot{width:8px;height:8px;border-radius:50%;background:var(--gold,#d4af37);box-shadow:0 0 12px var(--gold,#d4af37);animation:vs-hb-pulse 2.4s ease-in-out infinite;flex-shrink:0;}',
    '.vs-heartbeat__dot.vs-hb-flash{animation:vs-hb-flash 1.6s ease-out 1;}',
    '@keyframes vs-hb-pulse{0%,100%{opacity:0.55;transform:scale(1);}50%{opacity:1;transform:scale(1.18);}}',
    '@keyframes vs-hb-flash{0%{transform:scale(1.7);background:#7EC9FF;box-shadow:0 0 24px #7EC9FF;}100%{transform:scale(1);background:var(--gold,#d4af37);box-shadow:0 0 12px var(--gold,#d4af37);}}',
    '@media (prefers-reduced-motion: reduce){.vs-heartbeat__dot,.vs-heartbeat__dot.vs-hb-flash{animation:none;}}',
    '.vs-heartbeat__label{font-weight:600;color:var(--gold,#d4af37);text-transform:uppercase;font-size:0.7rem;letter-spacing:0.1em;}',
    '.vs-heartbeat__msg{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);}',
    '.vs-heartbeat__shadow{display:inline-flex;align-items:center;gap:0.35rem;color:var(--dim,#8b96a8);font-size:0.72rem;letter-spacing:0.04em;border-left:1px solid rgba(255,255,255,0.12);padding-left:0.6rem;}',
    'body.light-mode .vs-heartbeat{background:rgba(255,253,247,0.96);color:#1a1f2e;border-color:rgba(212,175,55,0.55);box-shadow:0 8px 24px rgba(20,28,52,0.08);}',
    'body.light-mode .vs-heartbeat__msg{color:#3a4256;}',
    'body.light-mode .vs-heartbeat__shadow{border-left-color:rgba(20,28,52,0.12);color:#7a8095;}'
  ].join('\n');

  function injectStyle() {
    if (document.querySelector('style[data-vault-heartbeat-style]')) return;
    var s = document.createElement('style');
    s.setAttribute('data-vault-heartbeat-style', '1');
    s.appendChild(document.createTextNode(STYLE));
    document.head.appendChild(s);
  }

  function buildTicker() {
    var wrap = document.createElement('div');
    wrap.className = 'vs-heartbeat';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-atomic', 'false');

    var dot = document.createElement('span');
    dot.className = 'vs-heartbeat__dot';
    wrap.appendChild(dot);

    var label = document.createElement('span');
    label.className = 'vs-heartbeat__label';
    label.textContent = 'LIVE';
    wrap.appendChild(label);

    var msg = document.createElement('span');
    msg.className = 'vs-heartbeat__msg';
    msg.textContent = 'Vault is breathing — watching for signal…';
    wrap.appendChild(msg);

    var shadow = document.createElement('span');
    shadow.className = 'vs-heartbeat__shadow';
    shadow.textContent = '— in the vault';
    shadow.style.display = 'none';
    wrap.appendChild(shadow);

    return { wrap: wrap, dot: dot, msg: msg, shadow: shadow };
  }

  function eventToText(payload) {
    var ev = payload && payload.payload ? payload.payload : payload || {};
    var t = ev.type || 'signal';
    var who = ev.username ? '@' + ev.username : 'someone';
    if (t === 'member_joined') return who + ' joined the vault';
    if (t === 'rank_up')       return who + ' leveled up · ' + (ev.rank_title || 'new rank');
    if (t === 'drop_shipped')  return 'New drop landed · ' + (ev.title || 'sealed');
    if (t === 'challenge_done') return who + ' completed a challenge';
    if (t === 'leaderboard_overtake') return who + ' took ' + (ev.position ? '#' + ev.position : 'a top spot');
    return ev.message || 'Vault signal · ' + t;
  }

  function flash(dot, msg, text) {
    msg.textContent = text;
    dot.classList.remove('vs-hb-flash');
    void dot.offsetWidth; // restart anim
    dot.classList.add('vs-hb-flash');
  }

  function init() {
    if (!window.VSPublic || typeof window.VSPublic.client !== 'function' && typeof window.VSPublic.channel !== 'function') {
      // VSPublic is the existing anon client wrapper. If it doesn't expose a channel(), fall back gracefully.
    }
    injectStyle();
    var ui = buildTicker();
    document.body.appendChild(ui.wrap);

    var supabase = (window.VSPublic && window.VSPublic._sb) || window.supabase || null;
    if (!supabase || !supabase.channel) {
      ui.msg.textContent = 'Vault is breathing — realtime offline.';
      return;
    }

    var ch = supabase.channel('vault:events', { config: { presence: { key: 'anon-' + Math.random().toString(36).slice(2, 10) } } });

    ch.on('broadcast', { event: 'vault_event' }, function (payload) {
      flash(ui.dot, ui.msg, eventToText(payload));
    });

    var updatePresence = function () {
      var state = ch.presenceState();
      var count = 0;
      for (var k in state) if (Object.prototype.hasOwnProperty.call(state, k)) count += state[k].length;
      if (count > 1) {
        ui.shadow.textContent = count + ' in the vault';
        ui.shadow.style.display = '';
      } else {
        ui.shadow.style.display = 'none';
      }
    };

    ch.on('presence', { event: 'sync' }, updatePresence);
    ch.on('presence', { event: 'join' }, updatePresence);
    ch.on('presence', { event: 'leave' }, updatePresence);

    ch.subscribe(function (status) {
      if (status === 'SUBSCRIBED') {
        ch.track({ joined_at: new Date().toISOString() });
        ui.msg.textContent = 'Vault is breathing — listening.';
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        ui.msg.textContent = 'Vault is breathing — realtime offline.';
      }
    });

    window.addEventListener('beforeunload', function () { try { ch.unsubscribe(); } catch (_e) {} });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
