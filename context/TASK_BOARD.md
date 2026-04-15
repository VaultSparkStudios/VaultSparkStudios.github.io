# Task Board — VaultSparkStudios.github.io

Last updated: 2026-04-15 (Session 70 audit execution + public intelligence layer)

## Now (S70 audit execution)

- [x] **[AUDIT] Public intelligence generator** — `scripts/generate-public-intelligence.mjs` now compiles a public-safe truth payload from `PROJECT_STATUS.json`, `TASK_BOARD.md`, and `LATEST_HANDOFF.md` into `api/public-intelligence.json`.
- [x] **[AUDIT] Live Studio Pulse** — `/studio-pulse/` now reads live session/focus/queue/catalog data from the generated public intelligence payload via `assets/public-intelligence.js` + `assets/studio-pulse-live.js` instead of frozen hardcoded Session 55 content.
- [x] **[AUDIT] Shared live proof layer** — `assets/live-proof.js` now hydrates homepage, membership, and VaultSparked proof counters from the same public Supabase queries instead of page-specific duplicate scripts.
- [x] **[AUDIT] Adaptive CTA baseline** — `assets/adaptive-cta.js` now shifts key CTAs based on session/referral/membership-intent state across homepage, membership, VaultSparked, join, and invite.
- [x] **[AUDIT] Funnel stage telemetry baseline** — `assets/funnel-tracking.js` now supports stage events and auto-detects engagement/submit starts for tagged forms; join/contact/invite scripts now emit stage success/error transitions.
- [x] **[AUDIT] Generated CSP source** — `config/csp-policy.mjs` now owns the canonical page/Worker/redirect CSP variants; `scripts/propagate-csp.mjs`, `scripts/csp-audit.mjs`, and `cloudflare/security-headers-worker.js` all consume that shared source instead of carrying duplicated policy strings.
- [x] **[AUDIT] Investor surface hardening** — legacy `investor/**` redirects now use minimal redirect pages plus `assets/redirect-page.js`; inline GA/bootstrap/redirect code was removed and the route family no longer depends on `script-src 'unsafe-inline'`.
- [ ] **[AUDIT] Studio Hub + social dashboard bridge** — promote selected public-safe Studio OS / Studio Hub / social signals into the site’s intelligence payload rather than keeping the bridge repo-local only.
- [ ] **[AUDIT] Public AI concierge / pathways** — build a constrained intent router for player / member / supporter / investor / lore-seeker entry paths.
- [ ] **[AUDIT] Cohesion pass for related-content graph** — deepen cross-links between games, projects, universe, membership, journal, changelog, and studio surfaces.

- [ ] **[SIL:2⛔] Genius Hit List as scheduled audit** — schedule recurring audit job that generates `docs/GENIUS_LIST.md` without human prompt.
- [ ] **[SIL:1] Live Worker header verification script** — codify the browser-like header check used in S69 so post-deploy verification does not rely on ad hoc curl commands. First step: add `scripts/verify-live-headers.mjs` for `/` and `/vaultsparked/`.
- [ ] **[SIL:1] Local Worker deploy helper** — add a small wrapper/script that checks Wrangler auth and deploys `cloudflare/security-headers-worker.js` safely when GitHub Actions cannot. First step: script a `cloudflare/deploy-worker-local.ps1` flow around `wrangler whoami` + `wrangler deploy --env production`.

## Next (S70 post-closeout)

- [ ] **[AUDIT] Auto-generate public intelligence during closeout/build** — wire `node scripts/generate-public-intelligence.mjs` into the closeout/deploy path so public truth cannot drift after memory updates.
- [ ] **[AUDIT] Local browser verification target** — add a local static-server/browser smoke path so Playwright can verify unshipped working-tree changes instead of defaulting to live production.
- [ ] **[AUDIT] Studio Hub + social dashboard intelligence contract** — define a shared public-safe schema that can feed homepage intelligence, Studio Pulse, Studio Hub, and future social widgets from one source.

## Now (S69 runway pre-load)

