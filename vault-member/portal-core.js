    // ── Mobile nav ──────────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const navMenu   = document.getElementById('nav-menu');
    hamburger.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // ── Tab switching ───────────────────────────────────────────
    // 'forgot' and 'reset' are overlay panels with no tab button
    function switchTab(which) {
      const noTab = which === 'forgot' || which === 'reset';
      document.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.toggle('active', !noTab && t.id === 'tab-' + which);
        t.setAttribute('aria-selected', !noTab && t.id === 'tab-' + which);
      });
      document.querySelectorAll('.auth-panel').forEach(p => {
        p.classList.toggle('active', p.id === 'panel-' + which);
      });
    }

    // ── Rank / Achievement definitions (browser mirror of canonical config) ───
    const RANK_VISUALS = {
      spark_initiate: { color: '#94a3b8', badgeClass: 'badge-ghost' },
      vault_runner: { color: '#1FA2FF', badgeClass: 'badge-blue' },
      rift_scout: { color: '#10B981', badgeClass: 'badge-green' },
      vault_guard: { color: '#06B6D4', badgeClass: 'badge-cyan' },
      vault_breacher: { color: '#8B5CF6', badgeClass: 'badge-purple' },
      void_operative: { color: '#2D2D2D', badgeClass: 'badge-void' },
      vault_keeper: { color: '#C85000', badgeClass: 'badge-amber' },
      forge_master: { color: '#D62828', badgeClass: 'badge-red' },
      the_sparked: { color: '#FFC400', badgeClass: 'badge-sparked' },
    };

    function buildRanksFromMembershipConfig() {
      const membershipConfig = globalThis.VSMembership && VSMembership.config;
      const labels = membershipConfig && Array.isArray(membershipConfig.ranks) ? membershipConfig.ranks : null;
      const thresholds = membershipConfig && Array.isArray(membershipConfig.rankThresholds)
        ? membershipConfig.rankThresholds
        : null;

      if (!labels || !thresholds || labels.length !== thresholds.length) {
        return [
          { name: 'Spark Initiate', min: 0,      max: 249,      color: '#94a3b8', badgeClass: 'badge-ghost'   },
          { name: 'Vault Runner',   min: 250,    max: 999,      color: '#1FA2FF', badgeClass: 'badge-blue'    },
          { name: 'Rift Scout',     min: 1000,   max: 2999,     color: '#10B981', badgeClass: 'badge-green'   },
          { name: 'Vault Guard',    min: 3000,   max: 7499,     color: '#06B6D4', badgeClass: 'badge-cyan'    },
          { name: 'Vault Breacher', min: 7500,   max: 14999,    color: '#8B5CF6', badgeClass: 'badge-purple'  },
          { name: 'Void Operative', min: 15000,  max: 29999,    color: '#2D2D2D', badgeClass: 'badge-void'    },
          { name: 'Vault Keeper',   min: 30000,  max: 59999,    color: '#C85000', badgeClass: 'badge-amber'   },
          { name: 'Forge Master',   min: 60000,  max: 99999,    color: '#D62828', badgeClass: 'badge-red'     },
          { name: 'The Sparked',    min: 100000, max: Infinity, color: '#FFC400', badgeClass: 'badge-sparked' },
        ];
      }

      return labels.map(function (rank, index) {
        const visuals = RANK_VISUALS[rank.key] || {};
        return {
          name: rank.label,
          min: thresholds[index],
          max: index < thresholds.length - 1 ? thresholds[index + 1] - 1 : Infinity,
          color: visuals.color || '#94a3b8',
          badgeClass: visuals.badgeClass || 'badge-ghost',
        };
      });
    }

    const VS = {
      RANKS: buildRanksFromMembershipConfig(),

      ACHIEVEMENT_DEFS: [
        { id: 'joined',     icon: '🔓', name: 'Vault Opened',    desc: 'Created your Studio Member account'         },
        { id: 'subscribed', icon: '📡', name: 'Signal Received', desc: 'Subscribed to Vault Dispatch'               },
        { id: 'visit_game', icon: '🎮', name: 'Into The Game',   desc: 'Visited a live VaultSpark game'             },
        { id: 'first_100',  icon: '⚡', name: 'Vault Runner',    desc: 'Reached 100 Vault Points'                   },
        { id: 'lore_read',  icon: '📖', name: 'Lore Keeper',     desc: 'Read the DreadSpike character lore'         },
        { id: 'social',          icon: '🌐', name: 'Broadcast',         desc: 'Followed VaultSpark on a social platform'   },
        { id: 'recruiter',       icon: '🤝', name: 'Recruiter',         desc: 'Invited your first member to the Vault'     },
        { id: 'patron',          icon: '👑', name: 'Vault Patron',      desc: 'Invited 5 members — the vault grows'        },
        { id: 'profile_complete',icon: '✍️', name: 'Identity Forged',   desc: 'Completed your Vault Member profile'        },
      ],

      AVATARS: [
        { id: 'spark',      emoji: '⚡', bg: 'rgba(255,196,0,0.18)',   label: 'Spark'        },
        { id: 'dreadspike', emoji: '💀', bg: 'rgba(214,40,40,0.18)',   label: 'DreadSpike'   },
        { id: 'gridiron',   emoji: '🏈', bg: 'rgba(31,162,255,0.16)',  label: 'Gridiron'     },
        { id: 'doodie',     emoji: '💩', bg: 'rgba(255,122,0,0.16)',   label: 'Doodie'       },
        { id: 'vaultfront', emoji: '⚔️', bg: 'rgba(201,206,214,0.12)', label: 'VaultFront'   },
        { id: 'solara',  emoji: '🏜️', bg: 'rgba(251,191,36,0.14)',  label: 'Solara'    },
        { id: 'mindframe',  emoji: '🧠', bg: 'rgba(139,92,246,0.16)',  label: 'MindFrame'    },
        { id: 'vault',      emoji: '🔒', bg: 'rgba(255,196,0,0.12)',   label: 'Vault Keeper' },
        { id: 'sparked',    emoji: '🌟', bg: 'rgba(255,196,0,0.22)',   label: 'The Sparked'  },
        { id: 'runner',     emoji: '🏃', bg: 'rgba(31,162,255,0.14)',  label: 'Vault Runner' },
        { id: 'forge',      emoji: '🔥', bg: 'rgba(255,122,0,0.14)',   label: 'Forge Guard'  },
        { id: 'unknown',    emoji: '❓', bg: 'rgba(255,255,255,0.06)', label: 'Unknown'      },
      ],

      ACCENT_COLORS: [
        { color: '#FFC400', label: 'Vault Gold'   },
        { color: '#1FA2FF', label: 'Vault Blue'   },
        { color: '#FF7A00', label: 'Forge Orange' },
        { color: '#8B5CF6', label: 'MindFrame'    },
        { color: '#10B981', label: 'Emerald'      },
        { color: '#D62828', label: 'DreadSpike'   },
        { color: '#EC4899', label: 'Neon Pink'    },
        { color: '#C9CED6', label: 'Steel'        },
      ],

      getRank(pts) {
        return this.RANKS.find(r => pts >= r.min && pts <= r.max) || this.RANKS[0];
      },
      getNextRank(pts) {
        const idx = this.RANKS.findIndex(r => pts >= r.min && pts <= r.max);
        return this.RANKS[idx + 1] || null;
      },
      getRankNameByIndex(rankIndex) {
        return (this.RANKS[rankIndex] && this.RANKS[rankIndex].name) || this.RANKS[0].name;
      },
      getRankProgress(pts) {
        const rank = this.getRank(pts);
        if (rank.max === Infinity) return 100;
        return Math.min(100, Math.round(((pts - rank.min) / (rank.max - rank.min + 1)) * 100));
      },
      getAvatar(id) {
        return this.AVATARS.find(a => a.id === id) || this.AVATARS[0];
      },

      async logout() {
        await VSSupabase.auth.signOut();
        showAuth();
      },

      async startVaultSparkedCheckout() {
        const btn = document.getElementById('vaultsparked-upgrade-btn');
        if (btn) { btn.textContent = 'Redirecting…'; btn.disabled = true; }
        try {
          const { data: { session } } = await VSSupabase.auth.getSession();
          if (!session) { showAuth(); return; }
          const { data, error } = await VSSupabase.functions.invoke('create-checkout', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: { plan: 'vault_sparked' },
          });
          if (error || !data?.url) throw new Error(error?.message || 'Checkout unavailable');
          window.location.href = data.url;
        } catch (err) {
          if (btn) { btn.textContent = 'Get VaultSparked →'; btn.disabled = false; }
          if (window.Sentry) Sentry.captureException(err);
        }
      },

      async savePrefs() {
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) return;
        const prefs = Object.assign({}, (_currentMember && _currentMember.prefs) || {}, {
          updates: document.getElementById('toggle-updates')?.checked ?? true,
          lore:    document.getElementById('toggle-lore')?.checked    ?? true,
          access:  document.getElementById('toggle-access')?.checked  ?? true,
        });
        await VSSupabase.from('vault_members')
          .update({ prefs, subscribed: prefs.updates })
          .eq('id', session.user.id);
        if (_currentMember) {
          _currentMember.prefs = prefs;
        }
        if (session.user.email && typeof VaultKit !== 'undefined') {
          VaultKit.syncPreferences(session.user.email, {
            'studio-updates':     prefs.updates,
            'lore-dispatches':    prefs.lore,
            'early-vault-access': prefs.access,
          }).catch(() => {});
        }
      },

      showCardModal() {
        if (!_currentMember) return;
        buildCardThemeRow(_currentMember);
        generateMemberCard(_currentMember);
        _lastFocus = document.activeElement;
        document.getElementById('card-modal-overlay').classList.add('show');
        setTimeout(() => _trapFocus(document.querySelector('.card-modal')), 50);
      },

      downloadCard() {
        const canvas = document.getElementById('vault-card-canvas');
        const link = document.createElement('a');
        link.download = 'vault-member-card.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      },

      async shareCard() {
        if (!_currentMember) return;
        const canvas = document.getElementById('vault-card-canvas');
        const rankName = _currentMember.rank_name || 'Vault Member';
        const inviteCode = _currentMember.invite_code || '';
        const refUrl = 'https://vaultsparkstudios.com/join/' + (inviteCode ? '?ref=' + _currentMember.username : '');
        const shareText = 'I\'m a ' + rankName + ' at VaultSpark Studios — join the Vault! ⚡';

        if (navigator.share && navigator.canShare) {
          try {
            canvas.toBlob(async (blob) => {
              const file = new File([blob], 'vault-member-card.png', { type: 'image/png' });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], text: shareText, url: refUrl });
              } else {
                await navigator.share({ text: shareText, url: refUrl });
              }
            }, 'image/png');
            return;
          } catch (e) { /* fall through to Twitter */ }
        }

        // Desktop fallback: open Twitter/X share intent
        const tweetUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(refUrl);
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
      },

      copyInviteLink() {
        if (!_currentMember) return;
        const refUrl = 'https://vaultsparkstudios.com/join/?ref=' + _currentMember.username;
        navigator.clipboard.writeText(refUrl).then(() => {
          showToast('Link copied!', { icon: '📋' });
        }).catch(() => {
          prompt('Copy this link:', refUrl);
        });
      },

      async saveSettings() {
        const btn      = document.getElementById('settings-save-btn');
        const feedback = document.getElementById('settings-feedback');
        btn.disabled   = true;
        btn.textContent = 'Saving…';
        feedback.classList.remove('show');

        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) { btn.disabled = false; btn.textContent = 'Save Changes'; return; }

        const bio       = (document.getElementById('settings-bio')?.value || '').slice(0, 160);
        const avatarId  = document.querySelector('.avatar-opt.selected')?.dataset.id || 'spark';
        const accent    = document.querySelector('.color-swatch.selected')?.dataset.color || '#FFC400';

        const { error } = await VSSupabase.from('vault_members')
          .update({ bio, avatar_id: avatarId, accent })
          .eq('id', session.user.id);

        btn.disabled = false;
        btn.textContent = 'Save Changes';
        if (!error) {
          feedback.classList.add('show');
          setTimeout(() => feedback.classList.remove('show'), 2800);
          // Apply live
          applyAvatar(avatarId, accent);
        }
      },
    };

    // ── Avatar / accent helpers ──────────────────────────────────
    function applyAvatar(avatarId, accent) {
      const av = VS.getAvatar(avatarId);
      // Profile card avatar
      const profileAv = document.getElementById('profile-avatar');
      if (profileAv) {
        profileAv.textContent = av.emoji;
        profileAv.style.background = av.bg;
        profileAv.style.borderColor = accent + '55';
      }
      // Nav mini avatar
      const navAv = document.getElementById('nav-account-avatar-sm');
      if (navAv) { navAv.textContent = av.emoji; navAv.style.background = av.bg; }
      // Progress fill accent
      const fill = document.getElementById('progress-fill');
      if (fill) fill.style.background = 'linear-gradient(90deg,' + accent + ',#fff9e0)';
    }

    let _claimCenterState = {
      referralCount: null,
      referralClaimable: false,
      nextReferralText: '',
    };

    function formatThemeLabel(themeId) {
      if (!themeId) return 'Dark';
      return String(themeId).split('-').map(function(part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }).join(' ');
    }

    function setPanelText(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    function updateVaultStatusPanel(member, opts) {
      if (!member) return;
      opts = opts || {};
      const localTheme = localStorage.getItem('vs_theme');
      const accountTheme = member.prefs && member.prefs.site_theme;
      let themeStatus = formatThemeLabel(localTheme || accountTheme || 'dark');
      if (localTheme && accountTheme) {
        themeStatus += localTheme === accountTheme ? ' · local + account' : ' · local override, account backup';
      } else if (localTheme) {
        themeStatus += ' · this device';
      } else if (accountTheme) {
        themeStatus += ' · account restore ready';
      } else {
        themeStatus += ' · default';
      }

      const dispatchEnabled = member.subscribed || (member.prefs && member.prefs.updates !== false);
      const isSparked = !!opts.isSparked;
      const sparkedPrice = (globalThis.VSMembership && VSMembership.getPriceDisplay('vault_sparked')) || '$24.99/mo';

      setPanelText('vault-status-theme', themeStatus);
      setPanelText('vault-status-membership', isSparked ? `VaultSparked active · ${sparkedPrice} tier` : 'Free Vault Member');
      setPanelText('vault-status-discord', member.discord_id ? 'Connected and ready for role sync' : 'Not connected');
      setPanelText('vault-status-dispatch', dispatchEnabled ? 'Studio updates enabled' : 'Dispatch muted');
      setPanelText('vault-status-security', 'Password reset + export/delete tools live');
    }

    function updateClaimCenter(member, opts) {
      if (!member) return;
      opts = opts || {};
      const isSparked = !!opts.isSparked;
      const nextRank = VS.getNextRank(member.points);
      const pointsToNext = nextRank ? Math.max(0, nextRank.min - member.points) : 0;
      const referralStatus = _claimCenterState.referralCount == null
        ? 'Loading milestone status…'
        : _claimCenterState.referralClaimable
          ? _claimCenterState.referralCount + ' referrals · reward ready to claim'
          : _claimCenterState.nextReferralText || (_claimCenterState.referralCount + ' referrals tracked');

      setPanelText('claim-center-focus', isSparked ? 'Perks active' : 'Best next unlock');
      setPanelText('claim-center-treasury', member.points.toLocaleString() + ' pts available now');
      setPanelText('claim-center-referrals', referralStatus);
      setPanelText('claim-center-rank', nextRank ? pointsToNext.toLocaleString() + ' pts to ' + nextRank.name : 'Maximum rank already achieved');
      setPanelText('claim-center-identity', isSparked ? 'Sparked perks active · member card ready' : (member.discord_id ? 'Discord linked · member card ready' : 'Link Discord + share your member card'));
    }

    // ── Dashboard tab switcher ───────────────────────────────────
    function switchDashTab(which) {
      localStorage.setItem('vs_active_tab', which);
      document.querySelectorAll('.dash-tab').forEach(t => {
        t.classList.toggle('active', t.id === 'tab-dash-' + which);
      });
      document.querySelectorAll('.dash-pane').forEach(p => {
        p.classList.toggle('active', p.id === 'dash-pane-' + which);
      });
      document.getElementById('dashboard-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Lazy-load archive on first open; reload challenges each time (weekly resets); lazy-load chronicle
      if (which === 'archive' && !_archiveLoaded) {
        _archiveLoaded = true;
        loadClassifiedArchive();
      }
      if (which === 'challenges') loadChallenges();
      if (which === 'polls') loadPolls();
      if (which === 'dashboard') loadReferralMilestones();
      if (which === 'earlyaccess' && !_betaKeysLoaded) {
        _betaKeysLoaded = true;
        loadBetaKeys();
      }
      if (which === 'chronicle' && !_chronicleLoaded) {
        _chronicleLoaded = true;
        loadChronicle();
        renderPointsHistoryChart();
        renderPointsSummary();
      }
      if (which === 'following') loadFollowing();
      if (which === 'settings') { loadPwaSettings(); loadNewsletterPreference(); }
      if (which === 'seasonpass' && !_seasonPassLoaded) {
        _seasonPassLoaded = true;
        loadSeasonPass();
      }
      if (which === 'treasury' && !_treasuryLoaded) {
        _treasuryLoaded = true;
        loadTreasury();
      }
    }

    // ── Nav account dropdown ─────────────────────────────────────
    function closeNavDropdown() {
      const wrap = document.getElementById('nav-account-wrap');
      if (wrap) { wrap.classList.remove('open'); }
    }

    document.addEventListener('DOMContentLoaded', function() {
      const trigger = document.getElementById('nav-account-trigger');
      const wrap    = document.getElementById('nav-account-wrap');
      if (trigger && wrap) {
        trigger.addEventListener('click', function(e) {
          e.stopPropagation();
          const isOpen = wrap.classList.toggle('open');
          trigger.setAttribute('aria-expanded', isOpen);
        });
        document.addEventListener('click', function() { closeNavDropdown(); });
      }

      // Bio character counter
      const bioInput = document.getElementById('settings-bio');
      const bioCount = document.getElementById('bio-char-count');
      if (bioInput && bioCount) {
        bioInput.addEventListener('input', function() {
          bioCount.textContent = this.value.length;
        });
      }
    });

    // ── Build avatar selector ────────────────────────────────────
    function buildAvatarGrid(selectedId) {
      const grid = document.getElementById('avatar-grid');
      if (!grid) return;
      grid.innerHTML = '';
      VS.AVATARS.forEach(av => {
        const el = document.createElement('div');
        el.className = 'avatar-opt' + (av.id === selectedId ? ' selected' : '');
        el.dataset.id = av.id;
        el.title = av.label;
        el.style.background = av.bg;
        el.textContent = av.emoji;
        el.addEventListener('click', function() {
          grid.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
          this.classList.add('selected');
          document.getElementById('avatar-label').textContent = av.label;
        });
        grid.appendChild(el);
      });
    }

    // ── Build color palette ──────────────────────────────────────
    function buildColorPalette(selectedColor) {
      const palette = document.getElementById('color-palette');
      if (!palette) return;
      palette.innerHTML = '';
      VS.ACCENT_COLORS.forEach(ac => {
        const el = document.createElement('div');
        el.className = 'color-swatch' + (ac.color === selectedColor ? ' selected' : '');
        el.dataset.color = ac.color;
        el.title = ac.label;
        el.style.background = ac.color;
        el.addEventListener('click', function() {
          palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
          this.classList.add('selected');
        });
        palette.appendChild(el);
      });
    }

