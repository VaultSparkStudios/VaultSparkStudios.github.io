# Genius Hit List — Session 299

Generated: 2026-07-30
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **95/100**
- Health: **yellow**
- Current SIL: **1000/1000**
- CI health: **check gh run list**
- Current focus: S299 closed the S298 handoff's top next-step: the served deploy-history ledger is now independently fetched and compared (depth + head + canonical digest) against a reproducible continuity anchor excluded from the candidate manifest, so publishing it cannot create a receipt/manifest cycle. A pre-existing un-cascaded-publisher drift was root-fixed; build:check is 257/257 and production remains intentionally held.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Served-surface continuity registry. Generalize the S299 anchor+compar…
Final score: **96**
[S299→NEXT][SIL][OBS/P2] Served-surface continuity registry. Generalize the S299 anchor+compare pattern from {receipt, ledger} to the whole candidate CORE_PATHS served set in one bounded checker (build-sha, worker-route-provenance, public-intelligence, shell assets).
Why it matters: Served-surface continuity registry. Generalize the S299 anchor+compare is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Ledger monotonicity tripwire. Persist the last-observed served ledger…
Final score: **93**
[S299→NEXT][SIL][OBS/P2] Ledger monotonicity tripwire. Persist the last-observed served ledger depth and alarm on any decrease between observations (silent staging rollback/truncation); append-only, semantic-change gated.
Why it matters: Ledger monotonicity tripwire. Persist the last-observed served ledger  is open, local, and unblocked — can ship this session.



### DEFERRED / GATED

#### 1. [COHESION] Fix canonical skill-trace/session-floor cache contracts via Ark. Defe…
Final score: **98**
[S296→NEXT][SIL][PROCESS/P2][CROSS-REPO] Fix canonical skill-trace/session-floor cache contracts via Ark. Deferred S299: skill-trace.mjs is not present in this repo's reach (control-plane-owned); 12 repo-question evidence cargo already outstanding. Do not fork the control plane locally.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 2. [COHESION] Fix canonical skill-trace/session-floor cache contracts via Ark. The …
Final score: **92**
[S296→NEXT][SIL][PROCESS/P2][CROSS-REPO] Fix canonical skill-trace/session-floor cache contracts via Ark. The trace emitter rejected both documented flag forms despite a valid session, and session-floor could not infer zero items from the current genius cache schema. Ship evidence to studio-ops; do not fork the canonical control plane locally.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 3. [PRODUCT] Re-evaluate RUM anomaly verdict after genuine fresh route coverage re…
Final score: **90**
[S296→NEXT][SIL][OBS/P1][EXTERNAL] Re-evaluate RUM anomaly verdict after genuine fresh route coverage returns. Deferred S299: rum-summary.json totalSamples: 0, production held 0/5. Do not backfill; the state machine grades fresh evidence only when production legitimately recovers.
Why it matters: Instrumentation is complete; closure requires a future source-of-truth observation and must not be fabricated locally.

#### 4. [VERIFY] Verify canonical protocol propagation repair after Ark receipt. Defer…
Final score: **86**
[S298→NEXT][SIL][PROCESS/P2][CROSS-REPO] Verify canonical protocol propagation repair after Ark receipt. Deferred S299: propagated docs/SESSION_PROTOCOL.md still lacks §2B/§2C and no canon-update repair cargo has arrived. Studio-ops-owned; acceptance tests already shipped (01JULCLFE32881AA71DA10278F). Verify on the drain that carries the repair.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 5. [PRODUCT] Re-evaluate RUM anomaly verdict after genuine fresh route coverage re…
Final score: **84**
[S296→NEXT][SIL][OBS/P1][EXTERNAL] Re-evaluate RUM anomaly verdict after genuine fresh route coverage returns. Do not backfill or reinterpret the 24-day telemetry gap; the new state machine will grade fresh evidence when production recovery legitimately restores ingest.
Why it matters: Instrumentation is complete; closure requires a future source-of-truth observation and must not be fabricated locally.

#### 6. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **81**
[HUMAN][CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [SECURITY] TT-ENFORCE-REPROBE
Final score: **81**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 8. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **78**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Served-surface continuity registry. Generalize the S299 anchor+compar…
2. Ledger monotonicity tripwire. Persist the last-observed served ledger…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
