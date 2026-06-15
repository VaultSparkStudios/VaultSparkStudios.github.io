/* vault-rank-bar.js — ambient rank progress bar for signed-in members.
 *
 * Renders a 2px gradient bar at the very bottom of the viewport showing
 * progress to the next Vault rank. Subtle — no UI surface, no banner.
 * Visible only when signed in. Hides at max rank (The Sparked / 5000+).
 *
 * Listens for vs:session-ready from signed-in-state.js (no extra auth call).
 * Points data fetched from vault_members table on first sign-in per session.
 * Cached in sessionStorage to avoid re-querying across navigations.
 */
(function () {
  'use strict';

  var RANK_THRESHOLDS = [
    { title: 'Spark Initiate', min: 0,    next: 50 },
    { title: 'Vault Runner',   min: 50,   next: 100 },
    { title: 'Rift Scout',     min: 100,  next: 200 },
    { title: 'Vault Guard',    min: 200,  next: 400 },
    { title: 'Vault Breacher', min: 400,  next: 800 },
    { title: 'Void Operative', min: 800,  next: 1500 },
    { title: 'Vault Keeper',   min: 1500, next: 2500 },
    { title: 'Forge Master',   min: 2500, next: 5000 },
    { title: 'The Sparked',    min: 5000, next: null },
  ];

  var STORAGE_KEY = 'vs-rank-bar-data';
  var BAR_ID = 'vs-rank-bar';
  var VELOCITY_ID = 'vs-rank-velocity';
  var barEl = null;

  function getRankProgress(points) {
    var p = Number(points) || 0;
    for (var i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
      if (p >= RANK_THRESHOLDS[i].min) {
        var tier = RANK_THRESHOLDS[i];
        if (tier.next === null) return { pct: 100, rank: tier.title, maxed: true };
        var pct = Math.min(100, Math.round(((p - tier.min) / (tier.next - tier.min)) * 100));
        return { pct: pct, rank: tier.title, next: RANK_THRESHOLDS[i + 1].title, maxed: false };
      }
    }
    return { pct: 0, rank: 'Spark Initiate', next: 'Vault Runner', maxed: false };
  }

  function ensureBar() {
    if (barEl) return barEl;
    barEl = document.createElement('div');
    barEl.id = BAR_ID;
    barEl.setAttribute('aria-hidden', 'true');
    barEl.setAttribute('title', '');
    var style = document.createElement('style');
    style.textContent =
      '#vs-rank-bar{position:fixed;bottom:0;left:0;height:2px;background:var(--vs-gold,#ffc400);' +
      'width:0%;transition:width 1.4s cubic-bezier(.25,.8,.25,1);z-index:9999;pointer-events:none;}' +
      '#vs-rank-bar.vs-rank-bar--ready{opacity:1;}' +
      '#vs-rank-bar.vs-rank-bar--maxed{background:linear-gradient(90deg,#ffc400,#ff7a00);}' +
      // WCAG 2.3.3 — motion-sensitive visitors get the bar at its final width with no sweep.
      '@media(prefers-reduced-motion:reduce){#vs-rank-bar{transition:none;}}';
    document.head.appendChild(style);
    document.body.appendChild(barEl);
    return barEl;
  }

  function renderBar(data) {
    if (!data || data.pct === undefined) return;
    var bar = ensureBar();
    var titleBase = data.maxed
      ? 'Rank: The Sparked — max rank'
      : ('Rank progress: ' + data.rank + ' → ' + (data.next || '') + ' (' + data.pct + '%)');
    var velocityNote = data.weeksToNext
      ? ' · At your pace: ' + data.next + ' in ~' + data.weeksToNext + ' week' + (data.weeksToNext === 1 ? '' : 's')
      : '';
    bar.setAttribute('title', titleBase + velocityNote);
    if (data.maxed) {
      bar.classList.add('vs-rank-bar--maxed');
    }
    // S199: show velocity chip on /ranks/ and /vault-member/ pages where space exists.
    var onRankPage = /^\/(ranks|vault-member)\b/.test(location.pathname);
    if (!data.maxed && data.weeksToNext && data.next && onRankPage) {
      renderVelocityChip(data);
    }
    // S201: share button on rank pages (and /membership/).
    if (onRankPage || /^\/membership\b/.test(location.pathname)) {
      injectShareBtn(data);
    }
    // Defer width set by a frame so the CSS transition fires.
    requestAnimationFrame(function () {
      bar.classList.add('vs-rank-bar--ready');
      bar.style.width = (data.pct || 0) + '%';
    });
  }

  // S199 membership-rank-velocity: brief velocity chip that fades in above rank bar.
  function renderVelocityChip(data) {
    if (document.getElementById(VELOCITY_ID)) return;
    var chip = document.createElement('div');
    chip.id = VELOCITY_ID;
    chip.setAttribute('aria-live', 'polite');
    chip.textContent = 'At your pace: ' + data.next + ' in ~' + data.weeksToNext + ' week' + (data.weeksToNext === 1 ? '' : 's');
    var style = document.createElement('style');
    style.textContent =
      '#vs-rank-velocity{position:fixed;bottom:8px;right:12px;z-index:9998;' +
      'padding:.28rem .7rem;background:rgba(13,17,28,.92);border:1px solid rgba(255,196,0,.25);' +
      'border-radius:8px;font-size:.74rem;font-weight:600;color:rgba(255,255,255,.7);' +
      'pointer-events:none;opacity:0;transition:opacity .6s ease .8s;}' +
      '#vs-rank-velocity.vs-velocity--visible{opacity:1;}' +
      '@media(prefers-reduced-motion:reduce){#vs-rank-velocity{transition:none;}}';
    document.head.appendChild(style);
    document.body.appendChild(chip);
    requestAnimationFrame(function () { chip.classList.add('vs-velocity--visible'); });
  }

  // S201 shareable-rank-progress-card: canvas card + Web Share API.
  function buildShareCard(data) {
    return new Promise(function (resolve, reject) {
      try {
        var W = 800, H = 360;
        var canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        var ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('no-canvas')); return; }

        // Background
        ctx.fillStyle = '#06070b';
        ctx.fillRect(0, 0, W, H);

        // Gold top accent bar
        var topGrd = ctx.createLinearGradient(0, 0, W, 0);
        topGrd.addColorStop(0, '#ffc400');
        topGrd.addColorStop(1, '#ff7a00');
        ctx.fillStyle = topGrd;
        ctx.fillRect(0, 0, W, 5);

        // Subtle grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (var gx = 0; gx < W; gx += 40) {
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }

        // Brand label
        ctx.fillStyle = 'rgba(255,196,0,0.6)';
        ctx.font = '600 13px system-ui,-apple-system,sans-serif';
        ctx.letterSpacing = '0.12em';
        ctx.fillText('VAULTSPARK STUDIOS', 44, 54);
        ctx.letterSpacing = '0';

        // Rank title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px system-ui,-apple-system,sans-serif';
        ctx.fillText(data.rank, 44, 126);

        // Progress bar track
        var BAR_X = 44, BAR_Y = 158, BAR_W = W - 88, BAR_H = 10, BAR_R = 5;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath();
        ctx.moveTo(BAR_X + BAR_R, BAR_Y);
        ctx.arcTo(BAR_X + BAR_W, BAR_Y, BAR_X + BAR_W, BAR_Y + BAR_H, BAR_R);
        ctx.arcTo(BAR_X + BAR_W, BAR_Y + BAR_H, BAR_X, BAR_Y + BAR_H, BAR_R);
        ctx.arcTo(BAR_X, BAR_Y + BAR_H, BAR_X, BAR_Y, BAR_R);
        ctx.arcTo(BAR_X, BAR_Y, BAR_X + BAR_W, BAR_Y, BAR_R);
        ctx.closePath();
        ctx.fill();

        // Progress bar fill
        var fillW = Math.max(BAR_R * 2, Math.round(BAR_W * data.pct / 100));
        var fg = ctx.createLinearGradient(BAR_X, 0, BAR_X + fillW, 0);
        fg.addColorStop(0, '#ffc400');
        fg.addColorStop(1, '#ff7a00');
        ctx.fillStyle = data.maxed ? fg : fg;
        ctx.beginPath();
        ctx.moveTo(BAR_X + BAR_R, BAR_Y);
        ctx.arcTo(BAR_X + fillW, BAR_Y, BAR_X + fillW, BAR_Y + BAR_H, BAR_R);
        ctx.arcTo(BAR_X + fillW, BAR_Y + BAR_H, BAR_X, BAR_Y + BAR_H, BAR_R);
        ctx.arcTo(BAR_X, BAR_Y + BAR_H, BAR_X, BAR_Y, BAR_R);
        ctx.arcTo(BAR_X, BAR_Y, BAR_X + fillW, BAR_Y, BAR_R);
        ctx.closePath();
        ctx.fill();

        // Percentage label
        ctx.fillStyle = '#ffc400';
        ctx.font = 'bold 30px system-ui,-apple-system,sans-serif';
        ctx.fillText(data.pct + '%', 44, 214);

        // Next rank label
        if (!data.maxed && data.next) {
          ctx.fillStyle = 'rgba(255,255,255,0.42)';
          ctx.font = '400 17px system-ui,-apple-system,sans-serif';
          var pctW = ctx.measureText(data.pct + '%').width;
          ctx.fillText('→ ' + data.next, 44 + pctW + 12, 214);
        } else if (data.maxed) {
          ctx.fillStyle = 'rgba(255,196,0,0.55)';
          ctx.font = '400 15px system-ui,-apple-system,sans-serif';
          ctx.fillText('MAX RANK ACHIEVED', 44 + 80, 214);
        }

        // Velocity line
        if (data.weeksToNext && data.next) {
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = '400 14px system-ui,-apple-system,sans-serif';
          ctx.fillText('On track for ' + data.next + ' in ~' + data.weeksToNext + (data.weeksToNext === 1 ? ' week' : ' weeks'), 44, 254);
        }

        // Site URL
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '400 13px system-ui,-apple-system,sans-serif';
        ctx.fillText('vaultsparkstudios.com/ranks/', 44, H - 28);

        canvas.toBlob(function (blob) {
          if (blob) resolve(blob); else reject(new Error('blob-null'));
        }, 'image/png');
      } catch (err) { reject(err); }
    });
  }

  function emitShareEvent(outcome) {
    try {
      navigator.sendBeacon('/v/rum', JSON.stringify({
        ux: 'share:rank-card:' + outcome,
        route: location.pathname,
        ts: Date.now()
      }));
    } catch (_) {}
  }

  function showShareToast(msg) {
    var t = document.getElementById('vs-rank-share-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'vs-rank-share-toast';
      var s = document.createElement('style');
      s.textContent =
        '#vs-rank-share-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%) translateY(8px);' +
        'z-index:10001;padding:.45rem 1.1rem;background:rgba(13,17,28,.96);border:1px solid rgba(255,196,0,.35);' +
        'border-radius:10px;font-size:.8rem;font-weight:600;color:#ffc400;opacity:0;' +
        'transition:opacity .3s,transform .3s;pointer-events:none;}' +
        '#vs-rank-share-toast.vs-toast--show{opacity:1;transform:translateX(-50%) translateY(0);}';
      document.head.appendChild(s);
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('vs-toast--show');
    setTimeout(function () { t.classList.remove('vs-toast--show'); }, 2400);
  }

  async function shareRankCard(data) {
    var blob;
    try { blob = await buildShareCard(data); }
    catch (_) { emitShareEvent('error'); return; }

    var slug = (data.rank || 'rank').toLowerCase().replace(/\s+/g, '-');
    var file = new File([blob], 'vault-rank-' + slug + '.png', { type: 'image/png' });
    var shareText = data.maxed
      ? 'I reached max rank at VaultSpark Studios — ' + data.rank + '!'
      : 'I\'m a ' + data.rank + ' at VaultSpark Studios — ' + data.pct + '% to ' + (data.next || 'next rank') + '!';

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: 'My Vault Rank: ' + data.rank, text: shareText, files: [file] });
        emitShareEvent('native');
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') { emitShareEvent('cancel'); return; }
      }
    }

    // Fallback: clipboard copy
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      emitShareEvent('copy');
      showShareToast('Rank card copied!');
    } catch (_) {
      emitShareEvent('error');
      showShareToast('Share not supported on this browser.');
    }
  }

  var SHARE_BTN_ID = 'vs-rank-share-btn';

  function injectShareBtn(data) {
    if (document.getElementById(SHARE_BTN_ID)) return;
    var btn = document.createElement('button');
    btn.id = SHARE_BTN_ID;
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Share your rank card');
    btn.textContent = 'Share Rank';
    var s = document.createElement('style');
    s.textContent =
      '#vs-rank-share-btn{position:fixed;bottom:18px;right:12px;z-index:9998;' +
      'padding:.32rem .85rem;background:rgba(13,17,28,.92);border:1px solid rgba(255,196,0,.32);' +
      'border-radius:8px;font-size:.74rem;font-weight:700;color:rgba(255,196,0,.9);cursor:pointer;' +
      'opacity:0;transition:opacity .6s ease 1.2s,border-color .2s,color .2s;}' +
      '#vs-rank-share-btn.vs-share--visible{opacity:1;}' +
      '#vs-rank-share-btn:hover{border-color:rgba(255,196,0,.7);color:#ffc400;}' +
      '@media(prefers-reduced-motion:reduce){#vs-rank-share-btn{transition:none;}}';
    document.head.appendChild(s);
    document.body.appendChild(btn);
    btn.addEventListener('click', function () { shareRankCard(data); });
    requestAnimationFrame(function () { btn.classList.add('vs-share--visible'); });
  }

  function getCached() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function setCache(data) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
  }

  async function fetchAndRender(userId) {
    // Check session cache first (avoids re-query on same-session navigations).
    var cached = getCached();
    if (cached && cached.userId === userId) {
      renderBar(cached);
      return;
    }
    try {
      var sb = window.VSSupabase;
      if (!sb) return;
      // S199: add created_at for velocity projection (no PII risk — own member row).
      var res = await sb.from('vault_members').select('points, rank_name, created_at').eq('id', userId).maybeSingle();
      if (!res || !res.data) return;
      var points = Number(res.data.points) || 0;
      var progress = getRankProgress(points);

      // S199 membership-rank-velocity: project weeks to next tier.
      var weeksToNext = null;
      if (!progress.maxed && res.data.created_at) {
        var joinMs = new Date(res.data.created_at).getTime();
        var daysSinceJoin = Math.max(1, (Date.now() - joinMs) / 86400000);
        var pointsPerDay = points / daysSinceJoin;
        if (pointsPerDay > 0) {
          var currentTier = RANK_THRESHOLDS.find(function (r) { return r.title === progress.rank; });
          if (currentTier && currentTier.next !== null) {
            var pointsNeeded = currentTier.next - points;
            weeksToNext = Math.ceil(pointsNeeded / (pointsPerDay * 7));
            if (weeksToNext < 1) weeksToNext = 1;
            if (weeksToNext > 999) weeksToNext = null; // suppress implausible projections
          }
        }
      }

      var data = { userId: userId, pct: progress.pct, rank: progress.rank, next: progress.next, maxed: progress.maxed, weeksToNext: weeksToNext };
      setCache(data);
      renderBar(data);
    } catch (_) { /* silent */ }
  }

  document.addEventListener('vs:session-ready', function (e) {
    var detail = (e && e.detail) || {};
    if (!detail.signedIn) return;
    var session = detail.session;
    var userId = session && (session.userId || (session.raw && session.raw.user && session.raw.user.id));
    if (!userId) return;
    // Defer to idle to avoid LCP competition.
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function () { fetchAndRender(userId); }, { timeout: 3000 });
    } else {
      setTimeout(function () { fetchAndRender(userId); }, 2000);
    }
  });
})();
