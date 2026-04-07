# Task Board — VaultSparkStudios.github.io

Last updated: 2026-04-07 (Session 46)

---

## Now

- [x] **[SIL] robots.txt Cloudflare note** — added comment explaining Cloudflare AI Labyrinth injects directives at CDN edge (S46)
- [x] **[SIL] prefers-reduced-motion guard** — global `@media (prefers-reduced-motion: reduce)` rule already present in style.css (line ~1464); disables all animations including nav-enter. Done.
- [x] **[SIL] closeout.md sync** — updated `prompts/closeout.md` to studio-ops v2.4: removed Step 7.5, added Step 8.5 (S46)
- [x] **[SIL] Theme persistence test contract** — replaced `#theme-select` assertions with `#theme-picker-btn` + `.theme-option[data-theme=x].active`; `body[data-theme]` assertions preserved (S46)
- [x] **[SIL] Nav backdrop opacity by theme** — added `--nav-backdrop-overlay` var to `:root` (dark) and `body.light-mode` (45% dark-navy); `#nav-backdrop` now uses var (S46)
- [x] **[SIL] Theme picker swatch pulse** — `@keyframes swatch-pulse` added; `.swatch-pulse` class toggled in click handler + cleaned up on label reset (S46)
- [ ] **[SIL] Portal nav admin link** — `nav-admin-link` is referenced in `showDashboard()` in `portal-auth.js` but is absent from `vault-member/index.html` nav-account-menu; admin tab toggle is permanently invisible for admin users; first step: add `id="nav-admin-link"` to nav-account-menu
- [ ] **[SIL] Referral attribution wire** — `vs_ref` is stored in sessionStorage on `?ref=` arrival (S45); wire it into the `register_open` Supabase RPC as `p_ref_by` so referrers get signup credit; first step: check if RPC accepts the param or needs a new column

---

## Next

- [ ] **[SIL] CSP propagation script** — meta CSP tags duplicated across 97 pages; `scripts/propagate-csp.mjs` generates from single source + propagates; eliminates manual per-file CSP edits
- [ ] **[SIL] Staging smoke test script** — `scripts/smoke-test.sh` pings website.staging before any push; 5-10 key URLs, exits non-zero on failure; enforces CANON-007 in practice
- [ ] **[SIL] Light-mode screenshot smoke** — Chromium-only Playwright screenshots of `/`, `/ranks/`, `/games/` in forced light mode to catch contrast regressions before deploys
- [ ] **[SIL] IGNIS delta field** — add `ignisScoreDelta` to `PROJECT_STATUS.json` computed at each closeout; makes score trajectory visible without digging into audit files

## Next (prior)

- [ ] **Per-form Web3Forms keys** — create 3 separate keys in Web3Forms dashboard (join/, contact/, data-deletion/) for per-form lead tracking; update access_key values in each HTML [low priority]
- [ ] **Cloudflare WAF rule (CN/RU/HK)** — JS Challenge firewall rule; requires API token with Zone / Firewall Services / Edit + Zone / Zone / Read; or Studio Owner can create in dashboard [human action / provide token]
- [ ] **Web3Forms browser test** — manually submit /join/ and /contact/ to confirm email delivery to inbox [human action]
- [ ] **[SIL] Add `beacon.env`** — once Studio Owner runs `node scripts/configure-beacon.mjs` in studio-ops, copy resulting `.claude/beacon.env` to this repo (gitignored); enables active session indicator in Studio Hub

---

## Blocked

*(none)*

---

## Later

- [ ] **Voidfall teaser → full page** — when Voidfall build is further along; expand teaser content
- [ ] **`/vaultsparked/` Phase 2** — open Phase 2 when Phase 1 fills (subscriber_cap)
- [ ] **Sentry source maps** — configure Sentry releases + source map uploads for better error tracking
- [ ] **Web push test** — subscribe in portal, upload classified file, verify notification received

---

## Done (recent)

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
