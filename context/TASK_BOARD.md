# Task Board

## Now

- [x] Run pending SQL migrations: phase40-50 ✅ **ALL APPLIED** (2026-03-28 via db-migrate Action)
- [x] Fix vault-score.js getLeaderboard() — rank titles now derive from points instead of querying a missing `vault_members(rank_title)` field
- [x] [SIL] Authenticated axe-core portal tests — env-gated Playwright scans now cover dashboard, challenges, and onboarding modal
- [x] [SIL] Access-state copy audit — entitlement and early-access copy now aligns to the canonical free-pool / VaultSparked-priority model across core public membership surfaces
- [x] [FLAG] Apply `supabase-phase52-membership-entitlements.sql` and deploy the updated entitlement-aware edge functions so plan-aware archive/beta gating is live
- [ ] [FLAG] Verify free vs VaultSparked vs PromoGrind Pro behavior in a browser — portal status, archive access, beta keys, PromoGrind live tools, and gift checkout copy; repo-side tests landed, but the live rerun still needs `SUPABASE_SERVICE_ROLE_KEY` in the local shell so the magic-link helper can bypass production CAPTCHA
- [x] [FLAG] Run `npm run provision:test-accounts` with service-role credentials and dedicated free/Sparked emails to create the Playwright verification accounts and populate `.env.playwright.local`
- [x] [SIL] Theme persistence E2E coverage — homepage restore and mobile-nav persistence now pass in Chromium against the live site
- [x] [SIL] Theme surface parity audit — high-visibility portal dark-only surfaces now use shared theme-token-backed classes for overlays, auth buttons, referral/gift panels, and poll inputs
- [x] [SIL] Public/private boundary audit — historical root handoff docs are now public-safe compatibility stubs instead of detailed operator records
- [x] [SIL] Shared rank-threshold source audit — portal rank helpers and Discord role sync now derive thresholds from the canonical membership-entitlement config

## Next (Pending External Action)