- [ ] **[SIL:2⛔] IGNIS Rescore** — still stale since 2026-04-07. Run `node ../vaultspark-studio-ops/scripts/ops.mjs rescore --project vaultsparkstudios-website`.
- [ ] **[AUDIT] Conversion funnel instrumentation + feedback states** — **partial S68**: `/membership/`, `/vaultsparked/`, `/invite/`, `/join/`, and `/contact/` now have CTA/view events and stronger feedback panels, but stage-by-stage reporting and broader form outcome coverage still need completion.
- [ ] **[AUDIT] Premium proof/depth pass on conversion pages** — **partial S68**: homepage, membership, and VaultSparked now show live recent shipped work / live vault proof / stronger next-step messaging. Continue with member outcomes, testimonials, and trust objections handling.
- [ ] **[SIL] Annual Stripe checkout routing** — HAR-blocked; Studio Owner creates $44.99/yr + $269.99/yr Stripe prices first. Exempt from [SIL:N] increment until HAR cleared.
- [ ] **[CF-WORKER-TOKEN]** HAR — Add `CF_WORKER_API_TOKEN` secret to GitHub repo (Workers:Edit + Zone:Read). S69 proved the manual Wrangler fallback works, but automatic Worker CSP sync is still blocked without this secret.

---

## Now

- [x] **[SIL] robots.txt Cloudflare note** — added comment explaining Cloudflare AI Labyrinth injects directives at CDN edge (S46)
- [x] **[SIL] prefers-reduced-motion guard** — global `@media (prefers-reduced-motion: reduce)` rule already present in style.css (line ~1464); disables all animations including nav-enter. Done.
- [x] **[SIL] closeout.md sync** — updated `prompts/closeout.md` to studio-ops v2.4: removed Step 7.5, added Step 8.5 (S46)
- [x] **[SIL] Theme persistence test contract** — replaced `#theme-select` assertions with `#theme-picker-btn` + `.theme-option[data-theme=x].active`; `body[data-theme]` assertions preserved (S46)
- [x] **[SIL] Nav backdrop opacity by theme** — added `--nav-backdrop-overlay` var to `:root` (dark) and `body.light-mode` (45% dark-navy); `#nav-backdrop` now uses var (S46)
- [x] **[SIL] Theme picker swatch pulse** — `@keyframes swatch-pulse` added; `.swatch-pulse` class toggled in click handler + cleaned up on label reset (S46)
- [x] **[SIL] Portal nav admin link** — added `id="nav-admin-link"` to nav-account-menu in `vault-member/index.html`; `display:none` by default; JS shows it for admin users (S47)
- [x] **[SIL] Referral attribution wire** — `p_ref_by: sessionStorage.getItem('vs_ref')` wired into all 3 `register_open` RPC calls in `portal-auth.js` + `portal.js` (S47); **requires DB migration**: add `p_ref_by` param to `register_open` Supabase function (human action — see below)

---

## Now

- [x] **[S55] Theme picker bug fix** — `.theme-option { display:none }` legacy CSS rule was hiding all theme tiles; removed `theme-option` class from tile buttons in `theme-toggle.js:399`
- [x] **[S55] Press kit page (`/press/`)** — full media kit with facts table, bio, logo grid, game catalog, press contact
- [x] **[S55] Studio Pulse (`/studio-pulse/`)** — Now/Next/Shipped board, game status grid, studio health panel
- [x] **[S55] Vault Wall (`/vault-wall/`)** — live member recognition wall with rank distribution bar, podium, leaderboard, recently joined
- [x] **[S55] Invite page (`/invite/`)** — referral program UX with copy link, social share, stats, rewards cards, top inviters leaderboard
- [x] **[S55] Social proof strip on homepage** — live member count, VaultSparked count, challenges completed, rank distribution bar
- [x] **[S55] Daily loop widget in portal** — login streak + active challenge title + login bonus chip above dashboard panes
- [x] **[S55] Founding Vault Member badge** — `supabase-phase57-founding-vault-badge.sql` migration; awards 🏛️ badge + 500 XP to first 100 members; comparison table + FAQ entry added to `/vaultsparked/`; **migration applied 2026-04-12 — 4 founding members badged: DreadSpike, OneKingdom, VaultSpark, Voidfall**
- [x] **[S55] Game page conversion** — social share + "More From the Vault" section added to Call of Doodie page
- [x] **[S55] Nav propagated** — 75 pages updated with canonical nav/footer (new pages included)

