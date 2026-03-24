/**
 * VaultSpark Studios — Kit (ConvertKit) Newsletter Integration
 * Public API key is intentionally embedded (read: subscribe-only, no account access)
 */
(function(window) {
  'use strict';

  const KIT_API  = 'W_hMqTl0Ze9x-JHEfqm8Sg';
  const TAG_IDS  = {
    'studio-updates':   17824260,
    'lore-dispatches':  17824261,
    'early-vault-access': 17824263,
  };
  const ALL_TAGS = Object.values(TAG_IDS);

  /**
   * Subscribe an email to one or more Kit tags.
   * @param {string} email
   * @param {number[]} tagIds  — defaults to all three tags
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function subscribe(email, tagIds) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return { ok: false, error: 'Invalid email address.' };
    }

    const ids = (tagIds && tagIds.length) ? tagIds : ALL_TAGS;

    try {
      const results = await Promise.all(
        ids.map(tagId =>
          fetch(`https://api.convertkit.com/v3/tags/${tagId}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: KIT_API, email: email.trim().toLowerCase() }),
          }).then(r => r.json())
        )
      );

      // Kit returns { subscription: {...} } on success
      const allOk = results.every(r => r.subscription || r.subscriber);
      if (!allOk) {
        const err = results.find(r => r.errors)?.errors?.[0] || 'Subscription failed.';
        return { ok: false, error: err };
      }

      // Also store locally for offline/demo use
      try {
        const stored = JSON.parse(localStorage.getItem('vs_subscribers') || '[]');
        if (!stored.includes(email.toLowerCase())) {
          stored.push(email.trim().toLowerCase());
          localStorage.setItem('vs_subscribers', JSON.stringify(stored));
        }
      } catch (_) {}

      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Network error — please try again.' };
    }
  }

  /**
   * Wire a simple email capture form.
   *
   * @param {string} formId       — form element ID
   * @param {string} successId    — success message element ID
   * @param {number[]} [tagIds]   — Kit tag IDs to apply (defaults to all three)
   */
  function wireForm(formId, successId, tagIds) {
    const form    = document.getElementById(formId);
    const success = document.getElementById(successId);
    if (!form) return;

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const input  = form.querySelector('input[type="email"]');
      const btn    = form.querySelector('button[type="submit"]');
      const email  = input ? input.value.trim() : '';

      if (!email) { input && input.focus(); return; }

      const originalBtnText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      const result = await subscribe(email, tagIds || ALL_TAGS);

      if (result.ok) {
        form.style.display = 'none';
        if (success) { success.style.display = 'flex'; }
      } else {
        if (btn) { btn.disabled = false; btn.textContent = originalBtnText; }
        // Show inline error
        let errEl = form.querySelector('.kit-error');
        if (!errEl) {
          errEl = document.createElement('p');
          errEl.className = 'kit-error';
          errEl.style.cssText = 'color:#f87171;font-size:.85rem;margin-top:.5rem;';
          form.appendChild(errEl);
        }
        errEl.textContent = result.error;
      }
    });
  }

  // Expose globally
  window.VaultKit = { subscribe, wireForm, TAG_IDS, ALL_TAGS };

})(window);