- [x] [SIL] Mobile audit pass on new CTAs — /join/ + /vaultsparked/ new form sections now pass 320/480/768/1024px; full-width stacking CSS added ✅
- [x] [SIL] Web3Forms spam guard — botcheck honeypot added to both forms; subject + from_name differentiation already in place ✅ (separate access_keys still optional for advanced tracking)
- [x] [SIL] GA4 event on form submit — guarded `gtag('event','form_submit',...)` added to /join/ and /vaultsparked/ success branches; no-ops until GA4 measurement ID is configured ✅ (session 28)
- [x] [SIL] Cloudflare DNS change prep doc — `docs/CLOUDFLARE_DNS_PREP.md` written with exact A/CNAME records, toggle steps, `curl -I` verification, Worker route setup, and rollback ✅ (session 28)
- [ ] [SIL] Per-form Web3Forms keys — register separate access_key values per form for distinct delivery routing and tracking (optional upgrade; current setup already differentiates by subject) [Score: 6.5]
- [x] [SIL] Entitlement matrix audit — all public pages audited against `config/membership-entitlements.json`; pricing, rank thresholds, plan descriptions, Project Unknown requirement all clean; no drift found ✅ (session 28)
- [SIL] Browser entitlement spec lane — add Playwright coverage for free vs VaultSparked vs PromoGrind Pro states on archive, beta keys, and premium tool gating [Score: 8.7]
- [SIL] Service-role-backed auth rerun lane — restore the local verification shell secret path so authenticated Playwright can use magic-link sessions reliably under CAPTCHA hardening [Score: 8.9]
- [SIL] Authenticated verification artifact log — write a compact post-run summary of free / VaultSparked / PromoGrind Pro entitlement results into `logs/` after each targeted browser pass [Score: 7.8]
- [SIL] Default-theme browser parity pass — verify the new `Dark - High Contrast` default across homepage, portal, and mobile nav in a real browser [Score: 8.1]
- [SIL] Account-backed theme sync verification — verify local-vs-account precedence, portal sign-in restore, and cross-device hydration for `prefs.site_theme` [Score: 8.1]
- [FLAG] Add a second dedicated VaultSparked test account for premium-state browser verification once billing/test-state setup is ready [Score: 7.6]
- [SIL] Supabase migration-history normalization — reconcile local migration naming/history with the remote timestamp-based Supabase history so future production schema changes can use the standard migration path safely [Score: 8.3]
- [SIL] Live response-header verification — once Cloudflare proxy is enabled, verify worker CSP/HSTS/Turnstile behavior against the real production responses [Score: 8.4]
- [SIL] Legal copy consistency audit — align footer/legal/press language around IP, fan-content, and data-handling claims after the privacy-policy expansion [Score: 6.8]
- Execute `docs/ACTIVATION_RUNBOOK.md` — Cloudflare proxy, Supabase auth hardening, newsletter secrets, VAPID, and search verification [Score: 9.6]
- [SIL] Activation verification pass after external setup — rerun auth, push, headers, sitemap, and newsletter checks once the runbook is complete [Score: 8.9]
- [x] [SIL] Secret-adjacent docs lint rule — `.github/workflows/secret-lint.yml` added; catches PRIVATE_KEY/SERVICE_ROLE/STRIPE_SECRET values and Supabase JWTs outside approved paths; also redacted VAPID private key value that was accidentally left in LATEST_HANDOFF.md ✅ (session 28)
- Enable Cloudflare proxy (requires DNS change on registrar — highest-ROI speed/security win) [Score: 10, Composite: 8.5]
- Supabase dashboard settings: CAPTCHA on auth, session timeout, email enumeration prevention [Score: 8.5]
- VAPID key setup: generate keys, set VAPID_PUBLIC_KEY in vault-member/index.html, deploy send-push Edge Function secrets [Score: 8.2]
- Google Search Console verification — fill in google-site-verification-REPLACE_ME.html + submit sitemap [Score: 6.5]
- VaultSparked Discord role: end-to-end test with Stripe test checkout
- Annual VaultSparked pricing tier + Gift Subscriptions (Stripe dashboard + Edge Function update) [Score: 7.8] — pending LLC
- 2FA/MFA for vault members (Supabase TOTP toggle + UI prompt) [Score: 6.0]
- Vault Live dev stream integration — "Live Now" badge on homepage when founder is streaming [Score: 8.8] (no code needed, founder action)
- Community Game Jam / Challenge Events — run a 7-day score competition with existing infra [Score: 7.8] (no code needed, founder action)
- Founder AMA / Q&A live session — monthly, feeds journal + Discord [Score: 6.8] (no code needed, founder action)

## Human Action Required

- [ ] Enable Cloudflare proxy — complete the DNS/proxy step from `docs/ACTIVATION_RUNBOOK.md` so edge headers and CDN behavior can go live
- [ ] Apply Supabase auth hardening — CAPTCHA, session timeout, and email enumeration prevention must be enabled in Supabase Auth settings
- [ ] Set newsletter secrets — configure `RESEND_API_KEY`, `NEWSLETTER_FROM`, `APP_URL`, and `NEWSLETTER_SECRET` before newsletter delivery can work
- [ ] Generate and wire VAPID keys — create keys and set both portal/config and function secrets to activate web push
- [ ] Verify search ownership — replace the placeholder Google verification token/file and submit both production sitemaps

## Blocked

- Web push delivery: blocked on VAPID key generation
- True HTTP security headers (CSP, HSTS, X-Content-Type-Options): blocked on Cloudflare or custom server
- VaultSparked subscription production: blocked on LLC formation → Stripe production account

## S-Tier Backlog (Score 9–10)

- [ ] Vault Treasury / Points Marketplace [9.5] ✅ CODED (session 5) — SQL applied, needs sitemap entry
- [ ] Game Demo Embeds (Playable) [9.5] — infrastructure shipped (session 5); needs actual game builds from dev
- [ ] Discord Bot with Vault Commands [9.1] — !rank, !score, !challenge from Discord; requires external hosting (Node.js bot)
- [ ] Vault Seasons Cross-Game XP [9.0] ✅ CODED (session 5) — SQL applied, live

## A-Tier Backlog (Score 7–8.9)

