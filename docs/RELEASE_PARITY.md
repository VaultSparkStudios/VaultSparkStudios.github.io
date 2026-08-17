# Release platform parity

Observed: 2026-08-16

Candidate: `56dbd80efdf40f794555ae9672264917ec4f2c3b`
Canonical staging: `https://website.staging.vaultsparkstudios.com`

## Browser surfaces

Desktop and mobile browser surfaces are at feature parity for this website release.

- The blocking runtime matrix passed 235/235 checks across 47 routes and five mobile viewports.
- The canonical staging release browser passed 6/6 scenarios, including the mobile drawer and all themes.
- CANON-053 visual evidence covers the three changed Rank Projector surfaces at 360, 390, and 430 pixels across all seven themes: 63/63 captures manually reviewed.
- Touch-target and runtime findings contain zero P0/P1 failures.
- Auxiliary headless measurements on staging observed LCP 424 ms / CLS 0.0138 at 1440 px and LCP 508 ms / CLS 0.0225 at 390 px. The Chrome DevTools performance audit was unavailable, so that distinct check remains recorded as skipped, not passed.

## Native/mobile app

Not applicable. This project ships a responsive public website and does not expose a separate native application surface.

## Release disposition

Platform parity passes. This does not override the independent production-promotion interlock: production remains held until the real-provider Obelisk journey and release dependencies are verified.
