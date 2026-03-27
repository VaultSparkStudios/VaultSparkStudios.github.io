# Task Board

## Now

- [SIL] Portal.js module split (auth / challenges / chronicle / settings) — 4,465+ lines; escalated after 3-session skip [7.5]
- [ ] Run pending SQL migrations: phase46-treasury, phase47-weekly-leaderboard, phase48-seasons-xp, phase49-social-graph [critical path — unlocks session 5 features]
- [ ] Automated E2E Playwright tests — fill existing empty suite with 5–10 smoke tests; CI infra already wired [7.8]
- [ ] Programmatic SEO for leaderboard pages — rank/game-specific static pages for long-tail search [7.0]

## Next (Pending External Action)

- Enable Cloudflare proxy (requires DNS change on registrar — highest-ROI speed/security win) [Score: 10]
- Supabase dashboard settings: CAPTCHA on auth, session timeout, email enumeration prevention [Score: 8.5]
- VAPID key setup: generate keys, set VAPID_PUBLIC_KEY in vault-member/index.html, deploy send-push Edge Function secrets [Score: 9]
- Google Search Console verification — fill in google-site-verification-REPLACE_ME.html + submit sitemap [Score: 6.5]
- VaultSparked Discord role: end-to-end test with Stripe test checkout
- Annual VaultSparked pricing tier (Stripe dashboard + Edge Function update) [Score: 8.5]
- 2FA/MFA for vault members (Supabase TOTP toggle + UI prompt) [Score: 7.5]
- Vault Live dev stream integration — "Live Now" badge on homepage when founder is streaming [Score: 8.8] (no code needed, founder action)
- Community Game Jam / Challenge Events — run a 7-day score competition with existing infra [Score: 7.5] (no code needed, founder action)
- Founder AMA / Q&A live session — monthly, feeds journal + Discord [Score: 6.8] (no code needed, founder action)

## Blocked

- Web push delivery: blocked on VAPID key generation
- True HTTP security headers (CSP, HSTS, X-Content-Type-Options): blocked on Cloudflare or custom server
- VaultSparked subscription production: blocked on LLC formation → Stripe production account

## S-Tier Backlog (Score 9–10)

- [ ] Vault Treasury / Points Marketplace [9.5] ✅ CODED (session 5) — needs SQL migrations run + sitemap entry
- [ ] Game Demo Embeds (Playable) [9.2] — infrastructure shipped (session 5); needs actual game builds from dev
- [ ] Discord Bot with Vault Commands [9.0] — members query rank/stats from Discord; requires external hosting (Node.js bot)
- [ ] Vault Seasons Cross-Game XP [9.0] ✅ CODED (session 5) — needs SQL migrations run

## A-Tier Backlog (Score 7–8.9)

- [x] Vault Dispatch weekly email digest ✅ — infra confirmed active (Resend + Edge Function); monthly cadence live
- [x] Per-game weekly high score leaderboard with reset ✅ CODED (session 5) — needs SQL migration run
- [x] Expand Activity Feed ✅ SHIPPED (session 5) — rank-ups, challenges, game sessions now in feed
- [x] Accessibility: focus ring + aria-live ✅ SHIPPED (session 5)
- [x] Unreleased game pages content fill ✅ SHIPPED (session 5) — Solara, MindFrame, VaultFront, Project Unknown
- [ ] Member Social Graph ✅ CODED (session 5) — follow/unfollow + Following Feed; needs SQL migration run
- [ ] Annual VaultSparked pricing tier [8.5] — pending LLC + Stripe production
- [ ] Gift subscriptions (Stripe) [6.8] — pending LLC + Stripe production
- [ ] VaultSparked Beta Waitlist for unreleased games [7.0] — gate early beta access behind VaultSparked
- [ ] Vault Referral Milestone Rewards [6.8] — refer 3/10/25 members → unlock badge/access/recognition
- [ ] Game Release Countdown Events [6.5] — live countdown timers to announced release windows on game pages
- [ ] Google Search Console + Bing Webmaster verification + sitemap submission [6.5]
- [ ] Vault Score Public Leaderboard API [7.5] — expose game scores as embeddable public endpoint
- [ ] Journal post cadence / content calendar [6.5] — one post per week tied to studio updates
- [ ] 2FA/MFA for vault members (Supabase TOTP toggle + UI prompt) [7.5]

## B-Tier Backlog (Score 5–6.9)

- [ ] Monthly investor update email (automated digest) [6]
- [ ] E-sign integration for investor docs [4]
- [ ] Merchandise store [4]
- [ ] Game-specific Discord channels linked from game pages [4]
- [ ] A/B testing infrastructure [3.5]
- [ ] Cap table visualization [3.5]
- [ ] SRI integrity hashes for Supabase CDN [4.5]

## C-Tier Backlog (Score 3–4.9)

- [ ] Vault Map (lore geography explorer) [4.5]
- [ ] Community-created lore submissions [4.5]
- [ ] "Currently playing" badge on member profile [4.5] (note: already exists as of Phase 42)
- [ ] Vault social graph (member connections) [4.8] — now CODED as full follow system (session 5, phase 49)

## Completed — Session 5 Sprint (2026-03-27)

