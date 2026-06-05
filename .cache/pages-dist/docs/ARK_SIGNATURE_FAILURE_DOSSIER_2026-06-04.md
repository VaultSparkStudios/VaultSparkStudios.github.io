<!-- generated-by: scripts/build-ark-signature-dossier.mjs -->
<!-- generated-at: 2026-06-05 -->

# Ark Signature Failure Dossier

Ark drain is restored, but signature failures mean some cross-repo cargo cannot be trusted or applied. This dossier is public-safe: IDs, producers, cargo types, and repair recommendations only.

| Cargo id | Producer | Type | Error | Observed |
|---|---|---|---|---|
| `01JQ7IHRB203462A9CEB553339` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-05T02:25:28.383Z |
| `01JQ7NMS6UC09DAC5A1F480EC7` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-05T02:25:28.386Z |
| `01JQ81DUUGAB4D9AAFCA86A4C8` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-05T02:25:28.388Z |
| `01JQAM72190FE3E53A1B0BD420` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-05T02:25:28.389Z |

## Recommended Studio-Ops Repair

- Verify producer key material for `vaultspark-studio-ops` versus `studio-ops` naming.
- Re-sign or re-emit the failed `port-online` cargo after key normalization.
- Keep website-side Ark drain enabled; do not bypass signature checks locally.
