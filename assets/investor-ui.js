/**
 * VaultSpark Studios — Investor Portal UI Helpers
 *
 * Reusable render functions and utilities for the investor area.
 * No external dependencies beyond the browser.
 */
(function (window) {
  'use strict';

  // ── Formatting ──────────────────────────────────────────────────────────────

  function formatCurrency(amount) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  function formatPercent(value) {
    if (value == null) return '—';
    return parseFloat(value).toFixed(4).replace(/\.?0+$/, '') + '%';
  }

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function formatDateShort(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  function formatRelativeTime(ts) {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'Just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return formatDateShort(ts);
  }

  function formatFileSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  // ── Tier badge ──────────────────────────────────────────────────────────────

  const TIER_META = {
    standard:  { label: 'Standard',  cls: 'tier-standard'  },
    lead:      { label: 'Lead',      cls: 'tier-lead'       },
    strategic: { label: 'Strategic', cls: 'tier-strategic'  }
  };

  function renderTierBadge(tier) {
    const meta = TIER_META[tier] || TIER_META.standard;
    return `<span class="inv-tier-badge ${meta.cls}">${meta.label}</span>`;
  }

  // ── Update type badge ────────────────────────────────────────────────────────

  const UPDATE_TYPE_META = {
    general:    { label: 'General',    cls: 'type-general'    },
    financial:  { label: 'Financial',  cls: 'type-financial'  },
    milestone:  { label: 'Milestone',  cls: 'type-milestone'  },
    product:    { label: 'Product',    cls: 'type-product'    },
    legal:      { label: 'Legal',      cls: 'type-legal'      }
  };

  function renderUpdateTypeBadge(type) {
    const meta = UPDATE_TYPE_META[type] || UPDATE_TYPE_META.general;
    return `<span class="inv-type-badge ${meta.cls}">${meta.label}</span>`;
  }

  // ── Document type label ──────────────────────────────────────────────────────

  const DOC_TYPE_LABELS = {
    pitch_deck:      'Pitch Deck',
    cap_table:       'Cap Table',
    financials:      'Financials',
    legal:           'Legal',
    product_roadmap: 'Roadmap',
    general:         'General'
  };

  function docTypeLabel(type) {
    return DOC_TYPE_LABELS[type] || type;
  }

  // ── Render: update list row ──────────────────────────────────────────────────

  function renderUpdateRow(update) {
    return `
      <div class="inv-update-row" data-id="${escHtml(update.id)}">
        <div class="inv-update-row-meta">
          ${renderUpdateTypeBadge(update.update_type)}
          <span class="inv-update-date">${formatDateShort(update.published_at)}</span>
          ${update.visibility_tier !== 'standard'
            ? `<span class="inv-tier-gate">${update.visibility_tier === 'strategic' ? 'Strategic' : 'Lead'} only</span>`
            : ''}
        </div>
        <div class="inv-update-row-title">${escHtml(update.title)}</div>
        <button class="inv-update-expand-btn" aria-expanded="false"
                data-id="${escHtml(update.id)}">
          Read update <span class="inv-chevron">›</span>
        </button>
        <div class="inv-update-body" hidden></div>
      </div>`;
  }

  // ── Render: document table row ───────────────────────────────────────────────

  function renderDocumentRow(doc) {
    const restricted = doc.visibility_scope !== 'all_investors';
    return `
      <tr class="inv-doc-row" data-id="${escHtml(doc.id)}">
        <td class="inv-doc-title">
          ${escHtml(doc.title)}
          ${restricted ? '<span class="inv-restricted-badge">Restricted</span>' : ''}
        </td>
        <td class="inv-doc-type">${escHtml(docTypeLabel(doc.document_type))}</td>
        <td class="inv-doc-version">${escHtml(doc.version || '—')}</td>
        <td class="inv-doc-date">${formatDateShort(doc.uploaded_at)}</td>
        <td class="inv-doc-size">${formatFileSize(doc.file_size_bytes)}</td>
        <td class="inv-doc-action">
          <button class="inv-btn inv-btn-sm inv-doc-download-btn"
                  data-id="${escHtml(doc.id)}"
                  data-title="${escHtml(doc.title)}">
            Open
          </button>
        </td>
      </tr>`;
  }

  // ── Render: activity row ─────────────────────────────────────────────────────

  const ACTION_LABELS = {
    login:         'Signed in',
    doc_view:      'Opened document',
    doc_download:  'Downloaded document',
    update_read:   'Read update',
    profile_view:  'Viewed profile'
  };

  function renderActivityRow(event) {
    const label = ACTION_LABELS[event.action] || event.action;
    return `
      <div class="inv-activity-row">
        <span class="inv-activity-action">${escHtml(label)}</span>
        ${event.target_label
          ? `<span class="inv-activity-target">${escHtml(event.target_label)}</span>`
          : ''}
        <span class="inv-activity-time">${formatRelativeTime(event.created_at)}</span>
      </div>`;
  }

  // ── Toast ────────────────────────────────────────────────────────────────────

  let _toastTimeout;

  function showToast(message, type) {
    // type: 'info' | 'success' | 'error'
    let el = document.getElementById('inv-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'inv-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = `inv-toast inv-toast-${type || 'info'} inv-toast-visible`;
    clearTimeout(_toastTimeout);
    _toastTimeout = setTimeout(() => {
      el.classList.remove('inv-toast-visible');
    }, 4000);
  }

  // ── Skeleton loader ──────────────────────────────────────────────────────────

  function showSkeleton(container, rows, type) {
    // type: 'row' | 'card'
    let html = '';
    for (let i = 0; i < (rows || 3); i++) {
      if (type === 'card') {
        html += '<div class="inv-skeleton inv-skeleton-card"></div>';
      } else {
        html += '<div class="inv-skeleton inv-skeleton-row"></div>';
      }
    }
    if (container) container.innerHTML = html;
  }

  // ── Utility ──────────────────────────────────────────────────────────────────

  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Expose ───────────────────────────────────────────────────────────────────

  window.VSInvestorUI = {
    formatCurrency,
    formatPercent,
    formatDate,
    formatDateShort,
    formatRelativeTime,
    formatFileSize,
    renderTierBadge,
    renderUpdateTypeBadge,
    renderUpdateRow,
    renderDocumentRow,
    renderActivityRow,
    docTypeLabel,
    showToast,
    showSkeleton,
    escHtml
  };

})(window);
