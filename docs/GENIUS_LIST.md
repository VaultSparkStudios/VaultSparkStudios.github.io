# Genius Hit List — Session 301

Generated: 2026-08-01
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **yellow**
- Current SIL: **974/1000**
- CI health: **check gh run list**
- Current focus: S301 finished the Obelisk identity lane. The three Supabase credentials S300 escalated are now in the gateway and all four authority planes probe ready, so the two runtime blockers became agent work under CANON-019/CANON-040 and identity receipt blockers went 3 to 1 — the survivor is the founder-gated real-provider-e2e. The behavioural probe found more than the audit predicted: public.get_classified_files() was RAISING SQLSTATE 42702 for every authenticated caller, so the classified archive returned nothing to anyone, and its committed repair had sat unapplied for nine days. Applied with a pre-image captured first; the eternal-intelligence edge function was proven drifted by byte-searching the deployed bundle and redeployed v3 to v4. Root fix: the identity evidence file was hand-authored and fed a public receipt, so two blockers were clearable by editing prose — two live verifiers are now its only supported writers and write only what they re-read from the provider after the write. Capability discovery was itself generating phantom blockers (an UNKNOWN capability name rendered as a MISSING credential); UNKNOWN and MISSING are now distinct states with distinct exit codes.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [COHESION] Structured receipt on Obelisk link FAILURE. Today a failed link logs …
Final score: **95**
[S301→NEXT][OBS/P2] Structured receipt on Obelisk link FAILURE. Today a failed link logs a code and redirects to ?auth_error=bridge_failed; the member sees a generic failure and we learn nothing. A privacy-safe failure receipt (code, plane, no identifiers) makes first-login problems diagnosable at the moment they matter most — when the first real people arrive.
Why it matters: Structured receipt on Obelisk link FAILURE. Today a failed link logs a is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [PRODUCT] Break the agents.json build cycle. agents.json → proof-surface → stat…
Final score: **84**
[S300][AGENT/P1] Break the agents.json build cycle. agents.json → proof-surface → status-proof → ai-discovery-health → agents.json; no ordering converges (reorder tried, proved equivalent, reverted). Fix: reference the proof-surface URL statically instead of mirroring a live verdict.
Why it matters: Break the agents.json build cycle. agents.json is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Kill the login scan cliff with public.obelisk_identity_link
Final score: **81**
[S301→NEXT][SEC/P1] Kill the login scan cliff with public.obelisk_identity_link — the auth-schema route is closed (D-S301.10). Founder approved the auth-flow change; implementation disproved the plan and it was reverted rather than shipped half-safe. Two hard findings: (1) a unique index on auth.users is impossible — Supabase returns 42501: must be owner of table users; (2) the email filter fast path is not safe alone, because taking it skips the pre-write subject scan, so a duplicate would be caught only after the metadata write — an existing unit test caught the degradation from identity_subject_duplicate to a generic error. Correct design: a link table in our own schema (obelisk_sub PK, user_id unique), inserted *before* the app_metadata write so an interruption leaves a self-healing orphan link row rather than an orphan metadata write. It supplies the uniqueness auth denies us AND an indexed subject lookup, killing both full table walks instead of one. Live facts to build on: GoTrue filter genuinely narrows (exact email → 1 of 252) but is case-sensitive, so a miss must fall back; 0 mixed-case emails and 0 case-collision groups today, which is the invariant the filter's completeness rests on. <!-- evidence-open: the deliverable is public.obelisk_identity_link plus the worker rewiring, neither of which exists. The files this item names are the affected context. -->
Why it matters: Kill the login scan cliff with public.obelisk_identity_link is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Wave D depth. /proof public in-browser verifier (the transparency app…
Final score: **81**
[S300][AGENT/P2] Wave D depth. /proof public in-browser verifier (the transparency apparatus is this project's most under-exploited asset); feedback→changelog provenance trace; progression next-action spine; agent capability manifest. See docs/AUDIT_2026-07-31.md.
Why it matters: Wave D depth. /proof public in-browser verifier (the transparency appa is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Served-surface continuity registry. Generalize the S299 anchor+compar…
Final score: **78**
[S299→NEXT][SIL][OBS/P2] Served-surface continuity registry. Generalize the S299 anchor+compare pattern from {receipt, ledger} to the whole candidate CORE_PATHS served set in one bounded checker (build-sha, worker-route-provenance, public-intelligence, shell assets).
Why it matters: Served-surface continuity registry. Generalize the S299 anchor+compare is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] The plan-inheritance fix cannot be proven end-to-end against live dat…
Final score: **77**
[S301→NEXT][IDENTITY/P2] The plan-inheritance fix cannot be proven end-to-end against live data. The only required_plan='vault_sparked' row needs rank 3; the only active Eternal subscriber holds rank 2 (1,065 points). The receipt therefore reports coverage: "partial" and names eternal-plan-unlocked as unobserved. Re-run verify-supabase-runtime.mjs --verify --write-evidence when any Eternal member reaches rank 3, or when a gated row lands at a rank an Eternal member already holds — the verdict will upgrade itself from live evidence.
Why it matters: The plan-inheritance fix cannot be proven end-to-end against live data is a 301-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 4. [PRODUCT] Ledger monotonicity tripwire. Persist the last-observed served ledger…
Final score: **75**
[S299→NEXT][SIL][OBS/P2] Ledger monotonicity tripwire. Persist the last-observed served ledger depth and alarm on any decrease between observations (silent staging rollback/truncation); append-only, semantic-change gated.
Why it matters: Ledger monotonicity tripwire. Persist the last-observed served ledger  is open, local, and unblocked — can ship this session.

#### 5. [VERIFY] worker-route-provenance renders a Cloudflare bot-challenge as a route…
Final score: **74**
[S301→NEXT][OBS/P0] worker-route-provenance renders a Cloudflare bot-challenge as a route mismatch — it is publishing a false incident right now. Found during S301 closeout, verified against both the committed artifact and live probes; deliberately not started because it feeds five consumers (build-release-proof, build-status-proof, build-security-posture, build-worker-route-history, check-uptime-contract) plus status/index.html, and a half-landed cascade at the end of a session is worse than a recorded finding. Evidence: api/worker-route-provenance.json (generated 2026-08-01T01:36:45Z) reads state: "mismatch", matched: 0/5, with every route showing observedStatus: 403 and observedContentType: "text/html; charset=UTF-8" — the signature of a CF interstitial, not a route failure. Direct probes ~2h later returned /api/auth/me 200 JSON and /login 302 to obeliskgate.com with valid PKCE. grep -n "challenge\|403\|text/html" scripts/build-worker-route-provenance.mjs returns nothing — the builder has no challenge detection at all. This is D-S300.1 ("a challenged vantage must not render as a measurement") applied to a surface that never received the fix, and it is worse here because the history ledger converts the false reading into a *duration*. Fix: reuse the isChallenged({status, contentType}) primitive already written and self-tested in scripts/verify-obelisk-edge-deployment.mjs — a 403/503 HTML body where JSON or a redirect was due is challenged → unverified, never mismatch. Then confirm build-worker-route-history does not accrue incident duration from challenged observations. <!-- evidence-open: the files this item names (status/index.html, the five consumer scripts, the isChallenged primitive) are the affected CONTEXT, not the deliverable. The deliverable is challenge detection inside build-worker-route-provenance.mjs, which does not exist — grep -n "challenge\|403\|text/html" on that file returns nothing. -->
Why it matters: worker-route-provenance renders a Cloudflare bot-challenge as a route  is a 301-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`


### DEFERRED / GATED

#### 1. [BRAND] Schedule check-obelisk-link-readiness.mjs. The gauge is built and gre…
Final score: **96**
[S301→NEXT][OBS/P2][FOUNDER-PRECONDITION] Schedule check-obelisk-link-readiness.mjs. The gauge is built and green but runs only on demand, because it needs SUPABASE_ACCESS_TOKEN and the studio-ops secrets gateway does not exist on a GitHub runner. Add it as a repository Actions secret and the gauge can run daily — watching duplicate emails, duplicate subjects, mixed-case emails, and scan headroom. Adding the cron *first* would publish a permanently unavailable signal, which is the producer-never-built antipattern; the precondition comes first.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [SECURITY] Login pages every user on every callback. scanSupabaseUsers walks /au…
Final score: **91**
[S301→NEXT][SEC/P2][FOUNDER] Login pages every user on every callback. scanSupabaseUsers walks /auth/v1/admin/users 100 at a time, up to 20 pages, per sign-in — 3 requests today, and at 2,000 accounts it throws supabase_user_scan_limit and every login fails. Fails closed, so a capacity cliff at ~8× current scale, not a security hole. Headroom instrumented (1,748 accounts) by check-obelisk-link-readiness.mjs. Fix designed — an indexed security definer lookup, additive with fallback to the existing scan — and deliberately not applied: it touches the authentication flow, which AGENTS.md puts behind founder escalation.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [PRODUCT] Decide whether to dispatch confirm_content. Lane built, 52/52, dry-ru…
Final score: **87**
[S300][FOUNDER/P0][HUMAN] Decide whether to dispatch confirm_content. Lane built, 52/52, dry-run 211 promotable / 321 withheld against the real backlog. Ends a 413-commit / 7.1-day staleness without releasing the identity hold. Deliberately not dispatched.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [VERIFY] One real Obelisk login to close real-provider-e2e. Everything automat…
Final score: **80**
[S300→NEXT][IDENTITY/P0][HUMAN] One real Obelisk login to close real-provider-e2e. Everything automatable is verified; the remaining proof needs actual credentials at obeliskgate.com. Note the honest limit found in preflight: Obelisk's authorize endpoint issues a signin redirect for a bogus client_id too (project=not-a-real-client), so it does not validate the client at that step — our client registration is therefore *unproven* until a real token exchange succeeds. Sign in once at https://vaultsparkstudios.com/login, then the callback/session/role/revocation ceremony can be recorded and the promotion interlock's identity blockers can start clearing legitimately.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [COHESION] Fix canonical skill-trace/session-floor cache contracts via Ark. Defe…
Final score: **80**
[S296→NEXT][SIL][PROCESS/P2][CROSS-REPO] Fix canonical skill-trace/session-floor cache contracts via Ark. Deferred S299: skill-trace.mjs is not present in this repo's reach (control-plane-owned); 12 repo-question evidence cargo already outstanding. Do not fork the control plane locally.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 6. [VERIFY] Close the edge + second origin for internal paths. The apex still ret…
Final score: **74**
[S300→NEXT][AGENT/P1] Close the edge + second origin for internal paths. The apex still returns 200 for those paths. Diagnosed, not guessed: (a) stale edge copies — the served /logs/WORK_LOG.md begins at *Session 287* and its response carries the pre-deploy shell hash 86cb6a57c2, with Age climbing past 24,600s and surviving a purge_everything that returned {"success":true}; CF-Cache-Status: DYNAMIC says it is not in the zone cache the purge clears. A clean URL is deterministically 200 while the same URL with any query string is deterministically 404 — so the origin is right and a URL-keyed layer above it is stale. Needs a targeted purge-by-URL or TTL expiry, and the purge step should verify eviction rather than trusting the API's success flag. (b) GitHub Pages is a second, unpruned origin — it publishes the branch verbatim (.nojekyll tracked, build_type: legacy, source main/) and serves those paths 200 directly. Excluding paths there needs either a dedicated pruned publish branch or disabling it; it is the documented warm rollback origin (D-S289.8), so that is a founder-scoped call, not a silent change.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [COHESION] Fix canonical skill-trace/session-floor cache contracts via Ark. The …
Final score: **74**
[S296→NEXT][SIL][PROCESS/P2][CROSS-REPO] Fix canonical skill-trace/session-floor cache contracts via Ark. The trace emitter rejected both documented flag forms despite a valid session, and session-floor could not infer zero items from the current genius cache schema. Ship evidence to studio-ops; do not fork the canonical control plane locally.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 8. [PRODUCT] Re-evaluate RUM anomaly verdict after genuine fresh route coverage re…
Final score: **72**
[S296→NEXT][SIL][OBS/P1][EXTERNAL] Re-evaluate RUM anomaly verdict after genuine fresh route coverage returns. Deferred S299: rum-summary.json totalSamples: 0, production held 0/5. Do not backfill; the state machine grades fresh evidence only when production legitimately recovers.
Why it matters: Instrumentation is complete; closure requires a future source-of-truth observation and must not be fabricated locally.

## Recommended Build Order

1. Post-push CI confirmation
2. Structured receipt on Obelisk link FAILURE. Today a failed link logs …
3. Break the agents.json build cycle. agents.json → proof-surface → stat…
4. Kill the login scan cliff with public.obelisk_identity_link
5. Wave D depth. /proof public in-browser verifier (the transparency app…
6. Served-surface continuity registry. Generalize the S299 anchor+compar…
7. The plan-inheritance fix cannot be proven end-to-end against live dat…
8. Ledger monotonicity tripwire. Persist the last-observed served ledger…
9. worker-route-provenance renders a Cloudflare bot-challenge as a route…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
