# Work Log

## 2026-04-12 — Session 57

- assets/style.css: added `.theme-picker-label { display:none }` + `.theme-picker-arrow { display:none }` to `@media (max-width:980px)` block — compact theme picker at tablet widths (SIL:2⛔ cleared)
- .github/workflows/cloudflare-worker-deploy.yml: created — triggers on `cloudflare/**` push to main; `npx wrangler@3 deploy --env production`; `CF_WORKER_API_TOKEN` secret required (SIL:2⛔ cleared)
- vaultsparked/vaultsparked.js: created — genesis badge live slot counter; 2-step PostgREST query excludes studio UUIDs via `not.in.()`; 3-tier colour (gold/orange/crimson); DOMContentLoaded safe
- vaultsparked/index.html: added `<span id="genesis-slots-left">` to FAQ answer; added `<script src="/vaultsparked/vaultsparked.js" defer>`
- supabase/migrations/supabase-phase59-public-profile.sql: created — adds `public_profile boolean DEFAULT true NOT NULL` to vault_members; partial index on true; pending HAR
- vault-wall/index.html: `.eq('public_profile',true)` added to all 3 vault_members queries; `.count().head()` → `.count().get()` bug fix (count was always 0 before); opt-in notice added above stats
- studio/index.html: added `#why-vaultspark` section — personal origin story, vault pressure philosophy quote, 5-paragraph founder narrative; inserted before #team section
- assets/images/badges/vaultsparked.svg: created — faceted purple/violet crystal gem, radial bg, 8-facet polygon, gold crown spark accent, 64×64
- assets/images/badges/forge-master.svg: created — dark navy bg, steel anvil (body+pedestal+horn), crimson/fire border ring, gold spark burst at impact point, ember particles
- context/TASK_BOARD.md: all S57 items marked done; 3 new [SIL] Now items added (portal toggle, SVG wire, vault wall verify); 2 HAR items added
- memory: project_vaultspark_state.md updated; feedback_runway_preload.md created; MEMORY.md index updated
- Commit: 48e7a15 · pushed to main
- SIL: 439/500 · Velocity: 1 (board) / 6 (protocol) · Debt: →

## 2026-04-12 — Session 56

- supabase: phase57 migration applied via Supabase CLI (`supabase db query --linked`) — 4 studio accounts awarded Genesis Vault Member badge + 500 XP (DreadSpike, OneKingdom, VaultSpark, Voidfall)
- supabase/migrations/supabase-phase58-genesis-vault-rename.sql: created and applied — renamed achievement slug/name/icon; `maybe_award_founding_badge` dropped and replaced with `maybe_award_genesis_badge(uuid)` excluding studio owner UUIDs from 100-slot rank count; prefs sentinel updated; point_events reason updated
- assets/images/badges/genesis-vault-member.svg: created — 8-pointed star burst badge, dark navy background, gold `#f5a623` border ring + inner vault ring, radial gradients, void center + core dot; 64×64 viewBox
- vault-member/portal.js:4568 + portal-settings.js:333: achievement icon renderer updated — icons starting with `/` render as `<img width="32" height="32">` instead of emoji text
- vaultsparked/index.html: comparison table cell + FAQ entry updated from "Founding Vault Member" to "Genesis Vault Member" with inline SVG badge img
- studio-pulse/index.html: pulse-item updated to "Genesis Vault Member Badge" · "S58 · Live"
- context/: CURRENT_STATE, TASK_BOARD, LATEST_HANDOFF, PROJECT_STATUS, SELF_IMPROVEMENT_LOOP, WORK_LOG updated
- SIL: 400/500 · Velocity: 0 (board) / 3 (practical) · Debt: →

## 2026-04-12 — Session 55

