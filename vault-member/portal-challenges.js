    // ── Phase 4: Classified Archive ──────────────────────────────
    let _archiveLoaded = false;

    const RANK_NAMES = ['Spark Initiate', 'Vault Runner', 'Rift Scout', 'Vault Guard', 'Vault Breacher', 'Void Operative', 'Vault Keeper', 'Forge Master', 'The Sparked'];

    async function loadClassifiedArchive() {
      const list = document.getElementById('archive-file-list');
      const badge = document.getElementById('archive-access-badge');
      if (!list) return;

      try {
        const { data: files, error } = await VSSupabase.rpc('get_classified_files');
        if (error || !files) {
          list.innerHTML = '<div style="color:var(--dim);font-size:0.88rem;">Could not load files.</div>';
          return;
        }

        // Determine user's rank index from unlocked files
        const maxUnlocked = files.filter(f => !f.locked).reduce((m, f) => Math.max(m, f.rank_required), 0);
        const hasSparkedOnly = files.some(f => f.required_plan === 'vault_sparked');
        if (badge) {
          const rankLabel = RANK_NAMES[maxUnlocked] || 'Spark Initiate';
          badge.textContent = '🔓 Access: ' + rankLabel + '+' + (hasSparkedOnly ? ' · Sparked files live' : '');
        }

        // Build list of already-read slugs from point_events
        const { data: readEvents } = await VSSupabase
          .from('point_events')
          .select('reason')
          .like('reason', 'file_read_%');
        const readSlugs = new Set((readEvents || []).map(e => e.reason.replace('file_read_', '')));

        if (files.length === 0) {
          list.innerHTML = '<div style="color:var(--dim);font-size:0.88rem;">No files available yet.</div>';
          return;
        }

        const unlocked = files.filter(f => !f.locked);
        const readCount = unlocked.filter(f => readSlugs.has(f.slug)).length;
        const totalUnlocked = unlocked.length;

        // Update reading progress bar
        const progressWrap = document.getElementById('archive-progress-bar-wrap');
        const progressFill = document.getElementById('archive-progress-fill');
        const progressLabel = document.getElementById('archive-progress-label');
        if (progressWrap && totalUnlocked > 0) {
          progressWrap.style.display = '';
          const pct = Math.round((readCount / totalUnlocked) * 100);
          if (progressFill) progressFill.style.width = pct + '%';
          if (progressLabel) progressLabel.textContent = readCount + ' of ' + totalUnlocked + ' files read (' + pct + '%)';
        }

        // Store for search/bookmark filtering
        window._archiveFiles = files;
        window._archiveReadSlugs = readSlugs;

        renderArchiveFiles();

        // Wire up search
        const searchInput = document.getElementById('archive-search');
        if (searchInput) {
          let searchTimer;
          searchInput.addEventListener('input', function() {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(renderArchiveFiles, 150);
          });
        }

        // Wire up header click toggles
        function wireArchiveClicks() {
          list.querySelectorAll('.file-card:not(.locked) .file-card-header').forEach(hdr => {
            hdr.addEventListener('click', function() {
              const card = this.closest('.file-card');
              const wasExpanded = card.classList.contains('expanded');
              list.querySelectorAll('.file-card.expanded').forEach(c => c.classList.remove('expanded'));
              if (!wasExpanded) {
                card.classList.add('expanded');
                const slug = card.dataset.slug;
                if (!readSlugs.has(slug)) {
                  readSlugs.add(slug);
                  readFile(card, slug, card.dataset.title);
                }
              }
            });
          });
        }
        wireArchiveClicks();

      } catch (_) {
        if (list) list.innerHTML = '<div style="color:var(--dim);font-size:0.88rem;">Could not load files.</div>';
      }
    }

    let _archiveShowBookmarks = false;

    function renderArchiveFiles() {
      const list = document.getElementById('archive-file-list');
      if (!list || !window._archiveFiles) return;
      const files = window._archiveFiles;
      const readSlugs = window._archiveReadSlugs || new Set();
      const query = (document.getElementById('archive-search')?.value || '').toLowerCase().trim();
      const bookmarks = getArchiveBookmarks();

      const filtered = files.filter(f => {
        if (_archiveShowBookmarks && !bookmarks.has(f.slug)) return false;
        if (!query) return true;
        return (f.title || '').toLowerCase().includes(query) ||
               (f.content_html || '').toLowerCase().includes(query) ||
               (f.classification || '').toLowerCase().includes(query);
      });

      if (filtered.length === 0) {
        list.innerHTML = '<div style="color:var(--dim);font-size:0.88rem;padding:0.75rem 0;">' +
          (_archiveShowBookmarks ? 'No bookmarked files.' : 'No files match your search.') + '</div>';
        return;
      }

      list.innerHTML = filtered.map(f => buildFileCard(f, readSlugs.has(f.slug))).join('');

      // Re-wire clicks
      list.querySelectorAll('.file-card:not(.locked) .file-card-header').forEach(hdr => {
        hdr.addEventListener('click', function() {
          const card = this.closest('.file-card');
          const wasExpanded = card.classList.contains('expanded');
          list.querySelectorAll('.file-card.expanded').forEach(c => c.classList.remove('expanded'));
          if (!wasExpanded) {
            card.classList.add('expanded');
            const slug = card.dataset.slug;
            if (!readSlugs.has(slug)) {
              readSlugs.add(slug);
              readFile(card, slug, card.dataset.title);
            }
          }
        });
      });
    }

    function getArchiveBookmarks() {
      try { return new Set(JSON.parse(localStorage.getItem('vs_arc_bookmarks') || '[]')); }
      catch (_) { return new Set(); }
    }

    function toggleFileBookmark(slug, btn) {
      const bm = getArchiveBookmarks();
      if (bm.has(slug)) { bm.delete(slug); btn.textContent = '🔖'; btn.title = 'Bookmark'; }
      else { bm.add(slug); btn.textContent = '🔖✓'; btn.title = 'Bookmarked'; }
      localStorage.setItem('vs_arc_bookmarks', JSON.stringify([...bm]));
    }

    function toggleArchiveBookmarks() {
      _archiveShowBookmarks = !_archiveShowBookmarks;
      const btn = document.getElementById('archive-bookmarks-toggle');
      if (btn) {
        btn.style.background = _archiveShowBookmarks ? 'rgba(255,196,0,0.12)' : 'transparent';
        btn.style.borderColor = _archiveShowBookmarks ? 'rgba(255,196,0,0.4)' : 'rgba(255,255,255,0.1)';
        btn.style.color = _archiveShowBookmarks ? 'var(--gold)' : 'var(--dim)';
      }
      renderArchiveFiles();
    }

    function buildFileCard(f, isRead) {
      const tagClass = { 'EYES ONLY': 'ctag-eyes', 'RESTRICTED': 'ctag-rest', 'TOP SECRET': 'ctag-top', 'VAULT KEEPER EYES ONLY': 'ctag-vk' }[f.classification] || 'ctag-eyes';
      const rankLabel = RANK_NAMES[f.rank_required] || 'Vault Runner';
      const uTag = f.universe_tag ? f.universe_tag.charAt(0).toUpperCase() + f.universe_tag.slice(1) : '';

      if (f.locked) {
        return `<div class="file-card locked">
          <div class="file-card-header">
            <span class="classification-tag ${tagClass}">${f.classification}</span>
            <span class="file-title">${f.title}</span>
            <div class="file-meta-tags">
              ${uTag ? `<span class="file-universe-tag">${uTag}</span>` : ''}
              <span class="file-rank-lock">🔒 ${rankLabel}+</span>
            </div>
          </div>
        </div>`;
      }

      const bm = getArchiveBookmarks();
      const isBookmarked = bm.has(f.slug);
      return `<div class="file-card" data-slug="${f.slug}" data-title="${f.title.replace(/"/g,'&quot;')}">
        <div class="file-card-header">
          <span class="classification-tag ${tagClass}">${f.classification}</span>
          <span class="file-title">${f.title}</span>
          <div class="file-meta-tags">
            ${uTag ? `<span class="file-universe-tag">${uTag}</span>` : ''}
            ${isRead ? '<span class="file-read-dot" title="Read"></span>' : ''}
            <button onclick="event.stopPropagation();toggleFileBookmark('${f.slug}',this)" title="${isBookmarked ? 'Bookmarked' : 'Bookmark'}" style="background:none;border:none;cursor:pointer;font-size:0.75rem;padding:0.15rem 0.3rem;color:var(--dim);border-radius:4px;transition:color 0.15s;" onmouseenter="this.style.color='var(--gold)'" onmouseleave="this.style.color='var(--dim)'">${isBookmarked ? '🔖✓' : '🔖'}</button>
            <span class="file-caret">▼</span>
          </div>
        </div>
        <div class="file-content-body">
          ${f.content_html}
          ${isRead
            ? '<div class="file-pts-awarded">✓ Points already earned for this file</div>'
            : '<div class="file-pts-awarded" id="pts-' + f.slug + '" style="display:none;">⚡ +20 pts awarded</div>'}
        </div>
      </div>`;
    }

    async function readFile(card, slug, title) {
      try {
        const { data } = await VSSupabase.rpc('award_points', {
          p_reason:   'file_read_' + slug,
          p_points:   20,
          p_label:    'Read: ' + title,
          p_once_per: 'ever',
        });
        if (data?.ok) {
          showXpChip(20, 'Read: ' + title);
          const ptsEl = document.getElementById('pts-' + slug);
          if (ptsEl) ptsEl.style.display = '';
          // Mark read dot
          const hdr = card.querySelector('.file-card-header');
          if (hdr && !hdr.querySelector('.file-read-dot')) {
            const dot = document.createElement('span');
            dot.className = 'file-read-dot'; dot.title = 'Read';
            hdr.querySelector('.file-caret')?.before(dot);
          }
          // Refresh points
          refreshPointsDisplay();
          // Try to complete 'read_file' challenge
          completeChallengeByActionKey('read_file');
        }
      } catch (_) {}
    }

    // ── Phase 5 / Feature 4: Vault Challenges ────────────────────
    let _allChallenges     = [];
    let _challengeFilter   = 'All';

    const CATEGORY_FILTER_LIST = ['All', 'Daily', 'Weekly', 'Lore', 'Game', 'Social', 'One-Time', 'General'];

    let _challengeHistoryLoaded = false;
    async function toggleChallengeHistory(btn) {
      const el = document.getElementById('challenge-history-list');
      if (!el) return;
      if (el.style.display !== 'none') {
        el.style.display = 'none';
        btn.textContent = '▸ Show completion history';
        return;
      }
      el.style.display = '';
      btn.textContent = '▾ Hide completion history';
      if (_challengeHistoryLoaded) return;
      _challengeHistoryLoaded = true;
      el.innerHTML = '<div style="color:var(--dim);font-size:0.84rem;">Loading…</div>';
      try {
        const { data } = await VSSupabase
          .from('challenge_submissions')
          .select('challenge_id, created_at, challenges(title, points)')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!data || data.length === 0) {
          el.innerHTML = '<div style="color:var(--dim);font-size:0.84rem;">No completions yet.</div>';
          return;
        }
        el.innerHTML = data.map(s => {
          const title = s.challenges?.title || 'Challenge';
          const pts = s.challenges?.points || 0;
          const when = s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.55rem 0;border-bottom:1px solid rgba(255,255,255,0.04);gap:1rem;flex-wrap:wrap;">
            <div>
              <div style="font-size:0.85rem;color:var(--text);font-weight:600;">${title}</div>
              <div style="font-size:0.75rem;color:var(--dim);">${when}</div>
            </div>
            <span style="font-size:0.82rem;font-weight:700;color:var(--gold);flex-shrink:0;">+${pts} pts</span>
          </div>`;
        }).join('');
      } catch (_) {
        el.innerHTML = '<div style="color:var(--dim);font-size:0.84rem;">Could not load history.</div>';
      }
    }

    let _followingLoaded = false;
    async function loadFollowing() {
      if (_followingLoaded) return;
      _followingLoaded = true;
      const feedEl  = document.getElementById('following-feed-list');
      const emptyEl = document.getElementById('following-empty');
      if (!feedEl) return;
      feedEl.innerHTML = '<p style="color:var(--muted);font-size:0.92rem;">Loading your following feed…</p>';
      if (emptyEl) emptyEl.style.display = 'none';
      try {
        const userId = _currentMember && _currentMember._id;
        if (!userId) throw new Error('not authenticated');
        const { data, error } = await VSSupabase.rpc('get_following_feed', { p_user_id: userId, p_limit: 20 });
        if (error) throw error;
        if (!data || data.length === 0) {
          feedEl.innerHTML = '';
          if (emptyEl) emptyEl.style.display = '';
          return;
        }
        feedEl.innerHTML = data.map(ev => {
          const initial = (ev.username || '?').charAt(0).toUpperCase();
          const when    = ev.created_at ? formatTimeAgo(new Date(ev.created_at)) : '';
          return `<div style="display:flex;align-items:center;gap:0.85rem;padding:0.75rem 1rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;">
            <div style="width:36px;height:36px;border-radius:50%;background:rgba(31,162,255,0.15);color:#1FA2FF;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;flex-shrink:0;">${escHtml(initial)}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.88rem;font-weight:600;color:var(--text);"><a href="/member/?u=${encodeURIComponent(ev.username)}" style="color:inherit;text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.1);">${escHtml(ev.username)}</a></div>
              <div style="font-size:0.82rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(ev.label || 'Vault activity')}</div>
            </div>
            <div style="font-size:0.75rem;color:var(--dim);white-space:nowrap;flex-shrink:0;">${escHtml(when)}</div>
          </div>`;
        }).join('');
      } catch (e) {
        feedEl.innerHTML = '<div style="color:var(--dim);font-size:0.84rem;">Could not load following feed.</div>';
      }
    }
    window.loadFollowing = loadFollowing;

    let _pollsLoaded = false;
    async function loadPolls() {
      if (_pollsLoaded) return;
      _pollsLoaded = true;
      const el = document.getElementById('portal-polls-list');
      if (!el) return;

      try {
        const { data: polls, error } = await VSSupabase.from('polls')
          .select('id, question, options, closes_at, is_active')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error || !polls || polls.length === 0) {
          el.innerHTML = `<div style="text-align:center;padding:3rem 1rem;color:var(--dim);">
            <div style="font-size:2.5rem;margin-bottom:0.75rem;">🗳️</div>
            <div style="font-size:0.9rem;line-height:1.6;">No active polls right now. Check back soon — the studio posts polls regularly to get your input on game decisions and community direction.</div>
          </div>`;
          return;
        }

        // Fetch current member's votes
        const { data: { session } } = await VSSupabase.auth.getSession();
        let myVotes = {};
        if (session) {
          const { data: votes } = await VSSupabase.from('poll_votes')
            .select('poll_id, option_index')
            .eq('user_id', session.user.id);
          (votes || []).forEach(v => { myVotes[v.poll_id] = v.option_index; });
        }

        el.innerHTML = polls.map(poll => {
          const opts = Array.isArray(poll.options) ? poll.options : [];
          const total = opts.reduce((s, o) => s + (o.votes || 0), 0) || 1;
          const myVote = myVotes[poll.id];
          const hasVoted = myVote !== undefined;
          const closesStr = poll.closes_at
            ? 'Closes ' + new Date(poll.closes_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '';

          return `<div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:1.5rem;margin-bottom:1rem;">
            <div style="font-weight:700;color:var(--text);margin-bottom:1rem;font-size:0.95rem;">${poll.question}</div>
            <div style="display:flex;flex-direction:column;gap:0.55rem;">
              ${opts.map((o, idx) => {
                const pct = Math.round(((o.votes || 0) / total) * 100);
                const isMyVote = hasVoted && myVote === idx;
                const label = typeof o === 'object' ? o.label : String(o);
                if (hasVoted) {
                  return `<div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="min-width:110px;font-size:0.83rem;color:${isMyVote ? 'var(--gold)' : 'var(--text)'};">${label}${isMyVote ? ' ✓' : ''}</div>
                    <div style="flex:1;height:28px;background:rgba(255,255,255,0.04);border:1px solid ${isMyVote ? 'rgba(255,196,0,0.3)' : 'rgba(255,255,255,0.07)'};border-radius:6px;overflow:hidden;position:relative;">
                      <div style="height:100%;border-radius:6px;background:${isMyVote ? 'rgba(255,196,0,0.18)' : 'rgba(255,255,255,0.06)'};width:${pct}%;transition:width 0.5s ease;"></div>
                      <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:0.73rem;font-weight:700;color:var(--muted);">${pct}%</span>
                    </div>
                  </div>`;
                }
                return `<button onclick="castVote('${poll.id}',${idx},this.closest('.poll-wrap'))" style="display:flex;align-items:center;gap:0.75rem;background:transparent;border:none;padding:0;cursor:pointer;font-family:inherit;width:100%;text-align:left;">
                  <div style="min-width:110px;font-size:0.83rem;color:var(--text);">${label}</div>
                  <div style="flex:1;height:28px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;position:relative;transition:border-color 0.15s;" onmouseenter="this.style.borderColor='rgba(255,196,0,0.35)'" onmouseleave="this.style.borderColor='rgba(255,255,255,0.08)'">
                    <div style="height:100%;border-radius:6px;background:rgba(255,255,255,0.06);width:${pct}%;"></div>
                    <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:0.73rem;font-weight:700;color:var(--dim);">${pct}%</span>
                  </div>
                </button>`;
              }).join('')}
            </div>
            ${closesStr ? `<div style="font-size:0.72rem;color:var(--dim);margin-top:0.75rem;">${closesStr}</div>` : ''}
          </div>`;
        }).join('');
      } catch (_) {
        if (el) el.innerHTML = '<div style="color:var(--dim);font-size:0.88rem;">Could not load polls.</div>';
      }
    }

    async function castVote(pollId, optionIndex, container) {
      try {
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) { showXpChip(0, 'Sign in to vote'); return; }
        const { error } = await VSSupabase.from('poll_votes').upsert(
          { poll_id: pollId, user_id: session.user.id, option_index: optionIndex },
          { onConflict: 'poll_id,user_id' }
        );
        if (!error) {
          _pollsLoaded = false;
          loadPolls();
        }
      } catch (_) {}
    }

    function addPollOption() {
      const list = document.getElementById('poll-options-list');
      if (!list) return;
      const count = list.querySelectorAll('.poll-option-input').length;
      if (count >= 4) return;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.maxLength = 120;
      inp.required = true;
      inp.placeholder = `Option ${count + 1}`;
      inp.className = 'poll-option-input';
      inp.style.cssText = 'padding:0.5rem 0.75rem;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:#fff;font-size:0.88rem;';
      list.appendChild(inp);
      if (count + 1 >= 4) {
        const btn = document.getElementById('add-poll-option-btn');
        if (btn) btn.disabled = true;
      }
    }
    window.addPollOption = addPollOption;

    async function adminCreatePoll(e) {
      e.preventDefault();
      const statusEl = document.getElementById('create-poll-status');
      const btn = document.getElementById('create-poll-btn');
      const question = (document.getElementById('poll-question')?.value || '').trim();
      const optionInputs = [...document.querySelectorAll('.poll-option-input')];
      const options = optionInputs.map(i => ({ label: i.value.trim(), votes: 0 })).filter(o => o.label);
      const closesAt = document.getElementById('poll-closes-at')?.value || null;
      if (!question || options.length < 2) {
        statusEl.textContent = 'Provide a question and at least 2 options.';
        statusEl.style.color = '#f87171';
        return;
      }
      btn.disabled = true;
      statusEl.textContent = 'Creating…';
      statusEl.style.color = 'var(--muted)';
      try {
        const payload = { question, options, is_active: true };
        if (closesAt) payload.closes_at = new Date(closesAt).toISOString();
        const { error } = await VSSupabase.from('polls').insert(payload);
        if (error) throw error;
        statusEl.textContent = 'Poll created!';
        statusEl.style.color = '#4ade80';
        document.getElementById('create-poll-form').reset();
        const list = document.getElementById('poll-options-list');
        // Remove extra options beyond 2
        [...list.querySelectorAll('.poll-option-input')].slice(2).forEach(n => n.remove());
        const addBtn = document.getElementById('add-poll-option-btn');
        if (addBtn) addBtn.disabled = false;
        loadAdminPolls();
      } catch (err) {
        statusEl.textContent = err.message || 'Failed to create poll.';
        statusEl.style.color = '#f87171';
      } finally {
        btn.disabled = false;
      }
    }
    window.adminCreatePoll = adminCreatePoll;

    async function loadAdminPolls() {
      const el = document.getElementById('admin-polls-list');
      if (!el) return;
      const { data, error } = await VSSupabase.from('polls')
        .select('id,question,is_active,closes_at,options')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error || !data?.length) {
        el.textContent = error ? error.message : 'No polls yet.';
        return;
      }
      el.innerHTML = data.map(p => {
        const totalVotes = (p.options || []).reduce((s, o) => s + (o.votes || 0), 0);
        const closedLabel = p.closes_at ? ` · closes ${new Date(p.closes_at).toLocaleDateString()}` : '';
        return `<div style="padding:0.65rem 0;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center;gap:0.75rem;">
          <div>
            <div style="font-size:0.88rem;color:#e2e8f0;">${escHtml(p.question)}</div>
            <div style="font-size:0.75rem;color:var(--muted);margin-top:0.2rem;">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}${closedLabel}</div>
          </div>
          <button type="button" onclick="adminClosePoll('${p.id}',${!p.is_active})" style="padding:0.25rem 0.6rem;font-size:0.75rem;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--muted);cursor:pointer;">${p.is_active ? 'Close' : 'Reopen'}</button>
        </div>`;
      }).join('');
    }
    window.loadAdminPolls = loadAdminPolls;

    async function adminClosePoll(pollId, setActive) {
      await VSSupabase.from('polls').update({ is_active: setActive }).eq('id', pollId);
      loadAdminPolls();
    }
    window.adminClosePoll = adminClosePoll;

    async function loadChallenges() {
      const grid    = document.getElementById('challenges-list');
      const summary = document.getElementById('challenges-summary');
      if (!grid) return;

      // Show challenge streak badge
      const streakBadge = document.getElementById('challenge-streak-badge');
      if (streakBadge && _currentMember && _currentMember.challenge_streak > 0) {
        streakBadge.textContent = '🔥 ' + _currentMember.challenge_streak + '-day streak';
        streakBadge.style.display = '';
      }

      try {
        const { data: challenges, error } = await VSSupabase.rpc('get_challenges');
        if (error || !challenges || challenges.length === 0) {
          grid.innerHTML = '<div style="color:var(--dim);font-size:0.88rem;grid-column:1/-1;">No challenges available right now.</div>';
          buildChallengeFilterPills([]);
          return;
        }

        _allChallenges = challenges;

        const done  = challenges.filter(c => c.completed).length;
        const total = challenges.length;
        if (summary) summary.textContent = done + ' / ' + total + ' completed';

        buildChallengeFilterPills(challenges);
        renderFilteredChallenges();

      } catch (_) {
        if (grid) grid.innerHTML = '<div style="color:var(--dim);font-size:0.88rem;grid-column:1/-1;">Could not load challenges.</div>';
      }
    }

    function buildChallengeFilterPills(challenges) {
      const pillsEl = document.getElementById('challenge-filter-pills');
      if (!pillsEl) return;

      // Only show categories that have at least one challenge (plus All)
      const existingCats = new Set((challenges || []).map(c => c.category || 'General'));
      const toShow = CATEGORY_FILTER_LIST.filter(cat => cat === 'All' || existingCats.has(cat));

      pillsEl.innerHTML = toShow.map(cat => {
        const isActive = cat === _challengeFilter;
        return `<button onclick="setChallengeFilter('${cat}')" data-cat="${cat}" style="
          padding:0.3rem 0.85rem;border-radius:999px;font-size:0.78rem;font-weight:700;
          font-family:inherit;cursor:pointer;transition:all 0.16s;border:1px solid;
          background:${isActive ? 'rgba(255,196,0,0.15)' : 'rgba(255,255,255,0.04)'};
          border-color:${isActive ? 'rgba(255,196,0,0.45)' : 'rgba(255,255,255,0.1)'};
          color:${isActive ? 'var(--gold)' : 'var(--dim)'};
        ">${cat}</button>`;
      }).join('');
    }

    function setChallengeFilter(cat) {
      _challengeFilter = cat;
      // Rebuild pills to reflect new active state
      buildChallengeFilterPills(_allChallenges);
      renderFilteredChallenges();
    }

    function renderFilteredChallenges() {
      const grid = document.getElementById('challenges-list');
      if (!grid) return;
      const now = Date.now();
      const filtered = _allChallenges.filter(ch => {
        if (_challengeFilter === 'All') return true;
        const cat = ch.category || 'General';
        // Map 'One-Time' filter to challenge_type one-time or category One-Time
        if (_challengeFilter === 'One-Time') return cat === 'One-Time' || ch.challenge_type === 'one-time';
        return cat === _challengeFilter;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `<div style="color:var(--dim);font-size:0.88rem;grid-column:1/-1;">No ${_challengeFilter !== 'All' ? _challengeFilter : ''} challenges right now.</div>`;
        return;
      }
      grid.innerHTML = filtered.map(ch => buildChallengeCard(ch, now)).join('');
    }

    function buildChallengeExpiry(ch, now) {
      if (!ch.expires_at) {
        return ch.challenge_type === 'weekly' ? 'Resets Monday' : '';
      }
      const exp = new Date(ch.expires_at).getTime();
      if (exp < now) return 'expired';
      const diffMs = exp - now;
      const days  = Math.floor(diffMs / 86400000);
      const hours = Math.floor((diffMs % 86400000) / 3600000);
      if (days <= 7) {
        return 'Expires in ' + (days > 0 ? days + 'd ' : '') + hours + 'h';
      }
      return 'Expires ' + new Date(ch.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function buildChallengeCard(ch, nowTs) {
      const now = nowTs || Date.now();
      const typeMap   = { weekly: 'ctype-weekly', monthly: 'ctype-monthly', 'one-time': 'ctype-once' };
      const typeLabel = ch.challenge_type === 'one-time' ? 'One-Time' : ch.challenge_type.charAt(0).toUpperCase() + ch.challenge_type.slice(1);
      const expiryStr = buildChallengeExpiry(ch, now);
      const isExpired = expiryStr === 'expired';
      const cat       = ch.category || 'General';

      // Difficulty badge
      const diffMap = {
        Easy:      { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  color: '#10B981' },
        Medium:    { bg: 'rgba(31,162,255,0.1)',  border: 'rgba(31,162,255,0.25)',  color: '#1FA2FF' },
        Hard:      { bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)',  color: '#fb923c' },
        Legendary: { bg: 'rgba(255,196,0,0.12)',  border: 'rgba(255,196,0,0.35)',   color: '#FFC400' },
      };
      const diff = ch.difficulty || 'Medium';
      const dc = diffMap[diff] || diffMap.Medium;
      const diffBadge = `<span style="font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.07em;padding:0.16rem 0.48rem;border-radius:4px;background:${dc.bg};color:${dc.color};border:1px solid ${dc.border};white-space:nowrap;">${diff}</span>`;

      // Category badge (if not already expressed by challenge_type)
      const catBadge = (cat !== 'General' && cat.toLowerCase() !== ch.challenge_type)
        ? `<span style="font-size:0.6rem;font-weight:800;text-transform:uppercase;letter-spacing:0.07em;padding:0.16rem 0.48rem;border-radius:4px;background:rgba(139,92,246,0.1);color:#a78bfa;border:1px solid rgba(139,92,246,0.2);white-space:nowrap;">${cat}</span>`
        : '';

      // Expiry badge
      const expiryBadge = expiryStr
        ? `<span class="challenge-expires" style="${isExpired ? 'color:#f87171;' : expiryStr.startsWith('Expires in') ? 'color:#fb923c;' : 'color:var(--dim);'}font-size:0.73rem;">${isExpired ? '⛔ Expired' : expiryStr}</span>`
        : '';

      if (isExpired) {
        return `<div class="challenge-card" style="opacity:0.45;filter:grayscale(0.5);">
          <div class="challenge-card-top">
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
              <span class="challenge-type-chip ${typeMap[ch.challenge_type] || 'ctype-once'}">${typeLabel}</span>
              ${diffBadge}${catBadge}
            </div>
            <span class="challenge-pts-badge">+${ch.points} pts</span>
          </div>
          <div class="challenge-title">${ch.title}</div>
          <div class="challenge-desc">${ch.description || ''}</div>
          <div class="challenge-footer">${expiryBadge}</div>
        </div>`;
      }

      if (ch.completed) {
        const when = ch.completed_at ? formatTimeAgo(new Date(ch.completed_at)) : 'Complete';
        return `<div class="challenge-card completed">
          <div class="challenge-card-top">
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
              <span class="challenge-type-chip ${typeMap[ch.challenge_type] || 'ctype-once'}">${typeLabel}</span>
              ${diffBadge}${catBadge}
            </div>
            <span class="challenge-pts-badge">+${ch.points} pts</span>
          </div>
          <div class="challenge-title">${ch.title}</div>
          <div class="challenge-desc">${ch.description || ''}</div>
          <div class="challenge-footer">
            <span class="challenge-done">✓ Earned — ${when}</span>
            ${expiryBadge}
          </div>
        </div>`;
      }

      return `<div class="challenge-card">
        <div class="challenge-card-top">
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
            <span class="challenge-type-chip ${typeMap[ch.challenge_type] || 'ctype-once'}">${typeLabel}</span>
            ${diffBadge}${catBadge}
          </div>
          <span class="challenge-pts-badge">+${ch.points} pts</span>
        </div>
        <div class="challenge-title">${ch.title}</div>
        <div class="challenge-desc">${ch.description || ''}</div>
        <div class="challenge-footer">
          ${expiryBadge || '<span style="color:var(--dim);font-size:0.78rem;">Complete an action to earn</span>'}
        </div>
      </div>`;
    }

    // Auto-complete challenges based on detected member state
    async function initChallenges(member) {
      try {
        // Reuse cached challenges if loadChallenges() already ran; else fetch
        const { data: challenges } = _allChallenges && _allChallenges.length > 0
          ? { data: _allChallenges }
          : await VSSupabase.rpc('get_challenges');
        if (!challenges) return;

        const achIds = (member.achievements || []).map(a => a.id);
        const pending = challenges.filter(c => !c.completed);
        let totalBonus = 0;

        for (const ch of pending) {
          let should = false;
          switch (ch.action_key) {
            case 'subscribed':     should = !!member.subscribed; break;
            case 'weekly_login':   should = true; break;
            case 'profile_complete':
              should = !!(member.bio && member.bio.trim().length > 0
                         && member.avatar_id && member.avatar_id !== 'spark'); break;
            case 'visit_game':
              should = !!(localStorage.getItem('vs_visited_cod')
                        || localStorage.getItem('vs_visited_gm')
                        || localStorage.getItem('vs_visited_vsfgm')); break;
            case 'visit_all_games':
              should = !!(localStorage.getItem('vs_visited_cod')
                        && localStorage.getItem('vs_visited_gm')
                        && localStorage.getItem('vs_visited_vsfgm')); break;
            case 'referral_1':     should = achIds.includes('recruiter'); break;
            case 'referral_5':     should = achIds.includes('patron'); break;
          }
          if (should) {
            const { data } = await VSSupabase.rpc('complete_challenge', { p_challenge_id: ch.id });
            if (data?.ok) totalBonus += data.points;
          }
        }

        if (totalBonus > 0) {
          showXpChip(totalBonus, 'Challenge bonus');
          refreshPointsDisplay();
          loadPointEvents();
        }
        loadChallenges();
      } catch (_) {}
    }

    async function completeChallengeByActionKey(actionKey) {
      try {
        // Reuse cached challenges; only fetch if cache is empty
        const { data: challenges } = _allChallenges && _allChallenges.length > 0
          ? { data: _allChallenges }
          : await VSSupabase.rpc('get_challenges');
        if (!challenges) return;
        const ch = challenges.find(c => c.action_key === actionKey && !c.completed);
        if (!ch) return;
        const { data } = await VSSupabase.rpc('complete_challenge', { p_challenge_id: ch.id });
        if (data?.ok) {
          showChallengeCompleteModal(data.points, data.title);
          refreshPointsDisplay();
          loadChallenges();
          await updateChallengeStreakAndMicro();
        }
      } catch (_) {}
    }

    // Update challenge streak and check micro-achievements after a completion
    async function updateChallengeStreakAndMicro() {
      try {
        const { data: { session } } = await VSSupabase.auth.getSession();
        if (!session) return;
        const today = new Date().toISOString().slice(0, 10);
        const { data: row } = await VSSupabase.from('vault_members')
          .select('challenge_streak, last_challenge_date')
          .eq('id', session.user.id).single();
        if (!row) return;

        const lastDate = row.last_challenge_date;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        let newStreak = 1;
        if (lastDate === today) {
          newStreak = row.challenge_streak || 1; // already counted today
        } else if (lastDate === yesterday) {
          newStreak = (row.challenge_streak || 0) + 1;
        }

        await VSSupabase.from('vault_members')
          .update({ challenge_streak: newStreak, last_challenge_date: today })
          .eq('id', session.user.id);

        if (_currentMember) {
          _currentMember.challenge_streak = newStreak;
          _currentMember.last_challenge_date = today;
        }

        // Update streak badge display
        const streakBadge = document.getElementById('challenge-streak-badge');
        if (streakBadge && newStreak > 1) {
          streakBadge.textContent = '🔥 ' + newStreak + '-day streak';
          streakBadge.style.display = '';
        }

        // Streak milestone bonuses
        if (newStreak === 7 || newStreak === 30) {
          const bonus = newStreak === 7 ? 50 : 200;
          await VSSupabase.rpc('award_points', { p_user_id: session.user.id, p_points: bonus, p_reason: 'challenge_streak_' + newStreak });
          showXpChip(bonus, newStreak + '-day challenge streak!');
          refreshPointsDisplay();
        }

        // First-completion micro-achievements
        const { count } = await VSSupabase.from('challenge_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
        const milestones = { 1: 'first_challenge', 5: 'challenge_5', 10: 'challenge_10' };
        if (milestones[count]) {
          // Award if not already in achievements
          const alreadyHas = (_currentMember?.achievements || []).some(a => a.id === milestones[count]);
          if (!alreadyHas) {
            await VSSupabase.rpc('award_points', { p_user_id: session.user.id, p_points: 25, p_reason: milestones[count] });
            const labels = { first_challenge: 'First Challenge', challenge_5: '5 Challenges', challenge_10: '10 Challenges' };
            showXpChip(25, labels[milestones[count]] + ' milestone!');
          }
        }
      } catch (_) {}
    }
