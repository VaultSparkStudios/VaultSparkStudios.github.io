# Current State

## Snapshot

- Date: 2026-03-31
- Overall status: Live and active
- Current phase: Session 17 complete (2026-03-31) — security/truth hardening, Vault Membership status UX, and claim-center rollout

## What exists

- systems:
  - Vault Membership readiness surfaces: `vault-member/index.html` now includes a `Claim Center` dashboard panel for next unlocks/rewards and a `Vault Status` settings block for theme sync, membership tier, Discord linkage, and account-control status
  - VaultSparked pricing truth sync: `/vaultsparked/` metadata now matches the founder-confirmed $24.99/month tier, keeping the public surface aligned with checkout intent
  - Checkout origin hardening: `create-checkout` and `create-gift-checkout` now return origin-scoped CORS headers instead of permissive `*`
  - Anonymous-only Supabase service-worker caching: `sw.js` now caches only unauthenticated `/rest/v1/` reads and skips authenticated/auth/storage traffic
  - Cloudflare header-worker parity upgrade: `cloudflare/security-headers-worker.js` now includes Turnstile allowances and stronger response directives (`frame-src`, `object-src 'none'`, `upgrade-insecure-requests`, CORP, OAC)
  - Portal XSS sink cleanup: Discord OAuth failure UI now appends a text node instead of concatenating `error.message` through `innerHTML`
  - Authenticated portal coverage expansion: Playwright authenticated smoke tests now assert the new Claim Center and Vault Status surfaces
  - Account-backed theme persistence: `assets/theme-toggle.js` now saves `vs_theme` locally and mirrors signed-in choices to `vault_members.prefs.site_theme`; device preference wins locally, account preference hydrates new devices when no local override exists
  - Vault Member theme parity: `vault-member/index.html` now loads the shared theme picker, and newsletter preference saves preserve extra `prefs` keys instead of wiping stored site-theme data
  - Signal Log repair: `/journal/` tag filter row now spans the layout correctly, entries no longer drift to the far right, sidebar blocks are sticky on desktop, and share/reaction controls now honor shared theme tokens
  - Legal/IP notice expansion: privacy and terms pages now use theme-aware headers, accurately describe account + browser-stored data, and more clearly state trademark, copyright, fan-content, and no-implied-license boundaries
  - Homepage theme parity: hero card, milestone cards, signal-log teaser, and Vault Live offline panel now use shared surface tokens instead of fixed dark card backgrounds
  - Public repo hygiene: root `LATEST_HANDOFF.md` and `IOS_SHORTCUT_STUDIO_PULSE.md` are now public-safe compatibility stubs; operationally sensitive setup detail was removed from the public repo
  - Generated local metadata cleanup: `supabase/.temp/` removed from version control and ignored going forward
  - Studio OS portfolio metadata: `context/PORTFOLIO_CARD.md` added for Studio Hub / founder-readable status at a glance
  - Activation runbook: `docs/ACTIVATION_RUNBOOK.md` now defines the exact external sequence for Cloudflare proxy, auth hardening, VAPID, newsletter secrets, and search verification
  - Authenticated Playwright portal coverage: env-gated Supabase session seeding for dashboard, challenges pane, and onboarding modal scans
  - Rank-title contract cleanup: leaderboard SDK, leaderboard API generator, newsletter function, and social-graph migration now derive rank title from points instead of assuming a `vault_members.rank_title` column
  - Vault Treasury / Points Marketplace: /vault-treasury/ public page + portal panel; 8 seeded items (cosmetic/lore/access/boost); purchase_treasury_item RPC with point deduction + negative point_events logging (phase46 applied)
  - Per-Game Weekly High Score Leaderboard: Weekly tab on /leaderboards/ with game selector, reset countdown, medals; submit_weekly_score + get_weekly_leaderboard RPCs (phase47 applied)
  - Vault Seasons Cross-Game XP: award_season_xp() RPC; triggers on game_scores (score/100 XP capped 500), challenge_submissions (50 XP), game_sessions (25 XP); season progress widget in portal dashboard (phase48 applied)
  - Member Social Graph: member_follows table; follow/unfollow button on /member/ profiles; Following Feed tab in vault portal; follower/following counts display; get_following_feed RPC (phase49 applied)
  - Game Demo Embeds: demo section on call-of-doodie, gridiron-gm, vaultspark-football-gm; responsive iframe slot + "Demo Coming Soon" placeholder; replace placeholder with iframe src when build ready
  - Game Release Countdowns: live countdown timers on 4 unreleased game pages (VaultFront, Solara, MindFrame, Project Unknown classified); assets/countdown.js widget with prefers-reduced-motion support
  - Vault Score Public Leaderboard API: /api/leaderboard/ docs page + static JSON endpoints (v1/all.json, per-game) + embeddable widget.js; daily GitHub Action refresh
  - Programmatic SEO Member Profiles: scripts/generate-member-seo.mjs generates static /member/{slug}/index.html with JSON-LD Person schema; weekly GitHub Action; member-sitemap.xml
  - axe-core Playwright CI: @axe-core/playwright scans 11 pages for WCAG 2.0/2.1 AA violations; parallel CI job in accessibility.yml
  - Activity Feed (expanded): homepage vault-signal-section now shows joins + challenge completions + game sessions via Promise.allSettled; type-coded dots (gold=join, blue=challenge, green=game)
  - Accessibility: theme-aware focus outline now follows `--focus-outline` across dark, light, ambient, warm, cool, lava, and high-contrast presets; aria-live="polite" on toast + points display in portal
  - Unreleased game content: Solara (MMORPG factions, economy, 6 feature items, stats grid, Late 2026 target), MindFrame (60 chambers, adaptive engine, competitive mode, Mid 2027 target), VaultFront (asymmetric RTS, convoy timing, 6 feature items, stats grid, Summer 2026 closed beta), Project Unknown (classified aesthetic maintained, Rift Scout rank required for brief)
  - Supabase auth (email/password, Google OAuth, Discord OAuth)
  - Vault Member portal (`vault-member/index.html`) — single-file SPA
  - 9-tier rank system with distinct badge colors and Discord role sync
  - Points economy with deduped RPC, XP chip animations, activity feed
  - Daily login bonus + streak system (streak_count, last_login_date)
  - Referral system (VAULT-USERNAME-XXXX codes) + /join/ landing page
  - Classified Files library (rank-gated lore with first-read point awards, search, bookmarks, reading progress)
  - Vault Challenges + challenge_submissions + category/expires_at + difficulty tiers + challenge streaks
  - Achievements system + achievement progress bars (progress_max column)
  - Activity Chronicle (day-grouped timeline merging point_events + completions, heatmap, weekly XP recap)
  - In-portal notification center (🔔 bell, Studio Pulse feed, realtime sub)
  - 5-step onboarding tour for new members (DB-persisted via onboarding_completed)
  - Vault Member card social sharing (Web Share API + Twitter + Copy Link)
  - Discord role sync: assign-discord-role Edge Function + DB webhook on vault_members UPDATE
  - VaultSparked subscription: stripe-webhook Edge Function syncs is_sparked flag → Discord role
  - Beta Key Vault (atomic claims with FOR UPDATE SKIP LOCKED)
  - Web Push Notifications (sw.js + send-push Edge Function — VAPID setup required to activate)
  - Studio Pulse (live Realtime feed of studio updates, scheduled broadcast)
  - Vault Command admin panel (Signal Broadcast + schedule, Key Vault Drop, Classified File Uplink, Fan Art moderation, challenge analytics, member CSV export)
  - Stripe subscription integration (checkout, renewal, cancellation, payment failure webhooks)
  - Investor Portal (`/investor-portal/`) — 5-page auth-gated portal with 3-step sign-up wizard
  - Studio Hub — Revenue, Analytics, Member Search tabs
  - Sentry error tracking (DSN live on homepage, vault-member, investor portal)
  - Co-op Teams: teams + team_members tables, accrue_team_points trigger, team roster/panel, team leaderboard tab
  - Fan Art: submission form, gallery, voting (fan_art_submissions, fan_art_votes), Storage bucket fan-art
  - Game Sessions: recording on all 3 game pages, milestone awards at 5/10/25 sessions per game
  - Game Score API: game_scores table, submit_game_score RPC, assets/vault-score.js SDK
  - Season Pass: seasons + battle_pass_tiers + season_xp tables; Season 1 "Vault Ignition" seeded (9 tiers, ends 2026-06-30)
  - Member Newsletter: send-member-newsletter Edge Function (Resend), newsletter_preferences + member_newsletter_log, monthly cron (2nd of month)
  - Community polls: polls + poll_votes tables, poll tab in portal, preview on /community/
  - Member Directory: /members/ page with rank filter + search
  - Game Ratings: 5-star widget on all 3 released game pages (game_ratings table, AggregateRating JSON-LD)
  - Journal Views: view count on all individual post pages (journal_views table)
  - Gift Points: member-to-member gifting panel in portal
  - Login heatmap: 12-week GitHub-style grid in Chronicle tab
  - Annual anniversary award + weekly XP recap banner
  - Profile themes: 5 rank-unlockable card backgrounds
  - Shared theme system: nav theme picker with 7 presets (dark default + light, ambient, warm, cool, lava, high contrast), persisted in `localStorage`; global shell surfaces now read shared theme variables
  - Rank Comparison panel + Member Spotlight panel
  - PWA install prompt (assets/pwa-install.js)
  - Investor KPI sparklines + "Ask a question" feature + data room access log