- [x] Vault Dispatch weekly email digest ✅ — infra confirmed active (Resend + Edge Function); monthly cadence live
- [x] Per-game weekly high score leaderboard with reset ✅ CODED (session 5) — SQL applied, live
- [x] Expand Activity Feed ✅ SHIPPED (session 5) — rank-ups, challenges, game sessions now in feed
- [x] Accessibility: focus ring + aria-live ✅ SHIPPED (session 5)
- [x] Unreleased game pages content fill ✅ SHIPPED (session 5) — Solara, MindFrame, VaultFront, Project Unknown
- [ ] Member Social Graph ✅ CODED (session 5) — follow/unfollow + Following Feed; SQL applied, live
- [ ] Web Push Notifications [8.2] — VAPID keys + subscription flow; blocked on key generation
- [ ] Interactive Onboarding Tour [7.8] — guided first-visit walkthrough of portal features with step-by-step highlights
- [ ] Annual VaultSparked pricing tier [7.8] — pending LLC + Stripe production
- [ ] Gift subscriptions (Stripe) [6.8] — pending LLC + Stripe production
- [x] VaultSparked Beta Waitlist for unreleased games ✅ SHIPPED (session 8) — Web3Forms on 4 game pages
- [x] Vault Referral Milestone Rewards ✅ CODED (session 8) — 5 tiers, SQL applied, live
- [x] Game Release Countdown Events [6.5] ✅ SHIPPED (session 10) — countdown.js on 4 unreleased game pages + classified glitch for Project Unknown
- [x] Vault Score Public Leaderboard API [7.5] ✅ SHIPPED (session 10) — /api/leaderboard/ docs, static JSON endpoints, embeddable widget.js, daily GitHub Action
- [x] Content Calendar + Auto Journal [7.5] ✅ SHIPPED (session 11) — context/CONTENT_CALENDAR.md, 52-week rotating schedule
- [x] Dark Theme Contrast Fix + Color CI [7.2] ✅ SHIPPED (session 11) — --dim bumped, rgba fixes, Playwright contrast validation
- [ ] Google Search Console + Bing Webmaster verification + sitemap submission [6.5]
- [ ] 2FA/MFA for vault members (Supabase TOTP toggle + UI prompt) [6.0]

## B-Tier Backlog (Score 5–6.9)

- [x] Offline Content Cache Enhancement [6.5] ✅ SHIPPED (session 11) — journal + game pages in SW pre-cache
- [ ] Build Pipeline (Minify + SRI) [5.8] — auto-minify JS/CSS, generate SRI hashes on deploy
- [x] FAQ Schema Expansion [5.5] ✅ SHIPPED (session 11) — FAQPage JSON-LD on /contact/
- [ ] Monthly investor update email (automated digest) [6]
- [x] Custom 404 with Search [5.0] ✅ SHIPPED (session 11) — site search input + expanded popular links
- [ ] E-sign integration for investor docs [4]
- [ ] Merchandise store [4]
- [ ] Game-specific Discord channels linked from game pages [4]
- [ ] SRI integrity hashes for Supabase CDN [4.5]
- [ ] A/B testing infrastructure [3.5]
- [ ] Cap table visualization [3.5]

## C-Tier Backlog (Score 3–4.9)

- [ ] Vault Map (lore geography explorer) [4.5]
- [ ] Community-created lore submissions [4.5]
- [ ] "Currently playing" badge on member profile [4.5] (note: already exists as of Phase 42)
- [ ] Vault social graph (member connections) [4.8] — now CODED as full follow system (session 5, phase 49)

## Completed — Session 28 (2026-04-01)

- ✅ GA4 form_submit event — guarded `gtag()` call added to /join/ and /vaultsparked/ success branches; fires automatically when GA4 is configured
- ✅ Cloudflare DNS prep doc — `docs/CLOUDFLARE_DNS_PREP.md` with exact record values, toggle steps, `curl -I` verification, Worker route, and rollback instructions
- ✅ Entitlement matrix audit — all public pages clean vs `config/membership-entitlements.json`; no promise drift found
- ✅ Secret lint CI — `.github/workflows/secret-lint.yml` guards against committed key values and Supabase JWTs
- ✅ VAPID private key redacted from LATEST_HANDOFF.md — was accidentally committed; key must be regenerated before activating web push

## Completed — Session 27 follow-up (2026-04-01)

