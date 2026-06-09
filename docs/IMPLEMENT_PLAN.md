<!-- generated-by: /implement skill v1.0 -->
<!-- source: docs/AUDIT_2026-06-08-S182.json (23 items) -->

# Implement Plan — S182 Audit

Sequenced for optimal efficiency (Priority/hour), not raw Priority. Reliability
cluster leads (founder's post-outage priority); auto-rollback ships first so it
protects the Worker changes that follow.

## Wave 1 — Reliability (CI / Worker / edge functions)
1. **worker-auto-rollback** (2h) — `if: failure()` rollback step after the smoke gate, only when deploy succeeded. Ships first.
2. **smoke-live-content-assertion** (1h) — assert the un-challenged JSON edge route returns valid JSON + expected key, not merely `<500`.
3. **rum-beacon-hardening** (2h) — rate-limit `/v/rum` by CF-Connecting-IP using the existing KV limiter.
4. **odds-cors-pin** (1h) — pin `Access-Control-Allow-Origin` on the metered `odds` edge function.
5. **edge-fn-error-redaction** (1h) — redact client-facing `String(err)` in checkout / webhook / discord functions.

## Wave 2 — Maintainability quick wins
6. **ambient-shell-orphan-sweep** (1h) — `git rm` unreferenced ambient shells + teach the orphan checker to catch them.
7. **dead-script-archive** (1h) — archive confirmed one-shot codemods.

## Deferred (with reasons — not blocked, deliberate)
- **eternal-price-lock-scarcity** — touches subscription pricing copy → CLAUDE.md ESCALATE gate (public promises / pricing). Needs founder sign-off.
- **anon-ignis-trial** — adds studio-paid LLM spend on the free tier → CANON-029 cost decision + founder sign-off.
- **brand-png-cleanup** — needs founder decision (are the PNGs `/brand/` downloadables?).
- **games-account-hook**, **pre-account-daily-streak** (1d each) — cross-domain / net-new product systems; deliberate design + flag-gating per project pattern.
- **feedback-loop-closure**, **pre-signup-rank-climb**, **cross-session-visit-memory**, **homepage-progressive-disclosure**, **ignis-score-ship-forecast** — net-new UX features warranting design + founder real-device review (project's flag-gate-high-risk-UX pattern).
- **worker-unit-tests** (4h) — right next reliability investment, but Miniflare/vitest scaffolding is large; do deliberately, not blind in this pass.
- **non-datacenter-uptime-probe** (4h) — needs external monitor signup / CF Cron from a non-datacenter egress.
- **nondeterministic-check-gates**, **buildcheck-parallel-selftest**, **rum-gate-collapse**, **edge-fail-open-hardening** — touch the build:check pipeline / generators; fiddly, higher regression risk; the env-vars half of fail-open is already version-controlled in wrangler.toml.
