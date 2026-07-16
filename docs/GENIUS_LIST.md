# Genius Hit List — Session 284

Generated: 2026-07-16
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **86/100**
- Health: **yellow**
- Current SIL: **999/1000**
- CI health: **all-green ✓**
- Current focus: S284 recovered the cut-off S283 then ran a large founder-directed feature session on the public what-shipped surfaces. (1) CHANGELOG: fixed the confusing/inverted Time Machine scrubber and added real search + year filters + stable per-entry anchors + per-entry permalinks + deep-link (hash cl-latest scroll/flash) + URL-synced shareable filter state; the homepage hero ticker now deep-links to the referenced entry. (2) HOMEPAGE BANNER: build-ignis-conduit.mjs no longer leaks raw commit voice onto the brand front door — a sanitizer + a DEVISH reject guard (drops any subject carrying paths/S-numbers/D-S/CANON/ratios/CI jargon) + proper-noun casing turn commit activity into clean audience copy, guarded by a self-test. (3) FRANCHISE ARCHITECT REBRAND (CDR 24): VaultSpark Football GM to Franchise Architect as the clean multi-sport umbrella brand; decoupled name from slug for safety — Phase 1 changed the display name across 323 instances (zero URL risk) + a rebrand tombstone, Phase 2 changed the slug to /franchise-architect/ with 301s via a Cloudflare Pages _redirects file (deploys without the founder-gated Worker; the Worker redirect:follow makes a 404 impossible) plus canonical Worker Layer-0c 301s. (4) CHANGELOG FRESHNESS: extracted CONSUMER_CHANGELOG to data/consumer-changelog.json + a founder-approved publish-changelog-draft.mjs flow with public-safe validation (self-test), and published the first current entry (2026-07-16) so the feed is no longer frozen at May 14. build:check 213/213 EXIT 0 throughout; every surface browser-smoked (13/13, 10/10, 9/9, 7/7). Post-deploy: verify the old->new 301 live. PREVIOUS (S283): S283 was a codex arc that ran /start → /audit → /implement in full — six verified root fixes shipped to the working tree plus a second-order innovation pack started — then died during /closeout before a single commit (0 ahead of origin, .session-lock still held). Recovery did NOT trust the audit's shipped-log: integrity sweep (all changed JSON/ndjson/jsonl parse, 0 bad; ~/.claude.json valid), then verification caught a real regression S283's own gate would have blocked — tests/oracle-extra.spec.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Verify the old→new 301 live. CF Pages _redirects behavior can't be ve…
Final score: **86**
[S284→POST-DEPLOY] Verify the old→new 301 live. CF Pages _redirects behavior can't be verified from local preview; confirm on prod after this deploy lands.
Why it matters: Verify the old is a 284-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check`



### DEFERRED / GATED

#### 1. [PRODUCT] Multi-sport runway for Franchise Architect. The rebrand establishes t…
Final score: **96**
[S284→FOUNDER] Multi-sport runway for Franchise Architect. The rebrand establishes the umbrella; playfranchisearchitect.com + per-sport /leaderboards/<sport>/ are the open expansion (CDR #24). Founder-gated (domain + product scope).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 2. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **93**
[CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 3. [SECURITY] TT-ENFORCE-REPROBE
Final score: **93**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 4. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **90**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 5. [COHESION] Social Dashboard bidirectional mirror
Final score: **71**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — awaiting founder confirm before cross-repo write] — S92 website-side partial: website-public, hub, and social-dashboard contracts now expose normalizedActivity schema/empty payload; producer-side Social Dashboard write remains gated.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 6. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **69**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 7. [VERIFY] nav-sheet device verify (mobile bottom-sheet default-swap
Final score: **66**
[S180][FOUNDER] nav-sheet device verify (mobile bottom-sheet default-swap — real-device confirmation).
Why it matters: Requires founder review, public-safe decision, or real-device confirmation.

#### 8. [VERIFY] Verify membership-live-tier.js in browser
Final score: **62**
[S94][FOLLOWUP] Verify membership-live-tier.js in browser — sign in as a member and confirm rank strip highlights active tier (gold glow + scroll-into-view), world vault shows "✓ You have access" badges for tier unlocks. Check mobile layout.
Why it matters: Requires a live account, real device, inbox receipt, payment-provider flow, or manual external confirmation.

## Recommended Build Order

1. Verify the old→new 301 live. CF Pages _redirects behavior can't be ve…

## Best Immediate Move

Release browser gates are green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.
