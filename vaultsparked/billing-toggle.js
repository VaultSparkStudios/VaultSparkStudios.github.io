// VaultSpark Studios — Billing period toggle for /vaultsparked/
// Switches pricing display between Monthly and Annual

(function() {
  var btnMonthly = document.getElementById('billing-monthly');
  var btnAnnual  = document.getElementById('billing-annual');
  if (!btnMonthly || !btnAnnual) return;

  var PRICES = {
    sparked: { monthly: '4.99',  annual: '44.99'  },
    pro:     { monthly: '29.99', annual: '269.99' }
  };

  function applyMode(m) {
    if (m === 'monthly') {
      btnMonthly.style.background = 'rgba(255,255,255,0.15)';
      btnMonthly.style.color = '#fff';
      btnAnnual.style.background = 'transparent';
      btnAnnual.style.color = '';
    } else {
      btnAnnual.style.background = 'rgba(255,255,255,0.15)';
      btnAnnual.style.color = '#fff';
      btnMonthly.style.background = 'transparent';
      btnMonthly.style.color = '';
    }

    var sparkedEl       = document.getElementById('sparked-price-display');
    var sparkedPeriodEl = document.getElementById('sparked-period');
    var proEl           = document.getElementById('pro-price-display');
    var proPeriodEl     = document.getElementById('pro-period');

    if (sparkedEl)       sparkedEl.innerHTML     = '<sub>$</sub>' + PRICES.sparked[m];
    if (sparkedPeriodEl) sparkedPeriodEl.textContent = m === 'annual' ? 'per year · save 25%' : 'per month';
    if (proEl)           proEl.innerHTML         = '<sub>$</sub>' + PRICES.pro[m];
    if (proPeriodEl)     proPeriodEl.textContent = m === 'annual' ? 'per year · save 25%' : 'per month';

    // Expose for checkout handler
    window.vssBillingMode = m;
  }

  btnMonthly.addEventListener('click', function() { applyMode('monthly'); });
  btnAnnual.addEventListener('click',  function() { applyMode('annual');  });

  window.vssBillingMode = 'monthly';
})();
