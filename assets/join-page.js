(function () {
  'use strict';

  var RANK_CLASSES = {
    'spark initiate': 'rank-spark-initiate',
    'vault runner': 'rank-vault-runner',
    'rift scout': 'rank-rift-scout',
    'vault guard': 'rank-vault-guard',
    'vault breacher': 'rank-vault-breacher',
    'void operative': 'rank-void-operative',
    'vault keeper': 'rank-vault-keeper',
    'forge master': 'rank-forge-master',
    'the sparked': 'rank-the-sparked'
  };

  function rankClass(rankName) {
    if (!rankName) return 'rank-spark-initiate';
    return RANK_CLASSES[rankName.toLowerCase()] || 'rank-spark-initiate';
  }

  function showFeedback(type, title, copy) {
    var feedback = document.getElementById('vault-request-feedback');
    if (!feedback) return;
    feedback.className = 'feedback-panel show ' + type;
    feedback.innerHTML =
      '<strong class="feedback-panel-title">' + title + '</strong>' +
      '<div class="feedback-panel-copy">' + copy + '</div>';
  }

  function showGeneric() {
    document.getElementById('referrer-card').style.display = 'none';
    document.getElementById('generic-badge').style.display = 'inline-flex';
    document.getElementById('join-heading-generic').style.display = '';
    document.getElementById('join-heading-ref').style.display = 'none';
  }

  function showReferrer(member) {
    var avatar = document.getElementById('ref-avatar');
    var name = document.getElementById('ref-name');
    var badge = document.getElementById('ref-rank-badge');
    var card = document.getElementById('referrer-card');
    var headingRef = document.getElementById('join-heading-ref');
    var headingGeneric = document.getElementById('join-heading-generic');
    var subtext = document.getElementById('join-subtext');

    avatar.textContent = member.avatar_emoji || '⚡';
    name.textContent = member.username || 'A Vault Member';

    var rankName = member.rank_name || 'Spark Initiate';
    badge.textContent = rankName;
    badge.className = 'rank-badge ' + rankClass(rankName);

    headingRef.style.display = '';
    headingGeneric.style.display = 'none';
    subtext.textContent = member.username
      ? member.username + ' personally unlocked the vault door for you. VaultSpark Studios is a free indie game community — earn rank, unlock lore, and play across every world we forge.'
      : 'You have been personally invited to the Vault. Free to join — forever.';

    card.style.display = 'inline-flex';
    card.classList.remove('join-state-loading');
  }

  async function loadReferrer() {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref');
    if (!ref || !window.VSPublic) {
      showGeneric();
      return;
    }

    try {
      var result = await window.VSPublic
        .from('vault_members')
        .select('username,rank_name,avatar_emoji')
        .eq('username', ref)
        .limit(1)
        .get();

      if (result.error || !result.data || !result.data.length) {
        showGeneric();
        return;
      }

      showReferrer(result.data[0]);
      if (window.VSFunnel) {
        window.VSFunnel.track('join_referral_loaded', { event_label: ref, page_path: window.location.pathname });
        window.VSFunnel.trackStage('join_referral', 'loaded', { event_label: ref, page_path: window.location.pathname });
      }
    } catch (_) {
      showGeneric();
    }
  }

  async function submitAccessRequest(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var button = document.getElementById('vault-request-btn');
    button.disabled = true;
    button.textContent = 'Sending…';
    showFeedback('neutral', 'Request in transit', 'Your request is being sent to the studio. You will be contacted when an invite cycle opens.');
    if (window.VSFunnel) {
      window.VSFunnel.track('vault_access_request_started', { page_path: window.location.pathname });
      window.VSFunnel.trackStage('join_access_request', 'started', { page_path: window.location.pathname });
    }

    try {
      var response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });

      if (!response.ok) throw new Error('request_failed');
      form.style.display = 'none';
      document.getElementById('vault-request-success').style.display = 'block';
      showFeedback('good', 'Request received', 'You are on the shortlist. Watch your inbox for an invite cycle or direct follow-up from the studio.');
      if (typeof gtag === 'function') gtag('event', 'form_submit', { form_name: 'vault_access_request', form_location: '/join/' });
      if (window.VSFunnel) {
        window.VSFunnel.track('vault_access_request_success', { page_path: window.location.pathname });
        window.VSFunnel.trackStage('join_access_request', 'success', { page_path: window.location.pathname });
      }
    } catch (error) {
      document.getElementById('vault-request-error').style.display = 'block';
      button.disabled = false;
      button.textContent = 'Request Access →';
      showFeedback('bad', 'Request failed', 'Please retry in a moment, or use the contact page if the problem continues.');
      if (typeof gtag === 'function') gtag('event', 'form_error', { form_name: 'vault_access_request', form_location: '/join/', error: error.message || 'unknown' });
      if (window.VSFunnel) {
        window.VSFunnel.track('vault_access_request_error', { page_path: window.location.pathname, error: error.message || 'unknown' });
        window.VSFunnel.trackStage('join_access_request', 'error', { page_path: window.location.pathname, error: error.message || 'unknown' });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadReferrer();
    var form = document.getElementById('vault-request-form');
    if (form) form.addEventListener('submit', submitAccessRequest);
  });
})();
