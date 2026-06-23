# Security Policy

VaultSpark Studios takes the security of this website and its visitors seriously.
This policy describes how to report a vulnerability and what you can expect in return.

> Machine-readable companion: [`/.well-known/security.txt`](https://vaultsparkstudios.com/.well-known/security.txt) ·
> Public policy page: <https://vaultsparkstudios.com/security/>

## Reporting a vulnerability

Please report suspected security issues **privately** to:

- **Email:** security@vaultsparkstudios.com
- **Web:** <https://vaultsparkstudios.com/security/>

Do **not** open a public GitHub issue for a security report — public disclosure
before a fix is in place puts visitors at risk.

When you report, please include where you can:

- A clear description of the issue and its impact
- Steps to reproduce (proof-of-concept, affected URL, request/response)
- Any relevant logs, screenshots, or payloads (redact your own secrets)

## What to expect

- **Acknowledgement:** we aim to confirm receipt within **3 business days**.
- **Assessment:** we triage severity, validate the report, and keep you updated on progress.
- **Resolution:** confirmed issues are fixed as a priority; timelines scale with severity.
- **Coordinated disclosure:** we ask that you give us a reasonable window to ship a fix
  before any public write-up. We are happy to credit you in our acknowledgements
  (see the policy page) unless you prefer to remain anonymous.

## Scope

In scope:

- `vaultsparkstudios.com` and its subdomains we operate
- The Vault Member portal and authenticated flows
- Supabase edge functions and the Cloudflare Worker security layer served from our domains

Out of scope (please do not test):

- Denial-of-service / volumetric or stress testing
- Social engineering of our team, partners, or visitors
- Automated scanning that degrades service for real users
- Findings in third-party platforms we merely consume (report those upstream)

## Supported surface

This is a continuously deployed static site with edge functions; we support and
patch the **currently deployed production version**. There are no long-lived
release branches to back-port to — fixes ship forward to production.

## Good-faith safe harbor

We will not pursue or support legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and
  service degradation
- Only interact with accounts they own or have explicit permission to access
- Report promptly and give us a reasonable time to remediate before disclosure

## Hygiene baseline

This repository runs automated dependency monitoring (Dependabot) and GitHub
secret scanning. Supply-chain and secret-leak checks run in the build pipeline
before every push.

---

© 2026 VaultSpark Studios LLC. All rights reserved. Proprietary — see
[`docs/RIGHTS_PROVENANCE.md`](docs/RIGHTS_PROVENANCE.md).
