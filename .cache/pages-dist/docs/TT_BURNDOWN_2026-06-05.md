<!-- generated-by: scripts/analyze-tt-violations.mjs -->
<!-- generated-at: 2026-06-05 -->

# Trusted Types Violation Burndown

> 80 sampled report(s) over last 30 day(s) · clustered by sourceFile:line.
> Parse-blind rows predate the S174 intake fix and age out with the KV TTL.

| Cluster | Count | Days seen | Sink/sample evidence |
|---|---:|---|---|
| `https://vaultsparkstudios.com/journal/dispatches/:364` | 30 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/home-idle-loader.js:16` | 8 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `PARSE-BLIND (pre-fix intake rows — no fields survived normalization)` | 7 | 2026-06-03, 2026-06-04, 2026-06-05 | — |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:2362` | 3 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:2862` | 3 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:978` | 3 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/nav-toggle.shell-96581b1d55.js:27` | 2 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/:15` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/theme-toggle.shell-b970c26bd9.js:394` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/vault-pulse.js:131` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/sentry-init.js:4` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/schema-injector.js:23` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/related-content.js:256` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:1359` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/home-dynamic-hero.js:54` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/recent-ships.js:42` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/trust-depth.js:207` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/vault-cta.js:39` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/studio-milestones.js:72` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:2440` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/hero-ticker.js:60` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/heartbeat.js:144` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/heartbeat.js:107` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:673` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:703` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/nervous-system/:47` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/nervous-system/:43` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/nervous-system/:46` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/journal/dispatches/:6` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/journal/dispatches/:356` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/dispatch-voice.js:96` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |

## Next actions

- Fix the named sinks above (largest cluster first), redeploy, and rerun `node scripts/probe-tt-soak.mjs`.
- Enforce canary stays gated until clusters read ~0 (S173 ladder decision).
