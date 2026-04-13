(function () {
  'use strict';

  var SB = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  var KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  var HEADERS = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  var RANK_TIERS = [
    { name: 'Spark Initiate', min: 0, max: 99, color: '#8a93b8' },
    { name: 'Vault Runner', min: 100, max: 499, color: '#10B981' },
    { name: 'Forge Guard', min: 500, max: 1499, color: '#8B5CF6' },
    { name: 'Vault Keeper', min: 1500, max: 4999, color: '#1FA2FF' },
    { name: 'The Sparked', min: 5000, max: Infinity, color: '#FFC400' }
  ];

  var allMembers = [];
  var activeRankFilter = 'All';
  var searchQuery = '';
  var searchTimer = null;

  function getRankInfo(points, rankTitle) {
    if (rankTitle) {
      var rank = RANK_TIERS.find(function (tier) { return tier.name === rankTitle; });
      if (rank) return rank;
    }
    for (var i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
      if (points >= RANK_TIERS[i].min) return RANK_TIERS[i];
    }
    return RANK_TIERS[0];
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function normalizeMember(member) {
    var points = Number(member.vault_points ?? member.points ?? 0);
    return {
      username: member.username || 'VaultMember',
      points: Number.isFinite(points) ? points : 0,
      rankTitle: member.rank_title || '',
      memberNumber: member.member_number || null,
      createdAt: member.created_at || ''
    };
  }

  function emptyState() {
    return [
      '<div class="members-empty" style="grid-column:1/-1;">',
      '<div class="members-empty-icon">⌕</div>',
      '<p>No members match your search. ',
      '<button type="button" class="members-clear-filters" ',
      'style="background:none;border:none;color:var(--gold);cursor:pointer;font-family:inherit;font-size:inherit;text-decoration:underline;">',
      'Clear filters</button></p>',
      '</div>'
    ].join('');
  }

  function renderMembers() {
    var grid = document.getElementById('members-grid');
    var countEl = document.getElementById('members-count');
    if (!grid) return;

    var filtered = allMembers.filter(function (member) {
      var rank = getRankInfo(member.points, member.rankTitle);
      var rankMatch = activeRankFilter === 'All' || rank.name === activeRankFilter;
      var searchMatch = !searchQuery || member.username.toLowerCase().indexOf(searchQuery) !== -1;
      return rankMatch && searchMatch;
    });

    if (countEl) {
      countEl.textContent = 'Showing ' + filtered.length + ' of ' + allMembers.length + ' members';
    }

    if (!filtered.length) {
      grid.innerHTML = emptyState();
      return;
    }

    grid.innerHTML = filtered.map(function (member) {
      var rank = getRankInfo(member.points, member.rankTitle);
      var initials = member.username.charAt(0).toUpperCase();
      var isGenesis = member.memberNumber && member.memberNumber <= 100;
      return [
        '<a href="/member/?u=', encodeURIComponent(member.username), '" class="member-card">',
        '<div class="mc-avatar" style="background:', rank.color, '22;color:', rank.color, ';border:2px solid ', rank.color, '44;">', initials, '</div>',
        '<div class="mc-username">', esc(member.username), '</div>',
        '<div class="mc-rank" style="color:', rank.color, ';">', esc(rank.name), '</div>',
        '<div class="mc-pts">', member.points.toLocaleString('en-US'), ' pts</div>',
        isGenesis ? '<div class="mc-badge">Genesis Member</div>' : '',
        '</a>'
      ].join('');
    }).join('');
  }

  function clearFilters() {
    searchQuery = '';
    activeRankFilter = 'All';
    var input = document.getElementById('member-search');
    if (input) input.value = '';
    document.querySelectorAll('.rank-filter-btn').forEach(function (button) {
      button.classList.toggle('active', button.dataset.rank === 'All');
    });
    renderMembers();
  }

  async function fetchMembers(query) {
    var response = await fetch(SB + '/rest/v1/vault_members?' + query, { headers: HEADERS });
    if (!response.ok) throw new Error('members query failed: ' + response.status);
    return response.json();
  }

  async function loadMembers() {
    var countEl = document.getElementById('members-count');
    var grid = document.getElementById('members-grid');

    try {
      var data;
      try {
        data = await fetchMembers('select=username,vault_points,rank_title,member_number,created_at&order=vault_points.desc&limit=200');
      } catch (primaryError) {
        data = await fetchMembers('select=username,points,member_number,created_at&order=points.desc&limit=200');
      }

      allMembers = Array.isArray(data) ? data.map(normalizeMember) : [];
      renderMembers();
    } catch (error) {
      if (countEl) countEl.textContent = 'Could not load members';
      if (grid) {
        grid.innerHTML = '<div class="members-empty" style="grid-column:1/-1;"><p>Could not load member list. Please try again later.</p></div>';
      }
    }
  }

  function init() {
    var search = document.getElementById('member-search');
    if (search) {
      search.addEventListener('input', function () {
        clearTimeout(searchTimer);
        var value = search.value.trim().toLowerCase();
        searchTimer = setTimeout(function () {
          searchQuery = value;
          renderMembers();
        }, 200);
      });
    }

    document.querySelectorAll('.rank-filter-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        document.querySelectorAll('.rank-filter-btn').forEach(function (other) {
          other.classList.remove('active');
        });
        button.classList.add('active');
        activeRankFilter = button.dataset.rank || 'All';
        renderMembers();
      });
    });

    document.addEventListener('click', function (event) {
      if (event.target.closest('.members-clear-filters')) clearFilters();
    });

    loadMembers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