- public pages:
  - `/` homepage with live member count, latest journal teaser, JSON-LD, Twitter Cards
  - `/games/` + 7 game detail pages with VideoGame + FAQPage + BreadcrumbList JSON-LD, game ratings
  - `/leaderboards/` — Global + Football GM + Call of Doodie + Challenge + Referral + Team tabs
  - `/community/` — events, Discord CTA, fan art gallery, polls preview, recently joined, new members ticker
  - `/journal/` + `/journal/archive/` — Signal Log with emoji reactions, tag filter, pin, reading time
  - Individual journal post pages (/journal/studio-os-public/, /journal/first-sparks/, /journal/vault-opened/ + 7 more)
  - `/ranks/` — all rank tiers with requirements and perks
  - `/member/` — public profile with achievements, activity, founding badge, currently-playing badge, share
  - `/members/` — member directory with rank filter pills + search
  - `/join/` — referral landing page (?ref=username shows referrer rank/avatar)
  - `/status/` — 6 service health checks, auto-refresh 60s
  - `/search/` — client-side search, `?q=` support
  - `/changelog/` — public changelog timeline
  - `/vaultsparked/` — VaultSparked perks page with pricing
  - `/universe/` + `/universe/dreadspike/` — IP lore pages

- mobile responsiveness: FULLY AUDITED AND FIXED (2026-03-27)
  - All pages pass 320px / 480px / 768px / 1024px breakpoints
  - Tables scroll horizontally on mobile
  - Nav: hamburger opens full-screen overlay; dropdowns collapsed by default with tap-to-toggle accordion; caret arrows rotate; all 6 top-level items visible immediately
  - 44px tap targets on all interactive elements
  - Protocol: re-audit on every major update

