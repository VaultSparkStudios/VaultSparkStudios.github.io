# Proposal — FORGE / SPARKED / VAULTED redefinition and the SPARKED launch gate

**From:** vaultsparkstudios-website · S367 · 2026-10-01
**Founder direction (verbatim intent):** FORGE covers everything in development, unannounced, or in beta. SPARKED is anything finalized and announced: out of beta, with occasional big updates rather than constant development. The SPARKED gate must emphasize getting users and announcing publicly on social media, with release content and a consistent posting setup.
**Owner:** studio-ops (Designer/Mechanizer under CANON-022). This repo only proposes; canon and `scripts/lib/ladder.mjs` change in studio-ops.
**Amends:** CANON-052 (ladder), its S294 `SB` amendment, and CANON-033 (announcement discipline).

## Why the current ladder conflicts with the direction

| Current stage | Brand word today | Problem against the new definition |
|---|---|---|
| `SB` public beta | SPARKED · BETA | Beta is explicitly FORGE in the new definition. |
| `S0` soft-live | SPARKED | Unannounced is FORGE. S0 lets a silent launch wear SPARKED for 14 days. |
| `F2` deployed-dark | FORGE | Correct. |
| `S1` announced | SPARKED | Correct, but "announced" today needs only one channel and one link (CANON-033 minimum). |

The S367 audit found the live symptom. Call of Doodie, PromoGrind and Velaxis are deployed and playable or usable, and the website labelled them SPARKED through a "deployed on our domain means SPARKED" heuristic. Canon labelled them FORGE. Under the new definition canon is right, and the heuristic has been removed.

## Proposed ladder

The brand vocabulary stays three words. The position stays in `ladderStage`.

### FORGE: not yet finished-and-announced
| Stage | Display | Meaning | Entry |
|---|---|---|---|
| `F0` | FORGE · CONCEPT | Registry entry only | — |
| `F1` | FORGE | Repo and Studio OS, building | auto |
| `F2` | FORGE · PREVIEW | Live URL, not promoted | auto |
| `FB` | **FORGE · BETA** | Publicly promoted and explicitly provisional. Gathers users and feedback. Replaces `SB`. | founder-go (public act) |
| `F3` | FORGE · LAUNCH-READY | Product gate green **and launch kit staged** (see below) | gate |

`FB` keeps everything the S294 `SB` amendment got right: the 90-day `BETA_MAX_DAYS` cap, and the rule that beta relaxes completeness only, never care (secrets, hardening, branding, privacy/terms, cost neutrality, theme readability and mobile parity all still apply). Only the brand word changes, to FORGE.

### SPARKED: finished, announced, supported
| Stage | Display | Meaning | Entry |
|---|---|---|---|
| `S1` | SPARKED | **Launched.** Out of beta, launch kit executed, cadence armed | `F3→S1` with `--founder-go --announce-ref` |
| `S2` | SPARKED | **Growing.** 30 days of held posting cadence plus a measured user trend | gate |
| `S3` | SPARKED | **Steady.** Maintained; ships occasional major versioned updates, each with a mini launch kit | gate |

**`S0` is retired.** A project that is live but not announced is `F2` or `FB`. "Discovering you shipped early" maps to `FB`.

### VAULTED: unchanged edges, plus a public notice
`V0` paused (revivable through the gate) and `V1` archived (terminal). Add one requirement to the existing teardown checklist: a **public status note** on the project page and the studio site, plus a user notice to existing accounts. A vaulted product must never look abandoned.

## The SPARKED launch gate (`F3→S1`, `FB→S1`)

The deterministic plane checks each item. Judgment agents review. Only the founder approves (CANON-024: agents never approve launches).

1. **Out-of-beta product bar.** Existing release stack green (CANON-007/029/034/041/047/051/053). Zero open P0/P1. Core loop complete. Onboarding verified end to end, **including a real new-user signup in a clean browser**. The website's invite-only Obelisk door found in S367 would fail this check.
2. **Launch kit staged** (`docs/launch/<slug>/`):
   - one-line value proposition and a 50-word description (CANON-030 acronyms spelled out)
   - launch page or updated project page, press kit (screenshots, trailer or clip, logo, facts sheet) and changelog/release note
   - per-channel release posts drafted from `generate-announcement.mjs` (X, Reddit/community, Vorn feed, Bluesky/Threads where the account exists), with media attached
   - newsletter edition (The Dispatch) and a Desk story slot
3. **Announcement executed.** `--announce-ref` must list **at least 3 public URLs** across at least 2 distinct channel types: an owned social account, an external community or directory, and owned media (newsletter/Desk/site). One link is no longer enough.
4. **Consistent posting cadence armed.** A 30-day post-launch content calendar in the registry (`launchCadence: { channels, postsPerWeek, startsAt }`), with a minimum of **2 posts/week on the primary channel**, scheduled or queued through the existing post pipeline (`post-announcement.mjs` / `announce-via-vorn-loop.mjs`). A doctor probe (`launch-cadence`) compares actual posts with the promise and reports a miss as a finding, never an auto-demotion.
5. **User acquisition instrumented.** Signup/activation funnel live, CANON-054 stats tile and `/stats` live, a declared 30-day target (users or activations), and a scheduled 30-day review. Zero is a legitimate published value.

### `S1→S2` (growing)
The 30-day cadence was held (probe green), the 30-day review is recorded, and the user trend is measured (not necessarily up, but measured).

### `S2→S3` (steady) and major updates
The project moves to a versioned major-update rhythm. Each major update (`vN.0`) ships a **mini launch kit**: a release post on every primary channel, a changelog entry, a newsletter mention and refreshed press-kit media. Minor updates need only a changelog entry.

## Mechanization asks (studio-ops)
- `scripts/lib/ladder.mjs`: rename `SB` to `FB` with `STAGE_VAULT.FB = 'forge'`; drop `S0`; add `S3`; update `EDGES` and `LAUNCH_CLASS_EDGES` (`F3→S1`, `FB→S1`, `F3→FB`, `FB→F3`, `FB→V0`, `S1→S2`, `S2→S3`, `S*→V0`).
- `set-vault-status.mjs`: `--announce-ref` requires ≥3 URLs across ≥2 channel types; new `--launch-kit <dir>` existence check; writes `launchedAt` and `launchCadence`.
- New doctor probes: `launch-cadence` (posting promise versus actual) and `launch-kit` (staged artifacts present before `F3`).
- Migration: current `SB` projects become `FB`; current `S0` projects become `F2`/`FB` by founder pick; registry `vaultStatus` is re-derived. Sibling sites (including this website) re-render from canon.
- Public vocabulary: the website publishes a short "What FORGE / SPARKED / VAULTED mean" explainer once ratified, generated from `STAGE_DISPLAY`.

## Website-side changes already made (S367)
- The catalog builder no longer overrides canon ("self-hosted means SPARKED" removed).
- Call of Doodie, PromoGrind and Velaxis now read FORGE on the website, matching canon.
