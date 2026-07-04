<!-- generated-by: scripts/analyze-tt-violations.mjs -->
<!-- generated-at: 2026-07-04 -->

# Trusted Types Violation Burndown

> 453 sampled report(s) over last 30 day(s) · clustered by sourceFile:line.
> Parse-blind rows predate the S174 intake fix and age out with the KV TTL.

| Cluster | Count | Days seen | Sink/sample evidence |
|---|---:|---|---|
| `https://vaultsparkstudios.com/assets/schema-injector.js:26` | 122 | 2026-06-12, 2026-06-13, 2026-06-14, 2026-06-16, 2026-06-17, 2026-06-18, 2026-06-19, 2026-06-20, 2026-06-21, 2026-06-22, 2026-06-23, 2026-06-24 | `HTMLScriptElement text|{"@context":"https://schema.org","@type"` |
| `https://vaultsparkstudios.com/assets/schema-injector.js:23` | 35 | 2026-06-04, 2026-06-07, 2026-06-09, 2026-06-10, 2026-06-11, 2026-06-12, 2026-06-13, 2026-06-14, 2026-06-15, 2026-06-16 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/vault-pulse.js:131` | 34 | 2026-06-04, 2026-06-10, 2026-06-12, 2026-06-13, 2026-06-14, 2026-06-15, 2026-06-16, 2026-06-18, 2026-06-19, 2026-06-20, 2026-06-21 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/journal/dispatches/:364` | 30 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/home-dynamic-hero.js:54` | 28 | 2026-06-04, 2026-06-14, 2026-06-16, 2026-06-18, 2026-06-19, 2026-06-20, 2026-06-21, 2026-06-22, 2026-06-23, 2026-06-24, 2026-06-26, 2026-06-27, 2026-06-30, 2026-07-02 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-3667694cc0.js:367` | 18 | 2026-06-09, 2026-06-10, 2026-06-11, 2026-06-12, 2026-06-13, 2026-06-15, 2026-06-16, 2026-06-20, 2026-06-21, 2026-06-27, 2026-06-30 | `HTMLScriptElement textContent|{"@context":"https://schema.org","@type"` |
| `https://vaultsparkstudios.com/assets/membership-idle-loader.js:18` | 15 | 2026-06-24, 2026-06-27, 2026-06-30 | `HTMLScriptElement src|/assets/member-voices.js` |
| `https://vaultsparkstudios.com/assets/turnstile.js:66` | 14 | 2026-06-11, 2026-06-12, 2026-06-13, 2026-06-16, 2026-06-18, 2026-06-21, 2026-06-23, 2026-06-27, 2026-06-30, 2026-07-01 | `HTMLScriptElement src|https://challenges.cloudflare.com/turnst` |
| `https://vaultsparkstudios.com/assets/ambient.shell-3667694cc0.js:337` | 12 | 2026-06-09, 2026-06-10, 2026-06-12, 2026-06-13, 2026-06-15, 2026-06-20, 2026-06-21 | `Element innerHTML|<a href="/">Home</a> <span class="vs-bre` |
| `https://vaultsparkstudios.com/assets/home-idle-loader.js:16` | 11 | 2026-06-04, 2026-06-09 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/appCore.js:995` | 11 | 2026-06-05 | `Element innerHTML|<tr><td>No rows</td></tr>` |
| `https://vaultsparkstudios.com/assets/ignis-platform.js:108` | 11 | 2026-06-15, 2026-06-24, 2026-06-27 | `Element innerHTML|<strong>Pattern distribution</strong><sp` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/appCore.js:1146` | 10 | 2026-06-05 | `Element innerHTML|<button class="link-btn" data-player-id=` |
| `PARSE-BLIND (pre-fix intake rows — no fields survived normalization)` | 7 | 2026-06-04, 2026-06-05 | — |
| `https://vaultsparkstudios.com/assets/vault-cta.js:39` | 4 | 2026-06-04, 2026-06-06, 2026-06-21, 2026-06-26 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-3667694cc0.js:1130` | 4 | 2026-06-05, 2026-06-11, 2026-06-12, 2026-06-13 | `Element innerHTML|<span class="vs-rank-orb-num">+</span><s` |
| `https://vaultsparkstudios.com/assets/theme-toggle.shell-b970c26bd9.js:394` | 3 | 2026-06-04, 2026-06-06 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:2362` | 3 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:2862` | 3 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:978` | 3 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/tabSettings.js:63` | 3 | 2026-06-05 | `Element innerHTML|<button data-trade-pick-side="B" data-tr` |
| `https://vaultsparkstudios.com/assets/nav-toggle.shell-96581b1d55.js:27` | 2 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/sentry-init.js:4` | 2 | 2026-06-04, 2026-06-09 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:1359` | 2 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/dispatch-voice.js:96` | 2 | 2026-06-04, 2026-06-23 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/tabRoster.js:37` | 2 | 2026-06-05 | `Element innerHTML|<button data-designation-select="P2026-B` |
| `https://vaultsparkstudios.com/assets/ambient-feature.shell-bd3f25f2f5.js:447` | 2 | 2026-06-06, 2026-06-07 | `Element innerHTML|<span class="vs-rank-orb-num">+</span><s` |
| `https://vaultsparkstudios.com/assets/ambient-feature.shell-bd3f25f2f5.js:336` | 2 | 2026-06-06, 2026-06-07 | `Element innerHTML|Capital<span class="vs-genome-tooltip-sc` |
| `https://vaultsparkstudios.com/leaderboards/:625` | 2 | 2026-06-21 | `Element innerHTML|<tr><td colspan="4" style="text-align:ce` |
| `https://vaultsparkstudios.com/:15` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/related-content.js:256` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/recent-ships.js:42` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/trust-depth.js:207` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/studio-milestones.js:72` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:2440` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/hero-ticker.js:60` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/heartbeat.js:144` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/heartbeat.js:107` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:673` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/assets/ambient.shell-47589e32e5.js:703` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/nervous-system/:47` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/nervous-system/:43` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/nervous-system/:46` | 1 | 2026-06-04 | `https://vaultsparkstudios.com/trusted-types-sink` |
| `https://vaultsparkstudios.com/games/vaultspark-football-gm/:6` | 1 | 2026-06-05 | `HTMLScriptElement src|https://www.googletagmanager.com/gtag/js` |
| `https://vaultsparkstudios.com/games/vaultspark-football-gm/:718` | 1 | 2026-06-05 | `Element innerHTML|<span data-star="1" style="color:rgba(25` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/setup.js:201` | 1 | 2026-06-05 | `Element innerHTML|<tr><td>Saved leagues are loading in the` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/setup.js:226` | 1 | 2026-06-05 | `Element innerHTML|<tr><td>No saved leagues yet.</td></tr>` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/setup.js:166` | 1 | 2026-06-05 | `Element innerHTML|<div class="record"><strong>Modern Pass` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/appCore.js:1037` | 1 | 2026-06-05 | `Element innerHTML|<option value="BUF">OS - Orlando Stallio` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/tabContracts.js:240` | 1 | 2026-06-05 | `Element innerHTML|<button data-contract-select="P2026-BUF-` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/tabContracts.js:431` | 1 | 2026-06-05 | `Element innerHTML|<button data-trade-roster-side="A" data-` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/tabRoster.js:280` | 1 | 2026-06-05 | `Element innerHTML|<div class="narrative-empty">No active m` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/appCore.js:1160` | 1 | 2026-06-05 | `Element innerHTML|<button class="link-btn" data-player-id=` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/tabContracts.js:25` | 1 | 2026-06-05 | `Element innerHTML|<button data-contract-select="P2026-BUF-` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/appCore.js:1024` | 1 | 2026-06-05 | `Element innerHTML|<tr><th>Player</th><th>Pos</th><th>OVR</` |
| `https://vaultsparkstudios.com/vaultspark-football-gm/lib/tabContracts.js:46` | 1 | 2026-06-05 | `Element innerHTML|<button data-contract-fill="tag" data-pl` |
| `https://vaultsparkstudios.com/leaderboards/:615` | 1 | 2026-06-06 | `Element innerHTML|<tr><td colspan="4" style="text-align:ce` |
| `https://vaultsparkstudios.com/games/vaultspark-football-gm/:660` | 1 | 2026-06-07 | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/games/vaultspark-football-gm/:715` | 1 | 2026-06-07 | `Element innerHTML|<span data-star="1" style="color:rgba(25` |
| `https://vaultsparkstudios.com/games/vaultfront/:503` | 1 | 2026-06-11 | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/assets/pwa-install.js:42` | 1 | 2026-06-12 | `Element innerHTML|<img src="/assets/vaultspark-icon.webp"` |
| `https://vaultsparkstudios.com/community/:639` | 1 | 2026-06-13 | `Element innerHTML|<div style="text-align:center;padding:2r` |
| `https://vaultsparkstudios.com/assets/ignis-platform.js:86` | 1 | 2026-06-15 | `Element innerHTML|` |
| `https://vaultsparkstudios.com/assets/ignis-project-block.js:165` | 1 | 2026-06-17 | `Element innerHTML|<div class="ignis-block-frame" style="--` |
| `https://vaultsparkstudios.com/games/gridiron-gm/:667` | 1 | 2026-06-17 | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/assets/pwa-install.js:54` | 1 | 2026-06-19 | `Element innerHTML|<img src="/assets/vaultspark-icon.webp"` |
| `https://vaultsparkstudios.com/assets/home-dynamic-hero.js:58` | 1 | 2026-06-23 | `Element innerHTML|<a class="home-spotlight" href="/games/c` |
| `https://vaultsparkstudios.com/games/mindframe/:541` | 1 | 2026-06-24 | `Element innerHTML|<a class="stream-fallback" href="https:/` |
| `https://vaultsparkstudios.com/assets/ignis-platform.js:104` | 1 | 2026-06-24 | `Element innerHTML|` |
| `https://vaultsparkstudios.com/chrome-extension:18` | 1 | 2026-06-25 | `Function|( ) { })` |
| `https://vaultsparkstudios.com/solara/:3` | 1 | 2026-06-26 | `Element innerHTML|<html><head><script>window.__CF$cv$param` |
| `https://vaultsparkstudios.com/assets/pwa-nav.js:22` | 1 | 2026-06-27 | `Element innerHTML|<button class="pwa-nav-btn" id="pwa-back` |
| `https://vaultsparkstudios.com/games/vaultspark-football-gm/:738` | 1 | 2026-06-30 | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/assets/changelog-time-machine.js:63` | 1 | 2026-06-30 | `Element innerHTML|<strong>Live</strong><span>May 13, 2026<` |
| `https://vaultsparkstudios.com/assets/changelog-time-machine.js:50` | 1 | 2026-06-30 | `Element innerHTML|<button type="button" class="tm-chip" da` |
| `https://vaultsparkstudios.com/assets/changelog-live.js:72` | 1 | 2026-06-30 | `Element insertAdjacentHTML|<article class="cl-phase cl-phase--live"` |
| `https://vaultsparkstudios.com/assets/changelog-time-machine.js:32` | 1 | 2026-06-30 | `Element innerHTML|<div class="tm-head"><span class="eyebro` |
| `https://vaultsparkstudios.com/games/gridiron-gm/:709` | 1 | 2026-07-01 | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/games/gridiron-gm/:764` | 1 | 2026-07-01 | `Element innerHTML|<span data-star="1" style="color:rgba(25` |
| `https://vaultsparkstudios.com/assets/ignis-project-block.js:175` | 1 | 2026-07-01 | `Element innerHTML|<div class="ignis-block-frame" style="--` |
| `https://vaultsparkstudios.com/assets/ignis-lens.js:54` | 1 | 2026-07-01 | `HTMLScriptElement src|/assets/vault-oracle.js` |
| `https://vaultsparkstudios.com/api/leaderboard/v1/widget.js:44` | 1 | 2026-07-01 | `Element innerHTML|<style>#vaultspark-leaderboard{font-fami` |
| `https://vaultsparkstudios.com/assets/hero-ticker.js:61` | 1 | 2026-07-02 | `Element innerHTML|<a href="/ignis/" class="hero-ticker-inn` |
| `https://vaultsparkstudios.com/games/gridiron-gm/:706` | 1 | 2026-07-02 | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/leaderboards/:562` | 1 | 2026-07-03 | `Element innerHTML|<tr><td colspan="4" style="text-align:ce` |

## Next actions

- Fix the named sinks above (largest cluster first), redeploy, and rerun `node scripts/probe-tt-soak.mjs`.
- Enforce canary stays gated until clusters read ~0 (S173 ladder decision).
