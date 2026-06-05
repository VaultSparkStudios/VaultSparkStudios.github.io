(function () {
  'use strict';

  var SUPABASE_URL = 'https://fjnpzjjyhnpmunfoycrp.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
  var SESSION_KEYS = ['sb-fjnpzjjyhnpmunfoycrp-auth-token', 'supabase.auth.token'];
  var username = null;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showFeedback(type, title, copy) {
    var feedback = document.getElementById('invite-feedback');
    if (!feedback) return;
    feedback.className = 'feedback-panel show ' + type;
    feedback.innerHTML =
      '<strong class="feedback-panel-title">' + title + '</strong>' +
      '<div class="feedback-panel-copy">' + copy + '</div>';
  }

  function getSession() {
    for (var i = 0; i < SESSION_KEYS.length; i += 1) {
      var raw = null;
      try { raw = localStorage.getItem(SESSION_KEYS[i]); } catch (_) {}
      if (!raw) continue;
      try {
        var parsed = JSON.parse(raw);
        var candidates = [parsed, parsed && parsed.currentSession, parsed && parsed.session].filter(Boolean);
        if (Array.isArray(parsed)) candidates = candidates.concat(parsed);
        for (var j = 0; j < candidates.length; j += 1) {
          var session = candidates[j];
          if (session && session.access_token && session.user && session.user.id) return session;
        }
      } catch (_) {}
    }
    return null;
  }

  function buildReferralLink(name) {
    return 'https://vaultsparkstudios.com/vault-member/?ref=' + encodeURIComponent(name);
  }

  function wireShareButtons(link) {
    var copyButton = document.getElementById('copy-link-btn');
    var discordButton = document.getElementById('share-discord-btn');
    var xButton = document.getElementById('share-x-btn');
    var redditButton = document.getElementById('share-reddit-btn');

    copyButton.addEventListener('click', function () {
      navigator.clipboard.writeText(link).then(function () {
        copyButton.textContent = '✓ Copied!';
        copyButton.classList.add('copied');
        showFeedback('good', 'Referral link copied', 'Paste it anywhere your people already trust you.');
        if (window.VSFunnel) {
          window.VSFunnel.track('invite_copy_link', { page_path: window.location.pathname });
          window.VSFunnel.trackStage('invite_referral', 'copy_link', { page_path: window.location.pathname });
        }
        setTimeout(function () {
          copyButton.textContent = 'Copy Link';
          copyButton.classList.remove('copied');
        }, 1800);
      });
    });

    discordButton.addEventListener('click', function () {
      var message = 'I am in the VaultSpark Studios vault. Come join me — free to sign up: ' + link;
      navigator.clipboard.writeText(message).then(function () {
        discordButton.textContent = '✓ Copied!';
        showFeedback('good', 'Discord message copied', 'Drop it into your server, DM, or community thread.');
        if (window.VSFunnel) {
          window.VSFunnel.track('invite_copy_discord', { page_path: window.location.pathname });
          window.VSFunnel.trackStage('invite_referral', 'copy_discord', { page_path: window.location.pathname });
        }
        setTimeout(function () { discordButton.textContent = 'Copy Discord Message'; }, 1800);
      });
    });

    xButton.addEventListener('click', function () {
      var text = 'Just joined the @VaultSparkStudios vault. Come build the community with me: ' + link;
      if (window.VSFunnel) {
        window.VSFunnel.track('invite_share_x', { page_path: window.location.pathname });
        window.VSFunnel.trackStage('invite_referral', 'share_x', { page_path: window.location.pathname });
      }
      window.open('https://x.com/intent/tweet?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });

    redditButton.addEventListener('click', function () {
      var title = 'Just joined VaultSpark Studios — an indie game studio building some cool stuff';
      if (window.VSFunnel) {
        window.VSFunnel.track('invite_share_reddit', { page_path: window.location.pathname });
        window.VSFunnel.trackStage('invite_referral', 'share_reddit', { page_path: window.location.pathname });
      }
      window.open('https://www.reddit.com/submit?url=' + encodeURIComponent(link) + '&title=' + encodeURIComponent(title), '_blank', 'noopener');
    });
  }

  async function loadMemberData(session) {
    var response = await fetch(
      SUPABASE_URL + '/rest/v1/vault_members?select=username&id=eq.' + encodeURIComponent(session.user.id) + '&limit=1',
      { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + session.access_token, Accept: 'application/json' } }
    );
    if (!response.ok) throw new Error('member load failed');
    var rows = await response.json();
    return rows && rows[0] ? rows[0] : null;
  }

  async function loadReferralCount(userId, token, since) {
    var url = SUPABASE_URL + '/rest/v1/vault_members?select=id&referred_by=eq.' + encodeURIComponent(userId);
    if (since) url += '&created_at=gte.' + encodeURIComponent(since);
    var response = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token, Accept: 'application/json', Prefer: 'count=exact', Range: '0-0' }
    });
    return parseInt((response.headers.get('content-range') || '').split('/')[1] || '0', 10);
  }

  async function loadTopReferrers() {
    try {
      var response = await fetch(
        SUPABASE_URL + '/rest/v1/vault_members?select=username,referred_by&referred_by=not.is.null&limit=500',
        { headers: { apikey: SUPABASE_ANON, Accept: 'application/json' } }
      );
      if (!response.ok) return [];
      var rows = await response.json();
      if (!rows || !rows.length) return [];

      var counts = {};
      rows.forEach(function (row) {
        if (row.referred_by) counts[row.referred_by] = (counts[row.referred_by] || 0) + 1;
      });

      var ids = Object.keys(counts);
      if (!ids.length) return [];
      var idFilter = ids.map(function (id) { return 'id.eq.' + id; }).join(',');
      var nameResponse = await fetch(
        SUPABASE_URL + '/rest/v1/vault_members?select=id,username&or=(' + encodeURIComponent(idFilter) + ')',
        { headers: { apikey: SUPABASE_ANON, Accept: 'application/json' } }
      );
      if (!nameResponse.ok) return [];
      var names = await nameResponse.json();
      var nameMap = {};
      names.forEach(function (row) { nameMap[row.id] = row.username; });

      return ids
        .map(function (id) { return { username: nameMap[id] || 'Vault Member', referral_count: counts[id] }; })
        .sort(function (a, b) { return b.referral_count - a.referral_count; })
        .slice(0, 10);
    } catch (_) {
      return [];
    }
  }

  function renderTopReferrers(rows) {
    var container = document.getElementById('top-inviters-list');
    if (!container) return;
    if (!rows || !rows.length) {
      container.innerHTML = '<div style="color:var(--dim);font-size:0.88rem;padding:1.5rem;text-align:center;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;">No referrals recorded yet — be the first to grow the vault.</div>';
      return;
    }

    var rankColors = ['gold', 'silver', 'bronze'];
    container.innerHTML = rows.map(function (row, index) {
      var numberClass = 'inviter-rank-num' + (index < 3 ? ' ' + rankColors[index] : '');
      return (
        '<div class="inviter-row">' +
          '<div class="' + numberClass + '">' + (index + 1) + '</div>' +
          '<div class="inviter-name">' + esc(row.username || 'Vault Member') + '</div>' +
          '<div class="inviter-count">' + row.referral_count + ' invite' + (row.referral_count === 1 ? '' : 's') + '</div>' +
        '</div>'
      );
    }).join('');
  }

  async function init() {
    renderTopReferrers(await loadTopReferrers());

    var session = getSession();
    if (!session) {
      document.getElementById('invite-guest').style.display = '';
      return;
    }

    document.getElementById('invite-logged-in').style.display = '';

    try {
      var member = await loadMemberData(session);
      if (!member) return;

      username = member.username;
      var referralLink = buildReferralLink(username);
      document.getElementById('referral-link-input').value = referralLink;
      wireShareButtons(referralLink);

      var totalCount = await loadReferralCount(session.user.id, session.access_token);
      var weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      var weekCount = await loadReferralCount(session.user.id, session.access_token, weekAgo);

      document.getElementById('stat-total').textContent = totalCount;
      document.getElementById('stat-this-week').textContent = weekCount;
      document.getElementById('stat-rank').textContent =
        totalCount >= 10 ? 'Signal Master' :
        totalCount >= 5 ? 'Amplifier' :
        totalCount >= 1 ? 'Recruiter' : 'Pending';

      showFeedback('neutral', 'Referral link ready', 'Share your link where your people already trust you — private DMs, Discord communities, or social posts.');
      if (window.VSFunnel) window.VSFunnel.trackStage('invite_referral', 'ready', { page_path: window.location.pathname });
    } catch (error) {
      console.warn('[invite] member load error', error);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
