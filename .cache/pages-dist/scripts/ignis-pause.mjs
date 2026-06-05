#!/usr/bin/env node
/**
 * ignis-pause — flip the IGNIS_GLOBAL_PAUSE kill switch.
 *
 * Usage:
 *   node scripts/ignis-pause.mjs on    # pause every IGNIS edge fn (returns 503 immediately)
 *   node scripts/ignis-pause.mjs off   # resume normal operation
 *   node scripts/ignis-pause.mjs status
 *
 * The pause flag lives in two places:
 *   1. Edge-function env var IGNIS_GLOBAL_PAUSE (must be set via supabase CLI)
 *   2. ignis_alerts table (audit trail of who paused/resumed when)
 *
 * This script writes the alert row but you must also flip the env var via:
 *   supabase secrets set IGNIS_GLOBAL_PAUSE=1 --project-ref <ref>
 *
 * For a true zero-DB-dependency kill, the env var alone is enough — the shared
 * tokenMeter `isPaused()` checks only the env var. The DB row is for audit.
 */

import process from 'node:process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ACTION = (process.argv[2] || 'status').toLowerCase();

if (!['on', 'off', 'status'].includes(ACTION)) {
  console.error('usage: ignis-pause.mjs [on|off|status]');
  process.exit(2);
}

function loadSupabaseEnv() {
  // Read from .env.local or vaultspark-studio-ops/secrets/supabase.env if present.
  const candidates = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env'),
  ];
  const env = {};
  for (const path of candidates) {
    try {
      const text = readFileSync(path, 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n]+)"?$/);
        if (m) env[m[1]] = m[2].trim();
      }
    } catch { /* not present */ }
  }
  return env;
}

const env = loadSupabaseEnv();
const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (ACTION === 'status') {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.log('IGNIS pause status: unknown (no Supabase credentials available locally)');
    console.log('Live status is read by the edge fn from env var IGNIS_GLOBAL_PAUSE.');
    process.exit(0);
  }
  const url = `${SUPABASE_URL}/rest/v1/ignis_alerts?alert_type=in.(kill_switch,manual_pause,manual_resume)&order=created_at.desc&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
    });
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0]) {
      const r = rows[0];
      console.log(`Last pause/resume event: ${r.alert_type} at ${r.created_at}`);
      console.log(`Detail: ${r.detail || '—'}`);
    } else {
      console.log('No pause/resume events recorded. Default state: running.');
    }
  } catch (err) {
    console.error('Could not read pause status:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local or via env.');
  console.error('You must still flip the edge-function env var separately:');
  console.error(`  supabase secrets set IGNIS_GLOBAL_PAUSE=${ACTION === 'on' ? '1' : '0'} --project-ref <ref>`);
  process.exit(1);
}

const alertType = ACTION === 'on' ? 'manual_pause' : 'manual_resume';
const detail = ACTION === 'on'
  ? 'Founder paused IGNIS via scripts/ignis-pause.mjs on'
  : 'Founder resumed IGNIS via scripts/ignis-pause.mjs off';

try {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ignis_alerts`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ alert_type: alertType, detail }),
  });
  if (!res.ok) {
    console.error(`Audit row write failed: ${res.status}`);
    process.exit(1);
  }
} catch (err) {
  console.error('Audit write failed:', err.message);
  process.exit(1);
}

console.log(`✓ Audit row written: ${alertType}`);
console.log('');
console.log('Now flip the actual edge-function env var to take effect:');
console.log(`  supabase secrets set IGNIS_GLOBAL_PAUSE=${ACTION === 'on' ? '1' : '0'} --project-ref <project-ref>`);
console.log('');
console.log('Affected edge functions:');
console.log('  ask-ignis · semantic-search · generate-vault-narrative · onboarding-interview · eternal-intelligence · feedback-aggregate');
