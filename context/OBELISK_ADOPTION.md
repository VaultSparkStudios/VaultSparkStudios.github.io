# Obelisk Adoption — VaultSparkStudios.github.io

**Posture:** `phase-1-scaffold-incomplete` (truth-corrected S286, 2026-07-17)
**Co-authoring role:** `implementer` (CANON-022)
**Designer:** vaultspark-studio-hub
**Mechanizer / propagator:** vaultspark-studio-ops

## Current truth

This website and its member/investor portals still authenticate through Supabase. Obelisk files and an edge verification route exist, but the normal user journey does not activate them and the isolated callback does not round-trip into a readable `VSIdentity` session. This is scaffolding, not an integrated identity provider.

Evidence verified S286:

- `assets/identity.js` defaults to `activeProvider = 'supabase'`; no runtime journey calls `VSIdentity.useProvider('obelisk')`.
- Sitewide Sign In / Join links enter `/vault-member/#login` and `#register`, which use Supabase forms.
- Approximately 110 direct `VSSupabase.auth` occurrences remain.
- Callback pages store `{ identityId, expiresAt, capabilities }`; the Obelisk `normalizeSession()` branch requires `{ sub, token }`. The stored callback session therefore normalizes to `null`.
- `scripts/check-obelisk-passport-contract.mjs` checks route/string patterns; it does not execute callback → storage → `getSession()`. Its green result was false assurance about behavior.
- Secrets discovery reports `obelisk.identity.verify` missing `OBELISK_RP_ID`, `OBELISK_RP_NAME`, and `OBELISK_RP_ORIGIN`.
- The Obelisk→Supabase JWT bridge required to preserve `auth.uid()` row-level security and existing UUID foreign keys is not deployed.

## What exists

- Isolated login and callback pages for an Obelisk Passport experiment.
- `/api/obelisk-verify` routing through the Cloudflare Worker with fail-closed verifier behavior.
- A provider abstraction in `assets/identity.js`.
- Static/regex contract coverage proving those files and strings are present.

These are useful foundations. They must not be described as full or functional integration.

## Why it did not finish

The legitimate prerequisites are real: relying-party credentials, verifier readiness, a Supabase JWT/RLS bridge, founder passkey enrollment, and a rollback-tested portal soak. They are not the whole explanation. Prior sessions treated scaffold presence and a regex-green contract as sufficient evidence, did not test the callback/session round-trip, and did not walk the normal Sign In/Join journey. That overstatement let the task look complete while the active provider stayed Supabase.

## Migration gate

Changing auth/security flows requires explicit founder authorization in this repo. After authorization:

- [ ] Align the verified callback payload and `normalizeSession()` contract; add a failing-then-green behavioral round-trip test.
- [ ] Provision RP credentials through the Studio secrets gateway; never commit or print them.
- [ ] Deploy and verify the Obelisk relying-party verifier endpoint.
- [ ] Deploy the canonical Obelisk→Supabase session bridge so existing `auth.uid()` RLS and UUID foreign keys remain valid.
- [ ] Migrate one smaller portal journey to `VSIdentity` and soak it with explicit rollback to Supabase.
- [ ] Enroll the founder account and test login, refresh, logout, recovery, and cross-portal continuity.
- [ ] Move normal Sign In / Join entry points only after the soak is green.
- [ ] Reduce direct `VSSupabase.auth` call sites in measured waves.
- [ ] Require the behavioral activation gate before raising this posture.

## Canonical checks

```bash
node ../vaultspark-studio-ops/scripts/check-secrets.mjs --for obelisk.identity.verify
node ../vaultspark-studio-ops/scripts/ops.mjs blocker-preflight
node scripts/check-obelisk-passport-contract.mjs
```

The last command currently proves scaffold presence only. The pending S286 behavioral gate must replace that limitation.

**References:** `assets/identity.js` · `cloudflare/worker-lib.mjs` · `scripts/check-obelisk-passport-contract.mjs` · CANON-021 / CANON-045
