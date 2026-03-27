# Codex Handoff — 2026-03-12

## Repo
- Name: `VaultSparkStudios.github.io`
- Remote: `https://github.com/VaultSparkStudios/VaultSparkStudios.github.io.git`

## Studio-wide deployment status
- All studio standards and deployment docs are current and accurate.
- `AGENTS.md` and `STUDIO_DEPLOYMENT_STANDARD.md` reflect the live game roster.
- No homepage or card changes made this session (call-of-doodie card already live and correct).

## Call of Doodie — sessions 3 + 4 summary

The call-of-doodie game repo completed two major feature sessions since the last
studio handoff (2026-03-10). All work is committed and deployed to GitHub Pages.

### Session 3 features (commit 354ac68)
- Boss unique mechanics: Mega Karen charge attack + phase 2 spread shot; Landlord tenant summoning
- 3 LCG-seeded daily missions per day with in-game tracking and localStorage persistence
- Meta-progression: career points (1/kill), 6 permanent per-run bonuses (cod-meta-v1)
- Cursed perks: 6 high-risk/high-reward options with 35% chance to appear
- MenuScreen: Daily Missions and Meta Upgrades modals; career points balance in Career Stats

### Session 4 features (commit 36f4081)
- 2 new weapons: Sniper-ator 3000, Spicy Squirt Gun
- 3 new enemy types: Shield Guy (frontal damage reduction), YOLO Bomber (kamikaze), Sergeant Karen (aura buffs nearby enemies)
- 6 arena obstacles per run (block player, player bullets, and enemy bullets)
- Death animations: enemies float and fade on kill instead of instant removal
- Arena border with pulsing glow and corner accents
- 2 synergy perks: Bloodlust (bonus with Vampire), Turbo Boots (bonus with Adrenaline)
- 4 starter loadouts: Standard Issue, Glass Cannon, Iron Tank, Speed Freak
- Personal best highlights mid-run
- Meta upgrades toast at run start
- Perk countdown in HUD ("Perk in 2 lvls" / "PERK NOW!")
- Auto-aim toggle fixed to opt-in (was always-on bug)

### Studio compliance work (commit 606b1f2)
- Created `AGENTS.md` in call-of-doodie repo (per studio standard — was missing)
- Created `CODEX_HANDOFF_2026-03-12.md` in call-of-doodie repo (replaces legacy `HANDOFF.md`)

## Game roster current state

| Game | Repo | Status | Public URL |
|------|------|--------|------------|
| Call of Doodie | `call-of-doodie` | Playable Prototype | `https://vaultsparkstudios.com/call-of-doodie/` |
| VaultSpark Football GM | `vaultspark-football-gm` | Client Beta | `https://vaultsparkstudios.com/vaultspark-football-gm/` |
| Solara | `solara` | In Development | — |
| VaultFront | `vaultfront` | In Development | — |

## Next required studio-side actions
- Before any future homepage/card edit: fetch latest remote and verify live `index.html` first.
- Consider updating call-of-doodie card status from "Playable Prototype" to "Early Access" once the feature set stabilizes.
- call-of-doodie has no backend — `play-` and `api-` origins are reserved but idle.
