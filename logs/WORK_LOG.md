# Work Log

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
