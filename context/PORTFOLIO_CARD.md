# Portfolio Card

## Snapshot

- Name: VaultSpark Studios Website
- Slug: vaultsparkstudios-website
- Medium: Website + Vault Member portal
- Status: Live
- Stage: Activation push
- Priority: High
- Owner: VaultSpark Studios
- Health: Green
- Last updated: 2026-03-30

## Quick overview

- One-line summary: Public studio HQ and membership system that ties brand, games, rank, points, lore, and gated access together.
- Current focus: Data-contract cleanup, authenticated portal test coverage, Studio OS truth sync, and activation unblock prep.
- Next milestone: Execute the activation runbook for Cloudflare proxy, Supabase auth hardening, VAPID, newsletter secrets, and search verification.
- Launch window: Live now

## Top blockers

- Cloudflare proxy still not enabled, so true HTTP security headers and CDN edge behavior are not fully live.
- VAPID keys and send-push secrets are not configured, so web push remains inactive.
- Newsletter delivery is blocked until `RESEND_API_KEY`, `NEWSLETTER_FROM`, `APP_URL`, and `NEWSLETTER_SECRET` are set.
- Stripe production activation is still blocked on LLC formation.

## Links

- Repo: https://github.com/VaultSparkStudios/VaultSparkStudios.github.io
- Runtime: https://vaultsparkstudios.com/
- Key docs:
  - `context/PROJECT_BRIEF.md`
  - `context/LATEST_HANDOFF.md`
  - `docs/ACTIVATION_RUNBOOK.md`

## Cross-studio value

- Franchise or strategic value: Primary public brand surface and canonical membership layer for the studio.
- Downstream content value: Feeds discovery and conversion for all current and future games, lore drops, investor visibility, and community initiatives.
- Shared systems or dependencies: Supabase auth/data, rank and points economy, Stripe subscription hooks, Discord role sync, Studio Hub status reporting.
