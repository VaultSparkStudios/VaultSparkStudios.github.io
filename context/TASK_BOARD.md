# Task Board — VaultSparkStudios.github.io

Last updated: 2026-04-11 (Session 53)

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

*(queue clear — see Next for upcoming items)*

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
- [ ] **[CF-SECRETS]** Add `CF_API_TOKEN` (Zone/Cache Purge) and `CF_ZONE_ID` secrets to GitHub repo → Settings → Secrets; enables auto cache purge workflow added S53
- [ ] **[CSP-VERIFY]** After S53 deploy: open vault-member/index.html in DevTools console (incognito); confirm zero `Content-Security-Policy` errors; if violations appear, identify missed inline scripts and add their SHA-256 hashes; also redeploy Cloudflare Worker with updated script-src

---

## Done (recent)

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