- ✅ Web3Forms botcheck — honeypot spam guard added to both Vault Access Request and VaultSparked Waitlist forms
- ✅ Mobile CTA audit — full-width stacking CSS (`@media ≤640px`) added to style.css for both new form sections; all breakpoints pass
- ✅ VAPID key generation — fresh pair generated; public key embedded in `portal-features.js` and `portal.js`; `ACTIVATION_RUNBOOK.md` updated with exact secret setup steps; SW cache bumped to v4

## Completed — Session 27 (2026-04-01)

- ✅ Discord invite link updated — `discord.gg/bgR3mSB2` → `discord.gg/MnnBRbYDk` across 51 files sitewide
- ✅ Light mode surface fix — comprehensive `body.light-mode` overrides added to `assets/style.css` covering ~70 card/panel/tag class names with dark rgba backgrounds, invisible white borders, and forced white text; all pages now render correct surfaces in light mode without touching individual HTML files
- ✅ CSP connect-src fix — `https://api.convertkit.com` and `https://api.web3forms.com` added to all 67 public pages; email-capture fetch() calls were previously CSP-blocked silently
- ✅ Request Vault Access CTA — Web3Forms email form added to `/join/` for users without an invite code
- ✅ VaultSparked Waitlist CTA — Web3Forms email form with founder-discount messaging added to `/vaultsparked/`
- ✅ Universe Discord CTA — Discord section added to `/universe/`; hardcoded `strong { color:#fff }` fixed to `var(--text)`
- ✅ SW cache bump — `sw.js` cache version advanced to `v3` to deliver updated assets to existing clients

## Completed — Session 16 (2026-03-31)

- ✅ Account-backed theme persistence — `assets/theme-toggle.js` now saves `vs_theme` locally, hydrates from `vault_members.prefs.site_theme`, and syncs signed-in changes back to the member record
- ✅ Vault Member prefs preservation — portal preference saves now merge existing `prefs` data instead of overwriting account-backed theme settings
- ✅ Signal Log layout/UI fix — `/journal/` filter row now spans the grid correctly, entries stay in the main column, and cards/sidebar/share controls now follow shared theme tokens
- ✅ Privacy / rights notice expansion — `/privacy/` and `/terms/` now describe real account storage, browser-stored preferences, IP/fan-content boundaries, and use theme-aware legal-page headers

## Completed — Session 17 (2026-03-31)

- ✅ Service worker auth-cache hardening — `sw.js` now caches only anonymous Supabase REST reads instead of all `GET` traffic to `supabase.co`
- ✅ Checkout function origin hardening — `create-checkout` and `create-gift-checkout` now return origin-scoped CORS headers instead of permissive `*`
- ✅ Cloudflare worker CSP parity fix — header worker now includes Turnstile allowances plus stronger response directives for the eventual proxy rollout
- ✅ VaultSparked truth sync — `/vaultsparked/` metadata now reflects the founder-confirmed `$24.99/month` price
- ✅ Portal XSS sink cleanup — Discord OAuth error rendering now uses DOM text nodes instead of `innerHTML`
- ✅ Vault Membership UX upgrade — portal now includes a `Claim Center` dashboard panel and a `Vault Status` settings block
- ✅ Authenticated QA extension — portal smoke tests now cover the new Claim Center and Vault Status surfaces

## Completed — Session 18 (2026-03-31)

- ✅ Invite-only Vault status correction — `/join/` member pill now reads `Vault Status · Invite codes only` with a yellow status indicator instead of a misleading green live-count cue
- ✅ Homepage social-proof removal — removed the public `Join {count} vault members` hero bar and its unused count updater so the homepage no longer implies open/live membership

## Completed — Session 19 (2026-03-31)

- ✅ Sitewide sign-in deep-link fix — public `Sign In` surfaces now route to `/vault-member/#login` so the auth page opens on the actual login tab
- ✅ Default theme change — `High Contrast` is now the default palette for new visitors and is renamed `Dark - High Contrast`, while the old dark palette remains available as `Dark`
- ✅ Launch-date refinement — homepage hero now shows `Days since launch`, and homepage/studio/roadmap stage labels now use repo-derived March 2026 week windows where historical timing is known

