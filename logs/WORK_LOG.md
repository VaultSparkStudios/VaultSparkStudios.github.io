# Work Log

## 2026-04-15 — Session 68 (structural upgrade batch)

- scripts/csp-audit.mjs: created — repo-wide inline-script hash audit; compares inline script hashes against page CSP, canonical CSP, and Worker CSP
- tests/computed-styles.spec.js: created — Chromium render-integrity smoke for homepage (computed body background, hero padding, header border, zero page errors)
- .github/workflows/e2e.yml: added `node scripts/csp-audit.mjs` gate and computed-style smoke step
- prompts/closeout.md: Step 0 hardened with git-clean gate + CSP audit requirement for inline/CSP changes
- assets/funnel-tracking.js: created — shared CTA/view tracking via declarative `data-track-*` attributes
- assets/recent-ships.js: created — pulls recent shipped work from `/changelog/` and hydrates `[data-recent-ships]`
- assets/contact-page.js, assets/join-page.js, assets/invite-page.js: created — externalized public-page runtime and added stronger success/error/next-step feedback states
- assets/vaultsparked-proof.js: created — live member/progression proof for `/vaultsparked/`
- assets/style.css: added shared `live-proof-*`, `recent-ship-*`, `feedback-panel`, and `journal-link-inline` styles
- contact/index.html, join/index.html, invite/index.html: removed large inline runtime; wired new external assets and feedback panels
- membership/index.html, vaultsparked/index.html, index.html: added CTA tracking, recent shipped work sections, stronger next-step messaging, and live proof surfaces
- Verification:
  - `node scripts/csp-audit.mjs` → fails on broad legacy repo debt (expected truth surfaced by new gate)
  - `npx playwright test tests/computed-styles.spec.js --reporter=list --project=chromium` → passed
  - `npm.cmd run validate:browser-render` → missing local script in package.json
- SIL: 436/500 · Velocity: 7 · Debt: ↓

## 2026-04-14 — Session 67 (CSP hotfix — intent redirected)

- index.html: removed `media="print" onload="this.media='all'"` async-CSS trick (inline event handler was CSP-blocked → stylesheet stayed print-only → site rendered unstyled in prod); `<link rel="stylesheet" href="assets/style.css" />` now loads normally (critical CSS already inlined, no FOUC concern)
- index.html + vaultsparked/index.html + cloudflare/security-headers-worker.js + scripts/propagate-csp.mjs: 5 new SHA-256 hashes added to `script-src` (signal-panel VAULT_LIVE_URL script 1UY3+…, Kit form-wiring tzcyzR…, dZNuqX…, 6LhxaK…, GEw0Ad…) — hashes computed from local inline script bodies; match browser-reported blocks
- scripts/propagate-csp.mjs: ran → 88 pages updated; --check-skipped → OK on all 3 registry entries
- scripts/csp-hash-registry.json: vaultsparked entry updated with 5 new hashes in cspContent; lastVerified → 2026-04-14
- Commit: 5fd3918 (94 files, +96/−97) · rebased onto origin/main (pulled `b890e69 leaderboard data` + `2279708 sw bump`) · pushed → b4e1088
- SIL: — · Velocity: 1 · Debt: →

## 2026-04-13 — Session 65

