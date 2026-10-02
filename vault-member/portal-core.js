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

    // ── Nav account dropdown toggle ──────────────────────────────
    (function() {
      var trigger = document.getElementById('nav-account-trigger');
      var menu    = document.getElementById('nav-account-menu');
      if (trigger && menu) {
        trigger.addEventListener('click', function(e) {
          e.stopPropagation();
          var open = menu.style.display === 'block';
          menu.style.display = open ? 'none' : 'block';
        });
        document.addEventListener('click', function(e) {
          var wrap = document.getElementById('nav-account-wrap');
          if (wrap && !wrap.contains(e.target)) menu.style.display = 'none';
        });
      }
    })();

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
      // Clear stale errors from every auth panel when switching tabs
      document.querySelectorAll('#auth-view .form-error').forEach(function(el) {
        el.classList.remove('show');
        el.textContent = '';
        el.style = '';
      });
    }

    // ── Hash routing — honour #login / #register from external links ──
    (function () {
      var h = window.location.hash.replace('#', '');
      if (h === 'login' || h === 'register' || h === 'forgot') {
        switchTab(h);
        // Smooth-scroll to the auth card
        var card = document.querySelector('.auth-card');
        if (card) setTimeout(function () { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80);
      }
    })();

    // ── Offer codes + #upgrade deep link (D-S368.1) ─────────────────────────
    // Offer links arrive as /vault-member/?promo=CODE#upgrade (or the older
    // #upgrade?promo=CODE form). The code is held in sessionStorage so it
    // survives the sign-in step, then sent to create-checkout as promo_code.
    const PROMO_KEY = 'vs_pending_promo';
    function captureOfferPromo() {
      let code = null;
      try { code = new URLSearchParams(window.location.search).get('promo'); } catch (_) {}
      if (!code) {
        const m = /[?&]promo=([^&]+)/.exec(window.location.hash || '');
        if (m) { try { code = decodeURIComponent(m[1]); } catch (_) { code = m[1]; } }
      }
      code = code ? String(code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40) : '';
      if (code) { try { sessionStorage.setItem(PROMO_KEY, code); } catch (_) {} }
    }
    function readPendingPromo() {
      try { return sessionStorage.getItem(PROMO_KEY) || null; } catch (_) { return null; }
    }
    function clearPendingPromo() {
      try { sessionStorage.removeItem(PROMO_KEY); } catch (_) {}
    }
    // On a non-2xx response functions.invoke returns no data and carries the
    // Response in error.context. Returns { status, body } (body null when
    // unreadable) so the caller can classify it against the billing contract.
    async function readCheckoutResponse(error, data) {
      let body = data || null;
      const ctx = error && error.context;
      const status = ctx && typeof ctx.status === 'number' ? ctx.status : (data ? 200 : 0);
      if (!body && ctx && typeof ctx.json === 'function') {
        try { body = await ctx.clone().json(); } catch (_) { body = null; }
      }
      return { status, body };
    }
    function classifyCheckout(res) {
      if (window.VSPortalLogic) return VSPortalLogic.classifyCheckoutResponse(res.status, res.body);
      if (res.body && res.body.url) return { kind: 'redirect', url: res.body.url };
      const code = res.body && (res.body.code || res.body.error);
      return code === 'invalid_promo_code' ? { kind: 'invalid_promo', message: '' }
        : { kind: 'error', message: 'Checkout is unavailable right now. Please try again in a moment.' };
    }
    captureOfferPromo();

    // Bring the upgrade panel into view once the dashboard has rendered it.
    (function () {
      if (!/^#upgrade\b/.test(window.location.hash || '')) return;
      let tries = 0;
      const timer = setInterval(function () {
        tries += 1;
        const target = document.getElementById('upgrade');
        const visible = target && target.offsetParent !== null
          && Array.from(target.children).some(function (c) { return c.offsetParent !== null; });
        if (visible) {
          clearInterval(timer);
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (tries > 60) {
          clearInterval(timer);
        }
      }, 250);
    })();

    // Tier prices come from the canonical feed (api/membership-tiers.json), so
    // the portal can never drift from /membership/ again. Static markup carries
    // the same values as a no-JS fallback.
    (function () {
      const fallback = { vault_sparked: 4.99, vault_sparked_pro: 29.99 };
      function paint(prices) {
        document.querySelectorAll('[data-tier-price]').forEach(function (el) {
          const value = prices[el.getAttribute('data-tier-price')];
          // Markup carries the "$" outside the span; only the amount is painted.
          if (typeof value === 'number' && value > 0) el.textContent = value.toFixed(2);
        });
      }
      paint(fallback);
      if (typeof fetch !== 'function') return;
      fetch('/api/membership-tiers.json', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (feed) {
          if (!feed || !Array.isArray(feed.tiers)) return;
          const prices = Object.assign({}, fallback);
          feed.tiers.forEach(function (t) {
            const monthly = t && t.price && Number(t.price.monthly);
            if (t && t.planCode && monthly > 0) prices[t.planCode] = monthly;
          });
          paint(prices);
        })
        .catch(function () {});
    })();

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
        { id: 'profile_complete',     icon: '✍️',                                          name: 'Identity Forged',  desc: 'Completed your Vault Member profile'                           },
        { id: 'genesis_vault_member', icon: '/assets/images/badges/genesis-vault-member.svg', name: 'Genesis Member',   desc: 'One of the first 100 members to join the Vault'                },
        { id: 'vaultsparked',         icon: '/assets/images/badges/vaultsparked.svg',         name: 'VaultSparked',     desc: 'Upgraded to VaultSparked premium membership'                   },
        { id: 'forge_master',         icon: '/assets/images/badges/forge-master.svg',         name: 'Forge Master',     desc: "Reached Forge Master rank — forged in the vault's heat"        },
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
        { id: 'forge',      emoji: '🔥', bg: 'rgba(255,122,0,0.14)',   label: 'Forge'        },
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
        const uid = (typeof _currentMember !== 'undefined' && _currentMember)?._id;
        await VSSupabase.auth.signOut();
        if (uid && typeof VSMemberCache !== 'undefined') VSMemberCache.clear(uid);
        showAuth();
      },

      // D-S368.1 — one checkout path for both paid tiers (monthly only). Plan keys
      // stay internal: vault_sparked = VaultSparked, vault_sparked_pro =
      // VaultSparked Eternal. A promo code carried in from an offer link
      // (?promo=CODE, see readPendingPromo) rides along as promo_code; the edge
      // function validates it against live Stripe promotion codes.
      async startPlanCheckout(plan, btnId, idleLabel) {
        const btn = document.getElementById(btnId);
        const feedback = btn && btn.parentElement ? btn.parentElement.querySelector('[data-checkout-feedback]') : null;
        const say = (msg) => { if (feedback) feedback.textContent = msg || ''; };
        if (btn) { btn.textContent = 'Redirecting…'; btn.disabled = true; }
        say('');
        try {
          const { data: { session } } = await VSSupabase.auth.getSession();
          if (!session) { showAuth(); return; }
          const invoke = (body) => VSSupabase.functions.invoke('create-checkout', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body,
          });
          const promo = plan === 'vault_sparked' ? readPendingPromo() : null;
          let { data, error } = await invoke(promo ? { plan, promo_code: promo } : { plan });
          let outcome = data?.url ? { kind: 'redirect', url: data.url } : classifyCheckout(await readCheckoutResponse(error, data));
          // An unknown or expired offer code must not block the upgrade: say so,
          // forget the code, and continue at the standard price. Only a rejected
          // promo (or an unreadable body) retries; the plan-state answers below
          // (already_subscribed, plan_change_via_billing, annual_not_offered)
          // are final and never re-sent without the code.
          const unreadable = outcome.kind === 'error' && !(error && error.context);
          if (promo && (outcome.kind === 'invalid_promo' || unreadable)) {
            clearPendingPromo();
            say('Offer code ' + promo + ' is not active any more, so checkout continues at the standard price.');
            ({ data, error } = await invoke({ plan }));
            outcome = data?.url ? { kind: 'redirect', url: data.url } : classifyCheckout(await readCheckoutResponse(error, data));
          }
          if (outcome.kind === 'redirect') {
            if (promo) clearPendingPromo();
            window.location.href = outcome.url;
            return;
          }
          if (btn) { btn.textContent = idleLabel; btn.disabled = false; }
          if (outcome.kind === 'already_subscribed') {
            say(outcome.message);
            if (typeof showToast === 'function') showToast(outcome.message, { emoji: '✓' });
            return;
          }
          if (outcome.kind === 'plan_change_via_billing') {
            say(outcome.message);
            if (typeof showToast === 'function') showToast(outcome.message, { emoji: '↔' });
            await this.openCustomerPortal({ say });
            return;
          }
          if (outcome.kind === 'annual_not_offered') { say(outcome.message); return; }
          throw new Error(error?.message || 'Checkout unavailable');
        } catch (err) {
          if (btn) { btn.textContent = idleLabel; btn.disabled = false; }
          say('Checkout is unavailable right now. Please try again in a moment.');
          if (window.Sentry) Sentry.captureException(err);
        }
      },

      startVaultSparkedCheckout() {
        return this.startPlanCheckout('vault_sparked', 'vaultsparked-upgrade-btn', 'Get VaultSparked →');
      },

      startVaultSparkedEternalCheckout(btnId) {
        return this.startPlanCheckout('vault_sparked_pro', btnId || 'vaultsparked-pro-upgrade-btn', 'Go Eternal →');
      },

      // S343 — members could not cancel. `VS.openCustomerPortal` was referenced in
      // exactly one place (the click handler below) and defined nowhere, and that
      // handler is `typeof`-guarded, so pressing "Manage Billing" did nothing at
      // all: no navigation, no message, not even a console error. Meanwhile the
      // product promises "Cancel anytime from your portal settings" in three
      // separate places. `supabase/functions/customer-portal-session` was written,
      // correct, deployed — and had zero callers.
      //
      // Selling a subscription while the documented cancel path silently fails is
      // a consumer-protection problem before it is a bug, so this mirrors the
      // existing startVaultSparkedCheckout() shape exactly and handles the 404 the
      // function returns for a member with no Stripe subscription, rather than
      // showing them a dead button a second time.
      // opts.say: optional status writer used when checkout routes a plan
      // change here (D-S368.1 billing contract: plan_change_via_billing).
      async openCustomerPortal(opts) {
        const say = opts && typeof opts.say === 'function' ? opts.say : null;
        const btn = document.getElementById('open-customer-portal-btn');
        const original = btn ? btn.textContent : '';
        if (btn) { btn.textContent = 'Opening…'; btn.disabled = true; }
        try {
          const { data: { session } } = await VSSupabase.auth.getSession();
          if (!session) { showAuth(); return; }
          const { data, error } = await VSSupabase.functions.invoke('customer-portal-session', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (data?.url) { window.location.href = data.url; return; }
          // A free member has no Stripe customer; say so instead of failing blankly.
          const reason = data?.error || error?.message || '';
          const label = /no subscription/i.test(reason)
            ? 'No paid plan to manage'
            : 'Billing portal unavailable — try again';
          if (btn) { btn.textContent = label; btn.disabled = false; }
          if (say) say(label === 'No paid plan to manage' ? 'No paid plan was found to change.' : 'Billing is unavailable right now. Open Manage billing in Settings in a moment.');
          if (error && window.Sentry) Sentry.captureException(error);
        } catch (err) {
          if (btn) { btn.textContent = 'Billing portal unavailable — try again'; btn.disabled = false; }
          if (say) say('Billing is unavailable right now. Open Manage billing in Settings in a moment.');
          if (window.Sentry) Sentry.captureException(err);
        } finally {
          if (btn && btn.textContent === 'Opening…') { btn.textContent = original; btn.disabled = false; }
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
        // One referral link format everywhere (matches /invite/ and the dashboard card).
        const refUrl = 'https://vaultsparkstudios.com/vault-member/?ref=' + encodeURIComponent(_currentMember.username || '');
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
        const refUrl = 'https://vaultsparkstudios.com/vault-member/?ref=' + encodeURIComponent(_currentMember.username || '');
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
      // Tier names follow the plan key (D-S368.1). The price is not repeated
      // here: a member's rate depends on the phase they joined in, and the
      // billing portal is the place that states it exactly.
      const isEternal = isSparked && member.plan_key === 'vault_sparked_pro';
      const membershipStatus = isEternal
        ? 'VaultSparked Eternal active · billed monthly'
        : isSparked ? 'VaultSparked active · billed monthly' : 'Free Vault Member';

      setPanelText('vault-status-theme', themeStatus);
      setPanelText('vault-status-membership', membershipStatus);
      setPanelText('vault-status-discord', member.discord_id ? 'Connected and ready for role sync' : 'Not connected');
      setPanelText('vault-status-dispatch', dispatchEnabled ? 'Studio updates enabled' : 'Dispatch muted');
      // Sign-in credentials live with Obelisk, the studio identity plane — this
      // portal no longer runs its own password reset.
      setPanelText('vault-status-security', 'Sign-in managed by Obelisk · data export + delete available');
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

    // ── DOM event wiring (replaces all inline event handlers for CSP 'unsafe-inline' removal) ──
    (function () {
      function on(id, evt, fn) {
        var el = document.getElementById(id);
        if (el) el.addEventListener(evt, fn);
      }
      function onQ(selector, evt, fn) {
        document.querySelectorAll(selector).forEach(function (el) {
          el.addEventListener(evt, fn);
        });
      }

      // ── Auth tabs ──────────────────────────────────────────────────────────
      on('tab-register', 'click', function () { switchTab('register'); });
      on('tab-login',    'click', function () { switchTab('login'); });

      // ── OAuth buttons ──────────────────────────────────────────────────────

      // ── Auth panel crosslinks ──────────────────────────────────────────────
      on('switch-to-login-link',    'click', function (e) { e.preventDefault(); switchTab('login'); });
      on('switch-to-register-link', 'click', function (e) { e.preventDefault(); switchTab('register'); });
      on('forgot-link',             'click', function (e) { e.preventDefault(); switchTab('forgot'); });
      on('back-to-login-link',      'click', function (e) { e.preventDefault(); switchTab('login'); });

      // ── Notification bell ──────────────────────────────────────────────────
      on('notif-bell-btn', 'click', function () { if (typeof toggleNotifPanel === 'function') toggleNotifPanel(); });

      // ── Nav account dropdown menu ──────────────────────────────────────────
      on('nav-menu-dashboard-btn', 'click', function () { switchDashTab('dashboard'); closeNavDropdown(); });
      on('nav-menu-settings-btn',  'click', function () { switchDashTab('settings');  closeNavDropdown(); });
      on('nav-admin-link',         'click', function () { switchDashTab('admin');     closeNavDropdown(); });
      on('nav-menu-signout-btn',   'click', function () { VS.logout(); });

      // ── Profile actions ────────────────────────────────────────────────────
      on('vault-card-btn', 'click', function () { VS.showCardModal(); });
      on('signout-btn',    'click', function () { VS.logout(); });

      // ── Dashboard tabs (event delegation on .dash-tab) ─────────────────────
      onQ('.dash-tab', 'click', function () {
        var which = this.id.replace('tab-dash-', '');
        if (which) switchDashTab(which);
      });

      // ── Studio Pulse notice ────────────────────────────────────────────────
      on('pulseNotice', 'click', function () { this.style.display = 'none'; });
      on('pulse-notice-close', 'click', function (e) {
        e.stopPropagation();
        var notice = document.getElementById('pulseNotice');
        if (notice) notice.style.display = 'none';
      });

      // ── Vault stats ────────────────────────────────────────────────────────
      on('pts-breakdown-btn', 'click', function () { if (typeof showPtsBreakdown === 'function') showPtsBreakdown(); });

      // ── Referral ───────────────────────────────────────────────────────────
      on('copyReferralBtn', 'click', function () {
        var link = document.getElementById('referralLink');
        if (!link) return;
        var self = this;
        navigator.clipboard.writeText(link.textContent).then(function () {
          self.textContent = 'Copied!';
          setTimeout(function () { self.textContent = 'Copy'; }, 2000);
        });
      });
      on('referral-qr-btn', 'click', function () { if (typeof showReferralQR === 'function') showReferralQR(); });

      // ── Gift ───────────────────────────────────────────────────────────────
      on('gift-pts-btn',  'click', function () { if (typeof giftPoints === 'function') giftPoints(); });
      // Gift VaultSparked is hidden until it is rebuilt with a real 30-day expiry
      // and a founder-set price (D-S368.1). The create-gift-checkout function is
      // untouched; only the portal entry point is gone.

      // ── VaultSparked / VaultSparked Eternal upgrade ────────────────────────
      on('vaultsparked-upgrade-btn', 'click', function () { VS.startVaultSparkedCheckout(); });
      on('vaultsparked-eternal-from-free-btn', 'click', function () { VS.startVaultSparkedEternalCheckout('vaultsparked-eternal-from-free-btn'); });
      on('vaultsparked-pro-upgrade-btn', 'click', function () { VS.startVaultSparkedEternalCheckout('vaultsparked-pro-upgrade-btn'); });

      // ── Claim Center ───────────────────────────────────────────────────────
      on('open-treasury-btn',  'click', function () { switchDashTab('treasury'); });
      on('view-milestones-btn','click', function () {
        var el = document.getElementById('referral-milestones-panel');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      on('view-progress-btn',    'click', function () { switchDashTab('dashboard'); });
      on('open-member-card-btn', 'click', function () { VS.showCardModal(); });

      // ── Classified Archive ─────────────────────────────────────────────────
      on('archive-bookmarks-toggle', 'click', function () { if (typeof toggleArchiveBookmarks === 'function') toggleArchiveBookmarks(); });

      // ── Vault Challenges ───────────────────────────────────────────────────
      on('challenge-history-toggle', 'click', function () { if (typeof toggleChallengeHistory === 'function') toggleChallengeHistory(this); });

      // ── Weekly recap dismiss ───────────────────────────────────────────────
      var weeklyDismiss = document.querySelector('.weekly-recap-dismiss');
      if (weeklyDismiss) weeklyDismiss.addEventListener('click', function () { if (typeof dismissWeeklyRecap === 'function') dismissWeeklyRecap(); });

      // ── Settings ───────────────────────────────────────────────────────────
      on('invite-copy-btn',         'click',  function () { if (typeof copyInviteCode === 'function') copyInviteCode(); });
      on('settings-save-btn',       'click',  function () { VS.saveSettings(); });
      on('open-customer-portal-btn','click',  function () { if (typeof VS.openCustomerPortal === 'function') VS.openCustomerPortal(); });
      on('export-data-btn',         'click',  function () { if (typeof exportMyData === 'function') exportMyData(); });
      on('delete-account-btn',      'click',  function () { if (typeof requestDeleteAccount === 'function') requestDeleteAccount(); });

      // ── Notification preferences ───────────────────────────────────────────
      on('toggle-updates',    'change', function () { VS.savePrefs(); });
      on('toggle-lore',       'change', function () { VS.savePrefs(); });
      on('toggle-access',     'change', function () { VS.savePrefs(); });
      on('toggle-push',       'change', function (e) { if (typeof togglePushNotifications === 'function') togglePushNotifications(e.target.checked); });
      on('toggle-newsletter', 'change', function (e) { if (typeof toggleNewsletter === 'function') toggleNewsletter(e.target.checked); });

      // ── Admin panel ────────────────────────────────────────────────────────
      // Vault Command markup is injected only after is_vault_admin() confirms;
      // portal-loop.js wires its controls at that point (wireVaultCommand).

      // ── Rank-Up ceremony overlay ───────────────────────────────────────────
      on('ceremony-overlay',  'click', function () { if (typeof dismissCeremony === 'function') dismissCeremony(); });
      on('ceremony-dismiss-btn','click',function () { if (typeof dismissCeremony === 'function') dismissCeremony(); });
      var ceremonyCard = document.querySelector('.ceremony-card');
      if (ceremonyCard) ceremonyCard.addEventListener('click', function (e) { e.stopPropagation(); });

      // ── Referral QR modal ──────────────────────────────────────────────────
      on('qr-modal-overlay', 'click', function () { if (typeof dismissQRModal === 'function') dismissQRModal(); });
      var qrModal = document.querySelector('.qr-modal');
      if (qrModal) qrModal.addEventListener('click', function (e) { e.stopPropagation(); });
      var qrClose = document.querySelector('.qr-modal-close');
      if (qrClose) qrClose.addEventListener('click', function () { if (typeof dismissQRModal === 'function') dismissQRModal(); });

      // ── Vault Member Card modal ────────────────────────────────────────────
      on('card-modal-overlay', 'click', function () { if (typeof dismissCardModal === 'function') dismissCardModal(); });
      var cardModal = document.querySelector('.card-modal');
      if (cardModal) cardModal.addEventListener('click', function (e) { e.stopPropagation(); });
      on('card-download-btn',  'click', function () { VS.downloadCard(); });
      on('card-share-btn',     'click', function () { VS.shareCard(); });
      on('card-copy-link-btn', 'click', function () { VS.copyInviteLink(); });
      on('card-modal-close-btn','click',function () { if (typeof dismissCardModal === 'function') dismissCardModal(); });
    })();