## Completed — Session 20 (2026-03-31)

- ✅ Studio OS prompt sync — `prompts/start.md` and `prompts/closeout.md` now match the latest Session 21 templates from `vaultspark-studio-ops`
- ✅ Truth correction — project context now reflects the actual `/vault-member/#login` sign-in route instead of the older root auth URL wording

## Completed — Session 21 (2026-03-31)

- ✅ Canonical membership entitlements — `config/membership-entitlements.json` + generated browser/edge helpers now define shared plan/rank/access rules for the repo
- ✅ Plan separation cleanup — VaultSparked and PromoGrind Pro now evaluate through a shared entitlement model instead of being treated as the same premium state
- ✅ Plan-aware gating infrastructure — phase52 SQL migration now exists for `classified_files` + `beta_keys`, and Vault Command can assign plan requirements as well as rank requirements
- ✅ Public promise alignment — VaultSparked pricing, portal pricing/gift copy, games/project early-access copy, and PromoGrind premium wording now reflect the actual entitlement model

## Completed — Session 22 (2026-03-31)

- ✅ Phase52 production apply — `supabase-phase52-membership-entitlements.sql` applied against the linked Supabase database, with the migration updated to drop the legacy `get_classified_files()` signature before recreating the plan-aware RPC
- ✅ Live entitlement deploy — `create-checkout`, `create-gift-checkout`, `stripe-webhook`, and `odds` redeployed to project `fjnpzjjyhnpmunfoycrp`
- ✅ Production truth sync — context/status files now reflect that plan-aware archive/beta gating and entitlement-aware checkout/webhook/odds behavior are live

## Completed — Session 23 (2026-03-31)

- ✅ Leaderboard browser-test repair — Playwright selectors now match the live leaderboard DOM, eliminating false failures from duplicate buttons and mixed panel period-tab counts
- ✅ Operator test-account provisioning workflow — `scripts/provision-vault-test-accounts.mjs` and `docs/TEST_ACCOUNT_PROVISIONING.md` now provide a repo-native path to create dedicated free + VaultSparked Playwright accounts and populate `.env.playwright.local`

## Completed — Session 24 (2026-03-31)

- ✅ Real test accounts provisioned — dedicated free-member and VaultSparked auth users were created and wired into `.env.playwright.local`
- ✅ CAPTCHA-safe auth helper — authenticated Playwright login now uses admin-generated magic-link sessions instead of the blocked password-grant path
- ✅ Bootstrap production fix — `get_member_bootstrap()` no longer errors on the stale `last_seen` column; the fix is captured in `supabase-phase53-bootstrap-fix.sql` and applied live
- ✅ Authenticated browser lane stabilized — the previously blocked dashboard/member-state checks now pass in Chromium with the new helper + modal handling

## Completed — Session 25 (2026-03-31)

- ✅ Final VaultSparked gift pricing drift removed — the lingering `$4.99` gift-copy line in `vault-member/index.html` now matches the canonical `$24.99` pricing used everywhere else

## Completed — Session 26 (2026-03-31)

- ✅ Chromium theme persistence verification — homepage restore and mobile-nav theme persistence now pass in `tests/theme-persistence.spec.js`
- ✅ Portal theme-surface parity follow-through — notification popover, onboarding overlay, social auth buttons, referral/gift panels, and poll inputs now read from shared theme-token-backed classes
- ✅ Rank-source drift reduction — portal rank helpers and `assign-discord-role` now derive thresholds from the canonical generated membership config
- ✅ Public root boundary cleanup — `CODEX_HANDOFF_2026-03-10.md`, `CODEX_HANDOFF_2026-03-12.md`, and `HANDOFF_PHASE6.md` are now public-safe compatibility stubs
- ✅ PromoGrind Pro verification support in repo state — provisioning docs/script, env shape, and auth helper now support an optional dedicated `promogrind_pro` Playwright account

## Completed — Session 14 (2026-03-31)

