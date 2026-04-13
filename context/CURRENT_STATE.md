# Current State — VaultSparkStudios.github.io

## Snapshot

- Date: 2026-04-13 (Session 59)
- Overall status: live · green
- Vault Status: SPARKED
- Repo posture: S59 major batch — /membership/ hub page, membership model overhaul (Option C), nav Membership dropdown + footer column (77 pages), homepage hero (Explore Projects CTA, DreadSpike → unnamed Signal Detected teaser), vaultsparked overhaul (studio discount 20%/35%, games access grid, rank loyalty callout, annual billing toggle, removed founder video updates), shared CSS atmosphere layer, SW cache bump. S58: members directory CSP fix. S57: theme picker compact, CF Worker auto-redeploy, genesis badge slots counter, vault wall public_profile opt-in, Studio About founder story, achievement SVGs.

## What exists

### Live systems
- **Vault Member portal** (`vault-member/`) — 9-tier rank system, achievements, challenges, Discord role sync, onboarding tour, light-mode phase 2
- **VaultSparked membership** (`vaultsparked/`) — Stripe $4.99–$99.99/mo, 6 price IDs, phase progress bar, gift checkout modal (gift price `price_1TJ7xbGMN60PfJYsPCs5wUUz` set S37)
- **Investor portal** (`investor/`) — gated
- **Universe** — DreadSpike (pivoted to Novel Saga; **S53: Signal Log entry added** — intercepted transmission card with lore fragment), Voidfall full lore page (`/universe/voidfall/`) — Transmission Archive (3 fragments), The Signal, Known Entities (**S53: atmospheric entity 4 hint added** below The Crossed row), Saga meta, Chapter I excerpt (S50)
- **Studio Hub** (`studio-hub/`) — synced from vaultspark-studio-hub repo
- **10 journal posts** — fireView() consent-gated
- **8 game pages** — FORGE/SPARKED/VAULTED radial glow, data-status attrs; status badges correctly positioned (direct child of .hero-art)
- **12 project pages** — status badges fixed (S36): moved outside .hero-art-content to prevent absolute-positioning overlap with h1
- **Compliance pages** — /cookies/, /accessibility/, /open-source/ (technology attributions + IP notice), /faq/, /careers/, /data-deletion/, /security/, sitemap
- **Members directory** (`members/`) — S58: fixed profile-loading regression from CSP-blocked inline directory script; runtime moved to `/assets/members-directory.js`, clear-filter action uses event delegation, query supports current `vault_points`/`rank_title` plus legacy `points` fallback; "Founding Member" label updated to "Genesis Member".

