# S382 implementation plan

Wave 1 complete: fresh startup and nine-axis audit. Native goal 01a1423f-c7bf-7b80-b75f-75517203c959 binds S382.

Wave 2: Update only the five obsolete search cases in ambient-bundle-integrity.spec.js to the shipped Spark navigation contract. Keep lazy-load uniqueness, mobile header geometry, open/close keyboard behavior, focus restoration, real query filtering and named native search semantics. Run all affected tests and existing Spark tests; prove a broken Spark load is detected. Classify all 45 prior optional failures by exact assertion and evidence, preserving pixel and other unresolved diagnostics. Do not modify runtime or baselines.

Wave 3: canonical closeout, staging acceptance, required exact-candidate checks, direct main push and verified production deployment. Remaining identity and field-vitals limitations stay explicit.
