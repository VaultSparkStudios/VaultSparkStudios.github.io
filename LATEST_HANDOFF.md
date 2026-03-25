# Latest Handoff — VaultSpark Studios Site

Last updated: 2026-03-24

## What was completed this session

- **Supabase Vault Member auth system implemented**
  - `assets/supabase-client.js` (new): shared Supabase JS client exposed as `window.VSSupabase`; `VSGate` helper for cross-domain redirects; `VAULT_GATED_APPS` registry for all gated tools
  - `vault-member/index.html`: **major update** — localStorage auth (`VS.register/login/logout`) fully replaced with Supabase auth; invite code field added to register form; `?next=` redirect handling added; footnotes updated to reflect real server-backed auth
  - `supabase-schema.sql` (new): run once in Supabase SQL Editor to create `invite_codes` table, `vault_members` table, RLS policies, and `register_with_invite` RPC

- **Supabase CDN scripts added** to `vault-member/index.html` `<head>`:
  - `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js`
  - `../assets/supabase-client.js`

## What is mid-flight

- `supabase-client.js` has placeholder credentials (`YOUR_SUPABASE_URL`, `YOUR_SUPABASE_ANON_KEY`) — vault-member auth will not work until these are filled in after Supabase project creation

## What to do next

1. Create Supabase project at supabase.com
2. SQL Editor → run `supabase-schema.sql`
3. Settings → API → copy Project URL + anon key
4. Fill in `assets/supabase-client.js` (two placeholders at the top of the file)
5. Also fill in `promogrind/.env` with the same values (prefixed `VITE_`)

## How the VAULT_GATED_APPS registry works

`assets/supabase-client.js` maintains a `VAULT_GATED_APPS` object. Each entry is one Vault-gated tool. The `VSGate.redirect(session)` function sends auth tokens to the registered app after login.

To add a new gated tool:
1. Add an entry to `VAULT_GATED_APPS` in `assets/supabase-client.js`
2. Deploy the new tool with its own `auth.js` (copy from promogrind)

## How vault-member → gated tool redirect works

1. Gated tool redirects to `vaultsparkstudios.com/vault-member/?next=<tool-origin>`
2. vault-member shows login with a subtitle naming the app (e.g. "Sign in to access PromoGrind")
3. After successful login: `VSGate.redirect(session)` sends the user to `<tool-origin>/#access_token=...&refresh_token=...&type=vault_access`
4. The tool's `checkAuth()` picks up the tokens from the hash, calls `supabase.auth.setSession()`, clears the hash, renders the app

## Auth architecture decision

- **Before**: vault-member used localStorage-only auth (a demo hash, NOT production-grade)
- **After**: Supabase manages real email+password auth, sessions, email confirmation
- The localStorage `VS_ACCOUNTS_V2` and `VS_SESSION_V2` keys are now unused — existing localStorage data is inert (not deleted, just ignored)
- The old `VS.exportForBackend()` console helper has been removed (migration is complete)

## Files changed

- `assets/supabase-client.js` — NEW
- `supabase-schema.sql` — NEW
- `vault-member/index.html` — auth JS block replaced; invite code field added; CDN scripts added

## Constraints

- Never commit real Supabase credentials to this repo
- `assets/supabase-client.js` uses the **anon key** only (safe for browser)
- Service role key only goes in `promogrind/.env.admin` (git-ignored, admin CLI use only)
- The `VSGate.getNextUrl()` function validates redirects against known `VAULT_GATED_APPS` origins — do not weaken this check (open redirect prevention)
