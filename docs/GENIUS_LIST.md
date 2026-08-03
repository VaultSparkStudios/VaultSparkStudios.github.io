# Genius Hit List — Session 303

Generated: 2026-08-03
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **yellow**
- Current SIL: **986/1000**
- CI health: **check gh run list**
- Current focus: S303 ran the full premium audit and executed it end-to-end: 11 of 15 shipped, 3 closed by disproving their premises, 1 founder-gated with a complete escalation dossier. Headlines: the sitewide pre-paint theme boot had NEVER worked (Illegal invocation silently eaten since multi-theme shipped; found by the new CANON-047 84-shot image-test, fixed at the generator, propagated to 113 pages); /status was publishing a false incident from a bot-challenged probe vantage (now classified unverified-before-mismatch via a shared primitive; live re-probe 5/5 matched); /proof is live — visitors re-verify the hash-chained deploy ledger with WebCrypto in their own browser, and agents get the same recipe as an agents.json action; /atlas gained a deterministic server-rendered constellation map. Identity link failures now write privacy-safe receipts with specific member recovery copy (code committed; production Worker deploy is the pending founder step).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pr…
Final score: **96**
[S303][SIL][UX/P2] Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pre-SPARKED step (auto-capture + review of flagged pairs).
Why it matters: Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pre is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] context-meter.mjs publishes a false green. It reported "1.5% used · C…
Final score: **90**
[S302→NEXT][OBS/P2] context-meter.mjs publishes a false green. It reported "1.5% used · CONTINUE" for the entire session while the live conversation was near exhaustion, because it measures a heuristic fresh-session bootstrap cost rather than the session it claims to gauge. Same class as CANON-036's deploy-currency probe verifying a *declaration* instead of the condition. Either measure the real thing or rename what it reports.
Why it matters: context-meter.mjs publishes a false green. It reported "1.5% used · CO is open, local, and unblocked — can ship this session.

#### 4. [COHESION] Structured receipt on Obelisk link FAILURE. Today a failed link logs …
Final score: **86**
[S301→NEXT][OBS/P2] Structured receipt on Obelisk link FAILURE. Today a failed link logs a code and redirects to ?auth_error=bridge_failed; the member sees a generic failure and we learn nothing. A privacy-safe failure receipt (code, plane, no identifiers) makes first-login problems diagnosable at the moment they matter most — when the first real people arrive.
Why it matters: Structured receipt on Obelisk link FAILURE. Today a failed link logs a is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

### NEXT

