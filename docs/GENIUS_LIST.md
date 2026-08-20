# Genius Hit List — Session 324

Generated: 2026-08-20
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **yellow**
- Current SIL: **991/1000**
- CI health: **check gh run list**
- Current focus: Session 324 swept the build-script verification gates as a class and found twelve that no runner in the project ever invoked. A gate nothing asks is indistinguishable from a gate that passed, and three of these twelve had been failing quietly: the public plain-English changelog, the machine-readable map that tells AI agents which page answers which question, and the public statistics surface were all a build behind on the live site, while the headline verification number read three hundred nineteen of three hundred nineteen green every session. All three feeds are current again, and the reason they could go stale is closed: seven scheduled publishers were committing a source feed without re-deriving the page or feed that reads it. Two more gates reported a failure state as a success and now stop the build instead. A new structural check proves every verification gate is reachable from the verification suite, so the next one cannot be born unmeasured. The full suite passes three hundred twenty-seven of three hundred twenty-seven.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [AI] api/ecosystem-velocity.json has no drift gate
Final score: **100**
[S324][SIL][OBS/P2] api/ecosystem-velocity.json has no drift gate — an honest, recorded coverage gap. build-oracle-velocity-public --check is declared @check-mode dry-run: it prints its derived summary and never compares against the committed feed, and cannot, because its source is a moving 60-day git log window that would go red on every new commit rather than on a real defect. It is kept current by npm run build and the 4-hourly cron. <!-- evidence-open: npm run build and the cron are named as the EXISTING mechanisms that keep the feed current — they are why the gap is low-severity, not the deliverable. The deliverable is a window-anchored drift gate that does not exist. --> A real gate would need a window-anchored fingerprint (compare the series for days that are already closed, ignore the moving edge). Not urgent; recorded so it is not mistaken for coverage.
Why it matters: api/ecosystem-velocity.json has no drift gate must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Extend the reachability meta-gate beyond build-*.mjs. check-build-gat…
Final score: **93**
[S324][SIL][GATE/P2] Extend the reachability meta-gate beyond build-*.mjs. check-build-gate-reachability.mjs proves every build-*.mjs --check is reachable from npm run build:check. The same question is unasked of the check-*.mjs, generate-*.mjs, derive-*.mjs, and enrich-*.mjs families — check-orphan-scripts proves a script has *a consumer somewhere*, which is a weaker claim than *this gate runs in the verification suite*. Widen the enumeration; expect the same three-red-gates result. <!-- evidence-open: build:check and check-orphan-scripts are named as the EXISTING baseline this task must exceed. The deliverable is reachability enumeration for the check/generate/derive/enrich families, which does not exist. -->
Why it matters: Extend the reachability meta-gate beyond build-*.mjs. check-build-gate is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
Final score: **84**
[NEXT][SIL][ANALYTICA/P1] Main-domain Cloudflare Web Analytics activation receipt. Unchanged from S318.
Why it matters: Main-domain Cloudflare Web Analytics activation receipt. Unchanged fro is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Claim-evidence relationship map + agent critique packet. Add stable f…
Final score: **78**
[NEXT][SIL][NEWS/AI/P1] Claim-evidence relationship map + agent critique packet. Add stable fact rows and validated factRefs joining factual evidence to stances and visual anchors; publish a per-story public-safe argument map and one-click critique packet with no runtime model spend.
Why it matters: Claim-evidence relationship map + agent critique packet. Add stable fa is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
Final score: **77**
[SIL][OBS/P1] Confirm the Desk surfaces cross their floors on real traffic. S319 observed that data/news-desk-engagement-history.ndjson has never existed, so the engagement path has never produced data end to end and every row correctly reads unavailable. Verify the first scheduled rum-pull run that writes a history row. Do not lower a floor to make the page look alive.
Why it matters: Confirm the Desk surfaces cross their floors on real traffic. S319 obs is a 324-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 3. [REVENUE] Annual Stripe activation once keys exist
Final score: **77**
[OPS] Annual Stripe activation once keys exist — replace the annual placeholder path only after the real Stripe annual plan keys are created.
Why it matters: Annual Stripe activation once keys exist is on the direct checkout path; unblocking it can activate income without building new features.

