# Genius Hit List — Session 300

Generated: 2026-07-31
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **92/100**
- Health: **yellow**
- Current SIL: **967/1000**
- CI health: **check gh run list**
- Current focus: S300 audit + Wave A/B implementation. Found production frozen at the 2026-07-26 build (413 commits behind) behind a fail-closed interlock whose hold reasons are entirely identity-shaped. Shipped: retention expiry so a challenged probe degrades to UNVERIFIED rather than a frozen gauge; a doctor deploy-currency-live alarm (production staleness is now a BLOCKING doctor finding); a canon-ownership reachability gate that found 4 phantom probe owners (3 ABSOLUTE-tier, shipped to studio-ops via Ark); an auto-scoped content lane (partition, not all-or-nothing) with its own confirm_content dispatch so static work can ship without releasing the identity hold; a served-feed status+content-type contract; and geo-vitals confidence labelling separated from the privacy floor.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Break the agents.json build cycle. agents.json → proof-surface → stat…
Final score: **96**
[S300][AGENT/P1] Break the agents.json build cycle. agents.json → proof-surface → status-proof → ai-discovery-health → agents.json; no ordering converges (reorder tried, proved equivalent, reverted). Fix: reference the proof-surface URL statically instead of mirroring a live verdict.
Why it matters: Break the agents.json build cycle. agents.json is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Wave D depth. /proof public in-browser verifier (the transparency app…
Final score: **93**
[S300][AGENT/P2] Wave D depth. /proof public in-browser verifier (the transparency apparatus is this project's most under-exploited asset); feedback→changelog provenance trace; progression next-action spine; agent capability manifest. See docs/AUDIT_2026-07-31.md.
Why it matters: Wave D depth. /proof public in-browser verifier (the transparency appa is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Served-surface continuity registry. Generalize the S299 anchor+compar…
Final score: **90**
[S299→NEXT][SIL][OBS/P2] Served-surface continuity registry. Generalize the S299 anchor+compare pattern from {receipt, ledger} to the whole candidate CORE_PATHS served set in one bounded checker (build-sha, worker-route-provenance, public-intelligence, shell assets).
Why it matters: Served-surface continuity registry. Generalize the S299 anchor+compare is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Ledger monotonicity tripwire. Persist the last-observed served ledger…
Final score: **87**
[S299→NEXT][SIL][OBS/P2] Ledger monotonicity tripwire. Persist the last-observed served ledger depth and alarm on any decrease between observations (silent staging rollback/truncation); append-only, semantic-change gated.
Why it matters: Ledger monotonicity tripwire. Persist the last-observed served ledger  is open, local, and unblocked — can ship this session.


### DEFERRED / GATED

#### 1. [PRODUCT] Mint 3 Supabase credentials (access · management · PG connection). Ve…
Final score: **96**
[S300][FOUNDER/P0][HUMAN] Mint 3 Supabase credentials (access · management · PG connection). Verified genuinely absent from the gateway by name-only search per CANON-019 — not a phantom blocker. Provider-dashboard action, legitimately founder-only. Releases the identity lane; after S300's content lane it no longer blocks content.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [PRODUCT] Decide whether to dispatch confirm_content. Lane built, 52/52, dry-ru…
Final score: **93**
[S300][FOUNDER/P0][HUMAN] Decide whether to dispatch confirm_content. Lane built, 52/52, dry-run 211 promotable / 321 withheld against the real backlog. Ends a 413-commit / 7.1-day staleness without releasing the identity hold. Deliberately not dispatched.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [PRODUCT] Served-surface allowlist in pages-deploy. git archive HEAD publishes …
Final score: **90**
[S300][AGENT/P1] Served-surface allowlist in pages-deploy. git archive HEAD publishes the whole tracked tree — /.cache/ark-inbox.json, /context/PROJECT_STATUS.json, /logs/WORK_LOG.md all serve 200 today. Pre-existing; the content lane is barred from widening it, but the deploy build still needs an include-list.
Why it matters: Requires a live account, real device, inbox receipt, payment-provider flow, or manual external confirmation.

#### 4. [COHESION] Fix canonical skill-trace/session-floor cache contracts via Ark. Defe…
Final score: **86**
[S296→NEXT][SIL][PROCESS/P2][CROSS-REPO] Fix canonical skill-trace/session-floor cache contracts via Ark. Deferred S299: skill-trace.mjs is not present in this repo's reach (control-plane-owned); 12 repo-question evidence cargo already outstanding. Do not fork the control plane locally.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 5. [COHESION] Fix canonical skill-trace/session-floor cache contracts via Ark. The …
Final score: **80**
[S296→NEXT][SIL][PROCESS/P2][CROSS-REPO] Fix canonical skill-trace/session-floor cache contracts via Ark. The trace emitter rejected both documented flag forms despite a valid session, and session-floor could not infer zero items from the current genius cache schema. Ship evidence to studio-ops; do not fork the canonical control plane locally.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 6. [PRODUCT] Re-evaluate RUM anomaly verdict after genuine fresh route coverage re…
Final score: **78**
[S296→NEXT][SIL][OBS/P1][EXTERNAL] Re-evaluate RUM anomaly verdict after genuine fresh route coverage returns. Deferred S299: rum-summary.json totalSamples: 0, production held 0/5. Do not backfill; the state machine grades fresh evidence only when production legitimately recovers.
Why it matters: Instrumentation is complete; closure requires a future source-of-truth observation and must not be fabricated locally.

#### 7. [PRODUCT] Wave C page consolidation
Final score: **75**
[S300][AGENT/P2] Wave C page consolidation — AFTER promotion. 3 membership pages selling the same tiers; /leaderboards vs /vault-wall duplication; 7 telemetry surfaces. Blocked on sequencing, not capability: these surfaces are in SENSITIVE (they render entitlement), so they are auth-adjacent AND cannot ride the content lane. Promote first.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [VERIFY] Verify canonical protocol propagation repair after Ark receipt. Defer…
Final score: **74**
[S298→NEXT][SIL][PROCESS/P2][CROSS-REPO] Verify canonical protocol propagation repair after Ark receipt. Deferred S299: propagated docs/SESSION_PROTOCOL.md still lacks §2B/§2C and no canon-update repair cargo has arrived. Studio-ops-owned; acceptance tests already shipped (01JULCLFE32881AA71DA10278F). Verify on the drain that carries the repair.
Why it matters: Owned by another repo or already moved through Ark cargo.

## Recommended Build Order

1. Break the agents.json build cycle. agents.json → proof-surface → stat…
2. Post-push CI confirmation
3. Wave D depth. /proof public in-browser verifier (the transparency app…
4. Served-surface continuity registry. Generalize the S299 anchor+compar…
5. Ledger monotonicity tripwire. Persist the last-observed served ledger…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
