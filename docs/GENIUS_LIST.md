# Genius Hit List — Session 300

Generated: 2026-07-31
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **91/100**
- Health: **yellow**
- Current SIL: **967/1000**
- CI health: **check gh run list**
- Current focus: S300 audit + Wave A/B implementation. Found production frozen at the 2026-07-26 build (413 commits behind) behind a fail-closed interlock whose hold reasons are entirely identity-shaped. Shipped: retention expiry so a challenged probe degrades to UNVERIFIED rather than a frozen gauge; a doctor deploy-currency-live alarm (production staleness is now a BLOCKING doctor finding); a canon-ownership reachability gate that found 4 phantom probe owners (3 ABSOLUTE-tier, shipped to studio-ops via Ark); an auto-scoped content lane (partition, not all-or-nothing) with its own confirm_content dispatch so static work can ship without releasing the identity hold; a served-feed status+content-type contract; and geo-vitals confidence labelling separated from the privacy floor.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Link the 143 existing accounts to Obelisk identities. identity.js alr…
Final score: **96**
[S300→NEXT][IDENTITY/P1] Link the 143 existing accounts to Obelisk identities. identity.js already normalizes identityId (Obelisk sub) alongside the preserved userId (Supabase UUID); the link-on-email-match path should be exercised and verified against a real signed-in session before any bulk action.
Why it matters: Link the 143 existing accounts to Obelisk identities. identity.js alre is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Break the agents.json build cycle. agents.json → proof-surface → stat…
Final score: **93**
[S300][AGENT/P1] Break the agents.json build cycle. agents.json → proof-surface → status-proof → ai-discovery-health → agents.json; no ordering converges (reorder tried, proved equivalent, reverted). Fix: reference the proof-surface URL statically instead of mirroring a live verdict.
Why it matters: Break the agents.json build cycle. agents.json is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Wave D depth. /proof public in-browser verifier (the transparency app…
Final score: **90**
[S300][AGENT/P2] Wave D depth. /proof public in-browser verifier (the transparency apparatus is this project's most under-exploited asset); feedback→changelog provenance trace; progression next-action spine; agent capability manifest. See docs/AUDIT_2026-07-31.md.
Why it matters: Wave D depth. /proof public in-browser verifier (the transparency appa is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Served-surface continuity registry. Generalize the S299 anchor+compar…
Final score: **87**
[S299→NEXT][SIL][OBS/P2] Served-surface continuity registry. Generalize the S299 anchor+compare pattern from {receipt, ledger} to the whole candidate CORE_PATHS served set in one bounded checker (build-sha, worker-route-provenance, public-intelligence, shell assets).
Why it matters: Served-surface continuity registry. Generalize the S299 anchor+compare is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Ledger monotonicity tripwire. Persist the last-observed served ledger…
Final score: **84**
[S299→NEXT][SIL][OBS/P2] Ledger monotonicity tripwire. Persist the last-observed served ledger depth and alarm on any decrease between observations (silent staging rollback/truncation); append-only, semantic-change gated.
Why it matters: Ledger monotonicity tripwire. Persist the last-observed served ledger  is open, local, and unblocked — can ship this session.


### DEFERRED / GATED

#### 1. [PRODUCT] Mint 3 Supabase credentials (access · management · PG connection). Ve…
Final score: **93**
[S300][FOUNDER/P0][HUMAN] Mint 3 Supabase credentials (access · management · PG connection). Verified genuinely absent from the gateway by name-only search per CANON-019 — not a phantom blocker. Provider-dashboard action, legitimately founder-only. Releases the identity lane; after S300's content lane it no longer blocks content.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [PRODUCT] Decide whether to dispatch confirm_content. Lane built, 52/52, dry-ru…
Final score: **90**
[S300][FOUNDER/P0][HUMAN] Decide whether to dispatch confirm_content. Lane built, 52/52, dry-run 211 promotable / 321 withheld against the real backlog. Ends a 413-commit / 7.1-day staleness without releasing the identity hold. Deliberately not dispatched.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [VERIFY] One real Obelisk login to close real-provider-e2e. Everything automat…
Final score: **86**
[S300→NEXT][IDENTITY/P0][HUMAN] One real Obelisk login to close real-provider-e2e. Everything automatable is verified; the remaining proof needs actual credentials at obeliskgate.com. Note the honest limit found in preflight: Obelisk's authorize endpoint issues a signin redirect for a bogus client_id too (project=not-a-real-client), so it does not validate the client at that step — our client registration is therefore *unproven* until a real token exchange succeeds. Sign in once at https://vaultsparkstudios.com/login, then the callback/session/role/revocation ceremony can be recorded and the promotion interlock's identity blockers can start clearing legitimately.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 4. [COHESION] Fix canonical skill-trace/session-floor cache contracts via Ark. Defe…
Final score: **83**
[S296→NEXT][SIL][PROCESS/P2][CROSS-REPO] Fix canonical skill-trace/session-floor cache contracts via Ark. Deferred S299: skill-trace.mjs is not present in this repo's reach (control-plane-owned); 12 repo-question evidence cargo already outstanding. Do not fork the control plane locally.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 5. [VERIFY] Close the edge + second origin for internal paths. The apex still ret…
Final score: **77**
[S300→NEXT][AGENT/P1] Close the edge + second origin for internal paths. The apex still returns 200 for those paths. Diagnosed, not guessed: (a) stale edge copies — the served /logs/WORK_LOG.md begins at *Session 287* and its response carries the pre-deploy shell hash 86cb6a57c2, with Age climbing past 24,600s and surviving a purge_everything that returned {"success":true}; CF-Cache-Status: DYNAMIC says it is not in the zone cache the purge clears. A clean URL is deterministically 200 while the same URL with any query string is deterministically 404 — so the origin is right and a URL-keyed layer above it is stale. Needs a targeted purge-by-URL or TTL expiry, and the purge step should verify eviction rather than trusting the API's success flag. (b) GitHub Pages is a second, unpruned origin — it publishes the branch verbatim (.nojekyll tracked, build_type: legacy, source main/) and serves those paths 200 directly. Excluding paths there needs either a dedicated pruned publish branch or disabling it; it is the documented warm rollback origin (D-S289.8), so that is a founder-scoped call, not a silent change.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [COHESION] Fix canonical skill-trace/session-floor cache contracts via Ark. The …
Final score: **77**
[S296→NEXT][SIL][PROCESS/P2][CROSS-REPO] Fix canonical skill-trace/session-floor cache contracts via Ark. The trace emitter rejected both documented flag forms despite a valid session, and session-floor could not infer zero items from the current genius cache schema. Ship evidence to studio-ops; do not fork the canonical control plane locally.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 7. [PRODUCT] Re-evaluate RUM anomaly verdict after genuine fresh route coverage re…
Final score: **75**
[S296→NEXT][SIL][OBS/P1][EXTERNAL] Re-evaluate RUM anomaly verdict after genuine fresh route coverage returns. Deferred S299: rum-summary.json totalSamples: 0, production held 0/5. Do not backfill; the state machine grades fresh evidence only when production legitimately recovers.
Why it matters: Instrumentation is complete; closure requires a future source-of-truth observation and must not be fabricated locally.

#### 8. [PRODUCT] Wave C page consolidation
Final score: **72**
[S300][AGENT/P2] Wave C page consolidation — AFTER promotion. 3 membership pages selling the same tiers; /leaderboards vs /vault-wall duplication; 7 telemetry surfaces. Blocked on sequencing, not capability: these surfaces are in SENSITIVE (they render entitlement), so they are auth-adjacent AND cannot ride the content lane. Promote first.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Link the 143 existing accounts to Obelisk identities. identity.js alr…
2. Post-push CI confirmation
3. Break the agents.json build cycle. agents.json → proof-surface → stat…
4. Wave D depth. /proof public in-browser verifier (the transparency app…
5. Served-surface continuity registry. Generalize the S299 anchor+compar…
6. Ledger monotonicity tripwire. Persist the last-observed served ledger…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
