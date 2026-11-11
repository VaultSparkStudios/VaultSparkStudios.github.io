<!-- source: docs/AUDIT_2026-11-11-S415.json · Session 415 -->
# S415 implementation plan

1. **candidate-baseline-provenance (L2)** — Default manual captures to the local candidate. Refuse external-origin baseline generation, emit source/origin capture provenance, and make baseline imports reject failed, wrong-SHA or unbound runs before download. Extend the existing workflow audit checker and focused CLI tests.
   Acceptance: Actual workflow contract, negative admission tests and unchanged workflow checks pass. No PNG adoption without direct review and unchanged native comparison.

2. **candidate-required-acceptance (L2)** — Reproduce the fixture-load timeout separately without weakening assertions. Integrate current main without history rewrite, regenerate owned outputs and run the complete 552-step source suite. Obtain exact candidate hosted E2E, Lighthouse and accessibility results; preserve failures.
   Acceptance: Complete native source result and exact final SHA required workflows pass. One focused retry does not erase the failed full run.

3. **affected-authenticated-promotion (L2)** — Reuse existing isolated staging and approved identities to verify changed signin/signup success and recovery boundaries, tampered context denial and data isolation. Verify staging root and rollback, then perform existing authorized main/production promotion and served readback.
   Acceptance: Affected deployed member/investor journeys, exact required checks, staging/artifact parity, rollback and production served bytes verified. Local mocked auth and live denials alone do not pass.

Waves: 1 recovery checkpoint complete; 2 fresh startup/audit admitted; 3 provenance repair; 4 current source/hosted/auth/staging acceptance; 5 honest closeout and authorized production readback. Partial and blocked work stays open.
