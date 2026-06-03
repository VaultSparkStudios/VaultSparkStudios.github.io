# Agent Instructions

This project is the **VaultSpark Studios website** — the live public site at `vaultsparkstudios.com`.
It is a deployed static site (GitHub Pages) with Supabase edge functions, Cloudflare Worker security headers, and a Vault Member portal.

## Session aliases (mandatory)

When the user says only `start`, read and execute `prompts/start.md` exactly.
When the user says only `closeout`, read and execute `prompts/closeout.md` exactly.

Do NOT ask "what would you like to work on" — execute the prompt.

## Required reading

@AGENTS.md

## Public-safe boundary

This repo contains deployable site code, browser-safe client code, and public-safe documentation.
Internal operator runbooks, private planning, credential workflows, and detailed Studio OS handoffs live in the private `vaultspark-studio-ops` repository.
