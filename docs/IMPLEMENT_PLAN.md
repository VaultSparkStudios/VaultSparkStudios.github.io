<!-- generated-by: /implement skill v1.0 (S185) -->
<!-- source: docs/AUDIT_2026-06-10.json itemsS185 (12 items) -->

# Implement Plan — S185 Audit (2026-06-10)

## Wave Plan (S185)

| Wave | Slug | Axis | Effort | Priority | Why this order |
|---|---|---|---|---|---|
| 1a | ark-deploy-strand-pattern-share | ecosystem | 30m | 36.4 | Pure Ark cargo — zero code change, immediate fleet impact |
| 1b | status-proof-in-agents-json | featureDepth | 1h | 33.2 | Single build-script add; zero page changes |
| 1c | forge-window-naming | ux | 1h | 39.6 | propagate-nav.mjs pass; batches with 1b |
| 1d | command-palette-query-cache | speed | 1h | 45.6 | Single-file JS edit; localStorage only |
| 2a | returning-visitor-achievement-nudge | ux | 2h | 61.3 | Extends existing digest.js |
| 2b | oracle-query-learning-loop | ai | 2h | 24.0 | New script; establishes oracle-insights.json before oracle-proactive uses it |
| 3a | oracle-proactive-contextual | ux | 4h | 69.8 | Top-priority; depends on ignis-answer-engine.js context |
| 3b | vault-kinesis-ship-pulse | ux | 4h | 61.0 | New asset; shares ambient-loader pattern with 3a |
| 4a | tt-named-policy-wave | security | 4h | 24.4 | Security; independent; fixes blocking TT sinks |
| 4b | ambient-split-wave4 | speed | 2h | 24.0 | Extends ambient-loader; same context as 3b |
| 4c | geo-vitals-sample-accelerator | speed | 2h | 35.0 | probe-uptime.mjs extension |
| 5 | progressive-membership-unlock | gamification | 8h | 48.2 | Largest; deferred if context budget exhausted |

## Success bar
- Any page change: Lighthouse Performance ≥90 on mobile (or note exception)
- `npm run build:check` green after each wave
- No new console errors

---

# Previous Plan — S182 Audit

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
