# Current State

## Snapshot

- Date: 2026-03-25
- Overall status: Live and active
- Current phase: Post-Phase 10 — all 10 build phases complete; admin panel, 9-tier ranks, VaultSparked Discord role live

## What exists

- systems:
  - Supabase auth (email/password, Google OAuth, Discord OAuth)
  - Vault Member portal (`vault-member/index.html`) — single-file SPA
  - 9-tier rank system with distinct badge colors and Discord role sync
  - Points economy with deduped RPC, XP chip animations, activity feed
  - Referral system (VAULT-USERNAME-XXXX codes)
  - Classified Files library (rank-gated lore with first-read point awards)
  - Vault Challenges (one-time, weekly, monthly with auto-complete on load)
  - Activity Chronicle (day-grouped timeline merging point_events + completions)
  - Discord role sync: assign-discord-role Edge Function + DB webhook on vault_members UPDATE
  - VaultSparked subscription: stripe-webhook Edge Function syncs is_sparked flag → Discord role
  - Beta Key Vault (atomic claims with FOR UPDATE SKIP LOCKED)
  - Web Push Notifications (sw.js + send-push Edge Function — VAPID setup required to activate)
  - Studio Pulse (live Realtime feed of studio updates)
  - Vault Command admin panel (admin-only tab: Signal Broadcast, Key Vault Drop, Classified File Uplink)
  - iOS Shortcut for posting Studio Pulse via REST API (IOS_SHORTCUT_STUDIO_PULSE.md)
  - Stripe subscription integration (checkout, renewal, cancellation, payment failure webhooks)

- assets:
  - `assets/style.css` — all badge classes including 9 rank badges
  - `assets/supabase-client.js` — anon key + client init
  - `assets/rank-icons/` — 9 SVG icons (0-spark-initiate.svg through 8-the-sparked.svg)
  - `supabase/functions/assign-discord-role/index.ts`
  - `supabase/functions/stripe-webhook/index.ts`

- important paths:
  - Main portal: `vault-member/index.html`
  - SQL migrations: `supabase-phase1.sql`, `supabase-admin.sql`, `supabase-vaultsparked-discord.sql`
  - Build reference: `VAULT_BUILD_ORDER.md`
  - Phase history: `HANDOFF_PHASE6.md`

## In progress

- Studio OS migration (adding context/, prompts/, logs/ — in progress this session)

## Blockers

- VAPID keys not yet generated for web push — send-push Edge Function won't deliver until VAPID_PUBLIC_KEY is set in index.html and secrets configured. Non-blocking for other features.

## Next 3 moves

1. Confirm Studio OS files are in place and committed
2. Update studio-ops portfolio registry with this project
3. Test VaultSparked Discord role assignment end-to-end with a real Stripe test checkout
