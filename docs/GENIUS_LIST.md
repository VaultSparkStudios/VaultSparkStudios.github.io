# Genius Hit List — Session 285

Generated: 2026-07-17
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **91/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **check gh run list**
- Current focus: S285 ran the full /arc as one continuous mission on a board S284 had largely cleared. Rather than manufacture work, it verified the thin carry list against LIVE code (the Franchise Architect 301 is live: /games/vaultspark-football-gm/ -> 301 -> /games/franchise-architect/, new slug 200; the S282 verify names a pruned run) and followed the one real CI signal: the CI Status Beacon had gone red twice on gh HTTP 503, a transient GitHub outage. A health beacon that reports the repo unhealthy on the provider own weather is the CANON-031 lie applied to CI. Root-fix (D-S285.1): build-ci-status-beacon.mjs gained isTransientGhError() + retry-with-backoff + an honest-dark degrade (transient exhaustion preserves last-known-good + exits 0; real errors still surface). The check-every-failure-mode sweep found the identical class in fetch-rum-from-r2.mjs (exit 1 on transient R2 5xx) and fixed it the same way, keeping AccessDenied a hard-fail so the standing token-scope blocker stays visible. Second-order: check-ci-publisher-resilience.mjs makes unattended-publisher transient-degrade a standing contract (clean 0/27, self-test with teeth), sibling to check-build-step-resilience. build:check 215/215 EXIT 0, doctor 15/15 blockingFailing 0, scan-secrets 0.

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

#### 2. [VERIFY] Confirm the S282 push went green. gh run list --commit <tip>
Final score: **90**
[S282][VERIFY/P1] Confirm the S282 push went green. gh run list --commit <tip> — 11 workflows triggered on 06a360d34 (verified triggered, not merely landed). The e2e compliance job is the one that matters: it exercises the trend-latest path this session changed.
Why it matters: Confirm the S282 push went green. gh run list --commit <tip> was flagged 3 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [INTELLIGENCE] Evaluate a combined studio-wide hardfail-resilience gate template
Final score: **87**
[S285][SIL] Evaluate a combined studio-wide hardfail-resilience gate template — merge the complementary check-build-step-resilience (gitignored-file class) + check-ci-publisher-resilience (transient-network class) into one propagatable gate. Extract the shared audit lib first.
Why it matters: Evaluate a combined studio-wide hardfail-resilience gate template keeps the ranked audit current so later sessions don't iterate on stale signal.

First command: `node scripts/generate-genius-list.mjs`



### DEFERRED / GATED

#### 1. [PRODUCT] Multi-sport runway for Franchise Architect. The rebrand establishes t…
Final score: **96**
[S284→FOUNDER] Multi-sport runway for Franchise Architect. The rebrand establishes the umbrella; playfranchisearchitect.com + per-sport /leaderboards/<sport>/ are the open expansion (CDR #24). Founder-gated (domain + product scope).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 2. [PRODUCT] Multi-sport runway for Franchise Architect. playfranchisearchitect.co…
Final score: **90**
[S284→FOUNDER] Multi-sport runway for Franchise Architect. playfranchisearchitect.com + per-sport /leaderboards/<sport>/ (CDR #24). Founder-gated (domain + product scope).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 3. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **87**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 4. [SECURITY] TT-ENFORCE-REPROBE
Final score: **87**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 5. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **84**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 6. [PRODUCT] Ark pattern-share the transient-degrade recipe (isTransient*Error + h…
Final score: **81**
[S285][SIL] Ark pattern-share the transient-degrade recipe (isTransient*Error + honest-dark degrade for unattended publishers) to studio-ops so every Studio repo inherits it. node scripts/ark.mjs ship --type pattern-share.
Why it matters: Owned by another repo or already moved through Ark cargo.

#### 7. [COHESION] Social Dashboard bidirectional mirror
Final score: **65**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — awaiting founder confirm before cross-repo write] — S92 website-side partial: website-public, hub, and social-dashboard contracts now expose normalizedActivity schema/empty payload; producer-side Social Dashboard write remains gated.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 8. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **63**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

## Recommended Build Order

1. Post-push CI confirmation
2. Confirm the S282 push went green. gh run list --commit <tip>
3. Evaluate a combined studio-wide hardfail-resilience gate template

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
