# Agent memory

## S346 recovery boundary

S346 stopped during startup. S345 implementation and closeout are committed in 776819cdb; deployment verification followed in 5a73b4b12. Initial uncommitted residue was startup metadata, with no application edits. The requested full arc remains the continuation objective.

- Read full current diffs and verify historical green receipts independently.
- Build-runner read-only modes currently remove the outer verification lock; repair in S347.
- Startup task counts currently ignore bullet tasks; do not infer queue exhaustion from zero.
- Doctor's zero blocking count does not certify unavailable scheduled-workflow evidence.

S346 final local recovery verification (2026-09-09): full build suite 390/390, mobile runtime 215/215, reviewed theme captures 42/42, and Doctor blockingFailing 0 (two advisory failures). The recovery checkpoint and S347 full arc remain active. Hosted Community accessibility is a distinct known failure; no new production deployment is claimed.

## S348 durable memory

- Source-derived clocks, not rebuild time, govern deterministic generated provenance.
- Evidence coverage is complete only when generator inputs/outputs/fan-out are source-reviewed, checks are reachable, and every publisher stages descendants; S348 baseline is 67/67 checked generators across 80 nodes and 29 workflows.
- Fixed-size Git history before semantic filtering is unsafe unless a +1 sentinel and explicit truncation verdict survive.
- `context/CURRENT_STATE.md` is a hot ledger; history through S347 is byte-preserved in `context/archive/CURRENT_STATE_through_S347.md`.
- Desk facts, arguments, predictions, and visual evidence are exposed per story in deterministic `critique.json`; empty evidence links must remain `unlinked`.
- Uptime Actions→Worker scheduling is a dedicated public-trust migration, not closeout cleanup.
