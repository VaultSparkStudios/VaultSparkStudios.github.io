# Implementation Plan — S298

Source: `docs/AUDIT_2026-07-28.json`

Strategy: L3 depth throughout. Establish import-safe evidence contracts first, then build the deploy attestation on those integrity primitives, then ship the sibling-owned protocol repair through Ark.

| Wave | Audit item | Why this order | Verification |
|---:|---|---|---|
| 1 | `diagnostic-discovery-contract-registry` | Creates the reusable typed-validation kernel and prevents malformed evidence from being advertised while later receipts are added. | Contract fixtures; agents generator self-test/check; discovery spine; malformed/partial/integrity-negative cases. |
| 2 | `atomic-staging-deploy-attestation` | Reuses the integrity kernel, then binds the deployer, parity probe, release proof, evidence graph, and remote served receipt. | Receipt self-test; deployer self-test/probe; release-proof self-test/check; evidence graph/reachability; exact staging replay. |
| 3 | `protocol-propagation-truth-dossier` | Moves the sibling-owned semantic-currency fix without forking the propagated local copy. | Hash/heading dossier; signed Ark cargo receipt; payload contains executable acceptance tests. |

No page markup or styling changes are planned, so the Lighthouse page-change success bar is not triggered. Existing public contracts remain mandatory, and production will not be promoted.
