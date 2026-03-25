# Task Board

## Now

- Daily login bonus + streak system (vault-member portal)
- Onboarding tour for new vault members
- In-portal notification center
- Challenge categories + filters + seasonal challenges
- Achievement progress tracking
- Social sharing of member card
- Homepage live member count + social proof
- Sentry error tracking on key pages
- /join/ referral landing page
- Leaderboard game-specific tabs
- Public member profile improvements
- Journal comment/reaction system

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

- [x] Cloudflare proxy — DNS change required [10]
- [ ] Daily login bonus + streak system [9.5] — IN PROGRESS
- [ ] Onboarding tour for new members [9] — IN PROGRESS
- [x] VAPID / web push (keygen required) [9]
- [ ] In-portal notification center [9] — IN PROGRESS

## A-Tier Backlog (Score 7–8.9)

- [x] Email newsletter/digest [8.8] — external setup required
- [ ] Seasonal / limited-time challenges [8.5] — IN PROGRESS
- [ ] Social sharing of member card [8.5] — IN PROGRESS
- [x] Supabase security settings [8.5] — dashboard required
- [x] Annual VaultSparked pricing tier [8.5] — Stripe required
- [ ] Achievement progress tracking [8] — IN PROGRESS
- [ ] Game-specific challenge + point triggers (Football GM → Vault points) [8]
- [ ] Member public profile improvements [8] — IN PROGRESS
- [ ] Live member count / social proof on homepage [7.8] — IN PROGRESS
- [ ] Leaderboard: game-specific tabs [7.8] — IN PROGRESS
- [ ] Referral landing page /join/ [7.5] — IN PROGRESS
- [ ] Error tracking (Sentry) [7.5] — IN PROGRESS
- [ ] Challenge categories + filters [7.5] — IN PROGRESS
- [x] 2FA / MFA for vault members [7.5] — Supabase toggle required
- [ ] Journal comment/reaction system [7.2] — IN PROGRESS

## B-Tier Backlog (Score 5–6.9)

- [ ] Gift subscriptions (Stripe) [6.8]
- [ ] Member-to-member point gifting [6.5]
- [ ] Co-op / team challenges [6.5]
- [ ] Bookmark classified files [6.5]
- [ ] Dark/light mode toggle [6.5]
- [ ] Investor portal: KPI trend charts [6.5]
- [ ] Sitemap auto-generation (GitHub Action) [6.5]
- [ ] Game update changelogs on game pages [6.3]
- [ ] Team/about page expansion [6]
- [ ] Fan art voting / gallery contests [6]
- [ ] Multi-admin support (is_admin column) [6]
- [ ] Login activity log [6]
- [ ] RLS policy audit (investor_requests + challenge_submissions) [6]

## C-Tier Backlog (Score 3–4.9)

- [ ] Vault social graph (member connections) [4.8]
- [ ] Vault Map (lore geography explorer) [4.5]
- [ ] SRI integrity hashes for Supabase CDN [4.5]
- [ ] Programmatic SEO for leaderboard pages [4.5]
- [ ] Rate limiting on RPCs [4.5]
- [ ] E-sign integration for investor docs [4]
- [ ] Merchandise store [4]
- [ ] A/B testing infrastructure [3.5]
- [ ] Cap table visualization [3.5]

## Completed this session (2026-03-25)

- ✅ /investor/ → /investor-portal/ rename + redirect pages
- ✅ Investor portal page gate (no content flash before auth)
- ✅ 3-step sign-up wizard on investor login
- ✅ Mobile hamburger nav on all investor portal pages
- ✅ New public pages: /leaderboards/, /community/, /journal/archive/, /ranks/, /member/, /status/, /search/
- ✅ Vault Member dashboard: quick actions, rank progress bar, referral section, Studio Pulse banner
- ✅ Studio Hub: Revenue, Analytics, Member Search tabs
- ✅ Achievements system SQL (run by user)
- ✅ Challenge submissions SQL (run by user)
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
- ✅ Committed and pushed to main (649a1d5)