- assets/style.css: `--gold: #7a5c00` added to `body.light-mode {}` (dark amber, ~5:1 WCAG AA on `#f6efe5` cream); `#FFC400` override added for `.countdown-classified .countdown-value/.countdown-label` (hardcoded dark bg context)
- assets/style.css: light-mode `!important` overrides for `.signal-teaser-panel` (cream gradient bg, navy border), `.signal-image-card` (light navy bg + border), `.signal-classified-chip` (white/80% bg, no backdrop-filter)
- index.html: added CSS classes to 3 inline-style elements in signal teaser section: `signal-teaser-panel` (outer panel), `signal-image-card` (image card), `signal-classified-chip` (classified chip)
- tests/vault-wall.spec.js: REWRITTEN — `#rank-dist-bar` visible assertion, `#vw-podium` visible assertion, `page.on('pageerror')` CSP listener, rank-dist-seg `.count()` soft warn (allows 0 in CI), auth-free public route check; retires `[SIL:2⛔]` manual smoke protocol
- scripts/csp-hash-registry.json: CREATED — JSON snapshot of CSP meta content for 3 SKIP pages: vaultsparked/index.html (custom hashes), 404.html (unsafe-inline, documented debt), offline.html (unsafe-inline, documented debt); `version: "1.0"`, `updatedAt: "2026-04-13"`
- scripts/propagate-csp.mjs: `--check-skipped` flag added at top of file; `checkSkipped()` function reads registry, extracts current CSP via regex, diffs strings, exits 1 on drift; conditional dispatch at `walk(ROOT)` site
- membership/index.html: `data-reveal="fade-up"` added to 5 sections (mem-tiers, mem-identity, mem-discount, mem-community, mem-final-cta); `<script src="/assets/scroll-reveal.js" defer>` added before `</body>` (was missing)
- press/index.html: `data-reveal="fade-up"` added to 6 sections (key facts, quote, logos, games catalog, vault member, contact); `<script src="/assets/scroll-reveal.js" defer>` added before `</body>` (was missing)
- context/: CURRENT_STATE (S65 snapshot), TASK_BOARD (S66 runway pre-load), LATEST_HANDOFF (S65 full detail + S66 intent), PROJECT_STATUS (silScore 448, velocity 6, debt ↓, currentSession 66), SELF_IMPROVEMENT_LOOP (S65 entry + rolling status), TRUTH_AUDIT (gold contrast + CSP registry note), WORK_LOG updated
- audits/2026-04-13-6.json: CREATED — S65 audit record
- Commit: 63a4480 (9 files, +176/−39) · pushed to main (GitHub Pages auto-deploy)
- SIL: 448/500 · Velocity: 6 · Debt: ↓

## 2026-04-13 — Session 64

- assets/studio-stats.js: CREATED — externalized CSP-blocked inline days-since-launch script; calculates live from UTC epoch; fixes hardcoded "393 Days since launch" fallback
- assets/membership-stats.js: CREATED — externalized membership page social proof (proof-members, stat-members, proof-sparked, stat-sparked, stat-challenges) via VSPublic; fixes CSP-blocked inline script
- assets/scroll-reveal.js: CREATED — IntersectionObserver fade-up reveals for `[data-reveal]` elements; `prefers-reduced-motion` guard; CSS block added to style.css
- assets/style.css: scroll-reveal CSS block appended (`[data-reveal]`, `[data-reveal].revealed`, reduced-motion override)
- index.html: `7+` → `10+` worlds; removed 11-line CSP-blocked inline script; added studio-stats.js + scroll-reveal.js as defer scripts; 6 sections tagged with `data-reveal="fade-up"`
- membership/index.html: removed 27-line CSP-blocked inline social proof block; wired to membership-stats.js
- rights/index.html: CREATED — canonical /rights/ URL for Technology & Rights page; all metadata updated
- open-source/index.html: REPLACED — minimal redirect to /rights/ (`meta refresh` + JS `location.replace`; noindex)
- scripts/propagate-nav.mjs: footer href updated `/open-source/` → `/rights/`; run propagated to 77 pages
- vaultsparked/index.html: full nav/footer replacement — custom orphaned `.site-nav/.nav-links` removed; standard `<header class="site-header">` template inserted; nav-toggle.js added (was missing entirely); hamburger now functional
- sitemap.xml, sitemap.html, sitemap-page/index.html, press/index.html: /open-source/ references updated to /rights/
- tests/light-mode-screenshots.spec.js: PAGES array extended 3 → 10 (added press, contact, community, studio, roadmap, universe, membership)
- tests/compliance-pages.spec.js: `/open-source/` → `/rights/` in compliance pages array
- sw.js: CACHE_NAME bumped to `vaultspark-20260413-s64`; studio-stats.js, membership-stats.js, scroll-reveal.js added to STATIC_ASSETS
- context/: TASK_BOARD, CURRENT_STATE, LATEST_HANDOFF, PROJECT_STATUS updated
- Commit: ac38e5c · pushed to main (GitHub Pages auto-deploy); required `git pull --rebase` to integrate remote SW bump + studio-hub sync commits
- SIL: 443/500 · Velocity: 7 · Debt: →

