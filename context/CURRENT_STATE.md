# Current State

## Snapshot

- Date: 2026-03-25
- Overall status: Live and active
- Current phase: Phase 11 complete + mobile responsiveness pass complete

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
  - Vault Command admin panel (admin-only: Signal Broadcast, Key Vault Drop, Classified File Uplink)
  - Stripe subscription integration (checkout, renewal, cancellation, payment failure webhooks)
  - Investor Portal (`/investor-portal/`) — 5-page auth-gated portal with 3-step sign-up wizard
  - Studio Hub — Revenue, Analytics, Member Search tabs
  - Sentry error tracking (DSN live on homepage, vault-member, investor portal)

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

- mobile responsiveness: FULLY AUDITED AND FIXED (2026-03-25)
  - All pages pass 320px / 480px / 768px / 1024px breakpoints
  - Tables scroll horizontally on mobile
  - Nav, modals, overlays, filter pills all work on phone
  - 44px tap targets on all interactive elements
  - Protocol: re-audit on every major update

- assets:
  - `assets/style.css` — all badge classes, 4-tier responsive breakpoints (1100/980/768/640px)
  - `assets/investor-theme.css` — investor portal responsive styles
  - `assets/supabase-client.js` — anon key + client init (auth/write flows)
  - `assets/supabase-public.js` — 1 KB lightweight REST helper (anonymous read-only public pages)
  - `assets/web-vitals.js` — LCP, CLS, FCP, TTFB → GA4
  - `assets/cookie-consent.js` — GDPR banner
  - `assets/rank-icons/` — 9 SVG icons
  - `sw.js` v3 — extended pre-cache + stale-while-revalidate for Supabase API
  - `.github/workflows/lighthouse.yml` — Lighthouse CI
  - `.github/workflows/minify.yml` — file-size reporter

- SQL migrations (all run):
  - `supabase-phase11.sql` — streak, challenge categories, achievement progress ✅
  - `supabase-journal-reactions.sql` — journal_reactions table + RLS ✅

## In progress

- None. Session committed and pushed (59aa07b).

## Blockers

- VAPID keys not yet generated for web push
- Cloudflare proxy not yet enabled — requires DNS change

## Next 3 moves

1. Enable Cloudflare proxy (DNS → requires user action on registrar)
2. Supabase dashboard: CAPTCHA on auth, session timeout, email enumeration prevention
3. Start next feature session — top candidates: individual journal post pages [9], PWA install prompt [9], community polls [8.5], points history chart [8.5]
