# Current State

## Snapshot

- Date: 2026-04-03
- Overall status: live
- Repo posture: public-safe sanitization and closeout pass completed for tracked operational files without changing deployable site behavior

## Public-safe summary

- This repo contains the live website, browser-safe client code, public pages, and public-safe project documentation.
- Internal operating context, detailed handoffs, work logs, audits, credential handling, and studio planning are no longer stored here in detailed form.
- Historical internal material from the pre-sanitization state was preserved in a local private backup outside the repo during the 2026-04-03 sanitization pass.
- Local Playwright credential handling now prefers a private ignored file, keeping the repo-facing local env file safe as a template.

## Active public focus

- Keep the public website stable, accurate, and deployable.
- Keep only public-safe documentation and browser-safe configuration in version control.
- Move internal operations and sensitive project-management material to the private Studio OS / ops repo.
- Keep local test credentials isolated from repo-facing local config files.
