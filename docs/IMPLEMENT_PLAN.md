<!-- generated-by: /implement (session 306) -->
<!-- generated-at: 2026-08-05 -->

# Implementation Plan — S306

**Source:** `docs/AUDIT_2026-08-04.json` (14 items)
**Order:** evidence foundations → release contracts → fast verification → discovery/content → one UI batch → token-cost close.

**Success bar:** every page change passes mobile Lighthouse Performance ≥90 (or records a concrete exception); UI changes also require CANON-053 desktop/mobile, every-theme rendered-pixel proof.

| Order | Audit # | Slug | Rung | Why this order |
|---|---:|---|---|---|
| 1 | 10 | engagement-window-receipt | L2 | Establish trustworthy feedback windows before changing any journey from stale counts. |
| 2 | 2 | obelisk-redirect-readiness-contract | L2 | Fail-fast provider contract; prerequisite for every later release verdict. |
| 3 | 9 | staging-browser-release-gate | L2 | Make the one browser test that caught the real provider failure unskippable. |
| 4 | 5 | release-ceremony-gate | L2 | Compose items 2/9 with existing staging, promotion, and Doctor gates. |
| 5 | 7 | release-dependency-handshake | L2 | Bind the external owner request/ack into the same release truth graph. |
| 6 | 11 | deploy-currency-quorum | L2 | Remove single-vantage authority before production promotion is reconsidered. |
| 7 | 4 | changed-path-check-planner | L2 | Cut subsequent edit/verify latency while retaining full 275-step closeout authority. |
| 8 | 8 | agent-intent-map | L2 | Add outcome-first discovery; later UI can reuse the same deterministic map. |
| 9 | 6 | forge-freshness-circuit | L2 | Restore curated public voice from existing source-bound generators. |
| 10 | 1 | contextual-vault-bridge | L2 | First UI layer; consumes intent map and fresh telemetry contracts. |
| 11 | 3 | progressive-onboarding-trigger | L2 | Recompose the existing low-conversion tour after the bridge defines intent. |
| 12 | 12 | decision-moment-feedback | L2 | Ask only at the new/recomposed decision moments; consumes item 1 windows. |
| 13 | 13 | constellation-resume-compass | L2 | Final UI/gamification layer, then one combined visual/Lighthouse verification matrix. |
| 14 | 14 | taskboard-rotation-and-cost-floor | L2 | Token-cost item last; measure the settled board/brief delta and preserve archive provenance. |

## Wave gates

1. **Evidence:** hermetic self-tests + structural checks for items 10/2/9/5/7/11/4/8.
2. **Content:** generator convergence, sitemap/discovery coherence, public-safe scan.
3. **UI:** Playwright behavioral suites, Axe, seven themes at desktop/mobile, image inspection, mobile Lighthouse ≥90.
4. **Release:** exact canonical staging receipt, redirect readiness, zero-skips browser suite, promotion hold/ready truth, Doctor.
5. **Close:** full `npm run build:check`, unit suite, secret scan, audit execution logs, SIL write-back.
