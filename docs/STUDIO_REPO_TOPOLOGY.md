# VaultSpark Repo Topology

This document explains how the current organizational repository should relate
to project repositories without breaking existing project architecture.

## Current role of this repository

`VaultSparkStudios.github.io` should remain the public organizational hub.

It should contain:

- the public studio landing site
- project landing pages or links
- public-facing brand and portfolio surfaces
- shared studio standards and reusable templates

It should not become the execution repo for every project.

## Recommended long-term repo model

Use a hub-and-spoke system.

### Public hub repo

- `VaultSparkStudios.github.io`

### One repo per project

Suggested naming:

- `vaultfront`
- `gridiron-gm`
- `call-of-doodie`
- `solara`

Purpose:

- source code
- assets
- project memory
- release process
- handoffs
- medium-specific working docs

### Optional world / IP repos

Suggested naming:

- `world-[ip-name]`

Use these only when multiple projects share the same property.

### Optional shared capability repos

Suggested naming:

- `studio-design-system`
- `studio-analytics`
- `studio-launch-ops`

## Rule for the org site repo

Add standards and templates here.

Do not move active project source-of-truth out of project repos just to make the
org repo feel complete.

## Existing projects

Existing site subfolders such as `vaultfront/` and `vaultspark-football-gm/`
can remain as public deploy surfaces or mirrors.

This rollout is additive and does not require moving or renaming those paths.
