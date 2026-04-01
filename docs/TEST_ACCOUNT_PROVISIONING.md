# Test Account Provisioning

Operator-only workflow for creating dedicated Playwright verification accounts in Supabase.

## Purpose

Provision:

- one free Vault member account
- one VaultSparked account with an active `vault_sparked` subscription row
- one PromoGrind Pro account with an active `promogrind_pro` subscription row

and write the resulting credentials into `.env.playwright.local`.

## Safety

- Use dedicated test email addresses only.
- This workflow uses `SUPABASE_SERVICE_ROLE_KEY`.
- Do not point it at a real member account you care about. The script will reset the password for any matching email it provisions.

## What it does

`scripts/provision-vault-test-accounts.mjs` will:

1. create or find the target auth users
2. force-confirm email on those users
3. set/update their passwords
4. ensure `vault_members` rows exist
5. ensure the Sparked account has an active `subscriptions` row with `plan = 'vault_sparked'`
6. ensure the PromoGrind Pro account has an active `subscriptions` row with `plan = 'promogrind_pro'`
7. set `vault_members.is_sparked` to match the intended account type
8. write the credentials into `.env.playwright.local`

## Required environment variables

```env
SUPABASE_SERVICE_ROLE_KEY=replace-me
VAULT_FREE_TEST_EMAIL=free-test@example.com
VAULT_SPARKED_TEST_EMAIL=sparked-test@example.com
VAULT_PROMOGRIND_TEST_EMAIL=promogrind-test@example.com
```

Optional:

```env
SUPABASE_URL=https://fjnpzjjyhnpmunfoycrp.supabase.co
VAULT_FREE_TEST_PASSWORD=custom-password
VAULT_SPARKED_TEST_PASSWORD=custom-password
VAULT_FREE_TEST_USERNAME=vaultfreeqa
VAULT_SPARKED_TEST_USERNAME=vaultsparkedqa
VAULT_PROMOGRIND_TEST_PASSWORD=custom-password
VAULT_PROMOGRIND_TEST_USERNAME=vaultproqa
PLAYWRIGHT_ENV_PATH=.env.playwright.local
WRITE_PLAYWRIGHT_ENV=1
```

If passwords are not provided, the script generates them.

## Command

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="..."
$env:VAULT_FREE_TEST_EMAIL="free-test@example.com"
$env:VAULT_SPARKED_TEST_EMAIL="sparked-test@example.com"
$env:VAULT_PROMOGRIND_TEST_EMAIL="promogrind-test@example.com"
npm run provision:test-accounts
```

## Output

The script updates `.env.playwright.local` with:

```env
BASE_URL=https://vaultsparkstudios.com
VAULT_FREE_TEST_EMAIL=...
VAULT_FREE_TEST_PASSWORD=...
VAULT_SPARKED_TEST_EMAIL=...
VAULT_SPARKED_TEST_PASSWORD=...
VAULT_PROMOGRIND_TEST_EMAIL=...
VAULT_PROMOGRIND_TEST_PASSWORD=...
```

## After provisioning

Run the authenticated verification lane:

```powershell
npx playwright test --project=chromium --workers=1 tests/authenticated.spec.js
```
