# Genius Hit List — Session 219

Generated: 2026-06-23
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **960/500**
- CI health: **check gh run list**
- Current focus: S219 (arc) — hygiene root-fixes + second-order gate. (1) CANON walk: CANON_ADOPTION.md was MISSING entirely (latent doctor finding) → walked all 51 live canons with real posture (46 adopted / 3 in-flight review / 2 exempt-with-reason); the walk surfaced a real self-owned gap → (2) CANON-043: added SECURITY.md (Dependabot existed, security policy did not) aligned to .well-known/security.txt. (3) Resolved the S179 context-wipe-guard.mjs orphan (imported by nothing ~40 sessions) — added --self-test/--check CLIs, wired reactive checkContextFiles into closeout-autopilot Step 4 as a real gate (--allow-wipe escape hatch), CI-covered via smoke-startup-scripts (export + behavioral invariants). (4) SECOND-ORDER: built check-orphan-libs.mjs (no gate existed for orphaned scripts/lib/*.mjs) — found 2 MORE real orphans (env-local, write-project-status), allowlisted with rationale, wired into build:check via smoke runner (no cmd.exe length growth). (5) Drained Ark inbox (26 cargo, receipts shipped); root-caused 52 sig-failures = ark.hmac.seed MISSING fleet-wide (founder credential action). (6) Shipped 3 Ark cargos (studio-ops sibling-drift, obelisk-broker handoff, obelisk content-ack). Honest non-action: project-info-drift advisory = won't keyword-stuff punchy game copy. build:check EXIT 0, doctor blockingFailing 0 (4 failing = all sibling/portfolio scope, flagged via Ark).

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] CANON_ADOPTION freshness
Final score: **96**
[INFRA/P3·SIL] CANON_ADOPTION freshness — local mirror of the studio-ops probe. Tiny local assertion (file exists + walked within N sessions) folded into the smoke runner, so the next "required-context-file missing" is caught locally before the portfolio doctor catches it (the asymmetry that let CANON_ADOPTION sit absent).
Why it matters: CANON_ADOPTION freshness is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allow…
Final score: **93**
[INFRA/P3·SIL] orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allowlist entries that are now (a) imported (allowlist no longer needed) or (b) missing from disk (stale entry) — keeps the allowlist honest.
Why it matters: orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allowl is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] First real push notification
Final score: **90**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [BRAND] Draft one Signal Log post (founder voice) + publish forge devlog (fou…
Final score: **87**
[CONTENT/P1·FOUNDER] Draft one Signal Log post (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post (founder voice) + publish forge devlog (foun affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 3. [PRODUCT] Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
Final score: **84**
[CRED/P1·FOUNDER] Provision ark.hmac.seed (fleet ARK_HMAC_SEED) — fixes cross-repo Ark signature verification (52 sig-failures on drain). HMAC-seed minting = founder credential action (CANON-019 reserved).
Why it matters: Provision ark.hmac.seed (fleet ARK_HMAC_SEED) is open, local, and unblocked — can ship this session.

#### 4. [BRAND] MOBILE-SHEET-DEFAULT-SWAP
Final score: **81**
[UX·FOUNDER] MOBILE-SHEET-DEFAULT-SWAP — founder real-device verification (flag-gated nav sheet).
Why it matters: MOBILE-SHEET-DEFAULT-SWAP affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 5. [PRODUCT] card-accent → cover-image overlay tint
Final score: **78**
[UX/P3·SIL] card-accent → cover-image overlay tint — quality-deferred (CANON-047 AI-image-test needs a non-headless screenshot env).
Why it matters: card-accent is open, local, and unblocked — can ship this session.

### LATER

#### 1. [BRAND] Draft one Signal Log post from the brainstormed ideas (founder voice)…
Final score: **75**
[CONTENT/P1·FOUNDER] Draft one Signal Log post from the brainstormed ideas (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post from the brainstormed ideas (founder voice)  affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [PRODUCT] Sibling CANON-006 (velaxis/syntha/shadow missing branding) → ship Ark…
Final score: **72**
[OPS/P2] Sibling CANON-006 (velaxis/syntha/shadow missing branding) → ship Ark repo-question cargo to studio-ops; process pending Ark cargos (S213 01JRK6AH97E0F421A55C54236C, S216 01JRONES0VE96C6C4554516536 + 01JRONIRFF246105D9994172D4).
Why it matters: Sibling CANON-006 (velaxis/syntha/shadow missing branding) is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Draft one Signal Log post from the 10 brainstormed ideas. Founder pub…
Final score: **69**
[CONTENT/P1·FOUNDER] Draft one Signal Log post from the 10 brainstormed ideas. Founder publishes in own voice.
Why it matters: Draft one Signal Log post from the 10 brainstormed ideas. Founder publ affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

## Recommended Build Order

1. CANON_ADOPTION freshness
2. Post-push CI confirmation
3. orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allow…
4. First real push notification
5. Draft one Signal Log post (founder voice) + publish forge devlog (fou…
6. Forge Window naming propagation
7. Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
8. MOBILE-SHEET-DEFAULT-SWAP
9. card-accent → cover-image overlay tint
10. Draft one Signal Log post from the brainstormed ideas (founder voice)…
11. Sibling CANON-006 (velaxis/syntha/shadow missing branding) → ship Ark…
12. Draft one Signal Log post from the 10 brainstormed ideas. Founder pub…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
