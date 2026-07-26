# Innovation Pack

Generated: 2026-07-25 · source: live tracked code

Second-order candidates derived after the primary Unified Genius List pass. Status is computed from source evidence; no candidate is marked shipped by prose alone.

Signals: 4232 tracked files · 33 TODO/FIXME markers outside archives · latest SIL 998/1000.

## 1. Close the /go innovation-pack command parity gap

**Status:** SHIPPED THIS PASS

**Evidence:** SESSION_PROTOCOL requires `ops.mjs innovation-pack`; the local command registry is the executable source of truth.

**Quality bar:** Register the deterministic generator and keep `--check` byte-stable.

## 2. Make universal public routes a blocking sitemap contract

**Status:** SHIPPED THIS PASS

**Evidence:** Required source routes present: 4/4.

**Quality bar:** Require both source existence and sitemap membership for privacy, terms, contact, and IP.

## 3. Preserve honest-dark at route granularity

**Status:** SHIPPED THIS PASS

**Evidence:** Promotion proof previously collapsed browser evidence to the homepage.

**Quality bar:** Keep every critical route independently captured or explicitly dark.

## 4. Probe deploy credentials against bound resources

**Status:** SHIPPED THIS PASS

**Evidence:** A valid Cloudflare token can still fail deployment when its R2 binding is unreadable.

**Quality bar:** Read Workers Scripts and the bound R2 bucket before declaring deploy readiness.

## 5. Separate active intent from completed-session evidence

**Status:** SHIPPED THIS PASS

**Evidence:** An in-progress handoff intent previously advanced the startup session clock.

**Quality bar:** Derive completion only from the handoff heading or completed ledger sources.

## 6. Cross-check every derived SIL surface against its ledger

**Status:** SHIPPED THIS PASS

**Evidence:** Latest scored ledger: S291 · 998/1000.

**Quality bar:** Fail when PROJECT_STATUS session, total, or category vector diverges from the append-only ledger.

## 7. Escalate stranded deploys only on consecutive evidence

**Status:** SHIPPED THIS PASS

**Evidence:** One behind receipt can be propagation lag; two consecutive receipts indicate a stranded promotion.

**Quality bar:** Keep the beacon non-red for one settling receipt and explicit at the configured threshold.

## S292 implemented second-order candidate — Compile the evidence graph once

**Status:** SHIPPED THIS PASS

**Premise verified live:** The existing cascade checker hard-coded four edges while the new Worker receipt and Merkle artifact introduced additional transitive consumers. Loading those new edges exposed real unclosed publishers in `ci-status-beacon.yml`, `uptime-probe.yml`, and `vault-narrative.yml`.

**Implementation:** `config/evidence-graph.json` now declares ten source→artifact contracts. One acyclic closure engine drives both source-aware pre-push checks and scheduled-publisher cascade coverage; a bootstrap validator proves unique outputs, existing builders/check commands, graph acyclicity, and build order. All 27 publisher workflows now close their derived graph.

**Why it is second-order:** The primary fixes protect today’s artifacts. This compiler prevents each future evidence surface from creating a new, separately maintained dependency map—the failure mode that produced the original red exact-head CI.
