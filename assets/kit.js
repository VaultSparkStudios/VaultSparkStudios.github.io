/**
 * VaultSpark Studios — Kit (ConvertKit) Newsletter Integration
 *
 * Public API key is intentionally embedded — subscribe-only, no account access.
 * Supports: tag-based subscribe, tag removal, preference sync, welcome sequence.
 *
 * To enable the welcome sequence:
 *   1. Create a sequence in Kit UI (Sequences → New Sequence)
 *   2. Call VaultKit.setWelcomeSequence(YOUR_SEQUENCE_ID) before any subscribe call
 *      — or set WELCOME_SEQUENCE_ID below once you have it.
 */
(function(window) {
  'use strict';

  const KIT_API = 'W_hMqTl0Ze9x-JHEfqm8Sg';
  const KIT_BASE = 'https://api.convertkit.com/v3';

  const TAG_IDS = {
    'studio-updates':     17824260,
    'lore-dispatches':    17824261,
    'early-vault-access': 17824263,
  };
  const ALL_TAGS = Object.values(TAG_IDS);

  // Set to your Kit sequence ID once you create the welcome sequence in Kit UI.
  // Example: let WELCOME_SEQUENCE_ID = 1234567;
  let WELCOME_SEQUENCE_ID = 2695661;

  // ── Core helpers ───────────────────────────────────────────────────────────

  async function _post(path, body) {
    const res = await fetch(`${KIT_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: KIT_API, ...body }),
    });
    return res.json();
  }

  async function _delete(path) {
    const res = await fetch(`${KIT_BASE}${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: KIT_API }),
    });
    return res.ok;
  }

  async function _get(path) {
    const res = await fetch(`${KIT_BASE}${path}&api_key=${KIT_API}`);
    return res.json();
  }

  // ── Subscriber lookup ──────────────────────────────────────────────────────

  /**
   * Find a Kit subscriber by email.
   * Returns the subscriber object or null.
   */
  async function getSubscriber(email) {
    try {
      const data = await _get(`/subscribers?email_address=${encodeURIComponent(email.trim())}`);
      return data.subscribers?.[0] || null;
    } catch {
      return null;
    }
  }

  // ── Subscribe ──────────────────────────────────────────────────────────────

  /**
   * Subscribe an email to one or more Kit tags.
   * @param {string}   email
   * @param {number[]} [tagIds]  defaults to all three tags
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function subscribe(email, tagIds) {
    email = (email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }

    const ids = (tagIds && tagIds.length) ? tagIds : ALL_TAGS;

    try {
      const results = await Promise.all(
        ids.map(tagId => _post(`/tags/${tagId}/subscribe`, { email }))
      );

      const allOk = results.every(r => r.subscription || r.subscriber);
      if (!allOk) {
        const err = results.find(r => r.errors)?.errors?.[0] || 'Subscription failed.';
        return { ok: false, error: err };
      }

      // Enroll in welcome sequence if configured
      if (WELCOME_SEQUENCE_ID) {
        subscribeToSequence(email, WELCOME_SEQUENCE_ID).catch(() => {});
      }

      // Local fallback store
      _storeLocal(email);

      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error — please try again.' };
    }
  }

  // ── Remove a tag ───────────────────────────────────────────────────────────

  /**
   * Remove a Kit tag from a subscriber by email.
   * Silently no-ops if the subscriber is not found.
   */
  async function removeTag(email, tagId) {
    try {
      const sub = await getSubscriber(email);
      if (!sub) return { ok: false, error: 'Subscriber not found.' };
      const ok = await _delete(`/subscribers/${sub.id}/tags/${tagId}`);
      return { ok };
    } catch {
      return { ok: false, error: 'Network error.' };
    }
  }

  // ── Sync preferences ───────────────────────────────────────────────────────

  /**
   * Add or remove tags based on a preferences object.
   * Call this when dashboard toggles change.
   *
   * @param {string} email
   * @param {{ 'studio-updates': boolean, 'lore-dispatches': boolean, 'early-vault-access': boolean }} prefs
   */
  async function syncPreferences(email, prefs) {
    email = (email || '').trim().toLowerCase();
    if (!email) return { ok: false };

    const ops = Object.entries(prefs).map(([tagName, enabled]) => {
      const tagId = TAG_IDS[tagName];
      if (!tagId) return Promise.resolve();
      return enabled
        ? subscribe(email, [tagId])  // idempotent
        : removeTag(email, tagId);
    });

    try {
      await Promise.all(ops);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  // ── Welcome sequence ───────────────────────────────────────────────────────

  /**
   * Set the Kit sequence ID to enroll new subscribers into.
   * Call this once you have created the welcome sequence in Kit UI.
   *
   * How to get the ID:
   *   Kit dashboard → Sequences → open your sequence → copy the number from the URL
   *   e.g. kit.com/sequences/1234567  →  ID is 1234567
   */
  function setWelcomeSequence(id) {
    WELCOME_SEQUENCE_ID = id;
  }

  /**
   * Subscribe an email to a Kit sequence.
   */
  async function subscribeToSequence(email, sequenceId) {
    try {
      const data = await _post(`/sequences/${sequenceId}/subscribe`, {
        email: email.trim().toLowerCase(),
      });
      return { ok: !!data.subscription };
    } catch {
      return { ok: false };
    }
  }

  // ── Form wiring ────────────────────────────────────────────────────────────

  /**
   * Wire a simple email capture form to Kit.
   *
   * @param {string}   formId     — form element ID
   * @param {string}   successId  — success message element ID
   * @param {number[]} [tagIds]   — Kit tag IDs (defaults to all three)
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

      const originalText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      const result = await subscribe(email, tagIds || ALL_TAGS);

      if (result.ok) {
        form.style.display = 'none';
        if (success) { success.style.display = 'flex'; }
      } else {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
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

  // ── Local fallback ─────────────────────────────────────────────────────────

  function _storeLocal(email) {
    try {
      const stored = JSON.parse(localStorage.getItem('vs_subscribers') || '[]');
      if (!stored.includes(email)) {
        stored.push(email);
        localStorage.setItem('vs_subscribers', JSON.stringify(stored));
      }
    } catch (_) {}
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  window.VaultKit = {
    subscribe,
    removeTag,
    syncPreferences,
    subscribeToSequence,
    setWelcomeSequence,
    getSubscriber,
    wireForm,
    TAG_IDS,
    ALL_TAGS,
  };

})(window);
