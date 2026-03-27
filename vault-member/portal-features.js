    // ── Phase 9: Web Push Notifications ──────────────────────────
    const VAPID_PUBLIC_KEY = 'BO_lCzoROyH94wskfOH2SQudZpJJHZ5x9-oKOPC4W34A6YC90N9P1ZCgLLG2wppfYMwJdcAy3wqG8F1jtXKFofI';

    let _swRegistration = null;

    // ── Season Pass ───────────────────────────────────────────────
    let _seasonPassLoaded = false;
    let _treasuryLoaded  = false;

    async function loadSeasonPass() {
      const el = document.getElementById('season-pass-content');
      if (!el) return;

      try {
        const { data, error } = await VSSupabase.rpc('get_season_pass');
        if (error) throw new Error(error.message);

        if (!data || !data.season) {
          el.innerHTML = '<p style="font-size:0.9rem;color:var(--muted);padding:1rem 0;">No active season right now. Check back soon.</p>';
          return;
        }

        const { season, member_xp, tiers } = data;
        const xp = member_xp || 0;
        const maxXp = tiers && tiers.length ? tiers[tiers.length - 1].xp_required : 1;
        const barPct = Math.min(100, Math.round((xp / maxXp) * 100));

        const endDate = season.end_at ? new Date(season.end_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

        const tiersHtml = (tiers || []).map(tier => {
          const unlocked = xp >= tier.xp_required;
          return `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.7rem 0.9rem;border-radius:10px;background:${unlocked ? 'rgba(255,196,0,0.06)' : 'rgba(255,255,255,0.02)'};border:1px solid ${unlocked ? 'rgba(255,196,0,0.2)' : 'rgba(255,255,255,0.06)'};margin-bottom:0.4rem;">
            <span style="font-size:1.2rem;flex-shrink:0;">${unlocked ? '🔓' : '🔒'}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.88rem;font-weight:700;color:${unlocked ? '#fff' : 'var(--muted)'};">Tier ${tier.tier} — ${tier.reward_label}</div>
              <div style="font-size:0.75rem;color:var(--dim);margin-top:0.1rem;">${tier.xp_required.toLocaleString()} XP required</div>
            </div>
            ${unlocked ? '<span style="font-size:0.75rem;font-weight:700;color:var(--gold);flex-shrink:0;">Unlocked</span>' : ''}
          </div>`;
        }).join('');

        el.innerHTML = `
          <div style="background:rgba(255,196,0,0.05);border:1px solid rgba(255,196,0,0.2);border-radius:14px;padding:1.2rem 1.4rem;margin-bottom:1.25rem;">
            <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:var(--gold);margin-bottom:0.35rem;">Active Season</div>
            <div style="font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:0.2rem;">${escHtml(season.name)}</div>
            ${season.banner_text ? `<div style="font-size:0.83rem;color:var(--muted);margin-bottom:0.75rem;">${escHtml(season.banner_text)}</div>` : ''}
            ${endDate ? `<div style="font-size:0.78rem;color:var(--dim);">Ends ${endDate}</div>` : ''}
          </div>

          <div style="margin-bottom:1.25rem;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.5rem;">
              <span style="font-size:0.82rem;font-weight:700;color:var(--muted);">Season XP</span>
              <span style="font-size:0.88rem;font-weight:800;color:var(--gold);">${xp.toLocaleString()} / ${maxXp.toLocaleString()}</span>
            </div>
            <div style="width:100%;height:8px;background:rgba(255,255,255,0.07);border-radius:4px;overflow:hidden;">
              <div style="height:8px;border-radius:4px;background:var(--gold);width:${barPct}%;transition:width 0.6s ease;"></div>
            </div>
          </div>

          <div style="font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--dim);margin-bottom:0.65rem;">Battle Pass Tiers</div>
          ${tiersHtml}`;
      } catch (err) {
        if (el) el.innerHTML = `<p style="font-size:0.84rem;color:var(--dim);padding:1rem 0;">Could not load season pass. Try again later.</p>`;
      }
    }

    // ── Vault Treasury ────────────────────────────────────────────
    async function loadTreasury() {
      const gridEl   = document.getElementById('treasury-items-grid');
      const balEl    = document.getElementById('treasury-balance');
      const bannerEl = document.getElementById('treasury-purchases-banner');
      if (!gridEl) return;

      // Show live balance
      if (balEl && _currentMember) {
        balEl.textContent = ((_currentMember.points || 0)).toLocaleString() + ' pts';
      }

      try {
        const userId = _currentMember && _currentMember._id;

        // Fetch catalog + owned purchases in parallel
        const [itemsRes, ownedRes] = await Promise.all([
          VSSupabase.from('treasury_items').select('*').eq('is_active', true).order('cost', { ascending: true }),
          userId ? VSSupabase.from('treasury_purchases').select('item_id').eq('user_id', userId) : Promise.resolve({ data: [] })
        ]);

        if (itemsRes.error) throw itemsRes.error;
        const items = itemsRes.data || [];
        const ownedIds = new Set((ownedRes.data || []).map(r => r.item_id));

        if (items.length === 0) {
          gridEl.innerHTML = '<p style="color:var(--muted);font-size:0.9rem;grid-column:1/-1;">No items available right now.</p>';
          return;
        }

        // Show how many items owned
        if (bannerEl && ownedIds.size > 0) {
          bannerEl.style.display = '';
          bannerEl.textContent = `You own ${ownedIds.size} item${ownedIds.size === 1 ? '' : 's'} from the Treasury.`;
        }

        const CATEGORY_COLORS = { cosmetic: '#1FA2FF', access: '#7C3AED', lore: '#F59E0B', boost: '#10B981' };
        const balance = _currentMember ? (_currentMember.points || 0) : 0;

        gridEl.innerHTML = items.map(item => {
          const owned       = ownedIds.has(item.id);
          const affordable  = balance >= item.cost;
          const cat         = item.category || 'cosmetic';
          const catColor    = CATEGORY_COLORS[cat] || '#888';
          const btnLabel    = owned ? 'Owned' : (affordable ? 'Redeem' : 'Not enough points');
          const btnDisabled = owned || !affordable;

          return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${owned ? 'rgba(255,196,0,0.25)' : 'rgba(255,255,255,0.08)'};border-radius:14px;padding:1.1rem 1.2rem;display:flex;flex-direction:column;gap:0.65rem;">
            <div style="display:flex;align-items:flex-start;gap:0.75rem;">
              <span style="font-size:1.6rem;flex-shrink:0;line-height:1;">${escHtml(item.icon || '🏆')}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${catColor};margin-bottom:0.2rem;">${escHtml(cat)}</div>
                <div style="font-size:0.95rem;font-weight:800;color:#fff;line-height:1.3;">${escHtml(item.name)}</div>
              </div>
              ${owned ? '<span style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:var(--gold);flex-shrink:0;margin-top:0.15rem;">✓ Owned</span>' : ''}
            </div>
            <div style="font-size:0.8rem;color:var(--muted);line-height:1.5;">${escHtml(item.description)}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-top:auto;">
              <span style="font-size:1rem;font-weight:800;color:var(--gold);">${item.cost.toLocaleString()} pts</span>
              <button type="button"
                onclick="buyTreasuryItem('${escHtml(item.id)}','${escHtml(item.name)}',${item.cost})"
                ${btnDisabled ? 'disabled' : ''}
                style="height:34px;padding:0 1rem;border-radius:8px;font-size:0.8rem;font-weight:700;font-family:inherit;cursor:${btnDisabled ? 'not-allowed' : 'pointer'};border:1px solid ${owned ? 'rgba(255,196,0,0.3)' : (affordable ? 'rgba(31,162,255,0.4)' : 'rgba(255,255,255,0.1)')};background:${owned ? 'rgba(255,196,0,0.08)' : (affordable ? 'rgba(31,162,255,0.12)' : 'rgba(255,255,255,0.04)')};color:${owned ? 'var(--gold)' : (affordable ? '#1FA2FF' : 'var(--dim)')};transition:background 0.18s,border-color 0.18s;"
              >${escHtml(btnLabel)}</button>
            </div>
          </div>`;
        }).join('');
      } catch (err) {
        gridEl.innerHTML = '<p style="color:var(--dim);font-size:0.84rem;grid-column:1/-1;">Could not load treasury. Try again later.</p>';
      }
    }

    async function buyTreasuryItem(itemId, itemName, cost) {
      const userId = _currentMember && _currentMember._id;
      if (!userId) return;
      const balance = _currentMember ? (_currentMember.points || 0) : 0;
      if (balance < cost) return;
      if (!confirm(`Spend ${cost.toLocaleString()} pts to redeem "${itemName}"?`)) return;

      try {
        const { data, error } = await VSSupabase.rpc('purchase_treasury_item', { p_user_id: userId, p_item_id: itemId });
        if (error) throw error;
        if (data && data.ok === false) throw new Error(data.error || 'purchase_failed');

        // Update cached balance
        if (_currentMember) _currentMember.points = Math.max(0, (_currentMember.points || 0) - cost);
        const balEl = document.getElementById('treasury-balance');
        if (balEl) balEl.textContent = (_currentMember.points || 0).toLocaleString() + ' pts';

        // Reload treasury to reflect owned state
        _treasuryLoaded = false;
        loadTreasury();
      } catch (err) {
        const msg = err.message === 'already_owned' ? 'You already own this item.'
                  : err.message === 'insufficient_points' ? 'Not enough points.'
                  : 'Purchase failed. Please try again.';
        alert(msg);
      }
    }
    window.buyTreasuryItem = buyTreasuryItem;

    // ── Monthly Newsletter Preference ─────────────────────────────
    async function loadNewsletterPreference() {
      const toggle = document.getElementById('toggle-newsletter');
      const msg    = document.getElementById('newsletter-status-msg');
      if (!toggle) return;
      try {
        const { data, error } = await VSSupabase.rpc('get_newsletter_preference');
        if (error) throw new Error(error.message);
        const optedOut = data?.opted_out ?? false;
        toggle.checked = !optedOut;
        if (msg) msg.textContent = optedOut ? 'Monthly newsletter is off.' : 'Monthly newsletter is on.';
      } catch (_) {
        if (msg) msg.textContent = 'Could not load preference.';
      }
    }

    async function toggleNewsletter(checked) {
      const msg = document.getElementById('newsletter-status-msg');
      try {
        const { error } = await VSSupabase.rpc('toggle_newsletter_opt_out', { p_opted_out: !checked });
        if (error) throw new Error(error.message);
        if (msg) msg.textContent = checked ? 'Monthly newsletter is on.' : 'Monthly newsletter is off.';
      } catch (_) {
        if (msg) msg.textContent = 'Could not save preference.';
      }
    }
    window.toggleNewsletter = toggleNewsletter;

    // ── PWA Install — settings block ─────────────────────────────
    function loadPwaSettings() {
      const el = document.getElementById('pwa-settings-content');
      if (!el) return;

      const state = typeof window.vsPwaState === 'function' ? window.vsPwaState() : 'unavailable';

      if (state === 'installed') {
        el.innerHTML = `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.85rem 1rem;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);border-radius:12px;">
          <span style="font-size:1.3rem;">✓</span>
          <div>
            <div style="font-size:0.88rem;font-weight:700;color:#10B981;">App installed</div>
            <div style="font-size:0.8rem;color:var(--dim);margin-top:0.15rem;">VaultSpark is running as an installed app on this device.</div>
          </div>
        </div>`;
        return;
      }

      if (state === 'ios') {
        el.innerHTML = `<p style="font-size:0.84rem;color:var(--muted);line-height:1.6;margin-bottom:0.75rem;">Add VaultSpark to your home screen for instant access:</p>
          <ol style="font-size:0.84rem;color:var(--muted);line-height:1.9;padding-left:1.25rem;margin:0;">
            <li>Tap the <strong style="color:var(--text);">Share</strong> button in Safari</li>
            <li>Scroll down and tap <strong style="color:var(--text);">Add to Home Screen</strong></li>
            <li>Tap <strong style="color:var(--text);">Add</strong></li>
          </ol>`;
        return;
      }

      if (state === 'ready') {
        el.innerHTML = `<p style="font-size:0.84rem;color:var(--muted);line-height:1.55;margin-bottom:0.9rem;">Install the Vault app for instant access, offline support, and a full-screen experience — no browser chrome.</p>
          <button type="button" id="pwa-settings-install-btn" style="padding:0.6rem 1.4rem;background:var(--gold);color:#000;font-weight:800;font-size:0.88rem;border:none;border-radius:10px;cursor:pointer;font-family:inherit;">Install App</button>`;
        document.getElementById('pwa-settings-install-btn')?.addEventListener('click', function () {
          const ok = window.vsPwaInstall && window.vsPwaInstall();
          if (!ok) this.textContent = 'Prompt unavailable — try refreshing';
          window.addEventListener('vsPwaInstalled', function () { loadPwaSettings(); }, { once: true });
        });
        return;
      }

      // unavailable
      el.innerHTML = `<p style="font-size:0.84rem;color:var(--dim);line-height:1.55;">To install, open this site in Chrome or Edge on your device, then use the browser menu to <strong style="color:var(--muted);">Add to Home Screen</strong> or <strong style="color:var(--muted);">Install App</strong>.</p>`;
    }

    async function registerServiceWorker() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      try {
        _swRegistration = await navigator.serviceWorker.register('/sw.js');
      } catch (_) {}
    }

    async function loadPushStatus() {
      const toggle   = document.getElementById('toggle-push');
      const statusEl = document.getElementById('push-status-msg');
      if (!toggle) return;

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toggle.disabled = true;
        if (statusEl) statusEl.textContent = 'Push notifications are not supported in this browser.';
        return;
      }
      toggle.disabled = false;
      try {
        const reg = _swRegistration || await navigator.serviceWorker.getRegistration('/sw.js');
        if (!reg) { if (statusEl) statusEl.textContent = 'Service worker not yet registered — reload the page.'; return; }
        const sub = await reg.pushManager.getSubscription();
        toggle.checked = !!sub;
        if (statusEl) statusEl.textContent = sub
          ? 'Push notifications are on. You\'ll hear from the Vault.'
          : 'Enable to get browser notifications when new files and alerts drop.';
      } catch (_) {
        if (statusEl) statusEl.textContent = 'Could not check push notification status.';
      }
    }

    async function togglePushNotifications(checked) {
      if (checked) await subscribePush();
      else await unsubscribePush();
    }

    function urlBase64ToUint8Array(b64) {
      const padding = '='.repeat((4 - b64.length % 4) % 4);
      const base64  = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
      const raw     = atob(base64);
      return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
    }

    async function subscribePush() {
      const toggle   = document.getElementById('toggle-push');
      const statusEl = document.getElementById('push-status-msg');
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          if (toggle)   toggle.checked = false;
          if (statusEl) statusEl.textContent = 'Notification permission denied.';
          return;
        }
        const reg = _swRegistration || await navigator.serviceWorker.getRegistration('/sw.js');
        if (!reg) throw new Error('Service worker not available.');
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        const json = sub.toJSON();
        await VSSupabase.rpc('upsert_push_subscription', { p_endpoint: json.endpoint, p_keys: json.keys });
        if (statusEl) statusEl.textContent = 'Push notifications enabled. You\'ll hear from the Vault.';
      } catch (err) {
        if (toggle)   toggle.checked = false;
        if (statusEl) statusEl.textContent = 'Could not enable push: ' + (err.message || 'unknown error');
      }
    }

    async function unsubscribePush() {
      const statusEl = document.getElementById('push-status-msg');
      try {
        const reg = _swRegistration || await navigator.serviceWorker.getRegistration('/sw.js');
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await VSSupabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint }).catch(() => {});
            await sub.unsubscribe();
          }
        }
        if (statusEl) statusEl.textContent = 'Push notifications disabled.';
      } catch (_) {
        if (statusEl) statusEl.textContent = 'Could not disable push notifications.';
      }
    }

    // ── Phase 10: Live Studio Pulse ───────────────────────────────
    let _pulseChannel = null;

    const PULSE_TYPE_STYLES = {
      update: { dot: '#1FA2FF', shadow: 'rgba(31,162,255,0.4)' },
      alert:  { dot: '#f87171', shadow: 'rgba(248,113,113,0.4)' },
      drop:   { dot: '#FFC400', shadow: 'rgba(255,196,0,0.4)'   },
    };

    function renderPulseItem(item) {
      const s = PULSE_TYPE_STYLES[item.type] || PULSE_TYPE_STYLES.update;
      const t = formatTimeAgo(new Date(item.created_at));
      return `<div class="pulse-item">
        <span class="pulse-type-dot" style="background:${s.dot};box-shadow:0 0 5px ${s.shadow};"></span>
        <div class="pulse-body">
          <div class="pulse-message">${item.message}</div>
          <div class="pulse-time">${t}</div>
        </div>
      </div>`;
    }

    async function initStudioPulse() {
      const el = document.getElementById('pulse-feed');
      if (!el) return;

      // Tear down any existing channel before re-subscribing
      if (_pulseChannel) { VSSupabase.removeChannel(_pulseChannel); _pulseChannel = null; }

      try {
        const { data: items } = await VSSupabase
          .from('studio_pulse')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!items || items.length === 0) {
          el.innerHTML = '<div style="color:var(--dim);font-size:0.88rem;">No transmissions yet. Stand by.</div>';
        } else {
          el.innerHTML = '<div class="pulse-feed">' + items.map(renderPulseItem).join('') + '</div>';
        }

        // Show LIVE badge
        const badge = document.getElementById('pulse-live-badge');
        if (badge) badge.style.display = 'inline-flex';

        // Subscribe to new inserts in real time
        _pulseChannel = VSSupabase.channel('studio-pulse-ch')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'studio_pulse' }, (payload) => {
            const feedEl = document.getElementById('pulse-feed');
            if (!feedEl) return;
            let feedDiv = feedEl.querySelector('.pulse-feed');
            if (!feedDiv) {
              feedEl.innerHTML = '<div class="pulse-feed"></div>';
              feedDiv = feedEl.querySelector('.pulse-feed');
            }
            feedDiv.insertAdjacentHTML('afterbegin', renderPulseItem(payload.new));
          })
          .subscribe();
      } catch (_) {
        if (el) el.innerHTML = '<div style="color:var(--dim);font-size:0.88rem;">Could not load studio pulse.</div>';
      }
    }

    // ── Phase 7: Discord Role Sync ───────────────────────────────

    function updateDiscordUI(discordId) {
      const area = document.getElementById('discord-status-area');
      const desc = document.getElementById('discord-status-desc');
      if (!area) return;
      if (discordId) {
        area.innerHTML = '<span class="discord-connected-badge">✓ Discord Connected</span>';
        if (desc) desc.textContent = 'Your Discord account is linked. You\'ll automatically receive rank roles when you level up.';
      } else {
        area.innerHTML = `<button class="discord-connect-btn" onclick="connectDiscord()"><svg width="16" height="12" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg> Connect Discord</button>`;
      }
    }

    async function connectDiscord() {
      localStorage.setItem('vs_link_discord', '1');
      const { error } = await VSSupabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          scopes: 'identify',
          redirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (error) {
        localStorage.removeItem('vs_link_discord');
        const area = document.getElementById('discord-status-area');
        if (area) area.innerHTML += `<span style="font-size:0.8rem;color:#f87171;margin-left:0.5rem;">${error.message}</span>`;
      }
    }

    // ── Phase 8: Beta Key Vault ───────────────────────────────────
    let _betaKeysLoaded = false;

    const BETA_GAMES = [
      { slug: 'call-of-doodie',         name: 'Call of Doodie',         icon: '💩' },
      { slug: 'gridiron-gm',            name: 'Gridiron GM',            icon: '🏈' },
      { slug: 'vaultspark-football-gm', name: 'VaultSpark Football GM', icon: '⚡' },
    ];

    async function loadBetaKeys() {
      const el = document.getElementById('beta-keys-list');
      if (!el) return;
      el.innerHTML = '<div style="color:var(--dim);">Loading…</div>';
      try {
        const { data: keys, error } = await VSSupabase.from('beta_keys').select('*');
        if (error) throw error;

        if (!keys || keys.length === 0) {
          el.innerHTML = '<p style="color:var(--dim);font-size:0.88rem;line-height:1.6;">No beta keys are available for your rank yet. Earn more Vault Points to unlock early access.</p>';
          return;
        }

        // Group by game_slug
        const byGame = {};
        for (const k of keys) {
          if (!byGame[k.game_slug]) byGame[k.game_slug] = { claimed: null, available: [] };
          if (k.claimed_by)         byGame[k.game_slug].claimed = k;
          else                      byGame[k.game_slug].available.push(k);
        }

        const cards = Object.entries(byGame).map(([slug, info]) => {
          const game = BETA_GAMES.find(g => g.slug === slug) || { name: slug, icon: '🔑' };
          return buildKeyCard(slug, game.name, game.icon, info);
        }).join('');

        el.innerHTML = `<div class="beta-keys-grid">${cards}</div>`;
      } catch (_) {
        if (el) el.innerHTML = '<p style="color:var(--dim);font-size:0.88rem;">Could not load early access keys.</p>';
      }
    }

    function buildKeyCard(slug, name, icon, info) {
      let actionHtml;
      if (info.claimed) {
        actionHtml = `
          <div class="beta-key-code" id="key-code-${slug}">${info.claimed.key_code}</div>
          <div class="beta-key-actions">
            <button class="beta-copy-btn" onclick="copyKeyCode('${slug}')">Copy Key</button>
            <span style="font-size:0.75rem;color:#34d399;font-weight:700;">✓ Claimed</span>
          </div>`;
      } else if (info.available.length > 0) {
        actionHtml = `
          <p style="font-size:0.82rem;color:var(--muted);line-height:1.5;margin:0;">A beta key is available for your Vault Rank.</p>
          <div class="beta-key-actions">
            <button class="beta-claim-btn" id="claim-btn-${slug}" onclick="claimKey('${slug}')">Claim Key →</button>
          </div>`;
      } else {
        actionHtml = '<p style="font-size:0.82rem;color:var(--dim);margin:0;">No keys available right now.</p>';
      }
      return `<div class="beta-key-card">
        <div class="beta-key-game">
          <span class="beta-key-game-icon">${icon}</span>
          <span class="beta-key-game-name">${name}</span>
        </div>
        ${actionHtml}
      </div>`;
    }

    async function claimKey(gameSlug) {
      const btn = document.getElementById('claim-btn-' + gameSlug);
      if (btn) { btn.disabled = true; btn.textContent = 'Claiming…'; }
      try {
        const { data, error } = await VSSupabase.rpc('claim_beta_key', { p_game_slug: gameSlug });
        if (error) throw error;
        if (data?.ok) {
          showXpChip(0, 'Beta key claimed!');
          _betaKeysLoaded = false;
          loadBetaKeys();
        } else {
          if (btn) { btn.disabled = false; btn.textContent = 'Claim Key →'; }
          const msg = data?.error === 'no_keys_available' ? 'No keys available right now.' : 'Could not claim key. Try again.';
          if (btn) btn.insertAdjacentHTML('afterend', `<span style="font-size:0.78rem;color:#f87171;"> ${msg}</span>`);
        }
      } catch (_) {
        if (btn) { btn.disabled = false; btn.textContent = 'Claim Key →'; }
      }
    }

    function copyKeyCode(gameSlug) {
      const codeEl = document.getElementById('key-code-' + gameSlug);
      if (!codeEl) return;
      const code = codeEl.textContent.trim();
      const btn = codeEl.nextElementSibling?.querySelector('button');
      const finish = () => { if (btn) { btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = 'Copy Key'; }, 2000); } };
      navigator.clipboard.writeText(code).then(finish).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = code; ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        finish();
      });
    }

    // ── Investor Requests ─────────────────────────────────────────

    const INV_RANGE_LABELS = {
      under_10k: 'Under $10k', '10k_50k': '$10k–$50k',
      '50k_250k': '$50k–$250k', '250k_plus': '$250k+', unspecified: 'Not specified'
    };
    const INV_STATUS_COLORS = {
      pending: '#1FA2FF', contacted: '#FFC400', approved: '#10B981', rejected: '#ef4444'
    };

    async function loadInvRequests(status) {
      const list = document.getElementById('inv-req-list');
      if (!list) return;

      // Update filter button styles
      document.querySelectorAll('#inv-req-filters button').forEach(btn => {
        const active = btn.dataset.filter === (status || 'all');
        btn.style.background = active ? 'rgba(31,162,255,0.15)' : 'transparent';
        btn.style.borderColor = active ? 'rgba(31,162,255,0.3)' : 'rgba(255,255,255,0.1)';
      });

      list.innerHTML = '<span style="color:var(--dim);">Loading…</span>';

      const { data, error } = await VSSupabase.rpc('admin_get_investor_requests', {
        p_status: status || null
      });

      if (error || data?.error) {
        list.innerHTML = `<span style="color:#ef4444;">Error: ${data?.error || error?.message}</span>`;
        return;
      }

      const requests = Array.isArray(data) ? data : [];

      // Update badge
      const badge = document.getElementById('inv-req-badge');
      if (badge) {
        const pending = requests.filter(r => r.status === 'pending').length;
        if (pending > 0 && !status) {
          badge.textContent = pending + ' pending';
          badge.style.display = 'inline';
        } else { badge.style.display = 'none'; }
      }

      if (requests.length === 0) {
        list.innerHTML = '<span style="color:var(--dim);">No requests in this category.</span>';
        return;
      }

      list.innerHTML = requests.map(r => `
        <div style="border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1.1rem 1.25rem;margin-bottom:0.75rem;background:rgba(255,255,255,0.02);">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.6rem;flex-wrap:wrap;">
            <strong style="color:var(--text);">${escHtml(r.full_name)}</strong>
            <a href="mailto:${escHtml(r.email)}" style="color:#1FA2FF;font-size:0.85rem;">${escHtml(r.email)}</a>
            <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:0.15rem 0.5rem;border-radius:4px;background:rgba(31,162,255,0.08);color:${INV_STATUS_COLORS[r.status] || '#8a9bbf'};">${r.status}</span>
            ${r.organization ? `<span style="font-size:0.82rem;color:var(--muted);">${escHtml(r.organization)}</span>` : ''}
            <span style="font-size:0.78rem;color:var(--dim);margin-left:auto;">${INV_RANGE_LABELS[r.investment_range] || '—'} · ${new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;">
            <div>
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--dim);margin-bottom:0.3rem;">Why approve?</div>
              <div style="font-size:0.85rem;color:var(--muted);line-height:1.55;">${escHtml(r.why_approve)}</div>
            </div>
            <div>
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--dim);margin-bottom:0.3rem;">Interest in VaultSpark</div>
              <div style="font-size:0.85rem;color:var(--muted);line-height:1.55;">${escHtml(r.why_vaultspark)}</div>
            </div>
            ${r.investing_history ? `
            <div>
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--dim);margin-bottom:0.3rem;">Investing history</div>
              <div style="font-size:0.85rem;color:var(--muted);line-height:1.55;">${escHtml(r.investing_history)}</div>
            </div>` : ''}
            ${r.value_beyond_capital ? `
            <div>
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--dim);margin-bottom:0.3rem;">Value beyond capital</div>
              <div style="font-size:0.85rem;color:var(--muted);line-height:1.55;">${escHtml(r.value_beyond_capital)}</div>
            </div>` : ''}
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
            <button onclick="updateInvRequest('${r.id}','contacted')" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:rgba(255,196,0,0.1);border:1px solid rgba(255,196,0,0.25);color:#FFC400;">Mark Contacted</button>
            <button onclick="updateInvRequest('${r.id}','approved')" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);color:#10B981;">Approve</button>
            <button onclick="updateInvRequest('${r.id}','rejected')" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:rgba(214,40,40,0.08);border:1px solid rgba(214,40,40,0.2);color:#ef4444;">Reject</button>
            ${r.prior_gaming ? '<span style="font-size:0.78rem;color:var(--dim);">· Prior gaming investor</span>' : ''}
            ${r.how_heard ? `<span style="font-size:0.78rem;color:var(--dim);">· Found us via: ${escHtml(r.how_heard)}</span>` : ''}
          </div>
          ${r.admin_notes ? `<div style="margin-top:0.6rem;font-size:0.82rem;color:var(--dim);font-style:italic;">Note: ${escHtml(r.admin_notes)}</div>` : ''}
        </div>`).join('');
    }

    async function updateInvRequest(id, status) {
      const note = status === 'rejected' ? prompt('Optional note (visible to you only):') : null;
      const { data, error } = await VSSupabase.rpc('admin_update_investor_request', {
        p_request_id: id,
        p_status: status,
        p_notes: note || null
      });
      if (error || data?.error) {
        alert('Error: ' + (data?.error || error?.message));
        return;
      }
      // Reload current filter
      const activeFilter = document.querySelector('#inv-req-filters button[style*="rgba(31,162,255"]');
      loadInvRequests(activeFilter?.dataset.filter === 'all' ? null : activeFilter?.dataset.filter || 'pending');
    }

    function escHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Fan Art Moderation ────────────────────────────────────────
    async function loadFanArtQueue(status = 'pending') {
      const el = document.getElementById('fan-art-queue');
      if (!el) return;
      el.innerHTML = '<span style="color:var(--dim);">Loading…</span>';

      const SB_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
      let url = `${SB_URL}/rest/v1/fan_art_submissions?status=eq.${encodeURIComponent(status)}&select=id,username,title,description,character_tag,file_path,submitted_at,admin_notes&order=submitted_at.asc&limit=20`;

      const { data: { session } } = await VSSupabase.auth.getSession();
      if (!session) { el.innerHTML = '<span style="color:var(--dim);">Not authenticated.</span>'; return; }

      try {
        const res  = await fetch(url, {
          headers: { apikey: 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij', Authorization: 'Bearer ' + session.access_token }
        });
        const rows = res.ok ? await res.json() : [];

        // Update pending badge
        const badge = document.getElementById('fan-art-pending-badge');
        if (badge && status === 'pending') {
          badge.textContent = rows.length + ' pending';
          badge.style.display = rows.length > 0 ? 'inline' : 'none';
        }

        if (!rows.length) { el.innerHTML = '<span style="color:var(--dim);">None in this category.</span>'; return; }

        el.innerHTML = rows.map(r => {
          const imgUrl = `${SB_URL}/storage/v1/object/public/fan-art/${r.file_path}`;
          return `<div style="display:flex;gap:1rem;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:1rem;margin-bottom:0.75rem;background:rgba(255,255,255,0.02);flex-wrap:wrap;">
            <img src="${imgUrl}" alt="${escHtml(r.title)}" loading="lazy" style="width:96px;height:96px;object-fit:cover;border-radius:8px;flex-shrink:0;" onerror="this.style.display='none'" />
            <div style="flex:1;min-width:200px;">
              <div style="font-weight:700;color:var(--text);margin-bottom:0.2rem;">${escHtml(r.title)} <span style="font-size:0.75rem;color:var(--dim);font-weight:400;">by @${escHtml(r.username)}</span></div>
              <div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.1rem;">${escHtml(r.character_tag)} · ${new Date(r.submitted_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
              ${r.description ? `<div style="font-size:0.82rem;color:var(--muted);line-height:1.5;margin-bottom:0.6rem;">${escHtml(r.description)}</div>` : ''}
              <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                <button onclick="moderateFanArt('${r.id}','approved')" style="padding:0.25rem 0.75rem;font-size:0.78rem;font-weight:700;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);color:#10B981;border-radius:6px;cursor:pointer;font-family:inherit;">✓ Approve</button>
                <button onclick="moderateFanArt('${r.id}','rejected')" style="padding:0.25rem 0.75rem;font-size:0.78rem;font-weight:700;background:rgba(214,40,40,0.08);border:1px solid rgba(214,40,40,0.2);color:#ef4444;border-radius:6px;cursor:pointer;font-family:inherit;">✕ Reject</button>
                <a href="${imgUrl}" target="_blank" rel="noreferrer" style="padding:0.25rem 0.75rem;font-size:0.78rem;color:var(--dim);text-decoration:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;">View full →</a>
              </div>
            </div>
          </div>`;
        }).join('');
      } catch(err) {
        el.innerHTML = `<span style="color:#ef4444;">Error: ${escHtml(err.message)}</span>`;
      }
    }

    async function moderateFanArt(id, status) {
      const note = status === 'rejected' ? prompt('Optional note for rejection (internal only):') : null;
      const { data: { session } } = await VSSupabase.auth.getSession();
      if (!session) return;
      const SB_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
      const body = { status, reviewed_at: new Date().toISOString() };
      if (note) body.admin_notes = note;
      const res = await fetch(`${SB_URL}/rest/v1/fan_art_submissions?id=eq.${id}`, {
        method: 'PATCH',
        headers: { apikey: 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij', Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(body)
      });
      if (res.ok) loadFanArtQueue('pending');
      else alert('Update failed: ' + res.status);
    }

    // ── Vault Command (Admin — member #1 only) ───────────────────

    async function loadChallengeAnalytics() {
      const listEl = document.getElementById('admin-analytics-list');
      if (!listEl) return;
      listEl.textContent = 'Loading…';
      try {
        const [{ data: challenges }, { data: submissions }] = await Promise.all([
          VSSupabase.from('challenges').select('id,title,challenge_type,points').eq('is_active', true),
          VSSupabase.from('challenge_submissions').select('challenge_id'),
        ]);
        if (!challenges) { listEl.textContent = 'Could not load.'; return; }
        const countMap = {};
        (submissions || []).forEach(s => { countMap[s.challenge_id] = (countMap[s.challenge_id] || 0) + 1; });
        const totalMembers = parseInt(document.getElementById('stat-pts')?.closest('[data-members]')?.dataset?.members || '0') || 1;
        const rows = challenges.map(c => ({
          ...c,
          completions: countMap[c.id] || 0,
        })).sort((a, b) => b.completions - a.completions);
        listEl.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">' +
          '<thead><tr style="border-bottom:1px solid rgba(255,255,255,0.08);">' +
          '<th style="text-align:left;padding:0.5rem 0.75rem;color:var(--dim);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;">Challenge</th>' +
          '<th style="text-align:left;padding:0.5rem 0.75rem;color:var(--dim);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;">Type</th>' +
          '<th style="text-align:right;padding:0.5rem 0.75rem;color:var(--dim);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;">Completions</th>' +
          '<th style="text-align:right;padding:0.5rem 0.75rem;color:var(--dim);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;">Pts</th>' +
          '</tr></thead><tbody>' +
          rows.map(r => '<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">' +
            '<td style="padding:0.5rem 0.75rem;color:var(--text);">' + escHtml(r.title) + '</td>' +
            '<td style="padding:0.5rem 0.75rem;color:var(--muted);">' + escHtml(r.challenge_type) + '</td>' +
            '<td style="padding:0.5rem 0.75rem;color:var(--gold);text-align:right;">' + r.completions + '</td>' +
            '<td style="padding:0.5rem 0.75rem;color:var(--dim);text-align:right;">+' + r.points + '</td>' +
          '</tr>').join('') +
          '</tbody></table>';
      } catch (_) { listEl.textContent = 'Error loading analytics.'; }
    }

    async function exportMemberCSV() {
      const btn = document.getElementById('admin-csv-btn');
      const fb = document.getElementById('admin-csv-fb');
      if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }
      try {
        const { data: members } = await VSSupabase.from('vault_members')
          .select('username,points,created_at,member_number,subscribed')
          .order('points', { ascending: false });
        if (!members || !members.length) { showAdminFeedback(fb, 'No members found.', false); return; }
        function getCSVRank(pts) {
          if (pts >= 100000) return 'The Sparked';
          if (pts >= 60000)  return 'Forge Master';
          if (pts >= 30000)  return 'Vault Keeper';
          if (pts >= 15000)  return 'Void Operative';
          if (pts >= 7500)   return 'Vault Breacher';
          if (pts >= 3000)   return 'Vault Guard';
          if (pts >= 1000)   return 'Rift Scout';
          if (pts >= 250)    return 'Vault Runner';
          return 'Spark Initiate';
        }
        const header = 'rank,username,points,vault_rank,member_number,subscribed,joined_date';
        const rows = members.map((m, i) =>
          [i+1, m.username, m.points, getCSVRank(m.points), m.member_number || '', m.subscribed ? 'yes' : 'no',
           m.created_at ? m.created_at.slice(0, 10) : ''].join(',')
        );
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'vault-members-' + new Date().toISOString().slice(0,10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAdminFeedback(fb, '✓ Downloaded ' + members.length + ' members', true);
      } catch (_) { showAdminFeedback(fb, 'Export failed.', false); }
      if (btn) { btn.disabled = false; btn.textContent = '⬇ Download Members CSV'; }
    }

    function showAdminFeedback(el, msg, ok) {
      el.textContent = msg;
      el.className = 'admin-feedback show ' + (ok ? 'ok' : 'err');
      setTimeout(() => { el.className = 'admin-feedback'; }, 4000);
    }

    async function adminPostPulse() {
      const msg      = document.getElementById('admin-pulse-msg').value.trim();
      const type     = document.getElementById('admin-pulse-type').value;
      const fb       = document.getElementById('admin-pulse-fb');
      const btn      = document.getElementById('admin-pulse-btn');
      const schedOn  = document.getElementById('admin-pulse-schedule-toggle').checked;
      const schedVal = document.getElementById('admin-pulse-schedule-time').value;
      if (!msg) { showAdminFeedback(fb, 'Signal text required', false); return; }
      if (schedOn && !schedVal) { showAdminFeedback(fb, 'Pick a schedule time', false); return; }
      if (schedOn && new Date(schedVal) <= new Date()) { showAdminFeedback(fb, 'Schedule time must be in the future', false); return; }
      btn.disabled = true; fb.className = 'admin-feedback show'; fb.textContent = schedOn ? 'Scheduling…' : 'Broadcasting…';
      try {
        const payload = { message: msg, type };
        if (schedOn) payload.publish_at = new Date(schedVal).toISOString();
        const { error } = await VSSupabase.from('studio_pulse').insert(payload);
        if (error) throw error;
        document.getElementById('admin-pulse-msg').value = '';
        document.getElementById('admin-pulse-schedule-toggle').checked = false;
        document.getElementById('admin-pulse-schedule-time').value = '';
        document.getElementById('admin-pulse-schedule-wrap').style.display = 'none';
        showAdminFeedback(fb, schedOn ? 'Signal scheduled ✓' : 'Signal broadcast ✓', true);
      } catch (err) {
        showAdminFeedback(fb, 'Error: ' + (err.message || 'unknown'), false);
      } finally {
        btn.disabled = false;
      }
    }

    async function adminPostFile() {
      const title          = document.getElementById('admin-file-title').value.trim();
      const slug           = document.getElementById('admin-file-slug').value.trim();
      const classification = document.getElementById('admin-file-classification').value.trim();
      const rank_required  = parseInt(document.getElementById('admin-file-rank').value, 10);
      const universe_tag   = document.getElementById('admin-file-universe').value.trim();
      const content_html   = document.getElementById('admin-file-html').value.trim();
      const fb  = document.getElementById('admin-file-fb');
      const btn = document.getElementById('admin-file-btn');
      if (!title || !slug || !content_html) {
        showAdminFeedback(fb, 'Title, slug, and content are required', false); return;
      }
      btn.disabled = true; fb.className = 'admin-feedback show'; fb.textContent = 'Uploading…';
      try {
        const { error } = await VSSupabase.from('classified_files').insert({
          title, slug, classification, rank_required, universe_tag, content_html,
          published_at: new Date().toISOString()
        });
        if (error) throw error;
        ['admin-file-title','admin-file-slug','admin-file-classification','admin-file-universe','admin-file-html']
          .forEach(id => { document.getElementById(id).value = ''; });
        document.getElementById('admin-file-rank').value = '0';
        _archiveLoaded = false; // force reload next time Archive tab is opened
        showAdminFeedback(fb, 'File uplinked to Archive ✓', true);
      } catch (err) {
        showAdminFeedback(fb, 'Error: ' + (err.message || 'unknown'), false);
      } finally {
        btn.disabled = false;
      }
    }

    async function adminPostBetaKey() {
      const game_slug = document.getElementById('admin-key-slug').value;
      const key_code  = document.getElementById('admin-key-code').value.trim();
      const min_rank  = parseInt(document.getElementById('admin-key-rank').value, 10);
      const fb  = document.getElementById('admin-key-fb');
      const btn = document.getElementById('admin-key-btn');
      if (!key_code) { showAdminFeedback(fb, 'Key code required', false); return; }
      btn.disabled = true; fb.className = 'admin-feedback show'; fb.textContent = 'Deploying…';
      try {
        const { error } = await VSSupabase.from('beta_keys').insert({ game_slug, key_code, min_rank });
        if (error) throw error;
        document.getElementById('admin-key-code').value = '';
        _betaKeysLoaded = false; // force reload next time Early Access tab is opened
        showAdminFeedback(fb, 'Key deployed to Vault ✓', true);
      } catch (err) {
        showAdminFeedback(fb, 'Error: ' + (err.message || 'unknown'), false);
      } finally {
        btn.disabled = false;
      }
    }