#### 1. [PRODUCT] /proof verification permalink + footer badge
Final score: **81**
[S303][SIL][DEPTH/P2] /proof verification permalink + footer badge — shareable ?verified=<head> link and a small independently-verifiable badge linking to /proof.
Why it matters: /proof verification permalink + footer badge is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Wave D depth. /proof public in-browser verifier (the transparency app…
Final score: **75**
[S300][AGENT/P2] Wave D depth. /proof public in-browser verifier (the transparency apparatus is this project's most under-exploited asset); feedback→changelog provenance trace; progression next-action spine; agent capability manifest. See docs/AUDIT_2026-07-31.md.
Why it matters: Wave D depth. /proof public in-browser verifier (the transparency appa is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Kill the login scan cliff with public.obelisk_identity_link
Final score: **72**
[S301→NEXT][SEC/P1] Kill the login scan cliff with public.obelisk_identity_link — the auth-schema route is closed (D-S301.10). Founder approved the auth-flow change; implementation disproved the plan and it was reverted rather than shipped half-safe. Two hard findings: (1) a unique index on auth.users is impossible — Supabase returns 42501: must be owner of table users; (2) the email filter fast path is not safe alone, because taking it skips the pre-write subject scan, so a duplicate would be caught only after the metadata write — an existing unit test caught the degradation from identity_subject_duplicate to a generic error. Correct design: a link table in our own schema (obelisk_sub PK, user_id unique), inserted *before* the app_metadata write so an interruption leaves a self-healing orphan link row rather than an orphan metadata write. It supplies the uniqueness auth denies us AND an indexed subject lookup, killing both full table walks instead of one. Live facts to build on: GoTrue filter genuinely narrows (exact email → 1 of 252) but is case-sensitive, so a miss must fall back; 0 mixed-case emails and 0 case-collision groups today, which is the invariant the filter's completeness rests on. <!-- evidence-open: the deliverable is public.obelisk_identity_link plus the worker rewiring, neither of which exists. The files this item names are the affected context. -->
Why it matters: Kill the login scan cliff with public.obelisk_identity_link is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Served-surface continuity registry. Generalize the S299 anchor+compar…
Final score: **72**
[S299→NEXT][SIL][OBS/P2] Served-surface continuity registry. Generalize the S299 anchor+compare pattern from {receipt, ledger} to the whole candidate CORE_PATHS served set in one bounded checker (build-sha, worker-route-provenance, public-intelligence, shell assets).
Why it matters: Served-surface continuity registry. Generalize the S299 anchor+compare is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] Ledger monotonicity tripwire. Persist the last-observed served ledger…
Final score: **69**
[S299→NEXT][SIL][OBS/P2] Ledger monotonicity tripwire. Persist the last-observed served ledger depth and alarm on any decrease between observations (silent staging rollback/truncation); append-only, semantic-change gated.
Why it matters: Ledger monotonicity tripwire. Persist the last-observed served ledger  is open, local, and unblocked — can ship this session.

### LATER

#### 1. [VERIFY] The plan-inheritance fix cannot be proven end-to-end against live dat…
Final score: **68**
[S301→NEXT][IDENTITY/P2] The plan-inheritance fix cannot be proven end-to-end against live data. The only required_plan='vault_sparked' row needs rank 3; the only active Eternal subscriber holds rank 2 (1,065 points). The receipt therefore reports coverage: "partial" and names eternal-plan-unlocked as unobserved. Re-run verify-supabase-runtime.mjs --verify --write-evidence when any Eternal member reaches rank 3, or when a gated row lands at a rank an Eternal member already holds — the verdict will upgrade itself from live evidence.
Why it matters: The plan-inheritance fix cannot be proven end-to-end against live data is a 303-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 2. [VERIFY] worker-route-provenance renders a Cloudflare bot-challenge as a route…
Final score: **65**
[S301→NEXT][OBS/P0] worker-route-provenance renders a Cloudflare bot-challenge as a route mismatch — it is publishing a false incident right now. Found during S301 closeout, verified against both the committed artifact and live probes; deliberately not started because it feeds five consumers (build-release-proof, build-status-proof, build-security-posture, build-worker-route-history, check-uptime-contract) plus status/index.html, and a half-landed cascade at the end of a session is worse than a recorded finding. Evidence: api/worker-route-provenance.json (generated 2026-08-01T01:36:45Z) reads state: "mismatch", matched: 0/5, with every route showing observedStatus: 403 and observedContentType: "text/html; charset=UTF-8" — the signature of a CF interstitial, not a route failure. Direct probes ~2h later returned /api/auth/me 200 JSON and /login 302 to obeliskgate.com with valid PKCE. grep -n "challenge\|403\|text/html" scripts/build-worker-route-provenance.mjs returns nothing — the builder has no challenge detection at all. This is D-S300.1 ("a challenged vantage must not render as a measurement") applied to a surface that never received the fix, and it is worse here because the history ledger converts the false reading into a *duration*. Fix: reuse the isChallenged({status, contentType}) primitive already written and self-tested in scripts/verify-obelisk-edge-deployment.mjs — a 403/503 HTML body where JSON or a redirect was due is challenged → unverified, never mismatch. Then confirm build-worker-route-history does not accrue incident duration from challenged observations. <!-- evidence-open: the files this item names (status/index.html, the five consumer scripts, the isChallenged primitive) are the affected CONTEXT, not the deliverable. The deliverable is challenge detection inside build-worker-route-provenance.mjs, which does not exist — grep -n "challenge\|403\|text/html" on that file returns nothing. -->
Why it matters: worker-route-provenance renders a Cloudflare bot-challenge as a route  is a 303-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### DEFERRED / GATED

#### 1. [BRAND] The genius-list rationale generator false-positives on the word "navi…
Final score: **90**
[S302→NEXT][OBS/P2] The genius-list rationale generator false-positives on the word "navigation". It classified a JS error-handling fix as "affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes" purely because the description contained the View Transitions *navigation* API. The gate that consumes it is correct and caught the leak honestly — the defect is the heuristic upstream, which treats a technical term as a copy-change signal. Reworded the description to unblock; the heuristic still needs narrowing so it does not quietly gate real agent work.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [PRODUCT] Sign off public.obelisk_identity_link. Full design/rollback/blast-rad…
Final score: **88**
[S303→NEXT][SEC/P1][FOUNDER] Sign off public.obelisk_identity_link. Full design/rollback/blast-radius in docs/ESCALATION_OBELISK_LINK_TABLE.md (D-S301.10). On approval it is one agent session.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [BRAND] Schedule check-obelisk-link-readiness.mjs. The gauge is built and gre…
Final score: **87**
[S301→NEXT][OBS/P2][FOUNDER-PRECONDITION] Schedule check-obelisk-link-readiness.mjs. The gauge is built and green but runs only on demand, because it needs SUPABASE_ACCESS_TOKEN and the studio-ops secrets gateway does not exist on a GitHub runner. Add it as a repository Actions secret and the gauge can run daily — watching duplicate emails, duplicate subjects, mixed-case emails, and scan headroom. Adding the cron *first* would publish a permanently unavailable signal, which is the producer-never-built antipattern; the precondition comes first.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [SECURITY] Login pages every user on every callback. scanSupabaseUsers walks /au…
Final score: **82**
[S301→NEXT][SEC/P2][FOUNDER] Login pages every user on every callback. scanSupabaseUsers walks /auth/v1/admin/users 100 at a time, up to 20 pages, per sign-in — 3 requests today, and at 2,000 accounts it throws supabase_user_scan_limit and every login fails. Fails closed, so a capacity cliff at ~8× current scale, not a security hole. Headroom instrumented (1,748 accounts) by check-obelisk-link-readiness.mjs. Fix designed — an indexed security definer lookup, additive with fallback to the existing scan — and deliberately not applied: it touches the authentication flow, which AGENTS.md puts behind founder escalation.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [PRODUCT] Decide whether to dispatch confirm_content. Lane built, 52/52, dry-ru…
Final score: **78**
[S300][FOUNDER/P0][HUMAN] Decide whether to dispatch confirm_content. Lane built, 52/52, dry-run 211 promotable / 321 withheld against the real backlog. Ends a 413-commit / 7.1-day staleness without releasing the identity hold. Deliberately not dispatched.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [COHESION] Fix canonical skill-trace/session-floor cache contracts via Ark. Defe…
Final score: **74**
[S296→NEXT][SIL][PROCESS/P2][CROSS-REPO] Fix canonical skill-trace/session-floor cache contracts via Ark. Deferred S299: skill-trace.mjs is not present in this repo's reach (control-plane-owned); 12 repo-question evidence cargo already outstanding. Do not fork the control plane locally.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 7. [VERIFY] real-provider-e2e is blocked on Obelisk, not on a founder sign-in. Th…
Final score: **71**
[S302→NEXT][IDENTITY/P0][EXTERNAL] real-provider-e2e is blocked on Obelisk, not on a founder sign-in. The journey's revocation leg cannot honestly pass while the provider has no revocation path. The previously-published "one sign-in closes the last blocker" is corrected (D-S302.5). Unblocks when Obelisk ships /auth/revoke — our side then works unchanged. The sign-in is still worth doing early: it is the only thing that proves our client registration against a real credential, which remains unproven. <!-- evidence-open: the deliverable is a provider-side route we do not own; our half is shipped. -->
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [VERIFY] One real Obelisk login to close real-provider-e2e. Everything automat…
Final score: **71**
[S300→NEXT][IDENTITY/P0][HUMAN] One real Obelisk login to close real-provider-e2e. Everything automatable is verified; the remaining proof needs actual credentials at obeliskgate.com. Note the honest limit found in preflight: Obelisk's authorize endpoint issues a signin redirect for a bogus client_id too (project=not-a-real-client), so it does not validate the client at that step — our client registration is therefore *unproven* until a real token exchange succeeds. Sign in once at https://vaultsparkstudios.com/login, then the callback/session/role/revocation ceremony can be recorded and the promotion interlock's identity blockers can start clearing legitimately.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Wire capture-theme-matrix.mjs into /app-release-gate as a blocking pr…
2. Post-push CI confirmation
3. context-meter.mjs publishes a false green. It reported "1.5% used · C…
4. Structured receipt on Obelisk link FAILURE. Today a failed link logs …
5. /proof verification permalink + footer badge
6. Wave D depth. /proof public in-browser verifier (the transparency app…
7. Kill the login scan cliff with public.obelisk_identity_link
8. Served-surface continuity registry. Generalize the S299 anchor+compar…
9. Ledger monotonicity tripwire. Persist the last-observed served ledger…
10. The plan-inheritance fix cannot be proven end-to-end against live dat…
11. worker-route-provenance renders a Cloudflare bot-challenge as a route…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
