# Release platform parity

## Desk correspondent profiles — 2026-09-30

PR #132 merged as `91116c423`. Eight fictional correspondent profiles, portraits and marks are live through the 147-path content-only Pages run `36791903046`. The scope included all 124 paths from the previous live Desk overlay so the baseline reconstruction did not roll them back. Every released path matched canonical staging and the public Pages origin byte for byte; REX, VERA and MICA returned 200 on the canonical domain. The full-site identity/provider gate remained held.

The local mobile browser audit passed 215/215 cases across phone and tablet sizes with zero P0/P1 findings. The 70 profile/news/article captures across seven themes and desktop/mobile widths were manually reviewed and hash-bound. Hosted E2E/compliance, accessibility, Lighthouse and a refreshed Linux visual-regression comparison passed. No native app applies to this website. Staging `/_health` returned 200; the scoped static release did not change the sign-in or membership flows.

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

The article/static candidate is scoped away from the standing identity and Worker identity holds. Staging, browser parity, Lighthouse, E2E, and compliance passed. Production content-lane workflow `36631405999` overlaid 385 content-pure paths on baseline `353c8e17d98a6b75413ac01a209f51cbbcfa0b06`; 375 paths remained withheld. The live Pages metadata names head `c46f22fa36d52901e505f2a99433cef9276fbbd0`, and the public article returns 200 with story, sources, then illustration. Identity remains held.

## Daily Desk follow-through — 2026-09-29 late-night edition

The four scheduled Desk slots completed successfully, and the source homepage acquired the late-night OpenAI lead. After repairing the publisher's art-to-placeholder order, the corrected tree passed 505/505 locally and hosted E2E/compliance; a fresh Lighthouse local run passed. Canonical staging's scoped content deploy verified exact News article, feed, and claim bytes, then visibly served the new homepage lead. Production content-lane run `36648112113` promoted 125 content-pure paths over the held baseline. Live Pages metadata names content head `90a79ff6a7afabf966efa8a0bd03bd2facb15314`; the canonical homepage, News index, and article serve the late-night edition. Automated daily live promotion is not enabled: the existing explicit confirmation gate and staging credential boundary remain in force.

## Spark / Vault Compass — staging acceptance, 2026-10-06

The candidate replaces both automatic corner guides with one explicitly opened Compass. Canonical staging receipt 11b597d33ca6b527bd7833e1 serves the replacement constellation tracker under its content-addressed URL, preserving stored achievements. The staged Spark suite passed 10/10 cases, including returning-visitor guide absence and the MindFrame launch domain. The local mobile suite passed 215/215.

All 140 final Compass captures were manually inspected across seven themes, desktop 1366 and mobile 390 pixels; LATEST.json binds them to the captured source. SPARK_PARITY.json separately records tested widths 360, 390, 414, 768 and landscape 844×390, plus the 28 reviewed entry/bridge images. Map, list, mixing, saving, closing and scroll restoration passed without horizontal overflow. Reduced motion and still preferences were exercised; no measured frame-rate claim is made.

The staging release ceremony passed 11/11 checks. Three browser cases executed and passed; three identity cases remain explicitly held. All 15 attention checks executed and passed. This static discovery change does not clear the standing identity release hold. Native app parity is not applicable to this responsive website. Production promotion and its actual served revision remain pending. Staging rollback: /opt/studio/staging/website/.rollback/20261006065247.

Spark explicit opening latency: three cold samples 182/249/141ms; three warm samples 54ms each, measured in unthrottled headless Chromium at 390×844 on staging. One cold sample exceeded the proposed 200ms target. Locator overhead is included; representative-device and field latency are unmeasured. Added deferred payload: JavaScript 7,578 gzip bytes and CSS 3,942 gzip bytes; zero runtime model calls.

