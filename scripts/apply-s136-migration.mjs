#!/usr/bin/env node
// One-shot applier for supabase-s136-investor-portal-depth.sql.
// Uses service-role key from vaultspark-studio-ops/secrets/supabase.env.
// Idempotent; safe to re-run.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const env = readFileSync(join(ROOT, '..', 'vaultspark-studio-ops', 'secrets', 'supabase.env'), 'utf8');
const SUPABASE_URL = env.match(/SUPABASE_URL=(.+)/)?.[1]?.trim();
const SERVICE_KEY  = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const sql = readFileSync(join(ROOT, 'supabase', 'migrations', 'supabase-s136-investor-portal-depth.sql'), 'utf8');

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  },
  body: JSON.stringify({ sql }),
}).catch((e) => ({ ok: false, statusText: e.message }));

if (!res.ok) {
  // Fallback: try the SQL endpoint via pgmeta if exec_sql isn't installed.
  console.error(`exec_sql RPC unavailable (${res.status} ${res.statusText}).`);
  console.error('Apply the migration manually:');
  console.error('  1. Open Supabase Dashboard → SQL Editor');
  console.error('  2. Paste the contents of supabase/migrations/supabase-s136-investor-portal-depth.sql');
  console.error('  3. Run');
  process.exit(2);
}

const body = await res.text();
console.log('✓ S136 migration applied.');
console.log(body.slice(0, 500));
