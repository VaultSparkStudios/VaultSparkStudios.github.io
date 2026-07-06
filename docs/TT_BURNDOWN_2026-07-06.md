<!-- generated-by: scripts/analyze-tt-violations.mjs -->
<!-- generated-at: 2026-07-06 -->

# Trusted Types Violation Burndown

> 329 sampled report(s) over last 30 day(s) · clustered by sourceFile:line.
> Parse-blind rows predate the S174 intake fix and age out with the KV TTL.
> Freshness lens: active-3d=1 · warm-7d=16 · stale-8d+=28 · unknown=0.

## Freshness-ranked clusters

| Cluster | Count | Last seen | Freshness | Sink/sample evidence |
|---|---:|---|---|---|
| `https://vaultsparkstudios.com/leaderboards/:562` | 1 | 2026-07-03 | active-3d (3d old) | `Element innerHTML|<tr><td colspan="4" style="text-align:ce` |
| `https://vaultsparkstudios.com/assets/home-dynamic-hero.js:54` | 27 | 2026-07-02 | warm-7d (4d old) | `Element innerHTML|<a class="home-spotlight" href="/games/c` |
| `https://vaultsparkstudios.com/assets/hero-ticker.js:61` | 1 | 2026-07-02 | warm-7d (4d old) | `Element innerHTML|<a href="/ignis/" class="hero-ticker-inn` |
| `https://vaultsparkstudios.com/games/gridiron-gm/:706` | 1 | 2026-07-02 | warm-7d (4d old) | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/assets/turnstile.js:66` | 14 | 2026-07-01 | warm-7d (5d old) | `HTMLScriptElement src|https://challenges.cloudflare.com/turnst` |
| `https://vaultsparkstudios.com/api/leaderboard/v1/widget.js:44` | 1 | 2026-07-01 | warm-7d (5d old) | `Element innerHTML|<style>#vaultspark-leaderboard{font-fami` |
| `https://vaultsparkstudios.com/assets/ignis-lens.js:54` | 1 | 2026-07-01 | warm-7d (5d old) | `HTMLScriptElement src|/assets/vault-oracle.js` |
| `https://vaultsparkstudios.com/assets/ignis-project-block.js:175` | 1 | 2026-07-01 | warm-7d (5d old) | `Element innerHTML|<div class="ignis-block-frame" style="--` |
| `https://vaultsparkstudios.com/games/gridiron-gm/:709` | 1 | 2026-07-01 | warm-7d (5d old) | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/games/gridiron-gm/:764` | 1 | 2026-07-01 | warm-7d (5d old) | `Element innerHTML|<span data-star="1" style="color:rgba(25` |
| `https://vaultsparkstudios.com/assets/ambient.shell-3667694cc0.js:367` | 18 | 2026-06-30 | warm-7d (6d old) | `HTMLScriptElement textContent|{"@context":"https://schema.org","@type"` |
| `https://vaultsparkstudios.com/assets/membership-idle-loader.js:18` | 15 | 2026-06-30 | warm-7d (6d old) | `HTMLScriptElement src|/assets/member-voices.js` |
| `https://vaultsparkstudios.com/assets/changelog-live.js:72` | 1 | 2026-06-30 | warm-7d (6d old) | `Element insertAdjacentHTML|<article class="cl-phase cl-phase--live"` |
| `https://vaultsparkstudios.com/assets/changelog-time-machine.js:32` | 1 | 2026-06-30 | warm-7d (6d old) | `Element innerHTML|<div class="tm-head"><span class="eyebro` |
| `https://vaultsparkstudios.com/assets/changelog-time-machine.js:50` | 1 | 2026-06-30 | warm-7d (6d old) | `Element innerHTML|<button type="button" class="tm-chip" da` |
| `https://vaultsparkstudios.com/assets/changelog-time-machine.js:63` | 1 | 2026-06-30 | warm-7d (6d old) | `Element innerHTML|<strong>Live</strong><span>May 13, 2026<` |
| `https://vaultsparkstudios.com/games/vaultspark-football-gm/:738` | 1 | 2026-06-30 | warm-7d (6d old) | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/assets/ignis-platform.js:108` | 11 | 2026-06-27 | stale-8d+ (9d old) | `Element innerHTML|<strong>Pattern distribution</strong><sp` |
| `https://vaultsparkstudios.com/assets/pwa-nav.js:22` | 1 | 2026-06-27 | stale-8d+ (9d old) | `Element innerHTML|<button class="pwa-nav-btn" id="pwa-back` |
| `https://vaultsparkstudios.com/assets/vault-cta.js:39` | 2 | 2026-06-26 | stale-8d+ (10d old) | `Element innerHTML|<div style="flex:1;min-width:160px;"><di` |
| `https://vaultsparkstudios.com/solara/:3` | 1 | 2026-06-26 | stale-8d+ (10d old) | `Element innerHTML|<html><head><script>window.__CF$cv$param` |
| `https://vaultsparkstudios.com/chrome-extension:18` | 1 | 2026-06-25 | stale-8d+ (11d old) | `Function|( ) { })` |
| `https://vaultsparkstudios.com/assets/schema-injector.js:26` | 122 | 2026-06-24 | stale-8d+ (12d old) | `HTMLScriptElement text|{"@context":"https://schema.org","@type"` |
| `https://vaultsparkstudios.com/assets/ignis-platform.js:104` | 1 | 2026-06-24 | stale-8d+ (12d old) | `Element innerHTML|` |
| `https://vaultsparkstudios.com/games/mindframe/:541` | 1 | 2026-06-24 | stale-8d+ (12d old) | `Element innerHTML|<a class="stream-fallback" href="https:/` |
| `https://vaultsparkstudios.com/assets/dispatch-voice.js:96` | 1 | 2026-06-23 | stale-8d+ (13d old) | `Element innerHTML|<svg viewBox="0 0 24 24" fill="none" str` |
| `https://vaultsparkstudios.com/assets/home-dynamic-hero.js:58` | 1 | 2026-06-23 | stale-8d+ (13d old) | `Element innerHTML|<a class="home-spotlight" href="/games/c` |
| `https://vaultsparkstudios.com/assets/vault-pulse.js:131` | 33 | 2026-06-21 | stale-8d+ (15d old) | `Element innerHTML|Recent member activity — anonymized, pul` |
| `https://vaultsparkstudios.com/assets/ambient.shell-3667694cc0.js:337` | 12 | 2026-06-21 | stale-8d+ (15d old) | `Element innerHTML|<a href="/">Home</a> <span class="vs-bre` |
| `https://vaultsparkstudios.com/leaderboards/:625` | 2 | 2026-06-21 | stale-8d+ (15d old) | `Element innerHTML|<tr><td colspan="4" style="text-align:ce` |
| `https://vaultsparkstudios.com/assets/pwa-install.js:54` | 1 | 2026-06-19 | stale-8d+ (17d old) | `Element innerHTML|<img src="/assets/vaultspark-icon.webp"` |
| `https://vaultsparkstudios.com/assets/ignis-project-block.js:165` | 1 | 2026-06-17 | stale-8d+ (19d old) | `Element innerHTML|<div class="ignis-block-frame" style="--` |
| `https://vaultsparkstudios.com/games/gridiron-gm/:667` | 1 | 2026-06-17 | stale-8d+ (19d old) | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/assets/schema-injector.js:23` | 34 | 2026-06-16 | stale-8d+ (20d old) | `HTMLScriptElement text|{"@context":"https://schema.org","@type"` |
| `https://vaultsparkstudios.com/assets/ignis-platform.js:86` | 1 | 2026-06-15 | stale-8d+ (21d old) | `Element innerHTML|` |
| `https://vaultsparkstudios.com/assets/ambient.shell-3667694cc0.js:1130` | 3 | 2026-06-13 | stale-8d+ (23d old) | `Element innerHTML|<span class="vs-rank-orb-num">+</span><s` |
| `https://vaultsparkstudios.com/community/:639` | 1 | 2026-06-13 | stale-8d+ (23d old) | `Element innerHTML|<div style="text-align:center;padding:2r` |
| `https://vaultsparkstudios.com/assets/pwa-install.js:42` | 1 | 2026-06-12 | stale-8d+ (24d old) | `Element innerHTML|<img src="/assets/vaultspark-icon.webp"` |
| `https://vaultsparkstudios.com/games/vaultfront/:503` | 1 | 2026-06-11 | stale-8d+ (25d old) | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/assets/home-idle-loader.js:16` | 3 | 2026-06-09 | stale-8d+ (27d old) | `HTMLScriptElement src|/assets/studio-stats.js` |
| `https://vaultsparkstudios.com/assets/sentry-init.js:4` | 1 | 2026-06-09 | stale-8d+ (27d old) | `HTMLScriptElement src|https://browser.sentry-cdn.com/7.99.0/bu` |
| `https://vaultsparkstudios.com/assets/ambient-feature.shell-bd3f25f2f5.js:336` | 2 | 2026-06-07 | stale-8d+ (29d old) | `Element innerHTML|Capital<span class="vs-genome-tooltip-sc` |
| `https://vaultsparkstudios.com/assets/ambient-feature.shell-bd3f25f2f5.js:447` | 1 | 2026-06-07 | stale-8d+ (29d old) | `Element innerHTML|<span class="vs-rank-orb-num">+</span><s` |
| `https://vaultsparkstudios.com/games/vaultspark-football-gm/:660` | 1 | 2026-06-07 | stale-8d+ (29d old) | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/games/vaultspark-football-gm/:715` | 1 | 2026-06-07 | stale-8d+ (29d old) | `Element innerHTML|<span data-star="1" style="color:rgba(25` |

## Volume-ranked clusters

| Cluster | Count | Days seen | Sink/sample evidence |
|---|---:|---|---|
| `https://vaultsparkstudios.com/assets/schema-injector.js:26` | 122 | 2026-06-12, 2026-06-13, 2026-06-14, 2026-06-16, 2026-06-17, 2026-06-18, 2026-06-19, 2026-06-20, 2026-06-21, 2026-06-22, 2026-06-23, 2026-06-24 | `HTMLScriptElement text|{"@context":"https://schema.org","@type"` |
| `https://vaultsparkstudios.com/assets/schema-injector.js:23` | 34 | 2026-06-07, 2026-06-09, 2026-06-10, 2026-06-11, 2026-06-12, 2026-06-13, 2026-06-14, 2026-06-15, 2026-06-16 | `HTMLScriptElement text|{"@context":"https://schema.org","@type"` |
| `https://vaultsparkstudios.com/assets/vault-pulse.js:131` | 33 | 2026-06-10, 2026-06-12, 2026-06-13, 2026-06-14, 2026-06-15, 2026-06-16, 2026-06-18, 2026-06-19, 2026-06-20, 2026-06-21 | `Element innerHTML|Recent member activity — anonymized, pul` |
| `https://vaultsparkstudios.com/assets/home-dynamic-hero.js:54` | 27 | 2026-06-14, 2026-06-16, 2026-06-18, 2026-06-19, 2026-06-20, 2026-06-21, 2026-06-22, 2026-06-23, 2026-06-24, 2026-06-26, 2026-06-27, 2026-06-30, 2026-07-02 | `Element innerHTML|<a class="home-spotlight" href="/games/c` |
| `https://vaultsparkstudios.com/assets/ambient.shell-3667694cc0.js:367` | 18 | 2026-06-09, 2026-06-10, 2026-06-11, 2026-06-12, 2026-06-13, 2026-06-15, 2026-06-16, 2026-06-20, 2026-06-21, 2026-06-27, 2026-06-30 | `HTMLScriptElement textContent|{"@context":"https://schema.org","@type"` |
| `https://vaultsparkstudios.com/assets/membership-idle-loader.js:18` | 15 | 2026-06-24, 2026-06-27, 2026-06-30 | `HTMLScriptElement src|/assets/member-voices.js` |
| `https://vaultsparkstudios.com/assets/turnstile.js:66` | 14 | 2026-06-11, 2026-06-12, 2026-06-13, 2026-06-16, 2026-06-18, 2026-06-21, 2026-06-23, 2026-06-27, 2026-06-30, 2026-07-01 | `HTMLScriptElement src|https://challenges.cloudflare.com/turnst` |
| `https://vaultsparkstudios.com/assets/ambient.shell-3667694cc0.js:337` | 12 | 2026-06-09, 2026-06-10, 2026-06-12, 2026-06-13, 2026-06-15, 2026-06-20, 2026-06-21 | `Element innerHTML|<a href="/">Home</a> <span class="vs-bre` |
| `https://vaultsparkstudios.com/assets/ignis-platform.js:108` | 11 | 2026-06-15, 2026-06-24, 2026-06-27 | `Element innerHTML|<strong>Pattern distribution</strong><sp` |
| `https://vaultsparkstudios.com/assets/home-idle-loader.js:16` | 3 | 2026-06-09 | `HTMLScriptElement src|/assets/studio-stats.js` |
| `https://vaultsparkstudios.com/assets/ambient.shell-3667694cc0.js:1130` | 3 | 2026-06-11, 2026-06-12, 2026-06-13 | `Element innerHTML|<span class="vs-rank-orb-num">+</span><s` |
| `https://vaultsparkstudios.com/assets/ambient-feature.shell-bd3f25f2f5.js:336` | 2 | 2026-06-06, 2026-06-07 | `Element innerHTML|Capital<span class="vs-genome-tooltip-sc` |
| `https://vaultsparkstudios.com/leaderboards/:625` | 2 | 2026-06-21 | `Element innerHTML|<tr><td colspan="4" style="text-align:ce` |
| `https://vaultsparkstudios.com/assets/vault-cta.js:39` | 2 | 2026-06-21, 2026-06-26 | `Element innerHTML|<div style="flex:1;min-width:160px;"><di` |
| `https://vaultsparkstudios.com/games/vaultspark-football-gm/:660` | 1 | 2026-06-07 | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/assets/ambient-feature.shell-bd3f25f2f5.js:447` | 1 | 2026-06-07 | `Element innerHTML|<span class="vs-rank-orb-num">+</span><s` |
| `https://vaultsparkstudios.com/games/vaultspark-football-gm/:715` | 1 | 2026-06-07 | `Element innerHTML|<span data-star="1" style="color:rgba(25` |
| `https://vaultsparkstudios.com/assets/sentry-init.js:4` | 1 | 2026-06-09 | `HTMLScriptElement src|https://browser.sentry-cdn.com/7.99.0/bu` |
| `https://vaultsparkstudios.com/games/vaultfront/:503` | 1 | 2026-06-11 | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/assets/pwa-install.js:42` | 1 | 2026-06-12 | `Element innerHTML|<img src="/assets/vaultspark-icon.webp"` |
| `https://vaultsparkstudios.com/community/:639` | 1 | 2026-06-13 | `Element innerHTML|<div style="text-align:center;padding:2r` |
| `https://vaultsparkstudios.com/assets/ignis-platform.js:86` | 1 | 2026-06-15 | `Element innerHTML|` |
| `https://vaultsparkstudios.com/assets/ignis-project-block.js:165` | 1 | 2026-06-17 | `Element innerHTML|<div class="ignis-block-frame" style="--` |
| `https://vaultsparkstudios.com/games/gridiron-gm/:667` | 1 | 2026-06-17 | `Element innerHTML|<div class="stream-item"><span class="st` |
| `https://vaultsparkstudios.com/assets/pwa-install.js:54` | 1 | 2026-06-19 | `Element innerHTML|<img src="/assets/vaultspark-icon.webp"` |
| `https://vaultsparkstudios.com/assets/home-dynamic-hero.js:58` | 1 | 2026-06-23 | `Element innerHTML|<a class="home-spotlight" href="/games/c` |
| `https://vaultsparkstudios.com/assets/dispatch-voice.js:96` | 1 | 2026-06-23 | `Element innerHTML|<svg viewBox="0 0 24 24" fill="none" str` |
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

- Fix active-3d and warm-7d named sinks first, then use the volume-ranked table for residual long-window cleanup.
- Enforce canary stays gated until active and warm clusters read ~0 (S173 ladder decision).