- assets/theme-toggle.js: removed `theme-option` class from tile button className (was `.theme-tile theme-option`); `.theme-option { display:none }` legacy CSS rule was hiding all theme tiles; theme picker is now visible and functional
- press/index.html: created — full press kit page (key facts, studio bio, logo grid, game catalog, membership stats, press contact)
- studio-pulse/index.html: created — Now/Next/Shipped transparency board; 8-game status grid; studio health panel; session 55 stats
- vault-wall/index.html: created — live member recognition wall; Supabase rank distribution bar (9 segments); top-3 podium; leaderboard #4-20; recently joined grid (12 members)
- invite/index.html: created — referral program UX; copy/share referral link (X, Reddit, Discord); live referral stats; rewards cards; top inviters leaderboard (computed from referred_by counts, not a column)
- index.html: social proof strip added between hero and milestones — live member count, VaultSparked count, challenge completions, rank distribution bar; proof-stat CSS added to page style block; JS populates via `VSPublic` promise chain
- vault-member/index.html: daily loop widget `#daily-loop-widget` added above cvault-panel on dashboard tab — login streak, active challenge title, login bonus chip
- vault-member/portal-dashboard.js: `initDailyLoopWidget(member)` added; `updateStreakBadge` updated to also set `dlw-streak` element; reads active challenge from `VSPublic.from('challenges')`
- vault-member/portal.js: `setTimeout(() => initDailyLoopWidget(member), 800)` added alongside `checkDailyLogin`
- supabase/migrations/supabase-phase57-founding-vault-badge.sql: created — awards 🏛️ Founding Vault Member + 500 XP to first 100 members by created_at; `maybe_award_founding_badge(uuid)` RPC; idempotent; **pending human action to run in Supabase dashboard**
- vaultsparked/index.html: comparison table — 3 new rows (Founding Vault Member badge, Vault Wall recognition, Referral bonus XP); FAQ entry added for founding badge
- games/call-of-doodie/index.html: social share strip + "More From the Vault" section added
- scripts/propagate-nav.mjs: run; 75 pages updated including new pages
- IGNIS: not refreshed
- SIL: 455/500 · Velocity: +34 · Debt: ↓

## 2026-04-12 — Session 54

- vault-member/index.html: qrcode CDN URL changed from @1.5.3 (jsDelivr 404) to @1.5.0; SRI hash updated to sha384-cis6rHaubFFg4u43HmrdI+X3wd2e5Vh2VxFSajC+XXESLbkXR9bnOIcoQBn+kGdc
- assets/style.css: `.theme-picker { display: none; }` moved from @media (max-width: 980px) to @media (max-width: 640px) — root cause: picker hidden at all sub-980px viewports (common laptop window width); tile border opacity increased 0.18→0.28
- assets/theme-toggle.js: `tileColor` field added to THEMES array (7 entries); `tile.style.background` updated to use `tileColor || color` for more distinct tile backgrounds
- sw.js: CACHE_NAME bumped to vaultspark-20260412-e87a8ba
- Pushed: 3e86c1f (required git pull --rebase due to remote CI commit)
- IGNIS: not refreshed (no content changes)
- SIL: 421/500 · Velocity: 0 · Debt: →

## 2026-04-11 — Session 53

- universe/dreadspike/index.html: Signal Log section added — intercept-transmission card (ENTRY 001, TIMESTAMP REDACTED); lore-dense, on-voice
- universe/voidfall/index.html: atmospheric entity 4 hint added below The Crossed row — "Something else was detected. The classification system has no record of it."
- vault-member/portal-init.js: extracted 3 inline script blocks from index.html (offline sync, Complete Your Vault checklist, onboarding tour)
- vault-member/portal-core.js: event wiring IIFE appended — all onclick/onchange/onmouseenter → addEventListener; view-progress-btn gap fixed
- vault-member/portal.css: hover CSS rules added for notif-bell, delete-account, 4 quick-action-link classes (replaces inline onmouseenter/leave)
- vault-member/index.html: all inline event handlers removed; IDs added to ~30 elements; portal-init.js script tag added
- cloudflare/security-headers-worker.js: script-src 'unsafe-inline' → SHA-256 hashes (FOUC + GA4); needs Wrangler redeploy
- scripts/propagate-csp.mjs: CSP_VALUE updated to hash-based script-src; re-propagated 85 pages
- .github/workflows/cloudflare-cache-purge.yml: created; triggers on push to main; CF_API_TOKEN + CF_ZONE_ID secrets required
- sw.js: portal-init.js added to STATIC_ASSETS; CACHE_NAME bumped to 20260411
- IGNIS: not refreshed (no content score changes)
- SIL: 435/500 · Velocity: 4 · Debt: →

