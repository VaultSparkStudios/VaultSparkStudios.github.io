# iOS Shortcut — Studio Pulse Signal Broadcast

Post a live Studio Pulse message directly from your iPhone without opening a browser.

---

## What you need before starting

- Your **Supabase Service Role Key** — find it in:
  Supabase Dashboard → Project Settings → API → `service_role` key
  _(This key bypasses RLS — never share it or put it in any public file.)_
- The iOS **Shortcuts** app (pre-installed on iPhone/iPad)

---

## Step-by-step

### 1. Open Shortcuts → tap **+** (top right) to create a new shortcut

### 2. Add action: **Ask for Input**
- **Prompt:** `Vault Signal — what's the message?`
- **Input Type:** Text
- **Default Answer:** _(leave blank)_

This stores the typed text as the variable `Provided Input`.

### 3. Add action: **Choose from List**
- **Items** (add each one separately):
  - `update`
  - `alert`
  - `drop`
- **Prompt:** `Signal type?`

This stores the chosen value as `Chosen Item`.

### 4. Add action: **Get Contents of URL**

Fill in the fields exactly as shown:

| Field | Value |
|---|---|
| URL | `https://fjnpzjjyhnpmunfoycrp.supabase.co/rest/v1/studio_pulse` |
| Method | `POST` |

**Headers** (tap "Add new field" for each):

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `apikey` | _(paste your service role key)_ |
| `Authorization` | `Bearer ` + _(paste your service role key — same value)_ |
| `Prefer` | `return=minimal` |

**Request Body** → set to **JSON**

Add two fields:
| Key | Value |
|---|---|
| `message` | Tap the field → choose **Variable** → select `Provided Input` |
| `type` | Tap the field → choose **Variable** → select `Chosen Item` |

### 5. Add action: **Show Notification** _(optional but helpful)_
- **Title:** `Vault Signal Sent`
- **Body:** `Broadcast complete ⚡`

### 6. Tap the shortcut name at the top and rename it:
`⚡ Vault Signal`

### 7. Tap the icon next to the name to set a custom icon
_(Suggested: bolt or antenna symbol, gold tint)_

### 8. Tap **Done**

---

## Usage

1. Open Shortcuts → tap **⚡ Vault Signal**
   — or add it to your Home Screen for one-tap access
2. Type your message when prompted
3. Choose `update`, `alert`, or `drop`
4. Done — the signal appears on the Studio Pulse panel for all logged-in Vault members within seconds via Supabase Realtime

---

## Signal types

| Type | Use when |
|---|---|
| `update` | General studio news, dev updates, behind-the-scenes |
| `alert` | Critical Vault signals, urgent announcements |
| `drop` | New classified file published, beta key drop, launch |

---

## Security note

The service role key has full database access. Store it only inside the Shortcut itself (it stays on your device and iCloud Keychain). Do not paste it into any public code, file, or message.
