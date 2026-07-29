# Second-Order Innovation Pack — S298

Generated from live implementation evidence after the primary Unified Genius List reached **0 actionable items**.

## Candidates

1. **ACKNOWLEDGEMENT-PARSER-CONTRACT** — The first real receipt deploy reached exact candidate-green staging but the local parser rejected a valid remote acknowledgement because its regular expression matched literal backslashes. Extract a pure parser, cover noise/CRLF/count failures, and preserve redacted acknowledgement evidence on error.
2. **HASH-CHAINED-STAGING-DEPLOY-LEDGER** — A latest-only receipt proves one deploy but loses chronology. Add an append-only, exact-once ledger whose rows chain to the prior receipt, reject duplicate deploy IDs with conflicting content, and require the ledger head to equal the current receipt.
3. **SERVED-RECEIPT-REVALIDATION** — Deployment-time SSH equality proves the write once, not that the public staging route still serves the same bytes later. Add a bounded remote HTTP equality check with explicit unavailable/mismatch states.
4. **RELEASE-PROOF-LEDGER-BINDING** — A valid old receipt is rejected by candidate identity today, but release proof cannot show deployment lineage. Bind the validated ledger depth, head, and predecessor into release proof and make a detached/replayed head an explicit blocker.

## Premise verification

- Candidate 1 is proven by the partial first deploy: staging served exact SHA/root while no receipt was issued.
- Candidate 2 is real because only `api/staging-deploy-receipt.json` exists; no deploy-history ledger exists.
- Candidate 3 is real because the checker validates local bytes only; it does not fetch the served staging route.
- Candidate 4 is real because `build-release-proof.mjs` validates the current receipt but reads no deployment chronology.

All four are local, cost-neutral, non-destructive, and preserve the production hold.


## Implementation verdict

All four predeclared second-order candidates are **shipped**; final fixed-point verification then generated and shipped a fifth:

- **ACKNOWLEDGEMENT-PARSER-CONTRACT** — pure exact-one acknowledgement parser; CRLF/noise accepted; duplicate and zero-count acknowledgements fail closed; 15 deployment self-tests green.
- **HASH-CHAINED-STAGING-DEPLOY-LEDGER** — append-only NDJSON ledger with content-addressed rows, chronological and predecessor validation, exact-once append, and current-head binding.
- **SERVED-RECEIPT-REVALIDATION** — `check-staging-deploy-receipt.mjs --remote` fetches the public staging route with a bounded timeout, validates the served schema, and requires byte equality.
- **RELEASE-PROOF-LEDGER-BINDING** — release proof exposes depth/head/predecessor and blocks when chronology is absent, detached, or replayed.

Production remains intentionally held; these innovations strengthen staging truth without fabricating promotion evidence.

## Live-discovered fifth innovation

5. **Receipt/discovery DAG boundary.** Final fixed-point verification proved that generated `agents.json` cannot participate in the source fingerprint of the receipt it advertises. The projection remains contract-checked and candidate-Merkle-bound; the receipt source set is now acyclic and regression-tested.
