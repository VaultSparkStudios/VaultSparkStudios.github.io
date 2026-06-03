# Founder-Voice TTS — implementation contract

Status: scaffold-ready · awaits founder voice clone + R2 binding.
Audit ref: S159 #4 (founder-voice-narration-everywhere · Innovation 10 · Effort 5h).

## Why

Long-form prose lives on `/universe/dreadspike/`, `/press/`, `/brand/`, `/journal/dispatches/`, project landing pages — none of which are narrated today. The S126 dispatch-voice TTS shipped with the generic Web Speech voice; founder parasocial trust is leaked. A real founder-voice clone serving build-time-generated audio from R2 closes that loop.

## Stack

- **Voice synthesis**: ElevenLabs (instant clone) OR self-hosted XTTS-v2 on Hetzner CX22. Either way, the build emits per-paragraph WebM/Ogg audio files.
- **Storage**: Cloudflare R2 bucket `vaultspark-founder-voice` (public, immutable, max-age=immutable). Same provider as the existing assets pipeline; gives us global edge at zero per-request cost.
- **Trigger**: any `<p data-narratable>` (or `<h2 data-narratable>`) in HTML. Author marks paragraphs explicitly — never auto-narrate every block.
- **Render**: small inline play button (gold pulse next to the heading); click → fetches the matching audio file from R2 + plays in an `<audio>` element scoped to the paragraph.
- **Fallback**: when a paragraph has `data-narratable` but no matching R2 asset (e.g. new copy added between builds), the existing `assets/dispatch-voice.js` Web Speech path kicks in transparently.

## Build pipeline

```
scripts/build-founder-voice.mjs
   ↓
1. Walk all HTML files for <p data-narratable> / <h2 data-narratable>
2. Hash each paragraph's text (sha256 → 12-char id)
3. For each new hash:
     - Call ElevenLabs API with founder voice id
     - Upload audio to R2 at /audio/<hash>.webm
4. Emit data/founder-voice-manifest.json:  { hash: { url, length_s, source_page } }
5. assets/founder-voice.js reads the manifest at load and wires play buttons
```

## Required capabilities (not yet ready)

- `elevenlabs.api` — `ELEVENLABS_API_KEY` + `ELEVENLABS_FOUNDER_VOICE_ID` (founder action: clone via 5min voice sample upload at elevenlabs.io).
- `cloudflare.r2.founder-voice` — R2 bucket `vaultspark-founder-voice` + write token. The S154 R2 bucket creation tracked in studio-ops is the precedent; same Wrangler-side provisioning command.
- Cost ceiling: ElevenLabs Creator plan is $22/mo for 100k chars (~150 long paragraphs); per-build delta is capped at new-paragraph count, so steady-state is well under the plan. R2 storage is effectively zero for the audio volume.

## What's in repo today (scaffold)

- `assets/founder-voice.js` (does not exist yet — placeholder file pending the build script)
- `docs/FOUNDER_VOICE_TTS_CONTRACT.md` (this doc)

## What's NOT in repo

- The build script (`scripts/build-founder-voice.mjs`) — gated on ElevenLabs API key + R2 bucket
- Audio assets — emit-only when capabilities are READY
- The play-button UI — wires in after `<p data-narratable>` annotations land

## Founder unlock sequence

1. Sign up at elevenlabs.io (Creator tier) and upload a 5min voice sample.
2. Copy `Voice ID` and `xi-api-key` → `vaultspark-studio-ops/secrets/.env` keys `ELEVENLABS_API_KEY` + `ELEVENLABS_FOUNDER_VOICE_ID`.
3. Run `wrangler r2 bucket create vaultspark-founder-voice` (already authenticated).
4. Ping the website agent: "founder voice ready" — agent ships the build script, R2 binding to the Worker, and the play-button UI in one wave.

## Why this is scaffolded instead of shipped

The build script needs the ElevenLabs key to test; emitting placeholder audio defeats the purpose. The Worker route + the UI both need real audio to test against. Sequencing the founder unlock as the gate keeps the audit item ready without putting it behind a flag or shipping noise.
