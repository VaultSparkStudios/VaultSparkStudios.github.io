# S297 Second-Order Innovation Pack

Date: 2026-07-27  
Trigger: primary Unified Genius List exhausted; session-floor required continued value creation.

These candidates were derived from the shared failure class behind the S297 audit: a receipt existed, but consumers could reinterpret, partially write, incompletely measure, or fail to invalidate it. Every candidate was premise-checked against live code and shipped in this session.

| # | Candidate | Premise verified | Shipped evidence |
|---:|---|---|---|
| 1 | Shared build-check evidence kernel | Startup, closeout, and the build runner each used independent structural assumptions. | `scripts/lib/build-check-evidence.mjs`; green/red/malformed/row-count behavioral cases. |
| 2 | Atomic evidence receipt I/O | Status and diagnostic JSON used direct overwrite writes, allowing interruption-truncated truth files. | `scripts/lib/evidence-io.mjs`; two-generation atomic smoke with zero temp residue. |
| 3 | Strict startup evidence consumption | Startup accepted any numeric `commandCount`/`passed`, even if rows and failures disagreed. | Startup now requires a complete validated receipt and derives freshness from its timestamp. |
| 4 | Self-validating build diagnostics | `--check-diagnostics` checked array presence, not count/row/failure agreement. | Exact invariant validation plus atomic JSON/Markdown writes; live complete receipt accepted. |
| 5 | Self-validating proof diagnostics | The new classified proof receipt had no persisted-artifact validation mode. | `--check-diagnostics` verifies schema 2.0, all totals, enforcement classes, and failures; live 81-command receipt accepted. |
| 6 | Transitive Genius cache invalidation | The cache watched an entrypoint but missed imported semantic modules—the classifier change initially remained falsely fresh. | Local import-closure content fingerprint; self-test discovers classifier transitively; cache regenerated with zero actionable items. |
| 7 | Closeout evidence boundary sentinel | A future edit could remove or reorder receipt stamping while individual helpers stayed green. | Boundary checker proves measured suite → diagnostic stamp → derived reconciliation order and rejects legacy hand-entered modes. |

## Depth Wave 2 — Adversarial Receipt Closure

| # | Candidate | Premise verified | Shipped evidence |
|---:|---|---|---|
| 8 | Complete-suite attestation | A successful `--from=N` tail run could look like a complete green receipt. | Schema 2.0 records planned/executed counts, first step, coverage state, and rejects partial receipts as complete. |
| 9 | Current-plan fingerprints | A structurally valid receipt could describe an older command plan. | 24-hex plan fingerprint is validated against live `package.json` by startup, diagnostic check, status stamp, and closeout board. |
| 10 | Integrity-bound JSON/Markdown pairs | JSON and its human twin could drift or truncate independently. | Both receipts carry content-bound IDs; writers and check modes verify the persisted pair before returning green. |
| 11 | Stable status projection | Persisting volatile receipt IDs would create an endless closeout rerun loop. | Durable status stores stable plan identity, not timing-bound receipt ID; identical second stamp is proven `UNCHANGED`. |
| 12 | Fully measured build entrypoint | Nine release/security preflights ran outside the 244-step receipt. | Outer chain collapsed into the orchestrator; live `npm run build:check` is one runner with **253/253** directly measured gates. |
| 13 | Independent closeout-board truth | The board trusted counters in `PROJECT_STATUS` without reading their producer. | Board validates current receipt, plan, counts, failures, and stable fingerprint; stale 244-plan displayed `UNVERIFIED`, fresh 253-plan displays `253/253 measured`. |
| 14 | Content-stable transitive cache graph | Import closure missed side-effect imports and root inputs used timestamp signatures. | Static/dynamic/side-effect imports self-tested; local inputs and module closure hash bytes; cache writes atomically. |
| 15 | Canonical-only test source | A hypothetical unsigned legacy counter could override the integrity-bound receipt. | Legacy path removed; startup derives only from `api/build-check-diagnostics.json` and degrades all other states to unverified. |
| 16 | Task-ownership truth | Social Dashboard remained falsely founder-gated for a forbidden direct sibling write; a deleted file remained in a founder task title. | Producer dossier shipped by Ark `01JUIVGUM107D70A08C1C6C7BB`; website baton closed; founder task narrowed to real device verification. |
| 17 | Consolidation-aware duplicate detector | Explicit `record-consolidation` stubs generated recurring false [x]+[ ] alerts. | Marker-aware classifier self-test 7/7; live strong-signal count **4 → 0** without deleting historical evidence. |
| 18 | Agent-discoverable verification | Public-safe receipts existed but were absent from the AI discovery spine. | Both receipts added to `agents.json` discovery + curated feeds and `/.well-known/llms.txt`; agent spine remains coherent. |
| 19 | Source-bound verification receipts | A current-plan receipt could remain green after code, public surface, workflow, or verification-relevant context changed. | Build receipts now bind a deterministic 24-hex verification-surface fingerprint; startup, closeout, stamping, and diagnostics reject stale-source evidence. Generated status/receipt files remain excluded to avoid self-invalidation. |
| 20 | Freshness-bounded closeout truth | Structurally valid evidence could remain displayed as current indefinitely. | Closeout verification rejects complete receipts older than 24 hours while preserving the exact failure reason for operators. |

Outcome: twenty of twenty second-order candidates shipped. No public page changed, so the Lighthouse page-change gate is not applicable. No sibling repository was edited; both cross-repo requests used signed Ark cargo.