    // ── S66: Portal version — drives What's New deduplication ────
    const PORTAL_VERSION = '2026-04-13-s66';

    // ── Phase 2: XP chip notification ────────────────────────────
    function showXpChip(pts, label) {
      const existing = document.querySelector('.xp-chip');
      if (existing) existing.remove();
      const chip = document.createElement('div');
      chip.className = 'xp-chip';
      chip.setAttribute('role', 'status');
      chip.setAttribute('aria-live', 'assertive');
      chip.textContent = '+' + pts + ' pts — ' + (label || 'Vault Points');
      document.body.appendChild(chip);
      chip.addEventListener('animationend', () => chip.remove());
    }

    // ── Feature 3: In-portal notification center ─────────────────
    let _notifPanelOpen   = false;
    let _notifRealtimeCh  = null;
    let _notifItems       = [];   // cache for badge counting

    const NOTIF_TYPE_ICONS = { update: '🚀', alert: '⚠️', drop: '💎', rank_up: '⭐', default: '📢' };

    function toggleNotifPanel() {
      _notifPanelOpen = !_notifPanelOpen;
      const panel = document.getElementById('notif-panel');
      if (!panel) return;
      panel.style.display = _notifPanelOpen ? 'block' : 'none';
      if (_notifPanelOpen) {
        loadNotifications();
        markNotifsRead();
      }
    }

    function closeNotifPanel() {
      _notifPanelOpen = false;
      const panel = document.getElementById('notif-panel');
      if (panel) panel.style.display = 'none';
    }

    function markNotifsRead() {
      localStorage.setItem('notifications_last_read', new Date().toISOString());
      updateNotifBadge(0);
    }

    function updateNotifBadge(count) {
      const badge = document.getElementById('notif-badge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent   = count > 9 ? '9+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    function countUnread(items) {
      const lastRead = localStorage.getItem('notifications_last_read');
      if (!lastRead) return items.length;
      return items.filter(n => new Date(n.created_at) > new Date(lastRead)).length;
    }

    async function loadNotifications() {
      const list = document.getElementById('notif-list');
      if (!list) return;
      list.innerHTML = '<div class="notif-loading">Loading…</div>';

      try {
        // Fetch Studio Pulse (last 10)
        const [{ data: pulseItems }, { data: rankUps }] = await Promise.all([
          VSSupabase.from('studio_pulse').select('id,type,message,created_at').order('created_at', { ascending: false }).limit(10),
          VSSupabase.from('point_events').select('id,label,created_at').or('label.ilike.%rank up%,reason.ilike.%rank_up%').order('created_at', { ascending: false }).limit(5),
        ]);

        const combined = [
          ...(pulseItems || []).map(p => ({ ...p, _kind: 'pulse'   })),
          ...(rankUps   || []).map(r => ({ ...r, type: 'rank_up', message: r.label || 'Rank Up!', _kind: 'rankup' })),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 12);

        _notifItems = combined;
        updateNotifBadge(countUnread(combined));

        if (combined.length === 0) {
          list.innerHTML = '<div class="notif-empty">No notifications yet. Studio Pulse broadcasts will appear here.</div>';
          return;
        }

        const lastRead = localStorage.getItem('notifications_last_read');
        list.innerHTML = combined.map(n => {
          const isUnread = lastRead ? new Date(n.created_at) > new Date(lastRead) : true;
          const icon     = NOTIF_TYPE_ICONS[n.type] || NOTIF_TYPE_ICONS.default;
          const time     = formatTimeAgo(new Date(n.created_at));
          const click    = n._kind === 'rankup' ? 'onclick="switchDashTab(\'dashboard\');closeNotifPanel();"' : '';
          const cursor   = n._kind === 'rankup' ? 'cursor:pointer;' : '';
          return `<div ${click} class="notif-item${n._kind === 'rankup' ? ' notif-item-clickable' : ''}${isUnread ? ' notif-unread' : ''}">
            <span class="notif-icon">${icon}</span>
            <div class="notif-body">
              <div class="notif-msg">${escHtml(n.message)}</div>
              <div class="notif-time">${time}</div>
            </div>
            ${isUnread ? '<span class="notif-unread-dot"></span>' : ''}
          </div>`;
        }).join('');

      } catch (_) {
        list.innerHTML = '<div class="notif-loading">Could not load notifications.</div>';
      }
    }

    function initNotifCenter() {
      const wrap = document.getElementById('notif-bell-wrap');
      if (wrap) wrap.style.display = '';

      // Realtime: watch studio_pulse for new inserts
      if (_notifRealtimeCh) { VSSupabase.removeChannel(_notifRealtimeCh); _notifRealtimeCh = null; }
      _notifRealtimeCh = VSSupabase.channel('notif-pulse-ch')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'studio_pulse' }, (payload) => {
          _notifItems.unshift({ ...payload.new, _kind: 'pulse' });
          updateNotifBadge(countUnread(_notifItems));
          if (_notifPanelOpen) loadNotifications();
        })
        .subscribe();

      // Set initial unread count from cached data (runs after loadNotifications is called elsewhere)
      // We set it on open; show 0 initially then a quick fetch
      setTimeout(async () => {
        try {
          const { data: pulse } = await VSSupabase.from('studio_pulse').select('id,created_at').order('created_at', { ascending: false }).limit(10);
          _notifItems = (pulse || []).map(p => ({ ...p, _kind: 'pulse' }));
          updateNotifBadge(countUnread(_notifItems));
        } catch (_) {}
      }, 500);
    }

    // Close notif panel on outside click
    document.addEventListener('click', function(e) {
      if (_notifPanelOpen) {
        const wrap = document.getElementById('notif-bell-wrap');
        if (wrap && !wrap.contains(e.target)) closeNotifPanel();
      }
    });

    // ── Generic toast notification ────────────────────────────────
    function showToast(message, opts) {
      // opts: { emoji, color, duration }
      opts = opts || {};
      const bg    = opts.color || 'rgba(255,196,0,0.15)';
      const bd    = opts.color ? opts.color.replace('0.15', '0.4') : 'rgba(255,196,0,0.4)';
      const dur   = opts.duration || 3200;
      const toast = document.createElement('div');
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.style.cssText = [
        'position:fixed',
        'left:50%',
        'transform:translateX(-50%)',
        'bottom:130px',
        'background:' + bg,
        'border:1px solid ' + bd,
        'border-radius:999px',
        'padding:0.6rem 1.5rem',
        'font-size:0.98rem',
        'font-weight:700',
        'color:#fff',
        'pointer-events:none',
        'z-index:510',
        'white-space:nowrap',
        'box-shadow:0 4px 24px rgba(0,0,0,0.3)',
        'animation:xp-fly ' + (dur / 1000) + 's ease-out forwards',
      ].join(';');
      toast.textContent = (opts.emoji ? opts.emoji + ' ' : '') + message;
      document.body.appendChild(toast);
      toast.addEventListener('animationend', () => toast.remove());
    }

    // ── Feature 1: Daily login bonus + streak system ──────────────
    async function checkDailyLogin(member) {
      try {
        const todayUTC = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        if (member.last_login_date === todayUTC) {
          // Already logged in today — just update streak badge
          updateStreakBadge(member.streak_count);
          return;
        }

        // Work out new streak count
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayUTC = yesterday.toISOString().slice(0, 10);
        const wasConsecutive = member.last_login_date === yesterdayUTC;
        const newStreak = wasConsecutive ? member.streak_count + 1 : 1;

        // 1. Award daily login XP
        await VSSupabase.rpc('award_points', {
          p_reason:   'daily_login',
          p_points:   10,
          p_label:    'Daily Login',
          p_once_per: null,
        }).catch(() => {});

        // 2. Update streak + last_login_date in vault_members
        await VSSupabase.from('vault_members')
          .update({ last_login_date: todayUTC, streak_count: newStreak })
          .eq('id', member._id)
          .catch(() => {});

        // Update local reference so refreshes are correct
        member.streak_count    = newStreak;
        member.last_login_date = todayUTC;

        // 3. Show streak toast
        showToast('Day ' + newStreak + ' streak! +10 XP', {
          emoji: '🔥', color: 'rgba(251,146,60,0.18)', duration: 3200
        });

        // 4. Streak milestone bonuses
        const MILESTONES = { 7: 50, 14: 100, 30: 200, 60: 500, 100: 1000 };
        if (MILESTONES[newStreak]) {
          const bonus = MILESTONES[newStreak];
          await VSSupabase.rpc('award_points', {
            p_reason:   'streak_milestone_' + newStreak,
            p_points:   bonus,
            p_label:    newStreak + '-Day Streak Bonus',
            p_once_per: null,
          }).catch(() => {});
          setTimeout(() => {
            showToast(newStreak + '-Day Streak! +' + bonus + ' bonus XP', {
              emoji: '🏆', color: 'rgba(255,196,0,0.18)', duration: 4000
            });
          }, 1600);
        }

        updateStreakBadge(newStreak);
        // Refresh points after a short delay
        setTimeout(() => refreshPointsDisplay(), 1800);

      } catch (_) { /* non-fatal */ }
    }

    function updateStreakBadge(streak) {
      const badge = document.getElementById('streak-badge');
      const cnt   = document.getElementById('streak-count-display');
      if (!badge || !cnt) return;
      if (streak && streak > 0) {
        cnt.textContent  = streak;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
      // Also update daily loop widget
      const dlwStreak = document.getElementById('dlw-streak');
      if (dlwStreak) dlwStreak.textContent = streak || 0;
    }

    // ── Daily Loop Widget ─────────────────────────────────────────────
    async function initDailyLoopWidget(member) {
      const widget = document.getElementById('daily-loop-widget');
      if (!widget) return;

      // Show widget
      widget.style.display = '';

      // Populate streak
      const dlwStreak = document.getElementById('dlw-streak');
      if (dlwStreak) dlwStreak.textContent = member.streak_count || 0;

      // Show login bonus chip if claimed today
      const todayUTC = new Date().toISOString().slice(0, 10);
      if (member.last_login_date === todayUTC) {
        const chip = document.getElementById('dlw-bonus-chip');
        if (chip) chip.style.display = '';
      }

      // Load an active challenge title
      try {
        const VSPublic = window.VSPublic;
        if (VSPublic) {
          const result = await VSPublic
            .from('challenges')
            .select('title,points_reward')
            .eq('is_active', true)
            .order('created_at', false)
            .limit(1)
            .get();
          const challenges = (result && result.data) || [];
          const titleEl = document.getElementById('dlw-challenge-title');
          if (titleEl) {
            if (challenges.length > 0) {
              const c = challenges[0];
              titleEl.textContent = c.title + (c.points_reward ? ' (+' + c.points_reward + ' pts)' : '');
            } else {
              titleEl.textContent = 'No active challenges right now — check back soon.';
              const btn = document.getElementById('dlw-challenge-btn');
              if (btn) btn.style.display = 'none';
            }
          }
        }
      } catch(_) {
        const titleEl = document.getElementById('dlw-challenge-title');
        if (titleEl) titleEl.textContent = 'Open challenges to see what\'s active today.';
      }
    }

    // ── Phase 2: Award points for this session's eligible actions ─
    async function initPointsEconomy(member) {
      const uid = member._id;
      // localStorage flag prefix: vs_pts_{uid}_{reason}
      const flag = (reason) => 'vs_pts_' + uid + '_' + reason;
      const hasFlag = (reason) => !!localStorage.getItem(flag(reason));
      const setFlag = (reason) => localStorage.setItem(flag(reason), '1');

      const toAward = [];

      // Subscribe to Vault Dispatch (25 pts, once ever)
      if (member.subscribed && !hasFlag('subscribed')) {
        toAward.push({ reason: 'subscribed', pts: 25, label: 'Subscribed to Vault Dispatch' });
      }

      // Bio set (15 pts, once ever)
      if (member.bio && member.bio.trim().length > 0 && !hasFlag('bio_set')) {
        toAward.push({ reason: 'bio_set', pts: 15, label: 'Completed your profile bio' });
      }

      // Avatar customized (10 pts, once ever)
      if (member.avatar_id && member.avatar_id !== 'spark' && !hasFlag('avatar_customized')) {
        toAward.push({ reason: 'avatar_customized', pts: 10, label: 'Customized your avatar' });
      }

      // Game visits (set by localStorage on game pages, award once per game)
      const gameVisits = [
        { key: 'vs_visited_cod',   reason: 'game_visit_cod',    pts: 10, label: 'Visited Call of Doodie' },
        { key: 'vs_visited_gm',    reason: 'game_visit_gridiron', pts: 10, label: 'Visited Gridiron GM' },
        { key: 'vs_visited_vsfgm', reason: 'game_visit_vsfgm',  pts: 10, label: 'Visited VaultSpark Football GM' },
      ];
      for (const v of gameVisits) {
        if (localStorage.getItem(v.key) && !hasFlag(v.reason)) {
          toAward.push({ reason: v.reason, pts: v.pts, label: v.label });
        }
      }

      // Lore read (set by localStorage on lore page)
      if (localStorage.getItem('vs_visited_dreadspike') && !hasFlag('lore_read_dreadspike')) {
        toAward.push({ reason: 'lore_read_dreadspike', pts: 15, label: 'Read DreadSpike classified file' });
      }

      if (toAward.length === 0) return;

      let totalAwarded = 0;
      let lastLabel = '';
      for (const item of toAward) {
        try {
          const { data } = await VSSupabase.rpc('award_points', {
            p_reason:   item.reason,
            p_points:   item.pts,
            p_label:    item.label,
            p_once_per: 'ever',
          });
          if (data?.ok) {
            setFlag(item.reason);
            totalAwarded += item.pts;
            lastLabel = item.label;
          } else if (data?.skipped) {
            setFlag(item.reason); // already in DB, don't retry
          }
        } catch (_) { /* non-fatal */ }
      }

      if (totalAwarded > 0) {
        showXpChip(totalAwarded, toAward.length === 1 ? lastLabel : 'Multiple actions');
        // Refresh points display from DB
        const { data: row } = await VSSupabase.from('vault_members').select('points').eq('id', uid).single();
        if (row) {
          const newPts = row.points;
          document.getElementById('profile-pts').textContent = newPts + ' pts';
          document.getElementById('stat-pts').textContent    = newPts;
          document.getElementById('info-pts').textContent    = newPts + ' pts';
          const rank = VS.getRank(newPts);
          const progress = VS.getRankProgress(newPts);
          document.getElementById('progress-fill').style.width = progress + '%';
          document.getElementById('stat-rank').textContent  = rank.name;
          document.getElementById('info-rank').textContent  = rank.name;
          updateRankProgress(newPts);
          // Reload activity
          loadPointEvents();
        }
      }
    }

    // ── Phase 36: Game session milestone awards ───────────────────
    async function initGameSessionMilestones(member) {
      const uid = member._id;
      const flag    = (r) => 'vs_pts_' + uid + '_' + r;
      const hasFlag = (r) => !!localStorage.getItem(flag(r));
      const setFlag = (r) => localStorage.setItem(flag(r), '1');

      const MILESTONES = [
        { game: 'call-of-doodie',         steps: [
          { n: 5,  reason: 'gs_cod_5',   pts: 25,  label: '5 Call of Doodie sessions' },
          { n: 10, reason: 'gs_cod_10',  pts: 50,  label: '10 Call of Doodie sessions' },
          { n: 25, reason: 'gs_cod_25',  pts: 100, label: '25 Call of Doodie sessions' },
        ]},
        { game: 'gridiron-gm',            steps: [
          { n: 5,  reason: 'gs_ggm_5',   pts: 25,  label: '5 Gridiron GM sessions' },
          { n: 10, reason: 'gs_ggm_10',  pts: 50,  label: '10 Gridiron GM sessions' },
          { n: 25, reason: 'gs_ggm_25',  pts: 100, label: '25 Gridiron GM sessions' },
        ]},
        { game: 'vaultspark-football-gm', steps: [
          { n: 5,  reason: 'gs_vsfgm_5',   pts: 25,  label: '5 Football GM sessions' },
          { n: 10, reason: 'gs_vsfgm_10',  pts: 50,  label: '10 Football GM sessions' },
          { n: 25, reason: 'gs_vsfgm_25',  pts: 100, label: '25 Football GM sessions' },
        ]},
      ];

      // Only proceed if any milestone is not yet locally flagged
      const needsCheck = MILESTONES.some(g => g.steps.some(s => !hasFlag(s.reason)));
      if (!needsCheck) return;

      try {
        // Single query: count sessions grouped by game_slug for this user
        const { data: rows } = await VSSupabase
          .from('game_sessions')
          .select('game_slug')
          .eq('user_id', uid);
        if (!Array.isArray(rows)) return;

        const counts = {};
        rows.forEach(r => { counts[r.game_slug] = (counts[r.game_slug] || 0) + 1; });

        const toAward = [];
        for (const g of MILESTONES) {
          const count = counts[g.game] || 0;
          for (const step of g.steps) {
            if (count >= step.n && !hasFlag(step.reason)) {
              toAward.push(step);
            }
          }
        }

        let totalAwarded = 0;
        for (const item of toAward) {
          try {
            const { data } = await VSSupabase.rpc('award_points', {
              p_reason:   item.reason,
              p_points:   item.pts,
              p_label:    item.label,
              p_once_per: 'ever',
            });
            if (data?.ok || data?.skipped) setFlag(item.reason);
            if (data?.ok) totalAwarded += item.pts;
          } catch (_) {}
        }

        if (totalAwarded > 0) {
          showXpChip(totalAwarded, toAward.length === 1 ? toAward[0].label : 'Game milestones reached');
          setTimeout(() => refreshPointsDisplay(), 1800);
        }
      } catch (_) {}
    }

    // ── Phase 42: Currently playing badge ────────────────────────
    async function loadCurrentlyPlaying(member) {
      const GAME_NAMES = {
        'call-of-doodie':         'Call of Doodie',
        'gridiron-gm':            'Gridiron GM',
        'vaultspark-football-gm': 'VaultSpark Football GM',
      };
      try {
        const { data } = await VSSupabase
          .from('game_sessions')
          .select('game_slug,played_at')
          .eq('user_id', member._id)
          .order('played_at', { ascending: false })
          .limit(1)
          .single();
        if (!data) return;
        const badge = document.getElementById('currently-playing-badge');
        if (!badge) return;
        const name     = GAME_NAMES[data.game_slug] || data.game_slug;
        const today    = new Date().toISOString().slice(0, 10);
        const isToday  = data.played_at.slice(0, 10) === today;
        const label    = isToday ? 'Playing' : 'Last played';
        const color    = isToday ? '#10B981' : '#94a3b8';
        const bg       = isToday ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.08)';
        const border   = isToday ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.18)';
        badge.style.display = '';
        badge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.78rem;font-weight:700;color:${color};background:${bg};border:1px solid ${border};border-radius:999px;padding:0.22rem 0.65rem;">🎮 ${label}: ${name}</span>`;
      } catch (_) {}
    }

    // ── Phase 43: Teams ──────────────────────────────────────────
    const TEAM_SB  = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
    const TEAM_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';

    function teamAuthH(tok) {
      return { apikey: TEAM_KEY, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
    }

    async function loadTeamPanel(member) {
      const el = document.getElementById('team-content');
      if (!el || !member) return;
      try {
        const { data } = await VSSupabase.rpc('get_my_team');
        if (!data) {
          renderNoTeam(el, member);
        } else {
          renderTeam(el, data, member);
        }
      } catch (_) { el.innerHTML = '<span class="team-error">Unable to load team.</span>'; }
    }

    function renderNoTeam(el, member) {
      el.innerHTML = `
        <div class="team-no-team">
          You're not on a team yet. Create one or join with an invite code.
        </div>
        <div class="team-form-wrap">
          <div>
            <div class="team-label">Create a Team</div>
            <div class="team-input-row">
              <input id="team-create-name" type="text" maxlength="30" placeholder="Team name" autocomplete="off"
                class="team-input" />
              <button onclick="createTeam('${member._id}')" class="team-btn-create">
                Create
              </button>
            </div>
          </div>
          <div>
            <div class="team-label">Join a Team</div>
            <div class="team-input-row">
              <input id="team-join-code" type="text" maxlength="6" placeholder="6-char invite code" autocomplete="off"
                class="team-input-code" />
              <button onclick="joinTeam('${member._id}')" class="team-btn-join">
                Join
              </button>
            </div>
          </div>
          <div id="team-feedback" class="team-feedback"></div>
        </div>`;
    }

    function renderTeam(el, data, member) {
      const t = data.team;
      const roster = Array.isArray(data.roster) ? data.roster : [];
      const isLeader = roster.some(r => r.user_id === member._id && r.role === 'leader');
      const rosterHtml = roster.map(r =>
        `<div class="team-roster-item">
          <span class="team-roster-icon">${r.role === 'leader' ? '👑' : '🏃'}</span>
          <span class="team-roster-name" style="font-weight:${r.user_id === member._id ? '700' : '400'};">${escHtml(r.username)}${r.user_id === member._id ? ' <span class="team-roster-you">(you)</span>' : ''}</span>
          <span class="team-roster-role">${r.role}</span>
        </div>`
      ).join('');
      el.innerHTML = `
        <div class="team-card">
          <div class="team-card-header">
            <div>
              <div class="team-name">${escHtml(t.name)}</div>
              <div class="team-invite-code">
                Invite code: <code>${t.invite_code}</code>
                <button onclick="navigator.clipboard.writeText('${t.invite_code}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)"
                  class="team-copy-btn">Copy</button>
              </div>
            </div>
            <div class="team-pts-wrap">
              <div class="team-pts-value">${(t.total_points||0).toLocaleString()}</div>
              <div class="team-pts-label">team pts</div>
            </div>
          </div>
          <div class="team-member-count">${roster.length} member${roster.length!==1?'s':''}</div>
          ${rosterHtml}
        </div>
        <div class="team-actions">
          ${isLeader ? `<button onclick="disbandTeam('${t.id}','${member._id}')" class="team-btn-disband">Disband Team</button>` : ''}
          <button onclick="leaveTeam('${member._id}')" class="team-btn-leave">Leave Team</button>
          <a href="/leaderboards/" class="team-btn-rankings">Team Rankings →</a>
        </div>
        <div id="team-feedback" class="team-feedback-bottom"></div>`;
    }

    function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    async function createTeam(memberId) {
      const nameEl = document.getElementById('team-create-name');
      const fb     = document.getElementById('team-feedback');
      const name   = (nameEl?.value || '').trim();
      if (!name) { if(fb) fb.textContent = 'Enter a team name.'; return; }
      if (name.length < 2) { if(fb) fb.textContent = 'Name must be at least 2 characters.'; return; }
      const s = await VSSupabase.auth.getSession();
      const tok = s?.data?.session?.access_token;
      if (!tok) return;
      try {
        const res = await fetch(TEAM_SB + '/rest/v1/teams', {
          method: 'POST',
          headers: Object.assign({}, teamAuthH(tok), { Prefer: 'return=representation' }),
          body: JSON.stringify({ name, created_by: memberId })
        });
        if (!res.ok) throw new Error((await res.json())?.message || 'Create failed');
        const [team] = await res.json();
        // join as leader
        await fetch(TEAM_SB + '/rest/v1/team_members', {
          method: 'POST',
          headers: Object.assign({}, teamAuthH(tok), { Prefer: 'return=minimal' }),
          body: JSON.stringify({ team_id: team.id, user_id: memberId, role: 'leader' })
        });
        if(nameEl) nameEl.value = '';
        loadTeamPanel(_currentMember);
      } catch(e) { if(fb) fb.textContent = e.message || 'Failed to create team.'; }
    }

    async function joinTeam(memberId) {
      const codeEl = document.getElementById('team-join-code');
      const fb     = document.getElementById('team-feedback');
      const code   = (codeEl?.value || '').trim().toUpperCase();
      if (code.length !== 6) { if(fb) fb.textContent = 'Invite codes are 6 characters.'; return; }
      const s = await VSSupabase.auth.getSession();
      const tok = s?.data?.session?.access_token;
      if (!tok) return;
      try {
        // find team by invite code
        const res = await fetch(TEAM_SB + '/rest/v1/teams?invite_code=eq.' + encodeURIComponent(code) + '&select=id', {
          headers: { apikey: TEAM_KEY, Authorization: 'Bearer ' + tok }
        });
        const teams = res.ok ? await res.json() : [];
        if (!teams.length) { if(fb) fb.textContent = 'Team not found. Check the code.'; return; }
        const teamId = teams[0].id;
        const joinRes = await fetch(TEAM_SB + '/rest/v1/team_members', {
          method: 'POST',
          headers: Object.assign({}, teamAuthH(tok), { Prefer: 'return=minimal' }),
          body: JSON.stringify({ team_id: teamId, user_id: memberId, role: 'member' })
        });
        if (!joinRes.ok) {
          const err = await joinRes.json();
          throw new Error(err?.message?.includes('unique') ? 'You are already on a team.' : 'Join failed.');
        }
        if(codeEl) codeEl.value = '';
        loadTeamPanel(_currentMember);
      } catch(e) { if(fb) fb.textContent = e.message || 'Failed to join team.'; }
    }

    async function leaveTeam(memberId) {
      if (!confirm('Leave your team?')) return;
      const s = await VSSupabase.auth.getSession();
      const tok = s?.data?.session?.access_token;
      if (!tok) return;
      await fetch(TEAM_SB + '/rest/v1/team_members?user_id=eq.' + memberId, {
        method: 'DELETE',
        headers: { apikey: TEAM_KEY, Authorization: 'Bearer ' + tok }
      });
      loadTeamPanel(_currentMember);
    }

    async function disbandTeam(teamId, memberId) {
      if (!confirm('Disband the team? This cannot be undone.')) return;
      const s = await VSSupabase.auth.getSession();
      const tok = s?.data?.session?.access_token;
      if (!tok) return;
      await fetch(TEAM_SB + '/rest/v1/teams?id=eq.' + teamId, {
        method: 'DELETE',
        headers: { apikey: TEAM_KEY, Authorization: 'Bearer ' + tok }
      });
      loadTeamPanel(_currentMember);
    }

    // ── Phase 2: Load point events feed ──────────────────────────
    async function loadPointEvents() {
      const feed = document.getElementById('activity-feed');
      if (!feed) return;
      try {
        // Phase 38: use prefetched events from bootstrap RPC on first load
        let events;
        if (window._prefetchedEvents && window._prefetchedEvents.length > 0) {
          events = window._prefetchedEvents;
          window._prefetchedEvents = null; // consume once
        } else {
          const res = await VSSupabase
            .from('point_events')
            .select('label, points, created_at')
            .order('created_at', { ascending: false })
            .limit(8);
          events = res.data;
        }

        if (!events || events.length === 0) {
          feed.innerHTML = '<span class="activity-empty">No activity yet — explore the vault to earn points.</span>';
          return;
        }

        const icons = { subscribed: '📡', bio_set: '✍️', avatar_customized: '🎨', referral: '🤝',
                        game_visit: '🎮', lore_read: '📖', default: '⚡' };

        feed.innerHTML = events.map(ev => {
          const icon = Object.keys(icons).find(k => ev.label?.toLowerCase().includes(k.split('_')[0])) || 'default';
          const timeAgo = formatTimeAgo(new Date(ev.created_at));
          return `<div class="activity-item">
            <span class="activity-icon">${icons[icon] || icons.default}</span>
            <span class="activity-label">${escHtml(ev.label || 'Vault Points')}</span>
            <span class="activity-pts">+${ev.points}</span>
            <span class="activity-time">${timeAgo}</span>
          </div>`;
        }).join('');
      } catch (_) {
        feed.innerHTML = '<span class="activity-empty">Could not load activity.</span>';
      }
    }

    function formatTimeAgo(date) {
      const s = Math.floor((Date.now() - date) / 1000);
      if (s < 60) return 'just now';
      const m = Math.floor(s / 60);
      if (m < 60) return m + 'm ago';
      const h = Math.floor(m / 60);
      if (h < 24) return h + 'h ago';
      const d = Math.floor(h / 24);
      if (d < 30) return d + 'd ago';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ── Phase 3: Load / display personal invite code ─────────────
    async function loadInviteCode() {
      const valEl  = document.getElementById('invite-code-value');
      const copyEl = document.getElementById('invite-copy-btn');
      if (!valEl) return;
      try {
        const { data: code } = await VSSupabase.rpc('get_or_create_my_invite_code');
        if (code) {
          valEl.textContent = code;
          if (copyEl) copyEl.disabled = false;
        } else {
          valEl.textContent = 'Unavailable';
        }
      } catch (_) {
        if (valEl) valEl.textContent = 'Unavailable';
      }
    }

    async function copyInviteCode() {
      const code = document.getElementById('invite-code-value')?.textContent;
      const btn  = document.getElementById('invite-copy-btn');
      if (!code || code === 'Generating…' || code === 'Unavailable') return;
      try {
        await navigator.clipboard.writeText(code);
        if (btn) { btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); }
      } catch (_) {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        if (btn) { btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); }
      }
    }

    // ── Phase 50: Referral Milestones ─────────────────────────────
    let _milestonesLoaded = false;

    async function loadReferralMilestones() {
      if (_milestonesLoaded) return;
      _milestonesLoaded = true;

      const panel = document.getElementById('referral-milestones-panel');
      if (!panel) return;

      try {
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) return;

        const { data, error } = await VSSupabase.rpc('get_referral_milestones', { p_user_id: session.user.id });
        if (error || !data) return;

        const count = data.referral_count || 0;
        const milestones = data.milestones || [];
        if (!milestones.length) return;

        const nextLocked = milestones.find(function(m) { return count < m.threshold; });
        _claimCenterState.referralCount = count;
        _claimCenterState.referralClaimable = milestones.some(function(m) { return count >= m.threshold && !m.claimed; });
        _claimCenterState.nextReferralText = _claimCenterState.referralClaimable
          ? count + ' referrals · reward ready to claim'
          : nextLocked
            ? count + ' referrals · next reward at ' + nextLocked.threshold
            : count + ' referrals · all milestones reached';
        if (_currentMember) updateClaimCenter(_currentMember, { isSparked: !!_currentMember.is_sparked });

        panel.style.display = '';

        // Count badge
        const badge = document.getElementById('referral-count-badge');
        if (badge) badge.textContent = count + ' referral' + (count !== 1 ? 's' : '');

        // Progress bar
        const maxThreshold = milestones[milestones.length - 1].threshold;
        const pct = Math.min(100, (count / maxThreshold) * 100);
        const fill = document.getElementById('referral-progress-fill');
        if (fill) fill.style.width = pct + '%';

        // Milestone cards
        const list = document.getElementById('referral-milestones-list');
        if (!list) return;

        list.innerHTML = milestones.map(function(m) {
          const reached = count >= m.threshold;
          const claimed = m.claimed;
          const opacity = reached ? '1' : '0.45';
          const border = reached && !claimed ? 'rgba(255,196,0,0.3)' : 'rgba(255,255,255,0.08)';
          const bg = reached && !claimed ? 'rgba(255,196,0,0.04)' : 'rgba(255,255,255,0.02)';

          let actionHtml = '';
          if (claimed) {
            actionHtml = '<span class="milestone-claimed">&#10003; Claimed</span>';
          } else if (reached) {
            actionHtml = '<button type="button" onclick="claimMilestone(' + m.id + ',this)" class="button button-sm" style="font-size:0.78rem;padding:0.3rem 0.85rem;">Claim Reward</button>';
          } else {
            actionHtml = '<span class="milestone-needed">' + m.threshold + ' referrals needed</span>';
          }

          return '<div class="milestone-card" style="border:1px solid ' + border + ';background:' + bg + ';opacity:' + opacity + ';">' +
            '<div class="milestone-icon">' + (m.icon || '🏆') + '</div>' +
            '<div class="milestone-info">' +
              '<div class="milestone-label">' + m.label + '</div>' +
              '<div class="milestone-desc">' + m.description + '</div>' +
            '</div>' +
            '<div class="milestone-action">' + actionHtml + '</div>' +
          '</div>';
        }).join('');

      } catch (err) {
        console.warn('[milestones]', err);
      }
    }

    async function claimMilestone(milestoneId, btn) {
      if (btn) { btn.disabled = true; btn.textContent = 'Claiming…'; }
      try {
        const { data, error } = await VSSupabase.rpc('claim_referral_milestone', { p_milestone_id: milestoneId });
        if (error) throw error;
        if (data && data.ok) {
          if (btn) {
            btn.outerHTML = '<span class="milestone-claimed">&#10003; Claimed!</span>';
          }
          if (typeof showToast === 'function') showToast('Milestone reward claimed!', { icon: '🏆' });
        } else {
          if (btn) { btn.disabled = false; btn.textContent = 'Claim Reward'; }
          if (typeof showToast === 'function') showToast(data?.error || 'Could not claim', { icon: '⚠️' });
        }
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Claim Reward'; }
        console.warn('[milestone-claim]', err);
      }
    }

    // ── Phase 6: Activity Chronicle ──────────────────────────────
    let _chronicleLoaded = false;

    const CHRONICLE_ICONS = {
      challenge:  { icon: '⚡', bg: 'rgba(255,196,0,0.12)',   color: '#fbbf24' },
      file:       { icon: '📄', bg: 'rgba(31,162,255,0.1)',   color: '#7dd3fc' },
      game:       { icon: '🎮', bg: 'rgba(52,211,153,0.1)',   color: '#34d399' },
      subscribed: { icon: '📡', bg: 'rgba(167,139,250,0.1)',  color: '#a78bfa' },
      profile:    { icon: '🔧', bg: 'rgba(255,255,255,0.06)', color: 'var(--muted)' },
      referral:   { icon: '🤝', bg: 'rgba(255,196,0,0.1)',    color: '#fbbf24' },
      joined:     { icon: '🔑', bg: 'rgba(255,196,0,0.14)',   color: 'var(--gold)' },
      points:     { icon: '✦',  bg: 'rgba(255,255,255,0.05)', color: 'var(--dim)' },
    };

    async function loadChronicle() {
      const el = document.getElementById('chronicle-timeline');
      if (!el) return;
      el.innerHTML = '<div class="pulse-empty">Loading…</div>';
      loadLoginHeatmap(); // non-blocking
      try {
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) return;

        const [{ data: events, error }, { data: row }] = await Promise.all([
          VSSupabase.rpc('get_activity_timeline', { p_limit: 50 }),
          VSSupabase.from('vault_members').select('created_at').eq('id', session.user.id).single(),
        ]);

        if (error) throw error;

        const items = [...(events || [])];
        if (row?.created_at) {
          items.push({ type: 'joined', label: 'Joined the Vault', points: 0, occurred_at: row.created_at });
        }

        if (items.length === 0) {
          el.innerHTML = '<div class="pulse-empty">No activity yet — start earning points to build your Chronicle.</div>';
          return;
        }

        const today     = new Date();
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

        let html = '<div class="chronicle-timeline">';
        let lastDay = null;

        for (const ev of items) {
          const d      = new Date(ev.occurred_at);
          const dayKey = d.toDateString();

          if (dayKey !== lastDay) {
            let dayLabel;
            if (dayKey === today.toDateString())     dayLabel = 'Today';
            else if (dayKey === yesterday.toDateString()) dayLabel = 'Yesterday';
            else dayLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            html += `<div class="chronicle-day-header">${dayLabel}</div>`;
            lastDay = dayKey;
          }

          const style   = CHRONICLE_ICONS[ev.type] || CHRONICLE_ICONS.points;
          const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const ptsHtml = ev.points > 0 ? `<div class="chronicle-pts">+${ev.points} pts</div>` : '';

          html += `<div class="chronicle-item">
            <div class="chronicle-icon" style="background:${style.bg};color:${style.color};">${style.icon}</div>
            <div class="chronicle-body">
              <div class="chronicle-label">${ev.label || ev.type}</div>
              <div class="chronicle-time">${timeStr}</div>
            </div>
            ${ptsHtml}
          </div>`;
        }

        html += '</div>';
        el.innerHTML = html;
      } catch (_) {
        if (el) el.innerHTML = '<div class="pulse-empty">Could not load activity chronicle.</div>';
      }
    }

    // ── Phase 24: QR Code for referral link ──────────────────────
    function showReferralQR() {
      const link = document.getElementById('referralLink')?.textContent?.trim();
      if (!link) return;
      const overlay = document.getElementById('qr-modal-overlay');
      const wrap    = document.getElementById('qr-canvas-wrap');
      if (!overlay || !wrap) return;
      wrap.innerHTML = '';
      _lastFocus = document.activeElement;
      overlay.classList.add('show');
      setTimeout(() => _trapFocus(document.querySelector('.qr-modal')), 50);
      // Use QRCode library (loaded via CDN with defer)
      if (typeof QRCode !== 'undefined') {
        const canvas = document.createElement('canvas');
        wrap.appendChild(canvas);
        QRCode.toCanvas(canvas, link, {
          width: 200, margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        }, () => {});
      } else {
        // Fallback: show link in text if library not loaded
        wrap.innerHTML = '<p class="qr-fallback">' + link + '</p>';
      }
    }

    function dismissQRModal() {
      document.getElementById('qr-modal-overlay')?.classList.remove('show');
      _releaseFocus(document.querySelector('.qr-modal'));
    }

    // ── Phase 24: Login heatmap (12-week activity calendar) ───────
    async function loadLoginHeatmap() {
      const el = document.getElementById('login-heatmap');
      if (!el) return;
      try {
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) return;

        // Fetch point_events (login + other activity) for last 84 days
        const since = new Date(Date.now() - 84 * 86400000).toISOString();
        const { data: events } = await VSSupabase
          .from('point_events')
          .select('occurred_at')
          .eq('user_id', session.user.id)
          .gte('occurred_at', since)
          .order('occurred_at', { ascending: true });

        // Build day bucket map: 'YYYY-MM-DD' → count
        const dayMap = {};
        (events || []).forEach(ev => {
          const key = ev.occurred_at.slice(0, 10);
          dayMap[key] = (dayMap[key] || 0) + 1;
        });

        // Build 12 weeks (84 days) grid, 7 rows × 12 cols
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cells = []; // array of 84 day objects from oldest to newest
        for (let i = 83; i >= 0; i--) {
          const d = new Date(today - i * 86400000);
          const key = d.toISOString().slice(0, 10);
          const count = dayMap[key] || 0;
          let heat = 0;
          if (count >= 1) heat = 1;
          if (count >= 3) heat = 2;
          if (count >= 6) heat = 3;
          if (count >= 10) heat = 4;
          cells.push({ key, heat, count, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
        }

        // Render: 12 columns of 7 cells each
        let html = '';
        for (let col = 0; col < 12; col++) {
          html += '<div class="heatmap-col">';
          for (let row = 0; row < 7; row++) {
            const idx = col * 7 + row;
            const c = cells[idx];
            const cls = c.heat > 0 ? ` heat-${c.heat}` : '';
            const label = c.count > 0 ? `${c.label}: ${c.count} event${c.count === 1 ? '' : 's'}` : c.label;
            html += `<div class="heatmap-cell${cls}" title="${label}"></div>`;
          }
          html += '</div>';
        }
        el.innerHTML = html;
      } catch (_) {
        if (el) el.innerHTML = '<span class="heatmap-fallback">Heatmap unavailable.</span>';
      }
    }

    // ── Phase 24: Annual vault anniversary check ──────────────────
    async function checkVaultAnniversary(member) {
      try {
        if (!member?.createdAt) return;
        const joined = new Date(member.createdAt);
        const now    = new Date();
        const years  = now.getFullYear() - joined.getFullYear();
        if (years <= 0) return; // not a year yet
        const anniv = new Date(joined);
        anniv.setFullYear(now.getFullYear());
        const daysDiff = Math.abs(now - anniv) / 86400000;
        if (daysDiff > 1) return; // not within 1 day of anniversary

        // Check we haven't already awarded this year
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) return;
        const yearKey = now.getFullYear();
        const alreadyKey = `vs_anniversary_awarded_${yearKey}`;
        if (localStorage.getItem(alreadyKey)) return;

        // Check point_events for this year's anniversary
        const startOfYear = `${yearKey}-01-01T00:00:00Z`;
        const { data: existing } = await VSSupabase
          .from('point_events')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('reason', 'anniversary')
          .gte('occurred_at', startOfYear)
          .limit(1);

        if (existing && existing.length > 0) {
          localStorage.setItem(alreadyKey, '1');
          return;
        }

        // Award anniversary bonus
        const bonus = years * 50; // 50 pts per year
        await VSSupabase.rpc('award_points', {
          p_user_id: session.user.id,
          p_amount: bonus,
          p_reason: 'anniversary',
          p_source: 'vault_member',
        });
        localStorage.setItem(alreadyKey, '1');

        // Show celebration toast
        showXPChip(`🎂 Vault Anniversary! Year ${years} — +${bonus} pts`);
        setTimeout(() => {
          if (typeof showToast === 'function') {
            showToast(`Happy ${years}-year Vault anniversary! You've earned ${bonus} bonus points.`, 'success', 5000);
          }
        }, 800);
      } catch (_) {}
    }

    // ── Phase 24: Weekly XP recap (shown Mondays) ─────────────────
    async function checkWeeklyRecap(member) {
      try {
        const today = new Date();
        if (today.getDay() !== 1) return; // Monday only

        // ISO week key: YYYY-WW
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((today - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
        const weekKey = `vs_weekly_recap_${today.getFullYear()}_${weekNum}`;
        if (localStorage.getItem(weekKey)) return;

        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) return;

        // Fetch last week's points
        const lastMonday = new Date(today - 7 * 86400000);
        lastMonday.setHours(0, 0, 0, 0);
        const lastSunday = new Date(today);
        lastSunday.setHours(0, 0, 0, 0);

        const { data: events } = await VSSupabase
          .from('point_events')
          .select('amount')
          .eq('user_id', session.user.id)
          .gte('occurred_at', lastMonday.toISOString())
          .lt('occurred_at', lastSunday.toISOString());

        const weekPts = (events || []).reduce((s, e) => s + (e.amount || 0), 0);
        if (weekPts === 0) return;

        const rank = VS.getRank(member.points);
        const nextRank = VS.getNextRank(member.points);
        const ptsToNext = nextRank ? (nextRank.min - member.points) : 0;

        localStorage.setItem(weekKey, '1');

        const banner  = document.getElementById('weekly-recap-banner');
        const textEl  = document.getElementById('weekly-recap-text');
        if (!banner || !textEl) return;

        const ptsLine = ptsToNext > 0
          ? ` You're <strong>${ptsToNext} pts</strong> away from <strong>${nextRank.name}</strong>.`
          : ' You\'ve reached maximum rank!';

        textEl.innerHTML =
          `📊 <strong>Last week you earned ${weekPts.toLocaleString()} Vault Points.</strong>${ptsLine} Keep the streak going this week.`;
        banner.classList.add('show');
      } catch (_) {}
    }

    function dismissWeeklyRecap() {
      document.getElementById('weekly-recap-banner')?.classList.remove('show');
    }

    // ── Point gifting ─────────────────────────────────────────────
    async function giftPoints() {
      if (!_currentMember) return;
      const recipient = (document.getElementById('gift-username')?.value || '').trim().toLowerCase();
      const amount    = parseInt(document.getElementById('gift-amount')?.value || '0', 10);
      const fb        = document.getElementById('gift-feedback');
      if (!fb) return;

      if (!recipient) { fb.style.color = '#f87171'; fb.textContent = 'Enter a recipient username.'; return; }
      if (isNaN(amount) || amount < 10 || amount > 500) { fb.style.color = '#f87171'; fb.textContent = 'Amount must be 10–500 pts.'; return; }
      if (_currentMember.points < amount) { fb.style.color = '#f87171'; fb.textContent = 'Not enough Vault Points.'; return; }
      if (recipient === (_currentMember.username || '').toLowerCase()) { fb.style.color = '#f87171'; fb.textContent = 'You cannot gift to yourself.'; return; }

      fb.style.color = 'var(--dim)'; fb.textContent = 'Sending…';

      try {
        // Look up recipient
        const { data: recip, error: lookupErr } = await VSSupabase
          .from('vault_members').select('id, username, points').eq('username', recipient).single();
        if (lookupErr || !recip) { fb.style.color = '#f87171'; fb.textContent = 'Member not found.'; return; }

        // Deduct from sender
        const { error: deductErr } = await VSSupabase
          .from('vault_members').update({ points: _currentMember.points - amount })
          .eq('id', _currentMember._id);
        if (deductErr) throw deductErr;

        // Add to recipient
        const { error: addErr } = await VSSupabase
          .from('vault_members').update({ points: recip.points + amount })
          .eq('id', recip.id);
        if (addErr) throw addErr;

        // Log for both
        await VSSupabase.from('point_events').insert([
          { member_id: _currentMember._id, points: -amount, reason: 'gift_sent', description: 'Gift to ' + escHtml(recip.username) },
          { member_id: recip.id,           points:  amount, reason: 'gift_received', description: 'Gift from ' + escHtml(_currentMember.username || 'member') }
        ]);

        _currentMember.points -= amount;
        document.getElementById('stat-points').textContent = _currentMember.points.toLocaleString();
        document.getElementById('gift-username').value = '';
        document.getElementById('gift-amount').value   = '';
        fb.style.color = '#10B981'; fb.textContent = '⚡ Gift sent to ' + escHtml(recip.username) + '!';
        setTimeout(function(){ if(fb) fb.textContent = ''; }, 3000);
      } catch(err) {
        fb.style.color = '#f87171'; fb.textContent = 'Error: ' + (err.message || 'Could not send gift.');
      }
    }

    // ── Phase 44: Gift VaultSparked Checkout ─────────────────────
    async function startGiftSubCheckout() {
      const recipientInput = document.getElementById('gift-sub-username');
      const btn            = document.getElementById('gift-sub-btn');
      const fb             = document.getElementById('gift-sub-feedback');
      const username       = (recipientInput?.value || '').trim();
      if (!fb) return;
      fb.textContent = '';
      if (!username) { fb.style.color = '#f87171'; fb.textContent = 'Enter a recipient username.'; return; }
      if (username.toLowerCase() === (_currentMember.username || '').toLowerCase()) {
        fb.style.color = '#f87171'; fb.textContent = 'You cannot gift to yourself.'; return;
      }
      if (btn) { btn.textContent = 'Validating…'; btn.disabled = true; }
      try {
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) { showAuth(); return; }
        const { data, error } = await VSSupabase.functions.invoke('create-gift-checkout', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { recipient_username: username },
        });
        if (error || !data?.url) {
          const msg = data?.error || error?.message || 'Gift checkout unavailable.';
          fb.style.color = '#f87171'; fb.textContent = msg;
          if (btn) { btn.textContent = 'Gift VaultSparked — $24.99 →'; btn.disabled = false; }
          return;
        }
        window.location.href = data.url;
      } catch (err) {
        fb.style.color = '#f87171'; fb.textContent = 'Error: ' + (err.message || 'Could not start gift.');
        if (btn) { btn.textContent = 'Gift VaultSparked — $24.99 →'; btn.disabled = false; }
        if (window.Sentry) Sentry.captureException(err);
      }
    }
    window.startGiftSubCheckout = startGiftSubCheckout;
    window.claimMilestone = claimMilestone;

    // ── Phase 25: Member Spotlight ────────────────────────────────
    async function loadMemberSpotlight() {
      const el = document.getElementById('spotlight-content');
      if (!el) return;
      try {
        // Pick a random top-50 member that isn't the current user
        const { data: members } = await VSSupabase
          .from('vault_members')
          .select('username, points, member_number, avatar_id, accent')
          .order('points', { ascending: false })
          .limit(50);

        if (!members || members.length === 0) { el.textContent = 'No members yet.'; return; }

        // Pick random, exclude current member
        const pool = members.filter(m => m.username !== (_currentMember?.username || ''));
        if (pool.length === 0) { el.textContent = 'You\'re the top member!'; return; }
        const featured = pool[Math.floor(Math.random() * Math.min(pool.length, 20))];

        const rank = VS.getRank(featured.points);
        const av   = VS.getAvatar(featured.avatar_id || 'spark');
        const accent = featured.accent || '#FFC400';

        el.innerHTML = `
          <a href="/member/?u=${encodeURIComponent(featured.username)}" class="spotlight-link">
            <div class="spotlight-avatar" style="background:${av.bg};border:2px solid ${accent}44;">${av.emoji}</div>
            <div>
              <div class="spotlight-name">${escHtml(featured.username)}</div>
              <div class="spotlight-meta">${rank.name} &nbsp;·&nbsp; ${featured.points.toLocaleString()} pts</div>
            </div>
            <div class="spotlight-arrow">View →</div>
          </a>`;
      } catch (_) {
        if (el) el.textContent = 'Spotlight unavailable.';
      }
    }

    // ── Phase 25: Rank Comparison (who's just above you) ──────────
    async function loadRankComparison(member) {
      const el = document.getElementById('rank-compare-content');
      if (!el) return;
      try {
        const { data: above } = await VSSupabase
          .from('vault_members')
          .select('username, points')
          .gt('points', member.points)
          .order('points', { ascending: true })
          .limit(1);

        if (!above || above.length === 0) {
          el.innerHTML = '<span class="rank-compare-top">You\'re at the top of the leaderboard!</span>';
          return;
        }

        const rival = above[0];
        const diff  = rival.points - member.points;
        el.innerHTML = `
          <div class="rank-compare-text">
            You are <strong class="rank-compare-pts">${diff.toLocaleString()} pts</strong> behind
            <a href="/member/?u=${encodeURIComponent(rival.username)}"
               class="rank-compare-user">${escHtml(rival.username)}</a>
            on the leaderboard.
          </div>
          <div class="rank-compare-bar-wrap">
            <div class="rank-compare-track">
              <div class="rank-compare-fill" style="width:${Math.round((member.points / rival.points) * 100)}%;"></div>
            </div>
            <div class="rank-compare-legend">
              <span>You · ${member.points.toLocaleString()} pts</span>
              <span>${escHtml(rival.username)} · ${rival.points.toLocaleString()} pts</span>
            </div>
          </div>`;
      } catch (_) {
        if (el) el.textContent = 'Comparison unavailable.';
      }
    }

    // ── Phase 14: What's New modal — S66 enhanced ────────────────
    // S66 hardcoded fallback changelog items
    const _WN_FALLBACK = [
      { type: 'update',    message: 'Scroll depth analytics — now tracking how far you explore key pages' },
      { type: 'milestone', message: 'Achievement Share Cards — earn a badge? Share it from the Vault' },
      { type: 'info',      message: "What's New modal — you're reading it right now ⚡" },
      { type: 'update',    message: 'Resource hints — pages load faster with DNS prefetch for all third-party domains' },
    ];

    async function checkWhatsNew() {
      // Skip if this portal version has already been acknowledged
      if (localStorage.getItem('vs_portal_last_seen') === PORTAL_VERSION) return;

      try {
        const { data: pulses } = await VSSupabase
          .from('studio_pulse')
          .select('id,message,type,created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (!pulses || pulses.length === 0) {
          // No Supabase data — show fallback if not seen
          _showWhatsNewBellBadge();
          showWhatsNewModal(_WN_FALLBACK, null);
          return;
        }

        const lastSeenDate = localStorage.getItem('vs_portal_last_seen_date') || '1970-01-01';
        const unseen = pulses.filter(p => p.created_at > lastSeenDate);

        if (unseen.length === 0) {
          // All seen — mark version so we skip next time too
          localStorage.setItem('vs_portal_last_seen', PORTAL_VERSION);
          return;
        }

        _showWhatsNewBellBadge();
        showWhatsNewModal(unseen, pulses[0].created_at);
      } catch (_) {
        // Network/Supabase failure — show fallback changelog
        if (localStorage.getItem('vs_portal_last_seen') !== PORTAL_VERSION) {
          _showWhatsNewBellBadge();
          showWhatsNewModal(_WN_FALLBACK, null);
        }
      }
    }

    function _showWhatsNewBellBadge() {
      const badge = document.getElementById('whats-new-bell-badge');
      if (badge) badge.classList.add('visible');
    }

    function _hideWhatsNewBellBadge() {
      const badge = document.getElementById('whats-new-bell-badge');
      if (badge) badge.classList.remove('visible');
    }

    function showWhatsNewModal(items, latestTs) {
      if (document.getElementById('whats-new-modal')) return;
      const modal = document.createElement('div');
      modal.id = 'whats-new-modal';
      modal.className = 'whats-new-overlay';
      const typeEmoji = { info:'ℹ️', update:'🔔', lore:'📁', alert:'⚡', milestone:'🏆' };
      const safeTs = latestTs ? latestTs.replace(/'/g, '') : null;
      const displayItems = items.slice(0, 5);
      const itemsHtml = displayItems.map(p =>
        '<div class="whats-new-item">'
        + '<span class="whats-new-item-icon">' + (typeEmoji[p.type] || '⚡') + '</span>'
        + '<div class="whats-new-item-text">' + p.message + '</div>'
        + '</div>'
      ).join('');

      modal.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="whats-new-title" class="whats-new-dialog">'
        + '<div class="whats-new-header">'
        + '<h3 id="whats-new-title" class="whats-new-title">What\'s New in the Vault</h3>'
        + '<span class="whats-new-badge">'
        + displayItems.length + ' update' + (displayItems.length > 1 ? 's' : '') + '</span>'
        + '</div>'
        + '<div class="whats-new-body">' + itemsHtml + '</div>'
        + '<button id="whats-new-close-btn" class="whats-new-close-btn">Got it — I\'m up to speed</button>'
        + '<div class="whats-new-version">Portal ' + PORTAL_VERSION + '</div>'
        + '</div>';

      const _wnPrev = document.activeElement;
      document.body.appendChild(modal);
      _trapFocus(modal);
      const closeBtn = document.getElementById('whats-new-close-btn');
      if (closeBtn) closeBtn.focus();

      const closeModal = () => {
        modal.remove();
        _hideWhatsNewBellBadge();
        try { _wnPrev?.focus(); } catch(_) {}
        // Persist: mark version seen and record the latest pulse timestamp
        localStorage.setItem('vs_portal_last_seen', PORTAL_VERSION);
        if (safeTs) localStorage.setItem('vs_portal_last_seen_date', safeTs);
        // Also update legacy key for backward compat
        if (safeTs) localStorage.setItem('vs_last_pulse_seen_ts', safeTs);
      };

      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
      modal.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeModal(); } });
    }

    // ── Phase 14: Points breakdown modal ─────────────────────────
    async function showPtsBreakdown() {
      if (document.getElementById('pts-breakdown-modal')) return;
      try {
        const { data: events } = await VSSupabase
          .from('point_events')
          .select('reason,points')
          .order('created_at', { ascending: false })
          .limit(300);
        if (!events || events.length === 0) return;
        const cats = {};
        events.forEach(e => {
          const cat = (e.reason || 'other').replace(/_\d+$/, '').replace(/_/g, ' ');
          cats[cat] = (cats[cat] || 0) + (e.points || 0);
        });
        const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 7);
        const total = sorted.reduce((s, c) => s + c[1], 0);
        const rows = sorted.map(([cat, pts]) => {
          const pct = total > 0 ? Math.round(pts / total * 100) : 0;
          return '<div class="pts-breakdown-row">'
            + '<div class="pts-breakdown-labels">'
            + '<span class="pts-breakdown-cat">' + cat + '</span>'
            + '<span class="pts-breakdown-val">' + pts + ' pts</span>'
            + '</div>'
            + '<div class="pts-bar-track">'
            + '<div class="pts-bar-fill" style="width:' + pct + '%;"></div>'
            + '</div></div>';
        }).join('');
        const modal = document.createElement('div');
        modal.id = 'pts-breakdown-modal';
        modal.className = 'pts-breakdown-overlay';
        modal.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="pts-breakdown-title" class="pts-breakdown-dialog">'
          + '<div class="pts-breakdown-header">'
          + '<h3 id="pts-breakdown-title" class="pts-breakdown-title">Points Breakdown</h3>'
          + '<button id="pts-breakdown-close" class="pts-breakdown-close" aria-label="Close">&times;</button>'
          + '</div>'
          + '<div class="pts-breakdown-total">Total earned: ' + total + ' pts</div>'
          + rows + '</div>';
        document.body.appendChild(modal);
        const _pbPrev = document.activeElement;
        document.getElementById('pts-breakdown-close')?.focus();
        const closeBreakdown = () => { modal.remove(); try { _pbPrev?.focus(); } catch(_) {} };
        document.getElementById('pts-breakdown-close').addEventListener('click', closeBreakdown);
        modal.addEventListener('click', e => { if (e.target === modal) closeBreakdown(); });
        modal.addEventListener('keydown', e => { if (e.key === 'Escape') closeBreakdown(); });
      } catch (_) {}
    }

    // ── Phase 14: Challenge complete modal ───────────────────────
    function showChallengeCompleteModal(pts, title) {
      const existing = document.getElementById('challenge-complete-modal');
      if (existing) existing.remove();
      const currentPts = parseInt(document.getElementById('stat-pts').textContent, 10) || 0;
      const newPts = currentPts + pts;
      const rank = VS.getRank(newPts);
      const nextRank = VS.getNextRank(newPts);
      const prog = VS.getRankProgress(newPts);
      const progressHtml = nextRank
        ? '<div class="challenge-modal-prog">'
          + '<div class="challenge-modal-prog-labels">'
          + '<span>' + rank.name + '</span><span>' + (nextRank.min - newPts) + ' pts to ' + nextRank.name + '</span>'
          + '</div>'
          + '<div class="pts-bar-track">'
          + '<div class="pts-bar-fill" style="width:' + prog + '%;transition:width 0.6s ease;"></div>'
          + '</div></div>'
        : '';
      const modal = document.createElement('div');
      modal.id = 'challenge-complete-modal';
      modal.className = 'challenge-modal';
      modal.innerHTML = '<div class="challenge-modal-top">'
        + '<div>'
        + '<div class="challenge-modal-label">Challenge Complete ⚡</div>'
        + '<div class="challenge-modal-name">' + title + '</div>'
        + '</div>'
        + '<button onclick="document.getElementById(\'challenge-complete-modal\').remove()" class="challenge-modal-close" aria-label="Close">&times;</button>'
        + '</div>'
        + '<div class="challenge-modal-pts">+' + pts + ' pts</div>'
        + '<div class="challenge-modal-total">Total: ' + newPts + ' pts · ' + rank.name + '</div>'
        + progressHtml;
      document.body.appendChild(modal);
      setTimeout(() => { const m = document.getElementById('challenge-complete-modal'); if (m) m.remove(); }, 6000);
    }

    // ── Points summary: totals + top sources ─────────────────────
    let _pointsSummaryLoaded = false;
    async function renderPointsSummary() {
      if (_pointsSummaryLoaded) return;
      _pointsSummaryLoaded = true;

      // All-time total
      const { data: allRows } = await VSSupabase
        .from('point_events')
        .select('points,created_at,label,reason')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!allRows || allRows.length === 0) return;

      const alltime = allRows.reduce((s, r) => s + (r.points || 0), 0);

      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recent = allRows.filter(r => new Date(r.created_at) >= cutoff);
      const total30 = recent.reduce((s, r) => s + (r.points || 0), 0);

      // Active days (days with at least one event) in last 30
      const activeDays = new Set(recent.map(r => new Date(r.created_at).toDateString())).size;

      const atEl = document.getElementById('pts-total-alltime');
      const t30El = document.getElementById('pts-total-30d');
      const adEl = document.getElementById('pts-active-days');
      if (atEl) atEl.textContent = alltime.toLocaleString();
      if (t30El) t30El.textContent = (total30 > 0 ? '+' : '') + total30.toLocaleString();
      if (adEl) adEl.textContent = activeDays;

      // Top sources: group by label, sum points, top 5
      const sourceMap = {};
      allRows.forEach(r => {
        const key = r.label || r.reason || 'Other';
        sourceMap[key] = (sourceMap[key] || 0) + (r.points || 0);
      });
      const top = Object.entries(sourceMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (top.length === 0) return;
      const maxPts = top[0][1];
      const listEl = document.getElementById('points-sources-list');
      const wrap = document.getElementById('points-top-sources');
      if (!listEl || !wrap) return;

      listEl.innerHTML = top.map(([label, pts]) => {
        const pct = Math.max(4, Math.round(pts / maxPts * 100));
        return `<div class="pts-source-row">
          <div class="pts-source-labels">
            <span class="pts-source-name">${escHtml(label)}</span>
            <span class="pts-source-val">${pts.toLocaleString()} pts</span>
          </div>
          <div class="pts-source-track">
            <div class="pts-source-fill" style="width:${pct}%;"></div>
          </div>
        </div>`;
      }).join('');
      wrap.style.display = '';
    }

    // ── Phase 14: Points history SVG chart ───────────────────────
    async function renderPointsHistoryChart() {
      const el = document.getElementById('points-chart-svg');
      if (!el) return;
      try {
        const { data: events } = await VSSupabase
          .from('point_events')
          .select('points,created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true });

        if (!events || events.length === 0) {
          el.textContent = 'No activity in the last 30 days.';
          return;
        }

        // Build a map of day → total points
        const dayMap = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          dayMap[d.toDateString()] = 0;
        }
        events.forEach(e => {
          const key = new Date(e.created_at).toDateString();
          if (key in dayMap) dayMap[key] += (e.points || 0);
        });

        const days = Object.entries(dayMap);
        const maxPts = Math.max(...days.map(d => d[1]), 1);
        const W = 600, H = 80, barGap = 2;
        const barW = Math.floor((W - barGap * (days.length - 1)) / days.length);
        const bars = days.map(([day, pts], i) => {
          const barH = pts > 0 ? Math.max(3, Math.round(pts / maxPts * H)) : 2;
          const x = i * (barW + barGap);
          const y = H - barH;
          const opacity = pts > 0 ? '1' : '0.25';
          return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="2" fill="var(--gold)" opacity="${opacity}"><title>${new Date(day).toLocaleDateString('en-US',{month:'short',day:'numeric'})}: ${pts} pts</title></rect>`;
        }).join('');

        el.innerHTML = `<svg viewBox="0 0 ${W} ${H + 20}" style="width:100%;height:auto;display:block;" role="img" aria-label="Points earned over last 30 days">${bars}<text x="0" y="${H + 16}" font-size="10" fill="var(--dim)">${new Date(days[0][0]).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</text><text x="${W}" y="${H + 16}" text-anchor="end" font-size="10" fill="var(--dim)">Today</text></svg>`;
      } catch (_) {
        el.textContent = 'Could not load chart.';
      }
    }

    // ── Studio Access panel — games & tools per tier ─────────────
    function loadStudioAccessPanel(planKey, rankName) {
      const el = document.getElementById('studio-access-content');
      if (!el) return;

      const isSparked = planKey === 'vault_sparked' || planKey === 'vault_sparked_pro';
      const isPro     = planKey === 'vault_sparked_pro';

      const ITEMS = [
        { name: 'VaultSpark Football GM', url: '/games/vaultspark-football-gm/', tier: 'free',    desc: 'Browser sports sim — free for all Vault Members' },
        { name: 'Call of Doodie',          url: '/games/call-of-doodie/',          tier: 'sparked', desc: 'Chaos shooter — VaultSparked & above' },
        { name: 'Gridiron GM',             url: '/games/gridiron-gm/',             tier: 'sparked', desc: 'Football management — VaultSparked & above' },
        { name: 'VaultFront',              url: '/games/vaultfront/',              tier: 'eternal', desc: 'Coming soon — Eternal members get first access' },
      ];

      const TIER_COLOR  = { free: '#94a3b8', sparked: '#FFC400', eternal: '#c084fc' };
      const TIER_RGB    = { free: '148,163,184', sparked: '255,196,0', eternal: '192,132,252' };
      const TIER_LABEL  = { free: 'Free', sparked: 'VaultSparked', eternal: 'Eternal' };

      function unlocked(tier) {
        return tier === 'free' || (tier === 'sparked' && isSparked) || (tier === 'eternal' && isPro);
      }

      el.innerHTML = ITEMS.map(function(g) {
        const open  = unlocked(g.tier);
        const color = TIER_COLOR[g.tier];
        const rgb   = TIER_RGB[g.tier];
        const label = TIER_LABEL[g.tier];
        const nameHtml = open
          ? '<a href="' + g.url + '" style="color:inherit;text-decoration:none;font-weight:700;">' + g.name + '</a>'
          : '<span style="font-weight:700;">' + g.name + '</span>';
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0.85rem;border-radius:12px;margin-bottom:0.5rem;'
          + 'background:rgba(255,255,255,' + (open ? '0.04' : '0.015') + ');'
          + 'border:1px solid rgba(255,255,255,' + (open ? '0.08' : '0.04') + ');'
          + 'opacity:' + (open ? '1' : '0.5') + ';">'
          + '<span style="font-size:1.05rem;">' + (open ? '🔓' : '🔒') + '</span>'
          + '<div style="flex:1;min-width:0;">'
          + '<div style="font-size:0.87rem;color:' + (open ? 'var(--text)' : 'var(--dim)') + ';">' + nameHtml + '</div>'
          + '<div style="font-size:0.75rem;color:var(--dim);margin-top:0.1rem;">' + g.desc + '</div>'
          + '</div>'
          + '<span style="font-size:0.66rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;'
          + 'color:' + color + ';background:rgba(' + rgb + ',0.08);'
          + 'border:1px solid rgba(' + rgb + ',0.2);border-radius:999px;padding:0.2rem 0.55rem;white-space:nowrap;">'
          + label + '</span>'
          + '</div>';
      }).join('');

      // Rank loyalty discount chip
      const RANK_DISCOUNT = { 'Forge Master': 25, 'The Sparked': 50 };
      const discount = rankName ? RANK_DISCOUNT[rankName] : null;
      if (discount) {
        const discountRgb = discount === 50 ? '255,196,0' : '248,113,113';
        const discountColor = discount === 50 ? '#FFC400' : '#f87171';
        el.innerHTML += '<div style="display:flex;align-items:center;gap:0.65rem;margin-top:0.75rem;'
          + 'padding:0.7rem 0.9rem;border-radius:12px;'
          + 'background:rgba(' + discountRgb + ',0.04);border:1px solid rgba(' + discountRgb + ',0.15);">'
          + '<span style="font-size:1rem;">⚡</span>'
          + '<div style="flex:1;font-size:0.8rem;color:var(--muted);">'
          + '<strong style="color:' + discountColor + ';">' + discount + '% rank loyalty discount</strong> on VaultSparked — applied automatically at checkout.'
          + ' Your <strong>' + rankName + '</strong> rank earned this.'
          + '</div>'
          + '</div>';
      } else if (!isSparked) {
        el.innerHTML += '<div style="margin-top:0.75rem;padding:0.8rem 1rem;border-radius:12px;'
          + 'background:rgba(255,196,0,0.03);border:1px solid rgba(255,196,0,0.1);'
          + 'font-size:0.8rem;color:var(--muted);">'
          + 'Upgrade to <a href="/vaultsparked/" style="color:var(--gold);font-weight:700;">VaultSparked</a> to unlock more games.</div>';
      }
    }
