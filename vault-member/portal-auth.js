    // ── UI helpers ──────────────────────────────────────────────
    function showAuth() {
      // Phase 10: tear down realtime channel on logout/auth switch
      if (_pulseChannel) { VSSupabase.removeChannel(_pulseChannel); _pulseChannel = null; }
      // Feature 3: tear down notification realtime channel
      if (_notifRealtimeCh) { VSSupabase.removeChannel(_notifRealtimeCh); _notifRealtimeCh = null; }
      document.getElementById('auth-view').style.display = '';
      document.getElementById('dashboard-view').style.display = 'none';
      const _navAccWrap = document.getElementById('nav-account-wrap');
      if (_navAccWrap) _navAccWrap.style.display = 'none';
      const bellWrap = document.getElementById('notif-bell-wrap');
      if (bellWrap) bellWrap.style.display = 'none';
      const _navSignIn = document.getElementById('nav-signin-link');
      if (_navSignIn) _navSignIn.style.display = '';
      const _navJoin = document.getElementById('nav-join-btn');
      if (_navJoin) _navJoin.style.display = '';
    }

    function showDashboard(member) {
      _currentMember = member;

      document.getElementById('auth-view').style.display = 'none';
      document.getElementById('dashboard-view').style.display = 'block';

      // Nav — show account dropdown, hide sign-in/join
      const navWrap = document.getElementById('nav-account-wrap');
      if (navWrap) navWrap.style.display = '';
      const _navName = document.getElementById('nav-account-name');
      if (_navName) _navName.textContent = member.username;
      const _navSignIn2 = document.getElementById('nav-signin-link');
      if (_navSignIn2) _navSignIn2.style.display = 'none';
      const _navJoin2 = document.getElementById('nav-join-btn');
      if (_navJoin2) _navJoin2.style.display = 'none';

      const rank     = VS.getRank(member.points);
      const nextRank = VS.getNextRank(member.points);
      const progress = VS.getRankProgress(member.points);
      const createdDate = new Date(member.createdAt);
      const daysInVault = Math.floor((Date.now() - createdDate) / 86400000);

      // Avatar + accent
      applyAvatar(member.avatar_id || 'spark', member.accent || '#FFC400');

      // Profile card
      document.getElementById('profile-username').textContent = member.username;

      const rankBadge = document.getElementById('profile-rank-badge');
      rankBadge.textContent = rank.name;
      rankBadge.className   = 'rank-badge badge ' + rank.badgeClass;

      document.getElementById('profile-pts').textContent = member.points + ' pts';
      document.getElementById('profile-since').textContent =
        'Member since ' + createdDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      // Bio
      const bioEl = document.getElementById('profile-bio');
      if (bioEl) { bioEl.textContent = member.bio || ''; bioEl.style.display = member.bio ? '' : 'none'; }

      // Member number + founding badge
      const numEl = document.getElementById('profile-member-number');
      if (numEl) numEl.textContent = member.member_number ? '#' + member.member_number : '';
      const foundingEl = document.getElementById('profile-founding-badge');
      if (foundingEl) foundingEl.style.display = (member.member_number && member.member_number <= 100) ? '' : 'none';

      // Avatar glow for Vault Keeper, Forge Master + The Sparked
      const rankIdx = VS.RANKS.findIndex(r => r.name === rank.name);
      const profileAvEl = document.getElementById('profile-avatar');
      if (profileAvEl) profileAvEl.classList.toggle('rank-elite', rankIdx >= 6);

      document.getElementById('pb-current-rank').textContent = rank.name;
      document.getElementById('pb-next').textContent = nextRank
        ? '→ ' + nextRank.name + ' at ' + nextRank.min + ' pts'
        : '✦ Maximum rank achieved';
      document.getElementById('progress-fill').style.width = progress + '%';

      // Feature 1: show streak badge immediately from cached member data
      updateStreakBadge(member.streak_count || 0);

      // Stats panel
      document.getElementById('stat-pts').textContent   = member.points;
      document.getElementById('stat-rank').textContent  = rank.name;
      document.getElementById('stat-since').textContent =
        createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      // Rank progress bar in stats panel
      updateRankProgress(member.points);

      // Season XP mini-widget
      updateSeasonXpWidget(member);

      // Referral link
      const refLink = document.getElementById('referralLink');
      if (refLink && member.username) {
        refLink.textContent = 'https://vaultsparkstudios.com/vault-member/?ref=' + member.username;
      }

      const achEarned = (member.achievements || []).map(a => a.id);
      document.getElementById('stat-achievements').textContent =
        achEarned.length + ' / ' + VS.ACHIEVEMENT_DEFS.length;

      // VaultSparked badge + CTA visibility
      const sparkedBadge  = document.getElementById('profile-sparked-badge');
      const ctaPanel      = document.getElementById('vaultsparked-cta-panel');
      const proCtaPanel   = document.getElementById('vaultsparked-pro-cta-panel');
      const profileAvEl2  = document.getElementById('profile-avatar');

      // Apply plan state from row data immediately (if plan_key present)
      const rowPlanKey = member.plan_key || 'free';
      const rowIsSparked = typeof VSMembership !== 'undefined'
        ? VSMembership.isVaultSparkedPlan(rowPlanKey)
        : (rowPlanKey === 'vault_sparked' || rowPlanKey === 'vault_sparked_pro');
      const rowIsPro = rowPlanKey === 'vault_sparked_pro';

      if (sparkedBadge) sparkedBadge.style.display = rowIsSparked ? '' : 'none';
      if (ctaPanel)     ctaPanel.style.display     = rowIsSparked ? 'none' : '';
      if (proCtaPanel)  proCtaPanel.style.display  = (rowIsSparked && !rowIsPro) ? '' : 'none';
      if (profileAvEl2) {
        profileAvEl2.classList.toggle('sparked-theme', rowIsSparked && !rowIsPro);
        profileAvEl2.classList.toggle('pro-theme', rowIsPro);
      }

      // Async subscription check as authoritative fallback (catches members where plan_key column may be missing)
      VSSupabase.from('subscriptions')
        .select('status, plan, current_period_end')
        .eq('user_id', member._id)
        .maybeSingle()
        .then(({ data: sub }) => {
          const planKey   = VSMembership.getActivePlanKey(sub);
          const isSparked = VSMembership.isVaultSparkedPlan(planKey);
          const isPro     = VSMembership.isVaultSparkedProPlan
            ? VSMembership.isVaultSparkedProPlan(planKey)
            : planKey === 'vault_sparked_pro';

          if (sparkedBadge) sparkedBadge.style.display = isSparked ? '' : 'none';
          if (ctaPanel)     ctaPanel.style.display     = isSparked ? 'none' : '';
          if (proCtaPanel)  proCtaPanel.style.display  = (isSparked && !isPro) ? '' : 'none';
          if (profileAvEl2) {
            profileAvEl2.classList.toggle('sparked-theme', isSparked && !isPro);
            profileAvEl2.classList.toggle('pro-theme', isPro);
          }

          member.is_sparked = !!isSparked;
          member.plan_key   = planKey;
          member.is_pro     = isPro;
          updateVaultStatusPanel(member, { isSparked: isSparked });
          updateClaimCenter(member, { isSparked: isSparked });
        }).catch(() => {
          if (sparkedBadge) sparkedBadge.style.display = 'none';
          if (ctaPanel)     ctaPanel.style.display     = '';
          if (proCtaPanel)  proCtaPanel.style.display  = 'none';
          member.is_sparked = false;
          member.plan_key   = 'free';
          member.is_pro     = false;
          updateVaultStatusPanel(member, { isSparked: false });
          updateClaimCenter(member, { isSparked: false });
        });

      // Extended stats (PromoGrind / Ledger)
      VSSupabase.rpc('get_member_stats', { p_user_id: member._id }).then(({ data: stats }) => {
        const calcsEl  = document.getElementById('stat-calcs');
        const ledgerEl = document.getElementById('stat-ledger');
        if (stats && calcsEl)  calcsEl.textContent  = stats.calc_count   ?? '0';
        if (stats && ledgerEl) ledgerEl.textContent = stats.ledger_count ?? '0';
      }).catch(() => {
        const calcsEl  = document.getElementById('stat-calcs');
        const ledgerEl = document.getElementById('stat-ledger');
        if (calcsEl)  calcsEl.textContent  = '—';
        if (ledgerEl) ledgerEl.textContent = '—';
      });

      // Achievements grid (Feature 5: with progress bars)
      renderAchievementsGrid(member, achEarned);

      // Newsletter prefs
      if (member.prefs) {
        const up   = document.getElementById('toggle-updates');
        const lore = document.getElementById('toggle-lore');
        const acc  = document.getElementById('toggle-access');
        if (up)   up.checked   = member.prefs.updates !== false;
        if (lore) lore.checked = member.prefs.lore    !== false;
        if (acc)  acc.checked  = member.prefs.access  !== false;
      }

      // Settings tab — populate
      buildAvatarGrid(member.avatar_id || 'spark');
      buildColorPalette(member.accent  || '#FFC400');
      const bioInput = document.getElementById('settings-bio');
      const bioCount = document.getElementById('bio-char-count');
      if (bioInput) { bioInput.value = member.bio || ''; }
      if (bioCount) { bioCount.textContent = (member.bio || '').length; }

      // Account info
      const setInfo = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setInfo('info-username',      member.username);
      setInfo('info-email',         member.email || '—');
      setInfo('info-rank',          rank.name);
      setInfo('info-pts',           member.points + ' pts');
      setInfo('info-since',         createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
      setInfo('info-days',          daysInVault === 0 ? 'Joined today' : daysInVault + (daysInVault === 1 ? ' day' : ' days'));
      setInfo('info-member-number', member.member_number ? '#' + member.member_number + (member.member_number <= 100 ? ' — Founding Member ✦' : '') : '—');
      updateVaultStatusPanel(member, { isSparked: member.is_sparked });
      updateClaimCenter(member, { isSparked: member.is_sparked });

      // Check for rank-up (delayed so dashboard renders first)
      setTimeout(() => checkRankUp(member), 800);

      // Phase 2/3: load activity feed, award eligible points, load invite code
      loadPointEvents();
      setTimeout(() => { initPointsEconomy(member); initGameSessionMilestones(member); loadCurrentlyPlaying(member); }, 1200);
      loadTeamPanel(member);
      loadInviteCode();
      loadReferralMilestones();

      // Feature 1: daily login bonus + streak
      setTimeout(() => checkDailyLogin(member), 600);

      // Phase 7: populate Discord status in settings
      updateDiscordUI(member.discord_id);

      // Phase 9: register service worker + load push toggle state
      registerServiceWorker().then(() => loadPushStatus());

      // Phase 10: start live studio pulse
      initStudioPulse();
      loadPulseNotice();

      // Phase 4/5/6/7/8: load challenges, auto-complete eligible ones, reset lazy-load flags
      _archiveLoaded   = false;
      _chronicleLoaded = false;
      _betaKeysLoaded  = false;
      _seasonPassLoaded = false;
      _treasuryLoaded  = false;
      loadChallenges();
      setTimeout(() => initChallenges(member), 1800);

      // Feature 2: onboarding tour for new members
      setTimeout(() => maybeStartOnboarding(member), 1200);

      // Feature 3: notification center
      initNotifCenter();

      // Vault Command tab — VaultSpark account only
      const isAdmin = member.username.toLowerCase() === 'vaultspark';
      const adminTabEl    = document.getElementById('tab-dash-admin');
      const navAdminLink  = document.getElementById('nav-admin-link');
      if (adminTabEl)   adminTabEl.style.display   = isAdmin ? '' : 'none';
      if (navAdminLink) navAdminLink.style.display = isAdmin ? '' : 'none';
      if (isAdmin) { loadInvRequests('pending'); loadFanArtQueue('pending'); loadAdminPolls(); }

      // Restore active tab from last session
      const savedTab = localStorage.getItem('vs_active_tab');
      if (savedTab && savedTab !== 'dashboard') switchDashTab(savedTab);

      // What's New modal — check for unread Studio Pulse entries
      setTimeout(() => checkWhatsNew(), 2500);

      // Phase 24: anniversary check + weekly recap
      setTimeout(() => checkVaultAnniversary(member), 3200);
      checkWeeklyRecap(member);

      // Phase 25: member spotlight + rank comparison
      setTimeout(() => loadMemberSpotlight(), 1500);
      setTimeout(() => loadRankComparison(member), 1800);
    }

    // ── Current member reference (for card generation etc.) ──────
    let _currentMember = null;
    let _lastFocus = null; // restored when a modal closes

    // Traps keyboard focus inside a modal dialog; focuses first focusable element
    function _trapFocus(el) {
      const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
      const nodes = [...el.querySelectorAll(FOCUSABLE)];
      if (!nodes.length) return;
      nodes[0].focus();
      function onKey(e) {
        if (e.key === 'Escape') { el.dispatchEvent(new CustomEvent('vs:close')); return; }
        if (e.key !== 'Tab') return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
        else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
      }
      el._trapHandler = onKey;
      el.addEventListener('keydown', onKey);
    }
    function _releaseFocus(el) {
      if (el && el._trapHandler) { el.removeEventListener('keydown', el._trapHandler); el._trapHandler = null; }
      if (_lastFocus) { try { _lastFocus.focus(); } catch(_) {} _lastFocus = null; }
    }

    // ── Maps a Supabase vault_members row + user to the member shape ──────────
    function buildMember(user, row) {
      return {
        _id:             user.id,
        username:        row.username,
        points:          row.points,
        subscribed:      row.subscribed,
        prefs:           row.prefs           || { updates: true, lore: true, access: true },
        achievements:    row.achievements    || [],
        createdAt:       row.created_at,
        email:           user.email,
        bio:             row.bio             || '',
        avatar_id:       row.avatar_id       || 'spark',
        accent:          row.accent          || '#FFC400',
        member_number:   row.member_number   || null,
        discord_id:      row.discord_id      || null,
        is_sparked:      !!row.is_sparked,
        plan_key:        row.plan_key        || 'free',
        is_pro:          row.plan_key === 'vault_sparked_pro',
        streak_count:         row.streak_count         || 0,
        last_login_date:      row.last_login_date      || null,
        onboarding_completed: row.onboarding_completed || false,
        challenge_streak:     row.challenge_streak     || 0,
        last_challenge_date:  row.last_challenge_date  || null,
      };
    }

    // ── Form: Register ───────────────────────────────────────────
    document.getElementById('register-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const email      = document.getElementById('reg-email').value.trim();
      const username   = document.getElementById('reg-username').value.trim();
      const password   = document.getElementById('reg-password').value;
      const inviteCode = document.getElementById('reg-invite').value.trim().toUpperCase();
      const subscribe  = document.getElementById('reg-subscribe').checked;
      const errEl      = document.getElementById('reg-error');
      const btn        = this.querySelector('button[type="submit"]');

      errEl.classList.remove('show');

      // Client-side rate limit: max 3 registration attempts per 10 minutes
      const rlKey = 'vs_reg_attempts';
      const now   = Date.now();
      try {
        const stored = JSON.parse(localStorage.getItem(rlKey) || '[]');
        const recent = stored.filter(function(t){ return now - t < 600000; }); // 10 min window
        if (recent.length >= 3) {
          errEl.textContent = 'Too many attempts. Please wait a few minutes before trying again.';
          errEl.classList.add('show');
          return;
        }
        recent.push(now);
        localStorage.setItem(rlKey, JSON.stringify(recent));
      } catch(_) {}

      btn.textContent = 'Creating account…';
      btn.disabled    = true;

      try {
        // 1. If invite code provided, do a fast client-side pre-check
        if (inviteCode) {
          const { data: codeCheck } = await VSSupabase
            .from('invite_codes')
            .select('code')
            .eq('code', inviteCode.toUpperCase().trim())
            .single();

          if (!codeCheck) {
            throw new Error('Invalid or already used invite code.');
          }
        }

        // 2. Create Supabase auth user
        const captchaToken = typeof VSTurnstile !== 'undefined' ? await VSTurnstile.getToken() : undefined;
        const { data: authData, error: authErr } = await VSSupabase.auth.signUp({
          email,
          password,
          options: { data: { username }, captchaToken },
        });

        if (authErr) throw new Error(authErr.message);

        // 3. Register vault member — uses register_open (invite optional)
        //    If invite code present: redeems it for +50 XP bonus + inviter reward
        //    If no invite code: creates free account with 10 starter XP
        // p_ref_by: DB function register_open must accept this param (add column if not present)
        const { data: rpcResult, error: rpcErr } = await VSSupabase
          .rpc('register_open', {
            p_username:    username,
            p_subscribe:   subscribe,
            p_invite_code: inviteCode || '',
            p_ref_by:      sessionStorage.getItem('vs_ref') || '',
          });

        if (rpcErr) throw new Error(rpcErr.message);
        if (rpcResult?.error) throw new Error(rpcResult.error);

        // 4. Subscribe to Kit newsletter
        if (subscribe && typeof VaultKit !== 'undefined') {
          VaultKit.subscribe(email, VaultKit.ALL_TAGS).catch(() => {});
        }

        // 5. Show confirmation — user must verify email before logging in
        errEl.style.background = 'rgba(16,185,129,0.08)';
        errEl.style.borderColor = 'rgba(16,185,129,0.25)';
        errEl.style.color = '#34d399';
        errEl.textContent = 'Account created! Check your email to confirm your address, then sign in below.';
        errEl.classList.add('show');
        btn.textContent = 'Check your email →';
        switchTab('login');

      } catch (err) {
        errEl.style = '';
        errEl.textContent = err.message || 'Something went wrong. Please try again.';
        errEl.classList.add('show');
        btn.textContent = 'Open The Vault →';
        btn.disabled = false;
      }
    });

    // ── Form: Login ──────────────────────────────────────────────
    document.getElementById('login-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const emailOrUsername = document.getElementById('login-email').value.trim();
      const password        = document.getElementById('login-password').value;
      const errEl           = document.getElementById('login-error');
      const btn             = this.querySelector('button[type="submit"]');

      errEl.classList.remove('show');
      btn.textContent = 'Entering…';
      btn.disabled    = true;

      try {
        // Supabase sign-in requires email. If they entered a Vault Handle,
        // look up their email via RPC (which can read auth.users server-side).
        let email = emailOrUsername;
        if (!emailOrUsername.includes('@')) {
          const { data: lookedUp } = await VSSupabase
            .rpc('get_email_by_username', { p_username: emailOrUsername });

          if (!lookedUp) throw new Error('No account found with that handle. Try your email address instead, or use Forgot password? below to recover your account.');
          email = lookedUp;
        }

        const captchaToken = typeof VSTurnstile !== 'undefined' ? await VSTurnstile.getToken() : undefined;
        const { data, error } = await VSSupabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
        if (error) {
          if (error.message === 'Email not confirmed') {
            throw new Error('Please confirm your email before signing in. Check your inbox for the confirmation link.');
          }
          if (error.message === 'Invalid login credentials') {
            throw new Error('Incorrect email or password. If you forgot your password, use the "Forgot password?" link below.');
          }
          throw new Error(error.message);
        }

        // Load vault_members row
        const { data: row, error: rowErr } = await VSSupabase
          .from('vault_members')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (rowErr || !row) throw new Error('Account found but member profile is missing. Contact support.');

        const member = buildMember(data.user, row);

        // If a ?next= gated app is waiting, redirect with tokens
        if (VSGate.redirect(data.session)) return;

        showDashboard(member);

      } catch (err) {
        errEl.textContent = err.message || 'Sign-in failed. Please try again.';
        errEl.classList.add('show');
        btn.textContent = 'Enter The Vault →';
        btn.disabled = false;
      }
    });

    // ── OAuth Sign-In ────────────────────────────────────────────
    // Signs in or registers existing members. New OAuth users who have
    // never registered will be prompted to complete their profile.
    async function oauthSignIn(provider) {
      const { error } = await VSSupabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (error) {
        const errEl = document.getElementById('login-error');
        errEl.textContent = error.message;
        errEl.classList.add('show');
      }
      // Browser redirects to provider — no further action needed here
    }

    // ── Form: Forgot Password ────────────────────────────────────
    document.getElementById('forgot-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const errEl     = document.getElementById('forgot-error');
      const successEl = document.getElementById('forgot-success');
      const btn       = this.querySelector('button[type="submit"]');
      const email     = document.getElementById('forgot-email').value.trim();
      errEl.classList.remove('show');
      successEl.style.display = 'none';
      btn.textContent = 'Sending…';
      btn.disabled    = true;
      try {
        const redirectTo = window.location.origin + '/vault-member/';
        const captchaToken = typeof VSTurnstile !== 'undefined' ? await VSTurnstile.getToken() : undefined;
        const { error } = await VSSupabase.auth.resetPasswordForEmail(email, { redirectTo, captchaToken });
        if (error) throw new Error(error.message);
        successEl.textContent = 'Reset link sent! Check your inbox (and spam folder) for an email from VaultSpark Studios.';
        successEl.style.display = 'block';
        btn.textContent = 'Sent ✓';
      } catch(err) {
        errEl.textContent = err.message || 'Could not send reset email. Please try again.';
        errEl.classList.add('show');
        btn.textContent = 'Send Reset Link →';
        btn.disabled    = false;
      }
    });

    // ── Form: Set New Password ───────────────────────────────────
    document.getElementById('reset-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const errEl   = document.getElementById('reset-error');
      const btn     = this.querySelector('button[type="submit"]');
      const pw      = document.getElementById('reset-password').value;
      const confirm = document.getElementById('reset-confirm').value;
      errEl.classList.remove('show');
      if (pw !== confirm) {
        errEl.textContent = 'Passwords do not match.';
        errEl.classList.add('show');
        return;
      }
      btn.textContent = 'Saving…';
      btn.disabled    = true;
      try {
        const { error } = await VSSupabase.auth.updateUser({ password: pw });
        if (error) throw new Error(error.message);
        // Password updated — sign them in and go to dashboard
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (session) {
          const { data: row } = await VSSupabase.from('vault_members').select('*').eq('id', session.user.id).single();
          if (row) { showDashboard(buildMember(session.user, row)); return; }
        }
        switchTab('login');
        document.getElementById('login-error').textContent = 'Password updated! Please sign in.';
        document.getElementById('login-error').classList.add('show');
      } catch(err) {
        errEl.textContent = err.message || 'Could not update password. Try requesting a new reset link.';
        errEl.classList.add('show');
        btn.textContent = 'Set New Password →';
        btn.disabled    = false;
      }
    });

    // ── Form: OAuth Complete Profile ─────────────────────────────
    document.getElementById('oauth-complete-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const errEl    = document.getElementById('oauth-complete-error');
      const btn      = this.querySelector('button[type="submit"]');
      const username = document.getElementById('oauth-username').value.trim();
      const invite   = document.getElementById('oauth-invite').value.trim().toUpperCase();
      const subscribe = document.getElementById('oauth-subscribe').checked;
      errEl.classList.remove('show');
      btn.textContent = 'Completing…';
      btn.disabled    = true;
      try {
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) throw new Error('Session expired. Please sign in again.');
        const { error: rpcErr } = await VSSupabase.rpc('register_with_invite', {
          p_invite_code: invite,
          p_username:    username,
          p_subscribe:   subscribe,
        });
        if (rpcErr) throw new Error(rpcErr.message);
        const { data: row } = await VSSupabase.from('vault_members').select('*').eq('id', session.user.id).single();
        if (subscribe && session.user.email) {
          VS.kitSubscribe(session.user.email, username, { updates: true, lore: true, access: true });
        }
        if (row) { showDashboard(buildMember(session.user, row)); }
      } catch(err) {
        errEl.textContent = err.message || 'Could not complete registration. Please try again.';
        errEl.classList.add('show');
        btn.textContent = 'Complete Registration →';
        btn.disabled    = false;
      }
    });

    // ── Rank-up ceremony ────────────────────────────────────────
    const RANK_FLAVOR = {
      'Vault Runner':   'The signal grows stronger. The vault takes notice.',
      'Rift Scout':     'You\'ve scouted beyond the threshold. The rift opens wider.',
      'Vault Guard':    'The vault entrusts you to guard its signal. Stand firm.',
      'Vault Breacher': 'You go where others can\'t. The vault\'s inner layers are yours.',
      'Void Operative': 'Clearance level: deep. The void doesn\'t scare you anymore.',
      'Vault Keeper':   'The vault keeps no secrets from you now. You guard what most will never find.',
      'Forge Master':   'Forged in the vault\'s heat. Few make it this deep — and now you\'re one of them.',
      'The Sparked':    'Maximum rank — achieved. You are the reason the vault exists. The spark is yours.',
    };

    function checkRankUp(member) {
      const rankIdx = VS.RANKS.findIndex(r => r.name === VS.getRank(member.points).name);
      const key = 'vs_rank_' + member._id;
      const stored = localStorage.getItem(key);
      if (stored !== null && rankIdx > parseInt(stored, 10)) {
        showRankCeremony(VS.RANKS[rankIdx]);
      }
      localStorage.setItem(key, rankIdx);
    }

    function showRankCeremony(rank) {
      const RANK_EMOJIS = { 'Vault Runner': '🏃', 'Rift Scout': '🔭', 'Vault Guard': '🛡️', 'Vault Breacher': '🔧', 'Void Operative': '🕵️', 'Vault Keeper': '🔒', 'Forge Master': '🔥', 'The Sparked': '🌟' };
      document.getElementById('ceremony-emoji').textContent     = RANK_EMOJIS[rank.name] || '⚡';
      document.getElementById('ceremony-rank-name').textContent = rank.name;
      document.getElementById('ceremony-rank-name').style.color = rank.color;
      document.getElementById('ceremony-flavor').textContent    = RANK_FLAVOR[rank.name] || 'The vault recognizes your signal.';

      // Spawn particles
      const container = document.getElementById('cer-particles');
      container.innerHTML = '';
      const colors = ['#FFC400','#FF7A00','#1FA2FF','#ffffff','#34d399'];
      for (let i = 0; i < 24; i++) {
        const p = document.createElement('div');
        p.className = 'cer-particle';
        const angle = (i / 24) * 360;
        const dist  = 140 + Math.random() * 120;
        p.style.cssText = [
          'background:' + colors[i % colors.length],
          '--tx:' + (Math.cos(angle * Math.PI / 180) * dist) + 'px',
          '--ty:' + (Math.sin(angle * Math.PI / 180) * dist) + 'px',
          'animation-delay:' + (Math.random() * 0.25) + 's',
        ].join(';');
        container.appendChild(p);
      }
      _lastFocus = _lastFocus || document.activeElement;
      document.getElementById('ceremony-overlay').classList.add('show');
      setTimeout(() => { const btn = document.querySelector('#ceremony-overlay .ceremony-dismiss'); if (btn) btn.focus(); }, 50);
    }

    function dismissCeremony() {
      document.getElementById('ceremony-overlay').classList.remove('show');
      _releaseFocus(document.querySelector('.ceremony-card'));
    }

    function dismissCardModal() {
      document.getElementById('card-modal-overlay').classList.remove('show');
      _releaseFocus(document.querySelector('.card-modal'));
    }

    // ── Feature 2: Onboarding tour ────────────────────────────────
    const ONBOARDING_STEPS = [
      {
        title:      'Welcome to the Vault',
        desc:       'You\'re in. This is your Vault Member portal — the hub for your rank, achievements, challenges, and classified lore. Let\'s take a quick look around.',
        targetId:   'profile-card',
        emoji:      '🔓',
      },
      {
        title:      'Your Dashboard',
        desc:       'This rank progress bar tracks your Vault Points. Earn XP to rank up through 9 tiers — from Spark Initiate all the way to The Sparked — and unlock exclusive lore.',
        targetId:   'profile-card',
        emoji:      '⚡',
      },
      {
        title:      'Take on Challenges',
        desc:       'Complete challenges to earn XP fast. New challenges drop weekly — check back every Monday for a fresh set of missions.',
        targetId:   'tab-dash-challenges',
        emoji:      '🎯',
      },
      {
        title:      'Classified Archive',
        desc:       'Your rank unlocks classified intel files. Keep grinding — higher ranks reveal deeper secrets about the Vault universe and its entities.',
        targetId:   'tab-dash-archive',
        emoji:      '📁',
      },
      {
        title:      'Customize Your Profile',
        desc:       'Set your avatar and write a bio to earn your first bonus XP. Your member card is unique — download it and share your rank with the world.',
        targetId:   'tab-dash-settings',
        emoji:      '✍️',
      },
    ];

    let _onboardingStep = 0;

    function maybeStartOnboarding(member) {
      // Check DB flag first (populated after SQL migration: ALTER TABLE vault_members ADD COLUMN onboarding_completed boolean DEFAULT false)
      if (member.onboarding_completed) { localStorage.setItem('onboarding_complete', '1'); return; }
      if (localStorage.getItem('onboarding_complete')) return;
      if (member.points > 0) { localStorage.setItem('onboarding_complete', '1'); return; }
      _lastFocus = document.activeElement;
      _onboardingStep = 0;
      renderOnboardingStep();
      document.getElementById('onboarding-overlay').style.display = '';
      setTimeout(() => _trapFocus(document.getElementById('onboarding-card')), 50);
    }

    function renderOnboardingStep() {
      const step  = ONBOARDING_STEPS[_onboardingStep];
      const total = ONBOARDING_STEPS.length;
      const overlay = document.getElementById('onboarding-overlay');
      if (!overlay || !step) return;

      document.getElementById('onboarding-step-label').textContent = 'Step ' + (_onboardingStep + 1) + ' / ' + total;
      document.getElementById('onboarding-title').textContent      = step.emoji + ' ' + step.title;
      document.getElementById('onboarding-desc').textContent       = step.desc;
      document.getElementById('onboarding-next-btn').textContent   = _onboardingStep === total - 1 ? 'Enter the Vault →' : 'Next →';

      // Build step dots
      const dotsEl = document.getElementById('onboarding-dots');
      if (dotsEl) {
        dotsEl.innerHTML = ONBOARDING_STEPS.map((_, i) =>
          '<div style="width:7px;height:7px;border-radius:50%;background:' + (i === _onboardingStep ? 'var(--gold)' : 'rgba(255,255,255,0.18)') + ';transition:background 0.2s;"></div>'
        ).join('');
      }

      // Position spotlight on target element
      const targetEl = step.targetId ? document.getElementById(step.targetId) : null;
      const spotlight = document.getElementById('onboarding-spotlight');
      const card      = document.getElementById('onboarding-card');

      if (targetEl && spotlight) {
        const rect    = targetEl.getBoundingClientRect();
        const pad     = 8;
        spotlight.style.left   = (rect.left - pad) + 'px';
        spotlight.style.top    = (rect.top + window.scrollY - pad) + 'px';
        spotlight.style.width  = (rect.width + pad * 2) + 'px';
        spotlight.style.height = (rect.height + pad * 2) + 'px';

        // Position card below or above target
        if (card) {
          const cardH = 220;
          const cardW = 360;
          let cardTop  = rect.bottom + window.scrollY + 18;
          let cardLeft = rect.left;
          if (cardTop + cardH > window.innerHeight + window.scrollY - 20) {
            cardTop = rect.top + window.scrollY - cardH - 18;
          }
          if (cardLeft + cardW > window.innerWidth - 16) {
            cardLeft = window.innerWidth - cardW - 16;
          }
          if (cardLeft < 8) cardLeft = 8;
          card.style.left = cardLeft + 'px';
          card.style.top  = cardTop + 'px';
          card.style.bottom = '';
          card.style.right  = '';
        }
      } else if (card) {
        // Centre card if no target
        card.style.left   = '50%';
        card.style.top    = '50%';
        card.style.transform = 'translate(-50%,-50%)';
        if (spotlight) { spotlight.style.width = '0'; spotlight.style.height = '0'; }
      }

      // Highlight the target element briefly
      if (targetEl) {
        targetEl.style.position = 'relative';
        targetEl.style.zIndex   = '1103';
      }
    }

    function onboardingNext() {
      // Clear z-index on current target
      const cur = ONBOARDING_STEPS[_onboardingStep];
      if (cur && cur.targetId) {
        const el = document.getElementById(cur.targetId);
        if (el) { el.style.zIndex = ''; }
      }

      _onboardingStep++;
      if (_onboardingStep >= ONBOARDING_STEPS.length) {
        onboardingSkip();
      } else {
        renderOnboardingStep();
      }
    }

    function onboardingSkip() {
      // Clear any lingering z-index overrides
      ONBOARDING_STEPS.forEach(s => {
        if (s.targetId) {
          const el = document.getElementById(s.targetId);
          if (el) el.style.zIndex = '';
        }
      });
      localStorage.setItem('onboarding_complete', '1');
      const overlay = document.getElementById('onboarding-overlay');
      if (overlay) overlay.style.display = 'none';
      _releaseFocus(document.getElementById('onboarding-card'));
      // Persist to DB so new devices skip the tour
      VSSupabase.auth.getSession().then(({ data: { session } }) => {
        if (session) VSSupabase.from('vault_members').update({ onboarding_completed: true }).eq('id', session.user.id).catch(() => {});
      });
    }
