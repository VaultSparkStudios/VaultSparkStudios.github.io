# Genius Hit List — Session 293

Generated: 2026-07-26
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **86/100**
- Health: **yellow**
- Current SIL: **997/1000**
- CI health: **check gh run list**
- Current focus: S293 gave the production edge incident a measurable duration and published it. An append-only semantic ledger records only route-meaning changes and measures incidents against the last observation, so the live 0/5 route mismatch now reads as 13.3 days open, bounded by the independent uptime ledger and labelled as an upper bound rather than a claimed onset. The evidence graph gained human and agent projections plus three structural gates: declared checks must actually execute, a derived feed cannot ship without its ledger, and the /status/ renderer may only read fields its feed publishes. Production remains held and untouched.

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
Why it matters: Wire verify:deploy-parity into a gate. It correctly detected the drift is a 293-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Onset corroboration beyond one coarse probe. onsetNotLaterThan curren…
Final score: **80**
[S293→NEXT][SIL][OBS/P1] Onset corroboration beyond one coarse probe. onsetNotLaterThan currently tightens against data/uptime-history.ndjson alone. Fold in the other independent committed ledgers (RUM ingest silence since 2026-07-02, CI/deploy history) to narrow the bound further — each must stay labelled with its own resolution, never merged into route-level evidence.
Why it matters: Onset corroboration beyond one coarse probe. onsetNotLaterThan current is a 293-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`



### DEFERRED / GATED

#### 1. [SECURITY] Restore the production Worker /v/rum route. The security Worker was c…
Final score: **99**
[S291→FOUNDER][INCIDENT/P0][HUMAN ACTION] Restore the production Worker /v/rum route. The security Worker was clobbered out-of-band on 2026-07-03 with a build missing /v/rum; RUM telemetry ingest has been dark since 2026-07-02 (live 405 vs repo 204; honest 47.6% uptime is the S275 forcing-function, correctly not massaged). Restore: gh workflow run cloudflare-worker-deploy.yml -f confirm_production=true. Gated by the fail-closed production promotion hold (Supabase/identity reasons) — clearing or explicitly accepting that hold is a founder decision (auth/security production deploy, CANON-019). cloudflare deploy capability is READY in the secrets gateway; the only gate is the hold.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [VERIFY] Production is 134 commits / 2.3 days stale
Final score: **86**
[S293→NEXT][DEPLOY/P0] Production is 134 commits / 2.3 days stale — diagnose why the deploy path is not landing. Cloudflare Pages Deploy and Cloudflare Cache Purge both report success on every push, yet live /api/build-sha.json still serves 4a72961d from 2026-07-24. npm run verify:deploy-parity is red (missing home-idle-loader, nav-sheet, sentry-init, supabase-client shells live). A workflow that reports success without changing the origin is the deploy-path equivalent of the unexecuted check fixed this session. Now measured continuously by api/deploy-currency.json.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 3. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **84**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [SECURITY] TT-ENFORCE-REPROBE
Final score: **84**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 5. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **81**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [PRODUCT] Candidate artifact Merkle manifest. Activate after Supabase/provider …
Final score: **78**
[S290→NEXT][SIL][RELEASE/P1][BLOCKED: NEXT RUNTIME CANDIDATE] Candidate artifact Merkle manifest. Activate after Supabase/provider reconciliation creates the next candidate; bind critical route/content hashes to its staging receipt so exact commit identity also proves deployment completeness. The current candidate has no observed partial-deploy drift.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [PRODUCT] Privacy-safe provider ceremony trace compiler. Once provider access e…
Final score: **75**
[S290→NEXT][SIL][AUTH/P1][BLOCKED: REAL PROVIDER] Privacy-safe provider ceremony trace compiler. Once provider access exists, compile callback/session/member/investor/revocation step receipts without identifiers and feed identity eligibility.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [COHESION] Social Dashboard bidirectional mirror
Final score: **62**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — awaiting founder confirm before cross-repo write] — S92 website-side partial: website-public, hub, and social-dashboard contracts now expose normalizedActivity schema/empty payload; producer-side Social Dashboard write remains gated.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Incident-close verification. The ledger has only ever recorded an ope…
2. Wire verify:deploy-parity into a gate. It correctly detected the drif…
3. Onset corroboration beyond one coarse probe. onsetNotLaterThan curren…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