- assets:
  - `assets/style.css` — all badge classes, 4-tier responsive breakpoints (1100/980/768/640px), shared theme tokens for page chrome + mobile nav
  - `assets/investor-theme.css` — investor portal responsive styles
  - `assets/supabase-client.js` — anon key + client init (auth/write flows)
  - `assets/supabase-public.js` — 1 KB lightweight REST helper (anonymous read-only public pages)
  - `assets/web-vitals.js` — LCP, CLS, FCP, TTFB → GA4
  - `assets/cookie-consent.js` — GDPR banner
  - `assets/theme-toggle.js` — multi-theme selector with local persistence, account sync for signed-in members, and theme-color meta updates
  - `assets/pwa-install.js` — beforeinstallprompt handler
  - `assets/vault-cta.js` — sticky "Join the Vault" bar
  - `assets/vault-score.js` — game score submission SDK
  - `assets/countdown.js` — release countdown timer widget (data-countdown-target)
  - `assets/rank-icons/` — 9 SVG icons
  - `sw.js` v3 — extended pre-cache + stale-while-revalidate for Supabase API
  - `.github/workflows/lighthouse.yml` — Lighthouse CI
  - `.github/workflows/minify.yml` — file-size reporter
  - `.github/workflows/accessibility.yml` — axe-core CI
  - `.github/workflows/sitemap.yml` — auto-generated sitemap on push
  - `.github/workflows/og-images.yml` — OG image generation via sharp
  - `.github/workflows/send-member-newsletter.yml` — monthly newsletter cron
  - `.github/workflows/member-seo.yml` — weekly member profile SEO page generation
  - `.github/workflows/leaderboard-api.yml` — daily leaderboard JSON API generation
  - `scripts/generate-member-seo.mjs` — member profile static page generator
  - `scripts/generate-leaderboard-api.mjs` — leaderboard API JSON generator
  - `api/leaderboard/v1/widget.js` — embeddable leaderboard widget

- SQL migrations (run status):
  - All Phases 1–35 migrations: ✅ (consolidated in supabase-phase35-migrations.sql)
  - supabase-phase36-game-sessions.sql: ✅ needed / status unknown
  - supabase-phase38-bootstrap.sql: ✅ needed
  - Phases 40–50: ✅ applied via db-migrate Action on 2026-03-28

## In progress

- Activation runbook execution remains the primary external blocker track: Cloudflare proxy, auth hardening, newsletter secrets, VAPID, and search verification
- Theme/browser verification still needs an authenticated E2E pass for account-backed theme sync and the new Claim Center / Vault Status surfaces once stable vault test credentials are available
- Cloudflare response-header verification is still pending until the production proxy step in the activation runbook is complete

## Blockers

- VAPID keys not yet generated (web push 100% blocked)
- Cloudflare proxy not yet enabled — requires DNS change on registrar
- LLC not formed → Stripe production account not set up → VaultSparked subscription untestable
- RESEND_API_KEY not set → newsletter Edge Function cannot send

## Next 3 moves

1. Execute `docs/ACTIVATION_RUNBOOK.md` in order — Cloudflare proxy, Supabase auth hardening, newsletter secrets, VAPID, and search verification
2. Add browser-level coverage for account-backed theme sync, Claim Center / Vault Status rendering, and journal/layout theme regression protection
3. End-to-end test VaultSparked Discord role with Stripe test checkout once billing prerequisites are ready
