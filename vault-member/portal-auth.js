    // ── One automatic attention surface per portal session ─────
    const portalAttentionSurfaces = new Set(['onboarding', 'portal-tour', 'rank-ceremony', 'anniversary', 'weekly-recap', 'whats-new']);
    function portalAttentionDepth() {
      try {
        const visits = parseInt(localStorage.getItem('vs_visit_count') || '0', 10);
        if (!Number.isFinite(visits) || visits < 1) return 'unknown';
        return visits === 1 ? 'first' : visits <= 4 ? 'returning' : 'established';
      } catch (_) { return 'unknown'; }
    }
    function sendPortalAttentionClaim(name) {
      if (!portalAttentionSurfaces.has(name)) return;
      try {
        const body = JSON.stringify({
          route: location.pathname || '/',
          ux: 'attention:claimed',
          label: name + '|' + portalAttentionDepth()
        });
        if (navigator.sendBeacon) navigator.sendBeacon('/v/rum', new Blob([body], { type: 'application/json' }));
      } catch (_) {}
    }

    window.VSPortalAttention = window.VSPortalAttention || {
      key: 'vs_portal_attention_surface_v1',
      current() {
        try { return sessionStorage.getItem(this.key) || ''; } catch (_) { return ''; }
      },
      claim(name) {
        try {
          const current = sessionStorage.getItem(this.key);
          if (current) return current === name;
          sessionStorage.setItem(this.key, name);
          sendPortalAttentionClaim(name);
          return true;
        } catch (_) { return true; }
      },
    };

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

      // A member in their first three days with Vault Initiation unfinished
      // gets a quiet first session: the inline quest owns attention, so the
      // rank, release-note and recap modals stay out of the way. (New members
      // start with 10 points, so the old points <= 0 test never matched.)
      const freshInitiate = window.VSPortalLogic
        ? VSPortalLogic.isFreshInitiate(member)
        : (Date.now() - new Date(member.createdAt).getTime() < 3 * 86400000);
      if (freshInitiate) window.VSPortalAttention.claim('onboarding');

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
        refLink.textContent = window.VSPortalLogic
          ? VSPortalLogic.referralLink(member.username)
          : 'https://vaultsparkstudios.com/vault-member/?ref=' + encodeURIComponent(member.username);
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

      // Studio Access panel — initial render from row data
      if (typeof loadStudioAccessPanel === 'function') loadStudioAccessPanel(rowPlanKey, rank.name);

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
          // Studio Access panel — update with authoritative plan
          if (typeof loadStudioAccessPanel === 'function') loadStudioAccessPanel(planKey, rank.name);
        }).catch(() => {
          if (sparkedBadge) sparkedBadge.style.display = 'none';
          if (ctaPanel)     ctaPanel.style.display     = '';
          if (proCtaPanel)  proCtaPanel.style.display  = 'none';
          member.is_sparked = false;
          member.plan_key   = 'free';
          member.is_pro     = false;
          updateVaultStatusPanel(member, { isSparked: false });
          updateClaimCenter(member, { isSparked: false });
          if (typeof loadStudioAccessPanel === 'function') loadStudioAccessPanel('free', rank.name);
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

      // Merge relational achievements (member_achievements table: genesis badge, vaultsparked, etc.)
      // Also fetch earned_at to display unlock dates on badge tooltips.
      VSSupabase.from('member_achievements')
        .select('earned_at, achievements!achievement_id(slug)')
        .eq('member_id', member._id)
        .then(({ data: relAchs }) => {
          if (!relAchs || !relAchs.length) return;
          const relIds = relAchs.map(r => r.achievements && r.achievements.slug).filter(Boolean);
          if (!relIds.length) return;
          // Build unlock-date map: slug → ISO date string
          const unlockDates = {};
          relAchs.forEach(function(r) {
            const slug = r.achievements && r.achievements.slug;
            if (slug && r.earned_at) unlockDates[slug] = r.earned_at;
          });
          const merged = achEarned.slice();
          relIds.forEach(function(slug) { if (merged.indexOf(slug) === -1) merged.push(slug); });
          const statEl = document.getElementById('stat-achievements');
          if (statEl) statEl.textContent = merged.length + ' / ' + VS.ACHIEVEMENT_DEFS.length;
          renderAchievementsGrid(member, merged, unlockDates);
        }).catch(function() {});

      // Newsletter prefs
      if (member.prefs) {
        const up   = document.getElementById('toggle-updates');
        const lore = document.getElementById('toggle-lore');
        const acc  = document.getElementById('toggle-access');
        if (up)   up.checked   = member.prefs.updates !== false;
        if (lore) lore.checked = member.prefs.lore    !== false;
        if (acc)  acc.checked  = member.prefs.access  !== false;
      }

      // Vault Wall visibility toggle
      const ppToggle = document.getElementById('toggle-public-profile');
      if (ppToggle) ppToggle.checked = member.public_profile !== false;

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
      setTimeout(() => checkDailyLogin(member), 1600);

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

      // Feature 3: notification center
      initNotifCenter();

      // Vault Command tab — VaultSpark account only.
      // S368: the username match alone is a client-side claim; the tab is only
      // revealed once the server-side is_vault_admin() RPC (security definer,
      // supabase-investor-fix-admin.sql) confirms it. Admin data is still
      // protected by RLS/RPC checks server-side — this only gates the UI.
      // The Vault Command markup is not in the public portal HTML: it is
      // fetched from /vault-member/admin/ (edge-session gated) and injected by
      // VSPortalLoop.mountVaultCommand() only after the RPC confirms.
      const navAdminLink  = document.getElementById('nav-admin-link');
      if (navAdminLink) navAdminLink.style.display = 'none';
      const usernameClaimsAdmin = String(member.username || '').toLowerCase() === 'vaultspark';

      // A #<tab> deep link (e.g. the account chip's #settings) wins over the
      // remembered tab; admin is never deep-linkable for non-admins.
      const hashTab = (window.location.hash || '').slice(1);
      const deepTab = hashTab && hashTab !== 'admin' && document.getElementById('tab-dash-' + hashTab) ? hashTab : null;
      const savedTab = localStorage.getItem('vs_active_tab');
      if (deepTab) switchDashTab(deepTab);
      else if (savedTab && savedTab !== 'dashboard' && savedTab !== 'admin') switchDashTab(savedTab);

      if (usernameClaimsAdmin) {
        Promise.resolve(VSSupabase.rpc('is_vault_admin'))
          .then(({ data, error }) => {
            if (error || data !== true) return;
            if (!window.VSPortalLoop) return;
            return VSPortalLoop.mountVaultCommand().then((mounted) => {
              if (!mounted) return;
              if (navAdminLink) navAdminLink.style.display = '';
              loadInvRequests('pending'); loadFanArtQueue('pending'); loadAdminPolls();
              if (hashTab === 'admin' && document.getElementById('tab-dash-admin')) switchDashTab('admin');
              else if (!deepTab && savedTab === 'admin') switchDashTab('admin');
            });
          })
          .catch(() => {});
      }

      // What's New modal — check for unread Studio Pulse entries
      setTimeout(() => checkWhatsNew(), 2500);

      // Phase 24: anniversary check + weekly recap
      setTimeout(() => checkVaultAnniversary(member), 3200);
      setTimeout(() => checkWeeklyRecap(member), 3800);

      // Phase 25: member spotlight + rank comparison
      setTimeout(() => loadMemberSpotlight(), 1500);

      // Return loop: since-last-visit, Vault Initiation, season, rival, games.
      if (window.VSPortalLoop) VSPortalLoop.onDashboard(member);
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
        public_profile:       row.public_profile       !== false,
        season_xp:            row.season_xp            || 0,
        current_season_id:    row.current_season_id    || null,
      };
    }

    // Obelisk is the sole credential authority. VaultSpark begins at profile completion
    // only after the trusted edge establishes the compatibility data session.


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
        const { data: rpcData, error: rpcErr } = await VSSupabase.rpc('register_open', {
          p_invite_code: invite || '',
          p_username: username,
          p_subscribe: subscribe,
          p_ref_by: sessionStorage.getItem('vs_ref') || '',
        });
        if (rpcErr) throw new Error(rpcErr.message);
        // `register_open` reports a taken handle as DATA, not as an rpc error, so
        // checking only `rpcErr` read a rejection as success and dropped the member
        // into a dashboard their handle was never bound to.
        const rpcRejection = rpcData && (Array.isArray(rpcData) ? rpcData[0]?.error : rpcData.error);
        if (rpcRejection) throw new Error(rpcRejection);

        const { data: row } = await VSSupabase.from('vault_members').select('*').eq('id', session.user.id).single();

        // The account now exists. Show it BEFORE anything optional runs.
        if (row) { showDashboard(buildMember(session.user, row)); }

        // Newsletter opt-in is a side effect and must never be able to fail
        // registration. This previously called `VS.kitSubscribe`, which was never
        // defined anywhere in the codebase — and because the checkbox defaults to
        // checked and the call sat in the try BEFORE showDashboard(), every new
        // member hit a TypeError and was told "Could not complete registration"
        // while their account had in fact been created. Real API, fired last,
        // isolated, and never awaited into the registration path.
        if (subscribe && session.user.email && window.VaultKit) {
          Promise.resolve()
            .then(function () { return window.VaultKit.subscribe(session.user.email, window.VaultKit.ALL_TAGS); })
            .catch(function () { /* opt-in is best-effort; the member is already in */ });
        }
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

    // The last celebrated rank is stored on the member (prefs.last_ceremony_rank)
    // so a rank-up is celebrated once per account, not once per device. The
    // per-user localStorage key is kept as a fallback and for older rows.
    function checkRankUp(member) {
      const rankIdx = VS.RANKS.findIndex(r => r.name === VS.getRank(member.points).name);
      const key = 'vs_rank_' + member._id;
      const prefs = window.VSPortalLoop ? VSPortalLoop.prefs : null;
      let stored = member.prefs && member.prefs.last_ceremony_rank != null
        && Number.isFinite(Number(member.prefs.last_ceremony_rank))
        ? Number(member.prefs.last_ceremony_rank) : null;
      if (stored === null) {
        const local = localStorage.getItem(key);
        stored = local !== null && Number.isFinite(parseInt(local, 10)) ? parseInt(local, 10) : null;
      }
      const persist = (idx) => {
        localStorage.setItem(key, idx);
        if (prefs && (!member.prefs || member.prefs.last_ceremony_rank !== idx)) prefs.save({ last_ceremony_rank: idx });
      };
      if (stored !== null && rankIdx > stored) {
        if (showRankCeremony(VS.RANKS[rankIdx])) persist(rankIdx);
        return;
      }
      if (stored === null || rankIdx > stored) persist(rankIdx);
    }

    function showRankCeremony(rank) {
      if (!window.VSPortalAttention.claim('rank-ceremony')) return false;
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
      return true;
    }

    function dismissCeremony() {
      document.getElementById('ceremony-overlay').classList.remove('show');
      _releaseFocus(document.querySelector('.ceremony-card'));
    }

    function dismissCardModal() {
      document.getElementById('card-modal-overlay').classList.remove('show');
      _releaseFocus(document.querySelector('.card-modal'));
    }

    // The spotlight onboarding overlay was removed (S368): new members start
    // with 10 points, so it never ran and instead marked onboarding complete.
    // Vault Initiation (portal-loop.js) is the single onboarding path.
