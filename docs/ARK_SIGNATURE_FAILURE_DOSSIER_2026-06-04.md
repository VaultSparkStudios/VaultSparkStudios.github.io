<!-- generated-by: scripts/build-ark-signature-dossier.mjs -->
<!-- generated-at: 2026-06-05 -->

# Ark Signature Failure Dossier

Ark drain is restored, but signature failures mean some cross-repo cargo cannot be trusted or applied. This dossier is public-safe: IDs, producers, cargo types, and repair recommendations only.

| Cargo id | Producer | Type | Error | Observed |
|---|---|---|---|---|
| `01JPM3ODST22BBBD3C4DB1FEB4` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-03T21:29:13.176Z |
| `01JPM40RJC0FF446AB55AAD18D` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-03T21:29:13.178Z |
| `01JQ7IHRB203462A9CEB553339` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-03T21:29:13.179Z |

## Recommended Studio-Ops Repair

- Verify producer key material for `vaultspark-studio-ops` versus `studio-ops` naming.
- Re-sign or re-emit the failed `port-online` cargo after key normalization.
- Keep website-side Ark drain enabled; do not bypass signature checks locally.