Prior visual review receipt preserved byte-for-byte in `docs/visual-qa/PRE_SPARK_S368.json` (SHA-256 d0486c8b9f638093571adf282caa4ebaa1baa2903e381d722c7c48a350eaf1cf, 150281 bytes). The latest review pointer now covers the selected Spark matrix; replacement of that generated pointer is intentional and does not delete prior review history.


Spark final accessibility correction: hosted axe found a labeled generic feedback container on the Journal/Changelog destination. Adding role=group passed all 20 current local public-page accessibility tests. Fourteen actual before/after screenshot pairs across seven themes at 1366/390px are byte-identical; representative dark desktop and light mobile images were inspected (SPARK_JOURNAL_ROLE.json). A separate local test unintentionally used the default production origin: 22 passed, one authenticated legacy portal test failed on a hidden footer link. That production identity surface remains held and is outside the content promotion; it is not counted as passing current-source evidence. Linux baseline capture workflow 37439049787 succeeded against canonical staging; 56 changed Linux reference images were retained for the intentional shell change.


## S371 release maintenance — verified, 2026-10-09

Candidate `f50960d2156091769e7922e0ac8904b22b65c516` (tag release-S371-f50960d21) is verified live through Pages run `37981014146`. All three exact-candidate required checks passed: e2e.yml 37978505492, lighthouse.yml 37978505511, accessibility.yml 37978505521. Earlier Lighthouse failures and the predeployment provenance-expiry failure remain recorded. Fresh production Worker provenance matched 9/9. Canonical staging 20261009191141 verified 562 overlays and 3 safe removals.

Production metadata and ten served artifacts match the pinned candidate after removing documented edge nonce attributes and the exact recognized Cloudflare JSD append. The regular cached article CSS URL also matches. Production Spark passed 11/11. Eight live article cases passed source focus, keyboard navigation, back-scroll and print checks; desktop/mobile dark/light inspection passed. Browser Find matched related-title text, but initial result visibility is a preexisting limitation also reproduced without the optimization; it is not claimed passing.

Local checks passed 531/531, refreshed mobile probes 215/215, and reviewed article captures 168/168; the initial 84 maintenance captures remain retained. Doctor: zero blocking findings and 3 advisories. The required render repair measured a 17% median local text-LCP improvement; field performance and conversion remain unmeasured. Identity holds remain unchanged. Production retains retired baseline hashed assets while current references resolve to the new exact bytes.

Rollback: previous Pages run 37807641227 and content head ee8db4f7fcb72857f3ba7401efd2bb19cca7658c; staging snapshot 20261009191141. Windows producer bootstrap passed 39/39 with original target bytes backed up locally.

Native app parity: not applicable to this responsive website.


## S371 closing follow-through verified — 2026-10-09

Closing candidate `9b105d275e2f32cabe6ca2597205b6aebbd963cb` (tag `release-S371-9b105d275`) is verified live through Pages run `37986968939`. Required exact-candidate checks passed: E2E/compliance 37985123589, accessibility 37985123779, and Lighthouse 37985123593 including staging. Staging snapshot 20261009201032 verified 562 overlays and three safe removals. Fourteen staging artifacts matched the candidate.

Production metadata and fourteen served artifacts match the candidate after documented edge transforms. The normal cached article CSS and four normal public-feed URLs also match. Reviewed HTML and browser assets are preserved, with only the shell-manifest timestamp changed. All three bound sources and 168 screenshot hashes were independently verified unchanged before metadata-only rebinding; original capture and review dates remain. The earlier closing E2E failure 37983977935 is retained.

Canonical closeout completed with two full 531-step passes. Corrected native proof closure passed 92/92 blocking checks across 109 commands. Earlier 215 mobile probes and 168 reviewed article captures retain their actual observation dates. Live Spark passed 11/11 after the closing promotion. Initial browser Find positioning remains a documented preexisting limitation; identity holds remain unchanged.

The owner's original dirty checkout, local backups and private evidence are preserved. Retained temporary preview, capture and verification handles completed, and port 4175 no longer listens. Field performance and conversion remain unmeasured.
