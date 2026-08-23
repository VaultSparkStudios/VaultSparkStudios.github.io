# Genius Hit List — Session 326

Generated: 2026-08-23
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **80/100**
- Health: **yellow**
- Current SIL: **998/1000**
- CI health: **check gh run list**
- Current focus: Session 326 completed The Desk recovery in production. Two August 21 editions and one August 22 edition are live after the August 11 gap; every article shows estimated read time and privacy-thresholded Reader views, with thin traffic honestly reading Collecting. Independent live verification also found and fixed a secondary release-partition defect: the canonical NDJSON claim ledger was current in Git but withheld from the content lane. That one public path is now exact-allowlisted while arbitrary NDJSON remains blocked. Build/check is 368 of 368; exact E2E, compliance, mobile, accessibility, and local/staging Lighthouse are green; staging and production both serve the August 22 claims.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Add the canonical claim ledger to the deployment workflow's exact liv…
Final score: **96**
[S326][SIL][NEWS/P1] Add the canonical claim ledger to the deployment workflow's exact live News verifier. Assert the latest edition date and expected fact/stance rows after purge so a future path-classification or overlay regression fails the deployment itself; retain the exact-path allowlist and never widen NDJSON by extension.
Why it matters: Add the canonical claim ledger to the deployment workflow's exact live is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Extend staging content verification to the newest edition and claims …
Final score: **93**
[S326][SIL][NEWS/P2] Extend staging content verification to the newest edition and claims row. deploy-staging-content.mjs still probes two historical August 7 stories plus the JSON feed. Derive the newest route from the feed and require its claim-ledger date, without wall-clock fixtures or private inputs.
Why it matters: Extend staging content verification to the newest edition and claims r is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Prove the first privacy-thresholded article measurements from the rep…
Final score: **92**
[S325][SIL][NEWS/P1] Prove the first privacy-thresholded article measurements from the repaired publisher. Wait for at least five real browser pageloads on a Desk article, then verify Reader views and measured engaged time replace the honest “Collecting” state without changing the privacy floor or counting UX events as views. Record the first qualifying source window in the engagement receipt.
Why it matters: Prove the first privacy-thresholded article measurements from the repa shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

### NEXT

#### 1. [PRODUCT] Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
Final score: **81**
[NEXT][SIL][ANALYTICA/P1] Main-domain Cloudflare Web Analytics activation receipt. Unchanged from S318.
Why it matters: Main-domain Cloudflare Web Analytics activation receipt. Unchanged fro is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Claim-evidence relationship map + agent critique packet. Add stable f…
Final score: **75**
[NEXT][SIL][NEWS/AI/P1] Claim-evidence relationship map + agent critique packet. Add stable fact rows and validated factRefs joining factual evidence to stances and visual anchors; publish a per-story public-safe argument map and one-click critique packet with no runtime model spend.
Why it matters: Claim-evidence relationship map + agent critique packet. Add stable fa is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
Final score: **74**
[SIL][OBS/P1] Confirm the Desk surfaces cross their floors on real traffic. S319 observed that data/news-desk-engagement-history.ndjson has never existed, so the engagement path has never produced data end to end and every row correctly reads unavailable. Verify the first scheduled rum-pull run that writes a history row. Do not lower a floor to make the page look alive.
Why it matters: Confirm the Desk surfaces cross their floors on real traffic. S319 obs is a 326-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 4. [REVENUE] Annual Stripe activation once keys exist
Final score: **74**
[OPS] Annual Stripe activation once keys exist — replace the annual placeholder path only after the real Stripe annual plan keys are created.
Why it matters: Annual Stripe activation once keys exist is on the direct checkout path; unblocking it can activate income without building new features.

