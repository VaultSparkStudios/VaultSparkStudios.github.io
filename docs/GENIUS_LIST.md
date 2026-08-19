# Genius Hit List — Session 321

Generated: 2026-08-19
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **82/100**
- Health: **yellow**
- Current SIL: **983/1000**
- CI health: **check gh run list**
- Current focus: Session 321 re-probed the three identity claims inherited from session 320 and all three had stopped being true: sign-in now answers with a real redirect to the provider, the provider's OpenID discovery document serves valid JSON, and its token-revocation route is implemented. The whole external identity chain is live, so the promotion hold that stood for twenty sessions is no longer waiting on another team. The session also closed the crash class that took sign-in down twice: the earlier repair covered only the entry leg, leaving the callback and sign-out legs able to fail the same way, and the edge had no last-resort handler, so any unhandled fault became a blank error page.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [SECURITY] Wire the staging workers_dev binding as the route-provenance corrobor…
Final score: **100**
[S321][SIL][RELEASE/P1] Wire the staging workers_dev binding as the route-provenance corroborating vantage. Replaces the disproven pages.dev item below. Measured in S321: https://vaultspark-security-headers-staging.founder-d73.workers.dev serves the full Worker route contract (/_health 200 JSON, /login 302 + PKCE, POST /v/rum 202, /api/auth/me 200) and is not behind the zone's bot management. It attests the build, not the production route binding — label the two distinctly rather than letting one stand in for the other. Do not weaken the split-release guard.
Why it matters: Wire the staging workers_dev binding as the route-provenance corrobora lowers operational risk and is entirely local — no external dependencies block it.

First command: `node scripts/lint-repo.mjs`

#### 2. [INTELLIGENCE] Audit the remaining gate names against what they actually assert. Two…
Final score: **96**
[S321][SIL][GATE/P1] Audit the remaining gate names against what they actually assert. Two instruments in S321 measured something other than their name and had been trusted for months on the strength of the name alone: check-public-note-freshness asserted only voice regexes for fifteen sessions, and the ceremony's staging browser gate reported a 30s timeout as a readability failure on a healthy site. Sweep the gate inventory for the same shape — a name that promises a property the body never measures reads exactly like a passing gate.
Why it matters: Audit the remaining gate names against what they actually assert. Two  keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 3. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 4. [PRODUCT] Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
Final score: **84**
[NEXT][SIL][ANALYTICA/P1] Main-domain Cloudflare Web Analytics activation receipt. Unchanged from S318.
Why it matters: Main-domain Cloudflare Web Analytics activation receipt. Unchanged fro is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [VERIFY] Confirm RUM history begins accruing. /v/rum accepted its first writes…
Final score: **78**
[S319][OBS/P1] Confirm RUM history begins accruing. /v/rum accepted its first writes in production on 2026-08-18 after an extended outage. Verify data/news-desk-engagement-history.ndjson gains its first row, and that Desk floors then cross honestly rather than being lowered.
Why it matters: Confirm RUM history begins accruing. /v/rum accepted its first writes  was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`

#### 2. [PRODUCT] Claim-evidence relationship map + agent critique packet. Add stable f…
Final score: **78**
[NEXT][SIL][NEWS/AI/P1] Claim-evidence relationship map + agent critique packet. Add stable fact rows and validated factRefs joining factual evidence to stances and visual anchors; publish a per-story public-safe argument map and one-click critique packet with no runtime model spend.
Why it matters: Claim-evidence relationship map + agent critique packet. Add stable fa is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
Final score: **77**
[SIL][OBS/P1] Confirm the Desk surfaces cross their floors on real traffic. S319 observed that data/news-desk-engagement-history.ndjson has never existed, so the engagement path has never produced data end to end and every row correctly reads unavailable. Verify the first scheduled rum-pull run that writes a history row. Do not lower a floor to make the page look alive.
Why it matters: Confirm the Desk surfaces cross their floors on real traffic. S319 obs is a 321-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`

