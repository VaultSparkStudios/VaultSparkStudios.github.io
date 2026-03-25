const SESSION_KEY = "vshub_unlocked";
const SETTINGS_KEY = "vshub_credentials";

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
  const hash = await hashPassword(password);
  const stored = getStoredHash();
  if (hash === stored) {
    sessionStorage.setItem(SESSION_KEY, hash);
    return true;
  }
  return false;
}

export function isPasswordSet() {
  return !!getStoredHash();
}

export function renderGate() {
  return `
    <div id="privacy-gate" style="
      position:fixed; inset:0; z-index:1000;
      background: linear-gradient(145deg, #04070d 0%, #07111d 45%, #03060a 100%);
      display:flex; align-items:center; justify-content:center;
      font-family: 'Plus Jakarta Sans', sans-serif;
    ">
      <div style="
        background: rgba(12,19,31,0.95);
        border: 1px solid rgba(142,181,255,0.14);
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
        <div id="gate-error" style="font-size:12px; color:#f87171; height:18px; margin-bottom:12px;"></div>
        <button id="gate-submit-btn" style="
          width:100%; padding:12px;
          background:rgba(122,231,199,0.15);
          border:1px solid rgba(122,231,199,0.3);
          border-radius:10px; color:#7ae7c7;
          font-family:inherit; font-size:14px; font-weight:700;
          cursor:pointer; transition:background 0.15s;
        ">
          Unlock
        </button>
      </div>
    </div>
  `;
}
