# scripts/ops/ - website-local command registry

This repo installs the Studio OS runtime commands needed by
`docs/SESSION_PROTOCOL.md` for local start, go preflight, and closeout work.
Portfolio-wide Studio Ops commands remain in `vaultspark-studio-ops` and are
intentionally not advertised by this website repo.

## Structure

```
scripts/ops/index.mjs  - command metadata consumed by scripts/ops.mjs
scripts/ops.mjs        - thin dispatcher and help surface
```

Run:

```bash
node scripts/ops.mjs help
```

The registry must stay truthful: add a command only when the target script is
present in this repo and safe to run from the website root.
