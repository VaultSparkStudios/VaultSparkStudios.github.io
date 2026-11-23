(function () {
  'use strict';
  const PHRASE = 'DELETE WEBSITE MEMBERSHIP';
  const TABLES = ['vault_members','point_events','challenge_completions','member_achievements','challenge_submissions','game_scores','season_xp','newsletter_preferences','member_newsletter_log','weekly_game_scores','journal_reactions','game_ratings','event_rsvps','poll_votes','fan_art_submissions','fan_art_votes','vault_member_milestones','push_subscriptions','ignis_usage_monthly','ignis_user_memory','treasury_purchases','team_members','teams','desk_comments','member_follows','website_subscriptions','gift_subscriptions','website_project_waitlist'];
  const el = id => document.getElementById(id);
  let busy = false;
  let accepted = null;
  let returnFocus = null;
  async function deadline(task, milliseconds, text) {
    let timer;
    try {
      return await Promise.race([task, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(text)), milliseconds); })]);
    } finally { clearTimeout(timer); }
  }
  function message(text, error, id) {
    const target = el(id || 'account-data-message');
    if (!target) return;
    target.textContent = text;
    target.hidden = !text;
    target.setAttribute('role', error ? 'alert' : 'status');
  }
  async function invoke(body) {
    const sessionResult = await deadline(window.VSSupabase.auth.getSession(), 10000, 'Your sign-in session check took too long. Please retry.');
    const session = sessionResult && sessionResult.data && sessionResult.data.session;
    if (sessionResult.error || !session) throw new Error('Your session is unavailable. Sign in again to continue.');
    const result = await deadline(window.VSSupabase.functions.invoke('account-data', {
      body,
      headers: { Authorization: 'Bearer ' + session.access_token },
    }), body.action === 'status' ? 15000 : 90000, body.action === 'delete'
      ? 'We could not confirm your request before the connection timed out. It may still be processing. Check request status before trying again.'
      : 'Your data request took too long. Please retry the status check or export.');
    if (!result || result.error || !result.data || result.data.error) throw new Error('We could not complete that request. Nothing is confirmed. Please try again.');
    return { data: result.data, user: session.user };
  }
  function validatedJob(job) {
    if (!job || typeof job !== 'object' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.id || '')
      || !['requested','processing','erased','completed'].includes(job.state)
      || !Number.isFinite(Date.parse(job.requested_at || ''))) throw new Error('Your request status could not be verified. Please try again.');
    if (['erased','completed'].includes(job.state) && !Number.isFinite(Date.parse(job.erased_at || ''))
      || job.state === 'completed' && !Number.isFinite(Date.parse(job.completed_at || ''))) throw new Error('Your deletion completion could not be verified. Please check again.');
    return job;
  }
  function describe(job) {
    if (job.state === 'completed') return 'Your scoped website membership data has been removed. A confirmation email was accepted for sending; inbox delivery is not confirmed.';
    if (job.state === 'erased') return 'Your scoped website records have been removed. The confirmation step is still pending and will be retried.';
    return 'Your deletion request was accepted. Processing is still pending; removal is not yet confirmed.';
  }
  function showState(job, error) {
    if (typeof showAuth === 'function') showAuth();
    const panel = el('account-data-state');
    if (!panel) return;
    document.querySelectorAll('#auth-view .auth-panel, #auth-view .auth-tabs').forEach(node => { node.style.display = 'none'; });
    panel.hidden = false;
    panel.dataset.state = job ? job.state : 'unavailable';
    el('account-data-state-title').textContent = job ? 'Your website membership request' : 'Your membership status needs a check';
    message(job ? describe(job) : (error || 'We could not check your website membership status. Retry before continuing.'), !job, 'account-data-state-message');
    el('account-data-reference').textContent = job ? 'Request reference: ' + job.id : '';
    el('account-data-state-retry').textContent = job ? 'Check request status' : 'Retry status check';
    el('account-data-state-title').focus();
  }
  async function allowEnrollment() {
    try {
      const result = await invoke({ action: 'status' });
      if (!Object.prototype.hasOwnProperty.call(result.data, 'job')) throw new Error('Your membership status could not be verified.');
      if (result.data.job === null) return true;
      accepted = validatedJob(result.data.job);
      showState(accepted);
      return false;
    } catch (error) {
      showState(null, error.message || 'We could not check your membership status. Please retry.');
      return false;
    }
  }
  function validateExport(data, uid) {
    if (data.schema_version !== '1.0' || data.complete !== true || data.user_id !== uid
      || !Number.isFinite(Date.parse(data.exported_at || '')) || !data.tables || typeof data.tables !== 'object'
      || !data.table_counts || !Array.isArray(data.media)) throw new Error('Your export was incomplete. No file was downloaded. Please try again.');
    for (const key of TABLES) {
      if (!Array.isArray(data.tables[key]) || !Number.isSafeInteger(data.table_counts[key])
        || data.table_counts[key] !== data.tables[key].length) throw new Error('Your export was incomplete. No file was downloaded. Please try again.');
    }
    return data;
  }
  async function exportData() {
    const button = el('export-data-btn');
    const label = button && button.textContent;
    if (button) { button.disabled = true; button.textContent = 'Preparing your export…'; }
    message('Preparing your website data. Shared Studio identity and other product records are separate.');
    try {
      const result = await invoke({ action: 'export' });
      const data = validateExport(result.data, result.user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      try {
        anchor.href = url;
        anchor.download = 'vaultspark-website-data-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(anchor); anchor.click();
      } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      message('Your website data file is ready. Image originals are linked in the export; shared Studio and other product records are outside this export.');
    } catch (error) { message(error.message || 'Your export could not be prepared. Please try again.', true); }
    finally { if (button) { button.disabled = false; button.textContent = label; } }
  }
  function openDeleteDialog() {
    const dialog = el('account-delete-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') { message('This browser could not open the confirmation. Please use a current browser or contact the Studio.', true); return; }
    returnFocus = document.activeElement;
    el('account-delete-phrase').value = '';
    el('account-delete-confirm').disabled = true;
    message('', false, 'account-delete-error');
    dialog.showModal();
    el('account-delete-phrase').focus();
  }
  async function checkRequestStatus() {
    if (busy) return;
    const dialog = el('account-delete-dialog');
    if (dialog && dialog.open) dialog.close();
    const button = el('account-data-check-btn');
    if (button) button.disabled = true;
    try {
      const result = await invoke({ action: 'status' });
      if (!Object.prototype.hasOwnProperty.call(result.data, 'job')) throw new Error('Your request status could not be verified. Please retry.');
      if (result.data.job === null) message('No accepted website deletion request is recorded. Your membership has not been signed out by this check.');
      else { accepted = validatedJob(result.data.job); showState(accepted); }
    } catch (error) { message(error.message || 'Your request status could not be checked. Please retry.', true); }
    finally { if (button) button.disabled = false; }
  }
  async function submitDelete(event) {
    event.preventDefault();
    if (busy || el('account-delete-phrase').value !== PHRASE) return;
    busy = true;
    accepted = null;
    const button = el('account-delete-confirm');
    button.disabled = true; button.textContent = 'Submitting request…';
    message('', false, 'account-delete-error');
    try {
      const result = await invoke({ action: 'delete', confirmation: PHRASE });
      accepted = validatedJob(result.data.job);
      el('account-delete-dialog').close();
      showState(accepted);
      // The existing bridge delegates logout to Obelisk. Never sign out after a
      // failed/unverified intake, and never replace it with a local-only path.
      if (typeof VSMemberCache !== 'undefined') {
        try { await deadline(VSMemberCache.clear(result.user.id), 5000, 'Local cache cleanup is unavailable.'); } catch (_) { /* local storage availability is not server erasure evidence */ }
      }
      const logout = await deadline(window.VSSupabase.auth.signOut(), 15000, 'Your request was accepted, but secure sign-out could not be confirmed. Retry sign-out below.');
      if (!logout || !Object.prototype.hasOwnProperty.call(logout, 'error') || logout.error) throw new Error('Your request was accepted, but secure sign-out could not be confirmed. Retry sign-out below.');
      message(describe(accepted) + ' You are signed out of this website. Sign in with your retained Studio identity to check again.', false, 'account-data-state-message');
    } catch (error) {
      if (accepted) { showState(accepted); message(error.message, true, 'account-data-state-message'); }
      else message(error.message || 'Your deletion request was not confirmed. Please try again.', true, 'account-delete-error');
    } finally { busy = false; button.textContent = 'Request website deletion'; button.disabled = el('account-delete-phrase').value !== PHRASE; }
  }
  const form = el('account-delete-form');
  if (form) form.addEventListener('submit', submitDelete);
  const phrase = el('account-delete-phrase');
  if (phrase) phrase.addEventListener('input', () => { el('account-delete-confirm').disabled = busy || phrase.value !== PHRASE; });
  ['account-data-check-btn', 'account-delete-check'].forEach(id => { const button = el(id); if (button) button.addEventListener('click', checkRequestStatus); });
  document.querySelectorAll('[data-account-delete-cancel]').forEach(button => button.addEventListener('click', () => { if (!busy) el('account-delete-dialog').close(); }));
  const dialog = el('account-delete-dialog');
  if (dialog) {
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => { if (returnFocus && !accepted) returnFocus.focus(); });
  }
  const retry = el('account-data-state-retry');
  if (retry) retry.addEventListener('click', async () => {
    retry.disabled = true;
    try { if (await allowEnrollment()) window.location.reload(); }
    finally { retry.disabled = false; }
  });
  const logout = el('account-data-state-signout');
  if (logout) logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      const result = await deadline(window.VSSupabase.auth.signOut(), 15000, 'Secure sign-out could not be confirmed. Please retry.');
      if (!result || !Object.prototype.hasOwnProperty.call(result, 'error') || result.error) throw new Error('Secure sign-out could not be confirmed. Please retry.');
      window.location.href = '/';
    } catch (error) { message(error.message, true, 'account-data-state-message'); }
    finally { logout.disabled = false; }
  });
  window.VSAccountData = { exportData, openDeleteDialog, checkRequestStatus, allowEnrollment, validateExport };
}());