- ✅ Service worker cache bust — `sw.js` cache name advanced and `assets/theme-toggle.js` added to precache so the latest site shell/theme picker actually ships to clients
- ✅ Public-repo boundary cleanup — root `LATEST_HANDOFF.md` and `IOS_SHORTCUT_STUDIO_PULSE.md` replaced with public-safe stubs instead of internal operational detail
- ✅ Generated metadata cleanup — tracked `supabase/.temp/` files removed from version control and ignored going forward
- ✅ CLAUDE handoff clarification — root instructions now point explicitly to `context/LATEST_HANDOFF.md` as the authoritative handoff source

## Completed — Session 15 (2026-03-31)

- ✅ Homepage dark-card parity fix — hero card, milestone cards, latest signal teaser, and Vault Live offline panel now inherit the active theme instead of staying dark in light mode
- ✅ Shared homepage surface classes — `index.html` now uses reusable surface classes tied to `--panel`, `--panel-strong`, and `--line`
- ✅ Local served-preview verification — light-mode browser check confirmed the affected cards now render with light surfaces

## Completed — Session 13 (2026-03-30)

- ✅ Light-mode regression fix — shared page background, header chrome, dropdowns, and mobile nav now honor the active theme instead of falling back to dark-only surfaces
- ✅ Theme system expansion — binary dark/light toggle replaced with a persistent nav picker supporting dark, light, ambient, warm, cool, lava, and high contrast
- ✅ Shared theme tokens — `assets/style.css` now drives shell backgrounds, header chrome, nav hover states, dropdowns, mobile overlay, and focus outlines from theme variables

## Completed — Session 12 (2026-03-30)

- ✅ `context/PORTFOLIO_CARD.md` added — founder/hub-readable project snapshot now exists and matches Studio Hub onboarding requirements
- ✅ Leaderboard contract cleanup — `assets/vault-score.js` and `scripts/generate-leaderboard-api.mjs` now derive `rank_title` from `points` instead of querying a missing column
- ✅ Newsletter contract cleanup — `send-member-newsletter` now pulls recipient emails from `auth.users` and derives rank title from points
- ✅ Social graph migration cleanup — phase49 migration now derives `rank_title` from points instead of assuming `vault_members.rank_title`
- ✅ Authenticated portal Playwright lane — session-seeded auth helper + dashboard/challenges/onboarding coverage, wired to CI via optional secrets
- ✅ Activation runbook — `docs/ACTIVATION_RUNBOOK.md` consolidates the remaining external blockers into a concrete execution order
- ✅ Studio OS truth sync — `CLAUDE.md`, `CURRENT_STATE.md`, `PROJECT_STATUS.json`, and handoff files updated to remove stale SQL-pending language

## Completed — Session 11 (2026-03-28)

- ✅ Full project audit — 90→93 overall score across 10 categories
- ✅ Dark theme contrast fix — --dim bumped #8a93b8→#96a0c0, rgba alpha values raised to meet WCAG AA 4.5:1 on 404 page and global styles
- ✅ Color contrast CI — Playwright test validates CSS variable contrast ratios programmatically against WCAG AA thresholds
- ✅ FAQPage JSON-LD schema on /contact/ — 5 structured Q&A entries for rich search results
- ✅ Favicon optimization — 512x512 PNG compressed from 132KB
- ✅ Console.log stripped from production supabase-client.js — error→silent fail pattern
- ✅ Enhanced SW offline caching — journal, game, and content pages added to STATIC_ASSETS pre-cache list
- ✅ Content calendar — context/CONTENT_CALENDAR.md with 52-week rotating schedule tied to studio milestones
- ✅ Enhanced 404 page — site search input with JS redirect, expanded popular links section, journal + universe links

## Completed — Session 10 (2026-03-27)

