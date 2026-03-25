# Current State

## Snapshot

- Date: 2026-03-25
- Overall status: Live and active
- Current phase: Post-Phase 10 + SEO/Performance/Security pass complete

## What exists

- systems:
  - Supabase auth (email/password, Google OAuth, Discord OAuth)
  - Vault Member portal (`vault-member/index.html`) — single-file SPA
  - 9-tier rank system with distinct badge colors and Discord role sync
  - Points economy with deduped RPC, XP chip animations, activity feed
  - Referral system (VAULT-USERNAME-XXXX codes)
  - Classified Files library (rank-gated lore with first-read point awards)
  - Vault Challenges + challenge_submissions (submit_challenge RPC)
  - Achievements system (achievements + member_achievements tables, get_my_achievements RPC)
  - Activity Chronicle (day-grouped timeline merging point_events + completions)
  - Discord role sync: assign-discord-role Edge Function + DB webhook on vault_members UPDATE
  - VaultSparked subscription: stripe-webhook Edge Function syncs is_sparked flag → Discord role
  - Beta Key Vault (atomic claims with FOR UPDATE SKIP LOCKED)
  - Web Push Notifications (sw.js + send-push Edge Function — VAPID setup required to activate)
  - Studio Pulse (live Realtime feed of studio updates)
  - Vault Command admin panel (admin-only tab: Signal Broadcast, Key Vault Drop, Classified File Uplink)
  - iOS Shortcut for posting Studio Pulse via REST API (IOS_SHORTCUT_STUDIO_PULSE.md)
  - Stripe subscription integration (checkout, renewal, cancellation, payment failure webhooks)
  - Investor Portal (`/investor-portal/`) — 5-page auth-gated portal with 3-step sign-up wizard
  - Studio Hub — Revenue, Analytics, Member Search tabs added

- public pages:
  - `/` homepage with Organization + WebSite JSON-LD, Twitter Cards, prefetch hints
  - `/games/` + 7 game detail pages with VideoGame + FAQPage + BreadcrumbList JSON-LD
  - `/leaderboards/` — period tabs, sessionStorage cache, rank progress bars
  - `/community/` — events, Discord CTA, fan art gallery
  - `/journal/` + `/journal/archive/` — Signal Log with searchable archive
  - `/ranks/` — all rank tiers with requirements and perks
  - `/member/` — dynamic public profile `?u=username`
  - `/status/` — 6 service health checks, auto-refresh 60s
  - `/search/` — client-side search, `?q=` support

- assets:
  - `assets/style.css` — all badge classes including 9 rank badges
  - `assets/supabase-client.js` — anon key + client init (auth/write flows)
  - `assets/supabase-public.js` — 1 KB lightweight REST helper (anonymous read-only public pages)
  - `assets/web-vitals.js` — LCP, CLS, FCP, TTFB → GA4
  - `assets/cookie-consent.js` — GDPR banner
  - `assets/rank-icons/` — 9 SVG icons
  - `sw.js` v3 — extended pre-cache + stale-while-revalidate for Supabase API
  - `.github/workflows/lighthouse.yml` — Lighthouse CI
  - `.github/workflows/minify.yml` — file-size reporter
  - `supabase/functions/assign-discord-role/index.ts`
  - `supabase/functions/stripe-webhook/index.ts`

- important paths:
  - Main portal: `vault-member/index.html`
  - Investor portal: `investor-portal/` (login, dashboard, updates, documents, message, profile)
  - SQL migrations: `supabase-phase1.sql`, `supabase-admin.sql`, `supabase-vaultsparked-discord.sql`
  - New SQL: `supabase-achievements.sql`, `supabase-challenge-submissions.sql`
  - Build reference: `VAULT_BUILD_ORDER.md`
  - Phase history: `HANDOFF_PHASE6.md`

## In progress

- None. Session committed and pushed to main (commit 649a1d5).

## Blockers

- VAPID keys not yet generated for web push — send-push Edge Function won't deliver until configured. Non-blocking for other features.
- Cloudflare proxy not yet enabled — requires DNS change by user.

## Next 3 moves

1. Enable Cloudflare proxy (DNS → requires user action on registrar)
2. Supabase dashboard: CAPTCHA on auth, session timeout, email enumeration prevention
3. VaultSparked Discord role end-to-end test with Stripe test checkout
