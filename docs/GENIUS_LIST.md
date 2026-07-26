# Genius Hit List — Session 292

Generated: 2026-07-26
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **95/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **check gh run list**
- Current focus: S292 shipped temporal startup ownership, dimensional availability, privacy-safe production Worker route provenance, a 24-leaf candidate Merkle seal, source-aware pre-push closure, and one declarative evidence graph shared by build order and all 27 publisher workflows. Canonical staging matches the exact candidate root and passed the seven-theme mobile/Axe suite. Production remains held because live Worker routes match 0/5 expected semantics and Supabase/provider runtime proof is incomplete.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Route-provenance history and incident duration. Append only semantic …
Final score: **96**
[S292→NEXT][SIL][OBS/P1] Route-provenance history and incident duration. Append only semantic changes; retain no response bodies.
Why it matters: Route-provenance history and incident duration. Append only semantic c is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Evidence-graph human/agent projection. Render one compact diagram and…
Final score: **93**
[S292→NEXT][SIL][AUTOMATION/P1] Evidence-graph human/agent projection. Render one compact diagram and agent relation view from the validated source.
Why it matters: Evidence-graph human/agent projection. Render one compact diagram and  is open, local, and unblocked — can ship this session.



### DEFERRED / GATED

#### 1. [SECURITY] Restore the production Worker /v/rum route. The security Worker was c…
Final score: **100**
[S291→FOUNDER][INCIDENT/P0][HUMAN ACTION] Restore the production Worker /v/rum route. The security Worker was clobbered out-of-band on 2026-07-03 with a build missing /v/rum; RUM telemetry ingest has been dark since 2026-07-02 (live 405 vs repo 204; honest 47.6% uptime is the S275 forcing-function, correctly not massaged). Restore: gh workflow run cloudflare-worker-deploy.yml -f confirm_production=true. Gated by the fail-closed production promotion hold (Supabase/identity reasons) — clearing or explicitly accepting that hold is a founder decision (auth/security production deploy, CANON-019). cloudflare deploy capability is READY in the secrets gateway; the only gate is the hold.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **87**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [SECURITY] TT-ENFORCE-REPROBE
Final score: **87**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 4. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **84**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [PRODUCT] Candidate artifact Merkle manifest. Activate after Supabase/provider …
Final score: **81**
[S290→NEXT][SIL][RELEASE/P1][BLOCKED: NEXT RUNTIME CANDIDATE] Candidate artifact Merkle manifest. Activate after Supabase/provider reconciliation creates the next candidate; bind critical route/content hashes to its staging receipt so exact commit identity also proves deployment completeness. The current candidate has no observed partial-deploy drift.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 6. [PRODUCT] Privacy-safe provider ceremony trace compiler. Once provider access e…
Final score: **78**
[S290→NEXT][SIL][AUTH/P1][BLOCKED: REAL PROVIDER] Privacy-safe provider ceremony trace compiler. Once provider access exists, compile callback/session/member/investor/revocation step receipts without identifiers and feed identity eligibility.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 7. [COHESION] Social Dashboard bidirectional mirror
Final score: **65**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — awaiting founder confirm before cross-repo write] — S92 website-side partial: website-public, hub, and social-dashboard contracts now expose normalizedActivity schema/empty payload; producer-side Social Dashboard write remains gated.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **63**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Route-provenance history and incident duration. Append only semantic …
2. Post-push CI confirmation
3. Evidence-graph human/agent projection. Render one compact diagram and…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
