# Genius Hit List — Session 287

Generated: 2026-07-17
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **95/100**
- Health: **yellow**
- Current SIL: **997/1000**
- CI health: **check gh run list**
- Current focus: S287 completed a continuous full /arc: the post-promotion receipt flagship (S286 committed [SIL] + named nextMilestone) plus four second-order observability innovations shipped and build:check-verified 218/218 EXIT 0. api/promotion-receipt.json reconciles candidate-green against what production actually serves — git-ordered prod SHA (benign-ahead vs stale-behind), live enforce-CSP mode, 0 browser console errors, 9 public-signal endpoints — honest-dark for anything unobserved. Folded into release-proof; CSP prod-regression guard, /status/ reconciliation tile, status-proof feed #11, and a tail-safe history ledger + streak landed with it. Two pre-existing rebase-lag derived drifts were root-fixed.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Behavioral Obelisk callback→storage→VSIdentity.getSession() round-tri…
Final score: **96**
[SIL:1][AUTH/P0] Behavioral Obelisk callback→storage→VSIdentity.getSession() round-trip check. Lands with the authorized auth repair.
Why it matters: Behavioral Obelisk callback is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] Reconciliation drift alarm → CI beacon. If data/promotion-history.ndj…
Final score: **94**
[S287][SIL][OBS/P2] Reconciliation drift alarm → CI beacon. If data/promotion-history.ndjson shows N consecutive behind records (stranded deploys), surface it through the CI status beacon. First step: read the ledger in build-ci-status-beacon.mjs and add a strandedStreak field.
Why it matters: Reconciliation drift alarm shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [PRODUCT] Multi-route promotion reconciliation. Extend the receipt's browser ca…
Final score: **93**
[S287][SIL][OBS/P2] Multi-route promotion reconciliation. Extend the receipt's browser capture beyond / to a rotating set of critical routes (member portal, a game page) so console/cardinality reconciliation isn't homepage-only. First step: add a rotating route list to observeBrowser().
Why it matters: Multi-route promotion reconciliation. Extend the receipt's browser cap is open, local, and unblocked — can ship this session.



### DEFERRED / GATED

#### 1. [COHESION] Authorize Obelisk Phase-2 identity-provider migration. Active provide…
Final score: **98**
[S286][AUTH/P0][FOUNDER DECISION] Authorize Obelisk Phase-2 identity-provider migration. Active provider/UI remain Supabase; ~110 direct call sites remain; callback session shape is rejected by the normalizer; RP credentials and JWT/RLS bridge are missing. Secrets discovery + blocker preflight ran before this gate. Once authorized, execute through the secrets gateway: repair session contract, provision RP credentials, deploy bridge, migrate one portal soak, enroll/test founder passkey, then expand. Do not call the scaffold integrated.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 2. [PRODUCT] Authorize Obelisk Phase-2 identity-provider migration. Unchanged gate
Final score: **96**
[S286→S287][AUTH/P0][FOUNDER DECISION] Authorize Obelisk Phase-2 identity-provider migration. Unchanged gate — founder decision + missing RP credentials.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 3. [PRODUCT] Replace the regex-only Obelisk check with a behavioral callback→stora…
Final score: **90**
[S286→S287][SIL:1][AUTH/P0] Replace the regex-only Obelisk check with a behavioral callback→storage→VSIdentity.getSession() round-trip and provider-activation assertion. Land with the authorized auth repair so the gate proves behavior, not string presence.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [PRODUCT] Multi-sport runway for Franchise Architect. playfranchisearchitect.co…
Final score: **87**
[S284→FOUNDER] Multi-sport runway for Franchise Architect. playfranchisearchitect.com + per-sport leaderboards; founder-gated on domain + product scope.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 5. [PRODUCT] Multi-sport runway for Franchise Architect. The rebrand establishes t…
Final score: **84**
[S284→FOUNDER] Multi-sport runway for Franchise Architect. The rebrand establishes the umbrella; playfranchisearchitect.com + per-sport /leaderboards/<sport>/ are the open expansion (CDR #24). Founder-gated (domain + product scope).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 6. [PRODUCT] Multi-sport runway for Franchise Architect. playfranchisearchitect.co…
Final score: **81**
[S284→FOUNDER] Multi-sport runway for Franchise Architect. playfranchisearchitect.com + per-sport /leaderboards/<sport>/ (CDR #24). Founder-gated (domain + product scope).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 7. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **78**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 8. [SECURITY] TT-ENFORCE-REPROBE
Final score: **78**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

## Recommended Build Order

1. Behavioral Obelisk callback→storage→VSIdentity.getSession() round-tri…
2. Post-push CI confirmation
3. Reconciliation drift alarm → CI beacon. If data/promotion-history.ndj…
4. Multi-route promotion reconciliation. Extend the receipt's browser ca…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
