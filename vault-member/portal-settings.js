    async function sendPasswordReset() {
      const btn = document.getElementById('pw-reset-btn');
      const msg = document.getElementById('pw-reset-msg');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      try {
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) return;
        const captchaToken = typeof VSTurnstile !== 'undefined' ? await VSTurnstile.getToken() : undefined;
        const { error } = await VSSupabase.auth.resetPasswordForEmail(session.user.email, {
          redirectTo: window.location.origin + '/vault-member/',
          captchaToken,
        });
        if (!error) {
          if (msg) { msg.style.display = ''; }
          if (btn) { btn.textContent = 'Email Sent'; }
        } else {
          if (btn) { btn.disabled = false; btn.textContent = 'Send Password Reset Email'; }
        }
      } catch (_) {
        if (btn) { btn.disabled = false; btn.textContent = 'Send Password Reset Email'; }
      }
    }

    async function exportMyData() {
      const btn = document.getElementById('export-data-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Preparing…'; }
      try {
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) return;
        const uid = session.user.id;

        const [{ data: profile }, { data: points }, { data: challenges }] = await Promise.all([
          VSSupabase.from('vault_members').select('*').eq('id', uid).single(),
          VSSupabase.from('point_events').select('points,reason,label,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(500),
          VSSupabase.from('challenge_submissions').select('challenge_id,created_at').eq('user_id', uid).order('created_at', { ascending: false }),
        ]);

        const exportData = {
          exported_at: new Date().toISOString(),
          email: session.user.email,
          profile: profile || {},
          point_history: points || [],
          challenge_completions: challenges || [],
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'vaultspark-data-' + (profile?.username || uid) + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (_) {}
      if (btn) { btn.disabled = false; btn.textContent = '⬇ Export My Data'; }
    }

    function requestDeleteAccount() {
      const confirmed = confirm(
        'Delete your Vault Member account?\n\n' +
        'This is permanent and irreversible. All your points, achievements, and data will be erased.\n\n' +
        'To confirm, click OK. You will be signed out immediately and your account will be queued for deletion.'
      );
      if (!confirmed) return;
      VSSupabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) return;
        // Mark for deletion in vault_members (soft delete — admin can confirm)
        await VSSupabase.from('vault_members').update({ delete_requested: true }).eq('id', session.user.id).catch(() => {});
        await VSSupabase.auth.signOut();
        window.location.href = '/';
      });
    }

    async function refreshPointsDisplay() {
      try {
        const uid = _currentMember?._id;
        if (!uid) return;
        const { data: row } = await VSSupabase.from('vault_members').select('points').eq('id', uid).single();
        if (!row) return;
        const pts  = row.points;
        const rank = VS.getRank(pts);
        const prog = VS.getRankProgress(pts);
        document.getElementById('profile-pts').textContent  = pts + ' pts';
        document.getElementById('stat-pts').textContent     = pts;
        document.getElementById('info-pts').textContent     = pts + ' pts';
        document.getElementById('stat-rank').textContent    = rank.name;
        document.getElementById('info-rank').textContent    = rank.name;
        document.getElementById('progress-fill').style.width = prog + '%';
        const nxt = VS.getNextRank(pts);
        document.getElementById('pb-current-rank').textContent = rank.name;
        document.getElementById('pb-next').textContent = nxt ? '→ ' + nxt.name + ' at ' + nxt.min + ' pts' : '✦ Maximum rank achieved';
        updateRankProgress(pts);
        loadPointEvents();
      } catch (_) {}
    }

    // ── Vault Member Card (Canvas) ───────────────────────────────
    function rrect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    // ── Card background themes ───────────────────────────────────────
    const CARD_THEMES = [
      { id: 'default',   label: 'Default',   rankReq: 0, accentColor: null,      bg: ['#08080f','#060810','#0c0d18'], glowColor: null        },
      { id: 'rift',      label: 'Rift Blue',  rankReq: 2, accentColor: '#10B981', bg: ['#030e1a','#04111e','#061420'], glowColor: '#1FA2FF'   },
      { id: 'breacher',  label: 'Void',       rankReq: 4, accentColor: '#8B5CF6', bg: ['#0a0414','#090213','#0e0520'], glowColor: '#8B5CF6'   },
      { id: 'forge',     label: 'Forge Fire', rankReq: 7, accentColor: '#D62828', bg: ['#150604','#160505','#1c0807'], glowColor: '#FF7A00'   },
      { id: 'sparked',   label: 'Sparked',    rankReq: 8, accentColor: '#FFC400', bg: ['#0f0b00','#120d00','#180f00'], glowColor: '#FFC400'   },
    ];

    function getCardTheme() {
      return localStorage.getItem('vs_card_theme') || 'default';
    }

    function buildCardThemeRow(member) {
      const row = document.getElementById('card-theme-row');
      if (!row) return;
      const rankIdx = VS.RANKS.findIndex(r => r.name === VS.getRank(member.points).name);
      const active  = getCardTheme();
      row.innerHTML = '';
      CARD_THEMES.forEach(function(t) {
        const locked = rankIdx < t.rankReq;
        const btn = document.createElement('button');
        btn.className = 'card-theme-btn' + (t.id === active ? ' active' : '') + (locked ? ' locked' : '');
        btn.setAttribute('aria-label', t.label + (locked ? ' (locked — requires rank ' + t.rankReq + ')' : ''));
        btn.disabled = locked;
        if (t.id === active) btn.style.background = t.accentColor || '#FFC400';
        else if (!locked && t.accentColor) btn.style.borderColor = t.accentColor + '55';
        btn.innerHTML = t.label + (locked ? '<span class="card-theme-rank-req">Rank ' + t.rankReq + '+</span>' : '');
        if (!locked) {
          btn.addEventListener('click', function() {
            localStorage.setItem('vs_card_theme', t.id);
            buildCardThemeRow(member);
            generateMemberCard(member);
          });
        }
        row.appendChild(btn);
      });
    }

    function generateMemberCard(member) {
      const canvas = document.getElementById('vault-card-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = 680, H = 380;
      canvas.width = W; canvas.height = H;

      const rank   = VS.getRank(member.points);
      const av     = VS.getAvatar(member.avatar_id || 'spark');
      const themeId = getCardTheme();
      const theme   = CARD_THEMES.find(t => t.id === themeId) || CARD_THEMES[0];
      const accent  = theme.accentColor || member.accent || '#FFC400';
      const glowC   = theme.glowColor   || accent;

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, theme.bg[0]); bgGrad.addColorStop(0.6, theme.bg[1]); bgGrad.addColorStop(1, theme.bg[2]);
      ctx.fillStyle = bgGrad;
      rrect(ctx, 0, 0, W, H, 22); ctx.fill();

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.022)'; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Accent glow blob
      const glowGrad = ctx.createRadialGradient(130, H/2, 0, 130, H/2, 140);
      glowGrad.addColorStop(0, glowC + '30'); glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad; ctx.fillRect(0, 0, W, H);
      // Secondary right-side glow for themed cards
      if (themeId !== 'default') {
        const glowGrad2 = ctx.createRadialGradient(W, 0, 0, W, 0, 200);
        glowGrad2.addColorStop(0, glowC + '18'); glowGrad2.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad2; ctx.fillRect(0, 0, W, H);
      }

      // Left accent bar
      const barGrad = ctx.createLinearGradient(0, 0, 0, H);
      barGrad.addColorStop(0, accent); barGrad.addColorStop(1, accent + '44');
      ctx.fillStyle = barGrad; rrect(ctx, 0, 0, 5, H, [22, 0, 0, 22]); ctx.fill();

      // Avatar circle
      ctx.save();
      ctx.beginPath(); ctx.arc(125, H/2, 64, 0, Math.PI*2);
      ctx.fillStyle = av.bg; ctx.fill();
      ctx.strokeStyle = accent + '70'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();

      // Avatar emoji
      ctx.font = '54px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(av.emoji, 125, H/2 + 4);

      // "VAULT MEMBER" label
      ctx.font = 'bold 10px system-ui,sans-serif'; ctx.fillStyle = accent + 'bb';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('VAULT MEMBER', 215, 38);

      // Member number (top right)
      if (member.member_number) {
        ctx.font = '600 10px system-ui,sans-serif';
        ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillText('#' + member.member_number, W - 28, 38);
      }

      // Username
      ctx.font = 'bold 40px system-ui,sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      let uname = member.username || 'VaultMember';
      while (ctx.measureText(uname).width > W - 245 && uname.length > 3) uname = uname.slice(0,-1);
      ctx.fillText(uname, 215, H/2 - 35);

      // Rank pill
      ctx.font = 'bold 10.5px system-ui,sans-serif';
      const rt = rank.name.toUpperCase();
      const rw = ctx.measureText(rt).width + 24;
      ctx.fillStyle = accent + '1e'; rrect(ctx, 215, H/2 - 4, rw, 22, 5); ctx.fill();
      ctx.strokeStyle = accent + '44'; ctx.lineWidth = 1; rrect(ctx, 215, H/2 - 4, rw, 22, 5); ctx.stroke();
      ctx.fillStyle = accent; ctx.textBaseline = 'middle'; ctx.fillText(rt, 227, H/2 + 7);

      // Points
      ctx.font = '600 12px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(member.points + ' pts', 215 + rw + 12, H/2 + 7);

      // Founding badge (if applicable)
      if (member.member_number && member.member_number <= 100) {
        ctx.font = 'bold 9px system-ui,sans-serif';
        const fb = '✦ FOUNDING MEMBER';
        const fw = ctx.measureText(fb).width + 18;
        rrect(ctx, 215 + rw + 60, H/2 - 4, fw, 22, 4);
        ctx.fillStyle = 'rgba(255,196,0,0.1)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,196,0,0.22)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#FFC400'; ctx.textBaseline = 'middle';
        ctx.fillText(fb, 215 + rw + 69, H/2 + 7);
      }

      // Divider
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(215, H/2 + 28); ctx.lineTo(W - 28, H/2 + 28); ctx.stroke();

      // Member since
      const since = new Date(member.createdAt).toLocaleDateString('en-US',{month:'short',year:'numeric'});
      ctx.font = '500 11px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.textBaseline = 'top'; ctx.fillText('Member since ' + since, 215, H/2 + 36);

      // Bottom branding
      ctx.font = '600 10px system-ui,sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillText('VAULTSPARKSTUDIOS.COM', 215, H - 26);
      ctx.textAlign = 'right'; ctx.fillStyle = accent + '55';
      ctx.fillText('THE VAULT IS SPARKED', W - 28, H - 26);

      // Card border
      ctx.strokeStyle = 'rgba(255,255,255,0.055)'; ctx.lineWidth = 1;
      rrect(ctx, 0.5, 0.5, W - 1, H - 1, 21.5); ctx.stroke();
    }

    // ── Feature 5: Achievement progress tracking ─────────────────

    // progress_max values keyed by achievement id (mirrors DB, used client-side)
    const ACHIEVEMENT_PROGRESS_MAX = {
      first_100:        100,
      patron:           5,
      recruiter:        1,
      joined:           1,
      subscribed:       1,
      visit_game:       1,
      lore_read:        1,
      social:           1,
      profile_complete: 1,
    };

    function getAchievementProgress(defId, member, completedChallenges) {
      // Returns { current, max } for display
      const max = ACHIEVEMENT_PROGRESS_MAX[defId] || 1;
      if (max <= 1) return { current: 0, max: 1 };
      switch (defId) {
        case 'first_100':
          return { current: Math.min(member.points, max), max };
        case 'patron':
        case 'recruiter': {
          // Count how many members member's invite code has brought in
          // We don't have that count client-side; use achievement list as proxy
          return { current: 0, max };
        }
        default:
          return { current: 0, max };
      }
    }

    function renderAchievementsGrid(member, achEarned) {
      const grid = document.getElementById('achievement-grid');
      if (!grid) return;
      grid.innerHTML = '';
      VS.ACHIEVEMENT_DEFS.forEach(def => {
        const earned = achEarned.includes(def.id);
        const max    = ACHIEVEMENT_PROGRESS_MAX[def.id] || 1;
        const { current } = getAchievementProgress(def.id, member, []);
        const el = document.createElement('div');
        el.className = 'achievement' + (earned ? '' : ' locked');

        let progressHtml = '';
        if (!earned && max > 1) {
          const pct = Math.min(100, Math.round((current / max) * 100));
          progressHtml = `
            <div style="margin-top:0.5rem;">
              <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--dim);margin-bottom:0.2rem;">
                <span>${current} / ${max}</span>
                <span>${pct}%</span>
              </div>
              <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--gold),#fff6c0);border-radius:2px;transition:width 0.6s ease;"></div>
              </div>
            </div>`;
        } else if (earned && max > 1) {
          progressHtml = `
            <div style="margin-top:0.5rem;">
              <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:#34d399;margin-bottom:0.2rem;">
                <span>${max} / ${max}</span><span>✓ Complete</span>
              </div>
              <div style="height:4px;background:rgba(52,211,153,0.15);border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:100%;background:linear-gradient(90deg,#10B981,#34d399);border-radius:2px;"></div>
              </div>
            </div>`;
        } else if (earned) {
          progressHtml = `<div style="margin-top:0.3rem;height:3px;background:linear-gradient(90deg,#10B981,#34d399);border-radius:2px;opacity:0.5;"></div>`;
        }

        const achIconHtml = def.icon && def.icon.startsWith('/')
          ? `<img src="${def.icon}" alt="${def.name}" width="32" height="32" style="display:block;margin:0 auto 0.1rem;">`
          : def.icon;
        el.innerHTML = `
          <div class="ach-icon">${achIconHtml}</div>
          <div class="ach-name">${def.name}</div>
          <div class="ach-desc">${earned ? def.desc : 'Locked — keep playing to unlock'}</div>
          ${progressHtml}
          ${(!earned && max <= 1) ? '<div style="margin-top:.3rem;font-size:.7rem;color:var(--dim);">🔒 Locked</div>' : ''}
        `;
        grid.appendChild(el);
      });
    }

    // ── Rank progress bar (Vault Stats panel) ────────────────────
    function updateRankProgress(points) {
      const rank    = VS.getRank(points);
      const next    = VS.getNextRank(points);
      const bar     = document.getElementById('rankProgressBar');
      const pct     = document.getElementById('rankProgressPct');
      const label   = document.getElementById('rankNextLabel');
      const heading = document.getElementById('rankProgressLabel');
      if (!bar) return;
      if (!next) {
        bar.style.width      = '100%';
        bar.style.background = '#FFC400';
        if (pct)     pct.textContent     = 'MAX';
        if (label)   label.textContent   = 'Top rank achieved';
        if (heading) heading.textContent = 'Rank progress';
        return;
      }
      const range    = rank.max - rank.min + 1;
      const progress = Math.min(100, Math.round(((points - rank.min) / range) * 100));
      bar.style.width      = progress + '%';
      bar.style.background = 'linear-gradient(90deg,#1FA2FF,#8B5CF6)';
      if (pct)     pct.textContent   = progress + '%';
      if (label)   label.textContent = (rank.max - points + 1) + ' pts to ' + next.name;
      if (heading) heading.textContent = 'Progress to ' + next.name;
    }

    // ── Season XP dashboard mini-widget ──────────────────────────
    function updateSeasonXpWidget(member) {
      const widget = document.getElementById('season-xp-widget');
      if (!widget) return;
      const xp = member.season_xp || 0;
      if (xp === 0 && !member.current_season_id) { widget.style.display = 'none'; return; }
      widget.style.display = '';
      const valEl   = document.getElementById('season-xp-val');
      const barEl   = document.getElementById('season-xp-bar');
      const labelEl = document.getElementById('season-xp-label');
      if (valEl)   valEl.textContent  = xp.toLocaleString() + ' XP';
      // Cap bar at 2000 XP (max season tier approximation until we have live season data)
      const pct = Math.min(100, Math.round((xp / 2000) * 100));
      if (barEl)   barEl.style.width  = pct + '%';
      if (labelEl) labelEl.textContent = xp > 0
        ? 'Season XP earned this season — open Season Pass for tier rewards'
        : 'Play games and complete challenges to earn Season XP';
    }

    // ── Studio Pulse notice banner ────────────────────────────────
    async function loadPulseNotice() {
      try {
        const { data } = await VSSupabase
          .from('studio_pulse')
          .select('message, type, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          const notice = document.getElementById('pulseNotice');
          const text   = document.getElementById('pulseNoticeText');
          const date   = document.getElementById('pulseNoticeDate');
          if (notice && text) {
            text.textContent = data.message || '';
            if (date) date.textContent = new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const dismissed = sessionStorage.getItem('pulse-dismissed-' + data.created_at);
            if (!dismissed) {
              notice.style.display = 'block';
              const closeBtn = notice.querySelector('button');
              if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                  sessionStorage.setItem('pulse-dismissed-' + data.created_at, '1');
                });
              }
            }
          }
        }
      } catch (_) {}
    }

    // ── Init: restore session ────────────────────────────────────
    (async function init() {
      const hash      = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);

      // Supabase v2 (detectSessionInUrl:true) may auto-process the recovery URL
      // before our URL checks run. Listening for PASSWORD_RECOVERY ensures we
      // always show the reset form regardless of which path processes the token.
      VSSupabase.auth.onAuthStateChange(function(event) {
        if (event === 'PASSWORD_RECOVERY') {
          showAuth();
          switchTab('reset');
        }
      });

      // Password reset — PKCE flow (Supabase v2 default): ?code=...&type=recovery
      if (urlParams.get('type') === 'recovery') {
        const code = urlParams.get('code');
        if (code) {
          await VSSupabase.auth.exchangeCodeForSession(code);
        }
        history.replaceState(null, '', window.location.pathname);
        showAuth();
        switchTab('reset');
        return;
      }

      // Password reset — legacy implicit flow: #access_token=...&type=recovery
      if (hash.includes('type=recovery')) {
        const params = new URLSearchParams(hash.slice(1));
        if (params.get('type') === 'recovery') {
          const access_token  = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await VSSupabase.auth.setSession({ access_token, refresh_token });
          }
          history.replaceState(null, '', window.location.pathname);
          showAuth();
          switchTab('reset');
          return;
        }
      }

      // Show referral banner when arriving via ?ref=username
      const refUsername = urlParams.get('ref');
      if (refUsername && /^[a-zA-Z0-9_]{1,32}$/.test(refUsername)) {
        sessionStorage.setItem('vs_ref', refUsername);
        const banner = document.getElementById('referral-banner');
        if (banner) {
          banner.innerHTML = '✦ You were invited by <strong>' + refUsername.replace(/[<>&"]/g, function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}) + '</strong> — create your free account below to join the Vault!';
          banner.style.display = '';
        }
      }

      // Switch to the correct auth tab immediately (before the async session
      // check) so visiting /vault-member/#login never flashes Create Account first.
      if (hash === '#login') switchTab('login');

      // Handle nav Sign In / Join clicks when the user is already on this page
      // (same-page hash changes don't re-run init).
      window.addEventListener('hashchange', function() {
        const h = window.location.hash;
        if (h === '#login') switchTab('login');
        else if (h === '#register') switchTab('register');
      });

      const { data: { session } } = await VSSupabase.auth.getSession();

      if (session) {
        // Phase 38: single bootstrap RPC combines vault_members + recent point_events
        const { data: boot } = await VSSupabase.rpc('get_member_bootstrap');
        const row = boot?.member || null;

        if (row) {
          // Cache prefetched events so loadPointEvents() can skip an extra round-trip
          if (Array.isArray(boot.events) && boot.events.length > 0) {
            window._prefetchedEvents = boot.events;
          }
          // Phase 7: auto-save discord_id if user has a Discord identity not yet stored.
          // This handles both Discord OAuth users and returning "Connect Discord" linkers.
          if (!row.discord_id) {
            const discordIdentity = session.user.identities?.find(i => i.provider === 'discord');
            if (discordIdentity) {
              const did = String(discordIdentity.id || discordIdentity.user_id || '');
              if (did) {
                await VSSupabase.rpc('save_discord_id', { p_discord_id: did }).catch(() => {});
                row.discord_id = did;
              }
            }
          }
          if (localStorage.getItem('vs_link_discord') === '1') {
            localStorage.removeItem('vs_link_discord');
          }
          showDashboard(buildMember(session.user, row));

          // Phase 44: gift checkout success toast
          const qp = new URLSearchParams(window.location.search);
          if (qp.get('gift') === 'success') {
            const toName = qp.get('to') ? ' to ' + escHtml(qp.get('to')) : '';
            setTimeout(() => showToast('🎁 Gift sent' + toName + '! +50 XP', { emoji: '' }), 600);
            history.replaceState(null, '', window.location.pathname);
          }

          return;
        }

        // Authenticated but no vault_members row → OAuth new user needs to complete profile
        showAuth();
        switchTab('oauth-complete');
        // Pre-fill username from OAuth metadata if available
        const oauthName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
        if (oauthName) {
          const handle = oauthName.replace(/[^a-zA-Z0-9_]/g,'').slice(0,24);
          const userInput = document.getElementById('oauth-username');
          if (userInput && !userInput.value) userInput.value = handle;
        }
        return;
      }

      showAuth();
      if (hash === '#register') switchTab('register');
      else if (hash === '#login') switchTab('login');

      // Show app name in subtitle if redirected from a gated tool
      const appName = VSGate.getNextAppName();
      if (appName) {
        const heroP = document.querySelector('.member-page-hero p');
        if (heroP) {
          heroP.textContent = `Sign in or create your Vault Member account to access ${appName}.`;
        }
      }
    })();