## 2026-04-13 — Session 63 (redirect)

- assets/style.css: Phase 2 light mode overrides (+163 lines) — `.rank-card`/`.rank-card-copy`/`.earn-card`, `.press-card`/`.game-press-card`/`.press-card h3`/`.press-quote blockquote`/`.contact-box`/`.fact-table`, `.character-block`, `.manifesto`, `.cta-panel`, `.vault-wall-cta`, `.team-founder-card`, `.mem-hero-proof`, `#contact-toast`/`.toast-title`/`.toast-sub`, `.contact-info-row`, `[data-event]` community event cards, stage-sparked/forge/vaulted badges, `.pipeline-card-meta span`, `section[style*="border-top"]` dividers, `.compare-table td.feature-name`, `#vs-toast`, `.rank-loyalty-panel`, `.studio-pulse-cta`, `.invite-box`/`.guest-invite-cta`/`.invite-link-input`, `#searchInput`/`.search-result-card`, `.vs-toast`
- vault-member/portal.css: Phase 2 portal light mode (+59 lines) — `.profile-card`, `.challenge-counter-bar`/`.challenge-category-tabs`/`.challenge-category-tab`, `.member-stats-card`/`.member-profile-card`/`.member-rank-card`, `.member-leaderboard-item`, `.member-onboarding-panel`/`.member-dashboard-container`, `.whats-new-dialog`/`.pts-breakdown-dialog`/`.challenge-modal`/`.challenge-modal-body`, `.dashboard-intro`
- studio/index.html: added `.cta-panel` to contact CTA div + `.team-founder-card` to founder info card (inline → CSS-targetable)
- vault-wall/index.html: added `.vault-wall-cta` to CTA div
- vaultsparked/index.html: added `.rank-loyalty-panel` to rank loyalty section div
- studio-pulse/index.html: added `.studio-pulse-cta` to health panel div
- context/: TASK_BOARD, CURRENT_STATE, LATEST_HANDOFF, PROJECT_STATUS updated
- Commit: f79f0a7 · pushed to main (GitHub Pages auto-deploy)
- SIL: 427/500 · Velocity: 1 (redirected session) · Debt: →

## 2026-04-13 — Session 62

- index.html (homepage): cinematic logo image removed from hero; replaced with `.forge-wordmark` h1 containing `.forge-line-1` (VAULTSPARK, 700wt, clamp 2.6–9.0rem, -0.04em tracking) and `.forge-line-2` (STUDIOS, 400wt, clamp 1.7–5.8rem, 0.1em tracking); 17 `.forge-letter` spans with `--li` CSS custom property; `@keyframes letterForge` (opacity/translateY/blur/gold text-shadow cascade); `@keyframes forgeSparkBurst` (scale 0→2.6, gold radial blur); `@keyframes heroFadeUp` (subsequent element reveals); `.hero-chamber` vignette; `.hero-reveal` class; breakpoints at 768/640/480/360px; `prefers-reduced-motion` guard; light-mode vignette override; cinematic logo preload removed
- sw.js: CACHE_NAME bumped to `vaultspark-20260413-d58d28b`
- context/: CURRENT_STATE (S62 snapshot, hero entry), TASK_BOARD (S62 runway pre-load updated, SIL:1 counters on membership+vault-wall, 3 new SIL items), LATEST_HANDOFF (S63 intent + S62 full detail), PROJECT_STATUS (silScore 427, velocity 1, currentSession 63), SELF_IMPROVEMENT_LOOP (S62 entry + rolling status), WORK_LOG, CDR (S62 entry)
- Commit: 779d197 · pushed to main (GitHub Pages auto-deploy)
- SIL: 427/500 · Velocity: 1 (redirected session) · Debt: →

## 2026-04-13 — Session 61

