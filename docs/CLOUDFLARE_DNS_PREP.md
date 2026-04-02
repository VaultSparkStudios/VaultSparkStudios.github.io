# Cloudflare DNS Prep — Enable Proxy for vaultsparkstudios.com

Estimated time: < 5 minutes once you're logged into Cloudflare.

---

## Pre-flight check

The site is already live at `vaultsparkstudios.com` via GitHub Pages. DNS records are already
pointed correctly — the only change is switching from **DNS only** (grey cloud) to **Proxied**
(orange cloud) for the apex and www records.

---

## Required DNS records (verify these exist before toggling)

| Type  | Name              | Content                           | Proxy status    |
|-------|-------------------|-----------------------------------|-----------------|
| A     | `@`               | `185.199.108.153`                 | **Proxied** (orange) |
| A     | `@`               | `185.199.109.153`                 | **Proxied** (orange) |
| A     | `@`               | `185.199.110.153`                 | **Proxied** (orange) |
| A     | `@`               | `185.199.111.153`                 | **Proxied** (orange) |
| CNAME | `www`             | `vaultsparkstudios.github.io`     | **Proxied** (orange) |

> The four IPs are GitHub Pages' static IPs — do not change the values, only the proxy toggle.

---

## Steps

1. Log into [dash.cloudflare.com](https://dash.cloudflare.com) → select `vaultsparkstudios.com`
2. Go to **DNS → Records**
3. For each of the five records above:
   - Click the **Edit** (pencil) icon
   - Toggle the cloud icon from grey (DNS only) to **orange (Proxied)**
   - Save
4. Wait 1–2 minutes for propagation

---

## Verification

Run these from a terminal after enabling the proxy:

```bash
# Confirm Cloudflare is serving the response (look for cf-ray header)
curl -sI https://vaultsparkstudios.com | grep -i "cf-ray\|server\|x-content-type\|strict-transport\|content-security"

# Confirm www redirects correctly
curl -sI https://www.vaultsparkstudios.com | grep -i "location\|cf-ray"
```

**Expected output after proxy is active:**
- `server: cloudflare` (or `cf-ray:` header present)
- `strict-transport-security: max-age=...` — from Cloudflare worker
- `content-security-policy:` — from Cloudflare worker
- `x-content-type-options: nosniff` — from Cloudflare worker

If the security headers are missing, check that the Cloudflare Worker in
`cloudflare/security-headers-worker.js` is deployed and the route covers `vaultsparkstudios.com/*`.

---

## Cloudflare Worker route (post-proxy)

After enabling the proxy, deploy the security headers worker if not already deployed:

1. Cloudflare dashboard → **Workers & Pages → Create application → Upload worker**
2. Paste the contents of `cloudflare/security-headers-worker.js`
3. Add a **Worker route**: `vaultsparkstudios.com/*` → your worker

---

## Rollback

If the site breaks after enabling the proxy (GitHub Pages 503 or redirect loop):

```bash
# Check what GitHub Pages expects
curl -sI https://vaultsparkstudios.github.io -H "Host: vaultsparkstudios.com"
```

Common fix: ensure `CNAME` file in the repo root contains exactly `vaultsparkstudios.com` (no trailing slash, no www). GitHub Pages requires this when a custom domain is proxied.

To rollback immediately: flip the orange cloud back to grey in Cloudflare DNS → site restores within ~60 seconds.

---

## Notes

- Cloudflare Free tier is sufficient — proxy, WAF basics, and worker execution all work at no cost.
- The Cloudflare Worker already handles `frame-src`, `object-src 'none'`, `upgrade-insecure-requests`, CORP, and OAC — these activate automatically once the proxy route is live.
- Do **not** enable Cloudflare's "Always Use HTTPS" redirect at the zone level — GitHub Pages handles its own HTTPS; double-redirect can cause issues.
