# S332 Codex memory

- `refresh-live-data` producers that require a CLI mode must declare it in `scripts/lib/build-order.mjs`; `build-news-desk.mjs` uses `args: ['--rebuild']`.
- Treat canonical destination 401/5xx/timeouts as unknown, never pass or hard-dead; only two 404/410 observations fail.
- The current candidate root is `1cf0a6f41aad`; the exact staging receipt before final closeout write-back is `08a7134c6caf2e8c06ef1a3b` at continuity depth 55.
- Production promotion may proceed only through the scoped resolver; the Obelisk RP/passkey hold remains true for identity/auth surfaces.