- [x] **[SIL:2⛔] Theme picker compact mode at 641–980px** — added `.theme-picker-label { display:none }` + `.theme-picker-arrow { display:none }` to `@media (max-width:980px)` block in `assets/style.css` (S57)
- [x] **[SIL:2⛔] CF Worker auto-redeploy via GitHub Actions** — created `.github/workflows/cloudflare-worker-deploy.yml`; triggers on `cloudflare/**` changes on main push; uses `npx wrangler@3 deploy --env production` with `CF_WORKER_API_TOKEN` secret (S57)
- [x] **[S55 follow-up] Studio About enhancement** — added "Why VaultSpark" founder story section to `/studio/index.html`; personal narrative with origin story, philosophy blockquote, vault pressure metaphor; inserted before "Who Runs The Vault" section (S57)
- [x] **[S55 follow-up] Portal daily loop `VSPublic` verify** — confirmed ✅ `supabase-public.js` assigns `window.VSPublic` at line 77; loaded in `<head>` without defer; available before portal JS at end of `<body>`
- [x] **[SIL] Genesis badge slots-remaining counter** — added `<span id="genesis-slots-left">` to `/vaultsparked/` FAQ answer; created `/vaultsparked/vaultsparked.js` with live counter logic (3-tier colour: gold/orange/crimson); 2-step PostgREST query excludes 4 studio UUIDs from count; script loads as `defer` (S57)
- [x] **[SIL] Vault Wall opt-in toggle (Phase 1)** — created `supabase/migrations/supabase-phase59-public-profile.sql` (adds `public_profile boolean DEFAULT true`); updated vault-wall queries to filter `.eq('public_profile',true)`; fixed broken `.count().head()` → `.count().get()` bug (S57); **[HAR] run db-migrate workflow to apply migration**
- [x] **[SIL] Achievement SVG icons — VaultSparked + Forge Master** — created `assets/images/badges/vaultsparked.svg` (purple crystal gem, violet gradient, gold crown spark) and `assets/images/badges/forge-master.svg` (anvil + spark burst, crimson ring, ember particles) (S57)
- [x] **[S58 Fix] Members directory profiles not showing** — moved CSP-blocked inline `/members/` directory loader to `assets/members-directory.js`; removed inline clear-filter handler; query now prefers `vault_points`/`rank_title` and falls back to legacy `points`; bumped SW cache.

- [x] **[S59] Homepage redesign** — hero: "Explore Projects" CTA added + button-ghost variant; DreadSpike section converted to unnamed "Signal Detected" atmospheric teaser (classification pending, no names); membership CTA → /membership/; "Now Igniting" DreadSpike reference removed (S59)
- [x] **[S59] All pages: same atmosphere** — shared CSS atmosphere in style.css: body::after ambient glow, panel inner glow, surface-section gold separator dot, button-ghost variant, card hover shadow enhancement (S59)
- [x] **[S59] Create /membership/index.html** — premium emotional hub: hero with 3 animated glow orbs; 3 tier identity cards (free/sparked/eternal) with hover; "What You're Joining" 5-pillar section; studio discount 20%/35% callout; community stats (live Supabase); final CTA (S59)
- [x] **[S59] Nav template: Membership dropdown** — 7-link Membership dropdown added to propagate-nav.mjs; propagated to 77 pages; active link mapping added; footer Membership column added; Studio Pulse added to Studio footer column (S59)
- [x] **[S59] Footer template update** — Membership column (6 links), Studio column updated (Studio Pulse + cleanup); propagated 77 pages (S59)
- [x] **[S59] /vaultsparked/ overhaul** — removed founder video updates (4 locations); billing toggle (Monthly/Annual, JS price switching $4.99↔$44.99, $29.99↔$269.99); Studio Discount section (3-tier grid); Games Access section (per-tier); Rank Loyalty callout (25%/50%) (S59)
- [x] **[S59] Portal: Studio Access panel** — `<div id="studio-access-panel">` added to dashboard grid; `loadStudioAccessPanel(planKey)` in portal-dashboard.js renders 4 games with locked/unlocked state per tier; wired in portal-auth.js showDashboard (initial + authoritative subscription update) (S61)
- [x] **[SIL] Portal settings: public_profile toggle** — "Show my profile on the Vault Wall" toggle added to portal settings privacy section; `savePublicProfileToggle()` PATCHes `public_profile` via Supabase SDK; wired via addEventListener in IIFE (CSP-safe); phase59 migration applied live S61 (S61)
- [x] **[S59] Wire achievement SVG icons to portal** — ACHIEVEMENT_DEFS updated in portal-core.js (genesis_vault_member, vaultsparked, forge_master); async relational fetch wired in portal-auth.js showDashboard (S59)
- [x] **[SIL] Vault Wall: verify post-migration** — phase59 migration applied live S61 (`public_profile boolean NOT NULL DEFAULT true` + partial index confirmed); `tests/vault-wall.spec.js` smoke spec created and wired into CI (continue-on-error); live filter `.eq('public_profile',true)` active (S61)
- [x] **[S60] VaultSparked CSP violations cleared** — all 3 blocked scripts resolved: externalized Stripe/checkout/phase/gift IIFE (260 lines) to `/vaultsparked/vaultsparked-checkout.js`; removed inline `onmouseover`/`onmouseout` from gift button (replaced with addEventListener); billing-toggle.js already external (S59). Zero inline scripts on the page. (S60)
- [x] **[S60] Homepage circular element fix** — replaced hard-edged energy arc circles (the "weird circular addition") with blur-filtered diffuse `.hero-glow` spots; removed body radial gradient blobs; added gold `text-shadow` on "Is Sparked." for visible impact. (S60)
- [x] **[SIL] VaultSparked CSP smoke test** — `tests/vaultsparked-csp.spec.js` created; Chromium-only; `page.on('console')` collects CSP errors; asserts zero violations on /vaultsparked/ + homepage; wired into e2e.yml compliance job as non-optional step (S61)
- [x] **[SIL] Homepage hero structural redesign** — replaced 2-column grid (text left / logo card right) with full-width centered cinematic stack: eyebrow → logo banner (`.hero-logo`, 620px max, blur glows) → h1 inline → `.hero-sub` centered → CTAs centered → `.hero-meta-row` (chips + stats) → hero-story. Removed `.hero-card`/`.hero-visual`/`.logo-wrap` CSS. CDR direction satisfied (S61)
- [x] **[SIL] propagate-csp SKIP_DIRS: add vaultsparked** — `'vaultsparked'` added to SKIP_DIRS in `scripts/propagate-csp.mjs`; future global CSP propagation runs will skip the directory entirely (S61)
- [x] **[SIL] Voidfall Fragment 005** — 5th Transmission Archive card added to `/universe/voidfall/`; coordinates confirmed correct, nothing there, "keeps ████████"; continues intercept log pattern with new redaction teaser (S61)
- [x] **[SIL] Portal: rank loyalty discount display** — Forge Master (25%, crimson chip) and The Sparked (50%, gold chip) rank loyalty discounts shown in Studio Access panel; `RANK_DISCOUNT` map in `loadStudioAccessPanel()`; non-discount members see upgrade CTA instead (S61)

