# Genius Hit List — Session 320

Generated: 2026-08-18
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **80/100**
- Health: **yellow**
- Current SIL: **981/1000**
- CI health: **check gh run list**
- Current focus: S320 promoted the static content lane to production after 13.8 days: 259 content-pure paths, including the homepage Desk module, are live (contentLaneHead 60ed3748c). deploy-currency moved from a hard FAIL to content-current and doctor blocking failures went 1 to 0. The Worker also shipped, and three observability gates that had been reading green on nothing were repaired first: /v/rum was probed only with an OPTIONS preflight that stayed 204 throughout a POST-500 outage, /login was never probed at all, and check-writeback-currency returned an unmeasurable window as a pass.

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

#### 2. [PRODUCT] Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
Final score: **90**
[NEXT][SIL][ANALYTICA/P1] Main-domain Cloudflare Web Analytics activation receipt. Unchanged from S318.
Why it matters: Main-domain Cloudflare Web Analytics activation receipt. Unchanged fro is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Confirm RUM history begins accruing. /v/rum accepted its first writes…
Final score: **89**
[S319][OBS/P1] Confirm RUM history begins accruing. /v/rum accepted its first writes in production on 2026-08-18 after an extended outage. Verify data/news-desk-engagement-history.ndjson gains its first row, and that Desk floors then cross honestly rather than being lowered.
Why it matters: Confirm RUM history begins accruing. /v/rum accepted its first writes  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 4. [VERIFY] Give route-provenance a vantage CI can actually use. Content promotio…
Final score: **88**
[S320][RELEASE/P0] Give route-provenance a vantage CI can actually use. Content promotion currently depends on a probe run from an unchallenged vantage: the S317 split-release guard requires live evidence for /v/rum, /v/desk-reaction and /v/desk-presence, and CI is bot-challenged at the production origin so it cannot produce it. Probe the unchallenged pages.dev origin as a corroborating second vantage. Until this lands, a human-timed step is load-bearing on the release path that most needs to be routine. Do not weaken the guard — it was correct to refuse.
Why it matters: Give route-provenance a vantage CI can actually use. Content promotion shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [VERIFY] Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
Final score: **83**
[SIL][OBS/P1] Confirm the Desk surfaces cross their floors on real traffic. S319 observed that data/news-desk-engagement-history.ndjson has never existed, so the engagement path has never produced data end to end and every row correctly reads unavailable. Verify the first scheduled rum-pull run that writes a history row. Do not lower a floor to make the page look alive.
Why it matters: Confirm the Desk surfaces cross their floors on real traffic. S319 obs is a 320-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 2. [VERIFY] Confirm sign-in recovers at the 00:00 UTC KV reset. /login returns a …
Final score: **82**
[S320][VERIFY/P1] Confirm sign-in recovers at the 00:00 UTC KV reset. /login returns a named 503 auth_store_unavailable; the crash is fixed and the beacon samples its counter, so recurrence is prevented. Verify the 503 clears rather than assuming it.
Why it matters: Confirm sign-in recovers at the 00:00 UTC KV reset. /login returns a n shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 3. [PRODUCT] Claim-evidence relationship map + agent critique packet. Add stable f…
Final score: **75**
[NEXT][SIL][NEWS/AI/P1] Claim-evidence relationship map + agent critique packet. Add stable fact rows and validated factRefs joining factual evidence to stances and visual anchors; publish a per-story public-safe argument map and one-click critique packet with no runtime model spend.
Why it matters: Claim-evidence relationship map + agent critique packet. Add stable fa is open, local, and unblocked — can ship this session.

#### 4. [COHESION] Promote contractLive to a hard assertion in the /v/rum ingest probe. …
Final score: **74**
[S320][SIL][OBS/P1] Promote contractLive to a hard assertion in the /v/rum ingest probe. It was left informational so the probe would not page during the Worker's rollout window (D-S320.4). The synthetic no-write contract is now deployed and verified live ({"ok":true,"synthetic":true}), so the tolerance is no longer needed and its absence should fail.
Why it matters: Promote contractLive to a hard assertion in the /v/rum ingest probe. I is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 5. [REVENUE] Annual Stripe activation once keys exist
Final score: **74**
[OPS] Annual Stripe activation once keys exist — replace the annual placeholder path only after the real Stripe annual plan keys are created.
Why it matters: Annual Stripe activation once keys exist is on the direct checkout path; unblocking it can activate income without building new features.

### LATER

#### 1. [PRODUCT] Field-vitals freshness closure. Surface observed-through/stale-days, …
Final score: **72**
[NEXT][SIL][OBS/P1] Field-vitals freshness closure. Surface observed-through/stale-days, restore a fresh post-S262 RUM window, and bind cohort verdicts to a release SHA so fresh generatedAt can never imply fresh field evidence.
Why it matters: Field-vitals freshness closure. Surface observed-through/stale-days, r is open, local, and unblocked — can ship this session.

#### 2. [INTELLIGENCE] Extend proof/depth beyond the three core pages
Final score: **72**
[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages — carry the stronger trust language into join/invite or other high-intent public entry routes if the next session stays conversion-focused.
Why it matters: Extend proof/depth beyond the three core pages keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [PRODUCT] CF Worker automation unblock
Final score: **63**
[OPS] CF Worker automation unblock — add CF_WORKER_API_TOKEN so Worker deploys stop depending on local Wrangler auth.
Why it matters: CF Worker automation unblock is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [AI] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs…
Final score: **97**
[S319][ECOSYSTEM/P2] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs rescore reports every project fresh, so the stale artifact lives in studio-ops and cannot be written from here (CANON-018). Resolve upstream rather than backdating a timestamp.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 2. [PRODUCT] Founder decision: authorize or decline migration of the GitHub Pages …
Final score: **96**
[S318][ROLLBACK/P0] Founder decision: authorize or decline migration of the GitHub Pages warm rollback origin away from mutable main. D-S303 makes this provider architecture founder-scoped. Unchanged from S318.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **90**
[HUMAN][CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [SECURITY] TT-ENFORCE-REPROBE
Final score: **90**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 5. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **87**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **66**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [SECURITY] Cloudflare WAF rule (CN/RU/HK)
Final score: **66**
Cloudflare WAF rule (CN/RU/HK) — JS Challenge firewall rule; requires API token with Zone / Firewall Services / Edit + Zone / Zone / Read; or Studio Owner can create in dashboard [human action / provide token]
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 8. [VERIFY] NAV-SHEET DEVICE VERIFY. assets/vaultsparked-proof.js was already del…
Final score: **65**
[S180][FOUNDER/DEVICE] NAV-SHEET DEVICE VERIFY. assets/vaultsparked-proof.js was already deleted and verified in S186; the only remaining action is the real founder-device nav-sheet behavior check required by SOUL #3. No deletion work remains.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Post-push CI confirmation
2. Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
3. Confirm RUM history begins accruing. /v/rum accepted its first writes…
4. Give route-provenance a vantage CI can actually use. Content promotio…
5. Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
6. Confirm sign-in recovers at the 00:00 UTC KV reset. /login returns a …
7. Claim-evidence relationship map + agent critique packet. Add stable f…
8. Promote contractLive to a hard assertion in the /v/rum ingest probe. …
9. Annual Stripe activation once keys exist
10. Field-vitals freshness closure. Surface observed-through/stale-days, …
11. Extend proof/depth beyond the three core pages
12. CF Worker automation unblock

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
