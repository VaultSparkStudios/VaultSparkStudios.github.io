# Genius Hit List — Session 281

Generated: 2026-07-15
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **94/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **check gh run list**
- Current focus: S281 root-fixed why the project board itself was reporting already-shipped work as top priority, and defused a CI failure the hourly cron had silently armed. The stale-open-task gate now verifies ARTIFACT EVIDENCE (does the named deliverable exist now?) instead of guessing from prose similarity — prose scoring was measured on the live corpus and rejected at a 50% false-positive rate; the evidence detector scores 2/2 true positives, 0/49 false positives (D-S281.1). It also now distinguishes a work-done [x] from a record-consolidation [x], after consolidating duplicates instantly produced a 100% false positive against a genuinely-open founder-gated carry (D-S281.2). build-geo-vitals --check was byte-comparing against an Actions-cache-only input, guaranteeing an e2e failure on the next ordinary push (proved on a pristine origin/main worktree); it now enforces structure + the feed's privacy contract always and byte-compares only when the input is reproducible (D-S281.5). check-orphan-scripts now enumerates git-tracked files instead of walking the filesystem, ending local-red/CI-green divergence (D-S281.6). Board rot cleared: a CANON-019 phantom-blocker (supabase.admin re-verified READY 2/2) plus 16 duplicate records consolidated with zero information lost — open tasks 49 to 33, NOW from 4 items (2 phantom) to 1.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] A [skip ci] cron can arm an invisible CI failure. c7db58811 committed…
Final score: **100**
[S281][CI/P3] A [skip ci] cron can arm an invisible CI failure. c7db58811 committed rows no CI run ever validated, loading a guaranteed e2e failure onto the next innocent push. The S219 6-hourly pages-deploy cron solves the *deploy* strand, not the *validation* strand. Candidate: run the affected --check gates inside the uptime cron before it commits.
Why it matters: A [skip ci] cron can arm an invisible CI failure. c7db58811 committed  shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [VERIFY] Date-embedding generators drift across UTC midnight. build-agents-jso…
Final score: **85**
[S281][DX/P4] Date-embedding generators drift across UTC midnight. build-agents-json --check went red purely because this session crossed 00:00Z (built 07-14, checked 07-15). Harmless now; a long CI job spanning midnight would flake. Candidate: date-normalise in --check the way generatedAt already is.
Why it matters: Date-embedding generators drift across UTC midnight. build-agents-json shipped last session — confirm it works in production before piling new work on top.

First command: `npm run build:check && node scripts/csp-audit.mjs`



### DEFERRED / GATED

#### 1. [PRODUCT] scripts/fetch-studio-feed.mjs zombie
Final score: **88**
[S281][FOUNDER] scripts/fetch-studio-feed.mjs zombie — needs a founder call, deliberately NOT deleted. Untracked; deleted from git in S275 as dead (zero consumers, output removed, header claims a nonexistent issue #109), re-killed as an untracked copy in S279 (no git trace — git log --diff-filter=D shows only one deletion), and back again. It differs from every committed version by one line (AbortSignal.timeout(10_000)), so deleting an untracked file would destroy unrecoverable work. It no longer blocks build:check (D-S281.6). Question worth answering: what keeps recreating it?
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 2. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **87**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 3. [SECURITY] TT-ENFORCE-REPROBE
Final score: **87**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 4. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **84**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 5. [PRODUCT] Wishlist "N waiting" momentum
Final score: **81**
[S280→][PRODUCT/P2·FOUNDER] Wishlist "N waiting" momentum — CANON-019 phantom cleared (D-S280.3). supabase.admin is READY (2/2) — NOT credential-blocked. Real gate: founder public-optics call (low counts backfire on unreleased-game surfaces). De-gating design: floor-thresholded display (only surface counts ≥ a momentum-positive minimum). Next session can ship the pipeline once the founder sets the optics policy.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 6. [VERIFY] Homepage LCP measured pass
Final score: **75**
[S279][PERF/P2] Homepage LCP measured pass — sharpened honest-deferral. The throttled harness proved the homepage's APPLIED LCP is fine (~1.7s); the CI 5.8s is Lantern's *simulated* render-blocking penalty. The 47KB inline-CSS split is the confirmed lever but stays FOUC-risky on the brand anchor — needs real headless Lighthouse before/after + multi-viewport FOUC on a preview deploy. Floor NOT lowered (CANON-031). Founder-device gated.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 7. [COHESION] Social Dashboard bidirectional mirror
Final score: **65**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — awaiting founder confirm before cross-repo write] — S92 website-side partial: website-public, hub, and social-dashboard contracts now expose normalizedActivity schema/empty payload; producer-side Social Dashboard write remains gated.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 8. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **63**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

## Recommended Build Order

1. A [skip ci] cron can arm an invisible CI failure. c7db58811 committed…
2. Post-push CI confirmation
3. Date-embedding generators drift across UTC midnight. build-agents-jso…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
