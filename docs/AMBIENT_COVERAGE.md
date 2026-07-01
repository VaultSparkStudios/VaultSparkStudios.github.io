<!-- generated-by: scripts/report-ambient-coverage.mjs -->
<!-- generated-at: 2026-07-01 -->

# Ambient Bundle — Activation Shape Report

> STATIC activation-shape analysis (not a runtime execution trace). Identifies
> which always-shipped ambient modules gate their own work behind a runtime
> condition — the shortlist for a future conditional/lazy split. Runtime
> confirmation via the Playwright harness is the follow-up step.

- Sources: **17**  ·  Total: **71.0 KB** (raw)
- Guarded (conditional): **13** modules · **58.3 KB** — split candidates
- Always-on: **4** modules · **12.7 KB**

## By size (split candidates flagged)

| Source | Size | Shape | Why conditional |
|---|--:|:-:|---|
| `ambient-loader.js` | 18.5 KB | 🔶 guarded | query-param gated, viewport gated, session gated |
| `adaptive-speculation.js` | 5.2 KB | 🔶 guarded | — |
| `breadcrumb-render.js` | 4.7 KB | always | — |
| `signed-in-state.js` | 4.7 KB | 🔶 guarded | session gated |
| `vault-atlas.js` | 4.4 KB | 🔶 guarded | — |
| `page-sigil.js` | 4.4 KB | 🔶 guarded | — |
| `scroll-depth.js` | 4.1 KB | always | — |
| `edge-swipe-nav.js` | 3.8 KB | 🔶 guarded | capability gated |
| `native-feel.js` | 3.3 KB | 🔶 guarded | viewport gated, capability gated |
| `hover-prefetch.js` | 3.3 KB | 🔶 guarded | viewport gated, session gated, capability gated |
| `command-palette-loader.js` | 3.0 KB | always | — |
| `pointerdown-warm.js` | 2.4 KB | 🔶 guarded | — |
| `tt-default-policy.js` | 2.1 KB | 🔶 guarded | — |
| `rum-beacon.js` | 2.1 KB | 🔶 guarded | — |
| `account-chip-loader.js` | 2.0 KB | 🔶 guarded | session gated |
| `founder-presence-handle.js` | 2.0 KB | 🔶 guarded | — |
| `scroll-reveal.js` | 0.8 KB | always | — |

## Read

A 🔶 guarded module ships to every page but only executes under its condition
(a query param, a viewport, a session, an element). The largest guarded modules
are the highest-value candidates to move behind a conditional `import()` so the
cold-bundle parse cost drops for visitors who never trigger them.
