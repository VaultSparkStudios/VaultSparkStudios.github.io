# Latest Handoff — VaultSpark Studios Site

Last updated: 2026-03-24 (session 3 closeout)

## Supabase project
- URL: `https://fjnpzjjyhnpmunfoycrp.supabase.co`
- Anon key: in `assets/supabase-client.js` (live, do not overwrite)
- Schema v1 + v2: both run ✅
- `game_sessions` RLS insert policy: added ✅
- `invite_codes.notes` column: added ✅

## What was completed across all sessions

### Session 1 — Supabase Vault Member auth system
- `assets/supabase-client.js` — shared client, VSGate, VAULT_GATED_APPS registry
- `vault-member/index.html` — full Supabase auth, invite codes, cross-domain redirect
- `supabase-schema.sql` — invite_codes, vault_members, register_with_invite RPC

### Session 2 — Full backend feature set
- Password reset (forgot + set-new panels)
- Google + Discord OAuth (with complete-profile panel for new OAuth users)
- Real vault stats via get_member_stats RPC
- supabase-schema-v2.sql — promogrind_data, vault_events, subscriptions, game_sessions
- Edge Functions: odds/, stripe-webhook/, create-checkout/
- Vault Member Integration Standard in AGENTS.md
- call-of-doodie Tier 2 vault integration
- PromoGrind deployed live at vaultsparkstudios.com/promogrind/

### Session 3 — VaultSparked membership tier
- **VaultSparked badge** — animated gradient border + pulsing spark + shimmer text
  - `.vaultsparked-badge` — full animated version for dashboard profile header
  - `.vaultsparked-badge-sm` — static small version for leaderboards + tool headers
  - CSS in vault-member/index.html `<style>` block
- **VaultSparked upgrade CTA panel** — shown to free members, hidden for subscribers
  - Full perks list, $24.99/mo price, checkout button
  - `VS.startVaultSparkedCheckout()` invokes create-checkout Edge Function with `plan: vault_sparked`
- **Subscription check in showDashboard** — async, shows/hides badge + CTA
- **create-checkout updated** — supports `vault_sparked` (STRIPE_VAULT_SPARKED_PRICE_ID) + legacy `pro`
- **stripe-webhook updated** — reads plan from metadata, writes correct plan to subscriptions table
- **isPro() in PromoGrind** — accepts `vault_sparked` OR `pro` plan
- **Studio Stripe strategy documented** — one account, VaultSparked as primary product, future features fold in

## What is mid-flight / pending external

### Requires LLC formation first
- Stripe live account activation (business verification + EIN + bank account)
- Going live with real payments

### Can do now (test mode)
- Create Stripe account + VaultSparked product ($24.99/month) in test mode
- Set `STRIPE_VAULT_SPARKED_PRICE_ID` + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` as Supabase secrets
- Deploy Edge Functions: `supabase functions deploy create-checkout && supabase functions deploy stripe-webhook`
- Full test checkout flow with card `4242 4242 4242 4242`

### Other pending
- OAuth providers (Google, Discord) — Supabase dashboard → Authentication → Providers
- The Odds API key → `supabase secrets set ODDS_API_KEY=...` → `supabase functions deploy odds`
- Affiliate links in `promogrind/src/books.js`
- VaultSparked small badge on call-of-doodie leaderboard rows
- Monthly newsletter system (Resend + Edge Function cron) — planned, not started

## Stripe setup (when LLC is ready)
1. stripe.com → create account as VaultSpark Studios LLC
2. Products → Add product: **VaultSparked** $24.99/month recurring
3. Webhooks → Add endpoint: `https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/stripe-webhook`
   - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
4. Copy Price ID + Secret key + Webhook signing secret
5. `supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_VAULT_SPARKED_PRICE_ID=price_... STRIPE_WEBHOOK_SECRET=whsec_... APP_URL=https://vaultsparkstudios.com`
6. Redeploy: `supabase functions deploy create-checkout && supabase functions deploy stripe-webhook`

## VaultSparked membership — key decisions
- **Name**: VaultSparked (ties to top rank "The Sparked", unique, ownable)
- **Price**: $24.99/month (founding member rate TBD when Stripe activates)
- **Model**: Additive — every new feature and tool included automatically, no per-product upsell
- **Plan identifier**: `vault_sparked` in subscriptions table (legacy `pro` also treated as active)
- **Free vs paid split**: Core tools/games always free; edge features (Live Scanner, cosmetics, early access) VaultSparked only
- **LLC pending**: Do not activate live Stripe until LLC + EIN obtained

## Auth architecture
- Register: email+password + invite code → register_with_invite RPC
- Login: signInWithPassword() → load vault_members row
- OAuth: signInWithOAuth() → if no vault_members row → complete-profile panel (invite still required)
- Password reset: resetPasswordForEmail() → #type=recovery hash → updateUser()
- Cross-device: Supabase sessions in localStorage; promogrind_data for app data sync

## Key files
- `assets/supabase-client.js` — VAULT_GATED_APPS registry, VSGate, credentials
- `vault-member/index.html` — all auth UI, badge CSS, CTA panel, VS object
- `supabase-schema.sql` + `supabase-schema-v2.sql` — full DB schema
- `supabase/functions/` — odds, stripe-webhook, create-checkout
- `AGENTS.md` — studio-wide Vault Member Integration Standard

## Constraints
- Never commit real Supabase credentials
- Anon key only in browser-facing code
- Service role key only in promogrind/.env.admin (git-ignored)
- VSGate origin validation must not be weakened
- OAuth new users still require invite codes (intentional)
- No live Stripe until LLC formed