#### 5. [PRODUCT] Field-vitals freshness closure. Surface observed-through/stale-days, …
Final score: **72**
[NEXT][SIL][OBS/P1] Field-vitals freshness closure. Surface observed-through/stale-days, restore a fresh post-S262 RUM window, and bind cohort verdicts to a release SHA so fresh generatedAt can never imply fresh field evidence.
Why it matters: Field-vitals freshness closure. Surface observed-through/stale-days, r is open, local, and unblocked — can ship this session.

### LATER

#### 1. [INTELLIGENCE] Extend proof/depth beyond the three core pages
Final score: **72**
[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages — carry the stronger trust language into join/invite or other high-intent public entry routes if the next session stays conversion-focused.
Why it matters: Extend proof/depth beyond the three core pages keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 2. [VERIFY] Confirm RUM history begins accruing. /v/rum accepted its first writes…
Final score: **68**
[S319][OBS/P1] Confirm RUM history begins accruing. /v/rum accepted its first writes in production on 2026-08-18 after an extended outage. Verify data/news-desk-engagement-history.ndjson gains its first row, and that Desk floors then cross honestly rather than being lowered.
Why it matters: Confirm RUM history begins accruing. /v/rum accepted its first writes  is a 7-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 3. [PRODUCT] CF Worker automation unblock
Final score: **63**
[OPS] CF Worker automation unblock — add CF_WORKER_API_TOKEN so Worker deploys stop depending on local Wrangler auth.
Why it matters: CF Worker automation unblock is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [PRODUCT] Publish a bounded newsroom-run receipt on /status/. Surface the last …
Final score: **96**
[S325][SIL][NEWS/P2] Publish a bounded newsroom-run receipt on /status/. Surface the last scheduled Desk run, its last successful stage (scan → author → art → promote → rebuild), the latest real edition date, and the next expected run. It must abstain on missing workflow evidence and must not expose prompts, provider payloads, or internal source text.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 2. [PRODUCT] Surfaced, studio-ops-owned (CANON-018): mindframe registry deployedUr…
Final score: **87**
[S323][ADVISORY] Surfaced, studio-ops-owned (CANON-018): mindframe registry deployedUrl drift (local steadfast-determination-production.up.railway.app ≠ canonical usemindframe.com) and franchise-architect portfolio-coherence drift. Resolve upstream, not from here.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 3. [AI] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs…
Final score: **85**
[S319][ECOSYSTEM/P2] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs rescore reports every project fresh, so the stale artifact lives in studio-ops and cannot be written from here (CANON-018). Resolve upstream rather than backdating a timestamp.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 4. [PRODUCT] Founder decision: authorize or decline migration of the GitHub Pages …
Final score: **84**
[S318][ROLLBACK/P0] Founder decision: authorize or decline migration of the GitHub Pages warm rollback origin away from mutable main. D-S303 makes this provider architecture founder-scoped. Unchanged from S318.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [PRODUCT] Ship a pattern-share to studio-ops on two launch-ready latent bugs. T…
Final score: **78**
[S323][ARK] Ship a pattern-share to studio-ops on two launch-ready latent bugs. The registry's canonical live-URL field is runtimeUrl, not liveUrl; and case-sensitive vaultStatus === 'SPARKED' comparisons silently disable SPARKED enforcement portfolio-wide. Both are latent in any sibling that copied the launch-ready / compliance pattern.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 6. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **78**
[HUMAN][CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [SECURITY] TT-ENFORCE-REPROBE
Final score: **78**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 8. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **75**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Add the canonical claim ledger to the deployment workflow's exact liv…
2. Post-push CI confirmation
3. Extend staging content verification to the newest edition and claims …
4. Prove the first privacy-thresholded article measurements from the rep…
5. Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
6. Claim-evidence relationship map + agent critique packet. Add stable f…
7. Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
8. Annual Stripe activation once keys exist
9. Field-vitals freshness closure. Surface observed-through/stale-days, …
10. Extend proof/depth beyond the three core pages
11. Confirm RUM history begins accruing. /v/rum accepted its first writes…
12. CF Worker automation unblock

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
