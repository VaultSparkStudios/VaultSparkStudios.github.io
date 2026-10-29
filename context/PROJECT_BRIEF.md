# Project Brief — VaultSparkStudios.github.io

## What it is

The live public website and studio hub for VaultSpark Studios LLC.
Live at: `https://vaultsparkstudios.com/`
GitHub: `https://github.com/VaultSparkStudios/VaultSparkStudios.github.io`

## Purpose

- Public studio presence: games, projects, studio identity
- Vault Member portal: 9-tier rank system, achievements, challenges, Discord role sync
- VaultSparked membership: existing Stripe-backed plans; current prices and availability are governed by the membership pages and tier contracts.
- Investor portal (gated)
- Universe pages: novel sagas and game lore (DreadSpike → Voidfall pivot)

## Stack

- **Host**: Cloudflare Pages production with explicit, gated promotion; GitHub Pages remains the warm rollback origin. A main push alone does not prove full deployment.
- **Identity + data**: Obelisk unified studio identity with existing Supabase cloud data and edge-function integration; acceptance of affected authenticated journeys is tracked separately.
- **Edge functions**: Supabase cloud functions for existing checkout, webhooks, push and community integrations; no unverified active-function count is asserted.
- **Security**: Cloudflare Worker (`vaultspark-security-headers-production`) — CSP, X-Robots-Tag, HSTS, all 9 headers
- **Payments**: Stripe membership checkout, billing and gifts; this brief does not redefine public prices, tiers or entitlements.
- **Email forms**: Web3Forms
- **Error tracking**: Sentry
- **Web push**: VAPID keys, service worker
- **CI**: GitHub Actions (Playwright compliance + e2e, Lighthouse, axe-core)
- **Staging**: `website.staging.vaultsparkstudios.com` on Hetzner (CANON-007)

## Owner

VaultSpark Studios LLC — `https://vaultsparkstudios.com/`

## Vault Status: SPARKED