## 2026-04-08 — Session 52

- vault-member/portal-core.js: hash routing — reads window.location.hash on load, calls switchTab('login'|'register'|'forgot') automatically
- vault-member/portal-auth.js: improved login error messages for username-not-found and invalid-credentials
- projects/promogrind/index.html: hero CTA → #login; added "Already a member? Sign in →" in sidebar
- assets/style.css + assets/theme-toggle.js: theme picker redesigned to 3-column tile grid; tile border fix for dark tiles
- tests/theme-persistence.spec.js: updated selector from .theme-option to .theme-tile
- cloudflare/security-headers-worker.js: added 'unsafe-inline' to script-src, static.cloudflareinsights.com to script-src, browser.sentry-cdn.com to connect-src; Worker redeployed via REST API
- CF cache purged 3× during session (also diagnosed Worker cache TTL as source of stale site)
- Pushed: 8e54635 (final); SW cache: vaultspark-20260408-fcdc581
- IGNIS: not refreshed (no content changes; arch/infra session)
- SIL: 428/500 · Velocity: 4 · Debt: →

## 2026-04-07 — Session 51

- universe/voidfall/index.html: form_submit GA4 event on Kit subscribe success (form_name: voidfall_dispatch)
- universe/voidfall/index.html: Fragment 004 added to Transmission Archive — the named thing, redacted
- Pushed: 09b1efe
- IGNIS: not refreshed (minor content changes)
- SIL: 432/500 · Velocity: 2 · Debt: →

## 2026-04-07 — Session 50

- scripts/propagate-csp.mjs: added challenges.cloudflare.com to script-src, connect-src, frame-src (Turnstile — was stripped in S49 run); re-propagated 85 pages
- join/index.html: added form_error GA4 event to vault access request catch handler
- universe/voidfall/index.html: added Chapter I excerpt (First Pages section) — opening prose + locked volume badge + CSS; first narrative content on live site
- .github/workflows/e2e.yml: wired light-mode-screenshots.spec.js into compliance job; screenshots uploaded as 14-day artifact
- Pushed: 5a00d16 + 7dc6aa9
- IGNIS: 47,308 (+952)
- SIL: 441/500 · Velocity: 4 · Debt: →

## 2026-04-07 — Session 49

- scripts/propagate-csp.mjs: fixed regex (`[^"']*` → `[^"]*`) — was stopping at single-quotes inside CSP value; re-ran: 12 pages updated, 73 unchanged
- .github/workflows/e2e.yml: added CSP sync check step (`node scripts/propagate-csp.mjs --dry-run`) before compliance tests
- contact/index.html: wired GA4 events — `form_submit` on success, `form_error` on catch
- Pushed: 1c21109
- SIL: 430/500 · Velocity: 3 · Debt: →

## 2026-04-07 — Session 48

- supabase/migrations/supabase-phase56-referral-attribution.sql: created + applied via db-migrate workflow — `referred_by uuid` column on vault_members; register_open gains p_ref_by param (awards +100 XP to referrer, fires achievements, sets referred_by); get_referral_milestones updated to count both invite-code and direct-link referrals
- .github/workflows/sentry-release.yml: switched from getsentry app action to sentry-cli; hardcoded org vaultspark-studios + project 4511104933298176; SENTRY_AUTH_TOKEN secret set; removed invalid secrets if-condition; CI passing
- Pushed: d1abf8a + 810e695 + 952fbef
- SIL: 424/500 · Velocity: 2 · Debt: →