#### 4. [REVENUE] Annual Stripe activation once keys exist
Final score: **77**
[OPS] Annual Stripe activation once keys exist — replace the annual placeholder path only after the real Stripe annual plan keys are created.
Why it matters: Annual Stripe activation once keys exist is on the direct checkout path; unblocking it can activate income without building new features.

#### 5. [PRODUCT] Field-vitals freshness closure. Surface observed-through/stale-days, …
Final score: **75**
[NEXT][SIL][OBS/P1] Field-vitals freshness closure. Surface observed-through/stale-days, restore a fresh post-S262 RUM window, and bind cohort verdicts to a release SHA so fresh generatedAt can never imply fresh field evidence.
Why it matters: Field-vitals freshness closure. Surface observed-through/stale-days, r is open, local, and unblocked — can ship this session.

### LATER

#### 1. [INTELLIGENCE] Extend proof/depth beyond the three core pages
Final score: **75**
[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages — carry the stronger trust language into join/invite or other high-intent public entry routes if the next session stays conversion-focused.
Why it matters: Extend proof/depth beyond the three core pages keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`

#### 2. [PRODUCT] CF Worker automation unblock
Final score: **66**
[OPS] CF Worker automation unblock — add CF_WORKER_API_TOKEN so Worker deploys stop depending on local Wrangler auth.
Why it matters: CF Worker automation unblock is open, local, and unblocked — can ship this session.

### DEFERRED / GATED

#### 1. [AI] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs…
Final score: **94**
[S319][ECOSYSTEM/P2] IGNIS freshness is portfolio-owned. Reads 15 days stale while ops.mjs rescore reports every project fresh, so the stale artifact lives in studio-ops and cannot be written from here (CANON-018). Resolve upstream rather than backdating a timestamp.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 2. [PRODUCT] Founder decision: authorize or decline migration of the GitHub Pages …
Final score: **93**
[S318][ROLLBACK/P0] Founder decision: authorize or decline migration of the GitHub Pages warm rollback origin away from mutable main. D-S303 makes this provider architecture founder-scoped. Unchanged from S318.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [VERIFY] Run the real-provider sign-in ceremony
Final score: **88**
[S321][FOUNDER/P0] Run the real-provider sign-in ceremony — it is now the ONLY thing holding production promotion. node scripts/verify-provider-journey.mjs --live opens a headed Chromium at /login; the founder completes the passkey ceremony (~2 min, the script never sees the credential) and the script then observes all five journey legs itself. The external chain was verified live in S321 and receipted at api/provider-chain-readiness.json (chainReady: true): discovery serves JSON, /login 302s with a full S256 PKCE challenge, JWKS publishes a key, and /auth/revoke answers 401 invalid_client. This is no longer blocked on a sibling repo. Hardware-key enrollment is CANON-019 founder-reserved — do not automate it and do not schedule it unattended (it waits 10 minutes and times out). Do NOT hand-write any providerJourney leg; verify-provider-journey.mjs is their sole writer and that exclusivity is why the receipt is trustworthy.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **87**
[HUMAN][CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 5. [SECURITY] TT-ENFORCE-REPROBE
Final score: **87**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 6. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **84**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **63**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [SECURITY] Cloudflare WAF rule (CN/RU/HK)
Final score: **63**
Cloudflare WAF rule (CN/RU/HK) — JS Challenge firewall rule; requires API token with Zone / Firewall Services / Edit + Zone / Zone / Read; or Studio Owner can create in dashboard [human action / provide token]
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

## Recommended Build Order

1. Wire the staging workers_dev binding as the route-provenance corrobor…
2. Audit the remaining gate names against what they actually assert. Two…
3. Post-push CI confirmation
4. Main-domain Cloudflare Web Analytics activation receipt. Unchanged fr…
5. Confirm RUM history begins accruing. /v/rum accepted its first writes…
6. Claim-evidence relationship map + agent critique packet. Add stable f…
7. Confirm the Desk surfaces cross their floors on real traffic. S319 ob…
8. Annual Stripe activation once keys exist
9. Field-vitals freshness closure. Surface observed-through/stale-days, …
10. Extend proof/depth beyond the three core pages
11. CF Worker automation unblock

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
