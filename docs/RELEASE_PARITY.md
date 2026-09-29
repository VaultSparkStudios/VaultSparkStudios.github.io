# Release platform parity

Observed: 2026-09-29

Candidate: `091481ba5625ac844d21dfa6416b9ddd95bceb49`
Receipt: `eb48a702c8d5cf87b330e334` · 7,622 files · continuity depth 87
Canonical staging: `https://website.staging.vaultsparkstudios.com`

## Browser surfaces

The article layout and site navigation remain usable on desktop and mobile browsers.

- The local mobile runtime matrix passed 215/215 checks across phone and tablet viewports.
- CANON-053 evidence contains 168 hash-bound captures across seven themes and desktop/mobile widths; all were visually reviewed. Article top and illustration-anchor states were inspected after moving the illustration below the story and sources.
- The staging release ceremony passed 11/11 checks: 3/3 executed browser cases passed, 3 identity cases stayed explicitly held, and the attention suite passed 15/15.
- Staging parity reports no missing routes; 23 news routes are ahead of production. The staged receipt and ledger were verified from the served origin.
- Hosted Lighthouse passed both the local preview floor and the staging run (run `36629194379`); hosted E2E and compliance both passed (run `36629194109`). The article's 0.90 performance floor was unchanged.

The canonical `responsive-audit.mjs` returned an explicit SKIP because its Playwright dependency was unavailable in that invocation. The repository's separate 215-case mobile audit and visual captures provide the measured browser evidence above; the skip is not counted as a pass.

## Native/mobile app

Not applicable. This project ships a responsive public website without a separate native app.

## Release disposition

The article/static candidate is scoped away from the standing identity and Worker identity holds. Staging, browser parity, Lighthouse, E2E, and compliance pass. Production promotion uses the content-pure lane; identity remains held.
