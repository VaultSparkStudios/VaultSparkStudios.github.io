# Implementation plan — S364

- Wave 1: diagnose the reported signup 503. Complete: production log identifies the scoped headers constant error; provider settings identify missing Turnstile secret; verifier target mismatch confirmed.
- Wave 2: repair the route, provision existing configuration, add regression checks. Complete: route, verifier, secret provisioning and fresh-token retry tests pass. Staging binding restored; negative request returns the intended 403.
- Wave 3: staging verification, release gates, main commit/push, production deployment and served verification, closeout. In progress: full unit suite 268 passing / 0 failing / 2 existing TODOs; secret scan clean; full build exposed startup-meter source mismatch, being repaired before rerun.

Acceptance: signup reaches the correct service with challenge protection intact; negative controls return intended errors; authorized real confirmation is correlated to a current provider event; main contains the fix and deployment serves it. No unrelated identity hold is cleared.
