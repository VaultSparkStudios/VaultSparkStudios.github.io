# Obelisk Edge Personalization Plan

Public shell personalization waits for the Obelisk Phase 2 session contract. The current safe implementation is the local persisted-session bridge in `assets/signed-in-state.js` plus the lazy `assets/account-chip-loader.js`.

## Edge Contract

- Input: short-lived Obelisk session cookie with no raw secret material exposed to HTML.
- Worker action: stamp `body[data-vs-signed-in]`, `body[data-vs-tier]`, and minimal account-shell hints.
- HTMLRewriter scope: nav CTAs, account chip placeholder, membership journey stage.
- Non-goals: no database reads in the Worker, no private member data in static HTML, no CSP relaxation.

## Rollout

1. Obelisk publishes stable cookie/session shape.
2. Worker adds report-only personalization header and no-op HTMLRewriter telemetry.
3. `/privacy/` or `/membership/` gets the first canary.
4. If RUM/console/error telemetry stays clean, graduate to all public shell pages.

## Rollback

Disable the Worker personalization flag. Client-side `signed-in-state.js` and `account-chip-loader.js` remain the fallback.
