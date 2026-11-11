<!-- Session 411 · source: docs/AUDIT_2026-11-08-S411-copy-noun.json -->
# S411 bounded outcome8: quoted noun modifier

Recognize only matching question quotations used immediately after a determiner and followed by part plus a full stop, with horizontal spacing. Retain true lowercase sentence, later-sentence, paragraph and mismatched-quote rejection. Add positive and negative native regressions before parser implementation, preserve existing tests and published prose.

Acceptance: Native real-corpus before fails and regression fixture fails before repair; all existing and new self-tests and actual corpus pass after. No generic lowercase exemption, story whitelist, corpus rewrite or UI source change.

Sequence: before evidence and clean source → strict premises and canonical bundle admission → regression failure → narrow parser fix → self-tests and corpus verification.

Rollback: revert only focused parser change. Prior outcome3 and all admissions remain immutable; no whole-session timing reset, new arc, UI/corpus changes or release completion claim.
