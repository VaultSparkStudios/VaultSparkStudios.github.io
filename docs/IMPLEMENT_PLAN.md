# Implement Plan — S268

Source audit: `docs/AUDIT_2026-07-08-S268.md`

## Execution Order

1. **CANON-041 mobile parity attestation** — shipped first because the local mobile contracts already existed and the missing source-of-truth artifact caused a false release-gate unknown.
2. **Worker deploy token-scope contract** — shipped second because it turns the live CF Worker deploy red into a local pre-push/documentation gate tied to the actual `wrangler.toml` binding.

## Results

- `context/MOBILE_PARITY.md` added and `PROJECT_STATUS.mobileParity` set true with evidence commands.
- `scripts/check-worker-deploy-token-scope.mjs` added and wired into `build:check`.
- `.github/workflows/cloudflare-worker-deploy.yml` now documents the R2 bucket permission required by the production Worker binding.