## 2026-04-07 — Session 47

- vault-member/index.html: added `id="nav-admin-link"` button to nav-account-menu (display:none; shown by showDashboard() for admin users)
- vault-member/portal-auth.js + portal.js (×2): wired `p_ref_by: sessionStorage.getItem('vs_ref')` to all 3 register_open RPC calls; pending DB migration
- scripts/propagate-csp.mjs: created — single CSP_VALUE constant propagates to all HTML pages via regex replace
- scripts/smoke-test.sh: created — 12-URL staging smoke test; exits non-zero on any failure; enforces CANON-007
- tests/light-mode-screenshots.spec.js: created — Chromium-only Playwright spec; forces light-mode via localStorage; screenshots 3 pages
- .github/workflows/sentry-release.yml: created — tags each main push as Sentry release; requires 3 secrets/vars
- context/PROJECT_STATUS.json: added ignisScoreDelta field; prompts/closeout.md Step 8 updated to compute it
- universe/voidfall/index.html: expanded with 4 sections — Transmission Archive (3 fragment cards), The Signal (world-building prose), Known Entities (3 cryptic entity rows), Saga meta grid (6 cells)
- contact/index.html: built animated toast (spring slide-up, 7s countdown progress bar, manual dismiss, red error variant); fixed duplicate name="subject" field that caused Web3Forms delivery failures
- Pushed: `f777943` + `f9ac3d4` + `1a94c14`
- SIL: 438/500 · Velocity: 7 · Debt: →

## 2026-04-07 — Session 46

- robots.txt: added comment block explaining Cloudflare AI Labyrinth injects directives at CDN edge (prevents future confusion when live robots.txt differs from repo)
- prompts/closeout.md: synced to studio-ops v2.4 — removed Step 7.5 (mandatory IGNIS every closeout), added Step 8.5 (IGNIS on-demand with skip conditions); updated synced-from tag
- tests/theme-persistence.spec.js: replaced `waitForSelector('#theme-select')` + `.toHaveValue()` with `#theme-picker-btn` wait + `.theme-option[data-theme=x].active` class assertion; `body[data-theme]` assertions preserved; mobile test now checks `.mobile-theme-pill[data-theme=x].active`
- assets/style.css: added `--nav-backdrop-overlay` CSS var to `:root` (rgba(0,0,0,0.6)) and `body.light-mode` (rgba(22,32,51,0.45)); `#nav-backdrop` now uses the var; added `@keyframes swatch-pulse` + `.swatch-pulse` utility class
- assets/theme-toggle.js: click handler now removes/re-adds `.swatch-pulse` on the swatch element (void offsetWidth reflow trick to restart animation); cleans up class in label reset timer
- Pushed: `d6240bb`
- SIL: 428/500 · Velocity: 0 · Debt: →

## 2026-04-07 — Session 45

- Root-caused auth tab switching bug on `vault-member/?ref=username`: `showAuth()` and `showDashboard()` in `portal-auth.js` threw TypeError because `nav-account-wrap`, `nav-signin-link`, `nav-join-btn` were missing from `vault-member/index.html` nav-right — added all missing portal nav elements (notif bell wrap, nav account dropdown with trigger/avatar/name/menu, IDs on Sign In/Join links)
- Added null guards to `showAuth()` and `showDashboard()` in `portal-auth.js` for forward safety
- Added `?ref=username` referral handling in `portal-settings.js` init(): validates param, shows gold referral banner ("Invited by @username"), stores referrer in sessionStorage for future attribution
- Enhanced theme picker: hover preview (applies theme without saving, restores on mouse leave via `dropdown.mouseleave`), DEFAULT badge on active theme option, "✓ Default saved" button confirmation flash (1.8s), "Choose Theme" section header, active option gold tint background
- Pushed: `6fab57a`
- SIL: 433/500 · Velocity: 0 · Debt: →

