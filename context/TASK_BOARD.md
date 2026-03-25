# Task Board

## Now

- Nothing active.

## Next

- Enable Cloudflare proxy (requires DNS change on registrar — highest-ROI speed/security win)
- Supabase dashboard settings: CAPTCHA on auth, session timeout, email enumeration prevention
- VaultSparked Discord role: end-to-end test with Stripe test checkout
- VAPID key setup: generate keys, set VAPID_PUBLIC_KEY in vault-member/index.html, deploy send-push Edge Function secrets

## Blocked

- Web push delivery: blocked on VAPID key generation (low priority — all other features work)
- True HTTP security headers (CSP, HSTS, X-Content-Type-Options): blocked on Cloudflare or custom server — GitHub Pages doesn't support HTTP headers

## Later

- Phase 11 ideas: Vault social graph (member connections), Game leaderboard integration, Vault Map (lore geography explorer)
- Annual VaultSparked pricing tier
- Multi-admin support (is_admin column on vault_members)
- SRI integrity hashes for Supabase CDN (currently pinned to v2.49.1 but no `integrity=` attribute)
- RLS policy audit: run `select * from pg_policies` and review investor_requests + challenge_submissions

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
