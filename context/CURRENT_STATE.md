# Current State

## Snapshot

- Date: 2026-03-25
- Overall status: Live and active
- Current phase: Phase 11 complete (feature expansion — 12 features shipped)

## What exists

- systems:
  - Supabase auth (email/password, Google OAuth, Discord OAuth)
  - Vault Member portal (`vault-member/index.html`) — single-file SPA
  - 9-tier rank system with distinct badge colors and Discord role sync
  - Points economy with deduped RPC, XP chip animations, activity feed
  - Daily login bonus + streak system (streak_count, last_login_date columns)
  - Referral system (VAULT-USERNAME-XXXX codes) + /join/ landing page
  - Classified Files library (rank-gated lore with first-read point awards)
  - Vault Challenges + challenge_submissions + category/expires_at columns
  - Achievements system + achievement progress bars (progress_max column)
  - Activity Chronicle (day-grouped timeline merging point_events + completions)
  - In-portal notification center (🔔 bell, Studio Pulse feed, realtime sub)
  - 5-step onboarding tour for new members
  - Vault Member card social sharing (Web Share API + Twitter + Copy Link)
  - Discord role sync: assign-discord-role Edge Function + DB webhook on vault_members UPDATE
  - VaultSparked subscription: stripe-webhook Edge Function syncs is_sparked flag → Discord role
  - Beta Key Vault (atomic claims with FOR UPDATE SKIP LOCKED)
  - Web Push Notifications (sw.js + send-push Edge Function — VAPID setup required to activate)
  - Studio Pulse (live Realtime feed of studio updates)
  - Vault Command admin panel (admin-only tab: Signal Broadcast, Key Vault Drop, Classified File Uplink)
  - Stripe subscription integration (checkout, renewal, cancellation, payment failure webhooks)
  - Investor Portal (`/investor-portal/`) — 5-page auth-gated portal with 3-step sign-up wizard
  - Studio Hub — Revenue, Analytics, Member Search tabs
  - Sentry error tracking (DSN placeholder in homepage, vault-member, investor portal)

- public pages:
  - `/` homepage with live member count, Organization + WebSite JSON-LD, Twitter Cards
  - `/games/` + 7 game detail pages with VideoGame + FAQPage + BreadcrumbList JSON-LD
  - `/leaderboards/` — Global + Football GM + Call of Doodie tabs, period filters
  - `/community/` — events, Discord CTA, fan art gallery
  - `/journal/` + `/journal/archive/` — Signal Log with emoji reactions (🔥❤️🎮⚡)
  - `/ranks/` — all rank tiers with requirements and perks
  - `/member/` — public profile with achievements, activity, founding badge, share button
  - `/join/` — referral landing page (?ref=username shows referrer rank/avatar)
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

- SQL migrations (all in repo root):
  - `supabase-phase11.sql` — streak, challenge categories, achievement progress (NEEDS RUNNING)
  - `supabase-journal-reactions.sql` — journal_reactions table + RLS (NEEDS RUNNING)
  - `supabase-achievements.sql`, `supabase-challenge-submissions.sql` (previously run)
  - Phase history: `supabase-phase1.sql` through `supabase-phase9-10.sql`

## In progress

- None. Session committed to main (commit d1c8794).

## Blockers

- VAPID keys not yet generated for web push — send-push Edge Function won't deliver until configured.
- Cloudflare proxy not yet enabled — requires DNS change by user.
- supabase-phase11.sql not yet run — streak/categories/progress features need DB columns.
- supabase-journal-reactions.sql not yet run — journal reactions table doesn't exist yet.
- Sentry DSN placeholder not yet replaced — search SENTRY_DSN_PLACEHOLDER in 3 files.

## Next 3 moves

1. Run `supabase-phase11.sql` + `supabase-journal-reactions.sql` in Supabase SQL editor
2. Replace `SENTRY_DSN_PLACEHOLDER` in index.html, vault-member/index.html, investor-portal/index.html
3. `git push` to deploy

Then:
4. Enable Cloudflare proxy (DNS → requires user action on registrar)
5. Supabase dashboard: CAPTCHA on auth, session timeout, email enumeration prevention
6. VAPID keys → activate web push notifications
