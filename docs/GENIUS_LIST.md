# Genius Hit List — Session 294

Generated: 2026-07-26
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **86/100**
- Health: **yellow**
- Current SIL: **998/1000**
- CI health: **check gh run list**
- Current focus: S294 root-caused and fixed a founder-reported P0: the playable Franchise Architect page served as unstyled text because all three of its documents declared a <base href> pointing at the About directory, which ships no app assets. Introduced by the S284 slug rebrand and broken since. Fixed, browser-verified, and gated by check-base-href-resolution so the class cannot return. The fix is in main but cannot reach production while the fail-closed promotion interlock holds on five credential-gated identity reasons.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Incident-close verification. The ledger has only ever recorded an ope…
Final score: **96**
[S293→NEXT][SIL][OBS/P1] Incident-close verification. The ledger has only ever recorded an open incident. When production is restored, assert the close path end-to-end on real data — matched flip appends exactly one row, the incident gains a closedAt, duration freezes, and /status/ returns to the "no open incidents" state. Self-tested today with synthetic rows; unproven against a real recovery.
Why it matters: Incident-close verification. The ledger has only ever recorded an open is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Wire verify:deploy-parity into a gate. It correctly detected the drif…
Final score: **83**
[S293→NEXT][OBS/P1] Wire verify:deploy-parity into a gate. It correctly detected the drift and nothing ever ran it — a real check with no caller. It needs network, so it belongs in the scheduled probe or the closeout flow, not offline build:check.
Why it matters: Wire verify:deploy-parity into a gate. It correctly detected the drift is a 294-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Onset corroboration beyond one coarse probe. onsetNotLaterThan curren…
Final score: **80**
[S293→NEXT][SIL][OBS/P1] Onset corroboration beyond one coarse probe. onsetNotLaterThan currently tightens against data/uptime-history.ndjson alone. Fold in the other independent committed ledgers (RUM ingest silence since 2026-07-02, CI/deploy history) to narrow the bound further — each must stay labelled with its own resolution, never merged into route-level evidence.
Why it matters: Onset corroboration beyond one coarse probe. onsetNotLaterThan current is a 294-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`



### DEFERRED / GATED

#### 1. [PRODUCT] ~~[S294→FOUNDER][PRODUCT/P1] Decide the Play-CTA destination.~~ All o…
Final score: **90**
~~[S294→FOUNDER][PRODUCT/P1] Decide the Play-CTA destination.~~ All on-site "Play Beta" CTAs point to /franchise-architect/; api/ecosystem-state.json lists the game's liveUrl as https://playfranchisearchitect.com/. Repoint the CTAs to that domain (retiring/redirecting the on-site copy), or keep the on-site playable build canonical? Public routing change — awaiting founder answer.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [SECURITY] Restore the production Worker /v/rum route. The security Worker was c…
Final score: **90**
[S291→FOUNDER][INCIDENT/P0][HUMAN ACTION] Restore the production Worker /v/rum route. The security Worker was clobbered out-of-band on 2026-07-03 with a build missing /v/rum; RUM telemetry ingest has been dark since 2026-07-02 (live 405 vs repo 204; honest 47.6% uptime is the S275 forcing-function, correctly not massaged). Restore: gh workflow run cloudflare-worker-deploy.yml -f confirm_production=true. Gated by the fail-closed production promotion hold (Supabase/identity reasons) — clearing or explicitly accepting that hold is a founder decision (auth/security production deploy, CANON-019). cloudflare deploy capability is READY in the secrets gateway; the only gate is the hold.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [SECURITY] Decide whether a content-only hotfix promotion lane should exist. A s…
Final score: **87**
[S294→FOUNDER][OPS/P1] Decide whether a content-only hotfix promotion lane should exist. A static one-line fix to a broken public page is currently blocked by unrelated Supabase migration state (D-S294.3). Loosening a security interlock is a founder call.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [VERIFY] The Franchise Architect fix cannot reach production while the promoti…
Final score: **86**
[S294→FOUNDER][DEPLOY/P0] The Franchise Architect fix cannot reach production while the promotion hold stands. Production is 143 commits / 2.3 days stale. Gate holds on supabase-migration-pending, eternal-function-pending, real-provider-e2e-pending, supabase-control-plane-partial, independent-release-gate-no-go — all credential-gated. Release: gh workflow run pages-deploy.yml -f confirm_production=true. Founder decision (production promotion under an explicit hold, CANON-019) — not dispatched autonomously.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [VERIFY] Production is 134 commits / 2.3 days stale
Final score: **77**
[S293→NEXT][DEPLOY/P0] Production is 134 commits / 2.3 days stale — diagnose why the deploy path is not landing. Cloudflare Pages Deploy and Cloudflare Cache Purge both report success on every push, yet live /api/build-sha.json still serves 4a72961d from 2026-07-24. npm run verify:deploy-parity is red (missing home-idle-loader, nav-sheet, sentry-init, supabase-client shells live). A workflow that reports success without changing the origin is the deploy-path equivalent of the unexecuted check fixed this session. Now measured continuously by api/deploy-currency.json.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **75**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [SECURITY] TT-ENFORCE-REPROBE
Final score: **75**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 8. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **72**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Incident-close verification. The ledger has only ever recorded an ope…
2. Wire verify:deploy-parity into a gate. It correctly detected the drif…
3. Onset corroboration beyond one coarse probe. onsetNotLaterThan curren…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
