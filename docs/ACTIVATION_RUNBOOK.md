# Activation Runbook

Last updated: 2026-03-30

## Goal

Convert the remaining external blockers into one execution sequence for activation, trust, and distribution.

## 1. Cloudflare proxy

- Enable the orange-cloud proxy for the production DNS records.
- Verify the site still resolves correctly for apex and `www`.
- Confirm real HTTP headers at the edge after proxy enablement.

Done when:
- HSTS/CSP/X-Content-Type-Options are visible at the edge.
- CDN proxying is active without breaking GitHub Pages delivery.

## 2. Supabase auth hardening

- Enable CAPTCHA for auth flows.
- Set an explicit session timeout.
- Enable email enumeration prevention.

Done when:
- Auth settings match the security baseline and login/signup still work.

## 3. Web push / VAPID

- Keys generated (2026-04-01). Public key is already set in `vault-member/portal-features.js` and `vault-member/portal.js`.
- VAPID public key: `BPqkVkO6mM4exqxJFYm6g-4DF883H1fNh9de7Pkc_s3V53EQ5isS6Hz85ZRjIG5FU1zjbXmdEJEHmJUiL6d8-bA`
- **Human action required:** Set the following as Supabase Edge Function secrets (Dashboard → Edge Functions → send-push → Secrets):
  - `VAPID_PUBLIC_KEY` — `BPqkVkO6mM4exqxJFYm6g-4DF883H1fNh9de7Pkc_s3V53EQ5isS6Hz85ZRjIG5FU1zjbXmdEJEHmJUiL6d8-bA`
  - `VAPID_PRIVATE_KEY` — see secure notes (generated 2026-04-01, do not commit)
  - `VAPID_SUBJECT` — `mailto:hello@vaultsparkstudios.com`
- After secrets are set: `supabase functions deploy send-push`
- Also wire the Database Webhook: Dashboard → Database → Webhooks → classified_files INSERT → send-push URL

Done when:
- A signed-in member can subscribe and receive a test notification.

## 4. Newsletter secrets

- Set `RESEND_API_KEY`
- Set `NEWSLETTER_FROM`
- Set `APP_URL`
- Set `NEWSLETTER_SECRET`
- Trigger the newsletter workflow manually once to verify the full path

Done when:
- `send-member-newsletter` returns success and logs sends without schema errors.

## 5. Search verification

- Replace `google-site-verification-REPLACE_ME.html` with the real verification file/token.
- Verify the domain in Google Search Console.
- Submit `sitemap.xml` and `member-sitemap.xml`.
- Verify Bing Webmaster if desired in the same pass.

Done when:
- Search console ownership is verified and both sitemaps are accepted.

## Recommended order

1. Cloudflare proxy
2. Supabase auth hardening
3. Newsletter secrets
4. VAPID
5. Search verification
