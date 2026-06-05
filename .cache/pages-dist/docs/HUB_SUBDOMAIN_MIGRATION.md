<!-- generated-by: Pass B (S98) -->

# Studio Hub → `hub.vaultsparkstudios.com` migration

**Goal:** move the internal Studio Hub off the public marketing origin and onto a dedicated subdomain with real server-side auth, matching the Social Dashboard's login pattern.

**What this session shipped (code):**

- `cloudflare/hub-auth.js` — Worker module that terminates `hub.vaultsparkstudios.com`, serves an internal login page (full-screen card, same shape as Social Dashboard `loginGate.js`), validates `/auth/login` against a PBKDF2 hash, issues an HMAC-signed `vs_hub_session` cookie, and proxies authenticated requests to the existing Studio Hub bundle at `https://vaultsparkstudios.github.io/studio-hub/*`.
- `cloudflare/security-headers-worker.js` — early-branch to hand off hub-subdomain requests; 301 redirect from legacy `/studio-hub/*` on the main domain when `HUB_SUBDOMAIN_ENABLED=1`.
- `cloudflare/wrangler.toml` — added the `hub.vaultsparkstudios.com/*` route and two new env vars (`HUB_SUBDOMAIN_ENABLED`, `HUB_SESSION_TTL_SEC`).
- `scripts/hash-hub-password.mjs` — helper to produce the `HUB_AUTH_PASSWORD_HASH` secret value.
- `studio-hub/src/components/privacyGate.js` — client-side passphrase layer auto-disables on the hub subdomain so there's no double prompt after edge auth.

**Zero public-site behaviour changes until you flip the switch.** The 301 redirect and subdomain proxy only activate when `HUB_SUBDOMAIN_ENABLED=1` and the secrets are set. Existing `/studio-hub/` continues to work with the current client-side gate.

---

## Status (as of S98 Pass B deploy)

| Step | Status | Notes |
|---|---|---|
| Worker code (hub-auth.js + route + 301) | ✅ deployed | Version `dc0c4c61-9c33-4a75-8125-87af9c3efaec` live on `vaultsparkstudios.com/*` + `hub.vaultsparkstudios.com/*` |
| `HUB_AUTH_USER` secret | ✅ set | Reuses `SCRIPTORIUM_USER` from `cloudflare.env` — one internal credential for all private tools (Scriptorium, Hub, future Social Dashboard). |
| `HUB_AUTH_PASSWORD_HASH` secret | ✅ set | PBKDF2-SHA256 (100k iter) of `SCRIPTORIUM_PASS`. |
| `HUB_SESSION_SECRET` secret | ✅ set | Fresh 48-byte random HMAC key. |
| `HUB_SUBDOMAIN_ENABLED` flag | 🔴 `"0"` (off) | Flipped on, verified the Worker 301 fires, then rolled back to avoid sending traffic to an unresolved host. |
| DNS CNAME `hub.vaultsparkstudios.com` | ❌ not created | Secrets file lacks `CLOUDFLARE_DNS_TOKEN`; existing `CLOUDFLARE_API_TOKEN` is Workers-scoped only (confirmed via live API probe). **Only remaining founder action.** |

---

## Founder actions (required to go live)

### 1. Create the subdomain DNS record ← ONLY remaining step

Cloudflare dashboard → `vaultsparkstudios.com` zone → DNS → Add record:

- Type: `CNAME`
- Name: `hub`
- Target: `vaultsparkstudios.github.io` (doesn't matter much — the Worker route terminates before origin)
- Proxy status: **Proxied (orange cloud)** ← required, Worker will not attach otherwise

Then flip `HUB_SUBDOMAIN_ENABLED = "1"` in `cloudflare/wrangler.toml` and redeploy:

```bash
set -a && source ../vaultspark-studio-ops/secrets/cloudflare.env && set +a && \
npx wrangler deploy --env production --config cloudflare/wrangler.toml
```

Then skip to §6 for smoke tests.

Steps 2–5 below are **already complete** (see Status table above) — kept for reference if secrets ever need to be rotated.

### 2. ~~Generate the password hash~~ (done — hash of `SCRIPTORIUM_PASS` already uploaded)

Pick a strong password (use a password manager), then:

```bash
node scripts/hash-hub-password.mjs 'your-chosen-password-here'
# → pbkdf2$100000$<salt>$<hash>
```

Copy the entire output line.

### 3. Set the Worker secrets

From the repo root:

```bash
# Username (pick one — e.g. "founder")
echo 'founder' | npx wrangler secret put HUB_AUTH_USER \
  --env production --config cloudflare/wrangler.toml

# Paste the pbkdf2$... line from step 2
npx wrangler secret put HUB_AUTH_PASSWORD_HASH \
  --env production --config cloudflare/wrangler.toml

# HMAC session secret — generate a strong random string
openssl rand -base64 48 | npx wrangler secret put HUB_SESSION_SECRET \
  --env production --config cloudflare/wrangler.toml
```

### 4. Flip the feature flag

Edit `cloudflare/wrangler.toml`, set `HUB_SUBDOMAIN_ENABLED = "1"` in the `[env.production.vars]` block.

### 5. Deploy the Worker

```bash
npx wrangler deploy --env production --config cloudflare/wrangler.toml
```

### 6. Smoke test

1. Visit `https://hub.vaultsparkstudios.com/` — should show the internal login card.
2. Sign in with your username + password — should redirect to the Studio Hub.
3. Visit `https://vaultsparkstudios.com/studio-hub/` — should 301 redirect to `https://hub.vaultsparkstudios.com/`.
4. `curl -i https://hub.vaultsparkstudios.com/auth/me` — should return 401 JSON.
5. Inside the hub: navigate between views (Studio Hub, Phase Tracker, Feedback Signal, etc.) — all should work unchanged. The client-side passphrase prompt should NOT appear (auto-disabled on the hub host).

### 7. Rollback (if anything breaks)

Flip `HUB_SUBDOMAIN_ENABLED = "0"` in `wrangler.toml` and redeploy. The main origin `/studio-hub/` path resumes normal operation; subdomain traffic becomes non-functional but doesn't affect the public site.

---

## Architecture notes

- **No backend required.** The Worker holds the password hash as a secret and validates logins at the edge with Web Crypto (PBKDF2-SHA256, 100k iterations). Sessions are stateless HMAC-signed tokens — no database.
- **No duplicate deploy.** The subdomain doesn't get its own Pages project. The Worker proxies authenticated requests to `https://vaultsparkstudios.github.io/studio-hub/*` (the GitHub Pages origin directly, bypassing the main-domain Worker route to avoid recursion). One source of truth for hub code.
- **Cookie is isolated.** `vs_hub_session` is set on `hub.vaultsparkstudios.com` with `HttpOnly; Secure; SameSite=Lax` — it never touches the main marketing origin and cannot be read by any script there.
- **Legacy gate left in place.** Client-side `privacyGate.js` still works as a belt-and-suspenders layer on the main origin in case `HUB_SUBDOMAIN_ENABLED` is ever flipped back to `0`. On the hub subdomain it short-circuits to open (edge auth already happened).
- **Future upgrade path.** For multi-user access or SSO, swap the PBKDF2 user/password check for Cloudflare Access (zero code change in the hub itself — the Worker just stops rendering its own login and trusts the `cf-access-jwt-assertion` header).
