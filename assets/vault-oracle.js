/**
 * VaultSpark — Vault Oracle (Ask IGNIS chat widget).
 *
 * Self-mounting on any page containing `<div data-vault-oracle>`.
 * Optional attributes:
 *   data-vault-oracle-context="…"  — prepended to the system prompt as page context
 *   data-vault-oracle-mode="full"  — full-height surface (default: "panel")
 *
 * S100 upgrades:
 *  - Sends conversation history (last 3 turns) so IGNIS has multi-turn context.
 *  - Renders "suggest next" chip links from the `suggestions` field in the response.
 *  - GA4 event tracks cache_hit and model_tier (haiku vs sonnet).
 *
 * Calls the Supabase ask-ignis edge function. Honest empty / error states.
 * Self-injects scoped CSS once. CSP-clean (no inline scripts/styles).
 */
(function () {
  'use strict';

  var FN_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/ask-ignis';
  var SUPABASE_ANON = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  var STYLE_INJECTED = false;

  // URL-based context fallback — used when no data-vault-oracle-context attr is set.
  // Maps pathname prefixes to IGNIS-ready context strings.
  var PAGE_CONTEXTS = [
    ['/games/call-of-doodie', 'User is on the Call of Doodie game page — a VaultSpark Studios satire FPS. Help them learn about the game, wishlist it, or explore other studio games.'],
    ['/games/gridiron-gm', 'User is on the Gridiron GM game page — a VaultSpark football GM simulator. Help them learn about gameplay, WishVault, or explore related games.'],
    ['/games/mindframe', 'User is on the MindFrame game page — a VaultSpark cognitive strategy game. Help them understand the concept and how to follow development.'],
    ['/games/vaultfront', 'User is on the Vaultfront game page. Help them learn about the project and follow its progress in the Forge.'],
    ['/games/solara', 'User is on the Solara game page. Help them learn about the project and follow its forge progress.'],
    ['/games/the-exodus', 'User is on The Exodus game page. Help them explore the project.'],
    ['/games', 'User is browsing the VaultSpark Studios games catalog. Active projects: Call of Doodie (satire FPS), Gridiron GM (football simulator), Vaultfront, Solara, MindFrame, The Exodus. Help them find a game that fits their interest.'],
    ['/membership-value', 'User is reading about VaultSpark membership value. Help them understand what the Vault Score system, rank progression, and member-only perks deliver vs. free access.'],
    ['/membership', 'User is on the membership page. Help them understand Vault tiers, Vault Score, rank progression, and the value of joining — or point them to the sign-up flow.'],
    ['/ranks', 'User is exploring the VaultSpark rank system and Vault Score. Help them understand how points are earned, what ranks unlock, and how to climb faster.'],
    ['/leaderboards', 'User is checking the VaultSpark leaderboards. Help them understand ranking mechanics and what drives Vault Score.'],
    ['/community', 'User is on the Community hub, which includes the Vault Wall (standings, rank distribution, season countdown). Help them understand ranks, Vault Points, seasons, and how to get on the wall.'],
    ['/universe/voidfall', 'User is reading about Voidfall — a VaultSpark lore universe. Help them explore the narrative, characters, or find the Signal Log transmissions.'],
    ['/universe/dreadspike', 'User is reading about DreadSpike — a VaultSpark lore universe. Help them explore the story and universe connections.'],
    ['/universe', 'User is exploring the VaultSpark Universe — Voidfall and DreadSpike narrative worlds. Help them dive into the lore, find character pages, or discover the Signal Log.'],
    ['/journal', 'User is reading the VaultSpark Journal. Help them find relevant entries or understand the studio\'s creative journey.'],
    ['/changelog', 'User is viewing the VaultSpark changelog. Help them understand recent updates, what shipped, and how to follow progress.'],
    ['/signal-log', 'User is reading the VaultSpark Signal Log — dispatches from the studio. Help them find relevant entries.'],
    ['/notebook', 'User is in the VaultSpark Notebook — dev notes and insights. Help them find or understand specific content.'],
    ['/roadmap', 'User is viewing the VaultSpark roadmap. Help them understand what is in the Forge, what is coming next, and what is sealed.'],
    ['/studio', 'User is on the Studio page. Help them understand the studio\'s mission, team, and how to follow VaultSpark.'],
    ['/contact', 'User is on the contact page. Help them find the right way to reach out: questions, press inquiries, or membership support.'],
    ['/press', 'User is on the press page. Help them find brand assets, media kit info, or the right contact for press inquiries.'],
    ['/social', 'User is on the social / community page. Help them find where to connect with the VaultSpark community.'],
    ['/community', 'User is on the community page. Help them explore ways to engage with VaultSpark Studios and other members.'],
    ['/ignis', 'User is on the IGNIS explainer page. They want to understand the Vault Oracle score, how it is calculated, or what the studio\'s current pulse means.'],
    ['/vault-member', 'User is in the Vault Member portal. Help them navigate features: dashboard, challenges, settings, or membership benefits.'],
    ['/share', 'User is on a share page. Help them understand what they are sharing and how it benefits their Vault Score.'],
    ['/', 'User is on the VaultSpark Studios homepage. Help them explore: games in the Forge, membership tiers, the Vault Universe (Voidfall, DreadSpike), or the Signal Log.'],
  ];

  function derivePageContext(pathname) {
    for (var i = 0; i < PAGE_CONTEXTS.length; i++) {
      if (pathname.startsWith(PAGE_CONTEXTS[i][0])) return PAGE_CONTEXTS[i][1];
    }
    return '';
  }

  // ── P1 · Per-page adaptive context ──────────────────────────────────────
  // Reads the page's actual content (H1, meta description, JSON-LD, body data
  // attributes) and folds them into a richer context block. Falls back to the
  // static PAGE_CONTEXTS map so existing tuned copy still wins.
  //
  // Goal: every page — including ones not in the static map — gives IGNIS a
  // useful read of "what is the user looking at right now?"
  function deriveAdaptiveContext(pathname) {
    var staticCtx = derivePageContext(pathname);
    var parts = [];
    var doc = document;

    var h1 = doc.querySelector('h1');
    var titleText = (h1 && h1.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 140);
    var metaDesc = (doc.querySelector('meta[name="description"]') || {}).content || '';
    metaDesc = metaDesc.trim().replace(/\s+/g, ' ').slice(0, 240);
    var ogTitle = (doc.querySelector('meta[property="og:title"]') || {}).content || '';
    var pageKind = (doc.body && doc.body.getAttribute('data-schema-type')) || null;

    // Detect the most useful JSON-LD @type on the page.
    var ldType = null;
    var ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < ldScripts.length && !ldType; i++) {
      try {
        var parsed = JSON.parse(ldScripts[i].textContent || '{}');
        if (parsed && parsed['@type'] && parsed['@type'] !== 'WebSite' && parsed['@type'] !== 'Organization' && parsed['@type'] !== 'BreadcrumbList') {
          ldType = parsed['@type'];
        }
      } catch (_) { /* skip */ }
    }

    if (titleText && titleText.length > 2) parts.push('User is reading: "' + titleText + '"');
    if (metaDesc && metaDesc.length > 8 && metaDesc !== titleText) parts.push('Page summary: ' + metaDesc);
    if (pageKind) parts.push('Page kind: ' + pageKind);
    if (ldType) parts.push('Schema type: ' + ldType);

    // Visible primary CTA (first button/link with .button or .cta class).
    var cta = doc.querySelector('.hero .button, .button-primary, [data-primary-cta]');
    if (cta) {
      var ctaText = (cta.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (ctaText) parts.push('Primary action on page: "' + ctaText + '"');
    }

    // Pull the first 2 visible H2 headings so IGNIS knows the page outline.
    var h2s = Array.prototype.slice.call(doc.querySelectorAll('h2'))
      .map(function (n) { return (n.textContent || '').trim(); })
      .filter(function (t) { return t && t.length < 80; })
      .slice(0, 2);
    if (h2s.length) parts.push('Section headings: ' + h2s.join(' · '));

    var adaptive = parts.length ? parts.join('\n') : '';
    if (staticCtx && adaptive) return staticCtx + '\n\n' + adaptive;
    return adaptive || staticCtx || '';
  }

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
    '.vs-oracle__chips{display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.1rem;}',
    '.vs-oracle__chip{display:inline-flex;align-items:center;background:rgba(212,175,55,0.09);border:1px solid rgba(212,175,55,0.28);color:var(--gold,#d4af37);padding:0.32rem 0.65rem;border-radius:999px;font-size:0.75rem;font-family:Georgia,serif;letter-spacing:0.03em;text-decoration:none;transition:transform 120ms ease,background 120ms ease;}',
    '.vs-oracle__chip:hover{transform:translateY(-1px);background:rgba(212,175,55,0.16);}',
    '.vs-oracle__chip--starter{cursor:pointer;font-family:inherit;}',
    'body.light-mode .vs-oracle__chip{color:#8a6000;border-color:rgba(138,96,0,0.3);background:rgba(138,96,0,0.07);}',
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

  function renderSuggestions(log, suggestions) {
    if (!Array.isArray(suggestions) || !suggestions.length) return;
    var chips = document.createElement('div');
    chips.className = 'vs-oracle__chips';
    suggestions.forEach(function (s) {
      if (!s || !s.label || !s.href) return;
      var a = document.createElement('a');
      a.className = 'vs-oracle__chip';
      a.href = esc(s.href);
      a.textContent = s.label;
      chips.appendChild(a);
    });
    if (chips.childElementCount > 0) {
      log.appendChild(chips);
      log.scrollTop = log.scrollHeight;
    }
  }

  async function getStoredSession() {
    if (window.VSSupabase && window.VSSupabase.auth) {
      var result = await window.VSSupabase.auth.getSession();
      if (result && result.data && result.data.session) return result.data.session;
    }
    return window.VSSignedInState && window.VSSignedInState.getDataSession
      ? window.VSSignedInState.getDataSession() : null;
  }

  function accessHint(access, fallback) {
    if (!access) return fallback || 'Sparked members can ask IGNIS. Eternal has unlimited access.';
    if (!access.authenticated) return 'Sign in with a Vault Member account to open IGNIS.';
    if (access.unlimited) return 'Eternal access active. IGNIS is fully unlocked.';
    if (typeof access.monthlyRemaining === 'number' && typeof access.monthlyLimit === 'number') {
      return 'IGNIS quota: ' + access.monthlyRemaining + ' left this month (' + access.monthlyUsed + '/' + access.monthlyLimit + ' used).';
    }
    return fallback || 'Sparked access active.';
  }

  function renderAccessPills(log, links) {
    if (!Array.isArray(links) || !links.length) return;
    var row = document.createElement('div');
    row.className = 'vs-oracle__chips';
    links.forEach(function (item) {
      var a = document.createElement('a');
      a.className = 'vs-oracle__pill';
      a.href = item.href;
      a.textContent = item.label;
      row.appendChild(a);
    });
    if (row.childElementCount > 0) log.appendChild(row);
  }

  function probeAccess(session) {
    if (!session || !session.access_token) return Promise.resolve(null);
    // 4s timeout — probe is a single round-trip to the edge function; if it
    // takes longer, the function is degraded. Fail open (treat as unknown,
    // let the ask path surface the real error) rather than hang the mount.
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 4000) : null;
    return fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + session.access_token,
      },
      body: JSON.stringify({ probe: true }),
      signal: controller ? controller.signal : undefined,
    }).then(function (res) {
      if (timeoutId) clearTimeout(timeoutId);
      return res.json().then(function (body) {
        return { status: res.status, body: body };
      }).catch(function () {
        return { status: res.status, body: null };
      });
    }).catch(function () {
      if (timeoutId) clearTimeout(timeoutId);
      return null;
    });
  }

  // ── R1: SSE streaming variant ───────────────────────────────────────────
  // Server emits Anthropic-flavoured SSE; we parse content_block_delta text
  // and feed each chunk to onDelta. After [DONE], a final vs-ignis-tail event
  // carries suggestions + meter. Returns { reply, suggestions, meter, access }
  // when the stream closes — same shape as ask() so the caller can swap in.
  function askStream(message, contextHint, history, session, onDelta) {
    var payload = { message: message, stream: true };
    if (contextHint) payload.context = contextHint;
    if (history && history.length) payload.history = history;
    var token = session && session.access_token ? session.access_token : SUPABASE_ANON;

    return fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + token,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (!res.ok) {
        // Mirror non-streaming error envelope so callers can fall back.
        return res.json().catch(function () { return null; }).then(function (body) {
          var err = new Error((body && body.error) || ('IGNIS unreachable (' + res.status + ')'));
          err.access = body && body.access ? body.access : null;
          err.code = body && body.code ? body.code : null;
          throw err;
        });
      }
      var reader = res.body && res.body.getReader && res.body.getReader();
      if (!reader) {
        // Fallback: shouldn't happen in modern browsers — but if streams are
        // unavailable, downgrade to the non-streaming flow transparently.
        return res.json().then(function (body) { return body; });
      }
      var decoder = new TextDecoder();
      var buf = '';
      var assembled = '';
      var tail = null;

      function pump() {
        return reader.read().then(function (chunk) {
          if (chunk.done) return;
          buf += decoder.decode(chunk.value, { stream: true });
          var events = buf.split(/\n\n/);
          buf = events.pop() || '';
          for (var i = 0; i < events.length; i++) {
            var ev = events[i];
            var eventType = null;
            var dataLine = null;
            var lines = ev.split('\n');
            for (var k = 0; k < lines.length; k++) {
              if (lines[k].indexOf('event:') === 0) eventType = lines[k].slice(6).trim();
              else if (lines[k].indexOf('data:') === 0) dataLine = lines[k].slice(5).trim();
            }
            if (!dataLine || dataLine === '[DONE]') continue;
            try {
              var obj = JSON.parse(dataLine);
              if (eventType === 'vs-ignis-tail') {
                tail = obj;
              } else if (obj.type === 'content_block_delta' && obj.delta && obj.delta.text) {
                assembled += obj.delta.text;
                if (typeof onDelta === 'function') onDelta(obj.delta.text, assembled);
              }
            } catch (_) { /* ignore */ }
          }
          return pump();
        });
      }

      return pump().then(function () {
        return {
          reply: assembled,
          suggestions: tail && tail.suggestions ? tail.suggestions : [],
          meter: tail && tail.meter ? tail.meter : null,
          access: null, // streaming path doesn't echo access — caller keeps last known
        };
      });
    });
  }

  function ask(message, contextHint, history, session) {
    var payload = { message: message };
    if (contextHint) payload.context = contextHint;
    if (history && history.length) payload.history = history;
    var token = session && session.access_token ? session.access_token : SUPABASE_ANON;

    return fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) {
          if (body && body.detail && window.console) console.warn('[IGNIS]', body.error, '·', body.detail);
          var friendly;
          if (res.status === 429) friendly = 'IGNIS is receiving too many signals — give it a minute, then ask again.';
          else if (body && body.code === 'membership_required') friendly = 'IGNIS opens for VaultSparked members. Sign in, or upgrade to enter the oracle.';
          else if (body && body.code === 'quota_exceeded') friendly = 'Your Sparked IGNIS quota is spent for this month. Eternal unlocks unlimited access.';
          else if (res.status === 502 || res.status === 503) friendly = 'IGNIS is offline right now. Try again shortly, or check the Signal Log for what the vault has been shipping.';
          else if (res.status === 400) friendly = body.error || 'IGNIS couldn\'t read that question.';
          else friendly = body.error || ('IGNIS unreachable (' + res.status + ')');
          var err = new Error(friendly);
          err.access = body && body.access ? body.access : null;
          err.code = body && body.code ? body.code : null;
          throw err;
        }
        return body;
      });
    });
  }

  async function mount(host) {
    if (host.dataset.vsOracleMounted === '1') return;
    host.dataset.vsOracleMounted = '1';
    injectStyle();

    var ctx = host.getAttribute('data-vault-oracle-context') ||
              deriveAdaptiveContext(window.location.pathname);
    // In-widget conversation history (last 3 turns → 6 messages max).
    var history = [];
    var session = await getStoredSession();

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

    // ── Membership-gated mount ─────────────────────────────────────────────
    // Ask IGNIS is a VaultSparked / VaultSparked Eternal perk. The widget
    // never shows an input field to visitors who can't use it — instead it
    // renders a locked surface up-front with clear tier + CTA.
    function renderLocked(reason) {
      var message;
      var pills;
      if (reason === 'signed_out') {
        message = 'Ask IGNIS is a VaultSparked member perk. Sparked members get a monthly quota; Eternal members get unlimited access. Sign in or upgrade to open the oracle.';
        pills = [
          { label: 'Sign In →', href: '/vault-member/#login' },
          { label: 'Unlock VaultSparked →', href: '/vaultsparked/' }
        ];
      } else {
        message = 'Ask IGNIS is unlocked for VaultSparked members only. Sparked: monthly quota. Eternal: unlimited access.';
        pills = [
          { label: 'Unlock VaultSparked →', href: '/vaultsparked/' },
          { label: 'Go Eternal →', href: '/vaultsparked/#eternal' }
        ];
      }
      append(log, message, 'ignis');
      renderAccessPills(log, pills);
      var gatedHint = document.createElement('div');
      gatedHint.className = 'vs-oracle__hint';
      gatedHint.textContent = 'Members only — Sparked (monthly quota) · Eternal (unlimited).';
      wrap.appendChild(gatedHint);
      host.appendChild(wrap);
    }

    if (!session) {
      renderLocked('signed_out');
      return;
    }

    // Signed-in visitor: probe membership before rendering the input, so a
    // logged-in non-Sparked account sees the locked state up front instead of
    // discovering the gate after typing a question.
    append(log, '…', 'ignis').textContent = '';
    var probing = document.createElement('div');
    probing.className = 'vs-oracle__hint';
    probing.textContent = 'Checking your access…';
    wrap.appendChild(probing);
    host.appendChild(wrap);

    probeAccess(session).then(function (result) {
      probing.remove();
      // Clear the placeholder ignis row
      while (log.firstChild) log.removeChild(log.firstChild);

      // Fail-open on network/timeout (result === null): let the user try to
      // ask — the ask path already handles every error code with friendly
      // copy + pills. Locking out on a transient probe failure would hide
      // the widget from Sparked members during brief edge-function blips.
      if (result && result.status === 403 && result.body && result.body.code === 'membership_required') {
        renderLocked('not_sparked');
        return;
      }

      renderUnlocked(result && result.body && result.body.access ? result.body.access : null);
    });

    var ORACLE_QUERIES_URL = '/api/oracle-queries.json';
    var starterChipContainer = null;

    function getTierPool(tier) {
      if (!tier) return 'anonymous';
      var t = String(tier).toLowerCase();
      if (t === 'sparked' || t === 'eternal') return 'sparked';
      if (t === 'member') return 'member';
      return 'anonymous';
    }

    function renderStarterChips(queries, form, input) {
      if (!Array.isArray(queries) || !queries.length) return;
      if (starterChipContainer) starterChipContainer.remove();
      starterChipContainer = document.createElement('div');
      starterChipContainer.className = 'vs-oracle__chips vs-oracle__chips--starter';
      queries.forEach(function (q) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vs-oracle__chip vs-oracle__chip--starter';
        btn.textContent = q;
        btn.addEventListener('click', function () {
          input.value = q;
          starterChipContainer.remove();
          starterChipContainer = null;
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        starterChipContainer.appendChild(btn);
      });
      if (starterChipContainer.childElementCount > 0) {
        log.appendChild(starterChipContainer);
        log.scrollTop = log.scrollHeight;
      }
    }

    function loadStarterChips(form, input) {
      var session = window.VSSignedInState && window.VSSignedInState.getSession
        ? window.VSSignedInState.getSession() : null;
      var tier = session && session.tier ? session.tier : null;
      var pool = getTierPool(tier);

      fetch(ORACLE_QUERIES_URL, { cache: 'default' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data && Array.isArray(data[pool]) && data[pool].length) {
            renderStarterChips(data[pool], form, input);
          }
        })
        .catch(function () {});
    }

    function renderUnlocked(initialAccess) {
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

    // Starter chips load after vs:session-ready so tier is known.
    if (window.VSSignedInState && window.VSSignedInState.isResolved()) {
      loadStarterChips(form, input);
    } else {
      document.addEventListener('vs:session-ready', function onReady() {
        document.removeEventListener('vs:session-ready', onReady);
        loadStarterChips(form, input);
      });
    }

    var hint = document.createElement('div');
    hint.className = 'vs-oracle__hint';
    hint.textContent = initialAccess
      ? accessHint(initialAccess, 'Members only — Sparked (monthly quota) · Eternal (unlimited).')
      : 'Members only — Sparked (monthly quota) · Eternal (unlimited). IGNIS reads the live vault snapshot.';
    wrap.appendChild(hint);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var msg = (input.value || '').trim();
      if (!msg) return;
      append(log, msg, 'user');
      input.value = '';
      send.disabled = true;
      var pending = append(log, '…', 'ignis');

      // R1: prefer streaming when ReadableStream is available; fall back to
      // single-shot ask() on stream errors so the widget never breaks.
      var canStream = typeof ReadableStream === 'function' && typeof TextDecoder === 'function';

      function onSuccess(body) {
        var reply = body.reply || '(no reply)';
        pending.textContent = reply;
        hint.textContent = accessHint(body.access, 'IGNIS reads the live vault snapshot.');

        history.push({ role: 'user', content: msg });
        history.push({ role: 'assistant', content: reply });
        if (history.length > 6) history = history.slice(-6);

        renderSuggestions(log, body.suggestions);

        if (window.gtag) {
          var tier = (body.model || '').indexOf('haiku') !== -1 ? 'haiku' : 'sonnet';
          window.gtag('event', 'ignis_ask', {
            value: 1,
            cached: body.cached ? 1 : 0,
            semantic_cache: body.semanticCache ? 1 : 0,
            streamed: body.streamed ? 1 : 0,
            model_tier: tier,
          });
        }
      }

      var streamPromise = canStream
        ? askStream(msg, ctx, history.slice(-6), session, function (delta, soFar) {
            // First delta replaces the placeholder; subsequent appends grow it.
            pending.textContent = soFar;
            log.scrollTop = log.scrollHeight;
          }).then(function (body) { body.streamed = true; return body; })
            .catch(function (err) {
              // Stream failure → quietly retry with non-streaming ask().
              if (window.console) console.warn('[IGNIS] stream failed, falling back', err && err.message);
              return ask(msg, ctx, history.slice(-6), session);
            })
        : ask(msg, ctx, history.slice(-6), session);

      streamPromise.then(onSuccess).catch(function (err) {
        pending.remove();
        append(log, err.message || 'IGNIS is unreachable. Try again in a moment.', 'err');
        if (err && err.access) hint.textContent = accessHint(err.access, hint.textContent);
        if (err && err.code === 'membership_required') {
          renderAccessPills(log, [
            { label: 'Sign In →', href: '/vault-member/#login' },
            { label: 'Unlock VaultSparked →', href: '/vaultsparked/' }
          ]);
        } else if (err && err.code === 'quota_exceeded') {
          renderAccessPills(log, [
            { label: 'Go Eternal →', href: '/vaultsparked/' }
          ]);
        }
      }).finally(function () {
        send.disabled = false;
        input.focus();
      });
    });
    }
  }

  function init() {
    document.querySelectorAll('[data-vault-oracle]').forEach(mount);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VSOracle = { mount: mount };
})();
