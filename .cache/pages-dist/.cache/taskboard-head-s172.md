# Task Board — VaultSparkStudios.github.io

Last updated: 2026-06-03 (Session 172 — goal-chain audit/implement: 12/12 shipped; RUM phantom blocker killed, TT soak live, Ark restored; build:check green)

## Done (Session 172 — goal-chain: /start → /audit → /implement → /closeout)

- [x] **[S172][DATA/P1] RUM-SAMPLE-UNLOCK — DONE (phantom blocker).** `cloudflare.r2` was READY all along; `scripts/fetch-rum-from-r2.mjs` (vanilla SigV4) pulled 110 production rows on first run. `npm run rum:pull` chains fetch → rollup → summary; export-path gate flipped `empty` → `warming`. **DONE S172**
- [x] **[S172][MEMBERSHIP/P1] MEMBERSHIP-ASSET-ORPHAN-DECISION — DIAGNOSED + 2/3 RESOLVED.** Interview REWIRED (idle-loader severance; mount div survived), vault-sdk KEEP + allowlisted (PromoGrind consumes `/vault-sdk.js`), vaultsparked-proof RETIRE recommended (superseded by live-proof.js, identical IDs). Dossier: `docs/MEMBERSHIP_ORPHAN_DOSSIER_S172.md`. Only the delete yes/no remains founder-side. **DONE S172**
- [x] **[S172][SECURITY/P1] TT-SOAK-MADE-READABLE — DONE.** Deploy token has KV scope (cfut_ lacks it — error logged). Soak was structurally blind (0.5% × 1d TTL); Worker now env-tunable, prod at 100%/30d, DEPLOYED (4f7dd69c) + live-verified. First real report exposed `cookie-consent.js:14` innerHTML sink → rebuilt with DOM API. Evidence: `docs/TT_SOAK_EVIDENCE_2026-06-03.md`. **DONE S172**
- [x] **[S172][ECOSYSTEM/P1] ARK-DRAIN-RESTORE — DONE.** `scripts/ark.mjs` delegation shim; first drain pulled 3 cargo (oldest sat 164h). 3 sig failures flagged upstream. **DONE S172**
- [x] **[S172][PROCESS/P1] PROTOCOL-SCRIPT-SELF-HEAL — DONE.** `check-protocol-scripts.mjs --heal` wrote 6 delegation shims; sentinel 19 present / 4 allowed / 0 unexpected. Closes the S158 allowlist carry. **DONE S172**
- [x] **[S172][AI/P2] PERF-FORENSIC-COMMIT-CORRELATOR — DONE.** `lib/perf-forensics.mjs` joins perf-history × git log into fix recipes (`suspectCommits[]`). First run ruled out product commits for the S160→S161 `/` regression → infra/cache-state suspect. **DONE S172**
- [x] **[S172][BRAND/P2] FIELD-HEALTH-PUBLIC-BADGE — DONE.** `api/site-health.json` (public-safe, threshold-gated) + /studio-pulse/ Field Performance strip with honest accumulating state. **DONE S172**
- [x] **[S172][UX/P2] VISUAL-PROOF-GALLERY — DONE.** `docs/visual-proof/index.html` one-click review gallery, auto-regenerates after every capture run. **DONE S172**
- [x] **[S172][PERF/P2] CLOSEOUT-PROD-PERF-SAMPLE — DONE.** `sample-prod-perf.mjs` rotating gated sampler wired into closeout-autopilot Step 3d.5. Closes the S154 carry. **DONE S172**
- [x] **[S172][OPS/P3] TESTING-SURFACES + FRESHNESS — DONE.** 6 testingSurfaces registered; IGNIS re-scored (2026-06-03); revenue signals ✓ FRESH. **DONE S172**

## Now (Session 173 runway)

- [ ] **[S173][PERF/P1] HOMEPAGE-FIELD-LCP-FIX.** Field truth supersedes the artifact theory: `/` median LCP ~5.8s, raw p75 ~10s across 37 real visits (FCP≈LCP, TTFB p75 1.3s). Diagnose render path for real-visitor conditions (cold cache + 4g). Forensics says infra/cache-state class — start with shell-hash rotation cadence + ambient bundle cold cost. Evidence: `data/rum-summary.json` + DECISIONS 2026-06-03.
- [ ] **[S173][DATA/P2] RUM-ACCRUAL-WATCH.** Run `npm run rum:pull` each session; at ≥50 `/` samples flip `check-perf-budget --source=rum --strict` + log DECISIONS (resolves RUM-STRICT-FLIP + ABSOLUTE-LCP-ORIGIN-CEILING).
- [ ] **[S173][SECURITY/P2] TT-SOAK-REPROBE.** ~1 week after 2026-06-03: `node scripts/probe-tt-soak.mjs` — with 100% sampling + cookie-consent fix live, expect near-0 violations; then founder device verify → enforce `/privacy/` only.
- [ ] **[S172][UX/P2] LONGTAIL-VISUAL-PROOF-REVIEW.** Founder review — now one click: open `docs/visual-proof/index.html`. Promote the primitive rhythm to more long-tail surfaces if it reads well.

## Human Action Required (S172-refreshed)

- [ ] **Delete `assets/vaultsparked-proof.js`? (30-second yes/no).** Evidence-complete: superseded by live-proof.js which writes the same IDs + more; not loaded anywhere. Dossier: `docs/MEMBERSHIP_ORPHAN_DOSSIER_S172.md` §3.
- [ ] **Verify membership interview on a real device.** `/membership/` → "Take 30-second interview" affordance should render (re-wired S172); confirm IGNIS onboarding-interview budget cap still active.

