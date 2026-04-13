// VaultSpark Studios — VaultSparked checkout + phase data
// Extracted from inline to satisfy CSP; loaded via <script src defer>

(function () {
  'use strict';

  // ── Public Supabase client (anon, no auth needed for phase reads) ──
  var VSPublic = supabase.createClient(
    'https://fjnpzjjyhnpmunfoycrp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbnB6amp5aG5wbXVuZm95Y3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MDYxOTcsImV4cCI6MjA1ODQ4MjE5N30.kCTCm73J0AeN0-hTlZ98ZEL7kdZ7YbKSnJVt35lGCeQ'
  );

  // ── Toast helper ────────────────────────────────────────────────────
  var _toastTimer = null;
  function showToast(msg) {
    var el = document.getElementById('vs-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
  }

  // ── Load phase data from membership_phases ─────────────────────────
  async function loadPhaseData() {
    try {
      var result = await VSPublic
        .from('membership_phases')
        .select('plan_key, phase, price_label, subscriber_cap, subscriber_count, is_current')
        .eq('is_current', true);

      if (result.error || !result.data) return;

      result.data.forEach(function (row) {
        var spotsLeft = row.subscriber_cap != null
          ? Math.max(0, row.subscriber_cap - row.subscriber_count)
          : null;

        if (row.plan_key === 'vault_sparked') {
          // Price display
          var priceMatch = row.price_label.match(/\$([\d.]+)/);
          if (priceMatch) {
            document.getElementById('sparked-price-display').innerHTML =
              '<sub>$</sub>' + priceMatch[1];
          }
          // Spots label
          var spotsEl = document.getElementById('sparked-spots-label');
          if (spotsEl) {
            if (spotsLeft !== null) {
              spotsEl.innerHTML = '<span style="color:#FFC400;font-weight:700;">Phase ' + row.phase + '</span>'
                + ' — ' + spotsLeft + ' spot' + (spotsLeft === 1 ? '' : 's') + ' left at this price';
            } else {
              spotsEl.innerHTML = '<span style="color:#FFC400;font-weight:700;">Phase ' + row.phase + '</span> — unlimited';
            }
          }
          // Progress bar
          if (row.subscriber_cap != null && row.subscriber_count != null) {
            var pct = Math.min(100, Math.round((row.subscriber_count / row.subscriber_cap) * 100));
            var wrap = document.getElementById('sparked-progress-wrap');
            var fill = document.getElementById('sparked-progress-fill');
            var txt  = document.getElementById('sparked-progress-text');
            var cap  = document.getElementById('sparked-progress-cap');
            if (wrap && fill) {
              wrap.style.display = '';
              setTimeout(function() { fill.style.width = pct + '%'; }, 80);
              if (txt) txt.textContent = row.subscriber_count + ' of ' + row.subscriber_cap + ' spots filled';
              if (cap) cap.textContent = pct + '%';
            }
          }
        }

        if (row.plan_key === 'vault_sparked_pro') {
          var priceMatch2 = row.price_label.match(/\$([\d.]+)/);
          if (priceMatch2) {
            document.getElementById('pro-price-display').innerHTML =
              '<sub>$</sub>' + priceMatch2[1];
          }
          var proSpotsEl = document.getElementById('pro-spots-label');
          if (proSpotsEl) {
            if (spotsLeft !== null) {
              proSpotsEl.innerHTML = '<span style="color:#a855f7;font-weight:700;">Phase ' + row.phase + '</span>'
                + ' — ' + spotsLeft + ' spot' + (spotsLeft === 1 ? '' : 's') + ' left at this price';
            } else {
              proSpotsEl.innerHTML = '<span style="color:#a855f7;font-weight:700;">Phase ' + row.phase + '</span> — unlimited';
            }
          }
          // Progress bar
          if (row.subscriber_cap != null && row.subscriber_count != null) {
            var pct2 = Math.min(100, Math.round((row.subscriber_count / row.subscriber_cap) * 100));
            var wrap2 = document.getElementById('pro-progress-wrap');
            var fill2 = document.getElementById('pro-progress-fill');
            var txt2  = document.getElementById('pro-progress-text');
            var cap2  = document.getElementById('pro-progress-cap');
            if (wrap2 && fill2) {
              wrap2.style.display = '';
              setTimeout(function() { fill2.style.width = pct2 + '%'; }, 80);
              if (txt2) txt2.textContent = row.subscriber_count + ' of ' + row.subscriber_cap + ' spots filled';
              if (cap2) cap2.textContent = pct2 + '%';
            }
          }
        }
      });
    } catch (err) {
      // Silently degrade — static fallback prices already in HTML
      console.warn('[VaultSparked] phase data load failed:', err);
      var sparkedSpotsEl = document.getElementById('sparked-spots-label');
      var proSpotsEl2 = document.getElementById('pro-spots-label');
      if (sparkedSpotsEl) sparkedSpotsEl.textContent = 'Phase 1 — Limited spots';
      if (proSpotsEl2) proSpotsEl2.textContent = 'Phase 1 — Limited spots';
    }
  }

  // ── Checkout helpers ────────────────────────────────────────────────
  function getAuthClient() {
    if (typeof VSSupabase !== 'undefined') return VSSupabase;
    return VSPublic;
  }

  async function startCheckout(plan, promoCode) {
    var btnId = plan === 'vault_sparked_pro' ? 'vaultsparked-pro-upgrade-btn' : 'vaultsparked-upgrade-btn';
    var btn = document.getElementById(btnId);
    var defaultLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Redirecting…'; }

    try {
      var client = getAuthClient();
      var sessionRes = await client.auth.getSession();
      var session = sessionRes && sessionRes.data && sessionRes.data.session;

      if (!session) {
        window.location.href = '/vault-member/?next=' + encodeURIComponent(window.location.href);
        return;
      }

      var body = { plan: plan };
      if (promoCode) body.promo_code = promoCode;

      var res = await client.functions.invoke('create-checkout', {
        headers: { 'Authorization': 'Bearer ' + session.access_token },
        body: body,
      });

      var data = res.data;
      var error = res.error;

      if (error || !data || !data.url) {
        if (data && data.error === 'invalid_promo_code') {
          throw new Error('Promo code not found or expired.');
        }
        throw new Error((error && error.message) || 'Checkout unavailable. Please try again.');
      }

      window.location.href = data.url;

    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = defaultLabel; }
      showToast(err.message || 'Something went wrong. Please try again.');
    }
  }

  // ── Wire up buttons ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    loadPhaseData();

    // VaultSparked checkout button
    var sparkedBtn = document.getElementById('vaultsparked-upgrade-btn');
    if (sparkedBtn) {
      sparkedBtn.addEventListener('click', function () {
        var promoCode = (document.getElementById('sparked-promo-input') || {}).value || '';
        startCheckout('vault_sparked', promoCode.trim() || null);
      });
    }

    // VaultSparked Pro checkout button
    var proBtn = document.getElementById('vaultsparked-pro-upgrade-btn');
    if (proBtn) {
      proBtn.addEventListener('click', function () {
        var promoCode = (document.getElementById('pro-promo-input') || {}).value || '';
        startCheckout('vault_sparked_pro', promoCode.trim() || null);
      });
    }

    // Gift button hover styles (replaces inline onmouseover/onmouseout)
    var giftOpenBtn = document.getElementById('gift-open-btn');
    if (giftOpenBtn) {
      giftOpenBtn.addEventListener('mouseover', function () {
        this.style.borderColor = 'rgba(255,196,0,0.55)';
        this.style.color = 'var(--text)';
      });
      giftOpenBtn.addEventListener('mouseout', function () {
        this.style.borderColor = 'rgba(255,196,0,0.25)';
        this.style.color = 'var(--muted)';
      });
    }

    // Gift checkout modal
    var giftOverlay = document.getElementById('gift-modal-overlay');
    var giftCloseBtn = document.getElementById('gift-modal-close');
    var giftSubmitBtn = document.getElementById('gift-submit-btn');
    var giftEmailInput = document.getElementById('gift-email-input');
    var giftError = document.getElementById('gift-modal-error');

    function openGiftModal() {
      if (giftOverlay) giftOverlay.classList.add('open');
      if (giftEmailInput) giftEmailInput.focus();
    }
    function closeGiftModal() {
      if (giftOverlay) giftOverlay.classList.remove('open');
      if (giftEmailInput) giftEmailInput.value = '';
      if (giftError) giftError.style.display = 'none';
      if (giftSubmitBtn) { giftSubmitBtn.disabled = false; giftSubmitBtn.textContent = 'Send Gift →'; }
    }

    if (giftOpenBtn) giftOpenBtn.addEventListener('click', openGiftModal);
    if (giftCloseBtn) giftCloseBtn.addEventListener('click', closeGiftModal);
    if (giftOverlay) giftOverlay.addEventListener('click', function(e) { if (e.target === giftOverlay) closeGiftModal(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeGiftModal(); });

    if (giftSubmitBtn) {
      giftSubmitBtn.addEventListener('click', async function () {
        var email = giftEmailInput ? giftEmailInput.value.trim() : '';
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          if (giftEmailInput) giftEmailInput.focus();
          return;
        }
        giftSubmitBtn.disabled = true;
        giftSubmitBtn.textContent = 'Processing…';
        if (giftError) giftError.style.display = 'none';

        try {
          var client = getAuthClient();
          var sessionRes = await client.auth.getSession();
          var session = sessionRes && sessionRes.data && sessionRes.data.session;
          if (!session) {
            window.location.href = '/vault-member/?next=' + encodeURIComponent(window.location.href);
            return;
          }
          var res = await client.functions.invoke('create-gift-checkout', {
            headers: { 'Authorization': 'Bearer ' + session.access_token },
            body: { recipient_email: email },
          });
          var data = res.data;
          var error = res.error;
          if (error || !data || !data.url) {
            throw new Error((data && data.error) || (error && error.message) || 'Gift checkout unavailable. Please try again.');
          }
          window.location.href = data.url;
        } catch (err) {
          giftSubmitBtn.disabled = false;
          giftSubmitBtn.textContent = 'Send Gift →';
          if (giftError) { giftError.textContent = err.message || 'Something went wrong.'; giftError.style.display = 'block'; }
        }
      });
    }

    // Smooth scroll for #pricing anchor
    document.querySelectorAll('a[href="#pricing"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var target = document.getElementById('pricing');
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  });

})();