## 2026-04-07 — Session 44

- Root-caused mobile nav blur to `backdrop-filter: blur(2px)` on `#nav-backdrop` (iOS Safari GPU compositing layer bleeds blur to z-index:200 overlay above it) — removed it
- Fixed theme FOUC: `theme-toggle.js` now applies theme class to `<html>` immediately (available in `<head>`); `propagate-nav.mjs` injected inline theme script at `<body>` start across all 72 pages — eliminates dark flash when navigating in light mode
- Redesigned mobile nav overlay: cubic-bezier animation, gold left-border active indicator, caret-as-button, improved CTA press states and spacing
- Replaced bare `<select>` theme picker with a custom button+dropdown component (color swatches per theme, active checkmark, scale+fade animation, keyboard/click-outside dismiss)
- Added `body.light-mode .manifesto` background override (studio page had hardcoded dark gradient); studio-grid timeline and process-step light-mode fixes
- SW cache bumped to `vaultspark-20260406-navfix`
- Pushed: `4bd073e`
- SIL: 425/500 · Velocity: 5 · Debt: →

## 2026-04-06 — Session 43

- Replaced the false public MIT/open-source posture with a proprietary rights + third-party attributions posture
- Rewrote `open-source/index.html` into a technology attributions and IP notice page
- Updated the shared footer/resource label from `Open Source` to `Technology & Rights` and propagated it across 72 HTML pages via `scripts/propagate-nav.mjs`
- Updated sitemap labels, homepage GitHub subtitle, and `tests/compliance-pages.spec.js` title expectations to match the new rights posture
- Pushed: `26b7afa`
- SIL: 421/500 · Velocity: 1 · Debt: →

## 2026-04-06 — Session 42

- Hardened the remaining light-mode contrast failures across intentionally dark sections
- Restored white readable copy on dark Studio Members feature tiles, homepage rank preview, DreadSpike storyline/media copy, project/game dark hero bands, Vault Member rank sidebar, and public `/ranks/` cards
- Fixed the homepage Vault-Forge paragraph so it stays dark on the light surface
- Updated shared CSS in `assets/style.css` plus page-specific overrides in `index.html`, `ranks/index.html`, and `vault-member/portal.css`
- Pushed: `f9109fe`
- SIL: 412/500 · Velocity: 1 · Debt: →

## 2026-04-06 — Session 41

- Completed the light-mode contrast follow-up in `assets/style.css`
- Darkened the shared secondary text hierarchy to blue-slate values (`--muted`, `--dim`, `--steel`) so light mode no longer falls back to washed gray copy
- Fixed unreadable project/game titles on dark hero art with bright text + stronger overlay treatment in light mode
- Converted shared dark content/card patterns (`.feature-block`, `.info-block`, `.stream-item`, patch panels, game/project cards) into true light-mode surfaces
- IGNIS rescored: 46,115/100,000 · FORGE · 74.1% through tier
- Pushed: `9862948`
- SIL: 409/500 · Velocity: 1 · Debt: →

## 2026-04-06 — Session 40

- Refined the public-site light mode in `assets/style.css` with a warmer premium palette, stronger contrast tokens, and shared light-mode overrides for cards, chips, buttons, forms, badges, nav, footer, and section chrome
- Fixed a systemic readability gap by overriding `--steel` in light mode; many components were inheriting a pale gray accent that washed out on the white background
- Synced browser theme color in `assets/theme-toggle.js` to the new light background
- Verification: `npm.cmd test -- tests/theme-persistence.spec.js` ran; Chromium failures are tied to an existing `body[data-theme]` expectation mismatch, Firefox/WebKit browsers missing locally
- Pushed: `7976f9b`
- SIL: 414/500 · Velocity: 1 · Debt: →

## 2026-04-06 — Session 39

