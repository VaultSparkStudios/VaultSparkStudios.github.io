/*
 * Neutral age screen for Vault Member profile completion.
 *
 * Asks for birth month and year, with no hint of the answer that passes, and
 * checks the result in the browser. The date is never sent or stored. A visitor
 * who is too young is told only that an account cannot be created now, and the
 * refusal is remembered on this device for a day so the form cannot simply be
 * re-submitted with a different date.
 *
 * The minimum age matches the Terms of Service (13).
 */
(function (root) {
  'use strict';

  var MIN_AGE = 13;
  var MAX_AGE = 120;
  var BLOCK_KEY = 'vs_age_screen_block';
  var BLOCK_MS = 24 * 60 * 60 * 1000;

  /**
   * Whole years of age, from a birth month and year. The day is unknown, so a
   * birthday in the current month is treated as not yet reached.
   */
  function ageFrom(year, month, now) {
    var today = now || new Date();
    var age = today.getFullYear() - year;
    if (today.getMonth() + 1 <= month) age -= 1;
    return age;
  }

  /** → { ok: true } | { ok: false, reason: 'incomplete' | 'invalid' | 'under-age' } */
  function evaluate(yearValue, monthValue, now) {
    if (yearValue === '' || monthValue === '' || yearValue == null || monthValue == null) {
      return { ok: false, reason: 'incomplete' };
    }
    var year = Number(yearValue);
    var month = Number(monthValue);
    var today = now || new Date();
    var thisYear = today.getFullYear();
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12
      || year > thisYear || year < thisYear - MAX_AGE
      || (year === thisYear && month > today.getMonth() + 1)) {
      return { ok: false, reason: 'invalid' };
    }
    return ageFrom(year, month, today) >= MIN_AGE ? { ok: true } : { ok: false, reason: 'under-age' };
  }

  function storage() {
    try { return root.localStorage || null; } catch (_) { return null; }
  }

  function isBlocked(now) {
    var store = storage();
    if (!store) return false;
    try {
      var until = Number(store.getItem(BLOCK_KEY) || 0);
      if (!until) return false;
      if ((now || Date.now()) < until) return true;
      store.removeItem(BLOCK_KEY);
    } catch (_) { /* storage unavailable: no remembered refusal */ }
    return false;
  }

  function block(now) {
    var store = storage();
    if (!store) return;
    try { store.setItem(BLOCK_KEY, String((now || Date.now()) + BLOCK_MS)); } catch (_) { /* best effort */ }
  }

  /** Fill the year list once: newest first, with no year pre-selected. */
  function populateYears(select, now) {
    if (!select || select.options.length > 1) return;
    var thisYear = (now || new Date()).getFullYear();
    for (var y = thisYear; y >= thisYear - MAX_AGE; y -= 1) {
      var option = root.document.createElement('option');
      option.value = String(y);
      option.textContent = String(y);
      select.appendChild(option);
    }
  }

  var api = {
    MIN_AGE: MIN_AGE,
    BLOCK_KEY: BLOCK_KEY,
    ageFrom: ageFrom,
    evaluate: evaluate,
    isBlocked: isBlocked,
    block: block,
    populateYears: populateYears,
    /** Read the two selects and decide. Remembers an under-age answer. */
    check: function (yearSelect, monthSelect) {
      if (isBlocked()) return { ok: false, reason: 'under-age' };
      var result = evaluate(yearSelect ? yearSelect.value : '', monthSelect ? monthSelect.value : '');
      if (!result.ok && result.reason === 'under-age') block();
      return result;
    },
    message: function (reason) {
      if (reason === 'incomplete') return 'Please choose the month and year you were born.';
      if (reason === 'invalid') return 'That date does not look right. Please check the month and year.';
      return 'Sorry, we cannot create a Vault Member account for you right now.';
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.VSAgeScreen = api;
    if (root.document) {
      var ready = function () { populateYears(root.document.getElementById('oauth-birth-year')); };
      if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', ready, { once: true });
      else ready();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
