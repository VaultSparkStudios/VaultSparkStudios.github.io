# Newsletter Activation Setup

Last updated: 2026-04-02

## Overview

The member newsletter is a monthly personalized digest sent to all opted-in vault members via the `send-member-newsletter` Supabase Edge Function, triggered by a GitHub Action on the 2nd of each month.

## Prerequisites

- A [Resend](https://resend.com) account with a verified sending domain
- Access to the Supabase project dashboard (`fjnpzjjyhnpmunfoycrp`)
- The `NEWSLETTER_SECRET` value (shared between the GitHub Action and the Edge Function for auth)

## Step 1 — Create a Resend API key

1. Sign in at [resend.com](https://resend.com)
2. Go to **API Keys** → **Create API Key**
3. Name it `vaultspark-newsletter` (or similar)
4. Copy the key — you will not see it again

## Step 2 — Verify a sending domain (if not already done)

1. In Resend, go to **Domains** → **Add Domain**
2. Add `vaultsparkstudios.com`
3. Add the DNS records Resend provides (SPF, DKIM, DMARC)
4. Wait for verification (usually < 5 minutes)

## Step 3 — Set Edge Function secrets in Supabase

Go to **Supabase Dashboard → Edge Functions → send-member-newsletter → Secrets** and set:

| Secret | Value | Notes |
|---|---|---|
| `RESEND_API_KEY` | `re_...` (from Step 1) | Resend API key |
| `NEWSLETTER_FROM` | `studio@vaultsparkstudios.com` | Must match verified domain |
| `APP_URL` | `https://vaultsparkstudios.com` | Used for CTA links and unsubscribe URLs |
| `NEWSLETTER_SECRET` | Any strong random string | Bearer token for auth between GitHub Action and Edge Function |

Generate `NEWSLETTER_SECRET` with:
```bash
openssl rand -base64 32
```

## Step 4 — Set GitHub Action secrets

Go to **GitHub repo → Settings → Secrets and variables → Actions** and set:

| Secret | Value | Notes |
|---|---|---|
| `NEWSLETTER_SECRET` | Same value as Step 3 | Must match the Edge Function secret exactly |
| `SUPABASE_FUNCTION_BASE_URL` | `https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1` | Edge Function base URL |

## Step 5 — Deploy the Edge Function

```bash
supabase functions deploy send-member-newsletter
```

## Step 6 — Test manually

### Option A: GitHub Actions manual trigger
1. Go to **Actions → Monthly Member Newsletter → Run workflow**
2. Check the run log — it should show `Newsletter sent to N members`

### Option B: Direct curl
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_NEWSLETTER_SECRET" \
  -H "Content-Type: application/json" \
  "https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/send-member-newsletter"
```

Expected response:
```json
{"ok": true, "sent": 1, "errors": 0, "period": "2026-04"}
```

## How it works

- The function queries all `vault_members` joined with `newsletter_preferences`
- Members with `opted_out = true` are skipped
- Members already sent for the current `YYYY-MM` period (via `member_newsletter_log`) are skipped
- Each email is personalized with the member's rank, recent XP, games played, and studio stats
- Emails are throttled at 2/second to stay within Resend free tier limits
- Successful sends are logged in `member_newsletter_log` to prevent duplicates

## Troubleshooting

| Symptom | Fix |
|---|---|
| `401 Unauthorized` | `NEWSLETTER_SECRET` mismatch between GitHub Action and Edge Function |
| `No members found` | No rows in `vault_members` — check Supabase data |
| Emails not arriving | Verify Resend domain, check spam folder, confirm `NEWSLETTER_FROM` matches verified domain |
| `sent: 0` but members exist | All members may have `opted_out = true` or already received this period's newsletter |

## Schedule

The newsletter fires automatically on the **2nd of each month at 10:00 UTC** via `.github/workflows/member-newsletter.yml`. It can also be triggered manually from the Actions tab at any time.