- ✅ Vault Treasury / Points Marketplace — /vault-treasury/index.html + portal panel + supabase-phase46-treasury.sql; 8 seeded items across cosmetic/lore/access/boost categories; purchase_treasury_item RPC with point deduction
- ✅ Vault Seasons Cross-Game XP Integration — supabase-phase48-seasons-xp.sql; triggers on game_scores, challenge_submissions, game_sessions; award_season_xp() RPC; season progress widget in vault portal
- ✅ Per-Game Weekly High Score Leaderboard — supabase-phase47-weekly-leaderboard.sql; Weekly tab on /leaderboards/; game selector pills; reset countdown; submit_weekly_score + get_weekly_leaderboard RPCs
- ✅ Member Social Graph — supabase-phase49-social-graph.sql; member_follows table; follow button on /member/ profiles; Following Feed tab in vault portal; follower/following counts; get_following_feed RPC
- ✅ Game Demo Embed Infrastructure — demo section on call-of-doodie, gridiron-gm, vaultspark-football-gm; responsive iframe slot + "Demo Coming Soon" placeholder state
- ✅ Expand Activity Feed — homepage feed now shows rank-ups, challenge completions, game sessions alongside joins via Promise.allSettled
- ✅ Accessibility: focus ring light-mode fix — body.light-mode :focus-visible outline-color: #1a2040; aria-live on toast + points display in portal
- ✅ Unreleased game pages content — Solara (MMORPG mechanics, factions, stats), MindFrame (cognitive puzzle, adaptive engine, 60 chambers), VaultFront (asymmetric RTS, convoy timing), Project Unknown (classified aesthetic, lore-gated brief)

## Completed — Session 4 (2026-03-27)

- ✅ Terms of Service page — `/terms/index.html`; 14 legal sections; footer link added to all 47 public HTML pages; sitemap entry added
- ✅ "Complete Your Vault" onboarding checklist — `vault-member/index.html`; 5-step panel with progress bar
- ✅ Live Activity Feed on homepage — `index.html`; `#vault-signal-section`; XSS-safe; hero member count updated
- ✅ Simplify fixes: XSS esc() applied to username/rank_title innerHTML, double-fetch eliminated

## Completed — Phase 43 (2026-03-25)

- ✅ Co-op teams — create/join/leave/disband; team leaderboard tab on /leaderboards/
- **SQL needed:** supabase-phase43-teams.sql

## Completed — Phase 42 (2026-03-25)

- ✅ Currently playing badge on member profile card

## Completed — Phase 41 (2026-03-25)

- ✅ Fan art voting — heart/like buttons; live vote count; optimistic UI
- **SQL needed:** supabase-phase41-fan-art-votes.sql

## Completed — Phase 40 (2026-03-25)

- ✅ Fan art submission form + gallery + moderation in Vault Command
- **SQL needed:** supabase-phase40-fan-art.sql

## Completed — Phase 39 (2026-03-25)

- ✅ WebP conversion — darth-spike images; `<picture>` elements updated

## Completed — Phase 38 (2026-03-25)

- ✅ Supabase query batching — `get_member_bootstrap` RPC
- **SQL needed:** supabase-phase38-bootstrap.sql

## Completed — Phase 37 (2026-03-25)

- ✅ Per-page OG image generation — 14 branded 1200×630 PNGs via sharp + GitHub Action

## Completed — Phase 36 (2026-03-25)

- ✅ Game session recording on all 3 game pages; session milestone awards
- **SQL needed:** supabase-phase36-game-sessions.sql

## Completed — Phase 35 (2026-03-25)

- ✅ "Who Runs The Vault" team section; gift points panel; RLS audit; SQL migrations consolidated

## Completed — Phase 34 (2026-03-25)

- ✅ Investor data room access log; rate limiting on invite code claims

## Completed — Phase 33 (2026-03-25)

- ✅ Lighthouse CI score gate; axe-core accessibility audit in CI; Community event RSVP

## Completed — Phase 32 (2026-03-25)

- ✅ Year corrections (all dates updated to 2026); game rating widget on all 3 released game pages

## Completed — Phase 31 (2026-03-25)

- ✅ Journal post view count (journal_views table, session-based dedup)

## Completed — Phase 30 (2026-03-25)

- ✅ Sitemap auto-generation GitHub Action; game update changelogs on game pages

## Completed — Phase 29 (2026-03-25)

- ✅ Profile themes / card backgrounds — 5 rank-unlockable themes

## Completed — Phase 28 (2026-03-25)

- ✅ Dark/light mode toggle — injected into 39 public HTML files

## Completed — Phase 27 (2026-03-25)

- ✅ Vault Command: scheduled broadcast

## Completed — Phase 22–26 (2026-03-25)

- ✅ VaultSparked perks landing page; custom 404; Supabase preconnect hints; public changelog; sticky CTA bar; game screenshots/trailer embed slots; new members ticker; graceful degradation; games hub genre filtering; member spotlight; rank comparison; referral QR code; login activity heatmap; anniversary award; weekly XP recap

## Completed — Phase 10–21 (2026-03-25)

- ✅ Full portal, investor portal, community, journal, leaderboards, SEO, PWA, service worker, dark mode, game ratings, achievements, challenges, Discord role sync, Stripe, web push UI, and all core systems
