# Obelisk Adoption — VaultSparkStudios.github.io

**Posture:** `phase-1-passport-bridge` (S259, 2026-07-05)
**Co-authoring role:** `implementer` (CANON-022)
**Designer:** vaultspark-studio-hub
**Mechanizer:** vaultspark-studio-ops
**Propagator:** vaultspark-studio-ops

## Scope

This is the studio's public-facing website + member portal + investor portal. It currently auths the member/investor data plane via Supabase JWT (password + Turnstile + OAuth), while the public Obelisk Passport login/callback bridge is now wired and fail-closed through the Cloudflare Worker. It MUST migrate the data plane to Obelisk identity once `obelisk.identity.verify` capability and the Supabase JWT bridge are live.

## Today's auth surface (S159 inventory)

- **~70 `VSSupabase.auth.*` call sites** across:
  - `vault-member/portal*.js` (8 files: portal.js, portal-auth.js, portal-core.js, portal-settings.js, portal-challenges.js, portal-init.js)
  - `investor-portal/login/index.html`
  - `assets/turnstile.js` (Turnstile session bridging)
- **Edge functions** (Supabase functions/): create-checkout, customer-portal-session, create-gift-checkout, odds, send-member-newsletter — all consume Supabase JWT
- **RLS policies** in `supabase/migrations/` depend on `auth.uid()`
- **Foreign keys**: `vault_members.id` → `auth.users.id`; same for `investor_messages.user_id`, `vault_feedback.user_id`, etc.

## S259 deliverable — Obelisk Passport bridge

**Shipped:** the public Obelisk Passport surface is contract-wired:

- `/login` and `/obelisk-passport/login.html` load the Obelisk auth client with `data-obelisk-return="https://vaultsparkstudios.com/auth/callback"`.
- `/auth/callback.html` and `/obelisk-passport/callback.html` POST the returned `obelisk_session` to `/api/obelisk-verify`.
- `cloudflare/security-headers-worker.js` routes `/api/obelisk-verify` to `verifyObeliskSession()` in `cloudflare/worker-lib.mjs`.
- The Worker verifier fails closed on malformed tokens, missing verifier secret, unreachable upstream, and upstream success without an identity id.
- `assets/identity.js` can now read the minimal verified Obelisk Passport bridge state from `sessionStorage` through `VSIdentity.useProvider('obelisk')`.
- `scripts/check-obelisk-passport-contract.mjs` gates the route/callback/identity/adoption/test wiring in `npm run build:check`.

**Credential truth:** `obelisk` is READY, but `obelisk.identity.verify` is still missing RP keys (`OBELISK_RP_ID`, `OBELISK_RP_NAME`, `OBELISK_RP_ORIGIN`) in the studio secrets audit. The site therefore does not claim a full provider flip; the verifier bridge is wired, tested, and intentionally fails closed until deployment credentials and the Supabase JWT bridge are present.
## S159 deliverable — Obelisk-ready abstraction layer

**Shipped:** `assets/identity.js` exposes `window.VSIdentity` with a provider-agnostic API. Today delegates member/investor data-plane auth to `VSSupabase.auth`; it can also read verified Obelisk Passport bridge state via `VSIdentity.useProvider('obelisk')`.

**API surface:**
- `getSession()`, `signIn()`, `signUp()`, `signOut()`, `signInWithOAuth()`
- `resetPassword()`, `updatePassword()`
- `exchangeCode()`, `setSession()`
- `onChange(cb)`, `capabilities()`, `useProvider(name)`

**Shape contract:** all methods return provider-agnostic shapes (`{ userId, email, displayName, accessToken, expiresAt }`) — no Supabase-specific fields leak. Legacy code that still needs raw Supabase shape can use `session._raw`.

**Migration policy:**
- ✅ NEW code: must use `VSIdentity`, never `VSSupabase.auth` directly.
- ⏳ EXISTING code (~70 call sites): stays on `VSSupabase.auth` until Obelisk Phase 2. Migrate in waves as portals are touched for other reasons (audit-driven, not big-bang).

## Migration risks (when Obelisk Phase 2 ships)

### 🔴 Critical: Supabase RLS depends on `auth.uid()`

Every RLS policy in `supabase/migrations/` reads `auth.uid()`. If Obelisk issues sessions that bypass Supabase JWT, every read/write breaks.

**Mitigation:** Obelisk session → bridge RPC mints a matching Supabase JWT with the same `sub` claim → existing RLS keeps working unchanged. Bridge RPC lives in studio-ops-issued capability `obelisk.identity.verify`. Migration is invisible to RLS.

### 🔴 Critical: `vault_members.id` FK to `auth.users.id`

UUIDs must be preserved across the migration. If Obelisk issues new UUIDs, all member rows orphan.

**Mitigation:** Obelisk user records carry the same UUID as `auth.users.id`. The bridge step at first Obelisk login does:
1. Verify passkey
2. Look up `obelisk_user.email` → `auth.users.id` → reuse
3. Mark `vault_members.obelisk_enrolled_at`

### 🟡 Medium: Turnstile assumption

`assets/turnstile.js` is invoked from every login/signup/reset form. Obelisk passkey login does NOT need Turnstile (passkey is the proof). Policy: `VSIdentity.capabilities().captcha` returns `false` for Obelisk; forms read this and skip Turnstile.

### 🟡 Medium: OAuth flow (Google/GitHub)

Supabase handles OAuth via `signInWithOAuth`. Obelisk Phase 2 may not include OAuth initially. Policy: `VSIdentity.capabilities().oauth` returns `false` for Obelisk; UI hides OAuth buttons when unavailable.

### 🟢 Low: Session persistence

Supabase auto-refreshes JWT and persists in localStorage. Obelisk should follow the same pattern. `VSIdentity.onChange` will fire on token refresh either way.

## Would Phase-0 abstraction break anything today?

**No.** `assets/identity.js` is additive. No existing code path is rewritten. `VSSupabase.auth.*` continues to work identically. The wrapper is purely opt-in for new code.

## Adoption gate

Before flipping the member/investor data plane to `'obelisk'`:
- [x] Public Obelisk Passport login/callback bridge wired and fail-closed
- [x] Worker verifier route covered by unit tests
- [x] Contract gate wired into `npm run build:check`
- [ ] Obelisk relying-party keys present in secrets gateway (`obelisk.identity.verify`)
- [ ] Obelisk `/obelisk/v1/identity/verify` endpoint live for this RP
- [ ] Bridge RPC `mint_supabase_session_from_obelisk(obelisk_jwt)` deployed to Supabase
- [ ] At least 1 portal page migrated to `VSIdentity` for soak (likely `/investor-portal/login/` first — smaller surface)
- [ ] Founder member account enrolled in passkey + tested round-trip
- [ ] Rollback plan: `VSIdentity.useProvider('supabase')` reverts in 1 line

## Inventory script (CANON-021)

```bash
node ../vaultspark-studio-ops/scripts/check-obelisk-posture.mjs
```

Should report this project as `phase-0-declared` once the script reads this file.

---

**References:**
- Full spec: `vaultspark-studio-hub/docs/OBELISK_PROTOCOL_PLAN.md`
- Studio-ops mirror: `vaultspark-studio-ops/docs/OBELISK_PROTOCOL_PLAN.md`
- Canon entry: `vaultspark-studio-ops/docs/STUDIO_CANON.md` → CANON-021
- Implementation: `assets/identity.js`