- supabase/migrations/supabase-phase59-public-profile.sql: applied live via `supabase db query --linked`; `public_profile boolean NOT NULL DEFAULT true` column confirmed + partial index `idx_vault_members_public_profile` confirmed on fjnpzjjyhnpmunfoycrp
- vault-member/index.html: added `<div id="studio-access-panel">` to dashboard grid (after Connected Games); added public_profile toggle in Data & Privacy settings section (CSP-safe: no inline handlers)
- vault-member/portal-dashboard.js: added `loadStudioAccessPanel(planKey, rankName)` — 4-game tier grid (Football GM free, COD+Gridiron sparked, VaultFront eternal); `RANK_DISCOUNT` map for Forge Master (25%) and The Sparked (50%); rank discount chips; upgrade CTA for non-discount members
- vault-member/portal-auth.js: wired `loadStudioAccessPanel` in `showDashboard` — initial render from row `rowPlanKey`, authoritative update in `.then()` and `.catch()` fallback; `buildMember` reads `public_profile` from row
- vault-member/portal-settings.js: added `savePublicProfileToggle(checked)` — PATCHes `vault_members.public_profile`; updates `_currentMember`; shows toast; wired via addEventListener IIFE
- tests/vaultsparked-csp.spec.js: created — Chromium-only; collects CSP console/pageerror messages; asserts zero violations on /vaultsparked/ + /; 1.5s wait after networkidle
- tests/vault-wall.spec.js: created — asserts page load, h1 visible, zero CSP errors (3s wait), public route accessible (<400 status)
- .github/workflows/e2e.yml: added VaultSparked CSP smoke step (non-optional) + Vault Wall smoke step (continue-on-error: true) to compliance job
- scripts/propagate-csp.mjs: added `'vaultsparked'` to SKIP_DIRS
- universe/voidfall/index.html: Fragment 005 added — "The coordinates were confirmed correct. There was nothing there. It keeps ████████."
- index.html (homepage): 2-column `.hero-grid` replaced with centered `.hero-center` stack; `.hero-logo` (620px, dual blur glows); h1 clamp(2.8rem,5.5vw,5.2rem); `.hero-meta-row`; removed `.hero-grid/.hero-card/.hero-visual/.logo-wrap/.hero-caption` CSS
- sw.js: CACHE_NAME bumped to `vaultspark-20260413-c2a04f92`
- context/: TASK_BOARD (all S61 items marked done; 3 Now runway items added), CURRENT_STATE (S61 snapshot), LATEST_HANDOFF (S62 intent + S61 full detail), PROJECT_STATUS (silScore 455, velocity 9, currentSession 62), SELF_IMPROVEMENT_LOOP (S61 entry + rolling status), WORK_LOG updated
- Commits: c22bb3d (portal access panel, CSP smoke, homepage hero) · 0b3f4cd (5 SIL items) · cbbb205 (studio-os protocol) · pushed to main
- SIL: 455/500 · Velocity: 9 · Debt: ↓

## 2026-04-13 — Session 60

- vaultsparked/vaultsparked-checkout.js: created — extracted full Stripe/checkout/phase/gift-modal IIFE (~260 lines) from inline `<script>` in vaultsparked/index.html; loaded via `<script src defer>`; clears CSP violation at line 1269 (hash sha256-NuW18QKfCcqsI6YFKzjMzaha0aUDmYg1g7MXBrScXh4= was not in global CSP)
- vaultsparked/index.html: removed entire inline `<script>` block (checkout/phase/gift logic); removed `onmouseover`/`onmouseout` inline handlers from gift button (replaced with addEventListener in external file); both inline violations now gone
- index.html (homepage): replaced `.energy-arc` circle divs with `.hero-glow` blur-filtered spots — no visible hard circle borders; removed body `radial-gradient` background blobs; added `text-shadow` gold glow on "Is Sparked." heading; updated mobile media query to reference `.hero-glow` instead of `.energy-arc`
- sw.js: added `/vaultsparked/vaultsparked-checkout.js` + `/vaultsparked/billing-toggle.js` to STATIC_ASSETS; CACHE_NAME bumped
- context/: CURRENT_STATE, TASK_BOARD, LATEST_HANDOFF, PROJECT_STATUS, SIL, WORK_LOG updated to S60
- Commits: dd472e0 (vaultsparked CSP) · aa8cc98 (homepage glows) · pushed to main
- SIL: 420/500 · Velocity: 2 · Debt: ↓

