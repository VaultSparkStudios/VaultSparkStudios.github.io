// Deploy Verify — VaultSpark Studio Hub
// One-click comparison of live site vs repo source.
// Checks CSP, meta tags, script references, and key structural markers.

const LIVE_URL = "https://vaultsparkstudios.com/studio-hub/";
const FETCH_TIMEOUT = 15000;

/**
 * Fetches the live site HTML and compares against known repo expectations.
 * @param {object} repoMeta — { csp, metaTags, scriptPaths } extracted from the repo index.html
 * @returns {Promise<{ status: string, checks: Array<{name, match, live, repo}>, fetchError: string|null }>}
 */
export async function verifyDeploy(repoMeta = {}) {
  const checks = [];
  let fetchError = null;
  let liveHtml = "";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const resp = await fetch(LIVE_URL, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    liveHtml = await resp.text();
  } catch (err) {
    fetchError = err.message || "Failed to fetch live site";
    return { status: "error", checks, fetchError };
  }

  // 1. CSP meta tag
  const liveCSP = extractMeta(liveHtml, "Content-Security-Policy") || extractCSPFromMeta(liveHtml);
  const repoCSP = repoMeta.csp || "";
  checks.push({
    name: "Content-Security-Policy",
    match: normalizeCSP(liveCSP) === normalizeCSP(repoCSP),
    live: truncate(liveCSP || "(none)", 200),
    repo: truncate(repoCSP || "(none)", 200),
  });

  // 2. Supabase anon key meta
  const liveSBKey = extractMeta(liveHtml, "supabase-anon-key");
  const repoSBKey = repoMeta.supabaseAnonKey || "";
  checks.push({
    name: "Supabase anon key",
    match: liveSBKey === repoSBKey || (!liveSBKey && !repoSBKey),
    live: liveSBKey ? `${liveSBKey.slice(0, 20)}…` : "(none)",
    repo: repoSBKey ? `${repoSBKey.slice(0, 20)}…` : "(none)",
  });

  // 3. Title tag
  const liveTitle = (liveHtml.match(/<title[^>]*>(.*?)<\/title>/i) || [])[1] || "(none)";
  const repoTitle = repoMeta.title || "";
  checks.push({
    name: "Page title",
    match: liveTitle.trim() === repoTitle.trim(),
    live: liveTitle,
    repo: repoTitle,
  });

  // 4. Script module count
  const liveScripts = (liveHtml.match(/<script\b[^>]*type\s*=\s*"module"[^>]*>/gi) || []).length;
  const repoScripts = repoMeta.moduleScriptCount || 0;
  checks.push({
    name: "Module scripts",
    match: liveScripts === repoScripts,
    live: String(liveScripts),
    repo: String(repoScripts),
  });

  // 5. Service worker registration
  const liveSW = /navigator\.serviceWorker/.test(liveHtml) || /sw-register/.test(liveHtml);
  checks.push({
    name: "Service Worker registration",
    match: liveSW === true,
    live: liveSW ? "present" : "missing",
    repo: "expected",
  });

  // 6. Manifest link
  const liveManifest = /rel\s*=\s*"manifest"/.test(liveHtml);
  checks.push({
    name: "Manifest link",
    match: liveManifest === true,
    live: liveManifest ? "present" : "missing",
    repo: "expected",
  });

  const allMatch = checks.every((c) => c.match);
  return {
    status: allMatch ? "aligned" : "drift",
    checks,
    fetchError: null,
  };
}

/**
 * Extracts repo metadata from the current index.html DOM (if running in-browser).
 */
export function extractRepoMeta() {
  const meta = {};
  // CSP from meta tag
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  meta.csp = cspMeta?.getAttribute("content") || "";

  // Supabase anon key
  const sbMeta = document.querySelector('meta[name="supabase-anon-key"]');
  meta.supabaseAnonKey = sbMeta?.getAttribute("content") || "";

  // Title
  meta.title = document.title || "";

  // Module script count
  meta.moduleScriptCount = document.querySelectorAll('script[type="module"]').length;

  return meta;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractMeta(html, name) {
  // Try http-equiv first, then name
  const httpEquiv = new RegExp(`<meta[^>]*http-equiv\\s*=\\s*["']${name}["'][^>]*content\\s*=\\s*["']([^"']*)["']`, "i");
  const nameAttr = new RegExp(`<meta[^>]*name\\s*=\\s*["']${name}["'][^>]*content\\s*=\\s*["']([^"']*)["']`, "i");
  return (html.match(httpEquiv) || html.match(nameAttr) || [])[1] || null;
}

function extractCSPFromMeta(html) {
  // Reverse attribute order: content before http-equiv
  const rev = /content\s*=\s*["']([^"']*)["'][^>]*http-equiv\s*=\s*["']Content-Security-Policy["']/i;
  return (html.match(rev) || [])[1] || null;
}

function normalizeCSP(csp) {
  if (!csp) return "";
  return csp.replace(/\s+/g, " ").trim().toLowerCase();
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

/**
 * Renders the deploy verification result as an HTML panel.
 */
export function renderDeployVerifyResult(result) {
  if (!result) return "";

  if (result.fetchError) {
    return `
      <div style="padding:12px; background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.2); border-radius:8px;">
        <div style="font-size:12px; font-weight:700; color:var(--red);">Deploy Verify Failed</div>
        <div style="font-size:11px; color:var(--muted); margin-top:4px;">${result.fetchError}</div>
      </div>`;
  }

  const statusColor = result.status === "aligned" ? "var(--green)" : "var(--gold)";
  const statusLabel = result.status === "aligned" ? "Aligned" : "Drift Detected";

  const rows = result.checks.map((c) => {
    const icon = c.match ? "✓" : "✗";
    const color = c.match ? "var(--green)" : "var(--red)";
    return `
      <div style="display:flex; align-items:flex-start; gap:8px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-size:12px; color:${color}; font-weight:700; min-width:14px;">${icon}</span>
        <div style="flex:1; min-width:0;">
          <div style="font-size:11px; font-weight:600; color:var(--text);">${c.name}</div>
          ${!c.match ? `
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">
              <span style="color:var(--green);">Repo:</span> ${c.repo}<br>
              <span style="color:var(--red);">Live:</span> ${c.live}
            </div>
          ` : ""}
        </div>
      </div>`;
  }).join("");

  const matchCount = result.checks.filter((c) => c.match).length;

  return `
    <div style="padding:14px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.08); border-radius:8px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <span style="font-size:12px; font-weight:700; color:var(--text);">Deploy Verification</span>
        <span style="font-size:11px; font-weight:700; color:${statusColor}; border:1px solid ${statusColor}40; border-radius:999px; padding:1px 8px;">${statusLabel} (${matchCount}/${result.checks.length})</span>
      </div>
      ${rows}
    </div>`;
}
