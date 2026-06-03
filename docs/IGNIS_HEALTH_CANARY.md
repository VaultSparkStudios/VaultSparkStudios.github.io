# IGNIS Health Canary — Operator Runbook

Internal diagnostic page at **`/ignis-health/`** (production: `https://vaultsparkstudios.com/ignis-health/`).

Shipped S105 to replace the "is Ask IGNIS working?" diagnostic loop (previously required opening DevTools → Network tab). The page is `robots: noindex` and excluded from `sitemap.xml` / `robots.txt`. Not linked from navigation.

---

## What it does

On load (and when the **Re-run probes** button is clicked), the page fires two probes at the `ask-ignis` Supabase Edge Function and renders a green/yellow/red status row for each:

| Probe | Auth | Expected | Meaning of each status |
|---|---|---|---|
| **Anonymous** | No bearer token | `403 membership_required` (green) | Function alive, gate working |
| **Authenticated** | Stored Supabase session (if any) | `200 ok` + tier + quota (green) | Signed-in Sparked/Eternal member, widget will render input |

Both probes use the `{probe: true}` short-circuit branch in the edge function (S105) — zero Claude spend, no monthly quota consumption, respects the 12 rpm rate limit.

---

## Status code interpretation

| Status | Color | Diagnosis | Fix |
|---|---|---|---|
| `403 membership_required` (anon) | 🟢 green | Function + gate healthy | None — this is the expected anonymous path |
| `503 IGNIS unavailable` | 🔴 red | `ANTHROPIC_API_KEY` missing from Supabase secrets | Supabase Dashboard → Edge Functions → ask-ignis → Secrets; paste a valid `sk-ant-…` key |
| `429` | 🟡 yellow | Per-IP rate-limit bucket full | Wait 60s; if persistent, raise `ASK_IGNIS_RATE_LIMIT_RPM` |
| `200 ok` (auth) | 🟢 green | Member session valid, tier recognized | None |
| `403 membership_required` (auth) | 🟡 yellow | Signed in but not Sparked/Eternal | Expected — widget will render locked state |
| Network error / timeout | 🔴 red | Function unreachable or crashed | Supabase Dashboard → Edge Functions → ask-ignis → Logs |
| Other status | 🟡 yellow | Unexpected — inspect body field | Read the rendered body snippet; check edge function logs |

---

## When to use

- Reported "Ask IGNIS not working" from a member
- After every `supabase functions deploy ask-ignis …`
- After rotating `ANTHROPIC_API_KEY`
- As a sanity check before any site-wide push that touches `assets/vault-oracle.js`

---

## How it works internally

- Page: `ignis-health/index.html` — minimal shell, `noindex, nofollow`, `robots.txt` disallow, not in sitemap
- JS: `ignis-health/ignis-health.js` — reads stored Supabase session from `localStorage` (same keys as `vault-oracle.js`), runs both probes, renders rows
- Edge contract: `supabase/functions/ask-ignis/index.ts` handles `{probe: true}` after rate-limit + membership checks, returns `{ok: true, probe: true, access}` for entitled callers or `403 membership_required` otherwise
- The **Re-run probes** button re-runs both probes without reloading the page

---

## Related

- `assets/vault-oracle.js` — the consumer-facing widget that uses the same probe to render a locked state for non-members up front (S105)
- `supabase/functions/ask-ignis/index.ts` — edge function
- `feedback_visible_tier_gating.md` (agent memory) — why probe-on-mount is the pattern for future member-gated widgets