#### 4. [PRODUCT] Field-vitals freshness closure. Surface observed-through/stale-days, …
Final score: **75**
[NEXT][SIL][OBS/P1] Field-vitals freshness closure. Surface observed-through/stale-days, restore a fresh post-S262 RUM window, and bind cohort verdicts to a release SHA so fresh generatedAt can never imply fresh field evidence.
Why it matters: Field-vitals freshness closure. Surface observed-through/stale-days, r is open, local, and unblocked — can ship this session.

#### 5. [INTELLIGENCE] Extend proof/depth beyond the three core pages
Final score: **75**
[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages — carry the stronger trust language into join/invite or other high-intent public entry routes if the next session stays conversion-focused.
Why it matters: Extend proof/depth beyond the three core pages keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

### LATER

#### 1. [VERIFY] Confirm RUM history begins accruing. /v/rum accepted its first writes…
Final score: **71**
[S319][OBS/P1] Confirm RUM history begins accruing. /v/rum accepted its first writes in production on 2026-08-18 after an extended outage. Verify data/news-desk-engagement-history.ndjson gains its first row, and that Desk floors then cross honestly rather than being lowered.
Why it matters: Confirm RUM history begins accruing. /v/rum accepted its first writes  is a 5-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 2. [PRODUCT] CF Worker automation unblock
Final score: **66**
[OPS] CF Worker automation unblock — add CF_WORKER_API_TOKEN so Worker deploys stop depending on local Wrangler auth.
Why it matters: CF Worker automation unblock is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [PRODUCT] Surfaced, studio-ops-owned (CANON-018): mindframe registry deployedUr…
Final score: **90**
[S323][ADVISORY] Surfaced, studio-ops-owned (CANON-018): mindframe registry deployedUrl drift (local steadfast-determination-production.up.railway.app ≠ canonical usemindframe.com) and franchise-architect portfolio-coherence drift. Resolve upstream, not from here.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 2. [AI] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs…
Final score: **88**
[S319][ECOSYSTEM/P2] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs rescore reports every project fresh, so the stale artifact lives in studio-ops and cannot be written from here (CANON-018). Resolve upstream rather than backdating a timestamp.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 3. [PRODUCT] Founder decision: authorize or decline migration of the GitHub Pages …
Final score: **87**
[S318][ROLLBACK/P0] Founder decision: authorize or decline migration of the GitHub Pages warm rollback origin away from mutable main. D-S303 makes this provider architecture founder-scoped. Unchanged from S318.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [VERIFY] Run the real-provider sign-in ceremony
Final score: **81**
[S321][FOUNDER/P0] Run the real-provider sign-in ceremony — it is now the ONLY thing holding production promotion. node scripts/verify-provider-journey.mjs --live opens a headed Chromium at /login; the founder completes the passkey ceremony (~2 min, the script never sees the credential) and the script then observes all five journey legs itself. The external chain was verified live in S321 and receipted at api/provider-chain-readiness.json (chainReady: true): discovery serves JSON, /login 302s with a full S256 PKCE challenge, JWKS publishes a key, and /auth/revoke answers 401 invalid_client. This is no longer blocked on a sibling repo. Hardware-key enrollment is CANON-019 founder-reserved — do not automate it and do not schedule it unattended (it waits 10 minutes and times out). Do NOT hand-write any providerJourney leg; verify-provider-journey.mjs is their sole writer and that exclusivity is why the receipt is trustworthy.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [PRODUCT] Ship a pattern-share to studio-ops on two launch-ready latent bugs. T…
Final score: **81**
[S323][ARK] Ship a pattern-share to studio-ops on two launch-ready latent bugs. The registry's canonical live-URL field is runtimeUrl, not liveUrl; and case-sensitive vaultStatus === 'SPARKED' comparisons silently disable SPARKED enforcement portfolio-wide. Both are latent in any sibling that copied the launch-ready / compliance pattern.
Why it matters: Owned by another repo or already moved through Ark cargo.

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

1. api/ecosystem-velocity.json has no drift gate
2. Post-push CI confirmation
3. Extend the reachability meta-gate beyond build-*.mjs. check-build-gat…
4. Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
5. Claim-evidence relationship map + agent critique packet. Add stable f…
6. Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
7. Annual Stripe activation once keys exist
8. Field-vitals freshness closure. Surface observed-through/stale-days, …
9. Extend proof/depth beyond the three core pages
10. Confirm RUM history begins accruing. /v/rum accepted its first writes…
11. CF Worker automation unblock

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
