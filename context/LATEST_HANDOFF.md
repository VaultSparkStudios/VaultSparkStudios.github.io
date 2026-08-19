# Latest Handoff — VaultSparkStudios.github.io

## Session Intent

**S323:** Run the complete `/arc`; the founder authorized a direct push/commit to `main` and full deploy. Audit and implement the strongest verified improvements, then push and deploy.

**Session 323 · 2026-08-19 · agent: claude-code (Opus 4.8, 1M) · not cut off (routine sync) → dedicated gate-name honesty sweep → push + deploy**

---

## Read this first — the sweep the last two sessions kept pointing at

S321 found `check-public-note-freshness` had carried "freshness" in its name for fifteen sessions while measuring only voice regexes (D-S321.4), and left a standing TASK_BOARD item: *"there is no reason to believe they are the only two."* S322 re-committed it verbatim as a dedicated-sweep-sized job. **S323 ran that sweep.** All 173 `check-*.mjs` gates were read (five in-process reader agents, no OS windows), every candidate was verified against live code before any edit, and **ten offenders** were fixed — each to measure the property its name promises, each locked with a self-test that fails in the direction the old gate never could.

This was not two more instances. It was the class.

---

## Shipped — ten gates, name now matches body

| Gate | The gap | The fix | self-test |
|---|---|---|---|
| **check-worker-rewriter-safety** (security) | defined 4 unsafe-op scanners, `runScan` composed only 2 — nonce-`Content-Type`-drop and HEAD-cache-poison were dead in production, green in self-test | all 4 flow through one exported `scanWorkerSafety`; composition self-test fails if any registered scanner stops running live | 17/17 |
| **check-canon-compliance** | CANON-008 passed on the substring `"CANON-008"`, which the propagated canon index carries in every repo → could never fail | requires a real license declaration in `docs/RIGHTS_PROVENANCE.md`, not a canon-id mention | 6/6 |
| **check-launch-ready** | `=== 'SPARKED'` vs the registry's lowercase `'sparked'` silently disabled ALL SPARKED enforcement; and it read `liveUrl` where the field is `runtimeUrl` | one case-insensitive `isSparked()`; live URL resolved from `runtimeUrl`; missing-stagingType now blocks | 6/6 (repo now 100% GO) |
| **check-news-engagement-coherence** | engaged-time checked fabrication but never drift | reproduces the SSR humanizer, asserts equality (mirrors reach/attention) | 12/12 |
| **check-build-step-resilience** | blind to a bare `readFileSync` of a gitignored path (no `existsSync`, no try/catch) — the exact ENOENT-kills-the-chain shape | unguarded-read detection with path-constant resolution; one shared `auditSource` (no more inline replica) | 8/8, live green ×82 scripts |
| **check-game-playability-coherence** | sourceRepo cross-check ran inside the findings loop → never ran on a clean page | hoisted out, run once unconditionally | 12/12 |
| **check-registry-freshness** | `urlDrift` declared + returned but never populated | populated (surfaced a real mindframe drift) | live green |
| **check-hero-jsonld-completeness** | empty array is truthy → `sameAs: []` passed | empty arrays/strings count as missing | 15/15 |
| **check-journal-dates** | "day-level" inferred from a comma | tests for an actual day number | 11/11 |
| **check-portfolio-coherence** | header advertised a 3rd "sitemap.xml" leg the body never read | false claim removed (sitemap coverage lives in check-sitemap-coverage) | (doc) |

Two second-order truths came out of the sweep and were handled, not stepped around:
- Wiring the dormant HEAD-cache scanner flagged the **live Worker**. The Worker was read *before* the gate was touched: it had *strengthened* its GET guard to `method === 'GET' && edgeCacheOn`, and the scanner's regex demanded the exact old string. Scanner drift, not a Worker bug — the regex now tolerates an AND-narrowed guard while still catching a HEAD-inclusive one.
- Fixing launch-ready's case-mismatch uncovered the `liveUrl`-vs-`runtimeUrl` field bug beneath it (masked because the SPARKED-gated liveUrl check had never run).

---

## Surfaced — advisory, NOT closed here (CANON-018)

- **`mindframe` registry `deployedUrl` drift** — local `steadfast-determination-production.up.railway.app` ≠ canonical `usemindframe.com`. Studio-ops-owned; the newly-populated `urlDrift` bucket found it.
- **`franchise-architect` portfolio-coherence drift** — studio-ops-owned registry vs on-disk.
- **Registry schema inconsistency** — the live URL is stored under `runtimeUrl`; `liveUrl` is sparse. Worth an Ark `pattern-share` (committed on the board).

---

## Still open (unchanged — all founder-gated or portfolio-owned)

- **`real-provider-e2e-pending`** — one founder passkey ceremony: `node scripts/verify-provider-journey.mjs --live`. Everything around it is verified and receipted (`api/provider-chain-readiness.json`, `chainReady: true`). CANON-019 founder-reserved — do not automate, do not schedule unattended.
- **Route provenance vantage** — build-attestation half wired in S322; production-route half still depends on a locally-run probe by design (D-S322.1). Do not satisfy the gate with `buildVantage`.
- **`data/news-desk-engagement-history.ndjson` still does not exist**, so Desk engagement floors correctly read `unavailable`. Scheduled `rum-pull` outcome. **Do not lower a floor to make the page look alive.**
- **IGNIS freshness** — portfolio-owned in studio-ops, unwritable here.
- **Rollback architecture** — Pages warm origin still follows mutable `main`; D-S303 requires founder authorization.
- **The Dispatch** — zero confirmed subscribers until the founder clicks the double-opt-in email.

---

## A note on this session's audit

There is no fresh `docs/AUDIT_<date>.md` for S323 — the sweep worked from the concrete, verified TASK_BOARD carry item (`[GATE/P1]`) and the live gate inventory directly, which is the right input for a defect-class sweep on a mature 986/1000 codebase. `docs/AUDIT_2026-08-19.md` is S321's, fully consumed — do not treat it as current.

## Verification receipts

| Check | Result |
|---|---|
| `npm run build:check` | **319/319** — real captured `BUILDCHECK_EXIT=0` (first run's background wrapper reported exit 0 while the command's own exit was 1; caught and fixed the stale derived artifacts) |
| check-worker-rewriter-safety --self-test | 17/17 · live scan green (Worker safe on all 4 invariants) |
| check-canon-compliance --self-test | 6/6 · this repo CANON-008 compliant |
| check-news-engagement-coherence --self-test | 12/12 · live gate green (7 panels) |
| check-build-step-resilience --self-test / --check | 8/8 · live green ×82 build-chain scripts |
| check-launch-ready --self-test | 6/6 · this repo 100% GO |
| Derived-artifact resync | ignis-search-index, intelligence-budget, intent-map, status-proof, news-desk family regenerated (cron-churn); all --check green |