## Now (S63 runway pre-load)

- [x] **[SIL] Homepage hero forge ignition redesign** — forge-wordmark h1 with letterForge animation, forge-spark-burst, hero-chamber vignette, hero-reveal cascade; cinematic logo removed from hero; full responsive; prefers-reduced-motion guard; light-mode overrides. Deployed 2026-04-13 (S62).
- [x] **[SIL] Light mode Phase 2 complete overhaul** — 227 lines added across style.css + portal.css; fixed rank-card, press-card, character-block, manifesto, contact-box, pipeline-card meta, stage badges, [data-event] community cards, cta-panel, vault-wall-cta, compare-table, search inputs, invite-box, guest-invite-cta, #vs-toast, #contact-toast; portal: profile-card, challenge-category-tabs, member stats/rank/leaderboard cards, dialogs, dashboard containers; added CSS classes to 4 inline-style HTML elements (studio, vault-wall, vaultsparked, studio-pulse). Deployed 2026-04-13 (S63 redirect).
- [x] **[SIL:1] Membership page social proof live data** — Inline CSP-blocked script externalized to `assets/membership-stats.js` (defer, uses VSPublic); proof-members/stat-members/proof-sparked/stat-sparked/stat-challenges all live-wired. Deployed S64.
- [x] **[SIL:1] Vault Wall manual smoke** — retired S65; replaced by `tests/vault-wall.spec.js` Playwright automation (asserts `#rank-dist-bar`, `#vw-podium`, pageerror CSP listener, auth-free access).
- [ ] **[SIL] Annual Stripe checkout routing** — when `vssBillingMode === 'annual'`, route to annual price IDs; add `ANNUAL_PRICE_IDS` map to `vaultsparked/billing-toggle.js`; HAR first: Studio Owner creates $44.99/yr + $269.99/yr Stripe prices. Exempt from [SIL:N] increment until HAR cleared.
- [x] **[SIL] Wire SVG achievement icons to portal defs** — Already wired in S59; portal-core.js ACHIEVEMENT_DEFS confirms SVG paths for genesis_vault_member, vaultsparked, forge_master. Task verified complete S64.
- [x] **[SIL] Site-wide scroll reveals** — `assets/scroll-reveal.js` created (IntersectionObserver, fade-up); CSS added to `assets/style.css` with prefers-reduced-motion guard; 6 homepage sections tagged with `data-reveal="fade-up"`. Deployed S64.
- [x] **[SIL] Extend light-mode screenshot spec** — `tests/light-mode-screenshots.spec.js` extended from 3 to 10 pages: added press, contact, community, studio, roadmap, universe, membership. Deployed S64.

