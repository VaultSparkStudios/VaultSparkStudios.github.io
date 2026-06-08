<!-- generated-by: scripts/build-ark-signature-dossier.mjs -->
<!-- generated-at: 2026-06-08 -->

# Ark Signature Failure Dossier

Ark drain is restored, but signature failures mean some cross-repo cargo cannot be trusted or applied. This dossier is public-safe: IDs, producers, cargo types, and repair recommendations only.

| Cargo id | Producer | Type | Error | Observed |
|---|---|---|---|---|
| `01JQ7IHRB203462A9CEB553339` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.047Z |
| `01JQ7NMS6UC09DAC5A1F480EC7` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.050Z |
| `01JQ81DUUGAB4D9AAFCA86A4C8` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.052Z |
| `01JQAM72190FE3E53A1B0BD420` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.053Z |
| `01JQCICHT84D1C93ABFA2815B5` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.054Z |
| `01JQCJJ6UJ58823FD3FA2F87F9` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.055Z |
| `01JQCJTVLQ6F05216E5DEF7C2A` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.056Z |
| `01JQCRN04845C357EFA1432730` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.058Z |
| `01JQCRSC077D12D04C9643D8A5` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.059Z |
| `01JQCSJ3GAF0C1159B2E93303E` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.060Z |
| `01JQCTOARQA66B83C9C4C5A111` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.061Z |
| `01JQCU0K94E50C7AFDEDB892E1` | vaultspark-studio-ops | port-online | sig mismatch | 2026-06-07T17:50:10.062Z |

## Recommended Studio-Ops Repair

- Verify producer key material for `vaultspark-studio-ops` versus `studio-ops` naming.
- Re-sign or re-emit the failed `port-online` cargo after key normalization.
- Keep website-side Ark drain enabled; do not bypass signature checks locally.
