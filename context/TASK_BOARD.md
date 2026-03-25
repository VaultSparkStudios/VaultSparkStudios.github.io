# Task Board

## Now

- Nothing active.

## Next (Pending External Action)

- Enable Cloudflare proxy (requires DNS change on registrar — highest-ROI speed/security win) [Score: 10]
- Supabase dashboard settings: CAPTCHA on auth, session timeout, email enumeration prevention [Score: 8.5]
- VAPID key setup: generate keys, set VAPID_PUBLIC_KEY in vault-member/index.html, deploy send-push Edge Function secrets [Score: 9]
- VaultSparked Discord role: end-to-end test with Stripe test checkout
- Annual VaultSparked pricing tier (Stripe dashboard + Edge Function update) [Score: 8.5]
- Email newsletter/digest (requires third-party or Supabase email setup) [Score: 8.8]
- 2FA/MFA for vault members (Supabase TOTP toggle + UI prompt) [Score: 7.5]

## Blocked

- Web push delivery: blocked on VAPID key generation
- True HTTP security headers (CSP, HSTS, X-Content-Type-Options): blocked on Cloudflare or custom server

## S-Tier Backlog (Score 9–10)

- [ ] Individual journal post pages (/journal/[slug]/) [9] — SEO goldmine, each post indexable + shareable
- [ ] PWA install prompt (beforeinstallprompt handler) [9] — manifest.json exists, near-zero effort, app-like retention

## A-Tier Backlog (Score 7–8.9)

- [ ] Community polls (members vote on game features / studio decisions) [8.5] — highest-engagement community mechanic
- [ ] Points history chart (XP over time line graph on dashboard) [8.5] — retention/motivation
- [ ] Game wishlist + "Notify me" for unreleased games [8] — pre-launch email/push capture
- [ ] Challenge streaks (complete same recurring challenge N days running → bonus XP) [8]
- [ ] Lore reading progress (% of archive read, "X of 24 files unlocked") [8]
- [ ] Game-specific challenge + point triggers (Football GM → Vault points) [8]
- [ ] Member directory (/members/) with rank filter + search [7.8]
- [ ] Referral leaderboard ("Top Recruiters" on /leaderboards/) [7.8]
- [ ] Game screenshots + trailer embed on game pages [7.5]
- [ ] Dynamic OG image generation per page [7.5]
- [ ] GDPR: export your data + delete account flows [7.5]
- [ ] security.txt (/.well-known/security.txt) [7] — < 10 lines, signals security maturity
- [ ] Password change + email change in Settings [7]
- [ ] Google Search Console + Bing Webmaster verification + sitemap submission [6.5]
- [ ] Journal tag filtering on main /journal/ page [6.5]
- [ ] WebP/AVIF image audit + conversion [6.5]
- [ ] Graceful degradation on Supabase failure (offline states, error UI) [6.5]
- [ ] Profile themes / card backgrounds (rank-based unlockable styles) [6.5]

## B-Tier Backlog (Score 5–6.9)

- [ ] Gift subscriptions (Stripe) [6.8]
- [ ] Member-to-member point gifting [6.5]
- [ ] Co-op / team challenges [6.5]
- [ ] Bookmark classified files [6.5]
- [ ] Dark/light mode toggle [6.5]
- [ ] Investor portal: KPI trend sparklines (30/60/90-day MRR + member growth) [6.5]
- [ ] Sitemap auto-generation (GitHub Action) [6.5]
- [ ] Game update changelogs on game pages [6.3]
- [ ] Team/about page expansion [6]
- [ ] Fan art voting / gallery contests [6]
- [ ] Multi-admin support (is_admin column) [6]
- [ ] Login activity log [6]
- [ ] RLS policy audit (investor_requests + challenge_submissions) [6]
- [ ] Game rating (star ratings from vault members + AggregateRating schema) [6]
- [ ] Axe-core accessibility audit in CI [6]
- [ ] Investor data room access log [6]
- [ ] Community event RSVP [6]
- [ ] Member spotlight widget on dashboard [6]
- [ ] Games hub filtering/sorting (by genre, status, platform) [6]
- [ ] Monthly investor update email (automated digest) [6]
- [ ] Rank comparison ("You are X pts behind [member]") [5.5]
- [ ] New members this week ticker on /community/ [5.5]
- [ ] Rate limiting on invite code claims [5.5]
- [ ] Reading time + author bio on journal posts [5]

## C-Tier Backlog (Score 3–4.9)

- [ ] Vault social graph (member connections) [4.8]
- [ ] Vault Map (lore geography explorer) [4.5]
- [ ] SRI integrity hashes for Supabase CDN [4.5]
- [ ] Programmatic SEO for leaderboard pages [4.5]
- [ ] Community-created lore submissions [4.5]
- [ ] "Currently playing" badge on member profile [4.5]
- [ ] E-sign integration for investor docs [4]
- [ ] Merchandise store [4]
- [ ] Game-specific Discord channels linked from game pages [4]
- [ ] A/B testing infrastructure [3.5]
- [ ] Cap table visualization [3.5]

## Completed — Phase 11 (2026-03-25)

- ✅ Daily login bonus + streak system (🔥 day counter, milestone bonuses at 7/30/60/100 days)
- ✅ 5-step onboarding tour for new vault members
- ✅ In-portal notification center (🔔 bell, Studio Pulse realtime feed, unread badge)
- ✅ Challenge categories + filter pills (Daily/Weekly/Lore/Game/Social/One-Time)
- ✅ Seasonal challenges (expires_at countdown badges)
- ✅ Achievement progress bars (progress_max column, client-side derived)
- ✅ Social sharing of member card (Web Share API + Twitter intent + Copy Link)
- ✅ Homepage live member count ("Join X vault members")
- ✅ Sentry error tracking on homepage, vault-member portal, investor portal
- ✅ /join/ referral landing page (?ref=username shows referrer rank/avatar)
- ✅ Leaderboard game-specific tabs (Football GM, Call of Doodie)
- ✅ Public member profile improvements (achievements, activity, founding badge, share)
- ✅ Journal emoji reactions (🔥❤️🎮⚡, auth-gated writes, optimistic updates)
- ✅ supabase-phase11.sql + supabase-journal-reactions.sql (run by user)
- ✅ Pushed to main (034886d)

## Completed — Phase 10 + SEO pass (2026-03-25)

- ✅ /investor/ → /investor-portal/ rename + redirect pages
- ✅ Investor portal page gate (no content flash before auth)
- ✅ 3-step sign-up wizard on investor login
- ✅ Mobile hamburger nav on all investor portal pages
- ✅ New public pages: /leaderboards/, /community/, /journal/archive/, /ranks/, /member/, /status/, /search/
- ✅ Vault Member dashboard: quick actions, rank progress bar, referral section, Studio Pulse banner
- ✅ Studio Hub: Revenue, Analytics, Member Search tabs
- ✅ Achievements system SQL + Challenge submissions SQL
- ✅ VideoGame + FAQPage + BreadcrumbList JSON-LD on all game pages
- ✅ Organization + WebSite JSON-LD on homepage
- ✅ Twitter Cards + OG meta tags site-wide
- ✅ assets/supabase-public.js (1 KB REST helper)
- ✅ sw.js v3 + stale-while-revalidate for Supabase API
- ✅ assets/web-vitals.js → GA4
- ✅ robots.txt hardened
- ✅ GitHub Actions: Lighthouse CI + minify reporter
- ✅ X-Frame-Options + Referrer-Policy meta tags on 55 pages
- ✅ Cookie consent banner (GDPR)
