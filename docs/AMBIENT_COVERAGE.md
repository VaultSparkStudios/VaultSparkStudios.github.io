<!-- generated-by: scripts/report-ambient-coverage.mjs -->
<!-- generated-at: 2026-09-18 -->

# Ambient Bundle — Activation Shape Report

> STATIC activation-shape analysis (not a runtime execution trace). Identifies
> which always-shipped ambient modules gate their own work behind a runtime
> condition — the shortlist for a future conditional/lazy split. Runtime
> confirmation via the Playwright harness is the follow-up step.

- Sources: **16**  ·  Total: **83.8 KB** (raw)
- Guarded (conditional): **13** modules · **72.9 KB** — split candidates
- Always-on: **3** modules · **10.9 KB**

## By size (split candidates flagged)

| Source | Size | Shape | Why conditional |
|---|--:|:-:|---|
| `ambient-loader.js` | 27.0 KB | 🔶 guarded | session gated |
| `page-sigil.js` | 7.9 KB | 🔶 guarded | — |
| `signed-in-state.js` | 6.6 KB | 🔶 guarded | session gated |
| `adaptive-speculation.js` | 5.5 KB | 🔶 guarded | — |
| `breadcrumb-render.js` | 5.5 KB | always | — |
| `native-feel.js` | 4.6 KB | 🔶 guarded | viewport gated, capability gated |
| `vault-atlas.js` | 4.2 KB | 🔶 guarded | — |
| `edge-swipe-nav.js` | 3.8 KB | 🔶 guarded | capability gated |
| `command-palette-loader.js` | 3.4 KB | always | — |
| `hover-prefetch.js` | 3.2 KB | 🔶 guarded | viewport gated, session gated, capability gated |
| `rum-beacon.js` | 3.0 KB | 🔶 guarded | — |
| `pointerdown-warm.js` | 2.4 KB | 🔶 guarded | — |
| `scroll-depth.js` | 2.0 KB | always | — |
| `tt-default-policy.js` | 2.0 KB | 🔶 guarded | — |
| `account-chip-loader.js` | 1.5 KB | 🔶 guarded | session gated |
| `scroll-reveal.js` | 1.2 KB | 🔶 guarded | viewport gated |

## Read

A 🔶 guarded module ships to every page but only executes under its condition
(a query param, a viewport, a session, an element). The largest guarded modules
are the highest-value candidates to move behind a conditional `import()` so the
cold-bundle parse cost drops for visitors who never trigger them.