## Now (S65 runway pre-load)

- [x] **[SIL] Inline style= dark color audit** — 4 hits in index.html signal section; converted outer panel, image card, classified chip to CSS classes (`signal-teaser-panel`, `signal-image-card`, `signal-classified-chip`); light-mode overrides added to style.css. (S65)
- [x] **[SIL] Light-mode gold contrast** — `--gold: #7a5c00` added to `body.light-mode {}` in style.css; ~5:1 contrast on cream bg (WCAG AA). Dark countdown panels get explicit `#FFC400` override. (S65)
- [x] **[SIL:2⛔] Vault Wall manual smoke** — retired via Playwright spec; `tests/vault-wall.spec.js` now asserts `#rank-dist-bar`, `#vw-podium`, pageerror CSP listener, and auth-free access. (S65)
- [ ] **[SIL] Annual Stripe checkout routing** — HAR-blocked; Studio Owner creates $44.99/yr + $269.99/yr Stripe prices first.
- [x] **[SIL] Vault Wall Playwright spec** — `tests/vault-wall.spec.js` enhanced: `#rank-dist-bar` visible assertion, `#vw-podium` visible assertion, pageerror CSP listener, rank-dist-seg count (soft warn), public auth-free route check. Replaces manual smoke. (S65)
- [x] **[SIL] CSP hash registry** — `scripts/csp-hash-registry.json` created (vaultsparked/index.html, 404.html, offline.html); `propagate-csp.mjs --check-skipped` flag added; all 3 pages verified OK. (S65)
- [x] **[SIL] Scroll reveals — /membership/ + /press/** — `data-reveal="fade-up"` added to 5 membership sections (tiers, identity, discount, community, final-cta) and 6 press sections (facts, quote, logos, catalog, vault member, contact). (S65)

## Now (S66 runway pre-load)

- [ ] **[IGNIS] Rescore — mandatory** — `node ../vaultspark-studio-ops/scripts/ops.mjs rescore` at S66 start; IGNIS is 7+ days stale (last computed 2026-04-07). First step: open studio-ops session and run CLI.
- [x] **[SIL] Extend scroll-reveal to /studio/, /community/, /ranks/, /roadmap/** — scroll-reveal.js linked on all 4 pages; data-reveal="fade-up" added to key sections. (S66)
- [x] **[SIL] 404/offline.html SHA hardening** — `'unsafe-inline'` replaced with computed SHA-256 hashes in both files; `scripts/csp-hash-registry.json` updated with hashes + reason notes. (S66)
- [ ] **[SIL] Annual Stripe checkout routing** — HAR-blocked; Studio Owner creates $44.99/yr + $269.99/yr Stripe prices first. Exempt from [SIL:N] increment until HAR cleared.
- [ ] **[CF-WORKER-TOKEN]** Add `CF_WORKER_API_TOKEN` secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.

## Now (S66 Genius Hit List — implemented)

- [x] **[S66 PERF] Preconnect + GTM/Stripe DNS-prefetch** — `propagate-nav.mjs` updated to inject `preconnect` for GTM + `dns-prefetch` for GTM, Google Analytics, and Stripe on every page; 77 pages updated. (S66)
- [x] **[S66 SECURITY] 404/offline SHA hardening** — see above (S66)
- [x] **[S66 UX] Scroll-reveal on /studio/, /community/, /ranks/, /roadmap/** — see above (S66)
- [x] **[S66 FEEDBACK] Scroll-depth GA4 milestones** — `assets/scroll-depth.js` created; fires `scroll_milestone` at 25/50/75/100% on homepage, /membership/, /vaultsparked/. (S66)
- [x] **[S66 UX] Rank XP progress bar enhancement** — milestone ticks, shimmer animation >80%, aria-progressbar attrs, XP count label below bar. (S66)
- [x] **[S66 UX] Skeleton loaders for portal panels** — CSS pulse skeleton (`.skeleton`, `.skeleton-line`, `.skeleton-circle`, `.skeleton-card`) in portal.css; :empty pattern applied to profile/stats/achievements containers. (S66)
- [x] **[S66 FEEDBACK] What's New portal modal enhancement** — PORTAL_VERSION constant; localStorage `vs_portal_last_seen` gate; hardcoded S66 fallback items; Escape dismiss + focus trap. (S66)
- [x] **[S66 FEATURE] Game Notify Me forms** — `assets/notify-me.js` created; email capture with Web3Forms on all 4 FORGE game pages (vaultfront, solara, mindframe, the-exodus). (S66)
- [x] **[S66 PERF] Critical CSS inline for homepage** — above-fold hero CSS extracted and inlined in index.html `<head>`; stylesheet moved to non-render-blocking load. (S66)
- [x] **[S66 FEATURE] Achievement share card generator** — `vault-member/portal-share.js` created; Canvas PNG 1200×630 on badge unlock with download + copy-to-clipboard. (S66)
- [x] **[S66 FEEDBACK] Public changelog at /changelog/** — new page listing all shipped sessions; added to sitemap.xml. (S66)

## Now (S67 runway pre-load)

- [ ] **[SIL:2⛔] IGNIS Rescore** — moved to S68 runway above (now past staleness threshold).
- [ ] **[SIL:1] Closeout-commit gate** — moved to S68 runway above.
- [ ] **[SIL:1] Genius Hit List as scheduled audit** — moved to S68 runway above.
- [ ] **[SIL] Annual Stripe checkout routing** — HAR-blocked; Studio Owner creates $44.99/yr + $269.99/yr Stripe prices first. Exempt from [SIL:N] increment until HAR cleared.
- [ ] **[CF-WORKER-TOKEN]** HAR — Add `CF_WORKER_API_TOKEN` secret to GitHub repo (Workers:Edit + Zone:Read).

## Next

- [x] **[SIL] CSP propagation script** — `scripts/propagate-csp.mjs` created; single CSP_VALUE constant at top propagates to all HTML files via `node scripts/propagate-csp.mjs` (S47)
- [x] **[SIL] Staging smoke test script** — `scripts/smoke-test.sh` created; 12 key URLs, exits non-zero on failure; enforces CANON-007 (S47)
- [x] **[SIL] Light-mode screenshot smoke** — `tests/light-mode-screenshots.spec.js` created; Chromium-only, 3 pages, forced light-mode via localStorage (S47)
- [x] **[SIL] IGNIS delta field** — `ignisScoreDelta` added to `PROJECT_STATUS.json`; closeout Step 8 updated to compute and write it (S47)
- [x] **[SIL] Join form GA4 form_error** — `form_error` gtag event added to vault access request catch handler in `join/index.html` (S50)
- [x] **[SIL] Voidfall chapter I excerpt** — "First Pages" section added to `/universe/voidfall/` with opening Chapter I prose + locked volume badge (S50)
- [x] **[SIL] Light-mode screenshot CI** — `tests/light-mode-screenshots.spec.js` wired into compliance job; screenshots uploaded as 14-day artifact (S50)

- [x] **[SIL] Voidfall subscription GA4** — `form_submit` gtag event added to Kit subscribe success handler in `universe/voidfall/index.html` (S51)
- [x] **[SIL] Voidfall Fragment 004** — 4th Transmission Archive card added; named thing, the answer, fully redacted (S51)
- [x] **[SIL] DreadSpike signal log entry** — intercept-transmission card added to DreadSpike universe page (S53)
- [x] **[SIL] Voidfall entity 4 hint** — atmospheric one-liner below The Crossed row hinting at unclassified 4th entity (S53)
- [x] **[SIL] Remove inline onclick handlers from vault-member/index.html** — all onclick/onchange/onmouseenter removed; portal-init.js extracted; portal-core.js event wiring complete; CSP updated to SHA-256 hashes; 85 pages propagated (S53)
- [x] **[SIL] Cloudflare cache purge on deploy** — `.github/workflows/cloudflare-cache-purge.yml` created; triggers on push to main; uses CF_API_TOKEN + CF_ZONE_ID secrets (S53)

## Next (prior)

- [ ] **Per-form Web3Forms keys** — create 3 separate keys in Web3Forms dashboard (join/, contact/, data-deletion/) for per-form lead tracking; update access_key values in each HTML [low priority]
- [ ] **Cloudflare WAF rule (CN/RU/HK)** — JS Challenge firewall rule; requires API token with Zone / Firewall Services / Edit + Zone / Zone / Read; or Studio Owner can create in dashboard [human action / provide token]
- [ ] **Web3Forms browser test** — manually submit /join/ and /contact/ to confirm email delivery to inbox [human action]
- [ ] **[SIL] Add `beacon.env`** — once Studio Owner runs `node scripts/configure-beacon.mjs` in studio-ops, copy resulting `.claude/beacon.env` to this repo (gitignored); enables active session indicator in Studio Hub

---

## Deferred to Project Agents

- cross-repo item owned by another repo agent:

## Blocked

*(none)*

---

## Later

- [x] **Voidfall teaser → full page** — expanded with Transmission Archive (3 fragments), The Signal world-building, Known Entities (3 entities), Saga meta grid; CSS added (S47)
- [x] **Sentry release tagging** — `.github/workflows/sentry-release.yml` created; tags each main push as a Sentry release; requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT repo secrets/vars (human action to configure, S47)
- [ ] **`/vaultsparked/` Phase 2** — open Phase 2 when Phase 1 fills (subscriber_cap)
- [ ] **Web push test** — subscribe in portal, upload classified file, verify notification received

---

## Human Action Required

- [x] **[DB] `register_open` migration** — phase56 applied live (S48): `referred_by` column, `p_ref_by` param, milestones updated ✅
- [x] **[Sentry] Configure release workflow** — `SENTRY_AUTH_TOKEN` secret set; org/project hardcoded in workflow; CI passing (S48) ✅
- [ ] **[WEB3FORMS]** Test contact form from browser — confirm email arrives at founder@vaultsparkstudios.com (server-side test blocked by Web3Forms free tier)
- [ ] **[WAF]** Confirm Cloudflare WAF JS Challenge rule for CN/RU/HK is active in dashboard (or provide API token)
- [ ] **[BEACON]** Run `node scripts/configure-beacon.mjs` in studio-ops → copy `.claude/beacon.env` here
- [ ] **[WEB3FORMS-KEYS]** Create 3 separate keys in Web3Forms dashboard (join/, contact/, data-deletion/) for per-form lead tracking [low priority]
- [x] **[DB] Founding Vault Badge** — migration applied 2026-04-12 via Supabase CLI; 4 founding members badged: DreadSpike, OneKingdom, VaultSpark, Voidfall ✅
- [x] **[CF-SECRETS]** Add `CF_API_TOKEN` (Zone/Cache Purge) and `CF_ZONE_ID` secrets to GitHub repo → Settings → Secrets; enables auto cache purge workflow added S53 ✅ (S54)
- [x] **[CSP-VERIFY]** After S53 deploy: open vault-member/index.html in DevTools console (incognito); confirm zero `Content-Security-Policy` errors ✅ (S54 — verified; remaining Cloudflare edge-injected inline scripts are platform-generated, unfixable with static hashes, accepted as limitation)
- [ ] **[CF-WORKER-TOKEN]** Add `CF_WORKER_API_TOKEN` secret to GitHub repo → Settings → Secrets → Actions. Needs Cloudflare API token with **Workers Scripts: Edit** + **Zone: Read** permissions (different from `CF_API_TOKEN` which is cache-purge only). Once set, every `cloudflare/**` push auto-deploys the Worker.
- [x] **[DB] Phase59 public_profile migration** — applied S61 via `supabase db query --linked`; `public_profile boolean NOT NULL DEFAULT true` column confirmed; partial index `idx_vault_members_public_profile` confirmed. Portal toggle + vault-wall filter now live. ✅

---

## Done (recent)

- [x] **S69: repo-wide CSP cleanup + live Worker deploy** — legacy public-route inline-handler debt burned down across the audit batches; `assets/public-page-handlers.js` + `assets/error-pages.js` added for shared runtime; canonical/Worker CSP synchronized; `node scripts/csp-audit.mjs` now passes across 93 HTML files; Worker redeployed live via Wrangler (`f0c9672a-25ae-413f-b131-e0ee9027b69b`) and production headers verified on `/` + `/vaultsparked/`.
- [x] **S55: 10-item website improvements batch** — press kit, studio pulse, vault wall, invite page, social proof strip, daily loop widget, founding badge SQL, game conversion section, theme picker bug fix, nav propagated (75 pages)
- [x] **QR code CDN 404 fix + theme picker breakpoint fix + tile color improvements (S54)** — qrcode@1.5.3→@1.5.0; picker CSS moved from 980px→640px breakpoint; tileColor field; CF-SECRETS + CSP-VERIFY HAR cleared
- [x] **CSP hardening: 'unsafe-inline' removed, SHA-256 hashes, portal-init.js extracted, DreadSpike/Voidfall lore, CF cache purge workflow (S53)**
- [x] **Auth tab hash routing + CSP Worker fix + theme tile picker + PromoGrind sign-in (S52)**
- [x] **Voidfall dispatch GA4 + Fragment 004 (S51)**
- [x] **CSP Turnstile fix + 3 SIL items (S50)** — canonical CSP updated with challenges.cloudflare.com (Turnstile); re-propagated 85 pages; join form GA4 form_error; Voidfall Chapter I excerpt; light-mode screenshot CI
- [x] **CSP propagated + CI check + GA4 events (S49)** — 85 pages synced; e2e.yml CSP dry-run gate; contact form_submit/form_error events
- [x] **Full audit implementation — 9 items (S47)** — portal admin link, referral attribution wire (3 RPC call sites), CSP propagation script, staging smoke test, IGNIS delta field, light-mode screenshot spec, Voidfall page expansion (4 new sections), Sentry release workflow
- [x] **SIL Now queue — 5 items (S46)** — robots.txt note, closeout.md sync, theme-persistence spec fix, nav backdrop opacity var, swatch-pulse animation
- [x] **Portal auth tab switching on referral link (S45)** — added missing portal nav HTML (`nav-account-wrap`, notif bell, `nav-signin-link`, `nav-join-btn`); null guards in `showAuth`/`showDashboard`; `?ref=` referral banner + sessionStorage tracking; theme picker hover-preview + DEFAULT badge + confirmation flash
- [x] **Mobile nav blur + clicks fix, theme FOUC, premium picker (S44)** — removed backdrop-filter from #nav-backdrop (iOS compositing root cause); injected inline theme script at body start across 72 pages; redesigned mobile nav; replaced select with custom picker; light mode CSS fixes
- [x] **Rights posture correction (S43)** — replaced public MIT/open-source claims with a proprietary IP notice + third-party attributions page; propagated footer/resource label to `Technology & Rights`; updated sitemap labels and compliance-page title expectation
- [x] **Dark-panel contrast hardening (S42)** — restored white copy on intentionally dark membership/rank/character sections in light mode; fixed homepage Vault-Forge paragraph and public `/ranks/` dark cards; updated `assets/style.css`, `index.html`, `ranks/index.html`, and `vault-member/portal.css`
- [x] **Light-mode contrast cleanup follow-up (S41)** — darkened light-mode support text tokens, fixed unreadable titles over dark project/game art, and converted shared dark card/panel patterns to real light surfaces in `assets/style.css`
- [x] **Refined shared light mode (S40)** — overhauled light palette and component surfaces in `assets/style.css`; fixed low-contrast `--steel`/muted text issues; updated browser theme color in `assets/theme-toggle.js`
- [x] **SIL Now items — polish + CI reliability (S39)** — mobile nav entrance animation (@keyframes nav-enter); .hero-art > .status CSS guard; Lighthouse wait-on deployment timing
- [x] **Mobile nav iOS blur — root fix (S38)** — disabled .site-header::before backdrop-filter at ≤980px; S36 fix removed overlay blur but header's ::before still promoted GPU layer containing fixed nav on iOS Safari
- [x] **IGNIS scored + staging confirmed (S37)** — 47,091/100,000 · FORGE tier (rescored S38); staging HTTP 200 confirmed
- [x] **STRIPE_GIFT_PRICE_ID + GSC (S37)** — gift product + $24.99 price created via Stripe API; secret set; GSC sitemap submitted + verified
- [x] **UI bug fixes (S36)** — mobile nav blur partial fix (backdrop-filter on overlay removed); status badge DOM position fixed on 8 project pages
- [x] **CI fixes (S35)** — Lighthouse SEO (robots-txt off, vault-member removed, link-text aria-label), axe ChromeDriver mismatch fixed
- [x] **Protocol restore (S34)** — CLAUDE.md session aliases, AGENTS.md, prompts/start.md v2.4, context files restored
- [x] **Cloudflare security hardening (S33)** — .nojekyll, security.txt, robots.txt (14 AI crawlers), CSP patch, X-Robots-Tag, Worker redeployed
- [x] **Voidfall teaser page (S32)** — /universe/voidfall/ + sitemap entries
- [x] **Universe dropdown (S32)** — 72 files updated with DreadSpike + Voidfall dropdown
- [x] **Portal onboarding tour (S32)** — 3-step overlay gated on vs_onboarding_done
- [x] **Gift checkout modal (S32)** — /vaultsparked/ gift flow → create-gift-checkout edge function → Stripe
- [x] **Auth hardening (S31)** — min password 12, symbols required, rate limits, email confirmations
- [x] **Stripe live + billing portal (S30)** — 6 price IDs, 16 edge functions ACTIVE