### Infrastructure
- **Cloudflare Worker** (`cloudflare/security-headers-worker.js`) — all 9 security headers, CSP, X-Robots-Tag: noai. Worker: `vaultspark-security-headers-production` (Version: c1fd7b80). Deployed via Wrangler. **S53: script-src updated to SHA-256 hashes (removed 'unsafe-inline')**; needs redeploy.
- **Service worker** (`sw.js`) — CACHE_NAME: `vaultspark-20260413-members-directory`; STATIC_ASSETS includes `/universe/voidfall/`, `/universe/dreadspike/`, `portal-init.js`, and `members-directory.js`
- **DX scripts** (`scripts/propagate-csp.mjs`, `scripts/smoke-test.sh`) — S47 created; S49 regex fixed + dry-run exit-1 added; **S53: CSP_VALUE updated to SHA-256 hashes (removed 'unsafe-inline')**; 85 pages propagated; `e2e.yml` compliance job runs `--dry-run` check before Playwright
- **Sentry release workflow** (`.github/workflows/sentry-release.yml`) — S47 created, S48 fully wired: org `vaultspark-studios`, project `4511104933298176`, token set as GitHub secret; every push to main now tags a Sentry release
- **Referral attribution** (`supabase/migrations/supabase-phase56-referral-attribution.sql`) — S48: `referred_by uuid` column on `vault_members`; `register_open` accepts `p_ref_by`, awards referrer +100 XP, fires recruiter/patron achievements; `get_referral_milestones` counts both invite-code and direct-link referrals; migration applied live
- **Contact form** (`contact/index.html`) — S47: toast pop-up + duplicate-subject fix; S49: `gtag('event', 'form_submit')` + `form_error` GA4 events wired
- **Mobile nav** (`assets/style.css`, `assets/nav-toggle.js`) — S36 removed backdrop-filter from .nav-center.open; S38 disabled .site-header::before backdrop-filter at ≤980px (root iOS GPU compositing fix); S39 added @keyframes nav-enter; **S44 removed backdrop-filter: blur(2px) from #nav-backdrop (the true source of iOS blur + click interference), redesigned overlay with premium cubic-bezier animation, gold active-link accent, improved spacing and CTA polish**
- **Theme FOUC prevention** (`assets/theme-toggle.js`, `scripts/propagate-nav.mjs`, all 72 HTML pages) — S44 injected tiny inline `<script>` at `<body>` start on every page that reads localStorage.vs_theme and stamps both `<html>` and `<body>` with the correct theme class before any content paints; theme-toggle.js also applies class to `<html>` immediately when called from `<head>`; eliminates dark flash when navigating in light mode
- **Theme tile picker** (`assets/style.css`, `assets/theme-toggle.js`) — S52 replaced dropdown list picker with a 3-column tile grid; S54: CSS hide rule moved from 980px to 640px breakpoint; tileColor field added; **S57: compact mode added at 641–980px — `.theme-picker-label` + `.theme-picker-arrow` hidden, swatch dot only shows at tablet widths**
- **Portal admin link** (`vault-member/index.html`) — S47 added `id="nav-admin-link"` button to nav-account-menu; `display:none` by default; `showDashboard()` reveals it for admin users
- **Referral attribution wire** (`vault-member/portal-auth.js`, `vault-member/portal.js`) — S47 added `p_ref_by: sessionStorage.getItem('vs_ref')` to all 3 `register_open` RPC call sites; **pending DB migration**: `register_open` Supabase function needs `p_ref_by TEXT DEFAULT ''` param
- **Portal auth nav elements** (`vault-member/index.html`, `vault-member/portal-auth.js`) — S45 added missing portal nav elements to `index.html` nav-right (notif bell wrap with `id="notif-bell-wrap/badge/panel/list"`, account dropdown with `id="nav-account-wrap/trigger/avatar-sm/name/menu"`, `id="nav-signin-link"`, `id="nav-join-btn"`); added null guards to `showAuth()`/`showDashboard()` in `portal-auth.js`; this eliminates the TypeError that blocked auth tab switching on `?ref=` referral URLs
- **Referral landing banner** (`vault-member/index.html`, `vault-member/portal-settings.js`) — S45 added `id="referral-banner"` element inside `auth-view`; `init()` reads `?ref=username`, validates, shows gold banner "Invited by @username — create your free account below to join the Vault!", stores referrer in `sessionStorage('vs_ref')` for future attribution
- **Theme tile picker** (`assets/style.css`, `assets/theme-toggle.js`) — S44 replaced bare `<select>` with custom picker; S45–S46 added hover-preview, DEFAULT badge, swatch-pulse; **S52 fully redesigned to 3-column tile grid** — each tile is a large coloured block (theme background) with name label; active tile has gold ring + ✓; hover previews live; dark tiles have semi-transparent border for legibility; mobile pill bar unchanged; Playwright spec updated
- **Nav backdrop overlay** (`assets/style.css`) — S46: replaced hardcoded `rgba(0,0,0,0.6)` on `#nav-backdrop` with CSS var `--nav-backdrop-overlay`; `:root` = 60% black (dark themes), `body.light-mode` = 45% dark-navy — backdrop no longer looks wrong in light mode
- **robots.txt** — S46: added comment block noting Cloudflare AI Labyrinth injects additional directives at CDN edge; live robots.txt may differ from repo content
- **Light-mode theme refresh** (`assets/style.css`, `assets/theme-toggle.js`) — S40 retuned light tokens (`--text`, `--muted`, `--dim`, `--steel`, panel/bg vars), replaced washed translucent dark-theme carryovers with warm ivory/glass surfaces, and added light-mode component overrides for buttons, cards, panels, timeline/social blocks, inputs, badges, footer, and section chrome
- **Light-mode contrast follow-up** (`assets/style.css`) — S41 darkened the shared secondary text scale to blue-slate values, forced bright readable titles over dark hero/card artwork, strengthened light-mode overlays on game/project hero bands, and converted shared dark panels (`.feature-block`, `.info-block`, `.stream-item`, patch notes, game/project cards) into true light surfaces in light mode
- **Dark-panel contrast hardening** (`assets/style.css`, `index.html`, `ranks/index.html`, `vault-member/portal.css`) — S42 reversed the mistaken light-mode treatment on intentionally dark panels such as Studio Members feature tiles, homepage rank preview, DreadSpike storyline/media copy, portal rank panels, and public Vault Ranks cards; those sections now keep white text on dark backgrounds while the homepage Vault-Forge paragraph stays dark on its light surface
- **Rights posture correction** (`open-source/index.html`, `scripts/propagate-nav.mjs`, site HTML pages, `tests/compliance-pages.spec.js`) — S43 removed the public claim that VaultSpark repos/products are MIT/open-source, replaced `/open-source/` with a proprietary IP notice + third-party attributions page, changed the shared footer/resource label to “Technology & Rights,” updated sitemap labels, and aligned the compliance test title expectation with the new page
- **CSS guard** (`assets/style.css`) — S39: `.hero-art > .status` rule locks badge to `position:absolute; top/left:1rem; z-index:2` — prevents S36 badge-overlap regression
- **Lighthouse CI** (`.github/workflows/lighthouse.yml`) — S39: wait-on step added (120s timeout, 5s interval) to poll live site before Lighthouse runs
- **Supabase** — 16 edge functions ACTIVE; cloud-hosted at fjnpzjjyhnpmunfoycrp.supabase.co
- **Sentry** — error tracking active
- **Web push** — VAPID keys set; fully active
- **GA4** — G-RSGLPP4KDZ wired to all 97 HTML pages (S34) ✓
- **robots.txt** — 14 AI crawlers blocked; /vault-member/ disallowed
- **security.txt** — RFC 9116 compliant at /.well-known/security.txt
- **Staging** — website.staging.vaultsparkstudios.com on Hetzner (CANON-007; confirmed live HTTP 200, S37)

