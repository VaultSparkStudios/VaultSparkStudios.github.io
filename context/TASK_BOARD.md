# Task Board — VaultSparkStudios.github.io

Last updated: 2026-04-06 (Session 43)

---

## Now

- [ ] **[SIL] robots.txt Cloudflare note** — add comment in `robots.txt` explaining Cloudflare AI Labyrinth injects additional directives at CDN edge; prevents future confusion when live robots.txt differs from repo
- [ ] **[SIL] prefers-reduced-motion guard** — add `@media (prefers-reduced-motion: reduce)` override to disable nav-enter animation added S39; accessibility requirement; first step: add 3-line rule in style.css after `@keyframes nav-enter`
- [ ] **[SIL] closeout.md sync** — update `prompts/closeout.md` to current v2.4 template from studio-ops (same sync done for start.md in S34)

---

## Next

- [ ] **[SIL] CSP propagation script** — meta CSP tags duplicated across 97 pages; `scripts/propagate-csp.mjs` generates from single source + propagates; eliminates manual per-file CSP edits
- [ ] **[SIL] Staging smoke test script** — `scripts/smoke-test.sh` pings website.staging before any push; 5-10 key URLs, exits non-zero on failure; enforces CANON-007 in practice
- [ ] **[SIL] Theme persistence test contract** — align Playwright with the real theme source of truth (class/select value vs `body[data-theme]`) or restore a deterministic `data-theme` signal during hydration; prevents false negatives while protecting light-mode regressions

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
