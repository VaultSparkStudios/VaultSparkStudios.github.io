// Gist Cloud Sync (#8)
// Backs up key hub data to the beacon Gist so it survives browser clears / works across devices.
// Stores: score history, forecast log, ledger snapshot, session notes.

const GIST_SYNC_KEYS = [
  "vshub_score_history",
  "vshub_forecast_log",
  "vshub_ledger_snapshot",
  "vshub_hub_notes",
];

export async function pushToGist(token, gistId) {
  if (!token || !gistId) return { ok: false, error: "Token or Gist ID missing" };
  const payload = {};
  for (const key of GIST_SYNC_KEYS) {
    const val = localStorage.getItem(key);
    if (val) payload[key] = val;
  }
  payload["_vshub_sync_ts"] = String(Date.now());
  const files = {};
  files["hub-cloud-sync.json"] = { content: JSON.stringify(payload, null, 2) };
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    });
    if (!res.ok) return { ok: false, error: `GitHub ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function pullFromGist(token, gistId) {
  if (!token || !gistId) return { ok: false, error: "Token or Gist ID missing" };
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return { ok: false, error: `GitHub ${res.status}` };
    const data = await res.json();
    const content = data.files?.["hub-cloud-sync.json"]?.content;
    if (!content) return { ok: false, error: "hub-cloud-sync.json not found in Gist" };
    const payload = JSON.parse(content);
    let restored = 0;
    for (const key of GIST_SYNC_KEYS) {
      if (payload[key]) {
        localStorage.setItem(key, payload[key]);
        restored++;
      }
    }
    return { ok: true, restored, syncedAt: payload["_vshub_sync_ts"] };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