### Studio OS (restored S34)
- `CLAUDE.md` — session aliases: start/closeout → prompts/
- `AGENTS.md` — full Studio OS agent guide
- `prompts/start.md` — v2.4 (Bash session lock + Active Session Beacon)
- `prompts/closeout.md` — v2.4 (synced to studio-ops @ S46: Step 7.5→8.5)
- All context/ files functional with real content
- `.claude/settings.json` — Stop hook (session lock clear + PROJECT_STATUS stamp) + PostToolUse JSON validator

### CI
- **Playwright** — compliance job (8 pages + cookie consent + data-status; always runs) + e2e job (auth tests; continues-on-error if secrets absent); theme-persistence spec updated S46 to use custom picker selectors; light-mode screenshot spec added S47 (Chromium-only, 3 pages)
- **Lighthouse** — CI enforced
- **axe-core** — CI enforced

- **CF Worker auto-redeploy** (`.github/workflows/cloudflare-worker-deploy.yml`) — S57: triggers on `cloudflare/**` changes pushed to main; runs `npx wrangler@3 deploy --env production`; requires `CF_WORKER_API_TOKEN` secret (Workers:Edit + Zone:Read). Pending HAR to add secret.
- **Genesis badge slots counter** (`vaultsparked/vaultsparked.js`) — S57: live counter in /vaultsparked/ FAQ showing X/100 public spots remaining; PostgREST query excludes 4 studio owner UUIDs; 3-tier colour (gold → orange → crimson ≤10); loads as defer external script
- **Vault Wall public_profile opt-in** — S57: `supabase/migrations/supabase-phase59-public-profile.sql` adds `public_profile boolean DEFAULT true`; vault-wall queries updated to `.eq('public_profile', true)`; pre-existing `.count().head()` bug fixed → `.count().get()`; opt-in notice added. Pending phase59 HAR migration.
- **Studio About "Why VaultSpark"** (`studio/index.html`) — S57: added `#why-vaultspark` founder story section before "Who Runs The Vault"; personal origin narrative, vault pressure philosophy quote, 5 paragraphs
- **Achievement SVG icons** — S57: `assets/images/badges/vaultsparked.svg` (faceted purple crystal gem, gold crown spark) + `assets/images/badges/forge-master.svg` (anvil + spark burst, crimson ring, ember particles)