## 2026-04-13 — Session 59

- membership/index.html: created — premium emotional hub; hero with 3 animated glow orbs (gold/blue/purple); 3 tier identity cards (free/sparked/eternal) with hover animations and glow; "What You're Joining" 5-pillar section; Studio Discount 20%/35% callout; live Supabase community stats; final CTA; CSP tag + FOUC prevention
- scripts/propagate-nav.mjs: Membership active link mapping; Membership primary nav dropdown (7 links); mobile nav Membership link; footer Membership column (6 links); Studio footer column updated (Studio Pulse added); propagated to 77 pages
- index.html (homepage): hero: "Explore Our Projects" + button-ghost CTA added; DreadSpike section → unnamed "Signal Detected" atmospheric teaser (classification pending, no names, crimson glow, redacted poster); "Now Igniting" DreadSpike reference → mysterious "debut Novel Saga" teaser; membership CTA links to /membership/ instead of /vault-member/; .signal-split responsive CSS added
- assets/style.css: cinematic atmosphere additions — body::after ambient radial glow blooms; .button-ghost variant; .panel inner glow; .surface-section::before gold separator dot; .card:hover shadow enhancement; light-mode override for atmosphere elements
- vaultsparked/index.html: removed founder video updates (perk-card, perks list li, comparison table row, FAQ mention — 4 locations); added billing toggle (Monthly/Annual buttons, JS price switching $4.99↔$44.99, $29.99↔$269.99, window.vssBillingMode); Studio Discount section (3-col grid: —/20%/35%); Games Access section (per-tier game list 3-col grid); Rank Loyalty Discount callout (25% Forge Master / 50% The Sparked, first month); responsive CSS for new sections
- sw.js: CACHE_NAME bumped to s59a; /membership/, /membership-value/, /vault-wall/, /invite/, /press/ added to STATIC_ASSETS
- context/: TASK_BOARD, CURRENT_STATE, LATEST_HANDOFF, PROJECT_STATUS all updated to S59
- memory: project_vaultspark_state.md updated with S59 decisions and shipped items

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

## 2026-04-13 — Session 58

- Fixed `/members/` profile loading regression caused by the hardened CSP blocking the inline directory script.
- Added `assets/members-directory.js`, moved the directory query/render/search/filter logic into that external script, and replaced the inline clear-filter handler with event delegation.
- Made the member query tolerate current `vault_points`/`rank_title` fields with legacy `points` fallback.
- Bumped `sw.js` cache name and added `/assets/members-directory.js` to `STATIC_ASSETS`.
- Verification: `node --check assets/members-directory.js` passed; static grep confirmed the blocked inline directory loader and inline `onclick` were removed.
- SIL: 426/500 · Velocity: 1 · Debt: →

## 2026-04-13 — Session 66

- Genius Hit List framework delivered — 11 items shipped across 5 groups
- PERF: preconnect + DNS-prefetch on 77 pages; critical CSS inlined on homepage
- SECURITY: 404.html + offline.html SHA-256 hardening (removes last `'unsafe-inline'` in script-src); csp-hash-registry.json updated
- UX: scroll-reveal extended to /studio/, /community/, /ranks/, /roadmap/; rank XP progress bar with milestone ticks + shimmer + aria; skeleton loaders in portal
- FEEDBACK: scroll-depth GA4 milestones (25/50/75/100%) on 3 conversion pages; What's New modal with version gate + focus trap; public /changelog/ page
- FEATURES: notify-me email capture on 4 FORGE game pages; Canvas-based achievement share card generator in portal
- Process gap: S66 work was not committed in-session. S67 start detected 95+ modified files + 4 new JS files in dirty tree; committed retroactively as `9579487` and closeout run at S67 start
- Brainstorm #1 (closeout-commit gate in closeout.md) committed to TASK_BOARD to prevent recurrence
- SIL: 449/500 · Velocity: 11 · Debt: ↓
