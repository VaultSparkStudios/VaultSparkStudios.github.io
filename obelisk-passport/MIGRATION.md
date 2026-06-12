# Migration — replace cloudflare-worker with Obelisk Passport

VaultSpark Studios currently uses **cloudflare-worker**. After wiring Obelisk Passport:

1. Point all "Sign in" / "Create account" entry points at the Obelisk login surface.
2. Replace session checks with the `obelisk_identity` cookie / stored identity.
3. Remove the old auth provider's keys/config once parity is verified.
4. (Optional) Migrate existing users by linking their old id to the returned
   Obelisk identityId on first Obelisk sign-in.

Do this behind a flag and verify a real round-trip before deleting the old path.