- ✅ Portal JS template literal inline style cleanup — 195/214 inline styles → CSS classes in portal.css (19 dynamic ones kept); 253 lines of new CSS
- ✅ Image compression — favicon.png & icon-512.png 419KB→130KB (69%), icon-256.png 123KB→41KB (67%), cinematic-logo.webp & logo.webp 219KB→139KB (37%), icon.webp 120KB→76KB (37%) — 871KB total savings
- ✅ axe-core Playwright integration — @axe-core/playwright in tests/accessibility.spec.js scanning 11 pages for WCAG 2.0/2.1 AA violations; root package.json; CI workflow updated with parallel playwright-axe job
- ✅ Programmatic SEO member profiles — scripts/generate-member-seo.mjs generates static /member/{slug}/index.html with JSON-LD Person schema, SEO meta, redirect; .github/workflows/member-seo.yml weekly cron; member-sitemap.xml
- ✅ Vault Score Public Leaderboard API — /api/leaderboard/ docs page, static JSON endpoints (v1/all.json, per-game), embeddable widget.js, .github/workflows/leaderboard-api.yml daily cron
- ✅ Game Release Countdown Events — assets/countdown.js on 4 unreleased game pages (VaultFront Jul 2026, Solara Nov 2026, MindFrame Jun 2027, Project Unknown classified glitch); CSS in style.css with reduced-motion support
- ✅ Mobile nav renovation — fixed critical bug where only "Projects" showed on mobile; dropdowns collapsed by default with tap-to-toggle accordion (nav-toggle.js + CSS `.dropdown-open`); caret arrows rotate on expand; all 6 top-level nav items visible immediately; SW cache bumped + nav-toggle.js added to pre-cache; `@media (hover: hover)` guard on desktop dropdown hover

## Completed — Session 9 (2026-03-27)

- ✅ LCP fix: dreadspike-poster.webp — removed conflicting preload+lazy, added eager/fetchpriority/dimensions on above-fold pages
- ✅ INP fix: Football GM setup page — debounced save search (200ms), rAF yield before createLeague(), button loading state
- ✅ Above-fold image audit — fixed loading/fetchpriority/decoding on nav icons across 5 top pages; hero cinematic logo priority
- ✅ DreadSpike rename — 8 asset files renamed (darth-spike-* → dreadspike-*), all references updated across 6 HTML + 1 JS + 1 changelog + 1 task board
- ✅ .gitignore — added Cloudflare analytics export exclusion

## Completed — Session 8 (2026-03-27)

- ✅ Portal CSS extraction — 1,592-line inline `<style>` → portal.css external stylesheet; HTML 3149→1559 lines
- ✅ 63 inline style="" attributes replaced with `.p-` utility classes
- ✅ 7 programmatic SEO leaderboard sub-pages (global, challenges, recruiters, football-gm, call-of-doodie, teams, weekly)
- ✅ Beta waitlist Web3Forms email capture on 4 unreleased game pages
- ✅ Referral milestone rewards — phase50 SQL migration, 5 tiers (1/3/5/10/25), portal dashboard panel
- ✅ 6 new Playwright E2E spec files (games, leaderboards, pages, navigation, responsive, accessibility)

## Completed — Session 7 (2026-03-27)

- ✅ Security headers — 7 meta security tags on all 72 HTML pages + Cloudflare Worker created
- ✅ Game rename: Dunescape → Solara: Sunfall
- ✅ SRI hashes on external JS files; CSP updates

## Completed — Session 6 (2026-03-27)

- ✅ Portal.js module split — 4,618-line monolith → 6 files (portal-core, portal-auth, portal-dashboard, portal-features, portal-challenges, portal.js orchestrator)

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
- **SQL applied:** supabase-phase43-teams.sql

## Completed — Phase 42 (2026-03-25)

- ✅ Currently playing badge on member profile card

## Completed — Phase 41 (2026-03-25)

- ✅ Fan art voting — heart/like buttons; live vote count; optimistic UI
- **SQL applied:** supabase-phase41-fan-art-votes.sql

## Completed — Phase 40 (2026-03-25)

- ✅ Fan art submission form + gallery + moderation in Vault Command
- **SQL applied:** supabase-phase40-fan-art.sql

## Completed — Phase 39 (2026-03-25)

- ✅ WebP conversion — DreadSpike images; `<picture>` elements updated

## Completed — Phase 38 (2026-03-25)

- ✅ Supabase query batching — `get_member_bootstrap` RPC
- **SQL applied:** supabase-phase38-bootstrap.sql

## Completed — Phase 37 (2026-03-25)

- ✅ Per-page OG image generation — 14 branded 1200×630 PNGs via sharp + GitHub Action

## Completed — Phase 36 (2026-03-25)

- ✅ Game session recording on all 3 game pages; session milestone awards
- **SQL applied:** supabase-phase36-game-sessions.sql

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