- Actioned all 3 SIL Now items in one pass
- Mobile nav entrance animation: @keyframes nav-enter (translateY -6px → 0, opacity 0 → 1, 0.18s ease) applied to .nav-center.open in ≤980px media block
- CSS guard: `.hero-art > .status { position: absolute; top: 1rem; left: 1rem; z-index: 2 }` — regression prevention for S36 badge-overlap bug
- Lighthouse CI: wait-on step added (120s timeout, 5s interval) polling live site before Lighthouse runs
- SW: CACHE_NAME bumped to `vaultspark-20260406-silpol` (style.css changed)
- IGNIS scored: 46,855/100,000 · FORGE · 79.0% (delta: -236 from time decay)
- Pushed: `0cb8e52`
- SIL: 400/500 · Velocity: 0 (all SIL) · Debt: →

## 2026-04-06 — Session 38

- Fixed persistent iOS mobile nav blur: root cause was .site-header::before backdrop-filter (not the overlay itself) — disabled at ≤980px in media query; GPU compositing layer from header was containing the position:fixed nav overlay on iOS Safari
- Pushed: `bdbd378`
- IGNIS rescored: 47,091/100,000 · FORGE · 80.6% through tier
- SIL: 401/500 · Velocity: 1 · Debt: →

## 2026-04-06 — Session 37

- Set STRIPE_GIFT_PRICE_ID: product `prod_UHhMAimiSwXo0S` + price `price_1TJ7xbGMN60PfJYsPCs5wUUz` ($24.99 one-time) via Stripe API; secret set via Supabase CLI
- Google Search Console: GSC property verified, sitemap submitted
- IGNIS scored first time: 38,899/100,000 · Tier: FORGE; fields added to PROJECT_STATUS.json
- Staging confirmed: website.staging.vaultsparkstudios.com HTTP 200 ✓
- SIL: 399/500 · Velocity: 4 · Debt: → (SIL/closeout deferred; recovered S38)

## 2026-04-06 — Session 36

- Fixed mobile nav blur: removed backdrop-filter from .nav-center.open (background 0.98 opacity — blur was invisible but created GPU compositing artifact making menu text blurry on mobile)
- Fixed FORGE/SPARKED/VAULTED status badge overlap on 8 project pages: badge was inside .hero-art-content (position:relative) so `position:absolute;top:1rem;left:1rem` positioned relative to the content div at the bottom, landing the badge directly on the h1; moved badge to direct child of .hero-art matching game page pattern
- Pushed: `9535d01`
- SIL: 417/500 · Velocity: 2 · Debt: →

## 2026-04-06 — Session 35

- Diagnosed Lighthouse SEO + axe-cli failures from session 34 push
- Root causes: Cloudflare AI Labyrinth rewrites robots.txt at CDN edge; vault-member intentionally noindex; "Learn More" non-descriptive link; ChromeDriver/Chrome version mismatch
- Fixed: .lighthouserc.json (robots-txt off), lighthouse.yml (vault-member removed), index.html (aria-label), accessibility.yml (browser-driver-manager)
- Pushed: `929a884`
- SIL: 401/500 · Velocity: 3 · Debt: →

## 2026-04-06 — Session 34

- Protocol restore: CLAUDE.md session aliases, AGENTS.md full Studio OS guide, prompts/start.md v2.4 (Bash lock + beacon), all context/ files restored with functional content
- S33 pending actions audited: GA4 ✗, GSC ✗, STRIPE_GIFT_PRICE_ID ✗, Web3Forms keys ✗
- GA4 G-RSGLPP4KDZ wired to all 97 HTML pages
- Committed + pushed: 107 files (97 HTML + 10 protocol)
- SIL: 391/500 · Velocity: 1 · Debt: →

This public repo no longer carries the detailed internal work log.

Public-safe note:
- internal session-by-session execution detail now lives in the private Studio OS / ops repository
- a local private backup of the pre-sanitization work log was preserved outside this repo on 2026-04-03
- 2026-04-03 closeout: public-repo sanitization follow-through completed and local Playwright credential handling was moved behind a private ignored file
