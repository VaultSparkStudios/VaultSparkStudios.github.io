# Project Brief — VaultSparkStudios.github.io

## What it is

The live public website and studio hub for VaultSpark Studios LLC.
Live at: `https://vaultsparkstudios.com/`
GitHub: `https://github.com/VaultSparkStudios/VaultSparkStudios.github.io`

## Purpose

- Public studio presence: games, projects, studio identity
- Vault Member portal: 9-tier rank system, achievements, challenges, Discord role sync
- VaultSparked membership: $4.99–$99.99/mo subscription tiers with Stripe
- Investor portal (gated)
- Universe pages: novel sagas and game lore (DreadSpike → Voidfall pivot)

## Stack

- **Host**: GitHub Pages (static, auto-deploy on push to main)
- **Auth + DB**: Supabase (cloud-hosted at `fjnpzjjyhnpmunfoycrp.supabase.co`)
- **Edge functions**: Supabase Edge Functions (16 ACTIVE) — checkout, webhooks, push, Discord sync, etc.
- **Security**: Cloudflare Worker (`vaultspark-security-headers-production`) — CSP, X-Robots-Tag, HSTS, all 9 headers
- **Payments**: Stripe — VaultSparked ($4.99/$9.99/$14.99/mo) + VaultSparked Eternal ($29.99/$49.99/$99.99/mo)
- **Email forms**: Web3Forms
- **Error tracking**: Sentry
- **Web push**: VAPID keys, service worker
- **CI**: GitHub Actions (Playwright compliance + e2e, Lighthouse, axe-core)
- **Staging**: `website.staging.vaultsparkstudios.com` on Hetzner (CANON-007)

## Owner

VaultSpark Studios LLC — `https://vaultsparkstudios.com/`

## Vault Status: SPARKED
