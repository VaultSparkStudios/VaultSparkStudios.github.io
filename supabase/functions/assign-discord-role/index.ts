/**
 * assign-discord-role — Supabase Edge Function (Deno)
 *
 * Triggered by a Supabase Database Webhook on vault_members UPDATE.
 * Syncs the member's rank role, VaultSparked role, and VaultSparked Pro role
 * to Discord whenever points, is_sparked, plan_key, or rank changes.
 *
 * ─── Secrets required ─────────────────────────────────────────────────────────
 *   DISCORD_BOT_TOKEN             — bot token
 *   DISCORD_GUILD_ID              — server (guild) ID
 *   DISCORD_ROLE_IDS              — JSON map of rank index → role ID
 *                                   {"0":"...","1":"...","2":"...","3":"...","4":"...","5":"...","6":"...","7":"...","8":"..."}
 *   DISCORD_VAULTSPARKED_ROLE_ID  — role ID for the VaultSparked subscriber role
 *   DISCORD_SPARKED_PRO_ROLE_ID   — role ID for the VaultSparked Pro role (optional)
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getRankIndex } from '../_shared/membershipAccess.ts'

const DISCORD_BOT_TOKEN        = Deno.env.get('DISCORD_BOT_TOKEN')             ?? ''
const DISCORD_GUILD_ID         = Deno.env.get('DISCORD_GUILD_ID')              ?? ''
const ROLE_IDS: Record<string, string> = JSON.parse(Deno.env.get('DISCORD_ROLE_IDS') ?? '{}')
const VAULTSPARKED_ROLE_ID     = Deno.env.get('DISCORD_VAULTSPARKED_ROLE_ID')  ?? ''
const SPARKED_PRO_ROLE_ID      = Deno.env.get('DISCORD_SPARKED_PRO_ROLE_ID')   ?? ''

async function syncDiscordRoles(
  discordId: string,
  newRankIndex: number,
  isSparkd: boolean,
  isProPlan: boolean
): Promise<void> {
  const headers: HeadersInit = {
    'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Audit-Log-Reason': 'Vault rank sync',
  }

  const base = `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}/roles`

  // ── Rank roles ──────────────────────────────────────────────────
  const allRankRoleIds   = Object.values(ROLE_IDS)
  const targetRankRoleId = ROLE_IDS[String(newRankIndex)]

  // Remove all rank roles except the target
  await Promise.allSettled(
    allRankRoleIds
      .filter(id => id !== targetRankRoleId)
      .map(id => fetch(`${base}/${id}`, { method: 'DELETE', headers }))
  )

  // Assign correct rank role
  if (targetRankRoleId) {
    const res = await fetch(`${base}/${targetRankRoleId}`, { method: 'PUT', headers, body: '{}' })
    if (!res.ok && res.status !== 204) {
      const text = await res.text()
      throw new Error(`Discord rank role error ${res.status}: ${text}`)
    }
  }

  // ── VaultSparked subscriber role ────────────────────────────────
  if (VAULTSPARKED_ROLE_ID) {
    if (isSparkd) {
      const res = await fetch(`${base}/${VAULTSPARKED_ROLE_ID}`, { method: 'PUT', headers, body: '{}' })
      if (!res.ok && res.status !== 204) {
        const text = await res.text()
        throw new Error(`Discord VaultSparked role error ${res.status}: ${text}`)
      }
    } else {
      // Remove — ignore 404 (member may not have had it)
      await fetch(`${base}/${VAULTSPARKED_ROLE_ID}`, { method: 'DELETE', headers })
    }
  }

  // ── VaultSparked Pro role ───────────────────────────────────────
  if (SPARKED_PRO_ROLE_ID) {
    if (isProPlan) {
      const res = await fetch(`${base}/${SPARKED_PRO_ROLE_ID}`, { method: 'PUT', headers, body: '{}' })
      if (!res.ok && res.status !== 204) {
        const text = await res.text()
        throw new Error(`Discord VaultSparked Pro role error ${res.status}: ${text}`)
      }
    } else {
      // Remove Pro role if no longer Pro
      await fetch(`${base}/${SPARKED_PRO_ROLE_ID}`, { method: 'DELETE', headers })
    }
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = await req.json()

    if (payload.type !== 'UPDATE') {
      return new Response(JSON.stringify({ skipped: 'not_an_update' }), { status: 200 })
    }

    const newRecord = payload.record
    const oldRecord = payload.old_record

    if (!newRecord?.discord_id) {
      return new Response(JSON.stringify({ skipped: 'no_discord_id' }), { status: 200 })
    }

    const newRank      = getRankIndex(newRecord.points ?? 0)
    const oldRank      = getRankIndex(oldRecord?.points ?? 0)
    const newIsSparkd  = newRecord.is_sparked   ?? false
    const oldIsSparkd  = oldRecord?.is_sparked  ?? false
    const newPlanKey   = newRecord.plan_key      ?? 'free'
    const oldPlanKey   = oldRecord?.plan_key     ?? 'free'
    const isProPlan    = newPlanKey === 'vault_sparked_pro'
    const discordLinked = newRecord.discord_id !== oldRecord?.discord_id

    // Skip if nothing relevant changed
    if (
      newRank === oldRank &&
      newIsSparkd === oldIsSparkd &&
      newPlanKey === oldPlanKey &&
      !discordLinked
    ) {
      return new Response(JSON.stringify({ skipped: 'no_change' }), { status: 200 })
    }

    await syncDiscordRoles(newRecord.discord_id, newRank, newIsSparkd, isProPlan)

    return new Response(
      JSON.stringify({
        ok:         true,
        discord_id: newRecord.discord_id,
        rank:       newRank,
        is_sparked: newIsSparkd,
        plan_key:   newPlanKey,
        is_pro:     isProPlan,
      }),
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
