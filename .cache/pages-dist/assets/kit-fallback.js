(function (window) {
  'use strict';

  if (window.VaultKit) return;

  window.VaultKit = {
    wireForm: function () {},
    subscribe: function () {
      return Promise.resolve({ ok: false, error: 'kit_unavailable' });
    }
  };
})(window);
