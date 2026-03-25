/**
 * VaultSpark Studios — Investor Admin Panel JS
 *
 * Only loaded on /investor/admin/index.html.
 * Guards itself by checking window.VSInvestorAuth on investor:ready
 * and additionally verifying the vaultspark admin identity.
 *
 * Requires: supabase-client.js, investor-auth.js, investor-ui.js
 */
(function (window) {
  'use strict';

  const sb = () => window.VSSupabase;
  const UI = () => window.VSInvestorUI;

  // ── Guard: verify admin identity ────────────────────────────────────────────
  async function verifyAdmin(session) {
    const { data: member } = await sb()
      .from('vault_members')
      .select('username_lower')
      .eq('id', session.user.id)
      .maybeSingle();

    return member?.username_lower === 'vaultspark';
  }

  // ── Tab management ───────────────────────────────────────────────────────────
  function initTabs() {
    document.querySelectorAll('.inv-tab').forEach(tab => {
      tab.addEventListener('click', function () {
        const target = this.dataset.tab;
        document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.inv-tab-panel').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(`tab-${target}`)?.classList.add('active');
      });
    });
  }

  // ── Roster ───────────────────────────────────────────────────────────────────
  async function loadRoster() {
    const container = document.getElementById('rosterTable');
    UI().showSkeleton(container, 3, 'row');

    const { data, error } = await sb().rpc('admin_get_all_investors');
    if (error || data?.error) {
      container.innerHTML = `<div class="inv-empty">Error: ${data?.error || error?.message}</div>`;
      return;
    }

    const investors = Array.isArray(data) ? data : [];
    if (investors.length === 0) {
      container.innerHTML = '<div class="inv-empty">No investors added yet.</div>';
      return;
    }

    container.innerHTML = `
      <table class="inv-admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Tier</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Last Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${investors.map(inv => `
            <tr data-investor-id="${UI().escHtml(inv.id)}">
              <td style="color:var(--text); font-weight:500;">${UI().escHtml(inv.display_name)}</td>
              <td>${UI().escHtml(inv.email || '—')}</td>
              <td>${UI().renderTierBadge(inv.tier)}</td>
              <td>${UI().escHtml(inv.entity_type)}</td>
              <td>${UI().formatCurrency(inv.investment_amount)}</td>
              <td>
                <span class="inv-status-dot ${inv.status}"></span>
                ${UI().escHtml(inv.status)}
              </td>
              <td>${UI().formatRelativeTime(inv.last_active)}</td>
              <td>
                <button class="inv-btn inv-btn-sm inv-btn-ghost admin-edit-btn"
                        data-id="${UI().escHtml(inv.id)}"
                        data-investor='${JSON.stringify({
                          id: inv.id,
                          email: inv.email,
                          display_name: inv.display_name,
                          entity_type: inv.entity_type,
                          tier: inv.tier,
                          investment_amount: inv.investment_amount,
                          equity_percentage: inv.equity_percentage,
                          investment_date: inv.investment_date,
                          notes: inv.notes,
                          status: inv.status
                        })}'>
                  Edit
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    // Wire edit buttons
    container.querySelectorAll('.admin-edit-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const inv = JSON.parse(this.dataset.investor);
        openEditModal(inv);
      });
    });
  }

  // ── Load investor activity (for admin view) ──────────────────────────────────
  async function loadAdminActivity(investorId) {
    const container = document.getElementById('adminActivityLog');
    UI().showSkeleton(container, 5, 'row');

    const { data, error } = await sb().rpc('admin_get_investor_activity', {
      p_investor_id: investorId || null,
      p_limit: 100
    });

    if (error || data?.error) {
      container.innerHTML = `<div class="inv-empty">Error loading activity.</div>`;
      return;
    }

    const events = Array.isArray(data) ? data : [];
    if (events.length === 0) {
      container.innerHTML = '<div class="inv-empty">No activity recorded.</div>';
      return;
    }

    container.innerHTML = events.map(e => `
      <div class="inv-activity-row">
        <span class="inv-activity-action" style="min-width:130px;">
          ${UI().escHtml(e.display_name)}
        </span>
        <span class="inv-activity-target">${UI().escHtml(e.action)}</span>
        ${e.target_label
          ? `<span class="inv-activity-target" style="color:var(--dim);">${UI().escHtml(e.target_label)}</span>`
          : ''}
        <span class="inv-activity-time">${UI().formatRelativeTime(e.created_at)}</span>
      </div>`).join('');
  }

  // ── Add / Edit investor modal ────────────────────────────────────────────────
  function openEditModal(existingInvestor) {
    const modal = document.getElementById('investorModal');
    const form  = document.getElementById('investorForm');

    // Reset and populate
    form.reset();
    document.getElementById('modalTitle').textContent =
      existingInvestor ? 'Edit Investor' : 'Add Investor';

    // Only show "create member" checkbox when adding new
    const memberGroup = document.getElementById('createMemberGroup');
    if (memberGroup) memberGroup.style.display = existingInvestor ? 'none' : '';
    document.getElementById('investorId').value =
      existingInvestor?.id || '';

    if (existingInvestor) {
      document.getElementById('investorEmail').value         = existingInvestor.email         || '';
      document.getElementById('investorName').value          = existingInvestor.display_name  || '';
      document.getElementById('investorEntityType').value    = existingInvestor.entity_type   || 'individual';
      document.getElementById('investorTier').value          = existingInvestor.tier           || 'standard';
      document.getElementById('investorAmount').value        = existingInvestor.investment_amount ?? '';
      document.getElementById('investorEquity').value        = existingInvestor.equity_percentage ?? '';
      document.getElementById('investorDate').value          = existingInvestor.investment_date  || '';
      document.getElementById('investorNotes').value         = existingInvestor.notes            || '';
      document.getElementById('investorStatus').value        = existingInvestor.status           || 'active';
    }

    modal.removeAttribute('hidden');
    document.getElementById('investorEmail').focus();
  }

  function closeModal() {
    document.getElementById('investorModal').setAttribute('hidden', '');
  }

  // ── Save investor form ───────────────────────────────────────────────────────
  async function saveInvestor(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('investorSaveBtn');
    const errEl   = document.getElementById('investorFormError');
    errEl.style.display = 'none';
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    const investorId = document.getElementById('investorId').value || null;

    const createMember = !investorId &&
      document.getElementById('investorCreateMember')?.checked === true;

    const { data, error } = await sb().rpc('admin_upsert_investor', {
      p_email:             document.getElementById('investorEmail').value.trim(),
      p_display_name:      document.getElementById('investorName').value.trim(),
      p_entity_type:       document.getElementById('investorEntityType').value,
      p_tier:              document.getElementById('investorTier').value,
      p_investment_amount: parseFloat(document.getElementById('investorAmount').value) || null,
      p_equity_percentage: parseFloat(document.getElementById('investorEquity').value) || null,
      p_investment_date:   document.getElementById('investorDate').value || null,
      p_notes:             document.getElementById('investorNotes').value.trim() || null,
      p_investor_id:       investorId,
      p_create_member:     createMember
    });

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';

    if (error || data?.error) {
      errEl.textContent = data?.error || error?.message || 'An error occurred.';
      errEl.style.display = 'block';
      return;
    }

    // Update status separately if editing
    if (investorId) {
      const newStatus = document.getElementById('investorStatus').value;
      await sb().rpc('admin_set_investor_status', {
        p_investor_id: investorId,
        p_status: newStatus
      });
    }

    closeModal();
    const baseMsg = `Investor ${data.action === 'created' ? 'added' : 'updated'} successfully.`;
    const memberMsg = data.member_created
      ? ` Vault Member account created — handle: @${data.username}`
      : '';
    UI().showToast(baseMsg + memberMsg, 'success');
    loadRoster();
  }

  // ── Post update form ─────────────────────────────────────────────────────────
  async function postUpdate(e) {
    e.preventDefault();

    const btn   = document.getElementById('postUpdateBtn');
    const errEl = document.getElementById('postUpdateError');
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Posting…';

    const title          = document.getElementById('updateTitle').value.trim();
    const body           = document.getElementById('updateBody').value.trim();
    const updateType     = document.getElementById('updateType').value;
    const visibilityTier = document.getElementById('updateVisibility').value;
    const publish        = document.getElementById('updatePublish').checked;

    if (!title || !body) {
      errEl.textContent = 'Title and body are required.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Post Update';
      return;
    }

    const { error } = await sb()
      .from('investor_updates')
      .insert({
        title,
        body_html:       body,
        update_type:     updateType,
        visibility_tier: visibilityTier,
        is_published:    publish,
        published_at:    publish ? new Date().toISOString() : null
      });

    btn.disabled = false;
    btn.textContent = 'Post Update';

    if (error) {
      errEl.textContent = error.message;
      errEl.style.display = 'block';
      return;
    }

    document.getElementById('postUpdateForm').reset();
    UI().showToast(`Update ${publish ? 'published' : 'saved as draft'}.`, 'success');
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  window.VSInvestorAdmin = {
    async init(session) {
      const isAdmin = await verifyAdmin(session);
      if (!isAdmin) {
        document.body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;
                      font-family:Inter,sans-serif;color:#b5bfd8;text-align:center;">
            <div>
              <p style="font-size:1.1rem;margin-bottom:1rem;">Access denied.</p>
              <a href="/investor/" style="color:#1FA2FF;">Return to portal</a>
            </div>
          </div>`;
        return;
      }

      initTabs();
      loadRoster();
      loadAdminActivity(null);

      // Modal events
      document.getElementById('addInvestorBtn')?.addEventListener('click', () => openEditModal(null));
      document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);
      document.getElementById('investorForm')?.addEventListener('submit', saveInvestor);
      document.getElementById('postUpdateForm')?.addEventListener('submit', postUpdate);

      // Activity filter
      document.getElementById('activityInvestorFilter')?.addEventListener('change', function () {
        loadAdminActivity(this.value || null);
      });

      // Populate investor filter dropdown
      const { data } = await sb().rpc('admin_get_all_investors');
      const select = document.getElementById('activityInvestorFilter');
      if (Array.isArray(data) && select) {
        data.forEach(inv => {
          const opt = document.createElement('option');
          opt.value = inv.id;
          opt.textContent = inv.display_name;
          select.appendChild(opt);
        });
      }
    }
  };

})(window);
