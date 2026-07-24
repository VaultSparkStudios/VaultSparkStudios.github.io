# Obelisk Adoption — VaultSparkStudios.github.io

**Posture:** `phase-4-public-app-migrated` (S289, 2026-07-20)
**Co-authoring role:** `implementer` (CANON-022)
**Designer / identity authority:** Obelisk (`https://obeliskgate.com`)
**VaultSpark relying party:** `vaultsparkstudios-website`

## Current truth

Obelisk is the sole public authentication and identity authority for the VaultSpark member and investor entry points. VaultSpark no longer asks users to create or enter a Supabase password. VaultSpark continues to own business authorization and product data: member handles, ranks, points, subscriptions, plans, investor applications, investor approvals, and portal roles.

The production contract is:

1. `/login` starts OpenID Connect (OIDC) authorization code with Proof Key for Code Exchange (PKCE), state, and nonce at the Cloudflare edge.
2. `/auth/callback` exchanges the one-time code server-side and verifies the ES256 identity token against Obelisk discovery/JWKS, including issuer, audience, expiry, nonce, subject, and verified email.
3. The Worker stores Obelisk access/refresh tokens only in server-side KV and issues a signed, `HttpOnly`, `Secure`, `SameSite=Lax` VaultSpark session cookie.
4. The verified Obelisk subject is joined to a preserved Supabase Auth UUID in protected `auth.users.app_metadata`. Existing users are matched by verified email; conflicts fail closed; email changes keep the same UUID.
5. The Worker creates a short-lived Supabase compatibility session server-side. Existing `auth.uid()` row-level security and foreign keys therefore continue to protect the same member and investor records.
6. Browser code bootstraps from `/api/auth/session`, clears any browser-only legacy session when the Obelisk edge session is absent, and never puts either provider's bearer tokens in a URL.

## Portal ownership retained

- **Vault Member portal:** profile onboarding still creates the Vault Handle, optional invite credit, Vault Dispatch preference, rank, points, achievements, plan, and dashboard data through the existing VaultSpark schema and RPCs.
- **Investor portal:** applications remain public and site-owned; approval remains a separate VaultSpark authorization. A valid Obelisk identity without an approved investor row cannot enter confidential surfaces.
- **Account security:** passkeys, authenticator codes, recovery, device sessions, and identity receipts are managed at `https://obeliskgate.com/account`.

## Enrollment truth

The relying-party integration is functional for enrolled Obelisk identities. Public self-service enrollment at Obelisk is currently invite-led by the identity provider. The VaultSpark create-account button therefore starts the real Obelisk flow and explains that constraint; it does not fabricate a local account or silently fall back to Supabase passwords. Opening Obelisk enrollment is an Obelisk control-plane decision, not a website auth implementation gap.

## Compatibility and rollback

- `/api/obelisk-verify` remains temporarily as a fail-closed legacy compatibility endpoint, but no normal member or investor journey uses it.
- Static `login.html` and callback files are non-token-processing fallbacks; production routes terminate in the Worker.
- Rollback is a Worker/code redeploy to the previous known-good commit. There is no dual-auth runtime and no database schema migration to reverse.

## Behavioral proof

```bash
node scripts/check-obelisk-passport-contract.mjs --self-test
node scripts/check-obelisk-passport-contract.mjs
node --test tests/obelisk-auth.unit.spec.js
```

The behavioral suite executes a hermetic authorization-code + PKCE callback, ES256 verification, existing-UUID continuity, signed edge session, browser compatibility-session response, and Obelisk-token non-disclosure. Live deployment proof is recorded in the session closeout and release artifacts.

**References:** `cloudflare/obelisk-auth.js` · `assets/supabase-client.js` · `assets/identity.js` · `tests/obelisk-auth.unit.spec.js` · CANON-021 / CANON-045 / CANON-048
