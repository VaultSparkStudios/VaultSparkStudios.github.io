# Task Board — VaultSparkStudios.github.io

Last updated: 2026-04-06 (Session 38)

---

## Now

- [ ] **[SIL] Mobile nav entrance animation** — add subtle translateY + opacity fade-in when opening mobile menu (blur fully fixed S38); first step: add transition to `.nav-center` in mobile media query
- [ ] **[SIL] CSS guard for .status badge nesting** — add `.hero-art > .status` high-specificity rule to style.css; prevents regression of S36 badge-overlap bug; first step: add explicit rule after .status block
- [ ] **[SIL] Lighthouse deployment timing** — add `wait-on` or delay step so Lighthouse runs after GitHub Pages confirms live; prevents testing stale site

---

## Next

- [ ] **[SIL] robots.txt Cloudflare note** — add comment in `robots.txt` explaining Cloudflare AI Labyrinth injects additional directives at CDN edge; prevents future confusion when live robots.txt differs from repo
- [ ] **[SIL] CSP propagation script** — meta CSP tags duplicated across 97 pages; `scripts/propagate-csp.mjs` generates from single source + propagates; eliminates manual per-file CSP edits
- [ ] **[SIL] Staging smoke test script** — `scripts/smoke-test.sh` pings website.staging before any push; 5-10 key URLs, exits non-zero on failure; enforces CANON-007 in practice

## Next (prior)

- [ ] **Per-form Web3Forms keys** — create 3 separate keys in Web3Forms dashboard (join/, contact/, data-deletion/) for per-form lead tracking; update access_key values in each HTML [low priority]
- [ ] **Cloudflare WAF rule (CN/RU/HK)** — JS Challenge firewall rule; requires API token with Zone / Firewall Services / Edit + Zone / Zone / Read; or Studio Owner can create in dashboard [human action / provide token]
- [ ] **Web3Forms browser test** — manually submit /join/ and /contact/ to confirm email delivery to inbox [human action]
- [ ] **[SIL] Add `beacon.env`** — once Studio Owner runs `node scripts/configure-beacon.mjs` in studio-ops, copy resulting `.claude/beacon.env` to this repo (gitignored); enables active session indicator in Studio Hub
- [ ] **`closeout.md` sync** — update `prompts/closeout.md` to current v2.4 template from studio-ops (same sync done for start.md this session)

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
