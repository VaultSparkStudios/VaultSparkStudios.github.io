# Genius Hit List — Session 295

Generated: 2026-07-26
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **0/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **check gh run list**
- Current focus: S295 completed the full continuous arc: incident onset is now an evidence-bounded interval, production shell parity is route-local and scheduled, and the first real Worker recovery must self-prove exact-once closure. The actionable Unified Genius List is exhausted; exact candidate staging is verified while production remains intentionally held and stale.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List




### DEFERRED / GATED

#### 1. [PRODUCT] Incident-close live receipt. Instrumentation is complete. Close only …
Final score: **96**
[S295→NEXT][SIL][OBS/P1][WAITING: REAL RECOVERY] Incident-close live receipt. Instrumentation is complete. Close only after a real matched semantic row proves exactly-once closure and /status/ renders the verified recovery receipt.
Why it matters: Instrumentation is complete; closure requires a future source-of-truth observation and must not be fabricated locally.

#### 2. [PRODUCT] ~~[S294→FOUNDER][PRODUCT/P1] Decide the Play-CTA destination.~~ All o…
Final score: **87**
~~[S294→FOUNDER][PRODUCT/P1] Decide the Play-CTA destination.~~ All on-site "Play Beta" CTAs point to /franchise-architect/; api/ecosystem-state.json lists the game's liveUrl as https://playfranchisearchitect.com/. Repoint the CTAs to that domain (retiring/redirecting the on-site copy), or keep the on-site playable build canonical? Public routing change — awaiting founder answer.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [SECURITY] Restore the production Worker /v/rum route. The security Worker was c…
Final score: **87**
[S291→FOUNDER][INCIDENT/P0][HUMAN ACTION] Restore the production Worker /v/rum route. The security Worker was clobbered out-of-band on 2026-07-03 with a build missing /v/rum; RUM telemetry ingest has been dark since 2026-07-02 (live 405 vs repo 204; honest 47.6% uptime is the S275 forcing-function, correctly not massaged). Restore: gh workflow run cloudflare-worker-deploy.yml -f confirm_production=true. Gated by the fail-closed production promotion hold (Supabase/identity reasons) — clearing or explicitly accepting that hold is a founder decision (auth/security production deploy, CANON-019). cloudflare deploy capability is READY in the secrets gateway; the only gate is the hold.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [SECURITY] ~~[S294→FOUNDER][OPS/P1] Decide whether a content-only hotfix promoti…
Final score: **84**
~~[S294→FOUNDER][OPS/P1] Decide whether a content-only hotfix promotion lane should exist.~~ A static one-line fix to a broken public page is currently blocked by unrelated Supabase migration state (D-S294.3). Loosening a security interlock is a founder call.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [VERIFY] The Franchise Architect fix cannot reach production while the promoti…
Final score: **83**
[S294→FOUNDER][DEPLOY/P0] The Franchise Architect fix cannot reach production while the promotion hold stands. Production is 143 commits / 2.3 days stale. Gate holds on supabase-migration-pending, eternal-function-pending, real-provider-e2e-pending, supabase-control-plane-partial, independent-release-gate-no-go — all credential-gated. Release: gh workflow run pages-deploy.yml -f confirm_production=true. Founder decision (production promotion under an explicit hold, CANON-019) — not dispatched autonomously.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [VERIFY] Production is 134 commits / 2.3 days stale
Final score: **74**
[S293→NEXT][DEPLOY/P0] Production is 134 commits / 2.3 days stale — diagnose why the deploy path is not landing. Cloudflare Pages Deploy and Cloudflare Cache Purge both report success on every push, yet live /api/build-sha.json still serves 4a72961d from 2026-07-24. npm run verify:deploy-parity is red (missing home-idle-loader, nav-sheet, sentry-init, supabase-client shells live). A workflow that reports success without changing the origin is the deploy-path equivalent of the unexecuted check fixed this session. Now measured continuously by api/deploy-currency.json.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **72**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [SECURITY] TT-ENFORCE-REPROBE
Final score: **72**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

## Recommended Build Order

No currently unblocked local implementation items. Work should move to second-order innovation or closeout verification.


## Best Immediate Move

Primary list is gated or exhausted. Generate a second-order innovation candidate from the deferred ledger or proceed to closeout verification; do not force-ship gated work.
