# Genius Hit List — Session 319

Generated: 2026-08-18
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **79/100**
- Health: **yellow**
- Current SIL: **972/1000**
- CI health: **check gh run list**
- Current focus: S319 repaired a live production outage: a KV write-quota exhaustion caused by the /v/rum beacon writing a rate-limit counter on every request took down telemetry ingestion AND sign-in via unhandled Worker exceptions. The Worker is deployed and verified (/v/rum 500 to 202, /login 500 to a named 503). It also made the release candidate reproducible, gave the production hold a blast radius across both authority and evidence, and put The Desk on a schedule and on the homepage.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Add live /login AND /v/rum synthetic probes to the uptime cron. Both …
Final score: **96**
[S319][OBS/P0] Add live /login AND /v/rum synthetic probes to the uptime cron. Both returned HTTP 500 in production and every trust surface still read healthy, because the probe exercises neither the auth entry point nor the telemetry beacon. /v/rum had been down long enough that data/news-desk-engagement-history.ndjson never existed at all. Assert expected STATUS, not merely reachability. (Original item text: add a live /login synthetic probe to the uptime cron. Production sign-in returned HTTP 500 long enough that it was found incidentally while deploying. The uptime probe watches liveness and route provenance but never exercised the auth entry point, so a dead conversion path was invisible to every trust surface.
Why it matters: Add live /login AND /v/rum synthetic probes to the uptime cron. Both r is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Publish a real deploy-currency observation on a schedule. The probe o…
Final score: **93**
[S319][OBS/P1] Publish a real deploy-currency observation on a schedule. The probe only forms quorum when the Cloudflare Pages vantage has credentials; that env wiring is now in place, but the Publish uptime status step short-circuits on "no commit-worthy change", so a healthy hour skips the probe entirely and the committed reading can age silently.
Why it matters: Publish a real deploy-currency observation on a schedule. The probe on is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
Final score: **84**
[NEXT][SIL][ANALYTICA/P1] Main-domain Cloudflare Web Analytics activation receipt. Unchanged from S318.
Why it matters: Main-domain Cloudflare Web Analytics activation receipt. Unchanged fro is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] Confirm RUM history begins accruing. /v/rum accepted its first writes…
Final score: **82**
[S319][OBS/P1] Confirm RUM history begins accruing. /v/rum accepted its first writes in production on 2026-08-18 after an extended outage. Verify data/news-desk-engagement-history.ndjson gains its first row, and that Desk floors then cross honestly rather than being lowered.
Why it matters: Confirm RUM history begins accruing. /v/rum accepted its first writes  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check`

#### 2. [VERIFY] Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
Final score: **77**
[SIL][OBS/P1] Confirm the Desk surfaces cross their floors on real traffic. S319 observed that data/news-desk-engagement-history.ndjson has never existed, so the engagement path has never produced data end to end and every row correctly reads unavailable. Verify the first scheduled rum-pull run that writes a history row. Do not lower a floor to make the page look alive.
Why it matters: Confirm the Desk surfaces cross their floors on real traffic. S319 obs is a 319-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 3. [PRODUCT] Claim-evidence relationship map + agent critique packet. Add stable f…
Final score: **75**
[NEXT][SIL][NEWS/AI/P1] Claim-evidence relationship map + agent critique packet. Add stable fact rows and validated factRefs joining factual evidence to stances and visual anchors; publish a per-story public-safe argument map and one-click critique packet with no runtime model spend.
Why it matters: Claim-evidence relationship map + agent critique packet. Add stable fa is open, local, and unblocked — can ship this session.

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

#### 2. [PRODUCT] Promote the static content lane. The Worker lane carried the outage f…
Final score: **69**
[S319][RELEASE/P1] Promote the static content lane. The Worker lane carried the outage fix, but production markup still serves baseline 9527f227 — so the homepage Desk module and 700+ commits of content are not yet live. The ceremony now reaches 8/8 with scoped evidence, so this is unblocked.
Why it matters: Promote the static content lane. The Worker lane carried the outage fi is open, local, and unblocked — can ship this session.

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

1. Add live /login AND /v/rum synthetic probes to the uptime cron. Both …
2. Post-push CI confirmation
3. Publish a real deploy-currency observation on a schedule. The probe o…
4. Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
5. Confirm RUM history begins accruing. /v/rum accepted its first writes…
6. Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
7. Claim-evidence relationship map + agent critique packet. Add stable f…
8. Annual Stripe activation once keys exist
9. Field-vitals freshness closure. Surface observed-through/stale-days, …
10. Extend proof/depth beyond the three core pages
11. Promote the static content lane. The Worker lane carried the outage f…
12. CF Worker automation unblock

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