## New pages and features shipped (S55–S57)

- **`/press/`** — full press kit with key facts, studio bio, logo grid, game catalog, press contact
- **`/studio-pulse/`** — public dev transparency page (Now/Next/Shipped board, 8 game status grid, studio health)
- **`/vault-wall/`** — public member recognition wall (live Supabase: rank distribution bar, podium, leaderboard #4-20, recently joined)
- **`/invite/`** — referral program UX (referral link copy/share, stats, rewards, top inviters leaderboard)
- **Social proof strip on homepage** — live member count, VaultSparked count, challenges count, rank distribution bar (9 segments)
- **Daily loop widget in portal** — pinned banner showing login streak + active challenge title + bonus chip (shows above dash panes); `window.VSPublic` scope verified ✅
- **Genesis Vault Member badge** (S56) — renamed from Founding Vault Member; slug `genesis_vault_member`; custom SVG icon (`assets/images/badges/genesis-vault-member.svg` — 8-pointed star burst, dark navy + gold); portal renderer supports image icons (path-based icons render as `<img>`); studio owner accounts excluded from 100 public slots via `maybe_award_genesis_badge()`; phase57+58 migrations applied; 0 public slots consumed
- **Achievement image icon renderer** — `portal.js` + `portal-settings.js` now check if `def.icon` starts with `/` and render `<img>` instead of emoji; future-proof for all achievements
- **Call of Doodie game page** — added social share + "More From the Vault" conversion section
- **Theme picker bug fix** — removed `theme-option` class from tile buttons in `theme-toggle.js:399`

## Known gaps

- Per-form Web3Forms keys (all forms share single key)
- Cloudflare WAF rule (CN/RU/HK JS Challenge) — status unknown
- beacon.env not configured (Active Session Beacon inactive)
- **`CF_WORKER_API_TOKEN`** secret not yet added — cloudflare-worker-deploy.yml is ready but won't run without this secret (Workers:Edit + Zone:Read permissions)
- **Phase59 migration** (`public_profile` column) not yet applied — vault-wall filter + portal toggle both depend on this HAR
- Achievement SVGs created (vaultsparked + forge-master) but not yet wired to portal.js achievement slug definitions
- Contact form: Web3Forms delivery requires browser test to confirm (server-side testing blocked by free tier)
- IGNIS score: 47,308/100,000 · Tier: FORGE · last computed 2026-04-07 (5 days stale)
- IGNIS score: 47,308/100,000 · Tier: FORGE · 82.1% through tier (rescored 2026-04-07 S50) · delta: +952 (not refreshed S56 — minor session)
- **Studio About (`/studio/`) enhancement** — founder story section pending
- **Theme picker compact mode at 641–980px** — SIL:2⛔ — must action next session
- **CF Worker auto-redeploy** — SIL:2⛔ — must action next session
