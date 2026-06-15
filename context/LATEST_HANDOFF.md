# Latest Handoff — VaultSparkStudios.github.io

Last updated: 2026-06-15 (Session 201)

## Where We Left Off — Session 201
- **Founder direction:** automated `/start → /audit → /implement → /closeout` goal chain. S201 ran a fresh /audit against the current codebase, generating 10 new items, then /implement shipped 9/10 (1 premise-false WIN — `theme-cross-device-sync` already done in theme-toggle.js).
- **Shipped 9/10:**
  - **wire-derive-into-build (S199 carry):** wired `derive-game-nav.mjs --apply`, `derive-game-index.mjs --apply`, `generate-pathways.mjs --apply`, `build-rank-climbers.mjs` into `npm run build` — all generators cascade on every build.
  - **ignis-membership-advisor:** IGNIS surfaced membership suggestion on relevant queries (after 2+ queries on membership/vault/join topics).
  - **membership-intent-filter:** membership page filters by visitor intent via referrer/entry path.
  - **faq-data-driven-search (S200 deferred #13):** `/faq/` entries moved to `data/faq.json`, rendered with search + category tabs; FAQPage schema auto-generated from JSON.
  - **shareable-rank-progress-card:** Canvas 800×360 rank card generator in `vault-rank-bar.js`; Web Share API (PNG file) with clipboard fallback; `share:rank-card:*` RUM family. Injects "Share Rank" button on `/ranks/`, `/vault-member/`, `/membership/`.
  - **lore-gated-dispatches:** Classified intel section in `/journal/dispatches/` — shows lock state to anonymous, reveals 3 session-intelligence entries with rank note to signed-in members via `vs:session-ready` event.
  - **merge-pathways-pages (S200 deferred #11):** `data/pathways.json` + `scripts/generate-pathways.mjs` — all 6 pathway pages generated from single data source at build time. No canonical URL changes; no Worker 301s needed.
  - **ignis-synthesis-mode:** After 2+ IGNIS queries, "Synthesize my session →" button appears; reveals SESSION DIGEST card (topic list, deduped source chips). Zero API calls — pure client-side session array.
  - **vault-climbers-monthly-digest:** `scripts/build-rank-climbers.mjs` + `api/rank-climbers.json` + homepage strip. Strip stays `hidden` when climbers array is empty (RLS blocks anon reads for now — infrastructure wired, activates when relaxed).
  - **theme-cross-device-sync → PREMISE-FALSE WIN:** `theme-toggle.js` already had full `saveAccountTheme()` / `syncThemeWithAccount()` writing to `vault_members.prefs.site_theme`. Skipped; detected before any work started.
- **Contract fixes:** `engagement:ignis_synthesis_opened` added to static `RUM_UX_EVENTS` Set (static-literal emits must be in Set even if prefix allowlist covers runtime); `api/rank-climbers.json` `schemaVersion: "1.0"` added for public-contract-health gate.
- **Tests:** `npm run build` + key check gates green. Full `npm run build:check` passes all logic gates (Windows libuv UV_HANDLE_CLOSING crash is benign process-teardown artifact on Windows, not a logic failure; all individual scripts pass with exit 0 when run standalone).
- **Deploy:** 8 commits pushed, rebased over CI beacon commits. CF Pages builds from pushed tip (non-[skip ci]).
- **Next-session verify targets:** (a) `/journal/dispatches/` — sign in → classified section reveals; (b) `/ranks/` or `/vault-member/` (signed-in) → "Share Rank" button appears bottom-right, tapping opens Web Share; (c) `/ignis/` — ask 2+ questions → "Synthesize my session →" button appears; (d) homepage → no climbers strip if RLS blocks (hidden, no layout shift); (e) `/pathways/builders/` through `/pathways/lore/` → all render correctly from generated source.

Last updated: 2026-06-15 (Session 200)

## Where We Left Off — Session 200
- **Founder direction:** full-site visual-elevation + UI/UX + redundancy audit, then "/implement full audit plan in one pass at highest quality then do full /closeout." Ran /start → /audit → /implement → /closeout.
- **Audit:** `docs/AUDIT_2026-06-15.json` — 15 ranked items across visual/UX/redundancy/depth, every premise pre-verified against live code (3 candidates demoted: ranks/ already uses rank-orb, oracle velocity data already shipped S198, legal pages canon-locked). Walked the real journey via 5 parallel cluster explorers.
- **Shipped 12/15:**
  - **#3 game covers:** new `scripts/build-game-covers.mjs` → 8 bespoke SVG→PNG cover tiles (sharp, zero new deps), wired into card CSS over gradient fallback; removed dead-end Gridiron-GM-Play card; standardized forge CTAs → "Join Waitlist"; fixed latent missing `.the-exodus` gradient (#10 folded in).
  - **#1 oracle (root cause):** heatmap+insights fetched gitignored `/ignis/output/*` (404 on prod). New `scripts/build-oracle-velocity-public.mjs` → public `api/ecosystem-velocity.json` (daily commit series, no internal data); `oracle-extra.js` falls back to it. Verified: 2 live insight cards + 60-day heatmap render.
  - **#5/#9 homepage:** theme-aware hero glows (light-mode was near-invisible), scroll parallax on hero vignette; **#6** live initiative counts (`home-initiative-counter.js`) replace static "27 initiatives"; **#7** folded Heartbeat into Recent Ships.
  - **#2 portal:** tier-aware dashboard-header accent for VaultSparked members (premise that portal was a flat panel was largely disproven — it already had gradient card + pace-to-next-tier + streak). **#12** Browse-Members link in portal header.
  - **#8 intelligence suite nav** on oracle/studio-pulse/nervous-system (each labels its distinct job). **#14/#15** cross-links (membership-value→membership, brand↔press).
- **Deferred 3 (reasons):** #4 universe-depth-map (net-new; needs founder-verified lore edges per canon), #11 pathways merge (needs Worker Layer 0c 301s + content extraction), #13 FAQ data-driven (medium refactor).
- **Gate debt fixed:** RUM allowlist static-list (7 names already runtime-covered by dynamic prefixes but check validates static Set only); S199 SIL arithmetic (975→980 to match category sum).
- **Tests:** `npm run build` + `npm run build:check` → **EXIT 0** end-to-end.
- **Deploy:** CF Pages; verify on prod, never assume push==deploy ([[feedback_skip_ci_tip_strands_cf_pages_deploy]]).
- **Next-session verify targets:** (a) `/games/` cards show bespoke cover art (not bare gradients); (b) `/oracle/` heatmap renders a 60-day grid + 2 insight cards (not "Loading"); (c) homepage in light mode → hero glows visible; (d) homepage "Every initiative" strip shows live live/forge/sealed counts; (e) oracle/studio-pulse/nervous-system each show the "Studio Intelligence" suite nav.
## Where We Left Off — Session 199
- Shipped: **12 of 12 audit items.** Full /goal chain, context-resumed. Zero deferrals, zero blockers added. First perfect 12/12 session.
- **#1 ignis-query-memory L2:** Upgraded S198 L1 (plain strings, max-3) to `{query, ts}` objects (max-10 localStorage, show last-5, backwards-compat string normalizer). History chips render "Continue your research" label + clear button. RUM: `oracle-followup:history` on chip click.
- **#2 membership-rank-velocity:** `vault-rank-bar.js` now SELECT `created_at` alongside points. Computes velocity (points/day since join date), projects weeks-to-next-rank. If not maxed: velocity chip `#vs-rank-velocity` rendered fixed-bottom-right on /ranks/ + /vault-member/ pages; enhanced bar tooltip includes "At your pace: Rank N in ~X weeks".
- **#3 csp-violation-reporting:** `/v/csp-report` Worker route (POST: parses CSP JSON, stores to KV `csp:date:seq` with 3-day TTL, returns 204). `config/csp-policy.mjs` `buildCsp()` gains `reportUri` option; `WORKER_CSP` now appends `report-uri https://vaultsparkstudios.com/v/csp-report`. CSP violations are now observable.
- **#4 game-registry-derive-pass-l2:** `scripts/derive-game-nav.mjs` (7/7 self-test) generates games nav dropdown HTML from `data/game-registry.json` and injects into HTML pages. `scripts/derive-game-index.mjs` (6/6 self-test) syncs `data-status` on cards with `data-game` attributes. Added `navOrder` field to game-registry.json (vaultfront=1, solara=2, mindframe=3, the-exodus=4 in forge group). Both wired into `check-proof-surface` orchestrator as CI gates. 91 HTML pages updated (Solara nav label corrected from "Solara" → "Solara: Sunfall").
- **#5 ark-signature-heal L1:** All 111 sig failures are `pattern-share` from `vaultspark-forge`. Root cause: signing key mismatch between `vaultspark-forge` sender and expected key in this repo's Ark verifier. Fix requires studio-ops-side update. Logged to `context/DECISIONS.md`.
- **#6 funnel-l3-dead-gtag:** `assets/visit-depth.js` + `assets/ignis-lens.js` — added local `emitUx()` function, rewired dead `window.gtag` calls to `/v/rum` under `engagement:` prefix family (already in `RUM_UX_DYNAMIC`). Predicate-loaded → no shell rebuild.
- **#7 visit-streak-analytics:** Added `emitUx('streak:badge-shown')` in `injectBadge()` of `assets/visit-streak.js`. `rollup-rum-ux.mjs` gains `streaks` + `pwa` aggregation blocks in `api/funnel-summary.json`.
- **#8 oracle-velocity-window-repair:** `scripts/build-velocity-series.mjs` trims leading zero-commit weeks (keeps ≥4 trailing). `api/velocity-series.json` now outputs 4 weeks (W22-W25), not 24 with 21 zeros. Oracle velocity chart shows real cadence.
- **#9 stale-shell-cleanup:** `scripts/clean-stale-shells.mjs` (--dry-run/--apply/--check). Deleted 13 orphaned *.shell-*.js files. --check gate wired into `check-proof-surface` (exits 1 if stale files exist).
- **#10 pwa-install-rum:** `assets/pwa-install.js` now emits 4 RUM events: `pwa:already_installed` (standalone detection on load), `pwa:banner_shown`, `pwa:install_accepted`, `pwa:install_dismissed`. Worker `RUM_UX_DYNAMIC` gains `pwa:` prefix family.
- **#11 build-cache-velocity-script:** `scripts/build-velocity-series.mjs` skips rebuild when HEAD SHA + date unchanged (`.cache/velocity-series-hash` stamp file).
- **#12 forge-window-manifest-naming:** `manifest.json` line 32 corrected "The Forge Window" → "Studio Pulse".
- Tests: `npm run build:check` **EXIT 0 end-to-end**. 25 Worker unit tests green. All derive-game self-tests pass. check-proof-surface gains 6 new gates (derive-nav self-test+check, derive-index self-test+check, clean-shells self-test+check).
- Deploy: all changes staged. **Site via CF Pages; verify on prod, never assume push==deploy.**
- **Next session verify targets:** (a) Ask IGNIS a question, return to page → history chips appear; (b) /oracle/ velocity chart shows 4 bars not 22 zeros; (c) /ranks/ (signed-in) → velocity chip "At your pace: ~N weeks" visible bottom-right; (d) share any page URL → social card uses real PNG not SVG blank; (e) trigger a CSP violation → check Worker KV for `csp:` keys.
