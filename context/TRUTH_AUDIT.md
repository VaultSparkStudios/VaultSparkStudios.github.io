<!-- truth-audit-version: 1.1 -->
# Truth Audit

Overall status: green
Last reviewed: 2026-04-16 (S77 closeout)
Public-safe summary:
- public-facing copy should stay aligned with actual live behavior
- pricing, availability, and access messaging should not over-promise
- sensitive internal verification notes are maintained privately
- prompts/closeout.md synced to studio-ops v2.4 (S46) — Step 7.5 replaced by Step 8.5; canonical template source is studio-ops
- tests/theme-persistence.spec.js updated (S46) to match custom picker runtime; `body[data-theme]` is the authoritative theme signal set by theme-toggle.js
- /open-source/ is now a redirect to /rights/ (S64) — all nav/footer/sitemap references updated; compliance-pages.spec.js updated to match
- gold contrast: `--gold: #7a5c00` in light mode (S65) — WCAG AA compliant (~5:1 on cream); dark panels with hardcoded bg still use `#FFC400` override; no copy changes needed
- CSP registry (S65): `scripts/csp-hash-registry.json` documents excluded pages' CSP snapshots; 404.html + offline.html no longer carry `'unsafe-inline'` debt, and skipped-page drift checks now pass cleanly
- Repo-wide CSP truth changed in S69: `node scripts/csp-audit.mjs` now passes across all 93 HTML files after the legacy debt cleanup
- Cloudflare Worker truth changed in S69: live production security-header policy was redeployed manually via Wrangler; Worker version `f0c9672a-25ae-413f-b131-e0ee9027b69b` now matches the repo-side CSP state
- Policy-generation truth changed in S70: `config/csp-policy.mjs` is now the shared source of truth for page CSP, redirect-page CSP, Worker CSP, and the repo-wide audit path
- Redirect truth changed in S70: legacy `investor/**` pages are now minimal hardened redirects without inline GA/bootstrap/redirect code
- Derived-view freshness improved in S70: `api/public-intelligence.json` was regenerated during closeout after memory updates so the public intelligence payload reflects current Session 70 truth
- Startup truth changed in S71: `prompts/start.md` now treats `LATEST_HANDOFF.md` and `SELF_IMPROVEMENT_LOOP.md` as section-scoped startup sources, so current-session startup reads no longer depend on loading full append-only histories
- Contract truth changed in S72: `context/contracts/website-public.json`, `hub.json`, and `social-dashboard.json` are now generated alongside `api/public-intelligence.json` as the shared public-safe bridge between website, Studio Hub, and Social Dashboard
- Verification truth changed in S72: local-first browser verification now uses `scripts/local-preview-server.mjs` + `scripts/run-local-browser-verify.mjs` with a BASE_URL override so unshipped code can be validated without depending on live production
- Protocol truth changed in S73: `prompts/start.md` is resynced to studio-ops template v3.2 while preserving the repo-specific targeted-read discipline added in S71
- Protocol truth changed further in S73 closeout: `prompts/closeout.md` is also resynced to studio-ops template v3.2 while keeping the website repo's generated public-intelligence gate intact
- Intelligence truth changed in S73: IGNIS was rescored locally to `46,489 FORGE` on 2026-04-15, so repo status/public derivatives should no longer describe the score as stale
- Visitor-intelligence truth changed in Session 74: homepage, membership, VaultSparked, join, and invite now render shared pathway and related-content rails via external scripts instead of leaving the route choice implicit
- Startup truth changed in Session 74: `scripts/startup-snapshot.mjs` now exists as a deterministic startup aid, and `prompts/start.md` explicitly recognizes it
- Verification truth changed in Session 74: `scripts/verify-live-headers.mjs` now codifies the browser-like live header check and `cloudflare/deploy-worker-local.ps1` codifies the manual Wrangler fallback path
- Pricing truth changed in Session 74: annual membership pricing may be shown, but annual checkout now fails honestly until the real Stripe annual plan keys exist
- Closeout truth changed in Session 74: project status, handoff, task board, SIL, audit JSON, and generated public-intelligence surfaces were refreshed together before the repo was committed and pushed
- Session 75 truth changed: `assets/intent-state.js` is now the shared visitor-state source for public intelligence/conversion surfaces instead of letting each module infer intent independently
- Session 75 truth changed: telemetry, trust, and network surfaces now render from shared modules on homepage, membership, VaultSparked, and Studio Pulse
- Session 75 truth changed: `sw.js` cache name moved to `vaultspark-20260415-intent` and now caches the new shared intelligence assets
- Session 75 truth changed: generated public-intelligence/contracts were refreshed again after the final Session 75 memory/task updates so downstream public surfaces read current truth
- Session 76 truth changed: `assets/micro-feedback.js` now provides browser-local, public-safe feedback capture and local summary rendering across homepage, membership, VaultSparked, join, invite, and Studio Pulse
- Session 76 truth changed: `assets/public-intelligence.js`, `assets/telemetry-matrix.js`, and `assets/trust-depth.js` can now enrich runtime reads with feedback-summary data without exposing private user data
- Session 76 truth changed: `scripts/release-confidence.mjs` now exists and `package.json` exposes `npm run verify:confidence` as the scoped release gate for changed intelligence surfaces
- Session 76 truth changed: `scripts/run-local-browser-verify.mjs` now supports the focused `intelligence` tier and prefers the local Playwright binary instead of `npx`
- Session 76 truth changed: `assets/intent-state.js` no longer emits shared change events from `noteExposure()`, fixing the local-preview render/exposure loop on homepage, membership, VaultSparked, and Studio Pulse
- Session 76 truth changed: `sw.js` cache name moved to `vaultspark-20260416-feedback` so the new feedback asset is cache-tracked with the existing shared runtime
- Verification truth changed in Session 76: `node scripts/release-confidence.mjs` passed on 2026-04-16 with public-intelligence generation, local browser verify (`intelligence` tier), live header verification, and staging health all green
- Session 77 truth changed: `scripts/build-shell-assets.mjs` and `assets/shell-manifest.json` now define the canonical shared shell release, and all public HTML pages are rewritten to the generated fingerprinted shell asset URLs during build
- Session 77 truth changed: shared shell runtime now includes `assets/shell-health.js`, and the homepage explicitly monitors the brand/header shell, hero heading, stylesheet attachment, and forge-letter reveal contract
- Session 77 truth changed: `sw.js` now caches only fingerprinted shell asset URLs and bypasses mutable shell source URLs, so shell cache behavior is tied to the generated manifest instead of stable filenames
- Session 77 truth changed: `tests/homepage-hero-regression.spec.js`, `scripts/run-live-browser-verify.mjs`, the updated local verify runner, release-confidence script, and CI workflow now treat the homepage header/hero shell as a dedicated browser-gated truth surface
- Verification truth changed in Session 77: `npm run build`, `npm run build:check`, `node scripts/verify-sw-assets.mjs`, and the focused local browser verify run all passed against the new fingerprinted shell path on 2026-04-16
