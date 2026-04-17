# Local Verify Contract

Last updated: 2026-04-17 (S90 — HTTP smoke pre-gate wired into CI)

`scripts/run-local-browser-verify.mjs` is the supported browser-check entrypoint for unshipped work in this repo. It always:

1. runs `npm run build`
2. starts the local preview server
3. runs Playwright against the local preview URL, not production
4. uses Chromium only unless you explicitly bypass the wrapper

## Commands

- `npm run smoke:http`
  - **No-browser fallback.** Fetches 12 key URLs with Node.js HTTP and checks status codes + content strings. Start the preview server first (`node scripts/local-preview-server.mjs &`). Use when Playwright process spawn hangs or times out. Passes in ~3s.
- `npm run verify:local`
  - Default `core` tier.
- `node scripts/run-local-browser-verify.mjs --tier intelligence`
  - Focused confidence run for homepage shell + shared intelligence surfaces.
- `npm run verify:local:extended`
  - Broader Chromium suite for pre-closeout confidence.
- `node scripts/run-local-browser-verify.mjs tests/some.spec.js`
  - Targeted ad hoc run. The wrapper still builds and serves locally first.

## Tier contract

- `http` (no-browser fallback — `npm run smoke:http`)
  - Use when Playwright fails to spawn or hangs. Covers: `/`, `/games/`, `/community/`, `/leaderboards/`, `/membership/`, `/vaultsparked/`, `/ranks/`, `/studio-pulse/`, `/vault-wall/`, `/api/public-intelligence.json`, `/manifest.json`, `/sw.js`.
  - Does NOT validate CSS, JS execution, screenshots, interactive behaviour, or a11y.
  - Prerequisite: start `scripts/local-preview-server.mjs` first.
  - **CI integration:** `npm run smoke:http` runs automatically as "HTTP smoke pre-gate" in both the compliance and e2e jobs (`.github/workflows/e2e.yml`), after `wait-on` connectivity and before browser tests. A content-level failure here aborts the browser suite fast.
- `intelligence`
  - Use when the session mainly touched homepage shell, trust/telemetry/pathway surfaces, or other public-intelligence modules.
  - Current scope: `computed-styles`, `homepage-hero-regression`, `intelligence-surfaces`, `micro-feedback`, `vaultsparked-csp`.
- `core`
  - Use for the default local confidence pass on common public-site work.
  - Current scope: `computed-styles`, `compliance-pages`, `homepage-hero-regression`, `micro-feedback`, `navigation`, `pages`, `vaultsparked-csp`, `intelligence-surfaces`.
- `extended`
  - Use before closeout when broader browser confidence matters.
  - Adds game, screenshot, responsive, and vault-wall coverage on top of the shared public-site checks.

## Worker policy

The wrapper intentionally does not maximize parallelism:

- `intelligence` defaults to `--workers=2`
- `core` defaults to `--workers=3`
- `extended` defaults to `--workers=2`
- targeted spec runs default to `--workers=2`

This is deliberate. Session 78 proved that lower worker pressure is the reliable local contract on this machine. Do not raise workers casually just to make one run faster; the goal is repeatable signal, not peak concurrency.

## Override rules

- If you need a different worker count, pass Playwright `--workers=<n>` explicitly.
- If you need another browser/project, run Playwright directly and treat that as an exception path, not the default repo contract.
- If the session changed build-time assets or shared shell references, run `npm run build:check` alongside the local verify tier.

## Recommended usage

- Browser won't spawn / hangs:
  - `node scripts/local-preview-server.mjs & npm run smoke:http`
- Shared shell or homepage work:
  - `node scripts/run-local-browser-verify.mjs --tier intelligence`
- Typical public-page/runtime work:
  - `npm run verify:local`
- Broad release-confidence check before closeout:
  - `npm run verify:local:extended`
