// portal-cache.js — IndexedDB member profile cache (10-min TTL)
// Exposes window.VSMemberCache: { put(member), get(userId), clear(userId?) }
// Load BEFORE portal-settings.js so init() can pre-render from cache.
(function (window) {
  'use strict';

  var DB_NAME = 'vs-portal';
  var STORE   = 'members';
  var VERSION = 1;
  var TTL_MS  = 10 * 60 * 1000;

  var _db = null;

  function openDb() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = function (e) {
        e.target.result.createObjectStore(STORE, { keyPath: 'userId' });
      };
      req.onsuccess  = function (e) { _db = e.target.result; resolve(_db); };
      req.onerror    = function ()  { reject(req.error); };
      req.onblocked  = function ()  { reject(new Error('IDB blocked')); };
    });
  }

  window.VSMemberCache = {
    // Write (or overwrite) a member entry. Silently swallows errors.
    put: function (member) {
      if (!member || !member._id) return Promise.resolve();
      return openDb().then(function (db) {
        return new Promise(function (resolve) {
          try {
            var tx  = db.transaction(STORE, 'readwrite');
            var req = tx.objectStore(STORE).put({
              userId: member._id,
              member: member,
              ts:     Date.now(),
            });
            tx.oncomplete = resolve;
            tx.onerror    = resolve; // don't reject — cache is best-effort
          } catch (e) { resolve(); }
        });
      }).catch(function () {});
    },

    // Read cached member. Returns member object or null (expired / missing / error).
    get: function (userId) {
      if (!userId) return Promise.resolve(null);
      return openDb().then(function (db) {
        return new Promise(function (resolve) {
          try {
            var tx  = db.transaction(STORE, 'readonly');
            var req = tx.objectStore(STORE).get(userId);
            req.onsuccess = function () {
              var entry = req.result;
              if (!entry || (Date.now() - entry.ts) > TTL_MS) {
                resolve(null);
              } else {
                resolve(entry.member);
              }
            };
            req.onerror = function () { resolve(null); };
          } catch (e) { resolve(null); }
        });
      }).catch(function () { return null; });
    },

    // Clear one user (pass userId) or everything (no args).
    clear: function (userId) {
      return openDb().then(function (db) {
        return new Promise(function (resolve) {
          try {
            var tx    = db.transaction(STORE, 'readwrite');
            var store = tx.objectStore(STORE);
            var req   = userId ? store.delete(userId) : store.clear();
            tx.oncomplete = resolve;
            tx.onerror    = resolve;
          } catch (e) { resolve(); }
        });
      }).catch(function () {});
    },
  };
})(window);
