# Latest Handoff — VaultSpark Studios Site

Last updated: 2026-03-24 (session 2 closeout)

## What was completed this session

### Session 1 (earlier): Supabase Vault Member auth system
- `assets/supabase-client.js` — shared Supabase JS client (`window.VSSupabase`), `VSGate` cross-domain redirect helper, `VAULT_GATED_APPS` registry
- `vault-member/index.html` — localStorage auth fully replaced with Supabase; invite code field added; `?next=` redirect handling
- `supabase-schema.sql` — invite_codes, vault_members tables, RLS, `register_with_invite` RPC

### Session 2 (this session): Password reset, OAuth, real stats, full backend features
- **Password reset** (`vault-member/index.html`):
  - "Forgot password?" link on login form
  - `panel-forgot`: requests reset email via `resetPasswordForEmail()`
  - `panel-reset`: set new password via `updateUser({ password })`
  - Init detects `#type=recovery` hash → shows reset panel automatically
- **Google + Discord OAuth** (`vault-member/index.html`):
  - OAuth buttons on both login and register panels
  - `oauthSignIn(provider)` calls `signInWithOAuth()` with redirect back to vault-member
  - New OAuth users without a `vault_members` row → `panel-oauth-complete` (username + invite code)
  - Username pre-filled from OAuth metadata
- **Real vault stats** (`vault-member/index.html`):
  - `showDashboard` now calls `get_member_stats` RPC asynchronously
  - Shows real PromoGrind calculation count + ledger entry count (replaces "Coming Soon" chips)
- **Supabase Edge Functions** (new in `supabase/functions/`):
  - `odds/index.ts` — proxies The Odds API; Pro-gated (checks `subscriptions` table)
  - `stripe-webhook/index.ts` — handles Stripe subscription lifecycle
  - `create-checkout/index.ts` — creates Stripe Checkout sessions
- **supabase-schema-v2.sql**: promogrind_data, vault_events, subscriptions, game_sessions tables + RPCs

## Also completed this session

- **Vault Member Integration Standard** — documented in `AGENTS.md` as studio-wide operating protocol; two tiers (gated tool vs open game); points schedule; per-project checklist
- **call-of-doodie Tier 2 integration** — `_tryAwardVaultPoints()` added to `storage.js`; `game_sessions` RLS insert policy added; call-of-doodie is canonical Tier 2 reference
- **PromoGrind live** — deployed to `vaultsparkstudios.com/promogrind/`; Supabase env vars set as GitHub Actions secrets; auth flow confirmed working end-to-end
- **localhost dev origins** added to `VAULT_GATED_APPS` (ports 5173 + 5174)
- **PromoGrind production URL** corrected to `vaultsparkstudios.com/promogrind`
- **RPC param fixes** — `get_member_stats` field names, `register_with_invite` OAuth call params

## What is mid-flight

- `assets/supabase-client.js` still has placeholder credentials — auth will not work until filled in
- OAuth providers (Google, Discord) must be enabled in Supabase dashboard
- Edge Functions must be deployed and secrets set

## What to do next

1. **Create Supabase project** at supabase.com
2. **SQL Editor** → run `supabase-schema.sql` then `supabase-schema-v2.sql`
3. **Fill credentials**: `assets/supabase-client.js` top-of-file placeholders + `promogrind/.env`
4. **Deploy Edge Functions**:
   ```
   supabase functions deploy odds
   supabase functions deploy stripe-webhook
   supabase functions deploy create-checkout
   ```
5. **Set secrets** in Supabase dashboard → Edge Functions → Secrets:
   - `ODDS_API_KEY` (theoddsapi.com)
   - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` (Stripe)
   - `APP_URL` (e.g. `https://vaultsparkstudios.com/promogrind`)
6. **Configure OAuth** → Supabase → Authentication → Providers → Google + Discord (requires Google Cloud project + Discord dev app)
7. **Stripe webhook** → add endpoint pointing to `https://<project>.supabase.co/functions/v1/stripe-webhook`

## How vault-member → gated tool redirect works

1. Gated tool redirects to `vaultsparkstudios.com/vault-member/?next=<tool-origin>`
2. vault-member shows login + subtitle naming the app
3. After login: `VSGate.redirect(session)` sends tokens to `<tool-origin>/#access_token=...&type=vault_access`
4. Tool's `checkAuth()` picks up tokens, calls `setSession()`, clears hash, renders app

## How to add a new gated tool

1. Add entry to `VAULT_GATED_APPS` in `assets/supabase-client.js`
2. New tool copies `promogrind/src/auth.js` + adds Supabase env vars

## Auth architecture

- **Register**: email+password + invite code → `register_with_invite` RPC (atomic, security definer)
- **Login**: `signInWithPassword()` → load vault_members row
- **OAuth**: `signInWithOAuth()` → if no vault_members row → complete-profile panel (invite still required)
- **Password reset**: `resetPasswordForEmail()` → user clicks email link → `#type=recovery` hash → `updateUser()`
- **Cross-device**: Supabase sessions persist in localStorage; `promogrind_data` table for app data sync

## Files changed this session

- `vault-member/index.html` — password reset + OAuth + real stats (major update)
- `supabase-schema-v2.sql` — NEW
- `supabase/functions/odds/index.ts` — NEW
- `supabase/functions/stripe-webhook/index.ts` — NEW
- `supabase/functions/create-checkout/index.ts` — NEW

## Constraints

- Never commit real Supabase credentials
- `assets/supabase-client.js` uses anon key only (safe for browser)
- Service role key only in `promogrind/.env.admin` (git-ignored)
- `VSGate.getNextUrl()` validates redirects against known origins — do not weaken (open redirect prevention)
- OAuth new users still require invite codes — this is intentional (invite-only access model)
