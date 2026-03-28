// IndexedDB persistence layer for VaultSpark Studio Hub.
// Replaces localStorage for large datasets (score history, achievements, XP)
// to remove the 5MB localStorage ceiling.
//
// Design: async-first with localStorage fallback. All reads/writes are
// non-blocking. Components that need sync access can use the in-memory cache
// populated on init().

const DB_NAME = "vshub";
const DB_VERSION = 1;
const STORES = {
  scoreHistory: "score_history",   // key: "main", value: full history array
  achievements: "achievements",     // key: "main", value: achievements object
  studioXP:    "studio_xp",        // key: "main", value: XP state object
  challenges:  "challenges",        // key: "main", value: active challenges
  general:     "general",           // key: arbitrary, value: any — catch-all
};

let _db = null;
let _ready = false;
const _cache = new Map(); // in-memory mirror for sync reads

/**
 * Opens the IndexedDB database. Creates object stores on first run.
 * Returns a promise that resolves when the DB is ready.
 */
export function initIDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      // Fallback: no IndexedDB available (e.g., some privacy modes)
      _ready = false;
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const storeName of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      }
    };

    request.onsuccess = (event) => {
      _db = event.target.result;
      _ready = true;
      resolve(_db);
    };

    request.onerror = () => {
      _ready = false;
      resolve(null); // graceful fallback
    };
  });
}

/**
 * Returns true if IndexedDB is initialized and available.
 */
export function isIDBReady() {
  return _ready && _db !== null;
}

// ── Core read/write primitives ───────────────────────────────────────────────

function getStore(storeName, mode = "readonly") {
  if (!_db) return null;
  try {
    const tx = _db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  } catch {
    return null;
  }
}

/**
 * Reads a value from IndexedDB by store name and key.
 * Returns the cached in-memory version if available (sync fast path).
 */
export async function idbGet(storeName, key = "main") {
  const cacheKey = `${storeName}:${key}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const store = getStore(storeName);
  if (!store) return null;

  return new Promise((resolve) => {
    const req = store.get(key);
    req.onsuccess = () => {
      const val = req.result ?? null;
      _cache.set(cacheKey, val);
      resolve(val);
    };
    req.onerror = () => resolve(null);
  });
}

/**
 * Writes a value to IndexedDB and updates the in-memory cache.
 */
export async function idbPut(storeName, value, key = "main") {
  const cacheKey = `${storeName}:${key}`;
  _cache.set(cacheKey, value);

  const store = getStore(storeName, "readwrite");
  if (!store) return false;

  return new Promise((resolve) => {
    const req = store.put(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

/**
 * Deletes a key from a store.
 */
export async function idbDelete(storeName, key = "main") {
  _cache.delete(`${storeName}:${key}`);

  const store = getStore(storeName, "readwrite");
  if (!store) return false;

  return new Promise((resolve) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

/**
 * Reads from in-memory cache synchronously. Returns null if not cached.
 * Call after init() + initial idbGet() to populate cache.
 */
export function idbCacheRead(storeName, key = "main") {
  return _cache.get(`${storeName}:${key}`) ?? null;
}

// ── Migration: localStorage → IndexedDB ──────────────────────────────────────

const MIGRATION_KEYS = [
  { lsKey: "vshub_score_history", store: STORES.scoreHistory },
  { lsKey: "vshub_achievements",  store: STORES.achievements },
  { lsKey: "vshub_studio_xp",     store: STORES.studioXP },
  { lsKey: "vshub_active_challenges", store: STORES.challenges },
];

/**
 * Migrates data from localStorage to IndexedDB for large datasets.
 * Only runs once per key (checks for a migration flag).
 * After migration, localStorage copy is kept as fallback but marked migrated.
 */
export async function migrateFromLocalStorage() {
  if (!isIDBReady()) return;

  for (const { lsKey, store } of MIGRATION_KEYS) {
    const migrationFlag = `${lsKey}_idb_migrated`;
    if (localStorage.getItem(migrationFlag)) continue;

    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) { localStorage.setItem(migrationFlag, "1"); continue; }
      const data = JSON.parse(raw);
      await idbPut(store, data);
      localStorage.setItem(migrationFlag, "1");
    } catch {
      // Migration failed — localStorage stays as primary
    }
  }
}

// ── Convenience wrappers for specific stores ─────────────────────────────────

export async function loadScoreHistoryIDB() {
  const data = await idbGet(STORES.scoreHistory);
  return Array.isArray(data) ? data : [];
}

export async function saveScoreHistoryIDB(history) {
  return idbPut(STORES.scoreHistory, history);
}

export async function loadAchievementsIDB() {
  const data = await idbGet(STORES.achievements);
  return data || {};
}

export async function saveAchievementsIDB(achievements) {
  return idbPut(STORES.achievements, achievements);
}

export async function loadStudioXPIDB() {
  const data = await idbGet(STORES.studioXP);
  return data || { totalXP: 0, xpLog: [], dailyBonus: null, weeklyBonus: null };
}

export async function saveStudioXPIDB(xpState) {
  return idbPut(STORES.studioXP, xpState);
}

export async function loadChallengesIDB() {
  const data = await idbGet(STORES.challenges);
  return data || {};
}

export async function saveChallengesIDB(challenges) {
  return idbPut(STORES.challenges, challenges);
}

// ── General key-value store ──────────────────────────────────────────────────

export async function idbGetGeneral(key) {
  return idbGet(STORES.general, key);
}

export async function idbSetGeneral(key, value) {
  return idbPut(STORES.general, value, key);
}

// ── Store names export for direct access ─────────────────────────────────────
export { STORES };
