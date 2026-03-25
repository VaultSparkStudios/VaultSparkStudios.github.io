/**
 * assign-discord-role — Supabase Edge Function (Deno)
 *
 * Triggered by a Supabase Database Webhook on vault_members UPDATE.
 * When a member's points cross a rank threshold, removes their old rank
 * roles and assigns the correct new one via the Discord API.
 *
 * ─── Setup ────────────────────────────────────────────────────────────────────
 *
 * 1. Discord Application & Bot
 *    • Go to discord.com/developers → New Application → Bot → Reset Token
 *    • Enable "Server Members Intent" under Privileged Gateway Intents
 *    • Invite the bot to your server with scope "bot" and permission "Manage Roles"
 *    • The bot's role must be ABOVE all Vault rank roles in the server hierarchy
 *
 * 2. Discord Server Roles
 *    Create one role per rank (copy the role IDs from Server Settings → Roles):
 *      Rank 0 — Spark Initiate
 *      Rank 1 — Vault Runner
 *      Rank 2 — Forge Guard
 *      Rank 3 — Vault Keeper
 *      Rank 4 — The Sparked
 *
 * 3. Supabase Edge Function Environment Variables
 *    In Supabase Dashboard → Edge Functions → assign-discord-role → Secrets:
 *      DISCORD_BOT_TOKEN   — your bot token
 *      DISCORD_GUILD_ID    — your server (guild) ID
 *      DISCORD_ROLE_IDS    — JSON string mapping rank index → role ID, e.g.:
 *                            {"0":"111...","1":"222...","2":"333...","3":"444...","4":"555..."}
 *
 * 4. Database Webhook
 *    Supabase Dashboard → Database → Webhooks → Create new webhook:
 *      Table:   vault_members
 *      Events:  UPDATE
 *      URL:     <your Edge Function URL>  (shown in Edge Functions tab after deploy)
 *      HTTP Method: POST
 *
 * 5. Deploy
 *    supabase functions deploy assign-discord-role
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN') ?? ''
const DISCORD_GUILD_ID  = Deno.env.get('DISCORD_GUILD_ID')  ?? ''
const ROLE_IDS: Record<string, string> = JSON.parse(Deno.env.get('DISCORD_ROLE_IDS') ?? '{}')

// Mirrors VS.RANKS thresholds
const RANK_THRESHOLDS = [0, 100, 500, 2000, 10000]

function getRankIndex(points: number): number {
  let rank = 0
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (points >= RANK_THRESHOLDS[i]) rank = i
  }
  return rank
}

async function syncDiscordRoles(discordId: string, newRankIndex: number): Promise<void> {
  const headers: HeadersInit = {
    'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Audit-Log-Reason': 'Vault rank sync',
  }

  const allRoleIds = Object.values(ROLE_IDS)
  const targetRoleId = ROLE_IDS[String(newRankIndex)]

  // Remove all rank roles the member might currently have (ignore 404s)
  await Promise.allSettled(
    allRoleIds
      .filter(id => id !== targetRoleId)
      .map(roleId =>
        fetch(
          `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}/roles/${roleId}`,
          { method: 'DELETE', headers }
        )
      )
  )

  // Assign the correct rank role
  if (targetRoleId) {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}/roles/${targetRoleId}`,
      { method: 'PUT', headers, body: '{}' }
    )
    if (!res.ok && res.status !== 204) {
      const text = await res.text()
      throw new Error(`Discord API error ${res.status}: ${text}`)
    }
  }
}

serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = await req.json()

    // Only process UPDATE events
    if (payload.type !== 'UPDATE') {
      return new Response(JSON.stringify({ skipped: 'not_an_update' }), { status: 200 })
    }

    const newRecord = payload.record
    const oldRecord = payload.old_record

    // Skip if member hasn't linked Discord
    if (!newRecord?.discord_id) {
      return new Response(JSON.stringify({ skipped: 'no_discord_id' }), { status: 200 })
    }

    const newRank = getRankIndex(newRecord.points ?? 0)
    const oldRank = getRankIndex(oldRecord?.points ?? 0)

    // Skip if rank hasn't changed
    if (newRank === oldRank && newRecord.discord_id === oldRecord?.discord_id) {
      return new Response(JSON.stringify({ skipped: 'no_rank_change' }), { status: 200 })
    }

    await syncDiscordRoles(newRecord.discord_id, newRank)

    return new Response(
      JSON.stringify({ ok: true, discord_id: newRecord.discord_id, rank: newRank }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('assign-discord-role error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
