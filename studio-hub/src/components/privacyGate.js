const SESSION_KEY  = "vshub_unlocked";
const SETTINGS_KEY = "vshub_credentials";
const FAILS_KEY    = "vshub_gate_fails";
const LOCKOUT_MS   = 10 * 60 * 1000; // 10 minutes
const MAX_FAILS    = 5;
const ACCESS_LOG_KEY = "vshub_access_log";

function loadFails() {
  try { return JSON.parse(localStorage.getItem(FAILS_KEY) || "{}"); } catch { return {}; }
}
function saveFails(f) {
  try { localStorage.setItem(FAILS_KEY, JSON.stringify(f)); } catch {}
}
function isLockedOut() {
  const f = loadFails();
  if (!f.count || f.count < MAX_FAILS) return false;
  return (Date.now() - (f.lastFail || 0)) < LOCKOUT_MS;
}
function getLockoutRemaining() {
  const f = loadFails();
  const elapsed = Date.now() - (f.lastFail || 0);
  return Math.max(0, Math.ceil((LOCKOUT_MS - elapsed) / 60000));
}
function recordFail() {
  const f = loadFails();
  f.count = (f.count || 0) + 1;
  f.lastFail = Date.now();
  saveFails(f);
}
function resetFails() {
  saveFails({});
}
function logAccess(type, detail = "") {
  try {
    const log = JSON.parse(localStorage.getItem(ACCESS_LOG_KEY) || "[]");
    log.push({ ts: Date.now(), type, detail, ua: navigator.userAgent?.slice(0, 80) || "" });
    if (log.length > 200) log.splice(0, log.length - 200);
    localStorage.setItem(ACCESS_LOG_KEY, JSON.stringify(log));
  } catch {}
}
export function loadAccessLog() {
  try { return JSON.parse(localStorage.getItem(ACCESS_LOG_KEY) || "[]"); } catch { return []; }
}

function getStoredHash() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw).hubPasswordHash || "" : "";
  } catch { return ""; }
}

// Simple hash — not cryptographic, just obscures the password in storage
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode("vshub_salt_" + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function setHubPassword(password) {
  if (!password) return;
  const hash = await hashPassword(password);
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const creds = raw ? JSON.parse(raw) : {};
    creds.hubPasswordHash = hash;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(creds));
  } catch {}
}

export async function clearHubPassword() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const creds = raw ? JSON.parse(raw) : {};
    delete creds.hubPasswordHash;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(creds));
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function isUnlocked() {
  const hash = getStoredHash();
  if (!hash) return true; // no password set — open
  return sessionStorage.getItem(SESSION_KEY) === hash;
}

export async function attemptUnlock(password) {
  if (isLockedOut()) return false;
  const hash = await hashPassword(password);
  const stored = getStoredHash();
  if (hash === stored) {
    resetFails();
    sessionStorage.setItem(SESSION_KEY, hash);
    logAccess("unlock_success");
    return true;
  }
  recordFail();
  logAccess("unlock_fail", `attempt ${loadFails().count}`);
  return false;
}
export { isLockedOut, getLockoutRemaining };

export function isPasswordSet() {
  return !!getStoredHash();
}

export function renderGate() {
  const locked = isLockedOut();
  const fails = loadFails();
  const remaining = getLockoutRemaining();
  const attemptsLeft = Math.max(0, MAX_FAILS - (fails.count || 0));
  return `
    <div id="privacy-gate" style="
      position:fixed; inset:0; z-index:1000;
      background: linear-gradient(145deg, #04070d 0%, #07111d 45%, #03060a 100%);
      display:flex; align-items:center; justify-content:center;
      font-family: 'Plus Jakarta Sans', sans-serif;
    ">
      <div style="
        background: rgba(12,19,31,0.95);
        border: 1px solid ${locked ? "rgba(248,113,113,0.3)" : "rgba(142,181,255,0.14)"};
        border-radius: 18px;
        padding: 40px 44px;
        width: 100%;
        max-width: 380px;
        box-shadow: 0 24px 80px rgba(0,0,0,0.6);
        text-align: center;
      ">
        <div style="font-size:13px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#7ae7c7; margin-bottom:6px;">
          VaultSpark Studios
        </div>
        <div style="font-size:20px; font-weight:700; color:#f2f6fb; margin-bottom:6px;">Studio Hub</div>
        <div style="font-size:12px; color:#95a3b7; margin-bottom:28px;">Internal access only</div>

        ${locked ? `
          <div style="background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3); border-radius:10px;
                      padding:16px; margin-bottom:16px;">
            <div style="font-size:13px; font-weight:700; color:#f87171; margin-bottom:6px;">Access Locked</div>
            <div style="font-size:12px; color:#95a3b7;">Too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? "s" : ""}.</div>
          </div>
        ` : `
          <input
            type="password"
            id="gate-password-input"
            placeholder="Enter hub password"
            autofocus
            style="
              width:100%; background:rgba(6,11,18,0.9);
              border:1px solid rgba(142,181,255,0.2);
              border-radius:10px; color:#f2f6fb;
              font-family:inherit; font-size:14px;
              padding:12px 16px; margin-bottom:12px;
              outline:none; text-align:center;
            "
          />
        `}
        <div id="gate-error" style="font-size:12px; color:#f87171; height:18px; margin-bottom:12px;">
          ${!locked && fails.count > 0 ? `${fails.count} failed attempt${fails.count !== 1 ? "s" : ""} — ${attemptsLeft} remaining before lockout` : ""}
        </div>
        <button id="gate-submit-btn" ${locked ? "disabled" : ""} style="
          width:100%; padding:12px;
          background:${locked ? "rgba(248,113,113,0.08)" : "rgba(122,231,199,0.15)"};
          border:1px solid ${locked ? "rgba(248,113,113,0.2)" : "rgba(122,231,199,0.3)"};
          border-radius:10px; color:${locked ? "#f87171" : "#7ae7c7"};
          font-family:inherit; font-size:14px; font-weight:700;
          cursor:${locked ? "not-allowed" : "pointer"}; transition:background 0.15s; opacity:${locked ? "0.6" : "1"};
        ">
          ${locked ? `Locked — ${remaining}m` : "Unlock"}
        </button>
      </div>
    </div>
  `;
}
